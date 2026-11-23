// Section menu for long reading pages: built from the page's h2 headings.
// Fixed column on wide screens, a sticky "Sections" button on phones.
(function () {
  var main = document.querySelector("main");
  if (!main) return;
  var heads = main.querySelectorAll("h2");
  if (heads.length < 4) return;
  var nav = document.createElement("nav");
  nav.className = "pnav"; nav.setAttribute("aria-label", "Sections");
  nav.innerHTML = '<button type="button" class="pnav-btn" aria-expanded="false">&#9776; Sections</button><div class="pnav-list"></div>';
  var list = nav.querySelector(".pnav-list"), btn = nav.querySelector(".pnav-btn");
  Array.prototype.forEach.call(heads, function (h, i) {
    if (!h.id) h.id = "s" + (i + 1);
    var label = h.textContent.replace(/^\s*\d+\.\s*/, "").split(":")[0].trim();
    var a = document.createElement("a");
    a.href = "#" + h.id; a.textContent = label;
    list.appendChild(a);
  });
  main.insertBefore(nav, main.firstChild);
  function set(open) { nav.classList.toggle("open", open); btn.setAttribute("aria-expanded", open ? "true" : "false"); }
  btn.addEventListener("click", function (e) { e.stopPropagation(); set(!nav.classList.contains("open")); });
  list.addEventListener("click", function (e) { if (e.target.tagName === "A") set(false); });
  document.addEventListener("click", function (e) { if (!nav.contains(e.target)) set(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") set(false); });
})();
