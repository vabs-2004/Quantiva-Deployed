/**
 * SelectionLensTrigger.jsx
 * 
 * Quantiva Phase 1 & 2: Global listener and floating trigger affordance
 * for the Quantum Contextual Lens.
 * 
 * Behavior:
 * - Detects user text selection across the document.
 * - Suppresses activation if typing in inputs, textareas, contenteditable, or code editors.
 * - Normalizes selection against the V1 Canonical Ontology.
 * - Shows an unobtrusive floating badge [🔍 Lens (Alt+Q)] ONLY when the selection matches a valid entity.
 * - Listens for Alt + Q to invoke the Lens.
 * - Listens for Escape to dismiss.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuantumContextLens } from "../../context/QuantumContextLensContext";
import { resolveCanonicalEntity } from "../../data/quantumOntology";
import { extractAlgorithmContext } from "./adapters/algorithmEntityAdapter";

export default function SelectionLensTrigger() {
  const { isFeatureEnabled, isOpen, openLens, closeLens } = useQuantumContextLens();

  const [triggerPosition, setTriggerPosition] = useState(null);
  const [resolvedEntity, setResolvedEntity] = useState(null);
  const [pendingSelection, setPendingSelection] = useState(null);

  const pendingRef = useRef({ resolvedEntity, pendingSelection });
  useEffect(() => {
    pendingRef.current = { resolvedEntity, pendingSelection };
  }, [resolvedEntity, pendingSelection]);

  /**
   * Checks if an element is an interactive input or code editor.
   */
  const isInputOrEditor = (el) => {
    if (!el) return false;
    const tagName = el.tagName?.toLowerCase();
    if (tagName === "input" || tagName === "textarea") return true;
    if (el.isContentEditable) return true;
    if (el.closest(".monaco-editor") || el.closest(".code-editor") || el.closest("pre") || el.closest("code")) {
      return true;
    }
    return false;
  };

  /**
   * Extracts bounded surrounding context (up to 250 characters) around the selection.
   */
  const extractSurroundingText = (range) => {
    try {
      const container = range.commonAncestorContainer;
      const text = container.textContent || "";
      const selected = range.toString();
      const idx = text.indexOf(selected);
      if (idx !== -1) {
        const start = Math.max(0, idx - 120);
        const end = Math.min(text.length, idx + selected.length + 120);
        return text.slice(start, end).replace(/\s+/g, " ").trim();
      }
      return text.slice(0, 250).replace(/\s+/g, " ").trim();
    } catch {
      return "";
    }
  };

  /**
   * Handles text selection change.
   */
  const handleSelectionChange = useCallback(() => {
    if (!isFeatureEnabled) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      setTriggerPosition(null);
      setResolvedEntity(null);
      setPendingSelection(null);
      return;
    }

    const activeEl = document.activeElement;
    if (isInputOrEditor(activeEl)) {
      setTriggerPosition(null);
      setResolvedEntity(null);
      return;
    }

    const rawText = selection.toString().trim();
    if (!rawText || rawText.length > 60) {
      setTriggerPosition(null);
      setResolvedEntity(null);
      return;
    }

    // Attempt canonical resolution
    const entity = resolveCanonicalEntity(rawText);
    if (!entity) {
      // Ordinary non-quantum text → do NOT show affordance
      setTriggerPosition(null);
      setResolvedEntity(null);
      return;
    }

    // Valid quantum entity detected! Position floating badge
    try {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      if (rect.width > 0 && rect.height > 0) {
        const surrounding = extractSurroundingText(range);

        setResolvedEntity(entity);
        setPendingSelection({
          rawText,
          surroundingText: surrounding,
        });

        // Position pill above or below selection
        const top = rect.top + window.scrollY - 34;
        const left = rect.left + window.scrollX + rect.width / 2;

        setTriggerPosition({
          top: top > 10 ? top : rect.bottom + window.scrollY + 8,
          left: Math.max(20, Math.min(window.innerWidth - 140, left)),
        });
      }
    } catch {
      setTriggerPosition(null);
    }
  }, [isFeatureEnabled]);

  /**
   * Invokes the Lens with the active resolved entity.
   */
  const triggerLens = useCallback(() => {
    const { resolvedEntity: ent, pendingSelection: sel } = pendingRef.current;
    if (!ent) return;

    const path = window.location.pathname;

    // 1. Check Algorithm Surface via adapter
    const selection = window.getSelection();
    const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    const algoContext = extractAlgorithmContext(range, path);

    if (algoContext) {
      openLens(ent, {
        ...algoContext,
        surroundingText: sel?.surroundingText || algoContext.surroundingText,
      });
      setTriggerPosition(null);
      return;
    }

    // 2. Micro Module Surface
    let surface = "micro-module";
    let moduleId = null;
    let lessonTitle = null;

    if (path.includes("/micro-modules/")) {
      surface = "micro-module";
      moduleId = path.split("/micro-modules/")[1]?.split("/")[0] || null;
      const h1 = document.querySelector("h1");
      if (h1) lessonTitle = h1.textContent?.trim();
    }

    openLens(ent, {
      surface,
      route: path,
      moduleId,
      lessonTitle,
      surroundingText: sel?.surroundingText || "",
    });

    // Hide badge once opened
    setTriggerPosition(null);
  }, [openLens]);

  // Global selection & keyboard listeners
  useEffect(() => {
    if (!isFeatureEnabled) return;

    const handleMouseUp = () => {
      // Defer slightly so browser updates selection
      setTimeout(handleSelectionChange, 10);
    };

    const handleKeyDown = (e) => {
      // Escape closes Lens if open
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        closeLens();
        return;
      }

      // Check if typing in input/textarea/editor
      if (isInputOrEditor(document.activeElement)) {
        return;
      }

      // Alt + Q activates the Lens
      if (e.altKey && (e.key === "q" || e.key === "Q")) {
        const { resolvedEntity: ent } = pendingRef.current;
        if (ent) {
          e.preventDefault();
          triggerLens();
        }
      }
    };

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("selectionchange", handleSelectionChange);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("selectionchange", handleSelectionChange);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFeatureEnabled, isOpen, handleSelectionChange, triggerLens, closeLens]);

  if (!isFeatureEnabled || !triggerPosition || !resolvedEntity) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        top: `${triggerPosition.top}px`,
        left: `${triggerPosition.left}px`,
        transform: "translateX(-50%)",
        zIndex: 9999,
      }}
      className="animate-fade-in"
    >
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          triggerLens();
        }}
        className="px-2.5 py-1 rounded-full shadow-xl text-xs font-bold flex items-center gap-1.5 transition-transform hover:scale-105 active:scale-95 cursor-pointer select-none"
        style={{
          background: "linear-gradient(135deg, #3b82f6, #6366f1)",
          color: "#ffffff",
          border: "1px solid rgba(255, 255, 255, 0.25)",
          boxShadow: "0 4px 14px rgba(59, 130, 246, 0.4)",
        }}
        title="Inspect with Quantum Context Lens (Alt+Q)"
      >
        <span>🔍</span>
        <span>Lens</span>
        <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-black/30 border border-white/20">
          Alt+Q
        </span>
      </button>
    </div>
  );
}
