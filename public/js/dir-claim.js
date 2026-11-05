// Claim a listing: a code goes to the phone on the listing, by text or voice call. Typing it back
// makes the member the owner of record. A wrong or old number goes to a person to sort out.
(function () {
  var D = window.DIR, esc = D.esc;
  var params = new URLSearchParams(location.search);
  var fam = params.get("f") || "", id = params.get("id") || "";
  var box = document.getElementById("claim");
  var cfg = window.DANDELIONS_CONFIG || {};
  var db = D.db();
  var biz, claimId, channel;
  var back = "/directory/biz.html?f=" + encodeURIComponent(fam) + "&id=" + encodeURIComponent(id);

  var ERR = {
    not_a_member: "Only members can claim a listing. Pledge first, then come back.",
    no_phone: "This listing has no phone number, so we can't send a code. Use \"This isn't our number\" below and we'll sort it out with you.",
    already_claimed: "Someone already claimed this listing. If that wasn't you, use \"This isn't our number\" below and a person will look into it.",
    too_many: "That's a lot of codes for one day. Try again tomorrow, or ask for help below.",
    send_failed: "We couldn't send the code just now. Try again in a minute.",
    test_phone_bad: "Test mode is on but the test phone number isn't set right, so no code was sent.",
    wrong_code: "That code doesn't match.",
    too_many_tries: "Too many wrong codes. Ask for a new one.",
    expired: "That code ran out. Ask for a new one.",
    not_signed_in: "Please log in again."
  };
  function say(el, text) { el.textContent = text; }

  function call(body) {
    return db.functions.invoke("claim", { body: body }).then(function (r) {
      if (!r.error) return r.data;
      // The function answers errors with a JSON body; supabase-js puts the response on the error.
      var res = r.error.context;
      return res && res.json ? res.json().catch(function () { return { error: "server" }; }) : { error: "server" };
    });
  }

  function page(inner, noHelp) {
    box.innerHTML = '<a class="crumb" href="' + back + '">‹ ' + esc(biz[1]) + "</a>" +
      '<div class="page-head"><div class="eyebrow">Claim this listing</div><h1 style="font-size:26px">' + esc(biz[1]) + "</h1>" +
      '<p class="muted">' + esc([biz[6], biz[8]].filter(Boolean).join(" · ")) + "</p></div>" + inner + (noHelp ? "" :
      '<div class="foot"><span>Wrong or old number on the listing, or nobody there gets the code? <a href="#" id="helplink">This isn\'t our number</a></span></div>');
    var h = document.getElementById("helplink");
    if (h) h.addEventListener("click", function (e) { e.preventDefault(); help(); });
  }

  function choose() {
    if (!biz[8]) { page('<div class="note">' + esc(ERR.no_phone) + "</div>"); return; }
    page('<div class="card"><p>We\'ll send a code to the phone on this listing, <b>' + esc(biz[8]) + '</b>. Whoever answers that phone can claim it. On a landline? Pick the phone call.</p>' +
      '<div class="stack" style="margin-top:12px"><button class="btn" type="button" id="sms" style="width:100%">Text me the code</button>' +
      '<button class="btn ghost" type="button" id="voice" style="width:100%">Call with the code instead</button></div>' +
      '<p class="small muted" id="msg" role="status" style="margin-top:10px"></p></div>' +
      '<p class="small muted">Claiming is free. Once it\'s yours, you can fix the details and add photos, hours and an offer.</p>');
    function go(ch) {
      channel = ch;
      var msg = document.getElementById("msg");
      document.getElementById("sms").disabled = document.getElementById("voice").disabled = true;
      say(msg, ch === "sms" ? "Sending a text..." : "Calling...");
      call({ action: "start", fips: D.COUNTY, family: fam, id: id, channel: ch }).then(function (out) {
        if (out.status === "verified") return done("verified");
        if (out.claimId) { claimId = out.claimId; return enter(out.last4); }
        document.getElementById("sms").disabled = document.getElementById("voice").disabled = false;
        say(msg, ERR[out.error] || "Something went wrong. Try again in a minute.");
      });
    }
    document.getElementById("sms").addEventListener("click", function () { go("sms"); });
    document.getElementById("voice").addEventListener("click", function () { go("call"); });
  }

  function enter(last4) {
    page('<form class="card" id="codeform"><p>' + (channel === "sms" ? "We texted a code to the number ending in " : "We're calling the number ending in ") + esc(last4) +
      ". It works for 10 minutes.</p>" +
      '<label class="field" style="margin-top:10px">Code<input id="code" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="6 digits"></label>' +
      '<button class="btn" type="submit" style="width:100%">Claim it</button>' +
      '<p class="small muted" id="msg" role="status" style="margin-top:10px"></p>' +
      '<p class="small" style="margin-top:6px"><a href="#" id="again">Send a new code</a></p></form>');
    document.getElementById("again").addEventListener("click", function (e) { e.preventDefault(); choose(); });
    document.getElementById("codeform").addEventListener("submit", function (e) {
      e.preventDefault();
      var msg = document.getElementById("msg"), code = document.getElementById("code").value.replace(/\D/g, "");
      if (code.length < 4) { say(msg, "Type the code from the " + (channel === "sms" ? "text." : "call.")); return; }
      say(msg, "Checking...");
      call({ action: "check", claimId: claimId, code: code }).then(function (out) {
        if (out.status) return done(out.status);
        say(msg, (ERR[out.error] || "Something went wrong. Try again.") + (out.triesLeft ? " " + out.triesLeft + " tries left." : ""));
      });
    });
  }

  function done() {
    var edit = "/directory/edit.html?f=" + encodeURIComponent(fam) + "&id=" + encodeURIComponent(id);
    page('<div class="card"><h2>It\'s yours</h2><p style="margin-top:6px">You\'re now the owner of record for this listing. Add your hours, photos and an offer, and fix anything that\'s wrong. It shows right away.</p>' +
      '<div class="stack" style="margin-top:12px"><a class="btn" href="' + edit + '" style="width:100%;text-align:center">Add your details</a>' +
      '<a class="btn ghost" href="' + back + '" style="width:100%;text-align:center">See the listing</a></div></div>');
  }

  function help() {
    page('<form class="card" id="helpform"><h2>We\'ll sort it out</h2><p style="margin-top:6px">A local organizer will call you to check that the business is yours, then fix the number.</p>' +
      '<label class="field" style="margin-top:10px">Best phone to reach you<input id="contact" type="tel" autocomplete="tel" maxlength="40" required></label>' +
      '<label class="field">What\'s wrong? (optional)<input id="note" maxlength="500" placeholder="For example: we moved, the new number is..."></label>' +
      '<button class="btn" type="submit" style="width:100%">Send</button><p class="small muted" id="msg" role="status" style="margin-top:10px"></p></form>');
    document.getElementById("helpform").addEventListener("submit", function (e) {
      e.preventDefault();
      var msg = document.getElementById("msg"), contact = document.getElementById("contact").value.trim();
      if (contact.replace(/\D/g, "").length < 7) { say(msg, "Add a phone number we can call."); return; }
      say(msg, "Sending...");
      db.from("claim_help").insert({ county_fips: D.COUNTY, family: fam, listing_id: id, listing_name: biz[1], contact: contact, note: document.getElementById("note").value.trim() })
        .then(function (r) {
          if (r.error) { say(msg, "Couldn't send. Try again."); return; }
          page('<div class="card"><h2>Got it</h2><p style="margin-top:6px">An organizer will call you soon. Thanks for your patience.</p></div>');
        });
    });
  }

  function signedOut() {
    try { localStorage.setItem("dandelions_return", location.pathname + location.search); } catch (e) {}
    page('<div class="card"><p>To claim a listing, log in first. It\'s free.</p><div class="stack" style="margin-top:12px">' +
      '<a class="btn" href="/app/login.html" style="width:100%;text-align:center">Log in</a>' +
      '<a class="btn ghost" href="/#pledge" style="width:100%;text-align:center">New here? Pledge first</a></div>' +
      '<p class="small muted" style="margin-top:10px">After you log in, you\'ll come back here.</p></div>', true);
  }

  if (!db) { box.innerHTML = '<p class="note">Something didn\'t load. Please refresh the page.</p>'; return; }
  D.family(fam).then(function (rows) {
    biz = rows.filter(function (x) { return x[0] === id; })[0];
    if (!biz) throw new Error("missing");
    document.title = "Claim " + biz[1] + " | Dandelions";
    return db.auth.getSession();
  }).then(function (s) {
    if (!(s.data && s.data.session)) return signedOut();
    try { localStorage.removeItem("dandelions_return"); } catch (e) {}
    choose();
  }).catch(function () {
    box.innerHTML = '<p class="note">Couldn\'t find that business. <a href="/directory/">Back to What do you need?</a></p>';
  });
})();
