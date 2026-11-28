(function () {
  var OTHER = "Other...";
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var n = function (x) { return Number(x).toLocaleString("en-US"); };
  function opts(list) { return list.map(function (o) { return "<option>" + esc(o) + "</option>"; }).join(""); }
  function each(sel, fn) { [].forEach.call(document.querySelectorAll(sel), fn); }
  function msRows(rows) { var t = 0; $("ms").innerHTML = rows.map(function (r) { t += r[2]; return '<tr><td class="ro">' + esc(r[0]) + '</td><td class="ro">' + esc(r[1]) + '</td><td style="color:var(--muted)">Not yet</td><td class="r ro">' + n(r[2]) + "</td></tr>"; }).join(""); $("total").textContent = n(t) + " points"; }
  var KIND = ["Bug fix", "Security fix (from a bounty)", "New feature", "Review someone's change", "Rai's notes or numbers", "Upkeep (updates and services)", "Ledger and chain", OTHER];
  var PART = ["Website", "Ask Rai", "Talk", "Directory", "Log in or ID check", "Wallet or points", "Database", "Email and texts", "Phone app", OTHER];
  // Placeholders, about 50 points an hour.
  var SIZE = [["Small", 100, 25, "Under 2 hours. A word change, a small bug, one button."], ["Medium", 400, 100, "About a day. A new box on a form, a bug across a few pages."], ["Too big", 0, 0, "More than a day. Split it into Medium pieces, one form each."]];
  function init() {
    $("kind").innerHTML = opts(KIND); $("part").innerHTML = opts(PART); $("size").innerHTML = opts(SIZE.map(function (x) { return x[0]; }));
    $("price").innerHTML = SIZE.slice(0, 2).map(function (x) { return '<tr><td class="ro">' + x[0] + '</td><td class="r ro">' + n(x[1]) + '</td><td class="r ro">' + n(x[2]) + '</td><td class="ro">When it goes live</td></tr>'; }).join("");
  }
  function calc() {
    each("select", function (s) { var o = $(s.id + "Other"); if (o) o.hidden = s.value !== OTHER; });
    var s = SIZE.filter(function (x) { return x[0] === $("size").value; })[0] || SIZE[0], rev = $("kind").value === "Review someone's change";
    $("sizedesc").textContent = s[3];
    msRows(rev ? [["1. Claim the review", "Automatic", 0], ["2. Review notes posted", "The coder who made it", 0], ["3. Approved and live", "A signer, if it touches points", s[2]]]
               : [["1. Claim the job", "Automatic", 0], ["2. Change ready, with notes", "You", 0], ["3. Reviewed by a different coder", "A second coder", 0], ["4. Live on the site", "A signer, if it touches points", s[1]]]);
  }
  var F = ["business","name","kind","kindOther","part","partOther","size","link","notes"];
  function collect() { var d = { agree: $("agree").checked, version: 1, updated: new Date().toISOString() }; F.forEach(function (x) { d[x] = $(x).value; }); return d; }
  function fill(d) { d = d || {}; F.forEach(function (x) { var e = $(x); if (e.tagName === "SELECT") { if (d[x]) e.value = d[x]; else e.selectedIndex = 0; } else e.value = d[x] || ""; }); $("agree").checked = !!d.agree; calc(); }
  var col = null, current = null, docs = [], saving = false, again = false, lastSaved = null, dirty = false;
  function status(t) { each(".st", function (e) { e.textContent = t; }); }
  function drawList() {
    $("list").innerHTML = docs.length ? "" : '<small style="color:var(--muted)">No saved forms yet.</small>';
    docs.forEach(function (s) {
      var d = s.data() || {}, b = document.createElement("button");
      b.type = "button"; b.className = "chipbtn" + (s.id === current ? " on" : "");
      b.textContent = (d.kind || "Job") + ": " + (d.name || "untitled");
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
