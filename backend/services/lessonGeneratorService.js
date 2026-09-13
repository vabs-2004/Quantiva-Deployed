/**
 * lessonGeneratorService.js
 *
 * Quantiva Phase 7H: User-Generated Interactive Learning Service
 *
 * Responsibilities:
 * 1. Curated Content Priority Check (using canonical content registry / Knowledge Map)
 * 2. Structured, bounded JSON prompt construction for the Groq AI provider
 * 3. Strict schema parsing and validation (zero raw HTML/JSX/JS/eval)
 * 4. Whitelisted interactive component and config validation
 * 5. Deterministic persistence in the GeneratedLesson collection scoped to req.user.id
 */

const aiProvider = require("./aiProvider");
const contentRegistryService = require("./contentRegistryService");
const youtubeService = require("./youtubeService");
const GeneratedLesson = require("../models/GeneratedLesson");
const UserProgress = require("../models/UserProgress");
const { KNOWLEDGE_MAP_TOPICS } = require("../data/knowledgeMapData");

// Whitelisted interactive component types
const ALLOWED_COMPONENTS = [
  "bloch-sphere",
  "circuit",
  "complex-plane",
  "state-vector",
  "probability-heatmap",
  "measurement",
  "sandbox",
];

// Whitelisted section types
const ALLOWED_SECTION_TYPES = [
  "explanation",
  "intuition",
  "formula",
  "formalism",
  "visualization",
  "interactive",
  "code",
  "experiment",
  "video",
  "quiz",
  "reflection",
];

// Max limits to avoid pathological payloads
const BOUNDS = {
  MAX_TITLE_LEN: 200,
  MAX_SUMMARY_LEN: 1000,
  MIN_SECTIONS: 2,
  MAX_SECTIONS: 10,
  MAX_SECTION_TITLE_LEN: 200,
  MAX_SECTION_CONTENT_LEN: 8000,
  MAX_FORMULA_LEN: 2000,
  MAX_QUESTION_OPTIONS: 5,
  MAX_OPTION_LEN: 400,
  MAX_ESTIMATED_MINUTES: 60,
  MIN_ESTIMATED_MINUTES: 1,
};

/**
 * Checks if Quantiva has an authoritative curated resource for a given topic or query.
 * Uses exact / alias matching from contentRegistryService and canonical Knowledge Map.
 *
 * @param {string} topicQuery - Canonical slug or display title
 * @returns {Promise<{ hasCurated: boolean, curatedResource: object|null }>}
 */
async function checkCuratedResource(topicQuery) {
  if (!topicQuery || typeof topicQuery !== "string") {
    return { hasCurated: false, curatedResource: null };
  }

  const queryClean = topicQuery.trim().toLowerCase();

  // 1. Direct match in Knowledge Map topics
  const kmTopic = KNOWLEDGE_MAP_TOPICS.find(
    (t) =>
      t.topicId.toLowerCase() === queryClean ||
      t.title.toLowerCase() === queryClean
  );

  if (kmTopic && kmTopic.resource) {
    return {
      hasCurated: true,
      curatedResource: {
        type: kmTopic.resource.type,
        id: kmTopic.resource.id,
        route: kmTopic.resource.route,
        title: kmTopic.title,
        topicId: kmTopic.topicId,
      },
    };
  }

  // 2. Exact match in Content Registry (Micro Modules or Algorithms)
  try {
    const registryResult = await contentRegistryService.search({
      q: topicQuery,
      limit: 5,
    });

    if (
      registryResult &&
      registryResult.results &&
      registryResult.results.length > 0
    ) {
      const topMatch = registryResult.results[0];

      // Check if top match title, id, or aliases strictly match query
      const isExactId = topMatch.id.toLowerCase() === queryClean;
      const isExactTitle = topMatch.title.toLowerCase() === queryClean;
      const isExactAlias =
        Array.isArray(topMatch.aliases) &&
        topMatch.aliases.some((a) => a.toLowerCase() === queryClean);

      if (
        (isExactId || isExactTitle || isExactAlias) &&
        topMatch.type !== "tool"
      ) {
        let route = topMatch.url;

        if (!route) {
          if (topMatch.type === "micro_module") {
            route = `/micro-modules/${topMatch.id}`;
          } else if (topMatch.type === "algorithm") {
            route = `/algorithm/${topMatch.id}`;
          } else if (topMatch.type === "course") {
            route = `/courses/${topMatch.id}`;
          }
        }

        return {
          hasCurated: true,
          curatedResource: {
            type: topMatch.type,
            id: topMatch.id,
            route,
            title: topMatch.title,
            topicId: topMatch.id,
          },
        };
      }
    }
  } catch (err) {
    console.warn(
      "[lessonGeneratorService] Curated registry lookup warning:",
      err.message
    );
  }

  return { hasCurated: false, curatedResource: null };
}

/**
 * Sanitizes and validates a single interactive component configuration.
 * Prevents executable script/handler injection into mixed config objects.
 */
function sanitizeComponentConfig(type, rawConfig) {
  if (!rawConfig || typeof rawConfig !== "object") return {};

  const config = JSON.parse(JSON.stringify(rawConfig));

  // Security check: reject keys or values that attempt script injection
  const stringified = JSON.stringify(config).toLowerCase();

  if (
    stringified.includes("<script") ||
    stringified.includes("javascript:") ||
    stringified.includes("eval(") ||
    stringified.includes("new function") ||
    stringified.includes("onload=") ||
    stringified.includes("onerror=")
  ) {
    throw new Error(
      "Interactive component config contains disallowed or unsafe tokens."
    );
  }

  // Component-specific validation & normalization
  if (type === "bloch-sphere") {
    return {
      initialTheta:
        typeof config.initialTheta === "number"
          ? config.initialTheta
          : Math.PI / 2,
      initialPhi:
        typeof config.initialPhi === "number" ? config.initialPhi : 0,
      allowedGates: Array.isArray(config.allowedGates)
        ? config.allowedGates.filter((g) =>
            ["X", "Y", "Z", "H", "S", "T"].includes(g)
          )
        : ["X", "Y", "Z", "H"],
      instructions:
        typeof config.instructions === "string"
          ? config.instructions.slice(0, 300)
          : "",
    };
  }

  if (type === "circuit") {
    const numQubits = Math.max(
      1,
      Math.min(4, Number(config.numQubits) || 2)
    );

    const rawGates = Array.isArray(config.gates) ? config.gates : [];

    const validGates = ["H", "X", "Y", "Z", "S", "T", "CX", "SWAP", "M"];

    const gates = rawGates
      .filter(
        (g) =>
          g &&
          typeof g === "object" &&
          typeof g.wire === "number" &&
          g.wire >= 0 &&
          g.wire < numQubits &&
          validGates.includes(g.type)
      )
      .slice(0, 16)
      .map((g) => ({
        wire: g.wire,
        type: g.type,
        step:
          typeof g.step === "number"
            ? Math.max(0, Math.min(10, g.step))
            : 0,
        target:
          typeof g.target === "number"
            ? Math.max(0, Math.min(numQubits - 1, g.target))
            : undefined,
      }));

    return {
      numQubits,
      gates,
      instructions:
        typeof config.instructions === "string"
          ? config.instructions.slice(0, 300)
          : "",
    };
  }

  if (type === "complex-plane") {
    const r =
      typeof config.r === "number"
        ? Math.max(-2, Math.min(2, config.r))
        : 1.0;

    const i =
      typeof config.i === "number"
        ? Math.max(-2, Math.min(2, config.i))
        : 0.0;

    return {
      r,
      i,
      range: 2.0,
      showComponents: config.showComponents !== false,
      instructions:
        typeof config.instructions === "string"
          ? config.instructions.slice(0, 300)
          : "",
    };
  }

  if (type === "probability-heatmap" || type === "state-vector") {
    const probs = {};

    if (
      config.probabilities &&
      typeof config.probabilities === "object"
    ) {
      Object.entries(config.probabilities).forEach(([k, v]) => {
        if (
          /^[01]{1,4}$/.test(k) &&
          typeof v === "number" &&
          v >= 0 &&
          v <= 1
        ) {
          probs[k] = Math.round(v * 1000) / 1000;
        }
      });
    }

    if (Object.keys(probs).length === 0) {
      probs["0"] = 1.0;
    }

    return {
      probabilities: probs,
      instructions:
        typeof config.instructions === "string"
          ? config.instructions.slice(0, 300)
          : "",
    };
  }

  if (type === "measurement") {
    const rawMeasurements = Array.isArray(config.measurements)
      ? config.measurements
      : [];

    const shots = Math.max(
      10,
      Math.min(10000, Number(config.shots) || 1000)
    );

    const measurements = rawMeasurements
      .filter(
        (m) =>
          m &&
          typeof m === "object" &&
          typeof m.state === "string"
      )
      .slice(0, 16)
      .map((m) => {
        const state = String(m.state).trim().slice(0, 8);

        const probability =
          typeof m.probability === "number"
            ? Math.max(0, Math.min(1, m.probability))
            : 0;

        const count =
          typeof m.count === "number"
            ? Math.max(0, Math.min(shots, Math.round(m.count)))
            : Math.round(probability * shots);

        return {
          state,
          probability,
          count,
        };
      });

    return {
      measurements:
        measurements.length > 0
          ? measurements
          : [
              {
                state: "0",
                probability: 0.5,
                count: Math.round(shots * 0.5),
              },
              {
                state: "1",
                probability: 0.5,
                count: Math.round(shots * 0.5),
              },
            ],
      shots,
      instructions:
        typeof config.instructions === "string"
          ? config.instructions.slice(0, 300)
          : "",
    };
  }

  if (type === "sandbox") {
    const code =
      typeof config.code === "string"
        ? config.code.slice(0, 4000)
        : "";

    return {
      code,
      language: "python",
      title:
        typeof config.title === "string"
          ? config.title.slice(0, 100)
          : "Executable Sandbox",
      instructions:
        typeof config.instructions === "string"
          ? config.instructions.slice(0, 300)
          : "",
    };
  }

  return {};
}

/**
 * Validates and sanitizes a complete lesson specification against
 * all security and schema bounds.
 *
 * Throws Error on any violation.
 */
function validateLessonSpec(spec) {
  if (!spec || typeof spec !== "object") {
    throw new Error(
      "Invalid lesson specification: expected JSON object."
    );
  }

  // 1. Basic properties
  const title = (spec.title || "").trim();

  if (!title || title.length > BOUNDS.MAX_TITLE_LEN) {
    throw new Error(
      `Lesson title is required and must be under ${BOUNDS.MAX_TITLE_LEN} characters.`
    );
  }

  const summary = (spec.summary || "").trim();

  if (summary.length > BOUNDS.MAX_SUMMARY_LEN) {
    throw new Error(
      `Lesson summary must be under ${BOUNDS.MAX_SUMMARY_LEN} characters.`
    );
  }

  const difficulty = ["beginner", "intermediate", "advanced"].includes(
    spec.difficulty
  )
    ? spec.difficulty
    : "intermediate";

  const estimatedMinutes = Math.max(
    BOUNDS.MIN_ESTIMATED_MINUTES,
    Math.min(
      BOUNDS.MAX_ESTIMATED_MINUTES,
      Number(spec.estimatedMinutes) || 7
    )
  );

  // 2. Sections
  if (
    !Array.isArray(spec.sections) ||
    spec.sections.length < BOUNDS.MIN_SECTIONS
  ) {
    throw new Error(
      `Lesson must contain at least ${BOUNDS.MIN_SECTIONS} sections.`
    );
  }

  if (spec.sections.length > BOUNDS.MAX_SECTIONS) {
    throw new Error(
      `Lesson cannot exceed ${BOUNDS.MAX_SECTIONS} sections.`
    );
  }

  const validatedSections = [];

  for (let idx = 0; idx < spec.sections.length; idx++) {
    const s = spec.sections[idx];

    if (!s || typeof s !== "object") {
      throw new Error(`Section at index ${idx} is invalid.`);
    }

    const sId = (s.id || `sec-${idx + 1}`)
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .slice(0, 80);

    const sType = ALLOWED_SECTION_TYPES.includes(s.type)
      ? s.type
      : "explanation";

    const sTitle = (s.title || `Section ${idx + 1}`)
      .trim()
      .slice(0, BOUNDS.MAX_SECTION_TITLE_LEN);

    const sContent = (s.content || "").trim();

    if (!sContent) {
      throw new Error(
        `Section "${sTitle}" cannot have empty content.`
      );
    }

    if (sContent.length > BOUNDS.MAX_SECTION_CONTENT_LEN) {
      throw new Error(
        `Section "${sTitle}" content exceeds ${BOUNDS.MAX_SECTION_CONTENT_LEN} characters.`
      );
    }

    // Security check against script injection in text content
    if (
      sContent.includes("<script") ||
      sContent.includes("javascript:") ||
      sContent.includes("eval(") ||
      sContent.includes("new Function(")
    ) {
      throw new Error(
        `Section "${sTitle}" contains disallowed script tokens.`
      );
    }

    // Optional formula
    let formulaObj = undefined;

    if (
      s.formula &&
      typeof s.formula === "object" &&
      s.formula.latex
    ) {
      const cleanLatex = String(s.formula.latex)
        .trim()
        .replace(/^(\$\$|\$)+/, "")
        .replace(/(\$\$|\$)+$/, "")
        .trim()
        .slice(0, BOUNDS.MAX_FORMULA_LEN);

      const explanation = s.formula.explanation
        ? String(s.formula.explanation)
            .trim()
            .slice(0, BOUNDS.MAX_FORMULA_LEN)
        : "";

      formulaObj = {
        latex: cleanLatex,
        explanation,
      };
    }

    // Optional Code Snippet
    let codeSnippetObj = undefined;

    if (
      s.codeSnippet &&
      typeof s.codeSnippet === "object" &&
      s.codeSnippet.code
    ) {
      codeSnippetObj = {
        language: "python",
        code: String(s.codeSnippet.code).slice(0, 6000),
        title: s.codeSnippet.title
          ? String(s.codeSnippet.title)
              .trim()
              .slice(0, 200)
          : "Python / Qiskit Implementation",
        instructions: s.codeSnippet.instructions
          ? String(s.codeSnippet.instructions)
              .trim()
              .slice(0, 500)
          : "",
      };
    }

    // Optional Video
    let videoObj = undefined;

    const isVideoSection = idx === 3 || sType === "video";

    if (
      isVideoSection &&
      s.video &&
      typeof s.video === "object" &&
      (s.video.embedUrl ||
        s.video.videoId ||
        s.video.url)
    ) {
      videoObj = {
        videoId: s.video.videoId
          ? String(s.video.videoId).slice(0, 100)
          : "",
        title: s.video.title
          ? String(s.video.title)
              .trim()
              .slice(0, 300)
          : "Video Guide",
        channelTitle: s.video.channelTitle
          ? String(s.video.channelTitle)
              .trim()
              .slice(0, 200)
          : "Quantum Computing",
        embedUrl: s.video.embedUrl
          ? String(s.video.embedUrl).slice(0, 500)
          : "",
        url: s.video.url
          ? String(s.video.url).slice(0, 500)
          : "",
        viewCount: Number(s.video.viewCount) || 0,
        likeCount: Number(s.video.likeCount) || 0,
        description: s.video.description
          ? String(s.video.description).slice(0, 2000)
          : "",
      };
    }

    // Interactive Component
    let interactiveObj = undefined;

    if (
      s.interactiveComponent &&
      typeof s.interactiveComponent === "object"
    ) {
      const cType = s.interactiveComponent.type;

      if (ALLOWED_COMPONENTS.includes(cType)) {
        const sanitizedConfig = sanitizeComponentConfig(
          cType,
          s.interactiveComponent.config
        );

        interactiveObj = {
          type: cType,
          config: sanitizedConfig,
        };
      }
    } else if (codeSnippetObj) {
      // Auto-bridge codeSnippet to sandbox component for backward compatibility
      interactiveObj = {
        type: "sandbox",
        config: {
          code: codeSnippetObj.code,
          language: "python",
          title: codeSnippetObj.title,
          instructions: codeSnippetObj.instructions,
        },
      };
    }

    // Check question — ONLY allowed on final section / quiz
    let questionObj = undefined;

    const isFinalSection =
      idx === spec.sections.length - 1 ||
      sType === "quiz" ||
      sType === "reflection";

    if (
      isFinalSection &&
      s.checkQuestion &&
      typeof s.checkQuestion === "object" &&
      s.checkQuestion.question
    ) {
      const qText = String(s.checkQuestion.question)
        .trim()
        .slice(0, 1000);

      const rawOptions = Array.isArray(
        s.checkQuestion.options
      )
        ? s.checkQuestion.options
        : [];

      const options = rawOptions
        .map((opt) =>
          String(opt)
            .trim()
            .slice(0, BOUNDS.MAX_OPTION_LEN)
        )
        .filter(Boolean)
        .slice(0, BOUNDS.MAX_QUESTION_OPTIONS);

      const correctIndex =
        typeof s.checkQuestion.correctIndex === "number" &&
        s.checkQuestion.correctIndex >= 0 &&
        s.checkQuestion.correctIndex < options.length
          ? s.checkQuestion.correctIndex
          : 0;

      const qExpl = s.checkQuestion.explanation
        ? String(s.checkQuestion.explanation)
            .trim()
            .slice(0, 1500)
        : "";

      if (options.length >= 2) {
        questionObj = {
          question: qText,
          options,
          correctIndex,
          explanation: qExpl,
        };
      }
    }

    validatedSections.push({
      id: sId,
      type: sType,
      title: sTitle,
      content: sContent,
      ...(formulaObj ? { formula: formulaObj } : {}),
      ...(codeSnippetObj ? { codeSnippet: codeSnippetObj } : {}),
      ...(videoObj ? { video: videoObj } : {}),
      ...(interactiveObj
        ? { interactiveComponent: interactiveObj }
        : {}),
      ...(questionObj ? { checkQuestion: questionObj } : {}),
    });
  }

  // Ensure at least one section has an interactive or code component
  const hasInteractive = validatedSections.some(
    (s) =>
      s.interactiveComponent ||
      s.codeSnippet ||
      s.video
  );

  if (!hasInteractive) {
    const targetIdx = Math.min(
      1,
      validatedSections.length - 1
    );

    validatedSections[targetIdx].interactiveComponent = {
      type: "bloch-sphere",
      config: {
        initialTheta: Math.PI / 2,
        initialPhi: 0,
        allowedGates: ["X", "Y", "Z", "H"],
        instructions:
          "Explore the state on the Bloch Sphere.",
      },
    };
  }

  return {
    title,
    summary,
    difficulty,
    estimatedMinutes,
    sections: validatedSections,
  };
}

/**
 * Builds the LLM system prompt and instructions for generating
 * a declarative JSON lesson.
 */
function buildLessonGenerationPrompt(
  topicName,
  topicDescription,
  learnerLevel,
  options = {}
) {
  const levelText = learnerLevel || "intermediate";

  const {
    conversation = [],
    relatedResources = [],
    learnerIntent = "",
  } = options;

  // Bounded conversation history
  let boundedConvoText = "";

  if (
    Array.isArray(conversation) &&
    conversation.length > 0
  ) {
    const recent = conversation
      .filter(
        (m) =>
          m &&
          (m.role === "user" || m.role === "assistant") &&
          m.text
      )
      .slice(-6);

    let totalChars = 0;
    const turns = [];

    for (let i = recent.length - 1; i >= 0; i--) {
      const roleLabel =
        recent[i].role === "user"
          ? "Learner"
          : "Tutor";

      const cleanTurnText = recent[i].text
        .trim()
        .replace(/<[^>]*>/g, "");

      const turn = `${roleLabel}: ${cleanTurnText}`;

      if (totalChars + turn.length > 2000) {
        break;
      }

      turns.unshift(turn);
      totalChars += turn.length;
    }

    if (turns.length > 0) {
      boundedConvoText = turns.join("\n");
    }
  }

  // Bounded related resources
  let boundedRelatedText = "";

  if (
    Array.isArray(relatedResources) &&
    relatedResources.length > 0
  ) {
    const topRelated = relatedResources
      .slice(0, 3)
      .map(
        (r) =>
          `- ${r.title} (${r.type}: ${
            r.category || "Curated Resource"
          })`
      );

    boundedRelatedText = topRelated.join("\n");
  }

  const systemPrompt = `You are the Quantiva AI Curriculum Generator.

Your task is to generate a personalized, interactive quantum computing micro-lesson for a learner at the "${levelText}" level.

CRITICAL PEDAGOGICAL & ARCHITECTURAL RULES:

1. THE REQUESTED TOPIC IS AUTHORITATIVE:
   You are creating a lesson specifically for "${topicName}".

2. EXACT 5-SECTION PROGRESSION (MANDATORY):
   You MUST output exactly 5 sections in this order:

   - Section 1 (type: "intuition"): Intuition & Physical Analogy.
   - Section 2 (type: "formalism"): Mathematical Formalism (equations & derivations).
   - Section 3 (type: "code"): Code & Implementation (provide runnable Python/Qiskit code snippet).
   - Section 4 (type: "video"): Video Learning (conceptual guide on what to watch for).
   - Section 5 (type: "quiz"): Check Your Understanding (dedicated conceptual quiz question).

3. CHECK QUESTIONS ARE EXCLUSIVE TO SECTION 5:
   NEVER attach a checkQuestion to sections 1, 2, 3, or 4.
   Only Section 5 contains checkQuestion.

4. STRICT MATH DELIMITERS & COMPLETE EQUATION ENCLOSURE (MANDATORY):

   - EVERY formula, equation, mathematical expression, variable, state vector, and Dirac notation MUST be completely wrapped in $...$ (for inline math) or $$...$$ (for display equations on their own line).
   - NEVER output bare LaTeX commands without dollar signs.
   - For multi-symbol formulas, wrap the ENTIRE equation in ONE set of dollar signs.
   - NEVER nest dollar signs inside other dollar signs.

   CORRECT:
   "$|b\\\\rangle = \\\\sum_i b_i |u_i\\\\rangle$"

   CORRECT:
   "$\\\\sum_i b_i |u_i\\\\rangle |\\\\tilde{\\\\lambda}_i\\\\rangle$"

   CORRECT:
   "$|0\\\\rangle \\\\to \\\\sqrt{1-\\\\left(\\\\frac{C}{\\\\lambda_i}\\\\right)^2}|0\\\\rangle + \\\\frac{C}{\\\\lambda_i}|1\\\\rangle$"

   CORRECT:
   "$C/\\\\lambda_i \\\\le 1$"

   CORRECT:
   "$A^{-1}|b\\\\rangle$"

   WRONG:
   bare equations like \\\\sum_i b_i |u_i\\\\rangle

   WRONG:
   |b\\\\rangle = \\\\sum_i b_i |u_i\\\\rangle without surrounding dollars.

5. POINT-WISE LIST FORMATTING:
   When writing numbered steps or bullet lists, use standard Markdown list syntax with separate lines for each item so points NEVER clutter together into continuous lines.

6. CODE IMPLEMENTATION (SECTION 3):
   Section 3 must provide a clean, runnable Python/Qiskit code snippet in "codeSnippet" that demonstrates the topic.

7. MODERN QISKIT API REQUIREMENT:
   Generate code compatible with the current Qiskit 2.x-era API.

   For local simulation with Qiskit Aer:
   - Import AerSimulator from qiskit_aer.
   - Use QuantumCircuit from qiskit.
   - Use transpile() from qiskit.
   - Create an AerSimulator instance.
   - Transpile the circuit for that backend.
   - Execute using backend.run(...).
   - Retrieve results from the returned job/result object.

   Preferred simulation pattern:

   from qiskit import QuantumCircuit, transpile
   from qiskit_aer import AerSimulator

   qc = QuantumCircuit(2)
   qc.h(0)
   qc.cx(0, 1)
   qc.measure_all()

   backend = AerSimulator()
   compiled_qc = transpile(qc, backend)
   result = backend.run(compiled_qc, shots=1024).result()
   counts = result.get_counts()

   NEVER use:
   - from qiskit import Aer
   - from qiskit_aer import Aer
   - from qiskit.providers.aer import Aer
   - from qiskit.providers.aer import AerSimulator
   - from qiskit import execute
   - execute(...)
   - Aer.get_backend(...)
   - qasm_simulator
   - statevector_simulator
   - QuantumInstance
   - qiskit.algorithms
   - qiskit.aqua
   - legacy Qiskit Aqua APIs
   - removed or deprecated execution APIs

   Do NOT recommend downgrading Qiskit or installing obsolete packages to make old code work.

8. QISKIT ALGORITHM GUIDANCE:
   If the requested topic is an algorithm such as HHL, phase estimation, QPE, VQE, QAOA, or another quantum algorithm, explain and implement it using currently supported Qiskit circuit primitives.

   Do NOT use removed high-level algorithm classes or legacy namespaces.

   For HHL specifically:
   - HHL is valid as an educational algorithm/topic.
   - Do NOT import or instantiate a legacy HHL class.
   - Do NOT use qiskit.algorithms.HHL.
   - Explain the algorithm through its circuit-level components such as state preparation, phase estimation, controlled operations, eigenvalue-dependent transformations, controlled rotations, inverse phase estimation, and measurement/state extraction where appropriate.
   - Use currently supported QuantumCircuit operations and simulation APIs.
   - Keep the implementation educational and runnable rather than pretending to provide a full fault-tolerant implementation.

9. PRESERVE LEARNER INTENT:
   If the learner's conversation focused on a specific angle, mechanism, or question, tailor the lesson's title, focus, and sections to that specific learning intent.

10. OUTPUT ONLY A VALID JSON OBJECT:
   No Markdown code wrappers.
   No preamble.
   No commentary.

11. NEVER generate:
   - HTML
   - JSX
   - JavaScript
   - eval
   - React code
   - script tags

JSON SCHEMA TO PRODUCE:

{
  "title": "Clear Title of the Lesson (reflecting topic and learner intent)",

  "summary": "1-2 sentence overview of what the learner will discover.",

  "difficulty": "${
    levelText === "completely_new"
      ? "beginner"
      : "intermediate"
  }",

  "estimatedMinutes": 8,

  "sections": [
    {
      "id": "sec-1",
      "type": "intuition",
      "title": "Intuitive Picture & Core Concept",
      "content": "Explanation in Markdown with physical intuition and analogies. Format key takeaways as distinct bullet points."
    },

    {
      "id": "sec-2",
      "type": "formalism",
      "title": "Mathematical Formalism",
      "content": "Step-by-step mathematical derivation and state evolution. Format numbered steps cleanly with separate lines. EVERY equation and variable MUST be enclosed in $...$.",
      "formula": {
        "latex": "\\\\text{Primary equation}",
        "explanation": "Key takeaway of the formula"
      }
    },

    {
      "id": "sec-3",
      "type": "code",
      "title": "Code & Implementation",
      "content": "Explanation of how this quantum circuit or algorithm is implemented in Python and modern Qiskit.",

      "codeSnippet": {
        "language": "python",
        "title": "Python / Qiskit Implementation",
        "code": "from qiskit import QuantumCircuit, transpile\\nfrom qiskit_aer import AerSimulator\\n\\nqc = QuantumCircuit(2)\\nqc.h(0)\\nqc.cx(0, 1)\\nqc.measure_all()\\n\\nbackend = AerSimulator()\\ncompiled_qc = transpile(qc, backend)\\nresult = backend.run(compiled_qc, shots=1024).result()\\ncounts = result.get_counts()\\nprint(counts)",
        "instructions": "Copy this code or click Open in Sandbox to run and simulate it."
      }
    },

    {
      "id": "sec-4",
      "type": "video",
      "title": "Video Learning",
      "content": "Summary of visual demonstrations and key aspects to observe in the video lecture."
    },

    {
      "id": "sec-5",
      "type": "quiz",
      "title": "Check Your Understanding",
      "content": "Test your grasp of this topic with this conceptual check.",

      "checkQuestion": {
        "question": "Clear conceptual question testing understanding?",
        "options": [
          "Option A",
          "Option B",
          "Option C"
        ],
        "correctIndex": 0,
        "explanation": "Detailed explanation of why Option A is correct."
      }
    }
  ]
}`;

  let userPrompt = `AUTHORITATIVE REQUESTED TOPIC: "${topicName}"

Topic Context: "${topicDescription || topicName}"

Learner Level: "${levelText}"`;

  if (learnerIntent) {
    userPrompt += `\nLearner Intent: "${learnerIntent}"`;
  }

  if (boundedConvoText) {
    userPrompt += `

RELEVANT TUTOR CONVERSATION (preserve this pedagogical angle & intent):
${boundedConvoText}`;
  }

  if (boundedRelatedText) {
    userPrompt += `

SUPPORTING CURATED QUANTIVA RESOURCES (for grounding only; do NOT substitute requested topic):
${boundedRelatedText}`;
  }

  userPrompt += `

Generate the complete 5-section interactive quantum lesson JSON specification for "${topicName}" now.`;

  return {
    systemPrompt,
    userPrompt,
  };
}

/**
 * Generates and persists a user-generated interactive lesson.
 *
 * @param {Object} options
 * @param {string} options.topic - Topic title or slug
 * @param {string} [options.topicDescription] - Context summary
 * @param {string} options.userId - Authenticated user ObjectId
 * @param {string} [options.learnerLevel] - Learner level
 * @param {boolean} [options.forceAlternative=false] - If true, skips curated priority check
 * @param {Array} [options.conversation=[]] - Optional recent conversation turns from Tutor
 * @param {string} [options.learnerIntent=""] - Optional specific learning angle/intent
 * @returns {Promise<{ curatedResource?: object, lesson?: object }>}
 */
async function generateAndSaveLesson(options) {
  const {
    topic,
    topicDescription = "",
    userId,
    learnerLevel = "intermediate",
    forceAlternative = false,
    conversation = [],
    learnerIntent = "",
  } = options;

  if (!topic || !userId) {
    throw new Error(
      "Missing required parameters: topic and userId are mandatory."
    );
  }

  // 1. Check Curated Resource Priority
  if (!forceAlternative) {
    const priority = await checkCuratedResource(topic);

    if (priority.hasCurated) {
      return {
        curatedResource: priority.curatedResource,
        lesson: null,
      };
    }
  }

  // Find supporting curated resources for context
  let relatedResources = [];

  try {
    const searchRes = await contentRegistryService.search({
      q: topic,
      limit: 3,
    });

    if (
      searchRes &&
      Array.isArray(searchRes.results)
    ) {
      relatedResources = searchRes.results.slice(0, 3);
    }
  } catch (err) {
    console.warn(
      "[lessonGeneratorService] Could not fetch related resources:",
      err.message
    );
  }

  // 2. Build Bounded, Structured Prompt
  const { systemPrompt, userPrompt } =
    buildLessonGenerationPrompt(
      topic,
      topicDescription,
      learnerLevel,
      {
        conversation,
        relatedResources,
        learnerIntent,
      }
    );

  // 3. Call AI provider
  console.log(
    `[lessonGeneratorService] Generating lesson for topic "${topic}"...`
  );

  const completion = await aiProvider.generateText({
    systemPrompt,
    userPrompt,
    temperature: 0.2,
    maxTokens: 3500,
  });

  const rawText = (
    completion && completion.text
      ? completion.text
      : ""
  ).trim();

  if (!rawText) {
    throw new Error(
      "AI provider returned empty response for lesson generation."
    );
  }

  // 4. Clean and parse JSON
  let parsedJson;

  try {
    let jsonStr = rawText;

    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr
        .replace(/^```(?:json)?/i, "")
        .replace(/```$/, "")
        .trim();
    }

    parsedJson = JSON.parse(jsonStr);
  } catch (parseErr) {
    console.error(
      "[lessonGeneratorService] Failed to parse model JSON:",
      rawText.slice(0, 500)
    );

    throw new Error(
      "Model response was not valid JSON: " +
        parseErr.message
    );
  }

  // 5. Fetch Top YouTube Video for Section 4
  let topVideo = null;

  try {
    topVideo = await youtubeService.fetchTopVideo(topic);
  } catch (ytErr) {
    console.warn(
      "[lessonGeneratorService] YouTube fetch error:",
      ytErr.message
    );
  }

  // Attach video to section 4 if present in parsedJson
  if (
    parsedJson &&
    Array.isArray(parsedJson.sections) &&
    topVideo
  ) {
    const vSec =
      parsedJson.sections.find(
        (s) =>
          s.type === "video" ||
          s.id === "sec-4"
      ) || parsedJson.sections[3];

    if (vSec) {
      vSec.video = topVideo;
    }
  }

  // 6. Validate & sanitize against strict schema bounds
  const validatedData =
    validateLessonSpec(parsedJson);

  // Ensure video is assigned ONLY to Section 4
  // and stripped from all other sections
  if (
    validatedData.sections &&
    Array.isArray(validatedData.sections)
  ) {
    validatedData.sections.forEach((sec, idx) => {
      const isVideoSec =
        sec.type === "video" || idx === 3;

      if (isVideoSec) {
        if (topVideo && !sec.video) {
          sec.video = topVideo;
        }
      } else {
        delete sec.video;
      }
    });
  }

  // 7. Generate server-owned identifiers
  const cleanSlug = topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || "quantum-concept";

  const lessonId =
    `gen-${cleanSlug}-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 7)}`;

  // 8. Persist to GeneratedLesson collection
  // strictly scoped to owner userId
  const lessonDoc = await GeneratedLesson.create({
    lessonId,
    owner: userId,
    topicId: cleanSlug,
    title: validatedData.title,
    summary: validatedData.summary,
    difficulty: validatedData.difficulty,
    estimatedMinutes:
      validatedData.estimatedMinutes,
    sections: validatedData.sections,
    isAIGenerated: true,
  });

  console.log(
    `[lessonGeneratorService] Successfully persisted GeneratedLesson ${lessonId} for user ${userId}`
  );

  return {
    curatedResource: null,
    lesson: lessonDoc.toObject(),
  };
}

module.exports = {
  checkCuratedResource,
  validateLessonSpec,
  sanitizeComponentConfig,
  buildLessonGenerationPrompt,
  generateAndSaveLesson,
  BOUNDS,
  ALLOWED_COMPONENTS,
  ALLOWED_SECTION_TYPES,
};