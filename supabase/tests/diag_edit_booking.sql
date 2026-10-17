-- Tiny diagnostic for ONE feature (admin_edit_booking). TEST project only. Rolls back; leaves nothing behind.
-- It prints NOTICE lines: what the call returned, then (in a separate statement) what the row contains.
begin;
insert into admins values('11111111-1111-1111-1111-111111111111');
insert into slots(id,slot_date,period,start_at,end_at,room) values('aaaaaaaa-0000-0000-0000-0000000000d1',(now()+interval '3 days')::date,3,now()+interval '3 days',now()+interval '3 days 10 min','DIAG');
insert into bookings(slot_id,student,name,assignment) values('aaaaaaaa-0000-0000-0000-0000000000d1','22222222-2222-2222-2222-222222222222','Original','Essay');
create function pg_temp.f() returns text language plpgsql as $$
begin perform set_config('request.jwt.claims','{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}',true);
 perform set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);
 execute 'set local role authenticated'; perform admin_edit_booking('aaaaaaaa-0000-0000-0000-0000000000d1','Renamed','Essay 2'); execute 'reset role'; return ''; end $$;
do $$ declare err text:=''; nm text; asg text; both_in_one text;
begin
 perform set_config('request.jwt.claims','{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}',true);
 perform set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);
 execute 'set local role authenticated';
 begin perform admin_edit_booking('aaaaaaaa-0000-0000-0000-0000000000d1','Renamed','Essay 2'); exception when others then err:=sqlerrm; end;
 execute 'reset role';
 raise notice '1) call returned error text: [%]  (empty = no error)',err;
 select name,assignment into nm,asg from bookings where slot_id='aaaaaaaa-0000-0000-0000-0000000000d1';
 raise notice '2) row read AFTER the call, in its own statement: name=[%] assignment=[%]  (expect Renamed / Essay 2)',nm,asg;
 -- Reproduce the v2.1 test pattern: call + read in ONE expression (this is what failed)
 update bookings set name='Original',assignment='Essay' where slot_id='aaaaaaaa-0000-0000-0000-0000000000d1';
 select (pg_temp.f()='') and (select name from bookings where slot_id='aaaaaaaa-0000-0000-0000-0000000000d1')='Renamed' into both_in_one;
 raise notice '3) call+read in ONE expression gives: [%]  (false here proves the test pattern, not the function, was the problem)',both_in_one;
end $$;
rollback;
