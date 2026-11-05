// The owner's page for a claimed listing. Changes go live as soon as they're saved: the claim code
// from the listing's own phone is the check, and every change is logged so a bad one can be put back.
(function () {
  var D = window.DIR, esc = D.esc;
  var params = new URLSearchParams(location.search);
  var fam = params.get("f") || "", id = params.get("id") || "";
  var box = document.getElementById("edit");
  var db = D.db();
  var back = "/directory/biz.html?f=" + encodeURIComponent(fam) + "&id=" + encodeURIComponent(id);
  var FOOD = ["restaurant", "casual_eatery", "alcoholic_beverage_venue"];
  var TRADES = ["home_service", "building_or_construction_service"];
  var DAY_NAMES = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };
  var MAX_PHOTOS = 5;
  var biz, user, photos = [], removed = [];

  function $(x) { return document.getElementById(x); }
  function shell(inner) {
    box.innerHTML = '<a class="crumb" href="' + back + '">‹ ' + esc(biz ? biz[1] : "Back") + "</a>" +
      '<div class="page-head"><div class="eyebrow">Your listing</div><h1 style="font-size:26px">' + esc(biz ? biz[1] : "") + "</h1></div>" + inner;
  }
  function field(key, label, value, attrs) {
    return '<label class="field">' + label + '<input id="' + key + '" value="' + esc(value) + '" ' + (attrs || "") + "></label>";
  }
  function hoursRows(h) {
    return D.DAYS.map(function (d) {
      var x = h && h[d];
      return '<div class="hrow"><span>' + DAY_NAMES[d] + "</span>" +
        '<label class="check" style="margin:0"><input type="checkbox" id="open-' + d + '"' + (x ? " checked" : "") + "> Open</label>" +
        '<input type="time" id="from-' + d + '" value="' + (x ? x[0] : "09:00") + '" aria-label="' + DAY_NAMES[d] + ' opens"' + (x ? "" : " disabled") + ">" +
        '<input type="time" id="to-' + d + '" value="' + (x ? x[1] : "17:00") + '" aria-label="' + DAY_NAMES[d] + ' closes"' + (x ? "" : " disabled") + "></div>";
    }).join("");
  }

  function form(d) {
    var food = FOOD.indexOf(fam) >= 0, trade = TRADES.indexOf(fam) >= 0;
    var v = function (k, i) { return d ? d[k] : biz[i] || ""; };
    photos = (d && d.photos || []).map(function (p) { return { path: p }; });
    shell('<p class="small muted">What you save shows on your listing right away, with a Verified mark. Leave anything blank that you don\'t want to show.</p>' +
      '<form id="f" class="stack16" novalidate>' +
      '<div class="card"><h3>The basics</h3><div style="margin-top:10px">' +
        field("name", "Business name", v("name", 1), 'maxlength="100" required') +
        field("phone", "Phone", v("phone", 8), 'type="tel" maxlength="30" autocomplete="off"') +
        field("address", "Street address", v("address", 5), 'maxlength="120" placeholder="Leave blank to show your town only"') +
        '<div class="two">' + field("town", "Town", v("town", 6), 'maxlength="60"') + field("zip", "ZIP", v("zip", 7), 'inputmode="numeric" maxlength="5"') + "</div>" +
        field("website", "Website", v("website", 9), 'type="url" maxlength="300" placeholder="https://"') +
        (food ? field("menu_url", "Menu link", d ? d.menu_url : "", 'type="url" maxlength="300" placeholder="https://"') : "") +
        '<label class="field">About your business<textarea id="description" maxlength="600" rows="4" placeholder="What you do, what you\'re known for">' + esc(d ? d.description : "") + "</textarea></label>" +
      "</div></div>" +
      '<div class="card"><h3>Hours</h3><p class="small muted" style="margin-top:4px">Turns on "Open now". Closing after midnight? Pick the closing time, like 1:00 AM.</p>' +
        '<div class="hours" style="margin-top:10px">' + hoursRows(d && d.hours) + "</div></div>" +
      '<div class="card"><h3>Photos</h3><p class="small muted" style="margin-top:4px">Up to ' + MAX_PHOTOS + '. Only photos you have the right to use. We shrink them and take out location data.</p>' +
        '<div class="photos" id="photos" style="margin-top:10px"></div>' +
        '<label class="btn ghost small" id="addphoto" style="margin-top:10px">Add photos<input type="file" id="file" accept="image/*" multiple hidden></label></div>' +
      '<div class="card"><h3>An offer</h3><p class="small muted" style="margin-top:4px">One line people see on your listing. Turns on "Has an offer".</p>' +
        '<label class="field" style="margin-top:10px">Offer<input id="offer" maxlength="140" placeholder="10% off your first visit" value="' + esc(d ? d.offer : "") + '"></label></div>' +
      (food || trade ? '<div class="card"><h3>Filters</h3><div style="margin-top:10px">' +
        (food ? '<label class="field">Price<select id="price"><option value="0">Not given</option><option value="1">$</option><option value="2">$$</option><option value="3">$$$</option><option value="4">$$$$</option></select></label>' : "") +
        (trade ? '<label class="check"><input type="checkbox" id="free_estimates"' + (d && d.free_estimates ? " checked" : "") + "> Free estimates</label>" +
          '<label class="field">How many people work there?<select id="crew"><option value="">Not given</option><option value="1">Just me</option><option value="2-5">2 to 5</option><option value="6-20">6 to 20</option><option value="21+">21 or more</option></select></label>' : "") +
        "</div></div>" : "") +
      '<div class="savebar"><button class="btn" type="submit" id="save" style="width:100%">Save</button><p class="small" id="msg" role="status" style="margin-top:8px"></p></div>' +
      "</form>" +
      '<div class="foot"><span>Every change is kept, so anything can be put back. Questions? <a href="mailto:hello@dandelions.lol?subject=' + encodeURIComponent("My listing: " + biz[1] + " (" + id + ")") + '">Email us</a>.</span></div>');
    if ($("price")) $("price").value = String(d ? d.price : 0);
    if ($("crew")) $("crew").value = d ? d.crew : (biz[13] === 1 ? "1" : "");
    D.DAYS.forEach(function (day) {
      $("open-" + day).addEventListener("change", function () { $("from-" + day).disabled = $("to-" + day).disabled = !this.checked; });
    });
    $("file").addEventListener("change", function () { addFiles(Array.prototype.slice.call(this.files)); this.value = ""; });
    $("f").addEventListener("submit", function (e) { e.preventDefault(); save(); });
    drawPhotos();
  }

  function drawPhotos() {
    $("photos").innerHTML = photos.map(function (p, i) {
      var src = p.blob ? p.preview : D.photoUrl(p.path);
      return '<div class="ph"><img src="' + esc(src) + '" alt=""><button type="button" data-i="' + i + '" aria-label="Remove photo">×</button></div>';
    }).join("") || '<p class="small muted">No photos yet.</p>';
    Array.prototype.forEach.call($("photos").querySelectorAll("button"), function (b) {
      b.addEventListener("click", function () {
        var p = photos.splice(Number(b.getAttribute("data-i")), 1)[0];
        if (p.path) removed.push(p.path);
        drawPhotos();
      });
    });
    $("addphoto").hidden = photos.length >= MAX_PHOTOS;
  }

  // Redraw on a canvas: makes it smaller and drops everything but the picture (like GPS location).
  function shrink(file) {
    return new Promise(function (ok, no) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var s = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
        var c = document.createElement("canvas");
        c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { b ? ok(b) : no(new Error("shrink")); }, "image/jpeg", 0.85);
      };
      img.onerror = function () { URL.revokeObjectURL(url); no(new Error("not an image")); };
      img.src = url;
    });
  }
  function addFiles(files) {
    var room = MAX_PHOTOS - photos.length, msg = $("msg");
    if (files.length > room) msg.textContent = "Only " + MAX_PHOTOS + " photos fit, so we kept the first " + room + ".";
    files.slice(0, room).forEach(function (f) {
      shrink(f).then(function (b) {
        if (photos.length >= MAX_PHOTOS) return;
        photos.push({ blob: b, preview: URL.createObjectURL(b) });
        drawPhotos();
      }).catch(function () { msg.textContent = "One of those couldn't be read as a photo."; });
    });
  }

  function val(x) { return $(x) ? $(x).value.trim() : ""; }
  function url(u) { return !u || /^https?:\/\//i.test(u) ? u : "https://" + u; }

  function save() {
    var msg = $("msg"), hours = {}, open = 0;
    D.DAYS.forEach(function (d) {
      if ($("open-" + d).checked && $("from-" + d).value && $("to-" + d).value) { hours[d] = [$("from-" + d).value.slice(0, 5), $("to-" + d).value.slice(0, 5)]; open++; }
    });
    var row = {
      county_fips: D.COUNTY, listing_id: id, family: fam, owner_id: user.id,
      name: val("name"), phone: val("phone"), address: val("address"), town: val("town"), zip: val("zip"),
      website: url(val("website")), menu_url: url(val("menu_url")), description: val("description"), offer: val("offer"),
      hours: open ? hours : null, price: $("price") ? Number($("price").value) : 0,
      free_estimates: $("free_estimates") ? $("free_estimates").checked : false, crew: $("crew") ? $("crew").value : "",
      updated_at: new Date().toISOString()
    };
    if (row.name.length < 2) { msg.textContent = "Add the business name."; $("name").focus(); return; }
    if (row.zip && !/^[0-9]{5}$/.test(row.zip)) { msg.textContent = "The ZIP should be 5 numbers."; $("zip").focus(); return; }
    if (row.phone && row.phone.replace(/\D/g, "").length < 10) { msg.textContent = "The phone number looks short."; $("phone").focus(); return; }
    $("save").disabled = true;
    msg.textContent = "Saving...";
    var bucket = db.storage.from("listing-photos");
    // New photos go up first, so the listing never points at a file that isn't there.
    Promise.all(photos.map(function (p) {
      if (!p.blob) return p.path;
      var path = D.COUNTY + "/" + id + "/" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8) + ".jpg";
      return bucket.upload(path, p.blob, { contentType: "image/jpeg", cacheControl: "31536000" }).then(function (r) {
        if (r.error) throw r.error;
        p.path = path; p.blob = null;
        return path;
      });
    })).then(function (paths) {
      row.photos = paths;
      return db.from("listing_details").upsert(row, { onConflict: "county_fips,listing_id" });
    }).then(function (r) {
      if (r.error) throw r.error;
      if (removed.length) bucket.remove(removed).then(function () { removed = []; });
      $("save").disabled = false;
      msg.innerHTML = 'Saved. It\'s live. <a href="' + back + '">See your listing</a>';
      drawPhotos();
    }).catch(function () {
      $("save").disabled = false;
      msg.textContent = "Couldn't save just now. Check your connection and try again.";
    });
  }

  function signedOut() {
    try { localStorage.setItem("dandelions_return", location.pathname + location.search); } catch (e) {}
    shell('<div class="card"><p>Log in to edit your listing.</p><p style="margin-top:12px"><a class="btn" href="/app/login.html" style="width:100%;text-align:center">Log in</a></p>' +
      '<p class="small muted" style="margin-top:10px">After you log in, you\'ll come back here.</p></div>');
  }
  function notOwner() {
    shell('<div class="card"><p>Only the owner of this listing can change it. Is it yours?</p>' +
      '<p style="margin-top:12px"><a class="btn" href="/directory/claim.html?f=' + encodeURIComponent(fam) + "&id=" + encodeURIComponent(id) + '">Claim it</a></p></div>');
  }

  if (!db) { box.innerHTML = '<p class="note">Something didn\'t load. Please refresh the page.</p>'; return; }
  D.family(fam).then(function (rows) {
    biz = rows.filter(function (x) { return x[0] === id; })[0];
    if (!biz) throw new Error("missing");
    document.title = "Edit " + biz[1] + " | Dandelions";
    return db.auth.getSession();
  }).then(function (s) {
    if (!(s.data && s.data.session)) return signedOut();
    try { localStorage.removeItem("dandelions_return"); } catch (e) {}
    user = s.data.session.user;
    return Promise.all([
      db.from("listing_claims").select("id").eq("county_fips", D.COUNTY).eq("listing_id", id).eq("member_id", user.id).eq("status", "verified").maybeSingle(),
      db.from("listing_details").select("*").eq("county_fips", D.COUNTY).eq("listing_id", id).maybeSingle()
    ]).then(function (o) {
      if (!o[0].data) return notOwner();
      var d = o[1].data;
      if (d) d.hours = D.cleanHours(d.hours);
      form(d);
    });
  }).catch(function () {
    box.innerHTML = '<p class="note">Couldn\'t find that business. <a href="/directory/">Back to What do you need?</a></p>';
  });
})();
