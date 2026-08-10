"use strict";

const { onRequest } = require("firebase-functions/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const { htmlRoutes } = require("../../libs/utils/http");
const { errorFragment } = require("../../libs/services/renderer");
const { coursesHtml, createCourseHtml } = require("../../libs/features/course");
const { REGION } = require("../../libs/utils/config");

// MUST run at module scope, before any onRequest in this group is defined --
// which is why endpoints/default/index.js requires this file first, and
// endpoints/index.js requires `./default` before any other group. Moving this
// call means every function in the codebase silently deploys to us-central1.
setGlobalOptions({ region: REGION, maxInstances: 10 });

exports.courses = onRequest(
  htmlRoutes({
    name: "api-courses",
    errorHtml: errorFragment,
    routes: {
      "GET /courses": () => coursesHtml(),
      "POST /courses": (params, user) => createCourseHtml(user, params),
    },
  })
);
