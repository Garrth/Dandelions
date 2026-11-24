-- How many people signed up with your link. Shows on your profile under "Your link".
-- Only returns your own count. Never shows who they are.
create or replace function public.my_referral_count()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int
  from public.members m
  where m.referred_by is not null
    and m.referred_by = (select me.referral_code from public.members me where me.id = auth.uid());
$$;

revoke execute on function public.my_referral_count() from public, anon;
grant execute on function public.my_referral_count() to authenticated;
