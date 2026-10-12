-- English Conference Scheduler: schema v2. Run once on a NEW Supabase project (SQL Editor).

-- SAFETY GUARD: refuse to run on a database that already has this app's tables (e.g. your earlier v1 project).
do $$ begin
 if exists(select 1 from information_schema.tables where table_schema='public' and table_name in ('settings','admins','admin_events','slots','holds','bookings')) then
  raise exception 'STOP: this database already contains conference-scheduler tables. Do NOT run v2 here. Create a brand-new Supabase project (see SETUP.md).';
 end if;
end $$;

create table settings(
 id int primary key default 1 check(id=1),
 tz text not null default 'America/New_York',
 locked boolean not null default false,
 lock_message text not null default 'We''ll Be Back Soon!',
 lock_from timestamptz, lock_until timestamptz,
 edit_lock_until timestamptz,                      -- auto-expiring lock while teacher edits
 auto_lock_on_edit boolean not null default false,
 policy text not null default E'1. Do not skip a class for a conference.\n2. Choose one piece of writing to revise and reread it first.\n3. If you have lunch during a free period, book then.\n4. Cancel at least 24 hours ahead (the site enforces this).\n5. One conference at a time.\n6. Missed conferences may affect your grade.');
insert into settings default values;

create table admins(user_id uuid primary key);       -- no FK so DB tests can run; rows are added only via SQL Editor
create table admin_events(id bigserial primary key, happened_at timestamptz not null default now(), admin_id uuid, action text not null, detail text);
create table slots(
 id uuid primary key default gen_random_uuid(),
 slot_date date not null, period int not null check(period between 1 and 9),
 start_at timestamptz not null, end_at timestamptz not null, room text not null,
 available boolean not null default true, reason text, draft boolean not null default false,
 check(end_at>start_at), unique(start_at,room));
create index slots_date_idx on slots(slot_date);
create table holds(slot_id uuid primary key references slots on delete cascade, student uuid not null, expires_at timestamptz not null);
create index holds_student_idx on holds(student);
create table bookings(
 slot_id uuid not null references slots on delete restrict,
 student uuid not null unique,
 name text not null check(char_length(btrim(name)) between 1 and 80),
 assignment text not null check(char_length(btrim(assignment)) between 1 and 200),
 created_at timestamptz not null default now(),
 constraint bookings_pkey primary key (slot_id) deferrable initially immediate);

-- Row-level security ON for every table, with NO policies and NO grants: browsers can never read or write tables directly.
alter table settings enable row level security; alter table admins enable row level security; alter table admin_events enable row level security;
alter table slots enable row level security; alter table holds enable row level security; alter table bookings enable row level security;
revoke all on settings,admins,admin_events,slots,holds,bookings from anon,authenticated,public;
revoke all on sequence admin_events_id_seq from anon,authenticated,public;
alter default privileges in schema public revoke execute on functions from public,anon,authenticated;

-- ===== internal helpers (not callable from the browser) =====
create function require_admin() returns void language plpgsql security definer set search_path=public as $$
begin if not exists(select 1 from admins where user_id=auth.uid()) then raise exception 'forbidden'; end if; end $$;
create function log_event(a text,d text) returns void language sql security definer set search_path=public as
$$ insert into admin_events(admin_id,action,detail) values(auth.uid(),a,d) $$;
create function touch_edit_lock() returns void language sql security definer set search_path=public as
$$ update settings set edit_lock_until=now()+interval '10 minutes' where auto_lock_on_edit $$;  -- rolling 10 min, only if teacher enabled it
create function is_locked() returns boolean language sql security definer set search_path=public as $$
 select locked
  or (lock_from is not null and now()>=lock_from and (lock_until is null or now()<lock_until))
  or (edit_lock_until is not null and now()<edit_lock_until) from settings $$;

-- ===== student functions =====
create function public_state() returns json language sql security definer set search_path=public as
$$ select json_build_object('locked',is_locked(),'message',lock_message,'policy',policy,'tz',tz) from settings $$;

create function list_slots() returns table(id uuid,slot_date date,period int,start_at timestamptz,end_at timestamptz,room text,state text,mine boolean)
language sql security definer set search_path=public as $$
 select s.id,s.slot_date,s.period,s.start_at,s.end_at,s.room,
  case when not s.available then 'unavailable' when b.slot_id is not null then 'booked'
       when h.slot_id is not null and h.expires_at>now() then 'held' else 'open' end,
  coalesce(b.student=auth.uid(),false) or coalesce(h.student=auth.uid() and h.expires_at>now(),false)
 from slots s left join bookings b on b.slot_id=s.id left join holds h on h.slot_id=s.id
 where s.start_at>now() and not s.draft order by s.start_at,s.room $$;

create function hold_slot(p_slot uuid) returns timestamptz language plpgsql security definer set search_path=public as $$
declare s slots; e timestamptz; u uuid:=auth.uid();
begin
 if u is null then raise exception 'not_signed_in'; end if;
 if is_locked() then raise exception 'locked'; end if;
 delete from holds where expires_at<=now();                       -- housekeeping; correctness never depends on it
 select * into s from slots where id=p_slot for update;           -- serializes racing requests for one slot
 if not found or not s.available or s.draft then raise exception 'unavailable'; end if;
 if s.start_at<=now() then raise exception 'past'; end if;
 if exists(select 1 from bookings where student=u) then raise exception 'already_booked'; end if;
 if exists(select 1 from bookings where slot_id=p_slot) then raise exception 'taken'; end if;
 delete from holds where student=u and slot_id<>p_slot;           -- one hold per student
 select expires_at into e from holds where slot_id=p_slot and student=u;
 if found then return e; end if;                                  -- re-asking never extends a hold
 if exists(select 1 from holds where slot_id=p_slot) then raise exception 'taken'; end if;
 insert into holds(slot_id,student,expires_at) values(p_slot,u,now()+interval '60 seconds') returning expires_at into e;
 return e;
end $$;

create function confirm_booking(p_slot uuid,p_name text,p_assignment text) returns void language plpgsql security definer set search_path=public as $$
declare s slots; u uuid:=auth.uid(); c text;
begin
 if u is null then raise exception 'not_signed_in'; end if;
 if is_locked() then raise exception 'locked'; end if;
 if char_length(btrim(coalesce(p_name,'')))=0 or char_length(btrim(coalesce(p_assignment,'')))=0 then raise exception 'invalid_input'; end if;
 select * into s from slots where id=p_slot for update;
 if not found or not s.available or s.draft then raise exception 'unavailable'; end if;
 if s.start_at<=now() then raise exception 'past'; end if;
 if not exists(select 1 from holds where slot_id=p_slot and student=u and expires_at>now()) then raise exception 'hold_expired'; end if;
 insert into bookings(slot_id,student,name,assignment) values(p_slot,u,btrim(p_name),btrim(p_assignment));
 delete from holds where slot_id=p_slot;
exception
 when unique_violation then
  get stacked diagnostics c = constraint_name;
  if c='bookings_pkey' then raise exception 'taken'; else raise exception 'already_booked'; end if;
 when check_violation then raise exception 'invalid_input';
end $$;

create function release_my_hold() returns void language sql security definer set search_path=public as $$ delete from holds where student=auth.uid() $$;
create function my_booking() returns table(slot_id uuid,start_at timestamptz,room text,period int,student_name text,assignment text)
language sql security definer set search_path=public as
$$ select b.slot_id,s.start_at,s.room,s.period,b.name,b.assignment from bookings b join slots s on s.id=b.slot_id where b.student=auth.uid() $$;
create function cancel_my_booking() returns void language plpgsql security definer set search_path=public as $$
declare t timestamptz;
begin
 if is_locked() then raise exception 'locked'; end if;
 select s.start_at into t from bookings b join slots s on s.id=b.slot_id where b.student=auth.uid();
 if not found then return; end if;
 if t<now()+interval '24 hours' then raise exception 'too_late'; end if;
 delete from bookings where student=auth.uid();
end $$;

-- ===== teacher functions (each begins with require_admin()) =====
create function admin_check() returns boolean language sql security definer set search_path=public as $$ select exists(select 1 from admins where user_id=auth.uid()) $$;

create function admin_stats() returns json language plpgsql security definer set search_path=public as $$
begin perform require_admin();
 return (select json_build_object(
  'total',count(*),
  'booked',count(*) filter(where b.slot_id is not null),
  'held',count(*) filter(where b.slot_id is null and coalesce(h.expires_at>now(),false)),
  'unavailable',count(*) filter(where not s.available and b.slot_id is null),
  'open',count(*) filter(where s.available and not s.draft and b.slot_id is null and not coalesce(h.expires_at>now(),false)),
  'upcoming_booked',count(*) filter(where b.slot_id is not null and s.start_at>now()),
  'upcoming_open',count(*) filter(where s.start_at>now() and s.available and not s.draft and b.slot_id is null and not coalesce(h.expires_at>now(),false)),
  'drafts',count(*) filter(where s.draft),
  'bookings_7d',(select count(*) from bookings x where x.created_at>now()-interval '7 days'))
  from slots s left join bookings b on b.slot_id=s.id left join holds h on h.slot_id=s.id);
end $$;

create function admin_slots(p_from date,p_to date) returns table(id uuid,slot_date date,period int,start_at timestamptz,end_at timestamptz,room text,available boolean,reason text,draft boolean,held boolean,booked boolean,student_name text,assignment text)
language plpgsql security definer set search_path=public as $$
begin perform require_admin();
 return query select s.id,s.slot_date,s.period,s.start_at,s.end_at,s.room,s.available,s.reason,s.draft,
   coalesce(h.expires_at>now(),false),b.slot_id is not null,b.name,b.assignment
  from slots s left join holds h on h.slot_id=s.id left join bookings b on b.slot_id=s.id
  where s.slot_date between p_from and p_to order by s.start_at,s.room;
end $$;

create function admin_bookings() returns table(slot_id uuid,student_name text,assignment text,start_at timestamptz,room text,period int,slot_date date,dup boolean,created_at timestamptz)
language plpgsql security definer set search_path=public as $$
begin perform require_admin();
 return query select b.slot_id,b.name,b.assignment,s.start_at,s.room,s.period,s.slot_date,
  (select count(*)>1 from bookings b2 where lower(btrim(b2.name))=lower(btrim(b.name))),b.created_at
  from bookings b join slots s on s.id=b.slot_id order by s.start_at;
end $$;

create function admin_upsert_slot(p_id uuid,p_date date,p_period int,p_start time,p_end time,p_room text) returns uuid language plpgsql security definer set search_path=public as $$
declare z text; a timestamptz; b timestamptz; r uuid;
begin perform require_admin();
 if p_period is null or p_period<1 or p_period>9 or p_date is null or p_start is null or p_end is null then raise exception 'invalid_input'; end if;
 select tz into z from settings;
 a:=(p_date+p_start) at time zone z; b:=(p_date+p_end) at time zone z;
 if b<=a then raise exception 'invalid_time'; end if;
 if coalesce(btrim(p_room),'')='' then raise exception 'invalid_input'; end if;
 if exists(select 1 from slots x where x.room=btrim(p_room) and x.id is distinct from p_id and tstzrange(x.start_at,x.end_at)&&tstzrange(a,b)) then raise exception 'conflict'; end if;
 perform touch_edit_lock();
 if p_id is null then
  insert into slots(slot_date,period,start_at,end_at,room) values(p_date,p_period,a,b,btrim(p_room)) returning id into r;
 else
  update slots set slot_date=p_date,period=p_period,start_at=a,end_at=b,room=btrim(p_room) where id=p_id returning id into r;
  if r is null then raise exception 'unavailable'; end if;
 end if;
 perform log_event('upsert_slot',r::text); return r;
end $$;

create function admin_delete_slot(p_id uuid) returns void language plpgsql security definer set search_path=public as $$
begin perform require_admin();
 if exists(select 1 from bookings where slot_id=p_id) then raise exception 'has_booking'; end if;
 perform touch_edit_lock();
 delete from slots where id=p_id; perform log_event('delete_slot',p_id::text);
end $$;

create function admin_set_available(p_slot uuid,p_avail boolean,p_reason text) returns void language plpgsql security definer set search_path=public as $$
begin perform require_admin();
 if not exists(select 1 from slots where id=p_slot) then raise exception 'unavailable'; end if;
 if not p_avail and exists(select 1 from bookings where slot_id=p_slot) then raise exception 'has_booking'; end if;
 perform touch_edit_lock();
 update slots set available=p_avail,reason=case when p_avail then null else coalesce(nullif(btrim(p_reason),''),'Not available') end where id=p_slot;
 if not p_avail then delete from holds where slot_id=p_slot; end if;
 perform log_event('set_available',p_slot::text||':'||p_avail::text);
end $$;

create function admin_set_range_available(p_from date,p_to date,p_avail boolean) returns int language plpgsql security definer set search_path=public as $$
declare n int;
begin perform require_admin();
 if p_to<p_from or p_to-p_from>92 then raise exception 'invalid_input'; end if;
 perform touch_edit_lock();
 if p_avail then   -- reopens ONLY slots this button closed; "Not available"/paper slots must be released one by one
  update slots set available=true,reason=null where slot_date between p_from and p_to and not available and reason='Closed by teacher';
 else
  update slots s set available=false,reason='Closed by teacher' where s.slot_date between p_from and p_to and s.available and not exists(select 1 from bookings b where b.slot_id=s.id);
 end if;
 get diagnostics n=row_count;
 if not p_avail then delete from holds h using slots s where h.slot_id=s.id and s.slot_date between p_from and p_to and not s.available; end if;
 perform log_event('range_available',p_from::text||'..'||p_to::text||':'||p_avail::text); return n;
end $$;

create function admin_cancel(p_slot uuid) returns void language plpgsql security definer set search_path=public as $$
begin perform require_admin();
 delete from bookings where slot_id=p_slot; delete from holds where slot_id=p_slot; perform log_event('cancel',p_slot::text);
end $$;

create function admin_edit_booking(p_slot uuid,p_name text,p_assignment text) returns void language plpgsql security definer set search_path=public as $$
begin perform require_admin();
 if not exists(select 1 from bookings where slot_id=p_slot) then raise exception 'unavailable'; end if;
 update bookings set name=btrim(p_name),assignment=btrim(p_assignment) where slot_id=p_slot;
 perform log_event('edit_booking',p_slot::text);
exception when check_violation then raise exception 'invalid_input';
end $$;

create function admin_move_booking(p_from uuid,p_to uuid) returns void language plpgsql security definer set search_path=public as $$
begin perform require_admin();
 perform 1 from slots where id in (p_from,p_to) order by id for update;
 if not exists(select 1 from bookings where slot_id=p_from) then raise exception 'unavailable'; end if;
 if not exists(select 1 from slots where id=p_to and available and not draft) then raise exception 'unavailable'; end if;
 if exists(select 1 from bookings where slot_id=p_to) or exists(select 1 from holds where slot_id=p_to and expires_at>now()) then raise exception 'taken'; end if;
 delete from holds where slot_id=p_to;
 update bookings set slot_id=p_to where slot_id=p_from;
 perform log_event('move',p_from::text||'>'||p_to::text);
end $$;

create function admin_swap_bookings(p_a uuid,p_b uuid) returns void language plpgsql security definer set search_path=public as $$
begin perform require_admin();
 perform 1 from slots where id in (p_a,p_b) order by id for update;
 if p_a=p_b or (select count(*) from bookings where slot_id in (p_a,p_b))<>2 then raise exception 'unavailable'; end if;
 set constraints bookings_pkey deferred;
 update bookings set slot_id=case when slot_id=p_a then p_b else p_a end where slot_id in (p_a,p_b);
 perform log_event('swap',p_a::text||'<>'||p_b::text);
end $$;

-- Copies only structure (date/time/room/availability). Never copies bookings, names, assignments or holds.
create function admin_copy_schedule(p_from date,p_to date,p_dest date,p_draft boolean) returns int language plpgsql security definer set search_path=public as $$
declare z text; sh int; n int;
begin perform require_admin();
 if p_to<p_from or p_to-p_from>92 then raise exception 'invalid_input'; end if;
 select tz into z from settings; sh:=p_dest-p_from;
 insert into slots(slot_date,period,start_at,end_at,room,available,reason,draft)
 select s.slot_date+sh,s.period,
  ((s.start_at at time zone z)+make_interval(days=>sh)) at time zone z,
  ((s.end_at at time zone z)+make_interval(days=>sh)) at time zone z,
  s.room,
  s.available or coalesce(s.reason like 'Taken on paper%',false),
  case when s.available or coalesce(s.reason like 'Taken on paper%',false) then null else s.reason end,
  p_draft
 from slots s where s.slot_date between p_from and p_to
 on conflict do nothing;
 get diagnostics n=row_count;
 perform log_event('copy',p_from::text||'..'||p_to::text||' +'||sh::text||' draft='||p_draft::text); return n;
end $$;

create function admin_publish_range(p_from date,p_to date) returns int language plpgsql security definer set search_path=public as $$
declare n int;
begin perform require_admin();
 update slots set draft=false where draft and slot_date between p_from and p_to; get diagnostics n=row_count;
 perform log_event('publish',p_from::text||'..'||p_to::text); return n;
end $$;

create function admin_settings() returns json language plpgsql security definer set search_path=public as $$
begin perform require_admin(); return (select to_json(s) from settings s); end $$;
create function admin_set_lockdown(p_locked boolean,p_msg text,p_from timestamptz,p_until timestamptz) returns void language plpgsql security definer set search_path=public as $$
begin perform require_admin();
 if p_until is not null and (p_from is null or p_until<=p_from) then raise exception 'invalid_time'; end if;
 update settings set locked=p_locked,lock_message=coalesce(nullif(btrim(p_msg),''),lock_message),lock_from=p_from,lock_until=p_until,
  edit_lock_until=case when p_locked=false and p_from is null then null else edit_lock_until end;
 perform log_event('lockdown',p_locked::text);
end $$;
create function admin_update_settings(p_policy text,p_auto boolean,p_tz text) returns void language plpgsql security definer set search_path=public as $$
begin perform require_admin();
 if not exists(select 1 from pg_timezone_names where name=p_tz) then raise exception 'invalid_input'; end if;
 update settings set policy=coalesce(nullif(btrim(p_policy),''),policy),auto_lock_on_edit=p_auto,tz=p_tz; perform log_event('settings','');
end $$;
-- (admin_begin_edit removed in v2.1: the lock is now applied by the slot-changing functions themselves.)
create function admin_end_edit() returns void language plpgsql security definer set search_path=public as $$
begin perform require_admin(); update settings set edit_lock_until=null; end $$;
create function admin_release_stale_holds() returns int language plpgsql security definer set search_path=public as $$
declare n int;
begin perform require_admin(); delete from holds where expires_at<=now(); get diagnostics n=row_count; return n; end $$;
create function admin_events(p_limit int) returns table(happened_at timestamptz,action text,detail text) language plpgsql security definer set search_path=public as $$
begin perform require_admin();
 return query select e.happened_at,e.action,e.detail from admin_events e order by e.id desc limit least(coalesce(p_limit,20),200); end $$;

-- Browser-callable functions: everything EXCEPT the three internal helpers.
revoke execute on all functions in schema public from public,anon,authenticated;
grant execute on all functions in schema public to authenticated;
revoke execute on function require_admin(),log_event(text,text),is_locked(),touch_edit_lock() from authenticated;
