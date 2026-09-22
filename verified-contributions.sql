-- Organisation-endorsed contribution details and talent-controlled publication.
alter table public.ia_hours
  add column deliverables text not null default '' check (length(deliverables) <= 3000),
  add column rating smallint check (rating between 1 and 5),
  add column feedback text not null default '' check (length(feedback) <= 3000),
  add column public boolean not null default false,
  add column published_at timestamptz;

grant select on public.ia_hours to anon;
grant update(status,review_note,deliverables,rating,feedback) on public.ia_hours to authenticated;
grant update(public) on public.ia_hours to authenticated;

create policy hours_public_read on public.ia_hours for select to anon,authenticated
using (
  status = 'approved' and public
  and exists (
    select 1 from public.ia_profiles p
    where p.user_id = ia_hours.user_id and p.published
  )
);

create policy hours_publish on public.ia_hours for update to authenticated
using (user_id = (select auth.uid()) and status = 'approved')
with check (user_id = (select auth.uid()) and status = 'approved');

create or replace function public.ia_transition_guard() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if tg_table_name='ia_hours' and old.user_id=auth.uid() and old.status='approved' then
  if (to_jsonb(new)-'public'-'published_at') is distinct from (to_jsonb(old)-'public'-'published_at') then
   raise exception 'Only portfolio visibility can be changed after approval.';
  end if;
  new.published_at=case when new.public then coalesce(old.published_at,now()) else null end;
  return new;
 end if;
 if old.status<>'pending' then raise exception 'This decision has already been recorded. Refresh to see its current status.'; end if;
 if tg_table_name='ia_applications' then
  if new.user_id=auth.uid() then
   if new.status<>'withdrawn' then raise exception 'Applicants may only withdraw their own application.'; end if;
  elsif new.status not in ('accepted','declined') then raise exception 'Choose accept or decline.'; end if;
 elsif tg_table_name='ia_invitations' then
  if new.status not in ('accepted','declined') then raise exception 'Choose accept or decline.'; end if;
 elsif tg_table_name='ia_hours' then
  if new.status not in ('approved','changes_requested') then raise exception 'Choose approve or request changes.'; end if;
  if new.status='changes_requested' and length(trim(new.review_note))<5 then raise exception 'Explain the changes needed.'; end if;
  if new.status='approved' and (new.rating is null or length(trim(new.feedback))<10) then raise exception 'Add a rating and useful written feedback.'; end if;
  new.reviewed_by=auth.uid(); new.reviewed_at=now();
 end if;
 return new;
end; $$;

create index ia_hours_public_profile on public.ia_hours(user_id,work_date desc)
where status='approved' and public;
