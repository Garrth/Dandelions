// Quality of life check, on the Quality of life baseline. Two tables in the same look as the project forms:
//   1. Cost of living a month: what Rai found (rent for your ZIP when there's one, the rest for the county),
//      what members here say (the middle answer, once 10 give a line), and your own number.
//   2. The self-check: five questions, each answered from a dropdown.
// Your answers are private (table qol_checks, only you can read yours). County totals come from qol_county,
// and nothing shows until at least 10 people in the county answer.
window.QOL = (function () {
  var ANSWERS = ["Never", "Rarely", "Sometimes", "Mostly", "Always"];
  // [column, key, question, short name for "missed most often"]
  var QUESTIONS = [
    ["q_pay", "pay", "My work pays for the basics: housing, food, utilities and getting around.", "pay for the basics"],
    ["q_like", "like", "I like my work.", "liking their work"],
    ["q_body", "body", "I'm healthy, or I'm getting the care I need for my body.", "care for the body"],
    ["q_mind", "mind", "I'm getting the care I need for my mind.", "care for the mind"],
    ["q_secure", "secure", "I feel secure that I can get what I need, even if something goes wrong.", "feeling secure"]
  ];
  // [column, key, label, what it includes]. The key matches Rai's monthly numbers and qol_county's costs.
  var ITEMS = [
    ["c_housing", "housing", "Living space and utilities", "Rent or mortgage, water, power, heating and cooling"],
    ["c_food", "food", "Food", ""],
    ["c_other", "other", "Clothing and everyday things", "Clothes, personal care, household items, going out"],
    ["c_phone", "phone", "Phone and internet", ""],
    ["c_transport", "transport", "Getting around", "Car payment, gas, insurance, repairs, bus fare"],
    ["c_health", "health", "Healthcare", "Insurance, dental, vision and mental health"]
  ];
  var COLS = QUESTIONS.map(function (x) { return x[0]; }).concat(ITEMS.map(function (x) { return x[0]; }), ["people"]);
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function money(n) { return n == null ? "" : "$" + Math.round(n).toLocaleString("en-US"); }
  function pct(x) { return Math.round(x * 100) + "%"; }
  function getJSON(u) { return fetch(u).then(function (r) { if (!r.ok) throw new Error(u); return r.json(); }); }

  // A short summary of one person's answers, for their profile.
  function summary(w) {
    if (!w) return "Not answered yet.";
    var five = QUESTIONS.filter(function (x) { return w[x[0]] != null; });
    var met = five.filter(function (x) { return w[x[0]] === -1 || w[x[0]] >= 3; }).length;
    var cost = ITEMS.reduce(function (t, it) { return t + (w[it[0]] || 0); }, 0);
    return (five.length === 5 ? (met === 5 ? "All five needs met." : met + " of 5 needs met.") : five.length + " of 5 questions answered.") +
      (cost ? " Your costs add up to " + money(cost) + " a month" + (w.people > 1 ? " for " + w.people + " people" : "") + "." : "");
  }

  // Draws both tables into el and wires up Save. o: { db, user, county, zip }.
  function mount(el, o) {
    var county = o.county || "06097", zip = o.zip || "", mine = null, rai = null, rents = null, totals = null;
    el.innerHTML = '<p class="small muted">Loading the numbers...</p>';
    Promise.all([
      getJSON("/data/rai/" + county + ".json").catch(function () { return county === "06097" ? null : getJSON("/data/rai/06097.json").catch(function () { return null; }); }),
      getJSON("/data/rai/rent-" + county + ".json").catch(function () { return null; }),
      o.db.rpc("qol_county", { p_county: county }).then(function (r) { return r.error ? null : r.data; }, function () { return null; }),
      o.user ? o.db.from("qol_checks").select(COLS.join(",") + ",updated_at").eq("member_id", o.user.id).maybeSingle().then(function (r) { return r.error ? null : r.data; }, function () { return null; }) : null
    ]).then(function (out) {
      rai = out[0]; rents = out[1]; totals = out[2]; mine = out[3];
      draw();
      if (location.hash === "#qolbox") el.scrollIntoView();
    });

    function raiNumbers() {
      var lw = (rai && rai.yearly && rai.yearly.livingWage) || {}, m = lw.monthly || {}, n = {}, k;
      for (k in m) n[k] = m[k];
      n.zipRent = false;
      var z = rents && rents.zips && rents.zips[zip];
      if (z && m.housing != null) {
        n.total = m.total - m.housing + z.rent;
        n.housing = z.rent; n.zipRent = z.kind;
      }
      return { m: n, lw: lw };
    }

    function draw() {
      var R = raiNumbers(), m = R.m, costs = (totals && totals.costs) || {}, can = !!o.user, place = rai && rai.place;
      var dis = can ? "" : " disabled";
      var costRows = ITEMS.map(function (it) {
        var r = m[it[1]] != null ? money(m[it[1]]) : '<span class="muted">Not found yet</span>';
        var say = costs[it[1]] != null ? money(costs[it[1]]) : '<span class="muted">Not yet</span>';
        var v = mine && mine[it[0]] != null ? mine[it[0]] : "";
        return "<tr><td><b>" + esc(it[2]) + "</b>" + (it[3] ? "<small>" + esc(it[3]) + "</small>" : "") + "</td>" +
          '<td class="r">' + r + '</td><td class="r">' + say + '</td>' +
          '<td class="r in"><input type="number" min="0" max="50000" step="1" inputmode="numeric" placeholder="$" data-c="' + it[0] + '" value="' + esc(v) + '" aria-label="' + esc(it[2]) + ', what you pay a month"' + dis + "></td></tr>";
      }).join("");
      if (m.taxes != null) costRows += '<tr><td><b>Taxes</b><small>Income and payroll taxes on a living wage</small></td><td class="r">' + money(m.taxes) + '</td><td class="r"><span class="muted">Not asked</span></td><td class="r"></td></tr>';

      var qRows = QUESTIONS.map(function (x, i) {
        var opts = '<option value="">Choose</option>' + ANSWERS.map(function (a, v) { return '<option value="' + v + '">' + a + "</option>"; }).join("") +
          (x[0] === "q_pay" ? '<option value="-1">Doesn\'t apply (retired, caregiving, in school)</option>' : "");
        return "<tr><td>" + (i + 1) + ". " + esc(x[2]) + '</td><td class="in"><select data-q="' + x[0] + '" aria-label="Your answer to question ' + (i + 1) + '"' + dis + ">" + opts + "</select></td></tr>";
      }).join("");

      el.innerHTML = '<form class="qf" id="qolform" autocomplete="off">' +
        "<h2>Cost of living, a month</h2>" +
        '<div class="qf-boxes">' +
          '<div class="qf-box auto"><span class="l">Where</span><span class="v">' + esc(place || "Your county") + (zip ? ", ZIP " + esc(zip) : "") + "</span>" +
            "<small>" + (m.zipRent ? "Living space is for your ZIP. The rest is for the county." : zip ? "No rent number for your ZIP yet, so living space is for the county." : "Log in to see rent for your ZIP.") + "</small></div>" +
          '<div class="qf-box"><label for="qol-people">How many people your costs cover</label><select id="qol-people"' + dis + ">" +
            [1, 2, 3, 4, 5, 6].map(function (n) { return '<option value="' + n + '">' + (n === 1 ? "Just me" : n === 6 ? "6 or more" : n + " people") + "</option>"; }).join("") + "</select></div>" +
        "</div>" +
        '<div class="qf-tbl"><table class="qf-cost"><thead><tr><th>What it covers</th><th class="r">Rai found</th><th class="r">Members say</th><th class="r">Yours</th></tr></thead><tbody>' + costRows + "</tbody>" +
        (m.total != null ? '<tfoot><tr><td>Total a month</td><td class="r">' + money(m.total) + '</td><td></td><td class="r" id="qol-mytotal"></td></tr></tfoot>' : "") + "</table></div>" +
        '<p class="qf-note">Rai found is for one adult, from the MIT Living Wage Calculator' + (R.lw.updated ? " (" + esc(R.lw.updated) + ")" : "") +
          (m.zipRent ? ", with living space from the Census (median " + esc(m.zipRent) + " rent with utilities in your ZIP)" : "") + "." +
          (R.lw.oneAdult ? " For the county, that's a living wage of $" + R.lw.oneAdult.toFixed(2) + " an hour working full time." : "") +
          " Members say is the middle answer per person from members here, once 10 fill in a line. It's what people typed, so take it with a grain of salt.</p>" +
        "<h2>The self-check, private</h2>" +
        '<div class="qf-tbl"><table class="qf-q"><thead><tr><th>Question</th><th>Your answer</th></tr></thead><tbody>' + qRows + "</tbody></table></div>" +
        '<p class="qf-note">' + results() + "</p>" +
        '<div class="qf-foot">' + (can
          ? '<button class="btn small" type="submit">Save</button><button class="btn ghost small" type="button" id="qol-clear"' + (mine ? "" : " hidden") + '>Remove my answers</button><span class="small muted" id="qol-msg" role="status">' + (mine ? "Saved " + new Date(mine.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) + ". Update it whenever things change." : "Only you see your answers.") + "</span>"
          : '<a class="btn small" href="/app/login.html">Log in to do your check</a><span class="small muted">Only you see your answers.</span>') + "</div></form>";

      var f = el.querySelector("#qolform");
      if (mine) {
        QUESTIONS.forEach(function (x) { if (mine[x[0]] != null) f.querySelector('[data-q="' + x[0] + '"]').value = String(mine[x[0]]); });
        f.querySelector("#qol-people").value = String(Math.min(mine.people || 1, 6));
      }
      function myTotal() {
        var t = 0, any = false;
        f.querySelectorAll("[data-c]").forEach(function (i) { if (i.value !== "") { t += +i.value || 0; any = true; } });
        var c = f.querySelector("#qol-mytotal"); if (c) c.textContent = any ? money(t) : "";
      }
      f.addEventListener("input", myTotal); myTotal();
      if (!can) return;
      function msg(t) { f.querySelector("#qol-msg").textContent = t; }
      f.addEventListener("submit", function (e) {
        e.preventDefault();
        var row = { member_id: o.user.id, people: +f.querySelector("#qol-people").value, updated_at: new Date().toISOString() }, bad = false, any = false;
        QUESTIONS.forEach(function (x) { var v = f.querySelector('[data-q="' + x[0] + '"]').value; row[x[0]] = v === "" ? null : +v; if (v !== "") any = true; });
        f.querySelectorAll("[data-c]").forEach(function (i) {
          var v = i.value.trim(), n = Math.round(+v), max = i.getAttribute("data-c") === "c_housing" ? 50000 : i.getAttribute("data-c") === "c_phone" ? 5000 : 20000;
          if (v === "") { row[i.getAttribute("data-c")] = null; return; }
          if (!isFinite(n) || n < 0 || n > max) bad = true; else { row[i.getAttribute("data-c")] = n; any = true; }
        });
        if (bad) { msg("Check the numbers: whole dollars a month."); return; }
        if (!any) { msg("Answer at least one line first."); return; }
        msg("Saving...");
        o.db.from("qol_checks").upsert(row).then(function (r) {
          if (r.error) { msg("Couldn't save. Try again."); return; }
          mine = row; f.querySelector("#qol-clear").hidden = false; msg("Saved. Only you can see your answers.");
        });
      });
      f.querySelector("#qol-clear").addEventListener("click", function () {
        o.db.from("qol_checks").delete().eq("member_id", o.user.id).then(function (r) {
          if (r.error) { msg("Couldn't remove them. Try again."); return; }
          mine = null; draw(); msg("Removed.");
        });
      });
    }

    function results() {
      if (!totals || totals.answered == null) return "County results show here once at least 10 members here have done the check. A need counts as met at Mostly or Always.";
      var worst = QUESTIONS.slice().sort(function (a, b) { return (totals.missed[b[1]] || 0) - (totals.missed[a[1]] || 0); })[0];
      return "<b>" + pct(totals.all_met) + "</b> of the " + totals.answered + " members here who did the check have all five needs met." +
        (totals.missed[worst[1]] ? " The one missed most often is <b>" + esc(worst[3]) + "</b> (" + pct(totals.missed[worst[1]]) + " miss it)." : "");
    }
  }

  return { QUESTIONS: QUESTIONS, ITEMS: ITEMS, COLS: COLS, summary: summary, mount: mount };
})();
