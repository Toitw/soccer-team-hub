import React, { ComponentType } from 'react';
import { Redirect, useLocation, RouteComponentProps } from 'wouter';
import { useAuth } from '@/hooks/use-auth';

interface ProtectedRouteProps {
  component: ComponentType<any>;
  requiredRoles?: string[];
}

/**
 * A higher-order component that protects routes requiring authentication
 * @param component - The component to render if authenticated
 * @param requiredRoles - Optional array of roles required to access the route
 */
function ProtectedRoute({ 
  component: Component,
  requiredRoles = []
}: ProtectedRouteProps) {
  return function ProtectedComponent(props: RouteComponentProps) {
    const { user, isAuthenticated, isLoading } = useAuth();
    const [, setLocation] = useLocation();

    // Show loading state while checking authentication
    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading...</p>
          </div>
        </div>
      );
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      return <Redirect to="/?redirect=true" />;
    }

    // Check role permissions if required
    if (requiredRoles.length > 0) {
      const hasRequiredRole = requiredRoles.includes(user?.role as string);
      
      if (!hasRequiredRole) {
        // User is authenticated but doesn't have the required role
        return <Redirect to="/dashboard" />;
      }
    }

    // Render the protected component
    return <Component {...props} />;
  };
}

export default ProtectedRoute;