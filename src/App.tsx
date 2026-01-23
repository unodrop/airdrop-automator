import "./App.css";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AccountsLayout } from "./components/AccountsLayout";
import { RegistratorLayout } from "./components/RegistratorLayout";
import { ScriptPage } from "./pages/ScriptPage";
import { PharosPage } from "./pages/PharosPage";
import { GalxePage } from "./pages/GalxePage";
import { SettingsPage } from "./pages/SettingsPage";
import { LoginPage } from "./pages/LoginPage";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { I18nProvider } from "./i18n/I18nContext";

// Protected Route Component
function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="dark">
      <SidebarProvider>
        <Layout>
          <Outlet />
        </Layout>
      </SidebarProvider>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Navigate to="/accounts" replace />} />
        <Route path="/accounts" element={<AccountsLayout />} />
        <Route path="/registrator" element={<RegistratorLayout />} />
        <Route path="/scripts" element={<ScriptPage />} />
        <Route path="/scripts/pharos" element={<PharosPage />} />
        <Route path="/galxe" element={<GalxePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </I18nProvider>
  );
}

export default App;
