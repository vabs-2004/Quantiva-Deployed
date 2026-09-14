/**
 * noiseLabEntityAdapter.js
 * 
 * Quantiva Phase 5A: Noise Lab Surface Context Adapter for Quantum Contextual Lens.
 * 
 * Responsibilities:
 * - Pure, read-only adapter converting current Noise Lab / Time Machine state into
 *   a standardized InspectionContext object for the universal Quantum Context Lens.
 * - Resolves canonical entity for:
 *   - Noise models: "depolarizing", "phase_flip", "bit_flip", "readout"
 *   - Noise parameter: "noise-strength"
 *   - Divergence metrics: "fidelity", "divergence", "purity-delta", "max-bloch-distance"
 *   - Bloch visualization: "bloch-subsystem" / "mixed-state"
 * - Extracts bounded, serializable numerical metrics (F, D, purityDelta, maxBlochDistance)
 *   and subsystem coordinates without mutating or re-running simulations.
 * - Handles race/empty states gracefully (returns null/safe fallbacks when noisy simulation
 *   has not run or is currently executing).
 * - Zero coupling to simulation engines, Python bridge, or AI Tutor.
 */

import { resolveCanonicalEntity } from "../../../data/quantumOntology.js";

/**
 * Checks if the current page or DOM context represents the Noise Lab surface.
 */
export function isNoiseLabSurface(pathname = (typeof window !== "undefined" ? window.location?.pathname : "")) {
  if (typeof document === "undefined") return false;
  return Boolean(document.querySelector('[data-lens-surface="noise-lab"]'));
}

/**
 * Maps noise model ID or metric key to canonical entity ID.
 */
const NOISE_ENTITY_MAP = {
  // Noise Models
  depolarizing: "depolarizing-noise",
  phase_flip: "dephasing-noise",
  bit_flip: "quantum-noise",
  readout: "measurement", // Readout error is classical measurement infidelity

  // Metrics & State
  fidelity: "state-fidelity",
  divergence: "state-fidelity",
  purity: "mixed-state",
  purityDelta: "mixed-state",
  bloch: "mixed-state",
  "bloch-subsystem": "mixed-state",
  strength: "quantum-noise",
  "noise-parameter": "quantum-noise",
};

/**
 * Extracts structured, bounded inspection context from the active Noise Lab state.
 * 
 * @param {Object} params
 * @param {string} params.entityKey - Target identifier (e.g. "depolarizing", "fidelity", "bloch-subsystem")
 * @param {string} [params.entityType] - "noise-model" | "noise-parameter" | "noise-metric" | "bloch-subsystem"
 * @param {Object} [params.activeNoiseConfig] - { noiseModel, noiseStrength }
 * @param {Object} [params.idealStep] - Ideal timeline step object
 * @param {Object} [params.noisyStep] - Noisy timeline step object (if simulation was run)
 * @param {number} [params.stepIndex=0] - Current temporal playback step
 * @param {number} [params.totalSteps=1] - Total steps in timeline
 * @param {number} [params.selectedQubit=0] - Active subsystem wire index
 * @param {number} [params.numQubits=1] - Total qubits in circuit
 * @param {Object} [params.divergenceSummary] - First divergence marker info
 * @param {string} [params.pathname] - Current route
 * @returns {Object} Standardized InspectionContext object
 */
export function extractNoiseLabContext({
  entityKey,
  entityType = "noise-model",
  activeNoiseConfig = null,
  idealStep = null,
  noisyStep = null,
  stepIndex = 0,
  totalSteps = 1,
  selectedQubit = 0,
  numQubits = 1,
  divergenceSummary = null,
  pathname = (typeof window !== "undefined" ? window.location?.pathname : "/circuit-simulator"),
}) {
  const noiseModel = entityType === "noise-model" ? entityKey : (activeNoiseConfig?.noiseModel || null);
  const noiseStrength = typeof activeNoiseConfig?.noiseStrength === "number" ? activeNoiseConfig.noiseStrength : 0.15;
  const strengthPct = Math.round(noiseStrength * 100);

  // 1. Resolve Canonical Entity
  const canonicalId = NOISE_ENTITY_MAP[entityKey] || NOISE_ENTITY_MAP[entityType] || entityKey;
  let entity = resolveCanonicalEntity(canonicalId) || resolveCanonicalEntity(entityKey);

  // Metric-specific customizations
  if (entityKey === "divergence") {
    entity = {
      ...(entity || {}),
      id: "state-divergence",
      displayName: "State Divergence D",
      category: "mathematics",
      symbol: "D = 1 - F",
      rawSelection: "State Divergence",
      quickMeaning: "The cumulative departure or infidelity of the noisy physical state from the intended ideal statevector, defined as D = 1 - F.",
      intuition: "While fidelity F measures accuracy (1.0 = identical), divergence D measures infidelity or how much the noisy state has strayed from the ideal trajectory (0.0 = zero departure).",
      mathematics: "$$D = 1 - F(|\\psi\\rangle, \\rho) = 1 - \\langle\\psi|\\rho|\\psi\\rangle$$",
      whyItMatters: "Divergence provides an immediate quantitative measure of cumulative error accumulation throughout circuit operations.",
      learnUrl: "/micro-modules/qubits-quantum-states",
      visualizeUrl: null,
      experimentUrl: "/circuit-simulator",
    };
  } else if (entityKey === "purityDelta") {
    entity = {
      ...(entity || {}),
      id: "purity-delta",
      displayName: "Purity Delta (\\Delta\\gamma)",
      category: "mathematics",
      symbol: "\\Delta\\gamma = \\text{Tr}(\\rho^2) - 1.0",
      rawSelection: "Purity Delta",
      quickMeaning: "The change in quantum state purity relative to a pure state (γ = 1.0), measuring how mixed the quantum state has become.",
      intuition: "An ideal pure state has purity Tr(ρ²) = 1.0 (Δγ = 0.0). When environmental noise causes decoherence or when qubits become entangled, purity decreases (Δγ < 0), reaching a minimum of 1/2^n - 1 for maximally mixed states.",
      mathematics: "$$\\Delta\\gamma = \\text{Tr}(\\rho^2) - 1.0, \\quad \\Delta\\gamma \\le 0$$",
      whyItMatters: "Negative purity delta indicates irreversible loss of quantum coherence to the environment in open quantum systems.",
      learnUrl: "/micro-modules/qubits-quantum-states",
      visualizeUrl: "/blochsphere",
      experimentUrl: "/circuit-simulator",
    };
  } else if (entityKey === "bloch" || entityKey === "max-bloch-distance") {
    entity = {
      ...(entity || {}),
      id: "max-bloch-distance",
      displayName: "Max Bloch Distance",
      category: "mathematics",
      symbol: "\\max_q \\|\\vec{r}_i - \\vec{r}_n\\|",
      rawSelection: "Max Bloch Distance",
      quickMeaning: "The maximum Euclidean distance between ideal and noisy reduced Bloch vectors across all qubit wires in the circuit.",
      intuition: "Identifies the individual qubit whose single-qubit subsystem state has suffered the largest geometric displacement inside or on the Bloch sphere due to noise.",
      mathematics: "$$d_{\\max} = \\max_{q \\in [0, n-1]} \\|\\vec{r}_{\\text{ideal}}^{(q)} - \\vec{r}_{\\text{noisy}}^{(q)}\\|$$",
      whyItMatters: "Pinpoints localized error hot spots across multi-qubit registers, identifying which physical wire deteriorates fastest.",
      learnUrl: "/micro-modules/qubits-quantum-states",
      visualizeUrl: "/blochsphere",
      experimentUrl: "/circuit-simulator",
    };
  } else if (!entity) {
    // Fallback entity if not strictly in ontology
    if (entityKey === "bit_flip") {
      entity = {
        id: "bit-flip-noise",
        displayName: "Bit Flip Noise (X-Noise)",
        category: "concept",
        symbol: "\\mathcal{E}_{\\text{bit}}",
        rawSelection: "Bit Flip Noise",
        quickMeaning: "A quantum error channel that applies a Pauli-X gate with probability p, inverting computational basis populations (|0⟩ <-> |1⟩).",
        intuition: "Unlike dephasing which preserves populations and only harms phase, bit flip directly perturbs computational-basis populations, shifting the longitudinal coordinate z.",
        mathematics: "$$\\mathcal{E}_{\\text{bit}}(\\rho) = (1 - p)\\rho + p X \\rho X, \\quad z \\mapsto (1 - 2p)z$$",
        whyItMatters: "Bit flips are correctable via classical repetition or 3-qubit bit-flip error correction codes.",
        learnUrl: "/micro-modules/quantum-gates",
        visualizeUrl: "/blochsphere",
        experimentUrl: "/circuit-simulator",
      };
    } else if (entityKey === "readout") {
      entity = {
        id: "readout-error",
        displayName: "Readout / Measurement Error",
        category: "concept",
        symbol: "P_{\\text{obs}}",
        rawSelection: "Readout Error",
        quickMeaning: "Classical detector infidelity during measurement that perturbs observed bitstring statistics without making the physical quantum state mixed.",
        intuition: "Readout error is not environmental decoherence; the qubit on the chip can remain in a 100% pure state (F = 1.0), but the classical amplification apparatus occasionally misidentifies a |0⟩ as |1⟩.",
        mathematics: "$$P_{\\text{obs}} = (1 - p)P_{\\text{true}} + p P_{\\text{flip}}$$ $$\\text{Physical state remains: } \\rho_{\\text{physical}} = |\\psi\\rangle\\langle\\psi|$$",
        whyItMatters: "Readout mitigation techniques (such as detector response matrix inversion) can largely remove readout errors in post-processing without requiring active quantum error correction.",
        learnUrl: "/micro-modules/measurement-collapse",
        visualizeUrl: null,
        experimentUrl: "/circuit-simulator",
      };
    }
  }

  // 2. Validate simulation freshness (do not present stale metrics from a different model)
  const hasValidNoisyData = Boolean(
    noisyStep &&
    (!noiseModel || !activeNoiseConfig || activeNoiseConfig.noiseModel === noiseModel)
  );

  // 3. Extract Subsystem Bloch Coordinates
  const safeQubit = Math.max(0, Math.min(selectedQubit, numQubits - 1));
  const idealBlochVectors = idealStep?.blochVectors || [];
  const noisyBlochVectors = hasValidNoisyData ? (noisyStep?.blochVectors || []) : [];

  const idealBv = idealBlochVectors[safeQubit] || null;
  const noisyBv = noisyBlochVectors[safeQubit] || null;

  const idealBloch = idealBv
    ? {
        x: Number((idealBv.x || 0).toFixed(3)),
        y: Number((idealBv.y || 0).toFixed(3)),
        z: Number((idealBv.z || 0).toFixed(3)),
        r: Number((idealBv.r !== undefined ? idealBv.r : 1.0).toFixed(3)),
      }
    : null;

  const noisyBloch = noisyBv
    ? {
        x: Number((noisyBv.x || 0).toFixed(3)),
        y: Number((noisyBv.y || 0).toFixed(3)),
        z: Number((noisyBv.z || 0).toFixed(3)),
        r: Number((noisyBv.r !== undefined ? noisyBv.r : 1.0).toFixed(3)),
      }
    : null;

  // 4. Extract Divergence Metrics (safe from stale configurations)
  const fidelity = hasValidNoisyData && typeof noisyStep?.fidelity === "number" ? Number(noisyStep.fidelity.toFixed(3)) : null;
  const divergence = hasValidNoisyData && typeof noisyStep?.divergence === "number" ? Number(noisyStep.divergence.toFixed(3)) : null;
  const purityDelta = hasValidNoisyData && typeof noisyStep?.purityDelta === "number" ? Number(noisyStep.purityDelta.toFixed(3)) : null;
  const maxBlochDistance = hasValidNoisyData && typeof noisyStep?.maxBlochDistance === "number" ? Number(noisyStep.maxBlochDistance.toFixed(3)) : null;

  const appliedGate = idealStep?.appliedGate
    ? {
        type: idealStep.appliedGate.type,
        wire: idealStep.appliedGate.wire,
        target: idealStep.appliedGate.target,
      }
    : null;

  const firstDivergenceStep = hasValidNoisyData && divergenceSummary?.firstMeaningfulDivergenceStep !== undefined
    ? divergenceSummary.firstMeaningfulDivergenceStep
    : null;

  // 5. Bounded Contextual Summary
  const userFacingStep = stepIndex;
  let summary = `Noise Lab at step ${userFacingStep} (of ${totalSteps > 1 ? totalSteps - 1 : 1}).`;
  if (noiseModel) {
    summary += ` Model: ${noiseModel} (strength p=${strengthPct}%).`;
  }
  if (appliedGate) {
    summary += ` Applied gate: ${appliedGate.type} on q[${appliedGate.wire}]${appliedGate.target !== undefined ? ` -> q[${appliedGate.target}]` : ""}.`;
  }
  if (fidelity !== null) {
    summary += ` State Fidelity: ${(fidelity * 100).toFixed(1)}%, Divergence: ${(divergence * 100).toFixed(1)}%.`;
  } else if (!hasValidNoisyData && activeNoiseConfig?.noiseModel && activeNoiseConfig.noiseModel !== noiseModel) {
    summary += ` (Currently configured; active timeline was run for ${activeNoiseConfig.noiseModel}).`;
  } else if (!noisyStep) {
    summary += ` (Simulation not yet executed for this configuration).`;
  }
  if (noisyBloch && idealBloch) {
    summary += ` Qubit q[${safeQubit}] Bloch radius: noisy r=${noisyBloch.r} vs ideal r=${idealBloch.r}.`;
  }
  if (noiseModel === "readout") {
    summary += ` Notice: Readout error affects measurement detector statistics, leaving physical state fidelity ideal.`;
  }

  return {
    surface: "noise-lab",
    route: pathname,

    entityType,
    entityKey,
    targetMetric: entityType === "noise-metric" ? entityKey : null,

    noiseModel,
    noiseStrength,
    strengthPct,

    stepIndex,
    totalSteps,

    appliedGate,
    selectedQubit: safeQubit,
    totalQubits: numQubits,

    fidelity,
    divergence,
    purityDelta,
    maxBlochDistance,

    idealBloch,
    noisyBloch,

    firstMeaningfulDivergenceStep: firstDivergenceStep,

    surroundingText: summary,
    entity,
  };
}

export default {
  isNoiseLabSurface,
  extractNoiseLabContext,
};
