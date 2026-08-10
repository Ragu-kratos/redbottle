import { LitElement, html } from "lit";
import { signIn, signUp, AUTH_ERROR_MESSAGES } from "../services/auth.js";
import "./ui-input.js";
import "./ui-button.js";
import "./ui-alert.js";

export class LoginForm extends LitElement {
  static properties = {
    _email: { state: true },
    _password: { state: true },
    _error: { state: true },
    _busy: { state: true },
  };

  // Light DOM: static styles are silently ignored here (adoptStyles is only
  // called by the super implementation) -- Tailwind utility classes still
  // resolve fine because they come from the global stylesheet.
  createRenderRoot() {
    return this;
  }

  constructor() {
    super();
    this._email = "";
    this._password = "";
    this._error = null;
    this._busy = false;
  }

  _updateField(prop) {
    return (e) => {
      this[prop] = e.target.value;
    };
  }

  async _submit(mode) {
    if (this._busy) return;
    this._error = null;
    this._busy = true;
    try {
      if (mode === "signup") {
        await signUp(this._email, this._password);
      } else {
        await signIn(this._email, this._password);
      }
      location.assign("/home");
    } catch (err) {
      this._error = AUTH_ERROR_MESSAGES[err.code] ?? `Something went wrong (${err.code ?? err.message}).`;
    } finally {
      this._busy = false;
    }
  }

  render() {
    return html`
      <form
        class="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        @submit=${(e) => e.preventDefault()}
      >
        <h2 class="mb-4 text-xl font-semibold">Sign in</h2>

        ${this._error ? html`<ui-alert variant="error" .message=${this._error}></ui-alert>` : ""}

        <ui-input
          label="Email"
          type="email"
          required
          autocomplete="email"
          .value=${this._email}
          @input=${this._updateField("_email")}
        ></ui-input>

        <ui-input
          label="Password"
          type="password"
          required
          autocomplete="current-password"
          .value=${this._password}
          @input=${this._updateField("_password")}
        ></ui-input>

        <div class="mt-1 flex gap-2">
          <ui-button
            class="flex-1"
            variant="primary"
            type="submit"
            ?disabled=${this._busy}
            @click=${() => this._submit("signin")}
          >
            Sign in
          </ui-button>
          <ui-button
            class="flex-1"
            variant="outline"
            ?disabled=${this._busy}
            @click=${() => this._submit("signup")}
          >
            Create account
          </ui-button>
        </div>

        <p class="mt-3 text-xs text-slate-400">
          Emulator-only auth -- accounts do not persist across emulator restarts.
        </p>
      </form>
    `;
  }
}
customElements.define("login-form", LoginForm);
