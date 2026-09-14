import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAlgorithmContext } from "../../context/AlgorithmContext";
import { useAlgorithm } from "../../hooks/useAlgorithm";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import FormulaCard from "../../components/FormulaCard/FormulaCard";
import ParameterInput from "../../components/ParameterInput/ParameterInput";
import Button from "../../components/Button/Button";
import GraphViewer from "../../components/GraphViewer/GraphViewer";
import QuantumCircuitViewer from "../../components/QuantumCircuitViewer/QuantumCircuitViewer";
import OutputConsole from "../../components/OutputConsole/OutputConsole";
import MeasurementTable from "../../components/MeasurementTable/MeasurementTable";
import Loading from "../../components/Loading/Loading";
import EducationalTabs from "../../components/EducationalTabs/EducationalTabs";
import BlochImageViewer from "../../components/BlochImageViewer/BlochImageViewer";
import { bookmarkAlgorithm, unbookmarkAlgorithm, getMyProgress } from "../../services/api";
import { useState } from "react";
import { motion } from "framer-motion";
import TopicNavigator from "../../components/TopicNavigator/TopicNavigator";
import { useAITutor } from "../../context/AITutorContext";

export default function AlgorithmPage() {
  const { id } = useParams();
  const { openTutor } = useAITutor();
  const {
    selectedAlgorithm,
    selectAlgorithm,
    parameters,
    updateParameter,
    result,
    loading,
    error,
  } = useAlgorithmContext();
  const { execute, isRunning } = useAlgorithm();
  const { isAdmin, isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkUpdating, setBookmarkUpdating] = useState(false);
  const [toastInfo, setToastInfo] = useState(null);

  const showToast = (msg, isError = false) => {
    setToastInfo({ message: msg, isError });
    setTimeout(() => setToastInfo(null), 3000);
  };

  useEffect(() => {
    if (id) selectAlgorithm(id);
  }, [id, selectAlgorithm]);

  // Load bookmark status for this algorithm
  useEffect(() => {
    if (isLoggedIn && id) {
      getMyProgress()
        .then((data) => {
          if (data && data.progress && data.progress.bookmarkedAlgorithms) {
            const hasBm = data.progress.bookmarkedAlgorithms.some((b) => b.algorithmId === id);
            setIsBookmarked(hasBm);
          }
        })
        .catch(() => {});
    }
  }, [isLoggedIn, id]);

  const handleToggleBookmark = async () => {
    if (!isLoggedIn) {
      showToast("Please log in to bookmark algorithms", true);
      return;
    }
    if (bookmarkUpdating) return;

    const nextState = !isBookmarked;
    setIsBookmarked(nextState);
    setBookmarkUpdating(true);

    try {
      if (nextState) {
        await bookmarkAlgorithm(id);
        showToast("🔖 Algorithm bookmarked");
      } else {
        await unbookmarkAlgorithm(id);
        showToast("Removed from bookmarks");
      }
    } catch (err) {
      console.error("Failed to toggle algorithm bookmark:", err);
      setIsBookmarked(!nextState); // Rollback
      showToast("Failed to update bookmark", true);
    } finally {
      setBookmarkUpdating(false);
    }
  };

  const handleAskQuantiva = () => {
    if (!selectedAlgorithm) return;
    openTutor(null, {
      source: "algorithm",
      topic: {
        topicId: selectedAlgorithm.id,
        title: selectedAlgorithm.name,
        category: selectedAlgorithm.category,
        description: selectedAlgorithm.description,
      },
      resource: {
        type: "algorithm",
        id: selectedAlgorithm.id,
        title: selectedAlgorithm.name,
      },
    });
  };

  // Wait until the selectedAlgorithm in context matches the route ID
  if (!selectedAlgorithm || selectedAlgorithm.id !== id) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Loading visible={true} />
      </div>
    );
  }

  return (
    <div
      className="flex-1 overflow-y-auto bg-[var(--color-app-base)] relative"
      data-lenis-prevent="true"
      data-lens-surface="algorithm"
      data-lens-algorithm-id={selectedAlgorithm.id}
      data-lens-algorithm-name={selectedAlgorithm.name}
    >
      <Loading visible={loading} />

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

      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 inline-flex items-center rounded-full border border-[var(--color-app-accent)]/30 bg-[var(--color-app-accent)]/10 px-3 py-0.5 text-xs font-bold uppercase tracking-[0.15em] text-[var(--color-app-accent)]">
                {selectedAlgorithm.category}
              </div>
              <h1 className="text-3xl font-extrabold text-[var(--color-app-text-main)]">
                {selectedAlgorithm.name}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {/* Ask Quantiva Action Button */}
              <button
                onClick={handleAskQuantiva}
                className="px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer bg-white/5 text-[var(--color-app-text-muted)] border-white/10 hover:border-indigo-500/40 hover:text-white hover:bg-indigo-500/10"
                title="Ask Quantiva Tutor about this algorithm"
              >
                <span className="text-sm">✨</span>
                <span>Ask Quantiva</span>
              </button>

              {/* Algorithm Bookmark Toggle */}
              <button
                onClick={handleToggleBookmark}
                disabled={bookmarkUpdating}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                  isBookmarked
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                    : "bg-white/5 text-[var(--color-app-text-muted)] border-white/10 hover:border-white/25 hover:text-white"
                }`}
                title={isBookmarked ? "Remove bookmark" : "Bookmark this algorithm for later"}
              >
                <span>{isBookmarked ? "🔖" : "🏷️"}</span>
                <span>{isBookmarked ? "Bookmarked" : "Bookmark"}</span>
              </button>

              {isAdmin && (
                <button
                  onClick={() => navigate(`/admin/edit-algorithm/${selectedAlgorithm.id}`)}
                  className="rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 px-4 py-2 text-xs font-bold hover:bg-blue-500/30 transition-colors"
                >
                  ✏️ Edit Algorithm Data
                </button>
              )}
            </div>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-[var(--color-app-text-light)] max-w-3xl">
            {selectedAlgorithm.description}
          </p>

        {/* Educational Content Tabs */}
        <section className="mb-10">
          <EducationalTabs algorithmId={selectedAlgorithm.id} />
        </section>

        {/* Formula & Complexity */}
        <section className="mb-6">
          <FormulaCard
            formula={selectedAlgorithm.formula}
            timeComplexity={selectedAlgorithm.timeComplexity}
            spaceComplexity={selectedAlgorithm.spaceComplexity}
          />
        </section>

        {/* Applications */}
        {selectedAlgorithm.applications?.length > 0 && (
          <section className="mb-6">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-[var(--color-app-accent)]">
              Applications
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {selectedAlgorithm.applications.map((app) => (
                <span
                  key={app}
                  className="rounded-lg border border-[var(--color-app-border)] bg-[var(--color-app-surface-hover)] px-2.5 py-1 text-xs text-[var(--color-app-text-light)]"
                >
                  {app}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Reference */}
        {selectedAlgorithm.reference && (
          <section className="mb-6">
            <a
              href={selectedAlgorithm.reference}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-[var(--color-app-primary)] hover:underline"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View Reference Paper
            </a>
          </section>
        )}

        <div className="app-gradient-line my-6" />

        {/* Parameters */}
        <section className="mb-6">
          <h3 className="mb-3 text-xs font-bold text-[var(--color-app-text-main)]">
            Parameters
          </h3>
          <ParameterInput
            parameters={selectedAlgorithm.parameters}
            values={parameters}
            onChange={updateParameter}
          />
        </section>

        {/* Run Button */}
        <section className="mb-8">
          <Button
            variant="primary"
            size="lg"
            loading={isRunning}
            onClick={execute}
          >
            {isRunning ? "Running Simulation..." : "▶ Run Algorithm"}
          </Button>

          {error && (
            <p className="mt-3 text-xs text-[var(--color-app-error)] app-glass rounded-lg px-3 py-2 inline-block">
              {error}
            </p>
          )}
        </section>



        {/* Output Sections — shown when results are available */}
        {result && (
          <section className="space-y-6">
            <div className="app-gradient-line" />
            <h3 className="text-xs font-bold text-[var(--color-app-text-main)] pt-2 flex items-center gap-2">
              <svg className="h-5 w-5 text-[var(--color-app-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Simulation Results
            </h3>

            <div className="grid gap-4 lg:grid-cols-2">
              <GraphViewer graphData={result.graph} />
              <QuantumCircuitViewer circuitData={result.circuit} />
            </div>

            {/* 2D Static Bloch Sphere Tuning Image */}
            {result.blochImage && (
              <div className="mt-4">
                <BlochImageViewer blochImage={result.blochImage} />
              </div>
            )}

            <OutputConsole output={result.console} />
            <MeasurementTable measurements={result.measurements} />
          </section>
        )}

        {/* Contextual Topic Navigator (Phase 7F) */}
        <TopicNavigator
          resourceType="algorithm"
          resourceId={id}
          titleOverride={selectedAlgorithm?.name}
        />
      </div>
    </div>
  );
}
