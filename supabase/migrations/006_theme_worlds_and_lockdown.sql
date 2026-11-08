begin;
set local lock_timeout = '5s';

alter table public.settings
 add column manual_lock_until timestamptz,
 add column recurring_start timestamp,
 add column recurring_end timestamp,
 add column recurring_unit text,
 add column recurring_every integer,
 add constraint settings_recurrence_check check (
  num_nonnulls(recurring_start,recurring_end,recurring_unit,recurring_every)=0 or (
   num_nonnulls(recurring_start,recurring_end,recurring_unit,recurring_every)=4
   and isfinite(recurring_start) and isfinite(recurring_end)
   and recurring_unit in ('day','week','month','year') and recurring_every between 1 and 30
   and recurring_end>recurring_start and recurring_end-recurring_start<make_interval(days=>recurring_every*
    case recurring_unit when 'day' then 1 when 'week' then 7 when 'month' then 28 when 'year' then 365 end)
  )
 ),
 drop constraint settings_theme_check,
 add constraint settings_theme_check check (theme in ('aurora','fall','halloween','thanksgiving','winter','blossom','firefly'));

-- Find the neighboring wall-clock occurrences directly, without scanning from the first date.
-- Adding months from the original anchor clamps dates like the 31st to shorter months.
create function public.recurring_lock_window(p_cfg public.settings, p_now timestamptz)
returns table(active boolean, next_change timestamptz)
language sql stable set search_path=public,pg_temp as $$
 with anchor as (
  select p_cfg.recurring_start as starts, p_cfg.recurring_end-p_cfg.recurring_start as duration,
    p_now at time zone p_cfg.tz as local_now,
    case p_cfg.recurring_unit when 'month' then p_cfg.recurring_every when 'year' then p_cfg.recurring_every*12 end as months,
    case p_cfg.recurring_unit when 'day' then p_cfg.recurring_every when 'week' then p_cfg.recurring_every*7 end as days
  where p_cfg.recurring_start is not null
 ), cycle as (
  select *, greatest(0,case when months is not null then (
   (extract(year from local_now)::int-extract(year from starts)::int)*12
   +extract(month from local_now)::int-extract(month from starts)::int
  )/months else (local_now::date-starts::date)/days end) as n
  from anchor
 ), local_windows as (
  select starts+make_interval(months=>coalesce(months,0)*step,days=>coalesce(days,0)*step) as local_start, duration
  from cycle cross join lateral generate_series(greatest(0,n-1),n+2) step
 ), windows as (
  select local_start at time zone p_cfg.tz as lock_at, (local_start+duration) at time zone p_cfg.tz as reopen_at
  from local_windows
 )
 select coalesce(bool_or(p_now>=lock_at and p_now<reopen_at),false),
        min(case when p_now<lock_at then lock_at when p_now<reopen_at then reopen_at end)
 from windows where reopen_at>lock_at
$$;

create function public.conference_lock_state(p_cfg public.settings, p_now timestamptz)
returns table(active boolean, next_change timestamptz, recurring_active boolean, recurring_next timestamptz)
language sql stable set search_path=public,pg_temp as $$
 select (p_cfg.locked and (p_cfg.manual_lock_until is null or p_now<p_cfg.manual_lock_until))
     or (p_cfg.lock_from is not null and p_now>=p_cfg.lock_from and (p_cfg.lock_until is null or p_now<p_cfg.lock_until))
     or coalesce(p_now<p_cfg.edit_lock_until,false) or r.active,
   (select min(t) from (values (p_cfg.lock_from),(p_cfg.lock_until),(p_cfg.edit_lock_until),
     (case when p_cfg.locked then p_cfg.manual_lock_until end),(r.next_change)) v(t) where t>p_now),
   r.active,r.next_change
 from public.recurring_lock_window(p_cfg,p_now) r
$$;
revoke execute on function public.recurring_lock_window(public.settings,timestamptz),
 public.conference_lock_state(public.settings,timestamptz) from public,anon,authenticated;

create or replace function public.is_locked()
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select l.active from public.settings s cross join lateral public.conference_lock_state(s,now()) l where s.id=1
$$;

create or replace function public.public_state()
returns json language sql security definer set search_path=public,pg_temp as $$
 select json_build_object('locked',l.active,'message',s.lock_message,'policy',s.policy,
  'tz',s.tz,'roster_on',s.public_roster,'theme',s.theme,'next_change',l.next_change)
 from public.settings s cross join lateral public.conference_lock_state(s,now()) l where s.id=1
$$;

create or replace function public.admin_settings()
returns json language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform require_admin();
 return (select (to_jsonb(s) || jsonb_build_object(
  'locked',s.locked and (s.manual_lock_until is null or now()<s.manual_lock_until),
  'manual_lock_until',case when now()<s.manual_lock_until then s.manual_lock_until end,
  'lock_from',case when s.lock_until is null or now()<s.lock_until then s.lock_from end,
  'lock_until',case when now()<s.lock_until then s.lock_until end,
  'lock_active',l.active,'next_lock_change',l.next_change,
  'recurring_active',l.recurring_active,'recurring_next',l.recurring_next))::json
 from public.settings s cross join lateral public.conference_lock_state(s,now()) l where s.id=1);
end $$;

-- Legacy callers continue using their combined control and do not inherit a new timed manual lock.
create or replace function public.admin_set_lockdown(p_locked boolean,p_msg text,p_from timestamptz,p_until timestamptz)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform require_admin();
 if p_until is not null and (p_from is null or p_until<=p_from) then raise exception 'invalid_time'; end if;
 update public.settings set locked=p_locked,manual_lock_until=null,
  lock_message=coalesce(nullif(btrim(p_msg),''),lock_message),lock_from=p_from,lock_until=p_until,
  edit_lock_until=case when p_locked=false and p_from is null then null else edit_lock_until end where id=1;
 perform log_event('lockdown',p_locked::text);
end $$;

create function admin_set_manual_lock(p_locked boolean,p_msg text,p_until timestamptz)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform require_admin();
 if p_locked is null or (p_until is not null and (not p_locked or not isfinite(p_until) or p_until<=now())) then
  raise exception 'invalid_time';
 end if;
 update public.settings set locked=p_locked,manual_lock_until=p_until,
  lock_message=coalesce(nullif(btrim(p_msg),''),lock_message) where id=1;
 perform log_event('lockdown',case when p_locked then 'Manual lock started' else 'Manual lock ended' end);
end $$;

create function admin_set_lock_schedule(p_msg text,p_from timestamptz,p_until timestamptz)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform require_admin();
 if (p_from is not null and not isfinite(p_from)) or
   (p_until is not null and (p_from is null or not isfinite(p_until) or p_until<=greatest(p_from,now()))) then
  raise exception 'invalid_time';
 end if;
 update public.settings set lock_from=p_from,lock_until=p_until,
  lock_message=coalesce(nullif(btrim(p_msg),''),lock_message) where id=1;
 perform log_event('lockdown',case when p_from is null then 'One-time schedule cleared' else 'One-time schedule saved' end);
end $$;

create function admin_set_recurring_lock(p_start timestamp,p_end timestamp,p_unit text,p_every integer,p_msg text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform require_admin();
 if num_nonnulls(p_start,p_end,p_unit,p_every)<>0 and (
  num_nonnulls(p_start,p_end,p_unit,p_every)<>4 or not isfinite(p_start) or not isfinite(p_end)
  or p_unit not in ('day','week','month','year') or p_every not between 1 and 30
  or p_end<=p_start or p_end-p_start>=make_interval(days=>p_every*
   case p_unit when 'day' then 1 when 'week' then 7 when 'month' then 28 when 'year' then 365 end)
 ) then raise exception 'invalid_time'; end if;
 update public.settings set recurring_start=p_start,recurring_end=p_end,recurring_unit=p_unit,recurring_every=p_every,
  lock_message=coalesce(nullif(btrim(p_msg),''),lock_message) where id=1;
 perform log_event('lockdown',case when p_start is null then 'Recurring schedule cleared' else 'Recurring schedule saved' end);
end $$;

revoke execute on function public.admin_set_manual_lock(boolean,text,timestamptz),
 public.admin_set_lock_schedule(text,timestamptz,timestamptz),
 public.admin_set_recurring_lock(timestamp,timestamp,text,integer,text) from public,anon;
grant execute on function public.admin_set_manual_lock(boolean,text,timestamptz),
 public.admin_set_lock_schedule(text,timestamptz,timestamptz),
 public.admin_set_recurring_lock(timestamp,timestamp,text,integer,text) to authenticated;

create or replace function public.admin_set_theme(p_theme text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform require_admin();
 if p_theme is null or p_theme not in ('aurora','fall','halloween','thanksgiving','winter','blossom','firefly') then
  raise exception 'invalid_input';
 end if;
 update public.settings set theme=p_theme where id=1;
 perform log_event2('theme',p_theme,jsonb_build_object('theme',p_theme));
end $$;
notify pgrst, 'reload schema';
commit;
