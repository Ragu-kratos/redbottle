"use strict";

// JSON Schema for a `payments` document -- one fee receipt against one
// student. Append-only by convention: a wrong receipt is corrected by
// recording a negative-amount adjustment, never by editing history, which is
// why `amount` allows a negative value while `students.totalFee` does not.
const { PAYMENT_MODES, DATE_PATTERN } = require("../utils/config");

const paymentSchema = {
  id: "/Payment",
  type: "object",
  required: ["studentId", "amount", "mode", "paidOn", "receivedByUid"],
  additionalProperties: false,
  properties: {
    studentId: { type: "string", minLength: 1, maxLength: 128 },
    // batchId is denormalised from the student so a batch-wise collection
    // report is one query instead of "list students, then query payments per
    // student". A student never changes batch mid-course in this model.
    batchId: { type: "string", maxLength: 128 },
    // Whole rupees -- see models/course.js. Negative allowed for corrections.
    amount: { type: "integer", minimum: -100000000, maximum: 100000000 },
    mode: { type: "string", enum: PAYMENT_MODES },
    paidOn: { type: "string", pattern: DATE_PATTERN },
    note: { type: "string", maxLength: 300 },
    receivedByUid: { type: "string", minLength: 1, maxLength: 128 },
  },
};

module.exports = { paymentSchema };
