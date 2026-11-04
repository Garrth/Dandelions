// Directory screen 2: every business under one heading, with a Type box and a Filter box that fit the kind of business.
(function () {
  var D = window.DIR, esc = D.esc;
  function $(id) { return document.getElementById(id); }
  var params = new URLSearchParams(location.search);
  var slug = params.get("t") || "";

  var FOOD = ["restaurant", "casual_eatery"];
  var TRADES = ["home_service", "building_or_construction_service"];
  function filtersFor(family, noun) {
    var f = [{ v: "az", l: "A to Z" }, { v: "near", l: "Closest" }];
    if (FOOD.indexOf(family) >= 0) f.push(
      { v: "price", l: "Price ($ to $$$$)", note: "Prices show once " + noun + " claim their listing and add them." },
      { v: "open", l: "Open now", note: "Hours show once " + noun + " claim their listing and add them." });
    if (TRADES.indexOf(family) >= 0) f.push(
      { v: "lic", l: "Licensed", note: "Coming next: we match each business to the state contractor license list automatically." },
      { v: "solo", l: "One-person shop", note: "Comes from the state license list and owner claims." },
      { v: "crew", l: "Larger crew", note: "Comes from owner claims and Dandelions reviews." },
      { v: "est", l: "Free estimates", note: "Shows once " + noun + " claim their listing and add it." });
    return f.concat([
      { v: "cert", l: "Certified", note: "None yet. Businesses show here once they pass a Dandelions review." },
      { v: "ver", l: "Verified", note: "None yet. Businesses show here once the owner claims the listing and confirms it." },
      { v: "offer", l: "Has an offer", note: "None yet. Businesses show here once they post an offer." },
      { v: "pts", l: "Takes points (later)", note: "Comes when points start." }]);
  }

  var idx, loc, t = -1, rows = [], filters = [];

  function under(type, top) { for (var x = type; x >= 0; x = idx.types[x][2]) if (x === top) return true; return false; }

  function draw() {
    var r = D.radius(), kind = $("kind").value, fv = $("filter").value;
    var f = filters.filter(function (x) { return x.v === fv; })[0] || filters[0];
    var near = rows.map(function (b) { return { b: b, d: D.miles(loc.lat, loc.lon, b[3], b[4]) }; })
      .filter(function (x) { return x.d <= r; });
    // Type box: the kinds found under this heading nearby.
    var kc = {};
    near.forEach(function (x) { kc[x.b[2]] = (kc[x.b[2]] || 0) + 1; });
    var kinds = Object.keys(kc).map(Number).sort(function (a, b) { return idx.types[a][1].localeCompare(idx.types[b][1]); });
    $("kind").innerHTML = '<option value="">All (' + near.length + ")</option>" + (kinds.length > 1 ? kinds.map(function (k) {
      return '<option value="' + k + '"' + (String(k) === kind ? " selected" : "") + ">" + esc(idx.types[k][1]) + " (" + kc[k] + ")</option>";
    }).join("") : "");
    $("kind").disabled = kinds.length < 2;
    var list = near.filter(function (x) { return !kind || String(x.b[2]) === kind; });
    if (f.v === "near") list.sort(function (a, b) { return a.d - b.d; });
    $("note").hidden = !f.note && list.length > 0;
    if (f.note) { $("note").textContent = f.note; list = []; }
    else if (!near.length) $("note").textContent = "Nothing within " + r + " miles of " + loc.label + ". Try a bigger distance.";
    $("count").textContent = f.note ? "" : list.length + " within " + r + " miles of " + loc.label + ", " + (f.v === "near" ? "closest first" : "A to Z");
    $("list").innerHTML = list.map(function (x) {
      var b = x.b;
      return '<a class="row" href="/directory/biz.html?f=' + encodeURIComponent(idx.types[t][3]) + "&id=" + encodeURIComponent(b[0]) + '">' +
        '<span style="min-width:0"><span class="name">' + esc(b[1]) + '</span><span class="sub">' + esc(idx.types[b[2]][1]) + (b[6] ? " · " + esc(b[6]) : "") + "</span></span>" +
        '<span class="n">' + x.d.toFixed(1) + " mi</span></a>";
    }).join("");
  }

  D.index().then(function (i) {
    idx = i;
    idx.types.forEach(function (x, n) { if (x[0] === slug) t = n; });
    if (t < 0) throw new Error("not found");
    var label = idx.types[t][1];
    document.title = label + " | Directory | Dandelions";
    $("title").textContent = label;
    filters = filtersFor(idx.types[t][3], "businesses");
    $("filter").innerHTML = filters.map(function (f) { return '<option value="' + f.v + '">' + esc(f.l) + "</option>"; }).join("");
    return Promise.all([D.family(idx.types[t][3]), D.location(idx)]);
  }).then(function (out) {
    rows = out[0].filter(function (b) { return under(b[2], t); });
    rows.sort(function (a, b) { return a[1].localeCompare(b[1]); });
    loc = out[1];
    D.locationBar(idx, loc, function (nl) { loc = nl; draw(); });
    $("kind").addEventListener("change", draw);
    $("filter").addEventListener("change", draw);
    draw();
  }).catch(function () {
    $("title").textContent = "Couldn't find that";
    $("list").innerHTML = '<p class="note">That kind of business isn\'t in the directory. <a href="/directory/">Back to What do you need?</a></p>';
  });
})();
