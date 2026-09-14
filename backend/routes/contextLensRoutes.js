/**
 * contextLensRoutes.js
 * 
 * Quantiva Phase 1: Routes for the Quantum Contextual Lens.
 * Strictly isolated from aiRoutes.js.
 */

const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { optionalAuthenticate } = require("../middleware/auth");
const { inspectEntity } = require("../controllers/contextLensController");

const lensLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 60,
  message: { error: "Too many Context Lens requests. Please wait a few moments." },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/context-lens/inspect
router.post("/inspect", optionalAuthenticate, lensLimiter, inspectEntity);

module.exports = router;
