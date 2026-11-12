// Baselines: the shared starting points Dandelions measures itself against. Anyone can read them.
// Members propose changes. Each proposal gets a post in the Baselines topic in Talk, where +1s send it to a
// discussion and then a vote. Only ID-checked members vote. Rai writes the final wording, members check it
// in one last vote, and the baseline updates on its own. Nobody approves anything by hand.
(function () {
  var cfg = window.DANDELIONS_CONFIG || {};
  var box = document.getElementById("bl");
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function toast(text) {
    var t = document.createElement("div");
    t.className = "toast"; t.textContent = text;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2800);
  }
  function day(iso) { return iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""; }
  function dayTime(iso) { return iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : ""; }
  if (!window.supabase) { box.innerHTML = '<p class="note">Something didn\'t load. Please refresh the page.</p>'; return; }
  var db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);

  // ---- A small, safe Markdown reader: paragraphs, **bold**, lists, tables and site links ----
  function inline(s) {
    return esc(s)
      .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
      .replace(/\[([^\]]+)\]\((\/[\w\-./?=&#]*|https:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>');
  }
  function md(text) {
    var blocks = String(text || "").replace(/\r/g, "").split(/\n\s*\n/), out = [];
    blocks.forEach(function (b) {
      var lines = b.split("\n").filter(function (l) { return l.trim(); });
      if (!lines.length) return;
      if (lines.every(function (l) { return /^\s*\|/.test(l); })) {
        var rows = lines.filter(function (l) { return !/^\s*\|[\s:|-]+\|\s*$/.test(l); }).map(function (l) {
          return l.trim().replace(/^\||\|$/g, "").split("|").map(function (c) { return c.trim(); });
        });
        out.push('<div class="bl-table"><table><thead><tr>' + rows[0].map(function (c) { return "<th>" + inline(c) + "</th>"; }).join("") + "</tr></thead><tbody>" +
          rows.slice(1).map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + inline(c) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div>");
      } else if (lines.every(function (l) { return /^\s*[-*] /.test(l); })) {
        out.push("<ul>" + lines.map(function (l) { return "<li>" + inline(l.replace(/^\s*[-*] /, "")) + "</li>"; }).join("") + "</ul>");
      } else if (lines.every(function (l) { return /^\s*\d+[.)] /.test(l); })) {
        out.push("<ol>" + lines.map(function (l) { return "<li>" + inline(l.replace(/^\s*\d+[.)] /, "")) + "</li>"; }).join("") + "</ol>");
      } else if (lines.length === 1 && /^#{1,4} /.test(lines[0])) {
        out.push("<h3>" + inline(lines[0].replace(/^#+ /, "")) + "</h3>");
      } else {
        out.push("<p>" + lines.map(inline).join("<br>") + "</p>");
      }
    });
    return '<div class="bl-md">' + out.join("") + "</div>";
  }

  var ERR = {
    not_signed_in: "Log in first.",
    id_check_needed: "Only ID-checked members can vote. Check your ID on your profile.",
    baseline_summary: "Say in a sentence what changes and why (at least 10 characters).",
    baseline_body: "The new wording needs to be between 20 and 8,000 characters.",
    baseline_same: "The new wording is the same as now. Change something first.",
    baseline_open: "You already have a change open for this baseline. One at a time.",
    baseline_wait: "Your last change to this baseline didn't pass. You can propose again 30 days after it closed.",
    baseline_limit: "That's the most proposals for one day. Try again tomorrow.",
    baseline_not_voting: "Voting isn't open for this one right now.",
    talk_rules: "Agree to the Talk rules first. Open Talk, tap Post, and agree. Then come back.",
    talk_paused: "A moderator paused your posting for a while.",
    talk_limit: "That's the most posts for one day. Try again tomorrow."
  };
  function errText(e) {
    var m = (e && e.message) || "";
    for (var k in ERR) if (m.indexOf(k) >= 0) return ERR[k];
    return "Couldn't save just now. Try again.";
  }

  var board = null, user = null, writerAsked = false;
  var STEPS = [["support", "Support"], ["discuss", "Discuss"], ["vote", "Vote"], ["writing", "Final wording"], ["final", "Final check"]];
  function baseline(key) { return (board.baselines || []).filter(function (b) { return b.key === key; })[0]; }
  function proposal(id) { return (board.proposals || []).filter(function (p) { return p.id === id; })[0]; }
  function isOpen(p) { return p.status !== "passed" && p.status !== "failed"; }

  function joinBox(what) {
    try { localStorage.setItem("dandelions_return", location.pathname + location.search); } catch (e) {}
    return '<div class="note">Log in to ' + esc(what) + '. Anyone can read.<div class="row" style="margin-top:8px"><a class="btn small" href="/app/login.html">Log in</a><a class="btn ghost small" href="/#pledge">New here? Pledge first</a></div></div>';
  }
  function idBox() {
    return '<div class="note">Only ID-checked members vote, so every vote is one real person. <a href="/app/profile.html">Check your ID on your profile</a>.</div>';
  }

  // ---- Moving around: everything is in the address, so links and Back work ----
  function go(q) {
    var s = new URLSearchParams(q).toString();
    history.pushState(null, "", location.pathname + (s ? "?" + s : ""));
    route();
    window.scrollTo(0, 0);
  }
  window.addEventListener("popstate", route);
  box.addEventListener("click", function (e) {
    var a = e.target.closest("a[data-nav]");
    if (!a || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    go(Object.fromEntries(new URLSearchParams(a.getAttribute("href").split("?")[1] || "")));
  });
  function route() {
    var q = new URLSearchParams(location.search);
    if (q.get("p") && proposal(q.get("p"))) return showProposal(proposal(q.get("p")));
    if (q.get("propose") !== null) return showPropose(q.get("propose"));
    showHome(baseline(q.get("b")) ? q.get("b") : (board.baselines[0] || {}).key);
  }

  // ---- Home: the baselines, the changes in progress, and how it works ----
  function steps(p) {
    var at = STEPS.map(function (x) { return x[0]; }).indexOf(p.status);
    if (p.status === "passed") at = STEPS.length;
    return '<ol class="bl-steps" aria-label="Steps">' + STEPS.map(function (x, i) {
      var cls = p.status === "failed" ? "" : i < at ? "done" : i === at ? "now" : "";
      return '<li class="' + cls + '">' + esc(x[1]) + "</li>";
    }).join("") + "</ol>";
  }
  function stateLine(p) {
    var s = board.settings;
    switch (p.status) {
      case "support": return "Gathering support: <b>" + p.support + " of " + s.support_needed + "</b> +1s to start the discussion.";
      case "discuss": return "Discussion in Talk until <b>" + day(p.discuss_until) + "</b>. The vote opens after that.";
      case "vote": return "Voting until <b>" + dayTime(p.vote_until) + "</b>. " + p.ballots + " vote" + (p.ballots === 1 ? "" : "s") + " so far. Results show when it closes.";
      case "writing": return "It passed the vote (" + p.yes + " yes, " + p.no + " no, " + p.pass + " pass). Rai is writing the final wording now.";
      case "final": return "Final check until <b>" + dayTime(p.final_until) + "</b>. " + p.ballots + " vote" + (p.ballots === 1 ? "" : "s") + " so far." + (p.final_round > 1 ? " Rewrite " + (p.final_round - 1) + "." : "");
      case "passed": return "Passed " + day(p.closed_at) + ". Vote: " + p.yes + " yes, " + p.no + " no, " + p.pass + " pass. Final check: " + p.final_yes + " yes, " + p.final_no + " no. " + esc(p.result_note) + ".";
      case "failed": return "Didn't pass" + (p.closed_at ? " (" + day(p.closed_at) + ")" : "") + ": " + esc(p.result_note) + "." + (p.yes || p.no || p.pass ? " Vote: " + p.yes + " yes, " + p.no + " no, " + p.pass + " pass." : "");
    }
    return "";
  }
  function propCard(p) {
    var b = baseline(p.baseline_key) || {};
    return '<a class="card bl-prop" data-nav href="?p=' + p.id + '">' +
      '<span class="eyebrow">' + esc(b.title) + " · by " + esc(p.author_name) + " · " + day(p.created_at) + "</span>" +
      '<span class="bl-sum">' + esc(p.summary) + "</span>" + steps(p) + '<span class="small">' + stateLine(p) + "</span></a>";
  }
  function showHome(key) {
    var b = baseline(key), open = board.proposals.filter(isOpen), done = board.proposals.filter(function (p) { return !isOpen(p); });
    var mineHere = board.proposals.filter(function (p) { return p.baseline_key === key && isOpen(p); });
    document.title = "Baselines | Dandelions";
    box.innerHTML =
      '<div class="page-head"><div class="eyebrow">Baselines</div><h1>Where we\'re starting from.</h1>' +
      '<p class="muted" style="margin-top:8px">Baselines are the shared starting points Dandelions measures itself against. Members change them together, and Rai reads them when it answers questions and looks at projects.</p></div>' +
      '<div class="bl-tabs" role="tablist">' + board.baselines.map(function (x) {
        return '<a role="tab" data-nav href="?b=' + x.key + '"' + (x.key === key ? ' aria-selected="true"' : "") + ">" + esc(x.title.replace(/ \(.*\)$/, "")) + "</a>";
      }).join("") + "</div>" +
      '<article class="card bl-base"><h2>' + esc(b.title) + "</h2>" +
      '<p class="small muted">Version ' + b.version + " · updated " + day(b.updated_at) + "</p>" + md(b.body) +
      '<div class="row" style="margin-top:14px"><a class="btn small" data-nav href="?propose=' + b.key + '">Propose a change</a>' +
      (mineHere.length ? '<a class="btn ghost small" data-nav href="?p=' + mineHere[0].id + '">Change in progress</a>' : "") + "</div>" +
      (b.versions.length ? '<details class="bl-hist"><summary>Earlier versions (' + b.versions.length + ")</summary>" + b.versions.map(function (v) {
        return '<div class="bl-old"><p class="small muted">Version ' + v.version + " · " + day(v.made_at) +
          (v.proposal_id && proposal(v.proposal_id) ? ' · <a data-nav href="?p=' + v.proposal_id + '">the change after it</a>' : "") + "</p>" + md(v.body) + "</div>";
      }).join("") + "</details>" : "") +
      "</article>" +
      '<h2 class="section-title">Changes in progress</h2>' +
      (open.length ? '<div class="stack">' + open.map(propCard).join("") + "</div>" : '<p class="note">No changes in progress. Anyone can propose one.</p>') +
      (done.length ? '<h2 class="section-title">Past changes</h2><div class="stack">' + done.map(propCard).join("") + "</div>" : "") +
      howItWorks();
  }
  function howItWorks() {
    var s = board.settings;
    return '<details class="card bl-how" style="margin-top:20px"><summary><b>How a baseline changes</b></summary>' +
      '<p class="small muted" style="margin:8px 0">Nobody approves a change by hand. Every member can follow each step.</p><ol>' +
      "<li><b>Propose.</b> Any member writes the new wording for one baseline. It shows next to the old wording, and it starts a post in the Baselines topic in Talk.</li>" +
      "<li><b>Gather support.</b> When the Talk post gets " + s.support_needed + " +1s from other members, the discussion starts. One change per baseline at a time; the next waits its turn.</li>" +
      "<li><b>Discuss for " + s.discuss_days + " days</b> in the comments on that Talk post.</li>" +
      "<li><b>Vote for " + s.vote_days + " days.</b> One person, one vote: yes, no or pass. Only ID-checked members vote. Votes are private, and results show when the vote closes.</li>" +
      "<li><b>Passes</b> with more yes than no and at least " + s.min_votes + " votes. A tie fails.</li>" +
      "<li><b>Rai writes the final wording</b> from the proposal and the discussion, without adding anything new.</li>" +
      "<li><b>Final check for " + s.final_days + " days.</b> ID-checked members vote on one question: does this wording match what we agreed? More yes than no makes it permanent. If not, Rai rewrites it from the comments, up to " + s.max_rewrites + " tries.</li>" +
      "<li><b>Goes live on its own.</b> The version number goes up, and the old wording stays in the history.</li>" +
      "</ol><p class=\"small muted\">A change that doesn't pass can come back " + s.retry_days + " days later. These numbers are starting points too.</p></details>";
  }

  // ---- One proposal ----
  function voteButtons(p, question, labels) {
    if (!user) return joinBox("vote");
    if (!board.me.verified) return idBox();
    return '<div class="bl-vote"><p><b>' + esc(question) + "</b></p><div class=\"row\">" + ["yes", "no", "pass"].map(function (c, i) {
      return '<button type="button" class="btn small' + (p.my_vote === c ? "" : " ghost") + '" data-vote="' + c + '" aria-pressed="' + (p.my_vote === c) + '">' + esc(labels[i]) + "</button>";
    }).join("") + "</div>" +
      '<p class="small muted" style="margin-top:6px">' + (p.my_vote ? "You voted " + esc(p.my_vote) + ". You can change it until the vote closes." : "Your vote is private.") + "</p></div>";
  }
  function compare(leftTitle, left, rightTitle, right) {
    return '<div class="bl-compare"><section><h3>' + esc(leftTitle) + "</h3>" + md(left) + "</section><section><h3>" + esc(rightTitle) + "</h3>" + md(right) + "</section></div>";
  }
  function showProposal(p) {
    var b = baseline(p.baseline_key) || {}, s = board.settings;
    document.title = "Proposed change: " + b.title + " | Dandelions";
    var talk = p.talk_post_id ? '<a class="btn ghost small" href="/app/talk.html?p=' + p.talk_post_id + '">Discuss in Talk (' + p.comments + ")</a>" : "";
    var act = "";
    if (p.status === "support") {
      act = !user ? joinBox("+1 this change") : p.mine ? '<p class="small muted">It needs ' + s.support_needed + " +1s from other members. Share the Talk post to get the word out.</p>" :
        '<button type="button" class="btn small' + (p.my_plus ? "" : " ghost") + '" id="plus" aria-pressed="' + p.my_plus + '">' + (p.my_plus ? "+1 given" : "+1, send it to a vote") + "</button>";
    } else if (p.status === "vote") {
      act = voteButtons(p, "Should this change go ahead?", ["Yes", "No", "Pass"]);
    } else if (p.status === "final") {
      act = voteButtons(p, "Does Rai's wording match what we agreed?", ["Yes, it matches", "No", "Pass"]);
    }
    var texts = p.status === "final" ? compare("Proposed wording (what we voted on)", p.new_body, "Rai's final wording", p.final_text) :
      p.status === "passed" && p.final_text ? compare("Proposed wording", p.new_body, "Final wording (now live)", p.final_text) :
      compare((isOpen(p) ? "Now" : "Current wording") + " (version " + b.version + ")", b.body, "Proposed", p.new_body);
    box.innerHTML =
      '<p class="small"><a data-nav href="?b=' + p.baseline_key + '">&larr; Baselines</a></p>' +
      '<div class="page-head"><div class="eyebrow">Proposed change · ' + esc(b.title) + '</div><h1 class="bl-h1">' + esc(p.summary) + "</h1>" +
      '<p class="small muted" style="margin-top:6px">By ' + esc(p.author_name) + " · " + day(p.created_at) + "</p></div>" +
      '<div class="card">' + steps(p) + "<p>" + stateLine(p) + '</p><div class="row" style="margin-top:12px">' + act + talk + "</div></div>" +
      texts + howItWorks();
    if ($("plus")) $("plus").addEventListener("click", plus.bind(null, p));
    Array.prototype.forEach.call(box.querySelectorAll("[data-vote]"), function (btn) {
      btn.addEventListener("click", function () { vote(p, btn.getAttribute("data-vote")); });
    });
  }
  function plus(p) {
    $("plus").disabled = true;
    var req = p.my_plus ? db.from("talk_backs").delete().eq("post_id", p.talk_post_id).eq("member_id", user.id) : db.from("talk_backs").insert({ post_id: p.talk_post_id });
    req.then(function (r) {
      if (r.error && !/duplicate/.test(r.error.message || "")) { $("plus").disabled = false; toast("Couldn't save that. Try again."); return; }
      reload();
    });
  }
  function vote(p, choice) {
    Array.prototype.forEach.call(box.querySelectorAll("[data-vote]"), function (b) { b.disabled = true; });
    db.rpc("baseline_vote", { p_proposal: p.id, p_choice: choice }).then(function (r) {
      if (r.error) { toast(errText(r.error)); }
      else toast("Vote saved.");
      reload();
    });
  }

  // ---- Propose a change ----
  function showPropose(key) {
    if (!baseline(key)) key = board.baselines[0].key;
    var b = baseline(key);
    document.title = "Propose a change | Dandelions";
    box.innerHTML =
      '<p class="small"><a data-nav href="?b=' + key + '">&larr; Baselines</a></p>' +
      '<div class="page-head"><div class="eyebrow">Propose a change</div><h1>Change a baseline.</h1>' +
      '<p class="muted" style="margin-top:8px">Write the whole new wording. It shows next to the old wording, and it starts a post in the Baselines topic in Talk where people can +1 and discuss it.</p></div>' +
      (!user ? joinBox("propose a change") :
      '<form class="card" id="pf">' +
        '<div class="field"><label for="pk">Which baseline</label><select id="pk">' + board.baselines.map(function (x) {
          return '<option value="' + x.key + '"' + (x.key === key ? " selected" : "") + ">" + esc(x.title) + "</option>";
        }).join("") + "</select></div>" +
        '<div class="field"><label for="ps">In one or two sentences, what changes and why?</label><input id="ps" maxlength="300" required placeholder="Add a question about having people you can count on."></div>' +
        '<div class="field"><label for="pb">The new wording</label><textarea id="pb" rows="16" maxlength="8000">' + esc(b.body) + "</textarea>" +
        '<p class="small muted">Use **two stars** for bold, a dash and a space for a list, and 1. for numbered steps.</p></div>' +
        '<details><summary class="small">Preview</summary><div id="pv" class="bl-pv"></div></details>' +
        '<div class="row" style="margin-top:14px"><button class="btn" type="submit" id="send">Propose it</button><a class="btn ghost" data-nav href="?b=' + key + '">Cancel</a></div>' +
        '<p class="small muted" style="margin-top:8px">One open change per baseline per person.</p>' +
      "</form>");
    if (!user) return;
    var dirty = false;
    $("pb").addEventListener("input", function () { dirty = true; $("pv").innerHTML = md($("pb").value); });
    $("pv").innerHTML = md(b.body);
    $("pk").addEventListener("change", function () {
      if (dirty && !confirm("Start over with the wording of the other baseline?")) return;
      $("pb").value = baseline($("pk").value).body; $("pv").innerHTML = md($("pb").value); dirty = false;
    });
    $("pf").addEventListener("submit", function (e) {
      e.preventDefault();
      $("send").disabled = true;
      db.rpc("baseline_propose", { p_key: $("pk").value, p_summary: $("ps").value, p_body: $("pb").value }).then(function (r) {
        if (r.error) { $("send").disabled = false; toast(errText(r.error)); return; }
        toast("Proposed. It's in Talk now, gathering +1s.");
        load().then(function () { go({ p: r.data }); });
      });
    });
  }

  // ---- Loading ----
  function load() {
    return db.rpc("baseline_tick").then(function () { return db.rpc("baseline_board"); }).then(function (r) {
      if (r.error || !r.data) throw r.error || new Error("no board");
      board = r.data;
      // When a change is waiting for its final wording, ask Rai to write it. Anyone's visit can do this, once per visit.
      if (!writerAsked && board.proposals.some(function (p) { return p.status === "writing"; })) {
        writerAsked = true;
        db.functions.invoke("rai", { body: { action: "baseline_write" } }).then(function (w) {
          if (w.data && w.data.written) reload();
        });
      }
    });
  }
  function reload() { return load().then(route).catch(function () { toast("Couldn't refresh. Try again."); }); }

  db.auth.getSession().then(function (s) {
    user = s.data && s.data.session ? s.data.session.user : null;
    if (user) try { localStorage.removeItem("dandelions_return"); } catch (e) {}
    return load();
  }).then(route).catch(function () {
    box.innerHTML = '<p class="note">Couldn\'t load the baselines. Try refreshing.</p>';
  });
})();
