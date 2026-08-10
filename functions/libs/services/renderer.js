"use strict";

// Pure data -> HTML: takes no dependency on services/database.js, so the files
// in features/ stay the only place that fetches data and then renders it. Each
// `*Fragment` function owns the `id` of the element it returns --
// front-end/src/services/api.js's `targets` map mirrors those ids, and a
// screen's `hx-target` points at the static slot the fragment is swapped into,
// never at the id below.
//
// Styling here is deliberately semantic classes (.card, .row, .badge-success,
// .amount) defined in front-end/src/styles/index.css, not long Tailwind utility
// chains. Two reasons:
//
//   1. Tailwind never scans this file automatically -- it lives outside Vite's
//      root, so index.css has to @source it explicitly. Every utility spelled
//      out here is a chance to use one that the scan misses. A component class
//      is emitted unconditionally.
//   2. The app has light and dark themes, and the tokens behind those classes
//      flip. Utilities would mean a `dark:` counterpart for every colour in
//      every fragment; this file gets to not know themes exist.
const {
  COURSE_CATEGORIES,
  BATCH_STATUSES,
  STUDENT_STATUSES,
  PAYMENT_MODES,
} = require("../utils/config");

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

// Money is whole rupees everywhere (see models/course.js) -- this is the only
// place that turns one into display text, so a report and a receipt can never
// format the same figure differently. en-IN gives lakh grouping (1,63,000).
function money(amount) {
  const n = Number(amount) || 0;
  return `₹${n.toLocaleString("en-IN")}`;
}

// --- shared building blocks --------------------------------------------------

const STATUS_TONES = {
  upcoming: "info",
  running: "success",
  completed: "neutral",
  cancelled: "danger",
  active: "success",
  dropped: "danger",
};

function badge(text, tone = "neutral") {
  return `<span class="badge badge-${tone}">${escapeHtml(text)}</span>`;
}

function statusBadge(status) {
  return badge(status, STATUS_TONES[status] ?? "neutral");
}

// A row's secondary line. Labels are dimmed relative to their values so the
// values are what you scan down a list.
function metaLine(pairs) {
  const parts = pairs
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(
      ([label, value]) =>
        `<span><span class="meta-label">${escapeHtml(label)}</span> ${escapeHtml(value)}</span>`
    );
  if (!parts.length) return "";
  return `<p class="meta">${parts.join("")}</p>`;
}

function row(inner) {
  return `<li class="row">${inner}</li>`;
}

// An empty screen is an invitation to act, so these say what to do next rather
// than only reporting that there is nothing here.
function emptyState(title, hint) {
  return `
      <div class="empty">
        <p class="empty-title">${escapeHtml(title)}</p>
        <p class="empty-hint">${escapeHtml(hint)}</p>
      </div>`;
}

function list(id, rows, emptyTitle, emptyHint) {
  if (!rows.length) {
    return `<div id="${id}">${emptyState(emptyTitle, emptyHint)}</div>`;
  }
  return `<ul id="${id}" class="grid gap-2">${rows.join("")}</ul>`;
}

function errorFragment(message) {
  return `<div class="alert-error" role="alert">${escapeHtml(message)}</div>`;
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
function enumOptionsMarkup(values) {
  return values
    .map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
    .join("");
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
      <div class="card card-pad">
        <p class="stat-label">${escapeHtml(label)}</p>
        <p class="stat-value">${escapeHtml(value)}</p>
        ${sub ? `<p class="stat-sub">${escapeHtml(sub)}</p>` : ""}
      </div>`;
}

function dashboardFragment(stats) {
  return `
    <div id="dashboard-stats" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      ${statTile("Students", String(stats.students), "enrolled all-time")}
      ${statTile("Batches", String(stats.batches), `${stats.runningBatches} running now`)}
      ${statTile("Courses", String(stats.courses), "in the catalogue")}
      ${statTile("Trainers", String(stats.trainers), "on record")}
      ${statTile("Collected this month", money(stats.monthRevenue), `${stats.monthPayments} receipt(s)`)}
      ${statTile("Outstanding", money(stats.outstanding), "across all enrolments")}
    </div>`;
}

// --- courses -----------------------------------------------------------------

function courseListFragment(courses) {
  const rows = courses.map((c) =>
    row(`
        <div class="flex items-start justify-between gap-3">
          <h3 class="row-title">${escapeHtml(c.title)}</h3>
          <div class="flex shrink-0 items-center gap-1.5">
            ${badge(c.category, "info")}
            ${c.active ? "" : badge("retired", "neutral")}
          </div>
        </div>
        ${metaLine([
          ["Fee", money(c.feeAmount)],
          ["Duration", `${c.durationWeeks} weeks`],
        ])}
        ${
          c.description
            ? `<p class="mt-1.5 text-sm text-muted-foreground">${escapeHtml(c.description)}</p>`
            : ""
        }`)
  );
  return list(
    "course-list",
    rows,
    "No courses yet",
    "Add your first course above -- everything else hangs off the catalogue."
  );
}

// --- trainers ----------------------------------------------------------------

function trainerListFragment(trainers) {
  const rows = trainers.map((t) =>
    row(`
        <div class="flex items-start justify-between gap-3">
          <h3 class="row-title">${escapeHtml(t.name)}</h3>
          ${t.active ? badge("active", "success") : badge("inactive", "neutral")}
        </div>
        ${metaLine([
          ["Phone", t.phone],
          ["Email", t.email],
          ["Teaches", t.expertise],
        ])}`)
  );
  return list(
    "trainer-list",
    rows,
    "No trainers yet",
    "Add a trainer above so you can assign one when opening a batch."
  );
}

// --- batches -----------------------------------------------------------------

// `courseTitles` / `trainerNames` are plain id -> label maps built by the
// feature. Passing lookup maps rather than ids keeps this file free of any
// ability to fetch the missing name itself.
function batchListFragment(batches, courseTitles, trainerNames) {
  const rows = batches.map((b) => {
    const enrolled = b.enrolled ?? 0;
    const full = enrolled >= b.capacity;
    return row(`
        <div class="flex items-start justify-between gap-3">
          <h3 class="row-title">${escapeHtml(b.code)}</h3>
          <div class="flex shrink-0 items-center gap-1.5">
            ${statusBadge(b.status)}
            ${badge(`${enrolled}/${b.capacity} seats`, full ? "warning" : "neutral")}
          </div>
        </div>
        ${metaLine([
          ["Course", courseTitles[b.courseId] ?? "unknown course"],
          ["Trainer", trainerNames[b.trainerId] ?? "unassigned"],
          ["Starts", b.startDate],
          ["Ends", b.endDate],
          ["Meets", b.schedule],
        ])}`);
  });
  return list(
    "batch-list",
    rows,
    "No batches yet",
    "Open a batch above to start enrolling students into a course."
  );
}

// --- students ----------------------------------------------------------------

// Shows the agreed fee but deliberately NOT a per-student dues figure: an exact
// one costs an aggregate query per student (LIST_LIMIT of them for one page
// render), and an approximate one computed from a capped page of receipts would
// quietly go wrong as the institute grows. Dues live where they can be exact --
// per student on the fees screen, institute-wide on the dashboard.
function studentListFragment(students, courseTitles, batchCodes) {
  const rows = students.map((s) =>
    row(`
        <div class="flex items-start justify-between gap-3">
          <h3 class="row-title">${escapeHtml(s.name)}</h3>
          <div class="flex shrink-0 items-center gap-1.5">
            ${statusBadge(s.status)}
            <span class="amount text-sm">${money(s.totalFee)}</span>
          </div>
        </div>
        ${metaLine([
          ["Phone", s.phone],
          ["Course", courseTitles[s.courseId] ?? "unknown course"],
          ["Batch", batchCodes[s.batchId] ?? "unassigned"],
          ["Enrolled", s.enrolledOn],
        ])}`)
  );
  return list(
    "student-list",
    rows,
    "No students yet",
    "Enrol your first student above. You will need a batch with a free seat."
  );
}

// --- attendance --------------------------------------------------------------

// The register. Each student is a checkbox named `mark_<studentId>`, and an
// unchecked box simply does not post -- features/attendance.js treats every
// student in the batch who is missing from the body as absent, which is why it
// re-reads the roster server-side instead of trusting the posted keys.
function rosterFragment({ batchCode, date, students, marks, savedAt }) {
  if (!students.length) {
    return `
      <div id="attendance-roster">
        ${emptyState(
          `Nobody active in ${batchCode}`,
          "Enrol a student into this batch, or check that the batch you picked is the one you meant."
        )}
      </div>`;
  }

  // One predicate for both the checkboxes and the tally. They used to differ --
  // the count tested `=== "present"` while the checkbox tested `!== "absent"` --
  // so a student with no mark yet rendered ticked but was not counted, and a
  // fresh register for four students displayed "1/4 present" above four ticked
  // boxes. Derive both from this and they cannot drift again.
  const isPresent = (s) => marks[s.id] !== "absent"; // an unmarked register defaults to present
  const present = students.filter(isPresent).length;

  const rows = students
    .map(
      (s) => `
        <li>
          <label class="row flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              name="mark_${escapeHtml(s.id)}"
              value="present"
              class="size-4 shrink-0 accent-current"
              ${isPresent(s) ? "checked" : ""}
            />
            <span class="min-w-0 flex-1 truncate text-sm font-medium">${escapeHtml(s.name)}</span>
            <span class="num shrink-0 text-xs text-muted-foreground">${escapeHtml(s.phone)}</span>
          </label>
        </li>`
    )
    .join("");

  return `
    <div id="attendance-roster" class="grid gap-2">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-xs text-muted-foreground">
          <span class="font-medium text-foreground">${escapeHtml(batchCode)}</span>
          &middot; <span class="num">${escapeHtml(date)}</span>
        </p>
        <div class="flex items-center gap-1.5">
          ${badge(
            `${present}/${students.length} present`,
            present === students.length ? "success" : "warning"
          )}
          ${savedAt ? badge("saved", "success") : badge("not saved", "neutral")}
        </div>
      </div>
      <ul class="grid gap-2">${rows}</ul>
    </div>`;
}

// --- payments ----------------------------------------------------------------

function paymentListFragment(payments, studentNames) {
  const rows = payments.map((p) =>
    row(`
        <div class="flex items-start justify-between gap-3">
          <h3 class="row-title">${escapeHtml(studentNames[p.studentId] ?? "unknown student")}</h3>
          <span class="amount">${money(p.amount)}</span>
        </div>
        ${metaLine([
          ["Paid", p.paidOn],
          ["By", p.mode],
          ["Note", p.note],
        ])}`)
  );
  return list(
    "payment-list",
    rows,
    "No receipts yet",
    "Pick a student above to see their receipts, or record the first one."
  );
}

// Before a student is picked. A distinct fragment rather than feeding zeroes
// through the summary below, which would render "no fee agreed" and a full
// meter -- a confident-looking answer to a question nobody asked yet.
function feeSummaryEmptyFragment() {
  return `
    <div id="fee-summary">
      ${emptyState("No student chosen", "Pick a student above to see what they have paid and what is left.")}
    </div>`;
}

// A student's fee position.
//
// The meter is the point of this fragment. "₹45,000 of ₹65,000" is a sentence
// you have to read and compare; the same fact as a filled proportion is
// something you take in at a glance, which is what someone answering "how much
// is left?" over a counter actually needs.
function feeSummaryFragment({ studentName, totalFee, paid }) {
  const due = totalFee - paid;
  const settled = due <= 0;
  const pct = totalFee > 0 ? Math.min(100, Math.round((paid / totalFee) * 100)) : 0;

  return `
    <div id="fee-summary" class="card card-pad">
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <h3 class="row-title">${escapeHtml(studentName)}</h3>
        ${
          settled
            ? badge(totalFee > 0 ? "fees clear" : "no fee agreed", "success")
            : badge(`${money(due)} outstanding`, "warning")
        }
      </div>

      <p class="mt-2 text-sm text-muted-foreground">
        <span class="amount text-base">${money(paid)}</span>
        <span class="meta-label">received of</span>
        <span class="num font-medium text-foreground">${money(totalFee)}</span>
        <span class="meta-label">agreed</span>
      </p>

      <div class="meter" role="img" aria-label="${pct}% of the agreed fee received">
        <div class="meter-fill" style="width:${pct}%" data-over="${paid > totalFee}"></div>
      </div>
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
  feeSummaryEmptyFragment,
};
