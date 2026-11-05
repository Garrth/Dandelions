// Rai's numbers: public numbers for a county, plus live totals from Dandelions members.
// The public numbers are in /data/rai/<fips>.json, which a weekly job (tools/rai_numbers.py) keeps up to date.
// Anyone can read this page. Member totals only show when at least 10 people are behind them.
(function () {
  var cfg = window.DANDELIONS_CONFIG || {};
  var box = document.getElementById("rai");
  var FIRST = "06097";
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fmt(n) { return Number(n).toLocaleString("en-US"); }
  function money(n, d) { return "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function getJSON(url) { return fetch(url, { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(url); return r.json(); }); }
  function day(iso) {
    if (!iso) return "";
    var d = new Date(iso + "T12:00:00");
    return isNaN(d) ? String(iso) : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  // An arrow and the change against a year ago. upIsGood picks the color.
  function trend(now, then, upIsGood) {
    if (now == null || !then) return "";
    var p = Math.round((now / then - 1) * 1000) / 10;
    var cls = p === 0 ? "flat" : (p > 0) === upIsGood ? "good" : "bad";
    return ' <span class="trend ' + cls + '">' + (p > 0 ? "↑ " : p < 0 ? "↓ " : "→ ") + Math.abs(p) + "%</span>";
  }
  function pctTrend(p, upIsGood) {
    var cls = p === 0 ? "flat" : (p > 0) === upIsGood ? "good" : "bad";
    return '<span class="trend ' + cls + '">' + (p > 0 ? "+" : "") + p + "%</span>";
  }
  function tile(label, big, line, wide) {
    return '<div class="rai-tile' + (wide ? " wide" : "") + '"><div class="lbl">' + label + '</div><div class="big">' + big + "</div>" + (line ? "<p>" + line + "</p>" : "") + "</div>";
  }
  function when(part) { return part && part.pulled ? '<p class="rai-when">' + esc(part.source || "") + ". Checked " + esc(day(part.pulled)) + ".</p>" : ""; }

  var db = window.supabase && cfg.supabaseUrl ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey) : null;
  var asked = (new URLSearchParams(location.search).get("c") || "").trim();
  if (!/^\d{5}$/.test(asked)) asked = "";

  function myCounty() {
    if (asked || !db) return Promise.resolve(asked);
    return db.auth.getSession().then(function (res) {
      var s = res.data && res.data.session;
      if (!s) return "";
      return db.from("members").select("county_fips").eq("id", s.user.id).maybeSingle().then(function (r) { return (r.data && r.data.county_fips) || ""; });
    }).catch(function () { return ""; });
  }

  myCounty().then(function (want) {
    var fips = want || FIRST;
    return getJSON("/data/rai/" + fips + ".json")
      .then(function (d) { return { d: d, missing: "" }; })
      .catch(function () {
        if (fips === FIRST) throw new Error("no data");
        return getJSON("/data/rai/" + FIRST + ".json").then(function (d) { return { d: d, missing: fips }; });
      });
  }).then(function (got) {
    draw(got.d, got.missing);
    live(got.d.fips, (got.d.yearly || {}).people);
  }).catch(function () {
    box.innerHTML = '<p class="note">Rai\'s numbers didn\'t load. Please refresh the page.</p>';
  });

  function draw(d, missing) {
    var Y = d.yearly || {}, W = d.working || {}, LW = Y.livingWage || {}, P = Y.people || {}, B = Y.businesses || {};
    var h = "";
    h += '<div class="page-head"><div class="eyebrow">Rai\'s numbers</div><h1>' + esc(d.place) + " by the numbers.</h1>" +
      "<p>Public numbers Rai, our AI, uses to spot what's getting better and what's getting worse. They update on their own every week.</p></div>";
    if (missing) h += '<p class="note" style="margin-bottom:14px">Your county doesn\'t have its numbers yet. Here are ' + esc(d.place) + "'s, the first county. More counties come as people join.</p>";

    // Dandelions here: live, from the database.
    h += '<h2 class="section-title">Dandelions here</h2><div class="rai-tiles" id="live">' +
      tile("People who pledged", '<span id="lv-pledges">...</span>', '<span id="lv-share"></span>') +
      tile("Businesses verified", '<span id="lv-claimed">...</span>', "Owners who claimed their listing in the directory.") +
      tile("Work two jobs or more", '<span id="lv-two">...</span>', '<span id="lv-two-line">From the private work questions in your profile. Totals only.</span>', true) +
      "</div>";

    // Work and pay.
    var wk = W.working, lf = W.laborForce, un = W.unemployment, jobs = W.jobs, pay = W.hourly;
    if (wk || jobs || pay) {
      h += '<h2 class="section-title">Work and pay</h2><div class="rai-tiles">';
      if (wk) h += tile("People working", fmt(wk.now) + trend(wk.now, wk.yearAgo, true),
        "Residents with a job, " + esc(wk.month) + ", against a year ago." + (lf ? " " + (Math.round(wk.now / lf.now * 1000) / 10) + "% of people who want work have it." : ""));
      if (un) h += tile("Unemployment", un.now + "%" + (un.yearAgo != null ? ' <span class="trend ' + (un.now > un.yearAgo ? "bad" : un.now < un.yearAgo ? "good" : "flat") + '">' + (un.yearAgo === un.now ? "same as" : un.now > un.yearAgo ? "up from " + un.yearAgo + "%" : "down from " + un.yearAgo + "%") + "</span>" : ""),
        "People looking for work who don't have it, " + esc(un.month) + ". A year ago: " + (un.yearAgo != null ? un.yearAgo + "%" : "not known") + ".");
      if (jobs) h += tile("Jobs here", fmt(Math.round(jobs.now * 1000)) + trend(jobs.now, jobs.yearAgo, true),
        "Jobs located in the " + esc(W.jobsArea || "metro area") + ", " + esc(jobs.month) + ", against a year ago.");
      if (pay) h += tile("Average pay", money(pay.now, 2) + "<small> an hour</small>" + trend(pay.now, pay.yearAgo, true),
        (LW.oneAdult ? "Living wage here: " + money(LW.oneAdult, 2) + " for one adult, " + money(LW.oneAdultOneChild, 2) + " for one adult with a child." : "") +
        (LW.minimum ? " Minimum wage is " + money(LW.minimum, 2) + "." : ""));
      h += "</div>" + when(W);
    }

    // Prices.
    var basket = d.basket && d.basket.items || [], cpi = d.prices && d.prices.items || [];
    if (basket.length || cpi.length) {
      h += '<h2 class="section-title">Prices</h2>';
      if (cpi.length) {
        var all = cpi.filter(function (x) { return x.name === "All prices"; })[0];
        h += '<div class="rai-tiles">' + (all ? tile("Prices over a year", pctTrend(all.change, false), "Everything people buy, " + esc(d.prices.region) + ", year to " + esc(all.month) + ".", true) : "") + "</div>";
        h += '<div class="rai-rows" style="margin-top:8px">' + cpi.filter(function (x) { return x !== all; }).map(function (x) {
          return '<div class="rai-row"><span>' + esc(x.name) + "</span>" + pctTrend(x.change, false) + "</div>";
        }).join("") + "</div>" + when(d.prices);
      }
      if (basket.length) {
        h += '<h3 style="margin:18px 0 8px;font-size:17px">What things cost</h3><div class="rai-rows">' + basket.map(function (x) {
          var d2 = x.price < 1 ? 3 : 2;
          return '<div class="rai-row"><span>' + esc(x.name) + '</span><b>' + money(x.price, d2) + "<span class=\"small muted\"> a " + esc(x.unit) + "</span>" + trend(x.price, x.yearAgo, false) + "</b>" +
            '<span class="sub">' + esc(x.area) + ", " + esc(x.month) + (x.yearAgo ? ". A year ago " + money(x.yearAgo, d2) + "." : ".") + "</span></div>";
        }).join("") + "</div>" + when(d.basket);
      }
    }

    // Layoffs reported.
    var L = d.layoffs;
    h += '<h2 class="section-title">Layoffs reported</h2>';
    if (L) {
      h += '<div class="rai-tiles">' +
        tile("Last 30 days", fmt(L.last30.workers) + "<small> workers</small>", L.last30.notices + (L.last30.notices === 1 ? " notice" : " notices")) +
        tile("Last 12 months", fmt(L.last365.workers) + "<small> workers</small>", L.last365.notices + (L.last365.notices === 1 ? " notice" : " notices")) + "</div>";
      if (L.recent && L.recent.length) h += '<div class="rai-rows" style="margin-top:8px">' + L.recent.map(function (x) {
        return '<div class="rai-row"><span>' + esc(x.company) + '</span><b>' + fmt(x.workers) + '</b><span class="sub">Reported ' + esc(day(x.date)) + "</span></div>";
      }).join("") + "</div>";
      h += '<p class="rai-when">' + esc(L.note) + "</p>" + when(L);
    } else {
      h += '<p class="note">Coming with the next weekly update: layoffs of 50 or more that companies must report ahead of time.</p>';
    }

    // Yearly numbers.
    if (P.total || B.withStaff) {
      h += '<h2 class="section-title">Who lives and works here</h2><div class="rai-tiles">' +
        (P.total ? tile("People", fmt(P.total), "Households " + fmt(P.households) + ", " + Math.round(P.renters * 100) + "% rent. " + esc(P.year) + ".") : "") +
        (P.medianRent ? tile("Median rent", money(P.medianRent, 0) + "<small> a month</small>", "Census, " + esc(P.year) + ".") : "") +
        (B.withStaff ? tile("Businesses", fmt(B.withStaff) + "<small> with staff</small>", fmt(B.onePerson) + " more are one person working alone. " + esc(B.year) + ".", true) : "") +
        "</div>";
    }
    if (Y.categories && Y.categories.length) {
      h += '<h2 class="section-title">Local businesses</h2><p class="small muted" style="margin-bottom:8px">Tap one for details. Living wage compares pay per worker with ' + money(LW.yearly, 0) + " a year, a full-time living wage for one adult.</p>" +
        '<input id="q" class="rai-search" type="search" placeholder="Search: dental, restaurants, home care..."><div id="cats" class="stack"></div>';
    }
    if (Y.sources && Y.sources.length) {
      h += '<h2 class="section-title">Sources</h2><div class="card small stack">' +
        Y.sources.map(function (s) { return '<a style="display:block" href="' + esc(s[1]) + '" rel="noopener">' + esc(s[0]) + "</a>"; }).join("") +
        '<a style="display:block" href="https://www.bls.gov/data/" rel="noopener">BLS jobs, pay and prices</a>' +
        '<a style="display:block" href="https://edd.ca.gov/en/jobs_and_training/Layoff_Services_WARN" rel="noopener">California EDD WARN notices</a>' +
        '<p class="muted">Yearly numbers last updated ' + esc(Y.pulled) + ". Want another number here? Say so in Talk.</p></div>";
    }
    box.innerHTML = h;

    if (Y.categories && Y.categories.length) {
      var q = "";
      var row = function (c) {
        var w = c.pay * 1000 >= LW.yearly ? ["Above living wage", "ok"] : c.pay * 1000 >= LW.yearly * 0.85 ? ["Near living wage", ""] : ["Below living wage", "warn"];
        return '<details class="card rai-cat"><summary><div class="spread"><b>' + esc(c.name) + '</b><span class="chip ' + w[1] + '">' + w[0] + "</span></div>" +
          '<div class="small" style="margin-top:4px;display:flex;flex-wrap:wrap;gap:2px 14px"><span>Workers ' + pctTrend(c.workersChange, true) + "</span><span>Pay " + pctTrend(c.payChange, true) + '</span><span class="muted">since 2019</span></div></summary>' +
          '<div class="more">' + (c.note ? '<p class="muted">' + esc(c.note) + "</p>" : "") +
          "<p>" + fmt(c.estab) + " businesses with staff, " + fmt(c.workers) + " workers, $" + Number(c.pay).toFixed(1) + "k pay per worker a year.</p>" +
          (c.licensed ? "<p>" + esc(c.licensed) + "</p>" : "") +
          (Y.priceRise2019to2023 ? '<p class="muted">Prices rose about ' + Y.priceRise2019to2023 + "% over the same years. Pay per worker is from " + esc(B.year) + " and counts part-time jobs, so the label reads a little harsh.</p>" : "") +
          "</div></details>";
      };
      var drawCats = function () {
        var list = Y.categories.filter(function (c) { return !q || (c.name + " " + c.note).toLowerCase().indexOf(q) >= 0; });
        $("cats").innerHTML = list.length ? list.map(row).join("") : '<p class="muted">Nothing matches. Try another word.</p>';
      };
      drawCats();
      $("q").addEventListener("input", function (e) { q = e.target.value.trim().toLowerCase(); drawCats(); });
    }
  }

  // Live totals. Each one fills in on its own, so one slow answer doesn't hold up the rest.
  function live(fips, people) {
    function set(id, html) { var el = $(id); if (el) el.innerHTML = html; }
    var few = '<small>fewer than 10</small>';
    if (!db) { ["lv-pledges", "lv-claimed", "lv-two"].forEach(function (id) { set(id, "-"); }); return; }
    Promise.all([db.rpc("county_counts"), getJSON("/data/counties.json").catch(function () { return {}; })]).then(function (r) {
      var row = (r[0].data || []).filter(function (x) { return x.county_fips === fips; })[0];
      var n = row ? Number(row.pledges) : 0, c = r[1][fips], pop = (c && c[2]) || (people && people.total);
      set("lv-pledges", fmt(n));
      if (pop) {
        var pct = n / pop * 100;
        set("lv-share", (pct < 0.01 && n > 0 ? "Under 0.01" : (Math.round(pct * 100) / 100)) + "% of " + fmt(pop) + " people. Sprout is 1%.");
      }
    }).catch(function () { set("lv-pledges", "-"); });
    db.rpc("claimed_listings", { fips: fips }).then(function (r) {
      set("lv-claimed", r.error ? "-" : fmt((r.data || []).length));
    });
    db.rpc("county_work_totals", { fips: fips }).then(function (r) {
      var t = r.data && r.data[0];
      if (r.error || !t) { set("lv-two", few); set("lv-two-line", "Shows once 10 people here answer the private work questions in their profile. Totals only, never one person's answers."); return; }
      var a = Number(t.answered);
      set("lv-two", Math.round(Number(t.two_or_more_jobs) / a * 100) + "%");
      set("lv-two-line", "Of " + fmt(a) + " people who answered the private work questions. " + Math.round(Number(t.under_25_an_hour) / a * 100) + "% make under $25 an hour.");
    });
  }
})();
