# Setup: the bot check on the pledge and log-in forms

Cloudflare Turnstile checks that a person, not a script, is pledging or logging in. Most people never see it.
Supabase checks the answer before it sends any email, so scripts can't use up the email limit or make fake accounts in bulk.
It's free. Do these in order. The order matters: if Supabase asks for the check before the site sends it, nobody can log in.

## 1. Make the Turnstile widget

1. Sign up at https://dash.cloudflare.com/sign-up (free plan).
2. Click **Turnstile**, then **Add widget**.
3. Name: `Dandelions`. Hostnames: `www.dandelions.lol`, `dandelions.lol`, `dandelions-7z9yf.ondigitalocean.app`.
4. Widget mode: **Managed**. Pre-clearance: **No**. Click **Create**.
5. Keep the page open. The **Site Key** is public. The **Secret Key** is private: never paste it in chat or in the repo.

## 2. Put the Site Key on the site

The Site Key goes in `public/js/config.js` as `turnstileSiteKey`. Merge the pull request that adds it and wait a few minutes for DigitalOcean to publish the site.

## 3. Turn it on in Supabase

1. In Supabase (project **dandelions**), go to **Authentication**, then **Attack Protection** (in some versions, **Settings**, then **Bot and Abuse Protection**).
2. Turn on **Enable Captcha protection**.
3. Provider: **Turnstile by Cloudflare**.
4. Secret: paste the **Secret Key** from step 1.
5. Save.

## 4. Try it

1. Open https://www.dandelions.lol/app/login.html in a private window and log in. It should work as before.
2. Pledge with a new test email on the home page. You should get the email.

If log-in says "We couldn't confirm you're a person", check the hostnames in Cloudflare match the address in your browser bar.

## To turn it off in an emergency

In Supabase, turn **Enable Captcha protection** off. The site keeps working without it.
