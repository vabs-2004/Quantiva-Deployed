/**
 * QuantumContextLensDrawer.jsx
 * 
 * Quantiva Phase 1 & 2: Responsive Inspector Drawer for the Quantum Contextual Lens.
 * 
 * Implements the 8-Level Progressive Depth UX:
 * 1. Quick Meaning (1-2 sentences)
 * 2. Intuition (mental model / analogy)
 * 3. Mathematics (KaTeX rendered formalism)
 * 4. Why It Matters Here (Contextual reasoning)
 * 5. Visualize (Direct verified link to 3D Bloch / Atom when available)
 * 6. Experiment (Direct verified link to Simulator / Sandbox when available)
 * 7. Learn (Direct verified link to parent Micro Module when available)
 * 8. Ask AI Tutor (Explicit, safe handoff without state contamination)
 */

import { Link } from "react-router-dom";
import { useQuantumContextLens } from "../../context/QuantumContextLensContext";
import { useAITutor } from "../../context/AITutorContext";
import MathHTMLContainer from "../MathHTMLContainer/MathHTMLContainer";
import { formatLensContentToHtml } from "./lensContentRenderer";

function formatNoiseLabBreadcrumb(ctx) {
  if (!ctx) return "Noise Lab";
  const parts = ["Noise Lab"];

  if (ctx.noiseModel) {
    const modelLabels = {
      depolarizing: "Depolarizing",
      phase_flip: "Phase Flip",
      bit_flip: "Bit Flip",
      readout: "Readout",
    };
    const modelName =
      modelLabels[ctx.noiseModel] ||
      ctx.noiseModel.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    const pct =
      typeof ctx.noiseStrength === "number"
        ? `${Math.round(ctx.noiseStrength * 100)}%`
        : typeof ctx.strengthPct === "number"
        ? `${ctx.strengthPct}%`
        : null;

    parts.push(pct ? `${modelName} (${pct})` : modelName);
  }

  if (ctx.stepIndex !== undefined && ctx.stepIndex !== null) {
    parts.push(`Step ${ctx.stepIndex}`);
  }

  return parts.join(" • ");
}

export default function QuantumContextLensDrawer() {
  const {
    isFeatureEnabled,
    isOpen,
    activeEntity,
    activeContext,
    tier1Data,
    tier2Data,
    loadingTier2,
    errorTier2,
    closeLens,
    requestDeepExplanation,
    handoffToAITutor,
  } = useQuantumContextLens();

  // Safely grab openTutor from AITutorContext if mounted
  let openTutor = null;
  try {
    const aiTutor = useAITutor();
    openTutor = aiTutor?.openTutor || null;
  } catch {
    openTutor = null;
  }

  if (!isFeatureEnabled || !isOpen || !activeEntity) {
    return null;
  }

  const categoryLabel = (activeEntity.category || "concept").toUpperCase();
  // Tier 1 canonical ontology is ALWAYS authoritative for core definitions, intuition, and math
  const quickMeaning = tier1Data?.quickMeaning || tier2Data?.quickMeaning || null;
  const intuitionContent = tier1Data?.intuition || tier2Data?.intuition || null;
  const mathContent = tier1Data?.mathematics || tier2Data?.mathematics || null;
  const contextualRole = tier2Data?.contextualRole || (!loadingTier2 ? tier1Data?.whyItMatters : null);

  return (
    <>
      {/* Subtle Backdrop */}
      <div
        className="fixed inset-0 z-[105] bg-black/40 backdrop-blur-[2px] transition-opacity animate-fade-in"
        onClick={closeLens}
        aria-hidden="true"
      />

      {/* Slide-over Inspector Sheet */}
      <aside
        className="fixed top-0 right-0 bottom-0 z-[110] w-full sm:w-[420px] max-w-full flex flex-col shadow-2xl border-l overflow-hidden transition-all animate-slide-in-right"
        style={{
          background: "var(--color-app-surface)",
          borderColor: "var(--color-app-border)",
          boxShadow: "-12px 0 40px rgba(0, 0, 0, 0.5)",
        }}
        role="dialog"
        aria-label="Quantum Context Lens"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ borderColor: "var(--color-app-border)" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 shadow-md"
              style={{
                background: "linear-gradient(135deg, #3b82f6, #6366f1)",
              }}
            >
              <span className="text-sm">🔍</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300">
                  {categoryLabel}
                </span>
                <span className="text-[11px] font-semibold text-[var(--color-app-text-muted)]">
                  Context Lens
                </span>
              </div>
              <h3 className="text-base font-extrabold text-[var(--color-app-text-main)] flex items-center gap-2 mt-0.5">
                {activeEntity.displayName}
                {activeEntity.symbol && (
                  <span className="text-xs font-mono font-normal text-indigo-300 bg-indigo-500/20 px-1.5 py-0.5 rounded border border-indigo-500/30">
                    {activeEntity.symbol}
                  </span>
                )}
              </h3>
            </div>
          </div>

          <button
            onClick={closeLens}
            className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--color-app-text-muted)] hover:text-white transition-colors cursor-pointer"
            aria-label="Close Quantum Lens"
            title="Close (Escape)"
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Viewport */}
        <div
          data-lenis-prevent="true"
          className="flex-1 overflow-y-auto p-5 space-y-4"
          style={{ scrollBehavior: "smooth" }}
        >
          {/* Level 1: Quick Meaning */}
          {quickMeaning && (
            <div className="rounded-xl p-3.5 border bg-white/[0.02]" style={{ borderColor: "var(--color-app-border)" }}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 mb-1 flex items-center gap-1.5">
                <span>⚡</span> Quick Meaning
              </div>
              <div className="text-xs text-[var(--color-app-text-main)] leading-relaxed font-medium">
                <MathHTMLContainer html={formatLensContentToHtml(quickMeaning)} />
              </div>
            </div>
          )}

          {/* Level 2: Intuition */}
          {intuitionContent && (
            <div className="rounded-xl p-3.5 border bg-white/[0.02]" style={{ borderColor: "var(--color-app-border)" }}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-1 flex items-center gap-1.5">
                <span>💡</span> Physical Intuition
              </div>
              <div className="text-xs text-[var(--color-app-text-muted)] leading-relaxed">
                <MathHTMLContainer html={formatLensContentToHtml(intuitionContent)} />
              </div>
            </div>
          )}

          {/* Level 3: Mathematics */}
          {mathContent && (
            <div className="rounded-xl p-3.5 border bg-white/[0.02]" style={{ borderColor: "var(--color-app-border)" }}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1.5 flex items-center gap-1.5">
                <span>📐</span> Mathematical Formalism
              </div>
              <div className="text-xs text-[var(--color-app-text-main)] overflow-x-auto py-1">
                <MathHTMLContainer html={formatLensContentToHtml(mathContent)} />
              </div>
            </div>
          )}

          {/* Level 4: Role in This Context */}
          <div
            className="rounded-xl p-3.5 border transition-all"
            style={{
              background: "rgba(99, 102, 241, 0.05)",
              borderColor: "rgba(99, 102, 241, 0.25)",
            }}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                <span>🎯</span> Role in This Context
              </div>
              {activeContext?.lessonTitle ? (
                <span className="text-[10px] font-semibold text-indigo-400/80 truncate max-w-[180px]">
                  {activeContext.lessonTitle}
                </span>
              ) : activeContext?.algorithmName ? (
                <span className="text-[10px] font-semibold text-indigo-400/80 truncate max-w-[180px]">
                  {activeContext.algorithmName}
                </span>
              ) : activeContext?.surface === "circuit-simulator" ? (
                <span className="text-[10px] font-semibold text-indigo-400/80 truncate max-w-[180px] font-mono">
                  q[{activeContext.qubitIndex}] • Layer {activeContext.layerIndex !== null ? activeContext.layerIndex + 1 : ""}
                </span>
              ) : activeContext?.surface === "noise-lab" ? (
                <span className="text-[10px] font-semibold text-amber-400/90 truncate max-w-[240px] font-mono">
                  {formatNoiseLabBreadcrumb(activeContext)}
                </span>
              ) : null}
            </div>

            {loadingTier2 ? (
              <div className="py-2.5 px-3 rounded-lg text-xs flex items-center gap-2 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                <span className="animate-spin text-sm">🌀</span>
                <span>
                  Grounding in {activeContext?.lessonTitle || activeContext?.algorithmName || (activeContext?.surface === "noise-lab" ? formatNoiseLabBreadcrumb(activeContext) : activeContext?.surface === "circuit-simulator" ? `q[${activeContext?.qubitIndex}] circuit context` : "current context")}...
                </span>
              </div>
            ) : contextualRole ? (
              <div className="text-xs text-[var(--color-app-text-main)] leading-relaxed">
                <MathHTMLContainer html={formatLensContentToHtml(contextualRole)} />
              </div>
            ) : (
              <p className="text-xs text-[var(--color-app-text-muted)] italic">
                General quantum computing concept.
              </p>
            )}

            {errorTier2 && !contextualRole && (
              <div className="mt-2 text-[11px] text-amber-400/90 bg-amber-950/30 p-2 rounded border border-amber-500/30 flex items-center justify-between">
                <span>{errorTier2}</span>
                <button
                  onClick={requestDeepExplanation}
                  className="text-[10px] underline hover:text-white ml-2 cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}
          </div>

          {/* Action Pathways (Levels 5, 6, 7) */}
          <div className="pt-2 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-app-text-light)]">
              Interactive Destinations
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Level 5: Visualize */}
              {tier1Data?.visualizeUrl && (
                <Link
                  to={tier1Data.visualizeUrl}
                  onClick={closeLens}
                  className="p-2.5 rounded-xl border flex items-center gap-2 transition-all hover:border-indigo-500/40 hover:bg-white/5 cursor-pointer"
                  style={{
                    borderColor: "var(--color-app-border)",
                    background: "var(--color-app-surface-hover)",
                  }}
                >
                  <span className="text-base">🌐</span>
                  <div className="overflow-hidden">
                    <div className="text-[11px] font-bold text-[var(--color-app-text-main)] truncate">
                      Visualize
                    </div>
                    <div className="text-[10px] text-[var(--color-app-text-muted)] truncate">
                      Bloch Sphere
                    </div>
                  </div>
                </Link>
              )}

              {/* Level 6: Experiment */}
              {tier1Data?.experimentUrl && (
                <Link
                  to={tier1Data.experimentUrl}
                  onClick={closeLens}
                  className="p-2.5 rounded-xl border flex items-center gap-2 transition-all hover:border-indigo-500/40 hover:bg-white/5 cursor-pointer"
                  style={{
                    borderColor: "var(--color-app-border)",
                    background: "var(--color-app-surface-hover)",
                  }}
                >
                  <span className="text-base">⚡</span>
                  <div className="overflow-hidden">
                    <div className="text-[11px] font-bold text-[var(--color-app-text-main)] truncate">
                      Experiment
                    </div>
                    <div className="text-[10px] text-[var(--color-app-text-muted)] truncate">
                      Simulator / Lab
                    </div>
                  </div>
                </Link>
              )}

              {/* Level 7: Learn */}
              {tier1Data?.learnUrl && (
                <Link
                  to={tier1Data.learnUrl}
                  onClick={closeLens}
                  className="p-2.5 rounded-xl border flex items-center gap-2 transition-all hover:border-indigo-500/40 hover:bg-white/5 cursor-pointer sm:col-span-2"
                  style={{
                    borderColor: "var(--color-app-border)",
                    background: "var(--color-app-surface-hover)",
                  }}
                >
                  <span className="text-base">📖</span>
                  <div className="overflow-hidden">
                    <div className="text-[11px] font-bold text-[var(--color-app-text-main)] truncate">
                      Deepen via Micro Module
                    </div>
                    <div className="text-[10px] text-[var(--color-app-text-muted)] truncate">
                      Open dedicated interactive lesson
                    </div>
                  </div>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Footer: Level 8 Explicit Handoff to AI Tutor */}
        {openTutor && (
          <div
            className="p-4 border-t shrink-0 flex flex-col gap-2"
            style={{
              background: "rgba(9, 9, 11, 0.7)",
              borderColor: "var(--color-app-border)",
            }}
          >
            {tier2Data?.suggestedTutorQuestion && (
              <div className="text-[11px] text-indigo-300/90 italic px-1 flex items-start gap-1">
                <span className="font-semibold text-indigo-400 not-italic shrink-0">Follow-up:</span>
                <div className="inline truncate">
                  <MathHTMLContainer html={formatLensContentToHtml(tier2Data.suggestedTutorQuestion)} />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <div className="text-[11px] text-[var(--color-app-text-muted)] truncate">
                Still curious about <strong className="text-white">{activeEntity.displayName}</strong>?
              </div>

              <button
                onClick={() => handoffToAITutor(openTutor)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-md hover:scale-105 active:scale-95 shrink-0 cursor-pointer flex items-center gap-1.5"
                style={{
                  background: "linear-gradient(135deg, var(--color-app-primary), var(--color-app-accent))",
                }}
                title="Open full conversation with AI Tutor"
              >
                <span>✨</span> Ask AI Tutor
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
