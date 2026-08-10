import "../bootstrap.js";
import htmx from "htmx.org";
import { requireUser } from "../services/auth.js";
import { stampEndpoints } from "../services/api.js";
import { resetAfterSave } from "../utils/forms.js";
import "../components/app-header.js";
import "../components/ui-button.js";

// Same shape as entries/courses.js -- guard first, then let htmx take over.
if (await requireUser()) {
  resetAfterSave(document.getElementById("trainer-form"));

  stampEndpoints(document);
  htmx.process(document.body);
}
