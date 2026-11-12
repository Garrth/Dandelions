// The deals of the day on the front page. Deals for everyone always show. With a ZIP code, local deals show too.
(function () {
  var cfg = window.DANDELIONS_CONFIG || {}, box = document.getElementById("deals-box");
  if (!box || !window.supabase || !window.Deals) return;
  var db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });
  var esc = window.Deals.esc;
  function get(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function put(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function json(u) { return fetch(u).then(function (r) { if (!r.ok) throw new Error(u); return r.json(); }); }

  // The county for a ZIP code, remembered so the big ZIP file only loads once.
  function countyFor(zip) {
    var saved = get("dandelions_deals_area");
    if (saved && saved.zip === zip) return Promise.resolve(saved);
    return Promise.all([json("/data/zip-county.json"), json("/data/counties.json")]).then(function (r) {
      var fips = r[0][zip], c = fips && r[1][fips];
      if (!c) return null;
      var area = { zip: zip, fips: fips, name: c[0] + ", " + c[1] };
      put("dandelions_deals_area", area);
      return area;
    });
  }
  function zipForm(msg) {
    return '<form class="dl-zip" id="dl-zip"><label for="dl-zip-in">' + (msg || "Add your ZIP code to see deals near you.") + '</label>' +
      '<input id="dl-zip-in" inputmode="numeric" maxlength="5" placeholder="95404" autocomplete="postal-code"><button type="submit">Show</button></form>';
  }
  function wire() {
    var f = document.getElementById("dl-zip");
    if (f) f.addEventListener("submit", function (e) {
      e.preventDefault();
      var z = document.getElementById("dl-zip-in").value.trim();
      if (!/^\d{5}$/.test(z)) { document.getElementById("dl-zip-in").focus(); return; }
      put("dandelions_zip", z);
      draw(z);
    });
    var c = document.getElementById("dl-change");
    if (c) c.addEventListener("click", function () { put("dandelions_deals_area", null); box.querySelector(".dl-zip").outerHTML = zipForm("Show deals near a different ZIP code."); wire(); });
  }
  function draw(zip) {
    (zip ? countyFor(zip).catch(function () { return null; }) : Promise.resolve(null)).then(function (area) {
      var foot = area
        ? '<p class="dl-zip">Showing deals for ' + esc(area.name) + '. <button type="button" id="dl-change">Change</button></p>'
        : zipForm(zip ? "We couldn't find that ZIP code. Try another." : null);
      return window.Deals.show(box, db, area && area.fips, foot);
    }).then(wire);
  }
  draw(get("dandelions_zip"));
})();
