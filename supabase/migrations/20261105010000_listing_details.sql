-- What an owner adds after claiming a listing. A listing with a row here shows as Verified.
-- Run once in the Supabase SQL Editor (project dandelions), after 20261105000000_listing_claims.sql. Safe to run again.

create table if not exists public.listing_details (
  county_fips text not null check (county_fips ~ '^[0-9]{5}$'),
  listing_id text not null check (char_length(listing_id) between 1 and 80),
  family text not null check (family ~ '^[a-z0-9_]{1,60}$'),
  owner_id uuid not null default auth.uid() references public.members (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 100),
  phone text not null default '' check (char_length(phone) <= 30),
  address text not null default '' check (char_length(address) <= 120),
  town text not null default '' check (char_length(town) <= 60),
  zip text not null default '' check (zip ~ '^([0-9]{5})?$'),
  website text not null default '' check (website = '' or website ~ '^https?://' and char_length(website) <= 300),
  description text not null default '' check (char_length(description) <= 600),
  -- {"mon": ["09:00", "17:00"], "tue": null, ...}. null or missing means closed that day.
  hours jsonb,
  menu_url text not null default '' check (menu_url = '' or menu_url ~ '^https?://' and char_length(menu_url) <= 300),
  offer text not null default '' check (char_length(offer) <= 140),
  -- 1 to 4, like $ to $$$$. 0 means not given.
  price smallint not null default 0 check (price between 0 and 4),
  free_estimates boolean not null default false,
  -- How many people work there: '1', '2-5', '6-20', '21+', or '' for not given.
  crew text not null default '' check (crew in ('', '1', '2-5', '6-20', '21+')),
  -- Paths in the listing-photos bucket, at most 5.
  photos text[] not null default '{}' check (cardinality(photos) <= 5),
  updated_at timestamptz not null default now(),
  primary key (county_fips, listing_id)
);

-- Only the owner of record (a verified claim) can add or change a listing's details.
create or replace function public.owns_listing(fips text, lid text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.listing_claims
    where county_fips = fips and listing_id = lid and status = 'verified' and member_id = (select auth.uid())
  );
$$;
revoke all on function public.owns_listing(text, text) from public;
grant execute on function public.owns_listing(text, text) to authenticated;

alter table public.listing_details enable row level security;
drop policy if exists "Anyone can read listing details" on public.listing_details;
create policy "Anyone can read listing details"
  on public.listing_details for select to anon, authenticated using (true);
drop policy if exists "Owners can add details" on public.listing_details;
create policy "Owners can add details"
  on public.listing_details for insert to authenticated
  with check (owner_id = (select auth.uid()) and public.owns_listing(county_fips, listing_id));
drop policy if exists "Owners can change details" on public.listing_details;
create policy "Owners can change details"
  on public.listing_details for update to authenticated
  using (public.owns_listing(county_fips, listing_id))
  with check (owner_id = (select auth.uid()) and public.owns_listing(county_fips, listing_id));

revoke all on public.listing_details from anon, authenticated;
grant select on public.listing_details to anon, authenticated;
-- The policies above decide which rows; owners can write any column of their own listing.
grant insert, update on public.listing_details to authenticated;
grant select, insert, update, delete on public.listing_details to service_role;

-- Every change is kept, so anything bad can be put back.
create table if not exists public.listing_details_log (
  id bigint generated always as identity primary key,
  county_fips text not null,
  listing_id text not null,
  member_id uuid,
  old jsonb,
  new jsonb,
  at timestamptz not null default now()
);
alter table public.listing_details_log enable row level security;
revoke all on public.listing_details_log from anon, authenticated;
grant select on public.listing_details_log to service_role;

create or replace function public.log_listing_details()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.listing_details_log (county_fips, listing_id, member_id, old, new)
  values (new.county_fips, new.listing_id, (select auth.uid()),
          case when tg_op = 'UPDATE' then to_jsonb(old) end, to_jsonb(new));
  return new;
end;
$$;
drop trigger if exists listing_details_log on public.listing_details;
create trigger listing_details_log after insert or update on public.listing_details
  for each row execute function public.log_listing_details();

-- Photos: public to look at, only the owner of record can add or remove them.
-- Files live at <county fips>/<listing id>/<file>. The page shrinks photos before upload and strips location data.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-photos', 'listing-photos', true, 2097152, array['image/jpeg'])
on conflict (id) do update set public = true, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg'];

-- The bucket is public, so anyone can look. Removing a file through the API also needs this.
drop policy if exists "Anyone can see listing photos" on storage.objects;
create policy "Anyone can see listing photos"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'listing-photos');
drop policy if exists "Owners can add listing photos" on storage.objects;
create policy "Owners can add listing photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'listing-photos'
    and public.owns_listing((storage.foldername(name))[1], (storage.foldername(name))[2]));
drop policy if exists "Owners can remove listing photos" on storage.objects;
create policy "Owners can remove listing photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'listing-photos'
    and public.owns_listing((storage.foldername(name))[1], (storage.foldername(name))[2]));
