-- Work lite: members line up for the positions they want when Work opens.
-- Run once in the Supabase SQL Editor (project dandelions). Safe to run again.
-- Lining up is interest only: no pay, no promise, no ranking.

create table if not exists public.work_lineup (
  member_id uuid not null references public.members (id) on delete cascade,
  position text not null check (position in (
    'owner', 'crew', 'organizer', 'marketer', 'checker', 'panelist', 'analyst',
    'moderator', 'help', 'operator', 'security', 'tester', 'course', 'reviewer',
    'maintainer', 'signer', 'keeper')),
  created_at timestamptz not null default now(),
  primary key (member_id, position)
);

alter table public.work_lineup enable row level security;

drop policy if exists "Members see their own line-up" on public.work_lineup;
create policy "Members see their own line-up"
  on public.work_lineup for select to authenticated
  using ((select auth.uid()) = member_id);

drop policy if exists "Members line up for themselves" on public.work_lineup;
create policy "Members line up for themselves"
  on public.work_lineup for insert to authenticated
  with check ((select auth.uid()) = member_id);

drop policy if exists "Members can step out of line" on public.work_lineup;
create policy "Members can step out of line"
  on public.work_lineup for delete to authenticated
  using ((select auth.uid()) = member_id);

-- This project gives no default table grants, so every table needs these lines.
grant select, insert, delete on public.work_lineup to authenticated;
grant all on public.work_lineup to service_role;

-- How many people in a county lined up for each position, and how many people there passed the ID check.
-- Counts only. The ID-checked count comes back empty under 10 so nobody can be picked out.
create or replace function public.work_county_status(p_county text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'lineup', coalesce((
      select jsonb_object_agg(position, n) from (
        select l.position, count(*) as n
        from public.work_lineup l
        join public.members m on m.id = l.member_id
        where m.county_fips = p_county
        group by l.position) x), '{}'::jsonb),
    'people', (
      select count(distinct l.member_id)
      from public.work_lineup l
      join public.members m on m.id = l.member_id
      where m.county_fips = p_county),
    'id_checked', (
      select case when count(*) >= 10 then count(*) end
      from public.id_checks c
      join public.members m on m.id = c.member_id
      where c.status = 'passed' and m.county_fips = p_county)
  );
$$;

revoke execute on function public.work_county_status(text) from public;
grant execute on function public.work_county_status(text) to anon, authenticated;
