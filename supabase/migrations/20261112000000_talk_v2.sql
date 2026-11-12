-- Talk, part 3: topics, posts with comments, +1 on anything, starred topics, following people, and a bell.
-- Run once in the Supabase SQL Editor (project dandelions), after the two earlier Talk files. Safe to run again.
--
-- How it fits together:
--   Each place (your county, your state, the whole US) has General plus topics. A post with no topic is in General.
--   Topics with room 'any' show in every place (the two starter topics), but their posts stay in the place they were written.
--   Comments are posts with a parent. They are one level deep.
--   Moderators can make, rename, pin and archive topics by hand, and move a post into a topic. Every action is logged.
--   Later, Rai will also make topics when an idea gets enough traction (part 4).

-- Clear the test posts written before the new Talk. Only posts from before Nov 12 2026, so running this again is safe.
delete from public.talk_posts where created_at < '2026-11-12T00:00:00Z';

-- ---- Topics ----
create table if not exists public.talk_topics (
  id uuid primary key default gen_random_uuid(),
  -- 'any' shows in every place. Otherwise 'us', 'st-CA' or 'co-06097'.
  room text not null check (room ~ '^(any|us|st-[A-Z]{2}|co-[0-9]{5})$'),
  name text not null check (char_length(name) between 3 and 60),
  about text not null default '' check (char_length(about) <= 300),
  pinned boolean not null default false,
  -- Who made it: a moderator by hand, Rai at the traction bar, or one of the starter topics.
  made_by text not null default 'moderator' check (made_by in ('moderator', 'traction', 'starter')),
  created_by uuid,
  archived boolean not null default false,
  posts integer not null default 0,
  last_post_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create unique index if not exists talk_topics_name_idx on public.talk_topics (room, lower(name));
create index if not exists talk_topics_room_idx on public.talk_topics (room, last_post_at desc);

-- The two topics every place starts with, so members can help define the core principle.
insert into public.talk_topics (room, name, about, pinned, made_by) values
  ('any', 'A better quality of life', 'What would a better quality of life look like where you live? What would make the biggest difference?', true, 'starter'),
  ('any', 'Putting back more than we take', 'What does putting back more than we take mean to you? How would we know we''re doing it?', true, 'starter')
on conflict (room, lower(name)) do nothing;

-- Posts belong to a topic, or to General when topic_id is empty.
alter table public.talk_posts add column if not exists topic_id uuid references public.talk_topics (id) on delete set null;
create index if not exists talk_posts_topic_idx on public.talk_posts (room, topic_id, created_at desc) where parent_id is null;
create index if not exists talk_posts_feed_idx on public.talk_posts (room, created_at desc) where parent_id is null;
alter table public.talk_mod_log add column if not exists topic_id uuid;

-- ---- Posting rules ----
-- Rules agreed, not paused, 30 posts and 100 comments a day, first name only. A post needs a title or some words.
-- A comment takes its place and topic from the post it answers.
create or replace function public.talk_before_post()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  p public.talk_posts;
  t public.talk_topics;
  name text;
begin
  if not exists (select 1 from public.talk_agreements where member_id = new.author_id) then
    raise exception 'talk_rules';
  end if;
  if exists (select 1 from public.talk_pauses where member_id = new.author_id and until > now()) then
    raise exception 'talk_paused';
  end if;
  if new.parent_id is null then
    if (select count(*) from public.talk_posts where author_id = new.author_id and parent_id is null and created_at > now() - interval '1 day') >= 30 then
      raise exception 'talk_limit';
    end if;
  elsif (select count(*) from public.talk_posts where author_id = new.author_id and parent_id is not null and created_at > now() - interval '1 day') >= 100 then
    raise exception 'talk_limit';
  end if;
  name := split_part(trim(coalesce((select display_name from public.profiles where id = new.author_id), '')), ' ', 1);
  new.author_name := coalesce(nullif(left(name, 60), ''), 'A member');
  new.replies := 0; new.backers := 0; new.flags := 0; new.hidden := false; new.cleared := false; new.deleted := false;
  new.created_at := now(); new.last_reply_at := now();
  new.title := trim(coalesce(new.title, '')); new.body := trim(coalesce(new.body, ''));
  if new.parent_id is not null then
    select * into p from public.talk_posts where id = new.parent_id;
    if p.id is null or p.parent_id is not null or p.deleted or p.hidden then raise exception 'talk_no_parent'; end if;
    new.room := p.room; new.topic_id := p.topic_id; new.kind := 'reply'; new.title := '';
    if char_length(new.body) = 0 then raise exception 'talk_empty'; end if;
  else
    new.kind := 'post';
    if char_length(new.body) = 0 and char_length(new.title) = 0 then raise exception 'talk_empty'; end if;
    if new.room !~ '^(us|st-[A-Z]{2}|co-[0-9]{5})$' then raise exception 'talk_no_place'; end if;
    if new.topic_id is not null then
      select * into t from public.talk_topics where id = new.topic_id;
      if t.id is null or t.archived or not (t.room = 'any' or t.room = new.room) then raise exception 'talk_no_topic'; end if;
    end if;
  end if;
  return new;
end;
$$;

-- After a post or comment: count it, and ring the bell for followers and for the post's author.
create or replace function public.talk_after_reply()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  owner uuid;
begin
  if new.parent_id is not null then
    update public.talk_posts set replies = replies + 1, last_reply_at = now() where id = new.parent_id returning author_id into owner;
    if owner is not null and owner <> new.author_id then
      insert into public.talk_notices (member_id, kind, post_id, from_name) values (owner, 'comment', new.parent_id, new.author_name);
    end if;
  else
    if new.topic_id is not null then
      update public.talk_topics set posts = posts + 1, last_post_at = now() where id = new.topic_id;
    end if;
    insert into public.talk_notices (member_id, kind, post_id, from_name)
      select f.follower_id, 'follow_post', new.id, new.author_name from public.talk_follows f where f.followee_id = new.author_id;
  end if;
  return new;
end;
$$;

-- ---- +1 on any post or comment, except your own ----
drop policy if exists "Members can back ideas" on public.talk_backs;
drop policy if exists "Members can +1 posts" on public.talk_backs;
create policy "Members can +1 posts"
  on public.talk_backs for insert to authenticated
  with check (member_id = (select auth.uid())
    and exists (select 1 from public.talk_posts where id = post_id and not deleted and author_id <> (select auth.uid())));

-- ---- Starred topics (only you see yours) ----
create table if not exists public.talk_stars (
  member_id uuid not null default auth.uid() references public.members (id) on delete cascade,
  topic_id uuid not null references public.talk_topics (id) on delete cascade,
  at timestamptz not null default now(),
  primary key (member_id, topic_id)
);

-- ---- Following people. Only the follower sees the follow, so there are no follower counts. ----
create table if not exists public.talk_follows (
  follower_id uuid not null default auth.uid() references public.members (id) on delete cascade,
  followee_id uuid not null references public.members (id) on delete cascade,
  at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index if not exists talk_follows_followee_idx on public.talk_follows (followee_id);

-- ---- The bell ----
create table if not exists public.talk_notices (
  id bigint generated always as identity primary key,
  member_id uuid not null references public.members (id) on delete cascade,
  -- 'follow_post': someone you follow posted. 'comment': someone commented on your post.
  kind text not null check (kind in ('follow_post', 'comment')),
  post_id uuid not null references public.talk_posts (id) on delete cascade,
  from_name text not null default 'A member',
  seen boolean not null default false,
  at timestamptz not null default now()
);
create index if not exists talk_notices_member_idx on public.talk_notices (member_id, at desc);

-- ---- Moderator tools for topics ----
create or replace function public.talk_mod_topic(topic uuid, place text, topic_name text, topic_about text default '', is_pinned boolean default false, is_archived boolean default false)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  tid uuid;
begin
  if not public.is_talk_mod() then raise exception 'not_a_moderator'; end if;
  if topic is null then
    insert into public.talk_topics (room, name, about, pinned, made_by, created_by)
      values (place, trim(topic_name), left(trim(coalesce(topic_about, '')), 300), is_pinned, 'moderator', (select auth.uid()))
      returning id into tid;
    insert into public.talk_mod_log (mod_id, action, topic_id, note) values ((select auth.uid()), 'topic_create', tid, left(trim(topic_name), 300));
  else
    update public.talk_topics set name = trim(topic_name), about = left(trim(coalesce(topic_about, '')), 300), pinned = is_pinned, archived = is_archived
      where id = topic returning id into tid;
    if tid is null then raise exception 'talk_no_topic'; end if;
    insert into public.talk_mod_log (mod_id, action, topic_id, note)
      values ((select auth.uid()), case when is_archived then 'topic_archive' else 'topic_edit' end, tid, left(trim(topic_name), 300));
  end if;
  return tid;
end;
$$;
revoke all on function public.talk_mod_topic(uuid, text, text, text, boolean, boolean) from public;
grant execute on function public.talk_mod_topic(uuid, text, text, text, boolean, boolean) to authenticated;

-- Move a post (and its comments) into a topic, or back to General with an empty topic.
create or replace function public.talk_mod_move(post uuid, topic uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  p public.talk_posts;
  t public.talk_topics;
begin
  if not public.is_talk_mod() then raise exception 'not_a_moderator'; end if;
  select * into p from public.talk_posts where id = post and parent_id is null;
  if p.id is null then raise exception 'talk_no_parent'; end if;
  if topic is not null then
    select * into t from public.talk_topics where id = topic;
    if t.id is null or not (t.room = 'any' or t.room = p.room) then raise exception 'talk_no_topic'; end if;
  end if;
  update public.talk_posts set topic_id = topic where id = post or parent_id = post;
  if p.topic_id is not null then update public.talk_topics set posts = greatest(posts - 1, 0) where id = p.topic_id; end if;
  if topic is not null then update public.talk_topics set posts = posts + 1, last_post_at = greatest(last_post_at, p.created_at) where id = topic; end if;
  insert into public.talk_mod_log (mod_id, action, post_id, member_id, topic_id) values ((select auth.uid()), 'move', post, p.author_id, topic);
end;
$$;
revoke all on function public.talk_mod_move(uuid, uuid) from public;
grant execute on function public.talk_mod_move(uuid, uuid) to authenticated;

-- ---- Who can do what ----
alter table public.talk_topics enable row level security;
drop policy if exists "Anyone can read topics" on public.talk_topics;
create policy "Anyone can read topics" on public.talk_topics for select to anon, authenticated using (true);

alter table public.talk_stars enable row level security;
drop policy if exists "Members see their own stars" on public.talk_stars;
create policy "Members see their own stars" on public.talk_stars for select to authenticated using (member_id = (select auth.uid()));
drop policy if exists "Members star topics" on public.talk_stars;
create policy "Members star topics" on public.talk_stars for insert to authenticated with check (member_id = (select auth.uid()));
drop policy if exists "Members unstar topics" on public.talk_stars;
create policy "Members unstar topics" on public.talk_stars for delete to authenticated using (member_id = (select auth.uid()));

alter table public.talk_follows enable row level security;
drop policy if exists "Members see who they follow" on public.talk_follows;
create policy "Members see who they follow" on public.talk_follows for select to authenticated using (follower_id = (select auth.uid()));
drop policy if exists "Members follow people" on public.talk_follows;
create policy "Members follow people" on public.talk_follows for insert to authenticated with check (follower_id = (select auth.uid()));
drop policy if exists "Members unfollow people" on public.talk_follows;
create policy "Members unfollow people" on public.talk_follows for delete to authenticated using (follower_id = (select auth.uid()));

alter table public.talk_notices enable row level security;
drop policy if exists "Members see their own bell" on public.talk_notices;
create policy "Members see their own bell" on public.talk_notices for select to authenticated using (member_id = (select auth.uid()));
drop policy if exists "Members mark their bell seen" on public.talk_notices;
create policy "Members mark their bell seen" on public.talk_notices for update to authenticated
  using (member_id = (select auth.uid())) with check (member_id = (select auth.uid()));

revoke all on public.talk_topics, public.talk_stars, public.talk_follows, public.talk_notices from anon, authenticated;
grant select on public.talk_topics to anon, authenticated;
grant select, insert, delete on public.talk_stars, public.talk_follows to authenticated;
grant select on public.talk_notices to authenticated;
grant update (seen) on public.talk_notices to authenticated;
grant insert (room, parent_id, kind, title, body, topic_id) on public.talk_posts to authenticated;
grant select, insert, update, delete on public.talk_topics, public.talk_stars, public.talk_follows, public.talk_notices to service_role;
