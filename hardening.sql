-- Preserve references and prevent impossible contribution records.
create function public.ia_need_guard() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.id<>old.id or new.organisation_id<>old.organisation_id then raise exception 'A need cannot be moved to another organisation.';end if;
 if old.status<>'draft' and new.status='draft' then raise exception 'Close a published need instead of returning it to draft.';end if;
 return new;
end $$;
revoke all on function public.ia_need_guard() from public,anon,authenticated;
create trigger ia_need_guard before update on public.ia_needs for each row execute function public.ia_need_guard();
create function public.ia_hours_guard() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.user_id::text||new.work_date::text,0));
 if (select coalesce(sum(hours),0) from public.ia_hours where user_id=new.user_id and work_date=new.work_date and status<>'changes_requested')+new.hours>24 then raise exception 'Total submitted hours cannot exceed 24 in one day.';end if;
 return new;
end $$;
revoke all on function public.ia_hours_guard() from public,anon,authenticated;
create trigger ia_hours_guard before insert on public.ia_hours for each row execute function public.ia_hours_guard();
create function public.ia_acceptance_guard() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.status='accepted' and not exists(select 1 from public.ia_needs n where n.id=new.need_id and n.status='open') then raise exception 'This need is no longer open. Ask the organisation to reopen it before accepting.';end if;
 return new;
end $$;
revoke all on function public.ia_acceptance_guard() from public,anon,authenticated;
create trigger ia_app_acceptance before update on public.ia_applications for each row execute function public.ia_acceptance_guard();
create trigger ia_inv_acceptance before update on public.ia_invitations for each row execute function public.ia_acceptance_guard();
alter table public.ia_portfolio drop constraint ia_portfolio_image_check;
alter table public.ia_portfolio add constraint ia_portfolio_image_check check(image='' or image ~ '^https://' or image ~ '^storage:[0-9a-f-]{36}/[0-9a-f-]{36}\.(png|jpg|webp)$');
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values ('accelerator-portfolio','accelerator-portfolio',false,5242880,array['image/jpeg','image/png','image/webp']);
create policy ia_image_insert on storage.objects for insert to authenticated with check(bucket_id='accelerator-portfolio' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy ia_image_read on storage.objects for select using(bucket_id='accelerator-portfolio' and ((storage.foldername(name))[1]=(select auth.uid())::text or exists(select 1 from public.ia_portfolio p join public.ia_profiles u on u.user_id=p.user_id where p.image='storage:'||name and p.published and u.published)));
create policy ia_image_delete on storage.objects for delete to authenticated using(bucket_id='accelerator-portfolio' and (storage.foldername(name))[1]=(select auth.uid())::text);

create table public.ia_messages (
 id uuid primary key default gen_random_uuid(),
 need_id uuid not null references public.ia_needs(id),
 user_id uuid not null references public.ia_profiles(user_id),
 sender_id uuid not null references auth.users(id),
 body text not null check(length(trim(body)) between 1 and 4000),
 created_at timestamptz not null default now()
);
alter table public.ia_messages enable row level security;
revoke all on public.ia_messages from anon,authenticated;
grant select,insert on public.ia_messages to authenticated;
create index ia_messages_thread on public.ia_messages(need_id,user_id,created_at);
create index ia_messages_user on public.ia_messages(user_id);
create index ia_messages_sender on public.ia_messages(sender_id);
create policy ia_messages_read on public.ia_messages for select to authenticated using(user_id=(select auth.uid()) or exists(select 1 from public.ia_needs n join public.organisation_members m on m.organisation_id=n.organisation_id where n.id=ia_messages.need_id and m.user_id=(select auth.uid())));
create policy ia_messages_insert on public.ia_messages for insert to authenticated with check(sender_id=(select auth.uid()) and (user_id=(select auth.uid()) or exists(select 1 from public.ia_needs n join public.organisation_members m on m.organisation_id=n.organisation_id where n.id=ia_messages.need_id and m.user_id=(select auth.uid()))) and (exists(select 1 from public.ia_applications a where a.need_id=ia_messages.need_id and a.user_id=ia_messages.user_id) or exists(select 1 from public.ia_invitations i where i.need_id=ia_messages.need_id and i.user_id=ia_messages.user_id)));
