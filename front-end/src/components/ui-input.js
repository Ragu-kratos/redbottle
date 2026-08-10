import { LitElement, html } from "lit";

let nextId = 0;

// Light DOM, no shadow root -- a native "input" event on the inner <input>
// bubbles straight through to whatever listens on <ui-input> itself (no
// shadow-DOM retargeting), so consumers can bind @input directly on the host
// and read e.target.value exactly like a plain inline <input>.
//
// Only the sign-in form uses this. Everywhere else the screens author plain
// <input class="control"> inside a <form hx-post>, because htmx serialises a
// form from the real DOM controls within it and each field needs a genuine
// `name` -- see the .field/.control classes in styles/index.css.
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
      <label class="field" for=${this._id}>
        <span>${this.label}</span>
        <input
          id=${this._id}
          class="control"
          type=${this.type}
          ?required=${this.required}
          autocomplete=${this.autocomplete}
          .value=${this.value}
        />
      </label>
    `;
  }
}
customElements.define("ui-input", UiInput);
