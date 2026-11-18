// Directory screen 1: "What do you need?" Type for a live list of business types, or scroll A to Z.
(function () {
  var D = window.DIR, esc = D.esc;
  function $(id) { return document.getElementById(id); }
  $("homelink").href = D.homeLink(); $("homebrand").href = D.homeLink();

  // Everyday words that point at a heading, like the old "see Physicians" redirects.
  var WORDS = {
    plumber: "plumbing", lawyer: "attorney_or_law_firm", attorney: "attorney_or_law_firm", dentist: "dental_clinic",
    doctor: "doctors_office", physician: "doctors_office", vet: "veterinarian", mechanic: "automotive_repair",
    haircut: "hair_salon", barber: "barber", groceries: "grocery_store", supermarket: "grocery_store", food: "restaurant",
    lunch: "restaurant", dinner: "restaurant", tacos: "mexican_restaurant", taco: "mexican_restaurant", pizza: "pizza_restaurant",
    coffee: "coffee_shop", cleaner: "home_cleaning", maid: "home_cleaning", locksmith: "key_and_locksmith",
    "heating": "hvac_service", "air conditioning": "hvac_service", ac: "hvac_service", taxes: "tax_service",
    movers: "mover", moving: "mover", chiropractor: "chiropractic", massage: "massage_therapy", trees: "tree_service",
    gardener: "landscaping", yard: "landscaping", wine: "winery", hotel: "hotel", gym: "gym", daycare: "child_care_and_day_care",
    roofer: "roofing", electrician: "electrician", painter: "painting", handyman: "handyman", tires: "tire_shop",
    "oil change": "automotive_repair", pharmacy: "pharmacy", groomer: "pet_groomer", nails: "nail_salon",
    novelty: "gift_shop", gifts: "gift_shop", online: "online_store", merch: "customized_merchandise_store"
  };

  var types, pts = [], loc, slugAt = {}, counts = [], token = 0, near = [], nameTimer, nameAsk = 0;

  function countAll() {
    var r = D.radius();
    counts = new Array(types.length).fill(0);
    if (loc.mode === "outside") return;
    for (var i = 0; i < pts.length; i += 3) {
      if (D.miles(loc.lat, loc.lon, pts[i + 1] / 1e4, pts[i + 2] / 1e4) > r) continue;
      for (var t = pts[i]; t >= 0; t = types[t][2]) counts[t]++;
    }
  }
  function link(t) { return "/directory/list.html?t=" + encodeURIComponent(types[t][0]); }
  function sorted() {
    return types.map(function (x, i) { return i; }).filter(function (i) { return counts[i] > 0; })
      .sort(function (a, b) { return types[a][1].localeCompare(types[b][1]); });
  }

  function drawAZ() {
    var list = sorted(), have = {}, html = [], last = "";
    list.forEach(function (i) {
      var L = types[i][1].charAt(0).toUpperCase();
      if (L !== last) { html.push('<h2 class="letterhead" id="L-' + L + '">' + L + "</h2>"); last = L; have[L] = true; }
      html.push('<a class="row" href="' + link(i) + '"><span>' + esc(types[i][1]) + '</span><span class="n">' + counts[i] + "</span></a>");
    });
    $("az").innerHTML = html.join("");
    $("letters").innerHTML = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(function (L) {
      return have[L] ? '<a href="#L-' + L + '">' + L + "</a>" : '<span aria-hidden="true">' + L + "</span>";
    }).join("");
    $("total").textContent = list.length ? list.length.toLocaleString() + " kinds of business within " + D.radius() + " miles, A to Z" :
      "No businesses within " + D.radius() + " miles yet. The directory covers the 9 Bay Area counties so far. Try a bigger distance, or add a business below.";
  }

  function drawMatches() {
    var q = $("q").value.trim().toLowerCase();
    $("browse").hidden = !!q || loc.mode === "outside"; $("matches").hidden = !q || loc.mode === "outside";
    if (!q) return;
    var starts = [], inside = [], seen = {};
    var word = WORDS[q] && slugAt[WORDS[q]];
    if (word !== undefined && counts[word] > 0) { starts.push(word); seen[word] = true; }
    sorted().forEach(function (i) {
      if (seen[i]) return;
      var s = types[i][1].toLowerCase();
      if (s.indexOf(q) === 0) starts.push(i);
      else if ((" " + s).indexOf(" " + q) >= 0) inside.push(i);
    });
    var all = starts.concat(inside).slice(0, 60);
    $("matches").innerHTML = (all.length ? '<h2 class="letterhead">Kinds of business</h2>' : "") + all.map(function (i) {
      return '<a class="row" href="' + link(i) + '"><span>' + esc(types[i][1]) + '</span><span class="n">' + counts[i] + "</span></a>";
    }).join("") + '<div id="bynames"><p class="countline">Looking for businesses by name...</p></div>';
    clearTimeout(nameTimer);
    nameTimer = setTimeout(function () { drawNames(q, all.length); }, 250);
  }

  // Businesses by name, closest first.
  function drawNames(q, kinds) {
    var ask = ++nameAsk;
    D.names(q, loc, D.radius(), near).then(function (list) {
      var el = $("bynames");
      if (ask !== nameAsk || !el) return;
      var more = list.length > 40;
      el.innerHTML = list.length ? '<h2 class="letterhead">Businesses named "' + esc(q) + '"</h2>' + list.slice(0, 40).map(function (x) {
        return '<a class="row" href="' + x.href + '"><span style="min-width:0"><span class="name">' + esc(x.name) + '</span><span class="sub">' +
          esc(types[x.type][1]) + (x.town ? " · " + esc(x.town) : "") + '</span></span><span class="n">' + x.d.toFixed(1) + " mi</span></a>";
      }).join("") + (more ? '<p class="countline">Showing the closest 40. Type more of the name to narrow it down.</p>' : "") :
        '<p class="note">' + (kinds ? "No business by that name within " + D.radius() + " miles." :
          'Nothing matches that within ' + D.radius() + ' miles. Try one word, like "plumber" or "tacos", or part of a business name.') +
        ' Missing a business? <a href="/directory/add.html">Add it</a>.</p>';
    });
  }

  // Outside the open counties: no full directory yet, only the businesses members added there.
  function drawOutside() {
    var box = $("outside");
    box.hidden = loc.mode !== "outside";
    if (box.hidden) return;
    box.innerHTML = '<div class="note"><b>The directory isn\'t open in ' + esc(loc.county) + " yet.</b><br>It covers the 9 Bay Area counties so far. " +
      'Members can add businesses anywhere, and they show here.</div><div id="addedlist"><p class="countline">Loading...</p></div>' +
      '<p class="small" style="margin-top:12px"><a href="#" id="tobay">Look around the Bay Area instead</a></p>';
    $("tobay").addEventListener("click", function (e) {
      e.preventDefault();
      D.region().then(function (reg) {
        var c = reg.counties[0];
        try { localStorage.setItem("dir-loc", JSON.stringify({ lat: c.center[0], lon: c.center[1], label: c.name, mode: "county", fips: c.fips })); } catch (x) {}
        window.location.reload();
      });
    });
    D.addedIn(loc.fips).then(function (rows) {
      var el = $("addedlist");
      if (!el) return;
      el.innerHTML = rows.length ? '<p class="countline">' + rows.length + (rows.length === 1 ? " business" : " businesses") + " added in " + esc(loc.county) + ", A to Z</p>" + rows.map(function (b) {
        return '<a class="row" href="/directory/biz.html?' + D.qs(b.fam, b[0], b.c) + '"><span style="min-width:0"><span class="name">' + esc(b[1]) + '</span><span class="sub">' +
          esc(types[b[2]][1]) + (b[6] ? " · " + esc(b[6]) : "") + "</span></span></a>";
      }).join("") : '<p class="countline">None added in ' + esc(loc.county) + " yet. Yours could be the first.</p>";
    });
  }

  function redraw() { countAll(); drawAZ(); drawMatches(); drawOutside(); }

  // Load the counties within reach of where we're looking, then count.
  function load() {
    var mine = ++token;
    if (loc.mode === "outside") { pts = []; redraw(); return Promise.resolve(); }
    $("total").textContent = "Loading the directory...";
    return D.region().then(function (reg) {
      near = D.near(reg, loc, D.radius());
      return D.points(near);
    }).then(function (p) {
      if (mine !== token) return;
      pts = p;
      redraw();
    }).catch(function () {
      $("total").textContent = "Couldn't load the directory. Please refresh the page.";
    });
  }

  Promise.all([D.types(), D.location()]).then(function (o) {
    types = o[0];
    types.forEach(function (x, n) { slugAt[x[0]] = n; });
    loc = o[1];
    D.locationBar(loc, function (nl) { loc = nl; load(); });
    $("q").addEventListener("input", drawMatches);
    $("q").form && $("q").form.addEventListener("submit", function (e) { e.preventDefault(); });
    return load();
  }).catch(function () {
    $("total").textContent = "Couldn't load the directory. Please refresh the page.";
  });
})();
