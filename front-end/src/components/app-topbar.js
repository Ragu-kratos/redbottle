import { LitElement, html } from "lit";
import { currentUser, onAuthChange, logout } from "../services/auth.js";
import { routeFor } from "../routes.js";
import "./ui-button.js";
import "./ui-alert.js";
import "./ui-theme-toggle.js";

// Persistent top bar: the current screen's heading, connectivity state, theme,
// and sign out. Like the sidebar it survives a boosted screen change and just
// updates its heading from app:navigated.
//
// It renders its full chrome before Auth has resolved a user, on purpose. An
// earlier version returned an empty template while `_user` was null, so the bar
// was 0px tall at first paint and jumped to full height a beat later, shoving
// the page down (a measured CLS of 0.27, in production as well as dev). Every
// screen carrying this is behind requireUser(), so a user is guaranteed to
// arrive; only the email depends on it, and it holds its line with a
// non-breaking space so nothing moves when the address lands.
export class AppTopbar extends LitElement {
  static properties = {
    _user: { state: true },
    _online: { state: true },
    _authError: { state: true },
    _route: { state: true },
  };

  createRenderRoot() {
    return this;
  }

  constructor() {
    super();
    this._user = currentUser();
    this._online = navigator.onLine;
    this._authError = null;
    this._route = routeFor();
  }

  connectedCallback() {
    super.connectedCallback();
    this._unsubscribeAuth = onAuthChange((user) => {
      this._user = user;
      if (user) this._authError = null;
    });
    document.body.addEventListener("app:auth-error", this._onAuthError);
    document.body.addEventListener("app:navigated", this._onNavigated);
    window.addEventListener("online", this._onOnline);
    window.addEventListener("offline", this._onOffline);
  }

  disconnectedCallback() {
    this._unsubscribeAuth?.();
    document.body.removeEventListener("app:auth-error", this._onAuthError);
    document.body.removeEventListener("app:navigated", this._onNavigated);
    window.removeEventListener("online", this._onOnline);
    window.removeEventListener("offline", this._onOffline);
    super.disconnectedCallback();
  }

  _onAuthError = (e) => {
    this._authError = e.detail.code;
  };

  _onNavigated = () => {
    this._route = routeFor();
  };

  _onOnline = () => {
    this._online = true;
  };

  _onOffline = () => {
    this._online = false;
  };

  async _signOut() {
    await logout();
    location.assign("/login");
  }

  render() {
    return html`
      <div
        class="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur-sm"
      >
        <button
          type="button"
          class="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground lg:hidden"
          aria-label="Open navigation"
          @click=${() =>
            document.body.dispatchEvent(new CustomEvent("app:nav-toggle", { bubbles: true }))}
        >
          <svg
            class="size-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <path d="M3 6h18" />
            <path d="M3 12h18" />
            <path d="M3 18h18" />
          </svg>
        </button>

        <h1 class="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight">
          ${this._route?.title ?? "RedBottle Institute"}
        </h1>

        ${!this._online
          ? html`<ui-alert variant="warning" .message=${"Offline"}></ui-alert>`
          : ""}
        ${this._authError === "auth/network-request-failed"
          ? html`<ui-alert
              variant="warning"
              .message=${"Reconnect to refresh your session"}
            ></ui-alert>`
          : ""}

        <ui-theme-toggle></ui-theme-toggle>

        <span class="hidden max-w-[14rem] truncate text-xs text-muted-foreground sm:block"
          >${this._user?.email ?? " "}</span
        >
        <ui-button size="sm" variant="outline" @click=${this._signOut}>Sign out</ui-button>
      </div>
    `;
  }
}
customElements.define("app-topbar", AppTopbar);
