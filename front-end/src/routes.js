// The one description of this app's screens: what they are called, how they are
// grouped in the sidebar, and what the top bar says.
//
// Everything that needs to know about screens reads this -- the sidebar builds
// its nav from it, the top bar takes its heading and caption from it, and
// screen.js decides which per-screen setup to run. Adding a screen means one
// entry here on top of the five-file wiring contract in CLAUDE.md, rather than
// the same label being retyped in three components.
//
// Deliberately free of any Lit or DOM dependency so screen.js can import it
// without pulling a rendering library into the boot path. Icons are named here
// and drawn in components/app-sidebar.js.

export const ROUTES = [
  {
    id: "dashboard",
    path: "/home",
    label: "Dashboard",
    title: "Today at a glance",
    caption: "Headcount, batches in progress, and money in this month.",
    group: "Daily work",
  },
  {
    id: "students",
    path: "/students",
    label: "Students",
    title: "Students",
    caption: "Everyone enrolled, and the form to enrol the next one.",
    group: "Daily work",
  },
  {
    id: "attendance",
    path: "/attendance",
    label: "Attendance",
    title: "Attendance",
    caption: "Pick a batch and a day, then mark the register.",
    group: "Daily work",
  },
  {
    id: "fees",
    path: "/fees",
    label: "Fees",
    title: "Fees",
    caption: "Record a receipt and see exactly what a student still owes.",
    group: "Daily work",
  },
  {
    id: "batches",
    path: "/batches",
    label: "Batches",
    title: "Batches",
    caption: "A batch is one running instance of a course.",
    group: "Setup",
  },
  {
    id: "courses",
    path: "/courses",
    label: "Courses",
    title: "Courses",
    caption: "The catalogue you enrol students into.",
    group: "Setup",
  },
  {
    id: "trainers",
    path: "/trainers",
    label: "Trainers",
    title: "Trainers",
    caption: "Staff who run the batches.",
    group: "Setup",
  },
];

// Two groups rather than one flat list, because the split is real: the top group
// is what the front desk touches every day, the bottom is what gets configured
// once and then rarely revisited. Ordering inside each group follows how often
// it is opened, not the alphabet.
export const NAV_GROUPS = ["Daily work", "Setup"];

export function routeFor(pathname = location.pathname) {
  const clean = pathname.replace(/\/$/, "") || "/";
  return ROUTES.find((r) => r.path === clean) ?? null;
}
