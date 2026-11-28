(function () {
    var BUSINESSES = [{ name: "Your business", county: "", chips: ["Your checks show here when you're signed in"] }];
    // Prices are placeholders, about 50 points an hour of work.
  var KINDS = {
    "Checker": { done: "Checks done",
      desc: "Check project plans before they start, and progress at each milestone. You're picked at random, so you never choose what you check. All checks are online, with a checklist that takes at least 5 to 10 minutes. If a red flag goes off, you may do a site visit, by video call on the owner's phone or in person.",
      needs: ["ID checked", "Verified business", "Checker course and test passed", "No open disputes"],
      price: [["Plan check", 15, "check", "Weekly"], ["Milestone check", 15, "check", "Weekly"], ["Site visit by video call", 30, "visit", "Weekly"], ["Site visit in person", 60, "visit", "Weekly"]],
      note: "At most 6 checks an hour. A random share of your checks are checked again. Paid weekly." },
    "Jury": { done: "Cases done",
      desc: "Settle disputes as one of a random panel of vetted members. Read both sides, ask questions, and vote. Your vote stays secret.",
      needs: ["ID checked", "Verified business", "6 months on Dandelions", "Jury course and test passed", "No open disputes"],
      price: [["Case decided", 50, "case", "When the case closes"]],
      note: "Paid when each case closes, whatever the ruling." },
    "Signer": { done: "Signings done",
      desc: "Picked at random to co-sign anything that creates points or changes the rules, after checking it matches what was approved. If something looks wrong, you refuse and flag it.",
      needs: ["ID checked", "Verified business", "Fully vetted by members who can vet others", "Security key or wallet set up", "Signer course and test passed", "No open disputes"],
      price: [["Signing, checked", 50, "signing", "Weekly"]],
      note: "Paid weekly, the same whether you sign or refuse." },
    "Moderator": { done: "Comments and actions",
      desc: "Keep Talk kind and useful, and join the conversation. Hide posts that break the rules, move posts to the right topic, and help people find answers. Wear the moderator badge.",
      needs: ["ID checked", "Verified business", "Agrees with the charter", "Moderator course and test passed"],
      price: [["Comment, reply or question in Talk", 2, "comment", "Weekly"], ["Moderation action", 2, "action", "Weekly"]],
      note: "At most 40 paid comments and actions an hour. A comment counts only if it's at least a sentence or two and isn't a copy of another post. Every one carries the moderator badge and is in the public log. A random share are checked again. Paid weekly." },
    "Support": { done: "Chats done",
      desc: "Live chat with members who want a person instead of Rai, like stuck ID checks, account problems and wrong phone numbers. Turn on I'm available, and chats come to you one at a time. Never ask for passwords or ID photos.",
      needs: ["ID checked", "Verified business", "Support course and test passed (thorough)", "Solved rate 80% or higher"],
      price: [["Chat, first 5 minutes", 5, "chat", "Weekly"], ["Each minute after that, by rank", "1 to 2", "minute", "Weekly"], ["Most for one chat", 30, "chat", "Weekly"]],
      note: "One chat at a time. A chat is solved when the member says so. Keep 80% solved over your last 50 chats: below that you're paused until you retake the course. 95% and up gets first pick of chats. Paid weekly." }
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
    ["rankH", "rankT", "rankN"].forEach(function (x) { $(x).hidden = $("kind").value !== "Support"; });
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
      start: $("start").value, ties: $("ties").value, notes: $("notes").value,
      version: 2, updated: new Date().toISOString() };
  }
  function fill(d) {
    d = d || {};
    $("kind").value = KINDS[d.kind] ? d.kind : "Checker";
    drawKind(false);
    ["name", "county", "start", "ties", "notes"].forEach(function (x) { $(x).value = d[x] || ""; });
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
