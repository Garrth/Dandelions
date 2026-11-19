-- Talk: follow a topic, and get an email when the bell rings.
-- Follow a topic and the bell rings for every new post and comment in it.
-- Emails: one short email when the bell rings, at most one every 15 minutes, bundled. Every email has a one-click way to stop them.
-- Also updates the Site feedback topic's description to ask testers to try Rai.
-- Run once in the Supabase SQL Editor (project dandelions). Safe to run again.

-- ---- Following topics. Only you see what you follow. ----
create table if not exists public.talk_topic_follows (
  member_id uuid not null default auth.uid() references public.members (id) on delete cascade,
  topic_id uuid not null references public.talk_topics (id) on delete cascade,
  at timestamptz not null default now(),
  primary key (member_id, topic_id)
);
create index if not exists talk_topic_follows_topic_idx on public.talk_topic_follows (topic_id);

alter table public.talk_topic_follows enable row level security;
drop policy if exists "Members see topics they follow" on public.talk_topic_follows;
create policy "Members see topics they follow" on public.talk_topic_follows for select to authenticated using (member_id = (select auth.uid()));
drop policy if exists "Members follow topics" on public.talk_topic_follows;
create policy "Members follow topics" on public.talk_topic_follows for insert to authenticated with check (member_id = (select auth.uid()));
drop policy if exists "Members unfollow topics" on public.talk_topic_follows;
create policy "Members unfollow topics" on public.talk_topic_follows for delete to authenticated using (member_id = (select auth.uid()));
revoke all on public.talk_topic_follows from anon, authenticated;
grant select, insert, delete on public.talk_topic_follows to authenticated;
grant select, insert, update, delete on public.talk_topic_follows to service_role;

-- ---- The bell learns two new kinds: a new post in a topic you follow, and a new comment in one ----
alter table public.talk_notices drop constraint if exists talk_notices_kind_check;
alter table public.talk_notices add constraint talk_notices_kind_check
  check (kind in ('follow_post', 'comment', 'topic_post', 'topic_comment'));
alter table public.talk_notices add column if not exists topic_id uuid references public.talk_topics (id) on delete set null;
-- When this bell ring went out by email. Empty means not yet.
alter table public.talk_notices add column if not exists emailed_at timestamptz;
-- Rings from before today are never emailed.
update public.talk_notices set emailed_at = now() where emailed_at is null and at < now() - interval '1 minute';
create index if not exists talk_notices_unmailed_idx on public.talk_notices (member_id) where emailed_at is null;

-- After a post or comment: count it, and ring the bell once per person:
-- the post's author for a comment, people following the topic, and people following the writer.
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
      insert into public.talk_notices (member_id, kind, post_id, from_name, topic_id) values (owner, 'comment', new.parent_id, new.author_name, new.topic_id);
    end if;
    if new.topic_id is not null then
      insert into public.talk_notices (member_id, kind, post_id, from_name, topic_id)
        select f.member_id, 'topic_comment', new.parent_id, new.author_name, new.topic_id from public.talk_topic_follows f
        where f.topic_id = new.topic_id and f.member_id <> new.author_id and f.member_id is distinct from owner;
    end if;
  else
    if new.topic_id is not null then
      update public.talk_topics set posts = posts + 1, last_post_at = now() where id = new.topic_id;
      insert into public.talk_notices (member_id, kind, post_id, from_name, topic_id)
        select f.member_id, 'topic_post', new.id, new.author_name, new.topic_id from public.talk_topic_follows f
        where f.topic_id = new.topic_id and f.member_id <> new.author_id;
    end if;
    insert into public.talk_notices (member_id, kind, post_id, from_name, topic_id)
      select f.follower_id, 'follow_post', new.id, new.author_name, new.topic_id from public.talk_follows f
      where f.followee_id = new.author_id
        and (new.topic_id is null or not exists (select 1 from public.talk_topic_follows t where t.topic_id = new.topic_id and t.member_id = f.follower_id));
  end if;
  return new;
end;
$$;

-- ---- Email settings. Everyone starts with emails on; one tap in the bell or in any email turns them off. ----
create table if not exists public.talk_mail (
  member_id uuid primary key references public.members (id) on delete cascade,
  email_on boolean not null default true,
  -- The secret in each email's "stop these emails" link.
  token uuid not null default gen_random_uuid() unique,
  last_sent timestamptz
);
alter table public.talk_mail enable row level security;
drop policy if exists "Members see their email setting" on public.talk_mail;
create policy "Members see their email setting" on public.talk_mail for select to authenticated using (member_id = (select auth.uid()));
revoke all on public.talk_mail from anon, authenticated;
grant select (member_id, email_on) on public.talk_mail to authenticated;
grant select, insert, update, delete on public.talk_mail to service_role;

-- Turn your own emails on or off.
create or replace function public.talk_mail_set(p_on boolean)
returns boolean
language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'not_signed_in'; end if;
  insert into public.talk_mail (member_id, email_on) values ((select auth.uid()), p_on)
    on conflict (member_id) do update set email_on = excluded.email_on;
  return p_on;
end;
$$;
revoke all on function public.talk_mail_set(boolean) from public;
grant execute on function public.talk_mail_set(boolean) to authenticated;

-- The link in an email turns them off without logging in.
create or replace function public.talk_mail_off(p_token uuid)
returns boolean
language plpgsql security definer set search_path = ''
as $$
begin
  update public.talk_mail set email_on = false where token = p_token;
  return found;
end;
$$;
revoke all on function public.talk_mail_off(uuid) from public;
grant execute on function public.talk_mail_off(uuid) to anon, authenticated, service_role;

-- For the talk-mail function only: who is due an email, and what's in it. Marks those rings as emailed.
-- Skips rings already seen in the bell, rings over 2 days old, and anyone emailed in the last 15 minutes (they get the rest next time).
create or replace function public.talk_mail_claim()
returns table (member_id uuid, email text, token uuid, items jsonb)
language plpgsql security definer set search_path = ''
as $$
#variable_conflict use_column
begin
  perform pg_advisory_xact_lock(hashtext('talk_mail_claim'));
  insert into public.talk_mail (member_id)
    select distinct n.member_id from public.talk_notices n where n.emailed_at is null
    on conflict do nothing;
  return query
  with due as (
    select m.member_id, m.token, u.email::text as email from public.talk_mail m
    join auth.users u on u.id = m.member_id and u.email_confirmed_at is not null
    where m.email_on and (m.last_sent is null or m.last_sent < now() - interval '15 minutes')
      and exists (select 1 from public.talk_notices n where n.member_id = m.member_id and n.emailed_at is null and not n.seen and n.at > now() - interval '2 days')
    limit 40
  ), sent as (
    update public.talk_mail m set last_sent = now() from due where m.member_id = due.member_id returning m.member_id
  ), marked as (
    update public.talk_notices n set emailed_at = now()
    from due where n.member_id = due.member_id and n.emailed_at is null
    returning n.id, n.member_id, n.kind, n.post_id, n.from_name, n.topic_id, n.seen, n.at
  )
  select d.member_id, d.email, d.token,
    coalesce((select jsonb_agg(jsonb_build_object(
        'id', x.id, 'kind', x.kind, 'post_id', x.post_id, 'from', x.from_name, 'at', x.at,
        'topic', coalesce(t.name, ''),
        'title', coalesce(nullif(p.title, ''), left(p.body, 80), '')) order by x.at)
      from marked x
      join public.talk_posts p on p.id = x.post_id and not p.deleted and not p.hidden
      left join public.talk_topics t on t.id = x.topic_id
      where x.member_id = d.member_id and not x.seen and x.at > now() - interval '2 days'), '[]'::jsonb)
  from due d;
end;
$$;
revoke all on function public.talk_mail_claim() from public, anon, authenticated;
grant execute on function public.talk_mail_claim() to service_role;

-- If an email couldn't be sent, put those rings back so the next try sends them.
create or replace function public.talk_mail_release(p_member uuid, p_ids bigint[])
returns void
language sql security definer set search_path = ''
as $$
  update public.talk_notices set emailed_at = null where member_id = p_member and id = any (p_ids);
  update public.talk_mail set last_sent = null where member_id = p_member;
$$;
revoke all on function public.talk_mail_release(uuid, bigint[]) from public, anon, authenticated;
grant execute on function public.talk_mail_release(uuid, bigint[]) to service_role;

-- ---- The Site feedback topic asks testers to try Rai too ----
insert into public.talk_topics (id, room, name, about, pinned, made_by) values
  ('f33db4c0-0000-4000-8000-000000000001', 'any', 'Site feedback',
   'Early look: please try to break it. Ask Rai (the button at the bottom right) anything, then tell us here what worked, what confused you, and what you''d change. Say which page and what phone or computer you used.', true, 'starter')
on conflict (id) do update set about = excluded.about, pinned = true, archived = false;
