// The signed-in home: the county map, the job counts and where to go next.
(function () {
  var cfg = window.DANDELIONS_CONFIG || {};
  function $(id) { return document.getElementById(id); }
  function fmt(n) { return Number(n).toLocaleString("en-US"); }
  function toast(text) {
    var t = document.createElement("div");
    t.className = "toast"; t.textContent = text;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }
  if (new URLSearchParams(location.hash.slice(1)).get("error")) {
    $("loading").textContent = "That link didn't work. It may have expired or been used already. ";
    var a = document.createElement("a"); a.href = "/app/login.html"; a.textContent = "Get a new one";
    $("loading").appendChild(a);
    return;
  }
  if (!window.supabase) { $("loading").textContent = "Something didn't load. Please refresh the page."; return; }
  var db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
  var STAGES = ["None yet", "Seed", "Sprout", "Bloom", "Puffball"];
  var counties = {}, pledges = {}, paths = {}, selected = null, mine = null, link = "";

  function stageOf(fips) {
    var c = counties[fips], p = pledges[fips] || 0;
    if (!c || p === 0) return 0;
    var pct = p / c[2];
    return pct < 0.01 ? 1 : pct < 0.05 ? 2 : pct < 0.10 ? 3 : 4;
  }
  function showCounty(fips) {
    var c = counties[fips];
    if (!c) return;
    if (selected && paths[selected]) paths[selected].classList.remove("sel");
    selected = fips;
    if (paths[fips]) { paths[fips].classList.add("sel"); paths[fips].parentNode.appendChild(paths[fips]); }
    var p = pledges[fips] || 0;
    $("picked").textContent = c[0] + ", " + c[1] + ": " + STAGES[stageOf(fips)] + ", " + fmt(p) + (p === 1 ? " pledge" : " pledges");
  }
  function ringPath(ring) {
    var d = "";
    for (var i = 0; i < ring.length; i++) d += (i ? "L" : "M") + ring[i][0].toFixed(1) + "," + ring[i][1].toFixed(1);
    return d + "Z";
  }
  function geomPath(g) {
    if (!g) return "";
    if (g.type === "MultiLineString") return g.coordinates.map(function (l) { return l.map(function (p, i) { return (i ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(""); }).join("");
    var polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
    return polys.map(function (p) { return p.map(ringPath).join(""); }).join("");
  }
  function getJSON(url) { return fetch(url).then(function (r) { if (!r.ok) throw new Error(url); return r.json(); }); }

  function drawMap(us) {
    var svg = $("map"), ns = "http://www.w3.org/2000/svg";
    svg.innerHTML = "";
    var g = document.createElementNS(ns, "g");
    topojson.feature(us, us.objects.counties).features.forEach(function (f) {
      var id = f.id, p = document.createElementNS(ns, "path");
      p.setAttribute("d", geomPath(f.geometry));
      p.setAttribute("class", "c");
      p.style.fill = "var(--s" + stageOf(id) + ")";
      p.addEventListener("click", function () { showCounty(id); });
      paths[id] = p; g.appendChild(p);
    });
    svg.appendChild(g);
    var b = document.createElementNS(ns, "path");
    b.setAttribute("class", "st");
    b.setAttribute("d", geomPath(topojson.mesh(us, us.objects.states, function (a, c) { return a !== c; })));
    svg.appendChild(b);
    if (mine) showCounty(mine);
  }

  db.auth.getSession().then(function (res) {
    var session = res.data && res.data.session;
    if (!session) { location.replace("/app/login.html"); return; }
    var user = session.user;
    Promise.all([
      db.from("members").select("zip,county_fips,referral_code").eq("id", user.id).maybeSingle(),
      db.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
      db.from("id_checks").select("status").eq("member_id", user.id).maybeSingle(),
      getJSON("/data/counties.json").catch(function () { return {}; }),
      db.rpc("county_counts"),
      db.rpc("pledge_total")
    ]).then(function (out) {
      var m = out[0].data || {}, name = out[1].data && out[1].data.display_name;
      counties = out[3] || {};
      (out[4].data || []).forEach(function (r) { pledges[r.county_fips] = Number(r.pledges); });
      mine = m.county_fips || null;
      var c = mine && counties[mine];
      $("where").textContent = (name ? "Hi, " + name.split(" ")[0] + " · " : "") + (c ? c[0] + ", " + c[1] : m.zip ? "ZIP " + m.zip : "Member");
      var total = out[5].data;
      $("total").innerHTML = total != null ? "<b>" + fmt(total) + "</b> pledged nationwide" : "";
      if (!out[2].data || out[2].data.status !== "passed") $("profile-hint").textContent = "Next: check your ID";
      link = location.origin + "/?ref=" + (m.referral_code || "");
      $("loading").hidden = true; $("app").hidden = false;
      getJSON("/data/us-counties.json").then(drawMap).catch(function () {
        $("map").innerHTML = '<text x="480" y="310" text-anchor="middle" fill="currentColor" font-size="20">The map couldn\'t load. Try refreshing.</text>';
      });
    });
  });

  $("share").addEventListener("click", function () {
    if (!link) return;
    if (navigator.share) { navigator.share({ title: "Dandelions", text: "There's plenty to do. Join me.", url: link }).catch(function () {}); return; }
    (navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject()).then(function () { toast("Link copied"); }, function () { $("share-hint").textContent = link; });
  });
  $("signout").addEventListener("click", function () { db.auth.signOut().then(function () { location.href = "/"; }); });
})();
