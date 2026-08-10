import "../bootstrap.js";
import { bootScreen } from "../screen.js";

// Every signed-in screen's entry is this same delegation, on purpose. Navigation
// is boosted, so a screen change swaps #page without loading a document -- a
// module here would run only on the first visit to this screen and never again.
// The re-runnable setup therefore lives in screen.js, which routes.js maps to
// this screen by pathname.
//
// The file still exists per screen because it is this document's script tag, and
// the structure audit checks screens and entries stay one-to-one.
await bootScreen();
