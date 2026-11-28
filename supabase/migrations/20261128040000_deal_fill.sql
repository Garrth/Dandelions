-- Deals of the day: a picture for each deal, and standing deals that fill the open slots.
-- A standing deal (fill = true) runs every day from deal_day to last_day, in the counties listed (empty list = everywhere).
-- It shows when businesses haven't booked the slot (ahead of plain listing offers), and it never counts against the 3 a business can book.
-- Starts with two Wells and Company Builders deals, sold through 10spot.shop, in the 9 Bay Area counties.
-- Run once in the Supabase SQL Editor (project dandelions), after 20261128030000_quality_wording.sql. Safe to run again.

alter table public.daily_deals add column if not exists image text not null default ''
  check (image = '' or image ~ '^https://' and char_length(image) <= 300);
alter table public.daily_deals add column if not exists fill boolean not null default false;
alter table public.daily_deals add column if not exists last_day date;
alter table public.daily_deals add column if not exists counties text[] not null default '{}';

-- Today's deals: deals for everyone (10spot merch) and ones booked for the county first,
-- then standing deals, then offers from verified listings in the county, up to 3.
create or replace function public.deals_today(p_fips text default null)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  with booked as (
    select d.id, 'deal' as kind, d.area, d.title, d.details, d.price_was, d.price_now, d.link, d.image,
           coalesce(nullif(ld.name, ''), d.sponsor) as name, ld.town, d.county_fips, d.listing_id, d.family,
           case when d.area = 'all' then 0 else 1 end as rank, d.created_at as at
    from public.daily_deals d
    left join public.listing_details ld on ld.county_fips = d.county_fips and ld.listing_id = d.listing_id
    where d.status = 'live' and not d.fill and d.deal_day = public.deal_today()
      and (d.area = 'all' or d.area = p_fips)
  ), standing as (
    select d.id, 'deal' as kind, d.area, d.title, d.details, d.price_was, d.price_now, d.link, d.image,
           coalesce(nullif(ld.name, ''), d.sponsor) as name, ld.town, d.county_fips, d.listing_id, d.family,
           2 as rank, d.created_at as at
    from public.daily_deals d
    left join public.listing_details ld on ld.county_fips = d.county_fips and ld.listing_id = d.listing_id
    where d.status = 'live' and d.fill and public.deal_today() between d.deal_day and coalesce(d.last_day, d.deal_day)
      and (cardinality(d.counties) = 0 or p_fips = any (d.counties))
      and not exists (select 1 from booked b where b.listing_id is not null and b.county_fips = d.county_fips and b.listing_id = d.listing_id)
  ), offers as (
    select null::bigint as id, 'offer' as kind, ld.county_fips as area, ld.offer as title, '' as details, '' as price_was, '' as price_now, '' as link, '' as image,
           ld.name, ld.town, ld.county_fips, ld.listing_id, ld.family, 3 as rank, ld.updated_at as at
    from public.listing_details ld
    where p_fips is not null and ld.county_fips = p_fips and ld.offer <> ''
      and not exists (select 1 from booked b where b.county_fips = ld.county_fips and b.listing_id = ld.listing_id)
      and not exists (select 1 from standing s where s.county_fips = ld.county_fips and s.listing_id = ld.listing_id)
  ), picked as (
    select * from booked union all select * from offers union all select * from standing
    order by rank, at desc, id
    limit 3
  )
  select jsonb_build_object(
    'day', public.deal_today(),
    'deals', coalesce((select jsonb_agg(to_jsonb(p) - 'rank' - 'at' order by p.rank, p.at desc, p.id) from picked p), '[]'::jsonb)
  );
$$;
grant execute on function public.deals_today(text) to anon, authenticated;

-- How full each of the next 30 days is for a county. Standing deals don't take a slot.
create or replace function public.deal_calendar(p_fips text)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('day', g.day, 'taken', (
    select count(*) from public.daily_deals d where d.status = 'live' and not d.fill and d.area in ('all', p_fips) and d.deal_day = g.day
  )) order by g.day), '[]'::jsonb)
  from (select (public.deal_today() + i) as day from generate_series(0, 30) i) g;
$$;
grant execute on function public.deal_calendar(text) to anon, authenticated;

-- An owner books a day for their listing. 3 deals a day per county (a deal for everyone takes one of the 3,
-- a standing deal takes none), and one day per business each week.
create or replace function public.deal_book(p_fips text, p_lid text, p_day date, p_title text, p_details text default '',
                                            p_was text default '', p_now text default '', p_link text default '')
returns bigint
language plpgsql security definer set search_path = ''
as $$
declare me uuid := (select auth.uid()); fam text; new_id bigint;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if not public.owns_listing(p_fips, p_lid) then raise exception 'deal_not_owner'; end if;
  select family into fam from public.listing_details where county_fips = p_fips and listing_id = p_lid;
  if fam is null then raise exception 'deal_no_details'; end if;
  if p_day < public.deal_today() or p_day > public.deal_today() + 30 then raise exception 'deal_day'; end if;
  if char_length(btrim(coalesce(p_title, ''))) < 3 then raise exception 'deal_title'; end if;
  perform pg_advisory_xact_lock(hashtext('deal:' || p_fips || ':' || p_day));
  if (select count(*) from public.daily_deals where status = 'live' and not fill and area in ('all', p_fips) and deal_day = p_day) >= 3 then
    raise exception 'deal_full';
  end if;
  if exists (select 1 from public.daily_deals where status = 'live' and not fill and county_fips = p_fips and listing_id = p_lid
             and deal_day between p_day - 6 and p_day + 6) then
    raise exception 'deal_week';
  end if;
  insert into public.daily_deals (area, deal_day, county_fips, listing_id, family, owner_id, title, details, price_was, price_now, link)
  values (p_fips, p_day, p_fips, p_lid, fam, me, btrim(p_title), btrim(coalesce(p_details, '')),
          btrim(coalesce(p_was, '')), btrim(coalesce(p_now, '')), btrim(coalesce(p_link, '')))
  returning id into new_id;
  return new_id;
end;
$$;
revoke all on function public.deal_book(text, text, date, text, text, text, text, text) from public;
grant execute on function public.deal_book(text, text, date, text, text, text, text, text) to authenticated;

-- The two Wells and Company Builders deals, sold through 10spot.shop, for a year in the 9 Bay Area counties.
-- To change the words, link or picture later, update the rows where sponsor = 'Wells and Company Builders' and fill.
insert into public.daily_deals (area, deal_day, last_day, fill, counties, county_fips, listing_id, family, sponsor, owner_id, title, details, link)
select 'all', public.deal_today(), public.deal_today() + 365, true,
       array['06001','06013','06041','06055','06075','06081','06085','06095','06097'],
       '06041', '90facb72-6a6d-402e-b694-d62e4e4d3cf0', 'home_service', 'Wells and Company Builders', null, v.title, v.details, 'https://10spot.shop/'
from (values
  ('Solar with battery: 10% off', 'Up to $2,000 off a new solar and battery system. Get your claim code on 10spot.'),
  ('ADU: 10% off', 'Up to $20,000 off building an ADU (a backyard cottage or in-law unit). Get your claim code on 10spot.')
) as v(title, details)
where not exists (select 1 from public.daily_deals x where x.fill and x.sponsor = 'Wells and Company Builders' and x.title = v.title);
