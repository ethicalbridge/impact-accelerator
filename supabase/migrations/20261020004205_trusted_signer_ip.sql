-- Signature evidence (B11, 20 Oct 2026): record the IP address the hosting edge saw (cf-connecting-ip, set by
-- Cloudflare and not settable by the browser), falling back to x-real-ip and then to the old first x-forwarded-for value.
create or replace function public.request_ip(hdrs jsonb)
 returns text language sql immutable set search_path to ''
as $function$
  select coalesce(nullif(trim(hdrs->>'cf-connecting-ip'), ''), nullif(trim(hdrs->>'x-real-ip'), ''), trim(split_part(coalesce(hdrs->>'x-forwarded-for', ''), ',', 1)), '');
$function$;
revoke all on function public.request_ip(jsonb) from public, anon, authenticated;

do $$
declare f record; def text;
begin
  for f in select p.oid from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('sign_agreement', 'sign_org_agreement', 'sign_engagement')
  loop
    def := pg_get_functiondef(f.oid);
    if position('split_part(hdrs->>''x-forwarded-for'', '','', 1)' in def) > 0 then
      def := replace(def, 'coalesce(trim(split_part(hdrs->>''x-forwarded-for'', '','', 1)), '''')', 'public.request_ip(hdrs)');
      execute def;
    end if;
  end loop;
end $$;
