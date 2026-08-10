"use strict";

/**
 * Dev-data seeding endpoint. As a Cloud Function it goes through the exact
 * same services/database.js (and therefore models/) validation path as the
 * real API, instead of writing straight to Firestore with the Admin SDK from
 * a standalone script.
 *
 * Wired up via endpoints/index.js, which deploys this as `testBed-seed`
 * alongside endpoints/default's `api-students` and friends -- all in the
 * single "default" codebase, sharing one functions/package.json /
 * node_modules rather than each codebase needing its own dependency list.
 *
 * The one endpoint in this app that answers JSON rather than an HTML
 * fragment: nothing swaps its response into a page, it is called with curl
 * (`npm run seed`).
 */

const { onRequest } = require("firebase-functions/https");
const logger = require("firebase-functions/logger");

const { seedDevData } = require("../../libs/features/seed");

exports.seed = onRequest(async (req, res) => {
  try {
    const summary = await seedDevData();
    logger.info("seedDevData complete", summary);
    res.status(200).json(summary);
  } catch (err) {
    logger.error("seedDevData failed", err);
    res.status(500).json({ error: "Seeding failed -- see function logs." });
  }
});
