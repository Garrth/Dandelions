// The public directory: listed member businesses, with search and filters. Reads only public fields.
(function () {
  var cfg = window.DANDELIONS_CONFIG || {};
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  if (!window.supabase) { $("dir").innerHTML = '<p class="muted">Something didn\'t load. Please refresh the page.</p>'; return; }
  var db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
  var all = [], names = {}, q = "", kind = "", county = "";

  function countyName(f) { var c = names[f]; return c ? c[0] + ", " + c[1] : ""; }
  function draw() {
    var inCounty = all.filter(function (b) { return !county || b.county_fips === county; });
    var kinds = inCounty.map(function (b) { return b.kind; }).filter(function (k, i, a) { return a.indexOf(k) === i; });
    if (kind && kinds.indexOf(kind) < 0) kind = "";
    $("kinds").innerHTML = ["All"].concat(kinds).map(function (k) {
      var v = k === "All" ? "" : k;
      return '<button type="button" data-k="' + esc(v) + '" aria-pressed="' + (v === kind) + '">' + esc(k) + "</button>";
    }).join("");
    var list = inCounty.filter(function (b) {
      return (!kind || b.kind === kind) && (!q || (b.name + " " + b.services + " " + b.kind + " " + b.town).toLowerCase().indexOf(q) >= 0);
    });
    $("dir").innerHTML = list.map(function (b) {
      return '<div class="card"><div class="spread"><h3 style="margin:0">' + esc(b.name) + '</h3><span class="chip">' + esc(b.kind) + "</span></div>" +
        '<p class="small muted" style="margin-top:4px">' + esc(b.services) + " · " + esc(b.town) + (countyName(b.county_fips) ? ", " + esc(countyName(b.county_fips)) : "") + "</p>" +
        (b.offer ? '<p class="small" style="margin-top:8px">🎁 ' + esc(b.offer) + "</p>" : "") + "</div>";
    }).join("") || '<p class="muted">' + (all.length ? "No matches." : "No businesses listed yet. Yours could be the first.") + "</p>";
  }

  Promise.all([
    db.rpc("directory_listings"),
    fetch("/data/counties.json").then(function (r) { return r.json(); }).catch(function () { return {}; })
  ]).then(function (out) {
    if (out[0].error) { $("dir").innerHTML = '<p class="muted">Couldn\'t load the directory. Try again in a minute.</p>'; return; }
    all = out[0].data || []; names = out[1] || {};
    var fips = all.map(function (b) { return b.county_fips; }).filter(function (f, i, a) { return f && a.indexOf(f) === i; });
    if (fips.length > 1) {
      $("county").innerHTML = '<option value="">All counties</option>' + fips.map(function (f) { return '<option value="' + esc(f) + '">' + esc(countyName(f) || f) + "</option>"; }).join("");
      $("county").hidden = false;
    }
    draw();
  });
  $("kinds").addEventListener("click", function (e) { var k = e.target.closest("[data-k]"); if (k) { kind = k.dataset.k; draw(); } });
  $("q").addEventListener("input", function (e) { q = e.target.value.trim().toLowerCase(); draw(); });
  $("county").addEventListener("change", function (e) { county = e.target.value; draw(); });
})();
