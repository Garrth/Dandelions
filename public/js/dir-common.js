// Shared parts of the directory: the listings, where the visitor is, and how far to look.
// Listings are static files, one folder per county, built from Overture Maps open data
// (tools/build_directory.py), plus businesses members added (the added_listings table).
// Every county uses the same list of business types (/data/dir/types.json), so a search can
// reach across county lines.
(function () {
  var ROOT = "/data/dir/";
  var FIRST = "06097"; // Sonoma County, where the directory started
  var asked = new URLSearchParams(location.search).get("c");
  // The county of the one listing a page is about (biz, claim and edit pages).
  var COUNTY = /^[0-9]{5}$/.test(asked || "") ? asked : FIRST;
  var BASE = ROOT + COUNTY + "/";
  var cache = {};
  // Small words the name search skips (same list as tools/build_names.py).
  var SMALL = ["the", "and", "of", "a", "an", "at", "in", "on", "for", "to", "by", "inc", "llc", "co", "corp", "ltd"];

  function get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } }
  function put(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {} }
  function json(url, missingOk) {
    if (!cache[url]) cache[url] = fetch(url).then(function (r) {
      if (!r.ok) { if (missingOk && r.status === 404) return null; throw new Error(url); }
      return r.json();
    });
    return cache[url];
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  // Straight-line miles between two points.
  function miles(lat1, lon1, lat2, lon2) {
    var r = Math.PI / 180, dLat = (lat2 - lat1) * r, dLon = (lon2 - lon1) * r;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  // Link to one listing: its family, id and county.
  function qs(fam, id, fips) {
    return "f=" + encodeURIComponent(fam || "") + "&id=" + encodeURIComponent(id || "") + "&c=" + encodeURIComponent(fips || COUNTY);
  }

  // Where to measure from. Saved choice first, then the member's ZIP, then the middle of Sonoma County.
  function signedIn() {
    try { for (var i = 0; i < localStorage.length; i++) if (/^sb-.*-auth-token$/.test(localStorage.key(i))) return true; } catch (e) {}
    return false;
  }
  // One database client for the page (several clients fight over the log-in).
  var client;
  function db() {
    var cfg = window.DANDELIONS_CONFIG;
    if (!client && window.supabase && cfg) client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
    return client || null;
  }

  // Hours are {"mon": ["09:00", "17:00"], ...}. A missing or empty day is closed.
  // A close time at or before the open time means it runs past midnight.
  var DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  function cleanHours(h) {
    if (!h || typeof h !== "object") return null;
    var out = {}, any = false;
    DAYS.forEach(function (d) {
      var x = h[d];
      if (Array.isArray(x) && x.length === 2 && /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(x[0]) && /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(x[1])) { out[d] = [x[0], x[1]]; any = true; }
    });
    return any ? out : null;
  }
  // Open right now, in the county's own time. true, false, or null when there are no hours.
  function openNow(hours, when) {
    if (!hours) return null;
    var parts = {};
    new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(when || new Date()).forEach(function (p) { parts[p.type] = p.value; });
    var day = DAYS.indexOf(parts.weekday.slice(0, 3).toLowerCase()), now = parts.hour + ":" + parts.minute;
    var today = hours[DAYS[day]], yest = hours[DAYS[(day + 6) % 7]];
    if (today && (today[1] > today[0] ? now >= today[0] && now < today[1] : now >= today[0])) return true;
    if (yest && yest[1] <= yest[0] && now < yest[1]) return true;
    return false;
  }
  function memberZip() {
    if (!signedIn() || !window.supabase || !window.DANDELIONS_CONFIG) return Promise.resolve(null);
    return db().auth.getSession().then(function (s) {
      var u = s.data && s.data.session && s.data.session.user;
      if (!u) return null;
      return db().from("members").select("zip").eq("id", u.id).maybeSingle().then(function (r) { return r.data ? r.data.zip : null; });
    }).catch(function () { return null; });
  }
  // open.json: the counties the directory covers, with every ZIP and town in them.
  function region() { return json(ROOT + "open.json"); }
  function types() { return json(ROOT + "types.json"); }
  function countyOf(reg, fips) { return reg.counties.filter(function (c) { return c.fips === fips; })[0] || null; }
  function townNear(reg, lat, lon) {
    var best = null, d = 1e9;
    Object.keys(reg.towns).forEach(function (t) { var p = reg.towns[t], m = miles(lat, lon, p[0], p[1]); if (m < d) { d = m; best = t; } });
    return best;
  }
  function fromZip(reg, zip) {
    var c = reg.zips[zip];
    return c ? { lat: c[0], lon: c[1], label: zip + " " + (townNear(reg, c[0], c[1]) || ""), mode: "zip", fips: c[2] } : null;
  }
  function start(reg) { var c = countyOf(reg, FIRST); return { lat: c.center[0], lon: c.center[1], label: c.name, mode: "county", fips: FIRST }; }
  // A ZIP outside the open counties: which county it's in, for the businesses members added there.
  function outside(zip) {
    return Promise.all([json("/data/zip-county.json"), json("/data/counties.json")]).then(function (o) {
      var fips = o[0][zip], c = fips && o[1][fips];
      return fips ? { mode: "outside", zip: zip, fips: fips, label: zip + (c ? " " + c[0] + ", " + c[1] : ""), county: c ? c[0] + ", " + c[1] : "your county" } : null;
    }).catch(function () { return null; });
  }

  function whereFrom() {
    var saved = get("dir-loc");
    if (saved && (typeof saved.lat === "number" || saved.mode === "outside")) return Promise.resolve(saved);
    return Promise.all([region(), memberZip()]).then(function (o) {
      var reg = o[0], zip = o[1];
      var loc = zip && fromZip(reg, zip);
      if (loc) return loc;
      if (!zip) return start(reg);
      return outside(zip).then(function (l) { return l || start(reg); });
    });
  }
  // Turn "95404", "Oakland" or any US ZIP into a place. Resolves null when we don't know it.
  function lookup(text) {
    var t = (text || "").trim();
    return region().then(function (reg) {
      if (/^\d{5}$/.test(t)) return fromZip(reg, t) || outside(t);
      var key = Object.keys(reg.towns).filter(function (n) { return n.toLowerCase() === t.toLowerCase(); })[0];
      return key ? { lat: reg.towns[key][0], lon: reg.towns[key][1], label: key, mode: "town", fips: reg.towns[key][2] } : null;
    });
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

  // The open counties that reach within r miles of a place (closest point of each county's box).
  function near(reg, loc, r) {
    if (typeof loc.lat !== "number") return [];
    return reg.counties.filter(function (c) {
      var b = c.box, lat = Math.min(Math.max(loc.lat, b[0]), b[2]), lon = Math.min(Math.max(loc.lon, b[1]), b[3]);
      return miles(loc.lat, loc.lon, lat, lon) <= r;
    }).map(function (c) { return c.fips; });
  }

  // Businesses members added, in some counties. Each comes back shaped like a directory row.
  function addedRows(list, slugAt) {
    if (!list.length || !db()) return Promise.resolve([]);
    var key = "added:" + list.slice().sort().join(",");
    if (!cache[key]) cache[key] = db().from("added_listings")
      .select("id,county_fips,family,type_slug,name,address,show_street,town,state,zip,phone,website,lat,lon,online_only")
      .in("county_fips", list).eq("status", "live").limit(5000)
      .then(function (r) { return r.error ? [] : r.data || []; }).catch(function () { return []; });
    return cache[key].then(function (data) {
      return data.filter(function (a) { return slugAt[a.type_slug] !== undefined; }).map(function (a) { return toRow(a, slugAt); });
    });
  }
  function toRow(a, slugAt) {
    var row = [a.id, a.name, slugAt[a.type_slug], a.lat, a.lon, a.show_street ? a.address : "", a.town, a.zip, a.phone, a.website || "", ""];
    row.c = a.county_fips; row.fam = a.family; row.added = true; row.state = a.state; row.noStreet = !a.show_street || !!a.online_only; row.online = !!a.online_only;
    return row;
  }
  function slugIndex(t) {
    if (!t.slugs) { t.slugs = {}; t.forEach(function (x, n) { t.slugs[x[0]] = n; }); }
    return t.slugs;
  }

  // The location bar and distance box, shared by the first two screens.
  function locationBar(loc, onChange) {
    var btn = document.getElementById("locbtn"), sel = document.getElementById("radius"), panel = document.getElementById("locform");
    var input = document.getElementById("where"), err = document.getElementById("locerr"), list = document.getElementById("towns");
    region().then(function (reg) {
      if (list) list.innerHTML = Object.keys(reg.towns).map(function (t) { return '<option value="' + esc(t) + '">'; }).join("");
    });
    function show() {
      btn.innerHTML = esc(loc.label) + ' <span>· change</span>';
      sel.value = get("dir-rad") === "me" && loc.mode === "me" ? "me" : String(radius());
      sel.disabled = loc.mode === "outside";
      var n = document.getElementById("locnote");
      if (n) { n.textContent = loc.note || ""; n.hidden = !loc.note; }
    }
    function set(l) { loc = l; put("dir-loc", l); panel.hidden = true; err.textContent = ""; show(); onChange(loc); }
    btn.addEventListener("click", function () { panel.hidden = !panel.hidden; if (!panel.hidden) input.focus(); });
    document.getElementById("locform").addEventListener("submit", function (e) {
      e.preventDefault();
      lookup(input.value).then(function (l) {
        if (l) set(l); else err.textContent = "We don't know that ZIP or town. Looking for a business by name? Type it in the search box above.";
      });
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
    COUNTY: COUNTY, FIRST: FIRST, BASE: BASE, esc: esc, miles: miles, json: json, qs: qs, location: whereFrom, radius: radius,
    locationBar: locationBar, region: region, types: types, slugIndex: slugIndex, near: near,
    db: db, signedIn: signedIn, openNow: openNow, DAYS: DAYS, cleanHours: cleanHours,
    // Every business point (type, lat x 10000, lon x 10000) in these counties, added ones too.
    points: function (list) {
      return Promise.all([types()].concat(list.map(function (f) { return json(ROOT + f + "/index.json"); }))).then(function (o) {
        var pts = [];
        o.slice(1).forEach(function (idx) { pts = pts.concat(idx.pts); });
        return addedRows(list, slugIndex(o[0])).then(function (rows) {
          rows.forEach(function (b) { if (typeof b[3] === "number") pts.push(b[2], Math.round(b[3] * 1e4), Math.round(b[4] * 1e4)); });
          return pts;
        });
      });
    },
    // Listings in one family across counties. Each row knows its county (row.c).
    families: function (fam, list) {
      return types().then(function (t) {
        return Promise.all(list.map(function (f) {
          return json(ROOT + f + "/fam/" + encodeURIComponent(fam) + ".json", true).then(function (rows) {
            (rows || []).forEach(function (b) { b.c = f; });
            return rows || [];
          }).catch(function () { return []; });
        }).concat([addedRows(list, slugIndex(t))])).then(function (o) {
          var added = o.pop().filter(function (b) { return b.fam === fam; });
          return [].concat.apply([], o).concat(added);
        });
      });
    },
    // One listing, from the county files or the businesses members added. Resolves null if it isn't there.
    listing: function (fam, id) {
      if (/^add-/.test(id)) {
        if (!db()) return Promise.resolve(null);
        return Promise.all([types(), db().from("added_listings").select("id,county_fips,family,type_slug,name,address,show_street,town,state,zip,phone,website,lat,lon,online_only,status")
          .eq("id", id).maybeSingle()]).then(function (o) {
          var a = o[1].data, at = slugIndex(o[0]);
          if (!a || at[a.type_slug] === undefined) return null;
          var row = toRow(a, at); row.removed = a.status !== "live";
          return row;
        });
      }
      return json(BASE + "fam/" + encodeURIComponent(fam) + ".json", true).then(function (rows) {
        var b = (rows || []).filter(function (x) { return x[0] === id; })[0];
        if (b) b.c = COUNTY;
        return b || null;
      });
    },
    // Ids of listings an owner has claimed, in these counties. Empty if the database can't be reached.
    claimed: function (list) {
      list = list || [COUNTY];
      var key = "claimed:" + list.join(",");
      if (!cache[key]) {
        cache[key] = !db() ? Promise.resolve([]) : Promise.all(list.map(function (f) {
          return db().rpc("claimed_listings", { fips: f })
            .then(function (r) { return r.error || !r.data ? [] : r.data.map(function (x) { return typeof x === "string" ? x : x.claimed_listings; }); });
        })).then(function (o) { return [].concat.apply([], o); }).catch(function () { return []; });
      }
      return cache[key];
    },
    // What owners added, by listing id. Only listings with an owner of record count, so a
    // listing whose claim was taken back stops showing what that owner wrote.
    details: function (list) {
      list = list || [COUNTY];
      var key = "details:" + list.join(",");
      if (!cache[key]) {
        cache[key] = !db() || !list.length ? Promise.resolve({}) : Promise.all([
          db().from("listing_details").select("*").in("county_fips", list).then(function (r) { return r.error ? [] : r.data || []; }),
          window.DIR.claimed(list)
        ]).then(function (o) {
          var out = {};
          o[0].forEach(function (d) { if (o[1].indexOf(d.listing_id) >= 0) { d.hours = cleanHours(d.hours); out[d.listing_id] = d; } });
          return out;
        }).catch(function () { return {}; });
      }
      return cache[key];
    },
    // Businesses members added in a county outside the open ones (no map spots there yet).
    addedIn: function (fips) {
      return Promise.all([types(), db() ? db().from("added_listings").select("id,county_fips,family,type_slug,name,address,show_street,town,state,zip,phone,website,lat,lon,online_only")
        .eq("county_fips", fips).eq("status", "live").order("name").limit(2000) : Promise.resolve({ data: [] })]).then(function (o) {
        var at = slugIndex(o[0]);
        return (o[1].data || []).filter(function (a) { return at[a.type_slug] !== undefined; }).map(function (a) { return toRow(a, at); });
      }).catch(function () { return []; });
    },
    // Businesses whose name has words starting with every word typed, within reach, closest first.
    // Each comes back as {name, type, lat, lon, town, href, d}.
    names: function (q, loc, r, list) {
      var words = String(q || "").toLowerCase().replace(/&/g, " ").match(/[a-z0-9]+/g) || [];
      // "and", "the" and "of" don't need to match. The file to look in comes from the first word that isn't a small word.
      words = words.filter(function (w) { return ["and", "the", "of"].indexOf(w) < 0; });
      var first = words.filter(function (w) { return SMALL.indexOf(w) < 0; })[0];
      if (!first || first.length < 2 || typeof loc.lat !== "number") return Promise.resolve([]);
      var key = first.slice(0, 2).replace(/[^a-z]/g, "0");
      function hit(name) {
        var ws = (" " + name.toLowerCase().replace(/&/g, " ").replace(/[^a-z0-9]+/g, " "));
        return words.every(function (w) { return ws.indexOf(" " + w) >= 0; });
      }
      return types().then(function (t) {
        var at = slugIndex(t);
        return Promise.all(list.map(function (f) {
          return json(ROOT + f + "/names/" + key + ".json", true).then(function (rows) {
            return (rows || []).filter(function (e) { return hit(e[0]); }).map(function (e) {
              return { name: e[0], type: e[1], lat: e[2], lon: e[3], town: e[4], fam: t[e[1]][3], row: e[5], fips: f,
                href: "/directory/biz.html?f=" + encodeURIComponent(t[e[1]][3]) + "&row=" + e[5] + "&c=" + f };
            });
          }).catch(function () { return []; });
        }).concat([addedRows(list, at).then(function (rows) {
          return rows.filter(function (b) { return hit(b[1]) && typeof b[3] === "number"; }).map(function (b) {
            return { name: b[1], type: b[2], lat: b[3], lon: b[4], town: b[6], fam: b.fam, id: b[0], fips: b.c, href: "/directory/biz.html?" + qs(b.fam, b[0], b.c) };
          });
        })])).then(function (o) {
          return [].concat.apply([], o).map(function (x) { x.d = miles(loc.lat, loc.lon, x.lat, x.lon); return x; })
            .filter(function (x) { return x.d <= r; }).sort(function (a, b) { return a.d - b.d; });
        });
      });
    },
    photoUrl: function (path) {
      var cfg = window.DANDELIONS_CONFIG;
      return /^[0-9]{5}\/[A-Za-z0-9-]+\/[a-z0-9]+\.jpg$/.test(path || "") && cfg ? cfg.supabaseUrl + "/storage/v1/object/public/listing-photos/" + path : "";
    },
    homeLink: function () { return signedIn() ? "/app/" : "/"; }
  };
})();
