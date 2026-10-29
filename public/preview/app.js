// Preview screens: render sample data, keep clicks in this browser only.
(function () {
  const S = window.SAMPLE;
  const page = document.body.dataset.page;
  const $ = (sel, el = document) => el.querySelector(sel);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (n) => n.toLocaleString("en-US");
  const typeName = (k) => (S.types.find((t) => t.key === k) || {}).name || k;

  // Changes made while clicking around are kept in this browser so the preview feels real.
  const KEY = "dandelions-preview-v3";
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
    '<div class="wrap"><header class="top"><a class="brand" href="/preview/">' + flower + ' Dandelions</a><a class="who" href="/preview/profile.html">' + esc(S.me.name) + ' ›</a></header></div>');

  const icon = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>',
    projects: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 4v16"/></svg>',
    profile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg>',
    wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M16 13h2M3 10h18"/></svg>',
    talk: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5h16v11H9l-5 4z"/></svg>'
  };
  icon.directory = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h12a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2z"/><path d="M8 8h6M8 12h6"/></svg>';
  icon.hub = icon.home;
  const tabOf = { project: "projects", business: "directory", dispute: "talk" };
  const tab = (key, href, label) =>
    '<a href="' + href + '"' + ((tabOf[page] || page) === key ? ' aria-current="page"' : "") + ">" + icon[key] + label + "</a>";
  document.body.insertAdjacentHTML("beforeend",
    '<nav class="tabs" aria-label="Preview screens">' +
    tab("hub", "/preview/", "Home") + tab("projects", "/preview/projects.html", "Work") + tab("directory", "/preview/directory.html", "Directory") +
    tab("wallet", "/preview/wallet.html", "Wallet") + tab("talk", "/preview/talk.html", "Talk") + "</nav>");

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
      '<div class="page-head"><div class="eyebrow">Funded work</div><h1>There\'s plenty to do.</h1><p>Points are created only for work the market doesn\'t pay for: training people, common-good work usually paid by taxes or charity, and running Dandelions. Every project is run by a business.</p></div>' +
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
    const startForm = (t) => '<div class="spread"><h2 style="font-size:24px">' + esc(t.name) + '</h2><button class="btn ghost small" type="button" data-close>Close</button></div>' +
      '<p class="small muted" style="margin:6px 0 14px">' + esc(t.blurb) + '</p>' +
      '<label class="small"><b>Area</b><select style="width:100%;margin:4px 0 12px;padding:10px;border-radius:10px;border:1px solid var(--line);background:var(--card)"><option>Fresno County, CA</option><option>California</option><option>Nationwide</option></select></label>' +
      '<label class="small"><b>Category</b><select style="width:100%;margin:4px 0 12px;padding:10px;border-radius:10px;border:1px solid var(--line);background:var(--card)"><option>Only categories open in this area show here</option></select></label>' +
      '<p class="note">Concept only. The full form, with the categories and limits for each area, comes in the detail pass.</p>' +
      '<button class="btn" type="button" data-close style="margin-top:12px;width:100%">Done</button>';
    $("#start").addEventListener("click", () => {
      const back = document.createElement("div");
      back.className = "sheet-back";
      back.innerHTML = '<div class="sheet" role="dialog" aria-label="Start a project"><div class="spread"><h2 style="font-size:24px">Pick a project type</h2><button class="btn ghost small" type="button" data-close>Close</button></div>' +
        '<p class="small muted" style="margin:6px 0 14px">Each type comes with its milestones and proof rules already set. You fill in the details.</p>' +
        S.types.map((t) => '<button class="tpl" type="button"><b>' + esc(t.name) + '</b><span class="chip">Template</span><span class="small muted" style="grid-column:1/-1">' + esc(t.blurb) + "</span></button>").join("") +
        '<p class="note" style="margin-top:14px">Before a project is approved, a capacity check makes sure the workers and materials exist, and that you\'re not asking for more points than your business can spend.</p></div>';
      back.addEventListener("click", (e) => {
        if (e.target === back || e.target.closest("[data-close]")) back.remove();
        else if (e.target.closest(".tpl")) { const t = S.types[[...back.querySelectorAll(".tpl")].indexOf(e.target.closest(".tpl"))]; back.querySelector(".sheet").innerHTML = startForm(t); }
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
          '<div class="stats"><div class="stat"><b>' + S.local[p.county].busy + '%</b><span>How booked local businesses in this work are</span></div>' +
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

  // ---------- Home ----------
  if (page === "hub") {
    const here = S.local[S.me.county];
    const nat = [["21,440", "Members"], ["1,906", "Businesses"], ["412", "Projects done"], ["38,200", "Points created"], ["4,100", "Points retired"], ["+0.3%", "Price change, 12 months"]];
    main.innerHTML =
      '<div class="page-head"><div class="eyebrow">Nationwide, sample numbers</div><h1>There\'s plenty to do.</h1></div>' +
      '<div class="card"><div class="stats">' + nat.map((n) => '<div class="stat"><b>' + n[0] + "</b><span>" + n[1] + "</span></div>").join("") + "</div>" +
        '<p class="small muted" style="margin-top:10px">Points changing hands this month: <b>9,870</b>. All numbers come from the public log.</p></div>' +

      '<h2 class="section-title">' + esc(S.me.county) + "</h2>" +
      '<div class="card"><div class="spread"><b>Stage: Sprout 🌱</b><span class="small muted">1.4% of the county</span></div>' +
        '<div class="bar" style="margin-top:8px"><span style="width:28%"></span></div><p class="small muted" style="margin-top:4px">Bloom at 5%</p>' +
        '<div class="stats" style="margin-top:12px"><div class="stat"><b>412</b><span>Members</span></div><div class="stat"><b>38</b><span>Businesses</span></div><div class="stat"><b>' + here.busy + '%</b><span>How booked businesses are</span></div>' +
        '<div class="stat"><b>' + here.lookingForWork + '</b><span>Looking for work</span></div><div class="stat"><b>5</b><span>Funded projects open</span></div><div class="stat"><b>' + esc(here.materials) + "</b><span>Materials</span></div></div>" +
        '<p class="note" style="margin-top:12px"><b>AI note:</b> Lots of people here want trade work and repair businesses have room. Pay to train projects would fit well right now. <span class="muted">Based on 23 business reports and county job data.</span></p>' +
        '<button class="btn ghost small" type="button" id="explore" style="margin-top:12px">See another place</button></div>' +

      '<h2 class="section-title">Preview screens</h2><div class="stack">' +
        [["🌼", "/preview/profile.html", "Your profile", "Your path, what you can do, jobs near you, badges."],
         ["🏪", "/preview/business.html?id=b1", "Business profile", "Services, track record, size limit, how busy, hiring."],
         ["📋", "/preview/projects.html", "Funded work", "Pay to train, common good, spread the word, run Dandelions."],
         ["✅", "/preview/project.html?id=p5", "A project, start to payment", "Milestones, proof, random checkers."],
         ["📒", "/preview/directory.html", "Directory", "Member businesses, what they offer, who takes points."],
         ["👛", "/preview/wallet.html", "Wallet", "Business and personal points, send and receive."],
         ["💬", "/preview/talk.html", "Talk and vote", "Rooms, ideas gaining support, what's on the ballot."],
         ["⚖️", "/preview/dispute.html", "A dispute case", "Steps, deadlines, evidence, the panel."]]
        .map((x) => '<a class="card screen-link" href="' + x[1] + '"><span class="ico">' + x[0] + "</span><span><b>" + x[2] + '</b><br><span class="small muted">' + x[3] + "</span></span></a>").join("") + "</div>" +
      '<button class="btn ghost small" type="button" id="reset" style="margin-top:16px">Reset the preview</button>';
    $("#explore").addEventListener("click", () => toast("A map to pick any state or county comes later"));
    $("#reset").addEventListener("click", () => {
      try { localStorage.removeItem(KEY); } catch (e) { /* nothing saved */ }
      toast("Preview reset");
      setTimeout(() => location.reload(), 600);
    });
  }

  // ---------- Directory ----------
  if (page === "directory") {
    let q = "";
    const draw = () => {
      const list = S.directory.filter((b) => !q || (b.name + " " + b.services).toLowerCase().includes(q));
      $("#dir").innerHTML = list.map((b) => {
        const inner = '<div class="spread"><h3 style="margin:0">' + esc(b.name) + '</h3><span class="chip">' + esc(b.takes) + "</span></div>" +
          '<p class="small muted" style="margin-top:4px">' + esc(b.services) + " · " + esc(b.county) + "</p>" +
          (b.offer ? '<p class="small" style="margin-top:8px">🎁 ' + esc(b.offer) + "</p>" : "");
        return b.id ? '<a class="card pcard" href="/preview/business.html?id=' + b.id + '">' + inner + "</a>" : '<div class="card">' + inner + "</div>";
      }).join("") || '<p class="muted">No matches.</p>';
    };
    main.innerHTML =
      '<div class="page-head"><div class="eyebrow">Directory</div><h1>Spend points locally.</h1><p>Member businesses and what they offer. Regular jobs, like repairs for a landlord, happen here, paid in points or dollars. Later this moves to 10spot.shop.</p></div>' +
      '<input id="q" type="search" placeholder="Search: plumber, lunch, painting…" style="width:100%;padding:12px;border-radius:12px;border:1px solid var(--line);background:var(--card);margin-bottom:12px">' +
      '<div id="dir" class="stack"></div>';
    draw();
    $("#q").addEventListener("input", (e) => { q = e.target.value.trim().toLowerCase(); draw(); });
  }

  // ---------- Wallet ----------
  if (page === "wallet") {
    const w = S.wallet;
    if (saved.wallet) Object.assign(w, saved.wallet);
    let which = "business";
    const draw = () => {
      const acct = w[which];
      main.innerHTML =
        '<div class="page-head"><div class="eyebrow">Wallet</div><h1>' + fmt(acct.balance) + ' <span style="font-size:.5em">points</span></h1><p>' + esc(acct.name) + "</p></div>" +
        '<div class="viewas" id="which"><button type="button" data-w="business" aria-pressed="' + (which === "business") + '">Business</button><button type="button" data-w="personal" aria-pressed="' + (which === "personal") + '">Personal</button></div>' +
        '<div class="row" style="margin-bottom:14px"><button class="btn" type="button" id="send">Send</button><button class="btn ghost" type="button" id="recv">Receive</button></div>' +
        '<div id="pane"></div>' +
        '<h2 class="section-title">History</h2><div class="card">' + w.history.filter((h) => h.wallet === which).map((h) =>
          '<div class="skill"><div><b>' + esc(h.what) + '</b><div class="small muted">' + esc(h.when) + '</div></div><div class="pts" style="color:' + (h.amt > 0 ? "var(--leaf)" : "var(--ink)") + '">' + (h.amt > 0 ? "+" : "") + fmt(h.amt) + "</div></div>").join("") + "</div>" +
        '<p class="small muted" style="margin-top:12px">' + (which === "business" ? "Only businesses get paid from Dandelions. " : "Your personal wallet holds points you get from other members, like selling a bike. ") +
          "Points have no cash value, and Dandelions never buys or sells them. Never use points to pay wages.</p>";
    };
    draw();
    main.addEventListener("click", (e) => {
      const b = e.target.closest("[data-w]");
      if (b) { which = b.dataset.w; draw(); return; }
      if (e.target.closest("#recv")) {
        $("#pane").innerHTML = '<div class="card" style="text-align:center"><div style="width:160px;height:160px;margin:0 auto;border-radius:12px;background:repeating-conic-gradient(var(--ink) 0 25%, var(--card) 0 50%) 0 0/20px 20px;border:8px solid var(--card);outline:1px solid var(--line)"></div><p class="small muted" style="margin-top:8px">Show this code to get paid. (Pretend code.)</p></div>';
      }
      if (e.target.closest("#send")) {
        $("#pane").innerHTML = '<div class="card"><label class="small"><b>To</b><input id="to" placeholder="Business or member name" style="width:100%;margin:4px 0 10px;padding:10px;border-radius:10px;border:1px solid var(--line);background:var(--card)"></label>' +
          '<label class="small"><b>Points</b><input id="amt" type="number" min="1" placeholder="0" style="width:100%;margin:4px 0 10px;padding:10px;border-radius:10px;border:1px solid var(--line);background:var(--card)"></label>' +
          '<label class="small"><b>For</b><input id="for" placeholder="What it\'s for" style="width:100%;margin:4px 0 10px;padding:10px;border-radius:10px;border:1px solid var(--line);background:var(--card)"></label><button class="btn small" type="button" id="go">Send points</button></div>';
      }
      if (e.target.closest("#go")) {
        const to = $("#to").value.trim(), amt = Math.floor(+$("#amt").value), why = $("#for").value.trim();
        if (!to || !(amt > 0)) { toast("Add who it's to and how many points"); return; }
        if (amt > w[which].balance) { toast("Not enough points"); return; }
        w[which].balance -= amt;
        w.history.unshift({ when: "Today", what: "To " + to + (why ? ": " + why : ""), amt: -amt, wallet: which });
        saved.wallet = { business: w.business, personal: w.personal, history: w.history }; save();
        draw(); toast("Sent " + fmt(amt) + " points");
      }
    });
  }

  // ---------- Talk and vote ----------
  if (page === "talk") {
    const T = S.talk;
    if (saved.backed) T.ideas.forEach((i) => { if (saved.backed.includes(i.id)) i.backers += 1; });
    if (saved.voted) T.ballot[saved.voted] += 1;
    const draw = () => {
      const tot = T.ballot.yes + T.ballot.no, pct = Math.round(T.ballot.yes / tot * 100);
      main.innerHTML =
        '<div class="page-head"><div class="eyebrow">Talk and vote</div><h1>Ideas start here.</h1><p>Anyone can read. Verified members can post, back ideas and vote. An idea with enough support goes to a vote.</p></div>' +
        '<h2 class="section-title">On the ballot</h2>' +
        '<div class="card"><span class="chip sun">' + esc(T.ballot.weight) + " decision</span><h3 style=\"margin:8px 0 4px\">" + esc(T.ballot.title) + "</h3>" +
          '<p class="small muted">' + esc(T.ballot.rule) + ". Voting ends " + esc(T.ballot.ends) + ".</p>" +
          '<div class="bar" style="margin-top:10px;height:14px"><span style="width:' + pct + '%"></span></div>' +
          '<div class="spread small" style="margin-top:4px"><span>Yes ' + T.ballot.yes + " (" + pct + "%)</span><span>No " + T.ballot.no + "</span></div>" +
          (saved.voted ? '<p class="small" style="margin-top:10px"><b>You voted ' + saved.voted + '.</b> One person, one vote.</p>' :
            '<div class="row" style="margin-top:10px"><button class="btn small" type="button" data-vote="yes">Vote yes</button><button class="btn ghost small" type="button" data-vote="no">Vote no</button></div>') + "</div>" +
        '<h2 class="section-title">Gaining support</h2><div class="stack">' + T.ideas.map((i) => {
          const done = (saved.backed || []).includes(i.id);
          return '<div class="card"><div class="spread"><span class="chip">' + esc(i.weight) + " · " + esc(i.scope) + '</span><span class="small muted">' + i.replies + " replies</span></div>" +
            '<h3 style="margin:8px 0 4px">' + esc(i.title) + '</h3><p class="small muted">Posted by ' + esc(i.by) + "</p>" +
            '<div class="bar" style="margin-top:10px"><span style="width:' + Math.min(100, Math.round(i.backers / i.need * 100)) + '%"></span></div>' +
            '<div class="spread small" style="margin-top:4px"><span>' + i.backers + " of " + i.need + ' backers to reach the ballot</span><button class="btn small' + (done ? " ghost" : "") + '" type="button" data-back="' + i.id + '"' + (done ? " disabled" : "") + ">" + (done ? "Backed" : "Back it") + "</button></div></div>";
        }).join("") + "</div>" +
        '<h2 class="section-title">Rooms</h2><div class="card">' + T.rooms.map((r) =>
          '<div class="skill"><div><b>' + esc(r.name) + '</b><div class="small muted">' + fmt(r.members) + ' members</div></div><div><span class="chip">' + r.new + " new</span></div></div>").join("") + "</div>" +
        '<p class="small muted" style="margin-top:12px">Light decisions pass with 51% of votes cast. Heavy ones need 75% and a minimum turnout. Charter changes need even more, then the keepers sign.</p>';
    };
    draw();
    main.addEventListener("click", (e) => {
      const v = e.target.closest("[data-vote]");
      if (v) { saved.voted = v.dataset.vote; T.ballot[saved.voted] += 1; save(); draw(); return; }
      const b = e.target.closest("[data-back]");
      if (b) {
        const i = T.ideas.find((x) => x.id === b.dataset.back);
        i.backers += 1; saved.backed = (saved.backed || []).concat(i.id); save(); draw();
        if (i.backers >= i.need) toast("That's enough backers. It goes to a vote.");
      }
    });
  }

  // ---------- Dispute case ----------
  if (page === "dispute") {
    const c = S.dispute;
    main.innerHTML =
      '<div class="page-head"><div class="eyebrow">Case ' + esc(c.id) + "</div><h1 style=\"font-size:32px\">" + esc(c.title) + "</h1><p>" + c.sides.map(esc).join(" and ") + " · " + esc(c.county) + "</p></div>" +
      '<div class="card"><p>' + esc(c.claim) + '</p><p class="note" style="margin-top:12px"><b>' + fmt(c.frozen) + " points frozen</b> until the case ends. Nothing else is frozen.</p></div>" +
      '<h2 class="section-title">Where it stands</h2><div class="card">' + c.steps.map((s, i) =>
        '<div class="ms ' + (s.done ? "approved" : s.now ? "review" : "") + '"><div class="dot">' + (s.done ? "✓" : i + 1) + '</div><div class="spread"><h3>' + esc(s.name) + '</h3><span class="small muted">' + esc(s.when) + "</span></div>" +
        (s.note ? '<p class="small muted">' + esc(s.note) + "</p>" : "") + "</div>").join("") + "</div>" +
      '<h2 class="section-title">Evidence</h2><div class="card"><div class="proof">' + c.evidence.map((x) => "<figure>" + esc(x) + "</figure>").join("") + "</div></div>" +
      '<h2 class="section-title">The panel</h2><div class="card"><div class="votes"><i></i><i></i><i></i></div>' +
        '<p class="small muted" style="margin-top:6px">Three checkers picked at random, with no ties to either side. Their votes and reasons are posted with the ruling.</p></div>' +
      '<p class="small muted" style="margin-top:12px">Rulings are enforced on points and permissions only: unfreeze, redo a payment, a fine into a distribution account, or a step down. Anything about dollars or injuries goes to the regular courts. Names are hidden from the public.</p>';
  }

})();
