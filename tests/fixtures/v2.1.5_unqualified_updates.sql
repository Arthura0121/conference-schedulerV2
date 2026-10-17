-- Fixture: the three functions exactly as shipped in v2.1.5 (UPDATE without WHERE). The linter must flag all three.
create function admin_set_lockdown(p_locked boolean,p_msg text,p_from timestamptz,p_until timestamptz) returns void language plpgsql security definer set search_path=public as $$
begin perform require_admin();
 if p_until is not null and (p_from is null or p_until<=p_from) then raise exception 'invalid_time'; end if;
 update settings set locked=p_locked,lock_message=coalesce(nullif(btrim(p_msg),''),lock_message),lock_from=p_from,lock_until=p_until,
  edit_lock_until=case when p_locked=false and p_from is null then null else edit_lock_until end;
 perform log_event('lockdown',p_locked::text);
end $$;

create function admin_update_settings(p_policy text,p_auto boolean,p_tz text) returns void language plpgsql security definer set search_path=public as $$
begin perform require_admin();
 if not exists(select 1 from pg_timezone_names where name=p_tz) then raise exception 'invalid_input'; end if;
 update settings set policy=coalesce(nullif(btrim(p_policy),''),policy),auto_lock_on_edit=p_auto,tz=p_tz; perform log_event('settings','');
end $$;

create function admin_end_edit() returns void language plpgsql security definer set search_path=public as $$
begin perform require_admin(); update settings set edit_lock_until=null; end $$;

