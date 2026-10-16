-- Needs: between 4 and 16 hours. 4 matches the minimum monthly commitment professionals make.
alter table public.needs drop constraint if exists needs_hours_range;
alter table public.needs add constraint needs_hours_range check (hours between 4 and 16);
