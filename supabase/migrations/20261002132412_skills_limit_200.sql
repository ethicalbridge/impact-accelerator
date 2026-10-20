-- The standard list has 180 skills across 23 areas; allow a profile to hold all of them.
alter table public.profiles drop constraint profiles_skills_check;
alter table public.profiles add constraint profiles_skills_check check (cardinality(skills) <= 200);
