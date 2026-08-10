"use strict";

// JSON Schema for a `trainers` document -- staff who run batches. Kept as its
// own collection rather than a string field on `batches` so renaming a
// trainer doesn't require rewriting every batch that references them.
const trainerSchema = {
  id: "/Trainer",
  type: "object",
  required: ["name", "phone", "active", "createdByUid"],
  additionalProperties: false,
  properties: {
    name: { type: "string", minLength: 1, maxLength: 120 },
    // Free-form rather than a strict pattern: institutes routinely store
    // landlines, extensions and "+91 " prefixes, and rejecting those at the
    // write boundary is a support ticket, not a data-quality win.
    phone: { type: "string", minLength: 4, maxLength: 24 },
    email: { type: "string", maxLength: 160 },
    expertise: { type: "string", maxLength: 200 },
    active: { type: "boolean" },
    createdByUid: { type: "string", minLength: 1, maxLength: 128 },
  },
};

module.exports = { trainerSchema };
