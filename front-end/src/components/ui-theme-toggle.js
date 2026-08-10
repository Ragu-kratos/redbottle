import { LitElement, html, svg } from "lit";

// Cycles system -> light -> dark -> system, and says which of the three it is
// on rather than only showing a sun or a moon. "System" is a real state worth
// being able to return to: someone whose OS switches at sunset wants the app to
// follow, and a two-way toggle silently takes that away the first time it is
// touched.
//
// The stored value is read by an inline script in each screen's <head>, before
// first paint -- doing it here instead would paint the light palette and then
// repaint dark, which is the exact flash this project already fixed once for
// the stylesheet.
const ORDER = ["system", "light", "dark"];

const LABELS = {
  system: "Match system",
  light: "Light",
  dark: "Dark",
};

const ICONS = {
  system: svg`<rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" />`,
  light: svg`<circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="M4.9 4.9l1.4 1.4" /><path
      d="M17.7 17.7l1.4 1.4"
    /><path d="M2 12h2" /><path d="M20 12h2" /><path d="M6.3 17.7l-1.4 1.4" /><path d="M19.1 4.9l-1.4 1.4" />`,
  dark: svg`<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />`,
};

export class UiThemeToggle extends LitElement {
  static properties = { _mode: { state: true } };

  createRenderRoot() {
    return this;
  }

  constructor() {
    super();
    this._mode = this._read();
  }

  _read() {
    try {
      const stored = localStorage.getItem("theme");
      return ORDER.includes(stored) ? stored : "system";
    } catch {
      // Private-mode Safari throws on localStorage access rather than returning
      // null, so a failure here means "no preference", not an error worth
      // surfacing.
      return "system";
    }
  }

  _apply(mode) {
    this._mode = mode;
    const root = document.documentElement;
    if (mode === "system") root.removeAttribute("data-theme");
    else root.dataset.theme = mode;
    try {
      if (mode === "system") localStorage.removeItem("theme");
      else localStorage.setItem("theme", mode);
    } catch {
      /* preference just will not persist -- the applied theme is still correct */
    }
  }

  _next = () => {
    this._apply(ORDER[(ORDER.indexOf(this._mode) + 1) % ORDER.length]);
  };

  render() {
    return html`
      <button
        type="button"
        class="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        @click=${this._next}
        title=${`Theme: ${LABELS[this._mode]}`}
        aria-label=${`Theme: ${LABELS[this._mode]}. Change theme.`}
      >
        <svg
          class="size-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.75"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          ${ICONS[this._mode]}
        </svg>
      </button>
    `;
  }
}
customElements.define("ui-theme-toggle", UiThemeToggle);
