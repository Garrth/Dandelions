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
    }).catch(function (e) {
      btn.disabled = false;
      // The function says why in its answer, like {"error": "too_many"}.
      var res = e && e.context && typeof e.context.json === "function" ? e.context.json() : Promise.resolve({});
      res.catch(function () { return {}; }).then(function (b) {
        toast(b && b.error === "too_many" ? "That's the most ID check tries for one day. Try again tomorrow."
          : b && b.error === "not_set_up" ? "The ID check isn't switched on right now. Try again later."
          : "Couldn't start the ID check. Try again in a minute.");
      });
    });
  });
  $("idrefresh").addEventListener("click", checkNow);

  // ---- View and edit modes ----
  // Each part shows as plain text. Edit opens its form; Save and Cancel close it again.
  var EDIT = { me: ["#me .me-view", "#me .me-form"], skills: ["#skills .sk-view", "#skills .sk-form"], work: ["#work .w-view", "#work .w-form"], qol: ["#qol .qol-view", "#qol .qol-form"], biz: ["#bizcard .b-view", "#biz"] };
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
      if (r.error) { toast(/reserved_name/.test(r.error.message || "") ? "That name is kept for the site (like Rai or Moderator). Please pick another." : "Couldn't save. Check the fields and try again."); return false; }
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
    ["verified", "🪪", "ID checked", "You can see other members' profiles, and send and receive points once they're unlocked.", "Do the ID check below."],
    ["business", "🏪", "Business owner", "Your business is in the directory.", "Claim your listing in the directory, or add your business below."],
    ["earn", "⭐", "Can earn points", "", "Coming soon, once your county reaches its starting numbers on the Work page. You need the ID check too."],
    ["vote", "🗳️", "Can vote", "One person, one vote on what gets done.", "Needs the ID check. Voting opens with Work."],
    ["project_owner", "📋", "Project owner", "You can start and run projects.", "Opens with Work, for ID-checked business owners."],
    ["checker", "✅", "Checker", "You check that work is done.", "Opens with Work, for ID-checked members."],
    ["organizer", "📣", "Community organizer", "You help sign up local businesses and run meetups.", "Ask in Talk if you'd like to help in your county."],
    ["moderator", "🛡️", "Talk moderator", "You help keep Talk friendly.", ""],
    ["keeper", "🔑", "Keeper", "You help sign changes to the rules.", "Chosen later, from long-time members."],
    ["node_operator", "🖥️", "Network operator", "You run Dandelions' connection to the blockchain.", "Opens when points launch."]
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

  // ---- Quality of life check (private) ----
  var qolRow = null, qolRai = {};
  var Q = window.QOL;
  var QCOLS = Q.QUESTIONS.map(function (x) { return x[0]; }).concat(Q.ITEMS.map(function (x) { return x[0]; }), ["people", "days_off"]);
  $("qol-qs").innerHTML = Q.QUESTIONS.map(function (x, i) {
    var opts = Q.ANSWERS.map(function (a, v) { return [v, a]; });
    if (x[0] === "q_pay") opts.push([-1, "Doesn't apply"]);
    return '<fieldset class="qol-q"><legend>' + (i + 1) + ". " + esc(x[2]) + '</legend><div class="qol-opts">' + opts.map(function (o) {
      return '<label><input type="radio" name="' + x[0] + '" value="' + o[0] + '"><span>' + esc(o[1]) + "</span></label>";
    }).join("") + "</div>" + (x[0] === "q_pay" ? '<p class="small muted" style="margin:4px 0 0">Doesn\'t apply: retired, caregiving or in school.</p>' : "") + "</fieldset>";
  }).join("");
  function drawCosts() {
    $("qol-costs").innerHTML = Q.ITEMS.map(function (it) {
      return '<label class="qol-cost"><span>' + esc(it[2]) + "<small>" + esc(it[5] || "") + '<span class="qol-rai" data-k="' + (it[3] || "") + '"></span></small></span>' +
        '<input type="number" min="0" max="50000" step="1" inputmode="numeric" placeholder="$" id="qol-' + it[0] + '" aria-label="' + esc(it[2]) + ', dollars a month"></label>';
    }).join("");
  }
  drawCosts();
  function raiHints() {
    document.querySelectorAll("#qol .qol-rai").forEach(function (el) {
      var k = el.getAttribute("data-k"), v = k && qolRai[k] != null ? "Rai: " + Q.money(qolRai[k]) : "";
      el.textContent = v ? (el.parentNode.firstChild && el.parentNode.firstChild.nodeType === 3 && el.parentNode.firstChild.nodeValue ? ". " : "") + v : "";
    });
  }
  function showQol(row) {
    qolRow = row === undefined ? qolRow : row; var w = qolRow;
    if (!w) { q("#qol .qol-view").innerHTML = '<p class="small muted">Not answered.</p>'; }
    else {
      var five = Q.QUESTIONS.filter(function (x) { return w[x[0]] != null; });
      var met = five.filter(function (x) { return w[x[0]] === -1 || w[x[0]] >= 3; }).length;
      var cost = Q.ITEMS.reduce(function (t, it) { return t + (w[it[0]] || 0); }, 0);
      q("#qol .qol-view").innerHTML = "<p>" + (five.length === 5 ? (met === 5 ? "All five needs met." : met + " of 5 needs met.") : five.length + " of 5 questions answered.") +
        (cost ? " Your costs add up to " + Q.money(cost) + " a month" + (w.people > 1 ? " for " + w.people + " people" : "") + "." : "") + "</p>" +
        '<p class="small muted">Updated ' + new Date(w.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + ". Update it whenever things change.</p>";
    }
    Q.QUESTIONS.forEach(function (x) {
      document.querySelectorAll('#qol input[name="' + x[0] + '"]').forEach(function (r) { r.checked = !!w && w[x[0]] != null && +r.value === w[x[0]]; });
    });
    Q.ITEMS.forEach(function (it) { $("qol-" + it[0]).value = w && w[it[0]] != null ? w[it[0]] : ""; });
    $("qol-people").value = String(Math.min((w && w.people) || 1, 6));
    $("qol-days").value = w && w.days_off != null ? w.days_off : "";
    $("qol-clear").hidden = !w;
  }
  redraw.qol = function () { showQol(); };
  function num(id, max) { var v = $(id).value.trim(); if (v === "") return null; var n = Math.round(+v); return isFinite(n) && n >= 0 && n <= max ? n : NaN; }
  q("#qol .qol-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var row = { member_id: user.id, people: +$("qol-people").value, updated_at: new Date().toISOString() }, bad = false;
    Q.QUESTIONS.forEach(function (x) { var c = document.querySelector('#qol input[name="' + x[0] + '"]:checked'); row[x[0]] = c ? +c.value : null; });
    Q.ITEMS.forEach(function (it) { row[it[0]] = num("qol-" + it[0], it[0] === "c_housing" ? 50000 : it[0] === "c_phone" ? 5000 : 20000); if (row[it[0]] !== row[it[0]]) bad = true; });
    row.days_off = num("qol-days", 365); if (row.days_off !== row.days_off) bad = true;
    if (bad) { toast("Check the numbers. Whole dollars, and not too big."); return; }
    if (QCOLS.every(function (k) { return k === "people" || row[k] == null; })) { toast("Answer at least one question first"); return; }
    db.from("qol_checks").upsert(row).then(function (r) {
      if (r.error) { toast("Couldn't save. Try again."); return; }
      qolRow = row; editing("qol", false); toast("Saved. Only you can see these.");
    });
  });
  $("qol-clear").addEventListener("click", function () {
    db.from("qol_checks").delete().eq("member_id", user.id).then(function (r) {
      if (r.error) { toast("Couldn't remove them. Try again."); return; }
      qolRow = null; editing("qol", false); toast("Removed");
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

  // ---- Monthly pledge: points a month this person would accept ----
  function showPledge(r) {
    if (r && r.error) { $("pledge").hidden = true; return; }
    $("pl-points").value = r && r.data ? r.data.points : "";
  }
  $("pledge").addEventListener("submit", function (e) {
    e.preventDefault();
    var n = Math.round(+$("pl-points").value || 0);
    if (n < 0 || n > 5000) { toast("Pick a number from 0 to 5,000."); return; }
    db.from("accept_pledges").upsert({ member_id: user.id, county_fips: "", listing_id: "", points: n, updated_at: new Date().toISOString() },
      { onConflict: "member_id,county_fips,listing_id" }).then(function (r) {
      toast(r.error ? "Couldn't save. Try again." : n ? "Saved. Thanks for pledging." : "Saved");
    });
  });

  // ---- Businesses claimed in the directory: a link to edit each one, and its monthly pledge ----
  function listingQs(c) { return "f=" + encodeURIComponent(c.family) + "&id=" + encodeURIComponent(c.listing_id) + "&c=" + encodeURIComponent(c.county_fips); }
  function showClaimed(claims, pledges) {
    var seen = {}, rows = (claims || []).filter(function (c) { var k = c.county_fips + "|" + c.listing_id; if (seen[k]) return false; seen[k] = true; return true; });
    $("claimed").hidden = !rows.length;
    if (!rows.length) return;
    var pts = {};
    (pledges || []).forEach(function (x) { pts[x.county_fips + "|" + x.listing_id] = x.points; });
    $("claimlist").innerHTML = rows.map(function (c, i) {
      var k = c.county_fips + "|" + c.listing_id, qs = listingQs(c);
      return '<div class="card" style="margin-bottom:12px"><div class="spread"><b>' + esc(c.listing_name) + '</b><span class="chip ok">Yours</span></div>' +
        '<div class="row" style="margin:10px 0 14px"><a class="btn small" href="/directory/edit.html?' + qs + '">Edit your listing</a><a class="btn ghost small" href="/directory/biz.html?' + qs + '">See it in the directory</a></div>' +
        '<label class="field">Points a month this business would accept <span class="muted">(private)</span><input type="number" min="0" max="1000000" step="50" inputmode="numeric" placeholder="0" id="cl-pts-' + i + '" value="' + (pts[k] != null ? pts[k] : "") + '"></label>' +
        '<p class="small muted" style="margin:-4px 0 12px">Points aren\'t on yet. It counts toward your county\'s starting numbers on the <a href="/app/work.html">Work page</a>.</p>' +
        '<button class="btn small" type="button" data-cl="' + i + '">Save</button></div>';
    }).join("");
    document.querySelectorAll("[data-cl]").forEach(function (b) {
      b.addEventListener("click", function () {
        var i = +b.getAttribute("data-cl"), c = rows[i], n = Math.round(+$("cl-pts-" + i).value || 0);
        if (n < 0 || n > 1000000) { toast("Pick a number from 0 to 1,000,000."); return; }
        b.disabled = true;
        db.from("accept_pledges").upsert({ member_id: user.id, county_fips: c.county_fips, listing_id: c.listing_id, points: n, updated_at: new Date().toISOString() },
          { onConflict: "member_id,county_fips,listing_id" }).then(function (r) {
          b.disabled = false;
          toast(r.error ? "Couldn't save. Try again." : n ? "Saved. Thanks for pledging." : "Saved");
        });
      });
    });
  }

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
      db.from("businesses").select(BIZ_COLS).eq("owner_id", user.id).maybeSingle(),
      db.from("accept_pledges").select("points").eq("member_id", user.id).eq("listing_id", "").maybeSingle(),
      db.from("listing_claims").select("county_fips,family,listing_id,listing_name,verified_at").eq("member_id", user.id).eq("status", "verified").order("verified_at", { ascending: true }),
      db.from("accept_pledges").select("county_fips,listing_id,points").eq("member_id", user.id).neq("listing_id", ""),
      db.from("qol_checks").select(QCOLS.join(",") + ",updated_at").eq("member_id", user.id).maybeSingle()
    ]).then(function (out) {
      var m = out[0].data || {}, c = m.county_fips && out[4][m.county_fips];
      $("where").textContent = c ? c[0] + ", " + c[1] : m.zip ? "ZIP " + m.zip : "Member";
      $("email").textContent = user.email || "";
      prof = out[1].data || {};
      if (!(prof.skills || []).length && (prof.can_do || []).length) prof.skills = prof.can_do.map(function (n) { return { name: n }; });
      loadPhoto().then(showMe); showSkills(); loadPerms();
      showWork(out[2].data);
      showQol(out[9].error ? null : out[9].data);
      fetch("/data/rai/" + (m.county_fips || "06097") + ".json").then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }).then(function (d) {
        qolRai = (d && d.yearly && d.yearly.livingWage && d.yearly.livingWage.monthly) || {};
        raiHints();
      });
      showBiz(out[5].data); loadBusy(); showPledge(out[6]);
      showClaimed(out[7].data, out[8].data);
      $("reflink").textContent = location.host + "/?ref=" + (m.referral_code || "");
      $("refcopy").addEventListener("click", function () {
        var link = "https://" + $("reflink").textContent;
        function done() { $("refcopied").hidden = false; setTimeout(function () { $("refcopied").hidden = true; }, 2500); }
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(link).then(done, function () { window.prompt("Copy your link:", link); });
        else window.prompt("Copy your link:", link);
      });
      db.rpc("my_referral_count").then(function (r) {
        if (r.error || typeof r.data !== "number") return;
        var n = r.data;
        $("refcount").textContent = n === 0 ? "No one has signed up with your link yet." : n === 1 ? "1 person has signed up with your link." : n + " people have signed up with your link.";
        $("refcount").hidden = false;
      });
      // Pick up a check that finished while the page was closed.
      if (out[3] && (out[3].status === "started" || out[3].status === "review")) checkNow();
      $("loading").hidden = true; $("app").hidden = false; $("signout").hidden = false;
      $("pnav-claimed").hidden = $("claimed").hidden;
      if (location.hash === "#pledge" && !$("pledge").hidden) $("pledge").scrollIntoView();
      if (location.hash === "#s-qol") { $("s-qol").scrollIntoView(); editing("qol", true); }
      if (location.hash === "#password" && $("pwform")) { $("pwform").scrollIntoView(); if ($("newpw")) $("newpw").focus(); }
    });
  });
})();

// Section menu: the phone button opens and closes the list; picking a section closes it.
(function () {
  var nav = document.getElementById("pnav"), btn = document.getElementById("pnav-btn");
  if (!nav || !btn) return;
  function set(open) { nav.classList.toggle("open", open); btn.setAttribute("aria-expanded", open ? "true" : "false"); }
  btn.addEventListener("click", function (e) { e.stopPropagation(); set(!nav.classList.contains("open")); });
  nav.addEventListener("click", function (e) { if (e.target.tagName === "A") set(false); });
  document.addEventListener("click", function (e) { if (!nav.contains(e.target)) set(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") set(false); });
})();
