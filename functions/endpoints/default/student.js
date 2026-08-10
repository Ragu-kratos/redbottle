"use strict";

const { onRequest } = require("firebase-functions/https");
const { htmlRoutes } = require("../../libs/utils/http");
const { errorFragment } = require("../../libs/services/renderer");
const { studentsHtml, createStudentHtml } = require("../../libs/features/student");

exports.students = onRequest(
  htmlRoutes({
    name: "api-students",
    errorHtml: errorFragment,
    routes: {
      "GET /students": () => studentsHtml(),
      "POST /students": (params, user) => createStudentHtml(user, params),
    },
  })
);
