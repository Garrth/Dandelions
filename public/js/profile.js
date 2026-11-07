// The member profile: you (photo, name, visible or private), permissions, ID check, skills and availability,
// private work answers, your business and the share link. Each part shows as text with an Edit button.
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
    none: ["Not checked yet", "", "Only needed if you want to earn points, vote, or see other members' profiles. It takes about 2 minutes with your ID and a selfie.", "Check my ID"],
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

  // ---- View and edit modes ----
  // Each part shows as plain text. Edit opens its form; Save and Cancel close it again.
  var EDIT = { me: ["#me .me-view", "#me .me-form"], skills: ["#skills .sk-view", "#skills .sk-form"], work: ["#work .w-view", "#work .w-form"], biz: ["#bizcard .b-view", "#biz"] };
  var redraw = {};
  function q(sel) { return document.querySelector(sel); }
  function editing(part, on) {
    q(EDIT[part][0]).hidden = on; q(EDIT[part][1]).hidden = !on;
    var b = document.querySelector('[data-edit="' + part + '"]'); if (b) b.style.visibility = on ? "hidden" : "";
    if (!on && redraw[part]) redraw[part]();
    if (on) { var f = q(EDIT[part][1]).querySelector("input:not([type=file]):not([type=radio]),select"); if (f) f.focus(); }
  }
  document.querySelectorAll("[data-edit]").forEach(function (b) { b.addEventListener("click", function () { editing(b.dataset.edit, true); }); });
  Object.keys(EDIT).forEach(function (part) {
    var c = q(EDIT[part][1]).querySelector(".cancel");
    if (c) c.addEventListener("click", function () { editing(part, false); });
  });
  function esc(t) { var d = document.createElement("div"); d.textContent = t == null ? "" : String(t); return d.innerHTML; }

  // ---- You: photo, name, town, visible or private ----
  var prof = {}, photoUrl = "", newPhoto = null, dropPhoto = false;
  function setPhoto(el, url, name) {
    el.style.backgroundImage = url ? "url(" + url + ")" : "";
    el.textContent = url ? "" : (name || "?").trim().charAt(0).toUpperCase();
  }
  function loadPhoto() {
    if (!prof.photo_path) { photoUrl = ""; return Promise.resolve(); }
    return db.storage.from("avatars").createSignedUrl(prof.photo_path, 3600).then(function (r) { photoUrl = (r.data && r.data.signedUrl) || ""; });
  }
  function showMe() {
    var p = prof;
    $("m-name").textContent = p.display_name || "Add your name";
    $("m-town").textContent = p.town || "No town yet";
    $("m-vis").textContent = p.visible ? "Visible to ID-checked members" : "Private";
    $("m-vis").className = "chip " + (p.visible ? "ok" : "");
    setPhoto($("m-photo"), photoUrl, p.display_name);
    $("hello").textContent = p.display_name ? "Hi, " + p.display_name.split(" ")[0] + "." : "Your profile";
    $("p-name").value = p.display_name || ""; $("p-town").value = p.town || "";
    $("p-vis-on").checked = !!p.visible; $("p-vis-off").checked = !p.visible;
    newPhoto = null; dropPhoto = false;
    setPhoto($("p-photo-preview"), photoUrl, p.display_name); $("p-photo-remove").hidden = !photoUrl;
  }
  redraw.me = showMe;
  // Shrink a picked photo to a 400 pixel square JPEG before it leaves the phone.
  function squareJpeg(file) {
    return new Promise(function (ok, fail) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var s = Math.min(img.width, img.height), c = document.createElement("canvas"); c.width = c.height = 400;
        c.getContext("2d").drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 400, 400);
        URL.revokeObjectURL(url); c.toBlob(function (b) { b ? ok(b) : fail(); }, "image/jpeg", 0.85);
      };
      img.onerror = function () { URL.revokeObjectURL(url); fail(); };
      img.src = url;
    });
  }
  $("p-photo").addEventListener("change", function () {
    var f = this.files[0]; if (!f) return;
    squareJpeg(f).then(function (b) {
      newPhoto = b; dropPhoto = false;
      setPhoto($("p-photo-preview"), URL.createObjectURL(b)); $("p-photo-remove").hidden = false;
    }).catch(function () { toast("That picture didn't load. Try a JPEG or PNG."); });
    this.value = "";
  });
  $("p-photo-remove").addEventListener("click", function () {
    newPhoto = null; dropPhoto = true; setPhoto($("p-photo-preview"), "", $("p-name").value); this.hidden = true;
  });
  function saveProfile(fields, done) {
    var row = Object.assign({ id: user.id, updated_at: new Date().toISOString() }, fields);
    return db.from("profiles").upsert(row).then(function (r) {
      if (r.error) { toast("Couldn't save. Check the fields and try again."); return false; }
      Object.assign(prof, fields); return true;
    });
  }
  q("#me .me-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var path = user.id + "/photo.jpg", step = Promise.resolve(prof.photo_path || null);
    if (newPhoto) step = db.storage.from("avatars").upload(path, newPhoto, { upsert: true, contentType: "image/jpeg" })
      .then(function (r) { if (r.error) throw r.error; return path; });
    else if (dropPhoto && prof.photo_path) step = db.storage.from("avatars").remove([prof.photo_path]).then(function () { return null; });
    step.then(function (photo) {
      return saveProfile({ display_name: $("p-name").value.trim() || null, town: $("p-town").value.trim() || null, visible: $("p-vis-on").checked, photo_path: photo });
    }).then(function (ok) {
      if (!ok) return;
      return loadPhoto().then(function () { editing("me", false); toast("Saved"); });
    }).catch(function () { toast("Couldn't upload the photo. Try a smaller one."); });
  });

  // ---- Permissions ----
  var PERMS = [
    ["pledged", "🌱", "Pledged", "You're counted in your county.", "Confirm your pledge from the email we sent."],
    ["verified", "🪪", "ID checked", "You can see other members' profiles.", "Do the ID check below."],
    ["business", "🏪", "Business owner", "Your business is in the directory.", "Claim your listing in the directory, or add your business below."],
    ["earn", "⭐", "Can earn points", "", "Opens when your county reaches 1%. Needs the ID check."],
    ["vote", "🗳️", "Can vote", "One person, one vote on what gets done.", "Needs the ID check. Voting opens with Work."],
    ["project_owner", "📋", "Project owner", "You can start and run projects.", "Opens with Work, for ID-checked business owners."],
    ["checker", "✅", "Checker", "You check that work is done.", "Opens with Work, for ID-checked members."],
    ["organizer", "📣", "Community organizer", "You help sign up local businesses and run meetups.", "Ask in Talk if you'd like to help in your county."],
    ["moderator", "🛡️", "Talk moderator", "You help keep Talk friendly.", ""],
    ["keeper", "🔑", "Keeper", "You help sign changes to the rules.", "Chosen later, from long-time members."],
    ["node_operator", "🖥️", "Node operator", "You run part of the Dandelions network.", "Opens when the network launches."]
  ];
  function showPerms(p) {
    p = p || {}; var roles = p.roles || [];
    var has = { pledged: p.pledged, verified: p.verified, business: p.business, earn: false, vote: false, moderator: p.moderator };
    roles.forEach(function (r) { has[r] = true; });
    $("perms").innerHTML = PERMS.filter(function (x) { return x[0] !== "moderator" || has.moderator; }).map(function (x) {
      var on = !!has[x[0]];
      return '<div class="perm' + (on ? "" : " locked") + '"><div class="disc" aria-hidden="true">' + x[1] + "</div><b>" + esc(x[2]) + (on ? "" : ' <span class="muted">(locked)</span>') + "</b><span>" + esc(on ? x[3] : x[4]) + "</span></div>";
    }).join("");
  }
  function loadPerms() {
    return db.rpc("my_permissions").then(function (r) {
      if (r.error) { $("perms").innerHTML = '<p class="small muted">Couldn\'t load your permissions. Refresh to try again.</p>'; return; }
      showPerms(r.data);
    });
  }

  // ---- Skills and availability ----
  function skillRow(sk) {
    var d = document.createElement("div"); d.className = "sk-row";
    d.innerHTML = '<input class="sk-name" maxlength="60" placeholder="Drywall repair" aria-label="Skill"><input class="sk-rate" type="number" min="0" max="1000" step="1" placeholder="$ an hour" aria-label="Dollars an hour"><button type="button" aria-label="Remove">×</button>';
    d.querySelector(".sk-name").value = sk.name || ""; d.querySelector(".sk-rate").value = sk.rate != null ? sk.rate : "";
    d.querySelector("button").addEventListener("click", function () { d.remove(); });
    return d;
  }
  function showSkills() {
    var p = prof, sk = p.skills || [];
    var html = sk.length ? sk.map(function (x) {
      return '<div class="spread" style="padding-block:6px;border-top:1px solid var(--line)"><span>' + esc(x.name) + "</span><b>" + (x.rate != null ? "$" + esc(x.rate) + " an hour" : '<span class="muted small">No rate</span>') + "</b></div>";
    }).join("") : '<p class="small muted">No skills yet. Add what you can do so project owners can find you when Work opens.</p>';
    if ((p.certs || []).length) html += '<p class="small" style="margin-top:10px"><b>Certifications:</b> ' + esc(p.certs.join(", ")) + "</p>";
    html += '<ul class="yes-no">' + [["open_to_work", "Looking for work"], ["has_work", "Has work that needs doing"], ["reach_out", "Project owners can reach out"]].map(function (x) {
      return "<li>" + (p[x[0]] ? "✅ " : "⬜ ") + x[1] + "</li>";
    }).join("") + "</ul>";
    q("#skills .sk-view").innerHTML = html;
    var rows = $("sk-rows"); rows.innerHTML = "";
    (sk.length ? sk : [{}]).forEach(function (x) { rows.appendChild(skillRow(x)); });
    $("p-certs").value = (p.certs || []).join(", ");
    $("p-open").checked = !!p.open_to_work; $("p-haswork").checked = !!p.has_work; $("p-reach").checked = !!p.reach_out;
  }
  redraw.skills = showSkills;
  $("sk-add").addEventListener("click", function () {
    if ($("sk-rows").children.length >= 20) { toast("20 skills is the most"); return; }
    var r = skillRow({}); $("sk-rows").appendChild(r); r.querySelector("input").focus();
  });
  q("#skills .sk-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var skills = [].slice.call(document.querySelectorAll("#sk-rows .sk-row")).map(function (r) {
      var name = r.querySelector(".sk-name").value.trim(), rate = r.querySelector(".sk-rate").value;
      return name ? (rate !== "" ? { name: name, rate: Math.max(0, Math.round(+rate)) } : { name: name }) : null;
    }).filter(Boolean).slice(0, 20);
    saveProfile({
      skills: skills, can_do: skills.map(function (x) { return x.name; }), certs: list($("p-certs").value),
      open_to_work: $("p-open").checked, has_work: $("p-haswork").checked, reach_out: $("p-reach").checked
    }).then(function (ok) { if (ok) { editing("skills", false); toast("Saved"); } });
  });

  // ---- Private work answers ----
  var work = null;
  var LABEL = {
    hours: { under_20: "under 20 hours a week", "20_to_39": "20 to 39 hours a week", "40_to_50": "40 to 50 hours a week", over_50: "over 50 hours a week" },
    pay: { under_17: "under $17 an hour", "17_to_25": "$17 to $25 an hour", "25_to_35": "$25 to $35 an hour", "35_to_50": "$35 to $50 an hour", over_50: "over $50 an hour", prefer_not: "pay not shared" }
  };
  function showWork(w) {
    work = w === undefined ? work : w; w = work;
    q("#work .w-view").innerHTML = w
      ? "<p>" + esc((w.jobs === 0 ? "No job right now" : w.jobs >= 3 ? "3 or more jobs" : w.jobs + (w.jobs === 1 ? " job" : " jobs")) + ", " + LABEL.hours[w.hours] + ", " + LABEL.pay[w.pay] + ".") + "</p>"
      : '<p class="small muted">Not answered.</p>';
    $("w-jobs").value = w ? String(Math.min(w.jobs, 3)) : "";
    $("w-hours").value = w ? w.hours : "";
    $("w-pay").value = w ? w.pay : "";
    $("w-clear").hidden = !w;
  }
  redraw.work = function () { showWork(); };
  q("#work .w-form").addEventListener("submit", function (e) {
    e.preventDefault();
    if (!$("w-jobs").value || !$("w-hours").value || !$("w-pay").value) { toast("Answer all three, or leave them all blank"); return; }
    var row = { member_id: user.id, jobs: +$("w-jobs").value, hours: $("w-hours").value, pay: $("w-pay").value, updated_at: new Date().toISOString() };
    db.from("work_answers").upsert(row).then(function (r) {
      if (r.error) { toast("Couldn't save. Try again."); return; }
      work = row; editing("work", false); toast("Saved. Only you can see these.");
    });
  });
  $("w-clear").addEventListener("click", function () {
    db.from("work_answers").delete().eq("member_id", user.id).then(function (r) {
      if (r.error) { toast("Couldn't remove them. Try again."); return; }
      work = null; editing("work", false); toast("Removed");
    });
  });

  // ---- Your business ----
  var biz = null;
  var BIZ_TEXT = {
    pending: ["In the directory", "ok", "You're listed. People can find you in the directory."],
    listed: ["In the directory", "ok", "You're listed. People can find you in the directory."],
    not_listed: ["Not listed", "warn", "Your business was taken out of the directory. Email hello@dandelions.lol and we'll sort it out with you."]
  };
  function thisMonth() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-01"; }
  function showBiz(b) {
    biz = b;
    var t = b && BIZ_TEXT[b.status];
    $("b-head").hidden = !t;
    if (t) { $("b-title").textContent = b.name; $("b-chip").textContent = t[0]; $("b-chip").className = "chip " + t[1]; $("b-text").textContent = t[2]; }
    $("b-edit").hidden = !biz; $("b-add").hidden = !!biz; $("b-facts").hidden = !biz;
    if (biz) $("b-facts").innerHTML = [["Kind", b.kind], ["Town", b.town], ["What you do", b.services], ["Offer", b.offer || "None"], ["Points a month", b.monthly_limit || 0]]
      .map(function (x) { return "<dt>" + esc(x[0]) + "</dt><dd>" + esc(x[1]) + "</dd>"; }).join("");
    b = b || {};
    $("b-name").value = b.name || ""; $("b-kind").value = b.kind || ""; $("b-town").value = b.town || "";
    $("b-services").value = b.services || ""; $("b-license").value = b.license || ""; $("b-offer").value = b.offer || "";
    $("b-limit").value = b.monthly_limit || 0;
    $("b-attest").checked = !!b.license_attested;
    $("b-save").textContent = biz ? "Save" : "Add my business";
    $("busy").hidden = !biz;
  }
  redraw.biz = function () { showBiz(biz); };
  $("b-add").addEventListener("click", function () { editing("biz", true); });
  $("biz").addEventListener("submit", function (e) {
    e.preventDefault();
    var row = {
      name: $("b-name").value.trim(), kind: $("b-kind").value, town: $("b-town").value.trim(),
      services: $("b-services").value.trim(), license: $("b-license").value.trim(),
      offer: $("b-offer").value.trim() || null, monthly_limit: Math.max(0, Math.round(+$("b-limit").value || 0)),
      license_attested: $("b-attest").checked
    };
    var q = biz ? db.from("businesses").update(row).eq("id", biz.id) : db.from("businesses").insert(Object.assign({ owner_id: user.id }, row));
    q.select(BIZ_COLS).single().then(function (r) {
      if (r.error) { toast("Couldn't save. Check the fields and try again."); return; }
      var added = !biz; biz = r.data; editing("biz", false); if (added) { loadBusy(); loadPerms(); }
      toast(added ? "Added. You're in the directory." : "Saved");
    });
  });
  var BIZ_COLS = "id,name,kind,town,services,license,offer,monthly_limit,status,license_attested";
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

  $("pwform").addEventListener("submit", function (e) {
    e.preventDefault();
    var pw = $("newpw").value;
    if (pw.length < 8) { toast("Use at least 8 characters."); return; }
    db.auth.updateUser({ password: pw }).then(function (r) {
      if (!r.error) { $("newpw").value = ""; toast("Password saved. You can use it next time you log in."); return; }
      var m = r.error.message || "";
      toast(/same/i.test(m) ? "That's already your password."
        : /weak|short|character/i.test(m) ? "Pick a longer or harder password."
        : /reauth|recent/i.test(m) ? "Log out, log back in with the email link, then try again."
        : "Couldn't save. Try again.");
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
      db.from("profiles").select("display_name,town,open_to_work,can_do,certs,visible,has_work,reach_out,photo_path,skills").eq("id", user.id).maybeSingle(),
      db.from("work_answers").select("jobs,hours,pay").eq("member_id", user.id).maybeSingle(),
      loadId(),
      fetch("/data/counties.json").then(function (r) { return r.json(); }).catch(function () { return {}; }),
      db.from("businesses").select(BIZ_COLS).eq("owner_id", user.id).maybeSingle()
    ]).then(function (out) {
      var m = out[0].data || {}, c = m.county_fips && out[4][m.county_fips];
      $("where").textContent = c ? c[0] + ", " + c[1] : m.zip ? "ZIP " + m.zip : "Member";
      $("email").textContent = user.email || "";
      prof = out[1].data || {};
      if (!(prof.skills || []).length && (prof.can_do || []).length) prof.skills = prof.can_do.map(function (n) { return { name: n }; });
      loadPhoto().then(showMe); showSkills(); loadPerms();
      showWork(out[2].data);
      showBiz(out[5].data); loadBusy();
      $("reflink").textContent = location.host + "/?ref=" + (m.referral_code || "");
      // Pick up a check that finished while the page was closed.
      if (out[3] && (out[3].status === "started" || out[3].status === "review")) checkNow();
      $("loading").hidden = true; $("app").hidden = false; $("signout").hidden = false;
    });
  });
})();
