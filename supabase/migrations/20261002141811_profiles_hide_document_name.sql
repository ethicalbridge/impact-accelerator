-- Recorded from the live database (applied 2 October 2026, never committed until the 20 Oct repair).
-- A table-wide SELECT grant overrides column revokes, so grant reads column by column, without id_document_name.
revoke select on public.profiles from anon, authenticated;
do $$ declare cols text; begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into cols
  from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name <> 'id_document_name';
  execute format('grant select (%s) on public.profiles to anon, authenticated', cols);
end $$;
