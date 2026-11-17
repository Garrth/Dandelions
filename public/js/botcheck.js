// Bot check: Cloudflare Turnstile on the pledge and log-in forms, so scripts can't use up our email limit
// or make fake accounts in bulk. Most people never see it. Supabase checks the answer before it sends any email.
// Until turnstileSiteKey is set in config.js, this does nothing and the forms work as before.
//   BotCheck.mount(element)  shows the check in that element (call once when the page loads)
//   BotCheck.token(element)  waits for the answer, then use it as captchaToken
//   BotCheck.reset(element)  after each try, because an answer only works once
window.BotCheck = (function () {
  var key = (window.DANDELIONS_CONFIG || {}).turnstileSiteKey || "";
  var boxes = [], loading = null;
  function load() {
    if (!loading) loading = new Promise(function (ok, fail) {
      if (window.turnstile) return ok();
      var s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true; s.onload = ok; s.onerror = fail;
      document.head.appendChild(s);
    });
    return loading;
  }
  function box(el) { return boxes.filter(function (b) { return b.el === el; })[0]; }
  function mount(el) {
    if (!key || !el || box(el)) return;
    var b = { el: el, token: null, id: null };
    boxes.push(b);
    load().then(function () {
      b.id = window.turnstile.render(el, {
        sitekey: key,
        appearance: "interaction-only",
        callback: function (t) { b.token = t; },
        "expired-callback": function () { b.token = null; },
        "error-callback": function () { b.token = null; }
      });
    }).catch(function () {});
  }
  // Resolves with the answer, or null after 20 seconds (Supabase then says no, and the form says why).
  function token(el) {
    if (!key) return Promise.resolve(undefined);
    mount(el);
    var b = box(el), start = Date.now();
    return new Promise(function (ok) {
      (function wait() {
        if (b.token) return ok(b.token);
        if (Date.now() - start > 20000) return ok(null);
        setTimeout(wait, 200);
      })();
    });
  }
  function reset(el) {
    var b = box(el);
    if (b && b.id != null && window.turnstile) { b.token = null; window.turnstile.reset(b.id); }
  }
  // Supabase's words when the check is missing or failed.
  function failed(err) { return /captcha/i.test((err && err.message) || ""); }
  return { on: !!key, mount: mount, token: token, reset: reset, failed: failed };
})();
