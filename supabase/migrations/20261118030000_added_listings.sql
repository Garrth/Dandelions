-- "Add a business": members can add a business the directory doesn't have yet, anywhere in the US.
-- It shows right away. Nobody approves it. Whoever added it can take it back down, and every
-- add and take-down is kept here, so anything can be undone.
-- Run once in the Supabase SQL Editor (project dandelions). Safe to run again.

create table if not exists public.added_listings (
  -- Ids start with "add-" so they never clash with listings from open data or the license list.
  id text primary key default ('add-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))
    check (id ~ '^add-[a-z0-9]{6,20}$'),
  county_fips text not null check (county_fips ~ '^[0-9]{5}$'),
  -- The directory heading (business type) and its family, as in /data/dir/types.json.
  family text not null check (family ~ '^[a-z0-9_]{1,60}$'),
  type_slug text not null check (type_slug ~ '^[a-z0-9_]{1,80}$'),
  name text not null check (char_length(btrim(name)) between 2 and 100),
  -- Street address. Shown only when show_street is on (a home business can leave it off).
  address text not null default '' check (char_length(address) <= 120),
  show_street boolean not null default true,
  town text not null check (char_length(btrim(town)) between 2 and 60),
  state text not null check (state ~ '^[A-Z]{2}$'),
  zip text not null check (zip ~ '^[0-9]{5}$'),
  phone text not null check (phone ~ '^\([0-9]{3}\) [0-9]{3}-[0-9]{4}$'),
  website text not null default '' check (website = '' or website ~ '^https?://' and char_length(website) <= 300),
  -- Map spot (the ZIP center) for distance, when the directory knows the ZIP. Empty outside open counties.
  lat double precision check (lat between 18 and 72),
  lon double precision check (lon between -180 and -60),
  added_by uuid not null default auth.uid() references public.members (id) on delete cascade,
  created_at timestamptz not null default now(),
  status text not null default 'live' check (status in ('live', 'removed')),
  removed_at timestamptz,
  removed_by uuid references public.members (id) on delete set null,
  removed_why text not null default '' check (char_length(removed_why) <= 300)
);
create index if not exists added_listings_county on public.added_listings (county_fips) where status = 'live';
create index if not exists added_listings_by on public.added_listings (added_by, created_at);

alter table public.added_listings enable row level security;

drop policy if exists "Anyone can see live added listings" on public.added_listings;
create policy "Anyone can see live added listings"
  on public.added_listings for select to anon, authenticated
  using (status = 'live' or added_by = (select auth.uid()));

drop policy if exists "Members can add a listing" on public.added_listings;
create policy "Members can add a listing"
  on public.added_listings for insert to authenticated
  with check (added_by = (select auth.uid()) and status = 'live');

drop policy if exists "Whoever added a listing can take it down" on public.added_listings;
create policy "Whoever added a listing can take it down"
  on public.added_listings for update to authenticated
  using (added_by = (select auth.uid()))
  with check (added_by = (select auth.uid()));

revoke all on public.added_listings from anon, authenticated;
-- Who added it stays private. The public columns only.
grant select (id, county_fips, family, type_slug, name, address, show_street, town, state, zip, phone, website, lat, lon, created_at, status)
  on public.added_listings to anon, authenticated;
grant insert (county_fips, family, type_slug, name, address, show_street, town, state, zip, phone, website, lat, lon)
  on public.added_listings to authenticated;
grant update (status, removed_why) on public.added_listings to authenticated;
grant select, insert, update on public.added_listings to service_role;

-- Before a listing is saved: limits, tidy text, and stamp who and when. Members can't set these themselves.
create or replace function public.added_listing_rules()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if (select count(*) from public.added_listings where added_by = new.added_by and created_at > now() - interval '1 day') >= 5 then
      raise exception 'add_limit' using hint = 'Five businesses a day is the most for one member. Try again tomorrow.';
    end if;
    if (select count(*) from public.added_listings where created_at > now() - interval '1 day') >= 1000 then
      raise exception 'add_site_limit' using hint = 'Lots of businesses were added today. Please try again tomorrow.';
    end if;
    -- The same phone in the same county already added and live: that's a repeat.
    if exists (select 1 from public.added_listings a where a.county_fips = new.county_fips and a.phone = new.phone and a.status = 'live') then
      raise exception 'add_repeat' using hint = 'A business with this phone number was already added here.';
    end if;
    new.name := btrim(new.name); new.town := btrim(new.town); new.address := btrim(new.address);
    new.created_at := now();
    new.status := 'live';
  else
    -- Only the take-down can change, and once it's down it stays down (add it again if it was a mistake).
    if old.status = 'removed' then raise exception 'already_removed'; end if;
    new.id := old.id; new.county_fips := old.county_fips; new.family := old.family; new.type_slug := old.type_slug;
    new.name := old.name; new.address := old.address; new.show_street := old.show_street; new.town := old.town;
    new.state := old.state; new.zip := old.zip; new.phone := old.phone; new.website := old.website;
    new.lat := old.lat; new.lon := old.lon; new.added_by := old.added_by; new.created_at := old.created_at;
    if new.status = 'removed' then
      new.removed_at := now();
      new.removed_by := (select auth.uid());
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists added_listing_rules on public.added_listings;
create trigger added_listing_rules before insert or update on public.added_listings
  for each row execute function public.added_listing_rules();

-- The businesses a member added, with ones taken down, for their own page. Nobody else sees who added what.
create or replace function public.my_added_listings()
returns setof public.added_listings
language sql stable security definer set search_path = ''
as $$
  select * from public.added_listings where added_by = (select auth.uid()) order by created_at desc;
$$;
revoke all on function public.my_added_listings() from public, anon;
grant execute on function public.my_added_listings() to authenticated;
