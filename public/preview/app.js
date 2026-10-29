// Preview screens: render sample data, keep clicks in this browser only.
(function () {
  const S = window.SAMPLE;
  const page = document.body.dataset.page;
  const $ = (sel, el = document) => el.querySelector(sel);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (n) => n.toLocaleString("en-US");
  const typeName = (k) => (S.types.find((t) => t.key === k) || {}).name || k;

  // Changes made while clicking around are kept in this browser so the preview feels real.
  const KEY = "dandelions-preview-v2";
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { saved = {}; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) { /* preview still works */ } };
  if (saved.projects) S.projects = saved.projects;
  if (saved.log) S.log = saved.log;

  function toast(msg) {
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }

  // Shared chrome: preview banner, header, bottom tabs
  const flower = '<svg width="26" height="26" viewBox="0 0 64 64" aria-hidden="true"><path d="M32 34 C31 44 33 52 32 62" stroke="#2d7a34" stroke-width="3.5" fill="none" stroke-linecap="round"/><g fill="#ffd21a" stroke="#15210f" stroke-width="1.5"><circle cx="32" cy="9" r="7"/><circle cx="32" cy="35" r="7"/><circle cx="19" cy="22" r="7"/><circle cx="45" cy="22" r="7"/><circle cx="23" cy="13" r="7"/><circle cx="41" cy="13" r="7"/><circle cx="23" cy="31" r="7"/><circle cx="41" cy="31" r="7"/></g><circle cx="32" cy="22" r="8" fill="#15210f"/></svg>';
  document.body.insertAdjacentHTML("afterbegin",
    '<div class="banner"><b>Preview.</b> Sample data only. Nothing here is real or saved to Dandelions.</div>' +
    '<div class="wrap"><header class="top"><a class="brand" href="/preview/">' + flower + ' Dandelions</a><span class="who">' + esc(S.me.name) + '</span></header></div>');

  const icon = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>',
    projects: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 4v16"/></svg>',
    profile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg>',
    wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M16 13h2M3 10h18"/></svg>',
    talk: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5h16v11H9l-5 4z"/></svg>'
  };
  const tab = (key, href, label, soon) =>
    '<a href="' + href + '"' + (page === key || (page === "project" && key === "projects") || (page === "business" && key === "profile") ? ' aria-current="page"' : "") + (soon ? ' class="soon" aria-disabled="true"' : "") + ">" + icon[key] + label + "</a>";
  document.body.insertAdjacentHTML("beforeend",
    '<nav class="tabs" aria-label="Preview screens">' +
    tab("home", "/preview/", "Home") + tab("projects", "/preview/projects.html", "Projects") + tab("profile", "/preview/profile.html", "Profile") +
    tab("wallet", "#", "Wallet", true) + tab("talk", "#", "Talk", true) + "</nav>");
  document.querySelectorAll(".tabs a.soon").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); toast("Coming in the next preview batch"); }));

  const main = $("#main");

  // ---------- Person profile ----------
  if (page === "profile") {
    const m = S.me;
    const steps = ["Visitor", "Verified", "Business", "Checker", "Operator", "Keeper"];
    const mine = S.businesses.filter((b) => m.owns.includes(b.id));
    const hiring = S.businesses.filter((b) => !m.owns.includes(b.id) && b.hiring.length);
    if (saved.lookingOpen !== undefined) m.lookingFor.open = saved.lookingOpen;

    main.innerHTML =
      '<div class="card hero-card"><div class="avatar"><img src="/images/andy.webp" alt=""></div><div>' +
        '<h1 style="font-size:28px">' + esc(m.name) + "</h1>" +
        '<p class="muted small">' + esc(m.county) + "</p>" +
        '<div class="row" style="margin-top:6px"><span class="chip ok">ID checked</span><span class="chip sun">Business owner</span></div>' +
      "</div></div>" +

      '<div class="card"><div class="spread"><h2>Your path</h2><span class="small muted">Step ' + m.step + " of 6</span></div>" +
        '<div class="ladder">' + steps.map((s, i) => '<div class="' + (i + 1 < m.step ? "done" : i + 1 === m.step ? "now" : "") + '">' + s + "</div>").join("") + "</div>" +
        '<p class="small" style="margin-top:14px"><b>Next: ' + esc(m.nextStep.name) + '.</b> <span class="muted">Checkers get picked at random to look at proof, and can serve on dispute panels.</span></p>' +
        '<div class="stack" style="margin-top:10px">' + m.nextStep.needs.map((n) =>
          '<div><div class="spread small"><span>' + esc(n.text) + '</span><span class="muted">' + n.done + " of " + n.of + '</span></div><div class="bar"><span style="width:' + Math.round(n.done / n.of * 100) + '%"></span></div></div>').join("") + "</div>" +
      "</div>" +

      '<div class="card stats">' +
        '<div class="stat"><b>' + m.stats.projects + "</b><span>Projects worked</span></div>" +
        '<div class="stat"><b>' + m.stats.checks + "</b><span>Checks done</span></div>" +
        '<div class="stat"><b>' + m.stats.months + "</b><span>Months a member</span></div>" +
      "</div>" +

      '<h2 class="section-title">Your businesses</h2>' +
      mine.map((b) => '<a class="card pcard" href="/preview/business.html?id=' + b.id + '"><div class="spread"><h3 style="margin:0">' + esc(b.name) + '</h3><span class="chip ok">License checked</span></div>' +
        '<p class="small muted" style="margin-top:4px">' + b.services.slice(0, 3).map(esc).join(" · ") + '</p><p class="small" style="margin-top:8px">Open business profile →</p></a>').join("") +

      '<h2 class="section-title">Looking for work</h2>' +
      '<div class="card"><div class="spread"><b>Open to work</b><button class="btn small' + (m.lookingFor.open ? "" : " ghost") + '" type="button" id="open-toggle" aria-pressed="' + m.lookingFor.open + '">' + (m.lookingFor.open ? "Yes" : "No") + "</button></div>" +
        '<p class="small muted" style="margin-top:6px">Businesses that are hiring can find you. Pay is agreed between you and the business.</p>' +
        '<div class="row" style="margin-top:10px">' + m.lookingFor.kinds.map((k) => '<span class="chip">' + esc(k) + "</span>").join("") + '<span class="chip">' + esc(m.lookingFor.area) + "</span></div>" +
        '<p class="small" style="margin-top:12px"><b>What I can do</b></p><div class="row" style="margin-top:6px">' + m.canDo.map((k) => '<span class="chip">' + esc(k) + "</span>").join("") + "</div>" +
        '<p class="small" style="margin-top:12px"><b>Certifications</b></p><div class="row" style="margin-top:6px">' + m.certs.map((c) => '<span class="chip">' + esc(c) + "</span>").join("") + "</div>" +
      "</div>" +

      '<h2 class="section-title">Hiring near you</h2>' +
      '<div class="card">' + hiring.map((b) => b.hiring.map((h) =>
        '<div class="skill"><div><b>' + esc(h.title) + '</b><div class="small muted">' + esc(b.name) + " · " + esc(h.note) + '</div></div><div style="text-align:right"><span class="chip">' + esc(h.kind) + '</span></div></div>').join("")).join("") +
        '<p class="small muted" style="margin-top:8px">Matched from what you can do and where you are. Every job is with the business and paid in dollars.</p></div>' +

      '<h2 class="section-title">Badges</h2>' +
      '<div class="card badges">' + m.badges.map((b) =>
        '<div class="badge' + (b.got ? "" : " locked") + '"><div class="disc">' + b.icon + "</div>" + esc(b.name) + "</div>").join("") + "</div>" +

      '<p class="small muted" style="margin-top:18px">ID checked by ' + esc(m.verified.by) + " on " + esc(m.verified.on) + ". Dandelions keeps only the yes and the date, never your ID papers.</p>";

    $("#open-toggle").addEventListener("click", () => { saved.lookingOpen = !m.lookingFor.open; save(); location.reload(); });
  }

  // ---------- Business profile ----------
  if (page === "business") {
    const id = new URLSearchParams(location.search).get("id") || "b1";
    const b = S.businesses.find((x) => x.id === id) || S.businesses[0];
    const isMine = S.me.owns.includes(b.id);
    if (saved.busy && saved.busy[b.id] !== undefined) b.busy = saved.busy[b.id];
    const theirs = S.projects.filter((p) => p.ownerId === b.id);
    const busyWord = (n) => (n < 40 ? "Lots of room" : n < 70 ? "Some room" : n < 90 ? "Busy" : "Full");

    main.innerHTML =
      '<div class="page-head"><div class="eyebrow">Business profile</div><h1 style="font-size:32px">' + esc(b.name) + "</h1>" +
        "<p>" + esc(b.county) + " · Owner: " + esc(b.owner) + "</p></div>" +
      '<div class="card"><div class="row"><span class="chip ok">License checked</span><span class="chip">Accepts points</span><span class="chip">In the directory</span></div>' +
        '<p class="small muted" style="margin-top:8px">' + esc(b.license) + "</p></div>" +

      '<h2 class="section-title">Services</h2>' +
      '<div class="card row">' + b.services.map((s) => '<span class="chip">' + esc(s) + "</span>").join("") + "</div>" +

      '<h2 class="section-title">Track record</h2>' +
      '<div class="card"><div class="stats">' +
        '<div class="stat"><b>' + b.track.done + '</b><span>Projects done</span></div>' +
        '<div class="stat"><b>' + Math.round(b.track.onTime / b.track.done * 100) + '%</b><span>On time</span></div>' +
        '<div class="stat"><b>' + b.track.disputes + '</b><span>Disputes</span></div>' +
        '<div class="stat"><b>' + fmt(b.track.average) + '</b><span>Avg size, pts</span></div>' +
        '<div class="stat"><b>' + fmt(b.track.largest) + '</b><span>Largest, pts</span></div>' +
        '<div class="stat"><b>' + b.size.employees + '</b><span>Employees</span></div>' +
      "</div></div>" +

      '<h2 class="section-title">Project size</h2>' +
      '<div class="card"><div class="spread"><span>Largest project this business can take now</span><span class="pts" style="font-size:22px">' + fmt(b.limit.now) + " pts</span></div>" +
        '<p class="small muted" style="margin-top:6px">' + esc(b.limit.rule) + "</p>" +
        '<div class="stats" style="margin-top:12px;grid-template-columns:1fr 1fr">' +
          '<div class="stat"><b>$' + fmt(b.size.grossUsd) + '</b><span>Last year\'s gross, dollars</span></div>' +
          '<div class="stat"><b>' + fmt(b.size.grossPts) + '</b><span>Last year\'s gross, points</span></div>' +
        "</div>" + (isMine ? '<p class="small muted" style="margin-top:8px">Only you and the checkers see the dollar figure. The public sees the size limit.</p>' : "") + "</div>" +

      '<h2 class="section-title">How busy right now</h2>' +
      '<div class="card"><div class="spread"><b id="busy-word">' + busyWord(b.busy) + '</b><span class="muted small"><span id="busy-n">' + b.busy + "</span>% booked</span></div>" +
        '<div class="bar" style="margin-top:8px"><span id="busy-bar" style="width:' + b.busy + '%"></span></div>' +
        (isMine ? '<label class="small" style="display:block;margin-top:12px">Update this month<input id="busy" type="range" min="0" max="100" step="5" value="' + b.busy + '" style="width:100%"></label>' : "") +
        '<p class="small muted" style="margin-top:8px">Every business reports this once a month. Added up by area and trade, it tells Dandelions where there\'s room for new projects, so we only fund work the market isn\'t already paying for.</p></div>' +

      '<h2 class="section-title">Hiring</h2>' +
      '<div class="card">' + (b.hiring.length ? b.hiring.map((h) =>
        '<div class="skill"><div><b>' + esc(h.title) + '</b><div class="small muted">' + esc(h.note) + '</div></div><div style="text-align:right"><span class="chip">' + esc(h.kind) + "</span></div></div>").join("") : '<p class="muted">Not hiring right now.</p>') +
        (isMine ? '<button class="btn ghost small" type="button" id="add-job" style="margin-top:10px">Post a job</button>' : "") +
        '<p class="small muted" style="margin-top:8px">Members who are open to work get matched to these. Pay is in dollars, agreed with the business.</p></div>' +

      '<h2 class="section-title">Projects</h2>' +
      '<div class="stack">' + (theirs.length ? theirs.map((p) => '<a class="card pcard" href="/preview/project.html?id=' + p.id + '"><span class="type">' + esc(typeName(p.type)) + "</span><h3>" + esc(p.title) + '</h3><p class="small muted">' + fmt(p.points) + " points</p></a>").join("") : '<p class="muted">No open projects.</p>') + "</div>";

    const r = $("#busy");
    if (r) r.addEventListener("input", () => {
      b.busy = +r.value;
      $("#busy-n").textContent = b.busy; $("#busy-word").textContent = busyWord(b.busy); $("#busy-bar").style.width = b.busy + "%";
      saved.busy = Object.assign(saved.busy || {}, { [b.id]: b.busy }); save();
    });
    const j = $("#add-job");
    if (j) j.addEventListener("click", () => toast("Posting jobs comes with the real build"));
  }

  // ---------- Project board ----------
  if (page === "projects") {
    let filter = "all";
    const progress = (p) => {
      const done = p.milestones.filter((x) => x.status === "approved").reduce((a, x) => a + x.points, 0);
      return Math.round(done / p.points * 100);
    };
    const card = (p) =>
      '<a class="card pcard" href="/preview/project.html?id=' + p.id + '">' +
        '<div class="spread"><span class="type">' + esc(typeName(p.type)) + '</span>' + (p.mine ? '<span class="chip sun">Yours</span>' : "") + "</div>" +
        "<h3>" + esc(p.title) + "</h3>" +
        '<p class="small muted">' + esc(p.owner) + " · " + esc(p.county) + "</p>" +
        '<div class="bar" style="margin-top:10px"><span style="width:' + progress(p) + '%"></span></div>' +
        '<div class="meta"><span><b class="pts">' + fmt(p.points) + "</b> points</span><span><b>" + p.milestones.length + "</b> milestones</span>" +
          (p.helpers ? "<span><b>" + p.helpers + "</b> helper spot" + (p.helpers === 1 ? "" : "s") + " open</span>" : "") + "</div>" +
      "</a>";
    const draw = () => {
      const list = S.projects.filter((p) => filter === "all" || (filter === "mine" ? p.mine : p.type === filter));
      $("#list").innerHTML = list.length ? list.map(card).join("") : '<p class="muted">No projects of this kind yet.</p>';
    };
    main.innerHTML =
      '<div class="page-head"><div class="eyebrow">Project board</div><h1>There\'s plenty to do.</h1><p>Projects are owned and run by businesses. Find one to help with, or start your own.</p></div>' +
      '<div class="spread" style="margin-bottom:12px"><span class="small muted">' + S.projects.length + ' projects near you</span><button class="btn small" id="start" type="button">Start a project</button></div>' +
      '<div class="filters" id="filters"><button type="button" data-f="all" aria-pressed="true">All</button><button type="button" data-f="mine" aria-pressed="false">Mine</button>' +
        S.types.map((t) => '<button type="button" data-f="' + t.key + '" aria-pressed="false">' + esc(t.name) + "</button>").join("") + "</div>" +
      '<div id="list" class="stack"></div>' +
      '<p class="small muted" style="margin-top:18px">Visitors can browse every project. Taking or starting one needs an ID check and a business license.</p>';
    draw();
    $("#filters").addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      filter = b.dataset.f;
      document.querySelectorAll("#filters button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      draw();
    });
    $("#start").addEventListener("click", () => {
      const back = document.createElement("div");
      back.className = "sheet-back";
      back.innerHTML = '<div class="sheet" role="dialog" aria-label="Start a project"><div class="spread"><h2 style="font-size:24px">Pick a project type</h2><button class="btn ghost small" type="button" data-close>Close</button></div>' +
        '<p class="small muted" style="margin:6px 0 14px">Each type comes with its milestones and proof rules already set. You fill in the details.</p>' +
        S.types.map((t) => '<button class="tpl" type="button"><b>' + esc(t.name) + '</b><span class="chip">Template</span><span class="small muted" style="grid-column:1/-1">' + esc(t.blurb) + "</span></button>").join("") +
        '<p class="note" style="margin-top:14px">Before a project is approved, a capacity check makes sure the workers and materials exist, and that you\'re not asking for more points than your business can spend.</p></div>';
      back.addEventListener("click", (e) => {
        if (e.target === back || e.target.closest("[data-close]")) back.remove();
        else if (e.target.closest(".tpl")) { back.remove(); toast("The project form comes with the real build"); }
      });
      document.body.appendChild(back);
    });
  }

  // ---------- One project ----------
  if (page === "project") {
    const id = new URLSearchParams(location.search).get("id") || "p2";
    const p = S.projects.find((x) => x.id === id) || S.projects[0];
    const NEED = 3, PANEL = 5;
    let view = p.mine ? "owner" : "visitor";
    let localProof = [];

    const current = () => p.milestones.find((m) => m.status !== "approved");
    const persist = () => { saved.projects = S.projects; saved.log = S.log; save(); };
    const addLog = (what) => { S.log.unshift({ when: "Just now", what }); };

    function milestone(m, i) {
      const isCur = m === current();
      const votes = '<div class="votes" aria-label="' + m.votes.filter((v) => v === "yes").length + " of " + NEED + ' yes votes needed">' +
        Array.from({ length: PANEL }, (_, k) => {
          const v = m.votes[k];
          return '<i class="' + (v || "") + '">' + (v === "yes" ? "✓" : v === "no" ? "✕" : "") + "</i>";
        }).join("") + "</div>";
      const label = { approved: '<span class="chip ok">Approved</span>', review: '<span class="chip sun">Being checked</span>', todo: isCur ? '<span class="chip">Up next</span>' : '<span class="chip">Later</span>' }[m.status];
      let body = "";
      if (m.proof.length || (isCur && view === "owner" && localProof.length)) {
        body += '<div class="proof">' + m.proof.map((x) => "<figure>" + esc(x) + "</figure>").join("") +
          (isCur ? localProof.map((src) => '<figure><img src="' + src + '" alt="Your proof photo"><figcaption>New</figcaption></figure>').join("") : "") + "</div>";
      }
      if (m.status === "review" || m.status === "approved") {
        body += votes + '<p class="small muted" style="margin-top:4px">' + m.votes.filter((v) => v === "yes").length + " of " + NEED + " yes votes from random checkers" + (m.status === "approved" ? ". Points released." : "") + "</p>";
      }
      if (isCur && view === "owner" && m.status === "todo") {
        body += '<label class="upload"><input type="file" accept="image/*" multiple id="file"><span><b>Add proof photos</b><br><span class="small muted">Time and place are read from each photo. In the preview they stay on your phone.</span></span></label>' +
          '<button class="btn" type="button" id="submit" style="margin-top:10px"' + (localProof.length ? "" : " disabled") + ">Send for checking</button>";
      }
      if (isCur && view === "owner" && m.status === "review") {
        body += '<p class="note" style="margin-top:10px">Random checkers are looking at your proof. You\'ll get the points when ' + NEED + " say yes.</p>" +
          '<button class="btn ghost small" type="button" id="simulate" style="margin-top:8px">Preview only: pretend the checkers voted</button>';
      }
      if (isCur && view === "checker" && m.status === "review" && p.mine) {
        body += '<p class="note" style="margin-top:10px">You can\'t check your own project. <a href="/preview/project.html?id=p5">Try checking Summit Roofing\'s project</a> instead.</p>';
      }
      if (isCur && view === "checker" && m.status === "review" && !p.mine) {
        body += '<div class="card" style="margin-top:10px;background:var(--soft)"><b>You were picked to check this.</b>' +
          '<p class="small muted" style="margin:4px 0 8px">Look at every photo and receipt. Does it show the work was done as described?</p>' +
          '<textarea id="note" placeholder="Notes for the business (needed if you say no)"></textarea>' +
          '<div class="row" style="margin-top:8px"><button class="btn small" type="button" data-vote="yes">Yes, it\'s done</button><button class="btn ghost small" type="button" data-vote="no">Needs work</button></div>' +
          '<p class="small muted" style="margin-top:8px">You can\'t check your own projects, your customers, your suppliers or competitors.</p></div>';
      }
      return '<div class="ms ' + m.status + '"><div class="dot">' + (m.status === "approved" ? "✓" : i + 1) + "</div>" +
        '<div class="spread"><h3>' + esc(m.title) + '</h3><span class="pts small">' + fmt(m.points) + " pts</span></div>" +
        '<div style="margin-top:4px">' + label + "</div>" + body + "</div>";
    }

    function draw() {
      const paid = p.milestones.filter((m) => m.status === "approved").reduce((a, m) => a + m.points, 0);
      main.innerHTML =
        '<p class="small" style="margin:4px 0 10px"><a href="/preview/projects.html">← All projects</a></p>' +
        '<div class="page-head" style="padding-top:0"><div class="eyebrow">' + esc(typeName(p.type)) + "</div><h1 style=\"font-size:32px\">" + esc(p.title) + "</h1>" +
          "<p>" + (p.ownerId ? '<a href="/preview/business.html?id=' + p.ownerId + '">' + esc(p.owner) + "</a>" : esc(p.owner)) + (p.client ? " for " + esc(p.client) : "") + " · " + esc(p.county) + "</p></div>" +
        '<div class="viewas" id="viewas" role="group" aria-label="See this page as">' +
          ["owner", "checker", "visitor"].map((v) => '<button type="button" data-v="' + v + '" aria-pressed="' + (view === v) + '">As ' + (v === "owner" ? "owner" : v === "checker" ? "checker" : "visitor") + "</button>").join("") + "</div>" +
        '<div class="card"><p>' + esc(p.desc) + "</p>" +
          '<div class="stats" style="margin-top:12px"><div class="stat"><b>' + fmt(p.points) + '</b><span>Total points</span></div><div class="stat"><b>' + fmt(paid) + '</b><span>Paid so far</span></div><div class="stat"><b>' + p.helpers + "</b><span>Helper spots</span></div></div>" +
          (view === "visitor" ? '<button class="btn" type="button" id="help" style="margin-top:14px;width:100%">Help on this project</button>' : "") +
        "</div>" +
        (p.subs ? '<h2 class="section-title">Sub-projects</h2><div class="card">' + p.subs.map((s) => '<div class="spread" style="padding-block:6px"><span>' + esc(s) + '</span><span class="chip">Creator</span></div>').join("") + "</div>" : "") +
        (S.local[p.county] ? '<h2 class="section-title">Why this is funded now</h2><div class="card">' +
          '<div class="stats"><div class="stat"><b>' + S.local[p.county].busy + '%</b><span>How booked local ' + esc(S.local[p.county].trade.toLowerCase()) + ' businesses are</span></div>' +
          '<div class="stat"><b>' + S.local[p.county].lookingForWork + '</b><span>Members nearby looking for this kind of work</span></div>' +
          '<div class="stat"><b>' + esc(S.local[p.county].materials) + '</b><span>Materials</span></div></div>' +
          '<p class="small muted" style="margin-top:10px">From ' + S.local[p.county].reporting + ' businesses reporting in ' + esc(p.county) + '. Dandelions only funds work the market isn\'t paying for, and only as much as local workers and materials can cover. If local businesses fill up, new funding here pauses.</p></div>' : "") +
        '<h2 class="section-title">Milestones</h2><div class="card">' + p.milestones.map(milestone).join("") + "</div>" +
        '<h2 class="section-title">Public log</h2><div class="card log"><ul>' + S.log.slice(0, 6).map((l) => '<li><span class="when">' + esc(l.when) + "</span><br>" + esc(l.what) + "</li>").join("") + "</ul></div>" +
        '<p class="small muted" style="margin-top:10px">Every step goes on the public log, with no personal info. A fingerprint of the log is posted daily so history can\'t be changed quietly.</p>';
    }
    draw();

    main.addEventListener("click", (e) => {
      const v = e.target.closest("[data-v]");
      if (v) { view = v.dataset.v; draw(); return; }
      if (e.target.closest("#help")) { toast("Helping needs an ID check and a business license"); return; }
      if (e.target.closest("#submit")) {
        const m = current();
        m.proof = m.proof.concat(localProof.map((_, i) => "New photo " + (i + 1)));
        m.status = "review";
        addLog("milestone.proof_added " + p.id + " milestone " + (p.milestones.indexOf(m) + 1) + ", " + localProof.length + " files");
        localProof = [];
        persist(); draw(); toast("Sent. Five random checkers have been picked.");
        return;
      }
      const vote = e.target.closest("[data-vote]") || e.target.closest("#simulate");
      if (vote) {
        const m = current();
        if (vote.id === "simulate") {
          while (m.votes.filter((x) => x === "yes").length < NEED) m.votes.push("yes");
          m.status = "approved";
          addLog("points.released " + m.points + " to " + p.owner + " (" + p.id + ", milestone " + (p.milestones.indexOf(m) + 1) + ", " + NEED + " of " + PANEL + " checkers yes)");
          persist(); draw(); toast("Approved. " + m.points + " points released to " + p.owner + ".");
          return;
        }
        const note = ($("#note") || {}).value || "";
        if (vote.dataset.vote === "no" && !note.trim()) { toast("Add a note so the business knows what to fix"); return; }
        m.votes.push(vote.dataset.vote);
        addLog("check.vote you: " + vote.dataset.vote + " (" + p.id + ", milestone " + (p.milestones.indexOf(m) + 1) + ")");
        // Fill in the rest of the panel so the preview shows what happens next.
        while (m.votes.filter((x) => x === "yes").length < NEED && m.votes.length < PANEL) {
          m.votes.push(m.votes.length % 4 === 3 ? "no" : "yes");
        }
        if (m.votes.filter((x) => x === "yes").length >= NEED) {
          m.status = "approved";
          addLog("points.released " + m.points + " to " + p.owner + " (" + p.id + ", milestone " + (p.milestones.indexOf(m) + 1) + ", " + NEED + " of " + PANEL + " checkers yes)");
          toast("Approved. " + m.points + " points released to " + p.owner + ".");
        } else {
          m.status = "todo"; m.votes = [];
          toast("Not enough yes votes. Sent back with notes.");
        }
        persist(); draw();
      }
    });
    main.addEventListener("change", (e) => {
      if (e.target.id !== "file") return;
      const files = Array.from(e.target.files || []).slice(0, 8);
      localProof = files.map((f) => URL.createObjectURL(f));
      draw();
    });
  }

  // ---------- Hub ----------
  if (page === "hub") {
    main.querySelector("#reset").addEventListener("click", () => {
      try { localStorage.removeItem(KEY); } catch (e) { /* nothing saved */ }
      toast("Preview reset");
      setTimeout(() => location.reload(), 600);
    });
  }
})();
