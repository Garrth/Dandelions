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
