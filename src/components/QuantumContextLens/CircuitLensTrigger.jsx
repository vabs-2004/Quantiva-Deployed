/**
 * CircuitLensTrigger.jsx
 * 
 * Quantiva Phase 4: Non-intrusive Lens affordance for interactive circuit objects
 * in the Circuit Simulator (/circuit-simulator).
 * 
 * Behavior:
 * - Appears as a floating pill [🔍 Lens (Alt+Q)] positioned above the selected gate.
 * - Clicking the pill opens the universal Quantum Context Lens drawer for the gate.
 * - Listens for Alt + Q to invoke the Lens for the selected gate.
 * - Listens for Escape to clear gate selection (or close Lens if open).
 * - Extracts bounded causal neighborhood via circuitEntityAdapter.
 * - Reuses the single universal QuantumContextLensContext.openLens flow.
 */

import { useEffect, useCallback } from "react";
import { useQuantumContextLens } from "../../context/QuantumContextLensContext";
import { extractCircuitContext } from "./adapters/circuitEntityAdapter";

export default function CircuitLensTrigger({
  selectedGate,
  circuit = {},
  numQubits = 2,
  onClear,
}) {
  const { isFeatureEnabled, isOpen, openLens, closeLens } = useQuantumContextLens();

  /**
   * Invokes the Lens with the active selected circuit gate.
   */
  const triggerLens = useCallback(() => {
    if (!selectedGate || !selectedGate.gate) return;

    const circuitContext = extractCircuitContext(
      selectedGate,
      circuit,
      numQubits,
      window.location.pathname
    );

    if (!circuitContext) return;

    const entity = circuitContext.entity || {
      id: (selectedGate.gate.type || "gate").toLowerCase(),
      displayName: selectedGate.gate.label || selectedGate.gate.type || "Quantum Gate",
      category: "gate",
      symbol: selectedGate.gate.type || null,
      rawSelection: selectedGate.gate.type || "gate",
    };

    openLens(entity, circuitContext);
  }, [selectedGate, circuit, numQubits, openLens]);

  // Keyboard shortcut listeners (Alt + Q to inspect, Escape to clear/dismiss)
  useEffect(() => {
    if (!isFeatureEnabled) return;

    const handleKeyDown = (e) => {
      // Escape clears selection if open or selected
      if (e.key === "Escape") {
        if (isOpen) {
          e.preventDefault();
          closeLens();
        } else if (selectedGate) {
          e.preventDefault();
          if (typeof onClear === "function") onClear();
        }
        return;
      }

      // Check if typing in an input/textarea/select
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")) {
        return;
      }

      // Alt + Q opens Lens for selected gate
      if (e.altKey && (e.key === "q" || e.key === "Q")) {
        if (selectedGate) {
          e.preventDefault();
          triggerLens();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFeatureEnabled, isOpen, selectedGate, triggerLens, closeLens, onClear]);

  if (!isFeatureEnabled || !selectedGate) {
    return null;
  }

  const { wireIndex, gateIndex, gate } = selectedGate;
  const gateLabel = gate.label || gate.short || gate.type || "Gate";

  return (
    <div
      className="fixed bottom-6 right-6 z-40 animate-fade-in flex items-center gap-2 bg-[var(--color-app-surface)] border border-indigo-500/40 rounded-full px-4 py-2 shadow-2xl shadow-indigo-500/20 backdrop-blur-md"
      style={{
        boxShadow: "0 8px 32px rgba(99, 102, 241, 0.25)",
      }}
    >
      <div className="flex items-center gap-2 text-xs">
        <span className="font-mono text-indigo-300 font-bold bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/30">
          q[{wireIndex}]: {gateLabel}
        </span>
        <span className="text-[var(--color-app-text-muted)] text-[11px] hidden sm:inline">
          selected
        </span>
      </div>

      <div className="h-4 w-[1px] bg-white/10" />

      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          triggerLens();
        }}
        className="px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-transform hover:scale-105 active:scale-95 cursor-pointer text-white shadow-md"
        style={{
          background: "linear-gradient(135deg, #3b82f6, #6366f1)",
          boxShadow: "0 2px 10px rgba(59, 130, 246, 0.4)",
        }}
        title="Inspect with Quantum Context Lens (Alt+Q)"
      >
        <span>🔍</span>
        <span>Lens</span>
        <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-black/30 border border-white/20">
          Alt+Q
        </span>
      </button>

      {onClear && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClear();
          }}
          className="text-xs text-[var(--color-app-text-muted)] hover:text-white p-1 rounded transition-colors cursor-pointer ml-0.5"
          title="Deselect (Escape)"
        >
          ✕
        </button>
      )}
    </div>
  );
}
