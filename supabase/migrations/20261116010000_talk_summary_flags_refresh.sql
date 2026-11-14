-- Talk: a "This summary is off" note makes Rai rewrite the summary the next time someone opens it.
-- Run once in the Supabase SQL Editor (project dandelions), after talk_rai_2.sql. Safe to run again.
create or replace function public.talk_summary_claim(p_topic uuid)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  c record;
  s public.talk_summaries;
begin
  select * into c from public.talk_topic_counts(p_topic);
  if c.messages < 3 then return false; end if;
  insert into public.talk_summaries (topic_id, messages, made_at) values (p_topic, 0, '-infinity') on conflict (topic_id) do nothing;
  update public.talk_summaries set locked_until = now() + interval '3 minutes'
    where topic_id = p_topic and locked_until < now()
      and (messages = 0 or flags > 0 or c.messages - messages >= 10 or (c.messages <> messages and made_at < now() - interval '1 day'))
    returning * into s;
  return s.topic_id is not null;
end;
$$;
revoke all on function public.talk_summary_claim(uuid) from public, anon, authenticated;
grant execute on function public.talk_summary_claim(uuid) to service_role;
