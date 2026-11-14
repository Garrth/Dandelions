# Setup: Talk

Run `supabase/migrations/20261105020000_talk.sql`, then `20261105030000_talk_rules_moderators.sql`, once each in the SQL Editor (project dandelions).

## How it works

- Each room is a list of ideas. Under each idea, comments read like a text chat, with the person's first initial and first name.
- Before their first post, a member agrees to the Talk rules (be constructive, ideas not people, no hate, keep it real, keep private things private, stay on topic).
- Rooms: the member's county, their state, everyone nationwide, and two topics
  (What should we work on? and Make the site better).
- Anyone can read. Members who are logged in can post, reply, back ideas and flag.
- A post shows the first name from the member's profile, or "A member" if they haven't added one.
- Nobody approves posts. When 3 different members flag a post, it's hidden. Its author still sees it.
- A member can post up to 30 times a day.
- Deleting a post blanks it but keeps replies in place.

## Looking after Talk

```sql
-- Posts hidden by flags, with why
select p.id, p.room, p.author_name, p.title, p.body, p.flags,
       (select string_agg(reason, ', ') from public.talk_flags f where f.post_id = p.id) as reasons
from public.talk_posts p where p.hidden order by p.created_at desc;

-- Put a hidden post back. It won't be hidden by flags again.
update public.talk_posts set hidden = false, cleared = true where id = '...';
```

## Moderators

Moderators see hidden posts, and on any post they can **Hide**, **Put back** or **Pause 7 days**
(the author can't post for a week). Every action goes in `talk_mod_log`. Moderators can't pause each other.

```sql
-- Make someone a moderator (find their id by email)
insert into public.talk_moderators (member_id, note)
select id, 'Sonoma' from auth.users where email = 'name@example.com';

-- Stop someone being a moderator
delete from public.talk_moderators where member_id = (select id from auth.users where email = 'name@example.com');

-- What moderators have done
select at, action, note, post_id, member_id from public.talk_mod_log order by at desc limit 50;

-- End a pause early
delete from public.talk_pauses where member_id = (select id from auth.users where email = 'name@example.com');
```

## Part 4: Rai reads Talk (summaries and Catching on)

1. Run `supabase/migrations/20261115000000_talk_rai.sql` once in the SQL Editor (project dandelions).
2. Update the `rai` function: in Supabase, Edge Functions > rai > Code, replace everything with
   `supabase/functions/rai/index.ts` and Deploy. Keep Verify JWT off.

How it works:

- **Summary**: each topic has a ✦ Summary button. Rai writes the first summary at 3 posts or comments, then again after
  10 new ones, or once a day if anything is new. It happens when someone opens the Summary, so there's no timer.
  Points link to the posts behind them. Summaries never name people.
- **This summary is off**: members can flag a summary with a note. Rai reads the notes next time. 3 flags shows a warning.
- **Ask Rai about this topic** opens the Rai chat with the topic's summary and newest 80 messages loaded.
  It counts toward the usual 30 questions a day.
- **Catching on**: when someone opens General, Rai groups the last 14 days of General posts into ideas (at most every
  15 minutes, only when something is new). An idea gets its own topic when enough different people took part
  (posted, commented or gave a +1) on enough different days: county 5 people over 2 days, state 10 over 2, whole US 25 over 3.
  Nobody approves it. Its posts move to the new topic, and the person who started it can rename it for a day.
- **Not about this**: an author can take their post out of an idea, and Rai leaves it alone after that.
- Topics for every place (like Automation and work) show posts from every place.
- Background Rai work is capped at 200 a day for the whole site (secret `RAI_BG_CAP` changes it).

```sql
-- Topics that opened on their own
select at, note, topic_id from public.talk_mod_log where action = 'traction_topic' order by at desc;

-- Change the bars: edit public.talk_idea_bar in the SQL file and run that function again.
```
