// Directory page 3: one business. Before an owner claims it, this shows public facts only: no photos, no emails.
// Once the owner of record adds details (listing_details), those show instead, with a Verified mark.
(function () {
  var D = window.DIR, esc = D.esc;
  var params = new URLSearchParams(location.search);
  var fam = params.get("f") || "", id = params.get("id") || "";
  var ICONS = {
    food: '<path d="M7 3v8a2 2 0 0 0 4 0V3M9 11v10M16 3c-2 2-2 6 0 8v10"/>',
    tools: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>',
    shop: '<path d="M4 9h16l-1-5H5zM5 9v11h14V9M9 20v-6h6v6"/>'
  };
  function icon(f) {
    var k = /restaurant|eatery|beverage|food/.test(f) ? "food" : /home_service|construction|vehicle|technical/.test(f) ? "tools" : "shop";
    return '<svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[k] + "</svg>";
  }
  var CLASSES = { "A": "General engineering", "B": "General building", "B-2": "Residential remodeling", "C-2": "Insulation", "C-4": "Boilers and steam",
    "C-5": "Framing and carpentry", "C-6": "Cabinets and millwork", "C-7": "Low voltage systems", "C-8": "Concrete", "C-9": "Drywall", "C-10": "Electrical",
    "C-11": "Elevators", "C-12": "Earthwork and paving", "C-13": "Fencing", "C-15": "Flooring", "C-16": "Fire protection", "C-17": "Glazing",
    "C-20": "Heating and air conditioning", "C-21": "Demolition", "C-22": "Asbestos removal", "C-23": "Ornamental metal", "C-27": "Landscaping",
    "C-28": "Locks and security", "C-29": "Masonry", "C-31": "Traffic control", "C-32": "Parking and highway", "C-33": "Painting", "C-34": "Pipelines",
    "C-35": "Lathing and plastering", "C-36": "Plumbing", "C-38": "Refrigeration", "C-39": "Roofing", "C-42": "Sewer and septic", "C-43": "Sheet metal",
    "C-45": "Signs", "C-46": "Solar", "C-47": "Manufactured housing", "C-49": "Tree service", "C-50": "Steel reinforcing", "C-51": "Structural steel",
    "C-53": "Swimming pools", "C-54": "Tile", "C-55": "Water conditioning", "C-57": "Well drilling", "C-60": "Welding", "C-61": "Limited specialty",
    "ASB": "Asbestos", "HAZ": "Hazardous waste removal" };
  function className(c) { var k = c.indexOf("/") > 0 ? "C-61" : c; return (CLASSES[k] || "Specialty") + " (" + c + ")"; }
  var CREW = { "1": "One-person shop", "2-5": "2 to 5 people", "6-20": "6 to 20 people", "21+": "21 or more people" };
  var DAY = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };
  function clock(t) { var h = Number(t.slice(0, 2)), m = t.slice(3); return (h % 12 || 12) + (m === "00" ? "" : ":" + m) + (h < 12 ? " am" : " pm"); }
  function hours(h) {
    if (!h) return '<span class="muted">Not listed yet. Call to check.</span>';
    var now = D.openNow(h), today = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", weekday: "short" }).format(new Date()).slice(0, 3).toLowerCase();
    return '<span class="' + (now ? "open" : "closed") + '">' + (now ? "Open now" : "Closed now") + '</span><table class="hours-t">' + D.DAYS.map(function (d) {
      return '<tr' + (d === today ? ' class="today"' : "") + "><td>" + DAY[d] + "</td><td>" + (h[d] ? (h[d][0] === h[d][1] ? "Open 24 hours" : clock(h[d][0]) + " to " + clock(h[d][1])) : "Closed") + "</td></tr>";
    }).join("") + "</table>";
  }
  function gallery(det) {
    var imgs = (det && det.photos || []).map(D.photoUrl).filter(Boolean);
    return imgs.length ? '<div class="gallery">' + imgs.map(function (u) { return '<img src="' + esc(u) + '" alt="" loading="lazy">'; }).join("") + "</div>" : "";
  }
  // True when the person looking is this listing's owner of record.
  function mine() {
    if (!D.signedIn() || !D.db()) return Promise.resolve(false);
    return D.db().auth.getSession().then(function (s) {
      var u = s.data && s.data.session && s.data.session.user;
      if (!u) return false;
      return D.db().from("listing_claims").select("id").eq("county_fips", D.COUNTY).eq("listing_id", id).eq("member_id", u.id).eq("status", "verified").maybeSingle()
        .then(function (r) { return !!r.data; });
    }).catch(function () { return false; });
  }
  function host(u) { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return ""; } }

  Promise.all([D.index(), D.family(fam)]).then(function (out) {
    var idx = out[0], b = out[1].filter(function (x) { return x[0] === id; })[0];
    if (!b) throw new Error("missing");
    return Promise.all([D.location(idx), D.claimed(), D.details(), mine()]).then(function (x) { return [idx, b, x[0], x[1], x[2][id], x[3]]; });
  }).then(function (o) {
    var idx = o[0], b = o[1], loc = o[2], claimed = o[3].indexOf(id) >= 0, det = o[4], owner = o[5];
    var safe = function (u) { return /^https?:\/\//i.test(u || "") ? u : ""; };
    var pick = function (k, i) { return det ? det[k] || "" : b[i] || ""; };
    var name = pick("name", 1), type = idx.types[b[2]][1], town = pick("town", 6), phone = pick("phone", 8), web = safe(pick("website", 9)), social = safe(b[10]);
    var street = pick("address", 5), zip = pick("zip", 7);
    var dist = D.miles(loc.lat, loc.lon, b[3], b[4]);
    document.title = name + " | Directory | Dandelions";
    var addr = [street, [town, zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
    var tel = phone.replace(/\D/g, "");
    var fromList = String(b[0]).indexOf("cslb-") === 0;
    // A listing from the license list has no street address unless its owner adds one.
    var noStreet = det ? !street : fromList;
    var maps = "https://www.google.com/maps/dir/?api=1&destination=" + (det && street ? encodeURIComponent(addr + " CA") : noStreet ? encodeURIComponent(town + " CA " + zip) : b[3] + "," + b[4]);
    if (noStreet) addr = "";
    var licRow = b[11] ? "<div><b>License</b><span>California contractor #" + esc(b[11]) + ', active. <a href="https://www.cslb.ca.gov/OnlineServices/CheckLicenseII/LicenseDetail.aspx?LicNum=' +
      encodeURIComponent(b[11]) + '" target="_blank" rel="noopener">Check it with the state</a><br><span class="muted">' + esc(String(b[12]).split(" ").map(className).join(", ")) +
      (b[13] === 1 && !(det && det.crew && det.crew !== "1") ? ". No employees on file (one-person shop)." : "") + "</span></span></div>" : "";
    var heading = idx.types[b[2]][0];
    var mail = function (subject) { return "mailto:hello@dandelions.lol?subject=" + encodeURIComponent(subject + ": " + name + " (" + id + ")"); };
    document.getElementById("biz").innerHTML =
      '<a class="crumb" href="/directory/list.html?t=' + encodeURIComponent(heading) + '">‹ ' + esc(type) + "</a>" +
      '<div class="bizhead"><div class="bizicon">' + icon(fam) + '</div><div style="min-width:0"><h1 style="font-size:26px">' + esc(name) + "</h1>" +
      '<p style="margin-top:4px">' + esc(type) + (town ? " · " + esc(town) : "") + " · " + dist.toFixed(1) + " mi" + (det ? ' · <span class="lic">✓ Verified</span>' : claimed ? ' · <span class="lic">Claimed by owner</span>' : "") + "</p></div></div>" +
      '<div class="actions">' +
        '<a class="main" href="' + (tel ? "tel:" + tel : "#") + '"' + (tel ? "" : ' aria-disabled="true"') + ">Call</a>" +
        '<a href="' + maps + '" target="_blank" rel="noopener">Directions</a>' +
        '<a href="' + esc(web || "#") + '" target="_blank" rel="noopener nofollow"' + (web ? "" : ' aria-disabled="true"') + ">Website</a></div>" +
      (owner ? '<a class="btn small" href="/directory/edit.html?f=' + encodeURIComponent(fam) + "&id=" + encodeURIComponent(id) + '" style="text-align:center">' + (det ? "Edit your listing" : "Add your details") + "</a>" : "") +
      gallery(det) +
      (det && det.offer ? '<div class="offer"><span>Offer</span>' + esc(det.offer) + "</div>" : "") +
      (det && det.description ? '<p class="about">' + esc(det.description) + "</p>" : "") +
      '<div class="facts">' +
        "<div><b>Address</b><span>" + (esc(addr) || '<span class="muted">' + (noStreet ? "Works out of " + esc(town || "this county") + ". Call for details." : "Not listed") + "</span>") + "</span></div>" +
        licRow +
        "<div><b>Phone</b><span>" + (phone ? '<a href="tel:' + tel + '">' + esc(phone) + "</a>" : '<span class="muted">Not listed</span>') + "</span></div>" +
        "<div><b>Online</b><span>" + ([web ? '<a href="' + esc(web) + '" target="_blank" rel="noopener nofollow">' + esc(host(web) || "Website") + "</a>" : "",
          social ? '<a href="' + esc(social) + '" target="_blank" rel="noopener nofollow">' + esc(/facebook/.test(social) ? "Facebook" : /instagram/.test(social) ? "Instagram" : host(social)) + "</a>" : ""]
          .filter(Boolean).join(" · ") || '<span class="muted">Not listed</span>') + "</span></div>" +
        (det && safe(det.menu_url) ? '<div><b>Menu</b><span><a href="' + esc(safe(det.menu_url)) + '" target="_blank" rel="noopener nofollow">See the menu</a></span></div>' : "") +
        (det && det.price ? "<div><b>Price</b><span>" + "$$$$".slice(0, det.price) + "</span></div>" : "") +
        (det && (det.free_estimates || det.crew) ? "<div><b>Work</b><span>" + [det.free_estimates ? "Free estimates" : "", det.crew ? CREW[det.crew] : ""].filter(Boolean).join(" · ") + "</span></div>" : "") +
        "<div><b>Hours</b><span>" + hours(det && det.hours) + "</span></div></div>" +
      '<div class="note"><b>No Dandelions review yet</b><br>Used them? <a href="' + mail("How it went") + '">Tell us how it went</a>.</div>' +
      '<div class="foot"><span>From ' + (fromList ? "the state contractor license list" : b[11] ? "public records, the state contractor license list and Overture Maps open data" : "public records and Overture Maps open data") + '.' + (det ? " Details from the owner." : claimed ? " The owner has claimed this listing." : ' Own this business? <a href="/directory/claim.html?f=' + encodeURIComponent(fam) + "&id=" + encodeURIComponent(id) + '">Claim it</a> to add photos, hours and an offer.') + "</span>" +
      '<span>Something wrong or closed? <a href="' + mail("Fix") + '">Tell us</a>.</span></div>';
    // Today's deal of the day for this business, if it booked one. "Today" is Pacific time, like the front page.
    var today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
    if (D.db()) D.db().from("daily_deals").select("title,details,price_was,price_now,link").eq("county_fips", D.COUNTY).eq("listing_id", id)
      .eq("deal_day", today).eq("status", "live").limit(1).then(function (r) {
        var x = r.data && r.data[0], acts = document.querySelector("#biz .actions");
        if (!x || !acts) return;
        var el = document.createElement("div");
        el.className = "offer";
        el.innerHTML = "<span>Deal of the day</span>" + esc(x.title) + (x.price_now ? " · " + (x.price_was ? "<s>" + esc(x.price_was) + "</s> " : "") + "<b>" + esc(x.price_now) + "</b>" : "") +
          (x.details ? '<br><small class="muted">' + esc(x.details) + "</small>" : "") + (/^https:\/\//.test(x.link) ? ' <a href="' + esc(x.link) + '" target="_blank" rel="noopener">Get it</a>' : "");
        acts.parentNode.insertBefore(el, acts.nextSibling);
      });
  }).catch(function () {
    document.getElementById("biz").innerHTML = '<p class="note">Couldn\'t find that business. <a href="/directory/">Back to What do you need?</a></p>';
  });
})();
