-- Talk, moderators in the open: a Moderator badge on real moderators' posts, and a public log of what moderators did.
-- Run once in the Supabase SQL Editor (project dandelions), after size_caps_names_final_votes.sql. Safe to run again.
--
-- Why: anyone could call themselves a moderator before reserved names, and only the site owner could read the log.
-- Now everyone can see who the moderators are and what they did, and why. Paused members are not named.

-- Who the moderators are. Ids only, so the page can put a badge on their posts.
create or replace function public.talk_moderator_ids()
returns setof uuid
language sql stable security definer set search_path = ''
as $$ select member_id from public.talk_moderators; $$;
revoke all on function public.talk_moderator_ids() from public;
grant execute on function public.talk_moderator_ids() to anon, authenticated;

-- The last 90 days of moderator actions, newest first: when, which moderator (first name), what, the post, and the reason.
-- A paused member is never named. Notes are cut to 300 characters, as they are saved.
create or replace function public.talk_mod_log_public()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(x order by x.at desc), '[]'::jsonb) from (
    select l.at, l.action, l.post_id,
      case when l.action like 'pause%' or l.action = 'unpause' then '' else l.note end as note,
      coalesce(nullif(split_part(trim(coalesce(p.display_name, '')), ' ', 1), ''), 'A moderator') as moderator
    from public.talk_mod_log l left join public.profiles p on p.id = l.mod_id
    where l.at > now() - interval '90 days'
    order by l.at desc
    limit 300) x;
$$;
revoke all on function public.talk_mod_log_public() from public;
grant execute on function public.talk_mod_log_public() to anon, authenticated;
