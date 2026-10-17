-- ============================================================================================================================
-- Aurora verification report (rewritten in v2.4.2). It reads the database and changes NOTHING. Run it BEFORE and AFTER migration 003.
--
-- WHAT THIS FILE IS: exactly ONE statement (a single WITH ... SELECT) that returns ONE result table. It has no BEGIN, no SET, no COMMIT and no second statement.
--   So it behaves the same however an editor submits it: there is no other statement that could be run separately or skipped, and PostgreSQL evaluates a single statement
--   against a single snapshot (every number in the report describes the same moment).
-- WHY IT CANNOT WRITE: this is a property of the text and not of a database setting. The file contains no INSERT, UPDATE, DELETE, DDL, GRANT or transaction-control word.
--   The only SQL built at run time is the four literal SELECT strings handed to query_to_xml (section G, all visible below). tests/unit/sqlscripts240.test.js re-checks all of
--   this on every run. The report prints COUNTS and catalog facts only: never a student name, assignment, user id or e-mail.
-- WHAT IT DOES NOT CLAIM: that PostgreSQL itself forces read-only mode. v2.4.1 began with SET TRANSACTION READ ONLY and said that made it safe. That was too strong.
--   SET TRANSACTION only works inside a transaction block. If an editor sends each statement on its own (autocommit), PostgreSQL ignores it, prints a warning (SQLSTATE 25P01)
--   and the next statement runs with no read-only protection at all. It was never confirmed how the Supabase SQL Editor submits a script, so nothing here depends on it.
--   The row "transaction mode of this run" (section A) reports what THIS run really had: READ ONLY means PostgreSQL enforced it, read-write means it is safe only because the text has no write.
-- OPTIONAL (engine-enforced): if you want PostgreSQL itself to refuse any write, run the file with psql inside one explicit read-only transaction. psql keeps one connection, so the
--   transaction spans all three parts. NOT EXECUTED by the author (no PostgreSQL was available):
--       psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -c "BEGIN READ ONLY" -f supabase/tests/verify_v240_READONLY.sql -c "ROLLBACK"
--   In the Supabase SQL Editor: paste the WHOLE file and press Run once.
--
-- WHY THE OLD VERSION (v2.4.0) BROKE: it named columns that exist only after 003 (settings.public_roster, bookings.show_name, bookings.name_hidden) directly in the SQL text.
--   PostgreSQL resolves every column name while it PARSES a statement, so on a v2.3.0 database the whole script failed with "column ... does not exist" even though an EXISTS test
--   was meant to skip those lines. A WHERE or CASE guard cannot prevent that.
-- HOW THIS VERSION AVOIDS IT:
--   * Almost everything is read from the system catalogs (pg_class, pg_attribute, pg_proc, pg_trigger, pg_policies and so on). Catalog lookups by NAME never fail when the object is
--     missing: they return nothing, which is reported as SKIP (003 not installed) or FAIL (003 half-installed or broken).
--   * The few reads of 003-only DATA columns use query_to_xml with the SQL as a text string. A text string is parsed only if it runs, and it only runs inside a CASE branch
--     that is reached when the catalog says migration 003 is fully installed.
-- HOW THE XML IS READ (section G), and why v2.4.1 was fragile:
--   query_to_xml(sql, nulls, tableforest, targetns) returns an XML value. With tableforest = false it is always ONE document shaped like  table > row > c  (root element table,
--   one row element per result row, one element per column named after the column alias, here c). The value is read with the XPath  /table/row/c/text().
--   v2.4.1 asked for tableforest = true, which gives a bare row element for one row (no table root), an EMPTY value for zero rows and a multi-root fragment for several rows.
--   xpath() needs a single-root document, so only the one-row case was safe, and its path  /row/c/text()  matched nothing in the table shape that most people expect.
--   Now: tableforest = false, and the path also accepts the bare row shape (the fallback  /row/c/text()  after the | sign). If a probe returns no value at all the check says FAIL
--   with the start of the raw XML, so a wrong XML shape can never again be shown as a harmless question mark or a false PASS.
--   The XPath was validated with libxml2 (the engine PostgreSQL uses) against XML written in the shapes the PostgreSQL manual documents. PostgreSQL itself did not run it.
-- HOW TO READ THE RESULT: ONE table. The first row (status = VERDICT) is the answer. Then every FAIL, then every WARN, then the rest.
--     PASS = checked and fine     FAIL = a real problem (do not continue)     WARN = look at it     SKIP = needs migration 003, which is not installed     INFO = a fact
--   Migration 003 not installed is NOT reported as success: the verdict says "Migration 003 is NOT installed".
-- EXPECTED: BEFORE 003 -> VERDICT "BEFORE 003 ... NOT installed", no FAIL rows, the E, F and G rows say SKIP.
--           AFTER  003 -> VERDICT "AFTER 003 ... all N checks passed", no FAIL rows. The section A "data" counts must equal the BEFORE counts
--                         (except admin_events, which grows if you used the site in between).
-- Original sheet in the TEST project: 180 slots, 109 paper-closed.
-- ============================================================================================================================
with
-- ---------- what is installed? (catalog only) ----------
markers as (
  select
    (select count(*) from pg_attribute a join pg_class c on c.oid=a.attrelid
      where c.relnamespace='public'::regnamespace and c.relkind='r' and a.attnum>0 and not a.attisdropped
        and ((c.relname='settings' and a.attname='public_roster') or (c.relname='bookings' and a.attname in ('show_name','name_hidden')) or (c.relname='admin_events' and a.attname='meta'))) as cols,
    (select count(*) from pg_proc p where p.pronamespace='public'::regnamespace
      and p.proname in ('log_event2','rt_notify','rt_trg_changed','rt_trg_events','rt_is_admin','set_my_roster_consent','list_roster','admin_set_roster_public','admin_set_name_hidden','bulk_classify','admin_bulk_set_available','admin_activity')) as fns,
    (select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid where c.relnamespace='public'::regnamespace and t.tgname like 'rt\_%' and not t.tgisinternal) as trgs,
    (select count(*) from pg_policies where schemaname='realtime' and tablename='messages' and policyname in ('sched_public_receive','sched_admin_receive')) as pols
),
state as (
  select cols, fns, trgs, pols,
    case when cols=0 and fns=0 and trgs=0 and pols=0 then 'none'
         when cols=4 and fns=12 and trgs=13 and pols=2 then 'full'
         else 'partial' end as st
  from markers
),
-- ---------- section G data probes: each query runs ONCE, and ONLY when the catalog says 003 is fully installed ----------
-- query_to_xml(text, nulls=false, tableforest=false, targetns) -> one document:  table > row > c.  A NULL result leaves the c element out, which is read as "no value" (and reported as FAIL).
raw as (
  select
    case when s.st='full' then query_to_xml('select public_roster::text as c from public.settings where id=1',false,false,'') end as x_roster,
    case when s.st='full' then query_to_xml('select count(*) as c from public.bookings where show_name or name_hidden',false,false,'') end as x_marked,
    case when s.st='full' then query_to_xml('select count(*) as c from public.list_roster()',false,false,'') end as x_anon,
    case when s.st='full' then query_to_xml('select (count(*)=6)::text as c from jsonb_object_keys(public.public_state()::jsonb) k where k in (''locked'',''message'',''policy'',''tz'',''roster_on'',''next_change'')',false,false,'') end as x_keys
  from state s
),
-- the value is the first text node of table/row/c (or of a bare row/c, the other documented shape). NULL means nothing was found.
probe as (
  select
    (xpath('/table/row/c/text() | /row/c/text()',r.x_roster))[1]::text as v_roster,
    (xpath('/table/row/c/text() | /row/c/text()',r.x_marked))[1]::text as v_marked,
    (xpath('/table/row/c/text() | /row/c/text()',r.x_anon))[1]::text as v_anon,
    (xpath('/table/row/c/text() | /row/c/text()',r.x_keys))[1]::text as v_keys,
    coalesce('raw XML was: '||left(regexp_replace(r.x_roster::text,'[[:space:]]+',' ','g'),160),'the probe did not run') as n_roster,
    coalesce('raw XML was: '||left(regexp_replace(r.x_marked::text,'[[:space:]]+',' ','g'),160),'the probe did not run') as n_marked,
    coalesce('raw XML was: '||left(regexp_replace(r.x_anon::text,'[[:space:]]+',' ','g'),160),'the probe did not run') as n_anon,
    coalesce('raw XML was: '||left(regexp_replace(r.x_keys::text,'[[:space:]]+',' ','g'),160),'the probe did not run') as n_keys
  from raw r
),
-- ---------- expected functions: (signature, who may call, which state expects it) ----------
fx(sig,kind,grp) as (values
  ('public_state()','browser','base'),('list_slots()','browser','base'),('hold_slot(uuid)','browser','base'),('release_my_hold()','browser','base'),
  ('my_booking()','browser','base'),('cancel_my_booking()','browser','base'),('admin_check()','browser','base'),('admin_stats()','browser','base'),
  ('admin_slots(date,date)','browser','base'),('admin_bookings()','browser','base'),
  ('admin_upsert_slot(uuid,date,integer,time without time zone,time without time zone,text)','browser','base'),
  ('admin_delete_slot(uuid)','browser','base'),('admin_set_available(uuid,boolean,text)','browser','base'),('admin_set_range_available(date,date,boolean)','browser','base'),
  ('admin_cancel(uuid)','browser','base'),('admin_edit_booking(uuid,text,text)','browser','base'),('admin_move_booking(uuid,uuid)','browser','base'),
  ('admin_swap_bookings(uuid,uuid)','browser','base'),('admin_copy_schedule(date,date,date,boolean)','browser','base'),('admin_publish_range(date,date)','browser','base'),
  ('admin_settings()','browser','base'),('admin_set_lockdown(boolean,text,timestamp with time zone,timestamp with time zone)','browser','base'),
  ('admin_update_settings(text,boolean,text)','browser','base'),('admin_end_edit()','browser','base'),('admin_release_stale_holds()','browser','base'),('admin_events(integer)','browser','base'),
  ('require_admin()','internal','base'),('log_event(text,text)','internal','base'),('touch_edit_lock()','internal','base'),('is_locked()','internal','base'),
  ('confirm_booking(uuid,text,text)','browser','before'),
  ('confirm_booking(uuid,text,text,boolean)','browser','after'),('set_my_roster_consent(boolean)','browser','after'),('list_roster()','browser','after'),
  ('admin_set_roster_public(boolean)','browser','after'),('admin_set_name_hidden(uuid[],boolean)','browser','after'),
  ('admin_bulk_set_available(uuid[],boolean,boolean,boolean)','browser','after'),('admin_activity(integer)','browser','after'),('rt_is_admin()','browser','after'),
  ('log_event2(text,text,jsonb)','internal','after'),('rt_notify(text,boolean)','internal','after'),('rt_trg_changed()','internal','after'),
  ('rt_trg_events()','internal','after'),('bulk_classify(uuid[],boolean,boolean)','internal','after')
),
-- to_regprocedure returns NULL (never an error) when the function does not exist
fp as (
  select x.sig, x.kind, x.grp, to_regprocedure('public.'||x.sig) as oid
  from fx x cross join state s
  where x.grp in ('base','after') or (x.grp='before' and s.st='none')
),
-- ---------- expected triggers: (name, table, event bit, which transition table) ----------
tx(tgname,tbl,ev,tr) as (values
  ('rt_slots_i','slots',4,'new'),('rt_slots_u','slots',16,'old'),('rt_slots_d','slots',8,'old'),
  ('rt_holds_i','holds',4,'new'),('rt_holds_u','holds',16,'old'),('rt_holds_d','holds',8,'old'),
  ('rt_bookings_i','bookings',4,'new'),('rt_bookings_u','bookings',16,'old'),('rt_bookings_d','bookings',8,'old'),
  ('rt_settings_i','settings',4,'new'),('rt_settings_u','settings',16,'old'),('rt_settings_d','settings',8,'old'),
  ('rt_events_i','admin_events',4,'new')
),
tg as (
  select t.tgname, c.relname, t.tgtype, t.tgenabled, t.tgoldtable, t.tgnewtable, p.proname
  from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_proc p on p.oid=t.tgfoid
  where c.relnamespace='public'::regnamespace and not t.tgisinternal
),
-- ---------- expected columns after 003 ----------
cx(tbl,col,typ,nn,def) as (values
  ('settings','public_roster','boolean',true,'false'),('bookings','show_name','boolean',true,'false'),
  ('bookings','name_hidden','boolean',true,'false'),('admin_events','meta','jsonb',false,null)
),
cg as (
  select c.relname, a.attname, format_type(a.atttypid,a.atttypmod) as typ, a.attnotnull as nn, pg_get_expr(d.adbin,d.adrelid) as def
  from pg_attribute a join pg_class c on c.oid=a.attrelid left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
  where c.relnamespace='public'::regnamespace and a.attnum>0 and not a.attisdropped
),
-- ---------- all checks: (ord, section, check, status, detail) ----------
res(ord,section,check_name,status,detail) as (

  -- A. facts about the data (counts only). Compare BEFORE and AFTER: they must be identical unless people used the site in between.
            select 10,'A data','slots (total)','INFO',count(*)::text from public.slots
  union all select 10,'A data','slots currently available (not draft)','INFO',count(*)::text from public.slots where available and not draft
  union all select 10,'A data','slots closed as Taken on paper','INFO',count(*)::text from public.slots where not available and reason ilike 'Taken on paper%'
  union all select 10,'A data','slots that are drafts','INFO',count(*)::text from public.slots where draft
  union all select 10,'A data','bookings','INFO',count(*)::text from public.bookings
  union all select 10,'A data','holds (including expired)','INFO',count(*)::text from public.holds
  union all select 10,'A data','admin_events rows','INFO',count(*)::text from public.admin_events
  union all select 10,'A data','teacher accounts registered (count only)','INFO',count(*)::text from public.admins
  union all select 10,'A data','PostgreSQL version / checked as role','INFO',current_setting('server_version')||' / '||current_user
  union all select 10,'A data','transaction mode of this run','INFO',
    case current_setting('transaction_read_only')
      when 'on' then 'READ ONLY: PostgreSQL itself refuses any write in this run'
      else 'read-write session: nothing is written because the text of this script contains no write statement (PostgreSQL is not enforcing it)' end

  -- B. is migration 003 installed?
  union all select 20,'B migration 003','installation state',
    case s.st when 'partial' then 'FAIL' else 'INFO' end,
    case s.st
      when 'none' then 'NOT INSTALLED: the database has the v2.3.0 shape'
      when 'full' then 'INSTALLED: all four kinds of object are present'
      else 'PARTIALLY INSTALLED: some 003 objects exist and some do not. Do not use the app. Send this result to your reviewer.' end
    ||format(' [columns %s of 4, functions %s of 12, triggers %s of 13, realtime policies %s of 2]',s.cols,s.fns,s.trgs,s.pols)
    from state s

  -- C. the function-only security model (must hold before AND after 003)
  union all select 30,'C security model','row level security is ON for all 6 tables',
    case when count(*) filter (where c.relrowsecurity is not true)=0 then 'PASS' else 'FAIL' end,
    case when count(*) filter (where c.relrowsecurity is not true)=0 then 'settings, admins, admin_events, slots, holds, bookings' else 'RLS off or table missing: '||string_agg(t.t,', ') filter (where c.relrowsecurity is not true) end
    from (values ('settings'),('admins'),('admin_events'),('slots'),('holds'),('bookings')) t(t) left join pg_class c on c.oid=to_regclass('public.'||t.t)
  union all select 31,'C security model','browsers have NO direct table access (anon and authenticated)',
    case when count(*) filter (where q.bad)=0 then 'PASS' else 'FAIL' end,
    case when count(*) filter (where q.bad)=0 then 'no table or column privileges for anon/authenticated on the 6 tables' else 'DIRECT ACCESS EXISTS (or table missing): '||string_agg(q.t,', ') filter (where q.bad) end
    from (select t.t, (c.oid is null
              or has_table_privilege('anon',c.oid,'select,insert,update,delete,truncate,references,trigger')
              or has_table_privilege('authenticated',c.oid,'select,insert,update,delete,truncate,references,trigger')
              or has_any_column_privilege('anon',c.oid,'select,insert,update,references')
              or has_any_column_privilege('authenticated',c.oid,'select,insert,update,references')) as bad
          from (values ('settings'),('admins'),('admin_events'),('slots'),('holds'),('bookings')) t(t) left join pg_class c on c.oid=to_regclass('public.'||t.t)) q
  union all select 32,'C security model','browsers cannot use the admin_events id sequence',
    case when to_regclass('public.admin_events_id_seq') is null then 'FAIL'
         when has_sequence_privilege('anon',to_regclass('public.admin_events_id_seq'),'usage,select,update') or has_sequence_privilege('authenticated',to_regclass('public.admin_events_id_seq'),'usage,select,update') then 'FAIL'
         else 'PASS' end,
    'sequence public.admin_events_id_seq'
  union all select 33,'C security model','no RLS policy on the 6 application tables (function-only access)',
    case when count(*)=0 then 'PASS' else 'WARN' end,
    case when count(*)=0 then 'none' else 'policies found: '||string_agg(tablename||'.'||policyname,', ') end
    from pg_policies where schemaname='public' and tablename in ('settings','admins','admin_events','slots','holds','bookings')
  union all select 34,'C security model','the anon role can execute NO function in schema public',
    case when count(*)=0 then 'PASS' else 'FAIL' end,
    case when count(*)=0 then 'none' else 'anon can execute: '||string_agg(p.oid::regprocedure::text,', ') end
    from pg_proc p where p.pronamespace='public'::regnamespace and p.prokind='f' and has_function_privilege('anon',p.oid,'execute')
      and not exists(select 1 from pg_depend d where d.classid='pg_proc'::regclass and d.objid=p.oid and d.deptype='e')
  union all select 35,'C security model','no function in schema public is executable by PUBLIC (everyone)',
    case when count(*)=0 then 'PASS' else 'FAIL' end,
    case when count(*)=0 then 'none' else 'PUBLIC can execute: '||string_agg(p.oid::regprocedure::text,', ') end
    from pg_proc p where p.pronamespace='public'::regnamespace and p.prokind='f'
      and (p.proacl is null or exists(select 1 from aclexplode(p.proacl) a where a.grantee=0 and a.privilege_type='EXECUTE'))
      and not exists(select 1 from pg_depend d where d.classid='pg_proc'::regclass and d.objid=p.oid and d.deptype='e')
  union all select 36,'C security model','every SECURITY DEFINER function has a fixed search_path',
    case when count(*)=0 then 'PASS' else 'FAIL' end,
    case when count(*)=0 then 'none missing' else 'no search_path on: '||string_agg(p.oid::regprocedure::text,', ') end
    from pg_proc p where p.pronamespace='public'::regnamespace and p.prosecdef
      and not exists(select 1 from unnest(coalesce(p.proconfig,'{}'::text[])) cfg where cfg like 'search_path=%')
      and not exists(select 1 from pg_depend d where d.classid='pg_proc'::regclass and d.objid=p.oid and d.deptype='e')
  union all select 37,'C security model','every admin_* function checks require_admin() itself (admin_check is the check)',
    case when count(*) filter (where p.prosrc !~ 'require_admin')=0 then 'PASS' else 'FAIL' end,
    case when count(*) filter (where p.prosrc !~ 'require_admin')=0 then count(*)::text||' functions checked' else 'missing require_admin: '||string_agg(p.proname,', ') filter (where p.prosrc !~ 'require_admin') end
    from pg_proc p where p.pronamespace='public'::regnamespace and p.prokind='f' and p.proname like 'admin\_%' and p.proname<>'admin_check'
  union all select 38,'C security model','exactly one version (overload) of each function the app calls by name',
    case when count(*) filter (where q.n<>1)=0 then 'PASS' else 'FAIL' end,
    case when count(*) filter (where q.n<>1)=0 then 'confirm_booking, my_booking, admin_bookings, public_state' else 'wrong number of versions: '||string_agg(q.f||'='||q.n,', ') filter (where q.n<>1) end
    from (select t.f, (select count(*) from pg_proc p where p.pronamespace='public'::regnamespace and p.proname=t.f) as n
          from (values ('confirm_booking'),('my_booking'),('admin_bookings'),('public_state')) t(f)) q
  union all select 39,'C security model','settings holds exactly one row (id = 1)',
    case when (select count(*) from public.settings where id=1)=1 and (select count(*) from public.settings)=1 then 'PASS' else 'FAIL' end,
    (select count(*) from public.settings)::text||' row(s)'

  -- D. functions: present, and callable by exactly the right roles
  union all select 40,'D functions','all expected functions exist',
    case when count(*) filter (where f.oid is null and not (f.grp='after' and s.st='none'))>0 then 'FAIL' else 'PASS' end,
    case when count(*) filter (where f.oid is null and not (f.grp='after' and s.st='none'))>0
         then 'MISSING: '||string_agg(f.sig,', ') filter (where f.oid is null and not (f.grp='after' and s.st='none'))
         else count(*) filter (where f.oid is not null)::text||' present'||case when s.st='none' then ' (the migration-003 functions are not expected yet)' else '' end end
    from fp f cross join state s group by s.st
  union all select 41,'D functions','browser-callable functions: signed-in users yes, anon no',
    case when count(*) filter (where f.kind='browser' and f.oid is not null and not (has_function_privilege('authenticated',f.oid,'execute') and not has_function_privilege('anon',f.oid,'execute')))=0 then 'PASS' else 'FAIL' end,
    case when count(*) filter (where f.kind='browser' and f.oid is not null and not (has_function_privilege('authenticated',f.oid,'execute') and not has_function_privilege('anon',f.oid,'execute')))=0
         then count(*) filter (where f.kind='browser' and f.oid is not null)::text||' checked'
         else 'WRONG: '||string_agg(f.sig,', ') filter (where f.kind='browser' and f.oid is not null and not (has_function_privilege('authenticated',f.oid,'execute') and not has_function_privilege('anon',f.oid,'execute'))) end
    from fp f
  union all select 42,'D functions','internal helpers are NOT callable from browsers (must be 0 callable)',
    case when count(*) filter (where f.kind='internal' and f.oid is not null and (has_function_privilege('authenticated',f.oid,'execute') or has_function_privilege('anon',f.oid,'execute')))=0 then 'PASS' else 'FAIL' end,
    case when count(*) filter (where f.kind='internal' and f.oid is not null and (has_function_privilege('authenticated',f.oid,'execute') or has_function_privilege('anon',f.oid,'execute')))=0
         then count(*) filter (where f.kind='internal' and f.oid is not null)::text||' helpers checked, 0 callable'
         else 'CALLABLE FROM BROWSERS: '||string_agg(f.sig,', ') filter (where f.kind='internal' and f.oid is not null and (has_function_privilege('authenticated',f.oid,'execute') or has_function_privilege('anon',f.oid,'execute'))) end
    from fp f

  -- E. migration 003 objects (SKIP until installed, FAIL if installed but wrong)
  union all select 50,'E migration 003','new columns exist with the right type, NOT NULL and default (private by default)',
    case when s.st='none' then 'SKIP' when count(*) filter (where g.attname is not null and g.typ=x.typ and g.nn=x.nn and (x.def is null or g.def=x.def))=4 then 'PASS' else 'FAIL' end,
    case when s.st='none' then 'not installed' when count(*) filter (where g.attname is not null and g.typ=x.typ and g.nn=x.nn and (x.def is null or g.def=x.def))=4 then 'public_roster, show_name, name_hidden (boolean not null default false), admin_events.meta (jsonb)'
         else 'PROBLEM with: '||string_agg(x.tbl||'.'||x.col,', ') filter (where not (g.attname is not null and g.typ=x.typ and g.nn=x.nn and (x.def is null or g.def=x.def))) end
    from cx x cross join state s left join cg g on g.relname=x.tbl and g.attname=x.col group by s.st
  union all select 51,'E migration 003','13 realtime triggers: statement-level, AFTER, enabled, with a transition table, right function',
    case when s.st='none' then 'SKIP'
         when count(*) filter (where g.tgname is not null and g.relname=x.tbl and g.tgenabled='O' and (g.tgtype & 1)=0 and (g.tgtype & 2)=0 and (g.tgtype & x.ev)=x.ev
              and (case when x.tr='new' then g.tgnewtable is not null and g.tgoldtable is null else g.tgoldtable is not null and g.tgnewtable is null end)
              and g.proname=(case when x.tgname='rt_events_i' then 'rt_trg_events' else 'rt_trg_changed' end))=13 then 'PASS' else 'FAIL' end,
    case when s.st='none' then 'not installed'
         when count(*) filter (where g.tgname is not null and g.relname=x.tbl and g.tgenabled='O' and (g.tgtype & 1)=0 and (g.tgtype & 2)=0 and (g.tgtype & x.ev)=x.ev
              and (case when x.tr='new' then g.tgnewtable is not null and g.tgoldtable is null else g.tgoldtable is not null and g.tgnewtable is null end)
              and g.proname=(case when x.tgname='rt_events_i' then 'rt_trg_events' else 'rt_trg_changed' end))=13 then '13 of 13 correct'
         else 'PROBLEM with: '||string_agg(x.tgname,', ') filter (where not (g.tgname is not null and g.relname=x.tbl and g.tgenabled='O' and (g.tgtype & 1)=0 and (g.tgtype & 2)=0 and (g.tgtype & x.ev)=x.ev
              and (case when x.tr='new' then g.tgnewtable is not null and g.tgoldtable is null else g.tgoldtable is not null and g.tgnewtable is null end)
              and g.proname=(case when x.tgname='rt_events_i' then 'rt_trg_events' else 'rt_trg_changed' end))) end
    from tx x cross join state s left join tg g on g.tgname=x.tgname group by s.st
  union all select 52,'E migration 003','list_roster() returns no assignment, student id, booking id or e-mail column',
    case when s.st='none' then 'SKIP' when to_regprocedure('public.list_roster()') is null then 'FAIL'
         when pg_get_function_result(to_regprocedure('public.list_roster()')) ~* '(assignment|student|slot_id|booking|user|email)' then 'FAIL' else 'PASS' end,
    case when s.st='none' then 'not installed' else coalesce(pg_get_function_result(to_regprocedure('public.list_roster()')),'function missing') end
    from state s
  union all select 53,'E migration 003','no teacher function can set student consent (only confirm_booking and set_my_roster_consent write show_name)',
    case when s.st='none' then 'SKIP'
         when exists(select 1 from pg_proc p where p.pronamespace='public'::regnamespace and p.proname like 'admin\_%' and p.prosrc ~* 'show_name[[:space:]]*=') then 'FAIL' else 'PASS' end,
    case when s.st='none' then 'not installed' else 'admin_* function bodies searched for an assignment to show_name' end
    from state s
  union all select 54,'E migration 003','public_state(), my_booking() and admin_bookings() have the new fields',
    case when s.st='none' then 'SKIP'
         when to_regprocedure('public.admin_bookings()') is not null and pg_get_function_result(to_regprocedure('public.admin_bookings()')) ~ 'roster_consent boolean, name_hidden boolean, public_visible boolean'
              and to_regprocedure('public.my_booking()') is not null and pg_get_function_result(to_regprocedure('public.my_booking()')) ~ 'roster_consent boolean, roster_visible boolean'
              and (select prosrc from pg_proc where oid=to_regprocedure('public.public_state()')) ~ 'roster_on' and (select prosrc from pg_proc where oid=to_regprocedure('public.public_state()')) ~ 'next_change' then 'PASS' else 'FAIL' end,
    case when s.st='none' then 'not installed' else 'my_booking: roster_consent, roster_visible / admin_bookings: roster_consent, name_hidden, public_visible / public_state: roster_on, next_change' end
    from state s

  -- F. Realtime authorization (catalog)
  union all select 60,'F realtime','realtime.messages has row level security ON',
    case when s.st='none' then 'SKIP' when c.relrowsecurity is true then 'PASS' else 'FAIL' end,
    case when s.st='none' then 'not installed' when c.oid is null then 'table realtime.messages not found' else 'relrowsecurity = '||c.relrowsecurity::text end
    from state s left join pg_class c on c.oid=to_regclass('realtime.messages')
  union all select 61,'F realtime','exactly our two SELECT-only receive policies, TO authenticated, on the right topics',
    case when s.st='none' then 'SKIP'
         when (select count(*) from pg_policies where schemaname='realtime' and tablename='messages' and policyname='sched_public_receive' and cmd='SELECT' and roles::text='{authenticated}' and qual like '%sched:public%')=1
          and (select count(*) from pg_policies where schemaname='realtime' and tablename='messages' and policyname='sched_admin_receive' and cmd='SELECT' and roles::text='{authenticated}' and qual like '%sched:admin%' and qual like '%rt_is_admin%')=1 then 'PASS' else 'FAIL' end,
    case when s.st='none' then 'not installed' else 'sched_public_receive (sched:public) and sched_admin_receive (sched:admin + rt_is_admin())' end
    from state s
  union all select 62,'F realtime','no OTHER policy on realtime.messages lets a browser SEND (insert/update/delete/all) or widens who can receive',
    case when s.st='none' then 'SKIP'
         when count(*) filter (where p.policyname not in ('sched_public_receive','sched_admin_receive') and p.cmd in ('INSERT','UPDATE','DELETE','ALL'))>0 then 'FAIL'
         when count(*) filter (where p.policyname not in ('sched_public_receive','sched_admin_receive'))>0 then 'WARN' else 'PASS' end,
    case when s.st='none' then 'not installed'
         when count(*) filter (where p.policyname not in ('sched_public_receive','sched_admin_receive'))=0 then 'none'
         else 'other policies: '||string_agg(p.policyname||' ('||p.cmd||')',', ') filter (where p.policyname not in ('sched_public_receive','sched_admin_receive'))||'. Review each: a permissive INSERT policy would let a browser forge signals.' end
    from state s left join pg_policies p on p.schemaname='realtime' and p.tablename='messages' group by s.st
  union all select 63,'F realtime','Supabase function realtime.send(jsonb,text,text,boolean) exists and the migration owner may run it',
    case when s.st='none' then 'SKIP' when to_regprocedure('realtime.send(jsonb,text,text,boolean)') is null then 'FAIL'
         when to_regprocedure('public.rt_notify(text,boolean)') is null then 'FAIL'
         when has_function_privilege((select proowner from pg_proc where oid=to_regprocedure('public.rt_notify(text,boolean)')),to_regprocedure('realtime.send(jsonb,text,text,boolean)'),'execute') then 'PASS' else 'FAIL' end,
    case when s.st='none' then 'not installed' else 'rt_notify is owned by '||coalesce((select pg_get_userbyid(proowner) from pg_proc where oid=to_regprocedure('public.rt_notify(text,boolean)')),'?') end
    from state s
  union all select 64,'F realtime','the role that owns rt_notify can write signals into realtime.messages (a failed signal is swallowed, so this is where it shows)',
    case when s.st='none' then 'SKIP'
         when o.oid is null or c.oid is null then 'FAIL'
         when has_table_privilege(o.oid,c.oid,'insert') and (o.rolsuper or o.rolbypassrls) then 'PASS' else 'WARN' end,
    case when s.st='none' then 'not installed'
         when o.oid is null or c.oid is null then 'rt_notify or realtime.messages not found'
         when has_table_privilege(o.oid,c.oid,'insert') and (o.rolsuper or o.rolbypassrls) then o.rolname||' may insert (row level security does not apply to it)'
         else o.rolname||' may NOT be able to insert into realtime.messages (insert privilege: '||has_table_privilege(o.oid,c.oid,'insert')::text||', bypasses row level security: '||(o.rolsuper or o.rolbypassrls)::text||'). Live signals could fail silently and the site would fall back to polling. Look for rt_notify warnings in Dashboard > Logs > Postgres.' end
    from state s
    left join pg_class c on c.oid=to_regclass('realtime.messages')
    left join pg_roles o on o.oid=(select proowner from pg_proc where oid=to_regprocedure('public.rt_notify(text,boolean)'))

  -- G. 003 data defaults and privacy behaviour (read-only queries, run ONLY when 003 is fully installed). Values come from the probe CTE above: a missing value is a FAIL, never a question mark.
  union all select 70,'G data (003)','roster switch (settings.public_roster) is OFF unless the teacher turned it on',
    case when s.st<>'full' then 'SKIP' when p.v_roster in ('true','false') then 'INFO' else 'FAIL' end,
    case when s.st<>'full' then 'not installed'
         when p.v_roster in ('true','false') then 'public_roster = '||p.v_roster
         else 'COULD NOT READ the value (is the settings row missing?). '||p.n_roster end
    from state s cross join probe p
  union all select 71,'G data (003)','bookings with student consent or a teacher hide (0 right after migration, later only by real use)',
    case when s.st<>'full' then 'SKIP' when p.v_marked ~ '^[0-9]+$' then 'INFO' else 'FAIL' end,
    case when s.st<>'full' then 'not installed'
         when p.v_marked ~ '^[0-9]+$' then p.v_marked
         else 'COULD NOT READ the count. '||p.n_marked end
    from state s cross join probe p
  union all select 72,'G data (003)','list_roster() returns ZERO rows when nobody is signed in (the SQL Editor has no signed-in user)',
    case when s.st<>'full' then 'SKIP' when p.v_anon='0' then 'PASS' else 'FAIL' end,
    case when s.st<>'full' then 'not installed'
         when p.v_anon is null then 'COULD NOT READ the count. '||p.n_anon
         else 'rows returned: '||p.v_anon||
              case p.v_roster
                when 'true' then ' (the roster switch is ON, so this really tests the sign-in rule)'
                when 'false' then ' (the roster switch is OFF, so this only shows the switch works: turn the roster on later to test the sign-in rule)'
                else '' end end
    from state s cross join probe p
  union all select 73,'G data (003)','public_state() JSON has locked, message, policy, tz, roster_on and next_change',
    case when s.st<>'full' then 'SKIP' when p.v_keys='true' then 'PASS' else 'FAIL' end,
    case when s.st<>'full' then 'not installed'
         when p.v_keys='true' then 'all six keys present'
         when p.v_keys='false' then 'at least one of the six keys is missing from public_state()'
         else 'COULD NOT READ the result. '||p.n_keys end
    from state s cross join probe p
),
-- ---------- verdict ----------
tally as (
  select count(*) filter (where status='FAIL') as nfail, count(*) filter (where status='WARN') as nwarn,
         count(*) filter (where status='PASS') as npass, count(*) filter (where status='SKIP') as nskip
  from res
)
select z.status, z.section, z.check_name, z.detail
from (
  select 0 as ord, 'VERDICT' as status, 'VERDICT' as section, 'overall result' as check_name,
    case
      when t.nfail>0 then 'PROBLEM: '||t.nfail||' check(s) FAILED (see the FAIL rows below). Do not continue until they are explained.'
      when s.st='none' then 'BEFORE 003: the v2.3.0 database is healthy ('||t.npass||' checks passed). Migration 003 is NOT installed, so '||t.nskip||' checks about it were skipped.'
      when s.st='partial' then 'PROBLEM: migration 003 is only partly installed.'
      else 'AFTER 003: migration 003 is installed and all '||t.npass||' checks passed'||case when t.nwarn>0 then ', with '||t.nwarn||' WARNING(S) to read below' else '' end||'. This is a catalog and read-only check, not a booking test.'
    end as detail
  from tally t cross join state s
  union all
  select r.ord, r.status, r.section, r.check_name, r.detail from res r
) z(ord,status,section,check_name,detail)
order by (z.ord=0) desc,
         case z.status when 'FAIL' then 0 when 'WARN' then 1 when 'INFO' then 2 when 'PASS' then 3 else 4 end,
         z.ord, z.check_name;
