"use strict";

// Request-shaped auth helper: pulls the bearer token out of an Express req
// and hands it to services/auth.js to verify. Kept separate from
// services/auth.js so the Admin SDK wrapper has no knowledge of HTTP.
const { httpError } = require("./errors");
const { verifyIdToken } = require("../services/auth");

async function requireUser(req) {
  const header = req.get("authorization") || "";
  const match = /^Bearer (.+)$/.exec(header);
  if (!match) {
    throw httpError(401, "Not signed in.");
  }
  return verifyIdToken(match[1]);
}

module.exports = { requireUser };
