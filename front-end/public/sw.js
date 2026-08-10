// Hand-rolled service worker -- no bundler, no precache manifest (there's no
// way to know the hashed /assets/* filenames at authoring time). Vite serves
// this file verbatim from public/ at both dev and build time, so it always
// registers at scope "/". Only ever registered in production builds (see
// src/bootstrap.js) -- test offline via `vite build && vite preview`, not
// `vite dev`, and via DevTools Network > Offline, not disabling Wi-Fi
// (everything here is loopback).

const VERSION = "v2"; // bump to invalidate every cache below
const SHELL_CACHE = `shell-${VERSION}`;
const ASSET_CACHE = `assets-${VERSION}`;
const API_CACHE = `api-${VERSION}`;
const KEEP = new Set([SHELL_CACHE, ASSET_CACHE, API_CACHE]);

// public/ is copied verbatim -- no env-var substitution happens here -- so
// the functions origin is passed as a query param on the registration URL
// (see src/bootstrap.js) instead of hardcoded.
const FN_ORIGIN = new URL(self.location.href).searchParams.get("fn") ?? "http://127.0.0.1:5001";

// This is a multi-page app: each route is a distinct document and must be
// cached under its own key, not a single shared shell URL, or an offline
// reload of /home would serve /login's cached document instead.
const PRECACHE_ROUTES = [
  "/",
  "/login",
  "/home",
  "/courses",
  "/trainers",
  "/batches",
  "/students",
  "/attendance",
  "/fees",
];
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll([...PRECACHE_ROUTES, OFFLINE_URL]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => !KEEP.has(n)).map((n) => caches.delete(n)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Never intercept the Auth emulator. Firebase Auth keeps a signed-in user
  // offline specifically by catching auth/network-request-failed from a
  // *real* failed network call -- swallowing that here would make users
  // appear signed out instead.
  if (url.port === "9099" || url.hostname.endsWith("identitytoolkit.googleapis.com")) {
    return;
  }

  // Non-GET (mutations): never cache. Offline -> a synthetic fragment htmx
  // can swap in, rather than a raw network error.
  if (req.method !== "GET") {
    event.respondWith(fetch(req).catch(() => htmlError(503, "Offline — change not saved.")));
    return;
  }

  // Navigations, including htmx-boosted ones: network-first (always pick up a
  // new build when online), fall back to that route's cached document when
  // offline, then to a generic offline page for a route never visited before.
  //
  // The isDocument test matters as much as req.mode here. A boosted screen
  // change is a same-origin fetch for an HTML document, not a
  // mode === "navigate" request, so without it a boosted navigation would fall
  // through to the stale-while-revalidate branch below and could serve a screen
  // from an older build than the shell it is being swapped into.
  if (req.mode === "navigate" || isDocument(req, url)) {
    const routeKey = url.pathname;
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          (await caches.open(SHELL_CACHE)).put(routeKey, res.clone());
          return res;
        } catch {
          const cached = await caches.match(routeKey, { cacheName: SHELL_CACHE });
          if (cached) return cached;
          const offline = await caches.match(OFFLINE_URL, { cacheName: SHELL_CACHE });
          return offline ?? htmlError(503, "Offline and no cached shell.");
        }
      })()
    );
    return;
  }

  // Same-origin hashed build output: cache-first. Content-addressed and
  // immutable, and can only be runtime-cached (no precache manifest here).
  if (url.origin === self.location.origin && url.pathname.startsWith("/assets/")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(ASSET_CACHE);
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })()
    );
    return;
  }

  // Other same-origin statics (favicon, manifest, ...): stale-while-revalidate.
  if (url.origin === self.location.origin) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(ASSET_CACHE);
        const hit = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => null);
        return hit ?? (await network) ?? htmlError(503, "Offline.");
      })()
    );
    return;
  }

  // Cross-origin function GETs (rendered fragments): network first, cache
  // fallback when offline.
  if (url.origin === FN_ORIGIN) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(API_CACHE);
        try {
          const res = await fetch(req);
          // Only cache successful, CORS-readable 200s -- never 401/403,
          // which would otherwise pin the UI into a signed-out-looking
          // state after reconnecting.
          if (res.ok && res.type === "cors") {
            cache.put(stripAuthHeader(req), res.clone());
          }
          return res;
        } catch {
          const hit = await cache.match(stripAuthHeader(req));
          return hit ? await withStaleBanner(hit) : htmlError(503, "Offline — no cached data.");
        }
      })()
    );
    return;
  }

  // Anything else: pass through untouched.
});

// A request for an HTML document: either a real navigation or htmx swapping one
// screen's #page into another. Boosted requests also carry HX-Request, but the
// Accept header is the more general signal and is set on both.
function isDocument(req, url) {
  if (url.origin !== self.location.origin) return false;
  const accept = req.headers.get("accept") || "";
  return accept.includes("text/html");
}

// The cache key must not vary with the rotating Bearer token, and the Cache
// API must never persist a request carrying a credential.
function stripAuthHeader(req) {
  return new Request(req.url, { method: "GET" });
}

function htmlError(status, message) {
  return new Response(`<div data-offline>${escapeHtml(message)}</div>`, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

async function withStaleBanner(res) {
  const body = await res.text();
  return new Response(`<div data-stale>Showing cached data.</div>${body}`, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}
