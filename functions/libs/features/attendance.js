"use strict";

// Business logic for the attendance register: read a batch's roster for one
// day, and save it back.
//
// The save path re-reads the batch's student list from Firestore instead of
// trusting the posted field names. Two reasons: an unchecked checkbox does not
// post at all, so "who was absent" is only knowable by diffing against the
// real roster; and a hand-crafted POST could otherwise mark a student who is
// not in that batch at all.
const db = require("../services/database");
const renderer = require("../services/renderer");
const form = require("../utils/form");
const { httpError } = require("../utils/errors");

const MARK_PREFIX = "mark_";

async function loadRoster(batchId, date) {
  const batch = await db.getBatch(batchId);
  if (!batch) throw httpError(400, "That batch no longer exists -- reload and try again.");

  const [students, register] = await Promise.all([
    db.listStudentsByBatch(batchId),
    db.getAttendance(batchId, date),
  ]);

  // Only students still on the course are in the register -- a dropped student
  // should not keep appearing to be marked absent every day.
  return { batch, students: students.filter((s) => s.status === "active"), register };
}

async function rosterHtml(body) {
  const batchId = form.text(body, "batchId", "Batch", { max: 128 });
  const date = form.date(body, "date", "Date");

  const { batch, students, register } = await loadRoster(batchId, date);

  return renderer.rosterFragment({
    batchCode: batch.code,
    date,
    students,
    marks: register?.marks ?? {},
    savedAt: Boolean(register),
  });
}

async function saveRosterHtml(user, body) {
  const batchId = form.text(body, "batchId", "Batch", { max: 128 });
  const date = form.date(body, "date", "Date");

  const { batch, students } = await loadRoster(batchId, date);
  if (!students.length) {
    throw httpError(400, `No active students in ${batch.code} to mark.`);
  }

  // Every student in the roster gets an explicit mark, so a saved register is
  // always complete -- "missing" never has to mean "absent" at read time.
  const marks = Object.fromEntries(
    students.map((s) => [s.id, form.checkbox(body, `${MARK_PREFIX}${s.id}`) ? "present" : "absent"])
  );

  await db.setAttendance({ batchId, date, marks, markedByUid: user.uid });

  return renderer.rosterFragment({
    batchCode: batch.code,
    date,
    students,
    marks,
    savedAt: true,
  });
}

module.exports = { rosterHtml, saveRosterHtml };
