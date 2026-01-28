// 북포항라이온스클럽 수첩 PWA Service Worker
// ✅ 배포할 때는 아래 CACHE_NAME 숫자만 올리면 됩니다 (예: v49 → v50)
const CACHE_NAME = "bplions-v52";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./config.js",
  "./manifest.webmanifest",
  "./login_bg.png",
  "./logo.png",
  "./lions_song.jpg",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting(); // 새 SW를 waiting으로 두지 않고 바로 준비
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // ✅ GAS API / googleusercontent 같은 동적 요청은 캐시 금지
  if (url.origin.includes("script.google.com") || url.origin.includes("googleusercontent.com")) {
    event.respondWith(fetch(req));
    return;
  }

  // ✅ HTML 탐색은 network-first (온라인이면 최신 우선)
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
          return res;
        })
        .catch(() => caches.match("./index.html").then((c) => c || caches.match("./")))
    );
    return;
  }

  // ✅ 나머지 정적 파일은 cache-first
  event.respondWith(caches.match(req).then((cached) => cached || fetch(req)));
});

// ✅ 앱에서 "업데이트 적용" 눌렀을 때: waiting SW를 즉시 활성화
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
