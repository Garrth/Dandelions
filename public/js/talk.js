// Talk: ideas, and a chat under each one. Rooms for your county, your state, everyone, and a few topics.
// Anyone can read. Members agree to the Talk rules once, then post ideas, comment, back ideas and flag.
// Nobody approves posts: a post flagged by 3 different members is hidden, and moderators can hide,
// put back and pause someone. Everything a moderator does is logged.
(function () {
  var cfg = window.DANDELIONS_CONFIG || {};
  var box = document.getElementById("talk");
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function each(sel, fn) { Array.prototype.forEach.call(box.querySelectorAll(sel), fn); }
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

  var TOPICS = [
    { id: "topic-work", name: "Topic: What should we work on?" },
    { id: "topic-site", name: "Topic: Make the site better" }
  ];
  var RULES = [
    ["Be constructive.", "Say what you'd do about it, not only what's wrong."],
    ["Go after ideas, not people.", "No insults, name-calling or putting people down."],
    ["No hate.", "Nothing against anyone for their race, religion, gender, who they love, where they're from, a disability or their age."],
    ["Keep it real.", "No spam, ads, scams or made-up claims."],
    ["Keep private things private.", "No one's address, phone, money or health details, yours included."],
    ["Stay on topic.", "Post in the room the idea is about."]
  ];
  var FLAGS = { mean: "Mean or hateful", spam: "Spam or ads", scam: "A scam", private: "Shares private info", other: "Breaks another rule" };
  var ERR = {
    talk_limit: "That's the most posts for one day. Try again tomorrow.",
    talk_title: "Give your idea a title of at least 3 letters.",
    talk_empty: "Write something first.",
    talk_no_parent: "This idea isn't open for comments anymore.",
    talk_paused: "A moderator paused your posting for a while. You can still read.",
    talk_rules: "Agree to the Talk rules first."
  };
  function errText(e) {
    var m = (e && e.message) || "";
    for (var k in ERR) if (m.indexOf(k) >= 0) return ERR[k];
    return "Couldn't send just now. Try again.";
  }

  var params = new URLSearchParams(location.search);
  var user = null, agreed = false, mod = false, pausedUntil = null, counties = {}, rooms = [], room = "", sort = "new", backed = {}, flagged = {};

  function roomName(id) {
    var r = rooms.filter(function (x) { return x.id === id; })[0], c = counties[id.slice(3)];
    return r ? r.name : id === "us" ? "Everyone, nationwide" : id.indexOf("co-") === 0 && c ? c[0] + ", " + c[1] : id.indexOf("st-") === 0 ? "All of " + id.slice(3) : "Talk";
  }
  function setUrl(q) { history.replaceState(null, "", "/app/talk.html" + (q ? "?" + q : "")); }
  function rulesList() {
    return "<ol class=\"rules\">" + RULES.map(function (r) { return "<li><b>" + esc(r[0]) + "</b> " + esc(r[1]) + "</li>"; }).join("") + "</ol>" +
      '<p class="small muted">Break a rule and the post can be hidden. Keep doing it and a moderator can pause your posting.</p>';
  }
  function joinPrompt() {
    try { localStorage.setItem("dandelions_return", location.pathname + location.search); } catch (e) {}
    return '<div class="card"><p>Log in to post ideas, comment and back ideas. Anyone can read.</p>' +
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

  // ---- A room: a list of ideas ----
  function showRoom() {
    setUrl("r=" + encodeURIComponent(room));
    document.title = "Talk | Dandelions";
    box.innerHTML =
      '<div class="page-head"><div class="eyebrow">Talk</div><h1>Ideas start here.</h1><p>Post an idea, talk it through, and back the ones you want to see happen.</p></div>' +
      '<div class="talk-bar"><label>Room<select id="room">' + rooms.map(function (r) {
        return '<option value="' + esc(r.id) + '"' + (r.id === room ? " selected" : "") + ">" + esc(r.name) + "</option>";
      }).join("") + '</select></label><div class="seg" role="group" aria-label="Sort"><button type="button" data-sort="new" aria-pressed="' + (sort === "new") + '">Latest</button>' +
        '<button type="button" data-sort="top" aria-pressed="' + (sort === "top") + '">Most backed</button></div></div>' +
      '<div style="margin-top:14px">' + (!user ? joinPrompt() : paused() ? pauseNote() :
        '<form class="card composer" id="compose"><label class="field" style="margin-bottom:8px">Your idea<input id="ctitle" maxlength="120" placeholder="What should we do?"></label>' +
        '<label class="field" style="margin-bottom:8px">Why, and how (optional)<textarea id="cbody" maxlength="2000" rows="2"></textarea></label>' +
        '<div class="spread"><span class="small muted">In ' + esc(roomName(room)) + '</span><button class="btn small" type="submit">Post idea</button></div>' +
        '<p class="small muted" id="cmsg" role="status"></p></form>') + "</div>" +
      '<div id="posts" style="margin-top:14px"><p class="muted">Loading...</p></div>' +
      '<details class="rulesbox"><summary>Talk rules</summary>' + rulesList() + "</details>";
    $("room").addEventListener("change", function () { room = this.value; showRoom(); });
    each("[data-sort]", function (b) { b.addEventListener("click", function () { sort = b.getAttribute("data-sort"); showRoom(); }); });
    if ($("compose")) $("compose").addEventListener("submit", function (e) {
      e.preventDefault();
      var title = $("ctitle").value.trim(), body = $("cbody").value.trim();
      if (title.length < 3) { $("cmsg").textContent = ERR.talk_title; $("ctitle").focus(); return; }
      needRules(function () {
        $("cmsg").textContent = "Posting...";
        db.from("talk_posts").insert({ room: room, kind: "idea", title: title, body: body }).then(function (r) {
          if (r.error) { $("cmsg").textContent = errText(r.error); return; }
          toast("Posted. Share it so people can back it.");
          sort = "new"; showRoom();
        });
      });
    });
    var q = db.from("talk_posts").select("id,kind,author_id,author_name,title,body,replies,backers,created_at,last_reply_at,hidden")
      .eq("room", room).is("parent_id", null).eq("deleted", false).limit(60);
    q = sort === "top" ? q.order("backers", { ascending: false }).order("last_reply_at", { ascending: false }) : q.order("last_reply_at", { ascending: false });
    q.then(function (r) {
      var list = r.data || [];
      var ids = list.filter(function (p) { return p.replies > 0; }).map(function (p) { return p.id; });
      // The latest comment under each idea, to show in the list.
      return (ids.length ? db.from("talk_posts").select("parent_id,author_name,body,created_at").in("parent_id", ids).eq("deleted", false).order("created_at", { ascending: false }).limit(300)
        : Promise.resolve({ data: [] })).then(function (lr) {
        var latest = {};
        (lr.data || []).forEach(function (x) { if (!latest[x.parent_id]) latest[x.parent_id] = x; });
        $("posts").innerHTML = r.error ? '<p class="note">Couldn\'t load ideas. Try refreshing.</p>' : list.length ?
          '<div class="ideas">' + list.map(function (p) { return ideaRow(p, latest[p.id]); }).join("") + "</div>" : '<p class="note">No ideas in this room yet. Post the first one.</p>';
        wireBacks();
      });
    });
  }
  function ideaRow(p, last) {
    return '<div class="idea"><a href="/app/talk.html?p=' + p.id + '"><b>' + esc(p.title) + "</b>" +
      (p.hidden ? ' <span class="chip warn">Hidden</span>' : "") +
      (last ? '<span class="lastc"><b>' + esc(last.author_name) + ":</b> " + esc(last.body.length > 90 ? last.body.slice(0, 90) + "..." : last.body) + "</span>" : "") +
      '<span class="meta">' + esc(p.author_name) + " · " + ago(p.last_reply_at) + " · " + p.replies + (p.replies === 1 ? " comment" : " comments") + "</span></a>" +
      backBtn(p) + "</div>";
  }
  function backBtn(p) {
    var mine = user && p.author_id === user.id, on = !!backed[p.id], canBack = user && !mine && p.kind === "idea";
    return '<button class="backer' + (on ? " on" : "") + '" type="button"' + (canBack ? ' data-back="' + p.id + '"' : " disabled") + ' data-n="' + p.backers + '" aria-pressed="' + on +
      '" aria-label="' + (canBack ? (on ? "Backed. Tap to take back" : "Back this idea") : "Backers") + '"><span class="up">▲</span><span class="n">' + p.backers + "</span></button>";
  }
  function wireBacks() {
    each("[data-back]", function (b) {
      b.addEventListener("click", function (e) {
        e.preventDefault();
        var id = b.getAttribute("data-back"), n = Number(b.getAttribute("data-n")), on = !!backed[id];
        b.disabled = true;
        var req = on ? db.from("talk_backs").delete().eq("post_id", id).eq("member_id", user.id) : db.from("talk_backs").insert({ post_id: id });
        req.then(function (r) {
          b.disabled = false;
          if (r.error) { toast("Couldn't save that. Try again."); return; }
          if (on) delete backed[id]; else backed[id] = true;
          n += on ? -1 : 1;
          b.setAttribute("data-n", n);
          b.querySelector(".n").textContent = n;
          b.classList.toggle("on", !on);
          b.setAttribute("aria-pressed", String(!on));
          if (!on) toast("Backed");
        });
      });
    });
  }
  function paused() { return pausedUntil && new Date(pausedUntil) > new Date(); }
  function pauseNote() {
    return '<p class="note">A moderator paused your posting until ' + esc(new Date(pausedUntil).toLocaleDateString("en-US", { month: "short", day: "numeric" })) + ". You can still read.</p>";
  }

  // ---- One idea, with its comments as a chat ----
  function showPost(id) {
    Promise.all([
      db.from("talk_posts").select("*").eq("id", id).maybeSingle(),
      db.from("talk_posts").select("id,author_id,author_name,body,created_at,deleted,hidden").eq("parent_id", id).order("created_at").limit(500)
    ]).then(function (o) {
      var p = o[0].data, reps = o[1].data || [];
      if (!p || p.parent_id) { box.innerHTML = '<p class="note">That idea isn\'t here anymore. <a href="/app/talk.html">Back to Talk</a></p>'; return; }
      room = p.room;
      setUrl("p=" + p.id);
      document.title = (p.title || "Talk") + " | Dandelions";
      var last = null;
      box.innerHTML = '<a class="crumb" href="/app/talk.html?r=' + encodeURIComponent(p.room) + '">‹ ' + esc(roomName(p.room)) + "</a>" +
        '<div class="card ideahead"><div class="ideatop"><div style="min-width:0"><h1 class="ideatitle">' + (p.deleted ? '<span class="muted">Removed by its author</span>' : esc(p.title)) + "</h1>" +
          '<div class="meta">' + badge(p.author_name, p.author_id) + " " + esc(p.author_name) + " · " + ago(p.created_at) + (p.hidden ? ' · <span class="chip warn">Hidden</span>' : "") + "</div></div>" +
          (p.deleted ? "" : backBtn(p)) + "</div>" +
          (p.body ? '<p class="text">' + esc(p.body) + "</p>" : "") +
          '<div class="tools">' + (p.deleted ? "" : tools(p).replace(/^ · /, "")) + "</div></div>" +
        '<div class="chat" id="chat">' + (reps.length ? reps.map(function (r) {
          var mine = user && r.author_id === user.id, same = last === r.author_id;
          last = r.author_id;
          return '<div class="msg' + (mine ? " mine" : "") + (same ? " same" : "") + '">' + (mine ? "" : same ? '<span class="badge ghost"></span>' : badge(r.author_name, r.author_id)) +
            '<div class="bubble' + (r.hidden ? " hid" : "") + '">' + (same || mine ? "" : '<div class="who">' + esc(r.author_name) + "</div>") +
            (r.deleted ? '<div class="text muted">Removed by its author</div>' : '<div class="text">' + esc(r.body) + "</div>") +
            '<div class="when">' + ago(r.created_at) + (r.hidden ? " · hidden" : "") + (r.deleted ? "" : tools(r)) + "</div></div></div>";
        }).join("") : '<p class="small muted" style="text-align:center;padding:16px 0">No comments yet. Start the conversation.</p>') + "</div>" +
        (p.deleted || p.hidden ? "" : !user ? '<div style="margin-top:14px">' + joinPrompt() + "</div>" : paused() ? pauseNote() :
          '<form class="sendbar" id="replyf"><textarea id="rbody" maxlength="2000" rows="1" placeholder="Add a comment" aria-label="Add a comment"></textarea>' +
          '<button class="btn small" type="submit">Send</button></form><p class="small muted" id="rmsg" role="status" style="text-align:center"></p>');
      wireBacks();
      wireTools(id);
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
              showPost(id);
            });
          });
        });
      }
      if (reps.length) { var c = $("chat"); if (c.lastElementChild) c.lastElementChild.scrollIntoView({ block: "end" }); }
    });
  }
  // What a person can do to one post: delete their own, flag someone else's, and for moderators hide, put back or pause.
  function tools(p) {
    if (!user) return "";
    var mine = p.author_id === user.id, out = [];
    if (mine) out.push('<button class="linkbtn" type="button" data-del="' + p.id + '">Delete</button>');
    else if (flagged[p.id]) out.push('<span class="muted">Flagged</span>');
    else out.push('<button class="linkbtn" type="button" data-flag="' + p.id + '">Flag</button>');
    if (mod && !mine) {
      out.push('<button class="linkbtn" type="button" data-hide="' + p.id + '" data-on="' + !p.hidden + '">' + (p.hidden ? "Put back" : "Hide") + "</button>");
      out.push('<button class="linkbtn" type="button" data-pause="' + p.author_id + '" data-name="' + esc(p.author_name) + '">Pause 7 days</button>');
    }
    return " · " + out.join(" ");
  }
  function wireTools(postId) {
    each("[data-del]", function (b) {
      b.addEventListener("click", function () {
        if (!confirm("Delete this? It can't be undone.")) return;
        db.from("talk_posts").update({ deleted: true }).eq("id", b.getAttribute("data-del")).then(function (r) {
          if (r.error) { toast("Couldn't delete. Try again."); return; }
          toast("Deleted"); showPost(postId);
        });
      });
    });
    each("[data-flag]", function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-flag"), host = b.closest(".bubble, .ideahead");
        if (host.querySelector(".flagbox")) return;
        host.insertAdjacentHTML("beforeend", '<div class="flagbox"><span class="small muted" style="flex-basis:100%">Which rule does it break?</span>' +
          Object.keys(FLAGS).map(function (k) { return '<button type="button" data-reason="' + k + '">' + FLAGS[k] + "</button>"; }).join("") + "</div>");
        Array.prototype.forEach.call(host.querySelectorAll("[data-reason]"), function (x) {
          x.addEventListener("click", function () {
            db.from("talk_flags").insert({ post_id: id, reason: x.getAttribute("data-reason") }).then(function (r) {
              if (r.error && !/duplicate/.test(r.error.message || "")) { toast("Couldn't send that. Try again."); return; }
              flagged[id] = true; toast("Thanks. It's been flagged."); showPost(postId);
            });
          });
        });
      });
    });
    each("[data-hide]", function (b) {
      b.addEventListener("click", function () {
        var hide = b.getAttribute("data-on") === "true";
        var note = hide ? prompt("Which rule did it break? (kept in the log)", "") : "";
        if (note === null) return;
        db.rpc("talk_mod_hide", { post: b.getAttribute("data-hide"), hide: hide, note: note }).then(function (r) {
          if (r.error) { toast("Couldn't do that. Try again."); return; }
          toast(hide ? "Hidden" : "Put back"); showPost(postId);
        });
      });
    });
    each("[data-pause]", function (b) {
      b.addEventListener("click", function () {
        var note = prompt("Pause " + b.getAttribute("data-name") + " from posting for 7 days? Say which rule (kept in the log).", "");
        if (note === null) return;
        db.rpc("talk_mod_pause", { member: b.getAttribute("data-pause"), days: 7, note: note }).then(function (r) {
          toast(r.error ? "Couldn't pause. Try again." : "Paused for 7 days");
        });
      });
    });
  }

  // ---- Start: who's here, which rooms, then the room or idea asked for ----
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
      db.rpc("is_talk_mod")
    ]) : Promise.resolve([{}, {}, {}, {}, {}, {}])).then(function (m) {
      (m[1].data || []).forEach(function (x) { backed[x.post_id] = true; });
      (m[2].data || []).forEach(function (x) { flagged[x.post_id] = true; });
      agreed = !!m[3].data;
      pausedUntil = m[4].data ? m[4].data.until : null;
      mod = m[5].data === true;
      var fips = m[0].data && m[0].data.county_fips, c = fips && counties[fips];
      var asked = params.get("r") || "";
      var askedC = /^co-[0-9]{5}$/.test(asked) && counties[asked.slice(3)];
      var pick = c ? { fips: fips, c: c } : askedC ? { fips: asked.slice(3), c: askedC } : null;
      rooms = [];
      if (pick) rooms.push({ id: "co-" + pick.fips, name: pick.c[0] + ", " + pick.c[1] }, { id: "st-" + pick.c[1], name: "All of " + pick.c[1] });
      rooms.push({ id: "us", name: "Everyone, nationwide" });
      rooms = rooms.concat(TOPICS);
      if (asked && /^(us|st-[A-Z]{2}|co-[0-9]{5}|topic-[a-z]{1,30})$/.test(asked) && !rooms.some(function (r) { return r.id === asked; })) rooms.push({ id: asked, name: roomName(asked) });
      room = asked && rooms.some(function (r) { return r.id === asked; }) ? asked : rooms[0].id;
      var pid = params.get("p");
      if (pid && /^[0-9a-f-]{36}$/.test(pid)) showPost(pid); else showRoom();
    });
  }).catch(function () {
    box.innerHTML = '<p class="note">Couldn\'t load Talk. Try refreshing.</p>';
  });
})();
