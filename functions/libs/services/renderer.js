"use strict";

// Pure data -> HTML: takes no dependency on services/database.js, so the
// files in features/ stay the only place that fetches data and then renders
// it. Each `*Fragment` function owns the `id` of the element it returns --
// front-end/src/services/api.js's `targets` map must mirror those ids
// exactly, and a screen's `hx-target` points at the static slot the fragment
// is swapped into, never at the id below.
//
// Tailwind never scans this file automatically (it lives outside Vite's
// root), so front-end/src/styles/index.css @source's it explicitly. Prefer
// reusing a class that already appears here or in front-end markup over
// inventing one -- a class used only in a fragment that is somehow missed by
// that @source line silently renders unstyled.
const { COURSE_CATEGORIES, BATCH_STATUSES, STUDENT_STATUSES, PAYMENT_MODES } = require("../utils/config");

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

// Money is whole rupees everywhere (see models/course.js) -- this is the only
// place that turns one into display text, so a report and a receipt can never
// format the same figure differently.
function money(amount) {
  const n = Number(amount) || 0;
  return `₹${n.toLocaleString("en-IN")}`;
}

// --- shared building blocks --------------------------------------------------

const BADGE_TONES = {
  neutral: "bg-slate-100 text-slate-700",
  good: "bg-emerald-100 text-emerald-800",
  warn: "bg-amber-100 text-amber-800",
  bad: "bg-red-100 text-red-700",
  info: "bg-sky-100 text-sky-800",
};

// Status vocabularies come from utils/config.js, so the tone map only has to
// answer "which colour", not "which statuses exist".
const STATUS_TONES = {
  upcoming: "info",
  running: "good",
  completed: "neutral",
  cancelled: "bad",
  active: "good",
  dropped: "bad",
};

function badge(text, tone = "neutral") {
  const cls = BADGE_TONES[tone] ?? BADGE_TONES.neutral;
  return `<span class="rounded px-2 py-0.5 text-xs font-medium ${cls}">${escapeHtml(text)}</span>`;
}

function statusBadge(status) {
  return badge(status, STATUS_TONES[status] ?? "neutral");
}

// One "label: value" line inside a list row.
function metaLine(pairs) {
  const parts = pairs
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([label, value]) => `<span>${escapeHtml(label)}: ${escapeHtml(value)}</span>`);
  if (!parts.length) return "";
  return `<p class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">${parts.join("")}</p>`;
}

function row(inner) {
  return `<li class="rounded border border-slate-200 bg-white p-3">${inner}</li>`;
}

function emptyRow(message) {
  return `<li class="rounded border border-slate-200 p-3 text-slate-500">${escapeHtml(message)}</li>`;
}

function list(id, rows, emptyMessage) {
  const body = rows.length ? rows.join("") : emptyRow(emptyMessage);
  return `<ul id="${id}" class="grid gap-2">${body}</ul>`;
}

function errorFragment(message) {
  return `<div class="rounded bg-red-50 p-3 text-sm text-red-700">${escapeHtml(message)}</div>`;
}

// --- <select> option fragments -----------------------------------------------
// Swapped into a static <select> in the screen markup (hx-target="this"), so
// these return bare <option> lists and own no id of their own. The static
// <select> keeps the `name` that the surrounding form posts.

function optionsMarkup(items, labelFor, placeholder) {
  const head = `<option value="">${escapeHtml(placeholder)}</option>`;
  const body = items
    .map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(labelFor(item))}</option>`)
    .join("");
  return head + body;
}

// A fixed vocabulary from utils/config.js rather than Firestore rows -- same
// <option> shape, so a screen's status dropdown is wired exactly like its
// course dropdown.
function enumOptionsMarkup(values, placeholder) {
  const head = placeholder ? `<option value="">${escapeHtml(placeholder)}</option>` : "";
  return (
    head +
    values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("")
  );
}

const courseOptionsFragment = (courses) =>
  optionsMarkup(courses, (c) => c.title, "Select a course");

const trainerOptionsFragment = (trainers) =>
  optionsMarkup(trainers, (t) => t.name, "Select a trainer");

const batchOptionsFragment = (batches) =>
  optionsMarkup(batches, (b) => b.code, "Select a batch");

const studentOptionsFragment = (students) =>
  optionsMarkup(students, (s) => `${s.name} (${s.phone})`, "Select a student");

const courseCategoryOptionsFragment = () => enumOptionsMarkup(COURSE_CATEGORIES);
const batchStatusOptionsFragment = () => enumOptionsMarkup(BATCH_STATUSES);
const studentStatusOptionsFragment = () => enumOptionsMarkup(STUDENT_STATUSES);
const paymentModeOptionsFragment = () => enumOptionsMarkup(PAYMENT_MODES);

// --- dashboard ---------------------------------------------------------------

function statTile(label, value, sub) {
  return `
      <div class="rounded border border-slate-200 bg-white p-3">
        <p class="text-xs text-slate-500">${escapeHtml(label)}</p>
        <p class="mt-1 text-2xl font-semibold text-slate-900">${escapeHtml(value)}</p>
        ${sub ? `<p class="mt-1 text-xs text-slate-500">${escapeHtml(sub)}</p>` : ""}
      </div>`;
}

function dashboardFragment(stats) {
  return `
    <div id="dashboard-stats" class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      ${statTile("Students", String(stats.students), "enrolled all-time")}
      ${statTile("Batches", String(stats.batches), `${stats.runningBatches} running now`)}
      ${statTile("Courses", String(stats.courses), "in the catalogue")}
      ${statTile("Trainers", String(stats.trainers), "on record")}
      ${statTile("Collected this month", money(stats.monthRevenue), `${stats.monthPayments} receipt(s)`)}
      ${statTile("Outstanding fees", money(stats.outstanding), "across all enrolments")}
    </div>`;
}

// --- courses -----------------------------------------------------------------

function courseListFragment(courses) {
  const rows = courses.map((c) =>
    row(`
        <div class="flex items-start justify-between gap-2">
          <h3 class="font-semibold">${escapeHtml(c.title)}</h3>
          ${badge(c.category, "info")}
        </div>
        ${metaLine([
          ["Fee", money(c.feeAmount)],
          ["Duration", `${c.durationWeeks} week(s)`],
          ["Status", c.active ? "active" : "retired"],
        ])}
        ${c.description ? `<p class="mt-1 text-sm text-slate-600">${escapeHtml(c.description)}</p>` : ""}`)
  );
  return list("course-list", rows, "No courses yet -- add the first one above.");
}

// --- trainers ----------------------------------------------------------------

function trainerListFragment(trainers) {
  const rows = trainers.map((t) =>
    row(`
        <div class="flex items-start justify-between gap-2">
          <h3 class="font-semibold">${escapeHtml(t.name)}</h3>
          ${badge(t.active ? "active" : "inactive", t.active ? "good" : "neutral")}
        </div>
        ${metaLine([
          ["Phone", t.phone],
          ["Email", t.email],
          ["Expertise", t.expertise],
        ])}`)
  );
  return list("trainer-list", rows, "No trainers yet -- add the first one above.");
}

// --- batches -----------------------------------------------------------------

// `courseTitles` / `trainerNames` are plain id -> label maps built by the
// feature. Passing lookup maps rather than ids keeps this file free of any
// ability to fetch the missing name itself.
function batchListFragment(batches, courseTitles, trainerNames) {
  const rows = batches.map((b) =>
    row(`
        <div class="flex items-start justify-between gap-2">
          <h3 class="font-semibold">${escapeHtml(b.code)}</h3>
          ${statusBadge(b.status)}
        </div>
        ${metaLine([
          ["Course", courseTitles[b.courseId] ?? "unknown course"],
          ["Trainer", trainerNames[b.trainerId] ?? "unassigned"],
          ["Starts", b.startDate],
          ["Ends", b.endDate],
          ["Schedule", b.schedule],
          ["Seats", `${b.enrolled ?? 0}/${b.capacity}`],
        ])}`)
  );
  return list("batch-list", rows, "No batches yet -- add the first one above.");
}

// --- students ----------------------------------------------------------------

// Shows the agreed fee but deliberately NOT a per-student dues figure: an
// exact one costs an aggregate query per student (LIST_LIMIT of them for one
// page render), and an approximate one computed from a capped page of receipts
// would quietly go wrong as the institute grows. Dues live where they can be
// exact -- per student on the fees screen, institute-wide on the dashboard.
function studentListFragment(students, courseTitles, batchCodes) {
  const rows = students.map((s) =>
    row(`
        <div class="flex items-start justify-between gap-2">
          <h3 class="font-semibold">${escapeHtml(s.name)}</h3>
          ${statusBadge(s.status)}
        </div>
        ${metaLine([
          ["Phone", s.phone],
          ["Course", courseTitles[s.courseId] ?? "unknown course"],
          ["Batch", batchCodes[s.batchId] ?? "unassigned"],
          ["Enrolled", s.enrolledOn],
          ["Agreed fee", money(s.totalFee)],
        ])}`)
  );
  return list("student-list", rows, "No students yet -- enrol the first one above.");
}

// --- attendance --------------------------------------------------------------

// The register. Each student is a checkbox named `mark_<studentId>`, and an
// unchecked box simply does not post -- features/attendance.js treats every
// student in the batch who is missing from the body as absent, which is why it
// re-reads the roster server-side instead of trusting the posted keys.
function rosterFragment({ batchCode, date, students, marks, savedAt }) {
  if (!students.length) {
    return `
      <div id="attendance-roster" class="rounded border border-slate-200 bg-white p-3 text-slate-500">
        No students enrolled in ${escapeHtml(batchCode)} yet.
      </div>`;
  }

  const present = students.filter((s) => marks[s.id] === "present").length;
  const rows = students
    .map((s) => {
      const isPresent = marks[s.id] !== "absent"; // default a fresh register to present
      return `
        <li class="flex items-center justify-between gap-2 rounded border border-slate-200 bg-white p-3">
          <label class="flex flex-1 items-center gap-3 text-sm">
            <input
              type="checkbox"
              name="mark_${escapeHtml(s.id)}"
              value="present"
              class="h-4 w-4 rounded border-slate-300"
              ${isPresent ? "checked" : ""}
            />
            <span class="font-medium">${escapeHtml(s.name)}</span>
          </label>
          <span class="text-xs text-slate-500">${escapeHtml(s.phone)}</span>
        </li>`;
    })
    .join("");

  return `
    <div id="attendance-roster" class="grid gap-2">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-sm text-slate-600">
          ${escapeHtml(batchCode)} &middot; ${escapeHtml(date)}
        </p>
        <div class="flex items-center gap-2">
          ${badge(`${present}/${students.length} present`, present === students.length ? "good" : "warn")}
          ${savedAt ? badge("saved", "good") : ""}
        </div>
      </div>
      <ul class="grid gap-2">${rows}</ul>
    </div>`;
}

// --- payments ----------------------------------------------------------------

function paymentListFragment(payments, studentNames) {
  const rows = payments.map((p) =>
    row(`
        <div class="flex items-start justify-between gap-2">
          <h3 class="font-semibold">${escapeHtml(studentNames[p.studentId] ?? "unknown student")}</h3>
          <span class="shrink-0 font-semibold text-slate-900">${money(p.amount)}</span>
        </div>
        ${metaLine([
          ["Paid on", p.paidOn],
          ["Mode", p.mode],
          ["Note", p.note],
        ])}`)
  );
  return list("payment-list", rows, "No receipts recorded yet.");
}

// A student's fee position, shown above the receipt list once one is picked.
function feeSummaryFragment({ studentName, totalFee, paid }) {
  const due = totalFee - paid;
  return `
    <div id="fee-summary" class="grid gap-2 sm:grid-cols-3">
      ${statTile("Agreed fee", money(totalFee), escapeHtml(studentName))}
      ${statTile("Received", money(paid), "")}
      ${statTile(due > 0 ? "Outstanding" : "Fully paid", money(Math.max(due, 0)), "")}
    </div>`;
}

module.exports = {
  escapeHtml,
  money,
  errorFragment,

  courseOptionsFragment,
  trainerOptionsFragment,
  batchOptionsFragment,
  studentOptionsFragment,
  courseCategoryOptionsFragment,
  batchStatusOptionsFragment,
  studentStatusOptionsFragment,
  paymentModeOptionsFragment,

  dashboardFragment,
  courseListFragment,
  trainerListFragment,
  batchListFragment,
  studentListFragment,
  rosterFragment,
  paymentListFragment,
  feeSummaryFragment,
};
