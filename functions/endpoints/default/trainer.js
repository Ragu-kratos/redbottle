"use strict";

const { onRequest } = require("firebase-functions/https");
const { htmlRoutes } = require("../../libs/utils/http");
const { errorFragment } = require("../../libs/services/renderer");
const { trainersHtml, createTrainerHtml } = require("../../libs/features/trainer");

// No setGlobalOptions here -- endpoints/default/course.js owns that call for
// the whole group and is required first (see default/index.js).
exports.trainers = onRequest(
  htmlRoutes({
    name: "api-trainers",
    errorHtml: errorFragment,
    routes: {
      "GET /trainers": () => trainersHtml(),
      "POST /trainers": (params, user) => createTrainerHtml(user, params),
    },
  })
);
