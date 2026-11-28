// Quality of life check: the shared list of questions and living-wage items, used by the profile page
// (where members fill it in, privately) and the Baselines page (where county totals show).
window.QOL = (function () {
  var ANSWERS = ["Never", "Rarely", "Sometimes", "Mostly", "Always"];
  var QUESTIONS = [
    ["q_pay", "pay", "My work pays for the basics: housing, food, utilities and getting around.", "pay for the basics"],
    ["q_like", "like", "I like my work.", "liking their work"],
    ["q_body", "body", "I'm healthy, or I'm getting the care I need for my body.", "care for the body"],
    ["q_mind", "mind", "I'm getting the care I need for my mind.", "care for the mind"],
    ["q_secure", "secure", "I feel secure that I can get what I need, even if something goes wrong.", "feeling secure"]
  ];
  // [column, key, label, key in Rai's numbers (or null), what to say when Rai has no number]
  var ITEMS = [
    ["c_housing", "housing", "Living space and utilities", "housing", "", "Rent or mortgage, water, power, heating and cooling"],
    ["c_food", "food", "Food", "food", ""],
    ["c_other", "other", "Clothing and everyday things", "other", "", "Clothes, personal care, household items, going out"],
    ["c_phone", "phone", "Phone and internet", "phone", ""],
    ["c_transport", "transport", "Getting around", "transport", "", "Car payment, gas, insurance, repairs, bus fare"],
    ["c_health", "health", "Healthcare", "health", "", "Insurance, dental, vision and mental health, what you pay yourself"],
    ["c_training", "training", "Education or paid training", null, "Not found yet"],
    ["c_childcare", "childcare", "Childcare", null, "Only for working parents"]
  ];
  function money(n) { return n == null ? "" : "$" + Math.round(n).toLocaleString("en-US"); }
  function pct(x) { return Math.round(x * 100) + "%"; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  // The table on the Baselines page: each item, what Rai found here, and what members say they pay.
  // rai: the county's livingWage numbers from /data/rai/<fips>.json. totals: what qol_county returned.
  function table(rai, totals, place) {
    var m = (rai && rai.monthly) || {}, costs = (totals && totals.costs) || {};
    var rows = ITEMS.map(function (it) {
      var r = it[3] && m[it[3]] != null ? money(m[it[3]]) : '<span class="muted">' + esc(it[4] || "Not found yet") + "</span>";
      var you = costs[it[1]] != null ? money(costs[it[1]]) : '<span class="muted">Not yet</span>';
      return "<tr><td>" + esc(it[2]) + "</td><td>" + r + "</td><td>" + you + "</td></tr>";
    });
    rows.push("<tr><td>Time off to rest</td><td><span class=\"muted\">Not counted yet</span></td><td>" +
      (totals && totals.days_off != null ? totals.days_off + " paid days a year" : '<span class="muted">Not yet</span>') + "</td></tr>");
    if (m.taxes != null) rows.push('<tr><td>Taxes</td><td>' + money(m.taxes) + '</td><td><span class="muted">Not asked</span></td></tr>');
    if (m.total != null) rows.push('<tr class="qol-total"><td><b>Total a month</b></td><td><b>' + money(m.total) + "</b></td><td></td></tr>");
    return '<div class="card qol-box"><h3>What it costs here' + (place ? ", " + esc(place) : "") + "</h3>" +
      '<p class="small muted">A month, for one adult. Rai\'s numbers are from the MIT Living Wage Calculator' + (rai && rai.updated ? " (" + esc(rai.updated) + ")" : "") +
      '. Members say is the middle answer from members here, shown for each line once 10 people fill it in. It\'s what people typed, so take it with a grain of salt.</p>' +
      '<div class="bl-table qol-table"><table><thead><tr><th>What it covers</th><th>Rai found</th><th>Members say</th></tr></thead><tbody>' + rows.join("") + "</tbody></table></div>" +
      (rai && rai.oneAdult ? '<p class="small muted">That works out to a living wage of <b>$' + rai.oneAdult.toFixed(2) + " an hour</b> for one adult working full time.</p>" : "") +
      "</div>";
  }

  // County results of the five questions, for the Baselines page.
  function results(totals) {
    if (!totals || totals.answered == null) return '<p class="small muted">Results show here once at least 10 members in the county have done the check.</p>';
    var worst = QUESTIONS.slice().sort(function (a, b) { return (totals.missed[b[1]] || 0) - (totals.missed[a[1]] || 0); })[0];
    return "<p><b>" + pct(totals.all_met) + "</b> of the " + totals.answered + " members here who did the check have all five needs met." +
      (totals.missed[worst[1]] ? " The one missed most often is <b>" + esc(worst[3]) + "</b> (" + pct(totals.missed[worst[1]]) + " miss it)." : "") + "</p>";
  }

  return { ANSWERS: ANSWERS, QUESTIONS: QUESTIONS, ITEMS: ITEMS, money: money, table: table, results: results };
})();
