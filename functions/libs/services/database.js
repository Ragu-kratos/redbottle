"use strict";

// The only file allowed to touch Firestore. Every write here validates its
// payload against the matching model first -- see models/ -- so nothing can
// reach the database unvalidated regardless of which feature calls in.
//
// Two deliberate shape decisions worth knowing before adding to this file:
//
// 1. Ordering happens in JS (`sortBy` below), never with `.orderBy()`. A
//    Firestore query that both filters and orders needs a composite index,
//    and this app's screens are all "filter by batch/student, then show
//    alphabetically". Sorting a LIST_LIMIT-capped page in memory costs
//    nothing and keeps firestore.indexes.json empty, so no screen can 500 in
//    production on a missing index that dev never noticed.
// 2. Documents are institute-wide, not scoped by `ownerUid`. Every member of
//    the front office must see the same students and fees, so authorisation
//    is "is there a verified user at all" (see utils/auth.js), and the
//    acting uid is recorded on the document (`createdByUid`, `markedByUid`,
//    `receivedByUid`) purely as an audit trail.
const { FieldValue, AggregateField } = require("firebase-admin/firestore");
const { getDb } = require("../utils/firebase");
const { COLLECTIONS, LIST_LIMIT } = require("../utils/config");
const { assertValid } = require("../models");
const { courseSchema } = require("../models/course");
const { trainerSchema } = require("../models/trainer");
const { batchSchema } = require("../models/batch");
const { studentSchema } = require("../models/student");
const { attendanceSchema } = require("../models/attendance");
const { paymentSchema } = require("../models/payment");

// --- generic primitives ------------------------------------------------------
// Every named accessor below is one line on top of these, so the validate ->
// stamp -> write sequence exists in exactly one place per operation shape.

function sortBy(rows, field) {
  return rows.sort((a, b) =>
    String(a[field] ?? "").localeCompare(String(b[field] ?? ""), "en", { numeric: true })
  );
}

function toRow(doc) {
  return { id: doc.id, ...doc.data() };
}

async function listAll(collection, sortField, limit = LIST_LIMIT) {
  const snap = await getDb().collection(collection).limit(limit).get();
  return sortBy(snap.docs.map(toRow), sortField);
}

async function listWhere(collection, field, value, sortField, limit = LIST_LIMIT) {
  const snap = await getDb().collection(collection).where(field, "==", value).limit(limit).get();
  return sortBy(snap.docs.map(toRow), sortField);
}

async function getOne(collection, id) {
  const doc = await getDb().collection(collection).doc(id).get();
  return doc.exists ? toRow(doc) : null;
}

// Auto-id create. Returns the new id so a feature can redirect to or
// highlight the record it just made.
async function createOne(collection, schema, data) {
  assertValid(schema, data);
  const ref = getDb().collection(collection).doc();
  await ref.set({
    ...data,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

// Explicit-id overwrite, for records whose identity is derived rather than
// generated -- currently only attendance's `<batchId>_<date>`.
//
// A full overwrite, NOT `{ merge: true }`: the caller always sends a complete
// register, and merging a map field only unions its keys, so a student who
// left the batch would keep their old mark in every later save. No `createdAt`
// either -- writing one here would reset it on every re-save, and preserving
// it would cost a read-then-write transaction for an audit field nothing
// reads.
async function setOne(collection, schema, id, data) {
  assertValid(schema, data);
  await getDb()
    .collection(collection)
    .doc(id)
    .set({ ...data, updatedAt: FieldValue.serverTimestamp() });
}

// Batched multi-document write used by the seeder. Validates every entry
// before the batch is built, so a bad fixture fails the whole seed rather
// than partially writing.
async function setMany(collection, schema, entries) {
  entries.forEach((e) => assertValid(schema, e.data));

  const batch = getDb().batch();
  for (const { id, data } of entries) {
    batch.set(getDb().collection(collection).doc(id), {
      ...data,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
}

// --- server-side aggregation -------------------------------------------------
// The dashboard's figures and every fee total go through these rather than
// fetching documents and reducing in JS. That is not just a bandwidth saving:
// a JS sum over a LIST_LIMIT-capped page would silently under-report the
// moment the institute passes LIST_LIMIT receipts, and "outstanding fees" is
// exactly the number nobody notices is wrong.

async function countDocs(collection) {
  const snap = await getDb().collection(collection).count().get();
  return snap.data().count;
}

async function countWhere(collection, field, value) {
  const snap = await getDb().collection(collection).where(field, "==", value).count().get();
  return snap.data().count;
}

async function sumField(collection, field) {
  const snap = await getDb()
    .collection(collection)
    .aggregate({ total: AggregateField.sum(field) })
    .get();
  return snap.data().total ?? 0;
}

async function sumWhere(collection, field, value, sumOf) {
  const snap = await getDb()
    .collection(collection)
    .where(field, "==", value)
    .aggregate({ total: AggregateField.sum(sumOf) })
    .get();
  return snap.data().total ?? 0;
}

// --- courses -----------------------------------------------------------------

const listCourses = () => listAll(COLLECTIONS.courses, "title");
const getCourse = (id) => getOne(COLLECTIONS.courses, id);
const createCourse = (data) => createOne(COLLECTIONS.courses, courseSchema, data);
const setCourses = (entries) => setMany(COLLECTIONS.courses, courseSchema, entries);

// --- trainers ----------------------------------------------------------------

const listTrainers = () => listAll(COLLECTIONS.trainers, "name");
const getTrainer = (id) => getOne(COLLECTIONS.trainers, id);
const createTrainer = (data) => createOne(COLLECTIONS.trainers, trainerSchema, data);
const setTrainers = (entries) => setMany(COLLECTIONS.trainers, trainerSchema, entries);

// --- batches -----------------------------------------------------------------

const listBatches = () => listAll(COLLECTIONS.batches, "code");
const getBatch = (id) => getOne(COLLECTIONS.batches, id);
const createBatch = (data) => createOne(COLLECTIONS.batches, batchSchema, data);
const setBatches = (entries) => setMany(COLLECTIONS.batches, batchSchema, entries);

// --- students ----------------------------------------------------------------

const listStudents = () => listAll(COLLECTIONS.students, "name");
const listStudentsByBatch = (batchId) =>
  listWhere(COLLECTIONS.students, "batchId", batchId, "name");
const getStudent = (id) => getOne(COLLECTIONS.students, id);
const createStudent = (data) => createOne(COLLECTIONS.students, studentSchema, data);
const setStudents = (entries) => setMany(COLLECTIONS.students, studentSchema, entries);

// --- attendance --------------------------------------------------------------

// The register's identity IS batch + day, so the id is derived rather than
// generated: re-saving a day overwrites that day instead of appending a
// second conflicting register for it.
const attendanceId = (batchId, date) => `${batchId}_${date}`;

const getAttendance = (batchId, date) =>
  getOne(COLLECTIONS.attendance, attendanceId(batchId, date));

const setAttendance = (data) =>
  setOne(COLLECTIONS.attendance, attendanceSchema, attendanceId(data.batchId, data.date), data);

// --- payments ----------------------------------------------------------------

const listPaymentsByStudent = (studentId) =>
  listWhere(COLLECTIONS.payments, "studentId", studentId, "paidOn");

const createPayment = (data) => createOne(COLLECTIONS.payments, paymentSchema, data);
const setPayments = (entries) => setMany(COLLECTIONS.payments, paymentSchema, entries);

// Exact total received against one student, aggregated server-side. This is
// what makes the "dues" figure on the fees screen trustworthy without storing
// a running total on the student document (see models/student.js).
const sumPaymentsByStudent = (studentId) =>
  sumWhere(COLLECTIONS.payments, "studentId", studentId, "amount");

// Range query on a single field, so it needs no composite index -- this is
// exactly why `paidOn` is a "YYYY-MM-DD" string (see utils/config.js): it
// range-compares lexicographically.
async function paymentsSince(fromDate) {
  const snap = await getDb()
    .collection(COLLECTIONS.payments)
    .where("paidOn", ">=", fromDate)
    .aggregate({ total: AggregateField.sum("amount"), count: AggregateField.count() })
    .get();
  const data = snap.data();
  return { total: data.total ?? 0, count: data.count ?? 0 };
}

// --- dashboard aggregates ----------------------------------------------------

const countCourses = () => countDocs(COLLECTIONS.courses);
const countTrainers = () => countDocs(COLLECTIONS.trainers);
const countBatches = () => countDocs(COLLECTIONS.batches);
const countStudents = () => countDocs(COLLECTIONS.students);
const countRunningBatches = () => countWhere(COLLECTIONS.batches, "status", "running");
const countStudentsInBatch = (batchId) => countWhere(COLLECTIONS.students, "batchId", batchId);

// Institute-wide outstanding = every agreed fee minus every rupee received.
// Two aggregate queries, so it stays exact and O(1) reads however large the
// collections get.
const sumAgreedFees = () => sumField(COLLECTIONS.students, "totalFee");
const sumAllPayments = () => sumField(COLLECTIONS.payments, "amount");

module.exports = {
  listCourses,
  getCourse,
  createCourse,
  setCourses,

  listTrainers,
  getTrainer,
  createTrainer,
  setTrainers,

  listBatches,
  getBatch,
  createBatch,
  setBatches,

  listStudents,
  listStudentsByBatch,
  getStudent,
  createStudent,
  setStudents,

  getAttendance,
  setAttendance,

  listPaymentsByStudent,
  sumPaymentsByStudent,
  paymentsSince,
  createPayment,
  setPayments,

  countCourses,
  countTrainers,
  countBatches,
  countStudents,
  countRunningBatches,
  countStudentsInBatch,
  sumAgreedFees,
  sumAllPayments,
};
