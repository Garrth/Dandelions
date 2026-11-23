// Member log-in: a one-time email link (first), or a password. "Forgot / Create a password" sends the link and then opens the password spot on the profile.
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
    return r && /^\/(directory\/[a-z]+|app\/(talk|work|baselines))\.html(\?[\w=&%.-]*)?$/.test(r) ? r : null;
  }

  // Already logged in? Go straight to the member home page.
  db.auth.getSession().then(function (res) { if (res.data && res.data.session) location.replace(backTo() || "/app/"); });

  function email() {
    var v = document.getElementById("email").value.trim();
    if (!/^\S+@\S+\.\S+$/.test(v)) { msg.textContent = "Add a real email."; return null; }
    return v;
  }
  var setBtn = document.getElementById("setpw");
  function busy(on) { btn.disabled = linkBtn.disabled = setBtn.disabled = on; }

  // The bot check. Each answer works once, so it resets after every try.
  var Bot = window.BotCheck, botEl = document.getElementById("bot");
  if (Bot) Bot.mount(botEl);
  function bot() { return Bot ? Bot.token(botEl) : Promise.resolve(undefined); }
  function botFailed(err) {
    if (Bot) Bot.reset(botEl);
    if (Bot && Bot.failed(err)) { msg.textContent = "We couldn't confirm you're a person. Refresh the page and try again."; return true; }
    return false;
  }

  function sendLink(forPassword) {
    var e = email(); if (!e) return;
    // Remember to open the password spot after the link logs them in (works when the link opens in this browser).
    try { if (forPassword === true) localStorage.setItem("dandelions_setpw", "1"); else localStorage.removeItem("dandelions_setpw"); } catch (x) {}
    busy(true); msg.textContent = "Sending...";
    // shouldCreateUser: false, so log-in never makes a new member. Joining goes through the pledge.
    bot().then(function (t) {
      return db.auth.signInWithOtp({ email: e, options: { shouldCreateUser: false, captchaToken: t || undefined, emailRedirectTo: location.origin + "/app/" } });
    })
      .then(function (res) {
        busy(false);
        if (res.error && botFailed(res.error)) return;
        if (!res.error) { if (Bot) Bot.reset(botEl); showCode(e); msg.textContent = forPassword === true
          ? "Check your email. The link (or the code below) logs you in, then set your new password on Your profile. It works once, for about an hour."
          : "Check your email. Click the link, or type the code below. It works once, for about an hour."; return; }
        var m = res.error.message || "", wait = m.match(/after (\d+) seconds/);
        msg.textContent = /signups not allowed|not found/i.test(m) ? "We don't have that email yet. Sign up first, then log in."
          : wait ? "We just sent you a link. You can ask for another in " + wait[1] + " seconds. The newest link is the one that works."
          : res.error.status === 429 ? "Too many emails sent in the last hour. Try again later, or log in with your password."
          : "That didn't work. Wait a minute and try again.";
      });
  }

  document.getElementById("login").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var pw = document.getElementById("pw").value;
    if (!pw) { sendLink(false); return; }
    var e = email(); if (!e) return;
    busy(true); msg.textContent = "Logging in...";
    bot().then(function (t) {
      return db.auth.signInWithPassword({ email: e, password: pw, options: { captchaToken: t || undefined } });
    }).then(function (res) {
      busy(false);
      if (res.error && botFailed(res.error)) return;
      if (!res.error) { location.replace(backTo() || "/app/"); return; }
      msg.textContent = res.error.status === 429 ? "Too many tries. Wait a few minutes, or use the email link."
        : "Email or password doesn't match. No password yet? Tap Forgot password / Create a password.";
    });
  });
  // The same email carries a code, for people who read their email on a different device.
  var codeForm = document.getElementById("codeform"), codeMsg = document.getElementById("codemsg"), codeEmail = "";
  function showCode(e) { codeEmail = e; codeForm.hidden = false; codeMsg.textContent = ""; }
  function afterLogin() {
    var setpw = null;
    try { setpw = localStorage.getItem("dandelions_setpw"); localStorage.removeItem("dandelions_setpw"); } catch (x) {}
    location.replace(setpw ? "/app/profile.html#password" : (backTo() || "/app/"));
  }
  codeForm.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var t = document.getElementById("code").value.replace(/\s/g, "");
    if (!/^\d{6,10}$/.test(t)) { codeMsg.textContent = "Type the number from the email."; return; }
    document.getElementById("codebtn").disabled = true; codeMsg.textContent = "Checking...";
    db.auth.verifyOtp({ email: codeEmail, token: t, type: "email" }).then(function (res) {
      document.getElementById("codebtn").disabled = false;
      if (!res.error) { afterLogin(); return; }
      codeMsg.textContent = res.error.status === 429 ? "Too many tries. Wait a few minutes."
        : "That code didn't work. It may be old or already used. Use the newest email, or send a new one.";
    });
  });

  linkBtn.addEventListener("click", function () { sendLink(false); });
  setBtn.addEventListener("click", function () { sendLink(true); });
})();
