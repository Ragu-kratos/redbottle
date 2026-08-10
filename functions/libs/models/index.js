"use strict";

// Single jsonschema Validator shared by every model. services/database.js is
// the only caller -- see models/course.js for why validation lives at the
// write boundary rather than scattered across features/.
const { Validator } = require("jsonschema");
const { httpError } = require("../utils/errors");
const { courseSchema } = require("./course");
const { trainerSchema } = require("./trainer");
const { batchSchema } = require("./batch");
const { studentSchema } = require("./student");
const { attendanceSchema } = require("./attendance");
const { paymentSchema } = require("./payment");

const v = new Validator();
for (const schema of [
  courseSchema,
  trainerSchema,
  batchSchema,
  studentSchema,
  attendanceSchema,
  paymentSchema,
]) {
  v.addSchema(schema, schema.id);
}

// Throws httpError(400, ...) listing every jsonschema violation on failure.
// Callers pass the schema object itself (not its id) so the write site reads
// naturally: assertValid(studentSchema, data).
//
// This is the backstop, not the user-facing check: features/ validates and
// coerces form input first and throws its own httpError(400, "...") with copy
// a receptionist can act on. A message from here surfacing in the UI means a
// feature let something through it should have caught.
function assertValid(schema, data) {
  const result = v.validate(data, schema);
  if (!result.valid) {
    const detail = result.errors.map((e) => e.stack).join("; ");
    throw httpError(400, `Invalid ${schema.id} payload: ${detail}`);
  }
}

module.exports = { assertValid };
