/**
 * circuitEntityAdapter.js
 * 
 * Quantiva Phase 4: Circuit Simulator Surface Context Adapter for Quantum Contextual Lens.
 * 
 * Responsibilities:
 * - Identifies circuit-simulator surface (/circuit-simulator).
 * - Resolves canonical entity for a selected circuit gate (e.g. "H" -> hadamard, "CX" -> cnot, "SWAP" -> swap, "M" -> measurement).
 * - Extracts bounded local causal neighborhood around the selected gate:
 *   - wireIndex / qubitIndex (e.g. 0)
 *   - layerIndex (temporal moment index)
 *   - gateType & gateLabel
 *   - controlQubit and targetQubit (for CX and SWAP multi-qubit interactions)
 *   - participatingQubits list
 *   - precedingGatesOnQubit & succeedingGatesOnQubit (bounded to 3 gates)
 *   - concurrentGatesInLayer (gates executing at the same time step on other wires)
 *   - nearbyCircuitRegion (formatted readable summary of local circuit slice)
 *   - totalQubits & circuitDepth
 * - Adheres strictly to the universal InspectionContext schema.
 * - Zero coupling to circuit execution, code generation, QASM, or simulation engines.
 */

import { resolveCanonicalEntity } from "../../../data/quantumOntology.js";
import { getCircuitLayers } from "../../../utils/circuitLayers.js";

/**
 * Checks if the current route represents the Circuit Simulator.
 */
export function isCircuitSimulatorSurface(pathname = window.location.pathname) {
  if (pathname.includes("/circuit-simulator")) return true;
  return Boolean(document.querySelector('[data-lens-surface="circuit-simulator"]'));
}

/**
 * Extracts structured, bounded inspection context from a selected circuit gate.
 * 
 * @param {Object} selectedGate - { wireIndex: number, gateIndex: number, gate: Object }
 * @param {Object} circuit - { 0: [gates], 1: [gates], ... }
 * @param {number} numQubits - Number of active qubits
 * @param {string} pathname - Current route
 * @returns {Object|null} Standardized InspectionContext object
 */
export function extractCircuitContext(selectedGate, circuit = {}, numQubits = 2, pathname = window.location.pathname) {
  if (!selectedGate || !selectedGate.gate) return null;

  const { wireIndex, gateIndex, gate } = selectedGate;
  const gateType = gate.type || gate.label || "Gate";
  const gateLabel = gate.label || gate.short || gateType;

  // 1. Resolve Canonical Entity
  let entity = resolveCanonicalEntity(gateType);
  if (!entity && gateLabel) {
    entity = resolveCanonicalEntity(gateLabel);
  }

  // 2. Identify Control / Target Qubits for Multi-Qubit Gates
  let controlQubit = null;
  let targetQubit = null;
  let participatingQubits = [wireIndex];

  if (gateType === "CX" || gateType === "SWAP") {
    controlQubit = wireIndex;
    targetQubit =
      gate.target !== undefined && gate.target !== null
        ? gate.target
        : (wireIndex + 1) % numQubits;
    if (targetQubit === wireIndex && numQubits > 1) {
      targetQubit = (wireIndex + 1) % numQubits;
    }
    participatingQubits = [controlQubit, targetQubit];
  }

  // 3. Preceding & Succeeding Gates on the Same Qubit
  const wireGates = circuit[wireIndex] || [];
  const precedingGatesOnQubit = wireGates
    .slice(Math.max(0, gateIndex - 3), gateIndex)
    .map((g, idx) => ({
      type: g.type,
      label: g.label || g.type,
      offset: idx - (gateIndex - Math.max(0, gateIndex - 3)),
    }));

  const succeedingGatesOnQubit = wireGates
    .slice(gateIndex + 1, gateIndex + 4)
    .map((g, idx) => ({
      type: g.type,
      label: g.label || g.type,
      offset: idx + 1,
    }));

  // 4. Temporal Layers & Concurrent Gates at this Column
  const layers = getCircuitLayers(numQubits, circuit);
  const layerIndex = gateIndex; // In the 2D grid, columnIndex corresponds to layerIndex
  const circuitDepth = layers.length;

  const concurrentGatesInLayer = [];
  if (layers[layerIndex]) {
    layers[layerIndex].forEach((g) => {
      // Exclude the selected gate itself
      if (g.wire !== wireIndex || g.type !== gateType) {
        concurrentGatesInLayer.push({
          wire: g.wire,
          type: g.type,
          label: g.label || g.type,
          target: g.target,
        });
      }
    });
  }

  // 5. Preceding & Succeeding Gates on Target Qubit (if multi-qubit gate)
  let targetQubitPreceding = [];
  let targetQubitSucceeding = [];
  if (targetQubit !== null && circuit[targetQubit]) {
    const targetWireGates = circuit[targetQubit];
    targetQubitPreceding = targetWireGates
      .slice(Math.max(0, gateIndex - 2), gateIndex)
      .map((g) => g.type);
    targetQubitSucceeding = targetWireGates
      .slice(gateIndex + 1, gateIndex + 3)
      .map((g) => g.type);
  }

  // 6. Readable Local Snippet for Context Grounding
  const prevStr = precedingGatesOnQubit.map((g) => g.type).join(" -> ") || "none";
  const nextStr = succeedingGatesOnQubit.map((g) => g.type).join(" -> ") || "none";
  let contextSnippet = `Gate ${gateLabel} on q[${wireIndex}] at step ${gateIndex + 1}. Preceding on q[${wireIndex}]: [${prevStr}], Following on q[${wireIndex}]: [${nextStr}].`;
  if (gateType === "CX") {
    contextSnippet += ` Control: q[${controlQubit}], Target: q[${targetQubit}].`;
    if (targetQubitPreceding.length > 0) {
      contextSnippet += ` Target q[${targetQubit}] preceding gates: [${targetQubitPreceding.join(", ")}].`;
    }
  } else if (gateType === "SWAP") {
    contextSnippet += ` Swapping state of q[${controlQubit}] with q[${targetQubit}].`;
  }

  return {
    surface: "circuit-simulator",
    route: pathname,

    gateId: `gate-${wireIndex}-${gateIndex}`,
    gateType,
    gateLabel,

    qubitIndex: wireIndex,
    layerIndex,

    controlQubit,
    targetQubit,
    participatingQubits,

    precedingGatesOnQubit,
    succeedingGatesOnQubit,
    concurrentGatesInLayer,

    targetQubitPreceding,
    targetQubitSucceeding,

    totalQubits: numQubits,
    circuitDepth,

    surroundingText: contextSnippet,
    entity,
  };
}

export default {
  isCircuitSimulatorSurface,
  extractCircuitContext,
};
