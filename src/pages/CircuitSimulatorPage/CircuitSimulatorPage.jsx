import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  closestCenter,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import Button from "../../components/Button/Button";
import { useAITutor } from "../../context/AITutorContext";
import {
  exportCircuitToQasm,
  importCircuitFromQasm,
  runCircuitTimeline,
} from "../../services/api";
import StateProbabilityHeatmap from "../../components/StateProbabilityHeatmap/StateProbabilityHeatmap";
import QuantumTimeMachinePanel from "../../components/QuantumTimeMachine/QuantumTimeMachinePanel";
import ImageLightbox from "../../components/ImageLightbox/ImageLightbox";
import {
  getCircuitLayers,
  flattenCircuitByLayer,
} from "../../utils/circuitLayers";
import CircuitLensTrigger from "../../components/QuantumContextLens/CircuitLensTrigger";

const GATES = [
  {
    type: "I",
    label: "I (Spacer)",
    short: "I",
    color: "bg-gray-500/20 text-gray-400 border-gray-500 border-dashed",
  },
  {
    type: "H",
    label: "H",
    short: "H",
    color: "bg-blue-500/20 text-blue-400 border-blue-500",
  },
  {
    type: "X",
    label: "X",
    short: "X",
    color: "bg-red-500/20 text-red-400 border-red-500",
  },
  {
    type: "Y",
    label: "Y",
    short: "Y",
    color: "bg-green-500/20 text-green-400 border-green-500",
  },
  {
    type: "Z",
    label: "Z",
    short: "Z",
    color: "bg-purple-500/20 text-purple-400 border-purple-500",
  },
  {
    type: "S",
    label: "S",
    short: "S",
    color: "bg-yellow-500/20 text-yellow-400 border-yellow-500",
  },
  {
    type: "T",
    label: "T",
    short: "T",
    color: "bg-orange-500/20 text-orange-400 border-orange-500",
  },
  {
    type: "SX",
    label: "√X",
    short: "√X",
    color: "bg-red-400/20 text-red-300 border-red-400",
  },
  {
    type: "SDG",
    label: "S†",
    short: "S†",
    color: "bg-yellow-400/20 text-yellow-300 border-yellow-400",
  },
  {
    type: "TDG",
    label: "T†",
    short: "T†",
    color: "bg-orange-400/20 text-orange-300 border-orange-400",
  },
  {
    type: "CX",
    label: "CX",
    short: "CX",
    color: "bg-pink-500/20 text-pink-400 border-pink-500",
  },
  {
    type: "SWAP",
    label: "SWAP",
    short: "SWAP",
    color: "bg-cyan-500/20 text-cyan-400 border-cyan-500",
  },
  {
    type: "M",
    label: "Measure",
    short: "M",
    color: "bg-zinc-700/50 text-white border-zinc-500",
  },
];

const BACKENDS = [
  { id: "qiskit", label: "Qiskit Aer", color: "text-[#6929c4]" },
  { id: "pennylane", label: "PennyLane", color: "text-[#1a9c8e]" },
  { id: "cirq", label: "Cirq", color: "text-[#f28c28]" },
];

/** Builds executable Python for the chosen backend from the shared gate-wire model. */
function generateCode(backend, numQubits, circuit, hasMeasureGate) {
  if (backend === "pennylane") return generatePennyLaneCode(numQubits, circuit);
  if (backend === "cirq") return generateCirqCode(numQubits, circuit);
  return generateQiskitCode(numQubits, circuit, hasMeasureGate);
}

function generateQiskitCode(numQubits, circuit, hasMeasureGate) {
  let pyCode = `from qiskit import QuantumCircuit, transpile\n`;
  pyCode += `from qiskit_aer import Aer\n`;
  pyCode += `from qiskit.quantum_info import Statevector\n`;
  pyCode += `import json, numpy as np\n\n`;

  pyCode += `qc_state = QuantumCircuit(${numQubits})\n`;
  pyCode += hasMeasureGate
    ? `qc = QuantumCircuit(${numQubits}, ${numQubits})\n`
    : `qc = QuantumCircuit(${numQubits})\n`;

  const layers = getCircuitLayers(numQubits, circuit);

  for (let l = 0; l < layers.length; l++) {
    const layer = layers[l];

    // Emit unitary operations in this layer (applied to both qc and qc_state)
    layer.forEach((gate) => {
      const q = gate.wire;
      if (gate.type === "CX" || gate.type === "SWAP") {
        let target =
          gate.target !== undefined && gate.target !== null
            ? gate.target
            : (q + 1) % numQubits;
        if (numQubits > 1 && target !== q) {
          pyCode += `qc.${gate.type.toLowerCase()}(${q}, ${target})\n`;
          pyCode += `qc_state.${gate.type.toLowerCase()}(${q}, ${target})\n`;
        } else {
          pyCode += `# ${gate.type.toLowerCase()} skipped (invalid target or single qubit)\n`;
        }
      } else if (gate.type === "I") {
        pyCode += `qc.id(${q})\nqc_state.id(${q})\n`;
      } else if (gate.type === "M") {
        // Handled in measurement pass below
      } else {
        pyCode += `qc.${gate.type.toLowerCase()}(${q})\nqc_state.${gate.type.toLowerCase()}(${q})\n`;
      }
    });

    // Emit measurement operations in this layer (applied ONLY to qc, never to qc_state)
    layer.forEach((gate) => {
      if (gate.type === "M") {
        pyCode += `qc.measure(${gate.wire}, ${gate.wire})\n`;
      }
    });
  }

  if (!hasMeasureGate) pyCode += `\nqc.measure_all()\n`;

  pyCode += `
from qiskit.visualization import circuit_drawer, plot_histogram
import matplotlib.pyplot as plt

fig = circuit_drawer(qc, output='mpl')
display(fig)
plt.close(fig)

simulator = Aer.get_backend('aer_simulator')
compiled = transpile(qc, simulator)
job = simulator.run(compiled, shots=1000)
counts = job.result().get_counts()

fig2 = plot_histogram(counts)
display(fig2)
plt.close(fig2)

# Exact (pre-measurement) state probabilities, for the interactive heatmap
sv = Statevector.from_instruction(qc_state)
probs = np.abs(sv.data) ** 2
prob_map = {format(i, '0${numQubits}b'): float(p) for i, p in enumerate(probs) if p > 1e-6}
print("STATE_PROBS=" + json.dumps(prob_map))
`;
  return pyCode;
}

const PENNYLANE_GATE_MAP = {
  H: "Hadamard",
  X: "PauliX",
  Y: "PauliY",
  Z: "PauliZ",
  S: "S",
  T: "T",
  SX: "SX",
  I: "Identity",
};

function generatePennyLaneCode(numQubits, circuit) {
  let py = `import pennylane as qml\nimport matplotlib.pyplot as plt\n\n`;
  py += `dev = qml.device("default.qubit", wires=${numQubits}, shots=1000)\n\n`;
  py += `@qml.qnode(dev)\ndef circuit():\n`;

  let bodyLines = [];
  const layers = getCircuitLayers(numQubits, circuit);

  for (let l = 0; l < layers.length; l++) {
    const layer = layers[l];
    layer.forEach((gate) => {
      const q = gate.wire;
      if (gate.type === "M" || gate.type === "I") return; // measurement is implicit; identity is a no-op for state
      if (gate.type === "CX") {
        const target =
          gate.target !== undefined && gate.target !== null
            ? gate.target
            : (q + 1) % numQubits;
        if (numQubits > 1 && target !== q)
          bodyLines.push(`    qml.CNOT(wires=[${q}, ${target}])`);
      } else if (gate.type === "SWAP") {
        const target =
          gate.target !== undefined && gate.target !== null
            ? gate.target
            : (q + 1) % numQubits;
        if (numQubits > 1 && target !== q)
          bodyLines.push(`    qml.SWAP(wires=[${q}, ${target}])`);
      } else if (gate.type === "SDG") {
        bodyLines.push(`    qml.adjoint(qml.S)(wires=${q})`);
      } else if (gate.type === "TDG") {
        bodyLines.push(`    qml.adjoint(qml.T)(wires=${q})`);
      } else if (PENNYLANE_GATE_MAP[gate.type]) {
        bodyLines.push(`    qml.${PENNYLANE_GATE_MAP[gate.type]}(wires=${q})`);
      }
    });
  }
  if (bodyLines.length === 0) bodyLines.push(`    qml.Identity(wires=0)`);
  py += bodyLines.join("\n") + "\n";
  py += `    return qml.counts()\n\n`;

  py += `fig, ax = qml.draw_mpl(circuit)()\ndisplay(fig)\nplt.close(fig)\n\n`;
  py += `counts = circuit()\nlabels = [f"|{k}⟩" for k in counts.keys()]\n`;
  py += `fig2, ax2 = plt.subplots()\nax2.bar(labels, counts.values(), color="#1a9c8e")\n`;
  py += `ax2.set_ylabel("Counts")\nax2.set_title("PennyLane — default.qubit (1000 shots)")\n`;
  py += `plt.xticks(rotation=45)\ndisplay(fig2)\nplt.close(fig2)\n`;
  return py;
}

const CIRQ_GATE_MAP = {
  H: "H",
  X: "X",
  Y: "Y",
  Z: "Z",
  S: "S",
  T: "T",
};

function generateCirqCode(numQubits, circuit) {
  let py = `import cirq\nimport matplotlib.pyplot as plt\n\n`;
  py += `qubits = cirq.LineQubit.range(${numQubits})\ncircuit = cirq.Circuit()\n`;

  const layers = getCircuitLayers(numQubits, circuit);

  for (let l = 0; l < layers.length; l++) {
    const layer = layers[l];
    layer.forEach((gate) => {
      const q = gate.wire;
      if (gate.type === "M" || gate.type === "I") return;
      if (gate.type === "CX") {
        const target =
          gate.target !== undefined && gate.target !== null
            ? gate.target
            : (q + 1) % numQubits;
        if (numQubits > 1 && target !== q)
          py += `circuit.append(cirq.CNOT(qubits[${q}], qubits[${target}]))\n`;
      } else if (gate.type === "SWAP") {
        const target =
          gate.target !== undefined && gate.target !== null
            ? gate.target
            : (q + 1) % numQubits;
        if (numQubits > 1 && target !== q)
          py += `circuit.append(cirq.SWAP(qubits[${q}], qubits[${target}]))\n`;
      } else if (gate.type === "SX") {
        py += `circuit.append((cirq.X**0.5)(qubits[${q}]))\n`;
      } else if (gate.type === "SDG") {
        py += `circuit.append((cirq.S**-1)(qubits[${q}]))\n`;
      } else if (gate.type === "TDG") {
        py += `circuit.append((cirq.T**-1)(qubits[${q}]))\n`;
      } else if (CIRQ_GATE_MAP[gate.type]) {
        py += `circuit.append(cirq.${CIRQ_GATE_MAP[gate.type]}(qubits[${q}]))\n`;
      }
    });
  }

  py += `circuit.append(cirq.measure(*qubits, key="result"))\n\n`;
  py += `fig, ax = plt.subplots(figsize=(max(6, ${numQubits}), 2))\n`;
  py += `ax.text(0.01, 0.5, str(circuit), fontfamily="monospace", fontsize=10, va="center")\n`;
  py += `ax.axis("off")\ndisplay(fig)\nplt.close(fig)\n\n`;
  py += `simulator = cirq.Simulator()\nresult = simulator.run(circuit, repetitions=1000)\n`;
  py += `hist = result.histogram(key="result")\n`;
  py += `labels = [f"|{format(k, '0${numQubits}b')}⟩" for k in hist.keys()]\n`;
  py += `fig2, ax2 = plt.subplots()\nax2.bar(labels, hist.values(), color="#f28c28")\n`;
  py += `ax2.set_ylabel("Counts")\nax2.set_title("Cirq — Simulator (1000 shots)")\n`;
  py += `plt.xticks(rotation=45)\ndisplay(fig2)\nplt.close(fig2)\n`;
  return py;
}

function DraggableGate({ gate }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `palette-${gate.type}`,
      data: { type: gate.type, label: gate.label, color: gate.color },
    });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`h-12 w-12 flex items-center justify-center rounded-lg border-2 font-bold cursor-grab active:cursor-grabbing shadow-lg ${gate.color}`}
    >
      {gate.label}
    </div>
  );
}

function WireDroppable({
  wireIndex,
  gates,
  onRemove,
  onUpdate,
  numQubits,
  activeGateIndex,
  activeLayerIndex,
  selectedGate,
  onSelectGate,
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `wire-${wireIndex}`,
  });

  return (
    <div className="flex items-center gap-4 w-full h-16 group relative">
      <div className="font-mono text-xs font-bold text-[var(--color-app-text-muted)] w-12">
        q[{wireIndex}]
      </div>

      {/* The Droppable Wire Area */}
      <div
        ref={setNodeRef}
        className={`flex-1 h-full relative flex items-center px-4 rounded-lg transition-colors border-2 border-dashed ${
          isOver
            ? "bg-[var(--color-app-primary)]/10 border-[var(--color-app-primary)]"
            : "bg-transparent border-transparent hover:border-[var(--color-app-border)]"
        }`}
      >
        {/* The literal wire line */}
        <div className="absolute left-0 right-0 h-[2px] bg-[var(--color-app-border-light)] top-1/2 -translate-y-1/2 -z-10" />

        {/* Gates on the wire */}
        <div className="flex gap-2 relative z-10 overflow-x-auto w-full custom-scrollbar items-center">
          {gates.map((g, i) => {
            const isActive = activeGateIndex === i;
            const isLayerActive =
              !isActive &&
              activeLayerIndex !== null &&
              activeLayerIndex !== undefined &&
              activeLayerIndex === i;
            const isLensSelected =
              selectedGate?.wireIndex === wireIndex &&
              selectedGate?.gateIndex === i;
            return (
              <div
                key={i}
                onClick={(e) => {
                  if (typeof onSelectGate === "function") {
                    onSelectGate({ wireIndex, gateIndex: i, gate: g });
                  }
                }}
                className={`h-12 w-16 shrink-0 flex flex-col items-center justify-center rounded-lg border-2 hover:brightness-110 transition-all relative group/gate cursor-pointer ${g.color} ${
                  isLensSelected
                    ? "ring-4 ring-indigo-400 border-indigo-300 shadow-xl shadow-indigo-500/40 scale-105 z-25"
                    : isActive
                      ? "ring-4 ring-[var(--color-app-primary)] border-[var(--color-app-primary)] shadow-xl shadow-[var(--color-app-primary)]/50 scale-110 z-30 animate-pulse"
                      : isLayerActive
                        ? "ring-2 ring-cyan-400/60 border-cyan-400 shadow-md shadow-cyan-500/20"
                        : ""
                }`}
                title="Click to select • Alt+Q for Context Lens"
              >
                <div
                  className="absolute top-0 right-0 -mt-2 -mr-2 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] opacity-0 group-hover/gate:opacity-100 cursor-pointer z-20"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(wireIndex, i);
                  }}
                  title="Remove gate"
                >
                  ✕
                </div>
                <span className="font-bold text-sm">{g.short || g.label}</span>
                {(g.type === "CX" || g.type === "SWAP") && (
                  <select
                    className="text-[10px] bg-black/40 mt-0.5 border border-pink-500/50 rounded px-1 outline-none text-pink-400 font-mono cursor-pointer"
                    value={
                      g.target !== undefined
                        ? g.target
                        : (wireIndex + 1) % numQubits
                    }
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) =>
                      onUpdate(wireIndex, i, {
                        ...g,
                        target: parseInt(e.target.value),
                      })
                    }
                  >
                    {Array.from({ length: numQubits }).map(
                      (_, targetIdx) =>
                        targetIdx !== wireIndex && (
                          <option
                            key={targetIdx}
                            value={targetIdx}
                            className="bg-[var(--color-app-surface)]"
                          >
                            → q[{targetIdx}]
                          </option>
                        ),
                    )}
                  </select>
                )}
              </div>
            );
          })}
          {gates.length === 0 && !isOver && (
            <div className="text-[10px] text-[var(--color-app-text-muted)] italic opacity-0 group-hover:opacity-100 transition-opacity absolute left-4 pointer-events-none">
              Drag gates here...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CircuitSimulatorPage() {
  const location = useLocation();
  const initialCircuit = location.state?.initialCircuit;
  const initialNumQubits = location.state?.initialNumQubits;
  const bridgeOrigin = location.state?.origin;

  const [numQubits, setNumQubits] = useState(initialNumQubits || 3);
  const [circuit, setCircuit] = useState(() => {
    if (initialCircuit) return initialCircuit;
    return { 0: [], 1: [], 2: [] };
  });
  const [bridgeNotice, setBridgeNotice] = useState(
    bridgeOrigin === "why-quantum",
  );
  const [activeDragItem, setActiveDragItem] = useState(null);
  const [backend, setBackend] = useState("qiskit");

  const [outputPython, setOutputPython] = useState("");
  const [simResult, setSimResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [compareResults, setCompareResults] = useState(null);
  const [comparing, setComparing] = useState(false);
  const { openTutor } = useAITutor();
  const [qasmModal, setQasmModal] = useState(null); // { mode: "export"|"import", text }
  const [qasmError, setQasmError] = useState(null);
  const [stateProbs, setStateProbs] = useState(null);
  const [expandedSimulationImage, setExpandedSimulationImage] = useState(null);
  const [selectedGate, setSelectedGate] = useState(null); // { wireIndex, gateIndex, gate } | null

  // ─── Quantum Time Machine State ───
  const [timeline, setTimeline] = useState(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [timelineStale, setTimelineStale] = useState(false);

  // Playback timer effect
  useEffect(() => {
    if (
      !isPlaying ||
      !timeline ||
      !timeline.steps ||
      timeline.steps.length === 0
    )
      return;
    const intervalMs = Math.round(1200 / playbackSpeed);
    const timer = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev >= timeline.steps.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, timeline]);

  const handleDragStart = (event) => {
    setActiveDragItem(event.active.data.current);
  };

  const handleDragEnd = (event) => {
    setActiveDragItem(null);
    const { over, active } = event;

    if (over && over.id.toString().startsWith("wire-")) {
      const wireIndex = parseInt(over.id.split("-")[1], 10);
      const gateData = active.data.current;

      setCircuit((prev) => ({
        ...prev,
        [wireIndex]: [...(prev[wireIndex] || []), gateData],
      }));
      setTimelineStale(true);
    }
  };

  const removeGate = (wireIndex, gateIndex) => {
    setSelectedGate((prev) => {
      if (prev?.wireIndex === wireIndex && prev?.gateIndex === gateIndex) {
        return null;
      }
      return prev;
    });
    setCircuit((prev) => {
      const newWire = [...prev[wireIndex]];
      newWire.splice(gateIndex, 1);
      return { ...prev, [wireIndex]: newWire };
    });
    setTimelineStale(true);
  };

  const updateGate = (wireIndex, gateIndex, newGateData) => {
    setCircuit((prev) => {
      const newWire = [...prev[wireIndex]];
      newWire[gateIndex] = newGateData;
      return { ...prev, [wireIndex]: newWire };
    });
    setTimelineStale(true);
  };

  const handleQubitChange = (e) => {
    let val = parseInt(e.target.value);
    if (isNaN(val) || val < 1) val = 1;
    if (val > 10) val = 10;

    setCircuit((prev) => {
      const fresh = { ...prev };
      for (let i = 0; i < val; i++) {
        if (!fresh[i]) fresh[i] = [];
      }
      for (let i = val; i < 15; i++) {
        delete fresh[i];
      }
      return fresh;
    });
    setNumQubits(val);
    setTimelineStale(true);
  };

  const clearCircuit = () => {
    const fresh = {};
    for (let i = 0; i < numQubits; i++) fresh[i] = [];
    setCircuit(fresh);
    setSimResult(null);
    setOutputPython("");
    setCompareResults(null);
    setTimeline(null);
    setTimelineStale(false);
    setIsPlaying(false);
    setCurrentStepIndex(0);
    setSelectedGate(null);
  };

  // Flatten circuit representation for Time Machine evaluation (canonical time-major layer ordering)
  const flattenTimelineGates = useCallback(() => {
    return flattenCircuitByLayer(numQubits, circuit);
  }, [circuit, numQubits]);

  const flattenedTimelineGates = useMemo(
    () => flattenTimelineGates(),
    [flattenTimelineGates],
  );

  // Identify currently active gate on the wires
  const activeGateInfo = useMemo(() => {
    if (!timeline || currentStepIndex <= 0) return null;
    const step = timeline.steps?.[currentStepIndex];
    if (!step || !step.appliedGate) return null;
    const origIdx = step.appliedGate.originalIndex;
    if (origIdx !== undefined && flattenedTimelineGates[origIdx]) {
      return {
        wireIndex: flattenedTimelineGates[origIdx].wireIndex,
        gateIndexOnWire: flattenedTimelineGates[origIdx].gateIndexOnWire,
        layerIndex: flattenedTimelineGates[origIdx].layerIndex,
      };
    }
    return null;
  }, [timeline, currentStepIndex, flattenedTimelineGates]);

  const handleRunTimeline = async () => {
    if (numQubits > 8) {
      setTimelineError(
        "Quantum Time Machine supports up to 8 qubits. Please set Number of Qubits to 8 or fewer.",
      );
      return;
    }
    if (flattenedTimelineGates.length > 30) {
      setTimelineError(
        `Quantum Time Machine supports up to 30 gates. Current circuit has ${flattenedTimelineGates.length} gates.`,
      );
      return;
    }

    setTimelineLoading(true);
    setTimelineError(null);
    setIsPlaying(false);

    try {
      const payloadGates = flattenedTimelineGates.map(
        ({ type, wire, target, layerIndex }) => ({
          type,
          wire,
          target,
          layerIndex,
        }),
      );

      const res = await runCircuitTimeline({
        numQubits,
        gates: payloadGates,
      });

      if (res && res.success) {
        setTimeline(res);
        setCurrentStepIndex(0);
        setTimelineStale(false);
      } else {
        setTimelineError(res?.error || "Failed to evaluate circuit timeline.");
      }
    } catch (err) {
      console.error("Timeline error:", err);
      setTimelineError(
        err?.response?.data?.error ||
          err.message ||
          "Failed to connect to timeline backend.",
      );
    } finally {
      setTimelineLoading(false);
    }
  };

  const hasMeasureGate = () => {
    for (let q = 0; q < numQubits; q++) {
      if (circuit[q] && circuit[q].some((g) => g.type === "M")) return true;
    }
    return false;
  };

  const runSimulation = async () => {
    setLoading(true);
    setSimResult(null);
    setCompareResults(null);
    setStateProbs(null);

    const pyCode = generateCode(backend, numQubits, circuit, hasMeasureGate());
    console.log("=== GENERATED SANDBOX PYTHON ===");
    console.log(pyCode);
    console.log("=== END GENERATED SANDBOX PYTHON ===");

    try {
      const { runSandboxCode } = await import("../../services/api");
      const data = await runSandboxCode({ code: pyCode });

      const probsMatch = data.console?.match(/STATE_PROBS=(\{.*\})/);
      if (probsMatch) {
        try {
          setStateProbs(JSON.parse(probsMatch[1]));
        } catch (e) {
          /* ignore parse failure */
        }
        data.console = data.console.replace(/STATE_PROBS=\{.*\}\n?/, "");
      }

      setSimResult(data);
    } catch (err) {
      console.error(err);
      setSimResult({ errorText: "Failed to connect to simulation backend." });
    }

    setOutputPython(pyCode);
    setLoading(false);
  };

  const runComparison = async () => {
    setComparing(true);
    setSimResult(null);
    setCompareResults(null);

    const { runSandboxCode } = await import("../../services/api");
    const results = {};
    for (const b of BACKENDS) {
      const code = generateCode(b.id, numQubits, circuit, hasMeasureGate());
      try {
        // eslint-disable-next-line no-await-in-loop
        const data = await runSandboxCode({ code });
        results[b.id] = data;
      } catch (err) {
        results[b.id] = { errorText: "Execution failed." };
      }
    }
    setCompareResults(results);
    setComparing(false);
  };

  const flattenGates = () => {
    return flattenCircuitByLayer(numQubits, circuit).map((g) => ({
      type: g.type,
      qubit: g.wire,
      target: g.target,
    }));
  };

  const handleExportQasm = async () => {
    setQasmError(null);
    try {
      const { qasm } = await exportCircuitToQasm(numQubits, flattenGates());
      setQasmModal({ mode: "export", text: qasm });
    } catch (err) {
      setQasmError("Failed to export QASM.");
    }
  };

  const handleImportQasm = async (qasmText) => {
    setQasmError(null);
    try {
      const { numQubits: n, gates } = await importCircuitFromQasm(qasmText);
      const fresh = {};
      for (let i = 0; i < n; i++) fresh[i] = [];
      gates.forEach((g) => {
        const gateDef = GATES.find((gd) => gd.type === g.type) || {
          type: g.type,
          label: g.type,
          short: g.type,
          color: "bg-gray-500/20 text-gray-400 border-gray-500",
        };
        fresh[g.qubit].push({ ...gateDef, target: g.target });
      });
      setNumQubits(n);
      setCircuit(fresh);
      setQasmModal(null);
    } catch (err) {
      setQasmError(
        err?.response?.data?.error || "Invalid QASM — could not parse.",
      );
    }
  };

  return (
    <div
      data-lens-surface="circuit-simulator"
      className="flex h-[calc(100vh-60px)] w-full flex-col bg-[var(--color-app-base)] text-[var(--color-app-text-main)]"
    >
      {/* Header */}
      <div className="flex items-center justify-between bg-[var(--color-app-surface)] px-8 py-4 border-b border-[var(--color-app-border)]">
        <div>
          <h1 className="text-sm font-bold flex items-center gap-3 text-[var(--color-app-text-main)]">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-app-accent)] to-[var(--color-app-accent-hover)]">
              <svg
                className="h-4 w-4 text-[var(--color-app-base)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                />
              </svg>
            </div>
            Drag-and-Drop Circuit Simulator
          </h1>
          <p className="text-xs text-[var(--color-app-text-muted)] mt-1 ml-11">
            Build quantum circuits visually and simulate them on the fly.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={backend}
            onChange={(e) => setBackend(e.target.value)}
            className="px-3 py-2 text-xs font-bold rounded-lg border border-[var(--color-app-border)] bg-[var(--color-app-surface)] outline-none focus:border-[var(--color-app-primary)] cursor-pointer"
            title="Simulation backend"
          >
            {BACKENDS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
          <Button variant="outline" onClick={clearCircuit}>
            Clear
          </Button>
          <Button variant="outline" onClick={handleExportQasm}>
            ↓ Export QASM
          </Button>
          <Button
            variant="outline"
            onClick={() => setQasmModal({ mode: "import", text: "" })}
          >
            ↑ Import QASM
          </Button>
          <Button variant="outline" loading={comparing} onClick={runComparison}>
            {comparing ? "Comparing..." : "⇄ Compare Backends"}
          </Button>
          <Button
            variant="outline"
            loading={timelineLoading}
            onClick={handleRunTimeline}
            className="bg-gradient-to-r from-cyan-500/20 to-teal-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 font-bold"
          >
            {timelineLoading ? "Evaluating..." : "⏱ Time Machine"}
          </Button>
          <Button variant="primary" loading={loading} onClick={runSimulation}>
            {loading ? "Running..." : "▶ Run Circuit"}
          </Button>
        </div>
      </div>
      <div className="app-gradient-line" />

      {/* Educational Bridge Notification */}
      {bridgeNotice && (
        <div className="px-8 py-2.5 bg-blue-500/10 border-b border-blue-500/30 flex items-center justify-between text-xs text-blue-300">
          <div className="flex items-center gap-2">
            <span>🔬</span>
            <span>
              <strong>Transferred from Micro Module 1: Why Quantum?</strong>{" "}
              Preloaded with the single-qubit Hadamard experiment (
              <code className="bg-black/30 px-1 py-0.5 rounded text-blue-200">
                |0⟩ ── H ── M
              </code>
              ). Drag gates to experiment freely!
            </span>
          </div>
          <button
            onClick={() => setBridgeNotice(false)}
            className="text-xs text-blue-400 hover:text-white px-2 py-0.5 rounded transition-colors"
          >
            ✕ Dismiss
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <DndContext
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          collisionDetection={closestCenter}
        >
          {/* Left Sidebar: Gate Palette */}
          <div
            className="w-64 bg-[var(--color-app-surface)] border-r border-[var(--color-app-border)] p-6 overflow-y-auto"
            data-lenis-prevent="true"
          >
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--color-app-accent)] mb-6 border-b border-[var(--color-app-border)] pb-2">
              Gate Palette
            </h3>
            <p className="text-xs text-[var(--color-app-text-muted)] mb-4">
              Drag gates onto the qubit wires.
            </p>
            <div className="grid grid-cols-3 gap-3">
              {GATES.map((gate) => (
                <DraggableGate key={gate.type} gate={gate} />
              ))}
            </div>
          </div>

          {/* Main Area: Circuit Wire Grid */}
          <div
            className="flex-1 p-8 overflow-y-auto bg-[var(--color-app-base)] flex flex-col"
            data-lenis-prevent="true"
          >
            {/* Qubit Controls */}
            <div className="flex justify-end gap-2 mb-6 items-center">
              <label className="text-xs font-bold text-[var(--color-app-text-muted)] uppercase tracking-wider">
                Number of Qubits:
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={numQubits}
                onChange={handleQubitChange}
                className="w-16 px-2 py-1 text-xs rounded-lg border border-[var(--color-app-border)] bg-[var(--color-app-surface)] text-center outline-none focus:border-[var(--color-app-primary)]"
              />
            </div>

            {/* Wires */}
            <div className="app-glass p-6 rounded-2xl flex flex-col gap-4 border border-[var(--color-app-border)] shadow-xl shadow-[var(--color-app-primary-glow)]/5">
              {Array.from({ length: numQubits }).map((_, i) => (
                <WireDroppable
                  key={i}
                  wireIndex={i}
                  gates={circuit[i] || []}
                  onRemove={removeGate}
                  onUpdate={updateGate}
                  numQubits={numQubits}
                  activeGateIndex={
                    activeGateInfo?.wireIndex === i
                      ? activeGateInfo.gateIndexOnWire
                      : null
                  }
                  activeLayerIndex={activeGateInfo?.layerIndex}
                  selectedGate={selectedGate}
                  onSelectGate={setSelectedGate}
                />
              ))}
            </div>

            {/* Quantum Time Machine Status & Panel */}
            {timelineLoading && (
              <div className="mt-8 p-6 rounded-2xl app-glass border border-cyan-500/30 flex items-center justify-center gap-3 text-cyan-300 animate-pulse">
                <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-bold">
                  Traveling through quantum timeline... (Calculating
                  gate-by-gate state evolution)
                </span>
              </div>
            )}

            {timelineError && (
              <div className="mt-8 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center justify-between">
                <span>⚠️ {timelineError}</span>
                <button
                  onClick={() => setTimelineError(null)}
                  className="text-xs font-bold underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {timeline && !timelineLoading && (
              <QuantumTimeMachinePanel
                timeline={timeline}
                currentStepIndex={currentStepIndex}
                onStepChange={setCurrentStepIndex}
                isPlaying={isPlaying}
                onPlayPause={() => setIsPlaying(!isPlaying)}
                playbackSpeed={playbackSpeed}
                onSpeedChange={setPlaybackSpeed}
                onReset={() => {
                  setIsPlaying(false);
                  setCurrentStepIndex(0);
                }}
                onClose={() => {
                  setIsPlaying(false);
                  setTimeline(null);
                }}
                isStale={timelineStale}
                onRefresh={handleRunTimeline}
                numQubits={numQubits}
              />
            )}

            {/* Cross-Backend Comparison Results */}
            {compareResults && (
              <div className="mt-8 animate-fade-in">
                <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--color-app-primary)] mb-4 border-b border-[var(--color-app-border)] pb-2">
                  Cross-Backend Comparison
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {BACKENDS.map((b) => {
                    const r = compareResults[b.id];
                    return (
                      <div
                        key={b.id}
                        className="app-glass rounded-xl p-4 border border-[var(--color-app-border)]"
                      >
                        <div
                          className={`text-xs font-bold uppercase tracking-wider mb-3 ${b.color}`}
                        >
                          {b.label}
                        </div>
                        {r?.errorText ? (
                          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-[10px] whitespace-pre-wrap max-h-40 overflow-y-auto">
                            {r.errorText}
                          </div>
                        ) : r?.images && r.images.length > 1 ? (
                          <img
                            src={`data:image/png;base64,${r.images[1]}`}
                            className="w-full object-contain invert brightness-90 hue-rotate-180"
                            alt={`${b.label} histogram`}
                          />
                        ) : (
                          <div className="text-xs text-[var(--color-app-text-muted)] italic">
                            No output.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Simulation Results */}
            {simResult && (
              <div className="mt-8 animate-fade-in">
                <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--color-app-primary)] mb-4 border-b border-[var(--color-app-border)] pb-2 flex items-center gap-2">
                  Simulation Results
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full border border-current ${BACKENDS.find((b) => b.id === backend)?.color}`}
                  >
                    {BACKENDS.find((b) => b.id === backend)?.label}
                  </span>
                  <button
                    onClick={() =>
                      openTutor(
  "Review my circuit — point out bugs and optimizations.",
  {
    source: "circuit-simulator",
    page: "Circuit Simulator",
    circuit: circuit,
    code: outputPython,
    numQubits,
    gates: flattenCircuitByLayer(numQubits, circuit),
    layers: getCircuitLayers(numQubits, circuit),
    probabilities: stateProbs || {},
  },
)
                    }
                    className="ml-auto text-[10px] normal-case tracking-normal font-semibold px-2.5 py-1 rounded-full transition-colors"
                    style={{
                      border: "1px solid var(--color-app-primary)",
                      color: "var(--color-app-primary)",
                    }}
                  >
                    ✨ Ask AI Tutor
                  </button>
                </h3>

                {simResult.errorText ? (
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-xs whitespace-pre-wrap">
                    {simResult.errorText}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {simResult.images && simResult.images.length > 0 && (
                      <div
                        className="app-glass rounded-xl p-4 flex justify-center cursor-zoom-in group"
                        onClick={() =>
                          setExpandedSimulationImage(simResult.images[0])
                        }
                        title="Click to view full size"
                      >
                        <img
                          src={`data:image/png;base64,${simResult.images[0]}`}
                          className="max-h-64 object-contain invert brightness-90 hue-rotate-180 transition-transform duration-200 group-hover:scale-[1.02]"
                          alt="Circuit"
                        />
                      </div>
                    )}
                    {simResult.images && simResult.images.length > 1 && (
                      <div
                        className="app-glass rounded-xl p-4 flex justify-center cursor-zoom-in group"
                        onClick={() =>
                          setExpandedSimulationImage(simResult.images[1])
                        }
                        title="Click to view full size"
                      >
                        <img
                          src={`data:image/png;base64,${simResult.images[1]}`}
                          className="max-h-64 object-contain invert brightness-90 hue-rotate-180 transition-transform duration-200 group-hover:scale-[1.02]"
                          alt="Histogram"
                        />
                      </div>
                    )}
                    {stateProbs && (
                      <StateProbabilityHeatmap probabilities={stateProbs} />
                    )}
                  </div>
                )}

                {/* Code Output */}
                {!simResult.errorText && outputPython && (
                  <div className="mt-8">
                    <div className="rounded-none overflow-hidden bg-[#161616] border border-[#333333] shadow-inner relative mt-6 mb-6">
                      <button
                        onClick={(e) => {
                          navigator.clipboard.writeText(outputPython);
                          const btn = e.currentTarget;
                          const copyIcon = `<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>`;
                          const checkIcon = `<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 13l4 4L19 7"></path></svg>`;
                          btn.innerHTML = checkIcon;
                          btn.classList.add("!text-[#4ade80]");
                          setTimeout(() => {
                            btn.innerHTML = copyIcon;
                            btn.classList.remove("!text-[#4ade80]");
                          }, 2000);
                        }}
                        className="absolute top-3 right-3 text-[#8c8c8c] hover:text-white bg-transparent hover:bg-white/10 p-1.5 rounded flex items-center justify-center transition-all z-10"
                        title="Copy to clipboard"
                      >
                        <svg
                          width="18"
                          height="18"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.5"
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          ></path>
                        </svg>
                      </button>
                      <pre className="!m-0 !p-5 !pr-12 !bg-transparent text-[#f4f4f4] text-[0.85rem] font-mono whitespace-pre-wrap">
                        <code>{outputPython}</code>
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DragOverlay>
            {activeDragItem ? (
              <div
                className={`h-12 w-12 flex items-center justify-center rounded-lg border-2 font-bold shadow-2xl scale-110 ${activeDragItem.color}`}
              >
                {activeDragItem.label}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* OpenQASM Export/Import Modal */}
      {qasmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setQasmModal(null)}
        >
          <div
            className="w-full max-w-xl rounded-2xl p-6 app-glass border border-[var(--color-app-border)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              className="text-sm font-bold uppercase tracking-wider mb-1"
              style={{ color: "var(--color-app-text-main)" }}
            >
              {qasmModal.mode === "export"
                ? "Export to OpenQASM 2.0"
                : "Import from OpenQASM 2.0"}
            </h3>
            <p
              className="text-xs mb-4"
              style={{ color: "var(--color-app-text-muted)" }}
            >
              {qasmModal.mode === "export"
                ? "Paste this into Qiskit, PennyLane, or Cirq notebooks that support OpenQASM."
                : "Paste OpenQASM 2.0 code exported from Qiskit or another tool."}
            </p>
            <textarea
              value={qasmModal.text}
              onChange={(e) =>
                setQasmModal({ ...qasmModal, text: e.target.value })
              }
              readOnly={qasmModal.mode === "export"}
              rows={10}
              className="w-full rounded-lg p-3 font-mono text-xs outline-none resize-none"
              style={{
                background: "#161616",
                color: "#f4f4f4",
                border: "1px solid var(--color-app-border)",
              }}
              placeholder={`OPENQASM 2.0;\ninclude "qelib1.inc";\nqreg q[2];\ncreg c[2];\nh q[0];\ncx q[0],q[1];`}
            />
            {qasmError && (
              <p className="text-xs text-red-400 mt-2">{qasmError}</p>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setQasmModal(null)}>
                Close
              </Button>
              {qasmModal.mode === "export" ? (
                <Button
                  variant="primary"
                  onClick={() => navigator.clipboard.writeText(qasmModal.text)}
                >
                  Copy
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={() => handleImportQasm(qasmModal.text)}
                >
                  Import
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {expandedSimulationImage && (
        <ImageLightbox
          src={`data:image/png;base64,${expandedSimulationImage}`}
          alt="Simulation Result — Full View"
          onClose={() => setExpandedSimulationImage(null)}
        />
      )}

      {/* Quantum Context Lens Trigger for Interactive Circuit Objects */}
      <CircuitLensTrigger
        selectedGate={selectedGate}
        circuit={circuit}
        numQubits={numQubits}
        onClear={() => setSelectedGate(null)}
      />
    </div>
  );
}
