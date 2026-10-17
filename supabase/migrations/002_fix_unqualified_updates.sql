-- ============================================================================================================
-- 002: add the missing WHERE clause to three teacher functions (v2.1.6).
-- WHO NEEDS THIS: an EXISTING v2.1.x database (e.g. your conference-TEST project). NEW projects do not need it:
--   001_schema.sql from v2.1.6 already contains these fixes (running 002 afterwards is harmless).
-- WHY: Supabase's API roles reject UPDATE without WHERE (error 21000 "UPDATE requires a WHERE clause").
--   admin_set_lockdown ("Lock now"), admin_update_settings and admin_end_edit all ran `update settings set ...` with no WHERE.
-- WHAT IT CHANGES: ONLY the definitions of these three functions (CREATE OR REPLACE, same names, same arguments, same
--   security settings) and, for them only, re-states who may call them. It does NOT touch any table or row: no bookings,
--   slots, holds, settings values or users are read-modified, deleted or reset. If you already patched admin_set_lockdown by
--   hand, that hand-made version is replaced by the equivalent official one (same logic, `where id=1`).
-- HOW TO RUN: Supabase > SQL Editor > paste this WHOLE file > Run. The last statement returns the result table (3 rows).
-- It contains no BEGIN/COMMIT/ROLLBACK on purpose. If any step fails, nothing after it runs: read the red error.
-- ============================================================================================================

-- Safety guard: refuse to run anywhere except a database that already has the v2.1.x schema.
do $$
begin
 if to_regclass('public.settings') is null
    or to_regprocedure('public.require_admin()') is null
    or to_regprocedure('public.log_event(text,text)') is null
    or to_regprocedure('public.admin_set_lockdown(boolean,text,timestamptz,timestamptz)') is null
    or to_regprocedure('public.admin_update_settings(text,boolean,text)') is null
    or to_regprocedure('public.admin_end_edit()') is null then
  raise exception 'STOP: this database does not have the conference-scheduler v2.1.x schema. Do not run 002 here. New project? Run 001_schema.sql instead (see SETUP.md).';
 end if;
 if (select count(*) from public.settings where id=1)<>1 then
  raise exception 'STOP: the settings table must contain exactly one row with id=1.';
 end if;
end $$;

create or replace function admin_set_lockdown(p_locked boolean,p_msg text,p_from timestamptz,p_until timestamptz) returns void language plpgsql security definer set search_path=public as $$
begin perform require_admin();
 if p_until is not null and (p_from is null or p_until<=p_from) then raise exception 'invalid_time'; end if;
 update settings set locked=p_locked,lock_message=coalesce(nullif(btrim(p_msg),''),lock_message),lock_from=p_from,lock_until=p_until,
  edit_lock_until=case when p_locked=false and p_from is null then null else edit_lock_until end
  where id=1;   -- settings holds exactly one row (id=1); Supabase's API roles reject UPDATE without WHERE (error 21000)
 perform log_event('lockdown',p_locked::text);
end $$;

create or replace function admin_update_settings(p_policy text,p_auto boolean,p_tz text) returns void language plpgsql security definer set search_path=public as $$
begin perform require_admin();
 if not exists(select 1 from pg_timezone_names where name=p_tz) then raise exception 'invalid_input'; end if;
 update settings set policy=coalesce(nullif(btrim(p_policy),''),policy),auto_lock_on_edit=p_auto,tz=p_tz where id=1; perform log_event('settings','');
end $$;

create or replace function admin_end_edit() returns void language plpgsql security definer set search_path=public as $$
begin perform require_admin(); update settings set edit_lock_until=null where id=1; end $$;

-- Same access rules as 001 for these three: signed-in users may call them (each one checks require_admin() inside); the anonymous role may not.
revoke execute on function admin_set_lockdown(boolean,text,timestamptz,timestamptz),admin_update_settings(text,boolean,text),admin_end_edit() from public,anon;
grant execute on function admin_set_lockdown(boolean,text,timestamptz,timestamptz),admin_update_settings(text,boolean,text),admin_end_edit() to authenticated;

-- Post-check: stop with an error if any of the three still lacks "where id=1".
do $$
begin
 if (select count(*) from pg_proc
      where oid in ('public.admin_set_lockdown(boolean,text,timestamptz,timestamptz)'::regprocedure,'public.admin_update_settings(text,boolean,text)'::regprocedure,'public.admin_end_edit()'::regprocedure)
        and regexp_replace(lower(prosrc),'\s','','g') like '%whereid=1%')<>3 then
  raise exception 'STOP: one of the three functions still has no "where id=1". Nothing else was changed; send me this message.';
 end if;
end $$;

-- RESULT (the editor shows only the last statement): 3 rows, every column must be true except anon_can_execute = false.
select p.proname as function_name,
       regexp_replace(lower(p.prosrc),'\s','','g') like '%whereid=1%' as has_where_id_1,
       p.prosecdef as runs_as_owner_security_definer,
       has_function_privilege('authenticated',p.oid,'execute') as signed_in_users_can_call,
       has_function_privilege('anon',p.oid,'execute') as anon_can_execute_should_be_false,
       (select count(*) from public.bookings) as bookings_untouched_count,
       (select count(*) from public.slots) as slots_untouched_count
from pg_proc p
where p.oid in ('public.admin_set_lockdown(boolean,text,timestamptz,timestamptz)'::regprocedure,'public.admin_update_settings(text,boolean,text)'::regprocedure,'public.admin_end_edit()'::regprocedure)
order by p.proname;
