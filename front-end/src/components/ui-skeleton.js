import { LitElement, html } from "lit";

// Placeholder rows shaped like the list that is loading, used as the initial
// content of an htmx slot so the first swap replaces it.
//
// This is a layout device as much as a loading affordance: a bare "Loading…"
// line is one line tall, so when three rows of real content arrive the page
// jumps. Skeleton rows reserve roughly the right height up front, which is why
// they are sized in the same units as a `.row`.
export class UiSkeleton extends LitElement {
  static properties = { rows: { type: Number } };

  createRenderRoot() {
    return this;
  }

  constructor() {
    super();
    this.rows = 3;
  }

  render() {
    return html`
      <div class="grid gap-2" aria-hidden="true">
        ${Array.from({ length: this.rows }, () => html`<div class="skeleton h-[4.25rem] w-full"></div>`)}
      </div>
    `;
  }
}
customElements.define("ui-skeleton", UiSkeleton);
