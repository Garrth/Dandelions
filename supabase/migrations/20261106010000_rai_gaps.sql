-- Rai: questions it couldn't answer, so they can be added to what Rai knows.
-- Only the question (with emails and phone numbers removed) and the page are saved. No name, email or address.
-- A summary is emailed once a day, and saved questions are deleted after 30 days.
-- Run once in the Supabase SQL Editor (project dandelions). Safe to run again.

create table if not exists public.rai_gaps (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  page text,
  question text not null check (length(question) <= 600),
  sent boolean not null default false
);
create index if not exists rai_gaps_unsent on public.rai_gaps (at) where not sent;

create table if not exists public.rai_summaries (
  day date primary key,
  at timestamptz not null default now()
);

-- The first chat of each day (California time) claims that day's summary. Returns the questions to send, or nothing.
create or replace function public.rai_summary_claim(p_keep_days integer default 30)
returns setof public.rai_gaps
language plpgsql security definer set search_path = ''
as $$
declare
  today date := (now() at time zone 'America/Los_Angeles')::date;
begin
  insert into public.rai_summaries (day) values (today) on conflict (day) do nothing;
  if not found then
    return;
  end if;
  delete from public.rai_gaps where sent and at < now() - make_interval(days => greatest(p_keep_days, 1));
  delete from public.rai_summaries where day < today - 60;
  return query
    update public.rai_gaps set sent = true
    where not sent and at < (today::timestamp at time zone 'America/Los_Angeles')
    returning *;
end;
$$;

-- If the email didn't go out, put the questions back so tomorrow's summary includes them.
create or replace function public.rai_summary_release(p_ids bigint[])
returns void
language sql security definer set search_path = ''
as $$
  update public.rai_gaps set sent = false where id = any(p_ids);
$$;

alter table public.rai_gaps enable row level security;
alter table public.rai_summaries enable row level security;
revoke all on public.rai_gaps, public.rai_summaries from anon, authenticated;
grant select, insert, update, delete on public.rai_gaps, public.rai_summaries to service_role;
revoke all on function public.rai_summary_claim(integer), public.rai_summary_release(bigint[]) from public, anon, authenticated;
grant execute on function public.rai_summary_claim(integer), public.rai_summary_release(bigint[]) to service_role;
