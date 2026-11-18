-- Small limits, from the security review (items 2.3, 2.4, 2.5).
-- Run once in the Supabase SQL Editor (project dandelions), after talk_flag_limits.sql. Safe to run again.
--
--   1. A baseline's final wording needs at least 10 votes. Too few: the final check runs once more, then it ends.
--   2. Size caps on things members type that had none: listing hours and photo paths, profile skills and certificates.
--      The anonymous ideas box takes at most 500 ideas a day for the whole site.
--   3. Nobody can call themselves Rai, Moderator, Admin, Dandelions, Support, Staff or Official.

-- ---- 1. Final check needs enough votes ----
alter table public.baseline_settings add column if not exists final_min_votes integer not null default 10;
alter table public.baseline_proposals add column if not exists final_extended boolean not null default false;

-- ---- 2. Size caps ----
do $$ begin
  alter table public.listing_details add constraint listing_details_hours_size
    check (hours is null or (jsonb_typeof(hours) = 'object' and pg_column_size(hours) <= 2000)) not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.listing_details add constraint listing_details_photos_size
    check (char_length(array_to_string(photos, '')) <= 1000) not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.profiles add constraint profiles_can_do_size
    check (char_length(array_to_string(can_do, '')) <= 1200) not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.profiles add constraint profiles_certs_size
    check (char_length(array_to_string(certs, '')) <= 1200) not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.profiles add constraint profiles_skills_size
    check (pg_column_size(skills) <= 4000) not valid;
exception when duplicate_object then null; end $$;

-- The ideas box: anyone can add one, so the whole site takes at most 500 a day.
create or replace function public.ideas_daily_cap()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if (select count(*) from public.ideas where created_at > now() - interval '1 day') >= 500 then
    raise exception 'ideas_full' using hint = 'The ideas box is full for today. Try again tomorrow.';
  end if;
  return new;
end;
$$;
drop trigger if exists ideas_daily_cap on public.ideas;
create trigger ideas_daily_cap before insert on public.ideas
  for each row execute function public.ideas_daily_cap();
create index if not exists ideas_created_idx on public.ideas (created_at);

-- ---- 3. Names nobody can use ----
create or replace function public.profiles_reserved_name()
returns trigger
language plpgsql set search_path = ''
as $$
declare
  w text := lower(regexp_replace(split_part(trim(coalesce(new.display_name, '')), ' ', 1), '[^a-zA-Z]', '', 'g'));
begin
  if new.display_name is not null and (tg_op = 'INSERT' or new.display_name is distinct from old.display_name)
     and (w in ('rai', 'raindy', 'moderator', 'mod', 'admin', 'administrator', 'dandelions', 'dandelion', 'support', 'staff', 'official', 'system')
          or lower(new.display_name) ~ '(moderator|dandelions team|official)') then
    raise exception 'reserved_name' using hint = 'That name is kept for the site. Please pick another.';
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_reserved_name on public.profiles;
create trigger profiles_reserved_name before insert or update of display_name on public.profiles
  for each row execute function public.profiles_reserved_name();

-- ---- 1, continued: baseline_tick with the final vote minimum. Copied from talk_flag_limits.sql. ----
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

  -- Final check over: make it permanent, or send it back to Rai. Too few votes: run the check once more, then end.
  for p in select * from public.baseline_proposals where status = 'final' and final_until <= now() for update loop
    select count(*) filter (where choice = 'yes'), count(*) filter (where choice = 'no'), count(*) filter (where choice = 'pass')
      into y, n, ps from public.baseline_votes where proposal_id = p.id and stage = 'final' and round = p.final_round;
    if y + n + ps < s.final_min_votes then
      if not p.final_extended then
        update public.baseline_proposals set final_extended = true, final_until = now() + make_interval(days => s.final_days),
          final_yes = y, final_no = n, final_pass = ps where id = p.id;
      else
        update public.baseline_proposals set status = 'failed', closed_at = now(), final_yes = y, final_no = n, final_pass = ps,
          result_note = 'Fewer than ' || s.final_min_votes || ' votes on the final wording' where id = p.id;
      end if;
    elsif y > n then
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
      update public.baseline_proposals set status = 'writing', writing_at = null, final_extended = false, final_yes = y, final_no = n, final_pass = ps where id = p.id;
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
