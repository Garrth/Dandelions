// Deals of the day: three special offers a day from businesses, shown on the home pages.
// Deals.show(element, db, fips) draws them. fips is the visitor's county, or null to show only deals for everyone.
window.Deals = (function () {
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function bizLink(d) {
    return d.listing_id ? "/directory/biz.html?f=" + encodeURIComponent(d.family || "") + "&id=" + encodeURIComponent(d.listing_id) : "";
  }
  function card(d) {
    var href = d.link || bizLink(d);
    var price = d.price_now ? '<p class="dl-price">' + (d.price_was ? "<s>" + esc(d.price_was) + "</s> " : "") + "<b>" + esc(d.price_now) + "</b></p>" : "";
    return '<li class="dl-card' + (d.kind === "offer" ? " offer" : "") + '">' +
      '<p class="dl-from">' + esc(d.name) + (d.town ? " · " + esc(d.town) : d.area === "all" ? " · online" : "") + "</p>" +
      '<h3 class="dl-title">' + esc(d.title) + "</h3>" + price +
      (d.details ? '<p class="dl-details">' + esc(d.details) + "</p>" : "") +
      (href ? '<a class="dl-go" href="' + esc(href) + '"' + (d.link ? ' target="_blank" rel="noopener"' : "") + ">" + (d.link ? "Get the deal" : "See the business") + "</a>" : "") +
      "</li>";
  }
  function empty() {
    return '<li class="dl-card empty"><h3 class="dl-title">Today\'s deals are on the way.</h3>' +
      '<p class="dl-details">Run a business? Your deal can go here. Booking a day is free while we get started.</p>' +
      '<a class="dl-go" href="/business.html">How it works</a></li>';
  }
  function show(el, db, fips, foot) {
    return db.rpc("deals_today", { p_fips: fips || null }).then(function (r) {
      if (r.error) throw r.error;
      var deals = (r.data && r.data.deals) || [];
      el.innerHTML = '<ul class="dl-list">' + (deals.length ? deals.map(card).join("") : empty()) + "</ul>" + (foot || "");
      return deals;
    }).catch(function () {
      el.innerHTML = '<p class="dl-note">Couldn\'t load today\'s deals. Try refreshing.</p>';
      return [];
    });
  }
  return { show: show, esc: esc };
})();
