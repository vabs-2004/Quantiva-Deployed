import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { motion } from "framer-motion";
import { GoogleLogin } from "@react-oauth/google";

function getOS() {
  const userAgent = window.navigator.userAgent;
  const platform = window.navigator.platform;
  const macosPlatforms = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K'];
  const windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE'];
  const iosPlatforms = ['iPhone', 'iPad', 'iPod'];

  if (macosPlatforms.indexOf(platform) !== -1) return 'Mac OS';
  if (iosPlatforms.indexOf(platform) !== -1) return 'iOS';
  if (windowsPlatforms.indexOf(platform) !== -1) return 'Windows';
  if (/Android/.test(userAgent)) return 'Android';
  if (!os && /Linux/.test(platform)) return 'Linux';
  return 'Unknown';
}

export default function LoginPage({ defaultRegister = false }) {
  const { login, register, googleLogin, isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const [isRegisterMode, setIsRegisterMode] = useState(defaultRegister);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  if (isLoggedIn) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegisterMode) {
        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          setLoading(false);
          return;
        }

        const os = getOS();
        const userData = { username, password, name, email, dob, gender, phone, os };
        await register(userData);
      } else {
        await login(username, password);
      }
      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.error || "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: "var(--color-app-base)" }}
    >
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl" style={{ background: "var(--color-app-primary-glow)" }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-3xl" style={{ background: "rgba(139,92,246,0.05)" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full" style={{ border: "1px solid var(--color-app-border)" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full" style={{ border: "1px solid var(--color-app-border)" }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        {/* Logo & Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-center mb-8"
        >
          <img src="/logo.png" alt="Logo" className="h-20 w-20 mx-auto mb-4 drop-shadow-lg" />
          <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: "var(--color-app-text-main)" }}>
            Quantiva
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-app-text-muted)" }}>
            GitHappens2 (GitHappens2)
          </p>
        </motion.div>

        {/* Card */}
        <div className="rounded-2xl p-8 shadow-2xl" style={{
          border: "1px solid var(--color-app-border)",
          background: "var(--color-app-glass)",
          backdropFilter: "blur(20px)",
        }}>
          <h2 className="text-lg font-bold mb-6 text-center" style={{ color: "var(--color-app-text-main)" }}>
            {isRegisterMode ? "Create Account" : "Sign In"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--color-app-text-muted)" }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-all"
                style={{
                  border: "1px solid var(--color-app-border)",
                  background: "var(--color-app-base)",
                  color: "var(--color-app-text-main)",
                }}
                placeholder="Enter username"
                required
                autoFocus
              />
            </div>

            {isRegisterMode && (
              <>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--color-app-text-muted)" }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-all"
                    style={{
                      border: "1px solid var(--color-app-border)",
                      background: "var(--color-app-base)",
                      color: "var(--color-app-text-main)",
                    }}
                    placeholder="Enter full name"
                    required={isRegisterMode}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--color-app-text-muted)" }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-all"
                    style={{
                      border: "1px solid var(--color-app-border)",
                      background: "var(--color-app-base)",
                      color: "var(--color-app-text-main)",
                    }}
                    placeholder="Enter email address"
                    required={isRegisterMode}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--color-app-text-muted)" }}>
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-all"
                      style={{
                        border: "1px solid var(--color-app-border)",
                        background: "var(--color-app-base)",
                        color: "var(--color-app-text-main)",
                      }}
                      required={isRegisterMode}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--color-app-text-muted)" }}>
                      Gender
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-all"
                      style={{
                        border: "1px solid var(--color-app-border)",
                        background: "var(--color-app-base)",
                        color: "var(--color-app-text-main)",
                      }}
                      required={isRegisterMode}
                    >
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--color-app-text-muted)" }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-all"
                    style={{
                      border: "1px solid var(--color-app-border)",
                      background: "var(--color-app-base)",
                      color: "var(--color-app-text-main)",
                    }}
                    placeholder="Enter phone number"
                    required={isRegisterMode}
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--color-app-text-muted)" }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (isRegisterMode && !/^[ -~]*$/.test(val)) {
                      setError("Password can only contain standard keyboard characters.");
                      return;
                    }
                    setError("");
                    setPassword(val);
                  }}
                  className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-all pr-12"
                  style={{
                    border: "1px solid var(--color-app-border)",
                    background: "var(--color-app-base)",
                    color: "var(--color-app-text-main)",
                  }}
                  placeholder="Enter password"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-app-text-muted)] hover:text-[var(--color-app-primary)] transition-colors p-1"
                >
                  {showPassword ? (
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>

            {isRegisterMode && (
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--color-app-text-muted)" }}>
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onPaste={(e) => {
                      e.preventDefault();
                      setError("Copy pasting password is not allowed.");
                    }}
                    className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-all pr-12"
                    style={{
                      border: "1px solid var(--color-app-border)",
                      background: "var(--color-app-base)",
                      color: "var(--color-app-text-main)",
                    }}
                    placeholder="Confirm password"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-app-text-muted)] hover:text-[var(--color-app-primary)] transition-colors p-1"
                  >
                    {showConfirmPassword ? (
                      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-xs text-red-400 bg-red-400/10 px-3 py-2 rounded-lg"
              >
                {error}
              </motion.p>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full rounded-lg py-3 text-sm font-bold text-white shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, var(--color-app-primary), var(--color-app-primary-hover))",
                boxShadow: "0 4px 15px var(--color-app-primary-glow)",
              }}
            >
              {loading
                ? "Please wait..."
                : isRegisterMode
                ? "Create Account"
                : "Sign In"}
            </motion.button>
          </form>

          {!isRegisterMode && (
            <div className="mt-6 flex flex-col items-center gap-4">
              <div className="w-full flex items-center justify-center">
                <div className="h-px bg-gray-600/30 flex-1"></div>
                <span className="px-3 text-xs uppercase" style={{ color: "var(--color-app-text-muted)" }}>or continue with</span>
                <div className="h-px bg-gray-600/30 flex-1"></div>
              </div>
              
              <GoogleLogin
                onSuccess={async (credentialResponse) => {
                  setLoading(true);
                  setError("");
                  try {
                    const os = getOS();
                    await googleLogin(credentialResponse.credential, os);
                    navigate("/dashboard");
                  } catch (err) {
                    setError(err.response?.data?.error || "Google login failed.");
                  } finally {
                    setLoading(false);
                  }
                }}
                onError={() => {
                  setError("Google login was unsuccessful.");
                }}
                theme="filled_black"
                shape="pill"
              />
            </div>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setError("");
                if (isRegisterMode) {
                  navigate("/login");
                } else {
                  navigate("/register");
                }
              }}
              className="text-xs transition-colors"
              style={{ color: "var(--color-app-text-muted)" }}
            >
              {isRegisterMode
                ? "Already have an account? Sign In"
                : "Don't have an account? Register"}
            </button>
          </div>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "var(--color-app-text-light)" }}>
          GitHappens2
        </p>
      </motion.div>
    </div>
  );
}
