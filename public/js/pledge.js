(function () {
  var form = document.getElementById("pledge-form");
  var message = document.getElementById("form-message");
  var button = form.querySelector("button[type=submit]");
  var cfg = window.DANDELIONS_CONFIG || {};
  var client = null;

  if (window.supabase && cfg.supabaseUrl && cfg.supabaseUrl.indexOf("PASTE_") !== 0) {
    client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
  }

  // Remember a referral code from a link like dandelions.lol/?ref=abc123
  var ref = new URLSearchParams(window.location.search).get("ref");
  if (ref && /^[a-z0-9]{4,16}$/i.test(ref)) {
    try { localStorage.setItem("dandelions_ref", ref.toLowerCase()); } catch (e) {}
  }

  function show(text, kind) {
    message.textContent = text;
    message.className = "form-message " + (kind || "");
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    // Honeypot: real people never see this field.
    if (form.website.value) {
      show("Check your email for a link to confirm your pledge.", "ok");
      return;
    }

    var email = form.email.value.trim();
    var zip = form.zip.value.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return show("Please enter a valid email address.", "error");
    if (!/^\d{5}$/.test(zip)) return show("Please enter a 5 digit ZIP code.", "error");
    if (!form.age.checked) return show("You need to be 18 or older to pledge.", "error");
    if (!form.agree.checked) return show("Please check the pledge box to continue.", "error");
    if (!client) return show("Signups aren't open yet. Please check back soon.", "error");

    var savedRef = null;
    try { savedRef = localStorage.getItem("dandelions_ref"); } catch (e) {}

    button.disabled = true;
    show("Sending...", "");

    var result = await client.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: window.location.origin + "/welcome.html",
        data: { zip: zip, age_confirmed: true, referred_by: savedRef },
      },
    });

    button.disabled = false;

    if (result.error) {
      if (result.error.status === 429) {
        show("Too many tries right now. Please wait a few minutes and try again.", "error");
      } else {
        show("Something went wrong on our end. Please try again in a bit.", "error");
      }
      return;
    }

    form.reset();
    show("Almost done. Check your email for a link to confirm your pledge.", "ok");
  });
})();
