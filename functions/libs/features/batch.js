"use strict";

// Business logic for the batches feature. Unlike courses and trainers, a batch
// row displays data from three collections (its course's title, its trainer's
// name, its enrolled headcount), so this is where those are gathered into the
// plain lookup maps renderer.batchListFragment expects -- the renderer is
// never given the ability to fetch a missing name itself.
const db = require("../services/database");
const renderer = require("../services/renderer");
const form = require("../utils/form");
const { httpError } = require("../utils/errors");
const { labelMap } = require("../utils/lookup");
const { BATCH_STATUSES } = require("../utils/config");

async function batchesHtml() {
  const [batches, courses, trainers] = await Promise.all([
    db.listBatches(),
    db.listCourses(),
    db.listTrainers(),
  ]);

  // One exact count() per batch rather than listing students and grouping in
  // JS: batches are few (tens), and a grouped count over a LIST_LIMIT-capped
  // student page would under-report seats on a full batch.
  const enrolled = await Promise.all(batches.map((b) => db.countStudentsInBatch(b.id)));
  const withSeats = batches.map((b, i) => ({ ...b, enrolled: enrolled[i] }));

  return renderer.batchListFragment(
    withSeats,
    labelMap(courses, "title"),
    labelMap(trainers, "name")
  );
}

async function createBatchHtml(user, body) {
  const startDate = form.date(body, "startDate", "Start date");
  const endDate = form.date(body, "endDate", "End date", { required: false });

  // Checked here rather than in the model: jsonschema can type each field but
  // cannot compare two of them, and an end-before-start batch is the kind of
  // typo that only shows up months later as an empty attendance register.
  if (endDate && endDate < startDate) {
    throw httpError(400, "End date cannot be before the start date.");
  }

  const courseId = form.text(body, "courseId", "Course", { max: 128 });
  const trainerId = form.text(body, "trainerId", "Trainer", { max: 128 });

  // Referential integrity is this layer's job -- Firestore will happily store
  // a batch pointing at a course that does not exist, and the batch list would
  // then render "unknown course" with no way to tell a typo from a deletion.
  const [course, trainer] = await Promise.all([db.getCourse(courseId), db.getTrainer(trainerId)]);
  if (!course) throw httpError(400, "That course no longer exists -- reload and try again.");
  if (!trainer) throw httpError(400, "That trainer no longer exists -- reload and try again.");

  await db.createBatch({
    code: form.text(body, "code", "Batch code", { max: 40 }),
    courseId,
    trainerId,
    startDate,
    endDate,
    schedule: form.text(body, "schedule", "Schedule", { required: false, max: 120 }),
    capacity: form.integer(body, "capacity", "Capacity", { min: 1, max: 500 }),
    status: form.choice(body, "status", "Status", BATCH_STATUSES),
    createdByUid: user.uid,
  });

  return batchesHtml();
}

module.exports = { batchesHtml, createBatchHtml };
