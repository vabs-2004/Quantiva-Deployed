/**
 * QuantumContextLensContext.jsx
 * 
 * Quantiva Phase 1: Context & State Controller for the Quantum Contextual Lens.
 * 
 * Manages:
 * - Lens visibility state (isOpen)
 * - Active inspectable entity & context
 * - Tier 1 instant local ontology lookup
 * - Tier 2 asynchronous contextual AI reasoning
 * - Safe explicit handoff to existing AI Tutor without state contamination
 * - Feature flag gating (VITE_ENABLE_CONTEXT_LENS)
 */

import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { resolveCanonicalEntity } from "../data/quantumOntology";
import { inspectQuantumEntity } from "../services/contextLensApi";

const QuantumContextLensContext = createContext(null);

export function QuantumContextLensProvider({ children }) {
  // Feature flag: enabled by default unless explicitly set to "false"
  const isFeatureEnabled = import.meta.env.VITE_ENABLE_CONTEXT_LENS !== "false";

  const [isOpen, setIsOpen] = useState(false);
  const [activeEntity, setActiveEntity] = useState(null);
  const [activeContext, setActiveContext] = useState(null);
  const [tier1Data, setTier1Data] = useState(null);
  const [tier2Data, setTier2Data] = useState(null);
  const [loadingTier2, setLoadingTier2] = useState(false);
  const [errorTier2, setErrorTier2] = useState(null);

  const stateRef = useRef({ activeEntity, activeContext, loadingTier2 });
  useEffect(() => {
    stateRef.current = { activeEntity, activeContext, loadingTier2 };
  }, [activeEntity, activeContext, loadingTier2]);

  const requestCounterRef = useRef(0);

  /**
   * Fetches Tier 2 contextual explanation from the isolated backend endpoint.
   */
  const fetchContextualExplanation = useCallback(async (ent, ctx) => {
    if (!ent) return;
    const currentReqId = ++requestCounterRef.current;

    setLoadingTier2(true);
    setErrorTier2(null);

    try {
      const res = await inspectQuantumEntity({
        entityId: ent.id,
        rawSelection: ent.rawSelection,
        category: ent.category,
        source: {
          surface: ctx?.surface || "micro-module",
          route: ctx?.route || window.location.pathname,
          moduleId: ctx?.moduleId || null,
          lessonTitle: ctx?.lessonTitle || null,
          algorithmId: ctx?.algorithmId || null,
          algorithmName: ctx?.algorithmName || null,
          activeTab: ctx?.activeTab || null,
          stepName: ctx?.stepName || null,
          gateType: ctx?.gateType || null,
          qubitIndex: ctx?.qubitIndex !== undefined ? ctx?.qubitIndex : null,
          layerIndex: ctx?.layerIndex !== undefined ? ctx?.layerIndex : null,
          controlQubit: ctx?.controlQubit !== undefined ? ctx?.controlQubit : null,
          targetQubit: ctx?.targetQubit !== undefined ? ctx?.targetQubit : null,
          precedingGatesOnQubit: ctx?.precedingGatesOnQubit || null,
          succeedingGatesOnQubit: ctx?.succeedingGatesOnQubit || null,
          concurrentGatesInLayer: ctx?.concurrentGatesInLayer || null,
          circuitDepth: ctx?.circuitDepth || null,
          totalQubits: ctx?.totalQubits || null,
          // Noise Lab fields
          noiseModel: ctx?.noiseModel || null,
          noiseStrength: ctx?.noiseStrength !== undefined ? ctx?.noiseStrength : null,
          strengthPct: ctx?.strengthPct !== undefined ? ctx?.strengthPct : null,
          stepIndex: ctx?.stepIndex !== undefined ? ctx?.stepIndex : null,
          totalSteps: ctx?.totalSteps !== undefined ? ctx?.totalSteps : null,
          appliedGate: ctx?.appliedGate || null,
          selectedQubit: ctx?.selectedQubit !== undefined ? ctx?.selectedQubit : null,
          targetMetric: ctx?.targetMetric || null,
          fidelity: ctx?.fidelity !== undefined ? ctx?.fidelity : null,
          divergence: ctx?.divergence !== undefined ? ctx?.divergence : null,
          purityDelta: ctx?.purityDelta !== undefined ? ctx?.purityDelta : null,
          maxBlochDistance: ctx?.maxBlochDistance !== undefined ? ctx?.maxBlochDistance : null,
          idealBloch: ctx?.idealBloch || null,
          noisyBloch: ctx?.noisyBloch || null,
          firstMeaningfulDivergenceStep: ctx?.firstMeaningfulDivergenceStep !== undefined ? ctx?.firstMeaningfulDivergenceStep : null,
        },
        surroundingText: ctx?.surroundingText || "",
      });

      if (currentReqId !== requestCounterRef.current) return;

      if (res && res.explanation) {
        let explanation = res.explanation;

        // If explanation is a string, attempt safe parse
        if (typeof explanation === "string") {
          try {
            explanation = JSON.parse(explanation);
          } catch {
            explanation = { contextualRole: explanation };
          }
        }

        // Guard against raw JSON string in contextualRole
        if (explanation?.contextualRole && typeof explanation.contextualRole === "string") {
          const trimmed = explanation.contextualRole.trim();
          if (trimmed.startsWith("{") && (trimmed.includes('"quickMeaning"') || trimmed.includes('"contextualRole"'))) {
            try {
              const innerParsed = JSON.parse(trimmed);
              explanation = {
                quickMeaning: innerParsed.quickMeaning || explanation.quickMeaning || "",
                intuition: innerParsed.intuition || explanation.intuition || "",
                mathematics: innerParsed.mathematics || explanation.mathematics || "",
                contextualRole: innerParsed.contextualRole || "",
                suggestedTutorQuestion: innerParsed.suggestedTutorQuestion || explanation.suggestedTutorQuestion || "",
              };
            } catch {
              explanation.contextualRole = "";
            }
          }
        }

        setTier2Data(explanation);
      } else {
        throw new Error("Invalid response format from Context Lens explainer.");
      }
    } catch (err) {
      if (currentReqId !== requestCounterRef.current) return;
      console.warn("[ContextLens] Tier 2 explanation request failed:", err.message);
      setErrorTier2("Contextual analysis is currently unavailable. Displaying standard knowledge.");
    } finally {
      if (currentReqId === requestCounterRef.current) {
        setLoadingTier2(false);
      }
    }
  }, []);

  /**
   * Opens the Contextual Lens for an entity or raw text query.
   * Performs Tier 1 local resolution immediately with zero network delay,
   * and auto-triggers Tier 2 contextual grounding in the background.
   */
  const openLens = useCallback(
    (entityOrQuery, context = {}) => {
      if (!isFeatureEnabled) return;

      let entity = null;
      let rawText = "";

      if (typeof entityOrQuery === "string") {
        rawText = entityOrQuery;
        entity = resolveCanonicalEntity(rawText);
      } else if (entityOrQuery && typeof entityOrQuery === "object") {
        rawText = entityOrQuery.rawSelection || entityOrQuery.id || entityOrQuery.displayName || "";
        entity = entityOrQuery.id ? resolveCanonicalEntity(entityOrQuery.id) || entityOrQuery : resolveCanonicalEntity(rawText);
      }

      let targetEntity = null;

      // If canonical entity was resolved from ontology, use it with any caller-provided overrides
      if (entity) {
        const customObj = (entityOrQuery && typeof entityOrQuery === "object") ? entityOrQuery : {};
        const effectiveEntity = {
          ...entity,
          displayName: customObj.displayName || entity.displayName,
          symbol: customObj.symbol !== undefined ? customObj.symbol : entity.symbol,
          quickMeaning: customObj.quickMeaning || entity.quickMeaning,
          mathematics: customObj.mathematics || entity.mathematics,
          intuition: customObj.intuition || entity.intuition,
          whyItMatters: customObj.whyItMatters || entity.whyItMatters,
        };

        targetEntity = {
          id: customObj.id || entity.id,
          displayName: effectiveEntity.displayName,
          category: effectiveEntity.category || "concept",
          symbol: effectiveEntity.symbol || null,
          rawSelection: rawText,
        };
        setActiveEntity(targetEntity);
        setTier1Data(effectiveEntity);
      } else {
        // Fallback for unmapped free-text selection
        const fallback = {
          id: rawText.toLowerCase().replace(/\s+/g, "-"),
          displayName: rawText,
          category: "concept",
          symbol: null,
          rawSelection: rawText,
          quickMeaning: `Quantum concept: "${rawText}".`,
          intuition: "Contextual explanation is loading below.",
          mathematics: null,
          whyItMatters: null,
          learnUrl: null,
          visualizeUrl: null,
          experimentUrl: null,
        };
        targetEntity = fallback;
        setActiveEntity(fallback);
        setTier1Data(fallback);
      }

      const targetContext = {
        surface: context.surface || "micro-module",
        route: context.route || window.location.pathname,
        moduleId: context.moduleId || null,
        lessonTitle: context.lessonTitle || null,
        algorithmId: context.algorithmId || null,
        algorithmName: context.algorithmName || null,
        activeTab: context.activeTab || null,
        stepName: context.stepName || null,
        gateType: context.gateType || null,
        gateLabel: context.gateLabel || null,
        qubitIndex: context.qubitIndex !== undefined ? context.qubitIndex : null,
        layerIndex: context.layerIndex !== undefined ? context.layerIndex : null,
        controlQubit: context.controlQubit !== undefined ? context.controlQubit : null,
        targetQubit: context.targetQubit !== undefined ? context.targetQubit : null,
        precedingGatesOnQubit: context.precedingGatesOnQubit || null,
        succeedingGatesOnQubit: context.succeedingGatesOnQubit || null,
        concurrentGatesInLayer: context.concurrentGatesInLayer || null,
        circuitDepth: context.circuitDepth || null,
        totalQubits: context.totalQubits || null,
        // Noise Lab fields
        targetMetric: context.targetMetric || null,
        noiseModel: context.noiseModel || null,
        noiseStrength: context.noiseStrength !== undefined ? context.noiseStrength : null,
        strengthPct: context.strengthPct !== undefined ? context.strengthPct : null,
        stepIndex: context.stepIndex !== undefined ? context.stepIndex : null,
        totalSteps: context.totalSteps !== undefined ? context.totalSteps : null,
        appliedGate: context.appliedGate || null,
        selectedQubit: context.selectedQubit !== undefined ? context.selectedQubit : null,
        fidelity: context.fidelity !== undefined ? context.fidelity : null,
        divergence: context.divergence !== undefined ? context.divergence : null,
        purityDelta: context.purityDelta !== undefined ? context.purityDelta : null,
        maxBlochDistance: context.maxBlochDistance !== undefined ? context.maxBlochDistance : null,
        idealBloch: context.idealBloch || null,
        noisyBloch: context.noisyBloch || null,
        firstMeaningfulDivergenceStep: context.firstMeaningfulDivergenceStep !== undefined ? context.firstMeaningfulDivergenceStep : null,
        surroundingText: (context.surroundingText || "").slice(0, 300),
      };

      setActiveContext(targetContext);
      setTier2Data(null);
      setErrorTier2(null);
      setIsOpen(true);

      // Auto-fetch Tier 2 contextual lesson grounding in the background (Option A)
      fetchContextualExplanation(targetEntity, targetContext);
    },
    [isFeatureEnabled, fetchContextualExplanation]
  );

  /**
   * Closes the Contextual Lens.
   */
  const closeLens = useCallback(() => {
    setIsOpen(false);
  }, []);

  /**
   * Retries or requests a Tier 2 contextual explanation on demand.
   */
  const requestDeepExplanation = useCallback(() => {
    const { activeEntity: ent, activeContext: ctx } = stateRef.current;
    if (ent) {
      fetchContextualExplanation(ent, ctx);
    }
  }, [fetchContextualExplanation]);

  /**
   * Explicit, safe handoff to the existing AI Tutor.
   * Closes the Lens and opens the Tutor with pre-seeded context.
   */
  const handoffToAITutor = useCallback(
    (openTutorFn) => {
      if (typeof openTutorFn !== "function") {
        console.warn("[ContextLens] Cannot handoff: openTutor is not a function.");
        return;
      }

      const entityName = activeEntity?.displayName || activeEntity?.rawSelection || "this concept";
      const seedQuestion =
        tier2Data?.suggestedTutorQuestion ||
        `Can you explain ${entityName} and how it works in more detail?`;

      const tutorContext = {
        source: activeContext?.surface || "micro-module",
        topic: {
          topicId: activeEntity?.id || "quantum-concept",
          title: entityName,
          category: activeEntity?.category || "Concept",
          description: tier1Data?.quickMeaning || null,
        },
        resource: activeContext?.moduleId
          ? {
              type: "micro_module",
              id: activeContext.moduleId,
              title: activeContext.lessonTitle || null,
            }
          : null,
      };

      // 1. Close the Context Lens first
      closeLens();

      // 2. Open the AI Tutor cleanly with seeded intent
      openTutorFn(seedQuestion, tutorContext);
    },
    [activeEntity, activeContext, tier1Data, tier2Data, closeLens]
  );

  const value = {
    isFeatureEnabled,
    isOpen,
    activeEntity,
    activeContext,
    tier1Data,
    tier2Data,
    loadingTier2,
    errorTier2,
    openLens,
    closeLens,
    requestDeepExplanation,
    handoffToAITutor,
  };

  return (
    <QuantumContextLensContext.Provider value={value}>
      {children}
    </QuantumContextLensContext.Provider>
  );
}

export function useQuantumContextLens() {
  const context = useContext(QuantumContextLensContext);
  if (!context) {
    // Return safe no-op fallback if used outside provider
    return {
      isFeatureEnabled: false,
      isOpen: false,
      activeEntity: null,
      activeContext: null,
      tier1Data: null,
      tier2Data: null,
      loadingTier2: false,
      errorTier2: null,
      openLens: () => {},
      closeLens: () => {},
      requestDeepExplanation: () => {},
      handoffToAITutor: () => {},
    };
  }
  return context;
}

export default QuantumContextLensContext;
