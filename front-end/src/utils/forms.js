// Small glue between a plain <form hx-post> and the things every "add a
// record" form on these screens wants after a save.
//
// Lives in JS rather than as an `hx-on::after-request="..."` attribute in the
// screen markup: the reset-but-keep-some-fields behaviour below is more than a
// one-liner, and inline handlers repeated across six screens are the kind of
// thing that drifts.

// Clears the form once htmx reports a successful POST, so the next record can
// be typed straight away. Fields named in `keep` hold their value -- on the
// fees screen the selected student and the payment date should survive
// recording a receipt, because the next thing entered is usually another
// instalment for the same student.
//
// `successful` is false for the server's 400s, which is deliberate: a rejected
// submission must keep what was typed, or the user retypes the whole form to
// fix one field.
export function resetAfterSave(form, { keep = [] } = {}) {
  form.addEventListener("htmx:afterRequest", (evt) => {
    // Only the form's OWN request (its hx-post) may reset it. htmx:afterRequest
    // bubbles, and every <select> in these forms loads its <option>s with its
    // own hx-get -- so without this guard the options arriving would count as a
    // successful save and wipe the form. That really happened: it silently
    // cleared the date that prefillDates had just written, leaving enrolment
    // blocked by `required` with nothing on screen to explain why. It would
    // also have thrown away anything the user had already typed.
    if ((evt.detail.elt ?? evt.target) !== form) return;

    if (!evt.detail.successful) return;

    const preserved = keep.map((name) => [name, form.elements[name]?.value]);
    form.reset();
    for (const [name, value] of preserved) {
      const field = form.elements[name];
      if (field && value !== undefined) field.value = value;
    }
  });
}

// Today as "YYYY-MM-DD" in the browser's own timezone -- the format an
// <input type="date"> expects as a value. Uses en-CA purely because its short
// date format is ISO; toISOString() would be UTC and so wrong for the last
// hours of an Indian working day (the server has the same problem, solved the
// same way -- see functions/libs/utils/clock.js).
export function todayIso() {
  return new Date().toLocaleDateString("en-CA");
}

// Prefills every empty <input type="date"> in `root` with today. Runs before
// htmx.process() in each entry, so a load-triggered request that includes a
// date field sends a real date rather than an empty string.
export function prefillDates(root = document) {
  root.querySelectorAll('input[type="date"]').forEach((input) => {
    if (!input.value) input.value = todayIso();
  });
}
