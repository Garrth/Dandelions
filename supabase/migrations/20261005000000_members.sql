-- Members: one row per person who pledges.
-- Supabase Auth (auth.users) holds the email and whether it's confirmed.
-- This table holds the rest: ZIP, age confirmation, and referral codes.

create table public.members (
  id uuid primary key references auth.users (id) on delete cascade,
  zip text not null check (zip ~ '^[0-9]{5}$'),
  age_confirmed_at timestamptz not null,
  -- Each member's own code for their referral link. No point value attached.
  referral_code text not null unique default substr(md5(gen_random_uuid()::text), 1, 8),
  -- The code of whoever referred them, if any.
  referred_by text,
  created_at timestamptz not null default now()
);

create index members_zip_idx on public.members (zip);

-- Members can read their own row and nothing else.
-- Nobody can write to this table from the website; rows only come from the trigger below.
alter table public.members enable row level security;

create policy "Members can read their own row"
  on public.members for select
  to authenticated
  using ((select auth.uid()) = id);

-- When someone signs up, copy what they entered into members.
-- Refuses the signup if the ZIP is missing or they didn't confirm they're 18+.
create function public.handle_new_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  ref text := lower(meta ->> 'referred_by');
begin
  if coalesce((meta ->> 'age_confirmed')::boolean, false) is not true then
    raise exception 'Must confirm age 18 or older';
  end if;

  if ref is not null and not exists (select 1 from public.members m where m.referral_code = ref) then
    ref := null;
  end if;

  insert into public.members (id, zip, age_confirmed_at, referred_by)
  values (new.id, meta ->> 'zip', now(), ref);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_member();
