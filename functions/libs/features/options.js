"use strict";

// Every <option> list in the app, in one orchestrator.
//
// Kept together rather than as an `xOptionsHtml` bolted onto each of
// features/course.js, trainer.js, batch.js and student.js: the forms that need
// them do not line up one-to-one with those features (the batches form needs
// courses AND trainers, the students form needs courses AND batches), so
// spreading them out meant endpoints/default/options.js importing four
// features to answer four near-identical routes.
//
// The enum lists come from utils/config.js rather than being typed as literal
// <option> tags in the screen markup. That costs a tiny request per dropdown
// and buys the guarantee that a <select>'s values and the model's `enum` can
// never drift apart -- drift there produces a form that fails validation with
// no visible cause.
const db = require("../services/database");
const renderer = require("../services/renderer");

async function courseOptionsHtml() {
  const courses = await db.listCourses();
  // Retired courses stay in the catalogue for historic enrolments but must not
  // be selectable for a new batch.
  return renderer.courseOptionsFragment(courses.filter((c) => c.active));
}

async function trainerOptionsHtml() {
  const trainers = await db.listTrainers();
  return renderer.trainerOptionsFragment(trainers.filter((t) => t.active));
}

async function batchOptionsHtml() {
  const batches = await db.listBatches();
  // Cancelled batches stay on the list for the record, but nobody should be
  // enrolled into one or marked present in one.
  return renderer.batchOptionsFragment(batches.filter((b) => b.status !== "cancelled"));
}

async function studentOptionsHtml() {
  const students = await db.listStudents();
  return renderer.studentOptionsFragment(students);
}

// Closed vocabularies -- no fetch, just the same <option> shape as above so a
// status dropdown is wired into a screen exactly like a course dropdown.
const courseCategoryOptionsHtml = async () => renderer.courseCategoryOptionsFragment();
const batchStatusOptionsHtml = async () => renderer.batchStatusOptionsFragment();
const studentStatusOptionsHtml = async () => renderer.studentStatusOptionsFragment();
const paymentModeOptionsHtml = async () => renderer.paymentModeOptionsFragment();

module.exports = {
  courseOptionsHtml,
  trainerOptionsHtml,
  batchOptionsHtml,
  studentOptionsHtml,
  courseCategoryOptionsHtml,
  batchStatusOptionsHtml,
  studentStatusOptionsHtml,
  paymentModeOptionsHtml,
};
