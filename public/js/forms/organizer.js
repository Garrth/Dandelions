(function () {
  var OTHER = "Other...";
  var BUSINESSES = [{ name: "Your business", county: "", chips: ["Your checks show here when you're signed in"] }];
  // Set prices: [item, price, per, when paid]. Placeholders until members vote.
  var KINDS = {
    "Meetup": { desc: "A small, regular get-together where members and local business owners meet, talk and find out where points can be used. Coffee, a walk, a game night, a work session: whatever brings people back. Try new things and share what works with other organizers on Talk.", often: "Every week", name: "Like: Thursday coffee meetup at Acme Cafe", goalLabel: "Goal: members who check in, each time", goals: [5, 10, 15, 25, 50],
      price: [["Member who checks in", 5, "check-in", "At the end of each meetup"]],
      note: "Paid at the end of each meetup, for members who check in on their phone. You front your own costs. A checker may come to any meetup." },
    "Event": { desc: "A bigger one-time gathering, or a booth at someone else's, like a farmers market, fair, food truck night or college event. Make Dandelions visible, show where points can be used, and help people sign up. You front the costs, like a promoter.", often: "One time", name: "Like: Food truck night at the college", goalLabel: "Goal: members who check in, each time", goals: [25, 50, 100, 250, 500],
      price: [["Member who checks in", 5, "check-in", "At the end of the event"]],
      note: "Paid at the end of the event, for members who check in on their phone. You front the costs, like a promoter. A checker may come to any event." },
    "Business outreach": { desc: "Check in with local businesses that accept points, in person when you can. Find out how points are working for them, help them find places to spend more (vendors, employees, other local businesses), and show them what's coming, like job training. Be helpful, not pushy. No cold calls.", often: "Every week", name: "Like: Downtown Petaluma restaurants", goalLabel: "Goal: business meetings, each week", goals: [3, 5, 10, 15, 20],
      price: [["Business meeting, verified", 25, "meeting", "Weekly"], ["Business adds to its pledge (held 2 months)", 5, "100 added", "Monthly, on top"]],
      note: "Paid weekly for verified meetings. A checker calls some of the businesses to confirm. Pledge raises are paid monthly, on top. Points at goal count meetings only." },
    "Spread the word": { sw: true }
  };
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var fmt = function (n) { return (Math.round(n * 100) / 100).toLocaleString("en-US"); };
  function opts(list, sel) { return list.map(function (o) { return "<option" + (String(o) === String(sel) ? " selected" : "") + ">" + esc(o) + "</option>"; }).join(""); }
  function each(sel, fn) { [].forEach.call(document.querySelectorAll(sel), fn); }
  $("kind").innerHTML = opts(Object.keys(KINDS));
  $("business").innerHTML = opts(BUSINESSES.map(function (b) { return b.name; }));
  function k() { return KINDS[$("kind").value]; }
  function biz() { return BUSINESSES[0]; }

  function drawKind(keep) {
    var d = k(), sw = !!d.sw, outreach = $("kind").value === "Business outreach";
    each(".main", function (e) { e.hidden = sw; });
    each(".sw", function (e) { e.hidden = !sw; });
    if (sw) return;
    each(".ev", function (e) { e.hidden = outreach; });
    each(".ob", function (e) { e.hidden = !outreach; });
    $("locHead").textContent = outreach ? "Where you'll meet" : "Event location";
    $("name").placeholder = d.name;
    $("kdesc").textContent = d.desc;
    $("goalLabel").textContent = d.goalLabel;
    if (!keep) {
      $("often").value = d.often;
      $("goal").innerHTML = opts(d.goals.concat(OTHER), d.goals[2]);
      $("goalOther").hidden = true;
    }
    $("price").innerHTML = d.price.map(function (p) { return '<tr><td class="ro">' + esc(p[0]) + '</td><td class="r ro">' + fmt(p[1]) + '</td><td class="ro">' + esc(p[2]) + '</td><td class="ro">' + esc(p[3]) + "</td></tr>"; }).join("");
    $("msNote").textContent = d.note;
  }
  function goal() { return $("goal").value === OTHER ? (parseInt($("goalOther").value, 10) || 0) : parseInt($("goal").value, 10) || 0; }
  function dates() {
    var s = $("start").value, f = $("finish").value, o = $("often").value, out = [];
    if (!s) return [""];
    if (o === "One time") return [s];
    var step = o === "Every week" ? 7 : o === "Every 2 weeks" ? 14 : 0, d = new Date(s + "T12:00:00"), end = f ? new Date(f + "T12:00:00") : null;
    while (out.length < 26) {
      out.push(d.toISOString().slice(0, 10));
      if (step) d.setDate(d.getDate() + step); else d.setMonth(d.getMonth() + 1);
      if (!end || d > end) break;
    }
    return out;
  }
  function calc() {
    var d = k(); if (d.sw) return;
    $("finWrap").hidden = $("often").value === "One time";
    $("goalOther").hidden = $("goal").value !== OTHER;
    var per = goal() * d.price[0][1], list = dates();
    $("each").textContent = fmt(per) + " points";
    $("ms").innerHTML = list.map(function (dt, i) {
      return "<tr><td>" + (i + 1) + "</td><td>" + (dt ? esc(new Date(dt + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })) : '<span style="color:var(--muted)">Pick a start date</span>') +
        '</td><td class="r">' + fmt(goal()) + '</td><td class="r">' + fmt(per) + '</td><td style="color:var(--muted)">Not yet</td><td class="r" style="color:var(--muted)">0</td></tr>';
    }).join("");
    $("total").textContent = fmt(per * list.length) + " points";
  }
  function owner() {
    var b = biz();
    $("ownerChips").innerHTML = b.chips.map(function (c) { return '<span class="chip">' + esc(c) + "</span>"; }).join("");
    if (!$("county").value) $("county").value = b.county;
  }

  function collect() {
    return { business: $("business").value, kind: $("kind").value, name: $("name").value, venue: $("venue").value, address: $("address").value, meet: $("meet").value,
      county: $("county").value, often: $("often").value, start: $("start").value, finish: $("finish").value, goal: $("goal").value, goalOther: $("goalOther").value,
      bizList: $("bizList").value, notes: $("notes").value, total: $("total").textContent, version: 1, updated: new Date().toISOString() };
  }
  function fill(d) {
    d = d || {};
    $("kind").value = KINDS[d.kind] ? d.kind : "Meetup";
    drawKind(false);
    ["name", "venue", "address", "county", "start", "finish", "bizList", "notes", "goalOther"].forEach(function (x) { $(x).value = d[x] || ""; });
    if (d.meet) $("meet").value = d.meet; else $("meet").selectedIndex = 0;
    if (d.often) $("often").value = d.often;
    if (d.goal) $("goal").value = d.goal;
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
