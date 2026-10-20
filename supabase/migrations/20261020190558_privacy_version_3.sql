-- Round-3 audit L26: the privacy notice changed on 20 Oct 2026 (version 3). Keep in step with src/config.js privacyVersion.
create or replace function public.current_policy_version(k text)
 returns text language sql immutable set search_path to ''
as $$ select case k when 'terms' then 'terms-2026-10-20-2' when 'privacy' then 'privacy-2026-10-20-3' else null end $$;
