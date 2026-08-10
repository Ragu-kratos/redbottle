import { LitElement, html } from "lit";
import { currentUser, onAuthChange, logout } from "../services/auth.js";
import "./ui-button.js";
import "./ui-alert.js";

// The signed-in shell's header: title, module navigation, current user's
// email, an offline badge, a "reconnect" badge for a stale token, and sign
// out. Each screen's entry (see entries/home.js) already ran requireUser()
// before this upgrades, so a user is expected to be present here.
//
// Navigation is plain <a href> to real documents, not client-side routing --
// this is a multi-page app (vite.config.js `appType: "mpa"`), and each module
// is its own document with its own entry script.
const NAV = [
  { href: "/home", label: "Dashboard" },
  { href: "/students", label: "Students" },
  { href: "/batches", label: "Batches" },
  { href: "/attendance", label: "Attendance" },
  { href: "/fees", label: "Fees" },
  { href: "/courses", label: "Courses" },
  { href: "/trainers", label: "Trainers" },
];

export class AppHeader extends LitElement {
  static properties = {
    _user: { state: true },
    _online: { state: true },
    _authError: { state: true },
  };

  createRenderRoot() {
    return this;
  }

  constructor() {
    super();
    this._user = currentUser();
    this._online = navigator.onLine;
    this._authError = null;
  }

  connectedCallback() {
    super.connectedCallback();
    this._unsubscribeAuth = onAuthChange((user) => {
      this._user = user;
      if (user) this._authError = null;
    });
    document.body.addEventListener("app:auth-error", this._onAuthError);
    window.addEventListener("online", this._onOnline);
    window.addEventListener("offline", this._onOffline);
  }

  disconnectedCallback() {
    this._unsubscribeAuth?.();
    document.body.removeEventListener("app:auth-error", this._onAuthError);
    window.removeEventListener("online", this._onOnline);
    window.removeEventListener("offline", this._onOffline);
    super.disconnectedCallback();
  }

  // auth/network-request-failed while offline does NOT sign the user out --
  // only auth/user-token-expired / auth/user-disabled do -- so this surfaces
  // a "reconnect" notice while still rendering the signed-in header.
  _onAuthError = (e) => {
    this._authError = e.detail.code;
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
    // Renders the full chrome even before Auth has resolved a user, and this is
    // load-bearing for layout stability. It used to `return html``` while
    // `_user` was null, so the header was 0px tall at first paint and jumped to
    // its full height a beat later when onIdTokenChanged fired -- shoving the
    // whole page down (a measured CLS of 0.27, in production as well as dev).
    //
    // Rendering it unconditionally is safe because every screen carrying an
    // <app-header> is behind requireUser(), so a user is guaranteed to arrive;
    // and the header sits inside the [data-auth-pending] subtree, which is
    // hidden with `visibility` rather than `display`, so these boxes already
    // reserve their space before they are revealed. Only the email genuinely
    // depends on the user, and it holds its line with a non-breaking space so
    // the height does not change when the address lands.
    const here = location.pathname.replace(/\/$/, "") || "/home";
    return html`
      <header class="border-b border-slate-200 bg-white">
        <div class="flex items-center justify-between gap-3 px-4 py-3">
          <div>
            <h1 class="text-lg font-semibold">RedBottle Institute</h1>
            <p class="text-sm text-slate-500">${this._user?.email ?? " "}</p>
          </div>
          <div class="flex items-center gap-3">
            ${!this._online
              ? html`<ui-alert variant="warning" .message=${"Offline"}></ui-alert>`
              : ""}
            ${this._authError === "auth/network-request-failed"
              ? html`<ui-alert
                  variant="warning"
                  .message=${"Reconnect to refresh your session"}
                ></ui-alert>`
              : ""}
            <ui-button size="sm" @click=${this._signOut}>Sign out</ui-button>
          </div>
        </div>
        <nav class="flex flex-wrap gap-1 px-3 pb-2">
          ${NAV.map(
            (item) => html`
              <a
                class="nav-link"
                href=${item.href}
                aria-current=${here === item.href ? "page" : "false"}
                >${item.label}</a
              >
            `
          )}
        </nav>
      </header>
    `;
  }
}
customElements.define("app-header", AppHeader);
