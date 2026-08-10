"use strict";

// Turns a list of `{ id, ... }` rows into an id -> label map.
//
// Lives in utils/ rather than in one feature because several features need it
// (batches label their course and trainer, students their course and batch,
// payments their student). Putting it in the first feature that needed it and
// importing it from the next would make features depend on each other, which
// the layering law does not allow -- features may only reach into services/
// and utils/.
function labelMap(rows, field) {
  return Object.fromEntries(rows.map((row) => [row.id, row[field]]));
}

module.exports = { labelMap };
