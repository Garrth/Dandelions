-- Personal EI# check: a private self-check on the EI# baseline.
-- Four lines, each scored -100 to +100, and the EI# is their average:
--   living space, home energy, water, getting around.
-- 0 = living within what can be sustained, on renewables. Below 0 = using more than that, or using fossil fuels.
-- Above 0 = giving back (for now only home energy: renewable power sent to the grid beyond your own use).
-- The scores are worked out on the page from what the member types in and saved with the answers.
-- Only the member can read their own answers. County totals come from ei_county, nothing under 10 people.
-- Also rewrites the EI# baseline (version 1, fixed in place since nobody has proposed a change yet).
-- Run once in the Supabase SQL Editor (project dandelions), after 20261128010000_quality_list_trim.sql. Safe to run again.

create table if not exists public.ei_checks (
  member_id uuid primary key default auth.uid() references public.members (id) on delete cascade,
  people smallint not null default 1 check (people between 1 and 12),
  sqft integer check (sqft between 50 and 50000),
  elec_kwh integer check (elec_kwh between 0 and 20000),        -- a month, whole home
  gas_therms integer check (gas_therms between 0 and 2000),      -- a month, whole home (propane and heating oil too)
  power text check (power in ('standard', 'renewable', 'solar')),
  solar_pct smallint check (solar_pct between 0 and 100),         -- share of your power your own solar covers
  export_kwh integer check (export_kwh between 0 and 20000),     -- solar sent to the grid beyond your use, a month
  water_gal integer check (water_gal between 0 and 200000),      -- a month, whole home
  car text check (car in ('none', 'gas', 'ev')),
  car_miles integer check (car_miles between 0 and 20000),       -- a month, yours
  mpg smallint check (mpg between 5 and 150),
  air_miles integer check (air_miles between 0 and 50000),       -- a month, yours (a year's flights divided by 12)
  s_space smallint check (s_space between -100 and 100),
  s_energy smallint check (s_energy between -100 and 100),
  s_water smallint check (s_water between -100 and 100),
  s_travel smallint check (s_travel between -100 and 100),
  s_total smallint check (s_total between -100 and 100),
  updated_at timestamptz not null default now()
);

alter table public.ei_checks enable row level security;

drop policy if exists "Members can read their own EI check" on public.ei_checks;
create policy "Members can read their own EI check"
  on public.ei_checks for select to authenticated
  using ((select auth.uid()) = member_id);

drop policy if exists "Members can add their own EI check" on public.ei_checks;
create policy "Members can add their own EI check"
  on public.ei_checks for insert to authenticated
  with check ((select auth.uid()) = member_id);

drop policy if exists "Members can change their own EI check" on public.ei_checks;
create policy "Members can change their own EI check"
  on public.ei_checks for update to authenticated
  using ((select auth.uid()) = member_id)
  with check ((select auth.uid()) = member_id);

drop policy if exists "Members can remove their own EI check" on public.ei_checks;
create policy "Members can remove their own EI check"
  on public.ei_checks for delete to authenticated
  using ((select auth.uid()) = member_id);

-- This project gives no default table grants, so every table needs these lines.
grant select, insert, update, delete on public.ei_checks to authenticated;
grant all on public.ei_checks to service_role;

-- County totals: the middle (median) score for each line and for the EI#, each once 10 people have one.
create or replace function public.ei_county(p_county text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with q as (
    select e.*
    from public.ei_checks e
    join public.members m on m.id = e.member_id
    where m.county_fips = p_county
  )
  select jsonb_strip_nulls(jsonb_build_object(
    'answered', (select case when count(s_total) >= 10 then count(s_total) end from q),
    'space', (select case when count(s_space) >= 10 then round(percentile_cont(0.5) within group (order by s_space)) end from q),
    'energy', (select case when count(s_energy) >= 10 then round(percentile_cont(0.5) within group (order by s_energy)) end from q),
    'water', (select case when count(s_water) >= 10 then round(percentile_cont(0.5) within group (order by s_water)) end from q),
    'travel', (select case when count(s_travel) >= 10 then round(percentile_cont(0.5) within group (order by s_travel)) end from q),
    'total', (select case when count(s_total) >= 10 then round(percentile_cont(0.5) within group (order by s_total)) end from q)
  ));
$$;

revoke execute on function public.ei_county(text) from public;
grant execute on function public.ei_county(text) to anon, authenticated;

-- ---- EI# baseline: measure against what can be sustained, not carbon ----
do $$
declare
  body_new text := $e$**Baseline: we live on what can be sustained indefinitely.** The personal EI# measures how much you use against what could keep going forever: renewable energy, water that replenishes, and space that fits. It starts simple, with four lines. Waste, food and what you buy come later, since they're harder to measure.

**How it's scored.** Each line gets its own score from -100 to +100, so you can see where you're doing well and where you're not. Your EI# is the average of the four.

- **0** means living within what can be sustained, on renewables. That's the minimum goal.
- **Below 0** means using more than can be sustained, or using fossil fuels. Every extra allowance's worth takes off 10 points, so 10 times the allowance or more is -100.
- **Above 0** means giving back. For now that's renewable power you send to the grid beyond your own use. Sending out as much as your whole allowance is +100.

**The four lines.** Each allowance is per person, so a family of four gets four times as much.

1. **Living space:** 500 square feet a person.
2. **Home energy:** the power to run a very efficient, all-electric 500 square foot space with modest amenities, about 300 kWh a month a person, all from renewables. Gas, propane and oil count fully against you (a therm is about 29 kWh). Power from the grid counts as non-renewable for the part that isn't renewable where you live (California is roughly half renewable; nuclear counts as non-renewable). A 100% renewable plan or your own solar counts as renewable.
3. **Water:** 50 gallons a day a person, a starting stand-in for what local supplies replenish. Later, using more than can be sustained is priced at what it would cost to make that water by desalination with renewable power, about 13 kWh per 1,000 gallons.
4. **Getting around:** about 120 kWh a month a person, which is about 400 miles in an electric car charged on renewables. A gas car uses about 34 kWh per gallon of gas (about 1.35 kWh a mile at 25 mpg), all non-renewable. Flying is about 0.5 kWh per passenger mile, all non-renewable. Walking, biking and staying home are 0, which meets the goal.

**Later:** a fifth line, Giving back, for verified work on checked projects that plant, restore or clean up.

**County EI# and personal EI#:** a county's EI# is the average of the areas in Putting back more than we take. A person's comes from this self-check. Both use the same -100 to +100 scale.

**Private:** only you see your answers. Only county totals are shown, once at least 10 people in the county have done the check. These numbers are a starting point for members to change.$e$;
begin
  update public.baselines set body = body_new, updated_at = now() where key = 'ei' and version = 1 and body <> body_new;
  update public.baseline_versions set body = body_new where baseline_key = 'ei' and version = 1 and body <> body_new;
end $$;
