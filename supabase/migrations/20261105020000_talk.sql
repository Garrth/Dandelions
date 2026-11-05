-- Talk: rooms where members post, reply and back ideas. Anyone can read.
-- Nobody approves posts. Members flag what's wrong, and a post with 3 flags from different members is hidden
-- until someone looks at it. Every flag and hide is kept.
-- Run once in the Supabase SQL Editor (project dandelions). Safe to run again.

create table if not exists public.talk_posts (
  id uuid primary key default gen_random_uuid(),
  -- 'us' (nationwide), 'st-CA' (a state), 'co-06097' (a county) or 'topic-next' (a topic).
  room text not null check (room ~ '^(us|st-[A-Z]{2}|co-[0-9]{5}|topic-[a-z]{1,30})$'),
  -- A reply points at the post it answers. Replies are one level deep.
  parent_id uuid references public.talk_posts (id) on delete cascade,
  -- 'post' is talk, 'idea' is a suggestion people can back, 'reply' answers a post or idea.
  kind text not null default 'post' check (kind in ('post', 'idea', 'reply')),
  author_id uuid not null default auth.uid() references public.members (id) on delete cascade,
  -- The name shown, copied from the author's profile when they post.
  author_name text not null default 'A member' check (char_length(author_name) between 1 and 60),
  title text not null default '' check (char_length(title) <= 120),
  body text not null default '' check (char_length(body) <= 2000),
  replies integer not null default 0,
  backers integer not null default 0,
  flags integer not null default 0,
  hidden boolean not null default false,
  -- A person looked at the flags and left it up. It won't be hidden by flags again.
  cleared boolean not null default false,
  deleted boolean not null default false,
  created_at timestamptz not null default now(),
  last_reply_at timestamptz not null default now()
);
create index if not exists talk_posts_room_idx on public.talk_posts (room, last_reply_at desc) where parent_id is null;
create index if not exists talk_posts_parent_idx on public.talk_posts (parent_id, created_at);
create index if not exists talk_posts_author_idx on public.talk_posts (author_id, created_at);

create table if not exists public.talk_backs (
  post_id uuid not null references public.talk_posts (id) on delete cascade,
  member_id uuid not null default auth.uid() references public.members (id) on delete cascade,
  at timestamptz not null default now(),
  primary key (post_id, member_id)
);

create table if not exists public.talk_flags (
  post_id uuid not null references public.talk_posts (id) on delete cascade,
  member_id uuid not null default auth.uid() references public.members (id) on delete cascade,
  reason text not null check (reason in ('spam', 'mean', 'scam', 'private', 'other')),
  at timestamptz not null default now(),
  primary key (post_id, member_id)
);

-- Fill in what members don't choose: the shown name, the room and kind of a reply, and a daily limit.
create or replace function public.talk_before_post()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  p public.talk_posts;
begin
  if (select count(*) from public.talk_posts where author_id = new.author_id and created_at > now() - interval '1 day') >= 30 then
    raise exception 'talk_limit' using hint = 'Thirty posts a day is the most. Try again tomorrow.';
  end if;
  new.author_name := coalesce((select nullif(trim(display_name), '') from public.profiles where id = new.author_id), 'A member');
  new.replies := 0; new.backers := 0; new.flags := 0; new.hidden := false; new.cleared := false; new.deleted := false;
  new.created_at := now(); new.last_reply_at := now();
  if new.parent_id is not null then
    select * into p from public.talk_posts where id = new.parent_id;
    if p.id is null or p.parent_id is not null or p.deleted or p.hidden then raise exception 'talk_no_parent'; end if;
    new.room := p.room; new.kind := 'reply'; new.title := '';
  elsif new.kind = 'reply' then
    raise exception 'talk_no_parent';
  elsif char_length(trim(new.title)) < 3 then
    raise exception 'talk_title';
  end if;
  if char_length(trim(new.body)) = 0 and new.parent_id is not null then raise exception 'talk_empty'; end if;
  return new;
end;
$$;
drop trigger if exists talk_before_post on public.talk_posts;
create trigger talk_before_post before insert on public.talk_posts
  for each row execute function public.talk_before_post();

create or replace function public.talk_after_reply()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.parent_id is not null then
    update public.talk_posts set replies = replies + 1, last_reply_at = now() where id = new.parent_id;
  end if;
  return new;
end;
$$;
drop trigger if exists talk_after_reply on public.talk_posts;
create trigger talk_after_reply after insert on public.talk_posts
  for each row execute function public.talk_after_reply();

-- Deleting your own post blanks it but keeps its place, so replies still make sense.
create or replace function public.talk_before_change()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.deleted and not old.deleted then new.title := ''; new.body := ''; end if;
  return new;
end;
$$;
drop trigger if exists talk_before_change on public.talk_posts;
create trigger talk_before_change before update on public.talk_posts
  for each row execute function public.talk_before_change();

create or replace function public.talk_count_backs()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.talk_posts set backers = backers + 1 where id = new.post_id;
  else
    update public.talk_posts set backers = greatest(backers - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;
drop trigger if exists talk_count_backs on public.talk_backs;
create trigger talk_count_backs after insert or delete on public.talk_backs
  for each row execute function public.talk_count_backs();

create or replace function public.talk_count_flags()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.talk_posts set flags = flags + 1, hidden = hidden or (not cleared and flags + 1 >= 3) where id = new.post_id;
  return null;
end;
$$;
drop trigger if exists talk_count_flags on public.talk_flags;
create trigger talk_count_flags after insert on public.talk_flags
  for each row execute function public.talk_count_flags();

-- Who can do what.
alter table public.talk_posts enable row level security;
drop policy if exists "Anyone can read talk" on public.talk_posts;
create policy "Anyone can read talk"
  on public.talk_posts for select to anon, authenticated
  using (not hidden or author_id = (select auth.uid()));
drop policy if exists "Members can post" on public.talk_posts;
create policy "Members can post"
  on public.talk_posts for insert to authenticated
  with check (author_id = (select auth.uid()));
drop policy if exists "Members can delete their own posts" on public.talk_posts;
create policy "Members can delete their own posts"
  on public.talk_posts for update to authenticated
  using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));

alter table public.talk_backs enable row level security;
drop policy if exists "Members can see their own backing" on public.talk_backs;
create policy "Members can see their own backing"
  on public.talk_backs for select to authenticated using (member_id = (select auth.uid()));
drop policy if exists "Members can back ideas" on public.talk_backs;
create policy "Members can back ideas"
  on public.talk_backs for insert to authenticated
  with check (member_id = (select auth.uid())
    and exists (select 1 from public.talk_posts where id = post_id and kind = 'idea' and not deleted and author_id <> (select auth.uid())));
drop policy if exists "Members can take back their backing" on public.talk_backs;
create policy "Members can take back their backing"
  on public.talk_backs for delete to authenticated using (member_id = (select auth.uid()));

alter table public.talk_flags enable row level security;
drop policy if exists "Members can see their own flags" on public.talk_flags;
create policy "Members can see their own flags"
  on public.talk_flags for select to authenticated using (member_id = (select auth.uid()));
drop policy if exists "Members can flag posts" on public.talk_flags;
create policy "Members can flag posts"
  on public.talk_flags for insert to authenticated
  with check (member_id = (select auth.uid())
    and exists (select 1 from public.talk_posts where id = post_id and author_id <> (select auth.uid())));

revoke all on public.talk_posts, public.talk_backs, public.talk_flags from anon, authenticated;
grant select on public.talk_posts to anon, authenticated;
grant insert (room, parent_id, kind, title, body) on public.talk_posts to authenticated;
grant update (deleted) on public.talk_posts to authenticated;
grant select, insert, delete on public.talk_backs to authenticated;
grant select, insert on public.talk_flags to authenticated;
grant select, insert, update, delete on public.talk_posts, public.talk_backs, public.talk_flags to service_role;
