// Claiming a directory listing with a code sent to the listing's own phone, by text or voice call.
// Codes go through Twilio Verify. The phone always comes from the published listing, never from the
// person asking, so nobody can send the code to their own number.
// The site calls this with {"action": "start", fips, family, id, channel} and then
// {"action": "check", claimId, code}.
// One file on purpose, so it can be pasted into the Supabase dashboard editor.

export const MAX_STARTS_PER_DAY = 10; // code requests per member per day
export const MAX_TRIES = 5; // wrong codes per claim
export const CODE_MINUTES = 10; // Twilio codes last 10 minutes

// "(707) 555-1234" -> "+17075551234", or "" if it isn't a US number.
export function e164(phone) {
  const d = String(phone || "").replace(/\D/g, "");
  if (d.length === 10) return "+1" + d;
  if (d.length === 11 && d[0] === "1") return "+" + d;
  return "";
}

const ok = (s, re) => typeof s === "string" && re.test(s);

// deps: { isMember(id), listing(fips, family, id), ownerOf(fips, id), startsToday(memberId),
//   saveClaim(fields) -> id, getClaim(id), updateClaim(id, fields),
//   sendCode(to, channel) -> bool, checkCode(to, code) -> bool, testPhone, testPhoneBad }
export async function startClaim(deps, user, body) {
  const { fips, family, id, channel } = body || {};
  if (!ok(fips, /^[0-9]{5}$/) || !ok(family, /^[a-z0-9_]{1,60}$/) || !ok(id, /^[A-Za-z0-9-]{1,80}$/) || !["sms", "call"].includes(channel))
    return { error: "bad_request" };
  if (!(await deps.isMember(user.id))) return { error: "not_a_member" };
  const listing = await deps.listing(fips, family, id);
  if (!listing) return { error: "no_listing" };
  const phone = e164(listing.phone);
  if (!phone) return { error: "no_phone" };
  const owner = await deps.ownerOf(fips, id);
  if (owner) return owner === user.id ? { status: "verified" } : { error: "already_claimed" };
  if ((await deps.startsToday(user.id)) >= MAX_STARTS_PER_DAY) return { error: "too_many" };
  // A test phone that's set but not a real number would quietly text the business. Stop instead.
  if (deps.testPhoneBad) return { error: "test_phone_bad" };
  // While testing (Twilio trial accounts only reach numbers you've verified), codes go to the test phone.
  if (!(await deps.sendCode(deps.testPhone || phone, channel))) return { error: "send_failed" };
  const claimId = await deps.saveClaim({ member_id: user.id, county_fips: fips, family, listing_id: id, listing_name: listing.name, phone, channel });
  return { claimId, last4: phone.slice(-4), channel };
}

export async function checkClaim(deps, user, body) {
  const { claimId, code } = body || {};
  if (!ok(claimId, /^[0-9a-f-]{36}$/) || !ok(code, /^[0-9]{4,10}$/)) return { error: "bad_request" };
  const claim = await deps.getClaim(claimId);
  if (!claim || claim.member_id !== user.id) return { error: "no_claim" };
  if (claim.status === "verified" || claim.status === "review") return { status: claim.status };
  if (claim.status !== "pending") return { error: "expired" };
  if (Date.now() - new Date(claim.created_at).getTime() > CODE_MINUTES * 60000) {
    await deps.updateClaim(claimId, { status: "expired" });
    return { error: "expired" };
  }
  if (claim.tries >= MAX_TRIES) return { error: "too_many_tries" };
  if (!(await deps.checkCode(deps.testPhone || claim.phone, code))) {
    const tries = claim.tries + 1;
    await deps.updateClaim(claimId, { tries });
    return { error: "wrong_code", triesLeft: MAX_TRIES - tries };
  }
  const owner = await deps.ownerOf(claim.county_fips, claim.listing_id);
  if (owner && owner !== user.id) return { error: "already_claimed" };
  // No one approves claims by hand: the code from the listing's own phone is the check.
  await deps.updateClaim(claimId, { status: "verified", verified_at: new Date().toISOString() });
  return { status: "verified" };
}

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const reply = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

// Returns the signed-in user and what the claim needs, or null if not signed in.
export async function setup(req) {
  const { createClient } = await import("jsr:@supabase/supabase-js@2");
  const env = (k) => Deno.env.get(k);
  const asUser = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
  });
  const { data } = await asUser.auth.getUser();
  if (!data || !data.user) return null;

  const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
  const site = env("SITE_URL") || "https://www.dandelions.lol";
  const verify = "https://verify.twilio.com/v2/Services/" + env("TWILIO_VERIFY_SID");
  const auth = "Basic " + btoa(env("TWILIO_ACCOUNT_SID") + ":" + env("TWILIO_AUTH_TOKEN"));
  const twilio = async (path, form) => {
    const res = await fetch(verify + path, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(form),
    });
    const json = await res.json().catch(() => ({}));
    // Only the status and Twilio's error code are logged, never the phone number or code.
    if (!res.ok) console.error("twilio", path, res.status, json.code);
    return res.ok ? json : null;
  };
  const files = {};

  return {
    user: { id: data.user.id },
    deps: {
      testPhone: e164(env("CLAIM_TEST_PHONE") || ""),
      testPhoneBad: !!(env("CLAIM_TEST_PHONE") || "").trim() && !e164(env("CLAIM_TEST_PHONE")),
      async isMember(id) {
        const { data } = await admin.from("members").select("id").eq("id", id).maybeSingle();
        return !!data;
      },
      // The listing as the directory shows it: [id, name, type, lat, lon, address, town, zip, phone, ...]
      async listing(fips, family, id) {
        const url = site + "/data/dir/" + fips + "/fam/" + family + ".json";
        if (!files[url]) files[url] = fetch(url).then((r) => (r.ok ? r.json() : []));
        const row = (await files[url]).find((b) => b[0] === id);
        return row ? { name: row[1], phone: row[8] } : null;
      },
      async ownerOf(fips, id) {
        const { data } = await admin.from("listing_claims").select("member_id")
          .eq("county_fips", fips).eq("listing_id", id).eq("status", "verified").maybeSingle();
        return data ? data.member_id : null;
      },
      async startsToday(memberId) {
        const since = new Date(Date.now() - 86400000).toISOString();
        const { count } = await admin.from("listing_claims").select("id", { count: "exact", head: true })
          .eq("member_id", memberId).gte("created_at", since);
        return count || 0;
      },
      async saveClaim(fields) {
        const { data } = await admin.from("listing_claims").insert(fields).select("id").single();
        return data.id;
      },
      async getClaim(id) {
        const { data } = await admin.from("listing_claims").select("*").eq("id", id).maybeSingle();
        return data;
      },
      async updateClaim(id, fields) {
        await admin.from("listing_claims").update(fields).eq("id", id);
      },
      async sendCode(to, channel) {
        return !!(await twilio("/Verifications", { To: to, Channel: channel }));
      },
      async checkCode(to, code) {
        const res = await twilio("/VerificationCheck", { To: to, Code: code });
        return !!res && res.status === "approved";
      },
    },
  };
}

// Runs only on Supabase (Deno). Tests import the functions above without starting a server.
if (typeof Deno !== "undefined") {
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
    const ctx = await setup(req);
    if (!ctx) return reply({ error: "not_signed_in" }, 401);
    const body = await req.json().catch(() => ({}));
    try {
      if (body.action === "start") { const out = await startClaim(ctx.deps, ctx.user, body); return reply(out, out.error ? 400 : 200); }
      if (body.action === "check") { const out = await checkClaim(ctx.deps, ctx.user, body); return reply(out, out.error ? 400 : 200); }
    } catch (e) {
      console.error("claim", body.action, e && e.message);
      return reply({ error: "server" }, 500);
    }
    return reply({ error: "unknown_action" }, 400);
  });
}
