-- Adds: each member's county, the to-do list with members' picks,
-- a place to save ideas for the list, and public counts for the site.
-- Only confirmed members (they clicked the email link) are counted.

-- 1. County on each member
alter table public.members add column county_fips text check (county_fips ~ '^[0-9]{5}$');
create index members_county_idx on public.members (county_fips);

-- 2. The to-do list
create table public.todo_items (
  key text primary key,
  title text not null,
  detail text not null,
  sort integer not null
);

alter table public.todo_items enable row level security;
create policy "Anyone can read the to-do list"
  on public.todo_items for select
  to anon, authenticated
  using (true);
grant select on public.todo_items to anon, authenticated;

insert into public.todo_items (key, title, detail, sort) values
  ('clean-energy',  'Run everything on clean energy',        'Sun, wind, and storage for the whole country',             1),
  ('power-grid',    'Rebuild the power grid',                'Modern, reliable, and underground',                         2),
  ('soil',          'Grow food that builds the soil back',   'No chemical fertilizer, no worn-out fields',                3),
  ('water',         'Make fresh water where it''s running out', 'Enough clean power to desalinate for dry places',       4),
  ('trees',         'Plant a lot more trees',                'Shade, clean air, and healthier land',                      5),
  ('ocean',         'Clean up the ocean',                    'And let fish come back by not overfishing',                 6),
  ('zero-waste',    'Get to zero waste',                     'Make it, use it, reuse it',                                 7),
  ('old-messes',    'Clean up our old messes',               'Polluted land and water, fixed for good',                   8),
  ('healthcare',    'Healthcare for everyone',               'Including dental, vision, and mental health',               9),
  ('job-training',  'Paid job training',                     'Learn the skills the work needs, and get paid to learn',   10),
  ('schools',       'Better schools',                        'For kids and for anyone going back',                       11),
  ('getting-around','Better ways to get around',             'Faster, more convenient, and clean',                       12),
  ('automation',    'Build the machines for automation',     'And let them do the heavy lifting',                        13);

-- 3. Members' picks (one per member per item)
create table public.member_picks (
  member_id uuid not null references public.members (id) on delete cascade,
  item_key text not null references public.todo_items (key) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (member_id, item_key)
);

alter table public.member_picks enable row level security;
create policy "Members can read their own picks"
  on public.member_picks for select
  to authenticated
  using ((select auth.uid()) = member_id);

-- 4. Ideas people add. Saved for review, never shown on the site automatically.
create table public.ideas (
  id bigint generated always as identity primary key,
  idea text not null check (char_length(btrim(idea)) between 3 and 200),
  created_at timestamptz not null default now()
);

alter table public.ideas enable row level security;
-- Anyone can add an idea. Nobody can read them from the website.
create policy "Anyone can add an idea"
  on public.ideas for insert
  to anon, authenticated
  with check (char_length(btrim(idea)) between 3 and 200);
grant insert on public.ideas to anon, authenticated;

-- 5. Signup trigger: also save county and picks
create or replace function public.handle_new_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  ref text := lower(meta ->> 'referred_by');
  county text := meta ->> 'county_fips';
begin
  if coalesce((meta ->> 'age_confirmed')::boolean, false) is not true then
    raise exception 'Must confirm age 18 or older';
  end if;

  if ref is not null and not exists (select 1 from public.members m where m.referral_code = ref) then
    ref := null;
  end if;

  if county is not null and county !~ '^[0-9]{5}$' then
    county := null;
  end if;

  insert into public.members (id, zip, age_confirmed_at, referred_by, county_fips)
  values (new.id, meta ->> 'zip', now(), ref, county);

  if jsonb_typeof(meta -> 'picks') = 'array' then
    insert into public.member_picks (member_id, item_key)
    select new.id, t.key
    from public.todo_items t
    where t.key in (select jsonb_array_elements_text(meta -> 'picks'))
    on conflict do nothing;
  end if;

  return new;
end;
$$;

-- 6. Public counts (numbers only, never who)
create function public.pledge_total()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)
  from public.members m
  join auth.users u on u.id = m.id
  where u.email_confirmed_at is not null;
$$;

create function public.county_counts()
returns table (county_fips text, pledges bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select m.county_fips, count(*)
  from public.members m
  join auth.users u on u.id = m.id
  where u.email_confirmed_at is not null and m.county_fips is not null
  group by m.county_fips;
$$;

create function public.todo_counts()
returns table (item_key text, picks bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select p.item_key, count(*)
  from public.member_picks p
  join auth.users u on u.id = p.member_id
  where u.email_confirmed_at is not null
  group by p.item_key;
$$;

revoke execute on function public.pledge_total() from public;
revoke execute on function public.county_counts() from public;
revoke execute on function public.todo_counts() from public;
grant execute on function public.pledge_total() to anon, authenticated;
grant execute on function public.county_counts() to anon, authenticated;
grant execute on function public.todo_counts() to anon, authenticated;
