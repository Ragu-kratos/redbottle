import { LitElement, html } from "lit";

// Confirmation that a save actually happened.
//
// Before this, saving re-rendered the list and nothing else: on a screen where
// the new row lands below the fold, or where the row looks much like its
// neighbours, there was no signal that the click had worked at all. The one
// place a save is unambiguous is right where the button was.
//
// Fired by a plain event so nothing needs a reference to this element:
//   document.body.dispatchEvent(new CustomEvent("app:toast", {
//     detail: { message: "Student enrolled" }, bubbles: true }))
const DEFAULT_MS = 3200;

export class UiToasts extends LitElement {
  static properties = { _items: { state: true } };

  createRenderRoot() {
    return this;
  }

  constructor() {
    super();
    this._items = [];
    this._seq = 0;
  }

  connectedCallback() {
    super.connectedCallback();
    document.body.addEventListener("app:toast", this._onToast);
  }

  disconnectedCallback() {
    document.body.removeEventListener("app:toast", this._onToast);
    super.disconnectedCallback();
  }

  _onToast = (e) => {
    const id = ++this._seq;
    const message = e.detail?.message;
    if (!message) return;
    this._items = [...this._items, { id, message }];
    setTimeout(() => {
      this._items = this._items.filter((t) => t.id !== id);
    }, e.detail?.duration ?? DEFAULT_MS);
  };

  render() {
    return html`
      <!-- aria-live so the confirmation reaches a screen reader too, and
           pointer-events-none on the stack so a toast never swallows a click
           meant for the form underneath it. -->
      <div
        class="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2"
        role="status"
        aria-live="polite"
      >
        ${this._items.map(
          (t) => html`
            <div class="toast">
              <svg
                class="size-4 shrink-0 text-success-foreground"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.25"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
              <span>${t.message}</span>
            </div>
          `
        )}
      </div>
    `;
  }
}
customElements.define("ui-toasts", UiToasts);
