-- Database test suite. Run in a TEST Supabase project (SQL Editor) AFTER 001_schema.sql. Do NOT run on a project with real bookings.
-- Everything happens inside one transaction that is rolled back at the end, so no data is left behind.
-- Success = a final result line "ALL DB TESTS PASSED"; any failure aborts with "FAILED: <name>".
begin;
create function pg_temp.ok(c boolean,n text) returns void language plpgsql as $$ begin if c is not true then raise exception 'FAILED: %',n; end if; raise notice 'PASS: %',n; end $$;
-- run stmt as a signed-in user; returns '' on success or the error message
create function pg_temp.as_user(u uuid,stmt text) returns text language plpgsql as $$
declare r text:='';
begin
 perform set_config('request.jwt.claims',json_build_object('sub',u,'role','authenticated')::text,true);
 perform set_config('request.jwt.claim.sub',u::text,true);
 execute 'set local role authenticated';
 begin execute stmt; exception when others then r:=sqlerrm; end;
 execute 'reset role'; return r;
end $$;
create function pg_temp.val(u uuid,q text) returns text language plpgsql as $$
declare r text;
begin
 perform set_config('request.jwt.claims',json_build_object('sub',u,'role','authenticated')::text,true);
 perform set_config('request.jwt.claim.sub',u::text,true);
 execute 'set local role authenticated'; execute q into r; execute 'reset role'; return r;
end $$;
create function pg_temp.anon(stmt text) returns text language plpgsql as $$
declare r text:='';
begin execute 'set local role anon'; begin execute stmt; exception when others then r:=sqlerrm; end; execute 'reset role'; return r; end $$;

insert into admins values('11111111-1111-1111-1111-111111111111');
update settings set locked=false,lock_from=null,lock_until=null,edit_lock_until=null;
insert into slots(id,slot_date,period,start_at,end_at,room) values
 ('aaaaaaaa-0000-0000-0000-000000000001',(now()+interval '5 days')::date,3,now()+interval '5 days',now()+interval '5 days 10 min','T1'),
 ('aaaaaaaa-0000-0000-0000-000000000002',(now()+interval '5 days')::date,3,now()+interval '5 days 20 min',now()+interval '5 days 30 min','T1'),
 ('aaaaaaaa-0000-0000-0000-000000000003',(now()+interval '2 hours')::date,3,now()+interval '2 hours',now()+interval '2 hours 10 min','T2'),
 ('aaaaaaaa-0000-0000-0000-000000000004',(now()+interval '6 days')::date,3,now()+interval '6 days',now()+interval '6 days 10 min','T3'),
 ('aaaaaaaa-0000-0000-0000-000000000005',(now()+interval '7 days')::date,3,now()+interval '7 days',now()+interval '7 days 10 min','T5');
insert into slots(id,slot_date,period,start_at,end_at,room,available,reason) values
 ('aaaaaaaa-0000-0000-0000-000000000006',(now()+interval '8 days')::date,3,now()+interval '8 days',now()+interval '8 days 10 min','T6',false,'Taken on paper sign-up sheet');

do $$ declare A uuid:='11111111-1111-1111-1111-111111111111'; S1 uuid:='22222222-2222-2222-2222-222222222222'; S2 uuid:='33333333-3333-3333-3333-333333333333'; S3 uuid:='44444444-4444-4444-4444-444444444444';
 k1 uuid:='aaaaaaaa-0000-0000-0000-000000000001'; k2 uuid:='aaaaaaaa-0000-0000-0000-000000000002'; k3 uuid:='aaaaaaaa-0000-0000-0000-000000000003'; k4 uuid:='aaaaaaaa-0000-0000-0000-000000000004'; k5 uuid:='aaaaaaaa-0000-0000-0000-000000000005'; k6 uuid:='aaaaaaaa-0000-0000-0000-000000000006'; e1 timestamptz; t text; n int;
begin
 -- RLS / privacy
 foreach t in array array['slots','holds','bookings','settings','admins','admin_events'] loop
  perform pg_temp.ok(pg_temp.as_user(S1,'select * from '||t) like 'permission denied%','student cannot read table '||t);
  perform pg_temp.ok(pg_temp.anon('select * from '||t) like 'permission denied%','anon cannot read table '||t);
 end loop;
 perform pg_temp.ok(pg_temp.as_user(S1,'insert into admins values(gen_random_uuid())') like 'permission denied%','student cannot make admins');
 perform pg_temp.ok(pg_temp.as_user(S1,'update settings set locked=true') like 'permission denied%','student cannot edit settings');
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
 update settings set locked=true;
 perform pg_temp.ok(pg_temp.as_user(S3,'select hold_slot('''||k4||''')')='locked','manual lockdown blocks hold');
 perform pg_temp.ok(pg_temp.as_user(S2,'select confirm_booking('''||k2||''',''Two'',''x'')')='locked','manual lockdown blocks confirm');
 perform pg_temp.ok((pg_temp.val(S3,'select public_state()')::json->>'locked')='true','public_state reports lock');
 update settings set locked=false,lock_from=now()-interval '1 minute',lock_until=now()+interval '1 hour';
 perform pg_temp.ok(pg_temp.as_user(S3,'select hold_slot('''||k4||''')')='locked','scheduled lockdown active without any browser');
 update settings set lock_from=now()-interval '2 hours',lock_until=now()-interval '1 hour';
 perform pg_temp.ok(pg_temp.as_user(S3,'select hold_slot('''||k4||''')')='','scheduled lock auto-reopens');
 update settings set lock_from=now()+interval '1 hour',lock_until=null;
 perform pg_temp.ok(pg_temp.as_user(S3,'select hold_slot('''||k4||''')')='','future scheduled lock not yet active');
 update settings set lock_from=null,lock_until=null;
 perform pg_temp.ok(pg_temp.as_user(A,'select admin_set_lockdown(false,''x'',null,now()+interval ''1 hour'')')='invalid_time','reopen time without lock start rejected');
 perform pg_temp.ok(pg_temp.as_user(A,'select admin_set_lockdown(false,''m'',now()-interval ''1 minute'',now()+interval ''1 hour'')')='','admin sets lock-now-until-reopen');
 perform pg_temp.ok(pg_temp.as_user(S3,'select hold_slot('''||k4||''')')='locked','lock-now-until-reopen blocks students');
 perform pg_temp.ok(pg_temp.as_user(A,'select admin_set_lockdown(false,''m'',null,null)')='','admin unlocks');
 perform pg_temp.ok(pg_temp.as_user(S3,'select hold_slot('''||k4||''')')='','unlock clears scheduled lock');
 -- EDIT LOCK: off by default; on only for slot-changing actions; rolling 10 min; self-expiring; end-able
 update settings set auto_lock_on_edit=false,edit_lock_until=null;
 perform pg_temp.ok(pg_temp.as_user(A,'select admin_set_available('''||k5||''',false,null)')='','close slot with auto-lock OFF');
 perform pg_temp.ok(not is_locked(),'auto-lock OFF: schedule change does not lock students');
 update settings set auto_lock_on_edit=true;
 perform pg_temp.ok(pg_temp.as_user(A,'select admin_set_available('''||k5||''',true,null)')='','reopen slot with auto-lock ON');
 perform pg_temp.ok(is_locked(),'slot change starts edit lock');
 perform pg_temp.ok((select edit_lock_until=now()+interval '10 minutes' from settings),'edit lock is exactly 10 minutes (rolling)');
 perform pg_temp.ok(pg_temp.as_user(S3,'select hold_slot('''||k4||''')')='locked','students blocked during edit lock');
 perform pg_temp.ok(pg_temp.as_user(A,'select admin_end_edit()')='' and not is_locked(),'Finish editing unlocks immediately');
 perform pg_temp.ok(pg_temp.as_user(A,'select admin_upsert_slot(null,current_date+30,3,''09:00'',''09:10'',''T9'')')='' and is_locked(),'adding a slot starts edit lock');
 update settings set edit_lock_until=now()-interval '1 second';
 perform pg_temp.ok(not is_locked() and pg_temp.as_user(S3,'select hold_slot('''||k4||''')')='','edit lock expires by itself');
 perform pg_temp.ok(pg_temp.as_user(A,'select admin_upsert_slot(null,current_date+30,3,''09:05'',''09:15'',''T9'')')='conflict' and not is_locked(),'failed edit leaves no lock behind');
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
 update settings set auto_lock_on_edit=true,edit_lock_until=null;
 n:=pg_temp.val(A,'select admin_copy_schedule(current_date+5,current_date+5,current_date+19,true)')::int;
 perform pg_temp.ok(n>=2,'copy created slots');
 perform pg_temp.ok((select count(*) from bookings)=2 and (select count(*) from holds)=0,'copy created no bookings/holds');
 perform pg_temp.ok((select count(*) from slots where draft)=n,'copied slots are drafts');
 perform pg_temp.ok(pg_temp.val(S2,'select count(*) from list_slots() where slot_date=current_date+19')::int=0,'drafts hidden from students');
 perform pg_temp.ok(pg_temp.val(A,'select admin_publish_range(current_date+19,current_date+19)')::int>=1,'publish drafts');
 perform pg_temp.ok((select edit_lock_until is null from settings),'copy/publish did not start edit lock');
 perform pg_temp.ok(pg_temp.as_user(A,'select admin_set_available('''||k1||''',false,null)')='has_booking','cannot mark a booked slot unavailable');
 perform pg_temp.ok(pg_temp.as_user(A,'select admin_delete_slot('''||k1||''')')='has_booking','cannot delete a booked slot');
 update settings set edit_lock_until=null;
 perform pg_temp.ok(pg_temp.as_user(A,'select admin_swap_bookings('''||k1||''','''||k2||''')')='','admin swaps two bookings');
 perform pg_temp.ok((select slot_id from bookings where student=S1)=k2 and (select slot_id from bookings where student=S2)=k1,'swap exchanged slots');
 perform pg_temp.ok(pg_temp.as_user(A,'select admin_move_booking('''||k2||''','''||k6||''')')='unavailable','cannot move into unavailable slot');
 perform pg_temp.ok(pg_temp.as_user(A,'select admin_move_booking('''||k2||''','''||k1||''')')='taken','cannot move onto a booked slot');
 perform pg_temp.ok(pg_temp.as_user(A,'select admin_move_booking('''||k2||''','''||k4||''')')='','admin moves booking');
 perform pg_temp.ok((select slot_id from bookings where student=S1)=k4,'booking now at new slot');
 perform pg_temp.ok(pg_temp.as_user(A,'select admin_edit_booking('''||k4||''',''Renamed'',''Essay 2'')')='' and (select name from bookings where slot_id=k4)='Renamed','admin edits booking');
 perform pg_temp.ok(pg_temp.as_user(A,'select admin_edit_booking('''||k4||''',''  '',''x'')')='invalid_input','blank edit rejected');
 perform pg_temp.ok((select edit_lock_until is null from settings),'booking fixes did not start edit lock');
 -- range close/reopen must not free paper slots
 update settings set auto_lock_on_edit=false;
 perform pg_temp.ok(pg_temp.val(A,'select admin_set_range_available(current_date+7,current_date+8,false)')::int>=1,'close range closes open slots');
 perform pg_temp.ok((select reason from slots where id=k5)='Closed by teacher','closed slot labelled');
 perform pg_temp.ok(pg_temp.val(A,'select admin_set_range_available(current_date+7,current_date+8,true)')::int=1,'reopen range reopens only the slot it closed');
 perform pg_temp.ok((select available from slots where id=k5) and not (select available from slots where id=k6),'paper slot stayed unavailable after reopen range');
 raise notice 'ALL DB TESTS PASSED';
end $$;
rollback;
