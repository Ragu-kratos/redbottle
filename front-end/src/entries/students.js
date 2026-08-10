import "../bootstrap.js";
import htmx from "htmx.org";
import { requireUser } from "../services/auth.js";
import { stampEndpoints } from "../services/api.js";
import { resetAfterSave, prefillDates } from "../utils/forms.js";
import "../components/app-header.js";
import "../components/ui-button.js";

// Guard, prefill the enrolment date, then hand off to htmx.
if (await requireUser()) {
  // Keep the enrolment date across a save: the front office enrols several
  // students in one sitting, and a plain reset would clear the date that
  // prefillDates wrote, leaving the next submit blocked by `required` with
  // nothing on screen explaining why.
  resetAfterSave(document.getElementById("student-form"), { keep: ["enrolledOn"] });

  prefillDates(document);

  stampEndpoints(document);
  htmx.process(document.body);
}
