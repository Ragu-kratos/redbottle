import htmx from "htmx.org";
import { requireUser } from "./services/auth.js";
import { stampEndpoints } from "./services/api.js";
import { resetAfterSave, prefillDates } from "./utils/forms.js";
import { routeFor } from "./routes.js";
import "./components/app-sidebar.js";
import "./components/app-topbar.js";
import "./components/ui-button.js";
import "./components/ui-skeleton.js";
import "./components/ui-toasts.js";

// One controller for every signed-in screen.
//
// Why this is shared rather than one script per screen: navigation is boosted,
// so a screen change swaps #page and never loads a new document. A per-screen
// entry module would therefore run only on the first visit to that screen --
// and never again, because ES modules execute once per URL. Setup has to be
// re-runnable on every swap, so it lives here and is invoked both by the entry
// (for a direct load or a refresh) and by the htmx:afterSettle hook below.
//
// Per-screen entries still exist and stay one-per-screen: they are the document's
// script tag, and the structure audit checks screens and entries line up.

// Screen-specific setup, keyed by the route ids in routes.js. Anything shared by
// every screen (date prefill, endpoint stamping, htmx processing) is done once in
// applyScreen instead of being repeated per entry.
const SETUP = {
  students: () =>
    // Keep the enrolment date across a save: the front desk enrols several
    // students in one sitting, and a plain reset would clear the date that
    // prefillDates wrote, leaving the next submit blocked by `required` with
    // nothing on screen to explain why.
    wireForm("student-form", { keep: ["enrolledOn"] }),

  batches: () =>
    // Consecutive batches are usually opened with the same start date.
    wireForm("batch-form", { keep: ["startDate"] }),

  courses: () => wireForm("course-form"),
  trainers: () => wireForm("trainer-form"),

  fees: () => {
    // Keep the student and the date: the next thing entered after a receipt is
    // usually another instalment for the same student, and clearing the student
    // would also blank the two panels below, which are driven by that <select>.
    const form = wireForm("payment-form", { keep: ["studentId", "paidOn"] });
    if (!form) return;

    // The POST refreshes the receipt list (it targets #payments-slot), but the
    // totals panel is a separate slot with its own request, so nudge it.
    //
    // Guarded on the originating element for the same reason resetAfterSave is:
    // htmx:afterRequest bubbles, and the student and mode <select>s in this form
    // each load their own options -- without the guard the summary would reload
    // on those too, before a student is even chosen.
    form.addEventListener("htmx:afterRequest", (evt) => {
      if ((evt.detail.elt ?? evt.target) !== form) return;
      if (evt.detail.successful) htmx.trigger("#fee-summary-slot", "reload");
    });
  },

  attendance: () => {
    // Bulk marking. A trainer reporting a full class should not tick twenty
    // boxes, and the roster arrives from the server, so this is delegated from
    // the panel rather than bound to the checkboxes themselves.
    const panel = document.getElementById("attendance-panel");
    if (!panel || panel.dataset.wired === "true") return;
    panel.dataset.wired = "true";

    panel.addEventListener("click", (evt) => {
      const action = evt.target.closest("[data-mark-all]")?.dataset.markAll;
      if (!action) return;
      const boxes = document.querySelectorAll('#roster-slot input[type="checkbox"]');
      boxes.forEach((box) => {
        box.checked = action === "present";
      });
      // Nothing is saved until Save attendance is pressed, so say what this did
      // rather than implying a write happened.
      toast(`${boxes.length} marked ${action} — not saved yet`);
    });
  },
};

// Attaches the shared save behaviour to a form, once. Idempotent because a
// boosted swap re-runs setup and the same node may already be wired.
function wireForm(id, options = {}) {
  const form = document.getElementById(id);
  if (!form || form.dataset.wired === "true") return form ?? null;
  form.dataset.wired = "true";
  resetAfterSave(form, options);
  return form;
}

export function toast(message) {
  document.body.dispatchEvent(
    new CustomEvent("app:toast", { detail: { message }, bubbles: true })
  );
}

// Runs the setup for whatever screen is currently in #page, then lets htmx
// process it. Safe to call repeatedly.
async function applyScreen() {
  const route = routeFor();

  // Fill empty date inputs before htmx.process: a load-triggered request that
  // includes a date field must not send an empty string.
  prefillDates(document);

  SETUP[route?.id]?.();

  // Wait for the persistent shell to have rendered before processing, or the
  // sidebar's boosted links do not exist yet and the first navigation falls
  // through to a full document load.
  await Promise.all(
    [...document.querySelectorAll("app-sidebar, app-topbar")]
      .map((el) => el.updateComplete)
      .filter(Boolean)
  );

  stampEndpoints(document); // [data-api="..."] on the Refresh buttons -> hx-get
  htmx.process(document.body); // fires hx-trigger="load" in the swapped content

  document.body.dispatchEvent(new CustomEvent("app:navigated", { bubbles: true }));
}

// Called by every signed-in screen's entry. Resolves the auth guard before
// touching any hx-* markup, so a signed-out visitor is redirected to /login
// before a single data request fires.
export async function bootScreen() {
  if (!(await requireUser())) return;
  await applyScreen();
}

// Boosted navigation: htmx has swapped #page, so re-run setup for the screen
// that just arrived. Registered once, on the document, because #page itself is
// replaced by every swap.
//
// htmx processes swapped content itself, so this is about the JS the new screen
// needs, not about hx-* attributes.
let hooked = false;
export function installNavigationHooks() {
  if (hooked) return;
  hooked = true;

  document.body.addEventListener("htmx:afterSettle", (evt) => {
    // Only for a #page swap. Every list fragment swap also settles, and re-running
    // screen setup on each of those would be wasted work.
    if (evt.detail?.target?.id !== "page") return;
    applyScreen();
  });

  // A boosted navigation is a fetch, so the browser shows no progress of its
  // own -- a slow screen change would look like a click that did nothing.
  document.body.addEventListener("htmx:beforeRequest", (evt) => {
    if (evt.detail?.boosted) document.body.classList.add("is-navigating");
  });
  const settle = () => document.body.classList.remove("is-navigating");
  document.body.addEventListener("htmx:afterOnLoad", settle);
  document.body.addEventListener("htmx:responseError", settle);
  document.body.addEventListener("htmx:sendError", settle);

  // The browser restores scroll on a real back/forward, but a boosted history
  // entry is restored by htmx swapping #page back in -- which needs the same
  // screen setup as a forward navigation.
  window.addEventListener("popstate", () => {
    requestAnimationFrame(() => applyScreen());
  });
}
