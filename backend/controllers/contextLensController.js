/**
 * contextLensController.js
 * 
 * Quantiva Phase 1 & 2: Controller for the Quantum Contextual Lens.
 * Handles POST /api/context-lens/inspect
 * 
 * Strictly isolated from aiController.js and existing AI Tutor endpoints.
 */

const aiProvider = require("../services/aiProvider");
const { buildContextLensPrompt } = require("../services/contextLensPromptBuilder");

/**
 * Safely parses JSON returned by the model, handling markdown fences,
 * unescaped LaTeX backslashes, and fallback key extraction.
 * Guarantees that raw JSON strings are never leaked into the UI.
 */
function parseJsonSafely(text) {
  if (!text || typeof text !== "string") return null;

  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  // 1. Direct JSON.parse
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    // Continue to backslash sanitizer
  }

  // 2. Sanitize unescaped LaTeX backslashes (common when model outputs \(, \alpha, \psi, \frac)
  try {
    const sanitized = cleaned.replace(/\\([^"\\/bfnrtu]|u[^0-9a-fA-F]{4})/g, "\\\\$1");
    const parsed = JSON.parse(sanitized);
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    // Continue to regex extractor
  }

  // 3. Fallback: Key-by-key regex extraction from structured string
  const keys = [
    "quickMeaning",
    "intuition",
    "mathematics",
    "contextualRole",
    "suggestedTutorQuestion",
  ];
  const result = {};
  let foundAny = false;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const regex = new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, "s");
    const match = cleaned.match(regex);
    if (match) {
      let val = match[1];
      try {
        val = JSON.parse(`"${val}"`);
      } catch {
        val = val
          .replace(/\\n/g, "\n")
          .replace(/\\t/g, "\t")
          .replace(/\\"/g, '"');
      }
      result[key] = val;
      foundAny = true;
    }
  }

  if (foundAny) {
    return result;
  }

  return null;
}

/**
 * POST /api/context-lens/inspect
 * Delivers a fast, context-grounded inspection of an inspectable quantum entity.
 */
async function inspectEntity(req, res) {
  try {
    const { entityId, rawSelection, category, source, surroundingText } = req.body;

    if (!entityId && !rawSelection) {
      return res.status(400).json({ error: "entityId or rawSelection is required" });
    }

    // Check if AI provider is configured
    if (!aiProvider.isConfigured()) {
      return res.status(503).json({
        error: "AI service is currently unavailable. Displaying canonical definition.",
        isFallback: true,
      });
    }

    const { systemPolicy, userRequest } = buildContextLensPrompt({
      entityId,
      rawSelection,
      category,
      source: source || {},
      surroundingText: surroundingText || "",
    });

    // Call fast model for rapid contextual reasoning
    const result = await aiProvider.generateText({
      systemPrompt: systemPolicy,
      userPrompt: userRequest,
      model: aiProvider.FAST_MODEL || "openai/gpt-oss-20b",
      temperature: 0.2,
      maxTokens: 8192,
    });

    const parsed = parseJsonSafely(result.text);

    if (parsed && (parsed.quickMeaning || parsed.contextualRole || parsed.mathematics)) {
      return res.json({
        success: true,
        explanation: {
          quickMeaning: parsed.quickMeaning || "",
          intuition: parsed.intuition || "",
          mathematics: parsed.mathematics || "",
          contextualRole: parsed.contextualRole || "",
          suggestedTutorQuestion: parsed.suggestedTutorQuestion || "",
        },
      });
    }

    // Check if raw output looks like JSON: NEVER dump raw JSON into contextualRole
    const rawTrimmed = (result.text || "").trim();
    if (rawTrimmed.startsWith("{") || rawTrimmed.includes('"quickMeaning"')) {
      console.warn("[ContextLens] Model output contained unparseable JSON syntax:", rawTrimmed.slice(0, 150));
      return res.json({
        success: true,
        explanation: {
          quickMeaning: "",
          intuition: "",
          mathematics: "",
          contextualRole: "Contextual role analysis completed. Please refer to canonical mathematics and intuition above.",
          suggestedTutorQuestion: `Can you explain more about ${entityId || rawSelection}?`,
        },
      });
    }

    // If output is normal plain text (not JSON)
    return res.json({
      success: true,
      explanation: {
        quickMeaning: rawTrimmed.slice(0, 200),
        intuition: "",
        mathematics: "",
        contextualRole: rawTrimmed,
        suggestedTutorQuestion: `Can you explain how ${entityId || rawSelection} behaves here?`,
      },
    });
  } catch (error) {
    console.error("[ContextLens] Inspection error:", error.message);
    return res.status(500).json({
      error: "Contextual explanation failed. Using canonical fallback.",
      details: error.message,
    });
  }
}

module.exports = {
  inspectEntity,
  parseJsonSafely,
};
