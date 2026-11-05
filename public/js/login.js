// Member log-in: a password, or a one-time email link that lands on the member home page.
(function () {
  var cfg = window.DANDELIONS_CONFIG || {};
  var msg = document.getElementById("msg");
  var btn = document.getElementById("send");
  var linkBtn = document.getElementById("link");
  if (!window.supabase) { msg.textContent = "Something didn't load. Please refresh the page."; return; }
  var db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);

  function backTo() {
    // Someone who started claiming a listing before logging in goes back to it.
    var r = null;
    try { r = localStorage.getItem("dandelions_return"); localStorage.removeItem("dandelions_return"); } catch (e) {}
    return r && /^\/directory\/[a-z]+\.html\?[\w=&%.-]*$/.test(r) ? r : null;
  }

  // Already logged in? Go straight to the member home page.
  db.auth.getSession().then(function (res) { if (res.data && res.data.session) location.replace(backTo() || "/app/"); });

  function email() {
    var v = document.getElementById("email").value.trim();
    if (!/^\S+@\S+\.\S+$/.test(v)) { msg.textContent = "Add a real email."; return null; }
    return v;
  }
  function busy(on) { btn.disabled = linkBtn.disabled = on; }

  function sendLink() {
    var e = email(); if (!e) return;
    busy(true); msg.textContent = "Sending...";
    // shouldCreateUser: false, so log-in never makes a new member. Joining goes through the pledge.
    db.auth.signInWithOtp({ email: e, options: { shouldCreateUser: false, emailRedirectTo: location.origin + "/app/" } })
      .then(function (res) {
        busy(false);
        if (!res.error) { msg.textContent = "Check your email for the link. It works once, for about an hour."; return; }
        var m = res.error.message || "", wait = m.match(/after (\d+) seconds/);
        msg.textContent = /signups not allowed|not found/i.test(m) ? "We don't have that email yet. Pledge first, then log in."
          : wait ? "We just sent you a link. You can ask for another in " + wait[1] + " seconds. The newest link is the one that works."
          : res.error.status === 429 ? "Too many emails sent in the last hour. Try again later, or log in with your password."
          : "That didn't work. Wait a minute and try again.";
      });
  }

  document.getElementById("login").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var pw = document.getElementById("pw").value;
    if (!pw) { sendLink(); return; }
    var e = email(); if (!e) return;
    busy(true); msg.textContent = "Logging in...";
    db.auth.signInWithPassword({ email: e, password: pw }).then(function (res) {
      busy(false);
      if (!res.error) { location.replace(backTo() || "/app/"); return; }
      msg.textContent = res.error.status === 429 ? "Too many tries. Wait a few minutes, or use the email link."
        : "Email or password doesn't match. No password yet? Use the email link, then set one on your profile.";
    });
  });
  linkBtn.addEventListener("click", sendLink);
})();
