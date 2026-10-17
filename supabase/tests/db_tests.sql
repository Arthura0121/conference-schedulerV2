-- ============================================================================================
-- DATABASE TEST SUITE (v2.1.3, repaired in v2.4.1).  Run ONLY in a throw-away TEST Supabase project, after 001_schema.sql and seed.sql. NEVER on a project holding a real schedule:
--  although every change it makes is undone (see below), some steps close, copy and publish slots in date ranges that may contain REAL slots, so it must not run where real data matters.
--  v2.4.1 fix: line "student cannot edit settings" had a stray `where id=1` OUTSIDE the SQL string (a PL/pgSQL error: column id does not exist); it now sits inside the string.
-- HOW THE RESULT AND THE CLEANUP WORK (read this if you edit the file):
--  * This script contains NO transaction-control commands (no BEGIN / COMMIT / ROLLBACK). PostgreSQL runs every statement
--    of one submitted script as ONE transaction, and an explicit BEGIN pulls earlier statements into it, so a later ROLLBACK
--    would also undo the objects the script itself created (that is exactly what broke v2.1.2).
--  * All test data is created INSIDE the inner BEGIN ... EXCEPTION block of pg_temp.run_db_tests(). That block is a
--    savepoint: when it ends by the deliberate exception 'U0001', PostgreSQL undoes everything done inside it. The undo
--    happens inside the function, so it does not matter whether the SQL Editor wraps the script in a transaction or commits at the end.
--  * Passed assertions are counted with a temp SEQUENCE created BEFORE the block: nextval() is never undone by a savepoint
--    rollback, and the sequence itself is not created inside the rolled-back region, so the count is still there afterwards.
--  * The LAST statement is "select * from pg_temp.run_db_tests();" because the SQL Editor displays only the last statement's rows.
--  * Any failed assertion raises 'FAILED: ...' (a different error), which is NOT caught: the script stops with a red error.
-- Expected on success: ONE row: test_result = ALL DB TESTS PASSED, assertions_passed = assertions_expected = 108,
--   leftover_test_rows = 0, settings_restored = true.
-- ============================================================================================
drop sequence if exists pg_temp.test_pass_counter;
create temp sequence test_pass_counter;

-- NOTE (PostgreSQL rule): a query does NOT see rows changed by a volatile function called inside that same query.
-- So never combine "call something that changes data" and "SELECT the changed row" in one expression: assign the call's result first.
create or replace function pg_temp.ok(c boolean,n text) returns void language plpgsql as $$
begin if c is not true then raise exception 'FAILED: % (last backend call returned: [%])',n,coalesce(current_setting('t.last',true),''); end if; perform nextval('pg_temp.test_pass_counter'); raise notice 'PASS: %',n; end $$;
-- run stmt as a signed-in user; returns '' on success or the error message
create or replace function pg_temp.as_user(u uuid,stmt text) returns text language plpgsql as $$
declare r text:='';
begin
 perform set_config('request.jwt.claims',json_build_object('sub',u,'role','authenticated')::text,true);
 perform set_config('request.jwt.claim.sub',u::text,true);
 execute 'set local role authenticated';
 begin execute stmt; exception when others then r:=sqlerrm; end;
 execute 'reset role'; perform set_config('t.last',r,true); return r;
end $$;
create or replace function pg_temp.val(u uuid,q text) returns text language plpgsql as $$
declare r text;
begin
 perform set_config('request.jwt.claims',json_build_object('sub',u,'role','authenticated')::text,true);
 perform set_config('request.jwt.claim.sub',u::text,true);
 execute 'set local role authenticated'; execute q into r; execute 'reset role'; perform set_config('t.last',coalesce(r,'<null>'),true); return r;
end $$;
create or replace function pg_temp.anon(stmt text) returns text language plpgsql as $$
declare r text:='';
begin execute 'set local role anon'; begin execute stmt; exception when others then r:=sqlerrm; end; execute 'reset role'; perform set_config('t.last',r,true); return r; end $$;

create or replace function pg_temp.run_db_tests() returns table(test_result text,assertions_passed int,assertions_expected int,leftover_test_rows bigint,settings_restored boolean)
language plpgsql as $$
declare A uuid:='11111111-1111-1111-1111-111111111111'; S1 uuid:='22222222-2222-2222-2222-222222222222'; S2 uuid:='33333333-3333-3333-3333-333333333333'; S3 uuid:='44444444-4444-4444-4444-444444444444';
 k1 uuid:='aaaaaaaa-0000-0000-0000-000000000001'; k2 uuid:='aaaaaaaa-0000-0000-0000-000000000002'; k3 uuid:='aaaaaaaa-0000-0000-0000-000000000003'; k4 uuid:='aaaaaaaa-0000-0000-0000-000000000004'; k5 uuid:='aaaaaaaa-0000-0000-0000-000000000005'; k6 uuid:='aaaaaaaa-0000-0000-0000-000000000006'; e1 timestamptz; t text; n int; r text;
 before_cfg jsonb; npass int; was_called boolean; leftover bigint; restored boolean;
begin
 select to_jsonb(s) into before_cfg from settings s;
 -- Guard: several assertions count whole tables (e.g. "exactly 2 bookings"), so refuse to run on a project that already has bookings,
 -- holds or draft slots, instead of failing confusingly (or being run by accident on a live project).
 if exists(select 1 from bookings) or exists(select 1 from holds) or exists(select 1 from slots where draft) then
  raise exception 'REFUSING TO RUN: this project already has bookings, holds or draft slots. Run the database tests on a freshly set up TEST project (SETUP.md Part 1).';
 end if;
 begin   -- ===== inner block = savepoint: everything below is undone when it exits through exception U0001 =====
 insert into admins values('11111111-1111-1111-1111-111111111111');
 update settings set locked=false,lock_from=null,lock_until=null,edit_lock_until=null where id=1;
 insert into slots(id,slot_date,period,start_at,end_at,room) values
  ('aaaaaaaa-0000-0000-0000-000000000001',(now()+interval '5 days')::date,3,now()+interval '5 days',now()+interval '5 days 10 min','T1'),
  ('aaaaaaaa-0000-0000-0000-000000000002',(now()+interval '5 days')::date,3,now()+interval '5 days 20 min',now()+interval '5 days 30 min','T1'),
  ('aaaaaaaa-0000-0000-0000-000000000003',(now()+interval '2 hours')::date,3,now()+interval '2 hours',now()+interval '2 hours 10 min','T2'),
  ('aaaaaaaa-0000-0000-0000-000000000004',(now()+interval '6 days')::date,3,now()+interval '6 days',now()+interval '6 days 10 min','T3'),
  ('aaaaaaaa-0000-0000-0000-000000000005',(now()+interval '7 days')::date,3,now()+interval '7 days',now()+interval '7 days 10 min','T5');
 insert into slots(id,slot_date,period,start_at,end_at,room,available,reason) values
  ('aaaaaaaa-0000-0000-0000-000000000006',(now()+interval '8 days')::date,3,now()+interval '8 days',now()+interval '8 days 10 min','T6',false,'Taken on paper sign-up sheet');
 -- RLS / privacy
 foreach t in array array['slots','holds','bookings','settings','admins','admin_events'] loop
  perform pg_temp.ok(pg_temp.as_user(S1,'select * from '||t) like 'permission denied%','student cannot read table '||t);
  perform pg_temp.ok(pg_temp.anon('select * from '||t) like 'permission denied%','anon cannot read table '||t);
 end loop;
 perform pg_temp.ok(pg_temp.as_user(S1,'insert into admins values(gen_random_uuid())') like 'permission denied%','student cannot make admins');
 perform pg_temp.ok(pg_temp.as_user(S1,'update settings set locked=true where id=1') like 'permission denied%','student cannot edit settings');
 perform pg_temp.ok(pg_temp.as_user(S1,'select * from admin_bookings()')='forbidden','student blocked from admin_bookings');
 perform pg_temp.ok(pg_temp.as_user(S1,'select * from admin_slots(current_date,current_date+30)')='forbidden','student blocked from admin_slots');
 perform pg_temp.ok(pg_temp.as_user(S1,'select admin_cancel('''||k1||''')')='forbidden','student cannot admin_cancel');
 perform pg_temp.ok(pg_temp.as_user(S1,'select admin_set_lockdown(true,''x'',null,null)')='forbidden','student cannot lock site');
 perform pg_temp.ok(pg_temp.as_user(S1,'select admin_end_edit()')='forbidden','student cannot end edit lock');
 perform pg_temp.ok(pg_temp.as_user(S1,'select is_locked()') like 'permission denied%','helper is_locked not callable');
 perform pg_temp.ok(pg_temp.as_user(S1,'select touch_edit_lock()') like 'permission denied%','helper touch_edit_lock not callable');
 perform pg_temp.ok(pg_temp.anon('select list_slots()') like 'permission denied%','anon role cannot call functions');
 perform pg_temp.ok(pg_get_function_result('list_slots()'::regprocedure) not like '%name%','list_slots exposes no names');
 -- holds
 e1:=pg_temp.val(S1,'select hold_slot('''||k1||''')')::timestamptz;
 perform pg_temp.ok(e1>now() and e1<=now()+interval '61 seconds','hold lasts <= 60s from DB clock');
 perform pg_temp.ok(pg_temp.as_user(S2,'select hold_slot('''||k1||''')')='taken','second student blocked by hold');
 perform pg_temp.ok(pg_temp.val(S1,'select hold_slot('''||k1||''')')::timestamptz=e1,'re-hold does not extend');
 perform pg_temp.ok(pg_temp.as_user(S2,'select confirm_booking('''||k1||''',''B'',''x'')')='hold_expired','cannot confirm someone else''s hold');
 perform pg_temp.ok(pg_temp.as_user(S1,'select confirm_booking('''||k1||''',''   '',''x'')')='invalid_input','blank name rejected');
 perform pg_temp.ok(pg_temp.as_user(S1,'select confirm_booking('''||k1||''',''Test One'',''Essay'')')='','confirm with valid hold works');
 perform pg_temp.ok((select count(*) from bookings)=1 and (select count(*) from holds where slot_id=k1)=0,'one booking, hold cleared');
 perform pg_temp.ok(pg_temp.as_user(S1,'select hold_slot('''||k2||''')')='already_booked','one active booking per student');
 perform pg_temp.ok(pg_temp.as_user(S2,'select hold_slot('''||k1||''')')='taken','booked slot cannot be held');
 perform pg_temp.ok(pg_temp.as_user(S2,'select hold_slot('''||k6||''')')='unavailable','paper/unavailable slot cannot be held');
 perform pg_temp.ok(pg_temp.val(S1,'select state from list_slots() where id='''||k1||'''')='booked','public state booked');
 -- expiry
 perform pg_temp.val(S3,'select hold_slot('''||k2||''')');
 update holds set expires_at=now()-interval '1 second' where slot_id=k2;
 perform pg_temp.ok(pg_temp.val(S2,'select state from list_slots() where id='''||k2||'''')='open','expired hold shows open');
 perform pg_temp.ok(pg_temp.as_user(S3,'select confirm_booking('''||k2||''',''Three'',''x'')')='hold_expired','expired hold cannot be confirmed');
 perform pg_temp.ok(pg_temp.as_user(S2,'select hold_slot('''||k2||''')')='','other student can take expired slot');
 -- manual / scheduled lockdown
 update settings set locked=true where id=1;
 perform pg_temp.ok(pg_temp.as_user(S3,'select hold_slot('''||k4||''')')='locked','manual lockdown blocks hold');
 perform pg_temp.ok(pg_temp.as_user(S2,'select confirm_booking('''||k2||''',''Two'',''x'')')='locked','manual lockdown blocks confirm');
 perform pg_temp.ok((pg_temp.val(S3,'select public_state()')::json->>'locked')='true','public_state reports lock');
 update settings set locked=false,lock_from=now()-interval '1 minute',lock_until=now()+interval '1 hour' where id=1;
 perform pg_temp.ok(pg_temp.as_user(S3,'select hold_slot('''||k4||''')')='locked','scheduled lockdown active without any browser');
 update settings set lock_from=now()-interval '2 hours',lock_until=now()-interval '1 hour' where id=1;
 perform pg_temp.ok(pg_temp.as_user(S3,'select hold_slot('''||k4||''')')='','scheduled lock auto-reopens');
 update settings set lock_from=now()+interval '1 hour',lock_until=null where id=1;
 perform pg_temp.ok(pg_temp.as_user(S3,'select hold_slot('''||k4||''')')='','future scheduled lock not yet active');
 update settings set lock_from=null,lock_until=null where id=1;
 perform pg_temp.ok(pg_temp.as_user(A,'select admin_set_lockdown(false,''x'',null,now()+interval ''1 hour'')')='invalid_time','reopen time without lock start rejected');
 perform pg_temp.ok(pg_temp.as_user(A,'select admin_set_lockdown(false,''m'',now()-interval ''1 minute'',now()+interval ''1 hour'')')='','admin sets lock-now-until-reopen');
 perform pg_temp.ok(pg_temp.as_user(S3,'select hold_slot('''||k4||''')')='locked','lock-now-until-reopen blocks students');
 perform pg_temp.ok(pg_temp.as_user(A,'select admin_set_lockdown(false,''m'',null,null)')='','admin unlocks');
 perform pg_temp.ok(pg_temp.as_user(S3,'select hold_slot('''||k4||''')')='','unlock clears scheduled lock');
 -- EDIT LOCK: off by default; on only for slot-changing actions; rolling 10 min; self-expiring; end-able
 update settings set auto_lock_on_edit=false,edit_lock_until=null where id=1;
 perform pg_temp.ok(pg_temp.as_user(A,'select admin_set_available('''||k5||''',false,null)')='','close slot with auto-lock OFF');
 perform pg_temp.ok(not is_locked(),'auto-lock OFF: schedule change does not lock students');
 update settings set auto_lock_on_edit=true where id=1;
 perform pg_temp.ok(pg_temp.as_user(A,'select admin_set_available('''||k5||''',true,null)')='','reopen slot with auto-lock ON');
 perform pg_temp.ok(is_locked(),'slot change starts edit lock');
 perform pg_temp.ok((select edit_lock_until=now()+interval '10 minutes' from settings),'edit lock is exactly 10 minutes (rolling)');
 perform pg_temp.ok(pg_temp.as_user(S3,'select hold_slot('''||k4||''')')='locked','students blocked during edit lock');
 r:=pg_temp.as_user(A,'select admin_end_edit()'); perform pg_temp.ok(r='','Finish editing call succeeds'); perform pg_temp.ok(not is_locked(),'Finish editing unlocks immediately');
 r:=pg_temp.as_user(A,'select admin_upsert_slot(null,current_date+30,3,''09:00'',''09:10'',''T9'')'); perform pg_temp.ok(r='','admin adds a slot'); perform pg_temp.ok(is_locked(),'adding a slot starts edit lock');
 update settings set edit_lock_until=now()-interval '1 second' where id=1;
 perform pg_temp.ok(not is_locked(),'edit lock expired (not locked)'); r:=pg_temp.as_user(S3,'select hold_slot('''||k4||''')'); perform pg_temp.ok(r='','student can hold after edit lock expires');
 r:=pg_temp.as_user(A,'select admin_upsert_slot(null,current_date+30,3,''09:05'',''09:15'',''T9'')'); perform pg_temp.ok(r='conflict','overlapping room rejected'); perform pg_temp.ok(not is_locked(),'failed edit leaves no lock behind');
 perform pg_temp.ok(pg_temp.as_user(A,'select admin_upsert_slot(null,current_date+30,12,''09:05'',''09:15'',''T9'')')='invalid_input','period outside 1-9 rejected');
 perform pg_temp.ok(pg_temp.as_user(A,'select admin_upsert_slot(null,current_date+30,3,''09:10'',''09:00'',''T8'')')='invalid_time','end before start rejected');
 perform pg_temp.ok((pg_temp.val(A,'select admin_stats()')::json->>'total')::int>=6,'admin stats work');
 -- cancellation rule
 perform pg_temp.val(S3,'select hold_slot('''||k3||''')');
 perform pg_temp.ok(pg_temp.as_user(S3,'select confirm_booking('''||k3||''',''Three'',''x'')')='','S3 books slot starting in 2h');
 perform pg_temp.ok(pg_temp.as_user(S3,'select cancel_my_booking()')='too_late','cancel < 24h refused');
 perform pg_temp.ok(pg_temp.as_user(S1,'select cancel_my_booking()')='','cancel > 24h allowed');
 perform pg_temp.ok((select count(*) from bookings where slot_id=k1)=0,'cancelled slot released');
 perform pg_temp.ok(pg_temp.as_user(A,'select admin_cancel('''||k3||''')')='','admin can cancel any booking');
 -- two real bookings for the admin-action tests
 perform pg_temp.as_user(S1,'select hold_slot('''||k1||''')'); perform pg_temp.ok(pg_temp.as_user(S1,'select confirm_booking('''||k1||''',''Again'',''x'')')='','S1 rebooks k1');
 perform pg_temp.as_user(S2,'select hold_slot('''||k2||''')'); perform pg_temp.ok(pg_temp.as_user(S2,'select confirm_booking('''||k2||''',''Two'',''x'')')='','S2 books k2');
 -- booking fixes and copy/publish must NOT start an edit lock
 update settings set auto_lock_on_edit=true,edit_lock_until=null where id=1;
 n:=pg_temp.val(A,'select admin_copy_schedule(current_date+5,current_date+5,current_date+19,true)')::int;
 perform pg_temp.ok(n>=2,'copy created slots');
 perform pg_temp.ok((select count(*) from bookings)=2 and (select count(*) from holds)=0,'copy created no bookings/holds');
 perform pg_temp.ok((select count(*) from slots where draft)=n,'copied slots are drafts');
 perform pg_temp.ok(pg_temp.val(S2,'select count(*) from list_slots() where slot_date=current_date+19')::int=0,'drafts hidden from students');
 perform pg_temp.ok(pg_temp.val(A,'select admin_publish_range(current_date+19,current_date+19)')::int>=1,'publish drafts');
 perform pg_temp.ok((select edit_lock_until is null from settings),'copy/publish did not start edit lock');
 perform pg_temp.ok(pg_temp.as_user(A,'select admin_set_available('''||k1||''',false,null)')='has_booking','cannot mark a booked slot unavailable');
 perform pg_temp.ok(pg_temp.as_user(A,'select admin_delete_slot('''||k1||''')')='has_booking','cannot delete a booked slot');
 update settings set edit_lock_until=null where id=1;
 perform pg_temp.ok(pg_temp.as_user(A,'select admin_swap_bookings('''||k1||''','''||k2||''')')='','admin swaps two bookings');
 perform pg_temp.ok((select slot_id from bookings where student=S1)=k2 and (select slot_id from bookings where student=S2)=k1,'swap exchanged slots');
 perform pg_temp.ok(pg_temp.as_user(A,'select admin_move_booking('''||k2||''','''||k6||''')')='unavailable','cannot move into unavailable slot');
 perform pg_temp.ok(pg_temp.as_user(A,'select admin_move_booking('''||k2||''','''||k1||''')')='taken','cannot move onto a booked slot');
 perform pg_temp.ok(pg_temp.as_user(A,'select admin_move_booking('''||k2||''','''||k4||''')')='','admin moves booking');
 perform pg_temp.ok((select slot_id from bookings where student=S1)=k4,'booking now at new slot');
 r:=pg_temp.as_user(A,'select admin_edit_booking('''||k4||''',''Renamed'',''Essay 2'')'); perform pg_temp.ok(r='','admin_edit_booking call returns no error');
 perform pg_temp.ok((select name from bookings where slot_id=k4)='Renamed' and (select assignment from bookings where slot_id=k4)='Essay 2','booking row now holds the edited name and assignment');
 perform pg_temp.ok(pg_temp.as_user(A,'select admin_edit_booking('''||k4||''',''  '',''x'')')='invalid_input','blank edit rejected');
 perform pg_temp.ok((select edit_lock_until is null from settings),'booking fixes did not start edit lock');
 -- range close/reopen must not free paper slots
 update settings set auto_lock_on_edit=false where id=1;
 perform pg_temp.ok(pg_temp.val(A,'select admin_set_range_available(current_date+7,current_date+8,false)')::int>=1,'close range closes open slots');
 perform pg_temp.ok((select reason from slots where id=k5)='Closed by teacher','closed slot labelled');
 perform pg_temp.ok(pg_temp.val(A,'select admin_set_range_available(current_date+7,current_date+8,true)')::int=1,'reopen range reopens only the slot it closed');
 perform pg_temp.ok((select available from slots where id=k5) and not (select available from slots where id=k6),'paper slot stayed unavailable after reopen range');
 -- ===== v2.1.6: the three settings functions ran "update settings" with NO WHERE; Supabase's API roles reject that (error 21000) =====
 perform pg_temp.ok(not exists(select 1 from pg_proc pr join pg_namespace ns on ns.oid=pr.pronamespace join pg_language lg on lg.oid=pr.prolang,
    regexp_split_to_table(regexp_replace(pr.prosrc,'--[^\n]*','','g'),';') piece
  where ns.nspname='public' and lg.lanname in ('plpgsql','sql') and piece ~* '\m(update|delete)\M' and piece !~* '\m(update|delete)\M.*\mwhere\M' and piece !~* '\mfor\s+update\M'),
  'no function in schema public has an UPDATE or DELETE without WHERE');
 r:=pg_temp.as_user(A,'select admin_update_settings(''New rules text'',true,''America/Chicago'')'); perform pg_temp.ok(r='','admin_update_settings call succeeds');
 perform pg_temp.ok((select policy='New rules text' and auto_lock_on_edit and tz='America/Chicago' from settings where id=1),'admin_update_settings saves rules text, auto-lock flag and time zone');
 r:=pg_temp.as_user(A,'select admin_update_settings(''   '',false,''America/New_York'')'); perform pg_temp.ok(r='','admin_update_settings accepts blank rules text');
 perform pg_temp.ok((select policy='New rules text' and not auto_lock_on_edit and tz='America/New_York' from settings where id=1),'blank rules text keeps the existing rules while the other fields update');
 r:=pg_temp.as_user(A,'select admin_update_settings(''x'',false,''Not/AZone'')'); perform pg_temp.ok(r='invalid_input','unknown time zone rejected');
 perform pg_temp.ok((select tz='America/New_York' from settings where id=1),'rejected time zone changed nothing');
 perform pg_temp.ok(pg_temp.as_user(S1,'select admin_update_settings(''x'',false,''America/New_York'')')='forbidden','student cannot call admin_update_settings');
 r:=pg_temp.as_user(A,'select admin_set_lockdown(true,''Custom message'',null,null)'); perform pg_temp.ok(r='','admin_set_lockdown (Lock now) call succeeds');
 perform pg_temp.ok((select locked and lock_message='Custom message' from settings where id=1),'Lock now sets locked and the message');
 r:=pg_temp.as_user(A,'select admin_set_lockdown(false,''Custom message'',null,null)'); perform pg_temp.ok(r='','admin_set_lockdown (Unlock now) call succeeds');
 perform pg_temp.ok((select not locked and lock_from is null and lock_until is null and edit_lock_until is null from settings where id=1),'Unlock now clears locked, schedule and edit lock');
 update settings set edit_lock_until=now()+interval '5 minutes' where id=1;
 r:=pg_temp.as_user(A,'select admin_end_edit()'); perform pg_temp.ok(r='','admin_end_edit call succeeds');
 perform pg_temp.ok((select edit_lock_until is null from settings where id=1),'admin_end_edit clears the edit lock');
  raise exception 'DB_TESTS_FINISHED_ROLLING_BACK' using errcode='U0001';
 exception when sqlstate 'U0001' then null;   -- ONLY the deliberate exception is caught; a FAILED: error is not
 end;    -- ===== end of rolled-back region =====
 select case when q.is_called then q.last_value else 0 end,q.is_called into npass,was_called from pg_temp.test_pass_counter q;
 select (select count(*) from slots where id::text like 'aaaaaaaa-0000-0000-0000-0000000000%' or room in ('T1','T2','T3','T5','T6','T9'))
  + (select count(*) from admins where user_id='11111111-1111-1111-1111-111111111111')
  + (select count(*) from bookings where student in ('22222222-2222-2222-2222-222222222222','33333333-3333-3333-3333-333333333333','44444444-4444-4444-4444-444444444444'))
  + (select count(*) from holds where student in ('22222222-2222-2222-2222-222222222222','33333333-3333-3333-3333-333333333333','44444444-4444-4444-4444-444444444444'))
  + (select count(*) from admin_events where admin_id='11111111-1111-1111-1111-111111111111') into leftover;
 select to_jsonb(s)=before_cfg into restored from settings s;
 return query select case when npass<>108 then 'INCOMPLETE: ran '||npass||' assertions, expected 108'
                          when leftover<>0 or restored is not true then 'PASSED BUT CLEANUP CHECK FAILED'
                          else 'ALL DB TESTS PASSED' end,
                npass,108,leftover,restored;
end $$;

select * from pg_temp.run_db_tests();
