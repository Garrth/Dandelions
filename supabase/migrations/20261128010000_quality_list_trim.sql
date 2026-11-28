-- Quality of life baseline: take education or paid training, childcare and time off out of the living-wage list
-- (Garth, Nov 28 2026), and point at the new tables below the wording. Version 1 is still fixed in place, since
-- nobody has proposed a change yet. Run once in the Supabase SQL Editor (project dandelions), after
-- 20261128000000_quality_check.sql. Safe to run again.
do $$
declare
  t text;
begin
  for t in select unnest(array['baselines', 'baseline_versions']) loop
    execute format($f$
      update public.%I set body = replace(replace(body,
        E'- Healthcare, including dental, vision and mental health\n- Education or paid training\n- Childcare for working parents\n- Time off to rest',
        E'- Healthcare, including dental, vision and mental health'),
        'The table below shows what each of these costs here, as Rai found it, next to what members say they really pay. Members'' numbers are what people typed in, so take them with a grain of salt.',
        'The tables below show what each of these costs here, as Rai found it, next to what members say they really pay, and the self-check. Members can fill in both, privately. Members'' numbers are what people typed in, so take them with a grain of salt.')
      where %s = 'quality' and version = 1$f$, t, case when t = 'baselines' then 'key' else 'baseline_key' end);
  end loop;
end $$;
