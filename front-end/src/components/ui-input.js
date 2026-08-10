import { LitElement, html } from "lit";

let nextId = 0;

// Light DOM, no shadow root -- a native "input" event on the inner <input>
// bubbles straight through to whatever listens on <ui-input> itself (no
// shadow-DOM retargeting), so consumers can bind @input directly on the
// host and read e.target.value exactly like a plain inline <input>.
export class UiInput extends LitElement {
  static properties = {
    label: { type: String },
    type: { type: String },
    autocomplete: { type: String },
    required: { type: Boolean },
    value: { type: String },
  };

  createRenderRoot() {
    return this;
  }

  constructor() {
    super();
    this.label = "";
    this.type = "text";
    this.autocomplete = "off";
    this.required = false;
    this.value = "";
    this._id = `ui-input-${++nextId}`;
  }

  render() {
    return html`
      <label class="mb-3 block text-sm" for=${this._id}>
        <span class="mb-1 block text-slate-600">${this.label}</span>
        <input
          id=${this._id}
          type=${this.type}
          ?required=${this.required}
          autocomplete=${this.autocomplete}
          class="w-full rounded border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
          .value=${this.value}
        />
      </label>
    `;
  }
}
customElements.define("ui-input", UiInput);
