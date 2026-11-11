-- Profile, part 2: visible or private, a photo, skills with an hourly rate, availability,
-- and the member's permissions (roles) shown as badges.
-- Run once in the Supabase SQL Editor, after the earlier migrations. Safe to run again.

-- New profile fields.
alter table public.profiles add column if not exists visible boolean not null default false;
alter table public.profiles add column if not exists has_work boolean not null default false;
alter table public.profiles add column if not exists reach_out boolean not null default false;
alter table public.profiles add column if not exists photo_path text check (photo_path is null or char_length(photo_path) <= 200);
-- Skills as a list of {"name": "Drywall repair", "rate": 45}. The rate is dollars an hour and optional.
alter table public.profiles add column if not exists skills jsonb not null default '[]'::jsonb;
do $$ begin
  alter table public.profiles add constraint profiles_skills_list
    check (jsonb_typeof(skills) = 'array' and jsonb_array_length(skills) <= 20);
exception when duplicate_object then null; end $$;

-- Carry over the skills people already typed in "What I can do".
update public.profiles
set skills = (select coalesce(jsonb_agg(jsonb_build_object('name', s)), '[]'::jsonb) from unnest(can_do) s)
where skills = '[]'::jsonb and cardinality(can_do) > 0;

-- True when the signed-in member passed the ID check.
create or replace function public.is_verified()
returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.id_checks where member_id = (select auth.uid()) and status = 'passed'); $$;
revoke all on function public.is_verified() from public;
grant execute on function public.is_verified() to authenticated;

-- ID-checked members can see other members' profiles, but only the ones set to visible.
drop policy if exists "Verified members can read visible profiles" on public.profiles;
create policy "Verified members can read visible profiles"
  on public.profiles for select to authenticated
  using (visible and public.is_verified());

-- Roles given by hand for now, for example:
--   insert into public.member_roles (member_id, role, note) values ('<member id>', 'keeper', 'Founding keeper');
-- Roles: checker, keeper, node_operator, project_owner, organizer.
create table if not exists public.member_roles (
  member_id uuid not null references public.members (id) on delete cascade,
  role text not null check (role in ('checker', 'keeper', 'node_operator', 'project_owner', 'organizer')),
  note text check (note is null or char_length(note) <= 200),
  granted_at timestamptz not null default now(),
  primary key (member_id, role)
);
alter table public.member_roles enable row level security;
drop policy if exists "Members can read their own roles" on public.member_roles;
create policy "Members can read their own roles"
  on public.member_roles for select to authenticated
  using ((select auth.uid()) = member_id);
revoke all on public.member_roles from anon, authenticated;
grant select on public.member_roles to authenticated;

-- Everything the profile needs to light up the badges, in one call.
create or replace function public.my_permissions()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'pledged', exists (select 1 from public.members where id = (select auth.uid())),
    'verified', exists (select 1 from public.id_checks where member_id = (select auth.uid()) and status = 'passed'),
    'business', exists (select 1 from public.businesses where owner_id = (select auth.uid()) and status <> 'not_listed')
             or exists (select 1 from public.listing_claims where member_id = (select auth.uid()) and status = 'verified'),
    'moderator', exists (select 1 from public.talk_moderators where member_id = (select auth.uid())),
    'roles', coalesce((select jsonb_agg(role order by role) from public.member_roles where member_id = (select auth.uid())), '[]'::jsonb)
  );
$$;
revoke all on function public.my_permissions() from public;
grant execute on function public.my_permissions() to authenticated;

-- Profile photos. A private bucket: each member uploads to their own folder (<member id>/photo.jpg).
-- The owner can always see their photo. Other members see it only when they passed the ID check
-- and the owner's profile is set to visible.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 524288, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = 524288, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "Members upload their own photo" on storage.objects;
create policy "Members upload their own photo"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Members replace their own photo" on storage.objects;
create policy "Members replace their own photo"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Members remove their own photo" on storage.objects;
create policy "Members remove their own photo"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Who can see a profile photo" on storage.objects;
create policy "Who can see a profile photo"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'avatars' and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (public.is_verified() and exists (
        select 1 from public.profiles p where p.id::text = (storage.foldername(name))[1] and p.visible))
    )
  );
