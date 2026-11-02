const CACHE = 'sop-v34';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192-v2.png',
  './icon-512-v2.png',
  './icon-maskable-512-v2.png',
  './data/restore.json'
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
  const isNav = event.request.mode === 'navigate' ||
                url.pathname.endsWith('index.html') ||
                url.pathname === '/' || url.pathname.endsWith('/');
  if (isNav) {
    // 缓存优先：首屏秒开；后台静默拉新版，下次打开即为最新
    const network = fetch(event.request).then(resp => {
      if (resp && resp.ok) {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put('./index.html', copy));
      }
      return resp;
    }).catch(() => null);
    event.waitUntil(network);
    event.respondWith(
      caches.match('./index.html').then(cached => {
        if (cached) return cached;
        return network.then(r => r || new Response('离线且无缓存', {status: 503, headers: {'Content-Type': 'text/plain; charset=utf-8'}}));
      })
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
