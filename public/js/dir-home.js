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
    "oil change": "automotive_repair", pharmacy: "pharmacy", groomer: "pet_groomer", nails: "nail_salon"
  };

  var idx, loc, slugAt = {}, counts = [];

  function countAll() {
    var r = D.radius(), pts = idx.pts, types = idx.types;
    counts = new Array(types.length).fill(0);
    for (var i = 0; i < pts.length; i += 3) {
      if (D.miles(loc.lat, loc.lon, pts[i + 1] / 1e4, pts[i + 2] / 1e4) > r) continue;
      for (var t = pts[i]; t >= 0; t = types[t][2]) counts[t]++;
    }
  }
  function link(t) { return "/directory/list.html?t=" + encodeURIComponent(idx.types[t][0]); }
  function sorted() {
    return idx.types.map(function (x, i) { return i; }).filter(function (i) { return counts[i] > 0; })
      .sort(function (a, b) { return idx.types[a][1].localeCompare(idx.types[b][1]); });
  }

  function drawAZ() {
    var list = sorted(), have = {}, html = [], last = "";
    list.forEach(function (i) {
      var L = idx.types[i][1].charAt(0).toUpperCase();
      if (L !== last) { html.push('<h2 class="letterhead" id="L-' + L + '">' + L + "</h2>"); last = L; have[L] = true; }
      html.push('<a class="row" href="' + link(i) + '"><span>' + esc(idx.types[i][1]) + '</span><span class="n">' + counts[i] + "</span></a>");
    });
    $("az").innerHTML = html.join("");
    $("letters").innerHTML = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(function (L) {
      return have[L] ? '<a href="#L-' + L + '">' + L + "</a>" : '<span aria-hidden="true">' + L + "</span>";
    }).join("");
    $("total").textContent = list.length.toLocaleString() + " kinds of business within " + D.radius() + " miles, A to Z";
  }

  function drawMatches() {
    var q = $("q").value.trim().toLowerCase();
    $("browse").hidden = !!q; $("matches").hidden = !q;
    if (!q) return;
    var starts = [], inside = [], seen = {};
    var word = WORDS[q] && slugAt[WORDS[q]];
    if (word !== undefined && counts[word] > 0) { starts.push(word); seen[word] = true; }
    sorted().forEach(function (i) {
      if (seen[i]) return;
      var s = idx.types[i][1].toLowerCase();
      if (s.indexOf(q) === 0) starts.push(i);
      else if ((" " + s).indexOf(" " + q) >= 0) inside.push(i);
    });
    var all = starts.concat(inside).slice(0, 60);
    $("matches").innerHTML = all.map(function (i) {
      return '<a class="row" href="' + link(i) + '"><span>' + esc(idx.types[i][1]) + '</span><span class="n">' + counts[i] + "</span></a>";
    }).join("") || '<p class="note">No business type starts with that. Try one word, like "plumber" or "tacos". Asking in your own words is coming soon.</p>';
  }

  function redraw() { countAll(); drawAZ(); drawMatches(); }

  D.index().then(function (i) {
    idx = i;
    idx.types.forEach(function (x, n) { slugAt[x[0]] = n; });
    return D.location(idx);
  }).then(function (l) {
    loc = l;
    D.locationBar(idx, loc, function (nl) { loc = nl; redraw(); });
    redraw();
    $("q").addEventListener("input", drawMatches);
    $("q").form && $("q").form.addEventListener("submit", function (e) { e.preventDefault(); });
  }).catch(function () {
    $("total").textContent = "Couldn't load the directory. Please refresh the page.";
  });
})();
