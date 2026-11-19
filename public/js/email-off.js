// The "Stop these emails" link in Talk emails lands here. It turns the emails off right away, no log in needed.
(function () {
  var cfg = window.DANDELIONS_CONFIG || {}, msg = document.getElementById("msg");
  var t = new URLSearchParams(location.search).get("t") || "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t)) { msg.textContent = "This link looks broken. Open the bell in Talk and untick \"Email me too\" instead."; return; }
  var db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
  db.rpc("talk_mail_off", { p_token: t }).then(function (r) {
    msg.textContent = r.error ? "Couldn't turn them off just now. Try the link again in a minute." :
      r.data ? "Done. You won't get any more Talk emails." : "This link has expired. Open the bell in Talk and untick \"Email me too\" instead.";
  });
})();
