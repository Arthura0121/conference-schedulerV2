-- ROLLBACK GUIDE for 003 (TEST project). REVIEW BEFORE USE. NOT RUN by the author. Keeps all data; the added columns are left in place (harmless, default private).
-- After rolling back, deploy the v2.3.0 website again (it calls the old my_booking/admin_bookings shapes).
-- v2.4.1: only meaningful if 003 is installed. This guard stops the script (changing nothing) on a database that does not have it, instead of failing half way.
do $$ begin
 if to_regprocedure('public.admin_bulk_set_available(uuid[],boolean,boolean,boolean)') is null then
  raise exception 'STOP: migration 003 is not installed here (admin_bulk_set_available not found). Nothing to roll back; nothing was changed.';
 end if;
end $$;
drop trigger if exists rt_events_i on admin_events;
do $$ declare t text; e text; begin
 foreach t in array array['slots','holds','bookings','settings'] loop foreach e in array array['i','u','d'] loop execute format('drop trigger if exists rt_%s_%s on %I',t,e,t); end loop; end loop; end $$;
drop policy if exists sched_public_receive on realtime.messages;
drop policy if exists sched_admin_receive  on realtime.messages;
drop function if exists admin_activity(int), admin_bulk_set_available(uuid[],boolean,boolean,boolean), bulk_classify(uuid[],boolean,boolean),
  admin_set_name_hidden(uuid[],boolean), admin_set_roster_public(boolean), list_roster(), set_my_roster_consent(boolean), rt_is_admin(), rt_trg_changed(), rt_trg_events(), rt_notify(text,boolean), log_event2(text,text,jsonb);
-- restore the 001 shapes
drop function if exists confirm_booking(uuid,text,text,boolean);
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
drop function if exists my_booking();
create function my_booking() returns table(slot_id uuid,start_at timestamptz,room text,period int,student_name text,assignment text)
language sql security definer set search_path=public as
$$ select b.slot_id,s.start_at,s.room,s.period,b.name,b.assignment from bookings b join slots s on s.id=b.slot_id where b.student=auth.uid() $$;
drop function if exists admin_bookings();
create function admin_bookings() returns table(slot_id uuid,student_name text,assignment text,start_at timestamptz,room text,period int,slot_date date,dup boolean,created_at timestamptz)
language plpgsql security definer set search_path=public as $$
begin perform require_admin();
 return query select b.slot_id,b.name,b.assignment,s.start_at,s.room,s.period,s.slot_date,
  (select count(*)>1 from bookings b2 where lower(btrim(b2.name))=lower(btrim(b.name))),b.created_at
  from bookings b join slots s on s.id=b.slot_id order by s.start_at;
end $$;
create or replace function public_state() returns json language sql security definer set search_path=public as
$$ select json_build_object('locked',is_locked(),'message',lock_message,'policy',policy,'tz',tz) from settings $$;
revoke execute on function confirm_booking(uuid,text,text),my_booking(),admin_bookings() from public,anon;
grant execute on function confirm_booking(uuid,text,text),my_booking(),admin_bookings() to authenticated;
notify pgrst, 'reload schema';
