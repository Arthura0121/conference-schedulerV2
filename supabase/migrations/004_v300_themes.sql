-- Aurora v3.0.0: teacher-managed visual themes.
-- Additive only. Appearance setting only; booking/hold/availability logic is unchanged.

do $$ begin
 if to_regclass('public.settings') is null
  or to_regprocedure('public.require_admin()') is null
  or to_regprocedure('public.public_state()') is null
  or to_regprocedure('public.admin_settings()') is null
  or not exists(select 1 from information_schema.columns where table_schema='public' and table_name='settings' and column_name='public_roster') then
  raise exception 'STOP: migration 003 is not applied. Apply the earlier migrations first.';
 end if;
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name='settings' and column_name='theme')
  or to_regprocedure('public.admin_set_theme(text)') is not null then
  raise exception 'STOP: 004 themes migration looks already applied. Do not run it twice.';
 end if;
end $$;

alter table settings add column theme text not null default 'aurora'
 check(theme in ('aurora','fall','halloween','winter'));

-- Preserve every existing public_state key and add the appearance-only theme id.
create or replace function public_state() returns json language sql security definer set search_path=public,pg_temp as
$$ select json_build_object(
 'locked',is_locked(),
 'message',lock_message,
 'policy',policy,
 'tz',tz,
 'roster_on',public_roster,
 'theme',theme,
 'next_change',(select min(v.t) from (values (lock_from),(lock_until),(edit_lock_until)) v(t) where v.t>now())
) from settings $$;

create function admin_set_theme(p_theme text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform require_admin();
 if p_theme is null or p_theme not in ('aurora','fall','halloween','winter') then raise exception 'invalid_input'; end if;
 update settings set theme=p_theme where id=1;
 perform log_event2('theme',p_theme,jsonb_build_object('theme',p_theme));
end $$;

revoke execute on function admin_set_theme(text) from public,anon;
grant execute on function admin_set_theme(text) to authenticated;
