// Baselines: the shared starting points Dandelions measures itself against. Anyone can read them.
// This page shows the current wording and its history. Changes are proposed, discussed and voted on in Talk,
// where each baseline has its own topic.
(function () {
  var cfg = window.DANDELIONS_CONFIG || {}, K = window.BaselineKit;
  var box = document.getElementById("bl");
  var esc = K.esc, day = K.day, md = K.md;
  if (!window.supabase || !K) { box.innerHTML = '<p class="note">Something didn\'t load. Please refresh the page.</p>'; return; }
  var db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
  var board = null;

  function talkLink(b, q) { return "/app/talk.html?t=" + b.topic_id + (q || ""); }
  function show() {
    var key = new URLSearchParams(location.search).get("b");
    var b = board.baselines.filter(function (x) { return x.key === key; })[0] || board.baselines[0];
    var open = board.proposals.filter(function (p) { return p.baseline_key === b.key && K.isOpen(p); });
    box.innerHTML =
      '<div class="page-head"><div class="eyebrow">Baselines</div><h1>Where we\'re starting from.</h1>' +
      '<p class="muted" style="margin-top:8px">Baselines are the shared starting points Dandelions measures itself against. Members change them together in Talk, and Rai reads them when it answers questions and looks at projects.</p></div>' +
      '<div class="bl-tabs" role="tablist">' + board.baselines.map(function (x) {
        return '<a role="tab" href="?b=' + x.key + '" data-key="' + x.key + '"' + (x.key === b.key ? ' aria-selected="true"' : "") + ">" + esc(x.title.replace(/ \(.*\)$/, "")) + "</a>";
      }).join("") + "</div>" +
      '<article class="card bl-base"><h2>' + esc(b.title) + "</h2>" +
      '<p class="small muted">Version ' + b.version + " · updated " + day(b.updated_at) + "</p>" + md(b.body) +
      (b.topic_id ? '<div class="bl-talk"><p><b>Want to change it?</b> Talk about it, and propose new wording, in its topic in Talk.</p>' +
        (open.length ? '<p class="small">' + (open.length === 1 ? "1 change is" : open.length + " changes are") + " in progress: " +
          open.map(function (p) { return '<a href="/app/talk.html?p=' + p.talk_post_id + '">' + esc(p.summary) + "</a>"; }).join(", ") + "</p>" : "") +
        '<a class="btn small" href="' + talkLink(b) + '">Go to ' + esc(b.title.replace(/ \(.*\)$/, "")) + " in Talk</a></div>" : "") +
      (b.versions.length ? '<details class="bl-hist"><summary>Earlier versions (' + b.versions.length + ")</summary>" + b.versions.map(function (v) {
        var after = board.proposals.filter(function (p) { return p.id === v.proposal_id; })[0];
        return '<div class="bl-old"><p class="small muted">Version ' + v.version + " · " + day(v.made_at) +
          (after && after.talk_post_id ? ' · <a href="/app/talk.html?p=' + after.talk_post_id + '">the change that made it</a>' : "") + "</p>" + md(v.body) + "</div>";
      }).join("") + "</details>" : "") +
      "</article>" + '<div style="margin-top:20px">' + K.howItWorks(board.settings) + "</div>";
    Array.prototype.forEach.call(box.querySelectorAll(".bl-tabs a"), function (a) {
      a.addEventListener("click", function (e) {
        if (e.metaKey || e.ctrlKey) return;
        e.preventDefault(); history.pushState(null, "", "?b=" + a.getAttribute("data-key")); show();
      });
    });
  }
  window.addEventListener("popstate", function () { if (board) show(); });
  K.load(db).then(function (b) { board = b; show(); }).catch(function () {
    box.innerHTML = '<p class="note">Couldn\'t load the baselines. Try refreshing.</p>';
  });
})();
