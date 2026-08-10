// No `import "./styles/index.css"` here on purpose. The stylesheet is linked
// from each screen's <head> instead (`<link rel="stylesheet"
// href="/src/styles/index.css">`), which makes it render-blocking.
//
// Imported from JS, the CSS only arrived after Vite had resolved this module
// graph -- so in `vite dev` the first paint had zero stylesheets: raw unstyled
// markup, briefly visible, because even the `[data-auth-pending] > *
// { visibility: hidden }` gate is part of that CSS and had not landed yet. The
// production build was fine (Vite injects a <link> at build time), so this was
// a dev-only flash, which is exactly where it gets seen most.
//
// Vite processes the linked path in dev and rewrites it to the hashed asset in
// the build, so there is still exactly one stylesheet in either mode.
import htmx from "htmx.org";
import { installHtmxAuth, refresh, FN_ORIGIN } from "./services/api.js";
import { installNavigationHooks } from "./screen.js";
import { trackOnline } from "./utils/online.js";

// htmx 2 defaults selfRequestsOnly to true, which silently drops every
// hx-get/hx-post to the cross-origin functions emulator (no network entry,
// only an htmx:invalidPath event). services/api.js's installHtmxAuth()
// re-adds a narrow allowlist via htmx:validateUrl, so this must run before
// any htmx request fires.
htmx.config.selfRequestsOnly = false;

// htmx 2's default responseHandling has `swap: false` for every 4xx and 5xx,
// which would make the server's error fragments unreachable: a rejected
// enrolment ("Batch MERN-A is full") comes back as a 400 carrying the HTML
// explaining why, and by default htmx throws it away and leaves the screen
// looking like nothing happened.
//
// Every non-2xx body this backend produces is a deliberate, escaped fragment
// from renderer.errorFragment (see functions/libs/utils/http.js -- internal
// detail never reaches the client), so swapping it in is safe. `error: true`
// is kept so htmx:responseError still fires for anything listening.
htmx.config.responseHandling = [
  { code: "204", swap: false },
  { code: "[23]..", swap: true },
  { code: "[45]..", swap: true, error: true },
];

window.htmx = htmx; // handy for console debugging

installHtmxAuth();
installNavigationHooks();
trackOnline(refresh);

// Offline behavior depends on a hashed, versioned build -- vite dev serves
// unbundled, unhashed modules that churn on every dep re-optimization, so a
// runtime cache keyed on dev URLs is useless. Only register in production
// builds; verify offline via `vite build && vite preview`. The `fn` query
// param lets sw.js (served verbatim from public/, with no env substitution
// at build time) learn the functions-emulator origin at registration time.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`/sw.js?fn=${encodeURIComponent(FN_ORIGIN)}`)
      .catch((err) => {
        console.error("Service worker registration failed", err);
      });
  });
}
