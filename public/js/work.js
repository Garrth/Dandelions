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

  var OPENS = {
    early: ["Starts early", "sun"],
    work: ["When Work starts", ""],
    chain: ["Later", ""],
    trust: ["Trusted people first", ""]
  };
  var GROUPS = [
    ["Growing it", [
      ["organizer", "Community organizer", "Signs up businesses, helps owners claim their listing, and runs meetups and events.", "early"],
      ["marketer", "Marketer", "Spreads the word on social media, local news, radio and podcasts. Paid posts always say they're paid.", "early"]]],
    ["Checking the work", [
      ["checker", "Checker", "Reviews project plans and checks finished milestones, picked at random. Paid the same for yes or no.", "work"],
      ["panelist", "Dispute panelist", "Sits on a random panel of 5 that settles a disagreement about a check.", "work"],
      ["analyst", "Data analyst", "Reads Rai's numbers and writes up what should change, for members to vote on.", "early"]]],
    ["Keeping it running", [
      ["moderator", "Talk moderator", "Keeps Talk kind and useful. Wears a badge so everyone knows.", "early"],
      ["help", "Member help", "Answers the questions Rai can't, and sorts out wrong numbers and listing reports.", "early"],
      ["operator", "Service operator", "A business that runs one piece of the system, like hosting, ID checks or the directory.", "chain"],
      ["security", "Site security", "Watches for attacks, checks who has access, and fixes weak spots.", "trust"]]],
    ["Improving it", [
      ["tester", "Tester", "Tries each change on a real phone before it goes live, and reports what breaks.", "early"],
      ["course", "Course maker", "Writes the how-to and short test for each position, and the help videos.", "early"],
      ["reviewer", "Code reviewer", "Reads every change to the site's code before it goes live.", "trust"],
      ["maintainer", "Site maintainer", "Puts reviewed changes live and keeps the site running.", "trust"]]],
    ["Guarding the rules", [
      ["signer", "Signer", "Picked at random to co-sign anything that creates points or changes the rules on the ledger.", "chain"],
      ["keeper", "Keeper", "Signs off on charter changes after a vote, and can pause something to stop harm. Never creates points.", "trust"]]]
  ];

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
      items: [["Spread the word", "Posts, videos, articles, local news, ads or a sign-up table. You choose where and how. Each visit and sign-up is tracked by your own share link. Price: 0.1 point per site visit, 10 points per ID-checked member who pledges 100 or more, and 50 points per verified business that pledges 500 or more. Tallied and paid weekly."]] },
    organizer: { title: "Community organizer", sub: "In person",
      desc: "Be the boots on the ground in your community. Help local businesses use and accept more points, and bring people together.",
      outcome: "Local businesses spend the points they take in and raise their pledges, and Dandelions is visible in town.",
      items: [
        ["Meetup", "A small, regular get-together where members and local business owners meet, talk and find out where points can be used. Coffee, a walk, a game night, a work session: whatever brings people back. Price: 5 points per member who checks in, paid at the end of each meetup."],
        ["Event", "A bigger one-time gathering, or a booth at someone else's, like a farmers market, fair, food truck night or college event. You front the costs, like a promoter. Price: 5 points per member who checks in, paid at the end."],
        ["Business outreach", "Check in with local businesses that accept points, in person when you can. Help them find places to spend more, like vendors, employees and other local businesses. Be helpful, not pushy. No cold calls. Price: 25 points per verified meeting, paid weekly, plus 5 points for every 100 a month a business adds to its pledge."]
      ] },
    site: { title: "Dandelions site, tools, admin", sub: "Online, plus the roles that keep it running",
      desc: "Build and run what everyone uses: the site, data, guides and artwork, plus the roles that keep Dandelions fair and running without a boss.",
      outcome: "A site and tools that work well for members and businesses, and a network that runs itself.",
      items: [["Site and tools", "Design, code, writing, data, guides and artwork. Paid by milestone at set prices."]], roles: true }
  };
  $("plist").innerHTML = Object.keys(PROJ).map(function (k) {
    var p = PROJ[k];
    return '<a class="cat open pcard" href="#dandelions/' + k + '"><b>' + esc(p.title) + '</b><span class="go" aria-hidden="true">›</span><span class="sub">' + esc(p.sub) + "</span></a>";
  }).join("");
  function drawProj(k) {
    var p = PROJ[k];
    $("pj-title").textContent = p.title; $("pj-desc").textContent = p.desc; $("pj-outcome").textContent = p.outcome;
    $("pj-list").innerHTML = p.items.map(function (x) {
      return '<div class="card proj"><b>' + esc(x[0]) + '</b><p class="small" hidden>' + esc(x[1]) + "</p>" +
        '<div class="row" style="margin-top:10px"><button class="btn small ghost" type="button" data-desc="1" aria-expanded="false">Description</button><button class="btn small" type="button" disabled>Start this project</button><span class="small muted">Coming soon</span></div></div>';
    }).join("");
    $("pj-roles").hidden = !p.roles;
  }
  $("pj-list").addEventListener("click", function (e) {
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
      ["Now", "The directory, Talk and Rai are open. You can line up for positions, and a few can start early, unpaid."],
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

  // ---- Positions and line-up ----
  var mine = {}, counts = {}, signedIn = false, user = null, db = null;
  function drawPositions() {
    $("positions").innerHTML = '<p class="small muted legend">' +
      '<span class="chip sun">Starts early</span> can begin before Work starts, unpaid.</p>' +
      (signedIn ? "" : '<div class="card signin"><p>Sign in to line up for the positions you want.</p><a class="btn small" href="/app/login.html" data-signin="1" style="margin-top:10px">Sign in</a></div>') +
      GROUPS.map(function (g) {
        return '<details class="card pgroup"><summary>' + esc(g[0]) + ' <span class="small muted">' + g[1].length + ' roles</span></summary><div class="stack" style="margin-top:10px">' + g[1].map(function (p) {
          var o = OPENS[p[3]], on = !!mine[p[0]];
          var btn = signedIn
            ? '<button class="btn small ' + (on ? "" : "ghost") + '" type="button" data-pos="' + p[0] + '" aria-pressed="' + on + '">' + (on ? "Lined up ✓" : "Line up") + "</button>"
            : "";
          return '<div class="card pos"><div class="spread"><b>' + esc(p[1]) + '</b><span class="chip ' + o[1] + '">' + esc(o[0]) + "</span></div>" +
            '<p class="small">' + esc(p[2]) + "</p>" + (signedIn ? '<div class="spread pos-foot">' + btn +
            "</div>" : "") + "</div>";
        }).join("") + "</div></details>";
      }).join("");
    $("positions").querySelectorAll("[data-signin]").forEach(function (a) {
      a.addEventListener("click", function () { try { localStorage.setItem("dandelions_return", "/app/work.html"); } catch (e) {} });
    });
    $("positions").querySelectorAll("[data-pos]").forEach(function (b) {
      b.addEventListener("click", function () { toggle(b.getAttribute("data-pos"), b); });
    });
  }
  function toggle(pos, b) {
    b.disabled = true;
    var on = !!mine[pos];
    var q = on
      ? db.from("work_lineup").delete().eq("member_id", user.id).eq("position", pos)
      : db.from("work_lineup").insert({ member_id: user.id, position: pos });
    q.then(function (r) {
      b.disabled = false;
      if (r.error && !/duplicate/i.test(r.error.message || "")) {
        toast(/members/.test(r.error.message || "") ? "Pledge first, then you can line up." : "That didn't save. Please try again.");
        return;
      }
      if (on) { delete mine[pos]; counts[pos] = Math.max(0, (counts[pos] || 1) - 1); toast("Taken off the line-up"); }
      else { mine[pos] = true; counts[pos] = (counts[pos] || 0) + 1; toast("You're lined up."); }
      drawPositions();
    });
  }

  drawGates(null, null);
  drawPositions();
  if (!window.supabase) return;
  db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
  db.auth.getSession().then(function (res) {
    var session = res.data && res.data.session;
    if (!session) return;
    try { localStorage.removeItem("dandelions_return"); } catch (e) {}
    user = session.user; signedIn = true;
    Promise.all([
      db.from("members").select("county_fips").eq("id", user.id).maybeSingle(),
      db.from("work_lineup").select("position").eq("member_id", user.id),
      fetch("/data/counties.json").then(function (r) { return r.json(); }).catch(function () { return {}; }),
      fetch("/data/rai/county-businesses.json").then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; })
    ]).then(function (out) {
      (out[1].data || []).forEach(function (r) { mine[r.position] = true; });
      var fips = out[0].data && out[0].data.county_fips, county = fips && out[2][fips], bizCounts = (out[3] && out[3].counts) || {};
      if (county) county.fips = fips;
      drawPositions();
      if (!county) return;
      $("gates-where").textContent = "Numbers for " + county[0] + ", " + county[1] + ".";
      $("gates-where").hidden = false;
      db.rpc("work_county_status", { p_county: fips }).then(function (r) {
        var s = r.data || {};
        counts = s.lineup || {};
        drawGates(county, s, bizCounts);
        drawPositions();
      });
    });
  });
})();
