// The member profile: ID check, about you, private work answers, your business and the share link.
// Everything here reads and writes only the signed-in member's own rows (row level security).
(function () {
  var cfg = window.DANDELIONS_CONFIG || {};
  function $(id) { return document.getElementById(id); }
  function toast(text) {
    var t = document.createElement("div");
    t.className = "toast"; t.textContent = text;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }
  var list = function (s) { return s.split(",").map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 20); };

  if (new URLSearchParams(location.hash.slice(1)).get("error")) {
    $("loading").textContent = "That link didn't work. It may have expired or been used already. ";
    var a = document.createElement("a"); a.href = "/app/login.html"; a.textContent = "Get a new one";
    $("loading").appendChild(a);
    return;
  }
  if (!window.supabase) { $("loading").textContent = "Something didn't load. Please refresh the page."; return; }
  var db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
  var user;

  // ---- ID check ----
  var ID_TEXT = {
    none: ["Not checked yet", "", "Check your ID to back ideas, vote and get a wallet. It takes about 2 minutes with your ID and a selfie.", "Check my ID"],
    started: ["Started", "sun", "Your check isn't finished. Pick up where you left off.", "Finish my ID check"],
    review: ["Being reviewed", "sun", "A person at Equitide is looking at your check. This usually takes a day or two.", ""],
    passed: ["ID checked", "ok", "", ""],
    failed: ["Didn't go through", "warn", "Your check didn't pass. Email hello@dandelions.lol and we'll sort it out with you.", ""]
  };
  function showId(row) {
    var status = row ? row.status : "none", t = ID_TEXT[status] || ID_TEXT.none;
    $("idtitle").textContent = t[0];
    $("idchip").textContent = status === "passed" ? "Verified" : status === "none" ? "Step 2" : t[0];
    $("idchip").className = "chip " + t[1];
    $("idtext").textContent = status === "passed" && row.decided_at
      ? "Checked on " + new Date(row.decided_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + "."
      : t[2];
    $("idgo").hidden = !t[3]; $("idgo").textContent = t[3];
    $("idrefresh").hidden = !(status === "started" || status === "review");
  }
  function call(action) {
    return db.functions.invoke("idv", { body: { action: action } }).then(function (res) {
      if (res.error) throw res.error;
      return res.data;
    });
  }
  function loadId() {
    return db.from("id_checks").select("status,decided_at").eq("member_id", user.id).maybeSingle().then(function (r) { showId(r.data); return r.data; });
  }
  function checkNow() {
    return call("check").then(loadId).catch(function () { toast("Couldn't reach the ID check. Try again in a minute."); });
  }
  function loadPlaid() {
    if (window.Plaid) return Promise.resolve();
    return new Promise(function (ok, fail) {
      var s = document.createElement("script");
      s.src = "https://cdn.plaid.com/link/v2/stable/link-initialize.js";
      s.onload = ok; s.onerror = fail;
      document.head.appendChild(s);
    });
  }
  $("idgo").addEventListener("click", function () {
    var btn = this; btn.disabled = true;
    Promise.all([call("start"), loadPlaid()]).then(function (out) {
      var started = out[0];
      btn.disabled = false;
      if (!started.linkToken) { loadId(); return; }
      window.Plaid.create({
        token: started.linkToken,
        onSuccess: function () { checkNow().then(function () { toast("Thanks. Your check is in."); }); },
        onExit: function () { checkNow(); }
      }).open();
    }).catch(function () { btn.disabled = false; toast("Couldn't start the ID check. Try again in a minute."); });
  });
  $("idrefresh").addEventListener("click", checkNow);

  // ---- About you ----
  function showProfile(p) {
    p = p || {};
    $("p-name").value = p.display_name || "";
    $("p-town").value = p.town || "";
    $("p-open").checked = !!p.open_to_work;
    $("p-can").value = (p.can_do || []).join(", ");
    $("p-certs").value = (p.certs || []).join(", ");
    $("hello").textContent = p.display_name ? "Hi, " + p.display_name.split(" ")[0] + "." : "Your profile";
  }
  $("profile").addEventListener("submit", function (e) {
    e.preventDefault();
    var row = {
      id: user.id,
      display_name: $("p-name").value.trim() || null,
      town: $("p-town").value.trim() || null,
      open_to_work: $("p-open").checked,
      can_do: list($("p-can").value),
      certs: list($("p-certs").value),
      updated_at: new Date().toISOString()
    };
    db.from("profiles").upsert(row).then(function (r) {
      if (r.error) { toast("Couldn't save. Check the fields and try again."); return; }
      showProfile(row); toast("Saved");
    });
  });

  // ---- Private work answers ----
  function showWork(w) {
    $("w-jobs").value = w ? String(Math.min(w.jobs, 3)) : "";
    $("w-hours").value = w ? w.hours : "";
    $("w-pay").value = w ? w.pay : "";
    $("w-clear").hidden = !w;
  }
  $("work").addEventListener("submit", function (e) {
    e.preventDefault();
    if (!$("w-jobs").value || !$("w-hours").value || !$("w-pay").value) { toast("Answer all three, or leave them all blank"); return; }
    var row = { member_id: user.id, jobs: +$("w-jobs").value, hours: $("w-hours").value, pay: $("w-pay").value, updated_at: new Date().toISOString() };
    db.from("work_answers").upsert(row).then(function (r) {
      if (r.error) { toast("Couldn't save. Try again."); return; }
      showWork(row); toast("Saved. Only you can see these.");
    });
  });
  $("w-clear").addEventListener("click", function () {
    db.from("work_answers").delete().eq("member_id", user.id).then(function (r) {
      if (r.error) { toast("Couldn't remove them. Try again."); return; }
      showWork(null); toast("Removed");
    });
  });

  // ---- Your business ----
  var biz = null;
  var BIZ_TEXT = {
    pending: ["Waiting for a license check", "sun", "We check licenses by hand for now, usually within a few days. Then you show in the directory."],
    listed: ["In the directory", "ok", "You're listed. People can find you in the directory."],
    not_listed: ["Not listed yet", "warn", "We couldn't check your license. Email hello@dandelions.lol and we'll sort it out with you."]
  };
  function thisMonth() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-01"; }
  function showBiz(b) {
    biz = b;
    var t = b && BIZ_TEXT[b.status];
    $("b-head").hidden = !t;
    if (t) { $("b-title").textContent = b.name; $("b-chip").textContent = t[0]; $("b-chip").className = "chip " + t[1]; $("b-text").textContent = t[2]; }
    b = b || {};
    $("b-name").value = b.name || ""; $("b-kind").value = b.kind || ""; $("b-town").value = b.town || "";
    $("b-services").value = b.services || ""; $("b-license").value = b.license || ""; $("b-offer").value = b.offer || "";
    $("b-limit").value = b.monthly_limit || 0;
    $("b-save").textContent = biz ? "Save" : "Add my business";
    $("busy").hidden = !biz;
  }
  $("biz").addEventListener("submit", function (e) {
    e.preventDefault();
    var row = {
      name: $("b-name").value.trim(), kind: $("b-kind").value, town: $("b-town").value.trim(),
      services: $("b-services").value.trim(), license: $("b-license").value.trim(),
      offer: $("b-offer").value.trim() || null, monthly_limit: Math.max(0, Math.round(+$("b-limit").value || 0))
    };
    var q = biz ? db.from("businesses").update(row).eq("id", biz.id) : db.from("businesses").insert(Object.assign({ owner_id: user.id }, row));
    q.select(BIZ_COLS).single().then(function (r) {
      if (r.error) { toast("Couldn't save. Check the fields and try again."); return; }
      var added = !biz; showBiz(r.data); if (added) loadBusy();
      toast(added ? "Added. We'll check your license soon." : "Saved");
    });
  });
  var BIZ_COLS = "id,name,kind,town,services,license,offer,monthly_limit,status";
  (function () {
    var sel = $("busy-val");
    for (var v = 0; v <= 100; v += 10) { var o = document.createElement("option"); o.value = v; o.textContent = v === 0 ? "No work booked" : v === 100 ? "Fully booked" : "About " + v + "% booked"; sel.appendChild(o); }
    $("busy-month").textContent = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
  })();
  function loadBusy() {
    if (!biz) return;
    db.from("busy_reports").select("busy").eq("business_id", biz.id).eq("month", thisMonth()).maybeSingle().then(function (r) {
      $("busy-val").value = r.data ? String(r.data.busy) : "";
    });
  }
  $("busy").addEventListener("submit", function (e) {
    e.preventDefault();
    if ($("busy-val").value === "") return;
    db.from("busy_reports").upsert({ business_id: biz.id, month: thisMonth(), busy: +$("busy-val").value, updated_at: new Date().toISOString() }).then(function (r) {
      toast(r.error ? "Couldn't save. Try again." : "Saved. Thanks.");
    });
  });

  $("signout").addEventListener("click", function () {
    db.auth.signOut().then(function () { location.href = "/"; });
  });

  // ---- Load everything ----
  db.auth.getSession().then(function (res) {
    var session = res.data && res.data.session;
    if (!session) { location.replace("/app/login.html"); return; }
    user = session.user;
    Promise.all([
      db.from("members").select("zip,county_fips,referral_code").eq("id", user.id).maybeSingle(),
      db.from("profiles").select("display_name,town,open_to_work,can_do,certs").eq("id", user.id).maybeSingle(),
      db.from("work_answers").select("jobs,hours,pay").eq("member_id", user.id).maybeSingle(),
      loadId(),
      fetch("/data/counties.json").then(function (r) { return r.json(); }).catch(function () { return {}; }),
      db.from("businesses").select(BIZ_COLS).eq("owner_id", user.id).maybeSingle()
    ]).then(function (out) {
      var m = out[0].data || {}, c = m.county_fips && out[4][m.county_fips];
      $("where").textContent = c ? c[0] + ", " + c[1] : m.zip ? "ZIP " + m.zip : "Member";
      $("email").textContent = user.email || "";
      showProfile(out[1].data);
      showWork(out[2].data);
      showBiz(out[5].data); loadBusy();
      $("reflink").textContent = location.host + "/?ref=" + (m.referral_code || "");
      // Pick up a check that finished while the page was closed.
      if (out[3] && (out[3].status === "started" || out[3].status === "review")) checkNow();
      $("loading").hidden = true; $("app").hidden = false; $("signout").hidden = false;
    });
  });
})();
