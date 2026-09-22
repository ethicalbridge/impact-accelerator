-- Applied through Supabase MCP as accelerator_need_support_languages.
-- Existing records remain unspecified; no language is inferred.
alter table public.ia_needs
  add column languages text[] not null default '{}'::text[];
alter table public.ia_needs
  add constraint ia_needs_languages_limit
  check (cardinality(languages) <= 20 and array_position(languages, null) is null);
comment on column public.ia_needs.languages is
  'Languages in which the organisation can receive support for this need. Empty means not specified, not English or any language.';
