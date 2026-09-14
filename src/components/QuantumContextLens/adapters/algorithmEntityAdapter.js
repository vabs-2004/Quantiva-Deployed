/**
 * algorithmEntityAdapter.js
 * 
 * Quantiva Phase 3: Algorithm Surface Context Adapter for Quantum Contextual Lens.
 * 
 * Responsibilities:
 * - Detects if user selection occurs on an Algorithm Page (/algorithm/:id).
 * - Extracts bounded, serializable algorithm context:
 *   - algorithmId (e.g. "grover-search")
 *   - algorithmName (e.g. "Grover's Search")
 *   - activeTab (e.g. "algorithm", "description", "problemDescription")
 *   - stepName (e.g. "Initialization", "Grover Iteration") if inside structured steps
 *   - surroundingText (bounded to ~250 chars)
 * - Adheres strictly to the universal InspectionContext schema.
 * - Zero coupling to AlgorithmContext or simulation execution engines.
 */

/**
 * Checks if the current page or selection container represents an Algorithm Page.
 */
export function isAlgorithmSurface(pathname = window.location.pathname) {
  if (pathname.includes("/algorithm/")) return true;
  return Boolean(document.querySelector('[data-lens-surface="algorithm"]'));
}

/**
 * Extracts closest step title or sub-heading if selection is within a procedure or section.
 */
function extractStepContext(range) {
  try {
    const node = range.commonAncestorContainer;
    const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    if (!el) return null;

    // Check for parent list item with strong label
    const li = el.closest("li");
    if (li) {
      const strong = li.querySelector("strong");
      if (strong && strong.textContent) {
        return strong.textContent.replace(/[:.]/g, "").trim().slice(0, 60);
      }
    }

    // Check for preceding h3 or h4 in current section
    const heading = el.closest("section, div")?.querySelector("h3, h4");
    if (heading && heading.textContent) {
      return heading.textContent.trim().slice(0, 60);
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Extracts structured context from an Algorithm Page.
 * Returns null if not on an algorithm surface.
 */
export function extractAlgorithmContext(selectionRange, pathname = window.location.pathname) {
  if (!isAlgorithmSurface(pathname)) return null;

  // 1. Identify Algorithm Container & Dataset Attributes
  const container = document.querySelector('[data-lens-surface="algorithm"]');
  
  // 2. Extract Algorithm ID
  let algorithmId = container?.dataset?.lensAlgorithmId || null;
  if (!algorithmId && pathname.includes("/algorithm/")) {
    algorithmId = pathname.split("/algorithm/")[1]?.split("/")[0] || null;
  }

  // 3. Extract Algorithm Name
  let algorithmName = container?.dataset?.lensAlgorithmName || null;
  if (!algorithmName) {
    const h1 = document.querySelector("h1");
    if (h1) algorithmName = h1.textContent?.trim() || null;
  }

  // 4. Extract Active Educational Tab
  const tabEl = document.querySelector("[data-lens-active-tab]");
  const activeTab = tabEl?.dataset?.lensActiveTab || null;

  // 5. Extract Step Context (if available)
  const stepName = selectionRange ? extractStepContext(selectionRange) : null;

  // 6. Extract Bounded Surrounding Text
  let surroundingText = "";
  if (selectionRange) {
    try {
      const containerNode = selectionRange.commonAncestorContainer;
      const text = (containerNode.textContent || "").replace(/\s+/g, " ").trim();
      const selected = selectionRange.toString().trim();
      const idx = text.indexOf(selected);
      if (idx !== -1) {
        const start = Math.max(0, idx - 120);
        const end = Math.min(text.length, idx + selected.length + 120);
        surroundingText = text.slice(start, end).trim();
      } else {
        surroundingText = text.slice(0, 250).trim();
      }
    } catch {
      surroundingText = "";
    }
  }

  return {
    surface: "algorithm",
    route: pathname,
    algorithmId,
    algorithmName: algorithmName || algorithmId || "Quantum Algorithm",
    activeTab,
    stepName,
    surroundingText,
  };
}

export default {
  isAlgorithmSurface,
  extractAlgorithmContext,
};
