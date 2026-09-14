import React, { useState } from "react";
import { explainNoiseDivergence } from "../../services/api";
import MathHTMLContainer from "../MathHTMLContainer/MathHTMLContainer";
import { marked } from "marked";
import { useQuantumContextLens } from "../../context/QuantumContextLensContext";
import { extractNoiseLabContext } from "../QuantumContextLens/adapters/noiseLabEntityAdapter";

export default function NoiseDivergencePanel({
  noisyStep,
  idealStep,
  stepIndex,
  totalSteps = 1,
  timelineId,
  noisyTimelineId,
  divergenceSummary,
  noiseModel,
  noiseStrength,
  selectedQubit = 0,
  numQubits = 1,
}) {
  const [explanationCache, setExplanationCache] = useState({});
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [userQuestion, setUserQuestion] = useState("");
  const [showQuestionInput, setShowQuestionInput] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const { isFeatureEnabled, openLens } = useQuantumContextLens();

  const handleInspectMetric = React.useCallback((e, metricKey) => {
    if (e) e.stopPropagation();
    if (!isFeatureEnabled) return;

    const ctx = extractNoiseLabContext({
      entityKey: metricKey,
      entityType: "noise-metric",
      activeNoiseConfig: { noiseModel, noiseStrength },
      idealStep,
      noisyStep,
      stepIndex,
      totalSteps,
      selectedQubit,
      numQubits,
      divergenceSummary,
    });

    if (ctx && ctx.entity) {
      openLens(ctx.entity, ctx);
    }
  }, [isFeatureEnabled, noiseModel, noiseStrength, idealStep, noisyStep, stepIndex, totalSteps, selectedQubit, numQubits, divergenceSummary, openLens]);

  // Keyboard shortcut (Alt + Q) to inspect primary metric (State Fidelity) when panel is expanded
  React.useEffect(() => {
    if (!isFeatureEnabled || !isExpanded) return;

    const handleKeyDown = (e) => {
      if (e.altKey && (e.key === "q" || e.key === "Q")) {
        const sel = typeof window !== "undefined" ? window.getSelection()?.toString().trim() : "";
        if (sel) return;

        const tag = document.activeElement?.tagName?.toLowerCase();
        if ((tag === "input" && document.activeElement?.type === "text") || tag === "textarea") return;

        e.preventDefault();
        handleInspectMetric(null, "fidelity");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFeatureEnabled, isExpanded, handleInspectMetric]);

  if (!noisyStep) return null;

  const fidelity =
    noisyStep.fidelity !== undefined ? noisyStep.fidelity : 1.0;

  const divergence =
    noisyStep.divergence !== undefined ? noisyStep.divergence : 0.0;

  const purityDelta =
    noisyStep.purityDelta !== undefined ? noisyStep.purityDelta : 0.0;

  const maxBlochDist =
    noisyStep.maxBlochDistance !== undefined
      ? noisyStep.maxBlochDistance
      : 0.0;

  const fidPct = (fidelity * 100).toFixed(1);
  const divPct = (divergence * 100).toFixed(1);

  // Cached AI explanation for current step
  const currentExplanation = explanationCache[stepIndex];

  const handleRequestExplanation = async (customQuestion = null) => {
    if (!timelineId || !noisyTimelineId) {
      setAiError("Timeline session ID missing. Please rerun simulation.");
      return;
    }

    setIsLoadingAI(true);
    setAiError(null);

    const questionToSend =
      typeof customQuestion === "string"
        ? customQuestion
        : userQuestion;

    try {
      const response = await explainNoiseDivergence({
        timelineId,
        noisyTimelineId,
        stepIndex,
        learnerQuestion: questionToSend.trim() || undefined,
      });

      if (
        response &&
        response.success &&
        response.explanation
      ) {
        setExplanationCache((prev) => ({
          ...prev,
          [stepIndex]: {
            ...response.explanation,
            isFallback: response.isFallback,
          },
        }));
      } else {
        throw new Error(
          response?.error ||
            "Failed to retrieve noise explanation."
        );
      }
    } catch (err) {
      console.error(
        "[NoiseDivergencePanel] AI Error:",
        err
      );

      setAiError(
        err.message ||
          "Failed to contact AI explainer. Using local rule analysis."
      );
    } finally {
      setIsLoadingAI(false);
    }
  };

  const isReadout = noiseModel === "readout";

  const isFirstDivergenceStep =
    divergenceSummary?.firstMeaningfulDivergenceStep ===
    stepIndex;

  return (
    <div className="flex flex-col gap-3 p-5 rounded-2xl app-glass border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-[var(--color-app-surface)] to-black/60 shadow-xl shadow-amber-500/5 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-app-border)] pb-3">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>

          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
                Noise Lab: Cross-Sectional Divergence (Step {stepIndex})
              </h4>
            </div>

            <p className="text-[11px] text-[var(--color-app-text-muted)]">
              Contrasting physical noisy density matrix ρₖ
              against mathematical ideal state |ψₖ⟩.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs font-mono text-[var(--color-app-text-muted)] hover:text-white cursor-pointer"
        >
          {isExpanded ? "Collapse" : "Expand"}
        </button>
      </div>

      {isExpanded && (
        <div className="flex flex-col gap-4">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            {/* 1. Fidelity */}
            <div className="p-3 rounded-xl bg-black/40 border border-[var(--color-app-border)] flex flex-col items-center">
              <div className="flex items-center justify-between w-full">
                <span className="text-[10px] uppercase font-bold text-[var(--color-app-text-muted)]">
                  State Fidelity F
                </span>
                <button
                  type="button"
                  onClick={(e) => handleInspectMetric(e, "fidelity")}
                  className="p-1 rounded hover:bg-amber-500/20 text-amber-300/80 hover:text-white transition-colors text-xs cursor-pointer"
                  title="Inspect State Fidelity in Context Lens (Alt+Q)"
                  aria-label="Inspect State Fidelity"
                >
                  🔍
                </button>
              </div>

              <span
                className={`text-base font-extrabold font-mono mt-1 ${
                  fidelity >= 0.9
                    ? "text-emerald-400"
                    : fidelity >= 0.7
                    ? "text-amber-400"
                    : "text-red-400"
                }`}
              >
                {fidPct}%
              </span>

              <span className="text-[9px] text-[var(--color-app-text-muted)] font-mono">
                ⟨ψ|ρ|ψ⟩
              </span>
            </div>

            {/* 2. Cumulative Divergence */}
            <div className="p-3 rounded-xl bg-black/40 border border-[var(--color-app-border)] flex flex-col items-center">
              <div className="flex items-center justify-between w-full">
                <span className="text-[10px] uppercase font-bold text-[var(--color-app-text-muted)]">
                  State Divergence D
                </span>
                <button
                  type="button"
                  onClick={(e) => handleInspectMetric(e, "divergence")}
                  className="p-1 rounded hover:bg-amber-500/20 text-amber-300/80 hover:text-white transition-colors text-xs cursor-pointer"
                  title="Inspect State Divergence in Context Lens (Alt+Q)"
                  aria-label="Inspect State Divergence"
                >
                  🔍
                </button>
              </div>

              <span
                className={`text-base font-extrabold font-mono mt-1 ${
                  divergence < 0.05
                    ? "text-emerald-400"
                    : divergence < 0.2
                    ? "text-amber-400"
                    : "text-red-400"
                }`}
              >
                {divPct}%
              </span>

              <span className="text-[9px] text-[var(--color-app-text-muted)] font-mono">
                1 − F
              </span>
            </div>

            {/* 3. Purity Delta */}
            <div className="p-3 rounded-xl bg-black/40 border border-[var(--color-app-border)] flex flex-col items-center">
              <div className="flex items-center justify-between w-full">
                <span className="text-[10px] uppercase font-bold text-[var(--color-app-text-muted)]">
                  Purity Delta Δγ
                </span>
                <button
                  type="button"
                  onClick={(e) => handleInspectMetric(e, "purityDelta")}
                  className="p-1 rounded hover:bg-amber-500/20 text-amber-300/80 hover:text-white transition-colors text-xs cursor-pointer"
                  title="Inspect Purity Delta in Context Lens (Alt+Q)"
                  aria-label="Inspect Purity Delta"
                >
                  🔍
                </button>
              </div>

              <span
                className={`text-base font-extrabold font-mono mt-1 ${
                  purityDelta > -0.01
                    ? "text-emerald-400"
                    : "text-purple-400"
                }`}
              >
                {purityDelta > 0
                  ? `+${purityDelta.toFixed(3)}`
                  : purityDelta.toFixed(3)}
              </span>

              <span className="text-[9px] text-[var(--color-app-text-muted)] font-mono">
                Tr(ρ²) − 1.0
              </span>
            </div>

            {/* 4. Max Bloch Distance */}
            <div className="p-3 rounded-xl bg-black/40 border border-[var(--color-app-border)] flex flex-col items-center">
              <div className="flex items-center justify-between w-full">
                <span className="text-[10px] uppercase font-bold text-[var(--color-app-text-muted)]">
                  Max Bloch Distance
                </span>
                <button
                  type="button"
                  onClick={(e) => handleInspectMetric(e, "bloch")}
                  className="p-1 rounded hover:bg-amber-500/20 text-amber-300/80 hover:text-white transition-colors text-xs cursor-pointer"
                  title="Inspect Max Bloch Distance in Context Lens (Alt+Q)"
                  aria-label="Inspect Max Bloch Distance"
                >
                  🔍
                </button>
              </div>

              <span
                className={`text-base font-extrabold font-mono mt-1 ${
                  maxBlochDist < 0.05
                    ? "text-emerald-400"
                    : "text-amber-400"
                }`}
              >
                {maxBlochDist.toFixed(3)}
              </span>

              <span className="text-[9px] text-[var(--color-app-text-muted)] font-mono">
                max₍q₎ ‖rᵢ − rₙ‖
              </span>
            </div>
          </div>

          {/* Attribution Badge if first meaningful divergence point */}
          {divergenceSummary?.firstMeaningfulDivergenceStep !==
            undefined &&
            divergenceSummary?.firstMeaningfulDivergenceStep !==
              null && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5">
                <span className="text-amber-400 text-sm mt-0.5">
                  ⚡
                </span>

                <div className="text-xs">
                  <span className="font-bold text-amber-200">
                    Noticeable Divergence Marker:
                  </span>{" "}

                  <span className="text-amber-100">
                    Divergence first crossed the pedagogical
                    threshold (5%) at{" "}
                    <strong>
                      Step{" "}
                      {
                        divergenceSummary.firstMeaningfulDivergenceStep
                      }
                    </strong>{" "}
                    (
                    {
                      divergenceSummary
                        .gateAtFirstDivergence?.type ||
                      "Gate"
                    }{" "}
                    {divergenceSummary
                      .gateAtFirstDivergence?.wire !==
                      undefined
                      ? `on q[${divergenceSummary.gateAtFirstDivergence.wire}]`
                      : ""}
                    ) with{" "}
                    {(
                      divergenceSummary.maxDivergence * 100
                    ).toFixed(1)}
                    % cumulative state deviation.
                  </span>

                  <p className="text-[10px] text-amber-300/70 mt-1 font-mono">
                    *Identifies when cumulative error became
                    observable; does not imply this single
                    operation caused all downstream decoherence.
                  </p>
                </div>
              </div>
            )}

          {/* Readout-specific distinction banner */}
          {isReadout && (
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-start gap-2.5 text-xs text-blue-200">
              <span className="text-blue-400 text-sm">
                ℹ️
              </span>

              <div>
                <strong>
                  Classical Readout Noise Active:
                </strong>{" "}
                The physical density matrix and quantum
                fidelity remain 100% ideal (F = 1.0).
                Observed deviations exist solely in the
                classical measurement bitstring distribution
                (Pₒᵦₛ).
              </div>
            </div>
          )}

          {/* AI Explain Noise Effect Section */}
          <div className="mt-2 pt-3 border-t border-[var(--color-app-border)] flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm">✨</span>

                <h5 className="text-xs font-bold uppercase tracking-wider text-[var(--color-app-text-main)]">
                  AI Grounded Decoherence Explanation
                </h5>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setShowQuestionInput(
                      !showQuestionInput
                    )
                  }
                  className="px-2.5 py-1 text-xs rounded-lg border border-[var(--color-app-border)] hover:bg-[var(--color-app-surface)] text-[var(--color-app-text-muted)] hover:text-[var(--color-app-text-main)] transition-colors"
                >
                  {showQuestionInput
                    ? "Hide Question"
                    : "Ask Custom Question"}
                </button>

                <button
                  onClick={() =>
                    handleRequestExplanation()
                  }
                  disabled={isLoadingAI}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-400 to-orange-500 text-black hover:opacity-90 disabled:opacity-50 transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isLoadingAI ? (
                    <>
                      <svg
                        className="w-3.5 h-3.5 animate-spin"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />

                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>

                      <span>Analyzing Facts...</span>
                    </>
                  ) : (
                    <span>Explain Noise Effect</span>
                  )}
                </button>
              </div>
            </div>

            {/* Custom Question Bar */}
            {showQuestionInput && (
              <div className="flex flex-col gap-2 p-3 rounded-xl bg-black/40 border border-[var(--color-app-border)] animate-fade-in">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={userQuestion}
                    onChange={(e) =>
                      setUserQuestion(e.target.value)
                    }
                    placeholder="e.g. Why did the Bloch vector shrink? Is this mixedness or entanglement?"
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-[var(--color-app-surface)] border border-[var(--color-app-border)] text-white focus:outline-none focus:border-amber-400"
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        !isLoadingAI
                      ) {
                        handleRequestExplanation();
                      }
                    }}
                  />

                  <button
                    onClick={() =>
                      handleRequestExplanation()
                    }
                    disabled={
                      isLoadingAI ||
                      !userQuestion.trim()
                    }
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 disabled:opacity-40"
                  >
                    Ask
                  </button>
                </div>

                {/* Suggested prompt chips */}
                <div className="flex flex-wrap gap-1.5 text-[10px]">
                  <span className="text-[var(--color-app-text-muted)] py-0.5">
                    Quick prompts:
                  </span>

                  {[
                    "Why did the Bloch vector shrink?",
                    "Does reduced purity mean the qubits are entangled?",
                    "How does this noise channel affect phase coherence?",
                  ].map((chip) => (
                    <button
                      key={chip}
                      onClick={() => {
                        setUserQuestion(chip);
                        handleRequestExplanation(chip);
                      }}
                      className="px-2 py-0.5 rounded-full bg-[var(--color-app-surface)] border border-[var(--color-app-border)] hover:border-amber-400/50 text-[var(--color-app-text-muted)] hover:text-white transition-colors text-left"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Error banner */}
            {aiError && (
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                {aiError}
              </div>
            )}

            {/* Rendered Explanation Card */}
            {currentExplanation && (
              <div className="p-4 rounded-xl app-glass border border-amber-500/40 bg-black/60 flex flex-col gap-3 animate-fade-in">
                <div className="flex items-center justify-between border-b border-[var(--color-app-border)] pb-2">
                  <h6 className="text-xs font-bold text-amber-300 flex items-center gap-2">
                    <span>💡</span>

                    <span>
                      {currentExplanation.headline}
                    </span>
                  </h6>

                  {currentExplanation.isFallback && (
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-[var(--color-app-surface)] text-[var(--color-app-text-muted)] border border-[var(--color-app-border)] font-mono">
                      Deterministic Physics Rule
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  {/* Physical Mechanism */}
                  <div className="p-3 rounded-lg bg-[var(--color-app-surface)]/60 border border-[var(--color-app-border)] flex flex-col gap-1">
                    <span className="text-[10px] uppercase font-bold text-amber-400">
                      Physical Mechanism
                    </span>

                    <div className="text-[11px] leading-relaxed text-[var(--color-app-text-main)]">
                      <MathHTMLContainer
                        html={marked.parse(
                          currentExplanation.physicalMechanism
                        )}
                      />
                    </div>
                  </div>

                  {/* Bloch Divergence */}
                  <div className="p-3 rounded-lg bg-[var(--color-app-surface)]/60 border border-[var(--color-app-border)] flex flex-col gap-1">
                    <span className="text-[10px] uppercase font-bold text-purple-400">
                      Bloch Vector & Mixedness
                    </span>

                    <div className="text-[11px] leading-relaxed text-[var(--color-app-text-main)]">
                      <MathHTMLContainer
                        html={marked.parse(
                          currentExplanation.blochDivergence
                        )}
                      />
                    </div>
                  </div>

                  {/* Takeaway */}
                  <div className="p-3 rounded-lg bg-[var(--color-app-surface)]/60 border border-[var(--color-app-border)] flex flex-col gap-1">
                    <span className="text-[10px] uppercase font-bold text-emerald-400">
                      Pedagogical Takeaway
                    </span>

                    <div className="text-[11px] leading-relaxed text-[var(--color-app-text-main)]">
                      <MathHTMLContainer
                        html={marked.parse(
                          currentExplanation.takeaway
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
