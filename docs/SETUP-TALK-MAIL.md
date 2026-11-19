# Setup: follow topics, Talk emails, and the phone app

## What it does

- **Follow topic** button at the top of every Talk topic. The bell rings for each new post and comment in topics you follow.
- **Emails when the bell rings.** One short email with links, at most one every 15 minutes per person (anything more is bundled into the next one). Rings already seen in the bell aren't emailed. Everyone starts with emails on. To turn them off: untick **Email me too** in the bell, or tap **Stop these emails** in any email (works without logging in). Mail apps also get a one-click unsubscribe button.
- **Phone app.** The site can be added to a phone's home screen and opens full screen with its own icon. Help page: `/app/install.html`.

## One-time setup (3 steps)

1. **SQL.** Run `supabase/migrations/20261120000000_talk_topic_follows_email.sql` in the SQL Editor (project dandelions). Safe to run again.
2. **Function.** Edge Functions > Deploy a new function > Via Editor. Name it `talk-mail`, paste all of `supabase/functions/talk-mail/index.ts`, and deploy. Then open the function's settings and turn **off** "Verify JWT".
3. Nothing else. It uses the `RESEND_API_KEY` secret Rai already has. The GitHub Action **Talk emails** (`.github/workflows/talk-mail.yml`) runs every 15 minutes to send anything left over.

## Limits to know

- Resend's free plan sends 100 emails a day and 3,000 a month, for all of the site's emails together (sign-up links too). Fine for an early look with 25 people. Upgrade to Resend Pro before the public launch.
- GitHub can run scheduled actions a few minutes late. Emails right after a post or comment go out right away; only bundled leftovers wait for the action.

## Checking it

```sql
-- Bell rings waiting to be emailed
select member_id, kind, from_name, at from public.talk_notices where emailed_at is null order by at desc;
-- Who has emails off
select member_id from public.talk_mail where not email_on;
```

Function logs: Edge Functions > talk-mail > Logs.
