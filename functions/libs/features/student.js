"use strict";

// Business logic for the students feature -- enrolment. The fee agreed at
// enrolment is copied onto the student here (defaulting to the course's
// current list price when the form leaves it blank) rather than read from the
// course at display time; see models/student.js for why.
const db = require("../services/database");
const renderer = require("../services/renderer");
const form = require("../utils/form");
const { httpError } = require("../utils/errors");
const { labelMap } = require("../utils/lookup");
const { STUDENT_STATUSES } = require("../utils/config");

async function studentsHtml() {
  const [students, courses, batches] = await Promise.all([
    db.listStudents(),
    db.listCourses(),
    db.listBatches(),
  ]);

  return renderer.studentListFragment(students, labelMap(courses, "title"), labelMap(batches, "code"));
}

async function createStudentHtml(user, body) {
  const courseId = form.text(body, "courseId", "Course", { max: 128 });
  const batchId = form.text(body, "batchId", "Batch", { max: 128 });

  const [course, batch] = await Promise.all([db.getCourse(courseId), db.getBatch(batchId)]);
  if (!course) throw httpError(400, "That course no longer exists -- reload and try again.");
  if (!batch) throw httpError(400, "That batch no longer exists -- reload and try again.");

  // The batch belongs to a course, so letting the two dropdowns disagree would
  // put a student in a batch that teaches something else entirely.
  if (batch.courseId !== courseId) {
    throw httpError(400, `Batch ${batch.code} does not belong to the selected course.`);
  }

  // Capacity is enforced here, not in the model: it depends on how many other
  // students already point at this batch, which no single-document schema can
  // see. This is a check-then-write, not a transaction -- two receptionists
  // enrolling into the last seat at the same instant can both succeed. That is
  // an accepted tradeoff for a front-office app; making it airtight means a
  // transaction that reads a count, which Firestore cannot do.
  const enrolled = await db.countStudentsInBatch(batchId);
  if (enrolled >= batch.capacity) {
    throw httpError(400, `Batch ${batch.code} is full (${enrolled}/${batch.capacity} seats).`);
  }

  // Blank fee means "charge the course's list price", which is what the front
  // office expects when it does not negotiate a discount.
  const feeGiven = String(body?.totalFee ?? "").trim();
  const totalFee = feeGiven
    ? form.integer(body, "totalFee", "Agreed fee")
    : course.feeAmount;

  await db.createStudent({
    name: form.text(body, "name", "Student name", { max: 120 }),
    phone: form.text(body, "phone", "Phone", { max: 24 }),
    email: form.text(body, "email", "Email", { required: false, max: 160 }),
    courseId,
    batchId,
    enrolledOn: form.date(body, "enrolledOn", "Enrolment date"),
    totalFee,
    status: form.choice(body, "status", "Status", STUDENT_STATUSES),
    notes: form.text(body, "notes", "Notes", { required: false, max: 600 }),
    createdByUid: user.uid,
  });

  return studentsHtml();
}

module.exports = { studentsHtml, createStudentHtml };
