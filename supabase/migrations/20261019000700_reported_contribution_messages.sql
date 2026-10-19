-- Safeguarding: when a contribution is reported (from the work card or the questionnaire), Handova's admins can read
-- that contribution's conversation, as they already can when the conversation itself is reported.
create or replace function public.conversation_reported(c uuid)
 returns boolean language sql stable security definer set search_path to ''
as $function$
  select public.is_admin() and (exists (select 1 from public.reports r where r.target_type = 'conversation' and r.target_id = c)
      or exists (select 1 from public.reports r join public.engagements e on e.id = r.target_id
                 join public.conversations v on v.need_id = e.need_id and v.user_id = e.user_id
                 where r.target_type = 'contribution' and v.id = c))
$function$;
revoke all on function public.conversation_reported(uuid) from public, anon;
grant execute on function public.conversation_reported(uuid) to authenticated;
alter policy conversations_read on public.conversations using (public.is_conversation_party(id) or (public.is_admin() and public.conversation_reported(id)));
alter policy messages_read on public.messages using (public.is_conversation_party(conversation_id) or (public.is_admin() and public.conversation_reported(conversation_id)));
