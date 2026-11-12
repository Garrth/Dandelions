// Talk: posts with comments, newest first, in topics for your county, your state and the whole US.
// No algorithm: every list is in time order. Anyone can read. Members agree to the Talk rules once, then post,
// comment, +1, star topics and follow people. Follows are private, so nobody has a follower count.
// Nobody approves posts: a post flagged by 3 different members is hidden, and moderators can hide, put back,
// pause someone, make and edit topics, and move a post into a topic. Everything a moderator does is logged.
(function () {
  var cfg = window.DANDELIONS_CONFIG || {};
  var box = document.getElementById("talk");
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function each(root, sel, fn) { Array.prototype.forEach.call(root.querySelectorAll(sel), fn); }
  function toast(text) {
    var t = document.createElement("div");
    t.className = "toast"; t.textContent = text;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }
  function ago(iso) {
    var s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return Math.floor(s / 60) + " min";
    if (s < 86400) return Math.floor(s / 3600) + " hr";
    if (s < 86400 * 7) return Math.floor(s / 86400) + "d";
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  // A round badge with the first letter, colored the same for the same person every time.
  var COLORS = ["#ffd21a", "#7fcf72", "#f0995e", "#8fb8ff", "#d9a6ff", "#ff9fb4", "#6fd6c8", "#e8c07a"];
  function badge(name, id) {
    var h = 0, k = String(id || name);
    for (var i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) >>> 0;
    var letter = (String(name || "?").trim()[0] || "?").toUpperCase();
    return '<span class="badge" style="background:' + COLORS[h % COLORS.length] + '" aria-hidden="true">' + esc(letter) + "</span>";
  }
  if (!window.supabase) { box.innerHTML = '<p class="note">Something didn\'t load. Please refresh the page.</p>'; return; }
  var db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);

  var RULES = [
    ["Be constructive.", "Say what you'd do about it, not only what's wrong."],
    ["Go after ideas, not people.", "No insults, name-calling or putting people down."],
    ["No hate.", "Nothing against anyone for their race, religion, gender, who they love, where they're from, a disability or their age."],
    ["Keep it real.", "No spam, ads, scams or made-up claims."],
    ["Keep private things private.", "No one's address, phone, money or health details, yours included."],
    ["Stay on topic.", "Post in the topic it's about, or in General."]
  ];
  var FLAGS = { mean: "Mean or hateful", spam: "Spam or ads", scam: "A scam", private: "Shares private info", other: "Breaks another rule" };
  var ERR = {
    talk_limit: "That's the most for one day. Try again tomorrow.",
    talk_empty: "Write something first.",
    talk_no_parent: "This post isn't open for comments anymore.",
    talk_no_topic: "That topic isn't open anymore.",
    talk_no_place: "Pick a place first.",
    talk_paused: "A moderator paused your posting for a while. You can still read.",
    talk_rules: "Agree to the Talk rules first."
  };
  function errText(e) {
    var m = (e && e.message) || "";
    for (var k in ERR) if (m.indexOf(k) >= 0) return ERR[k];
    return "Couldn't send just now. Try again.";
  }
  var COLS = "id,room,topic_id,kind,author_id,author_name,title,body,replies,backers,created_at,hidden,deleted,parent_id";
  var PLACE_RE = /^(us|st-[A-Z]{2}|co-[0-9]{5})$/, ID_RE = /^[0-9a-f-]{36}$/;

  var user = null, agreed = false, mod = false, pausedUntil = null, counties = {};
  var places = [], place = "", topics = [], stars = {}, follows = {}, backed = {}, flagged = {};
  var view = {}, topPost = null, notices = [];

  function placeName(id) {
    var c = counties[(id || "").slice(3)];
    return id === "us" ? "The whole US" : id && id.indexOf("co-") === 0 && c ? c[0] + ", " + c[1] : id && id.indexOf("st-") === 0 ? "All of " + id.slice(3) : "Talk";
  }
  function topicById(id) { return topics.filter(function (t) { return t.id === id; })[0]; }
  function paused() { return pausedUntil && new Date(pausedUntil) > new Date(); }
  function pauseNote() {
    return '<p class="note">A moderator paused your posting until ' + esc(new Date(pausedUntil).toLocaleDateString("en-US", { month: "short", day: "numeric" })) + ". You can still read.</p>";
  }
  function rulesList() {
    return "<ol class=\"rules\">" + RULES.map(function (r) { return "<li><b>" + esc(r[0]) + "</b> " + esc(r[1]) + "</li>"; }).join("") + "</ol>" +
      '<p class="small muted">Break a rule and the post can be hidden. Keep doing it and a moderator can pause your posting.</p>';
  }
  function joinPrompt(what) {
    try { localStorage.setItem("dandelions_return", location.pathname + location.search); } catch (e) {}
    return '<div class="card"><p>Log in to ' + (what || "post, comment and follow people") + '. Anyone can read.</p>' +
      '<div class="row" style="margin-top:10px"><a class="btn small" href="/app/login.html">Log in</a><a class="btn ghost small" href="/#pledge">New here? Pledge first</a></div></div>';
  }

  // The rules, once, before a member's first post. Calls then() after they agree.
  function needRules(then) {
    if (agreed) return then();
    var back = document.createElement("div");
    back.className = "sheet-back";
    back.innerHTML = '<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="rt"><h2 id="rt">Talk rules</h2>' +
      '<p class="small muted" style="margin:4px 0 10px">Talk is for working things out together. Constructive input only.</p>' + rulesList() +
      '<div class="row" style="margin-top:14px"><button class="btn" type="button" id="agree">I agree</button><button class="btn ghost" type="button" id="notnow">Not now</button></div></div>';
    document.body.appendChild(back);
    $("notnow").addEventListener("click", function () { back.remove(); });
    $("agree").addEventListener("click", function () {
      $("agree").disabled = true;
      db.from("talk_agreements").insert({ version: 1 }).then(function (r) {
        if (r.error && !/duplicate/.test(r.error.message || "")) { $("agree").disabled = false; toast("Couldn't save that. Try again."); return; }
        agreed = true; back.remove(); then();
      });
    });
  }

  // ---- Moving around: everything is in the address, so links and Back work ----
  function href(q) {
    var s = new URLSearchParams();
    if (q.p) s.set("p", q.p);
    else if (q.u) s.set("u", q.u);
    else if (q.following) s.set("following", "1");
    else { s.set("r", q.r || place); if (q.t) s.set("t", q.t); if (q.all) s.set("all", "1"); }
    return "/app/talk.html?" + s.toString();
  }
  function go(q) { history.pushState(null, "", href(q)); route(); }
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[data-nav]");
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault(); history.pushState(null, "", a.getAttribute("href")); route();
  });
  addEventListener("popstate", route);

  // ---- The frame: topics column on the left, the posts on the right ----
  var sideHidden = false;
  try { sideHidden = localStorage.getItem("talk_side_hidden") === "1"; } catch (e) {}
  function frame() {
    box.innerHTML =
      '<div class="tk' + (sideHidden ? " side-off" : "") + '" id="tk">' +
        '<aside class="tk-side" id="side" aria-label="Topics">' +
          '<label class="tk-place">Place<select id="place">' + places.map(function (p) {
            return '<option value="' + esc(p) + '"' + (p === place ? " selected" : "") + ">" + esc(placeName(p)) + "</option>";
          }).join("") + "</select></label>" +
          '<div class="spread tk-sidehead"><b>Topics</b><button class="linkbtn" type="button" id="hideside">Hide «</button></div>' +
          '<nav id="tlist"></nav>' +
        "</aside>" +
        '<div class="tk-shade" id="shade"></div>' +
        '<section class="tk-main" id="main"><p class="muted">Loading...</p></section>' +
      "</div>";
    $("place").addEventListener("change", function () { place = this.value; closeSide(); loadTopics().then(function () { go({ r: place }); }); });
    $("hideside").addEventListener("click", function () {
      if (matchMedia("(max-width: 860px)").matches) return closeSide();
      sideHidden = true; $("tk").classList.add("side-off");
      try { localStorage.setItem("talk_side_hidden", "1"); } catch (e) {}
    });
    $("shade").addEventListener("click", closeSide);
  }
  function openSide() {
    if (matchMedia("(max-width: 860px)").matches) { $("tk").classList.add("side-open"); return; }
    sideHidden = false; $("tk").classList.remove("side-off");
    try { localStorage.setItem("talk_side_hidden", "0"); } catch (e) {}
  }
  function closeSide() { $("tk").classList.remove("side-open"); }
  function sideList() {
    var cur = view.kind === "feed" ? view.t || "" : null;
    function row(t, mark) {
      var on = cur === t.id;
      return '<a data-nav class="tk-topic' + (on ? " on" : "") + '" href="' + esc(href({ r: place, t: t.id })) + '"' + (on ? ' aria-current="page"' : "") + ">" +
        (mark ? '<span class="tk-mark" aria-hidden="true">' + mark + "</span>" : "") + "<span>" + esc(t.name) + "</span></a>";
    }
    var open = topics.filter(function (t) { return !t.archived; });
    var pinned = open.filter(function (t) { return t.pinned; });
    var starred = open.filter(function (t) { return !t.pinned && stars[t.id]; });
    $("tlist").innerHTML =
      '<a data-nav class="tk-topic' + (cur === "" ? " on" : "") + '" href="' + esc(href({ r: place })) + '"><span>General</span></a>' +
      pinned.map(function (t) { return row(t, "📌"); }).join("") +
      starred.map(function (t) { return row(t, "★"); }).join("") +
      '<div class="tk-rule"></div>' +
      '<a data-nav class="tk-topic quiet' + (view.kind === "all" ? " on" : "") + '" href="' + esc(href({ r: place, all: 1 })) + '"><span>All topics (' + open.length + ")</span></a>" +
      (user ? '<a data-nav class="tk-topic quiet' + (view.kind === "following" ? " on" : "") + '" href="' + esc(href({ following: 1 })) + '"><span>People you follow (' + Object.keys(follows).length + ")</span></a>" :
        '<p class="small muted tk-hint">Log in to star topics so they stay here.</p>');
    each($("tlist"), "a", function (a) { a.addEventListener("click", closeSide); });
  }
  function topicsButton() { return '<button class="btn ghost small tk-open" type="button" data-openside>☰ Topics</button>'; }
  function wireOpen(root) { each(root, "[data-openside]", function (b) { b.addEventListener("click", openSide); }); }

  function loadTopics() {
    return db.from("talk_topics").select("id,room,name,about,pinned,archived,posts,last_post_at,made_by").in("room", ["any", place]).order("last_post_at", { ascending: false }).limit(300)
      .then(function (r) {
        topics = (r.data || []).sort(function (a, b) { return (b.pinned - a.pinned) || (new Date(b.last_post_at) - new Date(a.last_post_at)); });
      });
  }

  // ---- One post, as a card in a list ----
  function postCard(p, opt) {
    opt = opt || {};
    var t = p.topic_id && topicById(p.topic_id), mine = user && p.author_id === user.id;
    var follow = user && !mine ? '<button class="linkbtn tk-follow" type="button" data-follow="' + p.author_id + '" data-name="' + esc(p.author_name) + '">' + (follows[p.author_id] ? "Following" : "Follow") + "</button>" : "";
    return '<article class="tk-post' + (p.hidden ? " hid" : "") + '">' +
      '<div class="tk-by">' + badge(p.author_name, p.author_id) + '<a data-nav class="tk-name" href="' + esc(href({ u: p.author_id })) + '">' + esc(p.author_name) + "</a>" +
        '<span class="muted">· ' + ago(p.created_at) + "</span>" + (p.hidden ? ' <span class="chip warn">Hidden</span>' : "") +
        (opt.where ? ' <span class="muted small">in ' + esc(t ? t.name : "General") + (p.room !== place ? ", " + esc(placeName(p.room)) : "") + "</span>" : "") + follow + "</div>" +
      (p.deleted ? '<p class="muted">Removed by its author</p>' :
        (p.title ? "<h3 class=\"tk-title\">" + (opt.link ? '<a data-nav href="' + esc(href({ p: p.id })) + '">' + esc(p.title) + "</a>" : esc(p.title)) + "</h3>" : "") +
        (p.body ? '<p class="tk-body">' + esc(opt.link && p.body.length > 500 ? p.body.slice(0, 500) + "..." : p.body) + "</p>" : "")) +
      '<div class="tk-foot">' + plusBtn(p) +
        (opt.link ? '<a data-nav class="tk-comments" href="' + esc(href({ p: p.id })) + '">' + p.replies + (p.replies === 1 ? " comment" : " comments") + "</a>" : "") +
        (p.deleted ? "" : tools(p)) + "</div>" +
    "</article>";
  }
  function commentRow(c) {
    return '<div class="tk-comment' + (c.hidden ? " hid" : "") + '">' + badge(c.author_name, c.author_id) + '<div class="tk-cbody">' +
      '<div class="tk-by"><a data-nav class="tk-name" href="' + esc(href({ u: c.author_id })) + '">' + esc(c.author_name) + '</a><span class="muted">· ' + ago(c.created_at) + "</span>" +
        (c.hidden ? ' <span class="chip warn">Hidden</span>' : "") + "</div>" +
      (c.deleted ? '<p class="muted">Removed by its author</p>' : '<p class="tk-body">' + esc(c.body) + "</p>") +
      '<div class="tk-foot">' + plusBtn(c) + (c.deleted ? "" : tools(c)) + "</div></div></div>";
  }
  function plusBtn(p) {
    var mine = user && p.author_id === user.id, on = !!backed[p.id], can = user && !mine && !p.deleted;
    return '<button class="tk-plus' + (on ? " on" : "") + '" type="button"' + (can ? ' data-plus="' + p.id + '"' : " disabled") + ' data-n="' + p.backers + '" aria-pressed="' + on +
      '" aria-label="' + (can ? (on ? "You gave this +1. Tap to take it back" : "Give this +1") : "+1 count") + '">+1<span class="n">' + (p.backers ? " · " + p.backers : "") + "</span></button>";
  }
  // What a person can do to one post: delete their own, flag someone else's, and for moderators hide, put back, pause or move.
  function tools(p) {
    if (!user) return "";
    var mine = p.author_id === user.id, out = [];
    if (mine) out.push('<button class="linkbtn" type="button" data-del="' + p.id + '">Delete</button>');
    else if (flagged[p.id]) out.push('<span class="muted small">Flagged</span>');
    else out.push('<button class="linkbtn" type="button" data-flag="' + p.id + '">Flag</button>');
    if (mod) {
      if (!mine) out.push('<button class="linkbtn" type="button" data-hide="' + p.id + '" data-on="' + !p.hidden + '">' + (p.hidden ? "Put back" : "Hide") + "</button>");
      if (!mine) out.push('<button class="linkbtn" type="button" data-pause="' + p.author_id + '" data-name="' + esc(p.author_name) + '">Pause 7 days</button>');
      if (!p.parent_id) out.push('<button class="linkbtn" type="button" data-move="' + p.id + '" data-room="' + esc(p.room) + '">Move</button>');
    }
    return '<span class="tk-tools">' + out.join(" ") + "</span>";
  }
  function wire(root, again) {
    each(root, "[data-plus]", function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-plus"), n = Number(b.getAttribute("data-n")), on = !!backed[id];
        b.disabled = true;
        var req = on ? db.from("talk_backs").delete().eq("post_id", id).eq("member_id", user.id) : db.from("talk_backs").insert({ post_id: id });
        req.then(function (r) {
          b.disabled = false;
          if (r.error) { toast("Couldn't save that. Try again."); return; }
          if (on) delete backed[id]; else backed[id] = true;
          n += on ? -1 : 1;
          b.setAttribute("data-n", n); b.querySelector(".n").textContent = n ? " · " + n : "";
          b.classList.toggle("on", !on); b.setAttribute("aria-pressed", String(!on));
        });
      });
    });
    each(root, "[data-follow]", function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-follow"), on = !!follows[id];
        b.disabled = true;
        var req = on ? db.from("talk_follows").delete().eq("follower_id", user.id).eq("followee_id", id) : db.from("talk_follows").insert({ followee_id: id });
        req.then(function (r) {
          b.disabled = false;
          if (r.error && !/duplicate/.test(r.error.message || "")) { toast("Couldn't save that. Try again."); return; }
          if (on) delete follows[id]; else follows[id] = true;
          each(box, '[data-follow="' + id + '"]', function (x) { x.textContent = on ? "Follow" : "Following"; });
          sideList();
          toast(on ? "Unfollowed " + b.getAttribute("data-name") : "Following " + b.getAttribute("data-name") + ". The bell will tell you when they post.");
        });
      });
    });
    each(root, "[data-del]", function (b) {
      b.addEventListener("click", function () {
        if (!confirm("Delete this? It can't be undone.")) return;
        db.from("talk_posts").update({ deleted: true }).eq("id", b.getAttribute("data-del")).then(function (r) {
          if (r.error) { toast("Couldn't delete. Try again."); return; }
          toast("Deleted"); again();
        });
      });
    });
    each(root, "[data-flag]", function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-flag"), host = b.closest(".tk-post, .tk-comment");
        if (host.querySelector(".flagbox")) return;
        host.insertAdjacentHTML("beforeend", '<div class="flagbox"><span class="small muted" style="flex-basis:100%">Which rule does it break?</span>' +
          Object.keys(FLAGS).map(function (k) { return '<button type="button" data-reason="' + k + '">' + FLAGS[k] + "</button>"; }).join("") + "</div>");
        each(host, "[data-reason]", function (x) {
          x.addEventListener("click", function () {
            db.from("talk_flags").insert({ post_id: id, reason: x.getAttribute("data-reason") }).then(function (r) {
              if (r.error && !/duplicate/.test(r.error.message || "")) { toast("Couldn't send that. Try again."); return; }
              flagged[id] = true; toast("Thanks. It's been flagged."); again();
            });
          });
        });
      });
    });
    each(root, "[data-hide]", function (b) {
      b.addEventListener("click", function () {
        var hide = b.getAttribute("data-on") === "true";
        var note = hide ? prompt("Which rule did it break? (kept in the log)", "") : "";
        if (note === null) return;
        db.rpc("talk_mod_hide", { post: b.getAttribute("data-hide"), hide: hide, note: note }).then(function (r) {
          if (r.error) { toast("Couldn't do that. Try again."); return; }
          toast(hide ? "Hidden" : "Put back"); again();
        });
      });
    });
    each(root, "[data-pause]", function (b) {
      b.addEventListener("click", function () {
        var note = prompt("Pause " + b.getAttribute("data-name") + " from posting for 7 days? Say which rule (kept in the log).", "");
        if (note === null) return;
        db.rpc("talk_mod_pause", { member: b.getAttribute("data-pause"), days: 7, note: note }).then(function (r) {
          toast(r.error ? "Couldn't pause. Try again." : "Paused for 7 days");
        });
      });
    });
    each(root, "[data-move]", function (b) {
      b.addEventListener("click", function () {
        var host = b.closest(".tk-foot"), room = b.getAttribute("data-room");
        if (host.querySelector(".tk-move")) return;
        var opts = topics.filter(function (t) { return !t.archived && (t.room === "any" || t.room === room); });
        host.insertAdjacentHTML("beforeend", '<label class="tk-move small">Move to <select><option value="">General</option>' +
          opts.map(function (t) { return '<option value="' + t.id + '">' + esc(t.name) + "</option>"; }).join("") + "</select></label>");
        host.querySelector(".tk-move select").addEventListener("change", function () {
          var to = this.value || null;
          db.rpc("talk_mod_move", { post: b.getAttribute("data-move"), topic: to }).then(function (r) {
            if (r.error) { toast("Couldn't move it. Try again."); return; }
            var t = to && topicById(to); toast("Moved to " + (t ? t.name : "General")); loadTopics().then(again);
          });
        });
      });
    });
  }

  // ---- A topic (or General): newest posts first ----
  function showFeed() {
    var t = view.t ? topicById(view.t) : null;
    if (view.t && !t) { go({ r: place }); return; }
    var name = t ? t.name : "General";
    document.title = name + " · Talk | Dandelions";
    var main = $("main");
    main.innerHTML =
      '<div class="tk-head"><div class="tk-headrow">' + topicsButton() + '<div class="tk-htext"><div class="eyebrow">' + esc(placeName(place)) + "</div><h1>" + esc(name) + "</h1></div>" +
        (user && !paused() ? '<button class="btn small" type="button" id="newpost">New post</button>' : "") + "</div>" +
        '<p class="muted tk-about">' + (t ? esc(t.about || "") : "Anything goes here. Ideas that catch on get their own topic.") + "</p>" +
        (t && mod ? '<button class="linkbtn" type="button" id="edittopic">Edit topic</button>' : "") + "</div>" +
      '<div id="topicform"></div>' +
      (!user ? joinPrompt() : paused() ? pauseNote() :
        '<form class="card tk-compose" id="compose" hidden><label class="field">Title (optional)<input id="ctitle" maxlength="120" placeholder="Sum it up in a few words"></label>' +
        '<label class="field">Your post<textarea id="cbody" maxlength="2000" rows="3" placeholder="Say what you think, or what you\'d do about it"></textarea></label>' +
        '<div class="spread"><span class="small muted">In ' + esc(name) + ", " + esc(placeName(place)) + '</span><div class="row"><button class="btn ghost small" type="button" id="cancelpost">Cancel</button><button class="btn small" type="submit">Post</button></div></div>' +
        '<p class="small muted" id="cmsg" role="status"></p></form>') +
      '<div id="newbar"></div><div id="posts"><p class="muted">Loading...</p></div>' +
      '<details class="rulesbox"><summary>Talk rules</summary>' + rulesList() + "</details>";
    wireOpen(main);
    if ($("newpost")) $("newpost").addEventListener("click", function () { $("compose").hidden = false; $("cbody").focus(); });
    if ($("cancelpost")) $("cancelpost").addEventListener("click", function () { $("compose").hidden = true; });
    if ($("edittopic")) $("edittopic").addEventListener("click", function () { topicForm(t); });
    if ($("compose")) $("compose").addEventListener("submit", function (e) {
      e.preventDefault();
      var title = $("ctitle").value.trim(), body = $("cbody").value.trim();
      if (!title && !body) { $("cmsg").textContent = ERR.talk_empty; $("cbody").focus(); return; }
      needRules(function () {
        $("cmsg").textContent = "Posting...";
        db.from("talk_posts").insert({ room: place, topic_id: t ? t.id : null, kind: "post", title: title, body: body }).then(function (r) {
          if (r.error) { $("cmsg").textContent = errText(r.error); return; }
          toast("Posted"); showFeed();
        });
      });
    });
    feedQuery().then(function (r) {
      var list = r.data || [];
      topPost = list[0] ? list[0].id : null;
      $("posts").innerHTML = r.error ? '<p class="note">Couldn\'t load posts. Try refreshing.</p>' : list.length ?
        list.map(function (p) { return postCard(p, { link: true }); }).join("") :
        '<p class="note">No posts here yet. ' + (user ? "Write the first one." : "Log in to write the first one.") + "</p>";
      wire($("posts"), showFeed);
    });
  }
  function feedQuery() {
    var q = db.from("talk_posts").select(COLS).eq("room", place).is("parent_id", null).eq("deleted", false);
    q = view.t ? q.eq("topic_id", view.t) : q.is("topic_id", null);
    return q.order("created_at", { ascending: false }).limit(50);
  }

  // Moderators make and edit topics by hand, so we can shape Talk while it rolls out.
  function topicForm(t) {
    var f = $("topicform");
    f.innerHTML = '<form class="card tk-compose" id="tform"><h3>' + (t ? "Edit topic" : "New topic") + "</h3>" +
      '<label class="field">Name<input id="tname" maxlength="60" required value="' + esc(t ? t.name : "") + '"></label>' +
      '<label class="field">What it\'s for<textarea id="tabout" maxlength="300" rows="2">' + esc(t ? t.about : "") + "</textarea></label>" +
      (t ? "" : '<label class="field">Where<select id="troom"><option value="' + esc(place) + '">' + esc(placeName(place)) + ' only</option><option value="any">Every place</option></select></label>') +
      '<label class="check"><input type="checkbox" id="tpin"' + (t && t.pinned ? " checked" : "") + "> Pin it near the top for everyone</label>" +
      (t ? '<label class="check"><input type="checkbox" id="tarch"' + (t.archived ? " checked" : "") + "> Archive it (still readable, no new posts)</label>" : "") +
      '<div class="row"><button class="btn small" type="submit">Save</button><button class="btn ghost small" type="button" id="tcancel">Cancel</button></div>' +
      '<p class="small muted">Everything moderators do is logged.</p></form>';
    $("tcancel").addEventListener("click", function () { f.innerHTML = ""; });
    $("tform").addEventListener("submit", function (e) {
      e.preventDefault();
      var nm = $("tname").value.trim();
      if (nm.length < 3) { toast("Give it a name of at least 3 letters."); return; }
      db.rpc("talk_mod_topic", { topic: t ? t.id : null, place: t ? t.room : $("troom").value, topic_name: nm, topic_about: $("tabout").value.trim(),
        is_pinned: $("tpin").checked, is_archived: t ? $("tarch").checked : false }).then(function (r) {
        if (r.error) { toast(/duplicate|unique/.test(r.error.message || "") ? "There's already a topic with that name here." : "Couldn't save the topic. Try again."); return; }
        toast(t ? "Saved" : "Topic made");
        loadTopics().then(function () { go({ r: place, t: r.data || (t && t.id) }); });
      });
    });
  }

  // ---- All topics: search, star, and the archive ----
  function showAll() {
    document.title = "All topics · Talk | Dandelions";
    var main = $("main");
    main.innerHTML = '<div class="tk-head"><div class="tk-headrow">' + topicsButton() + '<div class="tk-htext"><div class="eyebrow">' + esc(placeName(place)) + "</div><h1>All topics</h1></div>" +
        (mod ? '<button class="btn small" type="button" id="newtopic">New topic</button>' : "") + "</div>" +
        '<p class="muted tk-about">Star a topic to keep it in your topics column.' + (mod ? "" : " New topics open when an idea in General catches on.") + "</p></div>" +
      '<div id="topicform"></div>' +
      '<input class="tk-search" id="tsearch" type="search" placeholder="Search topics" aria-label="Search topics">' +
      '<div id="tall"></div>';
    wireOpen(main);
    if ($("newtopic")) $("newtopic").addEventListener("click", function () { topicForm(null); });
    function draw() {
      var q = $("tsearch").value.trim().toLowerCase();
      var hit = topics.filter(function (t) { return !q || t.name.toLowerCase().indexOf(q) >= 0 || (t.about || "").toLowerCase().indexOf(q) >= 0; });
      var open = hit.filter(function (t) { return !t.archived; }), old = hit.filter(function (t) { return t.archived; });
      function row(t) {
        return '<div class="tk-trow"><button class="tk-star' + (stars[t.id] ? " on" : "") + '" type="button" data-star="' + t.id + '" aria-pressed="' + !!stars[t.id] + '" aria-label="' + (stars[t.id] ? "Unstar " : "Star ") + esc(t.name) + '"' + (user ? "" : " disabled") + ">" + (stars[t.id] ? "★" : "☆") + "</button>" +
          '<a data-nav href="' + esc(href({ r: place, t: t.id })) + '"><b>' + esc(t.name) + "</b>" + (t.pinned ? ' <span class="chip">Pinned</span>' : "") +
          '<span class="meta">' + (t.about ? esc(t.about) + " · " : "") + (t.room === "any" ? "" : t.posts + (t.posts === 1 ? " post · " : " posts · ")) + "active " + ago(t.last_post_at) + "</span></a></div>";
      }
      $("tall").innerHTML = (open.length ? '<div class="tk-tlist">' + open.map(row).join("") + "</div>" : '<p class="note">No topics match.</p>') +
        (old.length ? '<h2 class="section-title" style="margin-top:20px">Archive</h2><div class="tk-tlist">' + old.map(row).join("") + "</div>" : "");
      each($("tall"), "[data-star]", function (b) {
        b.addEventListener("click", function () {
          var id = b.getAttribute("data-star"), on = !!stars[id];
          b.disabled = true;
          var req = on ? db.from("talk_stars").delete().eq("member_id", user.id).eq("topic_id", id) : db.from("talk_stars").insert({ topic_id: id });
          req.then(function (r) {
            b.disabled = false;
            if (r.error && !/duplicate/.test(r.error.message || "")) { toast("Couldn't save that. Try again."); return; }
            if (on) delete stars[id]; else stars[id] = true;
            draw(); sideList();
          });
        });
      });
    }
    $("tsearch").addEventListener("input", draw);
    draw();
  }

  // ---- One post with its comments ----
  function showPost() {
    var id = view.p;
    Promise.all([
      db.from("talk_posts").select(COLS).eq("id", id).maybeSingle(),
      db.from("talk_posts").select(COLS).eq("parent_id", id).order("created_at", { ascending: true }).limit(500)
    ]).then(function (o) {
      var p = o[0].data, reps = o[1].data || [], main = $("main");
      if (!p || p.parent_id) { main.innerHTML = '<p class="note">That post isn\'t here anymore. <a data-nav href="' + esc(href({ r: place })) + '">Back to Talk</a></p>'; return; }
      var ready = PLACE_RE.test(p.room) && p.room !== place && places.indexOf(p.room) < 0 ? (places.push(p.room), Promise.resolve()) : Promise.resolve();
      ready.then(function () {
        if (PLACE_RE.test(p.room) && p.room !== place) { place = p.room; $("place").innerHTML = places.map(function (x) { return '<option value="' + esc(x) + '"' + (x === place ? " selected" : "") + ">" + esc(placeName(x)) + "</option>"; }).join(""); return loadTopics(); }
      }).then(function () {
        view.t = p.topic_id || ""; sideList();
        var t = p.topic_id && topicById(p.topic_id);
        document.title = (p.title || "Post") + " · Talk | Dandelions";
        main.innerHTML = '<a data-nav class="crumb" href="' + esc(href({ r: place, t: p.topic_id })) + '">‹ ' + esc(t ? t.name : "General") + "</a>" +
          postCard(p) +
          '<div class="tk-thread" id="thread">' + (reps.length ? reps.map(commentRow).join("") : '<p class="small muted tk-none">No comments yet. Start the conversation.</p>') + "</div>" +
          (p.deleted || p.hidden ? "" : !user ? '<div style="margin-top:14px">' + joinPrompt("comment") + "</div>" : paused() ? pauseNote() :
            '<form class="sendbar" id="replyf"><textarea id="rbody" maxlength="2000" rows="1" placeholder="Add a comment" aria-label="Add a comment"></textarea>' +
            '<button class="btn small" type="submit">Send</button></form><p class="small muted" id="rmsg" role="status" style="text-align:center"></p>');
        wire(main, showPost);
        var ta = $("rbody");
        if (ta) {
          ta.addEventListener("input", function () { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 140) + "px"; });
          $("replyf").addEventListener("submit", function (e) {
            e.preventDefault();
            var body = ta.value.trim();
            if (!body) return;
            needRules(function () {
              $("rmsg").textContent = "Sending...";
              db.from("talk_posts").insert({ room: p.room, parent_id: p.id, kind: "reply", body: body }).then(function (r) {
                if (r.error) { $("rmsg").textContent = errText(r.error); return; }
                showPost();
              });
            });
          });
        }
      });
    });
  }

  // ---- One person: everything they've posted, newest first ----
  function showPerson() {
    var id = view.u, main = $("main");
    sideList();
    db.from("talk_posts").select(COLS).eq("author_id", id).is("parent_id", null).eq("deleted", false).order("created_at", { ascending: false }).limit(50).then(function (r) {
      var list = r.data || [], name = list[0] ? list[0].author_name : "This member", mine = user && user.id === id;
      document.title = name + " · Talk | Dandelions";
      main.innerHTML = '<div class="tk-head"><div class="tk-headrow">' + topicsButton() + '<div class="tk-htext"><div class="eyebrow">Posts by</div><h1>' + esc(name) + "</h1></div>" +
          (user && !mine ? '<button class="btn small' + (follows[id] ? " ghost" : "") + '" type="button" data-follow="' + esc(id) + '" data-name="' + esc(name) + '">' + (follows[id] ? "Following" : "Follow") + "</button>" : "") + "</div>" +
          '<p class="muted tk-about">' + (mine ? "Your posts, newest first. Only you see who you follow, and nobody sees follower counts." : "Follow to get a ring on the bell when they post. Only you see who you follow.") + "</p></div>" +
        (list.length ? list.map(function (p) { return postCard(p, { link: true, where: true }); }).join("") : '<p class="note">' + esc(name) + " hasn't posted yet.</p>");
      wireOpen(main);
      wire(main, showPerson);
      each(main, ".tk-head [data-follow]", function (b) { b.addEventListener("click", function () { setTimeout(function () { b.classList.toggle("ghost", !!follows[id]); }, 400); }); });
    });
  }

  // ---- People you follow. Only you see this list. ----
  function showFollowing() {
    var main = $("main"), ids = Object.keys(follows);
    document.title = "People you follow · Talk | Dandelions";
    function draw(names) {
      main.innerHTML = '<div class="tk-head"><div class="tk-headrow">' + topicsButton() + '<div class="tk-htext"><div class="eyebrow">Talk</div><h1>People you follow</h1></div></div>' +
          '<p class="muted tk-about">Only you see this list. Nobody sees who follows them or how many followers they have.</p></div>' +
        (!user ? joinPrompt("follow people") : ids.length ? '<div class="tk-tlist">' + ids.map(function (id) {
          var nm = names[id] || "A member";
          return '<div class="tk-trow" style="padding-left:14px">' + badge(nm, id) + '<a data-nav href="' + esc(href({ u: id })) + '"><b>' + esc(nm) + '</b><span class="meta">See their posts</span></a>' +
            '<button class="btn ghost small" type="button" data-follow="' + esc(id) + '" data-name="' + esc(nm) + '">Following</button></div>';
        }).join("") + "</div>" : '<p class="note">You aren\'t following anyone yet. Tap Follow next to a name on any post.</p>');
      wireOpen(main);
      wire(main, function () {});
    }
    if (!user || !ids.length) return draw({});
    db.from("talk_posts").select("author_id,author_name,created_at").in("author_id", ids).order("created_at", { ascending: false }).limit(500).then(function (r) {
      var names = {};
      (r.data || []).forEach(function (x) { if (!names[x.author_id]) names[x.author_id] = x.author_name; });
      draw(names);
    });
  }

  // ---- The bell: people you follow posting, and comments on your posts ----
  function bell() {
    if (!user) return;
    var nav = document.querySelector(".navlinks");
    if (!$("bell")) {
      nav.insertAdjacentHTML("afterbegin", '<button class="tk-bell" type="button" id="bell" aria-haspopup="true" aria-expanded="false" aria-label="Notifications">' +
        '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a6 6 0 0 0-6 6v3.6L4.3 15.4A1 1 0 0 0 5.2 17h13.6a1 1 0 0 0 .9-1.6L18 12.6V9a6 6 0 0 0-6-6zm-2.5 15.5a2.5 2.5 0 0 0 5 0z" fill="currentColor"/></svg><span class="tk-dot" id="belln" hidden></span></button>');
      $("bell").addEventListener("click", function (e) { e.stopPropagation(); togglePanel(); });
      document.addEventListener("click", function (e) { var pn = $("bellpanel"); if (pn && !pn.contains(e.target)) closePanel(); });
    }
    return db.from("talk_notices").select("id,kind,post_id,from_name,seen,at").eq("member_id", user.id).order("at", { ascending: false }).limit(30).then(function (r) {
      notices = r.data || [];
      var n = notices.filter(function (x) { return !x.seen; }).length;
      $("belln").hidden = !n; $("belln").textContent = n > 9 ? "9+" : String(n);
      $("bell").setAttribute("aria-label", n ? n + " new notifications" : "Notifications");
    });
  }
  function closePanel() { var pn = $("bellpanel"); if (pn) pn.remove(); $("bell").setAttribute("aria-expanded", "false"); }
  function togglePanel() {
    if ($("bellpanel")) return closePanel();
    var pn = document.createElement("div");
    pn.className = "tk-panel"; pn.id = "bellpanel";
    pn.innerHTML = "<b>Notifications</b>" + (notices.length ? notices.map(function (x) {
      return '<a data-nav class="tk-note' + (x.seen ? "" : " new") + '" href="' + esc(href({ p: x.post_id })) + '" data-seen="' + x.id + '">' +
        esc(x.from_name) + (x.kind === "comment" ? " commented on your post" : " posted") + '<span class="muted small"> · ' + ago(x.at) + "</span></a>";
    }).join("") : '<p class="small muted">Nothing yet. Follow people to hear when they post.</p>') +
      '<p class="small muted" style="margin-top:8px">No emails yet. A daily digest by email comes later, and it will be your choice.</p>';
    document.body.appendChild(pn);
    $("bell").setAttribute("aria-expanded", "true");
    var ids = notices.filter(function (x) { return !x.seen; }).map(function (x) { return x.id; });
    if (ids.length) db.from("talk_notices").update({ seen: true }).in("id", ids).then(function () {
      notices.forEach(function (x) { x.seen = true; }); $("belln").hidden = true; $("bell").setAttribute("aria-label", "Notifications");
    });
    each(pn, "a", function (a) { a.addEventListener("click", closePanel); });
  }

  // ---- Every 30 seconds, check for new posts and notifications while the page is open ----
  setInterval(function () {
    if (document.hidden) return;
    if (user) bell();
    if (view.kind !== "feed" || !$("newbar")) return;
    feedQuery().then(function (r) {
      var first = (r.data || [])[0];
      if (first && first.id !== topPost && !$("newbar").firstChild) {
        $("newbar").innerHTML = '<button class="tk-newbar" type="button">New posts. Show them</button>';
        $("newbar").firstChild.addEventListener("click", function () { var c = $("compose"), keep = c && !c.hidden && ($("cbody").value || $("ctitle").value); if (!keep) showFeed(); });
      }
    });
  }, 30000);

  // ---- Which view the address asks for ----
  function route() {
    var q = new URLSearchParams(location.search);
    var p = q.get("p"), u = q.get("u"), r = q.get("r"), t = q.get("t");
    view = p && ID_RE.test(p) ? { kind: "post", p: p } : u && ID_RE.test(u) ? { kind: "person", u: u } : q.get("following") ? { kind: "following" } : q.get("all") ? { kind: "all" } : { kind: "feed", t: t && ID_RE.test(t) ? t : "" };
    var change = r && PLACE_RE.test(r) && r !== place;
    if (change && places.indexOf(r) < 0) places.push(r);
    (change ? (place = r, $("place").innerHTML = places.map(function (x) { return '<option value="' + esc(x) + '"' + (x === place ? " selected" : "") + ">" + esc(placeName(x)) + "</option>"; }).join(""), loadTopics()) : Promise.resolve()).then(function () {
      sideList();
      if (view.kind === "post") showPost(); else if (view.kind === "person") showPerson(); else if (view.kind === "all") showAll(); else if (view.kind === "following") showFollowing(); else showFeed();
      scrollTo(0, 0);
    });
  }

  // ---- Start: who's here and where they live, then the view asked for ----
  Promise.all([db.auth.getSession(), fetch("/data/counties.json").then(function (r) { return r.json(); }).catch(function () { return {}; })]).then(function (o) {
    var s = o[0].data && o[0].data.session;
    counties = o[1];
    user = s ? s.user : null;
    if (user) try { localStorage.removeItem("dandelions_return"); } catch (e) {}
    return (user ? Promise.all([
      db.from("members").select("county_fips").eq("id", user.id).maybeSingle(),
      db.from("talk_backs").select("post_id").eq("member_id", user.id),
      db.from("talk_flags").select("post_id").eq("member_id", user.id),
      db.from("talk_agreements").select("version").eq("member_id", user.id).maybeSingle(),
      db.from("talk_pauses").select("until").eq("member_id", user.id).maybeSingle(),
      db.rpc("is_talk_mod"),
      db.from("talk_stars").select("topic_id").eq("member_id", user.id),
      db.from("talk_follows").select("followee_id").eq("follower_id", user.id)
    ]) : Promise.resolve([{}, {}, {}, {}, {}, {}, {}, {}])).then(function (m) {
      (m[1].data || []).forEach(function (x) { backed[x.post_id] = true; });
      (m[2].data || []).forEach(function (x) { flagged[x.post_id] = true; });
      agreed = !!m[3].data;
      pausedUntil = m[4].data ? m[4].data.until : null;
      mod = m[5].data === true;
      (m[6].data || []).forEach(function (x) { stars[x.topic_id] = true; });
      (m[7].data || []).forEach(function (x) { follows[x.followee_id] = true; });
      var fips = m[0].data && m[0].data.county_fips, c = fips && counties[fips];
      var asked = new URLSearchParams(location.search).get("r") || "";
      var askedC = /^co-[0-9]{5}$/.test(asked) && counties[asked.slice(3)];
      var home = c ? fips : askedC ? asked.slice(3) : null;
      places = home ? ["co-" + home, "st-" + counties[home][1], "us"] : ["us"];
      if (PLACE_RE.test(asked) && places.indexOf(asked) < 0) places.push(asked);
      place = PLACE_RE.test(asked) ? asked : places[0];
      frame();
      return loadTopics().then(function () { route(); bell(); });
    });
  }).catch(function () {
    box.innerHTML = '<p class="note">Couldn\'t load Talk. Try refreshing.</p>';
  });
})();
