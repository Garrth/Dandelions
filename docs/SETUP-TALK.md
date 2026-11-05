# Setup: Talk

Run `supabase/migrations/20261105020000_talk.sql` once in the SQL Editor (project dandelions).

## How it works

- Rooms: the member's county, their state, everyone nationwide, and two topics
  (What should we work on? and Make the site better).
- Anyone can read. Members who are logged in can post, reply, back ideas and flag.
- A post shows the name from the member's profile, or "A member" if they haven't added one.
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
