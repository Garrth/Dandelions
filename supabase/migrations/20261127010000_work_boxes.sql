-- Work page boxes: sign-ups, people who pledged, businesses that pledged, and points available each month.
-- Garth asked for the real numbers (no "under 5"). Only counts and one county total are returned, never who pledged.
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
           coalesce((select sum(points) from person), 0) + coalesce((select sum(points) from biz), 0) as total,
           floor(coalesce((select sum(points) from person), 0) * 0.25
                 + coalesce((select sum(points) from biz), 0) * 0.5) as available,
           (select count(*) from person) as person_n
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
    'pledged', (select case when n >= 5 then total end from counted),
    'available', (select case when n >= 5 then available end from counted),
    'available_now', (select available from counted),
    'person_pledgers', (select person_n from counted),
    'signups', (
      select count(*)
      from public.members m
      join auth.users u on u.id = m.id
      where u.email_confirmed_at is not null and m.county_fips = p_county)
  );
$$;

revoke execute on function public.work_county_status(text) from public;
grant execute on function public.work_county_status(text) to anon, authenticated;
