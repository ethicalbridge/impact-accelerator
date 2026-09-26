-- Structured country values support reliable international directory filters.
alter table public.ia_profiles
  add column country text not null default '' check (length(country) <= 100);

alter table public.ia_needs
  add column country text not null default '' check (length(country) <= 100);
