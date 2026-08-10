"use strict";

// Business logic for the courses feature -- the only orchestrator for it:
// fetches via services/database.js, then formats via services/renderer.js.
// The HTTP endpoint calls only in here, never into services/ directly.
const db = require("../services/database");
const renderer = require("../services/renderer");
const form = require("../utils/form");
const { COURSE_CATEGORIES } = require("../utils/config");

async function coursesHtml() {
  const courses = await db.listCourses();
  return renderer.courseListFragment(courses);
}

// Returns the freshly re-read list, not just the created row: the endpoint
// swaps this straight back into the same slot the list already occupies, so
// the screen needs no second request to show what it just saved.
async function createCourseHtml(user, body) {
  await db.createCourse({
    title: form.text(body, "title", "Course name", { max: 120 }),
    category: form.choice(body, "category", "Category", COURSE_CATEGORIES),
    durationWeeks: form.integer(body, "durationWeeks", "Duration in weeks", { min: 1, max: 260 }),
    feeAmount: form.integer(body, "feeAmount", "Course fee"),
    description: form.text(body, "description", "Description", { required: false, max: 600 }),
    // A course is created to be sold; retiring one is a later edit, so this
    // is not asked for on the form.
    active: true,
    createdByUid: user.uid,
  });

  return coursesHtml();
}

module.exports = { coursesHtml, createCourseHtml };
