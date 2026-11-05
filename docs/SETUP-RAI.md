# Setting up Ask Rai

Ask Rai is the chat button on every page. It sends the conversation to a Supabase function called `rai`, which asks Claude and sends back the answer.

## What Rai knows

Rai reads `public/rai/knowledge.md` before every chat, plus this week's numbers from `public/data/rai/06097.json`. To change what Rai knows, change that file and merge. No redeploy needed. The rules for how Rai talks are at the top of `supabase/functions/rai/index.ts`.

## One-time setup

1. **Claude API key.** At console.anthropic.com, create an API key just for Rai. Under Limits, set a monthly spend limit you're comfortable with.
2. **Supabase secret.** In the dandelions project: Edge Functions > Secrets > add `ANTHROPIC_API_KEY` with the key.
3. **SQL.** Run `supabase/migrations/20261105040000_rai_chat.sql` in the SQL Editor. Safe to run again.
4. **Function.** Edge Functions > Deploy a new function > Via Editor. Name it `rai`, paste all of `supabase/functions/rai/index.ts`, and deploy. Then open the function's settings and turn **off** "Verify JWT", so visitors who aren't signed in can ask.

## Daily list of questions Rai couldn't answer

When Rai can't answer, it adds a hidden marker. The function strips it, saves just that question (emails and phone numbers removed) and the page, and shows the visitor a note that it was saved. The first chat each day (California time) emails the list from the days before. Saved questions are deleted after 30 days.

1. Run `supabase/migrations/20261106010000_rai_gaps.sql` in the SQL Editor.
2. At resend.com, create an API key with "Sending access" for dandelions.lol.
3. Add Supabase secrets `RESEND_API_KEY` (that key) and `RAI_SUMMARY_TO` (who gets the email; separate several with commas).
4. Redeploy `rai`: Edge Functions > rai > Code, paste the new `index.ts`, Deploy.

Without those two secrets, questions are still saved but no email is sent.

## Optional secrets

| Name | What it changes | Default |
|---|---|---|
| `RAI_MODEL` | Which Claude model answers | claude-haiku-5-5 |
| `RAI_DAILY_CAP` | Questions for the whole site per day | 300 |
| `SITE_URL` | Where Rai reads its knowledge from | https://www.dandelions.lol |

Each visitor can ask 30 questions a day. Visitors are counted by a scrambled code, never by their address. Chats are not saved.

## Checking it

Edge Functions > rai > Logs shows one line per answer with the model and token counts.
