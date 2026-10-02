-- Needs are short: at most 16 hours.
do $$ declare c text; begin
  select conname into c from pg_constraint where conrelid = 'public.needs'::regclass and pg_get_constraintdef(oid) ilike '%hours >= 1%' limit 1;
  if c is not null then execute format('alter table public.needs drop constraint %I', c); end if;
end $$;
alter table public.needs add constraint needs_hours_range check (hours between 1 and 16);
