"use strict";

// Single source of truth for values that would otherwise be scattered as
// bare string/object literals across endpoints/ and libs/.

// Matches Firestore's location (firebase.json) -- avoids a cross-region hop
// on every request.
const REGION = "asia-south1";

// The institute's own timezone, used to decide which calendar day (and so
// which month) a server-side "now" falls in -- see utils/clock.js for why a
// UTC-based date silently misfiles evening receipts.
const TIMEZONE = "Asia/Kolkata";

const COLLECTIONS = {
  courses: "courses",
  trainers: "trainers",
  batches: "batches",
  students: "students",
  attendance: "attendance",
  payments: "payments",
};

// Closed vocabularies shared by the models (as jsonschema `enum`s) and the
// renderer (to build <select> options), so a status string can never drift
// between the two.
const COURSE_CATEGORIES = ["software", "photography", "professional", "other"];
const BATCH_STATUSES = ["upcoming", "running", "completed", "cancelled"];
const STUDENT_STATUSES = ["active", "completed", "dropped"];
const PAYMENT_MODES = ["cash", "upi", "card", "bank", "cheque"];
const ATTENDANCE_MARKS = ["present", "absent"];

// Calendar dates (enrolment, payment, batch start, attendance day) are stored
// as plain "YYYY-MM-DD" strings rather than Firestore Timestamps: they are
// timezone-free facts, they sort and range-query lexicographically for free,
// and they survive a JSON round-trip through an HTML form unchanged. Reserve
// real Timestamps for server-stamped audit fields (createdAt/updatedAt).
const DATE_PATTERN = "^\\d{4}-\\d{2}-\\d{2}$";

// Every list query is capped -- an institute screen shows a page of records,
// and an unbounded .get() on a growing collection is the classic way a
// function starts timing out a year after launch.
const LIST_LIMIT = 200;

module.exports = {
  REGION,
  TIMEZONE,
  COLLECTIONS,
  COURSE_CATEGORIES,
  BATCH_STATUSES,
  STUDENT_STATUSES,
  PAYMENT_MODES,
  ATTENDANCE_MARKS,
  DATE_PATTERN,
  LIST_LIMIT,
};
