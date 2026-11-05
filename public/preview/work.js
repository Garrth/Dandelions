// Work page preview: sample data only, nothing is saved except in this browser.
(function () {
  var main = document.getElementById("main");
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fmt(n) { return Number(n || 0).toLocaleString("en-US"); }
  function toast(t) { var d = document.createElement("div"); d.className = "toast"; d.textContent = t; document.body.appendChild(d); setTimeout(function () { d.remove(); }, 2600); }
  function load() { try { return JSON.parse(localStorage.getItem("dw_preview") || "{}"); } catch (e) { return {}; } }
  function save() { try { localStorage.setItem("dw_preview", JSON.stringify(S)); } catch (e) {} }
  var S = load();
  S.who = S.who || "owner"; S.mine = S.mine || [];

  // ---- Settings (all of these would be settings, not code) ----
  var FIRST_CAP = 500, GROW = 2, FIRST_PAY_MAX = 0.25, FIRST_PAY_DAYS = 7, STALL_DAYS = 14, CANCEL_DAYS = 30;
  var SIZE_CEILING = [["One person", 5000], ["2 to 9 people", 20000], ["10 or more", 50000]];
  var CHECK_PRICES = { review: 30, remote: 15, onsite: 40 };
  var BUDGET = { county: "Sonoma County", month: "November", pledged: 12000, businesses: 24, reserved: 8350, paid: 2100 };

  var TYPES = [
    { id: "word", name: "Spread the word", note: "Posts, videos, flyers, local news", guide: [15, 40], unit: "a confirmed sign-up",
      fits: ["It gets Dandelions in front of people in this county", "Results can be counted, like views or sign-ups from your link", "Paid posts say they're paid, and nothing promises jobs or income"],
      ideas: ["Short videos and reels", "Posts in community groups", "Flyers at businesses and libraries", "Local news, radio and podcasts", "Spanish versions"] },
    { id: "members", name: "Sign up members", note: "Tables, events, welcoming people", guide: [15, 40], unit: "a confirmed sign-up",
      fits: ["People sign up with your link or code, so each one is counted", "Events are open to the public", "Nobody is pressured or paid to sign up"],
      ideas: ["Sign-up tables at markets and fairs", "Clean-up day, food truck party, fix-it day", "Welcome new members and help them start"] },
    { id: "biz", name: "Sign up businesses", note: "Visits, listings, directory checks", guide: [3, 60], unit: "a business",
      fits: ["Each business is counted in the directory: a claim, an update or a confirmed check", "You don't claim a listing for someone else", "Owners agree to anything you add to their listing"],
      ideas: ["Walk-in visits to help claim listings", "Add hours, photos and an offer with the owner", "Confirm businesses are still open", "Sign up a business's suppliers"] },
    { id: "spend", name: "Help businesses spend points", note: "Find places to spend, so pledges go up", guide: [25, 80], unit: "a new place to spend",
      fits: ["Each result is a member business that starts taking points from another member", "The business confirms it in Dandelions", "It's something they already buy, not a new expense"],
      ideas: ["Match what a business buys with member sellers", "Sign up their suppliers and services", "Match landlords with business tenants", "Monthly follow-ups to raise pledges"] },
    { id: "build", name: "Build it", note: "The site, data, guides, artwork", guide: [200, 2000], unit: "a milestone",
      fits: ["The result is public and anyone can use it", "Code and guides go in the open-source repo", "Each milestone can be seen and tried by a checker"],
      ideas: ["Test the site and fix bugs", "New features", "Business lists for new counties", "Guides, how-to videos and training", "Artwork"] }
  ];
  function type(id) { return TYPES.filter(function (t) { return t.id === id; })[0]; }

  var ME = { owner: { name: "Rio's Bike Repair", person: true, biz: true, size: "One person", done: [400, 900], late: 0, cancelled: 0 },
    "new": { name: "Ana's Tamales", person: true, biz: true, size: "2 to 9 people", done: [], late: 0, cancelled: 0 },
    none: { name: "", person: false, biz: false, size: "", done: [], late: 0, cancelled: 0 } };
  function me() { return ME[S.who]; }
  function cap(m) {
    var ceil = (SIZE_CEILING.filter(function (x) { return x[0] === m.size; })[0] || [0, 5000])[1];
    var big = m.done.length ? Math.max.apply(null, m.done) : 0;
    return Math.min(big ? big * GROW : FIRST_CAP, ceil);
  }

  var PROJECTS = [
    { id: "p1", type: "word", title: "Fix-it day flyers around Petaluma", owner: "Petaluma Print Shop", rec: [3, 0, 0], status: "open", town: "Petaluma", help: "People to post flyers in Cotati and Rohnert Park.",
      what: "Design a flyer for the Dec 12 fix-it day, print 500, and post them at 40 spots around Petaluma. Each flyer has a sign-up link so we can count who came from it.",
      pay: [{ kind: "m", what: "Flyer design shared in the group chat", how: "Checked online", amt: 100, due: "Nov 9", st: "paid" },
        { kind: "m", what: "500 flyers posted at 40 spots", how: "Photo of each spot, checked online", amt: 300, due: "Nov 20", st: "checking" },
        { kind: "p", what: "Sign-ups from the flyer link", how: "Counted by Dandelions", per: 10, max: 20, amt: 200, due: "Dec 31", st: "due", count: 6 }] },
    { id: "p2", type: "spend", title: "Find suppliers for 5 Santa Rosa restaurants", owner: "Mesa Kitchen", rec: [5, 1, 0], status: "open", town: "Santa Rosa", help: "Someone who knows restaurant suppliers in Sonoma.",
      what: "Sit down with 5 restaurant owners, list what they buy each month, and sign up member businesses that sell those things: produce, linens, repairs, cleaning.",
      pay: [{ kind: "m", what: "List of what 5 restaurants buy", how: "Checked online", amt: 150, due: "Nov 15", st: "paid" },
        { kind: "p", what: "A restaurant starts paying a member supplier in points", how: "Both businesses confirm in Dandelions", per: 60, max: 15, amt: 900, due: "Jan 15", st: "due", count: 4 }] },
    { id: "p3", type: "biz", title: "Directory check: every business in Sebastopol", owner: "West County Errands", rec: [1, 0, 0], status: "open", town: "Sebastopol", help: "Two people to make phone calls, a few hours a week.",
      what: "Call or visit every listed business in Sebastopol and confirm it's open, its phone and its type. Help owners claim their listing if they want to.",
      pay: [{ kind: "p", what: "A business confirmed open with the right details", how: "Logged in the directory, spot-checked by phone", per: 3, max: 300, amt: 900, due: "Dec 20", st: "due", count: 112 }] },
    { id: "p4", type: "build", title: "Make the county map easier to tap on small phones", owner: "Pixel Barn Design", rec: [0, 0, 0], status: "review", town: "Online",
      what: "Bigger tap targets on the home map, a zoom button, and a list of nearby counties under the map.",
      pay: [{ kind: "m", what: "Working version on a test page", how: "Checked online", amt: 100, due: "Nov 14", st: "due" },
        { kind: "m", what: "Live on the site after testing on 3 phones", how: "Checked online", amt: 300, due: "Nov 28", st: "due" }] },
    { id: "p5", type: "members", title: "Sign-up table at the Healdsburg market, 4 Saturdays", owner: "Coast Kombucha", rec: [2, 0, 1], status: "stall", town: "Healdsburg",
      what: "A table with a banner and a sign-up tablet at the Saturday market for 4 weeks.",
      pay: [{ kind: "m", what: "Table set up, first Saturday", how: "Photo, checked online", amt: 80, due: "Oct 17", st: "paid" },
        { kind: "p", what: "Confirmed sign-ups at the table", how: "Counted by Dandelions", per: 20, max: 25, amt: 500, due: "Nov 7", st: "late", count: 3, lateDays: 18 }] }
  ];
  function allProjects() { return S.mine.concat(PROJECTS); }
  function find(id) { return allProjects().filter(function (p) { return p.id === id; })[0]; }
  function total(p) { return p.pay.reduce(function (a, r) { return a + Number(r.amt || 0); }, 0); }
  function paid(p) { return p.pay.reduce(function (a, r) { return a + (r.st === "paid" ? Number(r.amt) : r.kind === "p" && r.count ? r.count * r.per : 0); }, 0); }
  var ST = { open: ["Under way", "open"], review: ["Waiting for a checker", "review"], stall: ["Stalled", "stall"], done: ["Done", "done"], cancelled: ["Cancelled", "done"] };
  function badge(s) { return '<span class="st ' + ST[s][1] + '">' + ST[s][0] + "</span>"; }

  function budgetCard() {
    var left = BUDGET.pledged - BUDGET.reserved;
    return '<div class="card budget"><div class="spread"><b>' + esc(BUDGET.county) + ", " + esc(BUDGET.month) + '</b><span class="small muted">' + BUDGET.businesses + " businesses accept points</span></div>" +
      '<div class="bar"><span class="paid" style="width:' + (BUDGET.paid / BUDGET.pledged * 100) + '%"></span><span class="res" style="width:' + ((BUDGET.reserved - BUDGET.paid) / BUDGET.pledged * 100) + '%"></span></div>' +
      '<div class="keyrow"><span><i style="background:var(--sun)"></i>Paid ' + fmt(BUDGET.paid) + '</span><span><i style="background:var(--leaf)"></i>Promised to projects ' + fmt(BUDGET.reserved - BUDGET.paid) + '</span><span><i style="background:var(--soft);border:1px solid var(--line)"></i>Open for new projects <b style="color:var(--ink)">' + fmt(left) + "</b></span></div>" +
      '<p class="small muted" style="margin-top:6px">Businesses here agreed to accept ' + fmt(BUDGET.pledged) + " points this month. Projects can never promise more than that. When they accept more, more work opens.</p></div>";
  }

  // ---- Work home: Start or Join, then a category ----
  var ROLES = [
    { id: "organizer", name: "Community organizer", what: "Signs up businesses, runs events and keeps a town or county going.", pay: "Paid per result, set in your project", get: "Tutorial and test" },
    { id: "moderator", name: "Talk moderator", what: "Keeps conversations kind and useful.", pay: "Paid per shift", get: "Tutorial and test" },
    { id: "checker", name: "Checker", what: "Reviews proposals and checks finished work.", pay: CHECK_PRICES.review + " a review, " + CHECK_PRICES.remote + " online, " + CHECK_PRICES.onsite + " on site", get: "Tutorial and test" },
    { id: "help", name: "Member help", what: "Answers questions by email and in Talk.", pay: "Paid per shift", get: "Tutorial and test" },
    { id: "reports", name: "Reports", what: "Sorts out wrong phone numbers and listing reports.", pay: "Paid per report", get: "Tutorial and test" },
    { id: "keeper", name: "Keeper", what: "Signs off on rule changes.", pay: "Set by the members", get: "Interview and approval" }
  ];
  var mode = "start";
  function stats(tid) {
    var ps = allProjects().filter(function (p) { return p.type === tid && (p.status === "open" || p.status === "stall"); });
    return { n: ps.length, pts: ps.reduce(function (a, p) { return a + total(p); }, 0), help: ps.filter(function (p) { return p.help; }).length };
  }
  function gate(m) {
    return '<div class="card" style="margin-top:12px"><h3>To start or join a project</h3><p class="small muted" style="margin:4px 0 8px">Anyone can look around. To take part you need both of these.</p>' +
      '<div class="chk"><b class="' + (m.person ? "ok" : "no") + '">' + (m.person ? "✓" : "○") + '</b><span>ID check <a href="/app/profile.html">in your profile</a></span></div>' +
      '<div class="chk"><b class="' + (m.biz ? "ok" : "no") + '">' + (m.biz ? "✓" : "○") + '</b><span>Your business claimed in the <a href="/directory/">directory</a></span><span class="sub">Working on your own? Add yourself as a one-person business.</span></div></div>';
  }
  function list() {
    var m = me(), ok = m.person && m.biz;
    var h = '<div class="page-head"><div class="eyebrow">Work</div><h1>There\'s plenty to do.</h1><p>Start a project for your business, or join one that\'s looking for help.</p></div>' + budgetCard();
    h += '<div class="seg big"><button data-mode="start" aria-pressed="' + (mode === "start") + '">Start a project</button><button data-mode="join" aria-pressed="' + (mode === "join") + '">Join a project</button></div>';
    h += '<p class="small muted" style="margin-bottom:8px">' + (mode === "start"
      ? "Pick a category. You say what you'll do, the price and the deadlines." + (ok ? " You can propose up to <b style=\"color:var(--ink)\">" + fmt(cap(m)) + "</b> points" + (m.done.length ? "." : " on your first project.") : "")
      : "Pick a category to see projects that are under way and looking for help.") + "</p>";
    h += '<div class="cats">' + TYPES.map(function (t) {
      var st = stats(t.id);
      return '<a class="cat" href="#' + mode + "/" + t.id + '"><b>' + esc(t.name) + "</b><small>" + esc(t.note) + '</small><span class="nums">' +
        (mode === "start" ? st.n + " under way · " + fmt(st.pts) + " points" : st.help + " looking for help") + "</span></a>";
    }).join("") +
      (mode === "start" ? '<a class="cat role" href="#roles"><b>Run Dandelions</b><small>Organizer, moderator, checker, member help, keeper</small><span class="nums">' + ROLES.length + " roles</span></a>" : "") + "</div>";
    if (!ok) h += gate(m);
    h += '<div class="row" style="margin-top:16px;justify-content:center"><a class="btn ghost small" href="#underway">See every project under way</a></div>';
    main.innerHTML = h;
    main.querySelectorAll("[data-mode]").forEach(function (b) { b.onclick = function () { mode = b.getAttribute("data-mode"); list(); }; });
  }
  function start(tid) {
    var m = me();
    if (!(m.person && m.biz)) { location.hash = "list"; return; }
    if (!D || D.type !== tid) D = { type: tid, title: "", what: "", town: "", help: "", ticks: {}, pay: [blankRow(true)], why: "" };
    proposal(2);
  }
  function join(tid) {
    var t = type(tid), m = me();
    var ps = allProjects().filter(function (p) { return p.type === tid && p.help && p.status !== "review"; });
    var h = '<a class="back" href="#list">← Work</a><div class="page-head"><div class="eyebrow">Join a project</div><h1 style="font-size:32px">' + esc(t.name) + '</h1><p>These owners are looking for help. Talk to them about the work and how they\'ll pay you.</p></div><div class="stack">' +
      (ps.length ? ps.map(function (p) {
        return '<div class="card"><div class="spread"><b>' + esc(p.owner) + '</b><span class="small muted">' + esc(p.town) + '</span></div><a href="#p/' + p.id + '" style="font-weight:700">' + esc(p.title) + '</a><p class="small" style="margin-top:6px"><b>Looking for:</b> ' + esc(p.help) + "</p>" +
          (m.person && m.biz ? '<button class="btn small" type="button" style="margin-top:8px" data-contact="' + esc(p.owner) + '">Message ' + esc(p.owner) + "</button>" : "") + "</div>";
      }).join("") : '<p class="muted">Nobody in this category is looking for help right now.</p>') + "</div>" +
      '<p class="small muted" style="margin-top:12px">Ideas and questions: <a href="/app/talk.html?r=topic-' + tid + '">' + esc(t.name) + " group chat</a></p>";
    main.innerHTML = h;
    main.querySelectorAll("[data-contact]").forEach(function (b) {
      b.onclick = function () {
        var back = document.createElement("div"); back.className = "sheet-back";
        back.innerHTML = '<div class="sheet"><div class="spread"><h2 style="font-size:22px">Message ' + esc(b.getAttribute("data-contact")) + '</h2><button class="btn ghost small" data-close>Close</button></div>' +
          '<label class="field" style="display:block;margin-top:10px">What you can do<textarea placeholder="Example: I can post flyers in Cotati on weekends."></textarea></label><button class="btn" style="width:100%;margin-top:12px" data-close data-sent>Send</button>' +
          '<p class="small muted" style="margin-top:8px">The owner decides who helps and how they pay. Dandelions only pays the owner\'s business.</p></div>';
        back.onclick = function (e) { if (e.target === back || e.target.closest("[data-close]")) { if (e.target.closest("[data-sent]")) toast("Sent"); back.remove(); } };
        document.body.appendChild(back);
      };
    });
  }
  function roles() {
    var m = me();
    var h = '<a class="back" href="#list">← Work</a><div class="page-head"><div class="eyebrow">Start a project</div><h1 style="font-size:32px">Run Dandelions.</h1><p>Ongoing roles that keep things running. Getting a role is a project too.</p></div><div class="stack">' +
      ROLES.map(function (r) {
        return '<div class="card"><b>' + esc(r.name) + '</b><p class="small">' + esc(r.what) + '</p><div class="keyrow" style="margin-top:6px"><span>' + esc(r.pay) + "</span><span>To get it: " + esc(r.get) + "</span></div>" +
          (m.person && m.biz ? '<button class="btn small" type="button" style="margin-top:8px" data-role="' + r.id + '">' + (r.id === "keeper" ? "Ask for an interview" : "Start the tutorial") + "</button>" : "") + "</div>";
      }).join("") + "</div>" + (m.person && m.biz ? "" : gate(m));
    main.innerHTML = h;
    main.querySelectorAll("[data-role]").forEach(function (b) {
      b.onclick = function () {
        var r = ROLES.filter(function (x) { return x.id === b.getAttribute("data-role"); })[0];
        var back = document.createElement("div"); back.className = "sheet-back";
        back.innerHTML = '<div class="sheet"><div class="spread"><h2 style="font-size:22px">' + esc(r.name) + '</h2><button class="btn ghost small" data-close>Close</button></div>' +
          (r.id === "keeper" ? '<p style="margin-top:8px">Keepers are picked by interview and approved by the members. Tell us why you want it and what you\'ve done.</p><textarea style="margin-top:10px"></textarea>'
            : '<div class="stack" style="margin-top:10px"><div class="chk"><b class="ok">1</b><span>Watch the tutorial, about 15 minutes</span></div><div class="chk"><b class="ok">2</b><span>Take the test, 10 questions</span></div><div class="chk"><b class="ok">3</b><span>Pass, and the role shows on your record</span></div></div>') +
          '<button class="btn" style="width:100%;margin-top:12px" data-close data-sent>' + (r.id === "keeper" ? "Send" : "Start") + "</button></div>";
        back.onclick = function (e) { if (e.target === back || e.target.closest("[data-close]")) { if (e.target.closest("[data-sent]")) toast("Preview only"); back.remove(); } };
        document.body.appendChild(back);
      };
    });
  }
  var tfilter = "";
  function underway() {
    var ps = allProjects().filter(function (p) { return !tfilter || p.type === tfilter; });
    var h = '<a class="back" href="#list">← Work</a><div class="page-head"><div class="eyebrow">Under way</div><h1 style="font-size:32px">Every project.</h1><p>Anyone can see where points are going.</p></div>';
    h += '<div class="filters"><button data-t="" aria-pressed="' + !tfilter + '">All</button>' + TYPES.map(function (t) { return '<button data-t="' + t.id + '" aria-pressed="' + (tfilter === t.id) + '">' + esc(t.name) + "</button>"; }).join("") + "</div>";
    h += '<div class="stack">' + ps.map(function (p) {
      var t = total(p), pd = paid(p);
      return '<a class="card wcard" href="#p/' + p.id + '"><div class="spread"><span class="type">' + esc(type(p.type).name) + "</span>" + badge(p.status) + "</div><h3>" + esc(p.title) + "</h3>" +
        '<div class="small muted">' + esc(p.owner) + " · " + esc(p.town) + '</div><div class="bar"><span style="width:' + Math.min(100, pd / t * 100) + '%"></span></div>' +
        '<div class="meta"><span><b>' + fmt(pd) + "</b> of " + fmt(t) + " paid</span>" + (p.help ? "<span>Looking for help</span>" : "") + "</div></a>";
    }).join("") + "</div>";
    main.innerHTML = h;
    main.querySelectorAll("[data-t]").forEach(function (b) { b.onclick = function () { tfilter = b.getAttribute("data-t"); underway(); }; });
  }

  // ---- Project page ----
  function project(id) {
    var p = find(id);
    if (!p) { location.hash = "list"; return; }
    var t = type(p.type), tot = total(p);
    var h = '<a class="back" href="#underway">← Under way</a><div class="page-head"><div class="eyebrow">' + esc(t.name) + '</div><h1 style="font-size:32px">' + esc(p.title) + "</h1><p>" + esc(p.owner) + " · " + esc(p.town) + "</p></div>";
    if (p.status === "stall") h += '<p class="note" style="margin-bottom:12px"><b>A payment is ' + STALL_DAYS + "+ days late.</b> If nothing is checked by day " + CANCEL_DAYS + ", the project is cancelled, unpaid points go back to the budget, and it goes on the owner's record. The owner can add what happened.</p>";
    if (p.status === "review") h += '<p class="note" style="margin-bottom:12px"><b>Waiting for a checker.</b> A random checker confirms it fits the type, the price is fair and every payment is clear. Usually within 3 days.</p>';
    h += '<div class="card"><p>' + esc(p.what) + '</p><div class="spread" style="margin-top:12px"><span class="small muted">Total</span><b class="pts">' + fmt(tot) + " points</b></div></div>";
    h += '<h2 class="section-title">Payments</h2><div class="card">' + p.pay.map(function (r, i) {
      var cls = r.st === "paid" ? "paid" : r.st === "checking" ? "checking" : r.st === "late" ? "late" : "";
      var label = r.st === "paid" ? "Paid" : r.st === "checking" ? "Being checked" : r.st === "late" ? (r.lateDays || "") + " days late" : "Due " + esc(r.due);
      var piece = r.kind === "p" ? '<span class="sub">' + r.per + " each, up to " + fmt(r.max) + ". " + fmt(r.count || 0) + " paid so far.</span>" : "";
      return '<div class="pay ' + cls + '"><span class="dot">' + (r.st === "paid" ? "✓" : i + 1) + "</span><b>" + esc(r.what) + '</b><span class="amt">' + fmt(r.amt) + "</span>" + piece +
        '<span class="sub">' + (r.kind === "p" ? "By the piece" : "Milestone") + " · " + esc(r.how) + " · " + label + "</span></div>";
    }).join("") + "</div>";
    h += '<h2 class="section-title">The owner\'s record</h2><div class="card"><div class="rec"><div><b>' + p.rec[0] + '</b><span>On time</span></div><div><b>' + p.rec[1] + '</b><span>Late</span></div><div><b>' + p.rec[2] + '</b><span>Cancelled</span></div></div>' +
      (p.rec[2] ? '<p class="small muted" style="margin-top:8px">Owner\'s note on the cancelled one: "Our supplier closed two weeks in. We finished half and asked to stop."</p>' : "") + "</div>";
    h += '<p class="small muted" style="margin-top:12px">The owner can hire anyone to help. They have the agreement with Dandelions and decide how the work gets done. <a href="/app/talk.html?r=topic-' + p.type + '">' + esc(t.name) + " group chat</a></p>";
    main.innerHTML = h;
  }

  // ---- New proposal ----
  var D = null;
  function blankRow(first) { return { kind: "m", what: "", how: "Checked online", amt: "", per: "", max: "", due: first ? "In 7 days" : "" }; }
  function proposal(step) {
    var m = me();
    if (!(m.person && m.biz) || !D || !D.type) { location.hash = "list"; return; }
    step = Math.max(2, step || 2);
    var h = '<a class="back" href="#list">← Cancel</a><div class="page-head"><div class="eyebrow">' + esc(type(D.type).name) + ' · step ' + (step - 1) + ' of 3</div><h1 style="font-size:32px">' +
      ["", "What will you do?", "How you get paid.", "Check and send."][step - 1] + '</h1></div><div class="steps">' + [2, 3, 4].map(function (i) { return '<span class="' + (i <= step ? "on" : "") + '"></span>'; }).join("") + "</div>";
    if (step === 1) {
      h += TYPES.map(function (t) { return '<button class="pick" type="button" data-type="' + t.id + '" aria-pressed="' + (D.type === t.id) + '"><b>' + esc(t.name) + "</b><small>" + esc(t.note) + "</small></button>"; }).join("") +
        '<p class="small muted" style="margin-top:10px">Not sure? Ask in the type\'s group chat. You\'ll find ideas others have tried.</p>';
    }
    if (step === 2) {
      var t = type(D.type);
      h += '<label class="field">Name it<input id="ftitle" value="' + esc(D.title) + '" placeholder="Example: Flyers for the fix-it day in Petaluma"></label>' +
        '<label class="field" style="display:block;margin-top:10px">What you\'ll do, in a few sentences<textarea id="fwhat" placeholder="What, where, for whom">' + esc(D.what) + "</textarea></label>" +
        '<label class="field" style="display:block;margin-top:10px">Where<input id="ftown" value="' + esc(D.town) + '" placeholder="Town, or Online"></label>' +
        '<div class="card" style="margin-top:14px"><b>Does it fit ' + esc(t.name) + '?</b><p class="small muted">A checker looks at these too.</p>' + t.fits.map(function (f, i) {
          return '<label class="tick"><input type="checkbox" data-tick="' + i + '"' + (D.ticks[i] ? " checked" : "") + "> <span>" + esc(f) + "</span></label>";
        }).join("") + '</div><p class="small muted" style="margin-top:10px">Ideas from the <a href="/app/talk.html?r=topic-' + t.id + '">group chat</a>: ' + t.ideas.map(esc).join(", ") + ".</p>" +
        '<label class="field" style="display:block;margin-top:14px">Looking for help? <span class="muted">(optional)</span><input id="fhelp" value="' + esc(D.help) + '" placeholder="Example: people to post flyers on weekends"></label>' +
        '<p class="small muted" style="margin-top:4px">It shows under Join a project. You decide who helps and how you pay them.</p>';
    }
    if (step === 3) {
      h += '<p class="small muted">Split the work into payments. Each one says what counts as done and how it\'s checked. ' +
        (m.done.length ? "" : "Make the first one small and quick, so you don't have to pay for much up front. ") + "</p>" +
        D.pay.map(function (r, i) {
          return '<div class="row-ed" data-row="' + i + '"><div class="spread"><b>Payment ' + (i + 1) + "</b>" + (i ? '<button class="btn ghost small" type="button" data-del="' + i + '">Remove</button>' : "") + "</div>" +
            '<div class="seg" style="margin:8px 0 0"><button type="button" data-kind="m" aria-pressed="' + (r.kind === "m") + '">Milestone</button><button type="button" data-kind="p" aria-pressed="' + (r.kind === "p") + '">By the piece</button></div>' +
            '<label class="field">' + (r.kind === "p" ? "What counts as one piece" : "What counts as done") + '<input data-f="what" value="' + esc(r.what) + '" placeholder="' + (r.kind === "p" ? "Example: one confirmed sign-up" : "Example: 500 flyers posted at 40 spots") + '"></label>' +
            '<label class="field">How it\'s checked<select data-f="how">' + ["Checked online", "Counted by Dandelions", "Photos, checked online", "On-site check", "Both businesses confirm in Dandelions"].map(function (o) { return "<option" + (r.how === o ? " selected" : "") + ">" + o + "</option>"; }).join("") + "</select></label>" +
            (r.kind === "p" ? '<div class="two"><label class="field">Points each<input data-f="per" inputmode="numeric" value="' + esc(r.per) + '"></label><label class="field">Up to how many<input data-f="max" inputmode="numeric" value="' + esc(r.max) + '"></label></div>'
              : '<label class="field">Points<input data-f="amt" inputmode="numeric" value="' + esc(r.amt) + '"></label>') +
            '<label class="field">Due<input data-f="due" value="' + esc(r.due) + '" placeholder="Date"></label></div>';
        }).join("") + '<button class="btn ghost small" type="button" id="addrow" style="margin-top:10px">Add a payment</button>' +
        '<p style="margin-top:12px"><b>Total: <span id="tot">' + fmt(dtotal()) + "</span> points</b></p>";
    }
    if (step === 4) {
      var t4 = type(D.type), tot = dtotal(), c = cap(m), left = BUDGET.pledged - BUDGET.reserved;
      var first = D.pay[0], firstAmt = rowAmt(first);
      var perPiece = D.pay.filter(function (r) { return r.kind === "p"; });
      var high = perPiece.some(function (r) { return Number(r.per) > t4.guide[1]; });
      var checks = [
        [tot > 0 && tot <= c, "Within your limit of " + fmt(c), m.done.length ? "Your limit is " + GROW + "x your biggest finished project." : "First projects go up to " + fmt(FIRST_CAP) + ". Finish it and your limit grows."],
        [tot <= left, "Within this month's open budget (" + fmt(left) + ")", "If it doesn't fit, it waits for next month or for more businesses to accept points."],
        [firstAmt > 0 && firstAmt <= tot * FIRST_PAY_MAX, "First payment is small: " + fmt(firstAmt) + " of " + fmt(tot), "Keep it to " + Math.round(FIRST_PAY_MAX * 100) + "% or less, due within " + FIRST_PAY_DAYS + " days."],
        [D.pay.every(function (r) { return r.what && r.due && rowAmt(r) > 0; }), "Every payment says what's done, when and how much", ""],
        [!high, high ? "Higher than usual for " + t4.name : "Price is in the usual range", "Usually " + t4.guide[0] + " to " + fmt(t4.guide[1]) + " points " + t4.unit + "." + (high ? " Say why below, and the checker will weigh it." : "")]
      ];
      h += '<div class="card"><b>' + esc(D.title || "Untitled") + '</b><p class="small muted">' + esc(t4.name) + " · " + esc(D.town) + " · " + D.pay.length + " payments · " + fmt(tot) + " points</p></div>" +
        '<div class="card">' + checks.map(function (x) { return '<div class="chk"><b class="' + (x[0] ? "ok" : "no") + '">' + (x[0] ? "✓" : "!") + "</b><span>" + esc(x[1]) + "</span>" + (x[2] ? '<span class="sub">' + esc(x[2]) + "</span>" : "") + "</div>"; }).join("") + "</div>" +
        (high ? '<label class="field" style="display:block;margin-top:10px">Why it costs more<textarea id="fwhy">' + esc(D.why) + "</textarea></label>" : "") +
        '<p class="small muted" style="margin-top:12px">A random checker reviews it next: does it fit the type, is the price fair, is each payment clear. They can accept it or send it back with notes. Once it\'s accepted, the points are set aside for you.</p>';
      D._ok = checks.slice(0, 4).every(function (x) { return x[0]; });
    }
    h += '<div class="spread" style="margin-top:18px">' + (step > 1 ? '<button class="btn ghost" type="button" id="prev">Back</button>' : "<span></span>") +
      '<button class="btn" type="button" id="next">' + (step === 4 ? "Send to a checker" : "Next") + "</button></div>";
    main.innerHTML = h;
    bindProposal(step);
  }
  function rowAmt(r) { return r.kind === "p" ? Number(r.per || 0) * Number(r.max || 0) : Number(r.amt || 0); }
  function dtotal() { return D.pay.reduce(function (a, r) { return a + rowAmt(r); }, 0); }
  function bindProposal(step) {
    function grab() {
      if (step === 2) { D.title = val("ftitle"); D.what = val("fwhat"); D.town = val("ftown"); D.help = val("fhelp"); main.querySelectorAll("[data-tick]").forEach(function (c) { D.ticks[c.getAttribute("data-tick")] = c.checked; }); }
      if (step === 3) main.querySelectorAll("[data-row]").forEach(function (el) { var r = D.pay[el.getAttribute("data-row")]; el.querySelectorAll("[data-f]").forEach(function (f) { r[f.getAttribute("data-f")] = f.value; }); });
      if (step === 4 && document.getElementById("fwhy")) D.why = val("fwhy");
    }
    function val(id) { var e = document.getElementById(id); return e ? e.value.trim() : ""; }
    main.querySelectorAll("[data-type]").forEach(function (b) { b.onclick = function () { if (D.type !== b.getAttribute("data-type")) D.ticks = {}; D.type = b.getAttribute("data-type"); proposal(1); }; });
    main.querySelectorAll("[data-kind]").forEach(function (b) { b.onclick = function () { grab(); D.pay[b.closest("[data-row]").getAttribute("data-row")].kind = b.getAttribute("data-kind"); proposal(3); }; });
    main.querySelectorAll("[data-del]").forEach(function (b) { b.onclick = function () { grab(); D.pay.splice(Number(b.getAttribute("data-del")), 1); proposal(3); }; });
    main.querySelectorAll("[data-f]").forEach(function (f) { f.oninput = function () { grab(); var t = document.getElementById("tot"); if (t) t.textContent = fmt(dtotal()); }; });
    var add = document.getElementById("addrow"); if (add) add.onclick = function () { grab(); D.pay.push(blankRow(false)); proposal(3); };
    var prev = document.getElementById("prev"); if (prev && step === 2) prev.remove(); else if (prev) prev.onclick = function () { grab(); proposal(step - 1); };
    document.getElementById("next").onclick = function () {
      grab();
      if (step === 2 && (!D.title || !D.what)) return toast("Add a name and what you'll do");
      if (step === 2 && type(D.type).fits.some(function (_, i) { return !D.ticks[i]; })) return toast("Tick each box, or pick another type");
      if (step < 4) return proposal(step + 1);
      if (!D._ok) return toast("Fix the items marked ! first");
      S.mine.unshift({ id: "m" + Date.now(), mine: true, type: D.type, title: D.title, owner: me().name, rec: [me().done.length, me().late, me().cancelled], status: "review", town: D.town || "Sonoma County", what: D.what, help: D.help,
        pay: D.pay.map(function (r) { return { kind: r.kind, what: r.what, how: r.how, amt: rowAmt(r), per: Number(r.per), max: Number(r.max), due: r.due, st: "due", count: 0 }; }) });
      save(); D = null; toast("Sent to a checker"); location.hash = "record";
    };
  }

  // ---- Your record ----
  function record() {
    var m = me();
    if (!(m.person && m.biz)) { location.hash = "list"; return; }
    var big = m.done.length ? Math.max.apply(null, m.done) : 0, c = cap(m);
    var h = '<div class="page-head"><div class="eyebrow">Your record</div><h1 style="font-size:32px">' + esc(m.name) + "</h1><p>Anyone can see a project owner's record.</p></div>" +
      '<div class="card"><div class="rec"><div><b>' + m.done.length + '</b><span>On time</span></div><div><b>' + m.late + '</b><span>Late</span></div><div><b>' + m.cancelled + '</b><span>Cancelled</span></div></div></div>' +
      '<h2 class="section-title">Your projects</h2><div class="stack">' + (S.mine.length ? S.mine.map(function (p) { return '<a class="card wcard" href="#p/' + p.id + '"><div class="spread"><span class="type">' + esc(type(p.type).name) + "</span>" + badge(p.status) + "</div><h3>" + esc(p.title) + '</h3><div class="small muted">' + fmt(total(p)) + " points</div></a>"; }).join("") : '<p class="muted small">None yet. Start one from the <a href="#list">Work</a> page.</p>') + "</div>" +
      '<h2 class="section-title">How big you can go</h2><div class="card"><div style="font-family:var(--display);font-size:30px">' + fmt(c) + '<span class="small"> points a project</span></div>' +
      '<p class="small muted">' + (big ? "Your biggest finished project was " + fmt(big) + ", so your limit is " + GROW + "x that." : "Your first project can be up to " + fmt(FIRST_CAP) + ". Each one you finish lets the next be " + GROW + "x bigger.") +
      " A " + esc(m.size.toLowerCase()) + " business tops out at " + fmt((SIZE_CEILING.filter(function (x) { return x[0] === m.size; })[0] || [0, 0])[1]) + " for now.</p>" +
      '<div class="stack small" style="margin-top:10px">' + [FIRST_CAP, FIRST_CAP * 2, FIRST_CAP * 4, FIRST_CAP * 8].map(function (v, i) {
        return '<div class="spread"><span>' + (i === 0 ? "First project" : "After " + i + " finished") + "</span><b>up to " + fmt(v) + "</b></div>";
      }).join("") + '<p class="muted">If each one is as big as allowed.</p></div></div>' +
      '<h2 class="section-title">If a project stalls</h2><div class="card small"><p>A payment ' + STALL_DAYS + " days late marks the project stalled. At " + CANCEL_DAYS + " days it's cancelled, so the points can go to other projects.</p>" +
      '<p style="margin-top:6px">A cancelled project stays on your record. You can add what happened, and if you think it wasn\'t fair, open a dispute. Your note shows next to it.</p></div>';
    main.innerHTML = h;
  }

  // ---- Checker queue ----
  function check() {
    var m = me();
    var items = [
      ["review", "Proposal: Make the county map easier to tap on small phones", "Pixel Barn Design · 400 points"],
      ["remote", "500 flyers posted at 40 spots", "Petaluma Print Shop · 40 photos"],
      ["onsite", "Sign-up table set up, Healdsburg market", "Coast Kombucha · Sat 9am"],
      ["remote", "Directory check, 25 businesses", "West County Errands · spot-check 3 by phone"]
    ];
    var NAMES = { review: "Proposal review", remote: "Online check", onsite: "On-site check" };
    var h = '<div class="page-head"><div class="eyebrow">Checking</div><h1 style="font-size:32px">Check work, paid by the piece.</h1><p>' +
      CHECK_PRICES.review + " a proposal review, " + CHECK_PRICES.remote + " an online check, " + CHECK_PRICES.onsite + " an on-site check.</p></div>" +
      (m.person && m.biz ? "" : '<p class="note" style="margin-bottom:12px">Checkers need an ID check, a business, a short tutorial and a test.</p>') +
      '<p class="small muted" style="margin-bottom:10px">You only get work from people you have no ties to, picked at random. Up to 60 pieces a month.</p><div class="stack">' +
      items.map(function (x, i) {
        return '<div class="card"><div class="spread"><span class="type" style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--leaf)">' + NAMES[x[0]] + '</span><b class="pts">' + CHECK_PRICES[x[0]] + "</b></div><b>" + esc(x[1]) + '</b><p class="small muted">' + esc(x[2]) + "</p>" +
          (m.person && m.biz ? '<button class="btn small" type="button" style="margin-top:8px" data-take="' + i + '">Take it</button>' : "") + "</div>";
      }).join("") + "</div>";
    main.innerHTML = h;
    main.querySelectorAll("[data-take]").forEach(function (b) {
      b.onclick = function () {
        var x = items[b.getAttribute("data-take")], rev = x[0] === "review";
        var back = document.createElement("div"); back.className = "sheet-back";
        back.innerHTML = '<div class="sheet"><div class="spread"><h2 style="font-size:22px">' + NAMES[x[0]] + '</h2><button class="btn ghost small" data-close>Close</button></div><p style="margin-top:8px"><b>' + esc(x[1]) + "</b></p>" +
          (rev ? ["It fits the project type", "The price is fair for the work", "Each payment says clearly what counts as done", "The first payment is small and quick"] : ["The proof shows the work is done", "It matches what the payment says"]).map(function (q) { return '<label class="tick"><input type="checkbox"> ' + q + "</label>"; }).join("") +
          '<label class="field" style="display:block;margin-top:10px">Note to the owner<textarea placeholder="Needed if you send it back"></textarea></label>' +
          '<div class="spread" style="margin-top:12px"><button class="btn ghost" data-close>Send back</button><button class="btn" data-close>' + (rev ? "Accept" : "Looks done") + "</button></div></div>";
        back.onclick = function (e) { if (e.target === back || e.target.closest("[data-close]")) { back.remove(); if (e.target.closest("[data-close]") && e.target.textContent !== "Close") toast("Saved. " + CHECK_PRICES[x[0]] + " points once it's logged."); } };
        document.body.appendChild(back);
      };
    });
  }

  // ---- Router ----
  function route() {
    var hsh = location.hash.slice(1) || "list";
    window.scrollTo(0, 0);
    document.querySelectorAll(".sheet-back").forEach(function (x) { x.remove(); });
    if (hsh.indexOf("p/") === 0) return project(hsh.slice(2));
    if (hsh.indexOf("start/") === 0) return start(hsh.slice(6));
    if (hsh.indexOf("join/") === 0) return join(hsh.slice(5));
    if (hsh === "roles") return roles();
    if (hsh === "underway") return underway();
    if (hsh === "record") return record();
    if (hsh === "check") return check();
    list();
  }
  var who = document.getElementById("who");
  who.value = S.who;
  who.onchange = function () { S.who = who.value; save(); D = null; route(); };
  window.addEventListener("hashchange", route);
  route();
})();
