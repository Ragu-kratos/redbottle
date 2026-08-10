"use strict";

const { onRequest } = require("firebase-functions/https");
const { htmlRoutes } = require("../../libs/utils/http");
const { errorFragment } = require("../../libs/services/renderer");
const options = require("../../libs/features/options");

/**
 * Serves the <option> lists that fill every dropdown in the app -- see
 * libs/features/options.js for why they live in one feature rather than one
 * per collection.
 *
 * Every response is a bare <option> list, swapped into a static <select> in
 * the screen markup with hx-target="this", so no fragment here owns an id and
 * none appears in front-end/src/services/api.js's `targets` map.
 */
exports.options = onRequest(
  htmlRoutes({
    name: "api-options",
    errorHtml: errorFragment,
    routes: {
      "GET /courses": () => options.courseOptionsHtml(),
      "GET /trainers": () => options.trainerOptionsHtml(),
      "GET /batches": () => options.batchOptionsHtml(),
      "GET /students": () => options.studentOptionsHtml(),
      "GET /courseCategories": () => options.courseCategoryOptionsHtml(),
      "GET /batchStatuses": () => options.batchStatusOptionsHtml(),
      "GET /studentStatuses": () => options.studentStatusOptionsHtml(),
      "GET /paymentModes": () => options.paymentModeOptionsHtml(),
    },
  })
);
