-- Stage 1 of the member app: profiles, private work answers and ID check results.
-- Run once in the Supabase SQL Editor, after the earlier migrations.

-- What a member shows on their profile. They can read and change only their own row.
create table public.profiles (
  id uuid primary key references public.members (id) on delete cascade,
  display_name text check (char_length(display_name) between 1 and 60),
  town text check (char_length(town) between 1 and 60),
  open_to_work boolean not null default false,
  can_do text[] not null default '{}' check (cardinality(can_do) <= 20),
  certs text[] not null default '{}' check (cardinality(certs) <= 20),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Members can read their own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy "Members can add their own profile"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);

create policy "Members can change their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Optional work answers. Private: only the member can read their own.
-- Raindy only ever sees county totals through county_work_totals below.
create table public.work_answers (
  member_id uuid primary key references public.members (id) on delete cascade,
  jobs smallint not null check (jobs between 0 and 5),
  hours text not null check (hours in ('under_20', '20_to_39', '40_to_50', 'over_50')),
  pay text not null check (pay in ('under_17', '17_to_25', '25_to_35', '35_to_50', 'over_50', 'prefer_not')),
  updated_at timestamptz not null default now()
);

alter table public.work_answers enable row level security;

create policy "Members can read their own work answers"
  on public.work_answers for select to authenticated
  using ((select auth.uid()) = member_id);

create policy "Members can add their own work answers"
  on public.work_answers for insert to authenticated
  with check ((select auth.uid()) = member_id);

create policy "Members can change their own work answers"
  on public.work_answers for update to authenticated
  using ((select auth.uid()) = member_id)
  with check ((select auth.uid()) = member_id);

create policy "Members can remove their own work answers"
  on public.work_answers for delete to authenticated
  using ((select auth.uid()) = member_id);

-- ID check results. Only the yes or no and the date are kept, never ID papers or personal details.
-- Plaid's session id is kept only to look the result up again. Rows are written by the
-- idv-start and idv-check functions using the service key; members can only read their own.
create table public.id_checks (
  member_id uuid primary key references public.members (id) on delete cascade,
  status text not null default 'started' check (status in ('started', 'passed', 'failed', 'review')),
  provider text not null default 'equitide_plaid',
  plaid_session_id text,
  started_at timestamptz not null default now(),
  decided_at timestamptz
);

alter table public.id_checks enable row level security;

create policy "Members can read their own ID check"
  on public.id_checks for select to authenticated
  using ((select auth.uid()) = member_id);

-- County totals of the work answers, for Raindy. Returns nothing unless at least 10 members
-- in the county answered, so no one's answers can be picked out.
create function public.county_work_totals(fips text)
returns table (answered bigint, two_or_more_jobs bigint, under_25_an_hour bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select count(*), count(*) filter (where w.jobs >= 2), count(*) filter (where w.pay in ('under_17', '17_to_25'))
  from public.work_answers w
  join public.members m on m.id = w.member_id
  where m.county_fips = fips
  having count(*) >= 10;
$$;

grant execute on function public.county_work_totals(text) to anon, authenticated;
