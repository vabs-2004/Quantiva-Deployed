import React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import BlochSphere3D from "../BlochSphereViewer/BlochSphere3D";
import { useQuantumContextLens } from "../../context/QuantumContextLensContext";
import { extractNoiseLabContext } from "../QuantumContextLens/adapters/noiseLabEntityAdapter";

export default function DualBlochSphereViewer({
  idealBlochVectors = [],
  noisyBlochVectors = [],
  selectedQubit = 0,
  onSelectQubit,
  numQubits = 1,
  idealStep = null,
  noisyStep = null,
  stepIndex = 0,
  totalSteps = 1,
  activeNoiseConfig = null,
  divergenceSummary = null,
}) {
  const safeQubit = Math.min(
    selectedQubit,
    Math.max(0, Math.min(idealBlochVectors.length - 1, noisyBlochVectors.length - 1))
  );

  const { isFeatureEnabled, openLens } = useQuantumContextLens();

  const handleInspectSubsystem = (e) => {
    e.stopPropagation();
    if (!isFeatureEnabled) return;

    const ctx = extractNoiseLabContext({
      entityKey: "bloch-subsystem",
      entityType: "bloch-subsystem",
      activeNoiseConfig,
      idealStep,
      noisyStep,
      stepIndex,
      totalSteps,
      selectedQubit: safeQubit,
      numQubits,
      divergenceSummary,
    });

    if (ctx && ctx.entity) {
      openLens(ctx.entity, ctx);
    }
  };

  const idealBv = idealBlochVectors[safeQubit] || {
    x: 0, y: 0, z: 1, r: 1, theta: 0, phi: 0, purity: 1, isEntangled: false,
  };
  const noisyBv = noisyBlochVectors[safeQubit] || {
    x: 0, y: 0, z: 1, r: 1, theta: 0, phi: 0, purity: 1,
  };

  const deltaR = Number((noisyBv.r - idealBv.r).toFixed(3));
  const isMixedFromNoise = noisyBv.r < 0.98;

  return (
    <div className="app-glass rounded-2xl p-5 border border-amber-500/30 flex flex-col gap-4">
      {/* Header and Qubit Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-app-border)] pb-3">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-2">
              <span>🌐</span>
              <span>Comparative Subsystem Bloch Spheres</span>
            </h3>
            <button
              type="button"
              onClick={handleInspectSubsystem}
              className="p-1 rounded hover:bg-amber-500/20 text-amber-300 hover:text-white transition-colors text-xs"
              title="Inspect Subsystem Mixed State in Context Lens (Alt+Q)"
              aria-label="Inspect Subsystem State"
            >
              🔍
            </button>
          </div>
          <p className="text-[11px] text-[var(--color-app-text-muted)]">
            Left: Ideal pure state on sphere surface vs. Right: Mixed noisy state inside sphere.
          </p>
        </div>

        {/* Qubit Selector Tabs */}
        <div className="flex items-center gap-1 rounded-lg bg-[var(--color-app-surface)] p-1 border border-[var(--color-app-border)]">
          {Array.from({ length: numQubits || 1 }).map((_, q) => (
            <button
              key={q}
              onClick={() => onSelectQubit && onSelectQubit(q)}
              className={`px-2.5 py-1 text-xs font-mono rounded-md transition-all ${
                safeQubit === q
                  ? "bg-amber-400 text-black font-bold shadow"
                  : "text-[var(--color-app-text-muted)] hover:text-[var(--color-app-text-main)]"
              }`}
            >
              q[{q}]
            </button>
          ))}
        </div>
      </div>

      {/* Side-by-side Bloch Canvas display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Ideal Bloch Sphere */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-[var(--color-app-primary)] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--color-app-primary)]"></span>
              <span>Ideal Trajectory (Pure State)</span>
            </span>
            <span className="text-[10px] font-mono text-[var(--color-app-text-muted)]">
              r = {idealBv.r.toFixed(3)}
            </span>
          </div>

          <div className="relative h-56 w-full rounded-xl overflow-hidden bg-black/50 border border-[var(--color-app-border)]">
            <Canvas camera={{ position: [2.8, 1.8, 3.2], fov: 45 }}>
              <ambientLight intensity={0.6} />
              <pointLight position={[10, 10, 10]} intensity={0.8} />
              <OrbitControls enableZoom={false} enablePan={false} />
              <BlochSphere3D
                theta={idealBv.theta}
                phi={idealBv.phi}
                radius={idealBv.r}
              />
            </Canvas>
          </div>

          {/* Coordinates */}
          <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-xs">
            <div className="p-1 rounded bg-[var(--color-app-surface)] border border-[var(--color-app-border)]">
              <span className="text-[9px] text-[var(--color-app-text-muted)] block">x</span>
              <span className="font-bold text-red-400">{idealBv.x.toFixed(3)}</span>
            </div>
            <div className="p-1 rounded bg-[var(--color-app-surface)] border border-[var(--color-app-border)]">
              <span className="text-[9px] text-[var(--color-app-text-muted)] block">y</span>
              <span className="font-bold text-emerald-400">{idealBv.y.toFixed(3)}</span>
            </div>
            <div className="p-1 rounded bg-[var(--color-app-surface)] border border-[var(--color-app-border)]">
              <span className="text-[9px] text-[var(--color-app-text-muted)] block">z</span>
              <span className="font-bold text-[var(--color-app-primary)]">{idealBv.z.toFixed(3)}</span>
            </div>
          </div>
        </div>

        {/* Right: Noisy Bloch Sphere */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>Noisy Trajectory (Mixed State)</span>
            </span>
            <span className="text-[10px] font-mono text-amber-300">
              r = {noisyBv.r.toFixed(3)} ({deltaR >= 0 ? `+${deltaR}` : deltaR})
            </span>
          </div>

          <div className="relative h-56 w-full rounded-xl overflow-hidden bg-black/50 border border-amber-500/40 shadow-inner">
            <Canvas camera={{ position: [2.8, 1.8, 3.2], fov: 45 }}>
              <ambientLight intensity={0.6} />
              <pointLight position={[10, 10, 10]} intensity={0.8} />
              <OrbitControls enableZoom={false} enablePan={false} />
              <BlochSphere3D
                theta={noisyBv.theta}
                phi={noisyBv.phi}
                radius={noisyBv.r}
              />
            </Canvas>

            {/* Shrinkage / Decoherence Badge */}
            {isMixedFromNoise && (
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500/50 text-[10px] font-mono text-amber-200">
                📉 Decohered (Mixedness r = {noisyBv.r.toFixed(2)})
              </div>
            )}
          </div>

          {/* Coordinates */}
          <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-xs">
            <div className="p-1 rounded bg-[var(--color-app-surface)] border border-amber-500/30">
              <span className="text-[9px] text-[var(--color-app-text-muted)] block">x</span>
              <span className="font-bold text-red-400">{noisyBv.x.toFixed(3)}</span>
            </div>
            <div className="p-1 rounded bg-[var(--color-app-surface)] border border-amber-500/30">
              <span className="text-[9px] text-[var(--color-app-text-muted)] block">y</span>
              <span className="font-bold text-emerald-400">{noisyBv.y.toFixed(3)}</span>
            </div>
            <div className="p-1 rounded bg-[var(--color-app-surface)] border border-amber-500/30">
              <span className="text-[9px] text-[var(--color-app-text-muted)] block">z</span>
              <span className="font-bold text-amber-400">{noisyBv.z.toFixed(3)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
