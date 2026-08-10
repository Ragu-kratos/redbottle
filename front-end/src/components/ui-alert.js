import { LitElement, html } from "lit";

// Two shapes share one component: an "error" alert is a block-level message
// (login-form's validation errors); a "warning" is an inline status chip
// (the top bar's offline / reconnect notices). Unlike ui-button's label, the
// message is a genuine reactive property rather than captured light-DOM text,
// since these messages change after first render.
const VARIANTS = {
  error: { tag: "p", class: "alert-error mb-3" },
  warning: { tag: "span", class: "badge badge-warning" },
};

export class UiAlert extends LitElement {
  static properties = {
    variant: { type: String },
    message: { type: String },
  };

  createRenderRoot() {
    return this;
  }

  constructor() {
    super();
    this.variant = "warning";
    this.message = "";
  }

  render() {
    const { tag, class: cls } = VARIANTS[this.variant] ?? VARIANTS.warning;
    return tag === "p"
      ? html`<p class=${cls} role="alert">${this.message}</p>`
      : html`<span class=${cls}>${this.message}</span>`;
  }
}
customElements.define("ui-alert", UiAlert);
