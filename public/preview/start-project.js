// Start a project: preview of the form. Nothing is saved or sent.
(function () {
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fmt(n) { return Math.round(Number(n) || 0).toLocaleString("en-US"); }
  function num(v) { var n = parseFloat(v); return isNaN(n) ? 0 : n; }

  // How each kind of outcome is measured.
  var MEASURES = {
    counts: {
      note: "This kind of work is measured by a count. Say what gets counted, how many, and how the count is checked.",
      fields: [
        ["what", "What gets counted", "input", "ID-checked sign-ups from the flyer link"],
        ["target", "How many", "number", "50"],
        ["how", "How it's counted", "select", ["Counted by Dandelions (sign-ups from your link)", "Photos with time and place", "Logged in the directory, spot-checked by phone", "Both businesses confirm it"]]
      ]
    },
    made: {
      note: "This kind of work is measured by something made or fixed. Say what's delivered and what \"done\" means in a way a stranger could check.",
      fields: [
        ["what", "What gets delivered", "input", "Bigger tap targets on the county map"],
        ["done", "Done means", "textarea", "Works on 3 phones (Android and iPhone), live on the site, nothing else broke."],
        ["how", "How it's checked", "select", ["Link to see it working", "Before and after photos", "A checker visits in person", "The owner of the place confirms"]]
      ]
    },
    service: {
      note: "This kind of work is measured by service over time. Say who it's for, how many visits or sessions, and what counts as success.",
      fields: [
        ["who", "Who it serves", "input", "Seniors living alone in Petaluma"],
        ["target", "How many visits or sessions", "number", "40"],
        ["success", "What counts as success", "input", "10 people visited weekly for a month, 8 say they want to keep going"],
        ["how", "How it's checked", "select", ["Check-in at each visit or session", "The person served confirms", "Random follow-up call", "Photos with time and place"]]
      ]
    }
  };

  // Kinds of work. Rates are sample "likely accepted" ranges in points an hour.
  var KINDS = [
    { id: "word", name: "Spread the word", type: "counts", rate: [20, 35], note: "Posts, videos, flyers, local news.",
      sample: { name: "Fix-it day flyers around Petaluma", town: "Petaluma",
        outcome: "50 more ID-checked people in Petaluma sign up, coming from flyers posted around town.",
        m: { what: "ID-checked sign-ups from the flyer link", target: 50, how: 0 },
        ms: [["Flyer design shared", 20, 7], ["500 flyers posted at 40 spots, photo of each", 40, 14], ["50 ID-checked sign-ups from the flyer link", 40, 45]],
        labor: [["Design the flyer", 1, 4], ["Post flyers around town", 1, 8]], mat: [["Printing, 500 flyers", 1, 75], ["Tape and staples", 1, 10]] } },
    { id: "members", name: "Sign up members", type: "counts", rate: [20, 30], note: "Tables at markets and events, welcoming people.",
      sample: { name: "Sign-up table at the Healdsburg market, 4 Saturdays", town: "Healdsburg",
        outcome: "80 ID-checked people in Healdsburg sign up at the Saturday market.",
        m: { what: "ID-checked sign-ups at the table", target: 80, how: 0 },
        ms: [["Table set up the first Saturday, photo", 25, 7], ["40 ID-checked sign-ups", 35, 14], ["80 ID-checked sign-ups", 40, 28]],
        labor: [["Staff the table, 4 Saturdays", 2, 20]], mat: [["Banner", 1, 60], ["Market booth fee", 4, 25]] } },
    { id: "biz", name: "Sign up businesses", type: "counts", rate: [22, 35], note: "Visits, listings, directory checks.",
      sample: { name: "Directory check: every business in Sebastopol", town: "Sebastopol",
        outcome: "Every listed business in Sebastopol is confirmed open, with the right phone and type.",
        m: { what: "Businesses confirmed with the right details", target: 300, how: 2 },
        ms: [["First 100 businesses confirmed", 30, 10], ["All 300 confirmed", 70, 30]],
        labor: [["Calls and visits", 1, 40]], mat: [["Gas and parking", 1, 40]] } },
    { id: "spend", name: "Help businesses spend points", type: "counts", rate: [25, 40], note: "Find places to spend, so more businesses accept.",
      sample: { name: "Find suppliers for 5 Santa Rosa restaurants", town: "Santa Rosa",
        outcome: "5 Santa Rosa restaurants each pay at least one local supplier in points.",
        m: { what: "Restaurants paying a local supplier in points", target: 5, how: 3 },
        ms: [["List of what the 5 restaurants buy", 30, 10], ["5 suppliers signed up", 30, 25], ["5 restaurants paying a supplier in points", 40, 45]],
        labor: [["Meetings with owners and suppliers", 1, 30]], mat: [] } },
    { id: "build", name: "Build it", type: "made", rate: [35, 60], note: "The site, data, guides, artwork.",
      sample: { name: "Make the county map easier to tap on small phones", town: "",
        outcome: "People on small phones can tap their county on the first try.",
        m: { what: "Bigger tap targets, a zoom button, and a list of nearby counties under the map", done: "Works on 3 phones (Android and iPhone), live on the site, nothing else broke.", how: 0 },
        ms: [["Working version on a test page", 50, 10], ["Live on the site after testing on 3 phones", 50, 17]],
        labor: [["Design and code", 1, 16], ["Testing on phones", 1, 3]], mat: [] } },
    { id: "care", name: "Caregiving (once members vote it in)", type: "service", rate: [22, 38], note: "Visits, rides, help at home.",
      sample: { name: "Weekly visits for seniors living alone", town: "Petaluma",
        outcome: "10 seniors living alone in Petaluma get a friendly visit every week for a month.",
        m: { who: "Seniors living alone in Petaluma", target: 40, success: "10 people visited weekly for a month, 8 say they want to keep going", how: 1 },
        ms: [["First 10 visits done", 25, 7], ["40 visits done", 50, 30], ["8 of 10 say they want to keep going", 25, 35]],
        labor: [["Visits, 1 hour each", 2, 40]], mat: [["Mileage", 1, 60]] } },
    { id: "events", name: "Social events (once members vote it in)", type: "service", rate: [20, 32], note: "Meetups, potlucks, fix-it days.",
      sample: { name: "Monthly fix-it day at the library", town: "Petaluma",
        outcome: "Neighbors bring broken things to the library once a month and leave with them fixed.",
        m: { who: "Anyone in Petaluma with something broken", target: 3, success: "60 items fixed over 3 fix-it days", how: 0 },
        ms: [["First fix-it day held, check-ins", 33, 30], ["Second", 33, 60], ["Third, 60 items fixed in all", 34, 90]],
        labor: [["Fixers, 3 days x 4 hours", 4, 12], ["Set up and clean up", 1, 6]], mat: [["Parts and supplies", 1, 150]] } },
    { id: "train", name: "Training (once members vote it in)", type: "service", rate: [30, 55], note: "Classes and hands-on training.",
      sample: { name: "Phone basics class for small business owners", town: "Santa Rosa",
        outcome: "12 small business owners can take a payment and post a deal from their phone.",
        m: { who: "Small business owners in Santa Rosa", target: 4, success: "12 people finish and pass a short hands-on test", how: 0 },
        ms: [["First class held, check-ins", 25, 14], ["All 4 classes held", 40, 35], ["12 pass the hands-on test", 35, 40]],
        labor: [["Teach, 4 classes x 2 hours", 1, 8], ["Prep", 1, 6]], mat: [["Room rental", 4, 30]] } }
  ];

  var kind = KINDS[0];
  $("kind").innerHTML = KINDS.map(function (k, i) { return '<option value="' + i + '">' + esc(k.name) + "</option>"; }).join("");

  // ---- Measure fields ----
  function drawMeasure(vals) {
    var M = MEASURES[kind.type];
    $("measure-note").textContent = M.note;
    $("measure").innerHTML = M.fields.map(function (f) {
      var v = vals && vals[f[0]], input;
      if (f[2] === "select") input = '<select data-m="' + f[0] + '">' + f[3].map(function (o, i) { return '<option value="' + i + '"' + (v === i ? " selected" : "") + ">" + esc(o) + "</option>"; }).join("") + "</select>";
      else if (f[2] === "textarea") input = '<textarea data-m="' + f[0] + '" maxlength="280" placeholder="' + esc(f[3]) + '">' + esc(v || "") + "</textarea>";
      else input = '<input data-m="' + f[0] + '"' + (f[2] === "number" ? ' type="number" min="1"' : ' maxlength="120"') + ' placeholder="' + esc(f[3]) + '" value="' + esc(v == null ? "" : v) + '">';
      return '<label class="field">' + esc(f[1]) + input + "</label>";
    }).join("");
  }
  function measureText() {
    var M = MEASURES[kind.type], out = [];
    M.fields.forEach(function (f) {
      var el = document.querySelector('[data-m="' + f[0] + '"]'); if (!el) return;
      var v = f[2] === "select" ? f[3][el.value] : el.value.trim();
      if (v) out.push([f[1], v]);
    });
    return out;
  }

  // ---- Line lists ----
  function lineHTML(kindOf, v) {
    v = v || [];
    if (kindOf === "ms") return '<div class="line" data-line="ms"><label class="field">Milestone<input data-f="what" maxlength="100" placeholder="What is done, and how it is shown" value="' + esc(v[0] || "") + '"></label>' +
      '<div class="grid"><label class="field">% of pay<input data-f="pct" type="number" min="0" max="100" value="' + (v[1] == null ? "" : v[1]) + '"></label>' +
      '<label class="field">Days from start<input data-f="days" type="number" min="1" value="' + (v[2] == null ? "" : v[2]) + '"></label>' +
      '<label class="field">Points<input data-f="pts" disabled value=""></label></div><div class="foot"><span></span><button class="x" type="button">Remove</button></div></div>';
    if (kindOf === "labor") return '<div class="line" data-line="labor"><label class="field">Work<input data-f="what" maxlength="80" placeholder="What the time is for" value="' + esc(v[0] || "") + '"></label>' +
      '<div class="grid"><label class="field">People<input data-f="people" type="number" min="1" value="' + (v[1] == null ? "" : v[1]) + '"></label>' +
      '<label class="field">Hours each<input data-f="hours" type="number" min="0" step="0.5" value="' + (v[2] == null ? "" : v[2]) + '"></label>' +
      '<label class="field">Points an hour<input data-f="rate" type="number" min="0" value="' + (v[3] == null ? Math.round((kind.rate[0] + kind.rate[1]) / 2) : v[3]) + '"></label></div>' +
      '<div class="foot"><span class="range" data-f="range"></span><button class="x" type="button">Remove</button></div></div>';
    return '<div class="line" data-line="mat"><label class="field">Item<input data-f="what" maxlength="80" placeholder="Material, rental, fee" value="' + esc(v[0] || "") + '"></label>' +
      '<div class="grid"><label class="field">How many<input data-f="qty" type="number" min="0" value="' + (v[1] == null ? "" : v[1]) + '"></label>' +
      '<label class="field wide">Points each<input data-f="cost" type="number" min="0" step="0.01" value="' + (v[2] == null ? "" : v[2]) + '"></label></div>' +
      '<div class="foot"><span class="range" data-f="sub"></span><button class="x" type="button">Remove</button></div></div>';
  }
  function setLines(id, kindOf, rows) { $(id).innerHTML = (rows || []).map(function (r) { return lineHTML(kindOf, r); }).join(""); }
  function addLine(id, kindOf) { $(id).insertAdjacentHTML("beforeend", lineHTML(kindOf)); calc(); }
  function f(line, k) { return line.querySelector('[data-f="' + k + '"]'); }

  // ---- Totals, size, milestones ----
  var total = 0, labor = 0, mats = 0;
  function calc() {
    labor = 0; mats = 0;
    [].forEach.call(document.querySelectorAll('[data-line="labor"]'), function (l) {
      var r = num(f(l, "rate").value), sub = num(f(l, "people").value) * num(f(l, "hours").value) * r;
      labor += sub;
      var out = r && (r < kind.rate[0] || r > kind.rate[1]), el = f(l, "range");
      el.className = "range" + (out ? " out" : "");
      el.textContent = fmt(sub) + " points. Likely accepted: " + kind.rate[0] + " to " + kind.rate[1] + " an hour" + (out ? ". Outside the range, so the checker will ask why." : ".");
    });
    [].forEach.call(document.querySelectorAll('[data-line="mat"]'), function (l) {
      var sub = num(f(l, "qty").value) * num(f(l, "cost").value); mats += sub;
      f(l, "sub").textContent = fmt(sub) + " points";
    });
    var m = Math.max(0, Math.min(30, num($("margin").value)));
    var marg = (labor + mats) * m / 100;
    total = Math.round(labor + mats + marg);
    $("tot").innerHTML = "<span>People and time</span><span>" + fmt(labor) + "</span><span>Materials and costs</span><span>" + fmt(mats) + "</span>" +
      "<span>Margin (" + m + "%)</span><span>" + fmt(marg) + '</span><span class="big">Bid</span><span class="big">' + fmt(total) + " points</span>";
    var pct = 0;
    [].forEach.call(document.querySelectorAll('[data-line="ms"]'), function (l) {
      var p = num(f(l, "pct").value); pct += p; f(l, "pts").value = fmt(total * p / 100);
    });
    $("ms-sum").innerHTML = pct === 100 ? "Milestones add up to 100%." : '<span style="color:var(--warn);font-weight:700">Milestones add up to ' + pct + "%. They need to add up to 100%.</span>";
    size();
  }
  function size() {
    var rec = num($("record").value), pl = num($("pledges").value);
    var ownerCap = rec ? Math.max(500, rec * 2) : 500, areaCap = Math.round(pl * 0.1), cap = Math.min(ownerCap, areaCap);
    var tier, how;
    if (total <= 500) { tier = "Small"; how = "Rai checks the bid, then 1 random checker says yes or no. It can start within a day."; }
    else if (total <= 5000) { tier = "Medium"; how = "Rai checks the bid, then 3 random checkers. It's posted for 2 days and goes ahead unless enough members say it doesn't meet the criteria."; }
    else { tier = "Big"; how = "Rai checks the bid, then 3 random checkers, then members vote yes or no over 2 days."; }
    var over = total > cap;
    $("tier").className = "card tier" + (over ? " over" : "");
    $("tier").innerHTML = '<div class="spread"><b>' + tier + " project, " + fmt(total) + ' points</b><span class="chip' + (over ? " warn" : " ok") + '">' + (over ? "Too big for now" : "Within your cap") + "</span></div>" +
      '<p class="small" style="margin-top:6px">' + esc(how) + "</p>" +
      '<p class="small muted" style="margin-top:6px">Your cap: ' + fmt(cap) + " points. It's the lower of your track record (" + (rec ? "2 times your biggest finished project" : "500 for a new owner") + ", " + fmt(ownerCap) +
      ") and 10% of what's pledged each month here (" + fmt(areaCap) + "). The 10% limit goes away once the area reaches critical mass.</p>" +
      (over ? '<p class="small" style="margin-top:6px;color:var(--warn);font-weight:700">Split it: make the first milestones a smaller project now, and bid the rest after it checks out.</p>' : "");
  }

  // ---- Fill and wire up ----
  function useKind(i, fill) {
    kind = KINDS[i];
    $("kind-note").textContent = kind.note + (kind.type === "counts" ? " Measured by a count." : kind.type === "made" ? " Measured by something made or fixed." : " Measured by service over time.");
    var s = fill ? kind.sample : null;
    drawMeasure(s && s.m);
    if (s) {
      $("name").value = s.name; $("town").value = s.town; $("where").value = s.town ? "local" : "anywhere";
      $("outcome").value = s.outcome;
      setLines("ms", "ms", s.ms);
      setLines("labor", "labor", s.labor.map(function (r) { return [r[0], r[1], r[2], Math.round((kind.rate[0] + kind.rate[1]) / 2)]; }));
      setLines("mat", "mat", s.mat);
    }
    $("town-wrap").hidden = $("where").value === "anywhere";
    counts(); calc();
  }
  function counts() { $("outcome-n").textContent = $("outcome").value.length + "/280"; $("note-n").textContent = $("note").value.length + "/144"; }

  $("kind").addEventListener("change", function () { useKind(this.value, false); });
  $("fill").addEventListener("click", function () { useKind($("kind").value, true); });
  $("where").addEventListener("change", function () { $("town-wrap").hidden = this.value === "anywhere"; });
  $("add-ms").addEventListener("click", function () { addLine("ms", "ms"); });
  $("add-labor").addEventListener("click", function () { addLine("labor", "labor"); });
  $("add-mat").addEventListener("click", function () { addLine("mat", "mat"); });
  document.addEventListener("input", function () { counts(); calc(); });
  document.addEventListener("change", function (e) { if (e.target.id === "record" || e.target.id === "pledges") size(); });
  document.addEventListener("click", function (e) {
    if (e.target.classList.contains("x")) { e.target.closest(".line").remove(); calc(); }
  });

  // ---- What members see ----
  $("go").addEventListener("click", function () {
    var rows = [].map.call(document.querySelectorAll('[data-line="ms"]'), function (l) {
      return "<li>" + esc(f(l, "what").value || "(no description)") + ' <span class="muted small">' + f(l, "pts").value + " points, by day " + esc(f(l, "days").value || "?") + "</span></li>";
    }).join("");
    var lab = [].map.call(document.querySelectorAll('[data-line="labor"]'), function (l) {
      return esc(f(l, "what").value || "Work") + ": " + esc(f(l, "people").value || 0) + " x " + esc(f(l, "hours").value || 0) + " hrs at " + esc(f(l, "rate").value || 0);
    }).join("<br>");
    var where = $("where").value === "anywhere" ? "From anywhere" : ($("town").value || "Local");
    $("seen-card").innerHTML = '<div class="eyebrow">' + esc(kind.name.replace(/ \(.*\)/, "")) + " · " + esc(where) + "</div>" +
      "<h3>" + esc($("name").value || "Untitled project") + "</h3>" +
      "<p><b>Outcome:</b> " + esc($("outcome").value || "(not filled in)") + "</p>" +
      '<p class="small" style="margin-top:6px">' + measureText().map(function (m) { return "<b>" + esc(m[0]) + ":</b> " + esc(m[1]); }).join("<br>") + "</p>" +
      '<ol class="ms small">' + rows + "</ol>" +
      '<p class="small" style="margin-top:8px"><b>Open book:</b> ' + fmt(total) + " points. People and time " + fmt(labor) + ", materials " + fmt(mats) + ", margin " + esc($("margin").value) + "%.<br>" + lab + "</p>" +
      ($("note").value ? '<p class="small muted" style="margin-top:6px">Note: ' + esc($("note").value) + "</p>" : "") +
      '<div class="note" style="margin-top:12px"><b>Does it meet the criteria?</b> Is the outcome clear, can it be checked, and is the price in range?' +
      '<div class="vote"><button class="btn small" type="button" disabled>Yes</button><button class="btn small ghost" type="button" disabled>No</button></div>' +
      '<label class="field" style="margin:10px 0 0">Short comment <span class="count">0/144</span><input maxlength="144" placeholder="Optional. No uploads." disabled></label>' +
      '<p class="small muted" style="margin-top:6px">For debate, take it to Talk. Here it\'s only yes or no, plus a short comment.</p></div>';
    $("seen").hidden = false;
    $("seen").scrollIntoView({ behavior: "smooth" });
  });

  useKind(0, true);
})();
