self.addEventListener("install", (e) => self.skipWaiting());
self.addEventListener("activate", (e) => self.clients.claim());


// 북포항라이온스클럽 수첩 PWA Service Worker
// ✅ 캐시 갱신이 필요할 때는 CACHE_NAME만 올리면 됩니다 (v5 -> v6 ...)

const CACHE_NAME = "bplions-v47";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./login_bg.png",
  "./logo.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // ✅ GAS API / googleusercontent 같은 "동적" 요청은 캐시 금지 (로그인 오류/캐시 꼬임 방지)
  if (url.origin.includes("script.google.com") || url.origin.includes("googleusercontent.com")) {
    event.respondWith(fetch(req));
    return;
  }

  // ✅ "페이지 이동(=index.html)" 은 network-first (온라인이면 새 버전 우선)
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // 최신 index를 캐시에 넣어둠(다음 오프라인 대비)
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match("./index.html")))
    );
    return;
  }

  // ✅ 나머지 정적파일은 cache-first
  event.respondWith(caches.match(req).then((cached) => cached || fetch(req)));


// ✅ 앱에서 "업데이트 적용" 눌렀을 때 즉시 대기중 SW를 활성화
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

