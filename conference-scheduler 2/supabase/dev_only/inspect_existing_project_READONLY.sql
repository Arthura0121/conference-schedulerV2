-- READ-ONLY. Safe to run in your OLD project: shows what is in it. Changes nothing.
select table_name from information_schema.tables where table_schema='public' order by 1;
-- If the old v1 tables exist, how many real bookings would be lost by abandoning that project?
select count(*) as v1_bookings from public.bookings;
-- Export v1 bookings for your records (copy the result grid to CSV; contains student names, keep private):
select s.slot_date,s.period,s.start_at,s.room,b.name,b.assignment,b.created_at from public.bookings b join public.slots s on s.id=b.slot_id order by s.start_at;
