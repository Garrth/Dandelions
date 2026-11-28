// Personal EI# check, on the EI# baseline. Same square look as the project forms and the Quality of life check.
// Four lines, each scored -100 to +100: living space, home energy, water, getting around. The EI# is their average.
// 0 = living within what can be sustained, on renewables. Each extra allowance's worth takes off 10 points.
// Above 0 only from renewable power sent to the grid beyond your own use (for now).
// Answers are private (table ei_checks). County totals come from ei_county, nothing under 10 people.
window.EI = (function () {
  var A = {
    sqft: 500,          // living space a person
    kwh: 300,           // home energy a month a person (efficient all-electric 500 sq ft, on renewables)
    gal: 50 * 30.4,     // water a month a person (50 gallons a day)
    travel: 120         // getting around a month a person, in kWh (about 400 EV miles)
  };
  var THERM = 29.3, GAS_GAL = 33.7, EV_MI = 0.3, AIR_MI = 0.5;
  // Share of grid power that's renewable, by state (state FIPS code). Starting numbers from EIA, rounded:
  // California about half, the US as a whole about 22%. More states get added as members join there.
  var GRID = { "06": 0.5 }, GRID_US = 0.22;
  var COLS = ["people", "sqft", "elec_kwh", "gas_therms", "power", "solar_pct", "export_kwh", "water_gal", "car", "car_miles", "mpg", "air_miles"];
  var LINES = [["space", "Living space"], ["energy", "Home energy"], ["water", "Water"], ["travel", "Getting around"]];

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function n(v) { return v == null || v === "" || !isFinite(+v) ? null : +v; }
  function clamp(x) { return Math.max(-100, Math.min(100, Math.round(x))); }
  function over(u) { return clamp(-10 * u); }                       // u = extra use, in allowances
  function num(x) { return Math.round(x).toLocaleString("en-US"); }
  function shown(s) { return s == null ? "" : (s > 0 ? "+" : "") + s; }

  // Works out each line's score. Lines with nothing entered come back empty.
  function score(a, state) {
    var p = Math.max(1, n(a.people) || 1), grid = GRID[state] != null ? GRID[state] : GRID_US, out = {};
    var r = a.power === "renewable" ? 1 : a.power === "solar" ? Math.min(1, (n(a.solar_pct) || 0) / 100 + (1 - (n(a.solar_pct) || 0) / 100) * grid) : grid;
    if (n(a.sqft) != null) out.space = over(Math.max(0, n(a.sqft) - A.sqft * p) / (A.sqft * p));
    if (n(a.elec_kwh) != null || n(a.gas_therms) != null || n(a.export_kwh) != null) {
      var E = A.kwh * p, elec = n(a.elec_kwh) || 0, gas = (n(a.gas_therms) || 0) * THERM, exp = n(a.export_kwh) || 0;
      var bad = elec * (1 - r) + gas + Math.max(0, elec * r - E);
      var left = exp - bad;                                           // solar sent out first makes up for what's over
      out.energy = left >= 0 ? clamp(100 * left / E) : over(-left / E);
    }
    if (n(a.water_gal) != null) out.water = over(Math.max(0, n(a.water_gal) - A.gal * p) / (A.gal * p));
    if (a.car || n(a.air_miles) != null) {
      var mi = a.car === "none" ? 0 : n(a.car_miles) || 0, bad2 = 0, good = 0;
      if (a.car === "gas") bad2 += mi * GAS_GAL / (n(a.mpg) || 25);
      if (a.car === "ev") { bad2 += mi * EV_MI * (1 - r); good += mi * EV_MI * r; }
      bad2 += (n(a.air_miles) || 0) * AIR_MI;
      out.travel = over((bad2 + Math.max(0, good - A.travel)) / A.travel);
    }
    var have = LINES.filter(function (l) { return out[l[0]] != null; });
    out.total = have.length === 4 ? clamp(have.reduce(function (t, l) { return t + out[l[0]]; }, 0) / 4) : null;
    out.r = r; out.p = p;
    return out;
  }

  function mount(el, o) {
    var county = o.county || "06097", state = county.slice(0, 2), mine = null, totals = null;
    el.innerHTML = '<p class="small muted">Loading...</p>';
    Promise.all([
      o.db.rpc("ei_county", { p_county: county }).then(function (r) { return r.error ? null : r.data; }, function () { return null; }),
      o.user ? o.db.from("ei_checks").select(COLS.join(",") + ",updated_at").eq("member_id", o.user.id).maybeSingle().then(function (r) { return r.error ? null : r.data; }, function () { return null; }) : null
    ]).then(function (out) { totals = out[0]; mine = out[1]; draw(); if (location.hash === "#eibox") el.scrollIntoView(); });

    function draw() {
      var can = !!o.user, dis = can ? "" : " disabled", g = GRID[state] != null ? GRID[state] : GRID_US;
      function box(cls, id, label, input, note) {
        return '<div class="qf-box ' + cls + '"><label for="' + id + '">' + label + "</label>" + input + (note ? "<small>" + note + "</small>" : "") + "</div>";
      }
      function inp(id, max, ph) { return '<input id="ei-' + id + '" data-k="' + id + '" type="number" min="0" max="' + max + '" inputmode="numeric" placeholder="' + (ph || "") + '"' + dis + ">"; }
      function sel(id, opts) { return '<select id="ei-' + id + '" data-k="' + id + '"' + dis + ">" + opts.map(function (x) { return '<option value="' + x[0] + '">' + x[1] + "</option>"; }).join("") + "</select>"; }
      el.innerHTML = '<form class="qf" id="eiform" autocomplete="off">' +
        "<h2>Your EI#, private</h2>" +
        '<div class="qf-tbl"><table class="qf-cost"><thead><tr><th>Line</th><th class="r">Sustainable</th><th class="r">Yours</th><th class="r">Score</th></tr></thead><tbody id="ei-rows"></tbody>' +
        '<tfoot><tr><td>Your EI#</td><td class="r">0</td><td></td><td class="r" id="ei-total"></td></tr></tfoot></table></div>' +
        '<p class="qf-note">0 is living within what can be sustained, on renewables. Each extra allowance\'s worth takes off 10 points. Your EI# shows once all four lines have numbers.</p>' +
        '<p class="qf-note">' + (totals && totals.answered ? "Members here, the middle score: " + LINES.map(function (l) { return l[1].toLowerCase() + " <b>" + shown(totals[l[0]]) + "</b>"; }).join(", ") + ", EI# <b>" + shown(totals.total) + "</b> (" + totals.answered + " people)." : "County results show here once at least 10 members here have done the check.") + "</p>" +
        "<h2>Your home</h2>" +
        '<div class="qf-boxes">' +
          box("", "ei-people", "People in your home", sel("people", [[1, "Just me"], [2, "2"], [3, "3"], [4, "4"], [5, "5"], [6, "6"], [7, "7"], [8, "8 or more"]])) +
          box("", "ei-sqft", "Square feet", inp("sqft", 50000)) +
        "</div>" +
        "<h2>Home energy, a month</h2>" +
        '<div class="qf-boxes">' +
          box("", "ei-elec_kwh", "Electricity, kWh", inp("elec_kwh", 20000), "On your bill.") +
          box("", "ei-gas_therms", "Gas, therms", inp("gas_therms", 2000), "Propane or oil too. 0 if all-electric.") +
          box("", "ei-power", "Where your power comes from", sel("power", [["standard", "My utility's standard plan"], ["renewable", "A 100% renewable plan"], ["solar", "My own solar, plus the grid"]]), "Standard counts as about " + Math.round(g * 100) + "% renewable where you live.") +
          box("", "ei-solar_pct", "Solar covers, %", inp("solar_pct", 100), "Only if you have solar.") +
          box("", "ei-export_kwh", "Solar sent out beyond your use, kWh", inp("export_kwh", 20000), "Your net export, if you have solar.") +
        "</div>" +
        "<h2>Water, a month</h2>" +
        '<div class="qf-boxes">' +
          box("", "ei-water_gal", "Gallons, whole home", inp("water_gal", 200000), "On your water bill. Bills in units: 1 unit (CCF) is 748 gallons.") +
        "</div>" +
        "<h2>Getting around, a month, just you</h2>" +
        '<div class="qf-boxes">' +
          box("", "ei-car", "Your car", sel("car", [["", "Choose"], ["none", "No car"], ["gas", "Gas or hybrid"], ["ev", "Electric"]])) +
          box("", "ei-car_miles", "Miles you drive", inp("car_miles", 20000)) +
          box("", "ei-mpg", "Miles per gallon", inp("mpg", 150), "Gas or hybrid only.") +
          box("", "ei-air_miles", "Miles you fly", inp("air_miles", 50000), "A year's flights divided by 12. A round trip to New York from here is about 5,000 miles.") +
        "</div>" +
        '<div class="qf-foot">' + (can
          ? '<button class="btn small" type="submit">Save</button><button class="btn ghost small" type="button" id="ei-clear"' + (mine ? "" : " hidden") + '>Remove my answers</button><span class="small muted" id="ei-msg" role="status">' + (mine ? "Saved " + new Date(mine.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) + "." : "Only you see your answers.") + "</span>"
          : '<a class="btn small" href="/app/login.html">Log in to do your check</a><span class="small muted">Only you see your answers.</span>') + "</div></form>";
      var f = el.querySelector("#eiform");
      if (mine) COLS.forEach(function (k) { var i = f.querySelector('[data-k="' + k + '"]'); if (i && mine[k] != null) i.value = String(k === "people" ? Math.min(mine[k], 8) : mine[k]); });
      function read() { var a = {}; COLS.forEach(function (k) { var i = f.querySelector('[data-k="' + k + '"]'); a[k] = i ? (i.tagName === "SELECT" ? i.value : i.value.trim()) : null; }); return a; }
      function refresh() {
        var a = read(), s = score(a, state), p = s.p;
        var yours = {
          space: n(a.sqft) != null ? num(n(a.sqft)) + " sq ft" : "",
          energy: n(a.elec_kwh) != null || n(a.gas_therms) != null ? num((n(a.elec_kwh) || 0) + (n(a.gas_therms) || 0) * THERM) + " kWh" : "",
          water: n(a.water_gal) != null ? num(n(a.water_gal)) + " gal" : "",
          travel: a.car || n(a.air_miles) != null ? num((a.car === "none" ? 0 : n(a.car_miles) || 0) + (n(a.air_miles) || 0)) + " mi" : ""
        };
        var sus = {
          space: num(A.sqft * p) + " sq ft", energy: num(A.kwh * p) + " kWh renewable", water: num(A.gal * p) + " gal", travel: "About 400 EV miles on renewables"
        };
        f.querySelector("#ei-rows").innerHTML = LINES.map(function (l) {
          return "<tr><td><b>" + l[1] + '</b></td><td class="r">' + sus[l[0]] + '</td><td class="r">' + (yours[l[0]] || '<span class="muted">Not entered</span>') + '</td><td class="r ei-s' + (s[l[0]] > 0 ? " up" : s[l[0]] < 0 ? " down" : "") + '">' + (s[l[0]] != null ? shown(s[l[0]]) : "") + "</td></tr>";
        }).join("");
        f.querySelector("#ei-total").textContent = s.total != null ? shown(s.total) : "";
        f.querySelector("#ei-solar_pct").closest(".qf-box").hidden = a.power !== "solar";
        f.querySelector("#ei-export_kwh").closest(".qf-box").hidden = a.power !== "solar";
        f.querySelector("#ei-mpg").closest(".qf-box").hidden = a.car !== "gas";
        f.querySelector("#ei-car_miles").closest(".qf-box").hidden = !a.car || a.car === "none";
        return s;
      }
      f.addEventListener("input", refresh); f.addEventListener("change", refresh); refresh();
      if (!can) return;
      function msg(t) { f.querySelector("#ei-msg").textContent = t; }
      f.addEventListener("submit", function (e) {
        e.preventDefault();
        var a = read(), s = refresh(), row = { member_id: o.user.id, updated_at: new Date().toISOString() }, bad = false;
        COLS.forEach(function (k) {
          var v = a[k];
          if (k === "power" || k === "car") { row[k] = v || null; return; }
          if (v === "" || v == null) { row[k] = null; return; }
          var x = Math.round(+v); if (!isFinite(x) || x < 0) bad = true; row[k] = x;
        });
        row.people = s.p;
        if (row.car === "none") { row.car_miles = null; row.mpg = null; }
        if (row.car !== "gas") row.mpg = null;
        if (row.power !== "solar") { row.solar_pct = null; row.export_kwh = null; }
        if (row.sqft != null && row.sqft < 50) bad = true;
        if (bad) { msg("Check the numbers: whole numbers only."); return; }
        row.s_space = s.space == null ? null : s.space; row.s_energy = s.energy == null ? null : s.energy;
        row.s_water = s.water == null ? null : s.water; row.s_travel = s.travel == null ? null : s.travel; row.s_total = s.total;
        if (row.s_space == null && row.s_energy == null && row.s_water == null && row.s_travel == null) { msg("Fill in at least one line first."); return; }
        msg("Saving...");
        o.db.from("ei_checks").upsert(row).then(function (r) {
          if (r.error) { msg("Couldn't save. Check the numbers and try again."); return; }
          mine = row; f.querySelector("#ei-clear").hidden = false; msg("Saved. Only you can see your answers.");
        });
      });
      f.querySelector("#ei-clear").addEventListener("click", function () {
        o.db.from("ei_checks").delete().eq("member_id", o.user.id).then(function (r) {
          if (r.error) { msg("Couldn't remove them. Try again."); return; }
          mine = null; draw(); f = el.querySelector("#eiform"); el.querySelector("#ei-msg").textContent = "Removed.";
        });
      });
    }
  }

  return { score: score, mount: mount, COLS: COLS };
})();
