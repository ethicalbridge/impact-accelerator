-- Fixes two regressions from 20 Oct (re-audit B11, B13).
-- B11: the signing functions pass request headers as json; the IP helper only accepted jsonb.
create or replace function public.request_ip(hdrs json)
 returns text language sql immutable set search_path to ''
as $function$ select public.request_ip(hdrs::jsonb); $function$;
revoke all on function public.request_ip(json) from public, anon, authenticated;
-- B13: signed-in users may write the new safety and conflict columns (row security still decides which rows).
grant insert (safeguarding), update (safeguarding) on public.needs to authenticated;
grant insert (conflict_note) on public.applications to authenticated;
grant insert (conflict_note) on public.invitations to authenticated;
