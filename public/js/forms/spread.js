(function () {
    var BUSINESSES = [{ name: "Your business", county: "", chips: ["Your checks show here when you're signed in"] }];
    // Prices are placeholders, about 50 points an hour of work.
  var KINDS = {
    "Spread the word": { done: "Sign-ups",
      desc: "Posts, videos, articles, local news, ads or a sign-up table. You choose where and how. Be honest: no fake accounts, no paid clicks, no spam.",
      needs: ["ID checked", "Verified business", "Your own share link (made for you)"],
      price: [["Site visit from your link", 0.1, "visit", "Weekly"], ["ID-checked member who pledges 100 or more", 10, "member", "Weekly"], ["Verified business that pledges 500 or more", 50, "business", "Weekly"]],
      note: "Visits and sign-ups are tallied from your share link and paid weekly." }
  };

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var fmt = function (n) { return (Math.round(n * 100) / 100).toLocaleString("en-US"); };
  function opts(list, sel) { return list.map(function (o) { return "<option" + (String(o) === String(sel) ? " selected" : "") + ">" + esc(o) + "</option>"; }).join(""); }
  function each(sel, fn) { [].forEach.call(document.querySelectorAll(sel), fn); }
  $("kind").innerHTML = opts(Object.keys(KINDS));
  $("business").innerHTML = opts(BUSINESSES.map(function (b) { return b.name; }));
  function k() { return KINDS[$("kind").value]; }

  function drawKind(keep) {
    var d = k();
    
    $("kdesc").textContent = d.desc;
    $("needs").innerHTML = d.needs.map(function (n) { return '<span class="chip">' + esc(n) + "</span>"; }).join("");
    $("name").placeholder = "Like: Sonoma farmers market table, winter";
    $("doneLabel").textContent = d.done;
    $("price").innerHTML = d.price.map(function (p) { return '<tr><td class="ro">' + esc(p[0]) + '</td><td class="r ro">' + (typeof p[1] === "number" ? fmt(p[1]) : esc(p[1])) + '</td><td class="ro">' + esc(p[2]) + '</td><td class="ro">' + esc(p[3]) + "</td></tr>"; }).join("");
    $("msNote").textContent = d.note;
  }
  function calc() {
    var s = $("start").value, rows = [], n = 1;
    if (s) {
      var st = new Date(s + "T12:00:00"), now = new Date();
      n = Math.min(13, Math.max(1, Math.floor((now - st) / 864e5 / 7) + 1));
    }
    for (var i = 0; i < n; i++) {
      var dt = '<span style="color:var(--muted)">Pick a start date</span>';
      if (s) { var x = new Date(s + "T12:00:00"); x.setDate(x.getDate() + i * 7); dt = x.toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
      rows.push("<tr><td>" + (i + 1) + "</td><td>" + dt + '</td><td class="r">0</td><td class="r">0</td></tr>');
    }
    $("ms").innerHTML = rows.join("");
    $("total").textContent = "0 points";
  }
  function owner() {
    var b = BUSINESSES[0];
    $("ownerChips").innerHTML = b.chips.map(function (c) { return '<span class="chip">' + esc(c) + "</span>"; }).join("");
    if (!$("county").value) $("county").value = b.county;
  }
  function collect() {
    return { business: $("business").value, kind: $("kind").value, name: $("name").value, county: $("county").value, term: $("term").value,
      start: $("start").value, how: $("how").value, notes: $("notes").value,
      version: 2, updated: new Date().toISOString() };
  }
  function fill(d) {
    d = d || {};
    $("kind").value = "Spread the word";
    drawKind(false);
    ["name", "county", "start", "ties", "notes"].forEach(function (x) { $(x).value = d[x] || ""; });
    if (d.how) $("how").value = d.how;
    owner(); calc();
  }
  var col = null, current = null, docs = [], saving = false, again = false, lastSaved = null, dirty = false;
  function status(t) { each(".st", function (e) { e.textContent = t; }); }
  function changed() { if (!dirty) { dirty = true; status("Unsaved changes."); } }
  function drawList() {
    $("list").innerHTML = docs.length ? "" : '<small style="color:var(--muted)">No saved forms yet.</small>';
    docs.forEach(function (s) {
      var d = s.data() || {}, b = document.createElement("button");
      b.type = "button"; b.className = "chipbtn" + (s.id === current ? " on" : "");
      b.textContent = (d.kind || "Form") + ": " + (d.name || "untitled");
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
  $("f").addEventListener("input", function () { calc(); changed(); });
  $("f").addEventListener("change", function (e) { if (e.target.id === "kind") drawKind(false); calc(); changed(); });
  $("f").addEventListener("submit", function (e) { e.preventDefault(); save(); });
  each(".cancel", function (b) { b.addEventListener("click", function () { fill(lastSaved); dirty = false; status(lastSaved ? "Changes undone. Back to the last save." : "Cleared."); }); });
  fill();
  status("");
})();
