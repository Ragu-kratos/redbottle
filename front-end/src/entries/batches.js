import "../bootstrap.js";
import htmx from "htmx.org";
import { requireUser } from "../services/auth.js";
import { stampEndpoints } from "../services/api.js";
import { resetAfterSave, prefillDates } from "../utils/forms.js";
import "../components/app-header.js";
import "../components/ui-button.js";

// Guard, prefill the date inputs, then hand off to htmx.
if (await requireUser()) {
  resetAfterSave(document.getElementById("batch-form"));

  // Before htmx.process(): a load-triggered request that includes a date field
  // must not send an empty string.
  prefillDates(document);

  stampEndpoints(document);
  htmx.process(document.body);
}
