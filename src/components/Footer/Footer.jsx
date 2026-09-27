import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { APP_NAME, APP_ORG } from "../../utils/constants";

const footerLinks = {
  Platform: [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Courses", path: "/courses" },
    { label: "Quantum Docs", path: "/docs" },
    { label: "Blogs", path: "/blogs" },
    { label: "News", path: "/news" },
    { label: "Verify Certificate", path: "/verify" },
  ],
  Tools: [
    { label: "Bloch Sphere", path: "/blochsphere" },
    { label: "Circuit Simulator", path: "/circuit-simulator" },
    { label: "Sandbox", path: "/sandbox" },
    { label: "Playground", path: "/playground" },
  ],
  Resources: [
    // { label: "DRDO Official Website", href: "https://www.drdo.gov.in/" },
    { label: "Qiskit Documentation", href: "https://qiskit.org/documentation/" },
    { label: "IBM Quantum", href: "https://quantum-computing.ibm.com/" },
    { label: "arXiv Quantum", href: "https://arxiv.org/archive/quant-ph" },
    { label: "Quantum Open Source", href: "https://qosf.org/" },
  ],
};

export default function Footer() {
  return (
    <footer className="footer-container">
      {/* Gradient separator */}
      <div className="footer-gradient-line" />

      <div className="footer-content">
        {/* Brand Column */}
        <div className="footer-brand-col">
          <div className="footer-brand">
            <img src="/logo.png" alt="Logo" className="footer-logo" />
            <div>
              <div className="footer-brand-name">{APP_NAME}</div>
              <div className="footer-brand-org">{APP_ORG}</div>
            </div>
          </div>
          <p className="footer-brand-desc">
            An interactive platform for quantum algorithm research,
            simulation, and experimentation. Powered by IBM Qiskit, Cirq and PennyLane.
          </p>
          {/* Social Icons */}
          {/* <div className="footer-socials">
            {[
              { id: "twitter", url: "https://x.com/DRDO_India?lang=en" },
              { id: "linkedin", url: "https://www.linkedin.com/company/drdo-ministry-of-defence-govt-of-india/" }
            ].map((s) => (
              <motion.a
                key={s.id}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.15, y: -2 }}
                whileTap={{ scale: 0.9 }}
                className="footer-social-icon"
                aria-label={s.id}
              >
                {s.id === "twitter" && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                )}
                {s.id === "linkedin" && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                )}
              </motion.a>
            ))}
          </div> */}
        </div>

        {/* Link Columns */}
        {Object.entries(footerLinks).map(([title, links]) => (
          <div key={title} className="footer-link-col">
            <h4 className="footer-col-title">{title}</h4>
            <ul className="footer-link-list">
              {links.map((link) => (
                <li key={link.label}>
                  {link.path ? (
                    <Link to={link.path} className="footer-link">
                      {link.label}
                    </Link>
                  ) : (
                    <a href={link.href} target="_blank" rel="noopener noreferrer" className="footer-link">
                      {link.label}
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="footer-ext-icon">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="footer-bottom">
        {/* <p>© {new Date().getFullYear()} Defence Research & Development Organisation. All rights reserved.</p> */}
        <p className="footer-bottom-sub" style={{ marginTop: "0.5rem" }}>
           SIH26140
        </p>
        <p className="footer-bottom-sub" style={{ marginTop: "0.25rem", fontWeight: 600, color: "var(--color-app-primary)" }}>
          Designed & Developed by Team GitHappens2
        </p>
      </div>
    </footer>
  );
}
