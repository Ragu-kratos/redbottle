"use strict";

// JSON Schema for a `students` document -- one enrolment. `totalFee` is
// copied onto the student at enrolment rather than read from the course at
// display time, because a course's list price changes over time and an
// already-enrolled student's agreed fee must not move with it.
//
// Amount *paid* is deliberately not stored here: it is derived by summing the
// student's `payments` documents (see features/payment.js). A denormalised
// running total would need a transaction on every receipt and would silently
// disagree with the receipts the moment one is corrected.
const { STUDENT_STATUSES, DATE_PATTERN } = require("../utils/config");

const studentSchema = {
  id: "/Student",
  type: "object",
  required: ["name", "phone", "courseId", "batchId", "enrolledOn", "totalFee", "status", "createdByUid"],
  additionalProperties: false,
  properties: {
    name: { type: "string", minLength: 1, maxLength: 120 },
    phone: { type: "string", minLength: 4, maxLength: 24 },
    email: { type: "string", maxLength: 160 },
    courseId: { type: "string", minLength: 1, maxLength: 128 },
    batchId: { type: "string", minLength: 1, maxLength: 128 },
    enrolledOn: { type: "string", pattern: DATE_PATTERN },
    // Whole rupees -- see models/course.js for why money is integer-only here.
    totalFee: { type: "integer", minimum: 0, maximum: 100000000 },
    status: { type: "string", enum: STUDENT_STATUSES },
    notes: { type: "string", maxLength: 600 },
    createdByUid: { type: "string", minLength: 1, maxLength: 128 },
  },
};

module.exports = { studentSchema };
