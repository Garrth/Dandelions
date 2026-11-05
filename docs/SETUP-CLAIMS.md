# Setup: claiming a listing by phone code

Owners claim a directory listing with a code sent to the phone on the listing, by text or voice call.
The codes go through Twilio Verify (about 5 cents per code). Do these once, in order.

## 1. Run the database change

1. Open https://supabase.com/dashboard/project/utduohtyjbbcnzxfmutp/sql/new and check that the project name at the top says **dandelions**.
2. Paste everything in `supabase/migrations/20261105000000_listing_claims.sql` and click **Run**.
3. You should see "Success. No rows returned."

## 2. Make a Twilio account

1. Sign up at https://www.twilio.com/try-twilio with your personal email. Verify your email and your own cell phone when it asks.
2. In the Twilio Console, the **Account Info** box shows your **Account SID** (starts with `AC`) and **Auth Token** (click to show). Don't paste the token in chat or anywhere in the repo. It goes only into Supabase in step 3.
3. Go to **Explore Products**, then **Verify**, then **Services**, then **Create new**. Name it `Dandelions`, turn on **SMS** and **Voice**, and save. Copy its **Service SID** (starts with `VA`).
4. A new account is a trial. A trial only sends codes to phones you've verified in Twilio, which is fine for testing. To send codes to any business, click **Upgrade** and add a card (a $20 balance lasts about 400 codes).

## 3. Save the Twilio details in Supabase

1. In Supabase, go to **Edge Functions**, then **Secrets**.
2. Add these:

| Name | Value |
| --- | --- |
| `TWILIO_ACCOUNT_SID` | the `AC...` Account SID |
| `TWILIO_AUTH_TOKEN` | the Auth Token |
| `TWILIO_VERIFY_SID` | the `VA...` Service SID |
| `CLAIM_TEST_PHONE` | your own cell number, like `+17075551234` (only while testing) |

While `CLAIM_TEST_PHONE` is set, every code goes to that phone instead of the business, so you can test on any listing. Delete it when you're ready for real claims.

## 4. Add the claim function

1. In Supabase, go to **Edge Functions**, then **Deploy a new function**, then **Via Editor**.
2. Name it exactly `claim`.
3. Delete the sample code, paste everything in `supabase/functions/claim/index.ts`, and click **Deploy**.
4. Leave **Verify JWT** turned on.

## 5. Try it

1. Log in at https://www.dandelions.lol/app/login.html.
2. Open any listing in the directory and click **Claim it** at the bottom.
3. Pick **Text me the code**. The text comes to your test phone. Type the code. You should see **It's yours**.
4. Go back to the listing. It should say **Claimed by owner**.

## Looking after claims

See claims and help requests in the SQL Editor:

```sql
-- Newest claims, including codes that never got typed in
select created_at, listing_name, channel, status, tries from public.listing_claims order by created_at desc limit 50;

-- Claims waiting for a person (a member's 4th claim and up)
select * from public.listing_claims where status = 'review';

-- "This isn't our number" requests to call back
select created_at, listing_name, contact, note from public.claim_help where status = 'open' order by created_at;
```

To approve a claim waiting for review: `update public.listing_claims set status = 'verified' where id = '...';`
To close a help request: `update public.claim_help set status = 'done' where id = '...';`
To take a listing away from someone: `update public.listing_claims set status = 'expired' where id = '...';`
