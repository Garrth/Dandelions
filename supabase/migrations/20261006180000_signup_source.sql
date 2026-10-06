-- Where each signup came from, like ?src=tiktok on the link they used.
-- Run once in the Supabase SQL Editor, after the earlier migrations.

alter table public.members
  add column source text check (source ~ '^[a-z0-9_-]{1,40}$');

create or replace function public.handle_new_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  ref text := lower(meta ->> 'referred_by');
  county text := meta ->> 'county_fips';
  src text := lower(meta ->> 'source');
begin
  if coalesce((meta ->> 'age_confirmed')::boolean, false) is not true then
    raise exception 'Must confirm age 18 or older';
  end if;

  if ref is not null and not exists (select 1 from public.members m where m.referral_code = ref) then
    ref := null;
  end if;

  if county is not null and county !~ '^[0-9]{5}$' then
    county := null;
  end if;

  if src is not null and src !~ '^[a-z0-9_-]{1,40}$' then
    src := null;
  end if;

  insert into public.members (id, zip, age_confirmed_at, referred_by, county_fips, source)
  values (new.id, meta ->> 'zip', now(), ref, county, src);

  if jsonb_typeof(meta -> 'picks') = 'array' then
    insert into public.member_picks (member_id, item_key)
    select new.id, t.key
    from public.todo_items t
    where t.key in (select jsonb_array_elements_text(meta -> 'picks'))
    on conflict do nothing;
  end if;

  return new;
end;
$$;
