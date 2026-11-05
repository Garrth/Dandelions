// Directory page 3: one business. Before an owner claims it, this shows public facts only: no photos, no emails.
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
  function host(u) { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return ""; } }

  Promise.all([D.index(), D.family(fam)]).then(function (out) {
    var idx = out[0], b = out[1].filter(function (x) { return x[0] === id; })[0];
    if (!b) throw new Error("missing");
    return Promise.all([D.location(idx), D.claimed()]).then(function (x) { return [idx, b, x[0], x[1]]; });
  }).then(function (o) {
    var idx = o[0], b = o[1], loc = o[2], claimed = o[3].indexOf(id) >= 0;
    var safe = function (u) { return /^https?:\/\//i.test(u || "") ? u : ""; };
    var name = b[1], type = idx.types[b[2]][1], town = b[6], phone = b[8], web = safe(b[9]), social = safe(b[10]);
    var dist = D.miles(loc.lat, loc.lon, b[3], b[4]);
    document.title = name + " | Directory | Dandelions";
    var addr = [b[5], [town, b[7]].filter(Boolean).join(" ")].filter(Boolean).join(", ");
    var tel = phone.replace(/\D/g, "");
    var fromList = String(b[0]).indexOf("cslb-") === 0;
    var maps = "https://www.google.com/maps/dir/?api=1&destination=" + (fromList ? encodeURIComponent(town + " CA " + b[7]) : b[3] + "," + b[4]);
    if (fromList) addr = "";
    var licRow = b[11] ? "<div><b>License</b><span>California contractor #" + esc(b[11]) + ', active. <a href="https://www.cslb.ca.gov/OnlineServices/CheckLicenseII/LicenseDetail.aspx?LicNum=' +
      encodeURIComponent(b[11]) + '" target="_blank" rel="noopener">Check it with the state</a><br><span class="muted">' + esc(String(b[12]).split(" ").map(className).join(", ")) +
      (b[13] === 1 ? ". No employees on file (one-person shop)." : "") + "</span></span></div>" : "";
    var heading = idx.types[b[2]][0];
    var mail = function (subject) { return "mailto:hello@dandelions.lol?subject=" + encodeURIComponent(subject + ": " + name + " (" + id + ")"); };
    document.getElementById("biz").innerHTML =
      '<a class="crumb" href="/directory/list.html?t=' + encodeURIComponent(heading) + '">‹ ' + esc(type) + "</a>" +
      '<div class="bizhead"><div class="bizicon">' + icon(fam) + '</div><div style="min-width:0"><h1 style="font-size:26px">' + esc(name) + "</h1>" +
      '<p style="margin-top:4px">' + esc(type) + (town ? " · " + esc(town) : "") + " · " + dist.toFixed(1) + " mi" + (claimed ? ' · <span class="lic">Claimed by owner</span>' : "") + "</p></div></div>" +
      '<div class="actions">' +
        '<a class="main" href="' + (tel ? "tel:" + tel : "#") + '"' + (tel ? "" : ' aria-disabled="true"') + ">Call</a>" +
        '<a href="' + maps + '" target="_blank" rel="noopener">Directions</a>' +
        '<a href="' + esc(web || "#") + '" target="_blank" rel="noopener nofollow"' + (web ? "" : ' aria-disabled="true"') + ">Website</a></div>" +
      '<div class="facts">' +
        "<div><b>Address</b><span>" + (esc(addr) || '<span class="muted">' + (fromList ? "Works out of " + esc(town || "this county") + ". Call for details." : "Not listed") + "</span>") + "</span></div>" +
        licRow +
        "<div><b>Phone</b><span>" + (phone ? '<a href="tel:' + tel + '">' + esc(phone) + "</a>" : '<span class="muted">Not listed</span>') + "</span></div>" +
        "<div><b>Online</b><span>" + ([web ? '<a href="' + esc(web) + '" target="_blank" rel="noopener nofollow">' + esc(host(web) || "Website") + "</a>" : "",
          social ? '<a href="' + esc(social) + '" target="_blank" rel="noopener nofollow">' + esc(/facebook/.test(social) ? "Facebook" : /instagram/.test(social) ? "Instagram" : host(social)) + "</a>" : ""]
          .filter(Boolean).join(" · ") || '<span class="muted">Not listed</span>') + "</span></div>" +
        '<div><b>Hours</b><span class="muted">Not listed yet. Call to check.</span></div></div>' +
      '<div class="note"><b>No Dandelions review yet</b><br>Used them? <a href="' + mail("How it went") + '">Tell us how it went</a>.</div>' +
      '<div class="foot"><span>From ' + (fromList ? "the state contractor license list" : b[11] ? "public records, the state contractor license list and Overture Maps open data" : "public records and Overture Maps open data") + '.' + (claimed ? " The owner has claimed this listing." : ' Own this business? <a href="/directory/claim.html?f=' + encodeURIComponent(fam) + "&id=" + encodeURIComponent(id) + '">Claim it</a> to add photos, hours and an offer.') + "</span>" +
      '<span>Something wrong or closed? <a href="' + mail("Fix") + '">Tell us</a>.</span></div>';
  }).catch(function () {
    document.getElementById("biz").innerHTML = '<p class="note">Couldn\'t find that business. <a href="/directory/">Back to What do you need?</a></p>';
  });
})();
