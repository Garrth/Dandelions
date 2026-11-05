-- Claiming a directory listing: the owner gets a code by text or voice call at the listing's phone.
-- Run once in the Supabase SQL Editor (project dandelions). Safe to run again.

-- Every claim try is kept, so there's a log of who claimed what and when.
-- Only the claim function (service key) writes here. Members can read their own claims.
create table if not exists public.listing_claims (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  county_fips text not null check (county_fips ~ '^[0-9]{5}$'),
  family text not null check (family ~ '^[a-z0-9_]{1,60}$'),
  listing_id text not null check (char_length(listing_id) between 1 and 80),
  listing_name text not null check (char_length(listing_name) <= 200),
  -- The listed phone the code went to, like +17075551234.
  phone text not null check (phone ~ '^\+1[0-9]{10}$'),
  channel text not null check (channel in ('sms', 'call')),
  -- 'pending' waits for the code, 'verified' is the owner of record, 'review' passed the code but waits
  -- for a person to look (a member's 4th claim and up), 'expired' never finished.
  status text not null default 'pending' check (status in ('pending', 'verified', 'review', 'expired')),
  tries integer not null default 0,
  created_at timestamptz not null default now(),
  verified_at timestamptz
);

-- One owner of record per listing.
create unique index if not exists listing_claims_one_owner
  on public.listing_claims (county_fips, listing_id) where status = 'verified';
create index if not exists listing_claims_member_idx on public.listing_claims (member_id, created_at);

alter table public.listing_claims enable row level security;
drop policy if exists "Members can read their own claims" on public.listing_claims;
create policy "Members can read their own claims"
  on public.listing_claims for select to authenticated
  using ((select auth.uid()) = member_id);

revoke all on public.listing_claims from anon, authenticated;
grant select on public.listing_claims to authenticated;
grant select, insert, update on public.listing_claims to service_role;

-- "This isn't our number": a help request a community organizer sorts out.
create table if not exists public.claim_help (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null default auth.uid() references public.members (id) on delete cascade,
  county_fips text not null check (county_fips ~ '^[0-9]{5}$'),
  family text not null check (family ~ '^[a-z0-9_]{1,60}$'),
  listing_id text not null check (char_length(listing_id) between 1 and 80),
  listing_name text not null check (char_length(listing_name) <= 200),
  -- A phone number where the organizer can reach the person, and what's wrong.
  contact text not null check (char_length(contact) between 7 and 40),
  note text not null default '' check (char_length(note) <= 500),
  status text not null default 'open' check (status in ('open', 'done')),
  created_at timestamptz not null default now()
);

alter table public.claim_help enable row level security;
drop policy if exists "Members can ask for help with their own claims" on public.claim_help;
create policy "Members can ask for help with their own claims"
  on public.claim_help for insert to authenticated
  with check ((select auth.uid()) = member_id);
drop policy if exists "Members can read their own help requests" on public.claim_help;
create policy "Members can read their own help requests"
  on public.claim_help for select to authenticated
  using ((select auth.uid()) = member_id);

revoke all on public.claim_help from anon, authenticated;
grant select on public.claim_help to authenticated;
grant insert (county_fips, family, listing_id, listing_name, contact, note) on public.claim_help to authenticated;
grant select, update on public.claim_help to service_role;

-- Which listings in a county have an owner of record. Ids only, nothing about who.
create or replace function public.claimed_listings(fips text)
returns setof text
language sql stable security definer set search_path = ''
as $$
  select listing_id from public.listing_claims where county_fips = fips and status = 'verified';
$$;
revoke all on function public.claimed_listings(text) from public;
grant execute on function public.claimed_listings(text) to anon, authenticated;

grant select on public.members to service_role;
