"use strict";

// Business logic for the trainers feature. Mirrors features/course.js exactly
// -- list, create-then-relist, and an options fragment for the batch form's
// trainer dropdown.
const db = require("../services/database");
const renderer = require("../services/renderer");
const form = require("../utils/form");

async function trainersHtml() {
  const trainers = await db.listTrainers();
  return renderer.trainerListFragment(trainers);
}

async function createTrainerHtml(user, body) {
  await db.createTrainer({
    name: form.text(body, "name", "Trainer name", { max: 120 }),
    phone: form.text(body, "phone", "Phone", { max: 24 }),
    email: form.text(body, "email", "Email", { required: false, max: 160 }),
    expertise: form.text(body, "expertise", "Expertise", { required: false }),
    active: true,
    createdByUid: user.uid,
  });

  return trainersHtml();
}

module.exports = { trainersHtml, createTrainerHtml };
