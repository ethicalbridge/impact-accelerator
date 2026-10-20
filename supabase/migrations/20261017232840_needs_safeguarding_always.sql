-- The safeguarding confirmation is required for every need, drafts included.
alter table public.needs drop constraint if exists needs_check;
alter table public.needs add constraint needs_safeguarding_confirmed check (no_vulnerable_contact);
