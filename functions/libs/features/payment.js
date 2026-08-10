"use strict";

// Business logic for fees: record a receipt, and show one student's exact fee
// position.
//
// The "received" figure is always a server-side aggregate over that student's
// receipts (db.sumPaymentsByStudent), never a running total stored on the
// student -- so a corrected receipt immediately changes the dues figure and
// the two can never disagree.
const db = require("../services/database");
const renderer = require("../services/renderer");
const form = require("../utils/form");
const { httpError } = require("../utils/errors");
const { labelMap } = require("../utils/lookup");
const { PAYMENT_MODES } = require("../utils/config");

async function requireStudent(studentId) {
  const student = await db.getStudent(studentId);
  if (!student) throw httpError(400, "That student no longer exists -- reload and try again.");
  return student;
}

// The receipt list for one student. Empty studentId is a legitimate state (the
// fees screen loads before anyone is picked), so it renders an empty list
// rather than erroring.
async function paymentsHtml(body) {
  const studentId = form.text(body, "studentId", "Student", { required: false, max: 128 });
  if (!studentId) {
    return renderer.paymentListFragment([], {});
  }

  const student = await requireStudent(studentId);
  const payments = await db.listPaymentsByStudent(studentId);

  return renderer.paymentListFragment(payments, labelMap([student], "name"));
}

async function feeSummaryHtml(body) {
  const studentId = form.text(body, "studentId", "Student", { required: false, max: 128 });
  if (!studentId) {
    return renderer.feeSummaryFragment({ studentName: "No student selected", totalFee: 0, paid: 0 });
  }

  const student = await requireStudent(studentId);
  const paid = await db.sumPaymentsByStudent(studentId);

  return renderer.feeSummaryFragment({
    studentName: student.name,
    totalFee: student.totalFee ?? 0,
    paid,
  });
}

async function createPaymentHtml(user, body) {
  const studentId = form.text(body, "studentId", "Student", { max: 128 });
  const student = await requireStudent(studentId);

  // Negative amounts are allowed (they are how a wrong receipt is corrected --
  // see models/payment.js), but zero is always a mistake.
  const amount = form.integer(body, "amount", "Amount", { min: -100000000 });
  if (amount === 0) {
    throw httpError(400, "Amount cannot be zero.");
  }

  await db.createPayment({
    studentId,
    // Denormalised from the student so a batch-wise collection report stays one
    // query -- the student's batch is the source of truth, never the form.
    batchId: student.batchId,
    amount,
    mode: form.choice(body, "mode", "Payment mode", PAYMENT_MODES),
    paidOn: form.date(body, "paidOn", "Payment date"),
    note: form.text(body, "note", "Note", { required: false, max: 300 }),
    receivedByUid: user.uid,
  });

  return paymentsHtml(body);
}

module.exports = { paymentsHtml, feeSummaryHtml, createPaymentHtml };
