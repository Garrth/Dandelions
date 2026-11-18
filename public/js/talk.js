// Talk: posts with comments, newest first, in topics for your county, your state and the whole US.
// No algorithm: every list is in time order. Anyone can read. Members agree to the Talk rules once, then post,
// comment, agree or disagree with posts, star topics and follow people. Follows are private, so nobody has a follower count.
// Nobody approves posts: a post flagged by 3 different ID-checked members is hidden (anyone can flag, 10 a day, and every
// flag shows on the moderators' Flagged list). Moderators can hide, put back,
// pause someone, make and edit topics, and move a post into a topic. Everything a moderator does is logged.
(function () {
  var cfg = window.DANDELIONS_CONFIG || {};
  var box = document.getElementById("talk");
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function bodyHtml(s) { return esc(s); }
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
    talk_rules: "Agree to the Talk rules first.",
    talk_suggest_title: "Give your suggested topic a name in the title.",
    talk_suggest_exists: "There's already a topic with that name. Post there instead."
  };
  function errText(e) {
    var m = (e && e.message) || "";
    for (var k in ERR) if (m.indexOf(k) >= 0) return ERR[k];
    return "Couldn't send just now. Try again.";
  }
  var COLS = "id,room,topic_id,kind,author_id,author_name,title,body,replies,backers,disagrees,people,created_at,hidden,deleted,parent_id";
  var PLACE_RE = /^(us|st-[A-Z]{2}|co-[0-9]{5})$/, ID_RE = /^[0-9a-f-]{36}$/;

  var user = null, agreed = false, mod = false, pausedUntil = null, counties = {};
  var places = [], place = "", topics = [], stars = {}, follows = {}, backed = {}, flagged = {}, mods = {};
  var view = {}, topPost = null, notices = [];
  // Rai: the Catching on list for General, and which idea each General post is in.
  var ideas = [], ideaByPost = {};
  var raiUrl = (cfg.supabaseUrl || "") + "/functions/v1/rai";
  // Signed in: send the member's own token so Rai counts their questions by account, not by address.
  // Only a token with over a minute left, so an old one never blocks the question.
  function raiToken() {
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!/^sb-.*-auth-token$/.test(k)) continue;
        var t = JSON.parse(localStorage.getItem(k) || "null");
        if (t && t.access_token && t.expires_at && t.expires_at * 1000 > Date.now() + 60000) return t.access_token;
      }
    } catch (e) {}
    return cfg.supabaseKey || "";
  }
  function raiCall(body) {
    return fetch(raiUrl, { method: "POST", headers: { "Content-Type": "application/json", apikey: cfg.supabaseKey || "", Authorization: "Bearer " + raiToken() }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); }).catch(function () { return {}; });
  }
  // @Rai: Rai only speaks in Talk when someone writes @Rai. He answers that message once, in public.
  var AT_RAI = /(^|[^a-z0-9_])@rai([^a-z0-9_]|$)/i;
  var raiTried = {}, raiByPost = {};
  function askRaiIn(postId, threadId, quiet) {
    raiTried[postId] = 1;
    if (!quiet) toast("Rai is reading the conversation...");
    raiCall({ action: "talk_mention", post: postId }).then(function (o) {
      if (o && o.made) { if (view.kind === "post" && view.p === threadId) showPost(); else if (view.kind === "feed") showFeed(); else toast("Rai answered. Open the post to read it."); }
      else if (o && /limit/.test(o.error || "")) toast("Rai has answered all he can for today. Try again tomorrow.");
      else if (!quiet && !(o && o.made === false)) toast("Rai couldn't answer just now. Open the post in a few minutes and he'll try again.");
    });
  }
  function raiRow(x) {
    var md = window.RaiChat && window.RaiChat.md;
    return '<div class="tk-comment tk-rai' + (x.hidden ? " hid" : "") + '"><span class="badge tk-raibadge" aria-hidden="true">R</span><div class="tk-cbody">' +
      '<div class="tk-by"><b class="tk-name">Rai</b> <span class="chip">AI guide</span><span class="muted">· ' + ago(x.created_at) + "</span>" + (x.hidden ? ' <span class="chip warn">Hidden</span>' : "") + "</div>" +
      '<div class="tk-body tk-raitext">' + (md ? md(x.body) : "<p>" + esc(x.body) + "</p>") + "</div>" +
      '<div class="tk-foot"><span class="small muted">Rai answers when asked with @Rai, and can be wrong.</span>' +
      (mod ? ' <button class="linkbtn" type="button" data-hiderai="' + x.id + '" data-on="' + !x.hidden + '">' + (x.hidden ? "Put back" : "Hide") + "</button>" : "") + "</div></div></div>";
  }
  // Topics for every place ('any') show posts from every place.
  function everyone(t) { return !!(t && t.room === "any"); }
  // Baselines: each one has its own topic. Proposed changes are posts in that topic, with a vote attached.
  var BK = window.BaselineKit, bboard = null, bByTopic = {}, propByPost = {};
  function loadBaselines() {
    if (!BK) return Promise.resolve();
    return BK.load(db, function () { loadBaselines().then(route); }).then(function (b) {
      bboard = b; bByTopic = {}; propByPost = {};
      b.baselines.forEach(function (x) { if (x.topic_id) bByTopic[x.topic_id] = x; });
      b.proposals.forEach(function (x) { if (x.talk_post_id) propByPost[x.talk_post_id] = x; });
    }).catch(function () {});
  }

  function placeName(id) {
    var c = counties[(id || "").slice(3)];
    return id === "us" ? "The whole US" : id && id.indexOf("co-") === 0 && c ? c[0] + ", " + c[1] : id && id.indexOf("st-") === 0 ? "All of " + id.slice(3) : "Talk";
  }
  function topicById(id) { return topics.filter(function (t) { return t.id === id; })[0]; }
  // Real moderators get a badge, so nobody can pass as one.
  function modChip(id) { return mods[id] ? ' <span class="chip">Moderator</span>' : ""; }
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
    else if (q.s) { s.set("r", q.r || place); s.set("s", q.s); }
    else if (q.u) s.set("u", q.u);
    else if (q.following) s.set("following", "1");
    else if (q.flagged) s.set("flagged", "1");
    else if (q.modlog) s.set("modlog", "1");
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
    var grouped = open.filter(function (t) { return t.section; });
    var pinned = open.filter(function (t) { return t.pinned && !t.section; });
    var starred = open.filter(function (t) { return !t.pinned && !t.section && stars[t.id]; });
    var sections = [];
    grouped.forEach(function (t) { if (sections.indexOf(t.section) < 0) sections.push(t.section); });
    $("tlist").innerHTML =
      '<a data-nav class="tk-topic' + (cur === "" ? " on" : "") + '" href="' + esc(href({ r: place })) + '"><span>General</span></a>' +
      sections.map(function (sec) {
        return '<div class="tk-group">' + esc(sec) + "</div>" + grouped.filter(function (t) { return t.section === sec; })
          .sort(function (a, b) { return blOrder(a) - blOrder(b) || a.name.localeCompare(b.name); })
          .map(function (t) { return row(t); }).join("");
      }).join("") +
      pinned.map(function (t) { return row(t, "📌"); }).join("") +
      starred.map(function (t) { return row(t, "★"); }).join("") +
      '<div class="tk-rule"></div>' +
      '<a data-nav class="tk-topic quiet' + (view.kind === "all" ? " on" : "") + '" href="' + esc(href({ r: place, all: 1 })) + '"><span>All topics (' + open.length + ")</span></a>" +
      (user ? '<a data-nav class="tk-topic quiet' + (view.kind === "following" ? " on" : "") + '" href="' + esc(href({ following: 1 })) + '"><span>People you follow (' + Object.keys(follows).length + ")</span></a>" :
        '<p class="small muted tk-hint">Log in to star topics so they stay here.</p>') +
      '<a data-nav class="tk-topic quiet' + (view.kind === "modlog" ? " on" : "") + '" href="' + esc(href({ modlog: 1 })) + '"><span>Moderator log</span></a>' +
      (mod ? '<a data-nav class="tk-topic quiet' + (view.kind === "flagged" ? " on" : "") + '" href="' + esc(href({ flagged: 1 })) + '"><span>Flagged posts (moderators)</span></a>' : "");
    each($("tlist"), "a", function (a) { a.addEventListener("click", closeSide); });
  }
  function blOrder(t) { var b = bByTopic[t.id]; return b && bboard ? bboard.baselines.indexOf(b) : 99; }
  function topicsButton() { return '<button class="btn ghost small tk-open" type="button" data-openside>☰ Topics</button>'; }
  function wireOpen(root) { each(root, "[data-openside]", function (b) { b.addEventListener("click", openSide); }); }

  function loadTopics() {
    return db.from("talk_topics").select("id,room,name,about,pinned,archived,posts,last_post_at,made_by,section,created_by,created_at").in("room", ["any", place]).order("last_post_at", { ascending: false }).limit(300)
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
      '<div class="tk-by">' + badge(p.author_name, p.author_id) + '<a data-nav class="tk-name" href="' + esc(href({ u: p.author_id })) + '">' + esc(p.author_name) + "</a>" + modChip(p.author_id) +
        '<span class="muted">· ' + ago(p.created_at) + "</span>" + (p.hidden ? ' <span class="chip warn">Hidden</span>' : "") +
        (ideaByPost[p.id] && ideaByPost[p.id].suggested && ideaByPost[p.id].posts[0] === p.id ? ' <span class="chip sun">Topic suggestion</span>' : "") +
        (opt.where ? ' <span class="muted small">in ' + esc(t ? t.name : "General") + (p.room !== place ? ", " + esc(placeName(p.room)) : "") + "</span>" : "") + follow + "</div>" +
      (p.deleted ? '<p class="muted">Removed by its author</p>' :
        (p.title ? "<h3 class=\"tk-title\">" + (opt.link ? '<a data-nav href="' + esc(href({ p: p.id })) + '">' + esc(p.title) + "</a>" : esc(p.title)) + "</h3>" : "") +
        (p.body ? '<p class="tk-body">' + bodyHtml(opt.link && p.body.length > 500 ? p.body.slice(0, 500) + "..." : p.body) + "</p>" : "") +
        (propByPost[p.id] && bboard ? '<div class="tk-prop">' + BK.steps(propByPost[p.id]) + "<p>" + BK.stateLine(propByPost[p.id], bboard.settings) + "</p>" +
          (opt.link ? '<p><a data-nav href="' + esc(href({ p: p.id })) + '">See the wording' + (propByPost[p.id].status === "vote" || propByPost[p.id].status === "final" ? " and vote" : "") + "</a></p>" : "") + "</div>" : "")) +
      '<div class="tk-foot">' + agreeBtns(p) +
        (opt.link ? '<a data-nav class="tk-comments" href="' + esc(href({ p: p.id })) + '">' + talkers(p) + nComments(p) + (nComments(p) === 1 ? " comment" : " comments") + "</a>" : "") +
        (p.deleted ? "" : tools(p)) + "</div>" +
    "</article>";
  }
  function commentRow(c) {
    return '<div class="tk-comment' + (c.hidden ? " hid" : "") + '">' + badge(c.author_name, c.author_id) + '<div class="tk-cbody">' +
      '<div class="tk-by"><a data-nav class="tk-name" href="' + esc(href({ u: c.author_id })) + '">' + esc(c.author_name) + "</a>" + modChip(c.author_id) + '<span class="muted">· ' + ago(c.created_at) + "</span>" +
        (c.hidden ? ' <span class="chip warn">Hidden</span>' : "") + "</div>" +
      (c.deleted ? '<p class="muted">Removed by its author</p>' : '<p class="tk-body">' + bodyHtml(c.body) + "</p>") +
      '<div class="tk-foot">' + (c.deleted ? "" : tools(c)) + "</div></div></div>";
  }
  // Rai's answers count as comments, so it's clear there's something to read.
  function nComments(p) { return (p.replies || 0) + (raiByPost[p.id] || 0); }
  // How many answers Rai has given in each of these posts.
  function raiCounts(list) {
    if (!list.length) return Promise.resolve();
    return db.from("talk_rai_replies").select("post_id").in("post_id", list.map(function (p) { return p.id; })).limit(1000).then(function (x) {
      list.forEach(function (p) { delete raiByPost[p.id]; });
      ((x && x.data) || []).forEach(function (y) { raiByPost[y.post_id] = (raiByPost[y.post_id] || 0) + 1; });
    }, function () {});
  }
  // People taking part: who wrote the post or a comment.
  function talkers(p) { return p.people > 1 ? p.people + " people · " : ""; }
  // Agree and Disagree, on main posts only. Totals only: nobody sees who chose which. Tap again to take it back.
  function agreeBtns(p) {
    var mine = user && p.author_id === user.id, me = backed[p.id], can = user && !mine && !p.deleted;
    function one(a, label, n) {
      var on = me === (a ? "a" : "d");
      // Can't choose: the button still says why when tapped, instead of doing nothing.
      var why = p.deleted ? "" : !user ? "Log in to agree or disagree." : "You can't agree or disagree with your own post.";
      return '<button class="tk-plus' + (on ? " on" : "") + (can ? "" : " off") + '" type="button"' + (can ? ' data-agree="' + (a ? 1 : 0) + '"' : why ? ' data-why="' + esc(why) + '"' : " disabled") + ' aria-pressed="' + on + '"' +
        (can ? "" : ' aria-label="' + label + ": " + n + '"') + ">" + label + '<span class="n">' + (n ? " · " + n : "") + "</span></button>";
    }
    return '<span class="tk-agree" data-post="' + p.id + '" data-na="' + (p.backers || 0) + '" data-nd="' + (p.disagrees || 0) + '">' +
      one(true, "Agree", p.backers || 0) + one(false, "Disagree", p.disagrees || 0) + "</span>";
  }
  // What a person can do to one post: delete their own, flag someone else's, and for moderators hide, put back, pause or move.
  function tools(p) {
    if (!user) return "";
    var mine = p.author_id === user.id, out = [];
    if (mine) out.push('<button class="linkbtn" type="button" data-del="' + p.id + '">Delete</button>');
    if (mine && ideaByPost[p.id]) out.push('<button class="linkbtn" type="button" data-noidea="' + p.id + '" title="Rai put this under ' + esc(ideaByPost[p.id].name) + '">Not about ' + esc(ideaByPost[p.id].name) + "</button>");
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
    each(root, "[data-why]", function (b) { b.addEventListener("click", function () { toast(b.getAttribute("data-why")); }); });
    each(root, ".tk-agree", function (box) {
      var id = box.getAttribute("data-post");
      each(box, "[data-agree]", function (b) {
        b.addEventListener("click", function () {
          var want = b.getAttribute("data-agree") === "1" ? "a" : "d", had = backed[id], btns = box.querySelectorAll("button");
          for (var i = 0; i < btns.length; i++) btns[i].disabled = true;
          var q = db.from("talk_backs");
          var req = had === want ? q.delete().eq("post_id", id).eq("member_id", user.id) :
            had ? q.update({ agree: want === "a" }).eq("post_id", id).eq("member_id", user.id) : q.insert({ post_id: id, agree: want === "a" });
          req.then(function (r) {
            for (var i = 0; i < btns.length; i++) btns[i].disabled = false;
            if (r.error) { toast("Couldn't save that. Try again."); return; }
            var na = Number(box.getAttribute("data-na")), nd = Number(box.getAttribute("data-nd"));
            if (had === "a") na--; if (had === "d") nd--;
            if (had !== want) { if (want === "a") na++; else nd++; backed[id] = want; } else delete backed[id];
            box.setAttribute("data-na", na); box.setAttribute("data-nd", nd);
            [["1", na, "a"], ["0", nd, "d"]].forEach(function (x) {
              var el = box.querySelector('[data-agree="' + x[0] + '"]'), on = backed[id] === x[2];
              el.querySelector(".n").textContent = x[1] ? " · " + x[1] : "";
              el.classList.toggle("on", on); el.setAttribute("aria-pressed", String(on));
            });
            // Disagreeing is a good start to a conversation.
            if (backed[id] === "d") {
              var ta = view.kind === "post" && view.p === id && $("rbody");
              if (ta) { ta.placeholder = "Want to say why? (optional)"; ta.focus(); } else toast("Noted. You can say why in the comments.");
            }
          });
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
    each(root, "[data-hiderai]", function (b) {
      b.addEventListener("click", function () {
        var hide = b.getAttribute("data-on") === "true";
        db.rpc("talk_mod_hide_rai", { p_reply: b.getAttribute("data-hiderai"), p_hide: hide }).then(function (r) {
          if (r.error) { toast("Couldn't do that. Try again."); return; }
          toast(hide ? "Hidden" : "Put back"); again();
        });
      });
    });
    each(root, "[data-noidea]", function (b) {
      b.addEventListener("click", function () {
        db.rpc("talk_idea_skip", { p_post: b.getAttribute("data-noidea") }).then(function (r) {
          if (r.error) { toast("Couldn't save that. Try again."); return; }
          toast("Done. Rai won't group that post again."); again();
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
              if (r.error && /talk_flag_limit/.test(r.error.message || "")) { toast("Ten flags a day is the most. Try again tomorrow."); return; }
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
      '<div class="tk-head"><div class="tk-headrow">' + topicsButton() + '<div class="tk-htext"><div class="eyebrow">' + esc(t && bByTopic[t.id] ? "Baselines · everyone" : everyone(t) ? "Everyone" : placeName(place)) + "</div><h1>" + esc(name) + "</h1></div>" +
        (user && !paused() ? '<button class="btn small" type="button" id="newpost">New post</button>' : "") + "</div>" +
        '<p class="muted tk-about">' + (t ? esc(t.about || "") : "Anything goes here. Ideas that catch on get their own topic.") + "</p>" +
        (t ? '<div class="row tk-actions"><a data-nav class="btn ghost small" href="' + esc(href({ r: place, s: t.id })) + '">✦ Summary</a>' +
          '<button class="btn ghost small" type="button" data-askrai>Ask Rai about this topic</button></div>' : "") +
        (t && canRename(t) ? '<p class="small"><button class="linkbtn" type="button" id="renametopic">Rename this topic</button> <span class="muted">(you started it, so you can rename it today)</span></p>' : "") +
        (t && mod ? '<button class="linkbtn" type="button" id="edittopic">Edit topic</button>' : "") + "</div>" +
      (t ? "" : '<div id="catching"></div>') +
      (t && bByTopic[t.id] ? baselineBox(bByTopic[t.id]) : "") +
      '<div id="topicform"></div>' +
      (!user ? joinPrompt() : paused() ? pauseNote() :
        '<form class="card tk-compose" id="compose" hidden><label class="field"><span id="ctlabel">Title (optional)</span><input id="ctitle" maxlength="120" placeholder="Sum it up in a few words"></label>' +
        '<label class="field">Your post<textarea id="cbody" maxlength="2000" rows="3" placeholder="Say what you think, or what you\'d do about it"></textarea></label>' +
        (t ? "" : '<label class="check"><input type="checkbox" id="csuggest"> Suggest this as a new topic</label>' +
          '<p class="small muted" id="csuggestnote" hidden>Your suggestion goes on Catching on, and when enough people join in, the topic opens on its own.</p>') +
        '<div class="spread"><span class="small muted">In ' + esc(name) + ", " + esc(everyone(t) ? "for everyone" : placeName(place)) + '</span><div class="row"><button class="btn ghost small" type="button" id="cancelpost">Cancel</button><button class="btn small" type="submit">Post</button></div></div>' +
        '<p class="small muted" id="cmsg" role="status"></p></form>') +
      '<div id="newbar"></div><div id="posts"><p class="muted">Loading...</p></div>' +
      '<details class="rulesbox"><summary>Talk rules</summary>' + rulesList() + "</details>";
    wireOpen(main);
    if ($("newpost")) $("newpost").addEventListener("click", function () { $("compose").hidden = false; $("cbody").focus(); });
    if ($("cancelpost")) $("cancelpost").addEventListener("click", function () { $("compose").hidden = true; });
    if ($("csuggest")) $("csuggest").addEventListener("change", function () {
      $("csuggestnote").hidden = !this.checked;
      $("ctlabel").textContent = this.checked ? "Topic name" : "Title (optional)";
      $("ctitle").placeholder = this.checked ? "The topic's name, like Community garden" : "Sum it up in a few words";
      if (this.checked) $("ctitle").focus();
    });
    if ($("edittopic")) $("edittopic").addEventListener("click", function () { topicForm(t); });
    if ($("renametopic")) $("renametopic").addEventListener("click", function () { renameForm(t); });
    wireAsk(main, t);
    // General shows Catching on first, so post cards know which idea they're in.
    var ideasReady = t ? Promise.resolve() : catchingOn(true);
    if ($("compose")) $("compose").addEventListener("submit", function (e) {
      e.preventDefault();
      var title = $("ctitle").value.trim(), body = $("cbody").value.trim(), suggest = !!($("csuggest") && $("csuggest").checked);
      if (!title && !body) { $("cmsg").textContent = ERR.talk_empty; $("cbody").focus(); return; }
      if (suggest && title.length < 3) { $("cmsg").textContent = ERR.talk_suggest_title; $("ctitle").focus(); return; }
      needRules(function () {
        $("cmsg").textContent = "Posting...";
        var row = { room: t && bByTopic[t.id] ? "us" : place, topic_id: t ? t.id : null, kind: "post", title: title, body: body };
        if (suggest) row.suggest = true;
        db.from("talk_posts").insert(row).select("id").single().then(function (r) {
          if (r.error) { $("cmsg").textContent = errText(r.error); return; }
          toast(suggest ? "Suggested. It's on Catching on now." : "Posted"); showFeed();
          if (r.data && AT_RAI.test(title + " " + body)) askRaiIn(r.data.id, r.data.id);
        });
      });
    });
    Promise.all([feedQuery(), ideasReady]).then(function (o) {
      var r = o[0], list = r.data || [];
      return raiCounts(list).then(function () { return o; });
    }).then(function (o) {
      var r = o[0], list = r.data || [];
      topPost = list[0] ? list[0].id : null;
      $("posts").innerHTML = r.error ? '<p class="note">Couldn\'t load posts. Try refreshing.</p>' : list.length ?
        list.map(function (p) { return postCard(p, { link: true }); }).join("") :
        '<p class="note">No posts here yet. ' + (user ? "Write the first one." : "Log in to write the first one.") + "</p>";
      wire($("posts"), showFeed);
    });
  }
  function feedQuery() {
    // Baseline topics are for everyone, so they show posts from every place.
    var q = db.from("talk_posts").select(COLS).is("parent_id", null).eq("deleted", false);
    if (!(view.t && everyone(topicById(view.t)))) q = q.eq("room", place);
    q = view.t ? q.eq("topic_id", view.t) : q.is("topic_id", null);
    return q.order("created_at", { ascending: false }).limit(50);
  }

  // ---- Rai in Talk ----
  function canRename(t) {
    return user && t.made_by === "traction" && t.created_by === user.id && Date.now() - new Date(t.created_at).getTime() < 86400000;
  }
  function renameForm(t) {
    var f = $("topicform");
    f.innerHTML = '<form class="card tk-compose" id="rform"><label class="field">New name<input id="rname" maxlength="60" required value="' + esc(t.name) + '"></label>' +
      '<div class="row"><button class="btn small" type="submit">Save</button><button class="btn ghost small" type="button" id="rcancel">Cancel</button></div></form>';
    $("rcancel").addEventListener("click", function () { f.innerHTML = ""; });
    $("rform").addEventListener("submit", function (e) {
      e.preventDefault();
      db.rpc("talk_topic_rename", { p_topic: t.id, p_name: $("rname").value.trim() }).then(function (r) {
        if (r.error) { toast(/duplicate|unique/.test(r.error.message || "") ? "There's already a topic with that name here." : "Couldn't rename it. Try again."); return; }
        toast("Renamed"); loadTopics().then(route);
      });
    });
  }
  // "Ask Rai about this topic" opens the Rai panel, which also reads the topic.
  function wireAsk(root, t) {
    each(root, "[data-askrai]", function (b) {
      b.addEventListener("click", function () {
        window.RaiTopic = t ? t.id : "";
        if (window.RaiChat) window.RaiChat.open(b.getAttribute("data-q") || "");
      });
    });
  }
  function snippet(p) { var x = (p.title || p.body || "").replace(/\s+/g, " "); return x.length > 90 ? x.slice(0, 90) + "..." : x; }
  // Under a point or an idea: the posts behind it, loaded when someone opens the list.
  function wireSources(root) {
    each(root, "details[data-posts]", function (d) {
      d.addEventListener("toggle", function () {
        if (!d.open || d.getAttribute("data-done")) return;
        d.setAttribute("data-done", "1");
        var ids = d.getAttribute("data-posts").split(",").filter(function (x) { return ID_RE.test(x); });
        db.from("talk_posts").select("id,title,body,author_name,created_at,parent_id").in("id", ids).then(function (r) {
          var list = (r.data || []).sort(function (a, b) { return ids.indexOf(a.id) - ids.indexOf(b.id); });
          d.querySelector(".tk-src").innerHTML = list.length ? list.map(function (p) {
            return '<a data-nav href="' + esc(href({ p: p.parent_id || p.id })) + '">' + esc(snippet(p)) + '<span class="muted small"> · ' + esc(p.author_name) + ", " + ago(p.created_at) + "</span></a>";
          }).join("") : '<p class="small muted">Those posts aren\'t here anymore.</p>';
        });
      });
    });
  }
  function sources(ids) {
    if (!ids || !ids.length) return "";
    return '<details class="tk-srcbox" data-posts="' + esc(ids.join(",")) + '"><summary>' + (ids.length === 1 ? "Read the post" : "Read the " + ids.length + " posts") +
      '</summary><div class="tk-src"><p class="small muted">Loading...</p></div></details>';
  }

  // ---- Catching on: ideas in General that keep coming up ----
  function catchingOn(ask) {
    var at = place;
    return db.rpc("talk_catching_on", { p_room: at }).then(function (r) {
      if (at !== place) return;
      ideas = (r && r.data) || []; ideaByPost = {};
      ideas.forEach(function (x) { if (!x.topic_id) (x.posts || []).forEach(function (id) { ideaByPost[id] = x; }); });
      var box = $("catching");
      if (box) {
        var open = ideas.filter(function (x) { return !x.topic_id; });
        box.innerHTML = !ideas.length ? (user ? '<p class="small muted tk-catchhint">Want a new topic? Tap New post and tick Suggest this as a new topic. When enough people join in, it opens on its own.</p>' : "") :
          '<div class="card tk-catch"><div class="spread"><b>Catching on</b><span class="small muted">Rai groups posts about the same idea</span></div>' +
          ideas.map(function (x) {
            var t = x.topic_id && topicById(x.topic_id);
            if (x.topic_id) return '<div class="tk-idea done"><p>✓ <b>' + esc(x.name) + "</b> got its own topic" + (t ? ': <a data-nav href="' + esc(href({ r: at, t: x.topic_id })) + '">' + esc(t.name) + " ›</a>" : "") + "</p></div>";
            var pct = Math.min(100, Math.round(100 * x.people / x.need_people));
            return '<div class="tk-idea"><div class="spread"><b>' + esc(x.name) + (x.suggested ? ' <span class="chip">Suggested</span>' : "") + '</b><span class="small">' + x.people + " of " + x.need_people + " people</span></div>" +
              '<div class="tk-bar" role="img" aria-label="' + x.people + " of " + x.need_people + ' people"><i style="width:' + pct + '%"></i></div>' +
              (x.about ? '<p class="small muted">' + esc(x.about) + "</p>" : "") + sources(x.posts) + "</div>";
          }).join("") +
          (open.length ? '<p class="small muted tk-catchnote">When ' + open[0].need_people + " different people take part over at least " + open[0].need_days +
            " days (posting, commenting, agreeing or disagreeing), an idea gets its own topic. Nobody has to approve it." +
            (user ? " To suggest one, tap New post and tick Suggest this as a new topic." : "") + "</p>" : "") + "</div>";
        wireSources(box);
      }
      // Rai catches up in the background. If it changed anything, show the new list.
      if (ask) raiCall({ action: "talk_ideas", place: at }).then(function (o) {
        if (at !== place || view.kind !== "feed" || view.t) return;
        if (o && o.made) { toast("An idea caught on and got its own topic."); loadTopics().then(function () { sideList(); catchingOn(false); }); }
        else if (o && "made" in o) catchingOn(false);
      });
    });
  }

  // ---- One person's view: "What does Maria think?" ----
  function people(box, t) {
    var q = db.from("talk_posts").select("author_id,author_name").eq("topic_id", t.id).eq("deleted", false).eq("hidden", false).limit(1000);
    if (!everyone(t)) q = q.eq("room", place);
    q.then(function (r) {
      var by = {}, order = [];
      (r.data || []).forEach(function (x) { if (!by[x.author_id]) { by[x.author_id] = { name: x.author_name, n: 0 }; order.push(x.author_id); } by[x.author_id].n++; });
      if (!order.length || !$("sum")) return;
      order.sort(function (a, b) { return by[b].n - by[a].n; });
      box.insertAdjacentHTML("beforeend", '<div class="card tk-sum tk-people"><h2>People in this conversation</h2><p class="small muted">Ask Rai to sum up what one person has said here, with links to their posts.</p>' +
        order.slice(0, 30).map(function (id) {
          var x = by[id];
          return '<div class="tk-person"><div class="spread"><span class="row" style="gap:8px">' + badge(x.name, id) + '<a data-nav href="' + esc(href({ u: id })) + '">' + esc(x.name) + '</a><span class="small muted">' + x.n + (x.n === 1 ? " post" : " posts") + "</span></span>" +
            '<button class="btn ghost small" type="button" data-pview="' + esc(id) + '">What does ' + esc(x.name) + " think?</button></div><div data-pout></div></div>";
        }).join("") + "</div>");
      each(box, "[data-pview]", function (b) {
        b.addEventListener("click", function () {
          var outEl = b.closest(".tk-person").querySelector("[data-pout]"), nm = by[b.getAttribute("data-pview")].name;
          b.disabled = true; outEl.innerHTML = '<p class="small muted">Rai is reading ' + esc(nm) + "'s posts...</p>";
          raiCall({ action: "talk_person", topic: t.id, author: b.getAttribute("data-pview") }).then(function (o) {
            b.disabled = false;
            var v = o && o.view;
            if (!v) { outEl.innerHTML = '<p class="small muted">' + (o && /limit/.test(o.error || "") ? "Rai has done all he can for today. Try again tomorrow." : "Rai couldn't do that just now. Try again in a minute.") + "</p>"; return; }
            outEl.innerHTML = '<div class="tk-pview"><p>' + esc(v.view) + "</p>" +
              (v.points && v.points.length ? "<ul>" + v.points.map(function (pt) { return "<li>" + esc(pt.text) + sources(pt.posts) + "</li>"; }).join("") + "</ul>" : "") +
              '<p class="small muted">Rai\'s summary of ' + esc(nm) + "'s own posts. Rai can be wrong, so read their posts before quoting them.</p></div>";
            wireSources(outEl);
          });
        });
      });
    });
  }

  // ---- A topic's Summary ----
  function showSummary() {
    var t = topicById(view.t), main = $("main");
    if (!t) { go({ r: place }); return; }
    document.title = "Summary: " + t.name + " · Talk | Dandelions";
    main.innerHTML = '<a data-nav class="crumb" href="' + esc(href({ r: place, t: t.id })) + '">‹ ' + esc(t.name) + "</a>" +
      '<div class="tk-head"><div class="tk-headrow">' + topicsButton() + '<div class="tk-htext"><div class="eyebrow">Rai\'s summary</div><h1>' + esc(t.name) + "</h1></div></div></div>" +
      '<div id="sum"><p class="muted">Loading...</p></div>';
    wireOpen(main);
    var asked = false;
    function draw() {
      db.from("talk_summaries").select("topic_id,body,messages,people,made_at,flags").eq("topic_id", t.id).maybeSingle().then(function (r) {
        var s = r.data, b = s && s.body, box = $("sum");
        if (!box || view.kind !== "summary" || view.t !== t.id) return;
        var ask = '<div class="card tk-askrai"><p><b>Talk it over with Rai.</b> Rai has read this topic and can answer questions about it.</p><div class="row" style="margin-top:8px">' +
          ["What's the strongest case against?", "What do people agree on?"].map(function (q) {
            return '<button class="btn ghost small" type="button" data-askrai data-q="' + esc(q) + '">' + esc(q) + "</button>";
          }).join("") + '<button class="btn small" type="button" data-askrai>Ask Rai</button></div></div>';
        var waiting = asked ? "" : '<p class="small muted tk-reading" id="reading">Rai is checking for new posts...</p>';
        if (!b) {
          box.innerHTML = waiting + '<p class="note">No summary yet. Rai writes one once a topic has 3 posts or comments, then keeps it up to date.</p>' +
            '<p style="margin:12px 0"><a data-nav href="' + esc(href({ r: place, t: t.id })) + '">Go to the posts</a></p>' + ask;
        } else {
          var when = ago(s.made_at);
          box.innerHTML = waiting +
            (s.flags >= 3 ? '<p class="note warn">Members say this summary may be off. Rai will look again at the next update.</p>' : "") +
            '<div class="card tk-sum"><h2>How people lean</h2><p>' + esc(b.lean) + "</p></div>" +
            (b.points && b.points.length ? '<div class="card tk-sum"><h2>Main points</h2><ol class="tk-points">' + b.points.map(function (pt) {
              return "<li><p>" + esc(pt.text) + "</p>" + sources(pt.posts) + "</li>";
            }).join("") + "</ol></div>" : "") +
            (b.questions && b.questions.length ? '<div class="card tk-sum"><h2>Open questions</h2><ul>' + b.questions.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div>" : "") +
            (b.missing && b.missing.length ? '<div class="card tk-sum"><h2>What\'s missing</h2><ul>' + b.missing.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div>" : "") +
            '<p class="small muted tk-summeta">Written by Rai from ' + s.messages + " posts and comments by " + s.people + (s.people === 1 ? " person" : " people") + ", " + when + (when === "just now" ? "" : " ago") +
              ". Rai can be wrong, so read the posts behind each point. Rai doesn't take sides or decide anything.</p>" +
            (user ? '<p class="tk-off"><button class="linkbtn" type="button" id="sumoff">This summary is off</button></p><div id="offbox"></div>' : "") + ask;
          wireSources(box);
          if ($("sumoff")) $("sumoff").addEventListener("click", function () {
            $("offbox").innerHTML = '<form class="card tk-compose" id="offf"><label class="field">What\'s off about it?<textarea id="offnote" maxlength="300" rows="2" placeholder="For example: it missed the worries about cost"></textarea></label>' +
              '<div class="row"><button class="btn small" type="submit">Send</button><button class="btn ghost small" type="button" id="offcancel">Cancel</button></div></form>';
            $("offcancel").addEventListener("click", function () { $("offbox").innerHTML = ""; });
            $("offf").addEventListener("submit", function (e) {
              e.preventDefault();
              db.rpc("talk_summary_flag", { p_topic: t.id, p_note: $("offnote").value.trim() }).then(function (x) {
                if (x.error) { toast("Couldn't send that. Try again."); return; }
                $("offbox").innerHTML = '<p class="small muted">Thanks. Rai will reread the topic and rewrite the summary the next time someone opens it.</p>';
              });
            });
          });
        }
        wireAsk(box, t);
        people(box, t);
      });
    }
    draw();
    raiCall({ action: "talk_summary", topic: t.id }).then(function (o) {
      asked = true;
      if (view.kind !== "summary" || view.t !== t.id) return;
      if (o && o.made) draw(); else if ($("reading")) $("reading").remove();
    });
  }

  // ---- Baselines in Talk ----
  function baselineBox(b) {
    var open = bboard.proposals.filter(function (p) { return p.baseline_key === b.key && BK.isOpen(p); });
    return '<div class="card tk-bl"><p>Chat about the <b>' + esc(b.title) + '</b> baseline here. <a href="/app/baselines.html?b=' + b.key + '">Read the current wording</a>.</p>' +
      (open.length ? '<p class="small">In progress: ' + open.map(function (p) { return '<a data-nav href="' + esc(href({ p: p.talk_post_id })) + '">' + esc(p.summary) + "</a> (" + esc(p.status === "support" ? "gathering support" : p.status === "discuss" ? "discussion" : p.status === "vote" ? "voting" : p.status === "final" ? "final check" : "final wording") + ")"; }).join(", ") + "</p>" : "") +
      "</div>";
  }
  function proposalFull(p) {
    var b = bboard.baselines.filter(function (x) { return x.key === p.baseline_key; })[0] || {};
    var act = "", q = p.status === "vote" ? "Should this change go ahead?" : p.status === "final" ? "Does Rai's final wording match what we agreed?" : "";
    if (q) {
      act = !user ? joinPrompt("vote") : !bboard.me.verified ?
        '<p class="note">Only ID-checked members vote, so every vote is one real person. <a href="/app/profile.html">Check your ID on your profile</a>.</p>' :
        '<div><p><b>' + esc(q) + '</b></p><div class="row" style="margin-top:6px">' + ["yes", "no", "pass"].map(function (c) {
          var label = c === "yes" ? (p.status === "final" ? "Yes, it matches" : "Yes") : c === "no" ? "No" : "Pass";
          return '<button type="button" class="btn small' + (p.my_vote === c ? "" : " ghost") + '" data-bvote="' + c + '" aria-pressed="' + (p.my_vote === c) + '">' + label + "</button>";
        }).join("") + '</div><p class="small muted" style="margin-top:6px">' + (p.my_vote ? "You voted " + esc(p.my_vote) + ". You can change it until the vote closes." : "Your vote is private.") + "</p></div>";
    } else if (p.status === "support") {
      act = '<p class="small muted">' + (user && p.mine ? "It needs other members to agree, and more agree than disagree. Share this post to get the word out." : "Think it should go to a vote? Tap Agree. If not, tap Disagree and say why.") + "</p>";
    }
    return '<div class="tk-propfull">' + (act ? '<div class="card">' + act + "</div>" : "") + BK.texts(p, b) + BK.howItWorks(bboard.settings) + "</div>";
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
      db.from("talk_posts").select(COLS).eq("parent_id", id).order("created_at", { ascending: true }).limit(500),
      db.from("talk_rai_replies").select("id,asked_by,body,created_at,hidden").eq("post_id", id).order("created_at", { ascending: true }).limit(200)
    ]).then(function (o) {
      var p = o[0].data, reps = o[1].data || [], main = $("main");
      // Rai's answers sit in the thread right after the message that asked.
      var rai = (o[2] && o[2].data) || [], thread = [];
      rai.filter(function (x) { return x.asked_by === id; }).forEach(function (x) { thread.push({ rai: x }); });
      reps.forEach(function (c) { thread.push({ c: c }); rai.filter(function (x) { return x.asked_by === c.id; }).forEach(function (x) { thread.push({ rai: x }); }); });
      if (!p || p.parent_id) { main.innerHTML = '<p class="note">That post isn\'t here anymore. <a data-nav href="' + esc(href({ r: place })) + '">Back to Talk</a></p>'; return; }
      var ready = PLACE_RE.test(p.room) && p.room !== place && places.indexOf(p.room) < 0 ? (places.push(p.room), Promise.resolve()) : Promise.resolve();
      ready.then(function () {
        if (PLACE_RE.test(p.room) && p.room !== place) { place = p.room; $("place").innerHTML = places.map(function (x) { return '<option value="' + esc(x) + '"' + (x === place ? " selected" : "") + ">" + esc(placeName(x)) + "</option>"; }).join(""); return loadTopics(); }
      }).then(function () {
        view.t = p.topic_id || ""; sideList();
        var t = p.topic_id && topicById(p.topic_id);
        document.title = (p.title || "Post") + " · Talk | Dandelions";
        main.innerHTML = '<a data-nav class="crumb" href="' + esc(href({ r: place, t: p.topic_id })) + '">‹ ' + esc(t ? t.name : "General") + "</a>" +
          postCard(p) + (propByPost[p.id] && bboard ? proposalFull(propByPost[p.id]) : "") +
          '<div class="tk-thread" id="thread">' + (thread.length ? thread.map(function (x) { return x.rai ? raiRow(x.rai) : commentRow(x.c); }).join("") : '<p class="small muted tk-none">No comments yet. Start the conversation.</p>') + "</div>" +
          (p.deleted || p.hidden ? "" : !user ? '<div style="margin-top:14px">' + joinPrompt("comment") + "</div>" : paused() ? pauseNote() :
            '<form class="sendbar" id="replyf"><textarea id="rbody" maxlength="2000" rows="1" placeholder="Comment, or ask @Rai" aria-label="Add a comment"></textarea>' +
            '<button class="btn small" type="submit">Send</button></form><p class="small muted" id="rmsg" role="status" style="text-align:center"></p>');
        wire(main, showPost);
        // Your own @Rai message from the last hour with no answer yet (for example Rai was busy): ask again.
        // The database makes sure Rai still answers each message only once.
        if (user) [p].concat(reps).forEach(function (m) {
          if (m.author_id === user.id && !m.deleted && !raiTried[m.id] && AT_RAI.test((m.title || "") + " " + (m.body || "")) &&
              Date.now() - new Date(m.created_at).getTime() < 3300000 && !rai.some(function (x) { return x.asked_by === m.id; })) askRaiIn(m.id, p.id, true);
        });
        each(main, "[data-bvote]", function (btn) {
          btn.addEventListener("click", function () {
            each(main, "[data-bvote]", function (x) { x.disabled = true; });
            db.rpc("baseline_vote", { p_proposal: propByPost[p.id].id, p_choice: btn.getAttribute("data-bvote") }).then(function (r) {
              toast(r.error ? BK.errText(r.error) : "Vote saved.");
              loadBaselines().then(showPost);
            });
          });
        });
        var ta = $("rbody");
        if (ta) {
          ta.addEventListener("input", function () { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 140) + "px"; });
          $("replyf").addEventListener("submit", function (e) {
            e.preventDefault();
            var body = ta.value.trim();
            if (!body) return;
            needRules(function () {
              $("rmsg").textContent = "Sending...";
              db.from("talk_posts").insert({ room: p.room, parent_id: p.id, kind: "reply", body: body }).select("id").single().then(function (r) {
                if (r.error) { $("rmsg").textContent = errText(r.error); return; }
                showPost();
                if (r.data && AT_RAI.test(body)) askRaiIn(r.data.id, p.id);
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
      return raiCounts(r.data || []).then(function () { return r; });
    }).then(function (r) {
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

  // ---- Moderators: posts with flags nobody has looked at yet ----
  // Only flags from ID-checked members hide a post, so this is where everyone else's flags get seen.
  function showFlagged() {
    var main = $("main");
    document.title = "Flagged posts · Talk | Dandelions";
    db.rpc("talk_mod_flagged").then(function (r) {
      var list = r.data || [];
      main.innerHTML = '<div class="tk-head"><div class="tk-headrow">' + topicsButton() + '<div class="tk-htext"><div class="eyebrow">Moderators</div><h1>Flagged posts</h1></div></div>' +
          '<p class="muted tk-about">Posts and comments with flags nobody has looked at yet, newest flag first. A post hides on its own once 3 ID-checked members flag it. ' +
          "Leave it up and flags won't hide it again. Only moderators see this page.</p></div>" +
        (r.error ? '<p class="note">Couldn\'t load the list. Try refreshing.</p>' : !list.length ? '<p class="note">Nothing flagged right now.</p>' : list.map(function (p) {
          var why = Object.keys(p.reasons || {}).map(function (k) { return esc(FLAGS[k] || k) + (p.reasons[k] > 1 ? " ×" + p.reasons[k] : ""); }).join(", ");
          return '<article class="tk-post' + (p.hidden ? " hid" : "") + '">' +
            '<div class="tk-by">' + badge(p.author_name, p.author_id) + '<a data-nav class="tk-name" href="' + esc(href({ u: p.author_id })) + '">' + esc(p.author_name) + "</a>" +
              '<span class="muted">· ' + ago(p.created_at) + "</span>" + (p.hidden ? ' <span class="chip warn">Hidden</span>' : "") + (p.parent_id ? ' <span class="muted small">comment</span>' : "") + "</div>" +
            (p.title ? '<h3 class="tk-title">' + esc(p.title) + "</h3>" : "") +
            '<p class="tk-body">' + bodyHtml(p.body.length > 500 ? p.body.slice(0, 500) + "..." : p.body) + "</p>" +
            '<p class="small muted">' + p.flags + (p.flags === 1 ? " flag" : " flags") + " (" + p.id_checked + " from ID-checked members) · " + why + " · last " + ago(p.last_flag) + "</p>" +
            '<div class="tk-foot"><a data-nav class="tk-comments" href="' + esc(href({ p: p.parent_id || p.id })) + '">Open</a><span class="tk-tools">' +
              '<button class="linkbtn" type="button" data-hide="' + p.id + '" data-on="false">' + (p.hidden ? "Put back" : "Leave it up") + "</button>" +
              (p.hidden ? "" : ' <button class="linkbtn" type="button" data-hide="' + p.id + '" data-on="true">Hide</button>') +
              (user && p.author_id !== user.id ? ' <button class="linkbtn" type="button" data-pause="' + p.author_id + '" data-name="' + esc(p.author_name) + '">Pause 7 days</button>' : "") +
            "</span></div></article>";
        }).join(""));
      wireOpen(main);
      wire(main, showFlagged);
    });
  }

  // ---- What moderators did, for everyone to see. Paused members are never named. ----
  var MODACT = { hide: "hid a post", put_back: "put a post back", hide_rai: "hid one of Rai's answers", put_back_rai: "put one of Rai's answers back",
    move: "moved a post to another topic", unpause: "lifted a pause", topic_create: "made a topic", topic_edit: "edited a topic",
    topic_archive: "archived a topic", topic_rename_own: "renamed a topic", traction_topic: "opened a topic that caught on", deal_remove: "removed a deal" };
  function modAct(a) { var m = /^pause_(\d+)_days$/.exec(a); return m ? "paused a member for " + m[1] + (m[1] === "1" ? " day" : " days") : MODACT[a] || a.replace(/_/g, " "); }
  function showModLog() {
    var main = $("main");
    document.title = "Moderator log · Talk | Dandelions";
    db.rpc("talk_mod_log_public").then(function (r) {
      var list = r.data || [];
      main.innerHTML = '<div class="tk-head"><div class="tk-headrow">' + topicsButton() + '<div class="tk-htext"><div class="eyebrow">Talk</div><h1>Moderator log</h1></div></div>' +
          '<p class="muted tk-about">Everything moderators did in the last 90 days, newest first, and the reason they gave. People who were paused aren\'t named.</p></div>' +
        (r.error ? '<p class="note">Couldn\'t load the log. Try refreshing.</p>' : !list.length ? '<p class="note">Nothing yet.</p>' :
          '<div class="tk-tlist">' + list.map(function (x) {
            return '<div class="tk-trow" style="padding-left:14px"><div style="flex:1;min-width:0"><b>' + esc(x.moderator) + "</b> " + esc(modAct(x.action)) +
              ' <span class="muted small">· ' + ago(x.at) + "</span>" + (x.note ? '<div class="small muted">' + esc(x.note) + "</div>" : "") + "</div>" +
              (x.post_id && !/^pause|^unpause|^topic|^deal/.test(x.action) ? '<a data-nav class="small" style="flex:0 0 auto" href="' + esc(href({ p: x.post_id })) + '">See post</a>' : "") + "</div>";
          }).join("") + "</div>");
      wireOpen(main);
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
    var sm = q.get("s");
    view = p && ID_RE.test(p) ? { kind: "post", p: p } : sm && ID_RE.test(sm) ? { kind: "summary", t: sm } : u && ID_RE.test(u) ? { kind: "person", u: u } : q.get("following") ? { kind: "following" } : q.get("flagged") && mod ? { kind: "flagged" } : q.get("modlog") ? { kind: "modlog" } : q.get("all") ? { kind: "all" } : { kind: "feed", t: t && ID_RE.test(t) ? t : "" };
    var change = r && PLACE_RE.test(r) && r !== place;
    if (change && places.indexOf(r) < 0) places.push(r);
    (change ? (place = r, $("place").innerHTML = places.map(function (x) { return '<option value="' + esc(x) + '"' + (x === place ? " selected" : "") + ">" + esc(placeName(x)) + "</option>"; }).join(""), loadTopics()) : Promise.resolve()).then(function () {
      sideList();
      window.RaiTopic = (view.kind === "feed" || view.kind === "summary") && view.t ? view.t : "";
      if (view.kind === "summary") showSummary(); else if (view.kind === "post") showPost(); else if (view.kind === "person") showPerson(); else if (view.kind === "all") showAll(); else if (view.kind === "following") showFollowing(); else if (view.kind === "flagged") showFlagged(); else if (view.kind === "modlog") showModLog(); else showFeed();
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
      db.from("talk_backs").select("post_id,agree").eq("member_id", user.id),
      db.from("talk_flags").select("post_id").eq("member_id", user.id),
      db.from("talk_agreements").select("version").eq("member_id", user.id).maybeSingle(),
      db.from("talk_pauses").select("until").eq("member_id", user.id).maybeSingle(),
      db.rpc("is_talk_mod"),
      db.from("talk_stars").select("topic_id").eq("member_id", user.id),
      db.from("talk_follows").select("followee_id").eq("follower_id", user.id)
    ]) : Promise.resolve([{}, {}, {}, {}, {}, {}, {}, {}])).then(function (m) {
      (m[1].data || []).forEach(function (x) { backed[x.post_id] = x.agree === false ? "d" : "a"; });
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
      return Promise.all([loadTopics(), loadBaselines(), db.rpc("talk_moderator_ids").then(function (r) { (r.data || []).forEach(function (id) { mods[id] = true; }); }, function () {})])
        .then(function () { route(); bell(); });
    });
  }).catch(function () {
    box.innerHTML = '<p class="note">Couldn\'t load Talk. Try refreshing.</p>';
  });
})();
