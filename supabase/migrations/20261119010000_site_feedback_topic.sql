-- Early look: a "Site feedback" topic in Talk, pinned in every place, so testers' notes land in one spot.
-- The Feedback button on every page links to this topic by its id.
-- Run once in the Supabase SQL Editor (project dandelions). Safe to run again.
insert into public.talk_topics (id, room, name, about, pinned, made_by) values
  ('f33db4c0-0000-4000-8000-000000000001', 'any', 'Site feedback',
   'Something broken, confusing or missing? Tell us here. Say which page and what phone or computer you used.', true, 'starter')
on conflict do nothing;
