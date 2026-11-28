(function () {
    var BUSINESSES = [{ name: "Your business", county: "", chips: ["Your checks show here when you're signed in"] }];
    // Prices are placeholders, about 50 points an hour of work.
  // Prices are placeholders.
  var KINDS = {
    "Host": { done: "Days online", term: ["6 months", "1 year"],
      how: "All online. Your copy runs on your own server or storage. It's checked automatically every day.",
      desc: "Keep a full, up-to-date copy of the charter and the site online, so Dandelions never depends on one computer or one company. Hosts are spread across different places and providers.",
      needs: ["ID checked", "Verified business", "A server or storage you control", "Host course and test passed"],
      price: [["Copy online all month (99% of the time)", 100, "month", "Monthly"], ["Update pushed to your copy within 24 hours", 5, "update", "Monthly"]],
      note: "A month under 99% online pays nothing for that month. Three missed months and the term ends." },
    "Keeper": { done: "Results applied", term: ["1 year"],
      how: "All online. Work comes when a vote passes.",
      desc: "When members pass a vote, apply the result: update the charter or rules, archive the old version, and push the new one to every host. A second keeper checks each change before it goes out. Keepers never decide anything; they carry out what members voted.",
      needs: ["ID checked", "Verified business", "1 year on Dandelions", "Fully vetted by members who can vet others", "Keeper course and test passed", "No open disputes"],
      price: [["Vote result applied and pushed to hosts", 50, "result", "Monthly"], ["Second keeper check", 15, "check", "Monthly"]],
      note: "Paid once the change matches the vote and every host has it. Applying something members didn't vote for ends the term." },
    "Auditor": { done: "Audits done", term: ["1 year"],
      how: "All online. Each audit is assigned at random, never one you're tied to.",
      desc: "Check the books. Make sure points created match approved, verified work, and that the daily caps held. Audit random finished projects from start to payment. Publish a plain-language report every quarter.",
      needs: ["ID checked", "Verified business", "Bookkeeping or audit experience", "Auditor course and test passed", "No open disputes"],
      price: [["Quarterly ledger audit, report published", 300, "report", "When published"], ["Project audit, start to payment", 50, "project", "Monthly"]],
      note: "Auditors are paid the same whatever they find. Finding a problem is the job, not a failure." },
    "Filings": { done: "Filings done", term: ["1 year"],
      how: "Mostly online. Some filings may need mail or a visit.",
      desc: "Keep the DAO's legal and government paperwork current: the yearly state report, the registered agent, tax forms, and the public records of members' votes. File on time and post a copy for members.",
      needs: ["ID checked", "Verified business", "Bookkeeping or paperwork experience", "Filings course and test passed"],
      price: [["Filing done on time, copy posted", 50, "filing", "Monthly"], ["Records brought up to date", 25, "month", "Monthly"]],
      note: "State and government fees are paid separately, not out of your price. A late filing pays nothing." }
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
    $("h1").textContent = $("kind").value;
    $("kdesc").textContent = d.desc;
    $("needs").innerHTML = d.needs.map(function (n) { return '<span class="chip">' + esc(n) + "</span>"; }).join("");
    $("name").placeholder = "Like: " + $("kind").value + ", Sonoma County, winter term";
    $("doneLabel").textContent = d.done;
    $("how").textContent = d.how;
    if (!keep) $("term").innerHTML = opts(d.term);
    $("price").innerHTML = d.price.map(function (p) { return '<tr><td class="ro">' + esc(p[0]) + '</td><td class="r ro">' + (typeof p[1] === "number" ? fmt(p[1]) : esc(p[1])) + '</td><td class="ro">' + esc(p[2]) + '</td><td class="ro">' + esc(p[3]) + "</td></tr>"; }).join("");
    $("msNote").textContent = d.note;
  }
  function calc() {
    var s = $("start").value, rows = [], n = 1;
    if (s) {
      var st = new Date(s + "T12:00:00"), now = new Date();
      n = Math.min(12, Math.max(1, (now.getFullYear() - st.getFullYear()) * 12 + now.getMonth() - st.getMonth() + (now.getDate() >= st.getDate() ? 1 : 0)));
    }
    for (var i = 0; i < n; i++) {
      var dt = '<span style="color:var(--muted)">Pick a start date</span>';
      if (s) { var x = new Date(s + "T12:00:00"); x.setMonth(x.getMonth() + i); dt = x.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
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
      start: $("start").value, ties: $("ties").value, notes: $("notes").value,
      version: 2, updated: new Date().toISOString() };
  }
  function fill(d) {
    d = d || {};
    $("kind").value = KINDS[d.kind] ? d.kind : "Host";
    drawKind(false);
    ["name", "county", "start", "ties", "notes"].forEach(function (x) { $(x).value = d[x] || ""; });
    if (d.term) $("term").value = d.term;
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
  try {
    var want = new URLSearchParams(location.search).get("kind");
    var ks = $("kind"); if (want && [].some.call(ks.options, function (o) { return o.value === want; })) { ks.value = want; ks.dispatchEvent(new Event("change", { bubbles: true })); }
  } catch (e) {}
  status("");
})();
