-- Talk: Agree and Disagree replace +1. Only main posts (the ideas) get them; comments are just conversation.
-- Nobody sees who chose which, only the totals. Each post also counts the people taking part (who wrote the post
-- or a comment). A Baselines change now needs more agree than disagree, on top of the agree count, to move on.
-- Run once in the Supabase SQL Editor (project dandelions), after talk_at_rai.sql. Safe to run again.

-- Every +1 so far counts as Agree.
alter table public.talk_backs add column if not exists agree boolean not null default true;
alter table public.talk_posts add column if not exists disagrees integer not null default 0;
alter table public.talk_posts add column if not exists people integer not null default 0;

-- Keep the totals: backers = agree, disagrees = disagree. Changing your mind moves you from one to the other.
create or replace function public.talk_count_backs()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op in ('DELETE', 'UPDATE') then
    update public.talk_posts set backers = greatest(backers - case when old.agree then 1 else 0 end, 0),
      disagrees = greatest(disagrees - case when old.agree then 0 else 1 end, 0) where id = old.post_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    update public.talk_posts set backers = backers + case when new.agree then 1 else 0 end,
      disagrees = disagrees + case when new.agree then 0 else 1 end where id = new.post_id;
  end if;
  return null;
end;
$$;
drop trigger if exists talk_count_backs on public.talk_backs;
create trigger talk_count_backs after insert or delete or update of agree on public.talk_backs
  for each row execute function public.talk_count_backs();

-- Agree or disagree with someone else's main post. Comments don't get them.
drop policy if exists "Members can +1 posts" on public.talk_backs;
drop policy if exists "Members can agree or disagree" on public.talk_backs;
create policy "Members can agree or disagree"
  on public.talk_backs for insert to authenticated
  with check (member_id = (select auth.uid())
    and exists (select 1 from public.talk_posts where id = post_id and parent_id is null and not deleted and author_id <> (select auth.uid())));
drop policy if exists "Members can change their mind" on public.talk_backs;
create policy "Members can change their mind"
  on public.talk_backs for update to authenticated
  using (member_id = (select auth.uid())) with check (member_id = (select auth.uid()));
grant update (agree) on public.talk_backs to authenticated;

-- Old +1s on comments go away (the counts follow).
delete from public.talk_backs b using public.talk_posts p where p.id = b.post_id and p.parent_id is not null;

-- People taking part in a post: whoever wrote it or a comment on it. Each person counts once.
create or replace function public.talk_count_people()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  root uuid := coalesce(new.parent_id, new.id);
begin
  update public.talk_posts t set people = (
    select count(distinct p.author_id) from public.talk_posts p where (p.id = root or p.parent_id = root) and not p.deleted)
    where t.id = root;
  return null;
end;
$$;
drop trigger if exists talk_count_people on public.talk_posts;
create trigger talk_count_people after insert or update of deleted on public.talk_posts
  for each row execute function public.talk_count_people();
update public.talk_posts t set people = (
  select count(distinct p.author_id) from public.talk_posts p where (p.id = t.id or p.parent_id = t.id) and not p.deleted)
  where t.parent_id is null;

-- Baselines: a change needs its agree count and more agree than disagree to start the discussion.
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
      where bp.status = 'support' and tp.backers >= s.support_needed and tp.backers > tp.disagrees
        and not exists (select 1 from public.baseline_proposals o where o.baseline_key = bp.baseline_key and o.status in ('discuss', 'vote', 'writing', 'final'))
      order by bp.baseline_key, bp.created_at
  loop
    update public.baseline_proposals set status = 'discuss', discuss_until = now() + make_interval(days => s.discuss_days) where id = p.id;
  end loop;
end;
$$;
revoke all on function public.baseline_tick() from public;
grant execute on function public.baseline_tick() to anon, authenticated, service_role;

-- The Baselines board shows disagree too, and your own choice.
create or replace function public.baseline_board()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'settings', (select to_jsonb(x) - 'id' from public.baseline_settings x limit 1),
    'me', jsonb_build_object('signed_in', (select auth.uid()) is not null, 'verified', public.is_verified()),
    'baselines', coalesce((select jsonb_agg(jsonb_build_object(
        'key', b.key, 'title', b.title, 'body', b.body, 'version', b.version, 'updated_at', b.updated_at, 'topic_id', b.topic_id,
        'versions', coalesce((select jsonb_agg(jsonb_build_object('version', v.version, 'body', v.body, 'made_at', v.made_at, 'proposal_id', v.proposal_id) order by v.version desc)
                     from public.baseline_versions v where v.baseline_key = b.key and v.version < b.version), '[]'::jsonb)
      ) order by b.position) from public.baselines b), '[]'::jsonb),
    'proposals', coalesce((select jsonb_agg(jsonb_build_object(
        'id', p.id, 'baseline_key', p.baseline_key, 'author_name', p.author_name, 'summary', p.summary, 'new_body', p.new_body,
        'status', p.status, 'talk_post_id', p.talk_post_id, 'created_at', p.created_at,
        'support', coalesce(tp.backers, 0), 'against', coalesce(tp.disagrees, 0), 'comments', coalesce(tp.replies, 0),
        'discuss_until', p.discuss_until, 'vote_until', p.vote_until, 'final_text', p.final_text, 'final_round', p.final_round,
        'final_until', p.final_until, 'result_note', p.result_note, 'closed_at', p.closed_at,
        'yes', p.yes, 'no', p.no, 'pass', p.pass, 'final_yes', p.final_yes, 'final_no', p.final_no, 'final_pass', p.final_pass,
        'ballots', case p.status
          when 'vote' then (select count(*) from public.baseline_votes v where v.proposal_id = p.id and v.stage = 'agree')
          when 'final' then (select count(*) from public.baseline_votes v where v.proposal_id = p.id and v.stage = 'final' and v.round = p.final_round)
          else 0 end,
        'mine', p.author_id = (select auth.uid()),
        'my_agree', (select k.agree from public.talk_backs k where k.post_id = p.talk_post_id and k.member_id = (select auth.uid())),
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
