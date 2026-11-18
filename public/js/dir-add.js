// Claim your business: first look for it by name and ZIP. If it's there, claim it. If not, add it
// (anywhere in the US). An added business shows right away. Nobody approves it: whoever added it
// can take it down, others can report it, and every add is kept. Then the owner claims it with a
// code to its phone, like any other listing.
(function () {
  var D = window.DIR, esc = D.esc;
  var box = document.getElementById("add");
  var db = D.db();
  var types, labels = {}, zips, counties, reg, session, asked = { name: "", zip: "", phone: "" };

  var ERR = {
    add_limit: "Five businesses a day is the most for one member. Try again tomorrow.",
    add_site_limit: "Lots of businesses were added today. Please try again tomorrow.",
    add_repeat: "A business with this phone number was already added in this county."
  };
  function $(x) { return document.getElementById(x); }
  function phoneOf(p) {
    var d = String(p || "").replace(/\D/g, "");
    if (d.length === 11 && d[0] === "1") d = d.slice(1);
    return d.length === 10 ? "(" + d.slice(0, 3) + ") " + d.slice(3, 6) + "-" + d.slice(6) : "";
  }
  function norm(n) { return String(n || "").toLowerCase().replace(/[^a-z0-9]/g, ""); }
  function shell(inner, title, sub) {
    box.innerHTML = '<a class="crumb" href="/directory/">‹ Directory</a>' +
      '<div class="page-head"><div class="eyebrow">Directory</div><h1 style="font-size:26px">' + (title || "Add your business") + "</h1>" +
      '<p class="muted">' + (sub || "Anywhere in the US. It's free and shows right away.") + "</p></div>" + inner;
  }

  // Step 1: look for it. Anyone can look; claiming or adding needs a log-in.
  function find() {
    shell('<form class="card" id="ff" novalidate>' +
      '<label class="field">Business name<input id="fname" maxlength="100" autocomplete="organization" value="' + esc(asked.name) + '" required></label>' +
      '<label class="field">ZIP code<input id="fzip" inputmode="numeric" maxlength="5" autocomplete="postal-code" value="' + esc(asked.zip) + '" required></label>' +
      '<button class="btn" type="submit" style="width:100%;margin-top:8px">Find it</button>' +
      '<p class="small muted" id="fmsg" role="status" style="margin-top:10px"></p></form><div id="found"></div>',
      "Claim your business", "Find it in the directory and claim it. Not there? Add it. It's free.");
    $("ff").addEventListener("submit", function (e) { e.preventDefault(); look(); });
    if (asked.name && asked.zip) look();
  }
  function look() {
    var msg = $("fmsg"), name = $("fname").value.trim(), zip = $("fzip").value.trim();
    asked.name = name; asked.zip = zip;
    if (name.length < 2) return void (msg.textContent = "Type the business name, or part of it.");
    if (!/^\d{5}$/.test(zip) || !countyFor(zip)) return void (msg.textContent = "Add a 5-digit US ZIP code we know.");
    msg.textContent = "Looking...";
    var c = countyFor(zip), spot = reg.zips[zip];
    var search = spot ? D.names(name, { lat: spot[0], lon: spot[1] }, 10, D.near(reg, { lat: spot[0], lon: spot[1] }, 10)) :
      D.addedIn(c.fips).then(function (rows) {
        var words = name.toLowerCase().match(/[a-z0-9]+/g) || [];
        return rows.filter(function (b) { var n = " " + b[1].toLowerCase().replace(/[^a-z0-9]+/g, " "); return words.every(function (w) { return n.indexOf(" " + w) >= 0; }); })
          .map(function (b) { return { name: b[1], type: b[2], town: b[6], fam: b.fam, id: b[0], fips: b.c }; });
      });
    search.then(function (list) {
      list = list.slice(0, 12);
      // Name results point at a row in a family file. Look up each one's id so the button can go straight to the claim.
      return Promise.all(list.map(function (x) {
        if (x.id) return x;
        return D.json("/data/dir/" + x.fips + "/fam/" + encodeURIComponent(x.fam) + ".json", true).then(function (rows) {
          var b = rows && rows[x.row]; x.id = b ? b[0] : ""; x.phone = b ? b[8] : ""; return x;
        });
      }));
    }).then(function (list) {
      list = list.filter(function (x) { return x.id; });
      msg.textContent = "";
      $("found").innerHTML = (list.length ? '<p class="countline">' + (list.length === 1 ? "Is this it?" : "Is it one of these?") + "</p>" + list.map(function (x) {
        var q = D.qs(x.fam, x.id, x.fips);
        return '<div class="card" style="margin-bottom:10px"><b>' + esc(x.name) + '</b><p class="small muted" style="margin-top:2px">' + esc(types[x.type][1]) +
          (x.town ? " · " + esc(x.town) : "") + (x.phone ? " · " + esc(x.phone) : "") + "</p>" +
          '<div class="row" style="margin-top:10px;gap:8px;display:flex"><a class="btn small" href="/directory/claim.html?' + q + '">It\'s mine. Claim it</a>' +
          '<a class="btn ghost small" href="/directory/biz.html?' + q + '">See it</a></div></div>';
      }).join("") : '<p class="note">We didn\'t find a business by that name within 10 miles of ' + esc(zip) + ". Try a shorter part of the name, or add it.</p>") +
        '<div class="card"><b>' + (list.length ? "Not one of these?" : "Add it") + '</b><p class="small muted" style="margin-top:4px">Add your business. It shows right away, then you claim it with a code to the business phone.</p>' +
        '<p style="margin-top:10px"><button class="btn small" type="button" id="toadd">Add my business</button></p></div>';
      $("toadd").addEventListener("click", function () {
        if (!session) return signedOut();
        form();
      });
    }).catch(function () { msg.textContent = "Couldn't look just now. Try again in a minute."; });
  }

  function signedOut() {
    try { localStorage.setItem("dandelions_return", "/directory/add.html?add=1&name=" + encodeURIComponent(asked.name) + "&zip=" + encodeURIComponent(asked.zip)); } catch (e) {}
    shell('<div class="card"><p>To add a business, log in first. It\'s free.</p><div class="stack" style="margin-top:12px">' +
      '<a class="btn" href="/app/login.html" style="width:100%;text-align:center">Log in</a>' +
      '<a class="btn ghost" href="/#pledge" style="width:100%;text-align:center">New here? Pledge first</a></div>' +
      '<p class="small muted" style="margin-top:10px">After you log in, you\'ll come back here.</p></div>');
  }

  function form() {
    shell('<form class="card" id="f" novalidate>' +
            '<label class="field" style="margin-top:12px">Business name<input id="name" maxlength="100" autocomplete="organization" value="' + esc(asked.name) + '" required></label>' +
      '<label class="field">What kind of business<input id="kind" list="kinds" autocomplete="off" placeholder="Start typing: plumbing, bakery, dentist" required></label>' +
      '<datalist id="kinds"></datalist>' +
      '<label class="field">Business phone<input id="phone" type="tel" autocomplete="tel" maxlength="20" placeholder="(707) 555-1234" required></label>' +
      '<label class="field">Street address (optional)<input id="address" maxlength="120" autocomplete="street-address" placeholder="123 Main St"></label>' +
      '<label class="check"><input type="checkbox" id="hide"> Don\'t show the street. I work from home or go to my customers.</label>' +
      '<label class="field">Town<input id="town" maxlength="60" autocomplete="address-level2" required></label>' +
      '<label class="field">ZIP code<input id="zip" inputmode="numeric" maxlength="5" autocomplete="postal-code" value="' + esc(asked.zip) + '" required></label>' +
      '<p class="small muted" id="where" style="margin-top:-6px"></p>' +
      '<label class="field">Website (optional)<input id="web" type="url" maxlength="300" placeholder="https://"></label>' +
      '<label class="check"><input type="checkbox" id="real"> This is a real business and it\'s open now.</label>' +
      '<button class="btn" type="submit" style="width:100%;margin-top:8px">Add it</button>' +
      '<p class="small muted" id="msg" role="status" style="margin-top:10px"></p></form>' +
      '<p class="small muted">The name, type, phone, town and website show to everyone. The street shows unless you hide it. Who added it doesn\'t show. ' +
      'Once it\'s in, the owner can claim it with a code sent to the business phone, then add hours, photos and an offer.</p>');
    $("kind").addEventListener("input", function () {
      var q = $("kind").value.trim().toLowerCase();
      $("kinds").innerHTML = q.length < 2 ? "" : Object.keys(labels).filter(function (l) { return l.toLowerCase().indexOf(q) >= 0; })
        .sort(function (a, b) { return (a.toLowerCase().indexOf(q) === 0 ? 0 : 1) - (b.toLowerCase().indexOf(q) === 0 ? 0 : 1) || a.localeCompare(b); })
        .slice(0, 40).map(function (l) { return '<option value="' + esc(l) + '">'; }).join("");
    });
    $("zip").addEventListener("input", showWhere);
    showWhere();
    $("f").addEventListener("submit", function (e) { e.preventDefault(); save(false); });
  }
  function countyFor(zip) {
    var fips = zips[zip], c = fips && counties[fips];
    return fips && c ? { fips: fips, name: c[0], state: c[1] } : null;
  }
  function showWhere() {
    var z = $("zip").value.trim(), c = /^\d{5}$/.test(z) ? countyFor(z) : null;
    $("where").textContent = c ? c.name + ", " + c.state : /^\d{5}$/.test(z) ? "We don't know that ZIP code." : "";
  }

  // A listing already in the county files with the same phone, or the same name in the same ZIP.
  function already(fam, fips, phone, name, zip) {
    if (!reg.counties.some(function (c) { return c.fips === fips; })) return Promise.resolve(null);
    return D.families(fam, [fips]).then(function (rows) {
      var p = phone.replace(/\D/g, ""), n = norm(name);
      return rows.filter(function (b) { return (p && String(b[8]).replace(/\D/g, "") === p) || (norm(b[1]) === n && b[7] === zip); })[0] || null;
    }).catch(function () { return null; });
  }

  function save(anyway) {
    var msg = $("msg"), v = function (id) { return $(id).value.trim(); };
    var name = v("name"), t = labels[v("kind")], phone = phoneOf(v("phone")), zip = v("zip"), town = v("town"), web = v("web");
    if (name.length < 2) return void (msg.textContent = "Add the business name.");
    if (t === undefined) return void (msg.textContent = "Pick the kind of business from the list as you type.");
    if (!phone) return void (msg.textContent = "Add a 10-digit US phone number. The owner gets the claim code there.");
    if (town.length < 2) return void (msg.textContent = "Add the town.");
    var c = /^\d{5}$/.test(zip) ? countyFor(zip) : null;
    if (!c) return void (msg.textContent = "Add a 5-digit US ZIP code we know.");
    if (web && !/^https?:\/\//i.test(web)) web = "https://" + web;
    if (web && !/^https?:\/\/[^\s]+\.[^\s]+$/i.test(web)) return void (msg.textContent = "That website doesn't look right. Leave it blank if you're not sure.");
    if (!$("real").checked) return void (msg.textContent = "Check the box to say it's a real business that's open now.");
    var type = types[t], fam = type[3], spot = reg.zips[zip];
    msg.textContent = "Checking...";
    (anyway ? Promise.resolve(null) : already(fam, c.fips, phone, name, zip)).then(function (hit) {
      if (hit) {
        msg.innerHTML = 'This looks like it\'s already in the directory: <a href="/directory/biz.html?' + D.qs(fam, hit[0], hit.c) + '">' + esc(hit[1]) + "</a>. " +
          'If it\'s yours, claim that one instead. <a href="#" id="anyway">It\'s a different business, add it</a>';
        $("anyway").addEventListener("click", function (e) { e.preventDefault(); save(true); });
        return;
      }
      msg.textContent = "Adding...";
      return db.from("added_listings").insert({
        county_fips: c.fips, family: fam, type_slug: type[0], name: name, address: v("address"), show_street: !$("hide").checked,
        town: town, state: c.state, zip: zip, phone: phone, website: web,
        lat: spot ? spot[0] : null, lon: spot ? spot[1] : null
      }).select("id").single().then(function (r) {
        if (r.error) {
          var code = Object.keys(ERR).filter(function (k) { return String(r.error.message || "").indexOf(k) >= 0; })[0];
          msg.textContent = code ? ERR[code] : "Couldn't add it. Check the details and try again.";
          return;
        }
        done(r.data.id, fam, c, name);
      });
    });
  }

  function done(id, fam, c, name) {
    var q = D.qs(fam, id, c.fips);
    shell('<div class="card"><h2>It\'s in the directory</h2><p style="margin-top:6px"><b>' + esc(name) + "</b> shows now in " + esc(c.name) + ", " + esc(c.state) + ". " +
      "If it's your business, claim it to add hours, photos and an offer. We send a code to the business phone.</p>" +
      '<div class="stack" style="margin-top:12px"><a class="btn" href="/directory/claim.html?' + q + '" style="width:100%;text-align:center">It\'s mine. Claim it</a>' +
      '<a class="btn ghost" href="/directory/biz.html?' + q + '" style="width:100%;text-align:center">See the listing</a>' +
      '<a class="btn ghost" href="/directory/add.html" style="width:100%;text-align:center">Add another</a></div>' +
      '<p class="small muted" style="margin-top:10px">Made a mistake? Open the listing and tap "Take it down" at the bottom.</p></div>');
  }

  if (!db) { box.innerHTML = '<p class="note">Something didn\'t load. Please refresh the page.</p>'; return; }
  Promise.all([db.auth.getSession(), D.types(), D.json("/data/zip-county.json"), D.json("/data/counties.json"), D.region()]).then(function (o) {
    types = o[1]; zips = o[2]; counties = o[3]; reg = o[4];
    // Pick-list of kinds. If two types share a label, the first wins.
    types.forEach(function (x, n) { if (labels[x[1]] === undefined) labels[x[1]] = n; });
    session = o[0].data && o[0].data.session;
    var p = new URLSearchParams(location.search);
    asked.name = (p.get("name") || "").slice(0, 100); asked.zip = (p.get("zip") || "").slice(0, 5);
    if (session) try { localStorage.removeItem("dandelions_return"); } catch (e) {}
    // Back from logging in on the way to adding: go straight to the form.
    if (p.get("add") && session) return form();
    find();
  }).catch(function () {
    box.innerHTML = '<p class="note">Something didn\'t load. Please refresh the page.</p>';
  });
})();
