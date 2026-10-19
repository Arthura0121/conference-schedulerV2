-- English Conferences v4.0.0 - production compatibility preflight.
-- READ-ONLY. Run in the existing LIVE Supabase project's SQL Editor.
-- Does not create, alter, update, delete, call mutating RPCs, or return student data.
-- ALL rows should show ready = true before publishing the v4 website.
-- This checks migration PRESENCE; it does not prove booking behavior or concurrency.

with checks as (
 select 'Core booking and authentication RPCs' as item,
   to_regprocedure('public.hold_slot(uuid)') is not null
   and to_regprocedure('public.confirm_booking(uuid,text,text,boolean)') is not null
   and to_regprocedure('public.admin_check()') is not null as ready,
   'The site requires the base booking system and staff authentication.' as details
 union all
 select '003: live/bulk/roster schema',
   exists(select 1 from information_schema.columns
     where table_schema='public' and table_name='settings' and column_name='public_roster')
   and to_regprocedure('public.admin_bulk_set_available(uuid[],boolean,boolean,boolean)') is not null,
   'Migration 003 enables roster and teacher bulk actions.'
 union all
 select '004: teacher site themes',
   exists(select 1 from information_schema.columns
     where table_schema='public' and table_name='settings' and column_name='theme')
   and to_regprocedure('public.admin_set_theme(text)') is not null,
   'Requires 004_v300_themes.sql; do not rerun if already installed.'
 union all
 select '004: 15-second hold enforcement',
   case when to_regprocedure('public.hold_slot(uuid)') is not null
     then pg_get_functiondef(to_regprocedure('public.hold_slot(uuid)')) like '%15 seconds%'
     else false end,
   'Requires 004_after_dark_15_second_hold.sql; existing holds are not changed.'
)
select item, ready, details from checks order by item;
