"use strict";

// firebase-admin init, and only this. Guarded by getApps().length because
// multiple endpoint groups can end up loaded in the same process under the
// emulator; a second bare initializeApp() call throws.
//
// No explicit projectId: in the deployed runtime and under the Functions
// emulator alike, GCLOUD_PROJECT is already set in the ambient environment.
const { initializeApp, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

if (!getApps().length) {
  initializeApp();
}

// Fetched fresh on every call rather than cached at module scope --
// getFirestore()/getAuth() are cheap handles onto the already-initialized
// app, not new connections.
function getDb() {
  return getFirestore();
}

function getAdminAuth() {
  return getAuth();
}

module.exports = { getDb, getAdminAuth };
