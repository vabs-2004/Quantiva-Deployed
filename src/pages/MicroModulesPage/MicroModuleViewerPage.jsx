import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  getMicroModules,
  getMicroModuleById,
  updateMicroModuleProgress,
  getMyProgress,
  bookmarkMicroModule,
  unbookmarkMicroModule,
} from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useAITutor } from "../../context/AITutorContext";
import MathHTMLContainer from "../../components/MathHTMLContainer/MathHTMLContainer";
import WhyQuantumLesson from "./modules/WhyQuantumLesson";
import MathematicalFoundationsLesson from "./modules/MathematicalFoundationsLesson";
import QubitsQuantumStatesLesson from "./modules/QubitsQuantumStatesLesson";
import DiracNotationLesson from "./modules/DiracNotationLesson";
import AmplitudesPhaseLesson from "./modules/AmplitudesPhaseLesson";
import BlochSphereLesson from "./modules/BlochSphereLesson";
import QuantumGatesLesson from "./modules/QuantumGatesLesson";
import QuantumCircuitsLesson from "./modules/QuantumCircuitsLesson";
import SuperpositionLesson from "./modules/SuperpositionLesson";
import MeasurementCollapseLesson from "./modules/MeasurementCollapseLesson";
import EntanglementLesson from "./modules/EntanglementLesson";
import BellStatesLesson from "./modules/BellStatesLesson";
import TopicNavigator from "../../components/TopicNavigator/TopicNavigator";

export default function MicroModuleViewerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const { openTutor } = useAITutor();

  const [moduleItem, setModuleItem] = useState(null);
  const [allModules, setAllModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userStatus, setUserStatus] = useState("not_started");
  const [updating, setUpdating] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkUpdating, setBookmarkUpdating] = useState(false);
  const [toastInfo, setToastInfo] = useState(null);

  useEffect(() => {
    async function loadModule() {
      try {
        setLoading(true);
        const [mod, allMods, progData] = await Promise.all([
          getMicroModuleById(id),
          getMicroModules("foundations"),
          isLoggedIn ? getMyProgress().catch(() => null) : Promise.resolve(null),
        ]);

        setModuleItem(mod);
        setAllModules(Array.isArray(allMods) ? allMods : []);

        if (progData && progData.progress) {
          // Check bookmark status
          const isBm = (progData.progress.bookmarkedMicroModules || []).some(
            (b) => b.moduleId === id
          );
          setIsBookmarked(isBm);

          const entry = (progData.progress.microModuleProgress || []).find((m) => m.moduleId === id);
          if (entry) {
            setUserStatus(entry.status);
          } else if (isLoggedIn) {
            // First time opening establishing in_progress
            setUserStatus("in_progress");
            updateMicroModuleProgress(id, "in_progress").catch(() => {});
          }
        }
      } catch (err) {
        console.error("Failed to load module details:", err);
      } finally {
        setLoading(false);
      }
    }
    loadModule();
  }, [id, isLoggedIn]);

  const showToast = (msg, isError = false) => {
    setToastInfo({ message: msg, isError });
    setTimeout(() => setToastInfo(null), 3500);
  };

  const handleToggleBookmark = async () => {
    if (!isLoggedIn) {
      showToast("Please log in to bookmark micro-modules", true);
      return;
    }
    if (bookmarkUpdating) return;

    const prevBookmarked = isBookmarked;
    const nextBookmarked = !prevBookmarked;

    // 1. Optimistic UI update
    setIsBookmarked(nextBookmarked);
    setBookmarkUpdating(true);
    showToast(nextBookmarked ? "🔖 Added to bookmarks" : "Removed from bookmarks", false);

    // 2. Persist to API
    try {
      if (nextBookmarked) {
        await bookmarkMicroModule(id);
      } else {
        await unbookmarkMicroModule(id);
      }
    } catch (err) {
      console.error("Failed to update bookmark:", err);
      // Rollback on failure!
      setIsBookmarked(prevBookmarked);
      showToast("⚠️ Failed to update bookmark. Changes rolled back.", true);
    } finally {
      setBookmarkUpdating(false);
    }
  };

  const handleMarkComplete = async () => {
    if (!isLoggedIn || updating) return;
    setUpdating(true);
    try {
      const res = await updateMicroModuleProgress(id, "completed");
      if (res.success) {
        setUserStatus("completed");
        showToast("✓ Marked as complete!");
      }
    } catch (err) {
      console.error("Failed to mark complete:", err);
    } finally {
      setUpdating(false);
    }
  };

  const handleSkipModule = async () => {
    if (!isLoggedIn || updating) return;
    setUpdating(true);
    try {
      const res = await updateMicroModuleProgress(id, "skipped");
      if (res.success) {
        setUserStatus("skipped");
        showToast("⏭ Module skipped — I already know this");
      }
    } catch (err) {
      console.error("Failed to skip module:", err);
    } finally {
      setUpdating(false);
    }
  };

  const handleAskQuantiva = () => {
    if (!moduleItem) return;
    openTutor(null, {
      source: "micro-module",
      topic: {
        topicId: moduleItem.moduleId,
        title: moduleItem.title,
        category: `${moduleItem.track || "Foundations"} Track`,
        description: moduleItem.description || null,
      },
      resource: {
        type: "micro_module",
        id: moduleItem.moduleId,
        title: moduleItem.title,
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 text-center text-sm font-semibold text-[var(--color-app-text-muted)] animate-pulse">
        Loading micro-module...
      </div>
    );
  }

  if (!moduleItem) {
    return (
      <div className="min-h-screen pt-24 text-center max-w-md mx-auto px-4">
        <h2 className="text-xl font-bold text-[var(--color-app-text-main)] mb-2">Micro-module not found</h2>
        <p className="text-xs text-[var(--color-app-text-muted)] mb-6">The requested learning module does not exist in the registry.</p>
        <Link to="/micro-modules" className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-[var(--color-app-primary)]">
          ← Back to Micro Modules
        </Link>
      </div>
    );
  }

  // Determine non-gated Previous and Next modules
  const currentIndex = allModules.findIndex((m) => m.moduleId === moduleItem.moduleId);
  const prevModule = currentIndex > 0 ? allModules[currentIndex - 1] : null;
  const nextModule = currentIndex >= 0 && currentIndex < allModules.length - 1 ? allModules[currentIndex + 1] : null;

  return (
    <div
      data-lens-surface="micro-module"
      className="min-h-screen pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto"
    >
      {/* Toast Notification */}
      {toastInfo && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`fixed top-20 right-6 z-50 px-4 py-2.5 rounded-xl border text-xs font-bold text-white shadow-2xl backdrop-blur-md ${
            toastInfo.isError
              ? "bg-red-950/90 border-red-500/40 text-red-200"
              : "bg-black/90 border-white/20"
          }`}
        >
          {toastInfo.message}
        </motion.div>
      )}

      {/* Top Breadcrumb */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          to="/micro-modules"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-app-text-muted)] hover:text-[var(--color-app-primary)] transition-colors"
        >
          <span>←</span> Back to Micro Modules
        </Link>
        <div className="text-[11px] font-mono font-bold px-3 py-1 rounded-full border border-white/10 bg-black/20 text-[var(--color-app-text-muted)]">
          Module {String(moduleItem.sequenceOrder).padStart(2, "0")} of 12
        </div>
      </div>

      {/* Module Title & Status Banner */}
      <div className="rounded-2xl p-6 sm:p-8 app-glass border border-[var(--color-app-border)] mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-app-primary)]">
                {moduleItem.track} Track
              </span>
              <span className="text-xs text-[var(--color-app-text-light)]">•</span>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                userStatus === "completed"
                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                  : userStatus === "skipped"
                  ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                  : userStatus === "in_progress"
                  ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                  : "bg-zinc-800 text-zinc-400 border-zinc-700"
              }`}>
                {userStatus === "completed"
                  ? "Status: Completed ✓"
                  : userStatus === "skipped"
                  ? "Status: Skipped ⏭"
                  : userStatus === "in_progress"
                  ? "Status: In Progress"
                  : "Status: Not Started"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-app-text-main)]">
              {moduleItem.title}
            </h1>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center flex-wrap">
            {/* Authoritative Bookmark Toggle */}
            <button
              onClick={handleToggleBookmark}
              disabled={bookmarkUpdating}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                isBookmarked
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                  : "bg-white/5 text-[var(--color-app-text-muted)] border-white/10 hover:border-white/25 hover:text-white"
              }`}
              title={isBookmarked ? "Remove bookmark" : "Bookmark this module for later"}
            >
              <span>{isBookmarked ? "🔖" : "🏷️"}</span>
              <span>{isBookmarked ? "Bookmarked" : "Bookmark"}</span>
            </button>

            {/* Action Hook: Ask Quantiva */}
            <button
              onClick={handleAskQuantiva}
              className="px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 shrink-0"
              style={{
                borderColor: "var(--color-app-accent)",
                background: "rgba(99,102,241,0.1)",
                color: "var(--color-app-accent)",
              }}
            >
              <span>✨</span> Ask Quantiva
            </button>
          </div>
        </div>

        <p className="text-sm text-[var(--color-app-text-muted)] leading-relaxed mb-6">
          {moduleItem.description}
        </p>

        {/* Action Controls: Mark Complete & Skip */}
        {isLoggedIn && (
          <div className="pt-4 border-t border-[var(--color-app-border-light)] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {userStatus === "completed" ? (
                <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 border border-green-500/30 flex items-center gap-1.5">
                  ✓ Completed
                </span>
              ) : (
                <button
                  onClick={handleMarkComplete}
                  disabled={updating}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-white transition-all hover:scale-105 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
                >
                  ✓ Mark as Complete
                </button>
              )}

              {userStatus === "skipped" ? (
                <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
                  ⏭ Skipped — already know this
                </span>
              ) : (
                <button
                  onClick={handleSkipModule}
                  disabled={updating || userStatus === "completed"}
                  className="px-3 py-2 rounded-lg text-xs font-semibold border border-[var(--color-app-border)] hover:bg-[var(--color-app-surface-hover)] text-[var(--color-app-text-muted)] disabled:opacity-40"
                >
                  Skip this module — I already know this
                </button>
              )}
            </div>

            <span className="text-[11px] text-[var(--color-app-text-light)]">
              {userStatus === "completed" ? "Review Mode Active" : "Freely explore without prerequisite limits"}
            </span>
          </div>
        )}
      </div>

      {/* Interactive Module Lesson Canvas */}
      {moduleItem.moduleId === "why-quantum" ? (
        <div className="mb-10">
          <WhyQuantumLesson
            onComplete={handleMarkComplete}
            isCompleted={userStatus === "completed"}
            onAskQuantiva={handleAskQuantiva}
          />
        </div>
      ) : moduleItem.moduleId === "mathematical-foundations" ? (
        <div className="mb-10">
          <MathematicalFoundationsLesson
            onComplete={handleMarkComplete}
            isCompleted={userStatus === "completed"}
            onAskQuantiva={handleAskQuantiva}
          />
        </div>
      ) : moduleItem.moduleId === "qubits-quantum-states" ? (
        <div className="mb-10">
          <QubitsQuantumStatesLesson
            onComplete={handleMarkComplete}
            isCompleted={userStatus === "completed"}
            onAskQuantiva={handleAskQuantiva}
          />
        </div>
      ) : moduleItem.moduleId === "dirac-notation" ? (
        <div className="mb-10">
          <DiracNotationLesson
            onComplete={handleMarkComplete}
            isCompleted={userStatus === "completed"}
            onAskQuantiva={handleAskQuantiva}
          />
        </div>
      ) : moduleItem.moduleId === "amplitudes-phase" ? (
        <div className="mb-10">
          <AmplitudesPhaseLesson
            onComplete={handleMarkComplete}
            isCompleted={userStatus === "completed"}
            onAskQuantiva={handleAskQuantiva}
          />
        </div>
      ) : moduleItem.moduleId === "bloch-sphere" ? (
        <div className="mb-10">
          <BlochSphereLesson
            onComplete={handleMarkComplete}
            isCompleted={userStatus === "completed"}
            onAskQuantiva={handleAskQuantiva}
          />
        </div>
      ) : moduleItem.moduleId === "quantum-gates" ? (
        <div className="mb-10">
          <QuantumGatesLesson
            onComplete={handleMarkComplete}
            isCompleted={userStatus === "completed"}
            onAskQuantiva={handleAskQuantiva}
          />
        </div>
      ) : moduleItem.moduleId === "quantum-circuits" ? (
        <div className="mb-10">
          <QuantumCircuitsLesson
            onComplete={handleMarkComplete}
            isCompleted={userStatus === "completed"}
            onAskQuantiva={handleAskQuantiva}
          />
        </div>
      ) : moduleItem.moduleId === "superposition" ? (
        <div className="mb-10">
          <SuperpositionLesson
            onComplete={handleMarkComplete}
            isCompleted={userStatus === "completed"}
            onAskQuantiva={handleAskQuantiva}
          />
        </div>
      ) : moduleItem.moduleId === "measurement-collapse" ? (
        <div className="mb-10">
          <MeasurementCollapseLesson
            onComplete={handleMarkComplete}
            isCompleted={userStatus === "completed"}
            onAskQuantiva={handleAskQuantiva}
          />
        </div>
      ) : moduleItem.moduleId === "entanglement" ? (
        <div className="mb-10">
          <EntanglementLesson
            onComplete={handleMarkComplete}
            isCompleted={userStatus === "completed"}
            onAskQuantiva={handleAskQuantiva}
          />
        </div>
      ) : moduleItem.moduleId === "bell-states" ? (
        <div className="mb-10">
          <BellStatesLesson
            onComplete={handleMarkComplete}
            isCompleted={userStatus === "completed"}
            onAskQuantiva={handleAskQuantiva}
          />
        </div>
      ) : (
        <div className="rounded-2xl p-6 sm:p-8 app-glass border border-[var(--color-app-border)] mb-8">
          <h2 className="text-lg font-bold text-[var(--color-app-text-main)] mb-4">
            Core Overview & Objectives
          </h2>
          <div className="prose prose-invert text-xs sm:text-sm text-[var(--color-app-text-muted)] leading-relaxed space-y-4">
            <p>
              Welcome to <strong>{moduleItem.title}</strong>, milestone #{moduleItem.sequenceOrder} in the Quantiva Quantum Foundations curriculum.
            </p>
            <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-2">
              <h4 className="text-xs font-bold text-[var(--color-app-text-main)] uppercase tracking-wider">
                What you will learn in this micro-module:
              </h4>
              <ul className="list-disc pl-5 space-y-1">
                <li>Intuitive physical principles underlying {moduleItem.title.toLowerCase()}.</li>
                <li>Mathematical representation using Dirac notation and state vectors.</li>
                <li>Hands-on experimentation with quantum transformations.</li>
              </ul>
            </div>
            <p className="text-xs italic text-[var(--color-app-text-light)]">
              Detailed interactive lessons and mathematical simulations for this module are slated for Phase 7B. You can mark this module complete or skip it to advance your journey telemetry at any time.
            </p>
          </div>
        </div>
      )}

      {/* Contextual Topic Navigator (Phase 7F) */}
      <TopicNavigator
        resourceType="micro_module"
        resourceId={id}
        titleOverride={moduleItem?.title}
      />

      {/* Non-Gated Previous / Next Navigation */}
      <div className="flex items-center justify-between gap-4 pt-4 border-t border-[var(--color-app-border)]">
        {prevModule ? (
          <Link
            to={`/micro-modules/${prevModule.moduleId}`}
            className="flex items-center gap-2 text-xs font-bold text-[var(--color-app-text-muted)] hover:text-white transition-colors"
          >
            <span>←</span> Module {prevModule.sequenceOrder}: {prevModule.title}
          </Link>
        ) : (
          <div />
        )}

        {nextModule ? (
          <Link
            to={`/micro-modules/${nextModule.moduleId}`}
            className="flex items-center gap-2 text-xs font-bold text-[var(--color-app-primary)] hover:underline transition-colors"
          >
            Module {nextModule.sequenceOrder}: {nextModule.title} <span>→</span>
          </Link>
        ) : (
          <Link
            to="/micro-modules"
            className="text-xs font-bold text-green-400 hover:underline"
          >
            Back to Curriculum Overview ✓
          </Link>
        )}
      </div>
    </div>
  );
}
