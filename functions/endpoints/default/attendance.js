"use strict";

const { onRequest } = require("firebase-functions/https");
const { htmlRoutes } = require("../../libs/utils/http");
const { errorFragment } = require("../../libs/services/renderer");
const { rosterHtml, saveRosterHtml } = require("../../libs/features/attendance");

// GET and POST share the path: both answer with the same register fragment, so
// the screen swaps the response into the same slot whether it just loaded the
// day or just saved it.
exports.attendance = onRequest(
  htmlRoutes({
    name: "api-attendance",
    errorHtml: errorFragment,
    routes: {
      "GET /roster": (params) => rosterHtml(params),
      "POST /roster": (params, user) => saveRosterHtml(user, params),
    },
  })
);
