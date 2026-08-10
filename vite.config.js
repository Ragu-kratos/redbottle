import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

// Maps clean paths to the real screen documents under front-end/screens/, so
// /login, /home, /students and friends behave like real page loads in both
// `vite dev` (served from front-end/) and `vite preview` (served from dist/,
// where the build emits dist/screens/*.html at the same relative paths).
//
// Every entry here needs a matching build input below AND a matching
// hosting rewrite in firebase.json -- the three lists are independent, and
// missing one fails at a different stage (dev 404 / absent from the bundle /
// 404 only once deployed).
const ROUTES = {
  "/": "/screens/index.html",
  "/login": "/screens/login.html",
  "/home": "/screens/home.html",
  "/courses": "/screens/courses.html",
  "/trainers": "/screens/trainers.html",
  "/batches": "/screens/batches.html",
  "/students": "/screens/students.html",
  "/attendance": "/screens/attendance.html",
  "/fees": "/screens/fees.html",
};

function screenRoutes() {
  const rewrite = (server) => {
    // Registered inside configureServer's body (not returned as a function)
    // so it runs BEFORE Vite's own HTML-serving middleware.
    server.middlewares.use((req, _res, next) => {
      const [pathname, query] = req.url.split("?");
      const clean = pathname.replace(/\/$/, "") || "/";
      if (ROUTES[clean]) {
        req.url = ROUTES[clean] + (query ? `?${query}` : "");
      }
      next();
    });
  };
  return { name: "screen-routes", configureServer: rewrite, configurePreviewServer: rewrite };
}

export default defineConfig({
  root: "front-end",
  publicDir: "public",
  envDir: "..",

  // Disables Vite's SPA fallback (serving index.html for every unmatched
  // path) -- this is a multi-page app, so an unknown path should 404.
  appType: "mpa",

  plugins: [tailwindcss(), screenRoutes()],

  server: {
    port: 5173,
    strictPort: true,
  },

  preview: {
    // Same origin as `dev` so Firebase Auth's IndexedDB persistence and the
    // service worker's Cache Storage carry over. Run `dev` OR `preview`,
    // never both at once.
    port: 5173,
    strictPort: true,
  },

  build: {
    outDir: "./dist",
    emptyOutDir: true,
    target: "es2022",
    sourcemap: true,
    rollupOptions: {
      // Spelled out one literal path per screen on purpose -- a
      // `screen(name)` helper building these with a template literal reads
      // better but leaves no literal "front-end/screens/<name>.html" for the
      // structure audit (scripts/check-structure.mjs) to find, so a screen
      // missing from this list would stop being caught.
      input: {
        index: fileURLToPath(new URL("./front-end/screens/index.html", import.meta.url)),
        login: fileURLToPath(new URL("./front-end/screens/login.html", import.meta.url)),
        home: fileURLToPath(new URL("./front-end/screens/home.html", import.meta.url)),
        courses: fileURLToPath(new URL("./front-end/screens/courses.html", import.meta.url)),
        trainers: fileURLToPath(new URL("./front-end/screens/trainers.html", import.meta.url)),
        batches: fileURLToPath(new URL("./front-end/screens/batches.html", import.meta.url)),
        students: fileURLToPath(new URL("./front-end/screens/students.html", import.meta.url)),
        attendance: fileURLToPath(new URL("./front-end/screens/attendance.html", import.meta.url)),
        fees: fileURLToPath(new URL("./front-end/screens/fees.html", import.meta.url)),
      },
    },
  },
});
