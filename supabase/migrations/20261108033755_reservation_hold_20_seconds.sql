-- New holds last 20 seconds. The RPC keeps its existing owner and execute grants.
-- Holds already issued keep their stored expires_at values.
do $$
begin
 if to_regprocedure('public.hold_slot(uuid)') is null then
  raise exception 'Apply the reservation schema before updating the hold duration';
 end if;
end $$;

create or replace function public.hold_slot(p_slot uuid)
returns timestamptz
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare s slots; e timestamptz; u uuid:=auth.uid();
begin
 if u is null then raise exception 'not_signed_in'; end if;
 if is_locked() then raise exception 'locked'; end if;
 delete from holds where expires_at<=now();
 select * into s from slots where id=p_slot for update;
 if not found or not s.available or s.draft then raise exception 'unavailable'; end if;
 if s.start_at<=now() then raise exception 'past'; end if;
 if exists(select 1 from bookings where student=u) then raise exception 'already_booked'; end if;
 if exists(select 1 from bookings where slot_id=p_slot) then raise exception 'taken'; end if;
 delete from holds where student=u and slot_id<>p_slot;
 select expires_at into e from holds where slot_id=p_slot and student=u;
 if found then return e; end if;
 if exists(select 1 from holds where slot_id=p_slot) then raise exception 'taken'; end if;
 insert into holds(slot_id,student,expires_at)
 values(p_slot,u,now()+interval '20 seconds') returning expires_at into e;
 return e;
end $$;
