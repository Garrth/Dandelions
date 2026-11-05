-- Talk, part 2: the rules everyone agrees to before posting, moderators, and pausing someone who breaks the rules.
-- Run once in the Supabase SQL Editor (project dandelions), after 20261105020000_talk.sql. Safe to run again.

-- Who agreed to the Talk rules, and to which version.
create table if not exists public.talk_agreements (
  member_id uuid primary key default auth.uid() references public.members (id) on delete cascade,
  version smallint not null default 1,
  at timestamptz not null default now()
);

-- Moderators. Add one with: insert into public.talk_moderators (member_id, note) values ('<member id>', 'Sonoma');
create table if not exists public.talk_moderators (
  member_id uuid primary key references public.members (id) on delete cascade,
  note text not null default '',
  added_at timestamptz not null default now()
);

-- A member who can't post until a date.
create table if not exists public.talk_pauses (
  member_id uuid primary key references public.members (id) on delete cascade,
  until timestamptz not null,
  reason text not null default '',
  by uuid,
  at timestamptz not null default now()
);

-- Everything a moderator does.
create table if not exists public.talk_mod_log (
  id bigint generated always as identity primary key,
  mod_id uuid,
  action text not null,
  post_id uuid,
  member_id uuid,
  note text not null default '',
  at timestamptz not null default now()
);

create or replace function public.is_talk_mod()
returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.talk_moderators where member_id = (select auth.uid())); $$;
revoke all on function public.is_talk_mod() from public;
grant execute on function public.is_talk_mod() to anon, authenticated;

-- Posting now needs the rules agreed to and no pause. The name shown is the first name only.
create or replace function public.talk_before_post()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  p public.talk_posts;
  name text;
begin
  if not exists (select 1 from public.talk_agreements where member_id = new.author_id) then
    raise exception 'talk_rules';
  end if;
  if exists (select 1 from public.talk_pauses where member_id = new.author_id and until > now()) then
    raise exception 'talk_paused';
  end if;
  if (select count(*) from public.talk_posts where author_id = new.author_id and created_at > now() - interval '1 day') >= 30 then
    raise exception 'talk_limit';
  end if;
  name := split_part(trim(coalesce((select display_name from public.profiles where id = new.author_id), '')), ' ', 1);
  new.author_name := coalesce(nullif(left(name, 60), ''), 'A member');
  new.replies := 0; new.backers := 0; new.flags := 0; new.hidden := false; new.cleared := false; new.deleted := false;
  new.created_at := now(); new.last_reply_at := now();
  if new.parent_id is not null then
    select * into p from public.talk_posts where id = new.parent_id;
    if p.id is null or p.parent_id is not null or p.deleted or p.hidden then raise exception 'talk_no_parent'; end if;
    new.room := p.room; new.kind := 'reply'; new.title := '';
    if char_length(trim(new.body)) = 0 then raise exception 'talk_empty'; end if;
  elsif new.kind = 'reply' then
    raise exception 'talk_no_parent';
  else
    new.kind := 'idea';
    if char_length(trim(new.title)) < 3 then raise exception 'talk_title'; end if;
  end if;
  return new;
end;
$$;

-- Moderators can hide or put back any post, and pause a member.
create or replace function public.talk_mod_hide(post uuid, hide boolean, note text default '')
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_talk_mod() then raise exception 'not_a_moderator'; end if;
  update public.talk_posts set hidden = hide, cleared = not hide where id = post;
  insert into public.talk_mod_log (mod_id, action, post_id, member_id, note)
    select (select auth.uid()), case when hide then 'hide' else 'put_back' end, post, author_id, left(coalesce(note, ''), 300)
    from public.talk_posts where id = post;
end;
$$;
revoke all on function public.talk_mod_hide(uuid, boolean, text) from public;
grant execute on function public.talk_mod_hide(uuid, boolean, text) to authenticated;

create or replace function public.talk_mod_pause(member uuid, days integer, note text default '')
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_talk_mod() then raise exception 'not_a_moderator'; end if;
  if days < 0 or days > 365 then raise exception 'bad_days'; end if;
  if exists (select 1 from public.talk_moderators where member_id = member) then raise exception 'is_moderator'; end if;
  if days = 0 then
    delete from public.talk_pauses where member_id = member;
  else
    insert into public.talk_pauses (member_id, until, reason, by) values (member, now() + make_interval(days => days), left(coalesce(note, ''), 300), (select auth.uid()))
      on conflict (member_id) do update set until = excluded.until, reason = excluded.reason, by = excluded.by, at = now();
  end if;
  insert into public.talk_mod_log (mod_id, action, member_id, note)
    values ((select auth.uid()), case when days = 0 then 'unpause' else 'pause_' || days || '_days' end, member, left(coalesce(note, ''), 300));
end;
$$;
revoke all on function public.talk_mod_pause(uuid, integer, text) from public;
grant execute on function public.talk_mod_pause(uuid, integer, text) to authenticated;

-- Moderators also see hidden posts, so they can put them back.
drop policy if exists "Anyone can read talk" on public.talk_posts;
create policy "Anyone can read talk"
  on public.talk_posts for select to anon, authenticated
  using (not hidden or author_id = (select auth.uid()) or public.is_talk_mod());

alter table public.talk_agreements enable row level security;
drop policy if exists "Members can see their own agreement" on public.talk_agreements;
create policy "Members can see their own agreement"
  on public.talk_agreements for select to authenticated using (member_id = (select auth.uid()));
drop policy if exists "Members can agree to the rules" on public.talk_agreements;
create policy "Members can agree to the rules"
  on public.talk_agreements for insert to authenticated with check (member_id = (select auth.uid()));

alter table public.talk_pauses enable row level security;
drop policy if exists "Members can see their own pause" on public.talk_pauses;
create policy "Members can see their own pause"
  on public.talk_pauses for select to authenticated using (member_id = (select auth.uid()));

alter table public.talk_moderators enable row level security;
alter table public.talk_mod_log enable row level security;

revoke all on public.talk_agreements, public.talk_moderators, public.talk_pauses, public.talk_mod_log from anon, authenticated;
grant select on public.talk_agreements to authenticated;
grant insert (version) on public.talk_agreements to authenticated;
grant select on public.talk_pauses to authenticated;
grant select, insert, update, delete on public.talk_agreements, public.talk_moderators, public.talk_pauses to service_role;
grant select on public.talk_mod_log to service_role;

-- Everything posted at the top of a room is an idea now.
update public.talk_posts set kind = 'idea' where kind = 'post';
