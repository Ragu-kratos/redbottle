"use strict";

// Formalizes err.status / err.userMessage decoration for errors crossing a
// layer boundary: err.status is the HTTP code to respond with, err.userMessage
// is the safe copy shown to the client -- internal detail (stack, validation
// errors) never leaks into the response body.
function httpError(status, userMessage, cause) {
  const err = new Error(userMessage);
  err.status = status;
  err.userMessage = userMessage;
  if (cause) err.cause = cause;
  return err;
}

module.exports = { httpError };
