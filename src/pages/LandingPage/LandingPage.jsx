import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import QuantumAtom3D from "../../components/QuantumAtom3D/QuantumAtom3D";
import { getNews, getBlogs } from "../../services/api";
import "./LandingPage.css";

/* ─── Animation Helpers ───────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.7, ease: "easeOut" },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const fadeIn = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

/* ─── Section wrapper with scroll animation ───────── */
function AnimatedSection({ children, className = "", delay = 0 }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

/* ─── Data ────────────────────────────────────────── */
const stats = [
  { value: "12+", label: "Algorithms" },
  { value: "3", label: "Sim Backends" },
  { value: "5", label: "Video Courses" },
  { value: "24/7", label: "AI Tutor" },
];

const features = [
  {
    icon: "🤖",
    title: "AI Tutor",
    description: "A Gemini-powered assistant built into every page — explains concepts on demand, reviews your circuits for bugs and optimizations, and recommends what to learn next based on your progress.",
    isNew: true,
  },
  {
    icon: "🔬",
    title: "Multi-Backend Simulation",
    description: "Run the same circuit on Qiskit Aer, PennyLane, or Cirq — or compare all three side-by-side and see how each backend reports the results.",
    isNew: true,
  },
  {
    icon: "🎓",
    title: "Courses & Certificates",
    description: "Structured video courses from IBM's own quantum curriculum, with per-lecture progress tracking and an auto-generated, downloadable Certificate of Completion.",
    isNew: true,
  },
  {
    icon: "⚛️",
    title: "Algorithm Library",
    description: "12+ pre-loaded quantum algorithms from Deutsch to Shor's, each with detailed theory, proofs, and interactive simulation.",
  },
  {
    icon: "💻",
    title: "Quantum Sandbox",
    description: "Write and run custom Python code in a Colab-like environment — with ready-made templates for Qiskit, PennyLane, and Cirq.",
  },
  {
    icon: "🔧",
    title: "Visual Circuit Builder",
    description: "Drag-and-drop quantum gates to build circuits visually, see the generated code in real time, and export or import circuits as OpenQASM.",
  },
  {
    icon: "📚",
    title: "Qiskit Reference Docs",
    description: "A real API reference manual — gate tables with matrices, a Qiskit syntax cheatsheet, and SDK guides for circuits, transpilation, and primitives.",
  },
  {
    icon: "🏆",
    title: "Circuit Challenges",
    description: "Gamified drag-and-drop puzzles that check your circuit against a target quantum state, with completion badges tracked on your dashboard.",
  },
  {
    icon: "📊",
    title: "Instructor Dashboard",
    description: "A cohort-wide analytics view for educators — completion rates, challenge attempts, and top performers across every enrolled student.",
    isNew: true,
  },
];

const quantumImages = [
  { title: "Bloch Sphere Visualization", desc: "3D representation of qubit states on the Bloch sphere", gradient: "from-blue-500/10 to-transparent", icon: "🌐" },
  { title: "Quantum Circuit Diagram", desc: "Multi-qubit quantum circuit with gates and measurements", gradient: "from-cyan-500/10 to-transparent", icon: "⚡" },
  { title: "Probability Distribution", desc: "Measurement outcomes showing quantum superposition collapse", gradient: "from-violet-500/10 to-transparent", icon: "📊" },
  { title: "Entanglement Network", desc: "Visualization of quantum entanglement between qubits", gradient: "from-emerald-500/10 to-transparent", icon: "🔗" },
  { title: "Quantum Error Correction", desc: "Surface codes and error syndrome detection patterns", gradient: "from-amber-500/10 to-transparent", icon: "🛡️" },
  { title: "Quantum Phase Space", desc: "Wigner function representation of quantum states", gradient: "from-rose-500/10 to-transparent", icon: "🌀" },
];

// Static data removed, fetching from API now.

/* ═══════════════════════════════════════════════════════
   LANDING PAGE COMPONENT
   ═══════════════════════════════════════════════════════ */

export default function LandingPage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  
  const [newsItems, setNewsItems] = useState([]);
  const [blogPosts, setBlogPosts] = useState([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [newsRes, blogsRes] = await Promise.all([getNews(), getBlogs()]);
        // Limit to 6 items each
        setNewsItems(newsRes.slice(0, 6));
        setBlogPosts(blogsRes.slice(0, 6));
      } catch (err) {
        console.error("Failed to fetch landing page content:", err);
      }
    }
    fetchData();
  }, []);

  const handleGetStarted = () => {
    navigate(isLoggedIn ? "/dashboard" : "/login");
  };

  return (
    <div className="landing-page">
      {/* ─── NAVBAR ────────────────────────────────────── */}
      <Navbar />

      {/* ─── HERO SECTION ─────────────────────────────── */}
      <section className="landing-hero">
        <div className="landing-hero-bg" />

        <div className="landing-hero-content">
          <div className="landing-hero-text">
            <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0} className="landing-badge">
              <span className="landing-badge-dot" />
              Team GitHappens2
            </motion.div>

            <motion.h1 variants={fadeUp} initial="hidden" animate="visible" custom={1} className="landing-title">
              Quantiva<br />
              <span className="landing-title-gradient"></span>
            </motion.h1>

            <motion.p variants={fadeUp} initial="hidden" animate="visible" custom={2} className="landing-description">
              An AI-powered platform for quantum algorithm research, learning,
              and experimentation , where you can simulate on Qiskit, PennyLane, or Cirq,
              get real-time help from an AI tutor, and earn certificates
              along the way. Built for Egreen Quanta, SIH26140.
            </motion.p>

            <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3} className="landing-hero-actions">
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(59,130,246,0.3)" }}
                whileTap={{ scale: 0.95 }}
                onClick={handleGetStarted}
                className="landing-btn-primary"
              >
                Get Started →
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/docs")}
                className="landing-btn-secondary"
              >
                Read Docs
              </motion.button>
            </motion.div>
          </div>

          {/* 3D Atom */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 1, ease: "easeOut" }}
            className="landing-hero-3d"
          >
            <QuantumAtom3D className="w-full h-full" />
          </motion.div>
        </div>
      </section>

      {/* ─── AI TUTOR SPOTLIGHT ───────────────────────── */}
      <AnimatedSection className="landing-ai-spotlight">
        <div className="landing-ai-spotlight-content">
          <div className="landing-ai-spotlight-text">
            <div className="landing-badge">
              <span className="landing-badge-dot" />
              New — AI-Powered Tutoring
            </div>
            <h2 className="landing-ai-spotlight-title">
              Meet your <span className="landing-title-gradient">AI Tutor</span>
            </h2>
            <p className="landing-ai-spotlight-desc">
              Built into every page of the platform, powered by Google Gemini.
              Ask it to explain a concept, hand it your circuit for a bug
              check, or let it recommend your next course based on how you're
              actually progressing.
            </p>
            <ul className="landing-ai-spotlight-list">
              <li>💬 Context-aware chat — it sees the page and code you're working on</li>
              <li>🩺 Circuit review — flags bugs and suggests gate-level optimizations</li>
              <li>🧭 Personalized paths — recommends courses and challenges from your progress</li>
            </ul>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleGetStarted}
              className="landing-btn-primary"
            >
              Try the AI Tutor →
            </motion.button>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="landing-ai-mockup"
          >
            <div className="landing-ai-mockup-header">
              <span className="landing-ai-mockup-dot" />
              <span>AI Tutor</span>
            </div>
            <div className="landing-ai-mockup-body">
              <div className="landing-ai-bubble landing-ai-bubble-user">Why did my Bell state come out |01⟩ instead of |00⟩/|11⟩?</div>
              <div className="landing-ai-bubble landing-ai-bubble-ai">
                Your CX gate has the control and target swapped — it should be
                <code> qc.cx(0, 1)</code>, entangling qubit 1 <em>onto</em> qubit 0's
                superposition. Right now it's reading qubit 1 (in |0⟩) as the control.
              </div>
              <div className="landing-ai-bubble landing-ai-bubble-user">What should I learn next?</div>
              <div className="landing-ai-bubble landing-ai-bubble-ai">
                You've completed <strong>Quantum Computing Fundamentals</strong> —
                try <strong>Grover's Algorithm</strong> next, it builds directly on the entanglement concepts you just practiced.
              </div>
            </div>
          </motion.div>
        </div>
      </AnimatedSection>

      {/* ─── STATS SECTION ────────────────────────────── */}
      <AnimatedSection className="landing-stats">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            className="landing-stat-card"
          >
            <div className="landing-stat-value">{stat.value}</div>
            <div className="landing-stat-label">{stat.label}</div>
          </motion.div>
        ))}
      </AnimatedSection>

      {/* ─── FEATURES SECTION ─────────────────────────── */}
      <AnimatedSection className="landing-features">
        <h2 className="landing-section-title">
          Platform <span className="landing-title-gradient">Features</span>
        </h2>
        <p className="landing-section-subtitle">
          Everything you need to explore, learn, and experiment with quantum computing
        </p>
        <motion.div
          className="landing-features-grid"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {features.map((feature) => (
            <motion.div key={feature.title} variants={fadeIn} className="landing-feature-card">
              {feature.isNew && <span className="landing-feature-new-badge">NEW</span>}
              <div className="landing-feature-icon">{feature.icon}</div>
              <h3 className="landing-feature-title">{feature.title}</h3>
              <p className="landing-feature-desc">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </AnimatedSection>

      {/* ─── QUANTUM GALLERY ──────────────────────────── */}
      <AnimatedSection className="landing-gallery">
        <h2 className="landing-section-title">
          Quantum <span className="landing-title-gradient">World</span>
        </h2>
        <p className="landing-section-subtitle">
          Explore the visual beauty of quantum computing — circuits, Bloch spheres, and probability distributions
        </p>
        <div className="landing-gallery-grid">
          {quantumImages.map((img, i) => (
            <motion.div
              key={img.title}
              className={`landing-gallery-card bg-gradient-to-br ${img.gradient}`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              whileHover={{ y: -8, scale: 1.02 }}
            >
              <div className="landing-gallery-icon">{img.icon}</div>
              <h4 className="landing-gallery-title">{img.title}</h4>
              <p className="landing-gallery-desc">{img.desc}</p>
            </motion.div>
          ))}
        </div>
      </AnimatedSection>

      {/* ─── NEWS SECTION ─────────────────────────────── */}
      <AnimatedSection className="landing-news">
        <h2 className="landing-section-title">
          Quantum <span className="landing-title-gradient">News</span>
        </h2>
        <p className="landing-section-subtitle">
          Latest developments in the global quantum computing landscape
        </p>
        <div className="landing-news-scroll">
          {newsItems.map((item, i) => (
            <motion.div
              key={item._id || item.title}
              className="landing-news-card cursor-pointer"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              whileHover={{ y: -4 }}
              onClick={() => navigate(`/news/${item._id}`)}
            >
              <span className="landing-news-tag">{item.tag}</span>
              <h4 className="landing-news-title">{item.title}</h4>
              <div className="landing-news-meta">
                <span>{item.source}</span>
                <span>•</span>
                <span>{new Date(item.date).toLocaleDateString() || item.date}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </AnimatedSection>

      {/* ─── BLOG SECTION ─────────────────────────────── */}
      <AnimatedSection className="landing-blogs">
        <h2 className="landing-section-title">
          Quantum <span className="landing-title-gradient">Blogs</span>
        </h2>
        <p className="landing-section-subtitle">
          In-depth articles about quantum computing concepts and algorithms
        </p>
        <div className="landing-blogs-grid">
          {blogPosts.map((post, i) => (
            <motion.div
              key={post._id || post.title}
              className="landing-blog-card cursor-pointer"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              whileHover={{ y: -6, boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}
              onClick={() => navigate(`/blogs/${post._id}`)}
            >
              <div className="landing-blog-category">{post.category}</div>
              <h4 className="landing-blog-title">{post.title}</h4>
              <p className="landing-blog-excerpt">{post.excerpt}</p>
              <div className="landing-blog-meta">
                <span>📖 {post.readTime} read</span>
                <span className="landing-blog-arrow">→</span>
              </div>
            </motion.div>
          ))}
        </div>
      </AnimatedSection>

      {/* ─── CTA SECTION ──────────────────────────────── */}
      <AnimatedSection className="landing-cta">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="landing-cta-content"
        >
          <h2 className="landing-cta-title">Ready to Explore Quantum Computing?</h2>
          <p className="landing-cta-desc">
            Run quantum algorithms across three backends, get help from your
            AI tutor whenever you're stuck, and earn a certificate as you go.
            Join the quantum revolution today.
          </p>
          <div className="landing-cta-actions">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleGetStarted}
              className="landing-btn-primary"
            >
              Get Started →
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/docs")}
              className="landing-btn-secondary"
            >
              Browse Documentation
            </motion.button>
          </div>
        </motion.div>
      </AnimatedSection>

      {/* ─── FOOTER ───────────────────────────────────── */}
      <Footer />
    </div>
  );
}
