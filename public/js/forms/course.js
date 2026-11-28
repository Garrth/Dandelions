(function () {
  var OTHER = "Other...";
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var n = function (x) { return Number(x).toLocaleString("en-US"); };
  function opts(list) { return list.map(function (o) { return "<option>" + esc(o) + "</option>"; }).join(""); }
  function each(sel, fn) { [].forEach.call(document.querySelectorAll(sel), fn); }
  function msRows(rows) { var t = 0; $("ms").innerHTML = rows.map(function (r) { t += r[2]; return '<tr><td class="ro">' + esc(r[0]) + '</td><td class="ro">' + esc(r[1]) + '</td><td style="color:var(--muted)">Not yet</td><td class="r ro">' + n(r[2]) + "</td></tr>"; }).join(""); $("total").textContent = n(t) + " points"; }
  var JOBS = ["Checker", "Jury", "Signer", "Moderator", "Support, rank 1", "Support, rank 2", "Support, rank 3", "Bounty hunter", "Coder", "Community organizer", "Spread the word", "Host", "Keeper", "Auditor", "Filings", OTHER];
  // Placeholders.
  var NEW = [["1. Outline", "Two people who hold the role", 50], ["2. Lessons and practice cases", "Two people who hold the role", 200], ["3. Test and question bank", "A checker", 100], ["4. Pilot: 5 learners take it, 4 pass", "Automatic", 150]];
  var UPD = [["1. Changes written", "Two people who hold the role", 50], ["2. Test updated", "A checker", 50]];
  function init() {
    $("job").innerHTML = opts(JOBS);
    $("price").innerHTML = NEW.concat([["Update after a rule change, total", "", 100]]).map(function (x) { return '<tr><td class="ro">' + esc(x[0].replace(/^\d\. /, "")) + '</td><td class="r ro">' + n(x[2]) + '</td><td class="ro">Weekly, as each step is checked</td></tr>'; }).join("");
  }
  function calc() {
    each("select", function (s) { var o = $(s.id + "Other"); if (o) o.hidden = s.value !== OTHER; });
    msRows($("kind").value === "New course" ? NEW : UPD);
  }
  var F = ["business","name","job","jobOther","kind","len","fmt","notes"];
  function collect() { var d = { agree: $("agree").checked, version: 1, updated: new Date().toISOString() }; F.forEach(function (x) { d[x] = $(x).value; }); return d; }
  function fill(d) { d = d || {}; F.forEach(function (x) { var e = $(x); if (e.tagName === "SELECT") { if (d[x]) e.value = d[x]; else e.selectedIndex = 0; } else e.value = d[x] || ""; }); $("agree").checked = !!d.agree; calc(); }
  var col = null, current = null, docs = [], saving = false, again = false, lastSaved = null, dirty = false;
  function status(t) { each(".st", function (e) { e.textContent = t; }); }
  function drawList() {
    $("list").innerHTML = docs.length ? "" : '<small style="color:var(--muted)">No saved forms yet.</small>';
    docs.forEach(function (s) {
      var d = s.data() || {}, b = document.createElement("button");
      b.type = "button"; b.className = "chipbtn" + (s.id === current ? " on" : "");
      b.textContent = (d.job || "Course") + ": " + (d.name || "untitled");
      b.addEventListener("click", function () { current = s.id; lastSaved = d; dirty = false; fill(d); drawList(); status(""); });
      $("list").appendChild(b);
    });
  }
  function save() {
    if (!col) { status("View only for now. Saving and sending open when points open."); return; }
    if (saving) { again = true; return; }
    saving = true; status("Saving...");
    var data = collect(), ref = current ? col.doc(current) : col.doc();
    current = ref.id;
    ref.set(data).then(function () { lastSaved = data; dirty = false; status("Saved " + new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) + "."); })
      .catch(function (e) { status("Didn't save (" + (e && e.code || "error") + "). Try Save again."); })
      .then(function () { saving = false; if (again) { again = false; save(); } });
  }
  $("f").addEventListener("input", function () { calc(); if (!dirty) { dirty = true; status("Unsaved changes."); } });
  $("f").addEventListener("change", calc);
  $("f").addEventListener("submit", function (e) { e.preventDefault(); save(); });
  each(".cancel", function (b) { b.addEventListener("click", function () { fill(lastSaved); dirty = false; status(lastSaved ? "Changes undone. Back to the last save." : "Cleared."); }); });
  init(); fill();
  status("");
})();
