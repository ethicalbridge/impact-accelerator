-- The approval notification (and email) tells the organisation what to do next and links straight to "Post a need".
create or replace function public.admin_review_organisation(p_org uuid, p_decision public.org_status, p_note text)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare n text; note text := nullif(trim(coalesce(p_note, '')), '');
begin
  if not public.is_admin() then raise exception 'Administrator access required.'; end if;
  update public.organisations set status = p_decision, approved_at = case when p_decision = 'approved' then coalesce(approved_at, now()) else approved_at end where id = p_org returning name into n;
  if n is null then raise exception 'Organisation not found.'; end if;
  if p_decision in ('suspended', 'rejected') then
    update public.needs set status = 'closed' where organisation_id = p_org and status = 'open';
  end if;
  if p_decision = 'approved' then
    perform public.notify_org(p_org, 'org_decision', 'Your organisation is approved',
      'You can now post your first need: one piece of work, up to 16 hours, with a clear output. Handova checks each need before it goes live, usually within two working days.'
        || case when exists (select 1 from public.needs x where x.organisation_id = p_org and x.status = 'pending') then ' The needs you already sent are being checked now.' else '' end
        || coalesce(' Note from Handova: ' || note, ''),
      '#org/need');
  else
    perform public.notify_org(p_org, 'org_decision',
      case p_decision when 'changes_requested' then 'Please update your organisation details'
        when 'rejected' then 'Your organisation was not approved' when 'suspended' then 'Your organisation is suspended on Handova' else 'Your organisation status changed' end,
      coalesce(note, ''), '#org');
  end if;
  insert into public.admin_actions (admin_id, action, target_type, target_id, detail)
    values (auth.uid(), 'org_' || p_decision, 'organisation', p_org, jsonb_build_object('name', n, 'note', coalesce(p_note, '')));
end $function$;
