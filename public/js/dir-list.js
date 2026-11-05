// Directory screen 2: every business under one heading, with a Type box and a Filter box that fit the kind of business.
(function () {
  var D = window.DIR, esc = D.esc;
  function $(id) { return document.getElementById(id); }
  var params = new URLSearchParams(location.search);
  var slug = params.get("t") || "";

  var FOOD = ["restaurant", "casual_eatery", "alcoholic_beverage_venue"];
  var TRADES = ["home_service", "building_or_construction_service"];
  // Filters look at the listing (b) and what its owner added (d, or undefined).
  function filtersFor(family, noun) {
    var none = "None nearby yet. Businesses show here once the owner claims the listing and adds it. Try a bigger distance.";
    var f = [{ v: "az", l: "A to Z" }, { v: "near", l: "Closest" },
      { v: "open", l: "Open now", keep: function (b, d) { return !!d && D.openNow(d.hours) === true; }, empty: "None nearby show as open now. Hours show once " + noun + " claim their listing and add them." }];
    if (FOOD.indexOf(family) >= 0) f.push(
      { v: "price", l: "Price ($ to $$$$)", keep: function (b, d) { return !!d && d.price > 0; }, sort: function (a, b) { return a.det.price - b.det.price || a.d - b.d; }, empty: "Prices show once " + noun + " claim their listing and add them." });
    if (TRADES.indexOf(family) >= 0) f.push(
      { v: "lic", l: "Licensed", keep: function (b) { return !!b[11]; }, empty: "No licensed contractors found nearby. Try a bigger distance." },
      { v: "solo", l: "One-person shop", keep: function (b, d) { return d && d.crew ? d.crew === "1" : b[13] === 1; }, empty: "None found nearby. Try a bigger distance." },
      { v: "crew", l: "Larger crew", keep: function (b, d) { return !!d && (d.crew === "6-20" || d.crew === "21+"); }, empty: none },
      { v: "est", l: "Free estimates", keep: function (b, d) { return !!d && d.free_estimates; }, empty: none });
    return f.concat([
      { v: "cert", l: "Certified", note: "None yet. Businesses show here once they pass a Dandelions review." },
      { v: "ver", l: "Verified", keep: function (b, d) { return !!d; }, empty: "None nearby yet. Businesses show here once the owner claims the listing and adds their details." },
      { v: "offer", l: "Has an offer", keep: function (b, d) { return !!d && !!d.offer; }, empty: "None nearby yet. Businesses show here once they post an offer." },
      { v: "pts", l: "Takes points (later)", note: "Comes when points start." }]);
  }

  var idx, loc, t = -1, rows = [], filters = [], det = {};

  function under(type, top) { for (var x = type; x >= 0; x = idx.types[x][2]) if (x === top) return true; return false; }

  function draw() {
    var r = D.radius(), kind = $("kind").value, fv = $("filter").value;
    var f = filters.filter(function (x) { return x.v === fv; })[0] || filters[0];
    var near = rows.map(function (b) { return { b: b, d: D.miles(loc.lat, loc.lon, b[3], b[4]), det: det[b[0]] }; })
      .filter(function (x) { return x.d <= r; });
    // Type box: the kinds found under this heading nearby.
    var kc = {};
    near.forEach(function (x) { kc[x.b[2]] = (kc[x.b[2]] || 0) + 1; });
    var kinds = Object.keys(kc).map(Number).sort(function (a, b) { return idx.types[a][1].localeCompare(idx.types[b][1]); });
    $("kind").innerHTML = '<option value="">All (' + near.length + ")</option>" + (kinds.length > 1 ? kinds.map(function (k) {
      return '<option value="' + k + '"' + (String(k) === kind ? " selected" : "") + ">" + esc(idx.types[k][1]) + " (" + kc[k] + ")</option>";
    }).join("") : "");
    $("kind").disabled = kinds.length < 2;
    var list = near.filter(function (x) { return (!kind || String(x.b[2]) === kind) && (!f.keep || f.keep(x.b, x.det)); });
    if (f.sort) list.sort(f.sort);
    else if (f.v === "near") list.sort(function (a, b) { return a.d - b.d; });
    $("note").hidden = !f.note && list.length > 0;
    if (f.note) { $("note").textContent = f.note; list = []; }
    else if (f.empty && near.length && !list.length) $("note").textContent = f.empty;
    else if (!near.length) $("note").textContent = "Nothing within " + r + " miles of " + loc.label + ". Try a bigger distance.";
    var what = { lic: " licensed", solo: " one-person shops", open: " open now", ver: " verified", offer: " with an offer", est: " with free estimates", crew: " with a larger crew", price: " with prices" }[f.v] || "";
    $("count").textContent = f.note ? "" : list.length + what + " within " + r + " miles of " + loc.label + ", " + (f.v === "near" ? "closest first" : f.v === "price" ? "lowest price first" : "A to Z");
    $("list").innerHTML = list.map(function (x) {
      var b = x.b, o = x.det;
      var tags = (o ? ' · <span class="lic">✓ Verified</span>' : "") + (b[11] ? ' · <span class="lic">Licensed</span>' : "") +
        (o && o.price ? " · " + "$$$$".slice(0, o.price) : "") + (o && o.offer ? ' · <span class="lic">Offer</span>' : "") +
        (o && o.hours ? (D.openNow(o.hours) ? ' · <span class="open">Open</span>' : ' · <span class="closed">Closed</span>') : "");
      return '<a class="row" href="/directory/biz.html?f=' + encodeURIComponent(idx.types[t][3]) + "&id=" + encodeURIComponent(b[0]) + '">' +
        '<span style="min-width:0"><span class="name">' + esc(o ? o.name : b[1]) + '</span><span class="sub">' + esc(idx.types[b[2]][1]) + ((o ? o.town : b[6]) ? " · " + esc(o ? o.town : b[6]) : "") + tags + "</span></span>" +
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
    return Promise.all([D.family(idx.types[t][3]), D.location(idx), D.details()]);
  }).then(function (out) {
    det = out[2];
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
