-- 1) Supabase > Authentication > Users > Add user (your email + a strong password, tick "Auto Confirm").
-- 2) Put that email below and run this in the SQL Editor. This is the ONLY way to become a teacher.
insert into admins(user_id) select id from auth.users where email='YOU@example.com' on conflict do nothing;
select count(*) as admins_created from admins;
