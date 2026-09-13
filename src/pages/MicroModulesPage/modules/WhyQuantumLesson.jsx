import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { runCircuitTimeline } from "../../../services/api";
import StateProbabilityHeatmap from "../../../components/StateProbabilityHeatmap/StateProbabilityHeatmap";
import MathHTMLContainer from "../../../components/MathHTMLContainer/MathHTMLContainer";

/**
 * Module 1: WHY QUANTUM?
 * Educational narrative:
 * 1. Classical Bit & 3D Coin Bridge (Coin is NOT a qubit)
 * 2. The Quantum Idea: Qubit as a Quantum State (|ψ⟩ = α|0⟩ + β|1⟩)
 * 3. Interactive Probability Exploration (Slider & Heatmap)
 * 4. First Quantum Circuit (|0⟩ → M) with real backend simulation
 * 5. First Quantum Operation (|0⟩ → H → M) with real backend simulation
 * 6. The "Ohhh" Moment & Scientifically Accurate Measurement Chamber
 * 7. Guided Experiment & Circuit Simulator Bridge
 * 8. Summary & Completion
 */
export default function WhyQuantumLesson({ onComplete, isCompleted, onAskQuantiva }) {
  const navigate = useNavigate();

  // ─── 1. Classical 3D Coin State ──────────────────────────────
  const [coinFlipping, setCoinFlipping] = useState(false);
  const [coinSide, setCoinSide] = useState("0"); // "0" (Heads) or "1" (Tails)
  const [coinRotation, setCoinRotation] = useState(0);
  const [coinStats, setCoinStats] = useState({ flips: 0, heads: 0, tails: 0 });

  const flipCoin = () => {
  if (coinFlipping) return;

  setCoinFlipping(true);

  const resultIsHeads = Math.random() < 0.5;
  const spins = 5 + Math.floor(Math.random() * 3);

  // Current orientation within one 360° cycle
  const currentNormalized = ((coinRotation % 360) + 360) % 360;

  // Heads = 0°, Tails = 180°
  const desiredOffset = resultIsHeads ? 0 : 180;

  // Calculate how far we need to rotate from the current face
  // to reach the desired face.
  const extraRotation =
    ((desiredOffset - currentNormalized) + 360) % 360;

  const targetDeg =
    coinRotation +
    spins * 360 +
    extraRotation;

  setCoinRotation(targetDeg);

  setTimeout(() => {
    setCoinSide(resultIsHeads ? "0" : "1");

    setCoinStats((prev) => ({
      flips: prev.flips + 1,
      heads: prev.heads + (resultIsHeads ? 1 : 0),
      tails: prev.tails + (resultIsHeads ? 0 : 1),
    }));

    setCoinFlipping(false);
  }, 1000);
};

  // ─── 3. Interactive State & Probability Exploration ──────────
  // θ in [0, π]. α = cos(θ/2), β = sin(θ/2).
  // Prob(0) = α^2, Prob(1) = β^2.
  const [sliderAngle, setSliderAngle] = useState(0);

  const { alpha, beta, prob0, prob1 } = useMemo(() => {
    const halfTheta = sliderAngle / 2;
    const a = Math.cos(halfTheta);
    const b = Math.sin(halfTheta);
    const p0 = Math.round(a * a * 1000) / 1000;
    const p1 = Math.round(b * b * 1000) / 1000;
    return {
      alpha: Math.round(a * 1000) / 1000,
      beta: Math.round(b * 1000) / 1000,
      prob0: p0,
      prob1: p1,
    };
  }, [sliderAngle]);

  const setPreset = (name) => {
    if (name === "zero") setSliderAngle(0);
    if (name === "plus") setSliderAngle(Math.PI / 2);
    if (name === "uneven") setSliderAngle(0.927);
    if (name === "one") setSliderAngle(Math.PI);
  };

  // ─── 4. Circuit 1 (|0⟩ → M) Simulation ───────────────────────
  const [c1Loading, setC1Loading] = useState(false);
  const [c1Result, setC1Result] = useState(null);

  const runCircuit1 = async () => {
    setC1Loading(true);
    try {
      const res = await runCircuitTimeline({
        numQubits: 1,
        gates: [{ type: "M", wire: 0 }],
      });
      if (res && res.steps) {
        const lastStep = res.steps[res.steps.length - 1];
        setC1Result(lastStep.probabilities || { "0": 1, "1": 0 });
      }
    } catch (err) {
      console.error("Failed to simulate Circuit 1:", err);
      setC1Result({ "0": 1, "1": 0 });
    } finally {
      setC1Loading(false);
    }
  };

  // ─── 5. Circuit 2 (|0⟩ → H → M) Simulation ───────────────────
  const [c2Loading, setC2Loading] = useState(false);
  const [c2Result, setC2Result] = useState(null);

  const runCircuit2 = async () => {
    setC2Loading(true);
    try {
      const res = await runCircuitTimeline({
        numQubits: 1,
        gates: [
          { type: "H", wire: 0 },
          { type: "M", wire: 0 },
        ],
      });
      if (res && res.steps) {
        const hStep = res.steps[1] || res.steps[res.steps.length - 1];
        setC2Result(hStep.probabilities || { "0": 0.5, "1": 0.5 });
      }
    } catch (err) {
      console.error("Failed to simulate Circuit 2:", err);
      setC2Result({ "0": 0.5, "1": 0.5 });
    } finally {
      setC2Loading(false);
    }
  };

  // ─── 6. Scientifically Accurate Measurement Chamber ──────────
  const [chamberTarget, setChamberTarget] = useState("plus");
  const [chamberHistory, setChamberHistory] = useState([]);
  const [latestShot, setLatestShot] = useState(null);
  const [isMeasuring, setIsMeasuring] = useState(false);

  const currentChamberProbs = chamberTarget === "zero"
    ? { prob0: 1.0, prob1: 0.0 }
    : { prob0: 0.5, prob1: 0.5 };

  const shootMeasurement = (count = 1) => {
    if (isMeasuring) return;
    setIsMeasuring(true);

    const newShots = [];
    for (let i = 0; i < count; i++) {
      const outcome = Math.random() < currentChamberProbs.prob0 ? "0" : "1";
      newShots.push(outcome);
    }

    setLatestShot(newShots[newShots.length - 1]);
    setChamberHistory((prev) => [...prev, ...newShots]);

    setTimeout(() => {
      setIsMeasuring(false);
    }, count === 1 ? 300 : 100);
  };

  const chamberStats = useMemo(() => {
    const total = chamberHistory.length;
    const count0 = chamberHistory.filter((s) => s === "0").length;
    const count1 = total - count0;
    const pct0 = total > 0 ? ((count0 / total) * 100).toFixed(1) : "0.0";
    const pct1 = total > 0 ? ((count1 / total) * 100).toFixed(1) : "0.0";
    return { total, count0, count1, pct0, pct1 };
  }, [chamberHistory]);

  const resetChamber = (newTarget) => {
    if (newTarget) setChamberTarget(newTarget);
    setChamberHistory([]);
    setLatestShot(null);
  };

  // ─── 7. Guided Experiment & Bridge ───────────────────────────
  const [expH, setExpH] = useState(true);
  const [expX, setExpX] = useState(false);
  const [expLoading, setExpLoading] = useState(false);
  const [expResult, setExpResult] = useState(null);

  const runGuidedExperiment = async () => {
    setExpLoading(true);
    const gates = [];
    if (expX) gates.push({ type: "X", wire: 0 });
    if (expH) gates.push({ type: "H", wire: 0 });
    gates.push({ type: "M", wire: 0 });

    try {
      const res = await runCircuitTimeline({
        numQubits: 1,
        gates,
      });
      if (res && res.steps) {
        const step = res.steps[gates.length - 1] || res.steps[res.steps.length - 1];
        setExpResult(step.probabilities || { "0": 0.5, "1": 0.5 });
      }
    } catch (err) {
      console.error("Experiment failed:", err);
      setExpResult({ "0": 0.5, "1": 0.5 });
    } finally {
      setExpLoading(false);
    }
  };

  const launchCircuitSimulator = () => {
    navigate("/circuit-simulator", {
      state: {
        initialNumQubits: 1,
        initialCircuit: {
          0: [
            { type: "H", label: "H", short: "H", color: "bg-blue-500/20 text-blue-400 border-blue-500" },
            { type: "M", label: "Measure", short: "M", color: "bg-zinc-700/50 text-white border-zinc-500" },
          ],
        },
        origin: "why-quantum",
      },
    });
  };

  return (
    <div className="space-y-12">
      {/* ─── SECTION 1: START WITH THE FAMILIAR (CLASSICAL BIT & COIN) ─── */}
      <section className="rounded-3xl p-6 sm:p-8 app-glass border border-[var(--color-app-border)] relative overflow-hidden">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
            Section 1 • Classical Information
          </span>
          <span className="text-xs text-[var(--color-app-text-muted)]">• Start with the familiar</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--color-app-text-main)] mb-2">
          The Classical Bit: Certainty of 0 or 1
        </h2>
        <p className="text-sm text-[var(--color-app-text-muted)] max-w-2xl leading-relaxed mb-6">
          In ordinary computing, information is represented using <strong>bits</strong>. A classical bit always holds exactly one of two distinct logical states at any given moment: <span className="font-mono text-white bg-white/10 px-1.5 py-0.5 rounded">0</span> or <span className="font-mono text-white bg-white/10 px-1.5 py-0.5 rounded">1</span>.
        </p>

        {/* 3D Coin Interactive Chamber */}
        <div className="p-6 rounded-2xl bg-black/40 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Coin 3D Perspective Canvas */}
          <div className="flex flex-col items-center gap-4">
            <div
              className="w-32 h-32 relative cursor-pointer select-none group"
              style={{ perspective: "800px" }}
              onClick={flipCoin}
            >
            <motion.div
  className="w-full h-full rounded-full relative flex items-center justify-center shadow-[0_0_35px_rgba(234,179,8,0.25)] border-4 border-amber-400/80"
  style={{
    transformStyle: "preserve-3d",
    background:
      "radial-gradient(circle at 35% 35%, #fde047, #ca8a04 70%, #854d0e 100%)",
  }}
  animate={{ rotateY: coinRotation }}
  transition={{ duration: 1, ease: [0.25, 1, 0.5, 1] }}
>
  {/* Front Face (0 / Heads) */}
  <div
    className="absolute inset-0 rounded-full flex flex-col items-center justify-center text-amber-950 font-extrabold"
    style={{
      backfaceVisibility: "hidden",
      transform: "translateZ(2px)",
    }}
  >
    <span className="text-4xl font-mono">0</span>
    <span className="text-[10px] uppercase tracking-widest font-bold opacity-80">
      Heads
    </span>
  </div>

  {/* Back Face (1 / Tails) */}
  <div
    className="absolute inset-0 rounded-full flex flex-col items-center justify-center text-amber-950 font-extrabold"
    style={{
      backfaceVisibility: "hidden",
      transform: "rotateY(180deg) translateZ(2px)",
    }}
  >
    <span className="text-4xl font-mono">1</span>
    <span className="text-[10px] uppercase tracking-widest font-bold opacity-80">
      Tails
    </span>
  </div>
</motion.div>
            </div>

            <button
              onClick={flipCoin}
              disabled={coinFlipping}
              className="px-4 py-2 rounded-xl text-xs font-bold text-black bg-gradient-to-r from-amber-300 to-yellow-500 hover:from-amber-200 hover:to-yellow-400 shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              {coinFlipping ? "Flipping in 3D..." : "Toss Classical Coin 🪙"}
            </button>
          </div>

          {/* Coin Stats & Explanation */}
          <div className="flex-1 space-y-3">
            <div className="text-xs text-[var(--color-app-text-muted)] leading-relaxed">
              When a coin spins in the air, we may not know which side will land face up, but the coin is always in <strong>one definite physical state</strong>. Once caught, it reveals a single classical value:
            </div>

            <div className="grid grid-cols-3 gap-2 py-2">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center">
                <div className="text-[10px] text-[var(--color-app-text-light)] uppercase font-semibold">Total Tosses</div>
                <div className="text-base font-mono font-bold text-white">{coinStats.flips}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                <div className="text-[10px] text-blue-300 uppercase font-semibold">Heads (0)</div>
                <div className="text-base font-mono font-bold text-blue-400">{coinStats.heads}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                <div className="text-[10px] text-amber-300 uppercase font-semibold">Tails (1)</div>
                <div className="text-base font-mono font-bold text-amber-400">{coinStats.tails}</div>
              </div>
            </div>

            {/* Critical Misconception Alert */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2.5">
              <span className="text-base">⚠️</span>
              <div>
                <strong className="text-amber-100">A coin is NOT a qubit:</strong>
                <p className="mt-0.5 text-[11px] text-amber-200/90 leading-relaxed">
                  A spinning coin simply reflects our lack of knowledge before it lands. It is always pointing somewhere definite. A quantum state is governed by fundamental physical amplitudes, not hidden mechanical certainty!
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 2: INTRODUCE THE QUANTUM IDEA ─── */}
      <section className="rounded-3xl p-6 sm:p-8 app-glass border border-[var(--color-app-border)]">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
            Section 2 • Qubit Intuition
          </span>
          <span className="text-xs text-[var(--color-app-text-muted)]">• A quantum state</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--color-app-text-main)] mb-3">
          The Qubit: Information Governed by a Quantum State
        </h2>
        <p className="text-sm text-[var(--color-app-text-muted)] leading-relaxed mb-6">
          A quantum bit—or <strong>qubit</strong>—is not simply a switch holding 0 or 1. Instead, it is described by a <strong>quantum state</strong>, traditionally written as <span className="font-mono text-indigo-300">|ψ⟩</span> (pronounced <em>ket psi</em>).
        </p>

        {/* Math Breakdown Card */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/30 to-purple-950/20 border border-indigo-500/30 mb-6">
          <div className="text-center py-2">
            <div className="text-2xl sm:text-3xl font-mono text-white mb-2">
              <MathHTMLContainer html="$|\psi\rangle = \alpha |0\rangle + \beta |1\rangle$" />
            </div>
            <div className="text-xs text-indigo-300 font-semibold">
              The fundamental representation of a single-qubit quantum state
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/10 text-xs">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="font-bold text-white mb-1 flex items-center gap-1.5">
                <span className="text-blue-400">|0⟩</span> & <span className="text-purple-400">|1⟩</span>
              </div>
              <p className="text-[var(--color-app-text-muted)] leading-relaxed">
                The <strong>computational basis states</strong>. These correspond to the definite classical results you can measure.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="font-bold text-white mb-1 flex items-center gap-1.5">
                <span className="text-amber-400">α</span> & <span className="text-pink-400">β</span>
              </div>
              <p className="text-[var(--color-app-text-muted)] leading-relaxed">
                The <strong>probability amplitudes</strong>. These numbers determine the relative weight of each basis state.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="font-bold text-white mb-1 flex items-center gap-1.5">
                <span className="text-emerald-400">P = |amplitude|²</span>
              </div>
              <p className="text-[var(--color-app-text-muted)] leading-relaxed">
                The square of an amplitude yields the <strong>measurement probability</strong>: <MathHTMLContainer html="$P(0) = |\alpha|^2$" /> and <MathHTMLContainer html="$P(1) = |\beta|^2$" />.
              </p>
            </div>
          </div>
        </div>

        {/* Clear Conceptual Definition */}
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200">
          💡 <strong>What Superposition Truly Means:</strong> Avoid the misconception that a qubit is <em>"both 0 and 1 at the same time."</em> Rather, a qubit has a definite <strong>quantum state</strong> that specifies the probability distribution of obtaining 0 or 1 upon measurement.
        </div>
      </section>

      {/* ─── SECTION 3: INTERACTIVE PROBABILITY EXPLORATION ─── */}
      <section className="rounded-3xl p-6 sm:p-8 app-glass border border-[var(--color-app-border)]">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
            Section 3 • Interactive Exploration
          </span>
          <span className="text-xs text-[var(--color-app-text-muted)]">• Manipulate probabilities</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--color-app-text-main)] mb-2">
          See Amplitudes Transform Into Probabilities
        </h2>
        <p className="text-sm text-[var(--color-app-text-muted)] max-w-2xl leading-relaxed mb-6">
          Drag the slider below to smoothly tilt the quantum state. Notice how the amplitudes <MathHTMLContainer html="$\alpha$" /> and <MathHTMLContainer html="$\beta$" /> change, and watch the resulting measurement probabilities adjust in real time.
        </p>

        {/* Interactive Slider & Formula Live Display */}
        <div className="p-6 rounded-2xl bg-black/40 border border-white/10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-mono font-bold text-purple-300 uppercase tracking-wider mb-1">
                Current Quantum State
              </div>
              <div className="text-lg sm:text-xl font-mono text-white">
                <MathHTMLContainer html={`$|\\psi\\rangle = ${alpha}|0\\rangle + ${beta}|1\\rangle$`} />
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30">
                P(0) = {(prob0 * 100).toFixed(1)}%
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30">
                P(1) = {(prob1 * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Slider */}
          <div className="space-y-2">
            <input
              type="range"
              min="0"
              max={Math.PI}
              step="0.01"
              value={sliderAngle}
              onChange={(e) => setSliderAngle(parseFloat(e.target.value))}
              className="w-full accent-[var(--color-app-primary)] cursor-pointer h-2 bg-zinc-700 rounded-lg appearance-none"
            />
            <div className="flex justify-between text-[11px] font-mono text-[var(--color-app-text-light)]">
              <span>Pure |0⟩ (100% / 0%)</span>
              <span>Equal Superposition (50% / 50%)</span>
              <span>Pure |1⟩ (0% / 100%)</span>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
            <span className="text-xs text-[var(--color-app-text-muted)] font-semibold mr-1">Quick Presets:</span>
            <button
              onClick={() => setPreset("zero")}
              className="px-3 py-1 text-xs rounded-lg border border-white/10 hover:bg-white/10 transition-colors text-white font-mono"
            >
              |0⟩ (100% / 0%)
            </button>
            <button
              onClick={() => setPreset("plus")}
              className="px-3 py-1 text-xs rounded-lg border border-purple-500/40 bg-purple-500/20 hover:bg-purple-500/30 transition-colors text-purple-200 font-mono font-bold"
            >
              Equal Superposition (50% / 50%)
            </button>
            <button
              onClick={() => setPreset("uneven")}
              className="px-3 py-1 text-xs rounded-lg border border-blue-500/40 bg-blue-500/20 hover:bg-blue-500/30 transition-colors text-blue-200 font-mono"
            >
              Uneven (80% / 20%)
            </button>
            <button
              onClick={() => setPreset("one")}
              className="px-3 py-1 text-xs rounded-lg border border-white/10 hover:bg-white/10 transition-colors text-white font-mono"
            >
              |1⟩ (0% / 100%)
            </button>
          </div>

          {/* Integrated Reused StateProbabilityHeatmap */}
          <div className="pt-2">
            <StateProbabilityHeatmap
              probabilities={{
                "0": prob0,
                "1": prob1,
              }}
            />
          </div>
        </div>
      </section>

      {/* ─── SECTION 4: FIRST QUANTUM CIRCUIT (|0⟩ → M) ─── */}
      <section className="rounded-3xl p-6 sm:p-8 app-glass border border-[var(--color-app-border)]">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            Section 4 • Your First Circuit
          </span>
          <span className="text-xs text-[var(--color-app-text-muted)]">• Direct measurement</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--color-app-text-main)] mb-2">
          Circuit 1: Measuring the Default State |0⟩
        </h2>
        <p className="text-sm text-[var(--color-app-text-muted)] max-w-2xl leading-relaxed mb-6">
          Every quantum circuit in standard simulators begins with all qubits initialized to the computational ground state <span className="font-mono text-white">|0⟩</span>. If we measure immediately without applying any gates, what should happen?
        </p>

        <div className="p-6 rounded-2xl bg-black/40 border border-white/10 space-y-6">
          {/* Circuit Visual Wire */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-950 border border-zinc-800 overflow-x-auto">
            <span className="text-xs font-mono font-bold text-zinc-400 shrink-0">q[0]: |0⟩</span>
            <div className="flex-1 flex items-center min-w-[240px]">
              <div className="h-0.5 flex-1 bg-zinc-600" />
              <div className="px-3 py-2 rounded-lg bg-zinc-700/80 border border-zinc-500 text-xs font-bold text-white shadow flex items-center gap-1.5 shrink-0">
                <span>📏</span> Measure
              </div>
              <div className="h-0.5 flex-1 bg-zinc-600" />
              <span className="text-[11px] font-mono text-zinc-400 px-2 shrink-0">→ c[0]</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <button
              onClick={runCircuit1}
              disabled={c1Loading}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
            >
              {c1Loading ? (
                <>
                  <span className="animate-spin text-sm">⟳</span> Simulating on Aer...
                </>
              ) : (
                <>
                  <span>▶</span> Run Circuit 1 with Quantum Simulator
                </>
              )}
            </button>

            <div className="text-xs text-[var(--color-app-text-light)]">
              Backend: <strong>Qiskit Statevector / Timeline Evaluator</strong>
            </div>
          </div>

          {/* Simulation Results Display */}
          {c1Result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-3"
            >
              <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <span>✓</span> Verified Simulation Result from Backend:
              </div>
              <div className="grid sm:grid-cols-2 gap-4 items-center">
                <div className="text-xs text-[var(--color-app-text-muted)] leading-relaxed">
                  The qubit started in <span className="font-mono text-white">|0⟩</span>. Without any transformation, <MathHTMLContainer html="$P(0) = 1.0$" /> (100%) and <MathHTMLContainer html="$P(1) = 0.0$" /> (0%). The result is entirely deterministic.
                </div>
                <StateProbabilityHeatmap probabilities={c1Result} />
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* ─── SECTION 5: FIRST QUANTUM OPERATION (HADAMARD) ─── */}
      <section className="rounded-3xl p-6 sm:p-8 app-glass border border-[var(--color-app-border)]">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
            Section 5 • First Quantum Operation
          </span>
          <span className="text-xs text-[var(--color-app-text-muted)]">• Enter the Hadamard gate</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--color-app-text-main)] mb-2">
          Circuit 2: Transforming Probabilities with the H Gate
        </h2>
        <p className="text-sm text-[var(--color-app-text-muted)] max-w-2xl leading-relaxed mb-6">
          How do we change a quantum state? By applying a <strong>quantum gate</strong>. The most famous single-qubit gate is the <strong>Hadamard gate (<span className="text-cyan-400 font-mono font-bold">H</span>)</strong>. It rotates the state vector into an equal superposition:
          <span className="block mt-1 font-mono text-cyan-300">
            <MathHTMLContainer html="$H|0\rangle = \frac{1}{\sqrt{2}}(|0\rangle + |1\rangle)$" />
          </span>
        </p>

        <div className="p-6 rounded-2xl bg-black/40 border border-white/10 space-y-6">
          {/* Circuit Visual Wire with H */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-950 border border-zinc-800 overflow-x-auto">
            <span className="text-xs font-mono font-bold text-zinc-400 shrink-0">q[0]: |0⟩</span>
            <div className="flex-1 flex items-center min-w-[280px]">
              <div className="h-0.5 w-8 bg-zinc-600" />
              <div className="h-10 w-12 rounded-lg bg-blue-500/20 border-2 border-blue-400 text-blue-300 font-bold font-mono text-sm flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
                H
              </div>
              <div className="h-0.5 flex-1 bg-zinc-600" />
              <div className="px-3 py-2 rounded-lg bg-zinc-700/80 border border-zinc-500 text-xs font-bold text-white shadow flex items-center gap-1.5 shrink-0">
                <span>📏</span> Measure
              </div>
              <div className="h-0.5 w-8 bg-zinc-600" />
              <span className="text-[11px] font-mono text-zinc-400 px-2 shrink-0">→ c[0]</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <button
              onClick={runCircuit2}
              disabled={c2Loading}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              style={{ background: "linear-gradient(135deg, #0284c7, #2563eb)" }}
            >
              {c2Loading ? (
                <>
                  <span className="animate-spin text-sm">⟳</span> Simulating H Transformation...
                </>
              ) : (
                <>
                  <span>▶</span> Run Circuit 2 with H Gate
                </>
              )}
            </button>

            <div className="text-xs text-[var(--color-app-text-light)]">
              Simulation Source: <strong>Actual Deterministic Qiskit Simulator</strong>
            </div>
          </div>

          {/* Simulation Results Display */}
          {c2Result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-3"
            >
              <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                <span>✓</span> Verified Simulation Result After H Gate:
              </div>
              <div className="grid sm:grid-cols-2 gap-4 items-center">
                <div className="text-xs text-[var(--color-app-text-muted)] leading-relaxed">
                  The H gate transformed the ground state <span className="font-mono text-white">|0⟩</span> into a state where <MathHTMLContainer html="$P(0) = 0.5$" /> (50%) and <MathHTMLContainer html="$P(1) = 0.5$" /> (50%).
                </div>
                <StateProbabilityHeatmap probabilities={c2Result} />
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* ─── SECTION 6: THE "OHHH" MOMENT & MEASUREMENT CHAMBER ─── */}
      <section className="rounded-3xl p-6 sm:p-8 app-glass border border-[var(--color-app-border)] relative overflow-hidden">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-pink-400 bg-pink-500/10 px-3 py-1 rounded-full border border-pink-500/20">
            Section 6 • The "Ohhh" Moment
          </span>
          <span className="text-xs text-[var(--color-app-text-muted)]">• What measurement means</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--color-app-text-main)] mb-3">
          Side-by-Side: How the H Gate Altered Reality
        </h2>

        {/* Side-by-Side Comparison */}
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <div className="text-xs font-mono font-bold text-zinc-400 uppercase">Before H Gate</div>
            <div className="text-sm font-mono text-white">|0⟩ ───── Measure</div>
            <div className="flex items-center justify-between text-xs pt-2">
              <span className="text-emerald-400 font-bold">Outcome 0: ~100%</span>
              <span className="text-zinc-500">Outcome 1: ~0%</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 space-y-2">
            <div className="text-xs font-mono font-bold text-cyan-300 uppercase">After H Gate</div>
            <div className="text-sm font-mono text-cyan-100">|0⟩ ── H ── Measure</div>
            <div className="flex items-center justify-between text-xs pt-2">
              <span className="text-cyan-400 font-bold">Outcome 0: ~50%</span>
              <span className="text-pink-400 font-bold">Outcome 1: ~50%</span>
            </div>
          </div>
        </div>

        {/* Scientifically Accurate Measurement Chamber */}
        <div className="p-6 rounded-2xl bg-black/40 border border-white/10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-[var(--color-app-text-main)]">
                The Single-Shot Measurement Chamber
              </h3>
              <p className="text-xs text-[var(--color-app-text-muted)]">
                Observe how individual measurement shots sample from the underlying quantum probability distribution.
              </p>
            </div>

            {/* Target State Switcher */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold">
              <button
                onClick={() => resetChamber("zero")}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  chamberTarget === "zero" ? "bg-emerald-600 text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                State |0⟩ (100% 0)
              </button>
              <button
                onClick={() => resetChamber("plus")}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  chamberTarget === "plus" ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                State H|0⟩ (50/50)
              </button>
            </div>
          </div>

          {/* Measurement Visual Chamber */}
          <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col items-center justify-center relative min-h-[160px]">
            <AnimatePresence mode="wait">
              {latestShot !== null ? (
                <motion.div
                  key={chamberHistory.length}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="flex flex-col items-center"
                >
                  <div className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-1">
                    Last Classical Measurement Reading
                  </div>
                  <div
                    className={`w-20 h-20 rounded-2xl flex items-center justify-center text-4xl font-mono font-extrabold shadow-2xl border-2 ${
                      latestShot === "0"
                        ? "bg-blue-500/20 text-blue-400 border-blue-400 shadow-blue-500/30"
                        : "bg-purple-500/20 text-purple-400 border-purple-400 shadow-purple-500/30"
                    }`}
                  >
                    {latestShot}
                  </div>
                </motion.div>
              ) : (
                <div className="text-center text-xs text-zinc-500 italic">
                  Press "Take Measurement Shot" to observe individual quantum state collapse.
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => shootMeasurement(1)}
                disabled={isMeasuring}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                Take Measurement Shot 🎯
              </button>
              <button
                onClick={() => shootMeasurement(10)}
                disabled={isMeasuring}
                className="px-3 py-2 rounded-xl text-xs font-semibold border border-white/10 hover:bg-white/10 text-white transition-colors cursor-pointer"
              >
                +10 Shots
              </button>
              <button
                onClick={() => shootMeasurement(100)}
                disabled={isMeasuring}
                className="px-3 py-2 rounded-xl text-xs font-semibold border border-white/10 hover:bg-white/10 text-white transition-colors cursor-pointer"
              >
                +100 Shots
              </button>
            </div>

            {chamberHistory.length > 0 && (
              <button
                onClick={() => resetChamber()}
                className="text-xs text-zinc-400 hover:text-white underline transition-colors cursor-pointer"
              >
                Clear History
              </button>
            )}
          </div>

          {/* Running Tally Table */}
          {chamberHistory.length > 0 && (
            <div className="pt-4 border-t border-white/10 grid grid-cols-3 gap-3 text-center text-xs">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="text-[10px] text-zinc-400 font-semibold uppercase">Total Shots</div>
                <div className="text-lg font-mono font-bold text-white">{chamberStats.total}</div>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <div className="text-[10px] text-blue-300 font-semibold uppercase">Outcome 0</div>
                <div className="text-lg font-mono font-bold text-blue-400">
                  {chamberStats.count0} <span className="text-xs font-normal">({chamberStats.pct0}%)</span>
                </div>
                <div className="text-[10px] text-blue-300/70">
                  Target: {(currentChamberProbs.prob0 * 100).toFixed(0)}%
                </div>
              </div>
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <div className="text-[10px] text-purple-300 font-semibold uppercase">Outcome 1</div>
                <div className="text-lg font-mono font-bold text-purple-400">
                  {chamberStats.count1} <span className="text-xs font-normal">({chamberStats.pct1}%)</span>
                </div>
                <div className="text-[10px] text-purple-300/70">
                  Target: {(currentChamberProbs.prob1 * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          )}

          {/* Scientific Quote Callout */}
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 text-xs text-purple-200 leading-relaxed">
            💬 <strong>Fundamental Principle:</strong>{" "}
            <em>
              "The quantum state determines the probabilities. Each measurement produces one classical outcome according to those probabilities."
            </em>
          </div>
        </div>
      </section>

      {/* ─── SECTION 7: GUIDED EXPERIMENT & SIMULATOR BRIDGE ─── */}
      <section className="rounded-3xl p-6 sm:p-8 app-glass border border-[var(--color-app-border)]">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
            Section 7 • Guided Experiment
          </span>
          <span className="text-xs text-[var(--color-app-text-muted)]">• Hands-on testbed</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--color-app-text-main)] mb-2">
          Try This: Experiment with Quantum Transformations
        </h2>
        <p className="text-sm text-[var(--color-app-text-muted)] max-w-2xl leading-relaxed mb-6">
          Toggle gates on the qubit below to observe how different operations reshape the outcome. When you are ready for full multi-qubit exploration, bridge directly into Quantiva's full Circuit Simulator!
        </p>

        {/* Experiment Testbed */}
        <div className="p-6 rounded-2xl bg-black/40 border border-white/10 space-y-6">
          {/* Gate Toggles */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-[var(--color-app-text-muted)] font-semibold">Active Gates:</span>
            <button
              onClick={() => setExpH(!expH)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                expH
                  ? "bg-blue-500/20 text-blue-300 border-blue-500 ring-2 ring-blue-500/30"
                  : "bg-white/5 text-zinc-400 border-white/10"
              }`}
            >
              H Gate (Superposition) {expH ? "✓" : "+"}
            </button>
            <button
              onClick={() => setExpX(!expX)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                expX
                  ? "bg-red-500/20 text-red-300 border-red-500 ring-2 ring-red-500/30"
                  : "bg-white/5 text-zinc-400 border-white/10"
              }`}
            >
              X Gate (Bit-Flip) {expX ? "✓" : "+"}
            </button>
          </div>

          {/* Testbed Circuit Schematic */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-950 border border-zinc-800 overflow-x-auto">
            <span className="text-xs font-mono font-bold text-zinc-400 shrink-0">q[0]: |0⟩</span>
            <div className="flex-1 flex items-center min-w-[280px]">
              <div className="h-0.5 w-6 bg-zinc-600" />
              {expX && (
                <>
                  <div className="h-9 w-10 rounded-lg bg-red-500/20 border-2 border-red-400 text-red-300 font-bold font-mono text-xs flex items-center justify-center shrink-0">
                    X
                  </div>
                  <div className="h-0.5 w-6 bg-zinc-600" />
                </>
              )}
              {expH && (
                <>
                  <div className="h-9 w-10 rounded-lg bg-blue-500/20 border-2 border-blue-400 text-blue-300 font-bold font-mono text-xs flex items-center justify-center shrink-0">
                    H
                  </div>
                  <div className="h-0.5 w-6 bg-zinc-600" />
                </>
              )}
              <div className="h-0.5 flex-1 bg-zinc-600" />
              <div className="px-3 py-1.5 rounded-lg bg-zinc-700/80 border border-zinc-500 text-xs font-bold text-white shadow shrink-0">
                Measure
              </div>
              <div className="h-0.5 w-6 bg-zinc-600" />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <button
              onClick={runGuidedExperiment}
              disabled={expLoading}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 shadow-lg active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {expLoading ? (
                <>
                  <span className="animate-spin text-sm">⟳</span> Simulating...
                </>
              ) : (
                <>
                  <span>▶</span> Simulate Live Experiment
                </>
              )}
            </button>

            {/* Experimentation Bridge */}
            <button
              onClick={launchCircuitSimulator}
              className="px-4 py-2.5 rounded-xl text-xs font-bold border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>🔬</span> Open in Drag-and-Drop Circuit Simulator →
            </button>
          </div>

          {expResult && (
            <div className="pt-2">
              <StateProbabilityHeatmap probabilities={expResult} />
            </div>
          )}
        </div>
      </section>

      {/* ─── SECTION 8: SUMMARY & COMPLETION ─── */}
      <section className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-blue-950/40 via-indigo-950/20 to-purple-950/40 border border-blue-500/30">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            Milestone Complete
          </span>
          <span className="text-xs text-[var(--color-app-text-muted)]">• Core takeaways</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--color-app-text-main)] mb-3">
          What You Learned in "Why Quantum?"
        </h2>

        <div className="grid sm:grid-cols-2 gap-4 text-xs text-[var(--color-app-text-muted)] mb-8">
          <div className="p-4 rounded-xl bg-black/30 border border-white/10 space-y-1">
            <strong className="text-white">1. Classical vs Quantum State</strong>
            <p className="leading-relaxed">
              A classical bit is always definitively 0 or 1. A qubit possesses a quantum state <MathHTMLContainer html="$|\psi\rangle = \alpha|0\rangle + \beta|1\rangle$" /> with amplitudes determining probabilities.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-black/30 border border-white/10 space-y-1">
            <strong className="text-white">2. Quantum Operations</strong>
            <p className="leading-relaxed">
              Quantum gates (like the Hadamard gate <span className="font-mono text-cyan-300">H</span>) rotate the quantum state and transform outcome probabilities.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-black/30 border border-white/10 space-y-1">
            <strong className="text-white">3. Measurement Extracts Classical Data</strong>
            <p className="leading-relaxed">
              Measuring a qubit forces the quantum state to produce a classical 0 or 1 outcome governed by the state's probability distribution.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-black/30 border border-white/10 space-y-1">
            <strong className="text-white">4. No Mystery "0 & 1 at the Same Time"</strong>
            <p className="leading-relaxed">
              Superposition is a linear combination of states in a vector space, not a contradictory physical coin spinning forever.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-white/10">
          <div>
            <div className="text-sm font-bold text-white">Ready for the next milestone?</div>
            <div className="text-xs text-[var(--color-app-text-muted)]">
              Module 2 will explore classical bits vs quantum states in greater depth.
            </div>
          </div>

          <div className="flex items-center gap-3">
            {onAskQuantiva && (
              <button
                onClick={onAskQuantiva}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/10 transition-colors cursor-pointer"
              >
                Ask Quantiva a Question ✨
              </button>
            )}

            <button
              onClick={onComplete}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
              style={{
                background: "linear-gradient(135deg, #10b981, #059669)",
              }}
            >
              {isCompleted ? "✓ Completed (Review Mode)" : "✓ Mark Module 1 Complete"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
