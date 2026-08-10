"use strict";

// JSON Schema for an `attendance` document -- one register for one batch on
// one day, holding every student's mark as a map rather than one document per
// student per day.
//
// Two reasons for the map shape: re-saving a day is a single idempotent
// document write (the doc id is `<batchId>_<date>`, see
// services/database.js), and reading a day's register is one document read
// instead of a query. The cost is that a per-student attendance history means
// scanning that student's batch registers -- acceptable, because every screen
// in this app reads attendance by batch-and-day, never by student.
const { ATTENDANCE_MARKS, DATE_PATTERN } = require("../utils/config");

const attendanceSchema = {
  id: "/Attendance",
  type: "object",
  required: ["batchId", "date", "marks", "markedByUid"],
  additionalProperties: false,
  properties: {
    batchId: { type: "string", minLength: 1, maxLength: 128 },
    date: { type: "string", pattern: DATE_PATTERN },
    // { [studentId]: "present" | "absent" }. patternProperties keys the map by
    // Firestore document id, so an unexpected key shape is rejected at the
    // write boundary instead of becoming an orphan entry nothing renders.
    marks: {
      type: "object",
      patternProperties: {
        "^[A-Za-z0-9_-]{1,128}$": { type: "string", enum: ATTENDANCE_MARKS },
      },
      additionalProperties: false,
    },
    markedByUid: { type: "string", minLength: 1, maxLength: 128 },
  },
};

module.exports = { attendanceSchema };
