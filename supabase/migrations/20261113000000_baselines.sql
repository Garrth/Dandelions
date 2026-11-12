-- Baselines: the shared starting points Dandelions measures itself against. Members change them together,
-- and they're the first thing the group decides on its own. Rai reads them when it answers questions.
-- Run once in the Supabase SQL Editor (project dandelions), after talk_v2.sql. Safe to run again.
--
-- How a change works (nobody approves anything by hand):
--   1. A member proposes new wording. That also starts a post in the Baselines topic in Talk.
--   2. Support: when the Talk post gets enough +1s, the proposal moves on. One change per baseline at a time.
--   3. Discuss: comments on that Talk post, for a set number of days.
--   4. Vote: ID-checked members vote yes, no or pass. Passes with more yes than no and enough votes.
--   5. Rai writes the final wording from the proposal and the discussion.
--   6. Final check: ID-checked members vote on "does this wording match what we agreed?" More yes than no makes
--      it permanent. If it fails, Rai rewrites it, up to a set number of tries.
--   7. The baseline updates on its own and the old version stays in the history.
-- Time-based steps move forward whenever anyone opens the Baselines page (baseline_tick). No timer needed.

-- ---- The baselines and their history ----
create table if not exists public.baselines (
  key text primary key check (key ~ '^[a-z_]{2,30}$'),
  position integer not null default 0,
  title text not null check (char_length(title) between 3 and 80),
  body text not null check (char_length(body) between 20 and 8000),
  version integer not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists public.baseline_versions (
  id bigint generated always as identity primary key,
  baseline_key text not null references public.baselines (key) on delete cascade,
  version integer not null,
  title text not null,
  body text not null,
  proposal_id uuid,
  made_at timestamptz not null default now(),
  unique (baseline_key, version)
);

-- The numbers the change process uses. Changing these is meant to go through a baseline change too (later).
create table if not exists public.baseline_settings (
  id boolean primary key default true check (id),
  support_needed integer not null default 5,
  discuss_days integer not null default 14,
  vote_days integer not null default 7,
  min_votes integer not null default 25,
  final_days integer not null default 3,
  retry_days integer not null default 30,
  max_rewrites integer not null default 3
);
insert into public.baseline_settings (id) values (true) on conflict (id) do nothing;

-- ---- Proposals and votes ----
create table if not exists public.baseline_proposals (
  id uuid primary key default gen_random_uuid(),
  baseline_key text not null references public.baselines (key) on delete cascade,
  author_id uuid not null default auth.uid() references public.members (id) on delete cascade,
  author_name text not null default 'A member',
  summary text not null check (char_length(summary) between 10 and 300),
  new_body text not null check (char_length(new_body) between 20 and 8000),
  -- support -> discuss -> vote -> writing -> final -> passed. Any step can end in failed.
  status text not null default 'support' check (status in ('support', 'discuss', 'vote', 'writing', 'final', 'passed', 'failed')),
  talk_post_id uuid references public.talk_posts (id) on delete set null,
  created_at timestamptz not null default now(),
  discuss_until timestamptz,
  vote_until timestamptz,
  -- Rai's final wording, the round it's on, and when Rai started writing (so two writers don't overlap).
  final_text text,
  final_round integer not null default 0,
  final_until timestamptz,
  writing_at timestamptz,
  -- Filled in when each vote closes. While a vote is open, only the number of ballots is shown.
  yes integer not null default 0,
  no integer not null default 0,
  pass integer not null default 0,
  final_yes integer not null default 0,
  final_no integer not null default 0,
  final_pass integer not null default 0,
  result_note text not null default '',
  closed_at timestamptz
);
create index if not exists baseline_proposals_status_idx on public.baseline_proposals (baseline_key, status, created_at);
create index if not exists baseline_proposals_author_idx on public.baseline_proposals (author_id, baseline_key);

create table if not exists public.baseline_votes (
  proposal_id uuid not null references public.baseline_proposals (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  -- 'agree' is the main vote. 'final' is the check on Rai's wording; round counts rewrites.
  stage text not null check (stage in ('agree', 'final')),
  round integer not null default 0,
  choice text not null check (choice in ('yes', 'no', 'pass')),
  at timestamptz not null default now(),
  primary key (proposal_id, member_id, stage, round)
);

-- ---- Version 1 ----
insert into public.baselines (key, position, title, body) values
('quality', 1, 'Quality of life', $q$**Baseline: everyone's basic needs are met.** Quality of life means many things, and members will keep talking about what it includes. The baseline starts with the basics.

**The self-check** (private, coming soon). Each question is answered Never, Rarely, Sometimes, Mostly or Always.

1. My work pays for the basics: housing, food, utilities and getting around.
2. I like my work.
3. I'm healthy, or I'm getting the care I need for my body.
4. I'm getting the care I need for my mind.
5. I feel secure that I can get what I need, even if something goes wrong.

**What counts as met:** a need is met at Mostly or Always. Someone meets the baseline when all five needs are met.

**What gets shared:** only county totals, never one person's answers. For example: "62% of members here have all five needs met. The one missed most often is care for the mind." Rai points projects at the need missed most often.

**Open for discussion:** adding "I have people I can count on", and whether people without a paid job (retired, caregiving, in school) should answer question 1 about whatever covers their basics.$q$),
('putting_back', 2, 'Putting back more than we take', $p$**Baseline: in every area below, we use things no faster than nature can replace them, and then give back more.**

**How the scoring works.** Every line, every area and the county's overall EI# use the same scale, from -100 to +100.

- **0** is the safe level: using it as fast as nature replaces it, or, for a share, the share needed to be sustainable. Each safe level comes from published science.
- **+100** means twice the safe level or worse.
- **Below 0** means it's getting better each year. **-100** is the fastest recovery the science says is realistic.

An area's score is the **average of its lines**. The county EI# is the **average of its areas**. Because everything is an average, lines and areas can be added or dropped without changing the scale, and an area with many lines doesn't outweigh one with few.

| Area | Lines (each scored -100 to +100) | Where the numbers come from |
|---|---|---|
| 1. Energy | Fossil fuel use · Renewable share · Energy used per person (total county use divided by population, including getting around) | Federal energy data, local utility |
| 2. Farmland | Share farmed sustainably · Share organic · Share farmed unsustainably · Land losing soil to erosion · Toxic runoff · Farmable land sitting unused | USDA farm census and soil data, state water board |
| 3. Fresh water | Gallons used per person per day · Groundwater rising or falling | Local water district, USGS |
| 4. Lakes, rivers and ocean | Share of local waters meeting clean-water standards · Beach closures · Trash and plastic | EPA and state water board lists |
| 5. Fish and ocean life | Share of local fish stocks not overfished | NOAA fish stock reports |
| 6. Forests and wild land | Tree cover gained or lost · Acres protected | Forest Service, satellite tree cover maps |
| 7. Waste and stuff | Pounds sent to the landfill per person · Share reused, repaired, recycled or composted | State recycling agency |
| 8. Wildlife | Local species at risk · Habitat restored | State wildlife agency, citizen science counts |
| 9. Food | Food wasted · Share grown nearby | USDA, county farm reports |

**Example:** if Energy's three lines score +60, -10 and +40, Energy scores +30. If the nine areas average +18, the county's EI# is +18.

**For projects:** each project says which lines it helps and by how much, in plain units like trees planted, pounds of trash picked up or kilowatt-hours saved. Checkers confirm it happened, and Rai shows how much it moves those lines.$p$),
('ei', 3, 'EI# (Environmental Impact Number)', $e$**Baseline: your personal footprint fits within a fair share.** The personal EI# measures what you use, starting with energy in all its forms, because that's the easiest thing to measure.

**The self-check** (private, coming soon):

- **Home:** square feet, how many people live there, your ZIP (we look up how hot and cold your climate is), your heating fuel, your monthly electric and gas use (or bills), and any solar or green power.
- **Getting around:** miles to work and days a week, how you get there (car and its mpg, electric car, transit, bike, walk, or work from home), other driving each week, and flights per year.
- **Garbage:** how many bags you put out each week, and whether you recycle and compost.
- **Later:** what you buy and what you eat. These are harder to estimate, so they wait.

**How it becomes a number:** your answers turn into energy used per day, then into carbon using your area's power mix.

- **0** is a fair share: about 2 tons of carbon a year, a common target for meeting climate goals. A typical American is around 15 tons.
- **+100** is 10 times a fair share (20 tons) or more. Scores in between are a straight line.
- **Below 0** comes from verified giving back: solar you send to the grid, and work on checked projects that plant, restore or clean up. Shown as "gives back X".

**County EI# and personal EI#:** a county's EI# is the average of the areas in Putting back more than we take. A person's comes from this self-check. Both use the same -100 to +100 scale and the same meaning for 0.

**For now:** the EI# is a concept, not live, and nothing about points depends on it. These numbers are a starting point for members to change.$e$)
on conflict (key) do nothing;

insert into public.baseline_versions (baseline_key, version, title, body)
  select key, version, title, body from public.baselines
  on conflict (baseline_key, version) do nothing;

-- ---- One pinned Baselines topic in Talk, in place of the two starter topics ----
insert into public.talk_topics (room, name, about, pinned, made_by) values
  ('any', 'Baselines', 'Quality of life, putting back more than we take, and the EI#. Propose changes on the Baselines page; each one gets a post here for discussion.', true, 'starter')
on conflict (room, lower(name)) do nothing;

do $$
declare
  bt uuid := (select id from public.talk_topics where room = 'any' and lower(name) = 'baselines');
  moved integer;
begin
  update public.talk_posts set topic_id = bt
    where topic_id in (select id from public.talk_topics where made_by = 'starter' and room = 'any' and id <> bt);
  get diagnostics moved = row_count;
  update public.talk_topics set archived = true, pinned = false, posts = 0
    where made_by = 'starter' and room = 'any' and id <> bt and not archived;
  update public.talk_topics set posts = (select count(*) from public.talk_posts where topic_id = bt and parent_id is null),
    last_post_at = coalesce((select max(created_at) from public.talk_posts where topic_id = bt), last_post_at)
    where id = bt;
end $$;

-- ---- Propose a change ----
create or replace function public.baseline_propose(p_key text, p_summary text, p_body text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  b public.baselines;
  s public.baseline_settings := (select x from public.baseline_settings x limit 1);
  bt uuid := (select id from public.talk_topics where room = 'any' and lower(name) = 'baselines' and not archived);
  pid uuid;
  post uuid;
  nm text;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  select * into b from public.baselines where key = p_key;
  if b.key is null then raise exception 'baseline_none'; end if;
  p_summary := trim(coalesce(p_summary, '')); p_body := trim(coalesce(p_body, ''));
  if char_length(p_summary) < 10 then raise exception 'baseline_summary'; end if;
  if char_length(p_body) < 20 or char_length(p_body) > 8000 then raise exception 'baseline_body'; end if;
  if p_body = b.body then raise exception 'baseline_same'; end if;
  if exists (select 1 from public.baseline_proposals where author_id = uid and baseline_key = p_key and status not in ('passed', 'failed')) then
    raise exception 'baseline_open';
  end if;
  if exists (select 1 from public.baseline_proposals where author_id = uid and baseline_key = p_key and status = 'failed'
             and closed_at > now() - make_interval(days => s.retry_days)) then
    raise exception 'baseline_wait';
  end if;
  if (select count(*) from public.baseline_proposals where author_id = uid and created_at > now() - interval '1 day') >= 3 then
    raise exception 'baseline_limit';
  end if;
  if not exists (select 1 from public.talk_agreements where member_id = uid) then raise exception 'talk_rules'; end if;
  if bt is null then raise exception 'talk_no_topic'; end if;
  nm := split_part(trim(coalesce((select display_name from public.profiles where id = uid), '')), ' ', 1);
  insert into public.baseline_proposals (baseline_key, author_id, author_name, summary, new_body)
    values (p_key, uid, coalesce(nullif(left(nm, 60), ''), 'A member'), left(p_summary, 300), p_body)
    returning id into pid;
  -- The discussion lives in Talk. +1s on this post are the support that sends it to a vote.
  insert into public.talk_posts (room, kind, author_id, title, body, topic_id)
    values ('us', 'post', uid, left('Proposed change: ' || b.title, 120),
      left(p_summary, 300) || E'\n\nGive it a +1 if you think it should go to a vote. ' || s.support_needed ||
      E' +1s starts a ' || s.discuss_days || E'-day discussion here, then a vote.\n\nSee the new wording next to the old: /app/baselines.html?p=' || pid,
      bt)
    returning id into post;
  update public.baseline_proposals set talk_post_id = post where id = pid;
  return pid;
end;
$$;
revoke all on function public.baseline_propose(text, text, text) from public;
grant execute on function public.baseline_propose(text, text, text) to authenticated;

-- ---- Vote (ID-checked members only). You can change your vote until it closes. ----
create or replace function public.baseline_vote(p_proposal uuid, p_choice text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  p public.baseline_proposals;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  if not public.is_verified() then raise exception 'id_check_needed'; end if;
  if p_choice not in ('yes', 'no', 'pass') then raise exception 'baseline_choice'; end if;
  select * into p from public.baseline_proposals where id = p_proposal;
  if p.status = 'vote' and p.vote_until > now() then
    insert into public.baseline_votes (proposal_id, member_id, stage, round, choice) values (p.id, uid, 'agree', 0, p_choice)
      on conflict (proposal_id, member_id, stage, round) do update set choice = excluded.choice, at = now();
  elsif p.status = 'final' and p.final_until > now() then
    insert into public.baseline_votes (proposal_id, member_id, stage, round, choice) values (p.id, uid, 'final', p.final_round, p_choice)
      on conflict (proposal_id, member_id, stage, round) do update set choice = excluded.choice, at = now();
  else
    raise exception 'baseline_not_voting';
  end if;
end;
$$;
revoke all on function public.baseline_vote(uuid, text) from public;
grant execute on function public.baseline_vote(uuid, text) to authenticated;

-- ---- Move proposals forward on time. Anyone's page load calls this; it only follows the rules above. ----
create or replace function public.baseline_tick()
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  s public.baseline_settings := (select x from public.baseline_settings x limit 1);
  p public.baseline_proposals;
  y integer; n integer; ps integer;
  nv integer;
begin
  perform pg_advisory_xact_lock(hashtext('baseline_tick'));

  -- A proposal whose Talk post was deleted by its author, or hidden by flags, stops.
  update public.baseline_proposals bp set status = 'failed', closed_at = now(), result_note = 'Withdrawn or removed from Talk'
    where bp.status in ('support', 'discuss')
      and not exists (select 1 from public.talk_posts tp where tp.id = bp.talk_post_id and not tp.deleted and not tp.hidden);

  -- Discussion over: open the vote.
  update public.baseline_proposals set status = 'vote', vote_until = now() + make_interval(days => s.vote_days)
    where status = 'discuss' and discuss_until <= now();

  -- Vote over: count it.
  for p in select * from public.baseline_proposals where status = 'vote' and vote_until <= now() for update loop
    select count(*) filter (where choice = 'yes'), count(*) filter (where choice = 'no'), count(*) filter (where choice = 'pass')
      into y, n, ps from public.baseline_votes where proposal_id = p.id and stage = 'agree';
    if y > n and y + n + ps >= s.min_votes then
      update public.baseline_proposals set status = 'writing', writing_at = null, yes = y, no = n, pass = ps where id = p.id;
    else
      update public.baseline_proposals set status = 'failed', closed_at = now(), yes = y, no = n, pass = ps,
        result_note = case when y + n + ps < s.min_votes then 'Fewer than ' || s.min_votes || ' votes' else 'Not more yes than no' end
        where id = p.id;
    end if;
  end loop;

  -- Final check over: make it permanent, or send it back to Rai.
  for p in select * from public.baseline_proposals where status = 'final' and final_until <= now() for update loop
    select count(*) filter (where choice = 'yes'), count(*) filter (where choice = 'no'), count(*) filter (where choice = 'pass')
      into y, n, ps from public.baseline_votes where proposal_id = p.id and stage = 'final' and round = p.final_round;
    if y > n then
      update public.baselines set body = p.final_text, version = version + 1, updated_at = now()
        where key = p.baseline_key returning version into nv;
      insert into public.baseline_versions (baseline_key, version, title, body, proposal_id)
        select key, version, title, body, p.id from public.baselines where key = p.baseline_key;
      update public.baseline_proposals set status = 'passed', closed_at = now(), final_yes = y, final_no = n, final_pass = ps,
        result_note = 'Now version ' || nv where id = p.id;
    elsif p.final_round >= s.max_rewrites then
      update public.baseline_proposals set status = 'failed', closed_at = now(), final_yes = y, final_no = n, final_pass = ps,
        result_note = 'The final wording wasn''t accepted after ' || s.max_rewrites || ' tries' where id = p.id;
    else
      update public.baseline_proposals set status = 'writing', writing_at = null, final_yes = y, final_no = n, final_pass = ps where id = p.id;
    end if;
  end loop;

  -- Support reached: start the discussion, one change per baseline at a time, oldest first.
  for p in
    select distinct on (bp.baseline_key) bp.* from public.baseline_proposals bp
      join public.talk_posts tp on tp.id = bp.talk_post_id
      where bp.status = 'support' and tp.backers >= s.support_needed
        and not exists (select 1 from public.baseline_proposals o where o.baseline_key = bp.baseline_key and o.status in ('discuss', 'vote', 'writing', 'final'))
      order by bp.baseline_key, bp.created_at
  loop
    update public.baseline_proposals set status = 'discuss', discuss_until = now() + make_interval(days => s.discuss_days) where id = p.id;
  end loop;
end;
$$;
revoke all on function public.baseline_tick() from public;
grant execute on function public.baseline_tick() to anon, authenticated, service_role;

-- ---- Everything the Baselines page shows, in one call. Never shows who voted or how. ----
create or replace function public.baseline_board()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'settings', (select to_jsonb(x) - 'id' from public.baseline_settings x limit 1),
    'me', jsonb_build_object('signed_in', (select auth.uid()) is not null, 'verified', public.is_verified()),
    'baselines', coalesce((select jsonb_agg(jsonb_build_object(
        'key', b.key, 'title', b.title, 'body', b.body, 'version', b.version, 'updated_at', b.updated_at,
        'versions', coalesce((select jsonb_agg(jsonb_build_object('version', v.version, 'body', v.body, 'made_at', v.made_at, 'proposal_id', v.proposal_id) order by v.version desc)
                     from public.baseline_versions v where v.baseline_key = b.key and v.version < b.version), '[]'::jsonb)
      ) order by b.position) from public.baselines b), '[]'::jsonb),
    'proposals', coalesce((select jsonb_agg(jsonb_build_object(
        'id', p.id, 'baseline_key', p.baseline_key, 'author_name', p.author_name, 'summary', p.summary, 'new_body', p.new_body,
        'status', p.status, 'talk_post_id', p.talk_post_id, 'created_at', p.created_at,
        'support', coalesce(tp.backers, 0), 'comments', coalesce(tp.replies, 0),
        'discuss_until', p.discuss_until, 'vote_until', p.vote_until, 'final_text', p.final_text, 'final_round', p.final_round,
        'final_until', p.final_until, 'result_note', p.result_note, 'closed_at', p.closed_at,
        'yes', p.yes, 'no', p.no, 'pass', p.pass, 'final_yes', p.final_yes, 'final_no', p.final_no, 'final_pass', p.final_pass,
        'ballots', case p.status
          when 'vote' then (select count(*) from public.baseline_votes v where v.proposal_id = p.id and v.stage = 'agree')
          when 'final' then (select count(*) from public.baseline_votes v where v.proposal_id = p.id and v.stage = 'final' and v.round = p.final_round)
          else 0 end,
        'mine', p.author_id = (select auth.uid()),
        'my_plus', exists (select 1 from public.talk_backs k where k.post_id = p.talk_post_id and k.member_id = (select auth.uid())),
        'my_vote', (select v.choice from public.baseline_votes v where v.proposal_id = p.id and v.member_id = (select auth.uid())
                    and ((p.status = 'vote' and v.stage = 'agree') or (p.status = 'final' and v.stage = 'final' and v.round = p.final_round)))
      ) order by p.created_at desc)
      from (select * from public.baseline_proposals
            where status not in ('passed', 'failed') or closed_at > now() - interval '1 year'
            order by created_at desc limit 100) p
      left join public.talk_posts tp on tp.id = p.talk_post_id), '[]'::jsonb)
  );
$$;
revoke all on function public.baseline_board() from public;
grant execute on function public.baseline_board() to anon, authenticated;

-- ---- For Rai (server only): take the proposals waiting for final wording, and save what Rai wrote ----
create or replace function public.baseline_claim_writing()
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  out jsonb := '[]'::jsonb;
  p public.baseline_proposals;
begin
  for p in select * from public.baseline_proposals
           where status = 'writing' and (writing_at is null or writing_at < now() - interval '15 minutes')
           order by created_at limit 2 for update skip locked loop
    update public.baseline_proposals set writing_at = now() where id = p.id;
    out := out || jsonb_build_object(
      'id', p.id, 'summary', p.summary, 'proposed', p.new_body, 'round', p.final_round, 'last_final', p.final_text,
      'title', (select title from public.baselines where key = p.baseline_key),
      'current', (select body from public.baselines where key = p.baseline_key),
      'votes', jsonb_build_object('yes', p.yes, 'no', p.no, 'pass', p.pass),
      -- Comments only, no names.
      'comments', coalesce((select jsonb_agg(c.body order by c.created_at) from (
          select body, created_at from public.talk_posts
          where parent_id = p.talk_post_id and not deleted and not hidden order by created_at limit 200) c), '[]'::jsonb));
  end loop;
  return out;
end;
$$;
revoke all on function public.baseline_claim_writing() from public, anon, authenticated;
grant execute on function public.baseline_claim_writing() to service_role;

create or replace function public.baseline_save_final(p_id uuid, p_text text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  s public.baseline_settings := (select x from public.baseline_settings x limit 1);
begin
  p_text := trim(coalesce(p_text, ''));
  if char_length(p_text) < 20 or char_length(p_text) > 8000 then raise exception 'baseline_body'; end if;
  update public.baseline_proposals
    set status = 'final', final_text = p_text, final_round = final_round + 1, writing_at = null,
        final_until = now() + make_interval(days => s.final_days)
    where id = p_id and status = 'writing';
end;
$$;
revoke all on function public.baseline_save_final(uuid, text) from public, anon, authenticated;
grant execute on function public.baseline_save_final(uuid, text) to service_role;

-- ---- Who can do what ----
alter table public.baselines enable row level security;
alter table public.baseline_versions enable row level security;
alter table public.baseline_settings enable row level security;
alter table public.baseline_proposals enable row level security;
alter table public.baseline_votes enable row level security;
drop policy if exists "Anyone can read baselines" on public.baselines;
create policy "Anyone can read baselines" on public.baselines for select to anon, authenticated using (true);
drop policy if exists "Anyone can read baseline history" on public.baseline_versions;
create policy "Anyone can read baseline history" on public.baseline_versions for select to anon, authenticated using (true);
drop policy if exists "Anyone can read baseline settings" on public.baseline_settings;
create policy "Anyone can read baseline settings" on public.baseline_settings for select to anon, authenticated using (true);
drop policy if exists "Members see their own baseline votes" on public.baseline_votes;
create policy "Members see their own baseline votes" on public.baseline_votes for select to authenticated using (member_id = (select auth.uid()));
-- Proposals are read through baseline_board(), which leaves out who wrote them beyond their first name.

revoke all on public.baselines, public.baseline_versions, public.baseline_settings, public.baseline_proposals, public.baseline_votes from anon, authenticated;
grant select on public.baselines, public.baseline_versions, public.baseline_settings to anon, authenticated;
grant select on public.baseline_votes to authenticated;
grant select, insert, update, delete on public.baselines, public.baseline_versions, public.baseline_settings, public.baseline_proposals, public.baseline_votes to service_role;
