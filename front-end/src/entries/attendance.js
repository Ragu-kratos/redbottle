import "../bootstrap.js";
import htmx from "htmx.org";
import { requireUser } from "../services/auth.js";
import { prefillDates } from "../utils/forms.js";
import "../components/app-header.js";
import "../components/ui-button.js";

// No form on this screen, so no resetAfterSave and no [data-api] elements to
// stamp: the batch <select>, the roster GET and the save POST all spell their
// URLs out statically in attendance.html.
if (await requireUser()) {
  // Must run before htmx.process(): the register is loaded by a change on the
  // controls, and that request includes the date field -- which has to already
  // hold today rather than an empty string.
  prefillDates(document);

  htmx.process(document.body);
}
