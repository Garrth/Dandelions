-- Talk, part 5: members suggest topics, Rai updates summaries from where he left off, and "What does Maria think?".
-- Run once in the Supabase SQL Editor (project dandelions), after talk_rai.sql. Safe to run again.
--
--   * Suggest a topic: a member posts in General and ticks "Suggest this as a new topic". The post's title is the
--     topic name. It goes straight onto Catching on, and when enough different people take part (comment, +1, or
--     post about the same idea) over enough days, the topic opens on its own. Nobody approves it.
--   * Summaries: Rai keeps track of the newest message he has read, and next time only reads what's new and updates
--     his last summary. Once a week, or when members flag it, he rereads the whole topic so small errors don't pile up.
--   * One person's view: on a topic's Summary page, anyone can ask Rai to sum up what one person said there,
--     with links to their posts. Rai only summarizes their own words. Saved so it isn't rewritten every time.

-- ---- Suggest a topic ----
alter table public.talk_posts add column if not exists suggest boolean not null default false;
alter table public.talk_ideas add column if not exists suggested boolean not null default false;
grant insert (room, parent_id, kind, title, body, topic_id, suggest) on public.talk_posts to authenticated;
grant select (suggest) on public.talk_posts to anon, authenticated;

-- A suggestion needs a title (the topic's name), only works in General, and goes on Catching on right away.
create or replace function public.talk_suggest_check()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.suggest then
    if new.parent_id is not null or new.topic_id is not null then new.suggest := false; return new; end if;
    if char_length(trim(coalesce(new.title, ''))) < 3 then raise exception 'talk_suggest_title'; end if;
    if exists (select 1 from public.talk_topics where room in (new.room, 'any') and lower(name) = lower(left(trim(new.title), 60)) and not archived) then
      raise exception 'talk_suggest_exists';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists talk_suggest_check on public.talk_posts;
create trigger talk_suggest_check before insert on public.talk_posts
  for each row execute function public.talk_suggest_check();

create or replace function public.talk_suggest_after()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.suggest and new.parent_id is null and new.topic_id is null then
    insert into public.talk_ideas (room, name, about, post_ids, suggested)
      values (new.room, left(trim(new.title), 60), left(regexp_replace(trim(new.body), '\s+', ' ', 'g'), 300), array[new.id], true);
  end if;
  return null;
end;
$$;
drop trigger if exists talk_suggest_after on public.talk_posts;
create trigger talk_suggest_after after insert on public.talk_posts
  for each row execute function public.talk_suggest_after();

-- Opens a topic for every idea in a place that's over the bar. Anyone looking at Catching on runs it,
-- so a suggestion that gets its last +1 opens without waiting for Rai. Rules only, no AI.
create or replace function public.talk_ideas_promote(p_room text)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  i public.talk_ideas;
  bar record;
  cnt record;
  tid uuid;
  starter uuid;
  made integer := 0;
begin
  if p_room !~ '^(us|st-[A-Z]{2}|co-[0-9]{5})$' then return 0; end if;
  select * into bar from public.talk_idea_bar(p_room);
  for i in select * from public.talk_ideas where room = p_room and topic_id is null for update skip locked loop
    select * into cnt from public.talk_idea_count(i.post_ids);
    -- A suggestion nobody has touched in 14 days drops off the list.
    if i.suggested and cnt.people = 0 then delete from public.talk_ideas where id = i.id; continue; end if;
    if cnt.people < bar.people or cnt.days < bar.days then continue; end if;
    select id into tid from public.talk_topics where room in (p_room, 'any') and lower(name) = lower(i.name) and not archived limit 1;
    select author_id into starter from public.talk_posts where id = any (i.post_ids) order by created_at limit 1;
    if tid is null then
      insert into public.talk_topics (room, name, about, made_by, created_by)
        values (p_room, i.name, i.about, 'traction', starter)
        on conflict (room, lower(name)) do nothing
        returning id into tid;
      if tid is null then select id into tid from public.talk_topics where room = p_room and lower(name) = lower(i.name); end if;
    end if;
    update public.talk_posts set topic_id = tid
      where room = p_room and topic_id is null and (
        id = any (i.post_ids) or parent_id = any (i.post_ids)
        or id in (select parent_id from public.talk_posts where id = any (i.post_ids) and parent_id is not null)
        or parent_id in (select parent_id from public.talk_posts where id = any (i.post_ids) and parent_id is not null));
    update public.talk_topics t set posts = (select count(*) from public.talk_posts p where p.topic_id = t.id and p.parent_id is null and not p.deleted),
      last_post_at = greatest(t.last_post_at, coalesce((select max(created_at) from public.talk_posts p where p.topic_id = t.id), t.last_post_at))
      where t.id = tid;
    update public.talk_ideas set topic_id = tid, promoted_at = now() where id = i.id;
    insert into public.talk_mod_log (mod_id, action, topic_id, note)
      values (null, 'traction_topic', tid, left(i.name || ': ' || cnt.people || ' people over ' || cnt.days || ' days' || case when i.suggested then ' (suggested)' else '' end, 300));
    made := made + 1;
  end loop;
  delete from public.talk_ideas where room = p_room and topic_id is not null and promoted_at < now() - interval '7 days';
  return made;
end;
$$;
revoke all on function public.talk_ideas_promote(text) from public, anon, authenticated;
grant execute on function public.talk_ideas_promote(text) to service_role;

-- Rai's grouping replaces his last one, but never drops a member's suggestion: posts Rai finds about a
-- suggested idea (same name) join it.
create or replace function public.talk_ideas_save(p_room text, p_ideas jsonb)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  x jsonb;
  ids uuid[];
  nm text;
  sid uuid;
begin
  if p_room !~ '^(us|st-[A-Z]{2}|co-[0-9]{5})$' then raise exception 'talk_no_place'; end if;
  delete from public.talk_ideas where room = p_room and topic_id is null and not suggested;
  for x in select * from jsonb_array_elements(coalesce(p_ideas, '[]'::jsonb)) loop
    nm := left(trim(coalesce(x->>'name', '')), 60);
    if char_length(nm) < 3 then continue; end if;
    select coalesce(array_agg(p.id), '{}') into ids from public.talk_posts p
      where p.id in (select (v #>> '{}')::uuid from jsonb_array_elements(coalesce(x->'ids', '[]'::jsonb)) v where (v #>> '{}') ~ '^[0-9a-f-]{36}$')
        and p.room = p_room and p.topic_id is null and not p.deleted and not p.hidden and not p.no_idea;
    if cardinality(ids) = 0 then continue; end if;
    select id into sid from public.talk_ideas where room = p_room and topic_id is null and suggested and lower(name) = lower(nm) limit 1;
    if sid is not null then
      update public.talk_ideas set post_ids = (select array_agg(distinct e) from unnest(post_ids || ids) e), updated_at = now() where id = sid;
    else
      insert into public.talk_ideas (room, name, about, post_ids) values (p_room, nm, left(trim(coalesce(x->>'about', '')), 300), ids);
    end if;
  end loop;
  return public.talk_ideas_promote(p_room);
end;
$$;
revoke all on function public.talk_ideas_save(text, jsonb) from public, anon, authenticated;
grant execute on function public.talk_ideas_save(text, jsonb) to service_role;

-- The Catching on list, after opening any topic that's now over the bar. Suggestions show from the start.
drop function if exists public.talk_catching_on(text);
create or replace function public.talk_catching_on(p_room text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  out jsonb;
begin
  if p_room !~ '^(us|st-[A-Z]{2}|co-[0-9]{5})$' then return '[]'::jsonb; end if;
  perform public.talk_ideas_promote(p_room);
  select coalesce(jsonb_agg(r order by (r->>'promoted') desc nulls last, (r->>'people')::int desc), '[]'::jsonb) into out from (
    select jsonb_build_object(
      'id', i.id, 'name', i.name, 'about', i.about, 'posts', i.post_ids, 'suggested', i.suggested,
      'people', c.people, 'days', c.days, 'need_people', b.people, 'need_days', b.days,
      'topic_id', i.topic_id, 'promoted', i.promoted_at) as r
    from public.talk_ideas i
    cross join lateral public.talk_idea_count(i.post_ids) c
    cross join lateral public.talk_idea_bar(i.room) b
    where i.room = p_room and (i.topic_id is not null or c.people >= 2 or (i.suggested and c.people >= 1))
    limit 20
  ) q;
  return out;
end;
$$;
revoke all on function public.talk_catching_on(text) from public;
grant execute on function public.talk_catching_on(text) to anon, authenticated;

-- "Not about this" keeps suggestions honest too: an empty idea goes away.
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

-- ---- Summaries that update from the last one ----
alter table public.talk_summaries add column if not exists covered_upto timestamptz not null default '-infinity';
alter table public.talk_summaries add column if not exists full_at timestamptz not null default '-infinity';

-- Saves a summary. Counts come from the database. p_full says whether Rai reread everything.
drop function if exists public.talk_summary_save(uuid, jsonb, integer, integer);
create or replace function public.talk_summary_save(p_topic uuid, p_body jsonb, p_upto timestamptz, p_full boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  c record;
begin
  select * into c from public.talk_topic_counts(p_topic);
  update public.talk_summaries set body = p_body, messages = c.messages, people = c.people, made_at = now(),
    covered_upto = coalesce(p_upto, covered_upto), full_at = case when p_full then now() else full_at end,
    flags = 0, locked_until = '-infinity' where topic_id = p_topic;
  delete from public.talk_summary_flags where topic_id = p_topic;
end;
$$;
revoke all on function public.talk_summary_save(uuid, jsonb, timestamptz, boolean) from public, anon, authenticated;
grant execute on function public.talk_summary_save(uuid, jsonb, timestamptz, boolean) to service_role;

-- ---- One person's view in a topic ----
create table if not exists public.talk_person_views (
  topic_id uuid not null references public.talk_topics (id) on delete cascade,
  author_id uuid not null references public.members (id) on delete cascade,
  -- {"view": "...", "points": [{"text": "...", "posts": ["post id", ...]}]}
  body jsonb not null default '{}'::jsonb,
  -- Their newest message Rai read, so it's only rewritten after they post again.
  covered_upto timestamptz not null default '-infinity',
  made_at timestamptz not null default now(),
  primary key (topic_id, author_id)
);
alter table public.talk_person_views enable row level security;
drop policy if exists "Anyone can read person views" on public.talk_person_views;
create policy "Anyone can read person views" on public.talk_person_views for select to anon, authenticated using (true);
revoke all on public.talk_person_views from anon, authenticated;
grant select on public.talk_person_views to anon, authenticated;
grant select, insert, update, delete on public.talk_person_views to service_role;
