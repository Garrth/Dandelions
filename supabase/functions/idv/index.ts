// ID checks through Plaid Identity Verification, run on Equitide's Plaid account.
// The site calls this with {"action": "start"} to open the Plaid window, then {"action": "check"}
// to get the result. Dandelions keeps only the result (started, passed, failed, review) and the date.
// Nothing Plaid sends back about the person is stored or logged.
// One file on purpose, so it can be pasted into the Supabase dashboard editor.

export const MAX_STARTS_PER_DAY = 3; // Plaid windows a member can open per day. Each one costs Equitide money.

// Plaid's statuses, mapped to the few we keep.
const STATUS = { success: "passed", failed: "failed", pending_review: "review" };

export const resultOf = (plaidStatus) => STATUS[plaidStatus] || "started";

// Starts a check: returns a Link token for the Plaid window, or the result if there already is one.
// "Today" for the daily limit, in California time.
export const today = (now = new Date()) => now.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });

// A saved result counts only in the Plaid mode it came from. A test result is treated as no check
// once real checks are on, so the member starts over with a real one.
export const current = (check, env) => (check && check.plaid_env === env ? check : null);

// deps: { plaid(path, body), getCheck(id), saveCheck(id, fields), isMember(id), templateId, env, today }
export async function startCheck(deps, user) {
  if (!deps.env) return { error: "not_set_up" };
  if (!(await deps.isMember(user.id))) return { error: "not_a_member" };
  const saved = await deps.getCheck(user.id);
  const check = current(saved, deps.env);
  // A failed check isn't retried from the site; the help desk sorts it out with the person.
  if (check && (check.status === "passed" || check.status === "failed")) return { status: check.status };
  const day = deps.today();
  const starts = check && check.start_day === day ? check.starts || 0 : 0;
  if (starts >= MAX_STARTS_PER_DAY) return { error: "too_many" };
  const res = await deps.plaid("/link/token/create", {
    client_name: "Dandelions",
    language: "en",
    country_codes: ["US"],
    user: { client_user_id: user.id, email_address: user.email },
    products: ["identity_verification"],
    identity_verification: { template_id: deps.templateId },
  });
  if (!res.link_token) return { error: "plaid_unavailable" };
  const fields = { start_day: day, starts: starts + 1, plaid_env: deps.env };
  // A new check, or a test result being replaced by a real one, starts from the beginning.
  if (!check) Object.assign(fields, { status: "started", plaid_session_id: null, started_at: new Date().toISOString(), decided_at: null });
  await deps.saveCheck(user.id, fields);
  return { status: check ? check.status : "started", linkToken: res.link_token };
}

// Looks up the member's latest check with Plaid and saves only the result.
export async function checkResult(deps, user) {
  if (!deps.env) return { error: "not_set_up" };
  const check = current(await deps.getCheck(user.id), deps.env);
  if (!check) return { status: "none" };
  if (check.status === "passed" || check.status === "failed") return { status: check.status };
  const res = await deps.plaid("/identity_verification/list", {
    template_id: deps.templateId,
    client_user_id: user.id,
  });
  const list = (res.identity_verifications || []).slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  if (!list.length) return { status: check.status };
  const status = resultOf(list[0].status);
  const fields = { status, plaid_session_id: list[0].id, plaid_env: deps.env };
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
  // PLAID_ENV must say exactly "sandbox" or "production". Anything else stops the check, so a missing or
  // mistyped setting can never quietly fall back to test mode.
  const plaidEnv = Object.prototype.hasOwnProperty.call(PLAID_HOSTS, env("PLAID_ENV") || "") ? env("PLAID_ENV") : "";
  if (!plaidEnv) console.error("idv: PLAID_ENV must be sandbox or production");
  const host = PLAID_HOSTS[plaidEnv];

  return {
    user: { id: data.user.id, email: data.user.email },
    deps: {
      templateId: env("PLAID_TEMPLATE_ID"),
      env: plaidEnv,
      today: () => today(),
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
        const { data } = await admin.from("id_checks").select("status,plaid_env,start_day,starts").eq("member_id", id).maybeSingle();
        return data;
      },
      async saveCheck(id, fields) {
        const { error } = await admin.from("id_checks").upsert({ member_id: id, ...fields });
        if (error) throw new Error("save " + error.code);
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
    try {
      if (action === "start") {
        const out = await startCheck(ctx.deps, ctx.user);
        return reply(out, out.error ? 400 : 200);
      }
      if (action === "check") {
        const out = await checkResult(ctx.deps, ctx.user);
        return reply(out, out.error ? 400 : 200);
      }
    } catch (e) {
      console.error("idv", action, e && e.message);
      return reply({ error: "server" }, 500);
    }
    return reply({ error: "unknown_action" }, 400);
  });
}
