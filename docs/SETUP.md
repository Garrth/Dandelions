# Setting up the Dandelions site

The site is plain HTML, CSS, and JavaScript in the `public` folder. There's no build step.
Supabase stores members and sends sign-in emails (through Resend). DigitalOcean hosts the site.

Do these one at a time. Each one only needs a web browser.

## 1. Create the members table in Supabase

1. Go to https://supabase.com/dashboard and open the **dandelions** project.
2. In the left sidebar, click **SQL Editor**.
3. Click **New query**.
4. Open `supabase/migrations/20261005000000_members.sql` from this repo, copy all of it, and paste it in.
5. Click **Run**. You should see "Success. No rows returned."
6. Do the same with each newer file in `supabase/migrations/`, oldest first (the date is at the start of the file name). Run each one only once.

## 2. Tell Supabase where the site lives

1. In the left sidebar, click **Authentication**, then **URL Configuration**.
2. Set **Site URL** to `https://www.dandelions.lol`
3. Under **Redirect URLs**, click **Add URL** and add `https://www.dandelions.lol/welcome.html`
4. Once DigitalOcean gives the app its own address (step 5), add that too, ending in `/welcome.html`.

## 3. Set the email wording

In **Authentication**, click **Emails** (or **Email Templates**). Update both **Confirm signup** and **Magic Link**.

Subject:

```
Confirm your Dandelions pledge
```

Body:

```html
<p>Thanks for pledging with Dandelions.</p>
<p><a href="{{ .ConfirmationURL }}">Click here to confirm your pledge</a></p>
<p>This link works once and expires soon. If you didn't sign up, you can ignore this email.</p>
<p>Dandelions, dandelions.lol</p>
```

While you're in **Authentication**, check **Rate Limits**. The email limit should be at least 30 per hour so a busy day doesn't block signups.

## 4. Put the Supabase keys in the site

1. In the left sidebar, click **Project Settings** (gear icon), then **API** (or **API Keys**).
2. Copy the **Project URL** and the **publishable** key (it may be called **anon public**).
3. Paste both into `public/js/config.js`, or send them to Claude to add.

These two are safe to publish. Never share the **secret** or **service_role** key.

## 5. Host the site on DigitalOcean

1. Go to https://cloud.digitalocean.com/apps and click **Create App**.
2. Choose **GitHub**, pick the **Garrth/Dandelions** repo, branch **main**. Leave **Autodeploy** on.
3. Set **Source directories** to `/public`. It should detect a **Static Site**.
4. Pick the free static site plan and click **Create**.

## 6. Point dandelions.lol at the site

GoDaddy can't point the bare name `dandelions.lol` at DigitalOcean, so the site lives at `www.dandelions.lol` and GoDaddy forwards the bare name there.

1. In the DigitalOcean app, open the **Networking** tab, click **Add Domain**, enter `www.dandelions.lol`, and pick **You manage your domain**.
2. In GoDaddy DNS, set the `www` CNAME record to the app's `.ondigitalocean.app` address.
3. In GoDaddy, add domain forwarding from `dandelions.lol` to `https://www.dandelions.lol` (Permanent 301, forward only).
4. Keep the existing DMARC and Resend records as they are.

## 7. An inbox for privacy requests

The privacy policy tells people to email `privacy@dandelions.lol`. Set up forwarding for that address to your personal email (GoDaddy has email forwarding under the domain's settings).
