// Baselines: the shared starting points Dandelions measures itself against. Anyone can read them.
// This page shows the current wording and its history, and is where members propose a change. Each proposal
// becomes a post in that baseline's topic in Talk, where it's discussed and voted on.
(function () {
  var cfg = window.DANDELIONS_CONFIG || {}, K = window.BaselineKit;
  var box = document.getElementById("bl");
  var esc = K.esc, day = K.day, md = K.md;
  if (!window.supabase || !K) { box.innerHTML = '<p class="note">Something didn\'t load. Please refresh the page.</p>'; return; }
  var db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
  var board = null, user = null, agreed = false;
  function toast(text) {
    var t = document.createElement("div");
    t.className = "toast"; t.textContent = text;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2800);
  }

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
      (b.topic_id ? '<div class="bl-talk"><p><b>Want to change it?</b> Propose new wording. It goes to Talk for discussion and a vote by members.</p>' +
        (open.length ? '<p class="small">' + (open.length === 1 ? "1 change is" : open.length + " changes are") + " in progress: " +
          open.map(function (p) { return '<a href="/app/talk.html?p=' + p.talk_post_id + '">' + esc(p.summary) + "</a>"; }).join(", ") + "</p>" : "") +
        '<div class="row"><button class="btn small" type="button" id="propose">Propose a change</button><a class="btn ghost small" href="' + talkLink(b) + '">Talk about it</a></div>' +
        '<div id="pbox" style="width:100%"></div></div>' : "") +
      (b.versions.length ? '<details class="bl-hist"><summary>Earlier versions (' + b.versions.length + ")</summary>" + b.versions.map(function (v) {
        var after = board.proposals.filter(function (p) { return p.id === v.proposal_id; })[0];
        return '<div class="bl-old"><p class="small muted">Version ' + v.version + " · " + day(v.made_at) +
          (after && after.talk_post_id ? ' · <a href="/app/talk.html?p=' + after.talk_post_id + '">the change that made it</a>' : "") + "</p>" + md(v.body) + "</div>";
      }).join("") + "</details>" : "") +
      "</article>" + '<div style="margin-top:20px">' + K.howItWorks(board.settings) + "</div>";
    if (document.getElementById("propose")) document.getElementById("propose").addEventListener("click", function () { proposeForm(b); });
    Array.prototype.forEach.call(box.querySelectorAll(".bl-tabs a"), function (a) {
      a.addEventListener("click", function (e) {
        if (e.metaKey || e.ctrlKey) return;
        e.preventDefault(); history.pushState(null, "", "?b=" + a.getAttribute("data-key")); show();
      });
    });
  }
  function $(id) { return document.getElementById(id); }
  function proposeForm(b) {
    var f = $("pbox");
    if (!user) {
      try { localStorage.setItem("dandelions_return", location.pathname + location.search); } catch (e) {}
      f.innerHTML = '<p class="note">Log in to propose a change. Anyone can read.</p><div class="row" style="margin-top:8px"><a class="btn small" href="/app/login.html">Log in</a><a class="btn ghost small" href="/#pledge">New here? Pledge first</a></div>';
      return;
    }
    var s = board.settings;
    f.innerHTML = '<form class="bl-form" id="pform"><h3>Propose a change to ' + esc(b.title) + "</h3>" +
      '<p class="small muted">Write the whole new wording. It becomes a post in Talk, next to the current wording. ' + s.support_needed + " +1s from other members start a " + s.discuss_days + "-day discussion, then a vote.</p>" +
      '<div class="field"><label for="psum">In one or two sentences, what changes and why?</label><input id="psum" maxlength="300" required placeholder="Add a question about having people you can count on."></div>' +
      '<div class="field"><label for="pbody">The new wording</label><textarea id="pbody" rows="14" maxlength="8000">' + esc(b.body) + "</textarea></div>" +
      '<p class="small muted">Use **two stars** for bold, a dash and a space for a list, and 1. for numbered steps.</p>' +
      '<details><summary class="small">Preview</summary><div id="pprev" class="bl-pv">' + md(b.body) + "</div></details>" +
      (agreed ? "" : '<label class="check" style="margin-top:10px"><input type="checkbox" id="prules"><span>I agree to the <a href="/app/talk.html" target="_blank">Talk rules</a>: be constructive, go after ideas not people, no hate, keep it real, keep private things private.</span></label>') +
      '<div class="row" style="margin-top:12px"><button class="btn small" type="submit" id="psend">Propose it</button><button class="btn ghost small" type="button" id="pcancel">Cancel</button></div>' +
      '<p class="small muted" id="pmsg" role="status"></p></form>';
    $("pcancel").addEventListener("click", function () { f.innerHTML = ""; });
    $("pbody").addEventListener("input", function () { $("pprev").innerHTML = md($("pbody").value); });
    $("psum").focus();
    $("pform").addEventListener("submit", function (e) {
      e.preventDefault();
      if (!agreed && !$("prules").checked) { $("pmsg").textContent = "Agree to the Talk rules first. Proposals are posts in Talk."; return; }
      $("psend").disabled = true; $("pmsg").textContent = "Sending...";
      (agreed ? Promise.resolve({}) : db.from("talk_agreements").insert({ version: 1 })).then(function (r) {
        if (r.error && !/duplicate/.test(r.error.message || "")) throw r.error;
        agreed = true;
        return db.rpc("baseline_propose", { p_key: b.key, p_summary: $("psum").value, p_body: $("pbody").value });
      }).then(function (r) {
        if (r.error) throw r.error;
        toast("Proposed. Taking you to it in Talk.");
        setTimeout(function () { location.href = "/app/talk.html?p=" + r.data; }, 900);
      }).catch(function (err) {
        $("psend").disabled = false; $("pmsg").textContent = K.errText(err);
      });
    });
  }
  window.addEventListener("popstate", function () { if (board) show(); });
  db.auth.getSession().then(function (r) {
    user = r.data && r.data.session ? r.data.session.user : null;
    if (user) try { localStorage.removeItem("dandelions_return"); } catch (e) {}
    return user ? db.from("talk_agreements").select("version").eq("member_id", user.id).maybeSingle().then(function (a) { agreed = !!a.data; }) : null;
  }).then(function () { return K.load(db); }).then(function (b) { board = b; show(); }).catch(function () {
    box.innerHTML = '<p class="note">Couldn\'t load the baselines. Try refreshing.</p>';
  });
})();
