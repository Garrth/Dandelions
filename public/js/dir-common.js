// Shared parts of the directory: the county listings, where the visitor is, and how far to look.
// Listings are static files built from Overture Maps open data (tools/build_directory.py).
(function () {
  var COUNTY = "06097";
  var BASE = "/data/dir/" + COUNTY + "/";
  var cache = {};

  function get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } }
  function put(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {} }
  function json(url) {
    if (!cache[url]) cache[url] = fetch(url).then(function (r) { if (!r.ok) throw new Error(url); return r.json(); });
    return cache[url];
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  // Straight-line miles between two points.
  function miles(lat1, lon1, lat2, lon2) {
    var r = Math.PI / 180, dLat = (lat2 - lat1) * r, dLon = (lon2 - lon1) * r;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // Where to measure from. Saved choice first, then the member's ZIP, then the middle of the county.
  function signedIn() {
    try { for (var i = 0; i < localStorage.length; i++) if (/^sb-.*-auth-token$/.test(localStorage.key(i))) return true; } catch (e) {}
    return false;
  }
  function memberZip() {
    if (!signedIn() || !window.supabase || !window.DANDELIONS_CONFIG) return Promise.resolve(null);
    var cfg = window.DANDELIONS_CONFIG;
    var db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
    return db.auth.getSession().then(function (s) {
      var u = s.data && s.data.session && s.data.session.user;
      if (!u) return null;
      return db.from("members").select("zip").eq("id", u.id).maybeSingle().then(function (r) { return r.data ? r.data.zip : null; });
    }).catch(function () { return null; });
  }
  function fromZip(idx, zip) {
    var c = idx.zips[zip];
    return c ? { lat: c[0], lon: c[1], label: zip + " " + (townForZip(idx, c) || ""), mode: "zip" } : null;
  }
  function townForZip(idx, c) {
    var best = null, d = 1e9;
    Object.keys(idx.towns).forEach(function (t) { var p = idx.towns[t], m = miles(c[0], c[1], p[0], p[1]); if (m < d) { d = m; best = t; } });
    return best;
  }
  function county(idx) { return { lat: idx.center[0], lon: idx.center[1], label: idx.name, mode: "county" }; }

  function location(idx) {
    var saved = get("dir-loc");
    if (saved && typeof saved.lat === "number") return Promise.resolve(saved);
    return memberZip().then(function (zip) {
      var loc = zip && fromZip(idx, zip);
      if (!loc) { loc = county(idx); if (zip) loc.note = "Your ZIP " + zip + " isn't in the directory yet. We're starting with " + idx.name + "."; }
      return loc;
    });
  }
  // Turn "95404" or "Petaluma" into a place. Returns null when it isn't in this county yet.
  function lookup(idx, text) {
    var t = (text || "").trim();
    if (/^\d{5}$/.test(t)) return fromZip(idx, t);
    var key = Object.keys(idx.towns).filter(function (n) { return n.toLowerCase() === t.toLowerCase(); })[0];
    return key ? { lat: idx.towns[key][0], lon: idx.towns[key][1], label: key, mode: "town" } : null;
  }
  function nearMe() {
    return new Promise(function (ok, no) {
      if (!navigator.geolocation) return no(new Error("This phone or browser can't share its location."));
      navigator.geolocation.getCurrentPosition(function (p) {
        ok({ lat: p.coords.latitude, lon: p.coords.longitude, label: "Your location", mode: "me" });
      }, function () { no(new Error("Couldn't get your location. Check that location is allowed for this site.")); }, { timeout: 15000, maximumAge: 300000 });
    });
  }
  function radius() { var r = get("dir-rad"); return r === "me" ? 5 : [5, 10, 25].indexOf(r) >= 0 ? r : 10; }

  // The location bar and distance box, shared by the first two screens.
  function locationBar(idx, loc, onChange) {
    var btn = document.getElementById("locbtn"), sel = document.getElementById("radius"), panel = document.getElementById("locform");
    var input = document.getElementById("where"), err = document.getElementById("locerr"), list = document.getElementById("towns");
    if (list) list.innerHTML = Object.keys(idx.towns).map(function (t) { return '<option value="' + esc(t) + '">'; }).join("");
    function show() {
      btn.innerHTML = esc(loc.label) + ' <span>· change</span>';
      sel.value = get("dir-rad") === "me" && loc.mode === "me" ? "me" : String(radius());
      var n = document.getElementById("locnote");
      if (n) { n.textContent = loc.note || ""; n.hidden = !loc.note; }
    }
    function set(l) { loc = l; put("dir-loc", l); panel.hidden = true; err.textContent = ""; show(); onChange(loc); }
    btn.addEventListener("click", function () { panel.hidden = !panel.hidden; if (!panel.hidden) input.focus(); });
    document.getElementById("locform").addEventListener("submit", function (e) {
      e.preventDefault();
      var l = lookup(idx, input.value);
      if (l) set(l); else err.textContent = "We don't have that ZIP or town yet. The directory starts with " + idx.name + ".";
    });
    document.getElementById("loccancel").addEventListener("click", function () { panel.hidden = true; err.textContent = ""; });
    sel.addEventListener("change", function () {
      if (sel.value === "me") {
        nearMe().then(function (l) { put("dir-rad", "me"); set(l); }).catch(function (e) { show(); err.textContent = e.message; panel.hidden = false; });
      } else {
        put("dir-rad", Number(sel.value));
        show();
        onChange(loc);
      }
    });
    show();
  }

  window.DIR = {
    COUNTY: COUNTY, BASE: BASE, esc: esc, miles: miles, json: json, location: location, radius: radius,
    locationBar: locationBar, index: function () { return json(BASE + "index.json"); },
    family: function (f) { return json(BASE + "fam/" + encodeURIComponent(f) + ".json"); },
    homeLink: function () { return signedIn() ? "/app/" : "/"; }
  };
})();
