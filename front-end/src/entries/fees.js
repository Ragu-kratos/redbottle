import "../bootstrap.js";
import htmx from "htmx.org";
import { requireUser } from "../services/auth.js";
import { resetAfterSave, prefillDates } from "../utils/forms.js";
import "../components/app-header.js";
import "../components/ui-button.js";

if (await requireUser()) {
  const form = document.getElementById("payment-form");

  // Keep the student and the date: the next thing entered after one receipt is
  // usually another instalment for the same student on the same day, and
  // clearing the student would also blank the two panels below, which are
  // driven by that <select>.
  resetAfterSave(form, { keep: ["studentId", "paidOn"] });

  // The POST refreshes the receipt list (it targets #payments-slot), but the
  // totals panel is a separate slot with its own request, so nudge it.
  form.addEventListener("htmx:afterRequest", (evt) => {
    if (evt.detail.successful) htmx.trigger("#fee-summary-slot", "reload");
  });

  prefillDates(document);

  htmx.process(document.body);
}
