// Signed-in members go to their dashboard. "/?intro" (the About Dandelions link) always shows this page.
try {
  if (!/[?&]intro\b/.test(location.search) && !location.hash) {
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (/^sb-.*-auth-token$/.test(k) && localStorage.getItem(k)) { location.replace("/app/"); break; }
    }
  }
} catch (e) {}
