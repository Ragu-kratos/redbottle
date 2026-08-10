import { LitElement, html } from "lit";

const SIZE_CLASSES = {
  xs: "h-7 gap-1.5 px-2.5 text-xs",
  sm: "h-8 gap-1.5 px-3 text-[0.8125rem]",
  md: "h-9 gap-2 px-4 text-sm",
};

// Every variant maps to semantic tokens rather than a palette shade, so the
// whole set flips with the theme without a single `dark:` class.
const VARIANT_CLASSES = {
  primary: "bg-primary text-primary-foreground hover:opacity-90",
  outline: "border bg-card text-foreground hover:bg-accent hover:text-accent-foreground",
  ghost: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
  destructive: "bg-destructive text-destructive-foreground hover:opacity-90",
};

// Light DOM, no shadow root -- required so any hx-*/data-* attributes authored
// on <ui-button> in a screen are visible to htmx's DOM scan, and so a click on
// the inner <button> bubbles straight up to whatever @click or hx-post listener
// is attached to the host (no shadow retargeting).
//
// Layout utilities like flex-1 belong on the host itself (the flex item), via a
// plain class="..." attribute -- Lit leaves that alone.
export class UiButton extends LitElement {
  static properties = {
    variant: { type: String },
    size: { type: String },
    type: { type: String },
    disabled: { type: Boolean, reflect: true },
    // Stretches the inner <button> to the host's width. The host is display:block
    // so it already fills its container, but the button inside hugs its label --
    // which is right inline and wrong in a grid of equal-width actions.
    full: { type: Boolean },
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
    this.full = false;
    // Capture the element's declarative light-DOM text (its label) before Lit's
    // first render appends the inner <button> -- otherwise the raw text node and
    // the rendered button would both show up.
    //
    // This means the label is read ONCE, at upgrade. A static label written in
    // markup is present by then and works; a label bound from a parent Lit
    // template (`>${this._busy ? "Saving…" : "Save"}<`) is filled in after the
    // upgrade and would be captured empty. Use `disabled` for busy state, or give
    // this component a real reactive `label` property first.
    this._label = this.textContent.trim();
    this.textContent = "";
  }

  render() {
    const classes = [
      // Content-width, not w-full: the host is display:block and fills its
      // container, but the button inside should hug its label the way every
      // other control here does.
      "inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors",
      "disabled:pointer-events-none disabled:opacity-50",
      SIZE_CLASSES[this.size] ?? SIZE_CLASSES.md,
      VARIANT_CLASSES[this.variant] ?? VARIANT_CLASSES.outline,
      this.full ? "w-full" : "",
    ].join(" ");
    return html`
      <button type=${this.type} class=${classes} ?disabled=${this.disabled}>
        ${this._label}
      </button>
    `;
  }
}
customElements.define("ui-button", UiButton);
