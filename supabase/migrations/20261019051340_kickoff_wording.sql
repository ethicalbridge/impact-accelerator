-- Kick-off agenda wording (19 October 2026 audit): Messages is the record, contributions are remote.
create or replace function public.kickoff_message(p_id uuid, p_ref text)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare e record; cid uuid; focal text; org text; body text;
begin
  select * into e from public.engagements where id = p_id;
  cid := public.conversation_for(e.need_id, e.user_id);
  org := coalesce(e.scope->>'organisation', 'the organisation');
  select nullif(trim(coalesce(focal_point_name, '') || case when coalesce(focal_point_contact, '') <> '' then ' (' || focal_point_contact || ')' else '' end), '')
    into focal from public.contribution_signatures where engagement_id = p_id and party = 'organisation';
  body := 'You have both signed. The next step is a short first call (30–45 minutes) to meet and plan the work. Reply here with two or three times that suit you, and say your time zone. Audio only is fine if data is limited.' || E'\n\n'
    || 'On the call, agree:' || E'\n'
    || '1. Goal: what the finished work looks like and how ' || org || ' will keep using it after handover.' || E'\n'
    || '2. Timing: the delivery date and any check-in dates.' || E'\n'
    || '3. Contact person: who at ' || org || ' answers questions and checks the work.' || E'\n'
    || '4. Reviews: how drafts are shared and checked, and who approves the final work.' || E'\n'
    || '5. Out of scope: what this contribution does not cover.' || E'\n'
    || '6. Keeping in touch: keep using Messages for anything about the work. If you also use email or another app, write decisions and changes here so you both have a record. Sharing phone numbers or personal emails is optional, and either of you can say no. Contributions on Handova are remote.' || E'\n'
    || '7. Information and access: what is needed, shared through a secure channel the organisation chooses, and when access ends. Never passwords or card details.' || E'\n'
    || '8. Safeguarding: ' || coalesce('the focal point is ' || focal, 'the organisation''s safeguarding focal point is named on the agreement page') || '. Agree how either of you raises a concern.' || E'\n\n'
    || 'Don''t record the call or use AI note-takers unless everyone agrees at the start, and don''t show anything about the people ' || org || ' supports. After the call, one of you selects “Record what we agreed” so you both have the same written record.';
  insert into public.messages (conversation_id, sender_id, body, kind) values (cid, null, left(body, 4000), 'system');
end $function$;
