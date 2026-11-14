-- Talk: @Rai. Rai never joins a conversation on his own. Anyone can write @Rai in a post or comment to ask him
-- something, and he answers that one message, once, in public. Moderators can hide his answers like any post.
-- Run once in the Supabase SQL Editor (project dandelions), after talk_summary_flags_refresh.sql. Safe to run again.

create table if not exists public.talk_rai_replies (
  id uuid primary key default gen_random_uuid(),
  -- The post the thread belongs to, and the message that asked.
  post_id uuid not null references public.talk_posts (id) on delete cascade,
  asked_by uuid not null unique references public.talk_posts (id) on delete cascade,
  body text not null default '' check (char_length(body) <= 3000),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists talk_rai_replies_post_idx on public.talk_rai_replies (post_id, created_at);

-- Should Rai answer this message? Only if it says @Rai, is less than an hour old, is still up, and hasn't been
-- answered. Holds the spot so Rai answers once. Returns the thread's post id, or nothing.
create or replace function public.talk_rai_claim(p_post uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  m public.talk_posts;
  root uuid;
begin
  select * into m from public.talk_posts where id = p_post;
  if m.id is null or m.deleted or m.hidden or m.created_at < now() - interval '1 hour' then return null; end if;
  if (coalesce(m.title, '') || ' ' || coalesce(m.body, '')) !~* '(^|[^a-z0-9_])@rai([^a-z0-9_]|$)' then return null; end if;
  root := coalesce(m.parent_id, m.id);
  insert into public.talk_rai_replies (post_id, asked_by) values (root, m.id) on conflict (asked_by) do nothing;
  if not found then
    -- A try that failed more than 3 minutes ago can be tried again.
    delete from public.talk_rai_replies where asked_by = m.id and body = '' and created_at < now() - interval '3 minutes';
    if not found then return null; end if;
    insert into public.talk_rai_replies (post_id, asked_by) values (root, m.id);
  end if;
  return root;
end;
$$;
revoke all on function public.talk_rai_claim(uuid) from public, anon, authenticated;
grant execute on function public.talk_rai_claim(uuid) to service_role;

-- Moderators can hide or put back one of Rai's answers. Logged.
create or replace function public.talk_mod_hide_rai(p_reply uuid, p_hide boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_talk_mod() then raise exception 'not_a_moderator'; end if;
  update public.talk_rai_replies set hidden = p_hide where id = p_reply;
  insert into public.talk_mod_log (mod_id, action, post_id, note)
    select (select auth.uid()), case when p_hide then 'hide_rai' else 'put_back_rai' end, post_id, left(body, 300) from public.talk_rai_replies where id = p_reply;
end;
$$;
revoke all on function public.talk_mod_hide_rai(uuid, boolean) from public;
grant execute on function public.talk_mod_hide_rai(uuid, boolean) to authenticated;

alter table public.talk_rai_replies enable row level security;
drop policy if exists "Anyone can read Rai's answers" on public.talk_rai_replies;
create policy "Anyone can read Rai's answers" on public.talk_rai_replies for select to anon, authenticated
  using (body <> '' and (not hidden or public.is_talk_mod()));
revoke all on public.talk_rai_replies from anon, authenticated;
grant select on public.talk_rai_replies to anon, authenticated;
grant select, insert, update, delete on public.talk_rai_replies to service_role;
