const CACHE = 'sop-v10';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192-v2.png',
  './icon-512-v2.png',
  './icon-maskable-512-v2.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  // 页面文档（index.html / 根路径）走网络优先：保证 GitHub Pages 更新后及时生效
  const isNav = event.request.mode === 'navigate' ||
                url.pathname.endsWith('index.html') ||
                url.pathname === '/' || url.pathname.endsWith('/');
  if (isNav) {
    event.respondWith(
      fetch(event.request).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(event.request, copy));
        return resp;
      }).catch(() => caches.match(event.request).then(c => c || caches.match('./index.html')))
    );
    return;
  }
  // 其余静态资源走缓存优先
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(event.request, copy));
        return resp;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
