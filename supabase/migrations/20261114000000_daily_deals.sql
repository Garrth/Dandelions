-- Deals of the day: three special offers a day, shown on the home page. Businesses book their own day,
-- with no approval step. During the soft launch booking is free.
-- Run once in the Supabase SQL Editor (project dandelions), after 20261105010000_listing_details.sql. Safe to run again.

create table if not exists public.daily_deals (
  id bigint generated always as identity primary key,
  -- A county (5 digits) for a local deal, or 'all' for one anyone can use, like an online shop.
  area text not null check (area = 'all' or area ~ '^[0-9]{5}$'),
  deal_day date not null,
  -- The listing it belongs to. Empty for a deal added by hand, like the 10spot.shop deal.
  county_fips text,
  listing_id text,
  family text,
  -- Shown as who the deal is from when there's no listing.
  sponsor text not null default '' check (char_length(sponsor) <= 80),
  owner_id uuid default auth.uid() references public.members (id) on delete set null,
  title text not null check (char_length(title) between 3 and 80),
  details text not null default '' check (char_length(details) <= 200),
  price_was text not null default '' check (char_length(price_was) <= 20),
  price_now text not null default '' check (char_length(price_now) <= 20),
  link text not null default '' check (link = '' or link ~ '^https://' and char_length(link) <= 300),
  status text not null default 'live' check (status in ('live', 'cancelled', 'removed')),
  removed_note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists daily_deals_day on public.daily_deals (deal_day, area) where status = 'live';
create index if not exists daily_deals_listing on public.daily_deals (county_fips, listing_id, deal_day);

alter table public.daily_deals enable row level security;
drop policy if exists "Anyone can read live deals" on public.daily_deals;
create policy "Anyone can read live deals" on public.daily_deals for select to anon, authenticated
  using (status = 'live' or owner_id = (select auth.uid()));
revoke all on public.daily_deals from anon, authenticated;
grant select on public.daily_deals to anon, authenticated;
grant select, insert, update, delete on public.daily_deals to service_role;

-- "Today" is Pacific time for now, since the first counties are in the Bay Area.
create or replace function public.deal_today()
returns date
language sql stable set search_path = ''
as $$ select (now() at time zone 'America/Los_Angeles')::date; $$;
grant execute on function public.deal_today() to anon, authenticated;

-- Today's deals for an area: deals for everyone first (like 10spot.shop), then ones booked for that county.
-- If fewer than 3 are booked, the newest offers from verified listings in the county fill the rest.
create or replace function public.deals_today(p_fips text default null)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  with booked as (
    select d.id, 'deal' as kind, d.area, d.title, d.details, d.price_was, d.price_now, d.link,
           coalesce(nullif(ld.name, ''), d.sponsor) as name, ld.town, d.county_fips, d.listing_id, d.family,
           case when d.area = 'all' then 0 else 1 end as rank, d.created_at as at
    from public.daily_deals d
    left join public.listing_details ld on ld.county_fips = d.county_fips and ld.listing_id = d.listing_id
    where d.status = 'live' and d.deal_day = public.deal_today()
      and (d.area = 'all' or d.area = p_fips)
  ), offers as (
    select null::bigint as id, 'offer' as kind, ld.county_fips as area, ld.offer as title, '' as details, '' as price_was, '' as price_now, '' as link,
           ld.name, ld.town, ld.county_fips, ld.listing_id, ld.family, 2 as rank, ld.updated_at as at
    from public.listing_details ld
    where p_fips is not null and ld.county_fips = p_fips and ld.offer <> ''
      and not exists (select 1 from booked b where b.county_fips = ld.county_fips and b.listing_id = ld.listing_id)
  ), picked as (
    select * from booked union all select * from offers
    order by rank, at desc
    limit 3
  )
  select jsonb_build_object(
    'day', public.deal_today(),
    'deals', coalesce((select jsonb_agg(to_jsonb(p) - 'rank' - 'at' order by p.rank, p.at desc) from picked p), '[]'::jsonb)
  );
$$;
grant execute on function public.deals_today(text) to anon, authenticated;

-- How full each of the next 30 days is for a county, so an owner can pick an open day.
create or replace function public.deal_calendar(p_fips text)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('day', g.day, 'taken', (
    select count(*) from public.daily_deals d where d.status = 'live' and d.area in ('all', p_fips) and d.deal_day = g.day
  )) order by g.day), '[]'::jsonb)
  from (select (public.deal_today() + i) as day from generate_series(0, 30) i) g;
$$;
grant execute on function public.deal_calendar(text) to anon, authenticated;

-- An owner books a day for their listing. 3 deals a day per county (a deal for everyone takes one of the 3), and one day per business each week.
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
  if (select count(*) from public.daily_deals where status = 'live' and area in ('all', p_fips) and deal_day = p_day) >= 3 then
    raise exception 'deal_full';
  end if;
  if exists (select 1 from public.daily_deals where status = 'live' and county_fips = p_fips and listing_id = p_lid
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

-- The owner can cancel a deal that hasn't run yet.
create or replace function public.deal_cancel(p_id bigint)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  update public.daily_deals set status = 'cancelled'
  where id = p_id and owner_id = (select auth.uid()) and status = 'live' and deal_day >= public.deal_today();
  if not found then raise exception 'deal_not_yours'; end if;
end;
$$;
revoke all on function public.deal_cancel(bigint) from public;
grant execute on function public.deal_cancel(bigint) to authenticated;

-- Talk moderators can take down a deal that's false or breaks the terms. It's logged with the Talk moderator actions.
create or replace function public.deal_mod_remove(p_id bigint, p_note text default '')
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_talk_mod() then raise exception 'not_moderator'; end if;
  update public.daily_deals set status = 'removed', removed_note = coalesce(p_note, '') where id = p_id;
  insert into public.talk_mod_log (mod_id, action, note) values ((select auth.uid()), 'deal_remove', 'deal ' || p_id || ': ' || coalesce(p_note, ''));
end;
$$;
revoke all on function public.deal_mod_remove(bigint, text) from public;
grant execute on function public.deal_mod_remove(bigint, text) to authenticated;

-- The 10spot.shop deal: half off the merch item of the day, every day for the next year, as the first of the three.
-- Running this again doesn't add copies. To change the words later, update the rows where sponsor = '10spot.shop'.
insert into public.daily_deals (area, deal_day, sponsor, owner_id, title, details, link)
select 'all', d::date, '10spot.shop', null, 'Merch item of the day: 50% off',
       'Half off one piece of Dandelions merch each day. 10spot.shop is run by Dandelions'' founder.',
       'https://10spot.shop/'
from generate_series(public.deal_today(), public.deal_today() + 365, interval '1 day') d
where not exists (select 1 from public.daily_deals x where x.sponsor = '10spot.shop' and x.area = 'all' and x.deal_day = d::date);
