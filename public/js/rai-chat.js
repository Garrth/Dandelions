// Ask Rai: a chat panel on every page. On a computer it opens on the right side of the page; on a phone it fills the screen.
// The conversation stays while you move between pages (this browser tab only) and is never saved anywhere else.
// Answers come from the "rai" function on Supabase, which reads /rai/knowledge.md.
(function () {
  if (window.__raiChat) return;
  window.__raiChat = true;
  var cfg = window.DANDELIONS_CONFIG || {};
  var KEY = "dandelions_rai";
  var HELLO = "Hi, I'm Rai, the AI guide here. Ask me anything about Dandelions or this page.";
  var STARTERS = ["What is Dandelions?", "What can I do on this page?", "How do points work?", "Is this legit?"];
  var state = { open: false, msgs: [] };
  try { var saved = JSON.parse(sessionStorage.getItem(KEY) || "null"); if (saved && Array.isArray(saved.msgs)) state = saved; } catch (e) {}
  function save() { try { sessionStorage.setItem(KEY, JSON.stringify({ open: state.open, msgs: state.msgs.slice(-30) })); } catch (e) {} }

  var css = [
    ".rai-fab{position:fixed;right:16px;bottom:16px;z-index:30;display:flex;align-items:center;gap:8px;background:var(--sun,#ffd21a);color:var(--sun-ink,#15210f);border:2px solid var(--ink,#15210f);border-radius:999px;padding:8px 14px 8px 8px;font:800 15px/1 var(--display,system-ui),system-ui,sans-serif;box-shadow:0 3px 0 var(--ink,#15210f);cursor:pointer}",
    ".rai-fab svg{width:28px;height:28px}",
    "body:has(.sendbar) .rai-fab,body:has(.savebar) .rai-fab,body:has(.tabs) .rai-fab{bottom:88px}",
    "html.rai-open .rai-fab{display:none}",
    ".rai-panel{position:fixed;z-index:40;inset:0;display:none;flex-direction:column;background:var(--bg,#fdfdf8);color:var(--ink,#15210f)}",
    "html.rai-open .rai-panel{display:flex}",
    "@media (min-width:900px){html.rai-open body{margin-right:400px}.rai-panel{inset:0 0 0 auto;width:400px;border-left:1px solid var(--line,#dfe3d2);box-shadow:-6px 0 24px rgba(0,0,0,.08)}}",
    ".rai-head{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid var(--line,#dfe3d2)}",
    ".rai-head b{font:800 18px/1.1 var(--display,system-ui),system-ui,sans-serif;flex:1}",
    ".rai-head small{display:block;font:400 12px/1.3 var(--body,system-ui),system-ui,sans-serif;color:var(--muted,#56624f)}",
    ".rai-head button{border:1px solid var(--line,#dfe3d2);background:var(--card,#fff);color:inherit;border-radius:10px;padding:6px 10px;font-weight:700;cursor:pointer}",
    ".rai-log{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px}",
    ".rai-msg{max-width:88%;padding:9px 12px;border-radius:14px;font-size:15px;line-height:1.45;overflow-wrap:anywhere}",
    ".rai-msg p+p,.rai-msg p+ul,.rai-msg ul+p,.rai-msg p+ol,.rai-msg ol+p{margin-top:6px}",
    ".rai-msg ul,.rai-msg ol{margin:4px 0 0;padding-left:20px}",
    ".rai-msg li+li{margin-top:3px}",
    ".rai-msg a{color:var(--leaf,#2d7a34);font-weight:700}",
    ".rai-msg.rai{align-self:flex-start;background:var(--card,#fff);border:1px solid var(--line,#dfe3d2);border-bottom-left-radius:4px}",
    ".rai-msg.you{align-self:flex-end;background:var(--sun,#ffd21a);color:var(--sun-ink,#15210f);border-bottom-right-radius:4px}",
    ".rai-msg.wait{color:var(--muted,#56624f);font-style:italic}",
    ".rai-starts{display:flex;flex-wrap:wrap;gap:6px}",
    ".rai-starts button{border:1px solid var(--line,#dfe3d2);background:var(--soft,#f3f5ea);color:inherit;border-radius:999px;padding:6px 12px;font-size:14px;cursor:pointer}",
    ".rai-form{display:flex;gap:8px;padding:10px 14px 14px;border-top:1px solid var(--line,#dfe3d2)}",
    ".rai-form textarea{flex:1;resize:none;min-height:42px;max-height:120px;border:1px solid var(--line,#dfe3d2);border-radius:12px;padding:10px;background:var(--card,#fff);color:inherit;font:inherit;font-size:16px}",
    ".rai-form button{background:var(--sun,#ffd21a);color:var(--sun-ink,#15210f);border:0;border-radius:12px;padding:0 16px;font-weight:800;cursor:pointer;box-shadow:0 2px 0 var(--ink,#15210f)}",
    ".rai-form button:disabled{opacity:.5;cursor:default}",
    ".rai-gapnote{margin-top:6px;font-size:13px;color:var(--muted,#56624f)}",
    ".rai-note{font-size:12px;color:var(--muted,#56624f);padding:0 14px 10px}",
    ".rai-note a{color:inherit}"
  ].join("\n");
  var face = '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="6" y="7" width="20" height="16" rx="6" fill="#fff" stroke="currentColor" stroke-width="2"/><circle cx="12.5" cy="15" r="2" fill="currentColor"/><circle cx="19.5" cy="15" r="2" fill="currentColor"/><path d="M16 7V3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="16" cy="3" r="1.6" fill="currentColor"/><circle cx="16" cy="28" r="3" fill="none" stroke="currentColor" stroke-width="2"/></svg>';

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  // A small, safe piece of Markdown: paragraphs, bullet lists, **bold**, and links to this site or https pages.
  function md(text) {
    function inline(s) {
      return esc(s)
        .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
        .replace(/\[([^\]]{1,120})\]\(((?:\/[\w\-./?=&#%]*)|(?:https:\/\/[\w\-.]+(?:\/[\w\-./?=&#%]*)?))\)/g, function (_, t, u) {
          var ext = u.charAt(0) !== "/";
          return '<a href="' + u + '"' + (ext ? ' target="_blank" rel="noopener"' : "") + ">" + t + "</a>";
        });
    }
    var out = [], list = null, tag = "ul";
    function close() { if (list) { out.push("<" + tag + ">" + list.join("") + "</" + tag + ">"); list = null; } }
    String(text).split(/\n/).forEach(function (line) {
      var m = line.match(/^\s*([-*]|\d+\.)\s+(.*)$/);
      if (m) {
        var t = /\d/.test(m[1]) ? "ol" : "ul";
        if (list && t !== tag) close();
        if (!list) { list = []; tag = t; }
        list.push("<li>" + inline(m[2]) + "</li>"); return;
      }
      if (!line.trim()) return;
      close();
      out.push("<p>" + inline(line.trim()) + "</p>");
    });
    close();
    return out.join("");
  }

  var style = document.createElement("style"); style.textContent = css; document.head.appendChild(style);
  var fab = document.createElement("button");
  fab.type = "button"; fab.className = "rai-fab"; fab.setAttribute("aria-label", "Ask Rai, the AI guide");
  fab.innerHTML = face + "Ask Rai";
  var panel = document.createElement("aside");
  panel.className = "rai-panel"; panel.setAttribute("aria-label", "Chat with Rai");
  panel.innerHTML = '<div class="rai-head">' + face.replace("<svg", '<svg style="width:32px;height:32px"') + '<b>Rai<small>AI guide. Can be wrong, so check what matters.</small></b>' +
    '<button type="button" data-new>New chat</button><button type="button" data-close aria-label="Close">Close</button></div>' +
    '<div class="rai-log" role="log" aria-live="polite"></div>' +
    '<form class="rai-form"><textarea rows="1" maxlength="1500" placeholder="Ask Rai anything" aria-label="Your question"></textarea><button type="submit">Send</button></form>' +
    '<p class="rai-note">Don\'t share private details like ID or account numbers. Chats aren\'t saved. Questions Rai can\'t answer are kept without your name. <a href="/privacy.html">Privacy</a></p>';
  document.body.appendChild(fab); document.body.appendChild(panel);
  var log = panel.querySelector(".rai-log"), form = panel.querySelector("form"), box = form.querySelector("textarea"), send = form.querySelector("button");
  var busy = false;

  function draw() {
    var h = '<div class="rai-msg rai">' + md(HELLO) + "</div>";
    state.msgs.forEach(function (m) { h += '<div class="rai-msg ' + (m.role === "user" ? "you" : "rai") + '">' + (m.role === "user" ? "<p>" + esc(m.content).replace(/\n/g, "<br>") + "</p>" : md(m.content) + (m.gap ? '<p class="rai-gapnote">I saved this question, without your name, so the team can teach me the answer.</p>' : "")) + "</div>"; });
    if (busy) h += '<div class="rai-msg rai wait">Rai is thinking...</div>';
    if (!state.msgs.length && !busy) h += '<div class="rai-starts">' + STARTERS.map(function (s) { return '<button type="button">' + esc(s) + "</button>"; }).join("") + "</div>";
    log.innerHTML = h;
    log.scrollTop = log.scrollHeight;
    send.disabled = busy;
  }
  function open(on) {
    state.open = on; save();
    document.documentElement.classList.toggle("rai-open", on);
    if (on) { draw(); if (window.innerWidth >= 900) box.focus(); }
  }
  function ask(text) {
    text = String(text || "").trim();
    if (!text || busy) return;
    // Questions that didn't get an answer are dropped, so Rai never sees the error notes.
    state.msgs = state.msgs.filter(function (m, i, a) { return !m.failed && !(a[i + 1] && a[i + 1].failed); });
    state.msgs.push({ role: "user", content: text.slice(0, 1500) });
    busy = true; save(); draw();
    var url = (cfg.supabaseUrl || "") + "/functions/v1/rai";
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: cfg.supabaseKey || "", Authorization: "Bearer " + (cfg.supabaseKey || "") },
      body: JSON.stringify({ messages: state.msgs.slice(-24), page: { path: location.pathname, title: document.title } })
    }).then(function (r) { return r.json().catch(function () { return { error: "server" }; }); }).then(function (out) {
      var t = out && out.text;
      if (!t) {
        t = out && out.error === "visitor_limit" ? "That's all the questions I can answer for you today. Come back tomorrow, or ask people in [Talk](/app/talk.html)."
          : out && out.error === "site_limit" ? "I've answered all the questions I can for today across the whole site. Please try again tomorrow."
          : "Sorry, I couldn't answer just now. Please try again in a minute.";
        state.msgs.push({ role: "assistant", content: t, failed: true });
      } else {
        state.msgs.push(out.gap ? { role: "assistant", content: t, gap: true } : { role: "assistant", content: t });
      }
    }).catch(function () {
      state.msgs.push({ role: "assistant", content: "I can't reach the internet right now. Check your connection and try again.", failed: true });
    }).then(function () { busy = false; save(); draw(); });
  }

  fab.addEventListener("click", function () { open(true); });
  panel.addEventListener("click", function (e) {
    if (e.target.closest("[data-close]")) open(false);
    else if (e.target.closest("[data-new]")) { state.msgs = []; save(); draw(); }
    else if (e.target.closest(".rai-starts button")) ask(e.target.textContent);
  });
  form.addEventListener("submit", function (e) { e.preventDefault(); var t = box.value; box.value = ""; box.style.height = ""; ask(t); });
  box.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event("submit")); } });
  box.addEventListener("input", function () { box.style.height = ""; box.style.height = Math.min(box.scrollHeight, 120) + "px"; });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && state.open) open(false); });
  // Lets any link or button on the site open Rai: <a href="#ask-rai">
  document.addEventListener("click", function (e) { var a = e.target.closest('a[href="#ask-rai"]'); if (a) { e.preventDefault(); open(true); } });
  if (state.open) open(true);
})();
