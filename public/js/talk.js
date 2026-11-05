// Talk: rooms for your county, your state, everyone, and a few topics. Anyone can read.
// Members post, reply, back ideas and flag what's wrong. Nobody approves posts: a post flagged by
// 3 different members is hidden until a person looks at it.
(function () {
  var cfg = window.DANDELIONS_CONFIG || {};
  var box = document.getElementById("talk");
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function toast(text) {
    var t = document.createElement("div");
    t.className = "toast"; t.textContent = text;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }
  function ago(iso) {
    var s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return Math.floor(s / 60) + " min ago";
    if (s < 86400) return Math.floor(s / 3600) + " hr ago";
    if (s < 86400 * 7) { var d = Math.floor(s / 86400); return d + (d === 1 ? " day ago" : " days ago"); }
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  if (!window.supabase) { box.innerHTML = '<p class="note">Something didn\'t load. Please refresh the page.</p>'; return; }
  var db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);

  var TOPICS = [
    { id: "topic-work", name: "Topic: What should we work on?" },
    { id: "topic-site", name: "Topic: Make the site better" }
  ];
  var FLAGS = { spam: "Spam or ads", mean: "Mean or hateful", scam: "A scam", private: "Shares private info", other: "Something else" };
  var ERR = {
    talk_limit: "That's the most posts for one day. Try again tomorrow.",
    talk_title: "Give it a title of at least 3 letters.",
    talk_empty: "Write something first.",
    talk_no_parent: "That post isn't open for replies anymore."
  };
  function errText(e) {
    var m = (e && (e.message || "")) || "";
    for (var k in ERR) if (m.indexOf(k) >= 0) return ERR[k];
    return "Couldn't send just now. Try again.";
  }

  var params = new URLSearchParams(location.search);
  var user = null, rooms = [], room = "", sort = "new", backed = {}, flagged = {};

  var counties = {};
  function roomName(id) {
    var r = rooms.filter(function (x) { return x.id === id; })[0], c = counties[id.slice(3)];
    return r ? r.name : id === "us" ? "Everyone, nationwide" : id.indexOf("co-") === 0 && c ? c[0] + ", " + c[1] : id.indexOf("st-") === 0 ? "All of " + id.slice(3) : "Talk";
  }
  function setUrl(q) { history.replaceState(null, "", "/app/talk.html" + (q ? "?" + q : "")); }

  function joinPrompt() {
    try { localStorage.setItem("dandelions_return", location.pathname + location.search); } catch (e) {}
    return '<div class="card"><p>Log in to post, reply and back ideas. Anyone can read.</p>' +
      '<div class="row" style="margin-top:10px"><a class="btn small" href="/app/login.html">Log in</a><a class="btn ghost small" href="/#pledge">New here? Pledge first</a></div></div>';
  }

  // ---- A room: its posts and ideas ----
  function showRoom() {
    setUrl("r=" + encodeURIComponent(room));
    box.innerHTML =
      '<div class="page-head"><div class="eyebrow">Talk</div><h1>Ideas start here.</h1><p>Say what you see, ask questions and suggest what to work on. Back the ideas you like.</p></div>' +
      '<div class="talk-bar"><label>Room<select id="room">' + rooms.map(function (r) {
        return '<option value="' + esc(r.id) + '"' + (r.id === room ? " selected" : "") + ">" + esc(r.name) + "</option>";
      }).join("") + '</select></label><div class="seg" role="group" aria-label="Sort"><button type="button" data-sort="new" aria-pressed="' + (sort === "new") + '">Latest</button>' +
        '<button type="button" data-sort="top" aria-pressed="' + (sort === "top") + '">Top ideas</button></div></div>' +
      '<div style="margin-top:14px">' + (user ? composer() : joinPrompt()) + "</div>" +
      '<div class="stack" id="posts" style="margin-top:14px"><p class="muted">Loading...</p></div>' +
      '<p class="small muted" style="margin-top:16px">Nobody approves posts. If something is wrong, flag it. A post flagged by 3 people is hidden until a person looks at it.</p>';
    $("room").addEventListener("change", function () { room = this.value; showRoom(); });
    Array.prototype.forEach.call(box.querySelectorAll("[data-sort]"), function (b) {
      b.addEventListener("click", function () { sort = b.getAttribute("data-sort"); showRoom(); });
    });
    if (user) wireComposer();
    var q = db.from("talk_posts").select("id,kind,author_id,author_name,title,body,replies,backers,created_at,last_reply_at,deleted")
      .eq("room", room).is("parent_id", null).eq("deleted", false).limit(60);
    q = sort === "top" ? q.eq("kind", "idea").order("backers", { ascending: false }).order("created_at", { ascending: false })
      : q.order("last_reply_at", { ascending: false });
    q.then(function (r) {
      var list = r.data || [];
      $("posts").innerHTML = r.error ? '<p class="note">Couldn\'t load posts. Try refreshing.</p>' : list.length ? list.map(card).join("") :
        '<p class="note">' + (sort === "top" ? "No ideas in this room yet. Post one above." : "Nothing here yet. Start it off.") + "</p>";
      wireBacks($("posts"));
    });
  }

  function composer() {
    return '<form class="card composer" id="compose"><div class="kind" role="radiogroup" aria-label="What kind of post">' +
      '<label><input type="radio" name="kind" value="post" checked> Talk</label><label><input type="radio" name="kind" value="idea"> Idea</label><span class="small muted">Others can back ideas.</span></div>' +
      '<label class="field" style="margin-bottom:8px">Title<input id="ctitle" maxlength="120" placeholder="What\'s on your mind?"></label>' +
      '<label class="field" style="margin-bottom:8px">More (optional)<textarea id="cbody" maxlength="2000" rows="3"></textarea></label>' +
      '<div class="spread"><span class="small muted">Posting in ' + esc(roomName(room)) + '</span><button class="btn small" type="submit">Post</button></div>' +
      '<p class="small muted" id="cmsg" role="status"></p><p class="small muted">Your name comes from <a href="/app/profile.html">your profile</a>.</p></form>';
  }
  function wireComposer() {
    $("compose").addEventListener("submit", function (e) {
      e.preventDefault();
      var title = $("ctitle").value.trim(), body = $("cbody").value.trim();
      var kind = box.querySelector('input[name="kind"]:checked').value;
      if (title.length < 3) { $("cmsg").textContent = ERR.talk_title; $("ctitle").focus(); return; }
      $("cmsg").textContent = "Posting...";
      db.from("talk_posts").insert({ room: room, kind: kind, title: title, body: body }).then(function (r) {
        if (r.error) { $("cmsg").textContent = errText(r.error); return; }
        toast(kind === "idea" ? "Posted. Share it so people can back it." : "Posted");
        sort = "new"; showRoom();
      });
    });
  }

  function backBtn(p) {
    if (p.kind !== "idea") return "";
    var mine = user && p.author_id === user.id, on = !!backed[p.id];
    return '<span class="chip">' + p.backers + (p.backers === 1 ? " backer" : " backers") + "</span>" +
      (user && !mine ? '<button class="btn small' + (on ? " ghost" : "") + '" type="button" data-back="' + p.id + '" data-n="' + p.backers + '">' + (on ? "Backed ✓" : "Back it") + "</button>" : "");
  }
  function card(p) {
    return '<div class="card"><a class="post" href="/app/talk.html?p=' + p.id + '"><span class="chip' + (p.kind === "idea" ? " sun" : "") + '">' + (p.kind === "idea" ? "Idea" : "Talk") + "</span>" +
      "<h3>" + esc(p.title) + '</h3><div class="meta">' + esc(p.author_name) + " · " + ago(p.created_at) + " · " + p.replies + (p.replies === 1 ? " reply" : " replies") + "</div>" +
      (p.body ? '<p class="text small">' + esc(p.body.length > 220 ? p.body.slice(0, 220) + "..." : p.body) + "</p>" : "") + "</a>" +
      (p.kind === "idea" ? '<div class="post-actions">' + backBtn(p) + "</div>" : "") + "</div>";
  }
  function wireBacks(el) {
    Array.prototype.forEach.call(el.querySelectorAll("[data-back]"), function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-back"), n = Number(b.getAttribute("data-n")), on = !!backed[id];
        b.disabled = true;
        var req = on ? db.from("talk_backs").delete().eq("post_id", id).eq("member_id", user.id) : db.from("talk_backs").insert({ post_id: id });
        req.then(function (r) {
          b.disabled = false;
          if (r.error) { toast("Couldn't save that. Try again."); return; }
          if (on) delete backed[id]; else backed[id] = true;
          n += on ? -1 : 1;
          b.setAttribute("data-n", n);
          b.textContent = on ? "Back it" : "Backed ✓";
          b.classList.toggle("ghost", !on);
          b.previousElementSibling.textContent = n + (n === 1 ? " backer" : " backers");
        });
      });
    });
  }

  // ---- One post with its replies ----
  function showPost(id) {
    Promise.all([
      db.from("talk_posts").select("*").eq("id", id).maybeSingle(),
      db.from("talk_posts").select("id,author_id,author_name,body,created_at,deleted").eq("parent_id", id).order("created_at").limit(500)
    ]).then(function (o) {
      var p = o[0].data, reps = o[1].data || [];
      if (!p || p.parent_id) { box.innerHTML = '<p class="note">That post isn\'t here anymore. <a href="/app/talk.html">Back to Talk</a></p>'; return; }
      room = p.room;
      var mine = user && p.author_id === user.id;
      document.title = (p.title || "Talk") + " | Dandelions";
      box.innerHTML = '<a class="crumb" href="/app/talk.html?r=' + encodeURIComponent(p.room) + '" style="display:inline-flex;min-height:44px;align-items:center;font-weight:700;color:var(--ink);text-decoration:none">‹ ' + esc(roomName(p.room)) + "</a>" +
        '<div class="card"><div class="post"><span class="chip' + (p.kind === "idea" ? " sun" : "") + '">' + (p.kind === "idea" ? "Idea" : "Talk") + "</span>" +
          (p.hidden ? ' <span class="chip warn">Hidden after flags</span>' : "") +
          "<h3>" + (p.deleted ? '<span class="muted">Removed by its author</span>' : esc(p.title)) + '</h3><div class="meta">' + esc(p.author_name) + " · " + ago(p.created_at) + "</div>" +
          (p.body ? '<p class="text">' + esc(p.body) + "</p>" : "") + "</div>" +
          '<div class="post-actions">' + (p.deleted ? "" : backBtn(p) + actions(p, mine)) + "</div></div>" +
        '<h2 class="section-title" style="margin-top:20px">' + reps.length + (reps.length === 1 ? " reply" : " replies") + "</h2>" +
        (reps.length ? '<div class="replies">' + reps.map(function (r) {
          return '<div class="reply"><div class="meta small muted"><b style="color:var(--ink)">' + esc(r.author_name) + "</b> · " + ago(r.created_at) + "</div>" +
            (r.deleted ? '<p class="text small muted">Removed by its author</p>' : '<p class="text">' + esc(r.body) + "</p>") +
            '<div class="post-actions" style="margin-top:2px">' + (r.deleted ? "" : actions(r, user && r.author_id === user.id)) + "</div></div>";
        }).join("") + "</div>" : "") +
        (p.deleted || p.hidden ? "" : user ? '<form class="card composer" id="replyf" style="margin-top:14px"><label class="field" style="margin-bottom:8px">Your reply<textarea id="rbody" maxlength="2000" rows="3"></textarea></label>' +
          '<div class="spread"><span class="small muted" id="rmsg" role="status"></span><button class="btn small" type="submit">Reply</button></div></form>' : '<div style="margin-top:14px">' + joinPrompt() + "</div>");
      wireBacks(box);
      wireActions(id);
      if ($("replyf")) $("replyf").addEventListener("submit", function (e) {
        e.preventDefault();
        var body = $("rbody").value.trim();
        if (!body) { $("rmsg").textContent = ERR.talk_empty; return; }
        $("rmsg").textContent = "Sending...";
        db.from("talk_posts").insert({ room: p.room, parent_id: p.id, kind: "reply", body: body }).then(function (r) {
          if (r.error) { $("rmsg").textContent = errText(r.error); return; }
          showPost(id);
        });
      });
    });
  }
  function actions(p, mine) {
    if (!user) return "";
    if (mine) return '<button class="linkbtn" type="button" data-del="' + p.id + '">Delete</button>';
    if (flagged[p.id]) return '<span class="small muted">Flagged</span>';
    return '<button class="linkbtn" type="button" data-flag="' + p.id + '">Flag</button>';
  }
  function wireActions(postId) {
    Array.prototype.forEach.call(box.querySelectorAll("[data-del]"), function (b) {
      b.addEventListener("click", function () {
        if (!confirm("Delete this? It can't be undone.")) return;
        db.from("talk_posts").update({ deleted: true }).eq("id", b.getAttribute("data-del")).then(function (r) {
          if (r.error) { toast("Couldn't delete. Try again."); return; }
          toast("Deleted"); showPost(postId);
        });
      });
    });
    Array.prototype.forEach.call(box.querySelectorAll("[data-flag]"), function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-flag"), wrap = b.parentNode;
        if (wrap.querySelector(".flagbox")) return;
        wrap.insertAdjacentHTML("beforeend", '<div class="flagbox" style="flex-basis:100%"><span class="small muted" style="flex-basis:100%">What\'s wrong with it?</span>' +
          Object.keys(FLAGS).map(function (k) { return '<button type="button" data-reason="' + k + '">' + FLAGS[k] + "</button>"; }).join("") + "</div>");
        Array.prototype.forEach.call(wrap.querySelectorAll("[data-reason]"), function (x) {
          x.addEventListener("click", function () {
            db.from("talk_flags").insert({ post_id: id, reason: x.getAttribute("data-reason") }).then(function (r) {
              if (r.error && !/duplicate/.test(r.error.message || "")) { toast("Couldn't send that. Try again."); return; }
              flagged[id] = true; toast("Thanks. We've noted it."); showPost(postId);
            });
          });
        });
      });
    });
  }

  // ---- Start: who's here, which rooms, then the room or post asked for ----
  Promise.all([db.auth.getSession(), fetch("/data/counties.json").then(function (r) { return r.json(); }).catch(function () { return {}; })]).then(function (o) {
    var s = o[0].data && o[0].data.session;
    counties = o[1];
    user = s ? s.user : null;
    if (user) try { localStorage.removeItem("dandelions_return"); } catch (e) {}
    return (user ? Promise.all([
      db.from("members").select("county_fips").eq("id", user.id).maybeSingle(),
      db.from("talk_backs").select("post_id").eq("member_id", user.id),
      db.from("talk_flags").select("post_id").eq("member_id", user.id)
    ]) : Promise.resolve([{}, {}, {}])).then(function (m) {
      (m[1].data || []).forEach(function (x) { backed[x.post_id] = true; });
      (m[2].data || []).forEach(function (x) { flagged[x.post_id] = true; });
      var fips = m[0].data && m[0].data.county_fips, c = fips && counties[fips];
      var asked = params.get("r") || "";
      var askedC = /^co-[0-9]{5}$/.test(asked) && counties[asked.slice(3)];
      var pick = c ? { fips: fips, c: c } : askedC ? { fips: asked.slice(3), c: askedC } : null;
      rooms = [];
      if (pick) rooms.push({ id: "co-" + pick.fips, name: pick.c[0] + ", " + pick.c[1] }, { id: "st-" + pick.c[1], name: "All of " + pick.c[1] });
      rooms.push({ id: "us", name: "Everyone, nationwide" });
      rooms = rooms.concat(TOPICS);
      if (asked && /^(us|st-[A-Z]{2}|co-[0-9]{5}|topic-[a-z]{1,30})$/.test(asked) && !rooms.some(function (r) { return r.id === asked; })) {
        rooms.push({ id: asked, name: roomName(asked) });
      }
      room = asked && rooms.some(function (r) { return r.id === asked; }) ? asked : rooms[0].id;
      var pid = params.get("p");
      if (pid && /^[0-9a-f-]{36}$/.test(pid)) showPost(pid); else showRoom();
    });
  }).catch(function () {
    box.innerHTML = '<p class="note">Couldn\'t load Talk. Try refreshing.</p>';
  });
})();
