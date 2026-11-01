-- Businesses list right away. The owner ticks a box confirming they hold a valid license
-- (city business license, contractor's license, or similar). No hand check queue.
-- 'not_listed' stays for taking a business down if there's a problem. Safe to run once.

alter table public.businesses
  add column license_attested boolean not null default false,
  add column attested_at timestamptz;

-- Businesses waiting for the old hand check are listed now. Their owners get asked to tick the box on their next save.
alter table public.businesses alter column status set default 'listed';
update public.businesses set status = 'listed' where status = 'pending';

grant insert (license_attested) on public.businesses to authenticated;
grant update (license_attested) on public.businesses to authenticated;

create or replace function public.business_defaults()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- A new business, or a save from the website, needs the box ticked.
  if not new.license_attested and (tg_op = 'INSERT' or current_user = 'authenticated') then
    raise exception 'Please confirm the business holds a valid license';
  end if;
  if tg_op = 'INSERT' then
    new.county_fips := (select m.county_fips from public.members m where m.id = new.owner_id);
  end if;
  if new.license_attested and (tg_op = 'INSERT' or not old.license_attested or new.license is distinct from old.license) then
    new.attested_at := now();
  end if;
  new.updated_at := now();
  return new;
end;
$$;
