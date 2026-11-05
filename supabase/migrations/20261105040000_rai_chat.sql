-- Rai chat: counts questions per day so Rai stays within its limits.
-- Visitors are counted by a scrambled code, never by their address. Rows older than a week are cleared out.
-- Run once in the Supabase SQL Editor (project dandelions). Safe to run again.

create table if not exists public.rai_usage (
  day date not null default current_date,
  key text not null,
  n integer not null default 0,
  primary key (day, key)
);

-- Adds one question for this key today if it's still under the limit. Returns true if it was allowed.
create or replace function public.rai_take(p_key text, p_limit integer)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  used integer;
begin
  insert into public.rai_usage (day, key, n) values (current_date, left(p_key, 80), 0)
    on conflict (day, key) do nothing;
  update public.rai_usage set n = n + 1
    where day = current_date and key = left(p_key, 80) and n < p_limit
    returning n into used;
  if random() < 0.01 then
    delete from public.rai_usage where day < current_date - 7;
  end if;
  return used is not null;
end;
$$;

alter table public.rai_usage enable row level security;
revoke all on public.rai_usage from anon, authenticated;
grant select, insert, update, delete on public.rai_usage to service_role;
revoke all on function public.rai_take(text, integer) from public, anon, authenticated;
grant execute on function public.rai_take(text, integer) to service_role;
