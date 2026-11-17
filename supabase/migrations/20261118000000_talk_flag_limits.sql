-- Talk flags, part 2: throwaway accounts can't hide posts or sink a baseline proposal.
-- Run once in the Supabase SQL Editor (project dandelions), after id_check_mode.sql. Safe to run again.
--
-- Why: before this, any 3 accounts could hide any post, and a hidden proposal failed and locked its author out for 30 days.
--   1. Anyone can still flag. Only flags from ID-checked members count toward hiding a post (3 of them).
--      Every flag still shows on the moderators' Flagged list.
--   2. Ten flags a day per member.
--   3. A proposal whose post is hidden before its vote pauses instead of failing. If it's put back, it carries on.
--      If it stays hidden for 7 days, it ends. Once the vote opens, hiding the post doesn't change it (same as before).

-- Same rule as is_verified(), for any member. Only used inside other functions.
create or replace function public.member_verified(p_member uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.id_checks c
    where c.member_id = p_member and c.status = 'passed'
      and (c.plaid_env = 'production' or (c.plaid_env = 'sandbox' and coalesce((select s.sandbox_counts from public.id_check_settings s limit 1), false)))
  );
$$;
revoke all on function public.member_verified(uuid) from public, anon, authenticated;

-- Each flag remembers whether it came from an ID-checked member at the time.
alter table public.talk_flags add column if not exists counts boolean not null default false;

-- When a post was hidden, so a paused proposal can end after 7 days.
alter table public.talk_posts add column if not exists hidden_at timestamptz;
update public.talk_posts set hidden_at = now() where hidden and hidden_at is null;

create or replace function public.talk_hidden_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.hidden and not old.hidden then new.hidden_at := now();
  elsif not new.hidden then new.hidden_at := null;
  end if;
  return new;
end;
$$;
drop trigger if exists talk_hidden_at on public.talk_posts;
create trigger talk_hidden_at before update of hidden on public.talk_posts
  for each row execute function public.talk_hidden_at();

-- Before a flag is saved: the daily limit, and whether it counts. Members can't set these themselves.
create or replace function public.talk_before_flag()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if (select count(*) from public.talk_flags where member_id = new.member_id and at > now() - interval '1 day') >= 10 then
    raise exception 'talk_flag_limit' using hint = 'Ten flags a day is the most. Try again tomorrow.';
  end if;
  new.at := now();
  new.counts := public.member_verified(new.member_id);
  return new;
end;
$$;
drop trigger if exists talk_before_flag on public.talk_flags;
create trigger talk_before_flag before insert on public.talk_flags
  for each row execute function public.talk_before_flag();

-- After a flag: count it, and hide the post once 3 ID-checked members have flagged it (unless a person already left it up).
create or replace function public.talk_count_flags()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.talk_posts set flags = flags + 1,
    hidden = hidden or (not cleared and (select count(*) from public.talk_flags f where f.post_id = new.post_id and f.counts) >= 3)
    where id = new.post_id;
  return null;
end;
$$;

-- Members choose only the post and the reason.
revoke insert on public.talk_flags from authenticated;
grant insert (post_id, reason) on public.talk_flags to authenticated;

-- Moderators: posts with flags nobody has looked at yet, newest flag first, with how many and why.
create or replace function public.talk_mod_flagged()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_talk_mod() then raise exception 'not_moderator'; end if;
  return coalesce((select jsonb_agg(x order by x.last_flag desc) from (
    select p.id, p.parent_id, p.room, p.topic_id, p.author_id, p.author_name, p.title, p.body, p.created_at, p.hidden,
      count(*) as flags, count(*) filter (where f.counts) as id_checked, max(f.at) as last_flag,
      (select jsonb_object_agg(r.reason, r.n) from (select reason, count(*) n from public.talk_flags where post_id = p.id group by reason) r) as reasons
    from public.talk_posts p join public.talk_flags f on f.post_id = p.id
    where not p.deleted and not p.cleared
    group by p.id
    order by max(f.at) desc
    limit 200) x), '[]'::jsonb);
end;
$$;
revoke all on function public.talk_mod_flagged() from public, anon;
grant execute on function public.talk_mod_flagged() to authenticated;

-- Baselines: a proposal whose post is hidden before its vote pauses. Copied from talk_agree.sql with the hidden rules added.
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

  -- A proposal whose Talk post was deleted by its author stops.
  update public.baseline_proposals bp set status = 'failed', closed_at = now(), result_note = 'Withdrawn or removed from Talk'
    where bp.status in ('support', 'discuss')
      and not exists (select 1 from public.talk_posts tp where tp.id = bp.talk_post_id and not tp.deleted);

  -- Hidden before the vote: it pauses. Hidden for 7 days and nobody put it back: it ends.
  update public.baseline_proposals bp set status = 'failed', closed_at = now(), result_note = 'Hidden in Talk for 7 days'
    where bp.status in ('support', 'discuss')
      and exists (select 1 from public.talk_posts tp where tp.id = bp.talk_post_id and tp.hidden and tp.hidden_at < now() - interval '7 days');

  -- Discussion over: open the vote. (Paused while hidden.)
  update public.baseline_proposals bp set status = 'vote', vote_until = now() + make_interval(days => s.vote_days)
    where bp.status = 'discuss' and bp.discuss_until <= now()
      and not exists (select 1 from public.talk_posts tp where tp.id = bp.talk_post_id and tp.hidden);

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
      where bp.status = 'support' and not tp.hidden and tp.backers >= s.support_needed and tp.backers > tp.disagrees
        and not exists (select 1 from public.baseline_proposals o where o.baseline_key = bp.baseline_key and o.status in ('discuss', 'vote', 'writing', 'final'))
      order by bp.baseline_key, bp.created_at
  loop
    update public.baseline_proposals set status = 'discuss', discuss_until = now() + make_interval(days => s.discuss_days) where id = p.id;
  end loop;
end;
$$;
revoke all on function public.baseline_tick() from public;
grant execute on function public.baseline_tick() to anon, authenticated, service_role;
