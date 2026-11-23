(function () {
  var cfg = window.DANDELIONS_CONFIG || {};
  var db = window.supabase ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey) : null;

  function $(id) { return document.getElementById(id); }
  function fmt(n) { return Number(n).toLocaleString("en-US"); }
  function store(key, value) {
    try {
      if (value === undefined) return JSON.parse(localStorage.getItem(key) || "null");
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { return null; }
  }
  function getJSON(url) {
    return fetch(url).then(function (r) { if (!r.ok) throw new Error(url); return r.json(); });
  }

  // Remember a referral code from a link like dandelions.lol/?ref=abc123
  var ref = new URLSearchParams(location.search).get("ref");
  if (ref && /^[a-z0-9]{4,16}$/i.test(ref)) store("dandelions_ref", ref.toLowerCase());

  // Remember where someone first came from, like dandelions.lol/?src=tiktok
  var src = (new URLSearchParams(location.search).get("src") || "").toLowerCase();
  if (/^[a-z0-9_-]{1,40}$/.test(src) && !store("dandelions_src")) store("dandelions_src", src);

  // Total pledges in the hero, shown once there's a meaningful number
  if (db) {
    db.rpc("pledge_total").then(function (res) {
      if (!res.error && res.data >= 25) {
        $("hero-count").textContent = fmt(res.data);
        $("hero-count-wrap").hidden = false;
      }
    });
  }

  // Picks from the old to-do list, if this browser has any, still go along with the sign-up.
  var picks = store("dandelions_picks") || [];

  // ---------- County map ----------
  var STAGES = ["No pledges yet", "Seed", "Sprout", "Bloom", "Puffball"];
  var GOALS = [[0.01, "Sprout"], [0.05, "Bloom"], [0.10, "Puffball"]];
  var counties = {}, pledges = {}, paths = {}, selected = null;
  var zipMap = null;

  function stageOf(fips) {
    var c = counties[fips], p = pledges[fips] || 0;
    if (!c || p === 0) return 0;
    var pct = p / c[2];
    return pct < 0.01 ? 1 : pct < 0.05 ? 2 : pct < 0.10 ? 3 : 4;
  }

  function showCounty(fips) {
    var c = counties[fips];
    if (!c) return false;
    var p = pledges[fips] || 0, pop = c[2], st = stageOf(fips), pct = p / pop;
    if (selected && paths[selected]) paths[selected].classList.remove("sel");
    selected = fips;
    if (paths[fips]) { paths[fips].classList.add("sel"); paths[fips].parentNode.appendChild(paths[fips]); }
    $("area-where").textContent = c[0] + ", " + c[1] + ":";
    var next = "";
    if (p === 0) next = "No one yet. Be the first to plant a seed.";
    else {
      next = STAGES[st] + ", " + fmt(p) + (p === 1 ? " Dandelion" : " Dandelions") + " (" + (pct < 0.0001 ? "under 0.01" : (pct * 100).toFixed(2)) + "%).";
      for (var g = 0; g < GOALS.length; g++) {
        var need = Math.ceil(pop * GOALS[g][0]);
        if (p < need) { next += " " + fmt(need - p) + " more to reach " + GOALS[g][1] + "."; break; }
      }
    }
    $("area-stat").textContent = next;
    return true;
  }

  function ringPath(ring) {
    var d = "";
    for (var i = 0; i < ring.length; i++) d += (i ? "L" : "M") + ring[i][0].toFixed(1) + "," + ring[i][1].toFixed(1);
    return d + "Z";
  }
  function geomPath(g) {
    if (!g) return "";
    if (g.type === "MultiLineString") {
      return g.coordinates.map(function (l) { return l.map(function (p, i) { return (i ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(""); }).join("");
    }
    var polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
    return polys.map(function (p) { return p.map(ringPath).join(""); }).join("");
  }

  var countsReady = db
    ? db.rpc("county_counts").then(function (res) { (res.data || []).forEach(function (r) { pledges[r.county_fips] = Number(r.pledges); }); })
    : Promise.resolve();

  Promise.all([getJSON("/data/us-counties.json"), getJSON("/data/counties.json"), countsReady]).then(function (res) {
    var us = res[0];
    counties = res[1];
    var svg = $("map"), ns = "http://www.w3.org/2000/svg";
    svg.innerHTML = "";
    var g = document.createElementNS(ns, "g");
    topojson.feature(us, us.objects.counties).features.forEach(function (f) {
      var id = f.id;
      var p = document.createElementNS(ns, "path");
      p.setAttribute("d", geomPath(f.geometry));
      p.setAttribute("class", "c");
      p.style.fill = "var(--s" + stageOf(id) + ")";
      p.addEventListener("click", function () { showCounty(id); });
      paths[id] = p;
      g.appendChild(p);
    });
    svg.appendChild(g);
    var b = document.createElementNS(ns, "path");
    b.setAttribute("class", "st");
    b.setAttribute("d", geomPath(topojson.mesh(us, us.objects.states, function (a, c) { return a !== c; })));
    svg.appendChild(b);
    var savedZip = store("dandelions_zip");
    if (savedZip) { $("area-zip").value = savedZip; findZip(savedZip); }
  }).catch(function () {
    $("map").innerHTML = '<text x="480" y="310" text-anchor="middle" fill="currentColor" font-size="20">The map couldn\'t load. Try refreshing the page.</text>';
  });

  function loadZips() {
    if (!zipMap) zipMap = getJSON("/data/zip-county.json");
    return zipMap;
  }

  function findZip(zip) {
    return loadZips().then(function (zips) {
      var fips = zips[zip];
      if (fips && showCounty(fips)) return fips;
      $("area-where").textContent = "We couldn't find a county for that ZIP code.";
      $("area-stat").textContent = "Try tapping your county on the map.";
      return null;
    });
  }

  $("area-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var z = $("area-zip").value.trim();
    if (!/^\d{5}$/.test(z)) { $("area-where").textContent = "Enter a 5 digit ZIP code."; $("area-stat").textContent = ""; return; }
    findZip(z);
  });

  // ---------- Pledge ----------
  var form = $("pledge-form"), msg = $("p-msg"), go = form.querySelector(".go");
  var Bot = window.BotCheck, botEl = $("p-bot");
  if (Bot) Bot.mount(botEl);

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var email = $("p-email").value.trim();
    var zip = $("p-zip").value.trim();
    if ($("p-website").value) { form.hidden = true; $("sent").hidden = false; return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg.textContent = "Enter a valid email address."; return; }
    if (!/^\d{5}$/.test(zip)) { msg.textContent = "Enter a 5 digit ZIP code."; return; }
    if (!$("p-age").checked) { msg.textContent = "You need to be 18 or older to sign up."; return; }
    if (!$("p-agree").checked) { msg.textContent = "Check the \u201cI'm in\u201d box to continue."; return; }
    if (!db) { msg.textContent = "Sign-ups aren't working right now. Please try again later."; return; }

    go.disabled = true;
    msg.textContent = "Sending...";
    store("dandelions_zip", zip);

    Promise.all([loadZips().catch(function () { return {}; }), Bot ? Bot.token(botEl) : undefined]).then(function (got) {
      var zips = got[0];
      return db.auth.signInWithOtp({
        email: email,
        options: {
          captchaToken: got[1] || undefined,
          emailRedirectTo: location.origin + "/welcome.html",
          data: {
            zip: zip,
            county_fips: zips[zip] || null,
            age_confirmed: true,
            referred_by: store("dandelions_ref"),
            source: store("dandelions_src"),
            picks: picks
          }
        }
      });
    }).then(function (res) {
      go.disabled = false;
      if (Bot) Bot.reset(botEl);
      if (res.error) {
        if (Bot && Bot.failed(res.error)) { msg.textContent = "We couldn't confirm you're a person. Refresh the page and try again."; return; }
        var wait = (res.error.message || "").match(/after (\d+) seconds/);
        msg.textContent = wait
          ? "We just sent you an email. You can ask for another in " + wait[1] + " seconds. The newest link is the one that works. Already signed up? Use Log in at the top of the page."
          : res.error.status === 429
          ? "Too many emails sent in the last hour. Please try again later."
          : "Something went wrong on our end. Please try again in a bit.";
        return;
      }
      msg.textContent = "";
      form.hidden = true;
      $("sent").hidden = false;
    });
  });

  $("p-again").addEventListener("click", function () {
    $("sent").hidden = true;
    form.hidden = false;
    $("p-email").focus();
  });
})();
