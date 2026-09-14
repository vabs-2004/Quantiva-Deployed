/**
 * contextLensPromptBuilder.js
 * 
 * Quantiva Phase 1: Context Lens Meta-XML Prompt Assembler
 * 
 * Dedicated prompt generator for the Quantum Contextual Lens.
 * Strictly isolated from promptBuilder.js and existing AI Tutor prompts.
 */

function escapeXml(unsafe) {
  if (typeof unsafe !== "string") return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Builds a structured Meta-XML prompt for the Groq fast model.
 */
function buildContextLensPrompt({
  entityId,
  rawSelection,
  category,
  source = {},
  surroundingText = "",
}) {
  const role =
    "You are the Quantiva Quantum Contextual Lens, a concise, scientifically rigorous quantum knowledge inspector. Your task is to provide an immediate 360-degree breakdown of a single target quantum entity in its current learning context.";

  const rules = [
    "Explain the specified quantum entity with scientific precision and pedagogy.",
    "Do NOT initiate conversational dialogue, greetings, or sign-offs (no 'Hello!', 'Hope this helps!').",
    "Focus primarily on answering: 1. What is this entity? 2. Why is it relevant in this specific location/lesson/algorithm?",
    "When surface is 'algorithm': the 'contextualRole' MUST explain this entity's exact operational role in that algorithm (e.g. in state preparation, oracle marking, phase kickback, diffusion, or measurement). Do NOT give a generic definition; ground it in the algorithm's mechanics.",
    "When surface is 'circuit-simulator': the 'contextualRole' MUST explain what this specific gate is doing in this specific circuit (e.g. placing qubit into superposition before an entangling gate, acting as control or target in a CNOT, exchanging states in a SWAP, or terminating a register with measurement). Use qubit/layer/control/target and neighboring gates to infer its causal purpose. Distinguish between what the gate always does in theory versus what it is achieving at this exact circuit position. Do not invent gates not present.",
    "When surface is 'noise-lab': ground the explanation against the provided Noise Lab context (noise model, strength p, step index, applied gate, fidelity F, divergence D, purity delta, and Bloch coordinates). STRICT PEDAGOGICAL & PHYSICAL RULES: 1. MODEL-SPECIFIC ACCURACY: Depolarizing noise symmetrically contracts the state toward I/2 (isotropic shrinkage). Phase flip noise destroys transverse phase coherence (damping x and y coordinates toward z-axis) while conserving computational-basis populations (z invariant). Bit flip noise inverts computational-basis populations (|0⟩ <-> |1⟩), altering z. Readout error is a classical measurement detector infidelity that perturbs observed bitstrings while leaving the physical density matrix and state fidelity ideal (F = 1.0); NEVER describe readout error as physical decoherence, state-mixing, or Bloch contraction. 2. MIXED STATES & PURITY: Do NOT claim that every mixed state (r < 1, Tr(ρ²) < 1) is caused by environmental noise. A subsystem of an entangled pure state is fundamentally mixed even in an ideal circuit without noise. If r_ideal < 1, the subsystem was already entangled; only the contraction Δr = r_noisy - r_ideal is caused by noise. 3. TARGET METRICS: When inspecting a specific metric (State Fidelity F, State Divergence D = 1 - F, Purity Delta Δγ = Tr(ρ²) - 1, or Max Bloch Distance), focus primarily on that metric and cite its actual value from context. If a metric is null/unsimulated, explain its theoretical significance and do NOT fabricate numbers. 4. FIRST DIVERGENCE: Only cite the first divergence step if <FIRST_DIVERGENCE_STEP> is explicitly provided. Do not claim divergence has occurred if divergence is 0 or unsimulated. 5. CIRCUIT CONTEXT: Explain the operational impact of noise at THIS circuit step (given <GATE_TYPE> and qubit) rather than just repeating generic textbook definitions. Prioritize 'what is happening at this step' over abstract definitions.",
    "Format all mathematical equations, statevectors, kets, bras, and matrices using ONLY KaTeX-compatible delimiters: $...$ for inline and $$...$$ for display blocks.",
    "Always wrap kets and bras in $...$ (e.g. $|0\\rangle$, $|\\psi\\rangle$). Never write bare unformatted LaTeX.",
    "CRITICAL JSON RULE: When outputting LaTeX backslashes inside JSON strings, always double-escape every backslash (e.g. write \\\\alpha, \\\\beta, \\\\ket{0}, \\\\frac{1}{2}, \\\\begin{pmatrix}). Never output unescaped single backslashes in JSON strings.",
    "Respond with strictly valid JSON only. Do not wrap with markdown code fences.",
  ];

  const constraints = [
    "Output MUST be valid JSON conforming exactly to the requested output keys.",
    "Do not invent Quantiva platform features or URLs.",
    "Never return text outside the JSON object.",
    "Keep responses concise and scannable.",
  ];

  const rulesXml = rules.map((r) => `    <RULE>${escapeXml(r)}</RULE>`).join("\n");
  const constraintsXml = constraints
    .map((c) => `    <CONSTRAINT>${escapeXml(c)}</CONSTRAINT>`)
    .join("\n");

  const systemPolicy = [
    "<QUANTIVA_SYSTEM_POLICY>",
    `  <ROLE>${role}</ROLE>`,
    "  <RULES>",
    rulesXml,
    "  </RULES>",
    "  <CONSTRAINTS>",
    constraintsXml,
    "  </CONSTRAINTS>",
    "</QUANTIVA_SYSTEM_POLICY>",
  ].join("\n");

  const precedingStr = Array.isArray(source.precedingGatesOnQubit)
    ? source.precedingGatesOnQubit.join(", ")
    : "";
  const succeedingStr = Array.isArray(source.succeedingGatesOnQubit)
    ? source.succeedingGatesOnQubit.join(", ")
    : "";
  const concurrentStr = Array.isArray(source.concurrentGatesInLayer)
    ? source.concurrentGatesInLayer.join(", ")
    : "";

  const idealBlochStr = source.idealBloch
    ? `x=${source.idealBloch.x}, y=${source.idealBloch.y}, z=${source.idealBloch.z}, r=${source.idealBloch.r}`
    : "";
  const noisyBlochStr = source.noisyBloch
    ? `x=${source.noisyBloch.x}, y=${source.noisyBloch.y}, z=${source.noisyBloch.z}, r=${source.noisyBloch.r}`
    : "";

  const appliedGateType = source.appliedGate?.type || source.gateType || null;
  const appliedWire = source.appliedGate?.wire !== undefined && source.appliedGate.wire !== null
    ? source.appliedGate.wire
    : (source.selectedQubit !== undefined && source.selectedQubit !== null
      ? source.selectedQubit
      : (source.qubitIndex !== undefined && source.qubitIndex !== null ? source.qubitIndex : null));
  const appliedTarget = source.appliedGate?.target !== undefined && source.appliedGate.target !== null
    ? source.appliedGate.target
    : (source.targetQubit !== undefined && source.targetQubit !== null ? source.targetQubit : null);

  const userRequest = [
    "<QUANTIVA_REQUEST>",
    "  <TASK>Contextually inspect target quantum entity</TASK>",
    "  <TARGET_ENTITY>",
    `    <ID>${escapeXml(entityId || rawSelection)}</ID>`,
    `    <RAW_SELECTION>${escapeXml(rawSelection || entityId)}</RAW_SELECTION>`,
    `    <CATEGORY>${escapeXml(category || "concept")}</CATEGORY>`,
    "  </TARGET_ENTITY>",
    "  <SURROUNDING_CONTEXT>",
    `    <SURFACE>${escapeXml(source.surface || "micro-module")}</SURFACE>`,
    `    <ROUTE>${escapeXml(source.route || "")}</ROUTE>`,
    `    <MODULE_ID>${escapeXml(source.moduleId || "")}</MODULE_ID>`,
    `    <LESSON_TITLE>${escapeXml(source.lessonTitle || "")}</LESSON_TITLE>`,
    `    <ALGORITHM_ID>${escapeXml(source.algorithmId || "")}</ALGORITHM_ID>`,
    `    <ALGORITHM_NAME>${escapeXml(source.algorithmName || "")}</ALGORITHM_NAME>`,
    `    <ACTIVE_TAB>${escapeXml(source.activeTab || "")}</ACTIVE_TAB>`,
    `    <STEP_NAME>${escapeXml(source.stepName || "")}</STEP_NAME>`,
    appliedGateType ? `    <GATE_TYPE>${escapeXml(appliedGateType)}</GATE_TYPE>` : "",
    appliedWire !== null ? `    <QUBIT_INDEX>${escapeXml(String(appliedWire))}</QUBIT_INDEX>` : "",
    source.layerIndex !== undefined && source.layerIndex !== null ? `    <LAYER_INDEX>${escapeXml(String(source.layerIndex))}</LAYER_INDEX>` : "",
    source.controlQubit !== undefined && source.controlQubit !== null ? `    <CONTROL_QUBIT>${escapeXml(String(source.controlQubit))}</CONTROL_QUBIT>` : "",
    appliedTarget !== null ? `    <TARGET_QUBIT>${escapeXml(String(appliedTarget))}</TARGET_QUBIT>` : "",
    precedingStr ? `    <PRECEDING_GATES>${escapeXml(precedingStr)}</PRECEDING_GATES>` : "",
    succeedingStr ? `    <SUCCEEDING_GATES>${escapeXml(succeedingStr)}</SUCCEEDING_GATES>` : "",
    concurrentStr ? `    <CONCURRENT_GATES>${escapeXml(concurrentStr)}</CONCURRENT_GATES>` : "",
    source.circuitDepth ? `    <CIRCUIT_DEPTH>${escapeXml(String(source.circuitDepth))}</CIRCUIT_DEPTH>` : "",
    source.totalQubits ? `    <TOTAL_QUBITS>${escapeXml(String(source.totalQubits))}</TOTAL_QUBITS>` : "",
    // Noise Lab Context Fields
    source.targetMetric ? `    <TARGET_METRIC>${escapeXml(source.targetMetric)}</TARGET_METRIC>` : "",
    source.noiseModel ? `    <NOISE_MODEL>${escapeXml(source.noiseModel)}</NOISE_MODEL>` : "",
    source.noiseStrength !== undefined && source.noiseStrength !== null ? `    <NOISE_STRENGTH>${escapeXml(String(source.noiseStrength))} (${escapeXml(String(source.strengthPct || Math.round(source.noiseStrength * 100)))}%)</NOISE_STRENGTH>` : "",
    source.stepIndex !== undefined && source.stepIndex !== null ? `    <STEP_INDEX>Step ${escapeXml(String(source.stepIndex))} (of ${escapeXml(String(source.totalSteps > 1 ? source.totalSteps - 1 : 1))})</STEP_INDEX>` : "",
    source.fidelity !== undefined && source.fidelity !== null ? `    <STATE_FIDELITY>${escapeXml(String((source.fidelity * 100).toFixed(1)))}%</STATE_FIDELITY>` : "",
    source.divergence !== undefined && source.divergence !== null ? `    <DIVERGENCE>${escapeXml(String((source.divergence * 100).toFixed(1)))}%</DIVERGENCE>` : "",
    source.purityDelta !== undefined && source.purityDelta !== null ? `    <PURITY_DELTA>${escapeXml(String(source.purityDelta))}</PURITY_DELTA>` : "",
    source.maxBlochDistance !== undefined && source.maxBlochDistance !== null ? `    <MAX_BLOCH_DISTANCE>${escapeXml(String(source.maxBlochDistance))}</MAX_BLOCH_DISTANCE>` : "",
    idealBlochStr ? `    <IDEAL_BLOCH>${escapeXml(idealBlochStr)}</IDEAL_BLOCH>` : "",
    noisyBlochStr ? `    <NOISY_BLOCH>${escapeXml(noisyBlochStr)}</NOISY_BLOCH>` : "",
    source.firstMeaningfulDivergenceStep !== undefined && source.firstMeaningfulDivergenceStep !== null ? `    <FIRST_DIVERGENCE_STEP>${escapeXml(String(source.firstMeaningfulDivergenceStep))}</FIRST_DIVERGENCE_STEP>` : "",
    `    <SNIPPET>${escapeXml(surroundingText.slice(0, 300))}</SNIPPET>`,
    "  </SURROUNDING_CONTEXT>",
    "  <OUTPUT_FORMAT_JSON>",
    "    {",
    '      "quickMeaning": "1-2 sentence core definition",',
    '      "intuition": "Simple physical analogy or mental model",',
    '      "mathematics": "Formal LaTeX equation ($...$ or $$...$$)",',
    '      "contextualRole": "Why this entity matters specifically in the current lesson, algorithm, circuit, or noise lab experiment",',
    '      "suggestedTutorQuestion": "Deep-dive question for conversational follow-up in this specific context"',
    "    }",
    "  </OUTPUT_FORMAT_JSON>",
    "</QUANTIVA_REQUEST>",
  ].filter(Boolean).join("\n");

  return {
    systemPolicy,
    userRequest,
  };
}

module.exports = {
  buildContextLensPrompt,
};
