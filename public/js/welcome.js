(function () {
  var cfg = window.DANDELIONS_CONFIG || {};
  function $(id) { return document.getElementById(id); }

  function render(heading, paragraphs, linkText, linkHref) {
    $("w-title").textContent = heading;
    var body = $("w-body");
    body.innerHTML = "";
    paragraphs.forEach(function (text) {
      var p = document.createElement("p");
      p.className = "if";
      p.textContent = text;
      body.appendChild(p);
    });
    if (linkText) {
      var a = document.createElement("a");
      a.className = "btn";
      a.textContent = linkText;
      a.href = linkHref;
      body.appendChild(a);
    }
  }

  // Supabase puts an error in the link if it expired or was already used.
  var hash = new URLSearchParams(location.hash.slice(1));
  if (hash.get("error")) {
    render("That link didn't work", [
      "It may have expired or already been used. Links only work once and for a short time.",
      "Go back and enter your email again to get a fresh one."
    ], "Back to the pledge", "/#pledge");
    return;
  }

  if (!window.supabase) {
    render("Something didn't load", ["Please refresh the page."]);
    return;
  }

  var db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);

  db.auth.getSession().then(function (res) {
    var session = res.data && res.data.session;
    if (!session) {
      render("You're not signed in", ["Use the pledge form to get a confirmation link by email."], "Back to the pledge", "/#pledge");
      return;
    }

    Promise.all([
      db.from("members").select("zip,county_fips,referral_code").eq("id", session.user.id).maybeSingle(),
      fetch("/data/counties.json").then(function (r) { return r.json(); }).catch(function () { return {}; })
    ]).then(function (out) {
      var m = out[0].data || {}, counties = out[1], c = m.county_fips && counties[m.county_fips];
      render("You're a seed.", [
        c ? "Your pledge is confirmed and counts toward " + c[0] + ", " + c[1] + "." : "Your pledge is confirmed and counts now."
      ]);
      $("w-meta").textContent = c ? "Planted in " + c[0] + ", " + c[1] : (m.zip ? "Planted in ZIP " + m.zip : "");
      var link = location.host + "/?ref=" + (m.referral_code || "");
      $("w-link").textContent = link;
      $("w-card").hidden = !m.referral_code;
      $("w-copy").addEventListener("click", function () {
        var btn = this;
        function done() { btn.textContent = "Copied"; setTimeout(function () { btn.textContent = "Copy link"; }, 1600); }
        function selectIt() {
          var r = document.createRange(); r.selectNodeContents($("w-link"));
          var s = getSelection(); s.removeAllRanges(); s.addRange(r); btn.textContent = "Press copy";
        }
        try { navigator.clipboard.writeText("https://" + link).then(done, selectIt); } catch (e) { selectIt(); }
      });
    });
  });

  $("w-signout").addEventListener("click", function () {
    db.auth.signOut().then(function () { location.href = "/"; });
  });
})();
