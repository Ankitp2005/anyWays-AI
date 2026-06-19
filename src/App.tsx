import React, { useEffect } from 'react';
import { useApp } from './context/AppContext';
import { useAuth } from './context/AuthContext';
import { MarketingHome } from './components/MarketingHome';
import { DashboardLayout } from './components/DashboardLayout';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Pricing } from './components/Pricing';
import { Architecture } from './components/Architecture';

const App: React.FC = () => {
  const { currentView, setView } = useApp();
  const { session, loading } = useAuth();

  /**
   * Session → view synchronisation.
   *
   * This runs when Supabase resolves the session (loading → false) and whenever
   * the session changes (login / logout / token refresh).
   *
   * Rules:
   *  - logged IN  + on auth page  → push to dashboard
   *  - logged OUT + on dashboard  → push to login
   */
  useEffect(() => {
    if (loading) return; // wait for Supabase to restore session from localStorage

    if (session && (currentView === 'login' || currentView === 'register')) {
      setView('dashboard' as any);
    } else if (!session && currentView === 'dashboard') {
      setView('login' as any);
    }
  }, [session, loading]); // intentionally exclude currentView — we only react to auth changes

  // Global loading spinner while Supabase reads stored JWT
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-50 dark:bg-neutral-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Auth views — no protection needed
  if (currentView === 'login')    return <Login />;
  if (currentView === 'register') return <Register />;

  // Marketing view — public
  if (currentView === 'marketing') return <MarketingHome />;
  if (currentView === 'pricing')   return <Pricing />;
  if (currentView === 'architecture') return <Architecture />;

  // Dashboard — protected: ProtectedRoute handles the unauthenticated fallback
  return (
    <ProtectedRoute>
      <DashboardLayout />
    </ProtectedRoute>
  );
};

export default App;
