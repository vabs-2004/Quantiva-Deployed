/**
 * Application-wide constants
 */
export const APP_NAME = "Quantiva";
export const APP_TAGLINE = "Quantum Algorithm Research Platform";
export const APP_DESCRIPTION =
  "An interactive platform for quantum algorithm research, simulation, and experimentation using Qiskit.";

export const APP_ORG = "GitHappens2";
export const APP_ORG_SHORT = "GH";

/**
 * Public navigation links (shown in main navbar)
 */
export const PUBLIC_NAV_LINKS = [
  { path: "/explore", label: "Explore" },
  { path: "/micro-modules", label: "Micro Modules" },
  { path: "/docs", label: "Docs" },
  { path: "/blogs", label: "Blogs" },
  { path: "/news", label: "News" },
  { path: "/courses", label: "Courses" },
];

/**
 * Sidebar links (shown after login in sidebar)
 */
export const SIDEBAR_LINKS = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: "dashboard",
  },
  {
    label: "Micro Modules",
    path: "/micro-modules",
    icon: "module",
  },
  {
    label: "Bloch Sphere",
    path: "/blochsphere",
    icon: "bloch",
  },
  {
    label: "Circuit Simulator",
    path: "/circuit-simulator",
    icon: "circuit",
  },
  {
    label: "Sandbox",
    path: "/sandbox",
    icon: "sandbox",
  },
  {
    label: "Challenges",
    path: "/circuit-challenges",
    icon: "challenges",
  },
  {
    label: "Playground",
    path: "/playground",
    icon: "playground",
  },

];

/**
 * Algorithm series order.
 * Algorithms are displayed in this exact order (not by category).
 * The id must match the algorithm's id field.
 */
export const ALGORITHM_SERIES_ORDER = [
  "deutsch",
  "deutsch-jozsa",
  "bernstein-vazirani",
  "simon",
  "grover-search",
  "shor",
  "hhl",
  "vqc",
  "vqe",
  "qaoa",
  "qubo",
  "quantum-teleportation",
  "superdense-coding",
  // Remaining algorithms go after these
  "qft",
  "quantum-phase-estimation",
  "bb84",
];

export const COMPLEXITY_LABELS = {
  time: "Time Complexity",
  space: "Space Complexity",
};

export const OUTPUT_SECTIONS = {
  GRAPH: "graph",
  CIRCUIT: "circuit",
  BLOCH: "blochSphere",
  CONSOLE: "console",
  MEASUREMENTS: "measurements",
};
