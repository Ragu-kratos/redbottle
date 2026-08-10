"use strict";

// The only file that touches the Admin Auth SDK directly -- mirrors
// services/database.js being the only file that touches Firestore.
const logger = require("firebase-functions/logger");
const { getAdminAuth } = require("../utils/firebase");
const { httpError } = require("../utils/errors");

// Under the emulator, verifyIdToken always performs a revocation check
// against the Auth emulator -- run the full emulator suite (auth + functions
// + firestore), not `--only functions`, or every call 500s.
async function verifyIdToken(token) {
  try {
    return await getAdminAuth().verifyIdToken(token);
  } catch (err) {
    logger.warn("verifyIdToken failed", { code: err.code });
    throw httpError(401, "Session expired -- please sign in again.", err);
  }
}

// Get-by-email-else-create, used by the dev seeder so re-running it is
// idempotent instead of erroring on a duplicate email.
async function ensureUser({ email, password }) {
  try {
    const user = await getAdminAuth().getUserByEmail(email);
    return { user, created: false };
  } catch {
    const user = await getAdminAuth().createUser({
      email,
      password,
      emailVerified: true,
    });
    return { user, created: true };
  }
}

module.exports = { verifyIdToken, ensureUser };
