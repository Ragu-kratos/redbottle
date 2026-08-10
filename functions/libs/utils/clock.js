"use strict";

// "Today" and "start of this month" as "YYYY-MM-DD" strings, in the
// institute's own timezone.
//
// Why the timezone matters: a Cloud Function runs in UTC, so a receipt taken
// at 9pm IST is already "tomorrow" in UTC. Without pinning this, the
// dashboard's month-to-date collection figure would move a receipt into the
// wrong month for the last 5.5 hours of every day, and month-end totals would
// never reconcile with the receipt book.
//
// en-CA is used purely because its short date format is ISO ("2026-08-10") --
// it is a formatting trick, not a locale choice.
const { TIMEZONE } = require("./config");

function today() {
  return new Date().toLocaleDateString("en-CA", { timeZone: TIMEZONE });
}

function monthStart() {
  return `${today().slice(0, 7)}-01`;
}

module.exports = { today, monthStart };
