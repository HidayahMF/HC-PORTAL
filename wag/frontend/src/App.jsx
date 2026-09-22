import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import AppShell from "./layouts/AppShell";

import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import MonitoringSimPage from "./pages/MonitoringSimPage";
import BroadcastPage from "./pages/BroadcastPage";
import ScheduledMessagesPage from "./pages/ScheduledMessagesPage";
import SimcPage from "./pages/SimcPage";
import HolidaysPage from "./pages/HolidaysPage";
import ProfilePage from "./pages/ProfilePage";

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/monitoring" element={<MonitoringSimPage />} />
              <Route path="/broadcast" element={<BroadcastPage />} />
              <Route path="/scheduled" element={<ScheduledMessagesPage />} />
              <Route path="/simc" element={<SimcPage type="simc" />} />
              <Route path="/sima" element={<SimcPage type="sima" />} />
              <Route path="/holidays" element={<HolidaysPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                borderRadius: "12px",
                fontSize: "13px",
                padding: "10px 14px",
                boxShadow: "0 12px 32px -8px rgba(15, 23, 42, 0.16)",
              },
              success: { iconTheme: { primary: "#15803D", secondary: "#fff" } },
              error: { iconTheme: { primary: "#B91C1C", secondary: "#fff" } },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
