-- READ-ONLY. Safe on any project (TEST or LIVE): changes nothing. Checks that NO function in schema public contains an
-- UPDATE or DELETE without a WHERE (Supabase's API roles reject those with error 21000), and lists any that do.
-- Run it BEFORE and AFTER applying 002. It always returns at least one row:
--   status = OK       -> nothing wrong found
--   status = PROBLEM  -> the function and the statement are listed
-- (Regex-based check on the stored function text; a hand-made function with unusual formatting could be missed or over-reported.)
with fns as (
  select p.proname, regexp_replace(p.prosrc,'--[^\n]*','','g') as body
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_language l on l.oid=p.prolang
  where n.nspname='public' and l.lanname in ('plpgsql','sql')
), pieces as (
  select f.proname, btrim(x) as stmt from fns f, regexp_split_to_table(f.body,';') as x
), offenders as (
  select proname, left(regexp_replace(stmt,'\s+',' ','g'),110) as statement_without_where
  from pieces
  where stmt ~* '\m(update|delete)\M' and stmt !~* '\m(update|delete)\M.*\mwhere\M' and stmt !~* '\mfor\s+update\M'
)
select 'PROBLEM' as status, proname as function_name, statement_without_where as detail from offenders
union all
select 'OK', (select count(*) from fns)::text||' functions checked', 'no UPDATE/DELETE without WHERE' where not exists (select 1 from offenders)
order by 1,2;
