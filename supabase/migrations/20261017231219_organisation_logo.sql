-- Organisations can show a logo. Only images in Handova's own storage (avatars bucket, the uploader's folder) are accepted.
alter table public.organisations add column if not exists logo_url text
  constraint organisations_logo_url_check check (logo_url is null or logo_url ~ '^https://jcfezemkbseaqbwuojhs\.supabase\.co/storage/v1/object/public/avatars/[0-9a-f-]{36}/');
grant select (logo_url) on public.organisations to anon, authenticated;
grant update (logo_url) on public.organisations to authenticated;

-- Admins hear about changes to an approved organisation, now including country, type and logo.
create or replace function public.org_change_guard()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  if old.status = 'approved' and (new.name, new.website, new.summary, new.ethical_bridge_url, new.country, new.org_type, new.logo_url)
     is distinct from (old.name, old.website, old.summary, old.ethical_bridge_url, old.country, old.org_type, old.logo_url) then
    perform public.notify_admins('org_changed', 'Approved organisation updated', new.name, '#organisations/' || new.id);
  end if;
  return new;
end $function$;
