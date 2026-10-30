// Preview screens: render sample data, keep clicks in this browser only.
(function () {
  const S = window.SAMPLE;
  const page = document.body.dataset.page;
  const $ = (sel, el = document) => el.querySelector(sel);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (n) => n.toLocaleString("en-US");
  const typeName = (k) => (S.types.find((t) => t.key === k) || {}).name || k;

  // Changes made while clicking around are kept in this browser so the preview feels real.
  const KEY = "dandelions-preview-v4";
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
  const tabOf = { raindy: "hub", project: "projects", checks: "projects", join: "hub", operator: "hub", place: "hub", charter: "talk", business: "directory", dispute: "talk" };
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
        '<p class="small" style="margin-top:14px"><b>Next: ' + esc(m.nextStep.name) + '.</b> <span class="muted">Checkers go look at finished work and say what they saw, and can serve on dispute panels.</span> <a href="/preview/checks.html">Take the short course →</a></p>' +
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

  // ---------- Project board: find, qualify, start, suggest ----------
  if (page === "projects") {
    let filter = "all";
    let lvl = saved.area || "county";
    const A = () => S.areas.find((a) => a.key === lvl);
    const biz = S.businesses.find((b) => S.me.owns.includes(b.id));
    const sel = 'style="width:100%;margin:4px 0 12px;padding:10px;border-radius:10px;border:1px solid var(--line);background:var(--card)"';
    const inArea = (p) => lvl === "nation" ? true
      : lvl === "state" ? p.level !== "nation" && (p.county === "California" || /, CA$/.test(p.county))
      : p.level === "county" && p.county === S.me.county;
    const progress = (p) => {
      const done = p.milestones.filter((x) => x.status === "approved").reduce((a, x) => a + x.points, 0);
      return Math.round(done / p.points * 100);
    };
    // The checklist for running projects at an area level. Each line: [label, ok, detail]
    const checklist = (a) => {
      const open = S.projects.filter((p) => p.ownerId === biz.id && p.milestones.some((m) => m.status !== "approved")).length;
      const onTime = Math.round(biz.track.onTime / biz.track.done * 100);
      return [
        ["ID checked", true, S.me.verified.by],
        ["Business license checked", true, biz.license],
        ["Projects finished", biz.track.done >= a.need.done, biz.track.done + " done" + (a.need.done ? ", need " + a.need.done : ", none needed at county level")],
        ["Finished on time", !a.need.onTime || onTime >= a.need.onTime, onTime + "%" + (a.need.onTime ? ", need " + a.need.onTime + "%" : "")],
        ["No open disputes", true, biz.track.disputes + " past disputes, none open"],
        ["Insurance for on-site work", biz.insured, biz.insured ? "General liability on file" : "Needed for on-site projects"],
        ["Projects open at once", open < a.need.open, open + " open, up to " + a.need.open]
      ];
    };
    const qualifies = (a) => checklist(a).every((c) => c[1]);
    const card = (p) =>
      '<a class="card pcard" href="/preview/project.html?id=' + p.id + '">' +
        '<div class="spread"><span class="type">' + esc(typeName(p.type)) + '</span>' + (p.mine ? '<span class="chip sun">Yours</span>' : "") + "</div>" +
        "<h3>" + esc(p.title) + "</h3>" +
        '<p class="small muted">' + esc(p.owner) + " · " + esc(p.county) + "</p>" +
        '<div class="bar" style="margin-top:10px"><span style="width:' + progress(p) + '%"></span></div>' +
        '<div class="meta"><span><b class="pts">' + fmt(p.points) + "</b> points</span><span><b>" + p.milestones.length + "</b> milestones</span>" +
          (p.helpers ? "<span><b>" + p.helpers + "</b> helper spot" + (p.helpers === 1 ? "" : "s") + " open</span>" : "") + "</div>" +
      "</a>";
    const ideas = () => {
      const scope = A().name;
      const list = (saved.newIdeas || []).concat(S.talk.ideas).filter((i) => i.scope === scope);
      return '<h2 class="section-title">Ideas gaining support here</h2>' +
        (list.length ? '<div class="stack">' + list.map((i) => '<a class="card pcard" href="/preview/talk.html"><div class="spread"><span class="chip">' + esc(i.weight) + '</span><span class="small muted">' + i.backers + " of " + i.need + ' backers</span></div><h3 style="margin-top:6px">' + esc(i.title) + "</h3></a>").join("") + "</div>"
          : '<p class="muted small">No ideas for this area yet.</p>');
    };
    const draw = () => {
      const a = A(), here = S.local[a.name] || {};
      const list = S.projects.filter(inArea).filter((p) => filter === "all" || (filter === "mine" ? p.mine : p.type === filter));
      const ok = qualifies(a);
      main.innerHTML =
        '<div class="page-head"><div class="eyebrow">Funded work</div><h1>There\'s plenty to do.</h1><p>Points are created only for work the market doesn\'t pay for: training people, common-good work usually paid by taxes or charity, and running Dandelions. Every project is run by a business.</p></div>' +
        '<div class="viewas" id="area" role="group" aria-label="Area">' + S.areas.map((x) => '<button type="button" data-area="' + x.key + '" aria-pressed="' + (x.key === lvl) + '">' + esc(x.short) + "</button>").join("") + "</div>" +
        '<div class="card"><div class="spread"><b>' + esc(a.name) + '</b><span class="small muted">' + esc(a.typical) + "</span></div>" +
          '<div class="stats" style="margin-top:10px"><div class="stat"><b>' + (here.busy || "–") + '%</b><span>How booked businesses are</span></div><div class="stat"><b>' + fmt(here.lookingForWork || 0) + '</b><span>Looking for work</span></div><div class="stat"><b>' + esc(here.materials || "–") + "</b><span>Materials</span></div></div></div>" +

        '<h2 class="section-title">Can ' + esc(biz.name) + " run projects here?</h2>" +
        '<div class="card"><div class="spread"><b>' + (ok ? "Yes ✓" : "Not yet") + '</b><span class="chip ' + (ok ? "ok" : "") + '">' + esc(a.short) + " level</span></div>" +
          '<div class="stack" style="margin-top:8px">' + checklist(a).map((c) =>
            '<div class="spread small" style="align-items:flex-start;justify-content:flex-start;gap:10px"><span aria-hidden="true">' + (c[1] ? "✅" : "⬜") + "</span><span><b>" + esc(c[0]) + '</b><br><span class="muted">' + esc(c[2]) + "</span></span></div>").join("") + "</div>" +
          '<p class="small muted" style="margin-top:10px">Largest project you can take now: <b class="pts">' + fmt(biz.limit.now) + " pts</b>. It grows with your yearly gross, employees and track record. Some categories also need a trade license.</p>" +
          '<button class="btn" id="start" type="button" style="margin-top:12px;width:100%"' + (ok ? "" : " disabled") + ">Start a project " + (a.key === "nation" ? "nationwide" : "in " + esc(a.name)) + "</button>" +
          (ok ? "" : '<p class="small muted" style="margin-top:6px">Finish more county projects on time to unlock this level.</p>') + "</div>" +

        '<h2 class="section-title">Projects</h2>' +
        '<div class="filters" id="filters"><button type="button" data-f="all" aria-pressed="' + (filter === "all") + '">All</button><button type="button" data-f="mine" aria-pressed="' + (filter === "mine") + '">Mine</button>' +
          S.types.map((t) => '<button type="button" data-f="' + t.key + '" aria-pressed="' + (filter === t.key) + '">' + esc(t.name) + "</button>").join("") + "</div>" +
        '<div class="stack">' + (list.length ? list.map(card).join("") : '<p class="muted">No projects of this kind here yet.</p>') + "</div>" +
        '<a class="card screen-link" href="/preview/checks.html" style="margin-top:12px"><span class="ico">🔍</span><span><b>Checker work</b><br><span class="small muted">' + S.checks.tickets.length + ' checks near you need checkers. Your business earns a fee for each.</span></span></a>' +

        ideas() +
        '<div class="card" style="margin-top:12px;background:var(--soft)"><b>Something missing?</b><p class="small muted" style="margin:4px 0 10px">Any verified member can suggest a new project or category. It goes to Talk, and with enough backers it goes to a vote.</p><button class="btn ghost small" type="button" id="suggest">Suggest an idea</button></div>' +
        '<p class="small muted" style="margin-top:18px">Visitors can browse every project. Starting one needs an ID check and a business license.</p>';
    };
    draw();

    const sheet = (html) => {
      const back = document.createElement("div");
      back.className = "sheet-back";
      back.innerHTML = '<div class="sheet" role="dialog">' + html + "</div>";
      back.addEventListener("click", (e) => { if (e.target === back || e.target.closest("[data-close]")) back.remove(); });
      document.body.appendChild(back);
      return back;
    };
    const head = (t) => '<div class="spread"><h2 style="font-size:24px">' + esc(t) + '</h2><button class="btn ghost small" type="button" data-close>Close</button></div>';

    // Start a project: type > category open in this area > size > milestones > checks > post
    function startFlow() {
      const a = A();
      const back = sheet(head("Pick a project type") +
        '<p class="small muted" style="margin:6px 0 14px">In ' + esc(a.name) + ". Each type comes with its milestones and proof rules already set.</p>" +
        S.types.map((t) => '<button class="tpl" type="button" data-type="' + t.key + '"><b>' + esc(t.name) + '</b><span class="chip">' + S.categories[t.key].filter((c) => c.open.includes(a.key)).length + ' open</span><span class="small muted" style="grid-column:1/-1">' + esc(t.blurb) + "</span></button>").join(""));
      const box = back.querySelector(".sheet");
      let t, cat, size;
      const form = () => {
        const cats = S.categories[t.key];
        const openCats = cats.filter((c) => c.open.includes(a.key));
        const closed = cats.filter((c) => !c.open.includes(a.key));
        cat = cat || openCats[0];
        const licOk = !cat.license || biz.tradeLicenses.includes(cat.license);
        const max = Math.min(biz.limit.now, cat.max);
        size = Math.min(size || Math.round(max / 2 / 50) * 50, max);
        const here = S.local[a.name] || {};
        const ms = S.milestoneTemplates[t.key];
        const checks = [
          ["Category is open in " + a.name, true],
          [cat.license ? "Your business has a " + cat.license + " license" : "No trade license needed", licOk],
          ["Size fits your limit (" + fmt(biz.limit.now) + " pts)", size <= biz.limit.now],
          ["Workers nearby: " + fmt(here.lookingForWork || 0) + " looking for work", (here.lookingForWork || 0) > 0],
          ["Materials: " + (here.materials || "unknown"), true],
          [cat.onsite ? "Insurance for on-site work" : "Not on site, no insurance needed", !cat.onsite || biz.insured]
        ];
        const pass = checks.every((c) => c[1]);
        box.innerHTML = head(t.name) +
          '<p class="small muted" style="margin:6px 0 14px">' + esc(a.name) + " · " + esc(biz.name) + "</p>" +
          '<label class="small"><b>Category</b><select id="cat" ' + sel + ">" +
            openCats.map((c) => '<option' + (c === cat ? " selected" : "") + ">" + esc(c.name) + "</option>").join("") +
            (closed.length ? '<optgroup label="Not open here right now">' + closed.map((c) => "<option disabled>" + esc(c.name) + "</option>").join("") + "</optgroup>" : "") +
          "</select></label>" +
          (closed.length ? '<details class="small" style="margin:-4px 0 12px"><summary class="muted" style="cursor:pointer">Why some aren\'t open here</summary>' + closed.map((c) => "<p style=\"margin-top:4px\"><b>" + esc(c.name) + ":</b> " + esc(c.why || "Not open at this level") + "</p>").join("") + "</details>" : "") +
          '<label class="small"><b>Name it</b><input id="ptitle" ' + sel + ' value="' + esc(saved.draftTitle || cat.name + ", " + (a.key === "county" ? "Fresno" : a.short)) + '"></label>' +
          '<label class="small"><b>Size: <span class="pts" id="sz">' + fmt(size) + "</span> pts</b><input id=\"size\" type=\"range\" min=\"100\" max=\"" + max + '" step="50" value="' + size + '" style="width:100%;margin:6px 0 2px"></label>' +
          '<p class="small muted" style="margin-bottom:12px">Up to ' + fmt(max) + " pts: the smaller of your limit and this category's cap.</p>" +
          '<b class="small">Milestones, filled in for you</b><div class="card" style="margin:6px 0 12px">' + ms.map((m, i) =>
            '<div class="spread small" style="padding:4px 0"><span>' + (i + 1) + ". " + esc(m[0]) + '</span><span class="pts" data-share="' + m[1] + '">' + fmt(Math.round(size * m[1])) + "</span></div>").join("") + "</div>" +
          '<b class="small">Checks before it posts</b><div class="stack" style="margin:6px 0 12px">' + checks.map((c) =>
            '<div class="small">' + (c[1] ? "✅ " : "❌ ") + esc(c[0]) + "</div>").join("") + "</div>" +
          '<button class="btn" type="button" id="post" style="width:100%"' + (pass ? "" : " disabled") + ">" + (pass ? "Post the project" : "Can't post yet") + "</button>" +
          (pass ? '<p class="small muted" style="margin-top:6px">It fits the rules and the local numbers, so it posts right away. Anything outside the rules goes to Talk for a vote instead.</p>'
            : !licOk ? '<p class="small muted" style="margin-top:6px">This category needs a ' + esc(cat.license) + " license on file. Pick another category or add the license to your business profile.</p>" : "");
      };
      box.addEventListener("click", (e) => {
        const b = e.target.closest("[data-type]");
        if (b) { t = S.types.find((x) => x.key === b.dataset.type); cat = null; size = 0; form(); return; }
        if (e.target.closest("#post")) {
          const ms = S.milestoneTemplates[t.key];
          const id = "n" + Date.now().toString(36);
          const title = $("#ptitle", box).value.trim() || cat.name;
          S.projects.unshift({ id, level: a.key, type: t.key, title, owner: biz.name, ownerId: biz.id, mine: true, county: a.name, points: size, helpers: 0, status: "open",
            desc: cat.name + " project in " + a.name + ", posted from the preview.",
            milestones: ms.map((m) => ({ title: m[0], points: Math.round(size * m[1]), status: "todo", proof: [], votes: [] })) });
          S.log.unshift({ when: "Just now", what: "project.posted " + id + " " + t.name.toLowerCase() + ", " + cat.name + ", " + fmt(size) + " points, passed area and capacity checks" });
          saved.projects = S.projects; saved.log = S.log; save();
          location.href = "/preview/project.html?id=" + id;
        }
      });
      box.addEventListener("change", (e) => {
        if (e.target.id === "cat") { cat = S.categories[t.key].find((c) => c.name === e.target.value); size = 0; form(); }
      });
      box.addEventListener("input", (e) => {
        if (e.target.id === "size") {
          size = +e.target.value;
          $("#sz", box).textContent = fmt(size);
          box.querySelectorAll("[data-share]").forEach((x) => { x.textContent = fmt(Math.round(size * +x.dataset.share)); });
        }
      });
    }

    // Suggest a new project or category. It lands in Talk as an idea that needs backers.
    function suggestFlow() {
      const back = sheet(head("Suggest an idea") +
        '<p class="small muted" style="margin:6px 0 14px">Say what\'s missing. It goes to Talk, where people back it. With enough backers it goes to a vote.</p>' +
        '<label class="small"><b>What should we fund?</b><input id="itext" ' + sel + ' placeholder="Example: Fix up the bleachers at Roosevelt High"></label>' +
        '<label class="small"><b>Where</b><select id="iscope" ' + sel + ">" + S.areas.map((x) => "<option" + (x.key === lvl ? " selected" : "") + ' value="' + x.key + '">' + esc(x.name) + "</option>").join("") + "</select></label>" +
        '<label class="small"><b>Closest type</b><select id="itype" ' + sel + ">" + S.types.map((x) => '<option value="' + x.key + '">' + esc(x.name) + "</option>").join("") + '<option value="new">Something new</option></select></label>' +
        '<label class="small"><b>Why isn\'t it getting done now?</b><textarea id="iwhy" placeholder="Who usually pays for this, and why isn\'t it happening?"></textarea></label>' +
        '<button class="btn" type="button" id="isend" style="width:100%;margin-top:12px">Send to Talk</button>' +
        '<p class="small muted" style="margin-top:6px">County ideas are light decisions: 10 backers, then 51% of votes. State and nationwide ones are heavy: 100 backers, then 75%.</p>');
      back.addEventListener("click", (e) => {
        if (!e.target.closest("#isend")) return;
        const title = $("#itext", back).value.trim();
        if (!title) { toast("Say what you'd like funded"); return; }
        const area = S.areas.find((x) => x.key === $("#iscope", back).value);
        const heavy = area.key !== "county";
        saved.newIdeas = [{ id: "u" + Date.now().toString(36), title, by: "You", backers: 1, need: heavy ? 100 : 10, weight: heavy ? "Heavy" : "Light", scope: area.name, replies: 0 }].concat(saved.newIdeas || []);
        saved.backed = (saved.backed || []);
        save(); back.remove(); draw(); toast("Sent to Talk. You're its first backer.");
      });
    }

    main.addEventListener("click", (e) => {
      const ar = e.target.closest("[data-area]");
      if (ar) { lvl = ar.dataset.area; saved.area = lvl; save(); draw(); return; }
      const f = e.target.closest("[data-f]");
      if (f) { filter = f.dataset.f; draw(); return; }
      if (e.target.closest("#start")) { startFlow(); return; }
      if (e.target.closest("#suggest")) suggestFlow();
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
      '<div class="page-head"><div class="eyebrow"><a href="/preview/place.html?at=us">Nationwide, sample numbers ›</a></div><h1>There\'s plenty to do.</h1></div>' +
      '<div class="card"><div class="stats">' + nat.map((n) => '<div class="stat"><b>' + n[0] + "</b><span>" + n[1] + "</span></div>").join("") + "</div>" +
        '<p class="small muted" style="margin-top:10px">Points changing hands this month: <b>9,870</b>. All numbers come from the public log.</p></div>' +

      '<h2 class="section-title">' + esc(S.me.county) + "</h2>" +
      '<div class="card"><div class="spread"><b>Stage: Sprout 🌱</b><span class="small muted">1.4% of the county</span></div>' +
        '<div class="bar" style="margin-top:8px"><span style="width:28%"></span></div><p class="small muted" style="margin-top:4px">Bloom at 5%</p>' +
        '<div class="stats" style="margin-top:12px"><div class="stat"><b>412</b><span>Members</span></div><div class="stat"><b>38</b><span>Businesses</span></div><div class="stat"><b>' + here.busy + '%</b><span>How booked businesses are</span></div>' +
        '<div class="stat"><b>' + here.lookingForWork + '</b><span>Looking for work</span></div><div class="stat"><b>5</b><span>Funded projects open</span></div><div class="stat"><b>' + esc(here.materials) + "</b><span>Materials</span></div></div>" +
        '<p class="note" style="margin-top:12px"><b>AI note:</b> Lots of people here want trade work and repair businesses have room. Pay to train projects would fit well right now. <span class="muted">Based on 23 business reports and county job data.</span></p>' +
        '<a class="btn ghost small" href="/preview/place.html?at=fresno" style="margin-top:12px;display:inline-block">See another place</a></div>' +

      '<h2 class="section-title">Preview screens</h2><div class="stack">' +
        [["🤖", "/preview/raindy.html", "Raindy's data: Sonoma County", "Real public numbers: work, pay, prices, local businesses."],
         ["👋", "/preview/join.html", "Sign up", "Email and ZIP, ID check, member agreement, add a business."],
         ["🌼", "/preview/profile.html", "Your profile", "Your path, what you can do, jobs near you, badges."],
         ["🏪", "/preview/business.html?id=b1", "Business profile", "Services, track record, size limit, how busy, hiring."],
         ["📋", "/preview/projects.html", "Funded work", "Pay to train, common good, spread the word, run Dandelions."],
         ["✅", "/preview/project.html?id=p5", "A project, start to payment", "Milestones, proof, random checkers."],
         ["🔍", "/preview/checks.html", "Checker work", "Short course, pick up a check, photos, AI review, paid."],
         ["📒", "/preview/directory.html", "Directory", "Member businesses, what they offer, who takes points."],
         ["👛", "/preview/wallet.html", "Wallet", "Business and personal points, send and receive."],
         ["💬", "/preview/talk.html", "Talk and vote", "Rooms, ideas gaining support, what's on the ballot."],
         ["⚖️", "/preview/dispute.html", "Disputes", "File one, then steps, deadlines, evidence, the panel."],
         ["🖥️", "/preview/operator.html", "Operator view", "Node, distribution account, file storage."],
         ["📜", "/preview/charter.html", "Charter and keepers", "Charter changes, keeper seats, fast-track."],
         ["🗺️", "/preview/place.html?at=us", "Stats by place", "Nationwide, then states, then counties."]]
        .map((x) => '<a class="card screen-link" href="' + x[1] + '"><span class="ico">' + x[0] + "</span><span><b>" + x[2] + '</b><br><span class="small muted">' + x[3] + "</span></span></a>").join("") + "</div>" +
      '<button class="btn ghost small" type="button" id="reset" style="margin-top:16px">Reset the preview</button>';
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
    if (saved.newIdeas) T.ideas = saved.newIdeas.concat(T.ideas);
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
        '<p class="small muted" style="margin-top:12px">Light decisions pass with 51% of votes cast. Heavy ones need 75% and a minimum turnout. Charter changes need even more, then the keepers sign. <a href="/preview/charter.html">See the charter →</a></p>';
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

  // ---------- Checker work: course, pick up a ticket, check, review, paid ----------
  if (page === "checks") {
    const C = S.checks;
    const ck = saved.ck = saved.ck || { read: [], answers: {}, passed: false, ticket: null, photos: {}, notes: {}, sent: false, vote: null, path: "paid" };
    const shots = {}; // object URLs for photos picked this visit; they stay on the phone
    const project = (id) => S.projects.find((p) => p.id === id) || {};
    const stage = () => (!ck.passed ? 0 : !ck.ticket ? 1 : !ck.sent ? 2 : 3);
    const stepper = () => {
      const names = ["Learn", "Pick up", "Check", "Review", "Paid"];
      const at = stage() === 3 && ck.path === "paid" && ck.vote === "yes" ? 4 : stage();
      return '<div class="ladder" style="margin-bottom:14px">' + names.map((n, i) => '<div class="' + (i < at ? "done" : i === at ? "now" : "") + '">' + n + "</div>").join("") + "</div>";
    };

    function course() {
      const score = C.quiz.filter((q, i) => ck.answers[i] === q.right).length;
      const allIn = Object.keys(ck.answers).length === C.quiz.length;
      return '<div class="page-head"><div class="eyebrow">Become a checker</div><h1>Be a fair pair of eyes.</h1><p>Any business can qualify. Checkers go look at finished work, take their own photos and say what they saw. Your business gets a fee for each check, the same whether you say yes or no.</p></div>' +
        '<h2 class="section-title">Short course, about 15 minutes</h2><div class="card">' + C.course.map((l, i) =>
          '<details data-lesson="' + i + '" style="padding:10px 0;border-bottom:1px solid var(--line)"><summary style="cursor:pointer"><b>' + (i + 1) + ". " + esc(l.title) + "</b> " +
          (ck.read.includes(i) ? '<span class="chip ok">Read</span>' : "") + '</summary><p class="small" style="margin-top:6px">' + esc(l.text) + "</p></details>").join("") +
        '<p class="small muted" style="margin-top:10px">' + ck.read.length + " of " + C.course.length + " read</p></div>" +
        '<h2 class="section-title">Quick quiz</h2><div class="card">' + C.quiz.map((q, i) =>
          '<fieldset style="border:0;padding:8px 0;margin:0"><legend class="small"><b>' + (i + 1) + ". " + esc(q.q) + "</b></legend>" +
          q.a.map((a, j) => '<label class="small" style="display:flex;gap:8px;align-items:center;padding:4px 0"><input type="radio" name="q' + i + '" value="' + j + '"' + (ck.answers[i] === j ? " checked" : "") + ">" + esc(a) + "</label>").join("") + "</fieldset>").join("") +
        '<button class="btn" type="button" id="grade" style="margin-top:8px;width:100%"' + (allIn && ck.read.length === C.course.length ? "" : " disabled") + ">Check my answers</button>" +
        '<p class="small muted" style="margin-top:6px">' + (ck.read.length < C.course.length ? "Read all five parts to unlock this." : allIn ? score + " of 5 right so far. You need 4." : "Answer all five.") + "</p></div>" +
        '<p class="small muted" style="margin-top:12px">To qualify you also need an ID check, a business in good standing for 3 months and no open disputes. The preview skips the wait.</p>';
    }

    function queue() {
      return '<div class="page-head"><div class="eyebrow">Checks near you</div><h1>Pick one up.</h1><p>When a business finishes a milestone, a ticket goes to 5 checkers nearby with no ties to them. The first 3 to accept do the check. If nobody takes it in a day, it goes to the next 5.</p></div>' +
        '<div class="card stats"><div class="stat"><b>' + C.tickets.length + '</b><span>Offered to you</span></div><div class="stat"><b>' + C.me.done + '</b><span>Checks done</span></div><div class="stat"><b>' + C.me.earned + '</b><span>Fees earned, pts</span></div></div>' +
        '<div class="stack" style="margin-top:12px">' + C.tickets.map((t) =>
          '<div class="card"><div class="spread"><span class="chip">' + esc(typeName(t.type)) + '</span><span class="pts">' + t.fee + " pts fee</span></div>" +
          '<h3 style="margin:8px 0 2px">' + esc(t.title) + '</h3><p class="small muted">' + esc(t.owner) + " · " + esc(project(t.project).title || "") + "</p>" +
          '<div class="row small" style="margin-top:8px"><span class="chip">' + esc(t.how) + '</span>' + (t.where !== t.how ? '<span class="chip">' + esc(t.where) + '</span>' : "") + '<span class="chip">Done by ' + esc(t.by) + "</span></div>" +
          '<div class="spread small" style="margin-top:10px"><span>' + t.taken + " of 3 checker spots taken</span><span class=\"muted\">Offered to " + t.offered + "</span></div>" +
          '<div class="bar"><span style="width:' + Math.round(t.taken / 3 * 100) + '%"></span></div>' +
          '<div class="row" style="margin-top:12px"><button class="btn small" type="button" data-take="' + t.id + '">Accept</button><button class="btn ghost small" type="button" data-pass="' + t.id + '">Pass</button></div></div>').join("") + "</div>" +
        '<p class="note" style="margin-top:12px">' + C.hiddenMine + " ticket for your own business isn't shown to you. You also won't get tickets from your customers, suppliers or competitors.</p>";
    }

    function check() {
      const t = C.tickets.find((x) => x.id === ck.ticket);
      const onSite = t.how === "On site";
      const ready = t.items.every((_, i) => ck.photos[i]);
      return '<div class="page-head"><div class="eyebrow">Your check · ' + esc(t.owner) + '</div><h1 style="font-size:32px">' + esc(t.title) + "</h1><p>" + esc(t.what) + "</p></div>" +
        '<div class="card">' + t.items.map((it, i) =>
          '<div style="padding:10px 0;border-bottom:1px solid var(--line)"><div class="spread"><b>' + esc(it) + "</b>" + (ck.photos[i] ? '<span class="chip ok">' + (onSite ? "Photo in" : "Checked") + "</span>" : '<span class="chip">To do</span>') + "</div>" +
          (shots[i] ? '<div class="proof" style="margin-top:8px"><figure><img src="' + shots[i] + '" alt="Your photo"></figure></div>' : ck.photos[i] && onSite ? '<div class="proof" style="margin-top:8px"><figure>Sample photo</figure></div>' : "") +
          (onSite ? '<label class="upload" style="margin-top:8px"><input type="file" accept="image/*" capture="environment" data-shot="' + i + '"><span class="small"><b>' + (ck.photos[i] ? "Retake" : "Take photo") + '</b> <span class="muted">Time and place are added for you</span></span></label>'
            : '<label class="small" style="display:flex;gap:8px;align-items:center;margin-top:6px"><input type="checkbox" data-tick="' + i + '"' + (ck.photos[i] ? " checked" : "") + "> Looks right</label>") +
          '<input class="small" data-note="' + i + '" value="' + esc(ck.notes[i] || "") + '" placeholder="Comment (optional)" style="width:100%;margin-top:8px;padding:8px;border-radius:10px;border:1px solid var(--line);background:var(--card)"></div>').join("") +
        (onSite ? '<button class="btn ghost small" type="button" id="fill" style="margin-top:10px">Preview only: use sample photos</button>' : "") + "</div>" +
        '<h2 class="section-title">What did you see?</h2><div class="card">' +
          '<textarea id="overall" placeholder="Overall comment for the business (needed if you say it needs work)">' + esc(ck.notes.all || "") + "</textarea>" +
          '<div class="row" style="margin-top:10px"><button class="btn small" type="button" data-verdict="yes"' + (ready ? "" : " disabled") + '>Yes, it\'s done</button><button class="btn ghost small" type="button" data-verdict="no"' + (ready ? "" : " disabled") + ">Needs work</button></div>" +
          '<p class="small muted" style="margin-top:8px">' + (ready ? "You won't see the other two checkers' answers until you send yours." : "Finish every item to send.") + "</p></div>" +
        '<button class="btn ghost small" type="button" id="drop" style="margin-top:12px">Give this ticket back</button>';
    }

    function result() {
      const t = C.tickets.find((x) => x.id === ck.ticket);
      const p = project(t.project);
      const m = (p.milestones || [])[t.milestone] || { points: 0 };
      const path = ck.vote === "no" ? "split" : ck.path;
      const votes = [{ who: "You", vote: ck.vote, note: ck.notes.all || (ck.vote === "yes" ? "All done." : "") }].concat(C.others);
      const ai = C.ai.slice(0, path === "split" ? 3 : 4).concat(path === "flag" ? [C.aiFlag] : []).concat(path === "split" ? [{ ok: false, text: "Checkers don't agree: 2 say done, 1 says needs work." }] : []);
      const out = {
        paid: '<div class="card" style="border-color:var(--leaf)"><h3>Paid ✓</h3><p class="small" style="margin-top:4px"><b>' + fmt(m.points) + " points</b> released to " + esc(t.owner) + ". <b>" + t.fee + " points</b> check fee to " + esc(S.businesses[0].name) + ".</p><p class=\"small muted\" style=\"margin-top:6px\">3 of 3 checkers said done and the AI found nothing odd, so the code released the points on its own.</p></div>",
        flag: '<div class="card" style="border-color:var(--warn)"><h3>Closer look</h3><p class="small" style="margin-top:4px">The checkers said done, but the AI noticed something. It doesn\'t decide. Two more checkers look, and ' + esc(t.owner) + " can explain. Majority of the 5 decides.</p><p class=\"small muted\" style=\"margin-top:6px\">Your " + t.fee + " point fee is paid now either way.</p></div>",
        split: '<div class="card" style="border-color:var(--warn)"><h3>Checkers split</h3><p class="small" style="margin-top:4px">Two more checkers are picked. Majority of the 5 decides. If it\'s sent back, ' + esc(t.owner) + " gets every comment, fixes it and sends again. If they think it's wrong, they can open a dispute.</p><p class=\"small muted\" style=\"margin-top:6px\">Your " + t.fee + " point fee is paid now either way.</p></div>"
      }[path];
      return '<div class="page-head"><div class="eyebrow">Review · ' + esc(t.owner) + '</div><h1 style="font-size:32px">' + esc(t.title) + "</h1></div>" +
        '<h2 class="section-title">The three checkers</h2><div class="card">' + votes.map((v) =>
          '<div class="skill"><div><b>' + esc(v.who) + '</b><div class="small muted">' + esc(v.note) + '</div></div><div><span class="chip ' + (v.vote === "yes" ? "ok" : "warn") + '">' + (v.vote === "yes" ? "Done" : "Needs work") + "</span></div></div>").join("") + "</div>" +
        '<h2 class="section-title">AI review</h2><div class="card">' + ai.map((a) =>
          '<div class="spread small" style="padding:6px 0;align-items:flex-start;justify-content:flex-start;gap:10px"><span aria-hidden="true">' + (a.ok ? "✅" : "⚠️") + "</span><span>" + esc(a.text) + "</span></div>").join("") +
          '<p class="small muted" style="margin-top:8px">The AI points things out. It never approves or blocks points. People do.</p></div>' +
        '<h2 class="section-title">Result</h2>' + out +
        (ck.vote === "yes" ? '<div class="viewas" id="whatif" style="margin-top:12px" role="group" aria-label="Show what happens if"><button type="button" data-path="paid" aria-pressed="' + (path === "paid") + '">All clear</button><button type="button" data-path="flag" aria-pressed="' + (path === "flag") + '">If the AI flags</button></div>' : "") +
        '<h2 class="section-title">Public log</h2><div class="card log"><ul>' +
          (path === "paid" ? '<li><span class="when">Just now</span><br>points.released ' + m.points + " to " + esc(t.owner) + " (" + t.project + ", 3 of 3 checkers done, no AI flags)</li>" : '<li><span class="when">Just now</span><br>check.more_checkers 2 picked (' + t.project + ", " + (path === "flag" ? "AI flag" : "split") + ")</li>") +
          '<li><span class="when">Just now</span><br>points.released ' + t.fee + " check fee to checker 301's business</li>" +
          '<li><span class="when">Just now</span><br>check.submitted checker 301: ' + (ck.vote === "yes" ? "done" : "needs work") + " (" + t.project + ")</li></ul></div>" +
        '<p class="small muted" style="margin-top:10px">Checkers whose answers often don\'t match the others get spot-checked themselves.</p>' +
        '<button class="btn ghost small" type="button" id="again" style="margin-top:12px">Start the checker preview over</button>';
    }

    const draw = () => { main.innerHTML = stepper() + [course, queue, check, result][stage()](); };
    draw();

    main.addEventListener("toggle", (e) => {
      const d = e.target.closest && e.target.closest("[data-lesson]");
      if (d && d.open && !ck.read.includes(+d.dataset.lesson)) { ck.read.push(+d.dataset.lesson); save(); const sy = scrollY; draw(); main.querySelector('[data-lesson="' + d.dataset.lesson + '"]').open = true; scrollTo(0, sy); }
    }, true);
    main.addEventListener("change", (e) => {
      const el = e.target;
      if (el.name && el.name[0] === "q") { ck.answers[+el.name.slice(1)] = +el.value; save(); const sy = scrollY; draw(); scrollTo(0, sy); }
      if (el.dataset.shot !== undefined && el.files && el.files[0]) { shots[el.dataset.shot] = URL.createObjectURL(el.files[0]); ck.photos[el.dataset.shot] = true; save(); draw(); }
      if (el.dataset.tick !== undefined) { ck.photos[el.dataset.tick] = el.checked; save(); const sy = scrollY; draw(); scrollTo(0, sy); }
    });
    main.addEventListener("input", (e) => {
      if (e.target.dataset.note !== undefined) { ck.notes[e.target.dataset.note] = e.target.value; save(); }
      if (e.target.id === "overall") { ck.notes.all = e.target.value; save(); }
    });
    main.addEventListener("click", (e) => {
      const go = (fn) => { fn(); save(); draw(); scrollTo(0, 0); };
      if (e.target.closest("#grade")) {
        const score = C.quiz.filter((q, i) => ck.answers[i] === q.right).length;
        if (score >= 4) go(() => { ck.passed = true; toast("You passed. You're a checker now 🔍"); });
        else toast(score + " of 5. Read the parts again and try once more.");
        return;
      }
      const take = e.target.closest("[data-take]");
      if (take) { go(() => { ck.ticket = take.dataset.take; ck.photos = {}; ck.notes = {}; }); toast("It's yours. 2 more checkers will join."); return; }
      const pass = e.target.closest("[data-pass]");
      if (pass) { pass.closest(".card").remove(); toast("Passed. It goes to the next checker."); return; }
      if (e.target.closest("#fill")) { const t = C.tickets.find((x) => x.id === ck.ticket); t.items.forEach((_, i) => { ck.photos[i] = true; }); save(); draw(); return; }
      if (e.target.closest("#drop")) { go(() => { ck.ticket = null; }); return; }
      const v = e.target.closest("[data-verdict]");
      if (v) {
        if (v.dataset.verdict === "no" && !(ck.notes.all || "").trim()) { toast("Say what's missing so the business can fix it"); return; }
        go(() => { ck.vote = v.dataset.verdict; ck.sent = true; ck.path = "paid"; C.me.done += 1; });
        return;
      }
      const w = e.target.closest("[data-path]");
      if (w) { ck.path = w.dataset.path; save(); draw(); return; }
      if (e.target.closest("#again")) { saved.ck = null; save(); location.reload(); }
    });
  }

  // Shared bits for the pages below
  const inputStyle = 'style="width:100%;margin:4px 0 12px;padding:10px;border-radius:10px;border:1px solid var(--line);background:var(--card)"';
  const ladder = (names, at) => '<div class="ladder" style="margin-bottom:14px">' + names.map((n, i) => '<div class="' + (i < at ? "done" : i === at ? "now" : "") + '">' + esc(n) + "</div>").join("") + "</div>";
  const stageOf = (pct) => (pct >= 0.1 ? "Puffball" : pct >= 0.05 ? "Bloom 🌼" : pct >= 0.01 ? "Sprout 🌱" : "Seed");

  // ---------- Sign up: account, ID check, agreement, business ----------
  if (page === "join") {
    const J = S.join;
    const st = saved.join = saved.join || { step: 0 };
    const steps = ["Account", "ID check", "Agreement", "Business", "Done"];
    const draw = () => {
      let body = "";
      if (st.step === 0) body =
        '<div class="page-head"><div class="eyebrow">Join Dandelions</div><h1>Come help.</h1><p>Anyone can look around. Joining lets you back ideas, vote, comment and get a wallet. Running projects takes a business.</p></div>' +
        '<div class="card"><label class="small"><b>Email</b><input id="jemail" type="email" ' + inputStyle + ' placeholder="you@example.com" value="' + esc(st.email || "") + '"></label>' +
          '<label class="small"><b>ZIP code</b><input id="jzip" inputmode="numeric" maxlength="5" ' + inputStyle + ' placeholder="93721" value="' + esc(st.zip || "") + '"></label>' +
          '<label class="small" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="jage"' + (st.age ? " checked" : "") + "> I'm 18 or older</label>" +
          '<button class="btn" type="button" id="j0" style="width:100%;margin-top:14px">Send me a link</button>' +
          '<p class="small muted" style="margin-top:8px">We send a link to confirm your email. Your ZIP sets your county. That\'s all we keep at this step.</p></div>' +
        '<p class="small muted" style="margin-top:12px">Just browsing? You can make a visitor profile and look at every project without the ID check.</p>';
      if (st.step === 1) body =
        '<div class="page-head"><div class="eyebrow">Step 2</div><h1 style="font-size:32px">Check your ID</h1><p>One person, one account. This is how we know you\'re real without keeping your papers.</p></div>' +
        '<div class="card"><div class="stack small">' +
          "<div>1. You go to Equitide's secure page. Equitide runs ID checks for Dandelions as a project.</div>" +
          "<div>2. Plaid checks your ID and a selfie. Takes about 2 minutes.</div>" +
          "<div>3. Dandelions gets back only <b>yes or no</b> and the date. No photos, no ID number, no birthday.</div></div>" +
          (st.idFail ? '<p class="note" style="margin-top:12px">That check didn\'t go through. You can try again. Nothing from the failed check was kept.</p>' : "") +
          '<button class="btn" type="button" id="j1" style="width:100%;margin-top:14px">Continue to Equitide</button></div>';
      if (st.step === 1.5) body =
        '<div class="card" style="border:2px dashed var(--line)"><p class="eyebrow">Pretend Equitide screen</p><h2 style="font-size:24px;margin:6px 0">ID check with Plaid</h2>' +
          '<p class="small muted">In the real build this is Equitide\'s page, not ours. For the preview, pick how it goes.</p>' +
          '<div class="row" style="margin-top:12px"><button class="btn small" type="button" data-id="yes">It passed</button><button class="btn ghost small" type="button" data-id="no">It failed</button></div></div>';
      if (st.step === 2) body =
        '<div class="page-head"><div class="eyebrow">Step 3</div><h1 style="font-size:32px">The member agreement</h1><p>Short and plain. Tick each one.</p></div>' +
        '<div class="card">' + J.agreement.map((a, i) => '<label class="small" style="display:flex;gap:10px;align-items:flex-start;padding:6px 0"><input type="checkbox" data-agree="' + i + '"' + ((st.agreed || []).includes(i) ? " checked" : "") + ' style="margin-top:3px">' + esc(a) + "</label>").join("") +
          '<label class="small" style="display:block;margin-top:10px"><b>Type your full name to sign</b><input id="jname" ' + inputStyle + ' value="' + esc(st.name || "") + '"></label>' +
          '<p class="small muted">Also covers the terms of use (being written) and the <a href="/privacy.html">privacy policy</a>.</p>' +
          '<button class="btn" type="button" id="j2" style="width:100%;margin-top:12px">Sign and continue</button></div>';
      if (st.step === 3) body =
        '<div class="page-head"><div class="eyebrow">Step 4, optional</div><h1 style="font-size:32px">Add your business</h1><p>Only businesses get paid from Dandelions. If you want points for your work, sign up as a business, even if it\'s just you.</p></div>' +
        (st.bizSent ? '<div class="card"><span class="chip sun">License check pending</span><h3 style="margin:8px 0 4px">' + esc(st.biz.name) + '</h3><p class="small muted">A checker looks up your license on the public database. Usually 1 to 2 days. You\'ll get an email.</p>' +
            '<button class="btn ghost small" type="button" id="jlic" style="margin-top:10px">Preview only: pretend it was checked</button></div>' :
          '<div class="card"><label class="small"><b>Business name</b><input id="bname" ' + inputStyle + ' placeholder="Rivera Handyman Services"></label>' +
          '<label class="small"><b>License type</b><select id="blic" ' + inputStyle + ">" + J.licenseTypes.map((l) => "<option>" + esc(l) + "</option>").join("") + "</select></label>" +
          '<label class="small"><b>License number</b><input id="bnum" ' + inputStyle + ' placeholder="As shown on your license"></label>' +
          '<label class="small"><b>What you do</b><input id="bserv" ' + inputStyle + ' placeholder="Small home repairs, drywall, painting"></label>' +
          '<div class="row" style="gap:10px"><label class="small" style="flex:1"><b>Last year\'s gross, $</b><input id="bgross" type="number" min="0" ' + inputStyle + ' placeholder="185000"></label>' +
          '<label class="small" style="flex:1"><b>Employees</b><input id="bemp" type="number" min="0" ' + inputStyle + ' placeholder="2"></label></div>' +
          '<label class="small" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="bins"> I have liability insurance (needed for on-site projects)</label>' +
          '<button class="btn" type="button" id="j3" style="width:100%;margin-top:14px">Send for license check</button>' +
          '<p class="small muted" style="margin-top:8px">No license yet? Most cities issue one for $50 to $100. Your gross and employees set your starting project size. Only you and checkers see the dollar figure.</p></div>') +
        '<button class="btn ghost small" type="button" id="jskip" style="margin-top:12px">Skip for now</button>';
      if (st.step === 4) body =
        '<div class="page-head"><div class="eyebrow">You\'re in</div><h1>Welcome, ' + esc((st.name || "friend").split(" ")[0]) + '.</h1><p>' + (st.bizDone ? "You're a verified member with a business." : "You're a verified member.") + "</p></div>" +
        '<div class="card">' + ladder(["Visitor", "Verified", "Business", "Checker", "Operator", "Keeper"], st.bizDone ? 2 : 1) +
          '<div class="stack small">' +
          '<a href="/preview/talk.html">💬 Back ideas, vote and comment in Talk</a>' +
          '<a href="/preview/wallet.html">👛 Your personal wallet is ready</a>' +
          (st.bizDone ? '<a href="/preview/projects.html">📋 Start a county project</a><a href="/preview/checks.html">🔍 Take the checker course after 3 months</a>' : '<a href="#" id="jback">🏪 Add a business to get paid for projects</a>') +
          "</div></div>" +
        '<button class="btn ghost small" type="button" id="jreset" style="margin-top:12px">Start sign-up over</button>';
      main.innerHTML = ladder(steps, Math.floor(st.step)) + body;
    };
    draw();
    main.addEventListener("click", (e) => {
      const go = (n) => { st.step = n; save(); draw(); scrollTo(0, 0); };
      if (e.target.closest("#j0")) {
        st.email = $("#jemail").value.trim(); st.zip = $("#jzip").value.trim(); st.age = $("#jage").checked;
        if (!/^\S+@\S+\.\S+$/.test(st.email)) { toast("Add a real email"); return; }
        if (!/^\d{5}$/.test(st.zip)) { toast("ZIP needs 5 numbers"); return; }
        if (!st.age) { toast("You need to be 18 or older"); return; }
        toast("Pretend link sent and clicked"); go(1); return;
      }
      if (e.target.closest("#j1")) { go(1.5); return; }
      const id = e.target.closest("[data-id]");
      if (id) { st.idFail = id.dataset.id === "no"; go(st.idFail ? 1 : 2); if (!st.idFail) toast("ID checked. Only the yes and the date were kept."); return; }
      if (e.target.closest("#j2")) {
        st.agreed = [...main.querySelectorAll("[data-agree]:checked")].map((x) => +x.dataset.agree); st.name = $("#jname").value.trim();
        if (st.agreed.length < J.agreement.length) { toast("Tick every line to continue"); return; }
        if (st.name.split(/\s+/).length < 2) { toast("Type your full name"); return; }
        go(3); return;
      }
      if (e.target.closest("#j3")) {
        const name = $("#bname").value.trim(), num = $("#bnum").value.trim();
        if (!name || !num) { toast("Add the business name and license number"); return; }
        st.biz = { name, lic: $("#blic").value, serv: $("#bserv").value.trim(), insured: $("#bins").checked }; st.bizSent = true; save(); draw(); return;
      }
      if (e.target.closest("#jlic")) { st.bizDone = true; toast("License checked. You're a business owner now."); go(4); return; }
      if (e.target.closest("#jskip")) { go(4); return; }
      if (e.target.closest("#jback")) { e.preventDefault(); go(3); return; }
      if (e.target.closest("#jreset")) { saved.join = null; save(); location.reload(); }
    });
  }

  // ---------- Operator: node, distribution account, storage ----------
  if (page === "operator") {
    const O = S.operator;
    const acct = O.account;
    if (saved.opBalance !== undefined) acct.balance = saved.opBalance;
    const events = saved.opEvents || [];
    const draw = () => {
      const pos = (n) => Math.round(n / (acct.max * 1.25) * 100);
      main.innerHTML =
        '<div class="page-head"><div class="eyebrow">Operator view</div><h1 style="font-size:32px">' + esc(O.name) + '</h1><p>Runs a node, a distribution account and file storage, as a Run Dandelions project paid ' + O.pay + " points a month. Operators can't move points by hand. The code pays only for checked work.</p></div>" +
        '<h2 class="section-title">Node</h2><div class="card"><div class="stats">' +
          '<div class="stat"><b>' + O.node.uptime + '%</b><span>Up, last 30 days</span></div><div class="stat"><b>' + fmt(O.node.entries) + '</b><span>Log entries held</span></div><div class="stat"><b>' + O.node.peers + "</b><span>Other nodes it checks against</span></div></div>" +
          '<p class="small" style="margin-top:10px"><b>Last daily fingerprint:</b> <code>' + esc(O.node.print) + "</code></p>" +
          '<p class="small muted">Posted ' + esc(O.node.lastPrint) + ". Every node must get the same one, or the log has been changed.</p></div>" +
        '<h2 class="section-title">Distribution account</h2><div class="card"><div class="spread"><b class="pts" style="font-size:26px">' + fmt(acct.balance) + ' pts</b><span class="small muted">Starts at ' + fmt(acct.start) + "</span></div>" +
          '<div style="position:relative;height:18px;margin:14px 0 6px;border-radius:9px;background:var(--soft)">' +
            '<span style="position:absolute;left:' + pos(acct.min) + "%;right:" + (100 - pos(acct.max)) + '%;top:0;bottom:0;background:color-mix(in srgb, var(--leaf) 25%, transparent);border-radius:9px"></span>' +
            '<span style="position:absolute;left:calc(' + Math.min(100, pos(acct.balance)) + '% - 3px);top:-4px;width:6px;height:26px;border-radius:3px;background:var(--ink)"></span></div>' +
          '<div class="spread small muted"><span>Low line ' + fmt(acct.min) + "</span><span>High line " + fmt(acct.max) + "</span></div>" +
          '<p class="small muted" style="margin-top:8px">Below the low line, new points are created to bring it back to the start, only if local workers and materials can cover the work. Above the high line, extra points are retired. Both go on the public log.</p>' +
          '<div class="row" style="margin-top:10px"><button class="btn small" type="button" id="busy">Preview: a busy week of payouts</button><button class="btn ghost small" type="button" id="back">Preview: lots of points come back</button></div></div>' +
        '<h2 class="section-title">Recent activity</h2><div class="card">' + events.concat(O.payouts).map((h) =>
          '<div class="skill"><div><b>' + esc(h.what) + '</b><div class="small muted">' + esc(h.when) + '</div></div><div class="pts" style="color:' + (h.amt > 0 ? "var(--leaf)" : "var(--ink)") + '">' + (h.amt > 0 ? "+" : "") + fmt(h.amt) + "</div></div>").join("") + "</div>" +
        '<h2 class="section-title">File storage</h2><div class="card stats"><div class="stat"><b>' + O.storage.gb + ' GB</b><span>Proof photos and reports</span></div><div class="stat"><b>' + fmt(O.storage.files) + '</b><span>Files</span></div><div class="stat"><b>' + O.storage.copies + "</b><span>Copies on other operators</span></div></div>" +
        '<h2 class="section-title">Become an operator</h2><div class="card"><div class="stack small">' + O.become.map((b) => "<div>• " + esc(b) + "</div>").join("") + "</div>" +
          '<p class="small muted" style="margin-top:8px">Operators are not keepers. Keepers sign charter changes. Operators keep the system running.</p></div>';
    };
    draw();
    main.addEventListener("click", (e) => {
      const log = (what, amt) => { events.unshift({ when: "Just now", what, amt }); };
      if (e.target.closest("#busy")) {
        acct.balance -= 31000; log("Payouts for 62 milestones and checks", -31000);
        if (acct.balance < acct.min) { const add = acct.start - acct.balance; log("Top-up: new points created by the rules", add); acct.balance = acct.start; toast("Below the low line. " + fmt(add) + " new points created."); }
      } else if (e.target.closest("#back")) {
        acct.balance += 36000; log("Fines and returned points", 36000);
        if (acct.balance > acct.max) { const cut = acct.balance - acct.start; log("Retired: extra points removed", -cut); acct.balance = acct.start; toast("Above the high line. " + fmt(cut) + " points retired."); }
      } else return;
      saved.opBalance = acct.balance; saved.opEvents = events; save(); draw();
    });
  }

  // ---------- Charter, keepers and fast-track ----------
  if (page === "charter") {
    const C = S.charter, P = C.proposal;
    if (saved.fastVote) C.fast[saved.fastVote] += 1;
    const draw = () => {
      const tot = P.yes + P.no, yesPct = Math.round(P.yes / tot * 100);
      const ft = C.fast.yes + C.fast.no;
      main.innerHTML =
        '<div class="page-head"><div class="eyebrow">Charter</div><h1>The rules behind the rules.</h1><p>The charter is the short list everything else has to follow. Changing it is the hardest decision there is, on purpose.</p></div>' +
        '<div class="card"><div class="spread"><b>Version ' + esc(C.version) + '</b><span class="small muted">Adopted ' + esc(C.adopted) + "</span></div>" +
          '<ol class="small" style="margin:10px 0 0 18px;display:grid;gap:6px">' + C.principles.map((x) => "<li>" + esc(x) + "</li>").join("") + "</ol>" +
          '<p class="small muted" style="margin-top:10px">Fingerprint <code>' + esc(C.print) + "</code>. Sample wording for the preview.</p></div>" +
        '<h2 class="section-title">Proposed change</h2><div class="card"><span class="chip sun">Super heavy</span><h3 style="margin:8px 0 4px">' + esc(P.title) + '</h3><p class="small muted">Proposed by ' + esc(P.by) + "</p>" +
          '<div style="margin-top:10px">' + P.steps.map((s, i) => '<div class="ms ' + (i < P.at ? "approved" : i === P.at ? "review" : "") + '"><div class="dot">' + (i < P.at ? "✓" : i + 1) + '</div><h3 style="font-size:15px">' + esc(s) + "</h3>" +
            (i === 0 ? '<p class="small muted">' + fmt(P.backers) + " backers, needed " + fmt(P.need) + "</p>" : "") +
            (i === 2 ? '<p class="small muted">' + yesPct + "% yes with " + P.turnout + "% turnout. Needed " + P.needYes + "% and " + P.needTurnout + "%.</p>" : "") +
            (i === 3 ? '<p class="small muted">Ends ' + esc(P.waitEnds) + ". Time for anyone to raise a problem.</p>" : "") +
            (i === 4 ? '<p class="small muted">' + P.signed + " of " + P.signNeed + " keeper signatures</p>" : "") + "</div>").join("") + "</div></div>" +
        '<h2 class="section-title">Keepers</h2><div class="card">' + C.keepers.map((k) =>
          '<div class="skill"><div><b>Seat ' + k.seat + ": " + esc(k.who) + '</b><div class="small muted">' + esc(k.note) + "</div></div><div>" + (k.ends ? '<span class="chip">Term to ' + esc(k.ends) + "</span>" : "") + "</div></div>").join("") +
          '<p class="small muted" style="margin-top:8px">A paid trust role with legal costs covered. Terms are staggered so seats rotate. Keepers sign charter changes after members pass them. They can\'t make rules on their own.</p></div>' +
        '<h2 class="section-title">Fast-track in effect</h2><div class="card" style="border-color:var(--warn)"><span class="chip warn">Stop-harm only</span><h3 style="margin:8px 0 4px">' + esc(C.fast.title) + '</h3>' +
          '<p class="small">' + esc(C.fast.why) + '</p><p class="small muted" style="margin-top:6px">Approved by ' + esc(C.fast.by) + " on " + esc(C.fast.when) + ". Ends " + esc(C.fast.expires) + " unless members confirm it.</p>" +
          '<div class="bar" style="margin-top:10px"><span style="width:' + Math.round(C.fast.yes / ft * 100) + '%"></span></div><div class="spread small" style="margin-top:4px"><span>Keep it: ' + fmt(C.fast.yes) + "</span><span>End it: " + fmt(C.fast.no) + "</span></div>" +
          (saved.fastVote ? '<p class="small" style="margin-top:8px"><b>You voted.</b></p>' : '<div class="row" style="margin-top:10px"><button class="btn small" type="button" data-fv="yes">Keep the pause</button><button class="btn ghost small" type="button" data-fv="no">End it</button></div>') +
          '<p class="small muted" style="margin-top:8px">Fast-track can only pause, freeze or take down. It can never create points or change the charter or vote rules. It needs 2 of 3 keepers and a public reason the same day.</p></div>';
    };
    draw();
    main.addEventListener("click", (e) => {
      const v = e.target.closest("[data-fv]");
      if (v) { saved.fastVote = v.dataset.fv; C.fast[v.dataset.fv] += 1; save(); draw(); }
    });
  }

  // ---------- Stats by place ----------
  if (page === "place") {
    const at = new URLSearchParams(location.search).get("at") || "us";
    const pl = S.places.find((x) => x.id === at) || S.places[0];
    const trail = [];
    for (let x = pl; x; x = S.places.find((y) => y.id === x.parent)) trail.unshift(x);
    const kids = S.places.filter((x) => x.parent === pl.id);
    main.innerHTML =
      '<p class="small" style="margin:4px 0 10px">' + trail.map((x, i) => i < trail.length - 1 ? '<a href="/preview/place.html?at=' + x.id + '">' + esc(x.name) + "</a> › " : "<b>" + esc(x.name) + "</b>").join("") + "</p>" +
      '<div class="page-head" style="padding-top:0"><div class="eyebrow">Sample numbers</div><h1 style="font-size:32px">' + esc(pl.name) + "</h1></div>" +
      '<div class="card"><div class="spread"><b>Stage: ' + stageOf(pl.pct) + '</b><span class="small muted">' + (pl.pct * 100).toFixed(1) + "% of people</span></div>" +
        '<div class="bar" style="margin-top:8px"><span style="width:' + Math.min(100, Math.round(pl.pct / 0.1 * 100)) + '%"></span></div><p class="small muted" style="margin-top:4px">Sprout at 1%, Bloom at 5%, Puffball at 10%</p>' +
        '<div class="stats" style="margin-top:12px">' +
          [[fmt(pl.members), "Members"], [fmt(pl.businesses), "Businesses"], [pl.busy + "%", "How booked businesses are"], [fmt(pl.looking), "Looking for work"], [fmt(pl.open), "Funded projects open"], [fmt(pl.created - pl.retired), "Points in use"]]
            .map((n) => '<div class="stat"><b>' + n[0] + "</b><span>" + n[1] + "</span></div>").join("") + "</div>" +
        '<p class="note" style="margin-top:12px"><b>AI note:</b> ' + esc(pl.note) + "</p></div>" +
      (kids.length ? '<h2 class="section-title">' + (pl.id === "us" ? "States" : "Counties") + '</h2><div class="stack">' + kids.map((k) =>
        '<a class="card pcard" href="/preview/place.html?at=' + k.id + '"><div class="spread"><h3 style="margin:0">' + esc(k.name) + '</h3><span class="chip">' + stageOf(k.pct) + '</span></div><p class="small muted" style="margin-top:4px">' + fmt(k.members) + " members · " + k.busy + "% booked · " + fmt(k.looking) + " looking for work</p></a>").join("") + "</div>" : "") +
      '<p class="small muted" style="margin-top:12px">Only a sample of places is filled in. The real map covers every state and county, from the public log and Census data.</p>';
  }

  // ---------- Raindy's data: real public numbers for one place, simple view with details on tap ----------
  if (page === "raindy") {
    const R = window.RAINDY, W = R.working, LW = R.livingWage;
    const ch = (now, then) => Math.round((now / then - 1) * 1000) / 10;
    const trend = (pctv, upIsGood = true) => {
      const col = pctv === 0 ? "var(--muted)" : (pctv > 0) === upIsGood ? "var(--leaf)" : "var(--warn)";
      return '<span style="color:' + col + ';white-space:nowrap">' + (pctv > 0 ? "↑ " : pctv < 0 ? "↓ " : "→ ") + Math.abs(pctv) + "%</span>";
    };
    const wageMark = (pay) => pay * 1000 >= LW.yearly ? ["Above living wage", "ok"] : pay * 1000 >= LW.yearly * 0.85 ? ["Near living wage", ""] : ["Below living wage", "warn"];
    const tile = (label, big, line) => '<div class="card"><div class="eyebrow">' + label + '</div><div style="font-family:var(--display);font-size:30px;margin:4px 0">' + big + '</div><p class="small muted">' + line + "</p></div>";
    let q = "";
    const row = (c) => {
      const w = wageMark(c.pay);
      return '<details class="card" data-name="' + esc((c.name + " " + c.note).toLowerCase()) + '"><summary style="cursor:pointer;list-style:none">' +
        '<div class="spread"><b>' + esc(c.name) + '</b><span class="chip ' + w[1] + '">' + w[0] + "</span></div>" +
        '<div class="small" style="margin-top:4px;display:flex;flex-wrap:wrap;gap:2px 14px"><span>Workers ' + trend(c.workersChange) + '</span><span>Pay ' + trend(c.payChange) + '</span><span class="muted">since 2019</span></div></summary>' +
        '<div class="small" style="margin-top:10px;border-top:1px solid var(--line);padding-top:8px">' +
          (c.note ? '<p class="muted">' + esc(c.note) + "</p>" : "") +
          "<p>" + fmt(c.estab) + " businesses with staff · " + fmt(c.workers) + " workers · $" + c.pay.toFixed(1) + "k pay per worker a year</p>" +
          (c.licensed ? '<p style="margin-top:4px">' + esc(c.licensed) + "</p>" : "") +
          '<p class="muted" style="margin-top:4px">Prices rose about ' + R.priceRise2019to2023 + "% over the same years. Pay per worker is from 2023 and counts part-time jobs, and the living wage is from 2026, so the label reads a little harsh.</p></div></details>";
    };
    const draw = () => {
      const list = R.categories.filter((c) => !q || (c.name + " " + c.note).toLowerCase().includes(q));
      $("#cats").innerHTML = list.length ? list.map(row).join("") : '<p class="muted">Nothing matches. Try another word.</p>';
    };
    main.innerHTML =
      '<div class="page-head"><div class="eyebrow">Raindy\'s data</div><h1>' + esc(R.place) + ' by the numbers.</h1><p>The numbers Raindy, our AI, uses to spot good and bad trends. Ask Raindy about them in Talk.</p></div>' +
      '<p class="note"><b>Real public numbers</b>, pulled ' + esc(R.pulled) + ". Dandelions isn't running here yet, so nothing comes from members or points yet.</p>" +
      '<input id="q" type="search" placeholder="Search: dental, rent, restaurants, home care…" style="width:100%;padding:12px;border-radius:12px;border:1px solid var(--line);background:var(--card);margin:14px 0 4px">' +

      '<div id="tiles"><h2 class="section-title">At a glance</h2><div class="stack">' +
        tile("People working", fmt(W.now) + " " + trend(ch(W.now, W.yearAgo)), "Residents with a job, " + esc(W.month) + ", against a year ago. " + (Math.round(W.now / W.laborForce * 1000) / 10) + "% of people who want work have it. Fewer people are looking too, so the working count fell even as unemployment eased.") +
        tile("Jobs here", fmt(R.jobs.now) + " " + trend(ch(R.jobs.now, R.jobs.yearAgo)), "Jobs located in the county, against a year ago. Still below 2019 (" + fmt(R.jobs.y2019) + ").") +
        tile("Average pay", "$" + R.hourly.now.toFixed(2) + '<span class="small"> an hour</span> ' + trend(ch(R.hourly.now, R.hourly.yearAgo)), "Living wage here: $" + LW.oneAdult.toFixed(2) + " for one adult, $" + LW.oneAdultOneChild.toFixed(2) + " for one adult with a child. Minimum wage is $" + LW.minimum.toFixed(2) + ".") +
        tile("Prices", "+" + R.prices.all + '%<span class="small"> a year</span>', "Eating out +" + R.prices.eatingOut + "%, groceries +" + R.prices.groceries + "%, housing +" + R.prices.shelter + "% (" + esc(R.prices.region) + ", year to " + esc(R.prices.month) + "). Median rent here $" + fmt(R.people.medianRent) + " a month.") +
        '<div class="card" style="background:var(--soft)"><div class="eyebrow">Points moving</div><div style="font-family:var(--display);font-size:24px;margin:4px 0">Starts at 1%</div>' +
          '<p class="small muted">Once points start: points earned and by how many businesses, where they\'re spent by category, how many days a point sits before it\'s spent, and how many times it changes hands here before it leaves. Totals only, never a person\'s trail.</p></div>' +
      "</div></div>" +

      '<h2 class="section-title">Local businesses</h2><p class="small muted" style="margin-bottom:8px">Tap one for details. Living wage compares pay per worker with $' + fmt(LW.yearly) + " a year, a full-time living wage for one adult.</p>" +
      '<div id="cats" class="stack"></div>' +

      '<h2 class="section-title">Coming from members</h2><div class="card">' + R.memberData.map((d) =>
        '<div class="skill"><div><b>' + esc(d[0]) + '</b><div class="small muted">' + esc(d[1]) + "</div></div></div>").join("") + "</div>" +

      '<h2 class="section-title">Sources</h2><div class="card small stack">' + R.sources.map((s) => '<a style="display:block" href="' + esc(s[1]) + '" rel="noopener">' + esc(s[0]) + "</a>").join("") + "</div>";
    draw();
    $("#q").addEventListener("input", (e) => {
      q = e.target.value.trim().toLowerCase();
      $("#tiles").hidden = !!q;
      draw();
    });
  }

  // ---------- Dispute case ----------
  if (page === "dispute") {
    const c = S.dispute;
    const mine = saved.newCase;
    main.innerHTML =
      '<div class="card" style="background:var(--soft)">' + (mine
        ? '<span class="chip sun">Your case ' + esc(mine.id) + ' · Filed today</span><h3 style="margin:8px 0 4px">' + esc(mine.about) + '</h3><p class="small">' + esc(mine.what) + '</p>' +
          '<p class="small muted" style="margin-top:6px">Next: 7 days to talk it out with ' + esc(mine.with) + '. If that doesn\'t settle it, screening, then a panel of 3 random checkers.</p>' +
          (mine.freeze ? '<p class="note" style="margin-top:8px"><b>' + fmt(mine.freeze) + ' points frozen</b> on that milestone until the case ends.</p>' : '') +
          '<button class="btn ghost small" type="button" id="dclear" style="margin-top:10px">Preview: clear my case</button>'
        : '<b>Something not right?</b><p class="small muted" style="margin:4px 0 10px">Talk to the other side first. If that doesn\'t work, file a case. It\'s free and names stay private.</p><button class="btn small" type="button" id="dfile">File a dispute</button>') + '</div>' +
      '<h2 class="section-title">An open case</h2>' +
      '<div class="page-head"><div class="eyebrow">Case ' + esc(c.id) + "</div><h1 style=\"font-size:32px\">" + esc(c.title) + "</h1><p>" + c.sides.map(esc).join(" and ") + " · " + esc(c.county) + "</p></div>" +
      '<div class="card"><p>' + esc(c.claim) + '</p><p class="note" style="margin-top:12px"><b>' + fmt(c.frozen) + " points frozen</b> until the case ends. Nothing else is frozen.</p></div>" +
      '<h2 class="section-title">Where it stands</h2><div class="card">' + c.steps.map((s, i) =>
        '<div class="ms ' + (s.done ? "approved" : s.now ? "review" : "") + '"><div class="dot">' + (s.done ? "✓" : i + 1) + '</div><div class="spread"><h3>' + esc(s.name) + '</h3><span class="small muted">' + esc(s.when) + "</span></div>" +
        (s.note ? '<p class="small muted">' + esc(s.note) + "</p>" : "") + "</div>").join("") + "</div>" +
      '<h2 class="section-title">Evidence</h2><div class="card"><div class="proof">' + c.evidence.map((x) => "<figure>" + esc(x) + "</figure>").join("") + "</div></div>" +
      '<h2 class="section-title">The panel</h2><div class="card"><div class="votes"><i></i><i></i><i></i></div>' +
        '<p class="small muted" style="margin-top:6px">Three checkers picked at random, with no ties to either side. Their votes and reasons are posted with the ruling.</p></div>' +
      '<p class="small muted" style="margin-top:12px">Rulings are enforced on points and permissions only: unfreeze, redo a payment, a fine into a distribution account, or a step down. Anything about dollars or injuries goes to the regular courts. Names are hidden from the public.</p>';
    const sel = 'style="width:100%;margin:4px 0 12px;padding:10px;border-radius:10px;border:1px solid var(--line);background:var(--card)"';
    main.addEventListener("click", (e) => {
      if (e.target.closest("#dclear")) { saved.newCase = null; save(); location.reload(); return; }
      if (!e.target.closest("#dfile")) return;
      const back = document.createElement("div");
      back.className = "sheet-back";
      back.innerHTML = '<div class="sheet" role="dialog" aria-label="File a dispute"><div class="spread"><h2 style="font-size:24px">File a dispute</h2><button class="btn ghost small" type="button" data-close>Close</button></div>' +
        '<label class="small" style="display:block;margin-top:12px"><b>What is it about?</b><select id="dabout" ' + sel + '><option>A check result on my project</option><option>A payout that didn\'t come</option><option>A business didn\'t do what it agreed</option><option>A member broke the rules</option></select></label>' +
        '<label class="small"><b>Which project</b><select id="dproj" ' + sel + '>' + S.projects.map((p) => '<option value="' + p.id + '">' + esc(p.title) + '</option>').join("") + '</select></label>' +
        '<label class="small"><b>What happened?</b><textarea id="dwhat" placeholder="Just the facts: what, when, who"></textarea></label>' +
        '<label class="small" style="display:block;margin-top:10px"><b>What would make it right?</b><input id="dwant" ' + sel + ' placeholder="Example: look at the daytime photos and pay the milestone"></label>' +
        '<label class="upload"><input type="file" accept="image/*,.pdf" multiple><span class="small"><b>Add evidence</b> <span class="muted">Photos, receipts, messages</span></span></label>' +
        '<label class="small" style="display:flex;gap:8px;align-items:center;margin-top:10px"><input type="checkbox" id="dtrue"> What I wrote is true to the best of my knowledge</label>' +
        '<button class="btn" type="button" id="dsend" style="width:100%;margin-top:12px">File the case</button>' +
        '<p class="small muted" style="margin-top:6px">Filing freezes only the points in question. Filing to harass someone is against the member agreement.</p></div>';
      back.addEventListener("click", (ev) => {
        if (ev.target === back || ev.target.closest("[data-close]")) { back.remove(); return; }
        if (!ev.target.closest("#dsend")) return;
        const what = $("#dwhat", back).value.trim();
        if (!what) { toast("Say what happened"); return; }
        if (!$("#dtrue", back).checked) { toast("Tick the box to confirm it's true"); return; }
        const p = S.projects.find((x) => x.id === $("#dproj", back).value);
        const m = p.milestones.find((x) => x.status !== "approved");
        saved.newCase = { id: "1043", about: $("#dabout", back).value + " · " + p.title, what, with: p.mine ? "the checker panel" : p.owner, freeze: m ? m.points : 0 };
        save(); location.reload();
      });
      document.body.appendChild(back);
    });
  }

})();
