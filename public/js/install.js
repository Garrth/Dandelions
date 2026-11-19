// Put Dandelions on your phone: show the steps for this phone first, and a one-tap button where the browser offers one (Android Chrome).
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var later = null;
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); later = e; var b = $("installbox"); if (b) b.hidden = false; });
  window.addEventListener("appinstalled", function () { var b = $("installbox"); if (b) b.hidden = true; });
  function ready() {
    var ua = navigator.userAgent || "";
    var ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    var standalone = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
    if (standalone) $("already").hidden = false;
    // Put this phone's steps first.
    if (ios) $("iphone").parentNode.insertBefore($("iphone"), $("android"));
    $("installbtn").addEventListener("click", function () {
      if (!later) return;
      later.prompt();
      later.userChoice.then(function () { later = null; $("installbox").hidden = true; });
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready); else ready();
})();
