-- Talk, part 4: Rai reads Talk for you.
--   * Summary: every topic gets a summary with the main points, which way people lean, open questions and
--     what's missing. Each point links back to the posts behind it. Anyone can say "This summary is off".
--   * Catching on: Rai groups General posts that are about the same idea and counts the different people
--     who keep coming back to it. At the bar, the idea gets its own topic on its own. Nobody approves it.
--   * Also: the EI# score direction flips (positive now means using less than your share), and two new
--     conversation topics open for everyone.
-- Run once in the Supabase SQL Editor (project dandelions), after daily_deals.sql. Safe to run again.
-- The Rai function does the reading. Only it can write summaries and ideas (it uses the service role).

-- ---- Summaries ----
create table if not exists public.talk_summaries (
  topic_id uuid primary key references public.talk_topics (id) on delete cascade,
  -- {"lean": "...", "points": [{"text": "...", "posts": ["post id", ...]}], "questions": [...], "missing": [...]}
  body jsonb not null default '{}'::jsonb,
  -- How many posts and comments the topic had when Rai wrote it, and how many people.
  messages integer not null default 0,
  people integer not null default 0,
  made_at timestamptz not null default now(),
  flags integer not null default 0,
  -- While Rai is writing a new one, so two visitors don't start it twice.
  locked_until timestamptz not null default '-infinity'
);

create table if not exists public.talk_summary_flags (
  topic_id uuid not null references public.talk_topics (id) on delete cascade,
  member_id uuid not null default auth.uid() references public.members (id) on delete cascade,
  note text not null default '' check (char_length(note) <= 300),
  at timestamptz not null default now(),
  primary key (topic_id, member_id)
);

-- Posts and comments that count toward a topic: not deleted or hidden. Topics for every place ('any') count
-- posts from every place; a county or state topic only has posts from there anyway.
create or replace function public.talk_topic_counts(p_topic uuid)
returns table (messages integer, people integer, newest timestamptz)
language sql stable security definer set search_path = ''
as $$
  select count(*)::int, count(distinct author_id)::int, max(created_at)
  from public.talk_posts where topic_id = p_topic and not deleted and not hidden;
$$;
revoke all on function public.talk_topic_counts(uuid) from public, anon, authenticated;
grant execute on function public.talk_topic_counts(uuid) to service_role;

-- Is a new summary due? First one at 3 messages. Then after 10 new ones, or once a day if anything is new.
-- Returns true and locks the topic for 3 minutes if Rai should write one now.
create or replace function public.talk_summary_claim(p_topic uuid)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  c record;
  s public.talk_summaries;
begin
  select * into c from public.talk_topic_counts(p_topic);
  if c.messages < 3 then return false; end if;
  insert into public.talk_summaries (topic_id, messages, made_at) values (p_topic, 0, '-infinity') on conflict (topic_id) do nothing;
  update public.talk_summaries set locked_until = now() + interval '3 minutes'
    where topic_id = p_topic and locked_until < now()
      and (messages = 0 or c.messages - messages >= 10 or (c.messages <> messages and made_at < now() - interval '1 day'))
    returning * into s;
  return s.topic_id is not null;
end;
$$;
revoke all on function public.talk_summary_claim(uuid) from public, anon, authenticated;
grant execute on function public.talk_summary_claim(uuid) to service_role;

create or replace function public.talk_summary_save(p_topic uuid, p_body jsonb, p_messages integer, p_people integer)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  update public.talk_summaries set body = p_body, messages = p_messages, people = p_people, made_at = now(),
    flags = 0, locked_until = '-infinity' where topic_id = p_topic;
  delete from public.talk_summary_flags where topic_id = p_topic;
end;
$$;
revoke all on function public.talk_summary_save(uuid, jsonb, integer, integer) from public, anon, authenticated;
grant execute on function public.talk_summary_save(uuid, jsonb, integer, integer) to service_role;

-- If writing failed, let the next visitor try again.
create or replace function public.talk_summary_release(p_topic uuid)
returns void
language sql security definer set search_path = ''
as $$ update public.talk_summaries set locked_until = '-infinity' where topic_id = p_topic; $$;
revoke all on function public.talk_summary_release(uuid) from public, anon, authenticated;
grant execute on function public.talk_summary_release(uuid) to service_role;

-- "This summary is off": one per member per summary. Rai reads the notes next time. 3 shows a warning.
create or replace function public.talk_summary_flag(p_topic uuid, p_note text)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  n integer;
begin
  if (select auth.uid()) is null then raise exception 'not_signed_in'; end if;
  if not exists (select 1 from public.talk_summaries where topic_id = p_topic and messages > 0) then raise exception 'talk_no_summary'; end if;
  insert into public.talk_summary_flags (topic_id, member_id, note) values (p_topic, (select auth.uid()), left(trim(coalesce(p_note, '')), 300))
    on conflict (topic_id, member_id) do update set note = excluded.note, at = now();
  select count(*) into n from public.talk_summary_flags where topic_id = p_topic;
  update public.talk_summaries set flags = n where topic_id = p_topic;
  return n;
end;
$$;
revoke all on function public.talk_summary_flag(uuid, text) from public;
grant execute on function public.talk_summary_flag(uuid, text) to authenticated;

-- ---- Catching on ----
-- "Not about this": the author takes their post out of the idea Rai put it in, and Rai leaves it alone after that.
alter table public.talk_posts add column if not exists no_idea boolean not null default false;

create table if not exists public.talk_ideas (
  id uuid primary key default gen_random_uuid(),
  room text not null check (room ~ '^(us|st-[A-Z]{2}|co-[0-9]{5})$'),
  name text not null check (char_length(name) between 3 and 60),
  about text not null default '' check (char_length(about) <= 300),
  -- General posts and comments Rai put in this idea.
  post_ids uuid[] not null default '{}',
  -- Set when the idea got its own topic.
  topic_id uuid references public.talk_topics (id) on delete set null,
  promoted_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists talk_ideas_room_idx on public.talk_ideas (room, updated_at desc);

-- When Rai last grouped each place, and the newest General message it had seen.
create table if not exists public.talk_idea_runs (
  room text primary key,
  ran_at timestamptz not null default '-infinity',
  seen_upto timestamptz not null default '-infinity'
);

-- The bar for each kind of place: different people, and on how many different days.
create or replace function public.talk_idea_bar(p_room text)
returns table (people integer, days integer)
language sql immutable set search_path = ''
as $$
  select case when p_room = 'us' then 25 when p_room like 'st-%' then 10 else 5 end,
         case when p_room = 'us' then 3 else 2 end;
$$;

-- Who counts toward an idea in the last 14 days: people who wrote one of its posts or comments, commented on
-- one of its posts, or gave one a +1. Each person counts once. Days = different days anyone joined in.
create or replace function public.talk_idea_count(p_ids uuid[])
returns table (people integer, days integer)
language sql stable security definer set search_path = ''
as $$
  with acts as (
    select author_id as who, created_at as at from public.talk_posts
      where (id = any (p_ids) or parent_id = any (p_ids)) and not deleted and not hidden and not no_idea
    union all
    select b.member_id, b.at from public.talk_backs b where b.post_id = any (p_ids)
  )
  select count(distinct who)::int, count(distinct (at at time zone 'America/Los_Angeles')::date)::int
  from acts where at > now() - interval '14 days';
$$;
revoke all on function public.talk_idea_count(uuid[]) from public, anon, authenticated;

-- Should Rai group this place's General now? At most every 15 minutes, and only when there's something new.
create or replace function public.talk_ideas_claim(p_room text)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  newest timestamptz;
  r text;
begin
  if p_room !~ '^(us|st-[A-Z]{2}|co-[0-9]{5})$' then return false; end if;
  select max(created_at) into newest from public.talk_posts
    where room = p_room and topic_id is null and not deleted and not hidden and created_at > now() - interval '14 days';
  if newest is null then return false; end if;
  insert into public.talk_idea_runs (room) values (p_room) on conflict (room) do nothing;
  update public.talk_idea_runs set ran_at = now(), seen_upto = newest
    where room = p_room and ran_at < now() - interval '15 minutes' and seen_upto < newest
    returning room into r;
  return r is not null;
end;
$$;
revoke all on function public.talk_ideas_claim(text) from public, anon, authenticated;
grant execute on function public.talk_ideas_claim(text) to service_role;

-- Rai's grouping for one place replaces the last one. Then any idea over the bar gets its own topic:
-- the posts move there, and the person who started it can rename it for a day. Logged like a moderator action.
-- p_ideas: [{"name": "...", "about": "...", "ids": ["post id", ...]}]
create or replace function public.talk_ideas_save(p_room text, p_ideas jsonb)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  x jsonb;
  ids uuid[];
  nm text;
  idea uuid;
  bar record;
  cnt record;
  tid uuid;
  starter uuid;
  made integer := 0;
begin
  if p_room !~ '^(us|st-[A-Z]{2}|co-[0-9]{5})$' then raise exception 'talk_no_place'; end if;
  delete from public.talk_ideas where room = p_room and topic_id is null;
  select * into bar from public.talk_idea_bar(p_room);
  for x in select * from jsonb_array_elements(coalesce(p_ideas, '[]'::jsonb)) loop
    nm := left(trim(coalesce(x->>'name', '')), 60);
    if char_length(nm) < 3 then continue; end if;
    -- Only real General posts and comments from this place that their authors haven't taken out.
    select coalesce(array_agg(p.id), '{}') into ids from public.talk_posts p
      where p.id in (select (v #>> '{}')::uuid from jsonb_array_elements(coalesce(x->'ids', '[]'::jsonb)) v where (v #>> '{}') ~ '^[0-9a-f-]{36}$')
        and p.room = p_room and p.topic_id is null and not p.deleted and not p.hidden and not p.no_idea;
    if cardinality(ids) = 0 then continue; end if;
    insert into public.talk_ideas (room, name, about, post_ids) values (p_room, nm, left(trim(coalesce(x->>'about', '')), 300), ids)
      returning id into idea;
    select * into cnt from public.talk_idea_count(ids);
    if cnt.people >= bar.people and cnt.days >= bar.days then
      -- A topic with the same name here already? Then the posts join it.
      select id into tid from public.talk_topics where room in (p_room, 'any') and lower(name) = lower(nm) and not archived limit 1;
      select author_id into starter from public.talk_posts where id = any (ids) order by created_at limit 1;
      if tid is null then
        insert into public.talk_topics (room, name, about, made_by, created_by)
          values (p_room, nm, left(trim(coalesce(x->>'about', '')), 300), 'traction', starter)
          on conflict (room, lower(name)) do nothing
          returning id into tid;
        if tid is null then select id into tid from public.talk_topics where room = p_room and lower(name) = lower(nm); end if;
      end if;
      -- Move the posts in the idea, with all their comments. Comments in the idea come along with their post.
      update public.talk_posts set topic_id = tid
        where room = p_room and topic_id is null and (
          id = any (ids) or parent_id = any (ids)
          or id in (select parent_id from public.talk_posts where id = any (ids) and parent_id is not null)
          or parent_id in (select parent_id from public.talk_posts where id = any (ids) and parent_id is not null));
      update public.talk_topics t set posts = (select count(*) from public.talk_posts p where p.topic_id = t.id and p.parent_id is null and not p.deleted),
        last_post_at = greatest(t.last_post_at, coalesce((select max(created_at) from public.talk_posts p where p.topic_id = t.id), t.last_post_at))
        where t.id = tid;
      update public.talk_ideas set topic_id = tid, promoted_at = now() where id = idea;
      insert into public.talk_mod_log (mod_id, action, topic_id, note)
        values (null, 'traction_topic', tid, left(nm || ': ' || cnt.people || ' people over ' || cnt.days || ' days', 300));
      made := made + 1;
    end if;
  end loop;
  -- Ideas that got a topic stay listed for 7 days so people can find where the talk went.
  delete from public.talk_ideas where room = p_room and topic_id is not null and promoted_at < now() - interval '7 days';
  return made;
end;
$$;
revoke all on function public.talk_ideas_save(text, jsonb) from public, anon, authenticated;
grant execute on function public.talk_ideas_save(text, jsonb) to service_role;

-- The Catching on list for a place, with live counts. Anyone can read it.
create or replace function public.talk_catching_on(p_room text)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(row order by (row->>'promoted') desc nulls last, (row->>'people')::int desc), '[]'::jsonb) from (
    select jsonb_build_object(
      'id', i.id, 'name', i.name, 'about', i.about, 'posts', i.post_ids,
      'people', c.people, 'days', c.days, 'need_people', b.people, 'need_days', b.days,
      'topic_id', i.topic_id, 'promoted', i.promoted_at) as row
    from public.talk_ideas i
    cross join lateral public.talk_idea_count(i.post_ids) c
    cross join lateral public.talk_idea_bar(i.room) b
    where i.room = p_room and (i.topic_id is not null or c.people >= 2)
    limit 20
  ) q;
$$;
revoke all on function public.talk_catching_on(text) from public;
grant execute on function public.talk_catching_on(text) to anon, authenticated;

-- "Not about this": only the post's author.
create or replace function public.talk_idea_skip(p_post uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  update public.talk_posts set no_idea = true where id = p_post and author_id = (select auth.uid());
  if not found then raise exception 'not_yours'; end if;
  update public.talk_ideas set post_ids = array_remove(post_ids, p_post) where p_post = any (post_ids) and topic_id is null;
  delete from public.talk_ideas where cardinality(post_ids) = 0;
end;
$$;
revoke all on function public.talk_idea_skip(uuid) from public;
grant execute on function public.talk_idea_skip(uuid) to authenticated;

-- The person whose post started a topic that opened on its own can rename it during its first day.
create or replace function public.talk_topic_rename(p_topic uuid, p_name text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  p_name := left(trim(coalesce(p_name, '')), 60);
  if char_length(p_name) < 3 then raise exception 'talk_name'; end if;
  update public.talk_topics set name = p_name
    where id = p_topic and made_by = 'traction' and created_by = (select auth.uid()) and created_at > now() - interval '1 day';
  if not found then raise exception 'not_yours'; end if;
  insert into public.talk_mod_log (mod_id, action, topic_id, note) values ((select auth.uid()), 'topic_rename_own', p_topic, p_name);
end;
$$;
revoke all on function public.talk_topic_rename(uuid, text) from public;
grant execute on function public.talk_topic_rename(uuid, text) to authenticated;

-- ---- Who can read what ----
alter table public.talk_summaries enable row level security;
drop policy if exists "Anyone can read summaries" on public.talk_summaries;
create policy "Anyone can read summaries" on public.talk_summaries for select to anon, authenticated using (messages > 0);
alter table public.talk_summary_flags enable row level security;
drop policy if exists "Members see their own summary flags" on public.talk_summary_flags;
create policy "Members see their own summary flags" on public.talk_summary_flags for select to authenticated using (member_id = (select auth.uid()));
alter table public.talk_ideas enable row level security;
alter table public.talk_idea_runs enable row level security;

revoke all on public.talk_summaries, public.talk_summary_flags, public.talk_ideas, public.talk_idea_runs from anon, authenticated;
grant select (topic_id, body, messages, people, made_at, flags) on public.talk_summaries to anon, authenticated;
grant select on public.talk_summary_flags to authenticated;
grant select, insert, update, delete on public.talk_summaries, public.talk_summary_flags, public.talk_ideas, public.talk_idea_runs to service_role;
grant select (no_idea) on public.talk_posts to anon, authenticated;

-- ---- Two new conversations for everyone ----
insert into public.talk_topics (room, name, about, pinned, made_by) values
  ('any', 'Automation and work', 'What does more automation and AI look like where you live and work? What should we do about it, and where does Dandelions fit in?', true, 'starter'),
  ('any', 'Making what America needs', 'What would it take to make the things America needs here at home again? What could your county make?', true, 'starter')
on conflict (room, lower(name)) do nothing;

-- ---- EI#: positive now means you're using less than your share, like money in the bank ----
-- Nobody has used the scores yet, so version 1 is corrected in place rather than adding a version.
do $$
declare
  k text;
begin
  update public.baselines set body = replace(replace(replace(body,
$o$- **0** is the safe level: using it as fast as nature replaces it, or, for a share, the share needed to be sustainable. Each safe level comes from published science.
- **+100** means twice the safe level or worse.
- **Below 0** means it's getting better each year. **-100** is the fastest recovery the science says is realistic.$o$,
$n$Think of it like a bank balance with the planet.

- **0** is break-even, the safe level: using it as fast as nature replaces it, or, for a share, the share needed to be sustainable. Each safe level comes from published science.
- **Above 0** means we're putting some back: using less than nature replaces, or getting better each year. **+100** is the fastest recovery the science says is realistic.
- **Below 0** means living beyond our means. **-100** means twice the safe level or worse.$n$),
$o$**Example:** if Energy's three lines score +60, -10 and +40, Energy scores +30. If the nine areas average +18, the county's EI# is +18.$o$,
$n$**Example:** if Energy's three lines score -60, +10 and -40, Energy scores -30. If the nine areas average -18, the county's EI# is -18, so the county is living beyond its means.$n$),
$o$- **0** is a fair share: about 2 tons of carbon a year, a common target for meeting climate goals. A typical American is around 15 tons.
- **+100** is 10 times a fair share (20 tons) or more. Scores in between are a straight line.
- **Below 0** comes from verified giving back: solar you send to the grid, and work on checked projects that plant, restore or clean up. Shown as "gives back X".$o$,
$n$- **0** is break-even, a fair share: about 2 tons of carbon a year, a common target for meeting climate goals. A typical American is around 15 tons.
- **Above 0** means using less than a fair share, like money in the bank. **+100** is a net of zero: what you use is fully made up by verified giving back, like solar you send to the grid or work on checked projects that plant, restore or clean up.
- **Below 0** means using more than a fair share. **-100** is 10 times a fair share (20 tons) or more. Scores in between are a straight line.$n$),
    updated_at = now()
  where key in ('putting_back', 'ei');
  for k in select key from public.baselines where key in ('putting_back', 'ei') loop
    update public.baseline_versions v set body = b.body from public.baselines b
      where b.key = k and v.baseline_key = k and v.version = b.version;
  end loop;
  update public.talk_topics set about = 'The Environmental Impact Number: a footprint score from -100 to +100, where above 0 means using less than your share. Talk about it here, and propose changes to its wording.'
    where room = 'any' and lower(name) = 'ei#';
end $$;
