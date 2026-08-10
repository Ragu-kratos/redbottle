import htmx from "htmx.org";
import { ready, currentUser, onAuthChange } from "./auth.js";

// FN_BASE is the one place the functions-emulator origin is spelled out --
// FN_ORIGIN is derived from it rather than repeated as a second env var.
const FN_BASE = import.meta.env.VITE_FN_BASE; // .../redbottle-institute/asia-south1
export const FN_ORIGIN = new URL(FN_BASE).origin;

// Functions deploy as groups (functions/endpoints/index.js), so the function
// name -- not just the route -- is part of each URL below.
//
// These are for JS-stamped, user-triggered elements only (a Refresh button:
// `data-api="students"` + stampEndpoints()). An element whose hx-trigger
// includes `load` must spell its URL out statically in the screen HTML with
// %VITE_FN_BASE%, because htmx fires the one-shot `load` trigger during its own
// auto-init, before any auth-gated stampEndpoints() call in an entry script
// runs -- a JS-only URL is always still missing at that moment.
export const endpoints = {
  dashboard: () => `${FN_BASE}/api-dashboard/dashboard`,
  courses: () => `${FN_BASE}/api-courses/courses`,
  trainers: () => `${FN_BASE}/api-trainers/trainers`,
  batches: () => `${FN_BASE}/api-batches/batches`,
  students: () => `${FN_BASE}/api-students/students`,
  attendanceRoster: () => `${FN_BASE}/api-attendance/roster`,
  payments: () => `${FN_BASE}/api-payments/payments`,
  feeSummary: () => `${FN_BASE}/api-payments/summary`,

  // Dropdown contents (functions/endpoints/default/options.js). Swapped into a
  // static <select> with hx-target="this".
  courseOptions: () => `${FN_BASE}/api-options/courses`,
  trainerOptions: () => `${FN_BASE}/api-options/trainers`,
  batchOptions: () => `${FN_BASE}/api-options/batches`,
  studentOptions: () => `${FN_BASE}/api-options/students`,
  courseCategoryOptions: () => `${FN_BASE}/api-options/courseCategories`,
  batchStatusOptions: () => `${FN_BASE}/api-options/batchStatuses`,
  studentStatusOptions: () => `${FN_BASE}/api-options/studentStatuses`,
  paymentModeOptions: () => `${FN_BASE}/api-options/paymentModes`,
};

// Server fragments own these ids (functions/libs/services/renderer.js) -- the
// swap-target contract is named here rather than re-typed in every screen.
//
// A screen's hx-target points at its own static slot (e.g. "#students-slot"),
// never at one of these: the id below belongs to the element *inside* that
// slot, which the swap replaces wholesale. These entries exist so a change to
// a renderer id has one place on the client to be reconciled with. The
// <option> fragments are absent on purpose -- they own no id.
export const targets = {
  dashboardStats: "#dashboard-stats",
  courseList: "#course-list",
  trainerList: "#trainer-list",
  batchList: "#batch-list",
  studentList: "#student-list",
  attendanceRoster: "#attendance-roster",
  paymentList: "#payment-list",
  feeSummary: "#fee-summary",
};

let cachedToken = null;
let lastUid = null;

function isFunctionRequest(path) {
  try {
    return new URL(path, location.href).origin === FN_ORIGIN;
  } catch {
    return false;
  }
}

// Reads [data-api="..."] markup in `root` and stamps the matching endpoint
// URL onto hx-get, so screens/*.html never hardcode the functions origin --
// api.js stays the single source of truth for it.
export function stampEndpoints(root = document) {
  root.querySelectorAll("[data-api]").forEach((el) => {
    const name = el.getAttribute("data-api");
    const url = endpoints[name]?.();
    if (url) el.setAttribute("hx-get", url);
  });
}

export function refresh() {
  htmx.trigger(document.body, "refresh");
}

// Wires the three htmx event hooks that authenticate function requests.
// Call once from bootstrap.js, before any htmx request can fire.
export function installHtmxAuth() {
  // htmx 2 defaults selfRequestsOnly to true (disabled globally in
  // bootstrap.js) -- re-narrow it here to only the functions emulator origin
  // so we don't accidentally open the app up to arbitrary cross-origin
  // requests.
  document.body.addEventListener("htmx:validateUrl", (evt) => {
    const { sameHost, url } = evt.detail;
    if (!sameHost && url.origin !== FN_ORIGIN) {
      evt.preventDefault();
    }
  });

  // The real fix for "getIdToken() is async but htmx:configRequest is sync":
  // htmx:confirm is cancelable and fires *before* the request lock is taken,
  // and evt.detail.issueRequest(true) re-enters the request once we're
  // ready. A module-level token cache refreshed only by an auth-state
  // listener is NOT enough on its own -- in an Auth-only app (no other
  // Firebase SDK registered), the SDK's proactive hourly refresh never
  // starts, so that cache would silently go stale after an hour. Resolving
  // the token here, on every request, sidesteps that entirely.
  document.body.addEventListener("htmx:confirm", (evt) => {
    const { path, elt, issueRequest } = evt.detail;
    if (!isFunctionRequest(path)) return; // let non-API requests through untouched

    evt.preventDefault();

    (async () => {
      // Guards against hx-trigger="load" firing before Auth has finished
      // reading its persisted state.
      await ready();
      const user = currentUser();
      if (!user) {
        location.replace("/login");
        return;
      }
      try {
        cachedToken = await user.getIdToken();
        issueRequest(true); // skips htmx:confirm on re-entry
      } catch (err) {
        cachedToken = null;
        elt.dispatchEvent(
          new CustomEvent("app:auth-error", { detail: { code: err.code }, bubbles: true })
        );
      }
    })();
  });

  // Purely synchronous: stamp the header on a token we already resolved above.
  document.body.addEventListener("htmx:configRequest", (evt) => {
    if (cachedToken && isFunctionRequest(evt.detail.path)) {
      evt.detail.headers["Authorization"] = `Bearer ${cachedToken}`;
    }
  });

  // Drop any previously-cached fragment when the signed-in user changes, so a
  // shared front-office machine never shows one member of staff's cached data
  // to the next.
  onAuthChange((user) => {
    const uid = user ? user.uid : null;
    if (uid !== lastUid && "caches" in window) {
      lastUid = uid;
      caches.keys().then((names) => {
        names.filter((n) => n.startsWith("api-")).forEach((n) => caches.delete(n));
      });
    }
  });
}
