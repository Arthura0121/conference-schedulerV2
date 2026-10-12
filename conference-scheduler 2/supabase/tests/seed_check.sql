-- Run right after seed.sql in the TEST project. Read-only. Each line should say ok = true.
select 'total slots = 180' as check, count(*)=180 as ok from slots;
select 'open slots overall = 1' as check, count(*) filter(where available)=1 as ok from slots;
select 'Not available = 70' as check, count(*) filter(where reason='Not available')=70 as ok from slots;
select 'Taken on paper = 109' as check, count(*) filter(where reason='Taken on paper sign-up sheet')=109 as ok from slots;
select 'from 10/13: 48 slots, 21 N, 27 P, 0 open' as check,
 count(*)=48 and count(*) filter(where reason='Not available')=21 and count(*) filter(where reason like 'Taken on paper%')=27 and count(*) filter(where available)=0 as ok from slots where slot_date>='2026-10-13';
select 'Mon 10/12 and Wed 10/14 fully closed' as check, count(*) filter(where available)=0 and count(*)=24 as ok from slots where slot_date in ('2026-10-12','2026-10-14');
select 'Period 7 in 436B from 10/5, 422 before' as check,
 count(*) filter(where room='436B' and slot_date>='2026-10-05')=30 and count(*) filter(where room='422' and slot_date<'2026-10-05')=15 as ok from slots where period=7;
select 'only open slot is Wed 9/30 P9 3:05pm' as check, bool_and(slot_date='2026-09-30' and period=9 and (start_at at time zone 'America/New_York')::time='15:05') as ok from slots where available;
