// 북포항라이온스클럽 수첩 PWA Service Worker (stable cache + reliable updates)
// 운영 규칙: 배포할 때 CACHE_NAME만 +1

const CACHE_NAME = "bplions-v57";

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
  "./icons/icon-512.png",
];

// install: 프리캐시(실패 무시) + 즉시 활성화
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(
      ASSETS.map((u) => cache.add(new Request(u, { cache: "reload" })))
    );
  })());
});

// activate: 이전 캐시 삭제 + 즉시 컨트롤
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)));
    await self.clients.claim();
  })());
});

// fetch: 정적 자원은 stale-while-revalidate (캐시 즉시 응답 + 뒤에서 갱신)
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // 동적(외부) 요청은 캐시 금지
  if (
    url.origin.includes("script.google.com") ||
    url.origin.includes("googleusercontent.com")
  ) {
    event.respondWith(fetch(req));
    return;
  }

  // 페이지 이동은 network-first (오프라인 대비 index.html 캐시)
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req, { cache: "no-store" })
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // 정적 파일: stale-while-revalidate
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req);
    const fetchPromise = fetch(req, { cache: "no-store" })
      .then((res) => {
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      })
      .catch(() => null);

    // 캐시가 있으면 즉시 반환, 없으면 네트워크
    return cached || (await fetchPromise) || fetch(req);
  })());
});

// 앱에서 "업데이트" 눌렀을 때 즉시 대기중 SW 활성화
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
