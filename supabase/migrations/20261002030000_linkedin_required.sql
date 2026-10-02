-- LinkedIn is how profiles are checked before approval, so a profile cannot be published without one.
alter table public.profiles add constraint profiles_linkedin_required check (not published or linkedin <> '');
