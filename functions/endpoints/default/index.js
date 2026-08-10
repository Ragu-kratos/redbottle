"use strict";

// Adding an endpoint to this group means adding a line here, never to
// functions/endpoints/index.js -- that file only maps directory -> group.
// Each export below deploys as `api-<exportName>`.
//
// `./course` MUST stay first: it is the file that calls setGlobalOptions() at
// module scope, and that has to run before any other onRequest in the group is
// defined or the rest silently deploy to the default region.
exports.courses = require("./course").courses;
exports.trainers = require("./trainer").trainers;
exports.batches = require("./batch").batches;
exports.students = require("./student").students;
exports.attendance = require("./attendance").attendance;
exports.payments = require("./payment").payments;
exports.dashboard = require("./dashboard").dashboard;
exports.options = require("./options").options;
