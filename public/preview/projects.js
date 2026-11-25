// Approved projects: 8 broad categories that unlock in order, each with approved projects. Preview only.
(function () {
  var LOCK = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="8" rx="1.5" fill="currentColor"/><path d="M5 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
  var CATS = [
    { id: "dandelions", name: "Dandelions: build and maintain", open: true, opens: "Opens first, when a county reaches its starting numbers",
      purpose: "Grow the network and keep it running: more members, more businesses accepting points, more places to spend them, and the site and tools everyone uses.",
      projects: [
        ["Spread the word", "Posts, videos, articles and local news that bring people to the site. Paid per site visit and per sign-up.", "Online", "No license", "Weekly piecework"],
        ["Sign up members", "Tables at markets and events, and welcoming new people. Paid per sign-up.", "In person", "No license", "Weekly piecework"],
        ["Sign up businesses", "Visits, calls and directory checks, so local businesses claim their listing.", "In person", "No license", "Weekly piecework"],
        ["Help businesses and landlords accept points", "Find places for a business to spend points, so it can accept more.", "In person", "No license", "Weekly piecework"],
        ["Events and meetups", "Gatherings that bring members and local businesses together.", "In person", "No license", "Milestones"],
        ["Site and tools", "The site, data, guides and artwork.", "Online", "No license", "Milestones"]
      ] },
    { id: "education", name: "Education", opens: "Unlocks at 1% pledged",
      purpose: "Teach the skills people and businesses need, starting with job training for the work that needs doing here.",
      examples: "Job training, apprenticeships, classes for small business owners" },
    { id: "automation", name: "Automation", opens: "Unlocks at 2% pledged",
      purpose: "Help local businesses get more done with the people they have, so they can pay more and charge less.",
      examples: "Automation check-ups, build-outs, training people to run and fix the machines" },
    { id: "health", name: "Health and care", opens: "Unlocks at 3% pledged",
      purpose: "Help people stay healthy, safe and connected, at home and in their community.",
      examples: "Elder visits, rides to appointments, childcare, licensed home care, neighbors helping neighbors" },
    { id: "agriculture", name: "Agriculture", opens: "Unlocks at 4% pledged",
      purpose: "Grow more good food close to home, in ways that build the soil instead of using it up.",
      examples: "Regenerative farming, local food processing, community gardens" },
    { id: "infrastructure", name: "Infrastructure", opens: "Unlocks at 5% pledged (Bloom)",
      purpose: "Build and fix the things everyone shares: housing, power, water, transport, and tech and security.",
      examples: "Fix-it days, home repair, clean power, broadband, cybersecurity" },
    { id: "environment", name: "Environmental cleanup and planet care", opens: "Unlocks at 7% pledged",
      purpose: "Clean up the damage, and put back more than we take.",
      examples: "Cleanups, restoring creeks and wildland, recycling and recovering materials" },
    { id: "research", name: "Research and development", opens: "Unlocks at 10% pledged (Puffball)",
      purpose: "Fund the research and new ideas that make everything else work better.",
      examples: "Local research projects, open designs shared across counties" }
  ];
  // Roles that keep Dandelions running. [name, what it does, locked until]
  var ROLES = [
    ["Checking the work", [
      ["Checker", "Reviews project forms and checks finished work, picked at random. Paid the same for yes or no."],
      ["Dispute panelist", "Sits on a random panel of 5 that settles a disagreement about a check."],
      ["Data analyst", "Reads Rai's numbers and writes up what should change, for members to vote on."]]],
    ["Growing it", [
      ["Community organizer", "Signs up businesses, helps owners claim their listing, and runs meetups and events."],
      ["Marketer", "Spreads the word on social media, local news, radio and podcasts. Paid posts always say they're paid."]]],
    ["Keeping it running", [
      ["Talk moderator", "Keeps Talk kind and useful. Wears a badge so everyone knows."],
      ["Member help", "Answers the questions Rai can't, and sorts out wrong numbers and listing reports."],
      ["Service operator", "A business that runs one piece of the system, like hosting, ID checks or the directory.", "Unlocks when points go live"],
      ["Site security", "Watches for attacks, checks who has access, and fixes weak spots.", "Trusted people first"]]],
    ["Improving it", [
      ["Tester", "Tries each change on a real phone before it goes live, and reports what breaks."],
      ["Course maker", "Writes the how-to and short test for each role, and the help videos."],
      ["Code reviewer", "Reads every change to the site's code before it goes live.", "Trusted people first"],
      ["Site maintainer", "Puts reviewed changes live and keeps the site running.", "Trusted people first"]]],
    ["Guarding the rules", [
      ["Signer", "Picked at random to co-sign anything that creates points or changes the rules.", "Unlocks when points go live"],
      ["Keeper", "Signs off on charter changes after a vote, and can pause something to stop harm. Never creates points.", "Trusted people first"]]]
  ];
  function rolesHTML() {
    return '<h2 class="section-title">Roles that keep it running</h2><p class="small muted" style="margin:-4px 0 10px">Tap a group to see its roles, and line up for the ones you want. Paid per piece once points go live.</p>' +
      ROLES.map(function (g) {
        return '<details class="card" style="margin-top:10px"><summary style="cursor:pointer"><b>' + esc(g[0]) + '</b> <span class="small muted">' + g[1].length + ' roles</span></summary><div class="stack" style="margin-top:10px">' + g[1].map(function (r) {
          return '<div class="card proj"><div class="spread"><b>' + esc(r[0]) + "</b>" + (r[2] ? '<span class="lock">' + LOCK + " " + esc(r[2]) + "</span>" : "") + '</div><span class="small">' + esc(r[1]) + "</span>" +
            (r[2] ? "" : '<div><button class="btn small ghost" type="button" disabled>Line up</button></div>') + "</div>";
        }).join("") + "</div></details>";
      }).join("");
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var app = document.getElementById("app");

  function home() {
    app.innerHTML = '<div class="page-head"><div class="eyebrow">Preview · Work</div><h1>Approved projects</h1>' +
      "<p>Eight broad kinds of work, for the things the market doesn't pay for. They unlock one at a time as your county grows. Tap one to see its projects.</p></div>" +
      '<div class="cats">' + CATS.map(function (c, i) {
        return '<button class="cat' + (c.open ? " open" : "") + '" type="button" data-id="' + c.id + '"><span class="n">' + (i + 1) + "</span><b>" + esc(c.name) + "</b>" +
          (c.open ? '<span class="chip sun">Opens first</span>' : '<span class="lock">' + LOCK + " Locked</span>") +
          '<span class="sub">' + esc(c.opens) + "</span></button>";
      }).join("") + "</div>" +
      '<p class="small muted" style="margin-top:12px">The unlock points are starting numbers. Members can change them by vote. Categories rarely change. Projects inside them are added or removed by vote.</p>';
  }

  function cat(c) {
    var h = '<button class="back" type="button" data-back="1">← All categories</button>' +
      '<div class="page-head"><div class="eyebrow">' + (c.open ? "Opens first" : esc(c.opens)) + "</div><h1>" + esc(c.name) + "</h1>" +
      '<p class="purpose">' + esc(c.purpose) + "</p>" +
      '<p class="small muted">Only work the market doesn\'t already pay for. When for-profit businesses need the workers, projects step back.</p></div>';
    if (c.projects) {
      h += '<h2 class="section-title">Projects</h2><div class="filters"><select id="f-where" aria-label="In person or online"><option value="">In person or online</option><option>In person</option><option>Online</option></select>' +
        '<select id="f-lic" aria-label="License"><option value="">Any license</option><option>No license</option><option>License needed</option></select>' +
        '<select id="f-pay" aria-label="How it pays"><option value="">Any pay</option><option>Weekly piecework</option><option>Milestones</option></select></div>' +
        '<div class="stack" id="plist"></div>' + rolesHTML();
    } else {
      h += '<div class="card"><span class="lock">' + LOCK + " Locked</span><p style=\"margin-top:8px\">" + esc(c.opens) + ".</p>" +
        '<p class="small muted" style="margin-top:8px">Projects that might fit here, once it opens and members approve them: ' + esc(c.examples) + ".</p></div>";
    }
    app.innerHTML = h;
    if (c.projects) { drawProjects(c); ["f-where", "f-lic", "f-pay"].forEach(function (id) { document.getElementById(id).addEventListener("change", function () { drawProjects(c); }); }); }
    window.scrollTo(0, 0);
  }
  function drawProjects(c) {
    var w = document.getElementById("f-where").value, l = document.getElementById("f-lic").value, p = document.getElementById("f-pay").value;
    var list = c.projects.filter(function (x) { return (!w || x[2] === w) && (!l || x[3] === l) && (!p || x[4] === p); });
    document.getElementById("plist").innerHTML = list.length ? list.map(function (x) {
      return '<div class="card proj"><b>' + esc(x[0]) + '</b><span class="small">' + esc(x[1]) + '</span><div class="tags"><span class="chip">' + esc(x[2]) + '</span><span class="chip">' + esc(x[3]) + '</span><span class="chip">' + esc(x[4]) + "</span></div>" +
        '<div><button class="btn small" type="button" disabled>Start this project</button> <span class="small muted">Coming soon</span></div></div>';
    }).join("") : '<p class="empty">No projects match. Try another filter.</p>';
  }

  function route() {
    var id = location.hash.slice(1), c = CATS.filter(function (x) { return x.id === id; })[0];
    if (c) cat(c); else home();
  }
  app.addEventListener("click", function (e) {
    var b = e.target.closest("[data-id]"); if (b) { location.hash = b.dataset.id; return; }
    if (e.target.closest("[data-back]")) location.hash = "";
  });
  window.addEventListener("hashchange", route);
  route();
})();
