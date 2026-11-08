begin;
set local lock_timeout = '5s';

alter table public.settings
 drop constraint settings_theme_check,
 add constraint settings_theme_check check (theme in ('aurora','fall','halloween','thanksgiving','winter','blossom','firefly','studio-snowday','studio-boardwalk','studio-monsoon','studio-lunar','studio-valentine','studio-newyear','studio-notebook','studio-science'));

-- Preserve the teacher authorization, existing grants, and settings row.
create or replace function public.admin_set_theme(p_theme text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform require_admin();
 if p_theme is null or p_theme not in ('aurora','fall','halloween','thanksgiving','winter','blossom','firefly','studio-snowday','studio-boardwalk','studio-monsoon','studio-lunar','studio-valentine','studio-newyear','studio-notebook','studio-science') then
  raise exception 'invalid_input';
 end if;
 update public.settings set theme=p_theme where id=1;
 perform log_event2('theme',p_theme,jsonb_build_object('theme',p_theme));
end $$;
commit;
