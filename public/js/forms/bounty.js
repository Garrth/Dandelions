(function () {
  var OTHER = "Other...";
  var BUSINESSES = [{ name: "Your business", county: "", chips: ["Your checks show here when you're signed in"] }];
  var WHERE = ["Website", "Ask Rai", "Talk", "Directory", "Log in or ID check", "Wallet or points", "Emails or texts", "Phone app", OTHER];
  var WHAT = ["Security hole", "Points or ledger mistake", "Private info showing", "A way to cheat or game it", "Something broken", "Wrong or confusing words", OTHER];
  // Prices are placeholders.
  var SEV = [
    ["Critical", 200, "Could take points, take over accounts or show private info to anyone."],
    ["High", 100, "Could do harm, but only in some cases or with a lot of work."],
    ["Medium", 50, "A real problem, but no points or private info at risk."],
    ["Low", 20, "Small things: broken buttons, wrong words, odd layouts."]
  ];
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  function opts(list) { return list.map(function (o) { return "<option>" + esc(o) + "</option>"; }).join(""); }
  function each(sel, fn) { [].forEach.call(document.querySelectorAll(sel), fn); }
  $("business").innerHTML = opts(BUSINESSES.map(function (b) { return b.name; }));
  $("where").innerHTML = opts(WHERE); $("what").innerHTML = opts(WHAT);
  $("sev").innerHTML = opts(SEV.map(function (x) { return x[0]; }));
  $("price").innerHTML = SEV.map(function (x) { return '<tr><td class="ro">' + x[0] + '</td><td class="r ro">' + x[1].toLocaleString("en-US") + '</td><td class="ro">problem found</td><td class="ro">When confirmed</td></tr>'; }).join("");
  $("ownerChips").innerHTML = BUSINESSES[0].chips.map(function (c) { return '<span class="chip">' + esc(c) + "</span>"; }).join("");
  function calc() {
    var x = SEV.filter(function (r) { return r[0] === $("sev").value; })[0] || SEV[0];
    $("sevdesc").textContent = x[2] + " Price " + x[1].toLocaleString("en-US") + " points.";
    $("payAt").textContent = x[1].toLocaleString("en-US");
    $("whereOther").hidden = $("where").value !== OTHER;
    $("whatOther").hidden = $("what").value !== OTHER;
  }
  var F = ["business", "name", "where", "whereOther", "what", "whatOther", "sev", "device", "again", "steps", "proof", "notes"];
  function collect() { var d = { agree: $("agree").checked, version: 1, updated: new Date().toISOString() }; F.forEach(function (x) { d[x] = $(x).value; }); return d; }
  function fill(d) {
    d = d || {};
    F.forEach(function (x) { var e = $(x); if (e.tagName === "SELECT") { if (d[x]) e.value = d[x]; else e.selectedIndex = x === "sev" ? 2 : 0; } else e.value = d[x] || ""; });
    $("agree").checked = !!d.agree; calc();
  }
  var col = null, current = null, docs = [], saving = false, again = false, lastSaved = null, dirty = false;
  function status(t) { each(".st", function (e) { e.textContent = t; }); }
  function drawList() {
    $("list").innerHTML = docs.length ? "" : '<small style="color:var(--muted)">No saved reports yet.</small>';
    docs.forEach(function (s) {
      var d = s.data() || {}, b = document.createElement("button");
      b.type = "button"; b.className = "chipbtn" + (s.id === current ? " on" : "");
      b.textContent = (d.sev || "") + ": " + (d.name || "untitled");
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
  fill();
  status("");
})();
