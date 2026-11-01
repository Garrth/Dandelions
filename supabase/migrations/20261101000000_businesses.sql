-- Stage 2: member businesses, the license check queue, the public directory and the monthly busy report.
-- Run once in the Supabase SQL Editor, after the stage 1 files.

-- One business per member for now. The owner fills it in from their profile page.
-- A business shows in the public directory only after its license is checked (status 'listed').
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.members (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  kind text not null check (kind in ('Home and repair', 'Food', 'Personal care', 'Office and media', 'Rentals', 'Auto', 'Pets', 'Other')),
  town text not null check (char_length(town) between 2 and 60),
  county_fips text check (county_fips ~ '^[0-9]{5}$'),
  services text not null check (char_length(services) between 2 and 200),
  -- License type and number, like "CSLB C-33 #123456" or "Santa Rosa business tax certificate #9876". Private.
  license text not null check (char_length(license) between 4 and 120),
  -- An optional offer for members, shown in the directory.
  offer text check (char_length(offer) <= 120),
  -- The most points a month the business will take, once points are on. Private, 0 means none.
  monthly_limit integer not null default 0 check (monthly_limit between 0 and 1000000),
  -- 'pending' waits for the license check, 'listed' shows in the directory, 'not_listed' needs a word with the owner.
  status text not null default 'pending' check (status in ('pending', 'listed', 'not_listed')),
  checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index businesses_listed_idx on public.businesses (county_fips) where status = 'listed';

alter table public.businesses enable row level security;

create policy "Owners can read their own business"
  on public.businesses for select to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Owners can add their own business"
  on public.businesses for insert to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "Owners can change their own business"
  on public.businesses for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

-- Owners can only touch these columns. Status and the check date are set by whoever works the queue.
revoke insert, update on public.businesses from authenticated;
grant select on public.businesses to authenticated;
grant insert (owner_id, name, kind, town, services, license, offer, monthly_limit) on public.businesses to authenticated;
grant update (name, kind, town, services, license, offer, monthly_limit, updated_at) on public.businesses to authenticated;
grant select, insert, update on public.businesses to service_role;

-- The county comes from the owner's pledge. A changed license goes back into the check queue.
create function public.business_defaults()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Runs as the caller: 'authenticated' from the website, the admin role from the SQL Editor.
  if tg_op = 'INSERT' then
    new.county_fips := (select m.county_fips from public.members m where m.id = new.owner_id);
  elsif new.license is distinct from old.license and current_user = 'authenticated' then
    new.status := 'pending';
    new.checked_at := null;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger business_defaults
  before insert or update on public.businesses
  for each row execute function public.business_defaults();

-- The public directory: listed businesses only, and only the public fields.
create function public.directory_listings()
returns table (name text, kind text, town text, county_fips text, services text, offer text)
language sql
stable
security definer
set search_path = ''
as $$
  select b.name, b.kind, b.town, b.county_fips, b.services, b.offer
  from public.businesses b
  where b.status = 'listed'
  order by b.kind, b.name;
$$;

grant execute on function public.directory_listings() to anon, authenticated;

-- Monthly "how busy" report: how booked the business is, 0 to 100 percent. Private to the owner.
create table public.busy_reports (
  business_id uuid not null references public.businesses (id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  busy smallint not null check (busy between 0 and 100),
  updated_at timestamptz not null default now(),
  primary key (business_id, month)
);

alter table public.busy_reports enable row level security;

create policy "Owners can read their own busy reports"
  on public.busy_reports for select to authenticated
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())));

create policy "Owners can add their own busy reports"
  on public.busy_reports for insert to authenticated
  with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())));

create policy "Owners can change their own busy reports"
  on public.busy_reports for update to authenticated
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())));

grant select, insert, update on public.busy_reports to authenticated;

-- County average for Raindy. Returns nothing unless at least 10 businesses reported that month.
create function public.county_busy(fips text, for_month date)
returns table (reporting bigint, average_busy numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select count(*), round(avg(r.busy))
  from public.busy_reports r
  join public.businesses b on b.id = r.business_id
  where b.county_fips = fips and r.month = for_month
  having count(*) >= 10;
$$;

grant execute on function public.county_busy(text, date) to anon, authenticated;
