"use strict";

// The grouping layer: each require below is a directory, and Firebase turns a
// nested export into `<group>-<fn>` function names -- so default/student.js
// deploys as `api-students`. Adding an endpoint means adding a line to that
// directory's index.js, never here.
//
// `./default` MUST come first -- default/course.js calls setGlobalOptions() at
// module scope, and that has to run before any onRequest is defined.
exports.api = require("./default");
exports.testBed = require("./testBed");
