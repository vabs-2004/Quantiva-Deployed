import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { AlgorithmProvider } from "./context/AlgorithmContext";
import { ThemeProvider } from "./context/ThemeContext";
import { AITutorProvider } from "./context/AITutorContext";
import AppRoutes from "./routes/AppRoutes";
import useSmoothScroll from "./hooks/useSmoothScroll";
import usePageTracking from "./hooks/usePageTracking";

import AITutorPanel from "./components/AITutor/AITutorPanel";
import { QuantumContextLensProvider } from "./context/QuantumContextLensContext";
import QuantumContextLensDrawer from "./components/QuantumContextLens/QuantumContextLensDrawer";
import SelectionLensTrigger from "./components/QuantumContextLens/SelectionLensTrigger";

/**
 * Inner app component that uses the smooth scroll hook.
 * Must be inside BrowserRouter for hooks to work.
 */
function AppInner() {
  useSmoothScroll();
  usePageTracking();
  return (
    <>
      <AppRoutes />
      <AITutorPanel />
      <SelectionLensTrigger />
      <QuantumContextLensDrawer />
    </>
  );
}

import { GoogleOAuthProvider } from "@react-oauth/google";

/**
 * Root Application Component
 * Wraps the app in ThemeProvider, Router, AuthProvider, and AlgorithmProvider.
 */
function App() {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "no-client-id";

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <AlgorithmProvider>
              <AITutorProvider>
                <QuantumContextLensProvider>
                  <AppInner />
                </QuantumContextLensProvider>
              </AITutorProvider>
            </AlgorithmProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
