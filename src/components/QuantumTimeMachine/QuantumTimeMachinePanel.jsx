import React, { useState, useCallback, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

import BlochSphere3D from "../BlochSphereViewer/BlochSphere3D";
import StateProbabilityHeatmap from "../StateProbabilityHeatmap/StateProbabilityHeatmap";
import TimelineControls from "./TimelineControls";
import TimelineScrubber from "./TimelineScrubber";
import QuantumStateInspector from "./QuantumStateInspector";
import TransitionIntelligencePanel from "./TransitionIntelligencePanel";

import NoiseLabControls from "./NoiseLabControls";
import NoiseDivergencePanel from "./NoiseDivergencePanel";
import DualBlochSphereViewer from "./DualBlochSphereViewer";
import PairedProbabilityHeatmap from "./PairedProbabilityHeatmap";

import { runNoisyCircuitTimeline } from "../../services/api";

export default function QuantumTimeMachinePanel({
  timeline,
  currentStepIndex,
  onStepChange,
  isPlaying,
  onPlayPause,
  playbackSpeed,
  onSpeedChange,
  onReset,
  onClose,
  isStale,
  onRefresh,
  numQubits,

  // Challenge Mode:
  // When true, the Time Machine is used only for
  // ideal circuit exploration. Noise Lab is hidden.
  challengeMode = false,
}) {
  const [selectedQubit, setSelectedQubit] = useState(0);

  /* ============================================================
     STAGE 6: NOISE LAB STATE
     ============================================================ */

  const [showNoiseLab, setShowNoiseLab] = useState(false);
  const [isSimulatingNoise, setIsSimulatingNoise] = useState(false);
  const [noisyTimeline, setNoisyTimeline] = useState(null);
  const [activeNoiseConfig, setActiveNoiseConfig] = useState(null);
  const [noiseError, setNoiseError] = useState(null);

  /* ============================================================
     CHALLENGE MODE SAFETY
     ============================================================ */

  /*
   * Challenge pages do not use noisy simulation.
   *
   * If this panel ever switches into challengeMode while a
   * noisy simulation was already active, clear that state so
   * the ideal Challenge Time Machine remains clean.
   */
  useEffect(() => {
    if (challengeMode) {
      setShowNoiseLab(false);
      setIsSimulatingNoise(false);
      setNoisyTimeline(null);
      setActiveNoiseConfig(null);
      setNoiseError(null);
    }
  }, [challengeMode]);

  /* ============================================================
     RUN NOISE SIMULATION
     ============================================================ */

  const handleRunNoise = useCallback(
    async ({ noiseModel, noiseStrength }) => {
      /*
       * Challenge Mode must never invoke noisy simulation.
       *
       * This is an additional guard in case some child component
       * or future code attempts to trigger it.
       */
      if (challengeMode) {
        return;
      }

      if (!timeline || !timeline.timelineId) {
        setNoiseError(
          "Timeline ID is missing. Please re-run circuit evaluation.",
        );
        return;
      }

      setIsSimulatingNoise(true);
      setNoiseError(null);

      try {
        const res = await runNoisyCircuitTimeline({
          timelineId: timeline.timelineId,
          noiseModel,
          noiseStrength,
        });

        if (res && res.success) {
          setNoisyTimeline(res);
          setActiveNoiseConfig({
            noiseModel,
            noiseStrength,
          });
        } else {
          throw new Error(res?.error || "Failed to simulate noisy evolution.");
        }
      } catch (err) {
        console.error(
          "[QuantumTimeMachinePanel] Noise simulation failed:",
          err,
        );

        setNoiseError(err.message || "Failed to simulate noisy evolution.");
      } finally {
        setIsSimulatingNoise(false);
      }
    },
    [timeline, challengeMode],
  );

  /* ============================================================
     CLEAR NOISE
     ============================================================ */

  const handleClearNoise = useCallback(() => {
    setNoisyTimeline(null);
    setActiveNoiseConfig(null);
    setNoiseError(null);
  }, []);

  /* ============================================================
     CURRENT TIMELINE STATE
     ============================================================ */

  const currentStep =
    timeline?.steps?.[currentStepIndex] || timeline?.steps?.[0] || null;

  /*
   * Noisy state is only relevant in normal Time Machine mode.
   */
  const currentNoisyStep =
    !challengeMode && noisyTimeline && noisyTimeline.steps
      ? noisyTimeline.steps[currentStepIndex]
      : null;

  const blochVectors = currentStep?.blochVectors || [];

  const safeQubit =
    blochVectors.length > 0
      ? Math.min(selectedQubit, blochVectors.length - 1)
      : 0;

  const activeBv = blochVectors[safeQubit] || {
    x: 0,
    y: 0,
    z: 1,
    r: 1,
    theta: 0,
    phi: 0,
    purity: 1,
    isEntangled: false,
  };

  /* ============================================================
     DOMINANT PROBABILITIES
     ============================================================ */

  const dominantProbabilities = React.useMemo(() => {
    if (!currentStep || !currentStep.probabilities) {
      return {};
    }

    const filtered = {};

    for (const [basis, prob] of Object.entries(currentStep.probabilities)) {
      if (prob >= 0.0005) {
        filtered[basis] = prob;
      }
    }

    return Object.keys(filtered).length > 0
      ? filtered
      : currentStep.probabilities;
  }, [currentStep]);

  /* ============================================================
     EMPTY TIMELINE
     ============================================================ */

  if (!timeline || !timeline.steps || timeline.steps.length === 0) {
    return null;
  }

  const [isSphereExpanded, setIsSphereExpanded] = useState(false);

  /* ============================================================
     RENDER
     ============================================================ */

  return (
    <div className="mt-8 flex flex-col gap-6 animate-fade-in">
      {/* ========================================================
          TIME MACHINE HEADER
          ======================================================== */}

      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl app-glass border border-[var(--color-app-primary)]/30 shadow-xl shadow-[var(--color-app-primary-glow)]/5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-app-primary)] to-[var(--color-app-accent)] text-black shadow-lg shadow-[var(--color-app-primary)]/20">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[var(--color-app-text-main)]">
                Quantum Circuit Time Machine
              </h2>

              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[var(--color-app-primary)]/20 text-[var(--color-app-primary)] border border-[var(--color-app-primary)]/30">
                Gate-by-Gate Evolution
              </span>
            </div>

            <p className="text-xs text-[var(--color-app-text-muted)] mt-0.5">
              Inspect quantum state amplitudes, subsystem entanglement, and
              Bloch coordinates at each operation.
            </p>
          </div>
        </div>

        {/* ======================================================
            RIGHT ACTIONS
            ====================================================== */}

        <div className="flex items-center gap-2">
          {/* ----------------------------------------------------
              NOISE LAB
              
              Hidden in Challenge Mode.
              ---------------------------------------------------- */}

          {!challengeMode && (
            <button
              onClick={() => setShowNoiseLab(!showNoiseLab)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 ${
                noisyTimeline
                  ? "bg-amber-500/20 border-amber-400 text-amber-300 shadow-md shadow-amber-500/10"
                  : showNoiseLab
                    ? "bg-[var(--color-app-surface)] border-amber-500/50 text-white"
                    : "border-[var(--color-app-border)] hover:bg-[var(--color-app-surface)] text-[var(--color-app-text-muted)] hover:text-[var(--color-app-text-main)]"
              }`}
              title="Explore environmental decoherence & noise channels"
            >
              <span>🔬</span>

              <span>Noise Lab</span>

              {noisyTimeline && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>
          )}

          {/* ----------------------------------------------------
              UPDATE TIMELINE
              ---------------------------------------------------- */}

          {isStale && (
            <button
              onClick={onRefresh}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-300 hover:bg-amber-500/30 transition-all flex items-center gap-1.5 animate-pulse"
              title="Circuit has changed since timeline was generated"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Update Timeline
            </button>
          )}

          {/* ----------------------------------------------------
              CLOSE
              ---------------------------------------------------- */}

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg border border-[var(--color-app-border)] hover:bg-[var(--color-app-surface)] text-[var(--color-app-text-muted)] hover:text-[var(--color-app-text-main)] transition-colors"
              title="Close Time Machine"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================
          NOISE LAB CONFIGURATION
          
          Completely disabled in Challenge Mode.
          ======================================================== */}

      {!challengeMode && showNoiseLab && (
        <NoiseLabControls
          isOpen={showNoiseLab}
          onToggle={() => setShowNoiseLab(!showNoiseLab)}
          onRunNoise={handleRunNoise}
          onClearNoise={handleClearNoise}
          isSimulating={isSimulatingNoise}
          activeNoiseConfig={activeNoiseConfig}
          divergenceSummary={noisyTimeline?.divergenceSummary}
        />
      )}

      {/* ========================================================
          NOISE ERROR
          ======================================================== */}

      {!challengeMode && noiseError && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center justify-between">
          <span>{noiseError}</span>

          <button
            onClick={() => setNoiseError(null)}
            className="text-red-400 hover:text-white font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* ========================================================
          STALE ALERT
          ======================================================== */}

      {isStale && (
        <div className="px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-amber-400 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>

            <span>
              Circuit structure was modified. The timeline below reflects the
              previous state before edits.
            </span>
          </div>

          <button
            onClick={onRefresh}
            className="text-xs font-bold underline hover:text-white shrink-0"
          >
            Re-run Timeline
          </button>
        </div>
      )}

      {/* ========================================================
          PLAYBACK CONTROLS
          ======================================================== */}

      <div className="flex flex-col gap-3">
        <TimelineControls
          currentStepIndex={currentStepIndex}
          totalSteps={timeline.totalSteps}
          onPrev={() => onStepChange(Math.max(0, currentStepIndex - 1))}
          onNext={() =>
            onStepChange(
              Math.min(timeline.totalSteps - 1, currentStepIndex + 1),
            )
          }
          onReset={onReset}
          onPlayPause={onPlayPause}
          isPlaying={isPlaying}
          playbackSpeed={playbackSpeed}
          onSpeedChange={onSpeedChange}
        />

        <TimelineScrubber
          steps={timeline.steps}
          currentStepIndex={currentStepIndex}
          onSelectStep={onStepChange}
        />
      </div>

      {/* ========================================================
          NOISE DIVERGENCE
          
          Never shown in Challenge Mode.
          ======================================================== */}

      {!challengeMode && noisyTimeline && currentNoisyStep && (
        <NoiseDivergencePanel
          noisyStep={currentNoisyStep}
          idealStep={currentStep}
          stepIndex={currentStepIndex}
          timelineId={timeline?.timelineId}
          noisyTimelineId={noisyTimeline?.noisyTimelineId}
          divergenceSummary={noisyTimeline?.divergenceSummary}
          noiseModel={activeNoiseConfig?.noiseModel}
          noiseStrength={activeNoiseConfig?.noiseStrength}
        />
      )}

      {/* ========================================================
          TRANSITION INTELLIGENCE
          ======================================================== */}

      <TransitionIntelligencePanel
        transition={currentStep.transition}
        stepIndex={currentStepIndex}
        prevStep={
          currentStepIndex > 0 ? timeline.steps[currentStepIndex - 1] : null
        }
        currStep={currentStep}
        numQubits={numQubits}
        timelineId={timeline?.timelineId}
      />

      {/* ========================================================
          VISUAL OBSERVATION GRID
          
          Normal Mode:
            - Noise active → Dual comparison
            - Otherwise → Ideal view

          Challenge Mode:
            - Always ideal view
            - No noisy comparison possible
          ======================================================== */}

      {!challengeMode && noisyTimeline && currentNoisyStep ? (
        /* ======================================================
           NOISY COMPARATIVE VIEW
           ====================================================== */

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ----------------------------------------------------
              Dual Bloch Spheres
              ---------------------------------------------------- */}

          <DualBlochSphereViewer
            idealBlochVectors={currentStep.blochVectors || []}
            noisyBlochVectors={currentNoisyStep.blochVectors || []}
            selectedQubit={selectedQubit}
            onSelectQubit={setSelectedQubit}
            numQubits={numQubits}
          />

          {/* ----------------------------------------------------
              State Inspector + Paired Heatmap
              ---------------------------------------------------- */}

          <div className="flex flex-col gap-6">
            <QuantumStateInspector step={currentStep} numQubits={numQubits} />

            <PairedProbabilityHeatmap
              idealProbabilities={currentStep.probabilities || {}}
              noisyProbabilities={currentNoisyStep.quantumProbabilities || {}}
              readoutProbabilities={
                currentNoisyStep.readoutObservedProbabilities || null
              }
              noiseModel={activeNoiseConfig?.noiseModel}
            />
          </div>
        </div>
      ) : (
        /* ======================================================
           IDEAL / CHALLENGE VIEW
           ====================================================== */

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ====================================================
              LEFT: BLOCH SPHERE
              ==================================================== */}

          <div className="app-glass rounded-2xl p-5 border border-[var(--color-app-border)] flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-[var(--color-app-border)] pb-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-app-text-muted)]">
                    Subsystem Bloch Sphere
                  </h3>

                  <p className="text-[11px] text-[var(--color-app-text-muted)]">
                    Tracing out all other qubits: Tr<sub>q</sub>(|ψ⟩⟨ψ|)
                  </p>
                </div>

                {/* Qubit Selector */}

                <div className="flex items-center gap-1 rounded-lg bg-[var(--color-app-surface)] p-1 border border-[var(--color-app-border)]">
                  {Array.from({
                    length: numQubits || 1,
                  }).map((_, q) => (
                    <button
                      key={q}
                      onClick={() => setSelectedQubit(q)}
                      className={`px-2.5 py-1 text-xs font-mono rounded-md transition-all ${
                        safeQubit === q
                          ? "bg-[var(--color-app-primary)] text-black font-bold shadow"
                          : "text-[var(--color-app-text-muted)] hover:text-[var(--color-app-text-main)]"
                      }`}
                    >
                      q[{q}]
                    </button>
                  ))}
                </div>
              </div>

              {/* ==================================================
                  3D BLOCH SPHERE
                  ================================================== */}

              <div
                className="relative h-64 w-full rounded-xl overflow-hidden bg-black/40 border border-[var(--color-app-border)] cursor-zoom-in group"
                onClick={() => setIsSphereExpanded(true)}
                title="Click to expand"
              >
                <Canvas
                  camera={{
                    position: [2.8, 1.8, 3.2],
                    fov: 45,
                  }}
                >
                  <ambientLight intensity={0.6} />

                  <pointLight position={[10, 10, 10]} intensity={0.8} />

                  <OrbitControls enableZoom={false} enablePan={false} />

                  <BlochSphere3D
                    theta={activeBv.theta}
                    phi={activeBv.phi}
                    radius={activeBv.r}
                  />
                </Canvas>

                {/* Entanglement indicator */}

                {activeBv.isEntangled && (
                  <div className="absolute top-2 left-2 px-2 py-1 rounded bg-purple-950/80 border border-purple-500/50 text-[10px] font-mono text-purple-200">
                    ⚡ Entangled Subsystem (Mixed State: r ={" "}
                    {activeBv.r.toFixed(2)})
                  </div>
                )}
              </div>
            </div>

            {/* ==================================================
                BLOCH TELEMETRY
                ================================================== */}

            <div className="mt-4 pt-3 border-t border-[var(--color-app-border)] grid grid-cols-3 sm:grid-cols-6 gap-2 text-center font-mono text-xs">
              <div className="p-1.5 rounded bg-[var(--color-app-surface)] border border-[var(--color-app-border)]">
                <div className="text-[10px] text-[var(--color-app-text-muted)]">
                  X
                </div>
                <div className="font-bold text-red-400">
                  {activeBv.x.toFixed(3)}
                </div>
              </div>

              <div className="p-1.5 rounded bg-[var(--color-app-surface)] border border-[var(--color-app-border)]">
                <div className="text-[10px] text-[var(--color-app-text-muted)]">
                  Y
                </div>
                <div className="font-bold text-emerald-400">
                  {activeBv.y.toFixed(3)}
                </div>
              </div>

              <div className="p-1.5 rounded bg-[var(--color-app-surface)] border border-[var(--color-app-border)]">
                <div className="text-[10px] text-[var(--color-app-text-muted)]">
                  Z
                </div>
                <div className="font-bold text-[var(--color-app-primary)]">
                  {activeBv.z.toFixed(3)}
                </div>
              </div>

              <div className="p-1.5 rounded bg-[var(--color-app-surface)] border border-[var(--color-app-border)]">
                <div className="text-[10px] text-[var(--color-app-text-muted)]">
                  Radius r
                </div>
                <div className="font-bold text-amber-400">
                  {activeBv.r.toFixed(3)}
                </div>
              </div>

              <div className="p-1.5 rounded bg-[var(--color-app-surface)] border border-[var(--color-app-border)]">
                <div className="text-[10px] text-[var(--color-app-text-muted)]">
                  θ (rad)
                </div>
                <div className="font-bold">{activeBv.theta.toFixed(3)}</div>
              </div>

              <div className="p-1.5 rounded bg-[var(--color-app-surface)] border border-[var(--color-app-border)]">
                <div className="text-[10px] text-[var(--color-app-text-muted)]">
                  Purity γ
                </div>
                <div className="font-bold text-purple-400">
                  {activeBv.purity.toFixed(3)}
                </div>
              </div>
            </div>
          </div>

          {/* ====================================================
              RIGHT: STATE INSPECTOR + PROBABILITY HEATMAP
              ==================================================== */}

          <div className="flex flex-col gap-6">
            <QuantumStateInspector step={currentStep} numQubits={numQubits} />

            <StateProbabilityHeatmap probabilities={dominantProbabilities} />
          </div>
        </div>
      )}

      {/* ==================================================
          EXPANDED BLOCH SPHERE
          ================================================== */}
      {isSphereExpanded && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center"
          onClick={() => setIsSphereExpanded(false)}
        >
          <div
            className="relative w-[90vw] h-[90vh] rounded-2xl overflow-hidden border border-white/20 bg-black"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsSphereExpanded(false)}
              className="absolute top-4 right-4 z-10 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white"
            >
              ✕
            </button>

            <Canvas camera={{ position: [3.5, 2.5, 4.5], fov: 45 }}>
              <ambientLight intensity={0.6} />

              <pointLight position={[5, 5, 5]} intensity={1} />

              <OrbitControls
                enableZoom={true}
                enablePan={false}
                minDistance={2.5}
                maxDistance={10}
                enableDamping
                dampingFactor={0.08}
              />

              <BlochSphere3D
                theta={activeBv.theta}
                phi={activeBv.phi}
                radius={activeBv.r}
              />
            </Canvas>
          </div>
        </div>
      )}
    </div>
  );
}
