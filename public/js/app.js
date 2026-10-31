// The member profile: ID check, about you, private work answers and the share link.
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
      fetch("/data/counties.json").then(function (r) { return r.json(); }).catch(function () { return {}; })
    ]).then(function (out) {
      var m = out[0].data || {}, c = m.county_fips && out[4][m.county_fips];
      $("where").textContent = c ? c[0] + ", " + c[1] : m.zip ? "ZIP " + m.zip : "Member";
      $("email").textContent = user.email || "";
      showProfile(out[1].data);
      showWork(out[2].data);
      $("reflink").textContent = location.host + "/?ref=" + (m.referral_code || "");
      // Pick up a check that finished while the page was closed.
      if (out[3] && (out[3].status === "started" || out[3].status === "review")) checkNow();
      $("loading").hidden = true; $("app").hidden = false; $("signout").hidden = false;
    });
  });
})();
