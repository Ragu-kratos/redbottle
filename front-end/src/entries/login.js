import "../bootstrap.js";
import { requireAnonymous } from "../services/auth.js";
import "../components/login-form.js";

// A signed-in visitor to /login is redirected to /home before this screen
// ever renders its content.
await requireAnonymous();
