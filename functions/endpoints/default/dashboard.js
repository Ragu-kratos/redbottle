"use strict";

const { onRequest } = require("firebase-functions/https");
const { htmlRoutes } = require("../../libs/utils/http");
const { errorFragment } = require("../../libs/services/renderer");
const { dashboardHtml } = require("../../libs/features/dashboard");

exports.dashboard = onRequest(
  htmlRoutes({
    name: "api-dashboard",
    errorHtml: errorFragment,
    routes: {
      "GET /dashboard": () => dashboardHtml(),
    },
  })
);
