-- ============================================================================================================================
-- v2.4.1 DATABASE TESTS for migration 003.       >>>  DISPOSABLE, EMPTY DATABASE ONLY.  DO NOT RUN ON conference-TEST OR ON ANY PROJECT THAT HAS YOUR REAL SCHEDULE.  <<<
--
-- NOT RUN by the author: no PostgreSQL / Supabase was available when this was written. Treat every assertion as unproven until you have seen it pass.
--
-- WHAT YOU NEED: a brand-new, empty Supabase project (a second throw-away project, NOT conference-TEST). Run, in this order: 001_schema.sql, 002_fix_unqualified_updates.sql,
--   003_v240_realtime_bulk_roster.sql, THIS FILE. Do NOT run seed.sql first. (Afterwards you may delete the project.)
-- WHY EMPTY: assertions count whole tables (for example "the roster lists exactly 4 bookings"). So the script REFUSES to run if ANY slot, booking or hold exists, or if
--   003 / Realtime is missing. That also guarantees it can never touch a real schedule: there is none to touch.
-- HOW IT STAYS SAFE (same mechanism as db_tests.sql): no BEGIN/COMMIT/ROLLBACK. Every test row is created inside the inner BEGIN ... EXCEPTION block of pg_temp.run_v240_tests(), a
--   savepoint that is undone by the deliberate exception 'U0001'. The result row also proves it: leftover_test_rows = 0, settings_restored = true, data_unchanged = true.
--   A failed assertion raises 'FAILED: ...' (a different error), which is NOT caught: the script stops with a red error and the whole transaction is rolled back.
-- WHAT A SUCCESS LOOKS LIKE: ONE row: test_result = ALL V2.4.1 DB TESTS PASSED, assertions_passed = assertions_expected, leftover_test_rows = 0, settings_restored = true, data_unchanged = true.
-- ASSUMPTIONS ABOUT SUPABASE INTERNALS (verify when you run it): table realtime.messages has columns topic, extension, payload (jsonb), event, private; realtime.send() inserts one
--   row there; the roles anon/authenticated exist; the SQL Editor runs as postgres.
-- ============================================================================================================================
drop sequence if exists pg_temp.test_pass_counter;
create temp sequence test_pass_counter;

-- NOTE (PostgreSQL rule): a query does NOT see rows changed by a volatile function called inside that same query.
-- So never combine "call something that changes data" and "SELECT the changed row" in one expression: assign the call's result first.
create or replace function pg_temp.ok(c boolean,n text) returns void language plpgsql as $$
begin if c is not true then raise exception 'FAILED: % (last backend call returned: [%])',n,coalesce(current_setting('t.last',true),''); end if; perform nextval('pg_temp.test_pass_counter'); raise notice 'PASS: %',n; end $$;
-- sets the identity the database functions will see (auth.uid())
create or replace function pg_temp.claims(u uuid) returns void language plpgsql as $$
begin
 perform set_config('request.jwt.claims',json_build_object('sub',u,'role','authenticated')::text,true);
 perform set_config('request.jwt.claim.sub',u::text,true);
end $$;
-- run stmt as a signed-in user; returns '' on success or the error message
create or replace function pg_temp.as_user(u uuid,stmt text) returns text language plpgsql as $$
declare r text:='';
begin
 perform pg_temp.claims(u);
 execute 'set local role authenticated';
 begin execute stmt; exception when others then r:=sqlerrm; end;
 execute 'reset role'; perform set_config('t.last',r,true); return r;
end $$;
-- run a single-value query as a signed-in user; returns the value as text
create or replace function pg_temp.val(u uuid,q text) returns text language plpgsql as $$
declare r text;
begin
 perform pg_temp.claims(u);
 execute 'set local role authenticated'; execute q into r; execute 'reset role'; perform set_config('t.last',coalesce(r,'<null>'),true); return r;
end $$;
-- like val(), but returns 'ERR: message' instead of raising (for "is this allowed at all?" questions)
create or replace function pg_temp.vals(u uuid,q text) returns text language plpgsql as $$
declare r text;
begin
 perform pg_temp.claims(u);
 execute 'set local role authenticated';
 begin execute q into r; exception when others then r:='ERR: '||sqlerrm; end;
 execute 'reset role'; perform set_config('t.last',coalesce(r,'<null>'),true); return r;
end $$;
create or replace function pg_temp.anon(stmt text) returns text language plpgsql as $$
declare r text:='';
begin execute 'set local role anon'; begin execute stmt; exception when others then r:=sqlerrm; end; execute 'reset role'; perform set_config('t.last',r,true); return r; end $$;
-- the teacher (admin A) runs the bulk function and gets its JSON answer
create or replace function pg_temp.bulk(ids uuid[],avail boolean,other boolean,dry boolean) returns json language plpgsql as $$
declare j json;
begin
 perform pg_temp.claims('11111111-1111-1111-1111-111111111111');
 execute 'set local role authenticated';
 select admin_bulk_set_available(ids,avail,other,dry) into j;
 execute 'reset role'; perform set_config('t.last',coalesce(j::text,'<null>'),true); return j;
end $$;

create or replace function pg_temp.run_v240_tests() returns table(test_result text,assertions_passed int,assertions_expected int,leftover_test_rows bigint,settings_restored boolean,data_unchanged boolean)
language plpgsql as $$
declare A uuid:='11111111-1111-1111-1111-111111111111'; S1 uuid:='22222222-2222-2222-2222-222222222222'; S2 uuid:='33333333-3333-3333-3333-333333333333'; S3 uuid:='44444444-4444-4444-4444-444444444444';
 S4 uuid:='55555555-5555-5555-5555-555555555555'; S5 uuid:='66666666-6666-6666-6666-666666666666'; S6 uuid:='77777777-7777-7777-7777-777777777777'; S7 uuid:='88888888-8888-8888-8888-888888888888';
 f1 uuid:='bbbbbbbb-0000-0000-0000-000000000001'; f2 uuid:='bbbbbbbb-0000-0000-0000-000000000002'; f3 uuid:='bbbbbbbb-0000-0000-0000-000000000003'; f4 uuid:='bbbbbbbb-0000-0000-0000-000000000004';
 pp uuid:='bbbbbbbb-0000-0000-0000-000000000005'; pst uuid:='bbbbbbbb-0000-0000-0000-000000000006'; na uuid:='bbbbbbbb-0000-0000-0000-000000000007'; dr uuid:='bbbbbbbb-0000-0000-0000-000000000008';
 cl uuid:='bbbbbbbb-0000-0000-0000-000000000009'; lg uuid:='bbbbbbbb-0000-0000-0000-00000000000a';
 base timestamptz:=now()+interval '6 days';
 r text; j json; v text; n int; m0 bigint; m1 bigint; npass int; was_called boolean; leftover bigint; restored boolean; unchanged boolean; evmax bigint; ta timestamptz; tb timestamptz;
 before_cfg jsonb; fp_before text; fp_after text; expected int:=112;
begin
 select to_jsonb(s) into before_cfg from settings s;
 select (select count(*) from slots)||'/'||(select count(*) from bookings)||'/'||(select count(*) from holds)||'/'||(select count(*) from admin_events)||'/'||(select count(*) from admins) into fp_before;
 -- Guards (before anything is touched): disposable EMPTY database, migration 003 installed, Realtime tables present.
 if exists(select 1 from slots) or exists(select 1 from bookings) or exists(select 1 from holds) then
  raise exception 'REFUSING TO RUN: this database already contains slots, bookings or holds. These tests are for a brand-new EMPTY disposable Supabase project (after 001, 002, 003; before seed.sql). Never run them on conference-TEST.';
 end if;
 if to_regprocedure('public.admin_bulk_set_available(uuid[],boolean,boolean,boolean)') is null or to_regclass('realtime.messages') is null then
  raise exception 'REFUSING TO RUN: migration 003 is not installed here, or realtime.messages does not exist.';
 end if;
 begin   -- ===== inner block = savepoint: everything below is undone when it exits through exception U0001 =====
 select coalesce(max(id),0) into evmax from admin_events;
 insert into admins values(A);
 update settings set locked=false,lock_from=null,lock_until=null,edit_lock_until=null,public_roster=false,auto_lock_on_edit=false where id=1;
 insert into slots(id,slot_date,period,start_at,end_at,room,available,reason,draft) values
  (f1,base::date,3,base,base+interval '10 min','V1',true,null,false),
  (f2,base::date,3,base+interval '20 min',base+interval '30 min','V1',true,null,false),
  (f3,base::date,3,base+interval '40 min',base+interval '50 min','V1',true,null,false),
  (f4,base::date,3,base+interval '60 min',base+interval '70 min','V1',true,null,false),
  (pp,base::date,5,base+interval '1 hour',base+interval '70 min','V2',false,'Taken on paper sign-up sheet',false),
  (na,base::date,5,base+interval '2 hours',base+interval '130 min','V2',false,'Not available',false),
  (cl,base::date,5,base+interval '4 hours',base+interval '250 min','V2',false,'Closed by teacher',false),
  (pst,(now()-interval '3 days')::date,5,now()-interval '3 days',now()-interval '3 days'+interval '10 min','V2',false,'Closed by teacher',false),
  (dr,base::date,7,base+interval '3 hours',base+interval '190 min','V3',true,null,true),
  (lg,base::date,7,base+interval '5 hours',base+interval '310 min','V3',true,null,false);
 -- legacy-style rows written WITHOUT the new columns: they must come out private; a past and a draft booking must never reach the roster
 insert into bookings(slot_id,student,name,assignment) values(lg,S5,'Legacy Five','Essay L');
 insert into bookings(slot_id,student,name,assignment,show_name) values(dr,S6,'Student Six','Essay D',true),(pst,S7,'Student Seven','Essay P',true);
 insert into admin_events(admin_id,action,detail) values(A,'cancel',f1::text);   -- legacy event: no meta

 -- ---------- 1. structure and permissions (catalog) ----------
 perform pg_temp.ok((select count(*) from information_schema.columns where table_schema='public' and column_default='false' and is_nullable='NO'
    and ((table_name='settings' and column_name='public_roster') or (table_name='bookings' and column_name in ('show_name','name_hidden'))))=3,'roster switch, consent and hide columns exist, NOT NULL, default false');
 perform pg_temp.ok((select show_name is false and name_hidden is false from bookings where slot_id=lg),'a legacy booking (written without the new columns) is private by default');
 perform pg_temp.ok(exists(select 1 from pg_policies where schemaname='realtime' and tablename='messages' and policyname='sched_public_receive' and cmd='SELECT' and roles::text='{authenticated}'),'public receive policy exists: SELECT, authenticated');
 perform pg_temp.ok(exists(select 1 from pg_policies where schemaname='realtime' and tablename='messages' and policyname='sched_admin_receive' and cmd='SELECT' and qual like '%rt_is_admin%' and qual like '%sched:admin%'),'admin receive policy requires rt_is_admin() on sched:admin');
 perform pg_temp.ok(not exists(select 1 from pg_policies where schemaname='realtime' and tablename='messages' and cmd in ('INSERT','UPDATE','DELETE','ALL')),'NO insert/update/delete/all policy on realtime.messages (browsers cannot forge signals)');
 perform pg_temp.ok((select relrowsecurity from pg_class where oid=to_regclass('realtime.messages')),'realtime.messages has row level security on');
 perform pg_temp.ok((select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid where c.relnamespace='public'::regnamespace and t.tgname like 'rt\_%' and not t.tgisinternal and (t.tgtype & 1)=0 and (t.tgnewtable is not null or t.tgoldtable is not null))=13,'13 realtime triggers, all statement-level with a transition table');
 perform pg_temp.ok(not exists(select 1 from pg_proc p where p.pronamespace='public'::regnamespace and p.prokind='f' and has_function_privilege('anon',p.oid,'execute') and not exists(select 1 from pg_depend d where d.classid='pg_proc'::regclass and d.objid=p.oid and d.deptype='e')),'anon can execute no function in schema public');
 perform pg_temp.ok(not exists(select 1 from pg_proc p where p.pronamespace='public'::regnamespace and p.prokind='f' and (p.proacl is null or exists(select 1 from aclexplode(p.proacl) ac where ac.grantee=0 and ac.privilege_type='EXECUTE')) and not exists(select 1 from pg_depend d where d.classid='pg_proc'::regclass and d.objid=p.oid and d.deptype='e')),'PUBLIC can execute no function in schema public');
 perform pg_temp.ok(not exists(select 1 from unnest(array['log_event2(text,text,jsonb)','rt_notify(text,boolean)','rt_trg_changed()','rt_trg_events()','bulk_classify(uuid[],boolean,boolean)','require_admin()','is_locked()','touch_edit_lock()','log_event(text,text)']) f
    where has_function_privilege('authenticated',('public.'||f)::regprocedure,'execute') or has_function_privilege('anon',('public.'||f)::regprocedure,'execute')),'internal helpers are not callable by browsers');
 perform pg_temp.ok(not exists(select 1 from unnest(array['list_roster()','set_my_roster_consent(boolean)','confirm_booking(uuid,text,text,boolean)','my_booking()','rt_is_admin()','admin_bulk_set_available(uuid[],boolean,boolean,boolean)','admin_activity(integer)','admin_set_roster_public(boolean)','admin_set_name_hidden(uuid[],boolean)','admin_bookings()']) f
    where not has_function_privilege('authenticated',('public.'||f)::regprocedure,'execute') or has_function_privilege('anon',('public.'||f)::regprocedure,'execute')),'new browser functions: signed-in yes, anon no');
 perform pg_temp.ok(pg_get_function_result('list_roster()'::regprocedure) !~* '(assignment|student|slot_id|booking|user|email)','list_roster exposes no assignment, student id, booking id or e-mail column');
 perform pg_temp.ok(not exists(select 1 from pg_proc p where p.pronamespace='public'::regnamespace and p.proname like 'admin\_%' and p.prosrc ~* 'show_name[[:space:]]*='),'no teacher function can set student consent');
 perform pg_temp.ok((select count(*) from pg_proc where pronamespace='public'::regnamespace and proname in ('confirm_booking','my_booking','admin_bookings'))=3,'no old overloads left: calls cannot be ambiguous');

 -- ---------- 2. booking flow unchanged, plus consent ----------
 r:=pg_temp.as_user(S1,format('select hold_slot(%L)',f1)); perform pg_temp.ok(r='','S1 can hold f1');
 r:=pg_temp.as_user(S1,format('select confirm_booking(%L,%L,%L)',f1,'Student One','Essay A')); perform pg_temp.ok(r='','the old 3-argument confirm_booking call still works');
 perform pg_temp.ok((select show_name is false from bookings where slot_id=f1),'default: no consent');
 r:=pg_temp.as_user(S2,format('select hold_slot(%L)',f2)); perform pg_temp.ok(r='','S2 can hold f2');
 r:=pg_temp.as_user(S2,format('select confirm_booking(%L,%L,%L,true)',f2,'Student Two','Essay B')); perform pg_temp.ok(r='','S2 books with consent');
 perform pg_temp.ok((select show_name is true from bookings where slot_id=f2),'S2 consent was stored');
 r:=pg_temp.as_user(S3,format('select hold_slot(%L)',f4)); perform pg_temp.ok(r='','S3 can hold f4');
 r:=pg_temp.as_user(S3,format('select confirm_booking(%L,%L,%L,null)',f4,'Student Three','Essay C')); perform pg_temp.ok(r='','a NULL consent flag is accepted');
 perform pg_temp.ok((select show_name is false from bookings where slot_id=f4),'a NULL consent flag means NO consent');
 perform pg_temp.ok(pg_temp.as_user(S1,format('select hold_slot(%L)',f3))='already_booked','one booking per session still enforced');
 perform pg_temp.ok(pg_temp.as_user(S4,format('select hold_slot(%L)',pp))='unavailable','a paper-reserved slot cannot be held');
 perform pg_temp.ok(pg_temp.as_user(S4,format('select hold_slot(%L)',dr))='unavailable','a draft slot cannot be held');

 -- ---------- 3. roster privacy ----------
 perform pg_temp.ok(pg_temp.val(S1,'select count(*) from list_roster()')='0','roster switch OFF: students get zero rows');
 perform pg_temp.ok(pg_temp.as_user(S1,'select admin_set_roster_public(true)')='forbidden','a student cannot switch the roster on');
 perform pg_temp.ok((select public_roster is false from settings where id=1),'the roster is still off after that attempt');
 r:=pg_temp.as_user(A,'select admin_set_roster_public(true)'); perform pg_temp.ok(r='','the teacher switches the roster on');
 perform pg_temp.ok(pg_temp.val(S1,'select count(*) from list_roster()')='4','roster ON: exactly the 4 upcoming published bookings are listed (past and draft bookings are not)');
 perform pg_temp.ok(pg_temp.val(S1,'select count(display_name) from list_roster()')='1','only the consenting student has a name in the response');
 perform pg_temp.ok(pg_temp.val(S1,'select display_name from list_roster() where display_name is not null')='Student Two','the one visible name is Student Two');
 perform pg_temp.ok(pg_temp.val(S2,'select count(*) from list_roster() where name_hidden')='3','the other three rows are flagged hidden');
 perform pg_temp.ok(pg_temp.val(S2,'select count(*) from list_roster() r where r::text ~* ''(Student One|Student Three|Legacy|Student Six|Student Seven|Essay)''')='0','no other name, and no assignment, appears anywhere in the response');
 perform pg_temp.ok(pg_temp.anon('select * from list_roster()') like 'permission denied%','the anon role cannot call list_roster');
 perform pg_temp.ok(pg_temp.as_user(S1,'select * from bookings') like 'permission denied%','students cannot read the bookings table');
 perform pg_temp.ok(pg_temp.as_user(S1,format('select admin_set_name_hidden(array[%L::uuid],true)',f1))='forbidden','students cannot call admin_set_name_hidden');
 perform pg_temp.ok(pg_temp.as_user(S1,'select * from admin_bookings()')='forbidden','students cannot call admin_bookings');
 perform pg_temp.ok(pg_temp.as_user(S1,'select * from admin_activity(5)')='forbidden','students cannot call admin_activity');
 perform set_config('request.jwt.claims','',true); perform set_config('request.jwt.claim.sub','',true);
 select count(*) into n from list_roster();
 perform pg_temp.ok(n=0,'with the roster ON but nobody signed in, list_roster returns zero rows');
 r:=pg_temp.as_user(A,format('select admin_set_name_hidden(array[%L::uuid],true)',f2)); perform pg_temp.ok(r='','the teacher hides Student Two');
 perform pg_temp.ok(pg_temp.val(S1,'select count(display_name) from list_roster()')='0','teacher hide overrides consent');
 perform pg_temp.ok(pg_temp.val(S2,'select roster_visible::text from my_booking()')='false','the student sees that the name is not visible');
 perform pg_temp.ok(pg_temp.val(S2,'select roster_consent::text from my_booking()')='true','the student consent itself is unchanged by a teacher hide');
 j:=pg_temp.val(A,format('select admin_set_name_hidden(array[%L::uuid],false)',f1))::json;
 perform pg_temp.ok((j->>'no_consent')::int=1,'un-hiding a non-consenting booking reports no_consent');
 perform pg_temp.ok(pg_temp.val(S1,'select count(display_name) from list_roster()')='0','un-hiding never exposes a name without consent');
 r:=pg_temp.as_user(A,format('select admin_set_name_hidden(array[%L::uuid],false)',f2)); perform pg_temp.ok(r='','the teacher stops hiding Student Two');
 perform pg_temp.ok(pg_temp.val(S1,'select count(display_name) from list_roster()')='1','the name is visible again, only because consent exists');
 r:=pg_temp.as_user(S2,'select set_my_roster_consent(false)'); perform pg_temp.ok(r='','the student withdraws consent');
 perform pg_temp.ok(pg_temp.val(S1,'select count(display_name) from list_roster()')='0','withdrawal takes effect at once');
 r:=pg_temp.as_user(S2,'select set_my_roster_consent(true)'); perform pg_temp.ok(r='','the student consents again');
 perform pg_temp.ok(pg_temp.val(S1,'select count(display_name) from list_roster()')='1','consent again: the name is visible');
 update settings set locked=true where id=1;
 perform pg_temp.ok(pg_temp.val(S1,'select count(*) from list_roster()')='0','during Lockdown the roster returns nothing');
 r:=pg_temp.as_user(S2,'select set_my_roster_consent(false)'); perform pg_temp.ok(r='','withdrawing consent still works during Lockdown');
 update settings set locked=false where id=1;
 perform pg_temp.ok(pg_temp.val(S1,'select count(display_name) from list_roster()')='0','after Lockdown the withdrawn name stays hidden');
 perform pg_temp.ok(pg_temp.as_user(S4,'select set_my_roster_consent(true)')='unavailable','a session with no booking cannot set consent');
 perform pg_temp.ok(pg_temp.as_user(S1,'select set_my_roster_consent(null)')='invalid_input','a NULL consent value is rejected');

 -- ---------- 4. bulk open / close ----------
 j:=pg_temp.bulk(array[f3,pp,pst,na,dr,f1,cl],true,false,true);
 perform pg_temp.ok((j->>'paper')::int=1 and (j->>'past')::int=1 and (j->>'draft')::int=1 and (j->>'booked')::int=1,'preview counts paper, past, draft and booked slots as protected');
 perform pg_temp.ok((j->>'needs_opt_in')::int=1 and (j->>'already_open')::int=1 and (j->>'eligible')::int=1,'preview: Not available needs opt-in, f3 is already open, the Closed-by-teacher slot is eligible');
 perform pg_temp.ok((j->>'requested')::int=7 and (j->>'missing')::int=0 and (j->>'dry_run')::boolean,'preview reports 7 requested, 0 missing, dry_run true');
 perform pg_temp.ok((select not available from slots where id=cl) and (select not available from slots where id=na),'a dry run changed nothing');
 perform pg_temp.ok((select count(*) from admin_events where id>evmax and action='bulk_available')=0,'a dry run writes no activity record');
 j:=pg_temp.bulk(array[f3,pp,pst,na,dr,f1,cl],true,false,false);
 perform pg_temp.ok((j->>'changed')::int=1 and (select available from slots where id=cl) and (select reason is null from slots where id=cl),'real open without opt-in reopens only the Closed-by-teacher slot');
 perform pg_temp.ok((select not available from slots where id=na),'the Not available slot stays closed without opt-in');
 j:=pg_temp.bulk(array[na],true,true,false);
 perform pg_temp.ok((j->>'changed')::int=1 and (select available from slots where id=na),'with opt-in the Not available slot opens');
 j:=pg_temp.bulk(array[pp],true,true,false);
 perform pg_temp.ok((j->>'changed')::int=0 and (j->>'paper')::int=1,'a paper slot is never opened, even with opt-in');
 perform pg_temp.ok((select not available and reason='Taken on paper sign-up sheet' from slots where id=pp),'paper slot untouched, reason preserved');
 perform pg_temp.ok((select not available from slots where id=pst),'a past slot is untouched');
 perform pg_temp.ok((select draft and available from slots where id=dr),'a draft slot is untouched');
 select count(*) into m0 from realtime.messages where topic='sched:public' and payload->>'kind'='slots';
 j:=pg_temp.bulk(array[f1,f3,na,pp],false,false,false);
 select count(*) into m1 from realtime.messages where topic='sched:public' and payload->>'kind'='slots';
 perform pg_temp.ok((j->>'changed')::int=2 and (j->>'booked')::int=1 and (j->>'paper')::int=1,'close: f3 and na closed; the booked and the paper slot are skipped');
 perform pg_temp.ok(m1-m0=1,'a bulk change of 2 slots sends exactly ONE public slots signal (statement-level trigger)');
 perform pg_temp.ok((select reason='Closed by teacher' and not available from slots where id=f3) and (select reason='Closed by teacher' and not available from slots where id=na),'closed slots carry Closed by teacher');
 perform pg_temp.ok((select count(*) from bookings where slot_id=f1)=1 and (select available from slots where id=f1),'the booked slot was neither closed nor cancelled');
 j:=pg_temp.bulk(array[f1,f3,na,pp],false,false,false);
 perform pg_temp.ok((j->>'changed')::int=0 and (j->>'already_closed')::int=2,'closing again changes nothing (idempotent)');
 j:=pg_temp.bulk(array[f3],true,false,false);
 perform pg_temp.ok((j->>'changed')::int=1,'a Closed-by-teacher slot reopens without opt-in');
 r:=pg_temp.as_user(S4,format('select hold_slot(%L)',f3)); perform pg_temp.ok(r='','S4 holds the reopened f3');
 j:=pg_temp.bulk(array[f3],false,false,true);
 perform pg_temp.ok((j->>'held_released')::int=1,'preview announces the live hold that closing would release');
 j:=pg_temp.bulk(array[f3],false,false,false);
 perform pg_temp.ok((j->>'changed')::int=1 and (j->>'holds_released')::int=1 and (select count(*) from holds where slot_id=f3)=0,'closing releases the live hold on that slot');
 perform pg_temp.ok(pg_temp.as_user(S4,format('select confirm_booking(%L,%L,%L)',f3,'Student Four','Essay F'))='unavailable','the held student can no longer book the closed slot');
 perform pg_temp.ok((select count(*) from bookings)=6,'all 6 bookings (4 current, 1 past, 1 draft) are still there after every bulk run');
 perform pg_temp.ok(pg_temp.as_user(A,format('select admin_bulk_set_available(array[%L::uuid],true,null,true)',f3))='invalid_input','a NULL include-other flag is rejected (it would bypass the opt-in protection)');
 perform pg_temp.ok(pg_temp.as_user(A,'select admin_bulk_set_available(array[]::uuid[],true,true,true)')='invalid_input','an empty id list is rejected');
 perform pg_temp.ok(pg_temp.as_user(A,'select admin_bulk_set_available(array(select gen_random_uuid() from generate_series(1,501)),true,false,true)')='invalid_input','more than 500 ids is rejected');
 perform pg_temp.ok(pg_temp.as_user(A,'select admin_bulk_set_available(array[null]::uuid[],true,false,true)')='invalid_input','a list of only NULL ids is rejected');
 j:=pg_temp.bulk(array[gen_random_uuid()],true,false,true);
 perform pg_temp.ok((j->>'missing')::int=1 and (j->>'requested')::int=1 and (j->>'eligible')::int=0,'an unknown id is reported as missing and changes nothing');
 j:=pg_temp.bulk(array[f3,f3],true,false,true);
 perform pg_temp.ok((j->>'requested')::int=1,'duplicate ids are counted once');
 perform pg_temp.ok(pg_temp.as_user(S1,format('select admin_bulk_set_available(array[%L::uuid],true,true,true)',f3))='forbidden','students cannot call bulk');
 perform pg_temp.ok(pg_temp.anon(format('select admin_bulk_set_available(array[%L::uuid],true,true,true)',f3)) like 'permission denied%','the anon role cannot call bulk');
 perform pg_temp.ok((select count(*) from admin_events where id>evmax and action='bulk_available' and meta is not null)=7,'the 7 real bulk runs are logged with structured meta (dry runs and rejected calls are not)');
 perform pg_temp.ok(not exists(select 1 from admin_events where id>evmax and (coalesce(meta::text,'') ~* '(Student|Essay|Legacy)' or coalesce(detail,'') ~* '(Student|Essay|Legacy)')),'activity records contain no student name or assignment');
 perform pg_temp.ok(pg_temp.as_user(A,'select count(*) from admin_activity(10)')='','a teacher can call admin_activity');
 perform pg_temp.ok(pg_temp.val(A,'select count(*) from admin_activity(100) a where a::text ~* ''(Student|Essay|Legacy)''')='0','admin_activity output contains no student name or assignment');
 perform pg_temp.ok(pg_temp.val(A,'select count(*) from admin_activity(100) where meta is null and slot_a is not null')::int>=1,'a legacy event (no meta) is still readable and its slot is resolved');
 update settings set auto_lock_on_edit=true,edit_lock_until=null where id=1;
 j:=pg_temp.bulk(array[f3],true,false,true);
 perform pg_temp.ok((select edit_lock_until is null from settings where id=1),'a dry run never starts the edit lock');
 j:=pg_temp.bulk(array[f3],true,false,false);
 perform pg_temp.ok((select edit_lock_until is not null from settings where id=1),'a real bulk change starts the edit lock when the teacher enabled it');
 update settings set auto_lock_on_edit=false,edit_lock_until=null where id=1;
 r:=pg_temp.as_user(A,format('select admin_swap_bookings(%L,%L)',f1,f2)); perform pg_temp.ok(r='','the teacher swaps two bookings');
 perform pg_temp.claims(A);
 set local role authenticated;
 select (slot_a->>'start_at')::timestamptz,(slot_b->>'start_at')::timestamptz into ta,tb from admin_activity(1);
 reset role;
 perform pg_temp.ok(ta=(select start_at from slots where id=f1) and tb=(select start_at from slots where id=f2),'activity lists slot_a and slot_b in the order of the event (from, then to)');

 -- ---------- 5. Realtime signals and authorization (needs Supabase realtime.messages) ----------
 perform pg_temp.ok((select count(*) from realtime.messages where topic='sched:public')>0 and (select count(*) from realtime.messages where topic='sched:admin')>0,'database changes produced signals on both topics');
 perform pg_temp.ok(not exists(select 1 from realtime.messages where topic in ('sched:public','sched:admin') and (select array_agg(k order by k) from jsonb_object_keys(payload) k) is distinct from array['kind','v']),'every signal payload has exactly the keys v and kind');
 perform pg_temp.ok(not exists(select 1 from realtime.messages where topic in ('sched:public','sched:admin') and payload::text ~* '(Student|Essay|Legacy|@)'),'no signal contains a name, assignment or e-mail');
 perform pg_temp.ok(not exists(select 1 from realtime.messages where topic in ('sched:public','sched:admin') and private is not true),'every signal is on a PRIVATE channel');
 perform pg_temp.ok(not exists(select 1 from realtime.messages where topic='sched:public' and payload->>'kind'='activity') and exists(select 1 from realtime.messages where topic='sched:admin' and payload->>'kind'='activity'),'activity signals go to the teacher topic only');
 select count(*) into m0 from realtime.messages where topic in ('sched:public','sched:admin');
 delete from holds where expires_at<now()-interval '100 years';
 select count(*) into m1 from realtime.messages where topic in ('sched:public','sched:admin');
 perform pg_temp.ok(m1=m0,'a statement that changes no rows sends no signal');
 select count(*) into m0 from realtime.messages where topic in ('sched:public','sched:admin') and payload->>'kind'='settings';
 update settings set tz=tz where id=1;
 select count(*) into m1 from realtime.messages where topic in ('sched:public','sched:admin') and payload->>'kind'='settings';
 perform pg_temp.ok(m1-m0=2,'one statement on settings sends one public and one teacher signal');
 perform set_config('realtime.topic','sched:admin',true);
 v:=pg_temp.vals(S1,'select count(*) from realtime.messages'); perform pg_temp.ok(v='0' or v like 'ERR:%','a student is denied the teacher topic');
 v:=pg_temp.vals(A,'select count(*) from realtime.messages'); perform pg_temp.ok(case when v like 'ERR:%' then false else v::int>0 end,'a teacher can receive the teacher topic');
 perform set_config('realtime.topic','sched:public',true);
 v:=pg_temp.vals(S1,'select count(*) from realtime.messages'); perform pg_temp.ok(case when v like 'ERR:%' then false else v::int>0 end,'a student can receive the public topic');
 perform set_config('realtime.topic','sched:other',true);
 v:=pg_temp.vals(S1,'select count(*) from realtime.messages'); perform pg_temp.ok(v='0' or v like 'ERR:%','a student is denied any other topic');
 v:=pg_temp.vals(A,'select count(*) from realtime.messages'); perform pg_temp.ok(v='0' or v like 'ERR:%','even a teacher is denied topics we never defined');
 perform set_config('realtime.topic','sched:public',true);
 perform pg_temp.ok(pg_temp.as_user(S1,'insert into realtime.messages(topic,extension,payload,event,private) values (''sched:public'',''broadcast'',''{"v":1,"kind":"slots"}'',''sync'',true)')<>'','a student cannot forge a public signal');
 perform pg_temp.ok(pg_temp.as_user(A,'insert into realtime.messages(topic,extension,payload,event,private) values (''sched:admin'',''broadcast'',''{"v":1,"kind":"slots"}'',''sync'',true)')<>'','not even a teacher browser session can insert a signal');
 raise exception 'V240_DB_TESTS_FINISHED_ROLLING_BACK' using errcode='U0001';
 exception when sqlstate 'U0001' then null;   -- ONLY the deliberate exception is caught; a FAILED: error is not
 end;    -- ===== end of rolled-back region =====
 select case when q.is_called then q.last_value else 0 end,q.is_called into npass,was_called from pg_temp.test_pass_counter q;
 select (select count(*) from slots where id::text like 'bbbbbbbb-0000-0000-0000-0000000000%')
  + (select count(*) from admins where user_id='11111111-1111-1111-1111-111111111111')
  + (select count(*) from bookings where student in ('22222222-2222-2222-2222-222222222222','33333333-3333-3333-3333-333333333333','44444444-4444-4444-4444-444444444444','55555555-5555-5555-5555-555555555555','66666666-6666-6666-6666-666666666666','77777777-7777-7777-7777-777777777777','88888888-8888-8888-8888-888888888888'))
  + (select count(*) from holds where student in ('22222222-2222-2222-2222-222222222222','33333333-3333-3333-3333-333333333333','44444444-4444-4444-4444-444444444444','55555555-5555-5555-5555-555555555555'))
  + (select count(*) from admin_events where admin_id='11111111-1111-1111-1111-111111111111') into leftover;
 select to_jsonb(s)=before_cfg into restored from settings s;
 select (select count(*) from slots)||'/'||(select count(*) from bookings)||'/'||(select count(*) from holds)||'/'||(select count(*) from admin_events)||'/'||(select count(*) from admins) into fp_after;
 unchanged:=(fp_after=fp_before);
 return query select case when npass<>expected then 'INCOMPLETE: ran '||npass||' assertions, expected '||expected
                          when leftover<>0 or restored is not true or unchanged is not true then 'PASSED BUT CLEANUP CHECK FAILED'
                          else 'ALL V2.4.1 DB TESTS PASSED' end,
                npass,expected,leftover,restored,unchanged;
end $$;

select * from pg_temp.run_v240_tests();
