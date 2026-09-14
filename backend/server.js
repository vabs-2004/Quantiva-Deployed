/**
 * Quantiva — Express Backend
 *
 * Start with:
 *    cd backend
 *    npm run dev
 *
 * Runs on http://localhost:8000
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const connectDB = require("./config/db");
const algorithmRoutes = require("./routes/algorithmRoutes");
const sandboxRoutes = require("./routes/sandboxRoutes");
const authRoutes = require("./routes/authRoutes");
const contentRoutes = require("./routes/contentRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const challengeRoutes = require("./routes/challengeRoutes");
const playgroundRoutes = require("./routes/playgroundRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const userRoutes = require("./routes/userRoutes");
const courseRoutes = require("./routes/courseRoutes");
const gnewsRoutes = require("./routes/gnewsRoutes");
const aiRoutes = require("./routes/aiRoutes");
const progressRoutes = require("./routes/progressRoutes");
const circuitRoutes = require("./routes/circuitRoutes");
const certificateRoutes = require("./routes/certificateRoutes");
const microModuleRoutes = require("./routes/microModuleRoutes");
const searchRoutes = require("./routes/searchRoutes");
const topicRoutes = require("./routes/topicRoutes");
const generatedLessonRoutes = require("./routes/generatedLessonRoutes");
const contextLensRoutes = require("./routes/contextLensRoutes");

const app = express();
const PORT = process.env.PORT || 8000;
const IS_PRODUCTION = process.env.NODE_ENV === "production";

// ─── Security: Helmet ────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
    crossOriginOpenerPolicy: {
      policy: "same-origin-allow-popups",
    },
  })
);

// ─── CORS ─────────────────────────────────────────
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

// ─── Security: CORS ──────────────────────────────
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));

// ─── Security: Rate Limiting ─────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // max 200 requests per window
  message: { error: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// Strict rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: IS_PRODUCTION ? 15 : 1000, // max 15 in prod, 1000 in dev
  message: { error: "Too many login attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Body Parsing ────────────────────────────────
app.use(express.json({ limit: "10mb" }));

// ─── Security: NoSQL Injection Prevention ────────
app.use((req, res, next) => {
  if (req.body) req.body = mongoSanitize.sanitize(req.body);
  if (req.params) req.params = mongoSanitize.sanitize(req.params);
  next();
});

// ─── Static Files ─────────────────────────────────
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ─── Routes ──────────────────────────────────────
app.use("/api", algorithmRoutes);
app.use("/api", sandboxRoutes);
app.use("/api/auth", authLimiter); // Apply strict rate limit to auth
app.use("/api", authRoutes);
app.use("/api", contentRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api", challengeRoutes);
app.use("/api", playgroundRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/users", userRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/gnews", gnewsRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/circuit", circuitRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api/micro-modules", microModuleRoutes);
app.use("/api", searchRoutes);
app.use("/api/topics", topicRoutes);
app.use("/api/generated-lessons", generatedLessonRoutes);
app.use("/api/context-lens", contextLensRoutes);

// ─── Health check ────────────────────────────────
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Quantiva API is running" });
});

// ─── Global Error Handler ────────────────────────
app.use((err, req, res, next) => {
  console.error("Global Error Caught:", err);

  // Multer errors (file upload)
  if (err.name === 'MulterError' || (err.message && err.message.includes('Only image files'))) {
    return res.status(400).json({ error: err.message });
  }

  // CORS errors
  if (err.message && err.message.includes("Not allowed by CORS")) {
    return res.status(403).json({ error: "CORS: Origin not allowed." });
  }

  // In production, never leak internal error details
  if (IS_PRODUCTION) {
    return res.status(500).json({ error: "Internal Server Error" });
  }

  res.status(500).json({ error: err.message || "Internal Server Error" });
});

const { initRedis } = require("./middleware/cache");

// ─── Start Server with DB Connection ─────────────
async function startServer() {
  await connectDB();
  await initRedis();

  app.listen(PORT,"0.0.0.0", () => {
    console.log(`\n  🚀 Quantiva API running at http://localhost:${PORT}`);
    console.log(`  🔒 Security: Helmet, Rate Limiting, Mongo Sanitize enabled`);
    console.log(`  🌐 CORS Origins: ${allowedOrigins.join(", ")}`);
    console.log(`  📡 Endpoints:`);
    console.log(`     GET  /api/algorithms`);
    console.log(`     GET  /api/algorithms/:id`);
    console.log(`     POST /api/algorithms       (admin)`);
    console.log(`     PUT  /api/algorithms/:id   (admin)`);
    console.log(`     DELETE /api/algorithms/:id (admin)`);
    console.log(`     POST /api/run`);
    console.log(`     POST /api/sandbox/run`);
    console.log(`     POST /api/auth/login`);
    console.log(`     POST /api/auth/register`);
    console.log(`     GET  /api/auth/me\n`);
  });
}

startServer();
