"use strict";

// JSON Schema for a `courses` document -- one sellable programme (e.g. "MERN
// Full Stack", "Wedding Photography"). Validated by services/database.js on
// every write, so seed fixtures and the create endpoint satisfy the same
// shape.
//
// `createdAt` / `updatedAt` are deliberately NOT part of any schema in this
// directory: jsonschema has no useful way to type a Firestore Timestamp /
// FieldValue sentinel (it would just be a bare `object`), and
// services/database.js stamps both with FieldValue.serverTimestamp() itself,
// after validation, so a caller can never forge them.
const { COURSE_CATEGORIES } = require("../utils/config");

const courseSchema = {
  id: "/Course",
  type: "object",
  required: ["title", "category", "durationWeeks", "feeAmount", "active", "createdByUid"],
  additionalProperties: false,
  properties: {
    title: { type: "string", minLength: 1, maxLength: 120 },
    category: { type: "string", enum: COURSE_CATEGORIES },
    durationWeeks: { type: "integer", minimum: 1, maximum: 260 },
    // Whole rupees, never a float -- money in this app is integer minor-unit
    // free (no paise anywhere), which keeps totals exact without a decimal
    // library. See models/payment.js for the matching rule.
    feeAmount: { type: "integer", minimum: 0, maximum: 100000000 },
    description: { type: "string", maxLength: 600 },
    active: { type: "boolean" },
    createdByUid: { type: "string", minLength: 1, maxLength: 128 },
  },
};

module.exports = { courseSchema };
