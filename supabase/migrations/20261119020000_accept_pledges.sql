-- Monthly pledges: how many points a month a person, or a claimed directory listing, says it will accept.
-- Businesses added from the profile page already keep theirs in businesses.monthly_limit.
-- Run once in the Supabase SQL Editor (project dandelions), after 20261119000000_work_lineup.sql. Safe to run again.

create table if not exists public.accept_pledges (
  member_id uuid not null default auth.uid() references public.members (id) on delete cascade,
  -- Both empty means the member's own pledge. Both set means a listing the member claimed.
  county_fips text not null default '' check (county_fips = '' or county_fips ~ '^[0-9]{5}$'),
  listing_id text not null default '' check (char_length(listing_id) <= 80),
  points integer not null check (points between 0 and 1000000),
  updated_at timestamptz not null default now(),
  primary key (member_id, county_fips, listing_id),
  check ((county_fips = '') = (listing_id = '')),
  -- A person's own pledge is capped lower than a business's.
  check (listing_id <> '' or points <= 5000)
);

alter table public.accept_pledges enable row level security;

drop policy if exists "Members can read their own pledges" on public.accept_pledges;
create policy "Members can read their own pledges"
  on public.accept_pledges for select to authenticated
  using ((select auth.uid()) = member_id);

drop policy if exists "Members can add their own pledges" on public.accept_pledges;
create policy "Members can add their own pledges"
  on public.accept_pledges for insert to authenticated
  with check ((select auth.uid()) = member_id and (listing_id = '' or public.owns_listing(county_fips, listing_id)));

drop policy if exists "Members can change their own pledges" on public.accept_pledges;
create policy "Members can change their own pledges"
  on public.accept_pledges for update to authenticated
  using ((select auth.uid()) = member_id)
  with check ((select auth.uid()) = member_id and (listing_id = '' or public.owns_listing(county_fips, listing_id)));

drop policy if exists "Members can take back their own pledges" on public.accept_pledges;
create policy "Members can take back their own pledges"
  on public.accept_pledges for delete to authenticated
  using ((select auth.uid()) = member_id);

-- This project gives no default table grants, so every table needs these lines.
grant select, insert, update, delete on public.accept_pledges to authenticated;
grant all on public.accept_pledges to service_role;

-- The Work page numbers for one county. Counts and totals only.
--   id_checked: people who passed the ID check (empty under 10).
--   businesses_pledged: businesses that said how many points a month they'll accept.
--   pledgers / pledged: how many pledges count, and their monthly total (empty under 5, so no one's pledge shows).
-- A person's pledge counts only once they pass the ID check. A listing's counts only while its claim is verified.
create or replace function public.work_county_status(p_county text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with person as (
    select a.points
    from public.accept_pledges a
    join public.members m on m.id = a.member_id
    where a.listing_id = '' and a.points > 0 and m.county_fips = p_county
      and exists (select 1 from public.id_checks c where c.member_id = a.member_id and c.status = 'passed')
  ), biz as (
    select a.points
    from public.accept_pledges a
    where a.listing_id <> '' and a.points > 0 and a.county_fips = p_county
      and exists (select 1 from public.listing_claims lc
                  where lc.county_fips = a.county_fips and lc.listing_id = a.listing_id
                    and lc.member_id = a.member_id and lc.status = 'verified')
    union all
    select b.monthly_limit
    from public.businesses b
    where b.county_fips = p_county and b.status <> 'not_listed' and b.monthly_limit > 0
  ), counted as (
    select (select count(*) from person) + (select count(*) from biz) as n,
           coalesce((select sum(points) from person), 0) + coalesce((select sum(points) from biz), 0) as total
  )
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
      where c.status = 'passed' and m.county_fips = p_county),
    'businesses_pledged', (select count(*) from biz),
    'pledgers', (select n from counted),
    'pledged', (select case when n >= 5 then total end from counted)
  );
$$;

revoke execute on function public.work_county_status(text) from public;
grant execute on function public.work_county_status(text) to anon, authenticated;
