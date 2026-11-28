-- Quality of life check: a private self-check on the profile page.
--   1. Five questions, each Never (0), Rarely (1), Sometimes (2), Mostly (3) or Always (4).
--      Question 1 can also be "Doesn't apply" (retired, caregiving, in school), saved as -1.
--   2. What the member really pays a month for each part of the living-wage list, and how many people that covers.
-- Only the member can read their own answers. Rai and everyone else only see county totals,
-- and only once at least 10 people in the county have answered (qol_county below).
-- Also updates the wording of the Quality of life baseline (version 1, fixed in place since nobody has proposed
-- a change yet) to include the living-wage list from the charter, and fixes "tons of carbon" in the EI# baseline.
-- Run once in the Supabase SQL Editor (project dandelions), after 20261127010000_work_boxes.sql. Safe to run again.

create table if not exists public.qol_checks (
  member_id uuid primary key default auth.uid() references public.members (id) on delete cascade,
  q_pay smallint check (q_pay between -1 and 4),
  q_like smallint check (q_like between 0 and 4),
  q_body smallint check (q_body between 0 and 4),
  q_mind smallint check (q_mind between 0 and 4),
  q_secure smallint check (q_secure between 0 and 4),
  -- Dollars a month. Empty means not answered.
  c_housing integer check (c_housing between 0 and 50000),
  c_food integer check (c_food between 0 and 20000),
  c_other integer check (c_other between 0 and 20000),
  c_phone integer check (c_phone between 0 and 5000),
  c_transport integer check (c_transport between 0 and 20000),
  c_health integer check (c_health between 0 and 20000),
  c_training integer check (c_training between 0 and 20000),
  c_childcare integer check (c_childcare between 0 and 20000),
  -- How many people the costs above cover, so totals can be per person.
  people smallint not null default 1 check (people between 1 and 12),
  -- Paid days off a year.
  days_off smallint check (days_off between 0 and 365),
  updated_at timestamptz not null default now()
);

alter table public.qol_checks enable row level security;

drop policy if exists "Members can read their own quality check" on public.qol_checks;
create policy "Members can read their own quality check"
  on public.qol_checks for select to authenticated
  using ((select auth.uid()) = member_id);

drop policy if exists "Members can add their own quality check" on public.qol_checks;
create policy "Members can add their own quality check"
  on public.qol_checks for insert to authenticated
  with check ((select auth.uid()) = member_id);

drop policy if exists "Members can change their own quality check" on public.qol_checks;
create policy "Members can change their own quality check"
  on public.qol_checks for update to authenticated
  using ((select auth.uid()) = member_id)
  with check ((select auth.uid()) = member_id);

drop policy if exists "Members can remove their own quality check" on public.qol_checks;
create policy "Members can remove their own quality check"
  on public.qol_checks for delete to authenticated
  using ((select auth.uid()) = member_id);

-- This project gives no default table grants, so every table needs these lines.
grant select, insert, update, delete on public.qol_checks to authenticated;
grant all on public.qol_checks to service_role;

-- County totals for the Baselines page and Rai. Nothing about any one person.
--   answered: how many people did the five questions (empty under 10, and then everything else is empty too).
--   all_met: share of them with all five needs met (Mostly or Always; "doesn't apply" counts as met for question 1).
--   missed: share missing each need, so Rai can point at the one missed most often.
--   costs: the middle (median) monthly cost per person for each item, each only once 10 people gave that item.
--   days_off: the middle number of paid days off a year, once 10 people gave it.
create or replace function public.qol_county(p_county text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with q as (
    select c.*
    from public.qol_checks c
    join public.members m on m.id = c.member_id
    where m.county_fips = p_county
  ), five as (
    select * from q
    where q_pay is not null and q_like is not null and q_body is not null and q_mind is not null and q_secure is not null
  ), n as (select count(*) as n from five)
  select case when (select n from n) < 10 then jsonb_build_object('answered', null) else jsonb_build_object(
    'answered', (select n from n),
    'all_met', (select round(avg(case when (q_pay = -1 or q_pay >= 3) and q_like >= 3 and q_body >= 3 and q_mind >= 3 and q_secure >= 3 then 1 else 0 end)::numeric, 2) from five),
    'missed', jsonb_build_object(
      'pay', (select round(avg(case when q_pay between 0 and 2 then 1 else 0 end)::numeric, 2) from five),
      'like', (select round(avg(case when q_like <= 2 then 1 else 0 end)::numeric, 2) from five),
      'body', (select round(avg(case when q_body <= 2 then 1 else 0 end)::numeric, 2) from five),
      'mind', (select round(avg(case when q_mind <= 2 then 1 else 0 end)::numeric, 2) from five),
      'secure', (select round(avg(case when q_secure <= 2 then 1 else 0 end)::numeric, 2) from five)),
    'costs', jsonb_strip_nulls(jsonb_build_object(
      'housing', (select case when count(c_housing) >= 10 then round(percentile_cont(0.5) within group (order by c_housing::numeric / people)) end from q),
      'food', (select case when count(c_food) >= 10 then round(percentile_cont(0.5) within group (order by c_food::numeric / people)) end from q),
      'other', (select case when count(c_other) >= 10 then round(percentile_cont(0.5) within group (order by c_other::numeric / people)) end from q),
      'phone', (select case when count(c_phone) >= 10 then round(percentile_cont(0.5) within group (order by c_phone::numeric / people)) end from q),
      'transport', (select case when count(c_transport) >= 10 then round(percentile_cont(0.5) within group (order by c_transport::numeric / people)) end from q),
      'health', (select case when count(c_health) >= 10 then round(percentile_cont(0.5) within group (order by c_health::numeric / people)) end from q),
      'training', (select case when count(c_training) >= 10 then round(percentile_cont(0.5) within group (order by c_training::numeric / people)) end from q),
      'childcare', (select case when count(c_childcare) >= 10 then round(percentile_cont(0.5) within group (order by c_childcare::numeric / people)) end from q))),
    'days_off', (select case when count(days_off) >= 10 then round(percentile_cont(0.5) within group (order by days_off)) end from q)
  ) end;
$$;

revoke execute on function public.qol_county(text) from public;
grant execute on function public.qol_county(text) to anon, authenticated;

-- ---- Quality of life baseline: add the living-wage list from the charter ----
-- Nobody has proposed a change yet, so version 1 is corrected in place rather than adding a version.
do $$
declare
  body_new text := $q$**Baseline: everyone's basic needs are met.** Quality of life means many things, and members will keep talking about what it includes. The baseline starts with the basics.

**What a living wage covers.** From the charter. For one person:

- About 400 square feet of living space, scaled up for each person in the household
- Utilities: water, power, heating and cooling
- Food and clothing
- Phone and internet
- Transportation
- Healthcare, including dental, vision and mental health
- Education or paid training
- Childcare for working parents
- Time off to rest

People who can't work, because of age or disability, are covered too. Their contribution is already made, or simply different.

The table below shows what each of these costs here, as Rai found it, next to what members say they really pay. Members' numbers are what people typed in, so take them with a grain of salt.

**The self-check** (private). Each question is answered Never, Rarely, Sometimes, Mostly or Always.

1. My work pays for the basics: housing, food, utilities and getting around.
2. I like my work.
3. I'm healthy, or I'm getting the care I need for my body.
4. I'm getting the care I need for my mind.
5. I feel secure that I can get what I need, even if something goes wrong.

People without a paid job (retired, caregiving, in school) can answer question 1 with Doesn't apply.

**What counts as met:** a need is met at Mostly or Always. Someone meets the baseline when all five needs are met.

**What gets shared:** only county totals, never one person's answers, and only once at least 10 people in the county have answered. For example: "62% of members here have all five needs met. The one missed most often is care for the mind." Rai points projects at the need missed most often.

**Open for discussion:** adding "I have people I can count on."$q$;
begin
  update public.baselines set body = body_new, updated_at = now() where key = 'quality' and version = 1 and body <> body_new;
  update public.baseline_versions set body = body_new where baseline_key = 'quality' and version = 1 and body <> body_new;

  -- EI#: it's carbon dioxide (and other greenhouse gases), not carbon.
  update public.baselines set body = replace(replace(body,
      'about 2 tons of carbon a year', 'about 2 tons of carbon dioxide (and other greenhouse gases) a year'),
      'then into carbon using', 'then into carbon dioxide using')
    where key = 'ei' and version = 1;
  update public.baseline_versions set body = replace(replace(body,
      'about 2 tons of carbon a year', 'about 2 tons of carbon dioxide (and other greenhouse gases) a year'),
      'then into carbon using', 'then into carbon dioxide using')
    where baseline_key = 'ei' and version = 1;
end $$;
