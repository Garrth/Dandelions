// ID checks through Plaid Identity Verification, run on Equitide's Plaid account.
// The site calls this with {"action": "start"} to open the Plaid window, then {"action": "check"}
// to get the result. Dandelions keeps only the result (started, passed, failed, review) and the date.
// Nothing Plaid sends back about the person is stored or logged.
// One file on purpose, so it can be pasted into the Supabase dashboard editor.

// Plaid's statuses, mapped to the few we keep.
const STATUS = { success: "passed", failed: "failed", pending_review: "review" };

export const resultOf = (plaidStatus) => STATUS[plaidStatus] || "started";

// Starts a check: returns a Link token for the Plaid window, or the result if there already is one.
// deps: { plaid(path, body), getCheck(id), saveCheck(id, fields), isMember(id), templateId }
export async function startCheck(deps, user) {
  if (!(await deps.isMember(user.id))) return { error: "not_a_member" };
  const check = await deps.getCheck(user.id);
  // A failed check isn't retried from the site; the help desk sorts it out with the person.
  if (check && (check.status === "passed" || check.status === "failed")) return { status: check.status };
  const res = await deps.plaid("/link/token/create", {
    client_name: "Dandelions",
    language: "en",
    country_codes: ["US"],
    user: { client_user_id: user.id, email_address: user.email },
    products: ["identity_verification"],
    identity_verification: { template_id: deps.templateId },
  });
  if (!res.link_token) return { error: "plaid_unavailable" };
  if (!check) await deps.saveCheck(user.id, { status: "started" });
  return { status: check ? check.status : "started", linkToken: res.link_token };
}

// Looks up the member's latest check with Plaid and saves only the result.
export async function checkResult(deps, user) {
  const check = await deps.getCheck(user.id);
  if (!check) return { status: "none" };
  if (check.status === "passed" || check.status === "failed") return { status: check.status };
  const res = await deps.plaid("/identity_verification/list", {
    template_id: deps.templateId,
    client_user_id: user.id,
  });
  const list = (res.identity_verifications || []).slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  if (!list.length) return { status: check.status };
  const status = resultOf(list[0].status);
  const fields = { status, plaid_session_id: list[0].id };
  if (status === "passed" || status === "failed") fields.decided_at = new Date().toISOString();
  await deps.saveCheck(user.id, fields);
  return { status };
}

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const reply = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const PLAID_HOSTS = { sandbox: "https://sandbox.plaid.com", production: "https://production.plaid.com" };

// Returns the signed-in user and the functions the ID check needs, or null if not signed in.
export async function setup(req) {
  const { createClient } = await import("jsr:@supabase/supabase-js@2");
  const env = (k) => Deno.env.get(k);
  const asUser = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
  });
  const { data } = await asUser.auth.getUser();
  if (!data || !data.user) return null;

  // The service key can write id_checks, which members can't. It never leaves this function.
  const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
  const host = PLAID_HOSTS[env("PLAID_ENV") || "sandbox"] || PLAID_HOSTS.sandbox;

  return {
    user: { id: data.user.id, email: data.user.email },
    deps: {
      templateId: env("PLAID_TEMPLATE_ID"),
      async plaid(path, body) {
        const res = await fetch(host + path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ client_id: env("PLAID_CLIENT_ID"), secret: env("PLAID_SECRET"), ...body }),
        });
        // Only the error code is logged, never what Plaid returns about a person.
        const json = await res.json().catch(() => ({}));
        if (!res.ok) console.error("plaid", path, res.status, json.error_code);
        return res.ok ? json : {};
      },
      async isMember(id) {
        const { data } = await admin.from("members").select("id").eq("id", id).maybeSingle();
        return !!data;
      },
      async getCheck(id) {
        const { data } = await admin.from("id_checks").select("status").eq("member_id", id).maybeSingle();
        return data;
      },
      async saveCheck(id, fields) {
        await admin.from("id_checks").upsert({ member_id: id, ...fields });
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
    const { action } = await req.json().catch(() => ({}));
    if (action === "start") {
      const out = await startCheck(ctx.deps, ctx.user);
      return reply(out, out.error ? 400 : 200);
    }
    if (action === "check") return reply(await checkResult(ctx.deps, ctx.user));
    return reply({ error: "unknown_action" }, 400);
  });
}
