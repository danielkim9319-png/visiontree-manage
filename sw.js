// 화면 파일만 저장해 두는 서비스워커. 출석 데이터(구글 시트 요청)는 절대 저장하지 않고 항상 새로 불러옵니다.
const CACHE = 'visiontree-v2';
const SHELL = ['./', './index.html', './manifest.webmanifest', './visiontree-logo.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => /^visiontree-v\d+$/.test(k) && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return; // 시트 API 등 외부 요청은 건드리지 않음
  if (/\.png$/.test(new URL(req.url).pathname)) {   // 이미지는 저장본 우선(빠름) + 뒤에서 갱신
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return res; });
      return hit || net;
    }));
    return;
  }
  // 화면은 항상 최신본을 먼저 시도하고, 인터넷이 없을 때만 저장본을 보여줌
  e.respondWith(
    fetch(req, { cache: 'no-store' }).then(res => {
      if (res.ok) {
        const copy = res.clone();
        e.waitUntil(caches.open(CACHE).then(c => c.put(req, copy)));
      }
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
  );
});
