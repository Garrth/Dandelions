// "How it works" button in a page's top bar. It plays that page's tutorial in a pop-up.
// Where the bar is already full of buttons (Home), it hides below 380px wide; Home also links to all tutorials.
// Use: <script src="/js/tutorial.js" data-tut="talk"></script>  (video at /videos/talk-tutorial.mp4)
(function () {
  var me = document.currentScript, key = me && me.getAttribute("data-tut");
  var NAMES = { home: "Your home page", profile: "Your profile", talk: "Talk", directory: "Directory", deals: "Deals of the day", numbers: "Rai's numbers", baselines: "Baselines" };
  if (!key || !NAMES[key]) return;
  var css = document.createElement("style");
  css.textContent =
    ".tut-btn{display:inline-flex;align-items:center;gap:6px;background:none;border:1.5px solid currentColor;border-radius:999px;padding:5px 12px;font:inherit;font-size:14px;font-weight:700;color:inherit;cursor:pointer;white-space:nowrap}" +
    ".tut-btn:hover{background:rgba(255,210,26,.35)}.tut-btn svg{flex:none}" +
    "@media (max-width:420px){.tut-btn .tut-w{display:none}.tut-btn{padding:8px 10px}}@media (max-width:380px){.navlinks{gap:6px!important}.tut-btn.tut-tight{display:none}}" +
    ".tut-dlg{border:0;padding:0;border-radius:16px;background:#15210f;color:#fdfdf8;width:min(960px,calc(100vw - 24px));max-width:none;box-shadow:0 20px 60px rgba(0,0,0,.45)}" +
    ".tut-dlg::backdrop{background:rgba(21,33,15,.7)}" +
    ".tut-bar{display:flex;align-items:center;gap:12px;padding:10px 12px 10px 16px}.tut-bar b{flex:1;font-size:16px}" +
    ".tut-bar a{color:#ffd21a;font-weight:700;font-size:14px}.tut-x{background:#ffd21a;color:#15210f;border:0;border-radius:999px;padding:6px 14px;font:inherit;font-size:14px;font-weight:800;cursor:pointer}" +
    ".tut-dlg video{display:block;width:100%;height:auto;aspect-ratio:16/9;background:#000;border-radius:0 0 16px 16px}";
  document.head.appendChild(css);
  var btn = document.createElement("button");
  btn.type = "button"; btn.className = "tut-btn"; btn.setAttribute("aria-label", "Watch how " + NAMES[key] + " works");
  btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 1l9 5-9 5z" fill="currentColor"/></svg><span class="tut-w">How it works</span>';
  var dlg;
  btn.onclick = function () {
    if (!dlg) {
      dlg = document.createElement("dialog"); dlg.className = "tut-dlg";
      dlg.innerHTML = '<div class="tut-bar"><b>Tutorial: ' + NAMES[key] + '</b><a href="/videos.html">All tutorials</a><button type="button" class="tut-x">Close</button></div>' +
        '<video controls playsinline preload="metadata" poster="/videos/' + key + '-tutorial.jpg" src="/videos/' + key + '-tutorial.mp4"></video>';
      document.body.appendChild(dlg);
      var v = dlg.querySelector("video");
      dlg.querySelector(".tut-x").onclick = function () { dlg.close(); };
      dlg.addEventListener("close", function () { v.pause(); });
      dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    }
    dlg.showModal();
    var p = dlg.querySelector("video").play(); if (p && p.catch) p.catch(function () {});
  };
  function place() {
    var top = document.querySelector("header.top"); if (!top) return;
    var nav = top.querySelector(".navlinks, .top-nav, nav");
    if (nav) { if (nav.querySelector("a.btn")) btn.className += " tut-tight"; nav.insertBefore(btn, nav.firstChild); return; }
    var last = top.lastElementChild, box = document.createElement("span");
    box.style.cssText = "display:flex;align-items:center;gap:10px";
    top.appendChild(box); box.appendChild(btn); if (last && last !== top.firstElementChild) box.appendChild(last);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", place); else place();
})();
