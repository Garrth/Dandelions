// Member log-in: emails a one-time link that lands on the profile page.
(function () {
  var cfg = window.DANDELIONS_CONFIG || {};
  var msg = document.getElementById("msg");
  var btn = document.getElementById("send");
  if (!window.supabase) { msg.textContent = "Something didn't load. Please refresh the page."; return; }
  var db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);

  // Already logged in? Go straight to the profile.
  db.auth.getSession().then(function (res) { if (res.data && res.data.session) location.replace("/app/"); });

  document.getElementById("login").addEventListener("submit", function (e) {
    e.preventDefault();
    var email = document.getElementById("email").value.trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) { msg.textContent = "Add a real email."; return; }
    btn.disabled = true; msg.textContent = "Sending...";
    // shouldCreateUser: false, so log-in never makes a new member. Joining goes through the pledge.
    db.auth.signInWithOtp({ email: email, options: { shouldCreateUser: false, emailRedirectTo: location.origin + "/app/" } })
      .then(function (res) {
        btn.disabled = false;
        if (!res.error) { msg.textContent = "Check your email for the link. It works once, for a short time."; return; }
        msg.textContent = /signups not allowed|not found/i.test(res.error.message)
          ? "We don't have that email yet. Pledge first, then log in."
          : "That didn't work. Wait a minute and try again.";
      });
  });
})();
