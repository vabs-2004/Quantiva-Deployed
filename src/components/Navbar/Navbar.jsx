import { useState, useRef, useEffect } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { APP_NAME, APP_ORG, PUBLIC_NAV_LINKS, ALGORITHM_SERIES_ORDER } from "../../utils/constants";
import { useAuth } from "../../context/AuthContext";
import { useAlgorithmContext } from "../../context/AlgorithmContext";
import ThemeToggle from "../ThemeToggle/ThemeToggle";

/**
 * Universal Navbar — works for both public and authenticated states.
 * Public: Logo | Blogs | News | Docs | Algorithms dropdown | Theme | Register | Login
 * Auth:   Logo | Blogs | News | Docs | Algorithms dropdown | Theme | Username | Logout
 */
export default function Navbar() {
  const { user, isLoggedIn, isAdmin, logout } = useAuth();
  const { algorithmList } = useAlgorithmContext();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Sort algorithms by series order
  const sortedAlgorithms = [...algorithmList].sort((a, b) => {
    const idxA = ALGORITHM_SERIES_ORDER.indexOf(a.id);
    const idxB = ALGORITHM_SERIES_ORDER.indexOf(b.id);
    const posA = idxA === -1 ? 999 : idxA;
    const posB = idxB === -1 ? 999 : idxB;
    return posA - posB;
  });

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="nav-container">
      <div className="nav-inner">
        {/* Left: Brand */}
        <Link to="/" className="nav-brand">
          <img src="/logo.png" alt="Logo" className="nav-logo" />
          <div>
            <div className="nav-brand-name">{APP_NAME}</div>
            <div className="nav-brand-org">
              <span className="hidden md:inline">{APP_ORG}</span>
              <span className="md:hidden">GitHappens2</span>
            </div>
          </div>
        </Link>

        {/* Center: Navigation Links */}
        <div className={`nav-links ${mobileOpen ? "mobile-open" : ""}`}>
          {PUBLIC_NAV_LINKS.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </NavLink>
          ))}

          {isLoggedIn && (
            <NavLink
              to={isAdmin ? "/admin" : "/dashboard"}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
              onClick={() => setMobileOpen(false)}
            >
              Dashboard
            </NavLink>
          )}

          {/* Algorithms Dropdown */}
          <div className="nav-dropdown" ref={dropdownRef}>
            <button
              className="nav-dropdown-trigger"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              Algorithms
              <motion.svg
                animate={{ rotate: dropdownOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </motion.svg>
            </button>

            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  className="nav-dropdown-menu"
                  data-lenis-prevent="true"
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  {sortedAlgorithms.map((algo, idx) => (
                    <button
                      key={algo.id}
                      className="nav-dropdown-item"
                      onClick={() => {
                        navigate(`/algorithm/${algo.id}`);
                        setDropdownOpen(false);
                        setMobileOpen(false);
                      }}
                    >
                      <span className="nav-dropdown-num">{idx + 1}</span>
                      <div style={{ overflow: "hidden" }}>
                        <div className="nav-dropdown-name">{algo.name}</div>
                        <div className="nav-dropdown-desc">{algo.shortDescription}</div>
                      </div>
                    </button>
                  ))}

                  {sortedAlgorithms.length === 0 && (
                    <div style={{ padding: "1rem", textAlign: "center", fontSize: "0.8rem", color: "var(--color-app-text-muted)" }}>
                      No algorithms available
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile Actions - shown inside mobile dropdown */}
          <div className="md:hidden flex flex-col gap-3 mt-4 pt-4 border-t border-[var(--color-app-border-light)] w-full pb-2">
            {isLoggedIn ? (
              <>
                <div className="flex flex-col items-start w-full mb-1">
                  <span className="nav-username text-lg">{user?.username}</span>
                  <span className={`nav-role ${isAdmin ? "nav-role-admin" : "nav-role-user"}`}>
                    {isAdmin ? "Admin" : "User"}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="nav-btn-logout w-full text-center py-2"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => { navigate("/register"); setMobileOpen(false); }}
                  className="nav-btn-outline w-full text-center py-2"
                >
                  Register
                </button>
                <button
                  onClick={() => { navigate("/login"); setMobileOpen(false); }}
                  className="nav-btn-primary w-full text-center py-2"
                >
                  Login
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="nav-actions">
          <ThemeToggle />

          {isLoggedIn ? (
            <>
              <div className="nav-user-info hidden md:flex">
                <span className="nav-username">{user?.username}</span>
                <span className={`nav-role ${isAdmin ? "nav-role-admin" : "nav-role-user"}`}>
                  {isAdmin ? "Admin" : "User"}
                </span>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLogout}
                className="nav-btn-logout hidden md:block"
              >
                Logout
              </motion.button>
            </>
          ) : (
            <>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/register")}
                className="nav-btn-outline hidden md:block"
              >
                Register
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/login")}
                className="nav-btn-primary hidden md:block"
              >
                Login
              </motion.button>
            </>
          )}

          {/* Mobile Hamburger */}
          <button
            className="nav-mobile-toggle"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>
      <div className="app-gradient-line" />
    </nav>
  );
}
