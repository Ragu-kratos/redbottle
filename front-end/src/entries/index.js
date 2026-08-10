import "../bootstrap.js";
import { ready, currentUser } from "../services/auth.js";

// The root screen just routes to the right place once Auth's persisted
// state has settled -- it renders no content of its own.
await ready();
location.replace(currentUser() ? "/home" : "/login");
