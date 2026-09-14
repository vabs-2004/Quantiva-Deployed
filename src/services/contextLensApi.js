/**
 * contextLensApi.js
 * 
 * Quantiva Phase 1: Isolated Context Lens API client service.
 * Connects to POST /api/context-lens/inspect
 */

import apiClient from "./api";

/**
 * Requests an asynchronous, context-grounded AI explanation for an inspectable quantum entity.
 * 
 * @param {Object} payload
 * @param {string} payload.entityId - Canonical entity ID or raw name
 * @param {string} [payload.rawSelection] - Raw highlighted text
 * @param {string} [payload.category] - Entity category (concept, gate, mathematics, etc.)
 * @param {Object} [payload.source] - Origin surface and route ({ surface, route, moduleId, lessonTitle })
 * @param {string} [payload.surroundingText] - Up to 250 characters of surrounding lesson context
 * @returns {Promise<Object>} Formatted contextual breakdown
 */
export async function inspectQuantumEntity({
  entityId,
  rawSelection = "",
  category = "concept",
  source = {},
  surroundingText = "",
}) {
  const res = await apiClient.post("/context-lens/inspect", {
    entityId,
    rawSelection,
    category,
    source,
    surroundingText: surroundingText ? surroundingText.slice(0, 300) : "",
  });
  return res.data;
}
