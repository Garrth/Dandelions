-- Online stores, and a note when a business's kind isn't on the list.
-- Run once in the Supabase SQL Editor (project dandelions), after added_listings.sql. Safe to run again.

-- Online only: no storefront. The listing hides the street and Directions and says it shops online.
alter table public.listing_details add column if not exists online_only boolean not null default false;
alter table public.added_listings add column if not exists online_only boolean not null default false;

-- "Not on the list? Tell us what it is." Private: only the team reads it, to add real kinds later.
alter table public.added_listings add column if not exists kind_note text not null default ''
  check (char_length(kind_note) <= 100);

grant select (online_only) on public.added_listings to anon, authenticated;
grant insert (online_only, kind_note) on public.added_listings to authenticated;

-- The take-down rule keeps every other field as it was. Keep these two the same way too.
create or replace function public.added_listing_rules()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if (select count(*) from public.added_listings where added_by = new.added_by and created_at > now() - interval '1 day') >= 5 then
      raise exception 'add_limit' using hint = 'Five businesses a day is the most for one member. Try again tomorrow.';
    end if;
    if (select count(*) from public.added_listings where created_at > now() - interval '1 day') >= 1000 then
      raise exception 'add_site_limit' using hint = 'Lots of businesses were added today. Please try again tomorrow.';
    end if;
    if exists (select 1 from public.added_listings a where a.county_fips = new.county_fips and a.phone = new.phone and a.status = 'live') then
      raise exception 'add_repeat' using hint = 'A business with this phone number was already added here.';
    end if;
    new.name := btrim(new.name); new.town := btrim(new.town); new.address := btrim(new.address); new.kind_note := btrim(new.kind_note);
    new.created_at := now();
    new.status := 'live';
  else
    if old.status = 'removed' then raise exception 'already_removed'; end if;
    new.id := old.id; new.county_fips := old.county_fips; new.family := old.family; new.type_slug := old.type_slug;
    new.name := old.name; new.address := old.address; new.show_street := old.show_street; new.town := old.town;
    new.state := old.state; new.zip := old.zip; new.phone := old.phone; new.website := old.website;
    new.lat := old.lat; new.lon := old.lon; new.added_by := old.added_by; new.created_at := old.created_at;
    new.online_only := old.online_only; new.kind_note := old.kind_note;
    if new.status = 'removed' then
      new.removed_at := now();
      new.removed_by := (select auth.uid());
    end if;
  end if;
  return new;
end;
$$;
