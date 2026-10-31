# Stage 1 setup: log-in, profile and the Plaid ID check

Do these once, in order, after the stage 1 PR is merged. Each step is small.

## 1. Run the database change

1. Open Supabase, project **dandelions**, then **SQL Editor**, then **New query**.
2. Paste everything in `supabase/migrations/20261031000000_profiles_id_checks.sql` and click **Run**.
3. You should see "Success. No rows returned."

## 2. Let log-in links land on the profile page

1. In Supabase, go to **Authentication**, then **URL Configuration**.
2. Under **Redirect URLs**, click **Add URL** and add `https://www.dandelions.lol/app/`
3. Save.

## 3. Get the Plaid details (Equitide's Plaid account)

1. Log in to the Plaid Dashboard.
2. Go to **Identity Verification** and make a template for Dandelions, or pick the one to reuse. Copy its **template ID** (it starts with `idvtmp_`).
3. Go to **Developers**, then **Keys**. You'll need the **client_id** and the **Sandbox** secret.
4. Don't paste the secret in chat or anywhere in the repo. It goes only into Supabase in the next step.

## 4. Save the Plaid details in Supabase

1. In Supabase, go to **Edge Functions**, then **Secrets** (sometimes under **Manage secrets**).
2. Add these four:

| Name | Value |
| --- | --- |
| `PLAID_CLIENT_ID` | the client_id |
| `PLAID_SECRET` | the Sandbox secret |
| `PLAID_ENV` | `sandbox` |
| `PLAID_TEMPLATE_ID` | the `idvtmp_` template ID |

## 5. Add the ID check function

1. In Supabase, go to **Edge Functions**, then **Deploy a new function**, then **Via Editor**.
2. Name it exactly `idv`.
3. Delete the sample code, paste everything in `supabase/functions/idv/index.ts`, and click **Deploy**.
4. Leave **Verify JWT** turned on.

## 6. Try it

1. Go to `https://www.dandelions.lol/app/login.html` and log in with the email you pledged with.
2. Click **Check my ID**. In Sandbox, Plaid shows test screens; use Plaid's sandbox test person.
3. The card should change to **ID checked**.

## Going live later

When Plaid approves production for Identity Verification, change two secrets: `PLAID_ENV` to `production`, and `PLAID_SECRET` to the Production secret. Nothing else changes.
