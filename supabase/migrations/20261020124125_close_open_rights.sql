-- Re-audit 20 Oct 2026, B15 and B17: close rights nobody needs.
--
-- B15: helper checks that answer a question about a given person are no longer callable by signed-out visitors.
--   is_suspended(u): only the database uses it (inside its own functions), so nobody else may call it.
--   need_org, is_conversation_party, profile_is_public: only used by rules for signed-in users, so signed-out
--   visitors lose access. (is_admin, is_org_member, org_is_approved and org_can_see_profile stay open: the rules for
--   public pages use them, and they only answer about the caller or about public organisations.)
revoke all on function public.is_suspended(uuid) from public, anon, authenticated;
revoke all on function public.need_org(uuid) from public, anon;
grant execute on function public.need_org(uuid) to authenticated;
revoke all on function public.is_conversation_party(uuid) from public, anon;
grant execute on function public.is_conversation_party(uuid) to authenticated;
revoke all on function public.profile_is_public(uuid) from public, anon;
grant execute on function public.profile_is_public(uuid) to authenticated;

-- B17: the six tables added on 20 Oct had full default rights for visitors and signed-in users (row security still
-- applied). Keep exactly what the site uses; everything else goes through server functions.
revoke all on public.need_safety_notes, public.id_consents, public.id_video_requests, public.user_suspensions,
  public.removed_identities, public.report_cases from public, anon, authenticated;

-- Safety notes on a need: the organisation's members read and save them (insert, or upsert when editing).
grant select on public.need_safety_notes to authenticated;
grant insert (need_id, personal_data_note, leak_risk_note, updated_at) on public.need_safety_notes to authenticated;
grant update (need_id, personal_data_note, leak_risk_note, updated_at) on public.need_safety_notes to authenticated;

-- Consent to the identity check: the person records it and can read their own.
grant select on public.id_consents to authenticated;
grant insert (user_id, wording, notice_version) on public.id_consents to authenticated;

-- Video-call requests and removed identities: read only (written by server functions).
grant select on public.id_video_requests to authenticated;
grant select on public.removed_identities to authenticated;

-- Suspensions: the suspended person can read their own row for the banner (whether it is a suspension or a
-- removal, and since when), but not the reason Handova wrote, which can hold details about whoever raised the
-- concern. Admins read the reason in the activity log (admin_actions).
grant select (user_id, removed, suspended_at, lifted_at) on public.user_suspensions to authenticated;

-- Case records for reports: admins read and save them from Admin (row security: admins only).
grant select on public.report_cases to authenticated;
grant insert (report_id, severity, protective_actions, informed, referral, wishes, decision, outcome, child_case, updated_at, updated_by)
  on public.report_cases to authenticated;
grant update (report_id, severity, protective_actions, informed, referral, wishes, decision, outcome, child_case, updated_at, updated_by)
  on public.report_cases to authenticated;
