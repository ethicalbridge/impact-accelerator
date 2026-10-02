-- New professional profiles get a notification asking them to verify their identity.
create or replace function public.id_check_welcome() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.id_status is distinct from 'approved' then
    perform public.notify(new.user_id, 'id_check', 'Next step: verify your identity',
      'It takes about three minutes with your passport or ID card and a selfie. Organisations trust verified profiles.', '#workspace');
  end if;
  return new;
end $$;
create trigger profiles_id_check_welcome after insert on public.profiles for each row execute function public.id_check_welcome();
