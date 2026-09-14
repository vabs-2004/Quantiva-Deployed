import React, { useState, useCallback, useEffect } from "react";
import { useQuantumContextLens } from "../../context/QuantumContextLensContext";
import { extractNoiseLabContext } from "../QuantumContextLens/adapters/noiseLabEntityAdapter";

const NOISE_MODELS = [
  {
    id: "depolarizing",
    name: "Depolarizing Noise",
    tag: "Isotropic Mixedness",
    description: "Symmetrically contracts Bloch vectors toward the center (I/2). Damps off-diagonals and flattens populations.",
    formula: "r \\to (1 - p)r",
    target: "Quantum State",
  },
  {
    id: "phase_flip",
    name: "Phase Flip (Dephasing)",
    tag: "Transverse Decoherence",
    description: "Destroys quantum phase coherence along the equator (x, y contract by 1 - 2p) while conserving populations (z is invariant).",
    formula: "x, y \\to (1 - 2p)x, y",
    target: "Quantum Coherence",
  },
  {
    id: "bit_flip",
    name: "Bit Flip (X-Noise)",
    tag: "Population Inversion",
    description: "Inverts computational basis populations (|0⟩ ↔ |1⟩) with probability p, shifting longitudinal coordinate z.",
    formula: "z \\to (1 - 2p)z",
    target: "Basis Populations",
  },
  {
    id: "readout",
    name: "Readout Error",
    tag: "Classical Detector Noise",
    description: "Measurement detector infidelity: leaves the physical quantum state and fidelity 100% ideal (F = 1.0), while perturbing observed measurement statistics.",
    formula: "P_{obs} = (1 - p)P_{true} + p P_{flip}",
    target: "Measurement Readout",
  },
];

export default function NoiseLabControls({
  isOpen,
  onToggle,
  onRunNoise,
  onClearNoise,
  isSimulating,
  activeNoiseConfig,
  divergenceSummary,
  idealStep = null,
  noisyStep = null,
  stepIndex = 0,
  totalSteps = 1,
  selectedQubit = 0,
  numQubits = 1,
}) {
  const [selectedModel, setSelectedModel] = useState("depolarizing");
  const [strengthPct, setStrengthPct] = useState(15); // 15% default

  const { isFeatureEnabled, openLens } = useQuantumContextLens();

  const currentModelInfo = NOISE_MODELS.find((m) => m.id === selectedModel) || NOISE_MODELS[0];

  const handleSimulate = () => {
    onRunNoise({
      noiseModel: selectedModel,
      noiseStrength: strengthPct / 100.0,
    });
  };

  const handleInspectModel = useCallback((e, modelId) => {
    if (e) e.stopPropagation();
    if (!isFeatureEnabled) return;

    const targetModel = modelId || selectedModel;
    const isModelCurrentlySimulated = activeNoiseConfig && activeNoiseConfig.noiseModel === targetModel;
    const effectiveNoisyStep = isModelCurrentlySimulated ? noisyStep : null;
    const effectiveDivergenceSummary = isModelCurrentlySimulated ? divergenceSummary : null;

    const ctx = extractNoiseLabContext({
      entityKey: targetModel,
      entityType: "noise-model",
      activeNoiseConfig: {
        noiseModel: targetModel,
        noiseStrength: isModelCurrentlySimulated ? activeNoiseConfig.noiseStrength : strengthPct / 100.0,
      },
      idealStep,
      noisyStep: effectiveNoisyStep,
      stepIndex,
      totalSteps,
      selectedQubit,
      numQubits,
      divergenceSummary: effectiveDivergenceSummary,
    });

    if (ctx && ctx.entity) {
      openLens(ctx.entity, ctx);
    }
  }, [isFeatureEnabled, selectedModel, activeNoiseConfig, strengthPct, idealStep, noisyStep, stepIndex, totalSteps, selectedQubit, numQubits, divergenceSummary, openLens]);

  // Keyboard shortcut (Alt + Q) to inspect currently selected model
  useEffect(() => {
    if (!isFeatureEnabled || !isOpen) return;

    const handleKeyDown = (e) => {
      if (e.altKey && (e.key === "q" || e.key === "Q")) {
        const sel = typeof window !== "undefined" ? window.getSelection()?.toString().trim() : "";
        if (sel) return;

        const tag = document.activeElement?.tagName?.toLowerCase();
        if ((tag === "input" && document.activeElement?.type === "text") || tag === "textarea") return;

        e.preventDefault();
        handleInspectModel(null, selectedModel);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFeatureEnabled, isOpen, selectedModel, handleInspectModel]);

  return (
    <div
      data-lens-surface="noise-lab"
      className="flex flex-col gap-3 rounded-2xl app-glass border border-amber-500/30 p-5 bg-gradient-to-br from-amber-500/5 via-[var(--color-app-surface)]/60 to-black/40 shadow-xl shadow-amber-500/5"
    >
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-black font-extrabold shadow-lg shadow-amber-500/20">
            🔬
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[var(--color-app-text-main)]">
                Noise Lab: Environmental Decoherence & Divergence
              </h3>
            </div>
            <p className="text-xs text-[var(--color-app-text-muted)] mt-0.5">
              Inspect how physical and detector noise causes the physical state trajectory to depart from the ideal circuit.
            </p>
          </div>
        </div>

        {/* Right status & toggle */}
        <div className="flex items-center gap-2">
          {activeNoiseConfig && (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 py-1">
              <span className="text-xs text-amber-300 font-mono">
                Active: <strong className="capitalize">{activeNoiseConfig.noiseModel}</strong> (
                {Math.round(activeNoiseConfig.noiseStrength * 100)}%)
              </span>
              <button
                onClick={onClearNoise}
                className="text-[11px] text-red-400 hover:text-red-300 font-bold ml-1 hover:underline cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}

          <button
            onClick={onToggle}
            className="px-3 py-1.5 text-xs font-bold rounded-lg border border-[var(--color-app-border)] hover:bg-[var(--color-app-surface)] text-[var(--color-app-text-muted)] hover:text-[var(--color-app-text-main)] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {isOpen ? "Hide Controls" : "Configure Noise"}
            <svg
              className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expandable configuration area */}
      {isOpen && (
        <div className="mt-2 pt-4 border-t border-[var(--color-app-border)] flex flex-col gap-4">
          {/* Model Selector Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {NOISE_MODELS.map((model) => {
              const isSelected = selectedModel === model.id;
              return (
                <div
                  key={model.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedModel(model.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedModel(model.id);
                    }
                  }}
                  className={`flex flex-col p-3 rounded-xl text-left border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-amber-500/20 border-amber-400 text-white shadow-md shadow-amber-500/10"
                      : "bg-[var(--color-app-surface)]/40 border-[var(--color-app-border)] text-[var(--color-app-text-muted)] hover:border-amber-500/40 hover:text-[var(--color-app-text-main)]"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-bold text-xs">{model.name}</span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                          model.id === "readout"
                            ? "bg-blue-500/20 text-blue-300"
                            : "bg-amber-500/20 text-amber-300"
                        }`}
                      >
                        {model.target}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleInspectModel(e, model.id)}
                        className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? "hover:bg-amber-400/20 text-amber-300 hover:text-white"
                            : "opacity-60 hover:opacity-100 hover:bg-amber-500/20 text-amber-300"
                        }`}
                        title={`Inspect ${model.name} in Context Lens (Alt+Q)`}
                        aria-label={`Inspect ${model.name}`}
                      >
                        🔍
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] leading-tight text-[var(--color-app-text-muted)] mt-1">
                    {model.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Slider and parameter description */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-black/40 border border-[var(--color-app-border)]">
            <div className="flex-1 min-w-[240px] flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[var(--color-app-text-main)] flex items-center gap-1.5">
                  <span>Noise Strength (p):</span>
                  <span className="text-amber-400 font-mono text-sm font-extrabold">{strengthPct}%</span>
                </label>
                <span className="text-[10px] text-[var(--color-app-text-muted)] font-mono">
                  Educational Range: 0% – 50%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={50}
                step={1}
                value={strengthPct}
                onChange={(e) => setStrengthPct(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <p className="text-[11px] text-[var(--color-app-text-muted)] font-mono">
                Mathematical signature: <span className="text-amber-300">${currentModelInfo.formula}$</span>
              </p>
            </div>

            {/* Run Button */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSimulate}
                disabled={isSimulating}
                className="px-5 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-400 to-orange-500 text-black hover:opacity-95 disabled:opacity-50 transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {isSimulating ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Simulating Exact DensityMatrix...</span>
                  </>
                ) : (
                  <>
                    <span>⚡ Run Noisy Simulation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
