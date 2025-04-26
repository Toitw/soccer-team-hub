import React from 'react';
import { useLocation, Redirect } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Route, RouteProps } from 'wouter';

interface ProtectedRouteProps extends RouteProps {
  requiredRole?: string;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  component,
  requiredRole,
  allowedRoles,
  ...rest
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();

  // While checking authentication status, return nothing (or a loading spinner)
  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  // Create a wrapper component that will check auth and roles
  const WrappedComponent = (props: any) => {
    // If not authenticated, redirect to login
    if (!isAuthenticated) {
      // Use Redirect component from wouter for navigation
      return <Redirect to="/auth" />;
    }

    // If roles are required, check if user has the necessary role
    if (requiredRole && user?.role !== requiredRole) {
      // If user doesn't have the exact required role, check if they have one of the allowed roles
      if (allowedRoles && user?.role && allowedRoles.includes(user.role)) {
        // User has one of the allowed roles, render the component
        return React.createElement(component, props);
      }
      
      // Otherwise redirect to dashboard (or unauthorized page)
      return <Redirect to="/" />;
    }

    // If no role requirements or user has the right role, render the component
    return React.createElement(component, props);
  };

  // Return the Route with our wrapped component
  return <Route component={WrappedComponent} {...rest} />;
};