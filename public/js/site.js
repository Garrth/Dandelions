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

  // Floating seeds in the hero
  var seeds = $("seeds");
  var seedSvg = '<svg viewBox="0 0 22 30"><path d="M11 29 L11 12" stroke="currentColor" stroke-width="1.2"/><ellipse cx="11" cy="27" rx="2" ry="3" fill="currentColor"/><g stroke="currentColor" stroke-width="1"><path d="M11 12 l-7 -7"/><path d="M11 12 l7 -7"/><path d="M11 12 l0 -10"/><path d="M11 12 l-10 -1"/><path d="M11 12 l10 -1"/></g></svg>';
  for (var i = 0; i < 9; i++) {
    var s = document.createElement("div");
    s.className = "seed";
    s.style.color = "var(--muted)";
    s.style.left = (10 + Math.random() * 85) + "%";
    s.style.top = (35 + Math.random() * 65) + "%";
    s.style.animationDelay = (-Math.random() * 14) + "s";
    s.style.animationDuration = (11 + Math.random() * 8) + "s";
    s.innerHTML = seedSvg;
    seeds.appendChild(s);
  }

  // Total pledges in the hero, shown once there's a meaningful number
  if (db) {
    db.rpc("pledge_total").then(function (res) {
      if (!res.error && res.data >= 25) {
        $("hero-count").textContent = fmt(res.data);
        $("hero-count-wrap").hidden = false;
      }
    });
  }

  // ---------- The to-do list ----------
  var FALLBACK_ITEMS = [
    ["clean-energy", "Run everything on clean energy", "Sun, wind, and storage for the whole country"],
    ["power-grid", "Rebuild the power grid", "Modern, reliable, and underground"],
    ["soil", "Grow food that builds the soil back", "No chemical fertilizer, no worn-out fields"],
    ["water", "Make fresh water where it's running out", "Enough clean power to desalinate for dry places"],
    ["trees", "Plant a lot more trees", "Shade, clean air, and healthier land"],
    ["ocean", "Clean up the ocean", "And let fish come back by not overfishing"],
    ["zero-waste", "Get to zero waste", "Make it, use it, reuse it"],
    ["old-messes", "Clean up our old messes", "Polluted land and water, fixed for good"],
    ["healthcare", "Healthcare for everyone", "Including dental, vision, and mental health"],
    ["job-training", "Paid job training", "Learn the skills the work needs, and get paid to learn"],
    ["schools", "Better schools", "For kids and for anyone going back"],
    ["getting-around", "Better ways to get around", "Faster, more convenient, and clean"],
    ["automation", "Build the machines for automation", "And let them do the heavy lifting"]
  ];
  var picks = store("dandelions_picks") || [];
  var list = $("todo");
  var check = '<svg viewBox="0 0 24 24" fill="none" stroke="#ffd21a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6.5"/></svg>';

  function renderList(items, counts) {
    list.innerHTML = "";
    $("total").textContent = items.length;
    items.forEach(function (it) {
      var key = it[0], base = counts[key] || 0;
      var li = document.createElement("li");
      var b = document.createElement("button");
      b.type = "button";
      b.id = "todo-" + key;
      b.innerHTML = '<span class="box">' + check + '</span><span class="txt"><b></b><span></span></span><span class="n"></span>';
      b.querySelector(".txt b").textContent = it[1];
      b.querySelector(".txt span").textContent = it[2];
      var n = b.querySelector(".n");
      function paint() {
        var on = picks.indexOf(key) !== -1;
        b.setAttribute("aria-pressed", on ? "true" : "false");
        n.textContent = base > 0 ? fmt(base) + " care" : "";
      }
      paint();
      b.addEventListener("click", function () {
        var at = picks.indexOf(key);
        if (at === -1) picks.push(key); else picks.splice(at, 1);
        store("dandelions_picks", picks);
        paint();
        $("picked").textContent = picks.length;
      });
      li.appendChild(b);
      list.appendChild(li);
    });
    $("picked").textContent = picks.filter(function (k) { return items.some(function (it) { return it[0] === k; }); }).length;
  }

  renderList(FALLBACK_ITEMS, {});
  if (db) {
    Promise.all([
      db.from("todo_items").select("key,title,detail").order("sort"),
      db.rpc("todo_counts")
    ]).then(function (res) {
      if (res[0].error || !res[0].data || !res[0].data.length) return;
      var counts = {};
      (res[1].data || []).forEach(function (r) { counts[r.item_key] = r.picks; });
      renderList(res[0].data.map(function (r) { return [r.key, r.title, r.detail]; }), counts);
    });
  }

  // ---------- Ideas for the list (saved, not shown) ----------
  $("add-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var input = $("add-item"), note = $("add-note"), v = input.value.trim();
    if ($("add-website").value) { input.value = ""; return; }
    if (v.length < 3) { note.textContent = "Add a few more words so we know what you mean."; return; }
    if (!db) { note.textContent = "Couldn't save that right now. Please try again later."; return; }
    db.from("ideas").insert({ idea: v }).then(function (res) {
      if (res.error) { note.textContent = "Couldn't save that right now. Please try again in a bit."; return; }
      input.value = "";
      note.textContent = "Thanks, we saved “" + v + "”. Got another one?";
    });
  });

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
    $("area-chip").textContent = STAGES[st];
    $("area-where").textContent = c[0] + ", " + c[1];
    $("area-stat").textContent = fmt(p) + (p === 1 ? " Dandelion" : " Dandelions") + " out of " + fmt(pop) + " people (" + (p > 0 && pct < 0.0001 ? "under 0.01" : (pct * 100).toFixed(2)) + "%)";
    var next = "";
    if (p === 0) next = "Be the first. One pledge plants a seed in " + c[0] + ".";
    else {
      for (var g = 0; g < GOALS.length; g++) {
        var need = Math.ceil(pop * GOALS[g][0]);
        if (p < need) { next = fmt(need - p) + " more pledges to reach " + GOALS[g][1] + " (" + fmt(need) + " total)."; break; }
      }
      if (!next) next = c[0] + " is a Puffball. Time to help the counties next door.";
    }
    $("area-next").textContent = next;
    var m = $("area-meter");
    m.style.width = "0";
    requestAnimationFrame(function () { m.style.width = Math.min(100, pct * 1000) + "%"; });
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
    $("area-chip").textContent = "Your county";
    $("area-stat").textContent = "Tap the map or enter your ZIP code above.";
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
      $("area-next").textContent = "We couldn't find a county for that ZIP code. Try tapping your county on the map.";
      return null;
    });
  }

  $("area-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var z = $("area-zip").value.trim();
    if (!/^\d{5}$/.test(z)) { $("area-next").textContent = "Enter a 5 digit ZIP code."; return; }
    findZip(z).then(function (f) { if (f) $("area-card").scrollIntoView({ behavior: "smooth", block: "nearest" }); });
  });

  // ---------- Pledge ----------
  var form = $("pledge-form"), msg = $("p-msg"), go = form.querySelector(".go");

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var email = $("p-email").value.trim();
    var zip = $("p-zip").value.trim();
    if ($("p-website").value) { form.hidden = true; $("sent").hidden = false; return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg.textContent = "Enter a valid email address."; return; }
    if (!/^\d{5}$/.test(zip)) { msg.textContent = "Enter a 5 digit ZIP code."; return; }
    if (!$("p-age").checked) { msg.textContent = "You need to be 18 or older to pledge."; return; }
    if (!$("p-agree").checked) { msg.textContent = "Check the pledge box to continue."; return; }
    if (!db) { msg.textContent = "Pledges aren't working right now. Please try again later."; return; }

    go.disabled = true;
    msg.textContent = "Sending...";
    store("dandelions_zip", zip);

    loadZips().catch(function () { return {}; }).then(function (zips) {
      return db.auth.signInWithOtp({
        email: email,
        options: {
          emailRedirectTo: location.origin + "/welcome.html",
          data: {
            zip: zip,
            county_fips: zips[zip] || null,
            age_confirmed: true,
            referred_by: store("dandelions_ref"),
            picks: picks
          }
        }
      });
    }).then(function (res) {
      go.disabled = false;
      if (res.error) {
        msg.textContent = res.error.status === 429
          ? "Too many tries right now. Please wait a few minutes and try again."
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
