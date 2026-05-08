import React from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute — view-based guard (no react-router-dom required).
 *
 * Wrap any component that requires authentication:
 *   <ProtectedRoute>
 *     <DashboardLayout />
 *   </ProtectedRoute>
 *
 * Behaviour:
 *   loading  → spinner (Supabase is restoring session from localStorage)
 *   no user  → redirects to login view
 *   user ok  → renders children
 */
export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, loading } = useAuth();
    const { setView } = useApp();

    // Supabase is reading the stored JWT from localStorage — wait before deciding.
    if (loading) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-background">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // No active session — redirect to login.
    if (!user) {
        // Use a microtask so we don't call setView during a render cycle.
        Promise.resolve().then(() => setView('login' as any));
        return null;
    }

    // Authenticated — render the protected content.
    return <>{children}</>;
};
