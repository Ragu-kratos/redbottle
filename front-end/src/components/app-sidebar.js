import { LitElement, html, svg } from "lit";
import { ROUTES, NAV_GROUPS, routeFor } from "../routes.js";

// The persistent nav. On a boosted screen change only #page is replaced, so
// this element is never re-rendered from the server -- it just moves its
// aria-current marker in response to the app:navigated event that
// screen.js fires after each swap. That persistence is the whole reason the app
// reads as a single-page app rather than a set of documents.
//
// Icons are inline SVG rather than an icon font or a sprite sheet: they inherit
// currentColor (so they flip with the theme for free), cost no extra request,
// and cannot arrive late and shift the row. Lucide geometry, drawn on a 24-grid.
const ICONS = {
  dashboard: svg`<rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" />`,
  students: svg`<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />`,
  attendance: svg`<path d="M9 11l3 3 8-8" /><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" />`,
  fees: svg`<path d="M6 3h12" /><path d="M6 8h12" /><path d="M6 13l8.5 8" /><path d="M6 13h3a4.5 4.5 0 1 0 0-9" />`,
  batches: svg`<rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 10h18" /><path d="M8 2v4" /><path d="M16 2v4" /><path d="M8 15h.01" /><path d="M12 15h.01" /><path d="M16 15h.01" />`,
  courses: svg`<path d="M2 4h6a3 3 0 0 1 3 3v13a2.5 2.5 0 0 0-2.5-2.5H2z" /><path d="M22 4h-6a3 3 0 0 0-3 3v13a2.5 2.5 0 0 1 2.5-2.5H22z" />`,
  trainers: svg`<path d="M21 9L12 4 3 9l9 5 9-5Z" /><path d="M7 11.5V16c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5v-4.5" /><path d="M21 9v5" />`,
};

export class AppSidebar extends LitElement {
  static properties = {
    _here: { state: true },
    open: { type: Boolean, reflect: true },
  };

  createRenderRoot() {
    return this;
  }

  constructor() {
    super();
    this._here = routeFor()?.path ?? "/home";
    this.open = false;
  }

  connectedCallback() {
    super.connectedCallback();
    document.body.addEventListener("app:navigated", this._onNavigated);
    document.body.addEventListener("app:nav-toggle", this._onToggle);
  }

  disconnectedCallback() {
    document.body.removeEventListener("app:navigated", this._onNavigated);
    document.body.removeEventListener("app:nav-toggle", this._onToggle);
    super.disconnectedCallback();
  }

  _onNavigated = () => {
    this._here = routeFor()?.path ?? this._here;
    this.open = false; // a chosen destination closes the mobile drawer
  };

  _onToggle = () => {
    this.open = !this.open;
  };

  _icon(id) {
    return html`
      <svg
        class="nav-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        ${ICONS[id] ?? ""}
      </svg>
    `;
  }

  render() {
    return html`
      <!-- Backdrop only exists on mobile, and only while the drawer is open. -->
      <div
        class="fixed inset-0 z-30 bg-black/40 transition-opacity lg:hidden ${this.open
          ? "opacity-100"
          : "pointer-events-none opacity-0"}"
        @click=${() => (this.open = false)}
        aria-hidden="true"
      ></div>

      <div
        class="fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r bg-card transition-transform duration-200 lg:translate-x-0 ${this
          .open
          ? "translate-x-0"
          : "-translate-x-full"}"
      >
        <div class="flex h-14 shrink-0 items-center gap-2.5 border-b px-4">
          <span
            class="grid size-7 shrink-0 place-items-center rounded-md bg-primary text-[0.7rem] font-bold text-primary-foreground"
            aria-hidden="true"
            >RB</span
          >
          <span class="text-sm font-semibold tracking-tight">RedBottle</span>
        </div>

        <!-- hx-boost lives here so every nav link becomes a fetch-and-swap of
             #page instead of a document load. hx-select picks #page out of the
             response and outerHTML replaces the current one, so the id survives
             for the next navigation. -->
        <nav
          class="flex-1 space-y-5 overflow-y-auto p-3"
          hx-boost="true"
          hx-target="#page"
          hx-select="#page"
          hx-swap="outerHTML transition:true show:window:top"
        >
          ${NAV_GROUPS.map((group) => {
            const items = ROUTES.filter((r) => r.group === group);
            if (!items.length) return "";
            return html`
              <div>
                <p class="mb-1.5 px-2.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  ${group}
                </p>
                <ul class="space-y-0.5">
                  ${items.map(
                    (r) => html`
                      <li>
                        <a
                          class="nav-link"
                          href=${r.path}
                          aria-current=${this._here === r.path ? "page" : "false"}
                          >${this._icon(r.id)}<span>${r.label}</span></a
                        >
                      </li>
                    `
                  )}
                </ul>
              </div>
            `;
          })}
        </nav>
      </div>
    `;
  }
}
customElements.define("app-sidebar", AppSidebar);
