import "../bootstrap.js";
import htmx from "htmx.org";
import { requireUser } from "../services/auth.js";
import { stampEndpoints } from "../services/api.js";
import { resetAfterSave } from "../utils/forms.js";
import "../components/app-header.js";
import "../components/ui-button.js";

// Resolve the guard before touching any hx-* markup, so a signed-out visitor
// is redirected to /login before the courses request ever fires.
if (await requireUser()) {
  resetAfterSave(document.getElementById("course-form"));

  stampEndpoints(document); // [data-api="courses"] on the Refresh button -> hx-get
  htmx.process(document.body); // fires hx-trigger="load" on the list slot and each <select>
}
