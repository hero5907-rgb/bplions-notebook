// 북포항라이온스클럽 수첩 PWA Service Worker
// ✅ 캐시 갱신이 필요할 때는 CACHE_NAME만 올리면 됩니다 (v49 -> v50 ...)

const CACHE_NAME = "bplions-v50";

const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js?v=3",
  "./config.js?v=3",
  "./manifest.webmanifest",
  "./login_bg.png?v=2",
  "./logo.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

// ✅ install: 정적 파일 프리캐시 + 즉시 활성화 준비
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// ✅ activate: 이전 캐시 삭제 + 즉시 컨트롤권 가져오기
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)));
      await self.clients.claim();
    })()
  );
});

// ✅ fetch
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // ✅ GAS API / googleusercontent 같은 동적 요청은 캐시 금지
  if (
    url.origin.includes("script.google.com") ||
    url.origin.includes("googleusercontent.com")
  ) {
    event.respondWith(fetch(req));
    return;
  }

  // ✅ 페이지 이동은 network-first (온라인이면 최신 우선)
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // ✅ 정적 파일은 cache-first (없으면 네트워크)
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});

// ✅ 앱에서 "업데이트" 눌렀을 때 즉시 대기중 SW 활성화
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
