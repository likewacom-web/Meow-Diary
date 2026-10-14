// Meow Diary service worker: caches the app shell and the Firebase SDK so the
// app opens and works offline. Note data is kept offline by Firestore itself.
const CACHE = 'meow-diary-v6';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './icons/icon.svg'];
const FIREBASE = 'https://www.gstatic.com/firebasejs/11.0.2/';
const FIREBASE_MODULES = ['firebase-app.js', 'firebase-auth.js', 'firebase-firestore.js', 'firebase-storage.js'].map(f => FIREBASE + f);

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(async c => {
    await c.addAll(SHELL);
    // Best effort: the SDK is also cached on first use below.
    await Promise.all(FIREBASE_MODULES.map(u => c.add(u).catch(() => {})));
  }).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function cacheCopy(req, res) {
  if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
  return res;
}

// Network first, but give up after a few seconds on a flaky connection.
function networkFirst(req) {
  const network = fetch(req).then(res => cacheCopy(req, res));
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000));
  return Promise.race([network, timeout]).catch(() =>
    caches.match(req, { ignoreSearch: req.mode === 'navigate' })
      .then(r => r || (req.mode === 'navigate' ? caches.match('./index.html') : null))
      .then(r => r || network));
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = req.url;
  // Versioned Firebase SDK files never change: cache first.
  if (url.startsWith(FIREBASE)) {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => cacheCopy(req, res))));
    return;
  }
  if (new URL(url).origin !== self.location.origin) return;
  // Don't cache the APK download page or file.
  if (new URL(url).pathname.includes('/download/')) return;
  e.respondWith(networkFirst(req));
});
