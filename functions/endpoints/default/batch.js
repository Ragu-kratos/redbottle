"use strict";

const { onRequest } = require("firebase-functions/https");
const { htmlRoutes } = require("../../libs/utils/http");
const { errorFragment } = require("../../libs/services/renderer");
const { batchesHtml, createBatchHtml } = require("../../libs/features/batch");

exports.batches = onRequest(
  htmlRoutes({
    name: "api-batches",
    errorHtml: errorFragment,
    routes: {
      "GET /batches": () => batchesHtml(),
      "POST /batches": (params, user) => createBatchHtml(user, params),
    },
  })
);
