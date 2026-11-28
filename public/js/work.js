// Work lite: how paid work will run, what has to happen first, and lining up for a position.
// Nothing here pays or promises anything. The only thing saved is a member's line-up.
(function () {
  var cfg = window.DANDELIONS_CONFIG || {};
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fmt(n) { return Number(n || 0).toLocaleString("en-US"); }
  function toast(text) {
    var t = document.createElement("div"); t.className = "toast"; t.textContent = text;
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2600);
  }

  var FLOW = [
    ["Qualify as a project owner", "Verify your business, and add any licenses and insurance to your profile."],
    ["Pick a kind of work you qualify for", "Each kind says what it pays for and what license it needs."],
    ["Fill out the project form", "Say what you'll do, your goal, and the tasks from the set price list."],
    ["Get approved and start", "A random checker reviews the form. Once it's approved, the points are set aside, so they're there when the work is done."],
    ["Get paid as you go", "Piecework is tallied and paid each week. Projects with milestones are paid as each one is verified. A deadline missed by more than 7 days stops the project on its own."],
    ["Sign off when it's done", "The project closes, and your track record grows, so you can take on bigger ones."]
  ];

  var TYPES = [
    { name: "Spread the word", note: "Posts, videos, flyers, local news",
      sample: "Fix-it day flyers around Petaluma",
      what: "Design a flyer for the fix-it day, print 500, and post them at 40 spots around town. Each flyer has a sign-up link so we can count who came from it.",
      steps: [["Flyer design shared", "Checked online"], ["500 flyers posted at 40 spots", "Photo of each spot"], ["ID-checked sign-ups from the flyer link", "Counted by Dandelions"]] },
    { name: "Sign up members", note: "Tables at markets and events, welcoming people",
      sample: "Sign-up table at the Healdsburg market, 4 Saturdays",
      what: "A table with a banner and a sign-up tablet at the Saturday market for 4 weeks.",
      steps: [["Table set up the first Saturday", "Photo, checked online"], ["ID-checked sign-ups at the table", "Counted by Dandelions"]] },
    { name: "Sign up businesses", note: "Visits, listings, directory checks",
      sample: "Directory check: every business in Sebastopol",
      what: "Call or visit every listed business and confirm it's open, its phone and its type. Help owners claim their listing if they want to.",
      steps: [["Each business confirmed with the right details", "Logged in the directory, spot-checked by phone"]] },
    { name: "Help businesses spend points", note: "Find places to spend, so more businesses accept",
      sample: "Find suppliers for 5 Santa Rosa restaurants",
      what: "Sit down with 5 restaurant owners, list what they buy each month, and sign up local businesses that sell those things.",
      steps: [["List of what the 5 restaurants buy", "Checked online"], ["A restaurant starts paying a local supplier in points", "Both businesses confirm it"]] },
    { name: "Build it", note: "The site, data, guides, artwork",
      sample: "Make the county map easier to tap on small phones",
      what: "Bigger tap targets on the home map, a zoom button, and a list of nearby counties under the map.",
      steps: [["Working version on a test page", "Checked online"], ["Live on the site after testing on 3 phones", "Checked online"]] }
  ];

  var ROLES = [
    ["Host", "Keeps a full copy of the charter and the site online, plus Dandelions' connection to the blockchain. Several hosts in different places, so no one can shut it down.", "/app/forms/standing.html?kind=Host"],
    ["Keeper", "Puts voting results into effect: updates the charter and site after a vote passes, archives the old version, and pushes the new one to every host. Never creates points.", "/app/forms/standing.html?kind=Keeper"],
    ["Signer", "Picked at random from an approved list to co-sign anything that creates points or changes the rules.", "/app/forms/pool.html?kind=Signer"],
    ["Moderator", "Keeps Talk kind and useful, and joins the conversation. Wears a badge so everyone knows.", "/app/forms/pool.html?kind=Moderator"],
    ["Checker", "Checks project plans and progress online, picked at random. A site visit only when a red flag goes off. Paid the same for yes or no, and never checks their own or related projects.", "/app/forms/pool.html?kind=Checker"],
    ["Bounty hunter", "Finds bugs and security holes and reports them. Paid per confirmed find.", "/app/forms/bounty.html"],
    ["Coder", "Works on the site and the blockchain code, and watches for security problems and breaches. Every change is reviewed by a different coder before it goes live.", "/app/forms/coder.html"],
    ["Jury", "Vetted members picked at random to settle disputes. Paid the same whatever the ruling.", "/app/forms/pool.html?kind=Jury"],
    ["Support", "Live chat with members who want a person instead of Rai, like stuck ID checks, account problems and wrong phone numbers. Ranked by know-how and access.", "/app/forms/pool.html?kind=Support"],
    ["Auditor", "An outside business that checks, on a schedule, that points created match verified work, and that the code does what the charter says.", "/app/forms/standing.html?kind=Auditor"],
    ["Course maker", "Builds the course and test each role needs before someone can take it on. Must know the job well first.", "/app/forms/course.html"],
    ["Filings", "Keeps the Dandelions DAO LLC in good standing: registered agent, state filings and taxes.", "/app/forms/standing.html?kind=Filings"]
  ];
  function card(x) {
    return '<div class="card proj"><b>' + esc(x[0]) + '</b><p class="small" hidden>' + esc(x[1]) + "</p>" +
      '<div class="row" style="margin-top:10px"><button class="btn small ghost" type="button" data-desc="1" aria-expanded="false">Description</button><a class="btn small" href="' + esc(x[2]) + '">Start this project</a></div></div>';
  }


  // ---- Static parts ----
  $("flow").innerHTML = FLOW.map(function (f) { return "<li><b>" + esc(f[0]) + "</b><span>" + esc(f[1]) + "</span></li>"; }).join("");
  var LOCK = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="8" rx="1.5" fill="currentColor"/><path d="M5 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
  var CATS = [
    ["dandelions", "Dandelions: build and maintain", "Opens first, when a county reaches its starting numbers"],
    ["", "Education", "Unlocks at 1 point a month pledged per resident"],
    ["", "Automation", "Unlocks at 2 points a month pledged per resident"],
    ["", "Health and care", "Unlocks at 3 points a month pledged per resident"],
    ["", "Agriculture", "Unlocks at 4 points a month pledged per resident"],
    ["", "Infrastructure", "Unlocks at 5 points a month pledged per resident"],
    ["", "Environmental cleanup and planet care", "Unlocks at 7 points a month pledged per resident"],
    ["", "Research and development", "Unlocks at 10 points a month pledged per resident"]
  ];
  $("cats").innerHTML = CATS.map(function (c, i) {
    var inner = '<span class="n">' + (i + 1) + "</span><b>" + esc(c[1]) + "</b>" +
      (c[0] ? '<span class="chip sun">Opens first</span>' : '<span class="lock">' + LOCK + " Locked</span>") + '<span class="sub">' + esc(c[2]) + "</span>";
    return c[0] ? '<a class="cat open" href="#' + c[0] + '">' + inner + "</a>" : '<div class="cat">' + inner + "</div>";
  }).join("");

  var PROJ = {
    spread: { title: "Spread the word", sub: "Online or in person",
      desc: "Bring new members and local businesses to Dandelions, any honest way you like.",
      outcome: "New ID-checked members who pledge at least 100 points a month, and verified local businesses that pledge at least 500.",
      items: [["Spread the word", "Posts, videos, articles, local news, ads or a sign-up table. You choose where and how. Each visit and sign-up is tracked by your own share link. Price: 0.1 point per site visit, 10 points per ID-checked member who pledges 100 or more, and 50 points per verified business that pledges 500 or more. Tallied and paid weekly.", "/app/forms/spread.html"]] },
    organizer: { title: "Community organizer", sub: "In person",
      desc: "Be the boots on the ground in your community. Help local businesses use and accept more points, and bring people together.",
      outcome: "Local businesses spend the points they take in and raise their pledges, and Dandelions is visible in town.",
      items: [
        ["Meetup", "A small, regular get-together where members and local business owners meet, talk and find out where points can be used. Coffee, a walk, a game night, a work session: whatever brings people back. Price: 5 points per member who checks in, paid at the end of each meetup.", "/app/forms/organizer.html?kind=Meetup"],
        ["Event", "A bigger one-time gathering, or a booth at someone else's, like a farmers market, fair, food truck night or college event. You front the costs, like a promoter. Price: 5 points per member who checks in, paid at the end.", "/app/forms/organizer.html?kind=Event"],
        ["Business outreach", "Check in with local businesses that accept points, in person when you can. Help them find places to spend more, like vendors, employees and other local businesses. Be helpful, not pushy. No cold calls. Price: 25 points per verified meeting, paid weekly, plus 5 points for every 100 a month a business adds to its pledge.", "/app/forms/organizer.html?kind=Business%20outreach"]
      ] },
    site: { title: "Dandelions site, tools, admin", sub: "Online, plus the roles that keep it running",
      desc: "Build and run what everyone uses: the site, data, guides and artwork, plus the roles that keep Dandelions fair and running without a boss.",
      outcome: "A site and tools that work well for members and businesses, and a network that runs itself.",
      items: [], roles: true }
  };
  $("plist").innerHTML = Object.keys(PROJ).map(function (k) {
    var p = PROJ[k];
    return '<a class="cat open pcard" href="#dandelions/' + k + '"><b>' + esc(p.title) + '</b><span class="go" aria-hidden="true">›</span><span class="sub">' + esc(p.sub) + "</span></a>";
  }).join("");
  function drawProj(k) {
    var p = PROJ[k];
    $("pj-title").textContent = p.title; $("pj-desc").textContent = p.desc; $("pj-outcome").textContent = p.outcome;
    $("pj-list").innerHTML = p.items.map(card).join("");
    $("pj-avail").hidden = !p.items.length;
    $("positions").innerHTML = p.roles ? ROLES.map(card).join("") : "";
    $("pj-roles").hidden = !p.roles;
  }
  $("v-proj").addEventListener("click", function (e) {
    var b = e.target.closest("[data-desc]"); if (!b) return;
    var t = b.closest(".proj").querySelector("p"), open = t.hidden;
    t.hidden = !open; b.setAttribute("aria-expanded", String(open));
  });

  function route() {
    var h = location.hash, m = h.match(/^#dandelions\/(\w+)$/), pk = m && PROJ[m[1]] ? m[1] : "";
    $("v-main").hidden = h === "#dandelions" || !!pk;
    $("v-dandelions").hidden = h !== "#dandelions";
    $("v-proj").hidden = !pk;
    if (pk) drawProj(pk);
    if ($("v-main").hidden || route.ran) window.scrollTo(0, 0);
    route.ran = true;
  }
  window.addEventListener("hashchange", route);
  route();

  function box(label, value, goal) {
    return '<div class="wbox"><span class="small muted">' + esc(label) + '</span><b>' + esc(value) + "</b>" + (goal ? '<span class="small muted">' + esc(goal) + "</span>" : "") + "</div>";
  }
  function drawGates(county, status, bizCounts) {
    var G = [
      ["Now", "The directory, Talk and Rai are open."],
      ["0.1% of people and businesses agree to use points", "Points open, and Dandelions projects start. The other categories unlock as pledges grow."],
      ["Points available each month", "Worked out from 25% of personal pledges plus 50% of business pledges. Each new pledge adds more."]
    ];
    $("grow").innerHTML = G.map(function (g) { return "<li><b>" + esc(g[0]) + '</b><span class="muted small">' + esc(g[1]) + "</span></li>"; }).join("");
    if (!county) { $("wboxes").hidden = true; return; }
    var st = status || {}, people = Math.max(100, Math.ceil(county[2] * 0.001));
    var est = bizCounts && bizCounts[county.fips], bizNeed = est ? Math.max(5, Math.ceil(est * 0.001)) : 0;
    $("wboxes").innerHTML =
      box("Sign-ups (seeds)", fmt(st.signups || 0), "") +
      box("People pledged", fmt(st.person_pledgers || 0), "Goal " + fmt(people)) +
      box("Businesses pledged", fmt(st.businesses_pledged || 0), bizNeed ? "Goal " + fmt(bizNeed) : "") +
      box("Available points per month", fmt(st.available_now || 0), "");
    $("wboxes").hidden = false;
  }

  var db = null;
  drawGates(null, null);
  if (!window.supabase) return;
  db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
  db.auth.getSession().then(function (res) {
    var session = res.data && res.data.session;
    if (!session) return;
    try { localStorage.removeItem("dandelions_return"); } catch (e) {}
    var user = session.user;
    Promise.all([
      db.from("members").select("county_fips").eq("id", user.id).maybeSingle(),
      fetch("/data/counties.json").then(function (r) { return r.json(); }).catch(function () { return {}; }),
      fetch("/data/rai/county-businesses.json").then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; })
    ]).then(function (out) {
      var fips = out[0].data && out[0].data.county_fips, county = fips && out[1][fips], bizCounts = (out[2] && out[2].counts) || {};
      if (county) county.fips = fips;
      if (!county) return;
      $("gates-where").textContent = "Numbers for " + county[0] + ", " + county[1] + ".";
      $("gates-where").hidden = false;
      db.rpc("work_county_status", { p_county: fips }).then(function (r) {
        var s = r.data || {};
        drawGates(county, s, bizCounts);
      });
    });
  });
})();
