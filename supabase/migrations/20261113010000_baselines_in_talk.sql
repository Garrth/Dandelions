-- Baselines, part 2: changes happen in Talk. Each baseline gets its own Talk topic, grouped under "Baselines"
-- in the topics column. Proposals, +1s, discussion and votes all happen on the proposal's post in that topic.
-- The Baselines page only shows the current wording and its history.
-- Run once in the Supabase SQL Editor (project dandelions), after baselines.sql. Safe to run again.

-- Topics can sit in a group in the topics column. Only "Baselines" for now.
alter table public.talk_topics add column if not exists section text not null default '' check (char_length(section) <= 30);

-- Each baseline points at its Talk topic.
alter table public.baselines add column if not exists topic_id uuid references public.talk_topics (id) on delete set null;

do $$
declare
  q uuid; pb uuid; ei uuid; old uuid;
begin
  -- Quality of life: reuse the old starter topic "A better quality of life".
  select id into q from public.talk_topics where room = 'any' and lower(name) in ('quality of life', 'a better quality of life') order by (lower(name) = 'quality of life') desc limit 1;
  if q is null then
    insert into public.talk_topics (room, name, made_by) values ('any', 'Quality of life', 'starter') returning id into q;
  end if;
  update public.talk_topics set name = 'Quality of life', section = 'Baselines', pinned = false, archived = false, made_by = 'starter',
    about = 'The quality of life baseline: everyone''s basic needs are met. Talk about it here, and propose changes to its wording.'
    where id = q;

  -- Putting back more than we take: reuse the old starter topic.
  select id into pb from public.talk_topics where room = 'any' and lower(name) = 'putting back more than we take';
  if pb is null then
    insert into public.talk_topics (room, name, made_by) values ('any', 'Putting back more than we take', 'starter') returning id into pb;
  end if;
  update public.talk_topics set section = 'Baselines', pinned = false, archived = false, made_by = 'starter',
    about = 'The areas we measure, like energy, farmland and water, and how each is scored. Talk about it here, and propose changes to its wording.'
    where id = pb;

  -- EI#: new.
  select id into ei from public.talk_topics where room = 'any' and lower(name) = 'ei#';
  if ei is null then
    insert into public.talk_topics (room, name, made_by) values ('any', 'EI#', 'starter') returning id into ei;
  end if;
  update public.talk_topics set section = 'Baselines', pinned = false, archived = false, made_by = 'starter',
    about = 'The Environmental Impact Number: a footprint score from -100 to +100. Talk about it here, and propose changes to its wording.'
    where id = ei;

  update public.baselines set topic_id = q where key = 'quality';
  update public.baselines set topic_id = pb where key = 'putting_back';
  update public.baselines set topic_id = ei where key = 'ei';

  -- The single "Baselines" topic from part 1 goes away. Proposals move to their baseline's topic, anything else to Quality of life.
  select id into old from public.talk_topics where room = 'any' and lower(name) = 'baselines';
  if old is not null then
    update public.talk_posts tp set topic_id = b.topic_id
      from public.baseline_proposals bp join public.baselines b on b.key = bp.baseline_key
      where tp.topic_id = old and (tp.id = bp.talk_post_id or tp.parent_id = bp.talk_post_id);
    update public.talk_posts set topic_id = q where topic_id = old;
    update public.talk_topics set archived = true, pinned = false, posts = 0, section = '' where id = old;
  end if;

  update public.talk_topics t set posts = (select count(*) from public.talk_posts p where p.topic_id = t.id and p.parent_id is null)
    where t.id in (q, pb, ei);
end $$;

-- Proposals now post into their baseline's own topic. The post's text is the summary; Talk shows the wording and the vote.
create or replace function public.baseline_propose(p_key text, p_summary text, p_body text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  b public.baselines;
  s public.baseline_settings := (select x from public.baseline_settings x limit 1);
  pid uuid;
  post uuid;
  nm text;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  select * into b from public.baselines where key = p_key;
  if b.key is null then raise exception 'baseline_none'; end if;
  p_summary := trim(coalesce(p_summary, '')); p_body := trim(coalesce(p_body, ''));
  if char_length(p_summary) < 10 then raise exception 'baseline_summary'; end if;
  if char_length(p_body) < 20 or char_length(p_body) > 8000 then raise exception 'baseline_body'; end if;
  if p_body = b.body then raise exception 'baseline_same'; end if;
  if exists (select 1 from public.baseline_proposals where author_id = uid and baseline_key = p_key and status not in ('passed', 'failed')) then
    raise exception 'baseline_open';
  end if;
  if exists (select 1 from public.baseline_proposals where author_id = uid and baseline_key = p_key and status = 'failed'
             and closed_at > now() - make_interval(days => s.retry_days)) then
    raise exception 'baseline_wait';
  end if;
  if (select count(*) from public.baseline_proposals where author_id = uid and created_at > now() - interval '1 day') >= 3 then
    raise exception 'baseline_limit';
  end if;
  if not exists (select 1 from public.talk_agreements where member_id = uid) then raise exception 'talk_rules'; end if;
  if b.topic_id is null or not exists (select 1 from public.talk_topics where id = b.topic_id and not archived) then raise exception 'talk_no_topic'; end if;
  nm := split_part(trim(coalesce((select display_name from public.profiles where id = uid), '')), ' ', 1);
  insert into public.baseline_proposals (baseline_key, author_id, author_name, summary, new_body)
    values (p_key, uid, coalesce(nullif(left(nm, 60), ''), 'A member'), left(p_summary, 300), p_body)
    returning id into pid;
  insert into public.talk_posts (room, kind, author_id, title, body, topic_id)
    values ('us', 'post', uid, left('Proposed change: ' || b.title, 120), left(p_summary, 300), b.topic_id)
    returning id into post;
  update public.baseline_proposals set talk_post_id = post where id = pid;
  return post;
end;
$$;
revoke all on function public.baseline_propose(text, text, text) from public;
grant execute on function public.baseline_propose(text, text, text) to authenticated;

-- The board now includes each baseline's Talk topic.
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
        'support', coalesce(tp.backers, 0), 'comments', coalesce(tp.replies, 0),
        'discuss_until', p.discuss_until, 'vote_until', p.vote_until, 'final_text', p.final_text, 'final_round', p.final_round,
        'final_until', p.final_until, 'result_note', p.result_note, 'closed_at', p.closed_at,
        'yes', p.yes, 'no', p.no, 'pass', p.pass, 'final_yes', p.final_yes, 'final_no', p.final_no, 'final_pass', p.final_pass,
        'ballots', case p.status
          when 'vote' then (select count(*) from public.baseline_votes v where v.proposal_id = p.id and v.stage = 'agree')
          when 'final' then (select count(*) from public.baseline_votes v where v.proposal_id = p.id and v.stage = 'final' and v.round = p.final_round)
          else 0 end,
        'mine', p.author_id = (select auth.uid()),
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
