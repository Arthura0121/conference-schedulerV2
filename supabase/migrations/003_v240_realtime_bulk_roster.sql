-- Aurora migration 003 (introduced in v2.4.0, CORRECTED in v2.4.1, one guard added in v2.4.2): Realtime change signals, protected bulk open/close, optional student roster, structured activity.
-- FOR YOUR REVIEW FIRST. NOT YET EXECUTED against any real PostgreSQL or Supabase database (it was only statically analysed). Apply to the TEST project before anything else.
-- Additive: no table is dropped or emptied, no slot's availability is changed, no booking is touched. Existing bookings default to PRIVATE (show_name=false, name_hidden=false).
-- Run the whole file in one go: one submitted script is one transaction, so any failure (including the self-check at the very end) undoes EVERYTHING in this file.
-- Prerequisites: 001 and 002 already applied; Realtime available on the project (it is by default).
-- v2.4.1 corrections are marked "v2.4.1:" below and listed in CHANGELOG.md / AUDIT.md.
-- v2.4.2: re-audited for PostgreSQL runtime problems (triggers, privileges, signatures, tests). The ONLY change is the guard that requires row level security on realtime.messages (marked "v2.4.2:").

-- ===== guard =====
do $$ begin
 if to_regclass('public.settings') is null or to_regclass('public.admins') is null or to_regclass('public.admin_events') is null or to_regclass('public.slots') is null
  or to_regclass('public.holds') is null or to_regclass('public.bookings') is null
  or to_regprocedure('public.admin_set_range_available(date,date,boolean)') is null or to_regprocedure('public.touch_edit_lock()') is null or to_regprocedure('public.log_event(text,text)') is null then
  raise exception 'STOP: 001/002 are not applied here. Apply them first (see SETUP.md).';
 end if;
 -- v2.4.1: 003 builds on the 002 fixes; refuse if the three settings functions still lack "where id=1" (error 21000 on Supabase otherwise).
 if to_regprocedure('public.admin_set_lockdown(boolean,text,timestamptz,timestamptz)') is null or to_regprocedure('public.admin_update_settings(text,boolean,text)') is null or to_regprocedure('public.admin_end_edit()') is null
  or (select count(*) from pg_proc where oid in (to_regprocedure('public.admin_set_lockdown(boolean,text,timestamptz,timestamptz)'),to_regprocedure('public.admin_update_settings(text,boolean,text)'),to_regprocedure('public.admin_end_edit()'))
       and regexp_replace(lower(prosrc),'\s','','g') like '%whereid=1%')<>3 then
  raise exception 'STOP: 002 is not applied here (admin_set_lockdown / admin_update_settings / admin_end_edit lack where id=1). Apply 002 first (see SETUP.md).';
 end if;
 if to_regprocedure('realtime.send(jsonb,text,text,boolean)') is null or to_regprocedure('realtime.topic()') is null or to_regclass('realtime.messages') is null then
  raise exception 'STOP: Realtime Broadcast-from-database (realtime.send, realtime.topic, realtime.messages) not found. Enable Realtime for this project (Dashboard > Realtime) and retry.';
 end if;
 -- v2.4.2: the receive policies below only protect the channels if row level security is ON for realtime.messages. verify_v240_READONLY.sql reports it as a FAIL, so refuse here,
 -- before anything is changed, instead of installing and then failing the check.
 if not coalesce((select c.relrowsecurity from pg_class c where c.oid=to_regclass('realtime.messages')),false) then
  raise exception 'STOP: row level security is OFF on realtime.messages, so the private-channel policies in this migration would not be enforced. Nothing was changed. Do not apply 003 until this is resolved with your reviewer.';
 end if;
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='admin_bulk_set_available')
  or exists(select 1 from pg_trigger t where t.tgname like 'rt\_%' and not t.tgisinternal)
  or exists(select 1 from pg_policies where schemaname='realtime' and tablename='messages' and policyname in ('sched_public_receive','sched_admin_receive')) then
  raise exception 'STOP: 003 looks already applied (admin_bulk_set_available, rt_* triggers or sched_* realtime policies exist). Do not run it twice; use supabase/tests/verify_v240_READONLY.sql to see the state.';
 end if;
end $$;

-- ===== additive columns (constant defaults: every existing row becomes private / unchanged) =====
alter table settings     add column if not exists public_roster boolean not null default false;
alter table bookings     add column if not exists show_name boolean not null default false;     -- the student's consent
alter table bookings     add column if not exists name_hidden boolean not null default false;   -- the teacher's override (always wins)
alter table admin_events add column if not exists meta jsonb;                                    -- structured details for NEW events; old rows stay NULL

-- ===== internal helpers (never browser-callable) =====
-- v2.4.1: every NEW or replaced SECURITY DEFINER function below uses  set search_path=public,pg_temp  (pg_temp LAST). With plain  search_path=public  PostgreSQL searches
-- the session's temporary schema FIRST for tables, so a temp table named like one of ours could shadow it. Browsers cannot create temp objects through the API, so this was
-- not exploitable, but it is the documented hardening for SECURITY DEFINER functions and costs nothing.
create function log_event2(a text,d text,m jsonb) returns void language sql security definer set search_path=public,pg_temp as
$$ insert into admin_events(admin_id,action,detail,meta) values(auth.uid(),a,d,m) $$;

-- A Realtime failure must NEVER fail or slow a booking: errors are swallowed (each send in its own sub-block, so one failure cannot skip the other), and the app always trusts the database response, not this signal.
-- Payload is only {v,kind}. No names, assignments, ids or emails are ever sent.
-- v2.4.1: a swallowed failure now leaves a WARNING in the Postgres log (Dashboard > Logs > Postgres) instead of vanishing silently, so a broken Realtime setup can be diagnosed.
create function rt_notify(p_kind text,p_admin_only boolean) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not p_admin_only then
  begin
   perform realtime.send(jsonb_build_object('v',1,'kind',p_kind),'sync','sched:public',true);
  exception when others then raise warning 'rt_notify public signal failed: %',sqlerrm;
  end;
 end if;
 begin
  perform realtime.send(jsonb_build_object('v',1,'kind',p_kind),'sync','sched:admin',true);
 exception when others then raise warning 'rt_notify admin signal failed: %',sqlerrm;
 end;
end $$;

-- Statement-level triggers with transition tables: ONE signal per statement (a 60-slot bulk update sends one message, a no-op housekeeping delete sends none).
create function rt_trg_changed() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if exists(select 1 from changed) then perform rt_notify(tg_argv[0],false); end if;
 return null;
end $$;
create function rt_trg_events() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if exists(select 1 from changed) then perform rt_notify('activity',true); end if;
 return null;
end $$;

create trigger rt_slots_i    after insert on slots    referencing new table as changed for each statement execute function rt_trg_changed('slots');
create trigger rt_slots_u    after update on slots    referencing old table as changed for each statement execute function rt_trg_changed('slots');
create trigger rt_slots_d    after delete on slots    referencing old table as changed for each statement execute function rt_trg_changed('slots');
create trigger rt_holds_i    after insert on holds    referencing new table as changed for each statement execute function rt_trg_changed('holds');
create trigger rt_holds_u    after update on holds    referencing old table as changed for each statement execute function rt_trg_changed('holds');
create trigger rt_holds_d    after delete on holds    referencing old table as changed for each statement execute function rt_trg_changed('holds');
create trigger rt_bookings_i after insert on bookings referencing new table as changed for each statement execute function rt_trg_changed('bookings');
create trigger rt_bookings_u after update on bookings referencing old table as changed for each statement execute function rt_trg_changed('bookings');
create trigger rt_bookings_d after delete on bookings referencing old table as changed for each statement execute function rt_trg_changed('bookings');
create trigger rt_settings_i after insert on settings referencing new table as changed for each statement execute function rt_trg_changed('settings');
create trigger rt_settings_u after update on settings referencing old table as changed for each statement execute function rt_trg_changed('settings');
create trigger rt_settings_d after delete on settings referencing old table as changed for each statement execute function rt_trg_changed('settings');
create trigger rt_events_i   after insert on admin_events referencing new table as changed for each statement execute function rt_trg_events();

-- ===== Realtime authorization: clients may only RECEIVE; there is NO insert policy, so a browser cannot forge a signal =====
-- The policies are evaluated by Supabase Realtime when a browser JOINS a private channel: realtime.topic() is the topic being joined. Both are SELECT-only and TO authenticated
-- (students are anonymous-auth sessions, which carry the authenticated role). The admin topic additionally requires a row in public.admins.
create function rt_is_admin() returns boolean language sql stable security definer set search_path=public,pg_temp as
$$ select exists(select 1 from admins where user_id=auth.uid()) $$;

drop policy if exists sched_public_receive on realtime.messages;
drop policy if exists sched_admin_receive  on realtime.messages;
create policy sched_public_receive on realtime.messages for select to authenticated
 using (realtime.messages.extension='broadcast' and realtime.topic()='sched:public');
create policy sched_admin_receive on realtime.messages for select to authenticated
 using (realtime.messages.extension='broadcast' and realtime.topic()='sched:admin' and rt_is_admin());

-- ===== public_state: same JSON plus roster flag and the next time-based change (scheduled lockdown / edit lock), so clients can re-check on time =====
create or replace function public_state() returns json language sql security definer set search_path=public,pg_temp as
$$ select json_build_object('locked',is_locked(),'message',lock_message,'policy',policy,'tz',tz,'roster_on',public_roster,
    'next_change',(select min(v.t) from (values (lock_from),(lock_until),(edit_lock_until)) v(t) where v.t>now())) from settings $$;

-- ===== roster (student side) =====
-- confirm_booking gains an optional consent flag (default false, so an old 3-argument caller still works). Body otherwise identical to 001.
drop function if exists confirm_booking(uuid,text,text);
create function confirm_booking(p_slot uuid,p_name text,p_assignment text,p_show_name boolean default false) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare s slots; u uuid:=auth.uid(); c text;
begin
 if u is null then raise exception 'not_signed_in'; end if;
 if is_locked() then raise exception 'locked'; end if;
 if char_length(btrim(coalesce(p_name,'')))=0 or char_length(btrim(coalesce(p_assignment,'')))=0 then raise exception 'invalid_input'; end if;
 select * into s from slots where id=p_slot for update;
 if not found or not s.available or s.draft then raise exception 'unavailable'; end if;
 if s.start_at<=now() then raise exception 'past'; end if;
 if not exists(select 1 from holds where slot_id=p_slot and student=u and expires_at>now()) then raise exception 'hold_expired'; end if;
 insert into bookings(slot_id,student,name,assignment,show_name) values(p_slot,u,btrim(p_name),btrim(p_assignment),coalesce(p_show_name,false));
 delete from holds where slot_id=p_slot;
exception
 when unique_violation then
  get stacked diagnostics c = constraint_name;
  if c='bookings_pkey' then raise exception 'taken'; else raise exception 'already_booked'; end if;
 when check_violation then raise exception 'invalid_input';
end $$;

drop function if exists my_booking();
create function my_booking() returns table(slot_id uuid,start_at timestamptz,room text,period int,student_name text,assignment text,roster_consent boolean,roster_visible boolean)
language sql security definer set search_path=public,pg_temp as
$$ select b.slot_id,s.start_at,s.room,s.period,b.name,b.assignment,b.show_name,
    coalesce((select st.public_roster from settings st where st.id=1),false) and b.show_name and not b.name_hidden
   from bookings b join slots s on s.id=b.slot_id where b.student=auth.uid() $$;

create function set_my_roster_consent(p_show boolean) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null then raise exception 'not_signed_in'; end if;
 if p_show is null then raise exception 'invalid_input'; end if;
 update bookings set show_name=p_show where student=auth.uid();     -- allowed during lockdown on purpose: withdrawing consent must always work
 if not found then raise exception 'unavailable'; end if;
end $$;

-- What students may see. Privacy is decided HERE: a hidden or non-consented name is never selected, so it never leaves the database.
-- Returns nothing at all while the teacher's switch is OFF, while the site is locked, or without a signed-in session. No assignment, no ids of bookings or users, no notes.
-- NOTE (audience): "signed-in" includes the anonymous per-browser sessions every student uses, so anyone who opens the site gets such a session. See PRIVACY.md "Who can see the roster".
create function list_roster() returns table(slot_date date,period int,start_at timestamptz,room text,display_name text,name_hidden boolean)
language sql security definer set search_path=public,pg_temp as
$$ select s.slot_date,s.period,s.start_at,s.room,
    case when b.show_name and not b.name_hidden then b.name else null end,
    not (b.show_name and not b.name_hidden)
   from slots s join bookings b on b.slot_id=s.id join settings st on st.id=1
   where st.public_roster and auth.uid() is not null and not is_locked() and s.start_at>now() and not s.draft
   order by s.start_at,s.room $$;

-- ===== roster (teacher side) =====
drop function if exists admin_bookings();
create function admin_bookings() returns table(slot_id uuid,student_name text,assignment text,start_at timestamptz,room text,period int,slot_date date,dup boolean,created_at timestamptz,roster_consent boolean,name_hidden boolean,public_visible boolean)
language plpgsql security definer set search_path=public,pg_temp as $$
begin perform require_admin();
 return query select b.slot_id,b.name,b.assignment,s.start_at,s.room,s.period,s.slot_date,
  (select count(*)>1 from bookings b2 where lower(btrim(b2.name))=lower(btrim(b.name))),b.created_at,
  b.show_name,b.name_hidden,
  coalesce((select st.public_roster from settings st where st.id=1),false) and b.show_name and not b.name_hidden
  from bookings b join slots s on s.id=b.slot_id order by s.start_at;
end $$;

create function admin_set_roster_public(p_on boolean) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin perform require_admin();
 if p_on is null then raise exception 'invalid_input'; end if;
 update settings set public_roster=p_on where id=1;
 perform log_event2('roster_public',p_on::text,jsonb_build_object('on',p_on));
end $$;

-- The teacher can only HIDE or un-hide. Un-hiding never creates visibility by itself: a name is public only if consent AND not hidden AND the switch is on.
create function admin_set_name_hidden(p_slots uuid[],p_hidden boolean) returns json language plpgsql security definer set search_path=public,pg_temp as $$
declare n int; nc int;
begin perform require_admin();
 if p_slots is null or cardinality(p_slots)=0 or cardinality(p_slots)>500 or p_hidden is null then raise exception 'invalid_input'; end if;
 update bookings set name_hidden=p_hidden where slot_id=any(p_slots) and name_hidden is distinct from p_hidden;
 get diagnostics n=row_count;
 select count(*) into nc from bookings where slot_id=any(p_slots) and not p_hidden and not show_name;
 perform log_event2('roster_hide',p_hidden::text||' '||n::text,jsonb_build_object('hidden',p_hidden,'changed',n,'no_consent',nc));
 return json_build_object('changed',n,'no_consent',nc);
end $$;

-- ===== protected bulk open / close =====
-- ONE classification used by BOTH the preview and the real run, so they cannot disagree. Internal: not browser-callable.
-- Protected (never changed): past, draft, booked, paper-reserved. Slots closed for another reason are opened only with p_include_other.
-- v2.4.1: the paper test is now case-insensitive (ilike). A hand-typed "taken on paper" is still protected; the old case-sensitive test would have let it be reopened with p_include_other.
create function bulk_classify(p_ids uuid[],p_avail boolean,p_include_other boolean) returns table(id uuid,cls text,held boolean)
language sql security definer set search_path=public,pg_temp as $$
 select s.id,
  case
   when s.start_at<=now() then 'past'
   when s.draft then 'draft'
   when exists(select 1 from bookings b where b.slot_id=s.id) then 'booked'
   when not s.available and coalesce(s.reason ilike 'Taken on paper%',false) then 'paper'
   when p_avail and s.available then 'already_open'
   when not p_avail and not s.available then 'already_closed'
   when p_avail and s.reason is distinct from 'Closed by teacher' and not p_include_other then 'needs_opt_in'
   else 'eligible' end,
  exists(select 1 from holds h where h.slot_id=s.id and h.expires_at>now())
 from slots s where s.id=any(p_ids) $$;

-- v2.4.1 changes in this function (see AUDIT.md):
--  * LOCK ORDER: touch_edit_lock() (settings row) now runs BEFORE the slot row locks, exactly like admin_upsert_slot / admin_set_available / admin_set_range_available. The old order
--    (slots first, settings second) could deadlock against another teacher action when "lock while editing" is on.
--  * p_include_other = NULL is rejected. With NULL the classifier's "not p_include_other" is NULL, which silently skipped the opt-in protection and treated every non-paper closed slot as eligible.
--  * NULL elements in p_ids are ignored (they were counted as "missing" and made 'requested' wrong); an all-NULL list is invalid_input.
--  * The classification is computed ONCE (after the locks) and the eligible ids are captured in the same statement; the update uses exactly those ids. The old code classified a second
--    time inside the UPDATE and then deleted holds from EVERY closed-by-teacher slot in the list, not just the ones this run closed.
--  * Hold cleanup only touches live holds and skips rows another session is already deleting (SKIP LOCKED): a racing hold_slot() housekeeping delete can no longer deadlock with us.
--  * Closing re-checks "no booking" inside the UPDATE itself (belt and braces; the row locks already make this impossible to violate).
create function admin_bulk_set_available(p_ids uuid[],p_avail boolean,p_include_other boolean,p_dry_run boolean) returns json language plpgsql security definer set search_path=public,pg_temp as $$
declare ids uuid[]; elig uuid[]; r json; n int:=0; rel int:=0;
begin perform require_admin();
 if p_ids is null or p_avail is null or p_include_other is null or p_dry_run is null or cardinality(p_ids)=0 or cardinality(p_ids)>500 then raise exception 'invalid_input'; end if;
 select array_agg(distinct x) into ids from unnest(p_ids) x where x is not null;
 if ids is null then raise exception 'invalid_input'; end if;
 if not p_dry_run then
  perform touch_edit_lock();                                         -- settings row first: the same order every other slot-changing teacher function uses
  perform 1 from slots where id=any(ids) order by id for update;     -- same row lock hold_slot/confirm_booking take: a racing booking is either seen below or waits for us
 end if;
 select json_build_object('dry_run',p_dry_run,'action',case when p_avail then 'open' else 'close' end,
   'requested',cardinality(ids),
   'missing',cardinality(ids)-count(*),
   'eligible',count(*) filter(where c.cls='eligible'),
   'already_open',count(*) filter(where c.cls='already_open'),
   'already_closed',count(*) filter(where c.cls='already_closed'),
   'paper',count(*) filter(where c.cls='paper'),
   'booked',count(*) filter(where c.cls='booked'),
   'past',count(*) filter(where c.cls='past'),
   'draft',count(*) filter(where c.cls='draft'),
   'needs_opt_in',count(*) filter(where c.cls='needs_opt_in'),
   'held_released',count(*) filter(where c.cls='eligible' and c.held and not p_avail)),
  array_agg(c.id) filter(where c.cls='eligible')
  into r, elig from bulk_classify(ids,p_avail,p_include_other) c;
 if p_dry_run then return r; end if;
 elig:=coalesce(elig,'{}'::uuid[]);
 if p_avail then
  update slots set available=true,reason=null where id=any(elig);
 else
  update slots s set available=false,reason='Closed by teacher' where s.id=any(elig) and not exists(select 1 from bookings b where b.slot_id=s.id);
 end if;
 get diagnostics n=row_count;
 if not p_avail then
  delete from holds where slot_id in (select h.slot_id from holds h where h.slot_id=any(elig) and h.expires_at>now() order by h.slot_id for update skip locked);
  get diagnostics rel=row_count;
 end if;
 perform log_event2('bulk_available',(case when p_avail then 'open ' else 'close ' end)||n::text||'/'||cardinality(ids)::text,
  jsonb_build_object('action',case when p_avail then 'open' else 'close' end,'requested',cardinality(ids),'changed',n,'include_other',p_include_other,'holds_released',rel,
   'skipped',jsonb_build_object('paper',(r->>'paper')::int,'booked',(r->>'booked')::int,'past',(r->>'past')::int,'draft',(r->>'draft')::int,
     'already',(r->>'already_open')::int+(r->>'already_closed')::int,'needs_opt_in',(r->>'needs_opt_in')::int,'missing',(r->>'missing')::int)));
 return (r::jsonb||jsonb_build_object('dry_run',false,'changed',n,'holds_released',rel))::json;
end $$;

-- ===== readable activity: structured meta + slot details resolved from the slot table (teacher only). admin_events() is kept unchanged. =====
-- v2.4.1: the uuids found in an event's detail text are now numbered with WITH ORDINALITY. Before, array_agg over regexp_matches had no guaranteed order, so for a move or swap
-- "from" and "to" could be reported the wrong way round.
create function admin_activity(p_limit int) returns table(id bigint,happened_at timestamptz,action text,detail text,meta jsonb,slot_a jsonb,slot_b jsonb)
language plpgsql security definer set search_path=public,pg_temp as $$
begin perform require_admin();
 return query
  with e as (select x.id as eid,x.happened_at as eat,x.action as eact,x.detail as edet,x.meta as emeta,
     (select array_agg(m.t[1] order by m.n) from regexp_matches(coalesce(x.detail,''),'([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})','g') with ordinality as m(t,n)) as ids
   from admin_events x order by x.id desc limit least(coalesce(p_limit,20),200))
  select e.eid,e.eat,e.eact,e.edet,e.emeta,
   (select jsonb_build_object('date',s.slot_date,'period',s.period,'start_at',s.start_at,'room',s.room) from slots s where s.id=e.ids[1]::uuid),
   (select jsonb_build_object('date',s.slot_date,'period',s.period,'start_at',s.start_at,'room',s.room) from slots s where s.id=e.ids[2]::uuid)
  from e order by e.eid desc;
end $$;

-- ===== privileges: revoke on every new function, then grant only the browser-callable ones =====
revoke execute on function log_event2(text,text,jsonb),rt_notify(text,boolean),rt_trg_changed(),rt_trg_events(),bulk_classify(uuid[],boolean,boolean) from public,anon,authenticated;
revoke execute on function rt_is_admin(),set_my_roster_consent(boolean),list_roster(),admin_set_roster_public(boolean),admin_set_name_hidden(uuid[],boolean),
  admin_bulk_set_available(uuid[],boolean,boolean,boolean),admin_activity(int),confirm_booking(uuid,text,text,boolean),my_booking(),admin_bookings() from public,anon;
grant execute on function rt_is_admin(),set_my_roster_consent(boolean),list_roster(),admin_set_roster_public(boolean),admin_set_name_hidden(uuid[],boolean),
  admin_bulk_set_available(uuid[],boolean,boolean,boolean),admin_activity(int),confirm_booking(uuid,text,text,boolean),my_booking(),admin_bookings() to authenticated;

-- ===== v2.4.1: self-check. If anything below is wrong, this raises and the WHOLE migration is undone (nothing is left half-installed). =====
do $$
declare bad text;
begin
 if (select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid where c.relnamespace='public'::regnamespace and t.tgname like 'rt\_%' and not t.tgisinternal and (t.tgtype & 1)=0)<>13 then
  raise exception 'STOP (self-check): expected exactly 13 statement-level rt_* triggers. Nothing was changed.';
 end if;
 if (select count(*) from pg_policies where schemaname='realtime' and tablename='messages' and policyname in ('sched_public_receive','sched_admin_receive') and cmd='SELECT')<>2 then
  raise exception 'STOP (self-check): the two SELECT policies on realtime.messages are missing. Nothing was changed.';
 end if;
 select string_agg(p.oid::regprocedure::text,', ') into bad from pg_proc p
  where p.pronamespace='public'::regnamespace and p.proname in ('log_event','log_event2','rt_notify','rt_trg_changed','rt_trg_events','bulk_classify','require_admin','is_locked','touch_edit_lock')
   and (has_function_privilege('authenticated',p.oid,'execute') or has_function_privilege('anon',p.oid,'execute'));
 if bad is not null then raise exception 'STOP (self-check): internal helper(s) are callable from browsers: %. Nothing was changed.',bad; end if;
 select string_agg(p.oid::regprocedure::text,', ') into bad from pg_proc p
  where p.pronamespace='public'::regnamespace and p.prokind='f' and has_function_privilege('anon',p.oid,'execute')
   and not exists(select 1 from pg_depend d where d.classid='pg_proc'::regclass and d.objid=p.oid and d.deptype='e');
 if bad is not null then raise exception 'STOP (self-check): the anonymous role can execute: %. Nothing was changed.',bad; end if;
 if (select count(*) from pg_proc where pronamespace='public'::regnamespace and proname in ('confirm_booking','my_booking','admin_bookings'))<>3 then
  raise exception 'STOP (self-check): an old overload of confirm_booking / my_booking / admin_bookings is still present (calls would be ambiguous). Nothing was changed.';
 end if;
 select string_agg(p.oid::regprocedure::text,', ') into bad from pg_proc p
  where p.pronamespace='public'::regnamespace and p.prosecdef and not exists(select 1 from unnest(coalesce(p.proconfig,'{}'::text[])) cfg where cfg like 'search_path=%')
   and not exists(select 1 from pg_depend d where d.classid='pg_proc'::regclass and d.objid=p.oid and d.deptype='e');
 if bad is not null then raise exception 'STOP (self-check): SECURITY DEFINER function(s) without a fixed search_path: %. Nothing was changed.',bad; end if;
end $$;

-- Ask the Supabase API layer to reload its function list now (it normally does this by itself after DDL; harmless if it does).
notify pgrst, 'reload schema';
