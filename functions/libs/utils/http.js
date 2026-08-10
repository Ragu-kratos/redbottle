"use strict";

// Turns a `{ "GET /courses": fn }` route table into an Express-style handler,
// applying the four things every endpoint in this app must do identically:
// CORS, no-store, "there must be a verified user", and mapping a thrown error
// to a status plus a safe HTML fragment.
//
// Written as one helper rather than copied into each endpoint file because
// there are eight of them: the first time that error mapping needs a fix (for
// instance, to stop a 400 from being reported as a 500), a copy-pasted version
// means finding all eight and missing one. Endpoint files keep only what is
// genuinely per-endpoint -- their route table.
//
// `errorHtml` is injected rather than imported: this file is in utils/, the
// bottom layer, and reaching up into services/renderer.js from here would
// invert the one-directional dependency the layering law exists to protect.
const logger = require("firebase-functions/logger");
const { applyCors } = require("./cors");
const { requireUser } = require("./auth");

function htmlRoutes({ name, errorHtml, routes }) {
  return async function handle(req, res) {
    // No `cors` key on the onRequest options on purpose -- see utils/cors.js.
    if (applyCors(req, res)) return;

    // Fee figures and attendance registers must never come from a stale cache
    // after a colleague has edited them.
    res.set("Cache-Control", "no-store");

    let user;
    try {
      user = await requireUser(req);
    } catch (err) {
      res.status(err.status || 401).type("html").send(errorHtml(err.userMessage));
      return;
    }

    const route = routes[`${req.method} ${req.path}`];
    if (!route) {
      res.status(404).type("html").send(errorHtml("Not found."));
      return;
    }

    try {
      // One params object for both shapes: a GET arrives with a query string,
      // a POST with a urlencoded body, and no feature should have to care
      // which. Body wins on a collision, since that is the deliberate payload.
      const params = { ...req.query, ...req.body };
      res.status(200).type("html").send(await route(params, user));
    } catch (err) {
      // An error carrying userMessage was raised deliberately by a feature (a
      // full batch, a bad date) and its copy is safe to show. Anything else is
      // a bug: log it whole, and tell the client nothing about it.
      if (err.userMessage) {
        res.status(err.status || 400).type("html").send(errorHtml(err.userMessage));
        return;
      }
      logger.error(`${name} handler failed`, err);
      res.status(500).type("html").send(errorHtml("Something went wrong."));
    }
  };
}

module.exports = { htmlRoutes };
