/* Service worker: aplikasi donatur tetap terbuka saat sinyal lemah. API & dashboard selalu dari jaringan. */
const VERSI = "wiz-v3";
const SHELL = ["/", "/assets/app.css", "/assets/app.js", "/assets/logo.png", "/assets/icon.png", "/manifest.webmanifest"];
self.addEventListener("install", (e) => e.waitUntil(caches.open(VERSI).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener("activate", (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSI).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin || u.pathname.startsWith("/api/")) return;
  // Halaman petugas juga disimpan agar tetap terbuka tanpa sinyal (data dikirim belakangan)
  const fallback = u.pathname.startsWith("/admin") ? "/admin" : "/";
  e.respondWith(fetch(e.request).then((r) => { if (r.ok) { const c = r.clone(); caches.open(VERSI).then((ca) => ca.put(e.request, c)); } return r; })
    .catch(() => caches.match(e.request).then((r) => r || caches.match(fallback))));
});
