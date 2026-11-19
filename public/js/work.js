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
    ["A need is spotted", "From Rai's numbers, an idea in Talk, or a position that needs filling."],
    ["Members set priorities", "People talk it through. Small things go ahead unless enough people object. Bigger ones get a vote."],
    ["Work opens", "A kind of work opens in the county, inside the points local businesses agreed to accept that month."],
    ["Businesses bid", "Each bid lists milestones and a price inside Rai's fair range. A public formula of price and track record picks the winner, not a person."],
    ["A checker reviews the plan", "Picked at random, with no ties to the business."],
    ["Points are set aside", "They're held until the work checks out, so nobody gets paid for work that isn't done."],
    ["The work gets done and checked", "The business shows each milestone with photos, counts or a link. Random checkers confirm it. A disagreement goes to a random panel of members."],
    ["Points are paid", "To the business, which pays its own people. Its track record grows, and so does the size of job it can take on."]
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
    work: ["When Work opens", ""],
    chain: ["With the points system", ""],
    trust: ["Trusted people first", ""]
  };
  var GROUPS = [
    ["Doing the work", [
      ["owner", "Project owner", "A local business that bids on a project, does it or brings in help, and shows each milestone.", "work"],
      ["crew", "Crew", "Helps a business with its project. The business pays you, not Dandelions.", "work"],
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
  $("types").innerHTML = TYPES.map(function (t, i) {
    return '<details class="card type"><summary><b>' + esc(t.name) + '</b><span class="muted small">' + esc(t.note) + "</span></summary>" +
      '<div class="sample"><div class="eyebrow">Sample project</div><h3>' + esc(t.sample) + "</h3><p>" + esc(t.what) + "</p>" +
      '<ol class="ms-list">' + t.steps.map(function (s) { return "<li>" + esc(s[0]) + '<span class="muted small">' + esc(s[1]) + "</span></li>"; }).join("") + "</ol>" +
      '<p class="muted small">Every kind of work will have a template like this, so a business can copy it and bid in a few minutes.</p></div></details>';
  }).join("") + '<p class="muted small">Next, as members vote them in: caregiving, social events and training. Later: home upkeep and building.</p>';

  function gate(n, name, text, status, extra) {
    return '<div class="card gate"><div class="spread"><b>' + n + ". " + esc(name) + '</b><span class="chip">' + esc(status) + "</span></div><p class=\"small muted\">" + esc(text) + "</p>" + (extra || "") + "</div>";
  }
  function drawGates(county, status, lined) {
    var g3 = county ? (lined ? fmt(lined) + " lined up near you" : "Lining up now") : "Lining up now";
    var g4 = "Sign in to see", bar = "";
    if (county) {
      var target = Math.ceil(county[2] * 0.01), have = status && status.id_checked;
      g4 = have != null ? fmt(have) + " of " + fmt(target) : "Under 10 so far";
      var pct = have ? Math.min(100, have / target * 100) : 0;
      bar = '<div class="bar" style="margin-top:8px"><span style="width:' + pct.toFixed(1) + '%"></span></div><p class="small muted" style="margin-top:4px">' +
        esc(county[0]) + " needs " + fmt(target) + " people to pass the ID check.</p>";
    }
    $("gates").innerHTML =
      gate(1, "Legal review", "A lawyer who knows this area looks at points, pay rules and how points can become dollars. This comes after fundraising and before any point is paid.", "Not started") +
      gate(2, "The points system", "The ledger, a daily limit on new points, and the hold that keeps points set aside until checkers release them.", "Being designed") +
      gate(3, "People ready", "Enough trained checkers, moderators, helpers and code reviewers in each county that opens.", g3) +
      gate(4, county ? county[0] + " at 1%" : "Your county at 1%", "1% of the people in the county pass the ID check, and local businesses agree to accept points.", g4, bar);
  }

  // ---- Positions and line-up ----
  var mine = {}, counts = {}, signedIn = false, user = null, db = null;
  function drawPositions() {
    $("positions").innerHTML = '<p class="small muted legend">' +
      '<span class="chip sun">Starts early</span> can begin before Work opens, unpaid.</p>' +
      (signedIn ? "" : '<div class="card signin"><p>Sign in to line up for the positions you want.</p><a class="btn small" href="/app/login.html" data-signin="1" style="margin-top:10px">Sign in</a></div>') +
      GROUPS.map(function (g) {
        return '<h3 class="group">' + esc(g[0]) + '</h3><div class="stack">' + g[1].map(function (p) {
          var o = OPENS[p[3]], on = !!mine[p[0]], c = counts[p[0]] || 0;
          var btn = signedIn
            ? '<button class="btn small ' + (on ? "" : "ghost") + '" type="button" data-pos="' + p[0] + '" aria-pressed="' + on + '">' + (on ? "Lined up ✓" : "Line up") + "</button>"
            : "";
          return '<div class="card pos"><div class="spread"><b>' + esc(p[1]) + '</b><span class="chip ' + o[1] + '">' + esc(o[0]) + "</span></div>" +
            '<p class="small">' + esc(p[2]) + "</p>" + (signedIn ? '<div class="spread pos-foot">' + btn +
            '<span class="small muted">' + (c ? fmt(c) + " lined up near you" : "") + "</span></div>" : "") + "</div>";
        }).join("") + "</div>";
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

  drawGates(null, null, 0);
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
      fetch("/data/counties.json").then(function (r) { return r.json(); }).catch(function () { return {}; })
    ]).then(function (out) {
      (out[1].data || []).forEach(function (r) { mine[r.position] = true; });
      var fips = out[0].data && out[0].data.county_fips, county = fips && out[2][fips];
      drawPositions();
      if (!county) return;
      $("gates-where").textContent = "For " + county[0] + ", " + county[1] + ". All four have to be true before the first point is paid there.";
      db.rpc("work_county_status", { p_county: fips }).then(function (r) {
        var s = r.data || {};
        counts = s.lineup || {};
        drawGates(county, s, s.people || 0);
        drawPositions();
      });
    });
  });
})();
