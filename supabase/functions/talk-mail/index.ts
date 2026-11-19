// talk-mail: sends a short email when someone's bell rings in Talk.
// Rings come from: a comment on your post, a new post or comment in a topic you follow, and a new post by someone you follow.
// Each person gets at most one email every 15 minutes, with everything new bundled in it. Rings already seen in the bell are skipped.
// Talk pokes this function after every post and comment, and a GitHub Action pokes it every 15 minutes to send what's left.
// Every email has a "stop these emails" link, and mail apps get a one-click unsubscribe header that points back here.
// One file on purpose, so it can be pasted into the Supabase dashboard editor. Deploy with "Verify JWT" turned OFF.
// Needs the RESEND_API_KEY secret (already set for Rai). Optional: SITE_URL, TALK_MAIL_FROM.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Item = { id: number; kind: string; post_id: string; from: string; topic: string; title: string; at: string };

function env(k: string) { return Deno.env.get(k) || ""; }
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}
function line(x: Item) {
  const t = x.topic ? " in " + x.topic : "";
  const what = x.kind === "comment" ? " commented on your post" : x.kind === "topic_comment" ? " commented" + t : " posted" + t;
  return x.from + what + (x.title ? ': "' + x.title.replace(/\s+/g, " ").trim() + '"' : "");
}
function subject(items: Item[]) {
  if (items.length === 1) return line(items[0]).replace(/: ".*$/, "");
  return items.length + " new in Talk";
}
function escHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

let busy = false; // one sweep at a time in this copy of the function

async function sweep() {
  const key = env("RESEND_API_KEY");
  if (!key) return { sent: 0, note: "no RESEND_API_KEY" };
  const { createClient } = await import("jsr:@supabase/supabase-js@2");
  const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
  const site = (env("SITE_URL") || "https://www.dandelions.lol").replace(/\/$/, "");
  const from = env("TALK_MAIL_FROM") || "Dandelions Talk <noreply@dandelions.lol>";
  const fnUrl = env("SUPABASE_URL").replace(/\/$/, "") + "/functions/v1/talk-mail";

  const { data: rows, error } = await admin.rpc("talk_mail_claim");
  if (error) { console.error("talk_mail_claim", error.message); return { sent: 0, note: "claim failed" }; }
  let sent = 0;
  for (const r of (rows || []) as { member_id: string; email: string; token: string; items: Item[] }[]) {
    const items = (r.items || []).slice(0, 20);
    if (!items.length || !r.email) continue;
    const off = site + "/app/email-off.html?t=" + r.token;
    const links = items.map((x) => ({ text: line(x), url: site + "/app/talk.html?p=" + x.post_id }));
    const text = "New in Talk:\n\n" + links.map((l) => "- " + l.text + "\n  " + l.url).join("\n\n") +
      "\n\nYou get these because of what you follow in Talk, or because you wrote the post." +
      "\nAt most one email every 15 minutes. Stop these emails: " + off + "\n";
    const html = '<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#15210f">' +
      "<p><b>New in Talk</b></p><ul style=\"padding-left:18px\">" +
      links.map((l) => '<li style="margin-bottom:8px"><a href="' + escHtml(l.url) + '" style="color:#2d7a34">' + escHtml(l.text) + "</a></li>").join("") +
      '</ul><p style="font-size:13px;color:#56624f">You get these because of what you follow in Talk, or because you wrote the post. At most one email every 15 minutes.<br>' +
      '<a href="' + escHtml(off) + '" style="color:#56624f">Stop these emails</a></p></div>';
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({
        from, to: [r.email], subject: subject(items), text, html,
        headers: { "List-Unsubscribe": "<" + fnUrl + "?unsub=" + r.token + ">", "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      }),
    });
    if (res.ok) sent++;
    else {
      console.error("talk-mail send", res.status, await res.text());
      await admin.rpc("talk_mail_release", { p_member: r.member_id, p_ids: (r.items || []).map((x) => x.id) });
      if (res.status === 429) break; // Resend says slow down: the rest go next time
    }
    await new Promise((ok) => setTimeout(ok, 600)); // Resend's free plan allows about 2 emails a second
  }
  return { sent };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  // One-click unsubscribe from a mail app: POST ?unsub=<token>
  const unsub = new URL(req.url).searchParams.get("unsub") || "";
  if (unsub) {
    if (!UUID.test(unsub)) return json({ ok: false }, 400);
    const { createClient } = await import("jsr:@supabase/supabase-js@2");
    const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
    const { error } = await admin.rpc("talk_mail_off", { p_token: unsub });
    return json({ ok: !error });
  }
  if (busy) return json({ sent: 0, note: "already sending" });
  busy = true;
  try { return json(await sweep()); }
  catch (e) { console.error("talk-mail", e); return json({ sent: 0, note: "error" }, 500); }
  finally { busy = false; }
});
