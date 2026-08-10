"use strict";

// Reads and coerces urlencoded form fields off an Express body, throwing
// httpError(400, <copy a receptionist can act on>) when a field is wrong.
//
// This exists so features/ never hand-writes `if (!body.name) throw ...` and
// never passes a raw string into a field the model types as an integer. It is
// the *user-facing* validation pass; models/index.js's assertValid is the
// backstop that catches anything this missed at the write boundary.
//
// Zero domain knowledge on purpose (hence utils/, not services/): it knows
// about strings, integers, dates and allowed-value lists, never about
// students or fees.
const { httpError } = require("./errors");

// htmx posts every form field as a string; a field the user left alone
// arrives as "" rather than absent.
function raw(body, key) {
  const value = body?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function text(body, key, label, { required = true, max = 200 } = {}) {
  const value = raw(body, key);
  if (!value) {
    if (required) throw httpError(400, `${label} is required.`);
    return "";
  }
  if (value.length > max) {
    throw httpError(400, `${label} must be ${max} characters or fewer.`);
  }
  return value;
}

// Rupees. Rejects decimals rather than rounding them: silently turning ₹1500.50
// into ₹1500 or ₹1501 is a discrepancy nobody can trace back to a typo.
function integer(body, key, label, { required = true, min = 0, max = 100000000 } = {}) {
  const value = raw(body, key);
  if (!value) {
    if (required) throw httpError(400, `${label} is required.`);
    return 0;
  }
  if (!/^-?\d+$/.test(value)) {
    throw httpError(400, `${label} must be a whole number (no decimals or symbols).`);
  }
  const n = Number(value);
  if (n < min || n > max) {
    throw httpError(400, `${label} must be between ${min} and ${max}.`);
  }
  return n;
}

// "YYYY-MM-DD", the value an <input type="date"> submits. Also rejects an
// impossible day (2026-02-31) that the regex alone would accept.
function date(body, key, label, { required = true } = {}) {
  const value = raw(body, key);
  if (!value) {
    if (required) throw httpError(400, `${label} is required.`);
    return "";
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw httpError(400, `${label} must be a date.`);
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw httpError(400, `${label} is not a real date.`);
  }
  return value;
}

// One of a closed vocabulary from utils/config.js. Lists the options in the
// error, since a bad value here means a tampered or stale <select>.
function choice(body, key, label, allowed, { required = true, fallback = "" } = {}) {
  const value = raw(body, key);
  if (!value) {
    if (required) throw httpError(400, `${label} is required.`);
    return fallback;
  }
  if (!allowed.includes(value)) {
    throw httpError(400, `${label} must be one of: ${allowed.join(", ")}.`);
  }
  return value;
}

// An unchecked checkbox does not post at all, so absence means false -- never
// treat a missing key here as a validation failure.
function checkbox(body, key) {
  return raw(body, key) !== "";
}

module.exports = { text, integer, date, choice, checkbox };
