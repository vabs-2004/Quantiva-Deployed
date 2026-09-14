/**
 * quantumOntology.js
 * 
 * Quantiva Phase 1: Canonical Quantum Entity Ontology (V1)
 * 
 * Provides:
 * - Structured definitions, intuition, KaTeX mathematics, and real platform routes
 *   for the 9 canonical V1 quantum entities.
 * - Deterministic, fast client-side normalization resolver (resolveCanonicalEntity)
 * - Zero network overhead, zero token consumption (Tier 1 instant lookup).
 */

export const CANONICAL_ENTITIES = {
  qubit: {
    id: "qubit",
    displayName: "Qubit",
    category: "concept",
    symbol: "\\ket{\\psi}",
    aliases: ["qubit", "qubits", "quantum bit", "quantum bits", "two-level system"],
    quickMeaning: "The fundamental unit of quantum information, capable of existing in a coherent superposition of basis states $|0\\rangle$ and $|1\\rangle$.",
    intuition: "Unlike a classical bit which is strictly a light switch turned ON (1) or OFF (0), a qubit can point anywhere on the surface of a three-dimensional sphere (the Bloch Sphere), encoding continuous phase and amplitude.",
    mathematics: "$$|\\psi\\rangle = \\alpha|0\\rangle + \\beta|1\\rangle, \\quad \\text{where } \\alpha, \\beta \\in \\mathbb{C} \\text{ and } |\\alpha|^2 + |\\beta|^2 = 1$$",
    whyItMatters: "Quantum speedup originates from manipulating superpositions of multiple qubits, where $n$ qubits jointly span an exponential $2^n$-dimensional Hilbert space.",
    learnUrl: "/micro-modules/qubits-quantum-states",
    visualizeUrl: "/blochsphere",
    experimentUrl: "/circuit-simulator",
  },

  superposition: {
    id: "superposition",
    displayName: "Superposition",
    category: "concept",
    symbol: "\\alpha|0\\rangle + \\beta|1\\rangle",
    aliases: [
      "superposition",
      "quantum superposition",
      "superpositions",
      "coherent superposition",
      "linear combination",
    ],
    quickMeaning: "A principle of quantum mechanics where a system simultaneously occupies a linear combination of all its possible computational basis states.",
    intuition: "Superposition is not classical ignorance or a coin tumbling in the air; the quantum state is genuinely in both states at once, with relative phases capable of constructive or destructive wave interference.",
    mathematics: "$$|\\psi\\rangle = \\frac{1}{\\sqrt{2}}|0\\rangle + \\frac{1}{\\sqrt{2}}|1\\rangle = |+\\rangle$$",
    whyItMatters: "Without superposition, quantum parallelism and computational interference would be impossible. Algorithms like Deutsch-Jozsa and Grover rely on creating an equal superposition over all input possibilities.",
    learnUrl: "/micro-modules/superposition",
    visualizeUrl: "/blochsphere",
    experimentUrl: "/circuit-simulator",
  },

  measurement: {
    id: "measurement",
    displayName: "Measurement & State Collapse",
    category: "concept",
    symbol: "M",
    aliases: [
      "measurement",
      "measure",
      "measuring",
      "collapse",
      "state collapse",
      "wavefunction collapse",
      "born rule",
      "born's rule",
    ],
    quickMeaning: "A non-unitary, irreversible operation that projects a quantum superposition into a single definite computational basis state according to Born's rule.",
    intuition: "You cannot peek at a quantum state without disturbing it. Measurement forces the delicate quantum cloud of possibilities to choose a single classical reality with a specific probability.",
    mathematics: "$$P(m = 0) = |\\langle 0|\\psi\\rangle|^2 = |\\alpha|^2, \\quad P(m = 1) = |\\langle 1|\\psi\\rangle|^2 = |\\beta|^2$$",
    whyItMatters: "Quantum computers compute coherently without measurement during execution; measurement is performed at the final stage to extract classical bitstrings from amplified amplitudes.",
    learnUrl: "/micro-modules/measurement-collapse",
    visualizeUrl: null,
    experimentUrl: "/circuit-simulator",
  },

  phase: {
    id: "phase",
    displayName: "Quantum Phase",
    category: "mathematics",
    symbol: "e^{i\\theta}",
    aliases: [
      "phase",
      "quantum phase",
      "relative phase",
      "global phase",
      "phase angle",
      "phases",
    ],
    quickMeaning: "A complex rotational angle in a quantum state vector. Relative phase between states drives quantum interference, while global phase is physically unobservable.",
    intuition: "Imagine two ocean waves colliding. If their peaks align (in phase), they reinforce into a giant wave (constructive). If peak meets trough (out of phase by $\\pi$), they cancel out completely (destructive).",
    mathematics: "$$|\\psi\\rangle = \\frac{|0\\rangle + e^{i\\phi}|1\\rangle}{\\sqrt{2}}, \\quad |+\\rangle = \\frac{|0\\rangle + |1\\rangle}{\\sqrt{2}}, \\quad |-\\rangle = \\frac{|0\\rangle - |1\\rangle}{\\sqrt{2}}$$ (here $\\phi = \\pi$ produces $|-\\rangle$)",
    whyItMatters: "Algorithms like Quantum Phase Estimation (QPE) and Shor's algorithm extract hidden algebraic periods by converting physical unitary phases into readable qubit amplitudes.",
    learnUrl: "/micro-modules/amplitudes-phase",
    visualizeUrl: "/blochsphere",
    experimentUrl: "/circuit-simulator",
  },

  amplitude: {
    id: "amplitude",
    displayName: "Probability Amplitude",
    category: "mathematics",
    symbol: "\\alpha, \\beta \\in \\mathbb{C}",
    aliases: [
      "amplitude",
      "amplitudes",
      "probability amplitude",
      "probability amplitudes",
      "complex amplitude",
    ],
    quickMeaning: "A complex number associated with a quantum basis state whose squared magnitude represents the probability of observing that state upon measurement.",
    intuition: "Classical probabilities are positive real numbers summing to 1. Quantum amplitudes are 2D complex vectors that can have positive, negative, or imaginary components, allowing cancellation during computation.",
    mathematics: "$$\\alpha = r e^{i\\theta} = a + bi, \\quad \\text{Probability } P = |\\alpha|^2 = a^2 + b^2$$",
    whyItMatters: "Quantum algorithms work by orchestrating amplitude amplification: cancelling the amplitudes of incorrect answers while constructively amplifying the amplitude of the correct answer.",
    learnUrl: "/micro-modules/amplitudes-phase",
    visualizeUrl: null,
    experimentUrl: "/sandbox",
  },

  entanglement: {
    id: "entanglement",
    displayName: "Quantum Entanglement",
    category: "concept",
    symbol: "|\\Phi^+\\rangle",
    aliases: [
      "entanglement",
      "entangled",
      "quantum entanglement",
      "bell state",
      "bell pair",
      "epr pair",
      "non-separable",
    ],
    quickMeaning: "A non-local quantum correlation where the state of two or more particles cannot be described independently of each other, regardless of distance.",
    intuition: "If you have a pair of magical shoes in two separate boxes sent to opposite sides of the universe, opening one box and finding a left shoe instantly guarantees the other is a right shoe—with correlations stronger than any classical physics allows.",
    mathematics: "$$|\\Phi^+\\rangle = \\frac{|00\\rangle + |11\\rangle}{\\sqrt{2}} \\neq |\\psi_A\\rangle \\otimes |\\psi_B\\rangle$$",
    whyItMatters: "Entanglement is the foundational resource for quantum teleportation, Superdense Coding, Quantum Key Distribution (BB84/E91), and quantum error correction.",
    learnUrl: "/micro-modules/entanglement",
    visualizeUrl: null,
    experimentUrl: "/entanglement-lab",
  },

  hadamard: {
    id: "hadamard",
    displayName: "Hadamard Gate",
    category: "gate",
    symbol: "H",
    aliases: [
      "hadamard",
      "hadamard gate",
      "h gate",
      "h",
      "h-gate",
      "hadamards",
    ],
    quickMeaning: "A single-qubit unitary gate that transforms computational basis states into equal superpositions, acting as a $180^\\circ$ rotation around the $X+Z$ diagonal axis.",
    intuition: "The Hadamard gate is the platform's primary bridge between certainty and superposition. Applied to $|0\\rangle$, it creates an equal superposition $|+\\rangle$; applied again, interference returns it to $|0\\rangle$.",
    mathematics: "$$H = \\frac{1}{\\sqrt{2}}\\begin{pmatrix} 1 & 1 \\\\ 1 & -1 \\end{pmatrix}, \\quad H|0\\rangle = |+\\rangle, \\quad H|1\\rangle = |-\\rangle$$",
    whyItMatters: "Nearly all quantum algorithms start with a layer of Hadamard gates across all qubits to initialize a uniform superposition over all possible classical inputs in parallel.",
    learnUrl: "/micro-modules/quantum-gates",
    visualizeUrl: "/blochsphere",
    experimentUrl: "/circuit-simulator",
  },

  "quantum-gate": {
    id: "quantum-gate",
    displayName: "Quantum Gate",
    category: "gate",
    symbol: "U",
    aliases: [
      "quantum gate",
      "quantum gates",
      "gate",
      "gates",
      "unitary gate",
      "unitary transformation",
      "unitary operator",
    ],
    quickMeaning: "A reversible, unitary operator that acts on a register of qubits, transforming their statevector while strictly preserving the total probability of 1.",
    intuition: "Unlike classical logic gates (like AND or OR) which destroy information, quantum gates are rotations in Hilbert space: every operation is reversible and preserves state length.",
    mathematics: "$$U^\\dagger U = I, \\quad \\|U|\\psi\\rangle\\| = \\||\\psi\\rangle\\| = 1$$",
    whyItMatters: "Any quantum computation is a sequence of discrete quantum gates assembled into a quantum circuit, operating on single qubits and entangling pairs via gates like CNOT.",
    learnUrl: "/micro-modules/quantum-gates",
    visualizeUrl: "/blochsphere",
    experimentUrl: "/circuit-simulator",
  },

  "dirac-notation": {
    id: "dirac-notation",
    displayName: "Dirac Notation (Bra-Ket)",
    category: "mathematics",
    symbol: "\\langle\\phi|\\psi\\rangle",
    aliases: [
      "dirac notation",
      "bra ket",
      "bra-ket",
      "braket",
      "bra ket notation",
      "ket",
      "bra",
      "state vector",
      "statevector",
    ],
    quickMeaning: "The standard mathematical language of quantum mechanics, representing column statevectors as kets $|\\psi\\rangle$ and row conjugate transpose vectors as bras $\\langle\\psi|$.",
    intuition: "Think of a ket $|\\psi\\rangle$ as an address pointing to a specific quantum state. Combining a bra and ket as $\\langle\\phi|\\psi\\rangle$ (a 'bracket') yields an inner product measuring their overlap.",
    mathematics: "$$\\text{Ket: } |\\psi\\rangle = \\begin{pmatrix} \\alpha \\\\ \\beta \\end{pmatrix}, \\quad \\text{Bra: } \\langle\\psi| = |\\psi\\rangle^\\dagger = \\begin{pmatrix} \\alpha^* & \\beta^* \\end{pmatrix}$$ $$\\text{Inner product: } \\langle 0|0\\rangle = 1, \\quad \\langle 0|1\\rangle = 0$$",
    whyItMatters: "Dirac notation simplifies expressing linear algebra in quantum computing without writing large, cumbersome explicit matrices and vectors for multi-qubit systems.",
    learnUrl: "/micro-modules/dirac-notation",
    visualizeUrl: null,
    experimentUrl: "/sandbox",
  },

  cnot: {
    id: "cnot",
    displayName: "Controlled-NOT (CNOT / CX)",
    category: "gate",
    symbol: "\\text{CX}",
    aliases: [
      "cnot",
      "cx",
      "controlled-not",
      "controlled not",
      "cnot gate",
      "cx gate",
      "controlled x",
      "c-not",
    ],
    quickMeaning: "A fundamental two-qubit entangling gate that applies a Pauli-X (NOT) flip to the target qubit if and only if the control qubit is in the state $|1\\rangle$.",
    intuition: "Think of CNOT as a quantum conditional switch. If the control qubit is $|0\\rangle$, the target is untouched. If the control is $|1\\rangle$, the target flips. When applied to a control in superposition (such as $|+\\rangle$), it generates maximal entanglement (a Bell state), correlating the qubits non-locally.",
    mathematics: "$$\\text{CNOT} = \\begin{pmatrix} 1 & 0 & 0 & 0 \\\\ 0 & 1 & 0 & 0 \\\\ 0 & 0 & 0 & 1 \\\\ 0 & 0 & 1 & 0 \\end{pmatrix}, \\quad |c, t\\rangle \\mapsto |c, c \\oplus t\\rangle$$ $$\\text{Basis mappings: } |00\\rangle \\mapsto |00\\rangle, \\; |01\\rangle \\mapsto |01\\rangle, \\; |10\\rangle \\mapsto |11\\rangle, \\; |11\\rangle \\mapsto |10\\rangle$$",
    whyItMatters: "CNOT combined with arbitrary single-qubit rotations forms a universal set of quantum gates, capable of expressing any possible quantum circuit. It is the primary engine for generating multi-qubit entanglement.",
    learnUrl: "/micro-modules/quantum-gates",
    visualizeUrl: null,
    experimentUrl: "/circuit-simulator",
  },

  swap: {
    id: "swap",
    displayName: "SWAP Gate",
    category: "gate",
    symbol: "\\text{SWAP}",
    aliases: [
      "swap",
      "swap gate",
      "swap-gate",
      "qubit swap",
      "exchange gate",
    ],
    quickMeaning: "A reversible two-qubit gate that exchanges the quantum states of two qubits, mapping $|a\\rangle \\otimes |b\\rangle \\mapsto |b\\rangle \\otimes |a\\rangle$.",
    intuition: "Imagine two conveyor belts carrying different quantum packages. The SWAP gate reroutes them so each belt receives the other's state without measuring or disturbing the fragile quantum information. On physical quantum hardware with limited qubit connectivity, SWAP gates are used to move qubit states adjacent to one another.",
    mathematics: "$$\\text{SWAP} = \\begin{pmatrix} 1 & 0 & 0 & 0 \\\\ 0 & 0 & 1 & 0 \\\\ 0 & 1 & 0 & 0 \\\\ 0 & 0 & 0 & 1 \\end{pmatrix}$$ $$\\text{Basis mappings: } |00\\rangle \\mapsto |00\\rangle, \\; |01\\rangle \\mapsto |10\\rangle, \\; |10\\rangle \\mapsto |01\\rangle, \\; |11\\rangle \\mapsto |11\\rangle$$ $$\\text{Decomposition: } \\text{SWAP}_{1,2} = \\text{CNOT}_{1,2} \\cdot \\text{CNOT}_{2,1} \\cdot \\text{CNOT}_{1,2}$$",
    whyItMatters: "Physical quantum processors have restricted topological connectivity (e.g. heavy-hex or grid graphs). Compilers insert SWAP networks to route interacting qubits into physical coupling range while preserving the logical algorithm.",
    learnUrl: "/micro-modules/quantum-gates",
    visualizeUrl: null,
    experimentUrl: "/circuit-simulator",
  },

  "quantum-noise": {
    id: "quantum-noise",
    displayName: "Quantum Noise",
    category: "concept",
    symbol: "\\mathcal{E}(\\rho)",
    aliases: [
      "quantum noise",
      "noise",
      "noise channel",
      "quantum channel",
      "decoherence",
      "environmental noise",
      "open quantum system",
    ],
    quickMeaning: "Unwanted physical interactions between a quantum processor and its environment or imperfect control apparatus, transforming pure states into statistical mixtures or perturbing measurement outcomes.",
    intuition: "A closed quantum system evolves deterministically according to unitary Schrödinger dynamics. In real hardware, stray electromagnetic fields, thermal fluctuations, and control imperfections introduce stochastic errors, modeled mathematically as completely positive trace-preserving (CPTP) quantum operations.",
    mathematics: "$$\\mathcal{E}(\\rho) = \\sum_k E_k \\rho E_k^\\dagger, \\quad \\text{with } \\sum_k E_k^\\dagger E_k = I$$",
    whyItMatters: "Quantum noise limits the circuit depth of current Noisy Intermediate-Scale Quantum (NISQ) devices before quantum advantage is lost, motivating quantum error mitigation and fault-tolerant quantum error correction (QEC).",
    learnUrl: "/micro-modules/quantum-gates",
    visualizeUrl: "/blochsphere",
    experimentUrl: "/circuit-simulator",
  },

  "depolarizing-noise": {
    id: "depolarizing-noise",
    displayName: "Depolarizing Noise",
    category: "concept",
    symbol: "\\mathcal{E}_{\\text{depol}}",
    aliases: [
      "depolarizing noise",
      "depolarizing",
      "depolarization",
      "depolarizing channel",
      "depolarization channel",
    ],
    quickMeaning: "A symmetric quantum error channel that leaves the state untouched with probability $1 - p$, and replaces it with the maximally mixed state $I/2^n$ with probability $p$.",
    intuition: "Depolarizing noise is the quantum equivalent of uniform static fuzz. On the single-qubit Bloch sphere, it symmetrically shrinks the Bloch vector toward the sphere's center without favoring any specific rotational axis, destroying purity and quantum information isotropically.",
    mathematics: "$$\\mathcal{E}_{\\text{depol}}(\\rho) = (1 - p)\\rho + \\frac{p}{2}I, \\quad \\vec{r} \\mapsto (1 - p)\\vec{r}$$ $$\\text{Kraus operators: } E_0 = \\sqrt{1 - \\frac{3p}{4}}I, \\; E_1 = \\sqrt{\\frac{p}{4}}X, \\; E_2 = \\sqrt{\\frac{p}{4}}Y, \\; E_3 = \\sqrt{\\frac{p}{4}}Z$$",
    whyItMatters: "The depolarizing channel is widely used as a standard benchmark in randomized benchmarking (RB) and fault-tolerance threshold analysis because it captures the average effect of worst-case isotropic decoherence.",
    learnUrl: "/micro-modules/quantum-gates",
    visualizeUrl: "/blochsphere",
    experimentUrl: "/circuit-simulator",
  },

  "dephasing-noise": {
    id: "dephasing-noise",
    displayName: "Phase Flip / Dephasing Noise",
    category: "concept",
    symbol: "\\mathcal{E}_{\\text{phase}}",
    aliases: [
      "phase flip",
      "dephasing",
      "dephasing noise",
      "phase flip noise",
      "phase damping",
      "t2 dephasing",
      "pure dephasing",
      "phase decoherence",
    ],
    quickMeaning: "A decoherence channel that destroys quantum phase coherence between superposition components without altering computational-basis populations.",
    intuition: "Imagine a spinning top whose angle in the horizontal plane becomes randomized while its upright tilt remains intact. On the Bloch sphere, dephasing contracts transverse coordinates $x$ and $y$ toward the $z$-axis ($r_\\perp \\to (1 - 2p)r_\\perp$) while leaving the longitudinal coordinate $z$ invariant.",
    mathematics: "$$\\mathcal{E}_{\\text{phase}}(\\rho) = (1 - p)\\rho + p Z \\rho Z, \\quad \\rho = \\begin{pmatrix} \\rho_{00} & (1-2p)\\rho_{01} \\\\ (1-2p)\\rho_{10} & \\rho_{11} \\end{pmatrix}$$",
    whyItMatters: "Dephasing (characterized by the transverse relaxation time $T_2^*$) is typically the fastest decoherence mechanism in solid-state superconducting and spin qubits, destroying interference patterns before population decay ($T_1$) occurs.",
    learnUrl: "/micro-modules/amplitudes-phase",
    visualizeUrl: "/blochsphere",
    experimentUrl: "/circuit-simulator",
  },

  "state-fidelity": {
    id: "state-fidelity",
    displayName: "State Fidelity",
    category: "mathematics",
    symbol: "F(\\rho, \\sigma)",
    aliases: [
      "state fidelity",
      "fidelity",
      "quantum fidelity",
      "state overlap",
      "quantum state fidelity",
      "divergence",
      "state divergence",
      "infidelity",
    ],
    quickMeaning: "A fundamental measure of closeness between two quantum states, ranging from 0 (orthogonal / completely distinguishable) to 1 (identical states).",
    intuition: "Fidelity answers: 'How accurately did our physical quantum hardware replicate the intended mathematical state?' For a pure target $|\\psi\\rangle$ and an experimental noisy density matrix $\\rho$, fidelity is precisely the probability that the physical system passes a projective test verifying state $|\\psi\\rangle$.",
    mathematics: "$$F(|\\psi\\rangle, \\rho) = \\langle\\psi|\\rho|\\psi\\rangle, \\quad \\text{General Uhlmann: } F(\\rho, \\sigma) = \\left( \\text{Tr}\\sqrt{\\sqrt{\\rho}\\sigma\\sqrt{\\rho}} \\right)^2$$",
    whyItMatters: "Quantum gate and algorithm benchmarks rely on fidelity to evaluate whether operations satisfy the threshold theorems (typically $F > 99.9\\%$) necessary for scalable quantum error correction.",
    learnUrl: "/micro-modules/qubits-quantum-states",
    visualizeUrl: null,
    experimentUrl: "/circuit-simulator",
  },

  "mixed-state": {
    id: "mixed-state",
    displayName: "Mixed Quantum State",
    category: "concept",
    symbol: "\\rho = \\sum p_i |\\psi_i\\rangle\\langle\\psi_i|",
    aliases: [
      "mixed state",
      "mixed states",
      "density matrix",
      "statistical mixture",
      "purity",
      "quantum mixed state",
      "bloch shrinkage",
      "bloch-shrinkage",
    ],
    quickMeaning: "A quantum state represented by a density operator $\\rho$ that cannot be described by a single statevector $|\\psi\\rangle$, either due to classical statistical uncertainty or entanglement with an external system.",
    intuition: "A pure state is complete quantum information, located strictly on the surface of the Bloch sphere ($r = 1, \\text{Tr}(\\rho^2) = 1$). A mixed state lies inside the Bloch ball ($r < 1, \\text{Tr}(\\rho^2) < 1$). Importantly, a subsystem of an entangled pure state appears mixed even in the complete absence of environmental noise.",
    mathematics: "$$\\rho = \\sum_{i} p_i |\\psi_i\\rangle\\langle\\psi_i|, \\quad \\text{Purity } \\gamma = \\text{Tr}(\\rho^2) \\in \\left[\\frac{1}{d}, 1\\right], \\quad \\vec{r} = \\text{Tr}(\\rho \\vec{\\sigma}) \\implies |\\vec{r}| \\le 1$$",
    whyItMatters: "Density matrices unify environmental decoherence, classical ignorance, and entanglement-induced subsystem reduction into a single rigorous mathematical framework.",
    learnUrl: "/micro-modules/qubits-quantum-states",
    visualizeUrl: "/blochsphere",
    experimentUrl: "/circuit-simulator",
  },
};

/**
 * Strips punctuation, quotes, markdown characters, and normalizes whitespace.
 */
export function cleanSelectionText(raw) {
  if (!raw || typeof raw !== "string") return "";
  return raw
    .replace(/[“”"'`]/g, "")
    .replace(/[.,;:!?()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Resolves any user text selection or identifier into a canonical V1 Inspectable Quantum Entity.
 * Returns the entity object if matched, or null if unsupported.
 */
export function resolveCanonicalEntity(rawInput) {
  if (!rawInput) return null;

  const cleaned = cleanSelectionText(rawInput);
  if (!cleaned || cleaned.length > 50) return null;

  // Direct canonical ID match
  if (CANONICAL_ENTITIES[cleaned]) {
    return CANONICAL_ENTITIES[cleaned];
  }

  // Alias scan
  for (const entity of Object.values(CANONICAL_ENTITIES)) {
    if (entity.aliases.includes(cleaned)) {
      return entity;
    }
  }

  // Exact symbol matching (case-sensitive)
  const trimmed = String(rawInput).trim();
  if (trimmed === "H" || trimmed === "h") {
    return CANONICAL_ENTITIES.hadamard;
  }
  if (trimmed === "M" || trimmed === "m") {
    return CANONICAL_ENTITIES.measurement;
  }
  if (trimmed === "CX" || trimmed === "cx") {
    return CANONICAL_ENTITIES.cnot;
  }
  if (trimmed === "SWAP" || trimmed === "swap") {
    return CANONICAL_ENTITIES.swap;
  }
  if (trimmed === "|0⟩" || trimmed === "|1⟩" || trimmed === "|ψ⟩" || trimmed === "|psi>") {
    return CANONICAL_ENTITIES.qubit;
  }
  if (trimmed === "|+⟩" || trimmed === "|-⟩" || trimmed === "|+>" || trimmed === "|->") {
    return CANONICAL_ENTITIES.superposition;
  }

  return null;
}
