"use strict";

// JSON Schema for a `batches` document -- one running instance of a course,
// with its own trainer, schedule and seat count. Students enrol into a batch,
// not into a course, which is why attendance and capacity live here.
const { BATCH_STATUSES, DATE_PATTERN } = require("../utils/config");

const batchSchema = {
  id: "/Batch",
  type: "object",
  required: ["code", "courseId", "trainerId", "startDate", "status", "capacity", "createdByUid"],
  additionalProperties: false,
  properties: {
    // Human-facing label the front office actually says out loud ("MERN-JUL-A").
    code: { type: "string", minLength: 1, maxLength: 40 },
    courseId: { type: "string", minLength: 1, maxLength: 128 },
    trainerId: { type: "string", minLength: 1, maxLength: 128 },
    startDate: { type: "string", pattern: DATE_PATTERN },
    // Optional: an open-ended batch has no end date yet. Empty string is
    // allowed so an untouched form field round-trips without a branch in the
    // feature layer.
    endDate: { type: "string", pattern: `${DATE_PATTERN}|^$` },
    // Free text ("Mon/Wed/Fri 7-9pm") rather than a structured recurrence
    // rule -- nothing in this app computes against the schedule, it is only
    // ever displayed, and a rule engine here would be unused complexity.
    schedule: { type: "string", maxLength: 120 },
    capacity: { type: "integer", minimum: 1, maximum: 500 },
    status: { type: "string", enum: BATCH_STATUSES },
    createdByUid: { type: "string", minLength: 1, maxLength: 128 },
  },
};

module.exports = { batchSchema };
