-- Handova is extra support for organisations listed in the Ethical Bridge directory.
-- Each organisation records its directory page so the admin can check the listing during review.
alter table public.organisations add column if not exists ethical_bridge_url text not null default ''
  check (ethical_bridge_url = '' or ethical_bridge_url ~* '^https://(www\.)?ethicalbridge\.org/\S+$');
grant update (ethical_bridge_url) on public.organisations to authenticated;
