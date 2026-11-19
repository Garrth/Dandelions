// The Dandelions phone app's helper. It does one thing: if you open a page with no signal, it shows a
// "you're offline" page instead of the browser's error. It saves nothing else, so pages are always fresh.
var CACHE = "dandelions-offline-v1";
var OFFLINE = "/offline.html";
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll([OFFLINE, "/favicon.svg"]); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  if (e.request.mode !== "navigate") return;
  e.respondWith(fetch(e.request).catch(function () { return caches.match(OFFLINE); }));
});
