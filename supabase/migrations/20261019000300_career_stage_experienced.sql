-- Career stage: mid-career is now 5–10 years, with a new 'experienced' stage for 10–15 years (applied directly).
alter table public.user_private drop constraint if exists user_private_career_stage_check;
alter table public.user_private add constraint user_private_career_stage_check check (career_stage in ('student', 'early', 'mid', 'experienced', 'senior', 'retired', 'break'));
create or replace function public.set_career_stage(p_stage text)
 returns void language plpgsql security definer set search_path to ''
as $function$
begin
  if auth.uid() is null then raise exception 'Please sign in.'; end if;
  if p_stage not in ('student', 'early', 'mid', 'experienced', 'senior', 'retired', 'break') then raise exception 'Choose your career stage.'; end if;
  insert into public.user_private (user_id, career_stage) values (auth.uid(), p_stage)
    on conflict (user_id) do update set career_stage = excluded.career_stage, updated_at = now();
end $function$;
