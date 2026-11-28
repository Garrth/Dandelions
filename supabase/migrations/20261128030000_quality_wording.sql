-- Quality of life baseline: drop the "take them with a grain of salt" sentence about members' numbers.
-- Run once in the Supabase SQL Editor (project dandelions), after 20261128020000_ei_check.sql. Safe to run again.
do $$
declare
  old_s text := ' Members'' numbers are what people typed in, so take them with a grain of salt.';
begin
  update public.baselines set body = replace(body, old_s, ''), updated_at = now()
    where key = 'quality' and version = 1 and position(old_s in body) > 0;
  update public.baseline_versions set body = replace(body, old_s, '')
    where baseline_key = 'quality' and version = 1 and position(old_s in body) > 0;
end $$;
