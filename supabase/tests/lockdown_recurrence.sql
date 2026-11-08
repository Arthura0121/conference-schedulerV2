-- Run after migration 006 on a disposable database. All test settings roll back.
begin;
set local timezone = 'UTC';

do $$
declare
 cfg public.settings;
 w record;
 teacher uuid := '10000000-0000-4000-8000-000000000001';
begin
 if exists (select 1 from public.bookings) then raise exception 'Use a disposable database for lockdown tests'; end if;
 select * into strict cfg from public.settings where id=1;
 cfg.tz:='America/New_York';
 cfg.recurring_start:='2028-01-31 22:00';
 cfg.recurring_end:='2028-02-02 07:00';
 cfg.recurring_unit:='month';
 cfg.recurring_every:=1;
 select * into w from public.recurring_lock_window(cfg,'2028-02-29 21:00-05');
 if w.active or w.next_change is distinct from '2028-02-29 22:00-05'::timestamptz then raise exception 'Monthly date did not clamp to leap day: %',w; end if;
 select * into w from public.recurring_lock_window(cfg,'2028-03-01 04:00-05');
 if not w.active or w.next_change is distinct from '2028-03-02 07:00-05'::timestamptz then raise exception 'Multi-day recurrence did not stay active across month boundary: %',w; end if;

 cfg.recurring_start:='2027-03-07 09:00';
 cfg.recurring_end:='2027-03-07 10:00';
 cfg.recurring_unit:='week';
 select * into w from public.recurring_lock_window(cfg,'2027-03-13 20:00-05');
 if w.active or w.next_change is distinct from '2027-03-14 09:00-04'::timestamptz then raise exception 'Local start moved after daylight saving: %',w; end if;
 select * into w from public.recurring_lock_window(cfg,'2027-03-14 10:00-04');
 if w.active or w.next_change is distinct from '2027-03-21 09:00-04'::timestamptz then raise exception 'Weekly reopening boundary was not exclusive: %',w; end if;

 cfg.recurring_start:='2028-02-29 15:00';
 cfg.recurring_end:='2028-02-29 16:00';
 cfg.recurring_unit:='year';
 select * into w from public.recurring_lock_window(cfg,'2029-01-01 00:00-05');
 if w.active or w.next_change is distinct from '2029-02-28 15:00-05'::timestamptz then raise exception 'Yearly leap day did not clamp: %',w; end if;

 cfg.recurring_start:='2026-11-01 23:00';
 cfg.recurring_end:='2026-11-02 02:00';
 cfg.recurring_unit:='day';
 cfg.recurring_every:=2;
 select * into w from public.recurring_lock_window(cfg,'2026-11-04 01:00-05');
 if not w.active or w.next_change is distinct from '2026-11-04 02:00-05'::timestamptz then raise exception 'Custom repeat missed overnight occurrence: %',w; end if;
 select * into w from public.recurring_lock_window(cfg,'2026-11-04 03:00-05');
 if w.active or w.next_change is distinct from '2026-11-05 23:00-05'::timestamptz then raise exception 'Custom repeat fired on the wrong day: %',w; end if;

 insert into public.admins(user_id) values (teacher);
 perform set_config('request.jwt.claim.sub',teacher::text,true);
 update public.settings set locked=false,manual_lock_until=null,lock_from=now()-interval '2 days',lock_until=now()-interval '1 day',edit_lock_until=null,
   recurring_start=null,recurring_end=null,recurring_unit=null,recurring_every=null where id=1;
 if public.is_locked() or public.admin_settings()->>'lock_until' is not null then raise exception 'Expired one-time schedule still blocks controls'; end if;
 perform public.admin_set_manual_lock(true,null,now()+interval '1 hour');
 if not public.is_locked() then raise exception 'Cannot lock after expired schedule'; end if;
 perform public.admin_set_lock_schedule(null,now()+interval '2 hours',now()+interval '3 hours');
 perform public.admin_set_recurring_lock('2035-01-31 09:00','2035-01-31 10:00','month',1,null);
 if not public.is_locked() or (public.admin_settings()->>'lock_from')::timestamptz is distinct from now()+interval '2 hours' then
  raise exception 'Scheduling modified an independent lock';
 end if;
 perform public.admin_set_manual_lock(false,null,null);
 if public.is_locked() or public.admin_settings()->>'recurring_start' is null then raise exception 'Ending manual lock modified recurrence'; end if;
 if (public.public_state()->>'next_change')::timestamptz is distinct from now()+interval '2 hours' then raise exception 'Public next transition is wrong'; end if;
 perform public.admin_set_recurring_lock(
   (now() at time zone cfg.tz)-interval '3 hours',
   (now() at time zone cfg.tz)+interval '3 hours','day',1,null);
 if not (public.public_state()->>'locked')::boolean then raise exception 'Recurring lock did not reach the public state'; end if;
 begin
  perform public.hold_slot('10000000-0000-4000-8000-000000000003');
  raise exception 'Recurring lock did not protect booking';
 exception when raise_exception then
  if sqlerrm <> 'locked' then raise; end if;
 end;
 if has_function_privilege('anon','public.admin_set_recurring_lock(timestamp,timestamp,text,integer,text)','execute') then raise exception 'Anonymous mutation privilege'; end if;
 if has_function_privilege('authenticated','public.conference_lock_state(public.settings,timestamptz)','execute') then raise exception 'Lock helper exposed'; end if;
 perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
 begin
  perform public.admin_set_recurring_lock(null,null,null,null,null);
  raise exception 'Non-admin changed recurrence';
 exception when raise_exception then
  if sqlerrm <> 'forbidden' then raise; end if;
 end;
end $$;
rollback;
