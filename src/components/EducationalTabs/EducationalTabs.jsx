import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { getEducationalContent, updateEducationalContent } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import Prism from "prismjs";
import "prismjs/components/prism-python";
import "katex/dist/katex.min.css";
import MathHTMLContainer from "../MathHTMLContainer/MathHTMLContainer";
import RichTextEditor from "../RichTextEditor/RichTextEditor";
import { motion, AnimatePresence } from "framer-motion";

const TABS = [
  { id: "description", label: "Description" },
  { id: "problemDescription", label: "Problem Definition" },
  { id: "algorithm", label: "Algorithm Details" },
  { id: "geometricProof", label: "Geometric Proof" },
  { id: "algebraicProof", label: "Algebraic Proof" },
  { id: "code", label: "Code" },
];


export default function EducationalTabs({ algorithmId }) {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [expandedImage, setExpandedImage] = useState(null);

  // Admin Editing State
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const { uploadImage, API_SERVER_URL } = await import("../../services/api");
      const res = await uploadImage(file);
      const imgUrl = res.url.startsWith('http') ? res.url : `${API_SERVER_URL}${res.url}`;
      const imgTag = `\n<img src="${imgUrl}" alt="Uploaded Photo" class="my-4 rounded-lg shadow-lg border border-[var(--color-app-input-border)]" style="max-width: 100%; height: auto;" />\n`;
      setEditValue(prev => prev + imgTag);
      
    } catch (error) {
      console.error("Failed to upload image", error);
      alert("Failed to upload image.");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (!file) continue;
        
        e.preventDefault();
        try {
          setUploadingImage(true);
          const { uploadImage, API_SERVER_URL } = await import("../../services/api");
          const res = await uploadImage(file);
          const imgUrl = res.url.startsWith('http') ? res.url : `${API_SERVER_URL}${res.url}`;
          const imgTag = `\n<img src="${imgUrl}" alt="Pasted Photo" class="my-4 rounded-lg shadow-lg border border-[var(--color-app-border)]" style="max-width: 100%; height: auto;" />\n`;
          
          const textarea = e.target;
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          
          if (start !== undefined && end !== undefined) {
            setEditValue(prev => prev.substring(0, start) + imgTag + prev.substring(end));
            setTimeout(() => {
              textarea.selectionStart = textarea.selectionEnd = start + imgTag.length;
            }, 0);
          } else {
            setEditValue(prev => prev + imgTag);
          }
        } catch (error) {
          console.error("Failed to upload pasted image", error);
          alert("Failed to upload pasted image.");
        } finally {
          setUploadingImage(false);
        }
        break;
      }
    }
  };

  const contentRef = useRef(null);

  // Fetch content
  useEffect(() => {
    async function fetchContent() {
      setLoading(true);
      setContent(null); // Clear old content
      try {
        const data = await getEducationalContent(algorithmId);
        setContent(data);
      } catch (err) {
        console.error("Failed to fetch educational content", err);
      } finally {
        setLoading(false);
      }
    }
    if (algorithmId) fetchContent();
  }, [algorithmId]);

  // Syntax Highlighting
  useLayoutEffect(() => {
    if (isEditing || loading || !content) return;

    if (activeTab === "code") {
      Prism.highlightAll();
    }
  }, [activeTab, content, isEditing, loading]);

  // Enter edit mode
  const handleEdit = () => {
    setEditValue(content[activeTab] || "");
    setIsEditing(true);
  };

  // Save changes
  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedData = { ...content, [activeTab]: editValue };
      const savedData = await updateEducationalContent(algorithmId, updatedData);
      setContent(savedData);
      setIsEditing(false);
    } catch (err) {
      alert("Failed to save content");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mb-10 app-glass rounded-xl h-64 flex items-center justify-center">
        <span className="text-[var(--color-app-text-muted)] animate-pulse">Loading content...</span>
      </div>
    );
  }

  if (!content) return null;

  return (
    <div
      data-lens-active-tab={activeTab}
      className="mb-10 app-glass rounded-xl overflow-hidden shadow-lg bg-[var(--color-app-surface)]/70 relative"
    >
      {/* Header Tabs */}
      <div className="flex items-center justify-between border-b border-[var(--color-app-border)] bg-black/20 pr-4">
        <div className="flex overflow-x-auto custom-scrollbar">
          {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                if (isEditing && !window.confirm("Discard changes?")) return;
                setActiveTab(tab.id);
                setIsEditing(false);
              }}
              className={`whitespace-nowrap px-6 py-4 text-sm font-bold transition-all border-b-2 ${
                isActive
                  ? "border-[var(--color-app-primary)] text-[var(--color-app-primary)] bg-[var(--color-app-input-bg)]"
                  : "border-transparent text-[var(--color-app-text-muted)] hover:text-[var(--color-app-text-main)] hover:bg-[var(--color-app-input-bg)]"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
        </div>
        {isAdmin && !isEditing && (
          <button
            onClick={handleEdit}
            className="ml-4 whitespace-nowrap rounded-lg bg-blue-500/20 px-4 py-1.5 text-xs font-bold text-blue-400 hover:bg-blue-500/30 transition-colors border border-blue-500/30"
          >
            ✏️ Edit Tab
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="p-6 md:p-8 min-h-[300px]">
        <AnimatePresence mode="wait">
          {isEditing ? (
            <motion.div
              key="edit"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-4 h-full"
            >
              <div className="flex justify-between items-center text-xs text-yellow-400 font-bold bg-yellow-400/10 px-3 py-2 rounded">
                <span>Editing HTML/LaTeX for: {TABS.find((t) => t.id === activeTab).label}</span>
                <div className="flex gap-2 items-center">
                  <button onClick={() => setIsEditing(false)} className="text-[var(--color-app-text-muted)] hover:text-[var(--color-app-text-main)]">Cancel</button>
                  <button 
                    onClick={handleSave} 
                    disabled={saving}
                    className="bg-green-500/20 text-green-400 px-3 py-1 rounded border border-green-500/30 hover:bg-green-500/30 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
              
              <div className="flex-1 mt-2">
                <RichTextEditor 
                  value={editValue}
                  onChange={setEditValue}
                  placeholder="Enter content here... (LaTeX math is supported, just wrap in $$ $$)"
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={`${algorithmId}-${activeTab}`}
              ref={contentRef}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "code" ? (
                <div className="rounded-none overflow-hidden bg-[#161616] border border-[#333333] shadow-inner relative mt-6 mb-6">
                  <button 
                    onClick={(e) => {
                      const codeText = content.code || "# Code implementation not available yet for this algorithm.\\n# Check the Sandbox to write your own!";
                      navigator.clipboard.writeText(codeText);
                      const btn = e.currentTarget;
                      const copyIcon = `<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>`;
                      const checkIcon = `<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 13l4 4L19 7"></path></svg>`;
                      btn.innerHTML = checkIcon;
                      btn.classList.add('!text-[#4ade80]');
                      setTimeout(() => { btn.innerHTML = copyIcon; btn.classList.remove('!text-[#4ade80]'); }, 2000);
                    }}
                    className="absolute top-3 right-3 text-[#8c8c8c] hover:text-white bg-transparent hover:bg-white/10 p-1.5 rounded flex items-center justify-center transition-all z-10"
                    title="Copy to clipboard"
                  >
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                  </button>
                  <pre className="!m-0 !p-5 !pr-12 !bg-transparent text-[#f4f4f4] text-[0.85rem] font-mono whitespace-pre-wrap">
                    <code className="language-python">
                      {content.code || "# Code implementation not available yet for this algorithm.\n# Check the Sandbox to write your own!"}
                    </code>
                  </pre>
                </div>
              ) : (
                <div className="ql-snow">
                  <div className="ql-editor p-0 text-[var(--color-app-text-main)]" style={{ minHeight: 'auto', fontSize: '1.05rem', lineHeight: '1.7' }}>
                    <MathHTMLContainer html={content[activeTab] || "<p>No content available.</p>"} onImageClick={setExpandedImage} />
                  </div>
                </div>  
              )}
                  
                  {/* Append apps/limitations on description tab */}
                  {activeTab === "description" && content.applications?.length > 0 && (
                    <div className="mt-8">
                      <h4 className="font-bold mb-3 text-[var(--color-app-accent)] uppercase tracking-widest text-xs">Applications</h4>
                      <ul className="list-disc pl-5 space-y-2 text-[var(--color-app-text-main)]">
                        {content.applications.map((app, idx) => (
                          <li key={idx}>{app}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {activeTab === "description" && content.limitations?.length > 0 && (
                    <div className="mt-8">
                      <h4 className="font-bold mb-3 text-red-400 uppercase tracking-widest text-xs">Limitations</h4>
                      <ul className="list-disc pl-5 space-y-2 text-[var(--color-app-text-main)]">
                        {content.limitations.map((lim, idx) => (
                          <li key={idx}>{lim}</li>
                        ))}
                      </ul>
                    </div>
                  )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Lightbox Modal for Expanded Images */}
      {expandedImage && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-zoom-out"
          onClick={() => setExpandedImage(null)}
        >
          <img 
            src={expandedImage} 
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl border border-white/20 bg-black" 
            alt="Expanded view" 
          />
          <button 
            className="absolute top-6 right-6 text-white bg-black/50 hover:bg-black/80 rounded-full w-10 h-10 flex items-center justify-center transition-colors border border-white/10"
            onClick={() => setExpandedImage(null)}
          >
            ✕
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}