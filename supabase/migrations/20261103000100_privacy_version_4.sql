-- The privacy notice changed on 3 Nov 2026 (version 4): Euverify named as EU and UK GDPR representative (Article 27),
-- with its request portal. Keep in step with src/config.js privacyVersion.
create or replace function public.current_policy_version(k text)
 returns text language sql immutable set search_path to ''
as $$ select case k when 'terms' then 'terms-2026-10-20-2' when 'privacy' then 'privacy-2026-11-03-4' else null end $$;
