"use strict";

// Hand-rolled instead of onRequest's `cors` option: that option only ever
// passes `{ origin }` to the `cors` package, so it never sets
// Access-Control-Expose-Headers. Cross-origin, that leaves every HX-*
// *response* header (HX-Trigger, HX-Retarget, HX-Redirect, ...) unreadable
// by htmx via xhr.getResponseHeader -- they'd just come back null. This
// version also adds Access-Control-Max-Age so htmx doesn't re-preflight
// every request.
//
// Do NOT try to verify the allowlist below against the emulator -- it will look
// broken. The functions emulator sets FIREBASE_DEBUG_MODE=true and
// FIREBASE_DEBUG_FEATURES={"enableCors":true}, which makes firebase-functions
// wrap every onRequest in the `cors` package with origin reflection *before*
// this file runs. Locally, therefore:
//   - any Origin gets an Access-Control-Allow-Origin, including one absent
//     from ALLOWED_ORIGINS, and
//   - OPTIONS preflights are answered by that wrapper (with its own
//     Allow-Methods list), so applyCors's preflight branch never runs.
// Neither happens in the deployed runtime, where no `cors` key is passed and
// this file is the only CORS layer. Verify the allowlist against a deploy, or
// by reading it -- not with curl against the emulator.

const ALLOWED_ORIGINS = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);

const REQUEST_HEADERS = [
  "Authorization",
  "Content-Type",
  "HX-Request",
  "HX-Trigger",
  "HX-Trigger-Name",
  "HX-Target",
  "HX-Current-URL",
  "HX-Prompt",
].join(", ");

const RESPONSE_HEADERS = [
  "HX-Push-Url",
  "HX-Replace-Url",
  "HX-Location",
  "HX-Refresh",
  "HX-Redirect",
  "HX-Retarget",
  "HX-Reswap",
  "HX-Reselect",
  "HX-Trigger",
].join(", ");

/**
 * Applies CORS headers for allowed origins and fully answers OPTIONS
 * preflights. Returns true if the request was a preflight and the caller
 * should stop (do not run the handler body).
 */
function applyCors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
    res.set("Access-Control-Expose-Headers", RESPONSE_HEADERS);
  }

  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", REQUEST_HEADERS);
    res.set("Access-Control-Max-Age", "3600");
    res.status(204).send("");
    return true;
  }

  return false;
}

module.exports = { applyCors };
