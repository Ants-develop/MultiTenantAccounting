import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthProvider";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireStaffRole?: boolean;
  requireClientRole?: boolean;
}

export const ProtectedRoute = ({ 
  children, 
  requireStaffRole = false,
  requireClientRole = false 
}: ProtectedRouteProps) => {
  const { user, loading, hasRole } = useAuth();
  const location = useLocation();

  console.log('[ProtectedRoute] Check:', {
    path: location.pathname,
    user: user?.email,
    loading,
    requireStaffRole,
    requireClientRole,
    isClient: user ? hasRole("client") : null,
    isStaff: user ? (hasRole("admin") || hasRole("manager") || hasRole("accountant") || hasRole("reviewer")) : null
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    // Redirect to appropriate login page based on path
    const isPortalRoute = location.pathname.startsWith("/portal");
    return <Navigate to={isPortalRoute ? "/portal/auth" : "/auth"} replace />;
  }

  // Check role requirements
  const isClient = hasRole("client");
  const isStaff = hasRole("admin") || hasRole("manager") || hasRole("accountant") || hasRole("reviewer");

  // If route requires staff role but user is client, redirect to portal
  if (requireStaffRole && isClient && !isStaff) {
    console.log('[ProtectedRoute] Staff route but client user, redirecting to portal');
    return <Navigate to="/portal/dashboard" replace />;
  }

  // If route requires client role but user is staff, redirect to staff dashboard
  if (requireClientRole && isStaff && !isClient) {
    console.log('[ProtectedRoute] Client route but staff user, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  // Auto-redirect based on role if accessing root protected routes
  if (!requireStaffRole && !requireClientRole) {
    if (isClient && !isStaff && !location.pathname.startsWith("/portal")) {
      console.log('[ProtectedRoute] Client accessing non-portal, redirecting to portal');
      return <Navigate to="/portal/dashboard" replace />;
    }
    if (isStaff && !isClient && location.pathname.startsWith("/portal")) {
      console.log('[ProtectedRoute] Staff accessing portal, redirecting to dashboard');
      return <Navigate to="/dashboard" replace />;
    }
  }

  console.log('[ProtectedRoute] Access granted');

  return <>{children}</>;
};
