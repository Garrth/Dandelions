-- ID check, part 2: test passes can't count once real checks start, and a daily limit on starting a check.
-- Run once in the Supabase SQL Editor (project dandelions), after the earlier files. Safe to run again.
--
-- Why: Plaid is in test mode (sandbox) for now, where Plaid's test person always passes. Every saved result
-- now says which mode it came from. Test passes count only while id_check_settings.sandbox_counts is true.
-- When Plaid approves real checks, run the two "Going live" lines in docs/SETUP-STAGE1.md.

-- Which Plaid mode each result came from. Every check so far was a test.
alter table public.id_checks add column if not exists plaid_env text;
update public.id_checks set plaid_env = 'sandbox' where plaid_env is null;
alter table public.id_checks alter column plaid_env set default 'sandbox';
alter table public.id_checks alter column plaid_env set not null;
do $$ begin
  alter table public.id_checks add constraint id_checks_plaid_env check (plaid_env in ('sandbox', 'production'));
exception when duplicate_object then null; end $$;

-- How many times the member opened the Plaid window today (California time). Each one costs Equitide money.
alter table public.id_checks add column if not exists start_day date;
alter table public.id_checks add column if not exists starts integer not null default 0;

-- One switch: do test passes count? Yes while testing. No once real checks start.
create table if not exists public.id_check_settings (
  id boolean primary key default true check (id),
  sandbox_counts boolean not null default true
);
insert into public.id_check_settings (id) values (true) on conflict (id) do nothing;
alter table public.id_check_settings enable row level security;
revoke all on public.id_check_settings from anon, authenticated;
grant select on public.id_check_settings to service_role;

-- True when the signed-in member passed a check that counts.
create or replace function public.is_verified()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.id_checks c
    where c.member_id = (select auth.uid()) and c.status = 'passed'
      and (c.plaid_env = 'production' or (c.plaid_env = 'sandbox' and coalesce((select s.sandbox_counts from public.id_check_settings s limit 1), false)))
  );
$$;
revoke all on function public.is_verified() from public;
grant execute on function public.is_verified() to authenticated;

-- The profile badges use the same rule.
create or replace function public.my_permissions()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'pledged', exists (select 1 from public.members where id = (select auth.uid())),
    'verified', public.is_verified(),
    'business', exists (select 1 from public.businesses where owner_id = (select auth.uid()) and status <> 'not_listed')
             or exists (select 1 from public.listing_claims where member_id = (select auth.uid()) and status = 'verified'),
    'moderator', exists (select 1 from public.talk_moderators where member_id = (select auth.uid())),
    'roles', coalesce((select jsonb_agg(role order by role) from public.member_roles where member_id = (select auth.uid())), '[]'::jsonb)
  );
$$;
revoke all on function public.my_permissions() from public;
grant execute on function public.my_permissions() to authenticated;
