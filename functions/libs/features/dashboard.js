"use strict";

// Business logic for the dashboard. Every figure here is a Firestore
// aggregation, not a reduce over fetched documents -- eight small aggregate
// queries in parallel instead of pulling five collections across the wire to
// count and sum them in JS (which would also start under-reporting the moment
// the institute passes LIST_LIMIT records).
const db = require("../services/database");
const renderer = require("../services/renderer");
const { monthStart } = require("../utils/clock");

async function dashboardHtml() {
  const [students, batches, courses, trainers, runningBatches, month, agreedFees, received] =
    await Promise.all([
      db.countStudents(),
      db.countBatches(),
      db.countCourses(),
      db.countTrainers(),
      db.countRunningBatches(),
      db.paymentsSince(monthStart()),
      db.sumAgreedFees(),
      db.sumAllPayments(),
    ]);

  return renderer.dashboardFragment({
    students,
    batches,
    courses,
    trainers,
    runningBatches,
    monthRevenue: month.total,
    monthPayments: month.count,
    // Institute-wide, across every enrolment ever recorded -- including
    // completed and dropped students, whose unpaid balance is still money
    // owed. Shown as-is even when negative: that means advances exceed agreed
    // fees, which is real information the front office should see rather than
    // have clamped away to a tidy zero.
    outstanding: agreedFees - received,
  });
}

module.exports = { dashboardHtml };
