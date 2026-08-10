"use strict";

// Thin entrypoint -- everything real lives under endpoints/, which owns the
// mapping from directory to deployed function group. Kept as a single
// codebase (firebase.json `"codebase": "default"`) so all groups share one
// functions/package.json / node_modules instead of each needing its own.
module.exports = require("./endpoints");
