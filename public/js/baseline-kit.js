// Shared pieces for baselines, used by the Baselines page and by Talk (where changes are proposed and voted on).
window.BaselineKit = (function () {
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function day(iso) { return iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""; }
  function dayTime(iso) { return iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : ""; }

  // A small, safe Markdown reader: paragraphs, **bold**, lists, tables and site links.
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
    talk_rules: "Agree to the Talk rules first.",
    talk_paused: "A moderator paused your posting for a while.",
    talk_limit: "That's the most posts for one day. Try again tomorrow."
  };
  function errText(e) {
    var m = (e && e.message) || "";
    for (var k in ERR) if (m.indexOf(k) >= 0) return ERR[k];
    return "Couldn't save just now. Try again.";
  }

  var STEPS = [["support", "Support"], ["discuss", "Discuss"], ["vote", "Vote"], ["writing", "Final wording"], ["final", "Final check"]];
  function isOpen(p) { return p.status !== "passed" && p.status !== "failed"; }
  function steps(p) {
    var at = STEPS.map(function (x) { return x[0]; }).indexOf(p.status);
    if (p.status === "passed") at = STEPS.length;
    return '<ol class="bl-steps" aria-label="Steps">' + STEPS.map(function (x, i) {
      var cls = p.status === "failed" ? "" : i < at ? "done" : i === at ? "now" : "";
      return '<li class="' + cls + '">' + esc(x[1]) + "</li>";
    }).join("") + "</ol>";
  }
  function s1(n, word) { return n + " " + word + (n === 1 ? "" : "s"); }
  function stateLine(p, s) {
    switch (p.status) {
      case "support": return "Gathering support: <b>" + p.support + " of " + s.support_needed + "</b> +1s on this post start a " + s.discuss_days + "-day discussion, then a vote.";
      case "discuss": return "Discussion until <b>" + day(p.discuss_until) + "</b>. The vote opens after that.";
      case "vote": return "Voting until <b>" + dayTime(p.vote_until) + "</b>. " + s1(p.ballots, "vote") + " so far. Results show when it closes.";
      case "writing": return "It passed the vote (" + p.yes + " yes, " + p.no + " no, " + p.pass + " pass). Rai is writing the final wording now.";
      case "final": return "Final check until <b>" + dayTime(p.final_until) + "</b>. " + s1(p.ballots, "vote") + " so far." + (p.final_round > 1 ? " Rewrite " + (p.final_round - 1) + "." : "");
      case "passed": return "Passed " + day(p.closed_at) + ". Vote: " + p.yes + " yes, " + p.no + " no, " + p.pass + " pass. Final check: " + p.final_yes + " yes, " + p.final_no + " no. " + esc(p.result_note) + ".";
      case "failed": return "Didn't pass" + (p.closed_at ? " (" + day(p.closed_at) + ")" : "") + ": " + esc(p.result_note) + "." + (p.yes || p.no || p.pass ? " Vote: " + p.yes + " yes, " + p.no + " no, " + p.pass + " pass." : "");
    }
    return "";
  }
  function compare(leftTitle, left, rightTitle, right) {
    return '<div class="bl-compare"><section><h3>' + esc(leftTitle) + "</h3>" + md(left) + "</section><section><h3>" + esc(rightTitle) + "</h3>" + md(right) + "</section></div>";
  }
  // The texts to show for a proposal, depending on where it is.
  function texts(p, b) {
    if (p.status === "final") return compare("Proposed wording (what we voted on)", p.new_body, "Rai's final wording", p.final_text);
    if (p.status === "passed" && p.final_text) return compare("Proposed wording", p.new_body, "Final wording (now live)", p.final_text);
    return compare((isOpen(p) ? "Now" : "Current wording") + " (version " + b.version + ")", b.body, "Proposed", p.new_body);
  }
  function howItWorks(s) {
    return '<details class="card bl-how"><summary><b>How a baseline changes</b></summary>' +
      '<p class="small muted" style="margin:8px 0">Nobody approves a change by hand. Every member can follow each step in Talk.</p><ol>' +
      "<li><b>Propose.</b> In the baseline's topic in Talk, any member writes new wording. It shows next to the current wording.</li>" +
      "<li><b>Gather support.</b> When the proposal gets " + s.support_needed + " +1s from other members, the discussion starts. One change per baseline at a time; the next waits its turn.</li>" +
      "<li><b>Discuss for " + s.discuss_days + " days</b> in the comments on the proposal.</li>" +
      "<li><b>Vote for " + s.vote_days + " days.</b> One person, one vote: yes, no or pass. Only ID-checked members vote. Votes are private, and results show when the vote closes.</li>" +
      "<li><b>Passes</b> with more yes than no and at least " + s.min_votes + " votes. A tie fails.</li>" +
      "<li><b>Rai writes the final wording</b> from the proposal and the discussion, without adding anything new.</li>" +
      "<li><b>Final check for " + s.final_days + " days.</b> ID-checked members vote on one question: does this wording match what we agreed? More yes than no makes it permanent. If not, Rai rewrites it from the comments, up to " + s.max_rewrites + " tries.</li>" +
      "<li><b>Goes live on its own.</b> The version number goes up, and the old wording stays in the history on the Baselines page.</li>" +
      "</ol><p class=\"small muted\">A change that doesn't pass can come back " + s.retry_days + " days later. These numbers are starting points too.</p></details>";
  }

  // Moves time-based steps forward, then loads everything. If a change is waiting for its final wording, asks Rai once.
  var writerAsked = false;
  function load(db, onWritten) {
    return db.rpc("baseline_tick").then(function () { return db.rpc("baseline_board"); }).then(function (r) {
      if (r.error || !r.data) throw r.error || new Error("no board");
      var board = r.data;
      if (!writerAsked && board.proposals.some(function (p) { return p.status === "writing"; })) {
        writerAsked = true;
        db.functions.invoke("rai", { body: { action: "baseline_write" } }).then(function (w) {
          if (w.data && w.data.written && onWritten) onWritten();
        });
      }
      return board;
    });
  }

  return { esc: esc, day: day, md: md, errText: errText, isOpen: isOpen, steps: steps, stateLine: stateLine, texts: texts, howItWorks: howItWorks, load: load };
})();
