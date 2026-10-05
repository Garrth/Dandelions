(function () {
  var title = document.getElementById("welcome-title");
  var body = document.getElementById("welcome-body");
  var cfg = window.DANDELIONS_CONFIG || {};

  function render(heading, paragraphs) {
    title.textContent = heading;
    body.innerHTML = "";
    paragraphs.forEach(function (text) {
      var p = document.createElement("p");
      p.textContent = text;
      body.appendChild(p);
    });
  }

  function addLink(text, href) {
    var a = document.createElement("a");
    a.className = "button";
    a.textContent = text;
    a.href = href;
    body.appendChild(a);
  }

  // Supabase puts an error in the link if it expired or was already used.
  var hash = new URLSearchParams(window.location.hash.slice(1));
  if (hash.get("error")) {
    render("That link didn't work", [
      "It may have expired or already been used. Links only work once and for a short time.",
      "Go back and enter your email again to get a fresh one.",
    ]);
    addLink("Back to the pledge form", "/#pledge");
    return;
  }

  if (!window.supabase || !cfg.supabaseUrl || cfg.supabaseUrl.indexOf("PASTE_") === 0) {
    render("Signups aren't open yet", ["Please check back soon."]);
    return;
  }

  var client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);

  client.auth.getSession().then(async function (res) {
    var session = res.data && res.data.session;
    if (!session) {
      render("You're not signed in", ["Use the pledge form to get a confirmation link by email."]);
      addLink("Back to the pledge form", "/#pledge");
      return;
    }

    var member = await client.from("members").select("zip").eq("id", session.user.id).maybeSingle();
    var zip = member.data && member.data.zip;

    render("Your pledge is confirmed", [
      zip ? "Thanks for joining. Your pledge now counts toward ZIP code " + zip + "." : "Thanks for joining. Your pledge now counts.",
      "There's nothing else you need to do right now. Soon you'll be able to see how your area is growing right here on the site.",
    ]);

    var signOut = document.createElement("button");
    signOut.className = "button secondary";
    signOut.textContent = "Sign out";
    signOut.addEventListener("click", async function () {
      await client.auth.signOut();
      window.location.href = "/";
    });
    body.appendChild(signOut);
  });
})();
