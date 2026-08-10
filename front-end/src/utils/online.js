// Reflects connectivity as an [offline] attribute on <body> so plain CSS
// ([offline] [data-needs-net]) can style/disable network-dependent controls
// anywhere in the tree, and re-fetches visible fragments once connectivity
// returns. Call once from bootstrap.js.
export function trackOnline(onReconnect) {
  const apply = () => {
    if (navigator.onLine) document.body.removeAttribute("offline");
    else document.body.setAttribute("offline", "");
  };

  window.addEventListener("online", () => {
    apply();
    onReconnect?.();
  });
  window.addEventListener("offline", apply);
  apply();
}
