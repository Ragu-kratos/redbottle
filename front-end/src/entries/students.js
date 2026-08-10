import "../bootstrap.js";
import htmx from "htmx.org";
import { requireUser } from "../services/auth.js";
import { stampEndpoints } from "../services/api.js";
import { resetAfterSave, prefillDates } from "../utils/forms.js";
import "../components/app-header.js";
import "../components/ui-button.js";

// Guard, prefill the enrolment date, then hand off to htmx.
if (await requireUser()) {
  resetAfterSave(document.getElementById("student-form"));

  prefillDates(document);

  stampEndpoints(document);
  htmx.process(document.body);
}
