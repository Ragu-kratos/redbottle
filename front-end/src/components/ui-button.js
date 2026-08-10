import { LitElement, html } from "lit";

const SIZE_CLASSES = {
  xs: "px-2 py-1 text-xs",
  sm: "px-3 py-1.5 text-sm",
  md: "px-3 py-2 text-sm font-medium",
};

const VARIANT_CLASSES = {
  primary: "bg-slate-900 text-white hover:bg-slate-800",
  outline: "border border-slate-300 hover:bg-slate-100",
};

// Light DOM, no shadow root -- required so any hx-*/data-* attributes
// authored on <ui-button> in a screen are visible to htmx's DOM scan, and so
// a click on the inner <button> bubbles straight up to whatever @click or
// hx-get listener is attached to the host (no shadow retargeting).
//
// Layout utilities like flex-1 belong on the host itself (the flex item),
// via a plain class="..." attribute -- Lit leaves that alone.
export class UiButton extends LitElement {
  static properties = {
    variant: { type: String },
    size: { type: String },
    type: { type: String },
    disabled: { type: Boolean, reflect: true },
  };

  createRenderRoot() {
    return this;
  }

  constructor() {
    super();
    this.variant = "outline";
    this.size = "md";
    this.type = "button";
    this.disabled = false;
    // Capture the element's declarative light-DOM text (its label) before
    // Lit's first render appends the inner <button> -- otherwise the raw
    // text node and the rendered button would both show up.
    this._label = this.textContent.trim();
    this.textContent = "";
  }

  render() {
    const classes = [
      "rounded disabled:opacity-50",
      SIZE_CLASSES[this.size] ?? SIZE_CLASSES.md,
      VARIANT_CLASSES[this.variant] ?? VARIANT_CLASSES.outline,
    ].join(" ");
    return html`
      <button type=${this.type} class=${classes} ?disabled=${this.disabled}>${this._label}</button>
    `;
  }
}
customElements.define("ui-button", UiButton);
