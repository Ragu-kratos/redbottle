"use strict";

const { onRequest } = require("firebase-functions/https");
const { htmlRoutes } = require("../../libs/utils/http");
const { errorFragment } = require("../../libs/services/renderer");
const { paymentsHtml, feeSummaryHtml, createPaymentHtml } = require("../../libs/features/payment");

// Two GETs because the fees screen has two independent slots for one selected
// student -- the totals panel and the receipt list -- and each swaps on its
// own so recording a receipt does not have to re-render both from one payload.
exports.payments = onRequest(
  htmlRoutes({
    name: "api-payments",
    errorHtml: errorFragment,
    routes: {
      "GET /payments": (params) => paymentsHtml(params),
      "GET /summary": (params) => feeSummaryHtml(params),
      "POST /payments": (params, user) => createPaymentHtml(user, params),
    },
  })
);
