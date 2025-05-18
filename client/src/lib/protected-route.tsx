import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { hasPagePermission, isPageReadOnly } from "./permissions";

// Define props type for the protected component
interface ComponentWithReadOnly {
  readOnly?: boolean;
}

export function ProtectedRoute({
  path,
  component: Component,
  requiredRole,
  allowedRoles = ["admin", "coach", "player", "colaborador"],
  readOnly = false,
}: {
  path: string;
  component: React.ComponentType<ComponentWithReadOnly>;
  requiredRole?: string;
  allowedRoles?: string[];
  readOnly?: boolean;
}) {
  const { user, isLoading } = useAuth();

  const hasAccess = () => {
    if (!user?.role) return false;
    
    // Use our centralized permissions system
    return hasPagePermission(path, user.role);
  };

  // Create a special property to pass to components for read-only mode
  // Use our centralized permissions system to determine if the page should be read-only
  const isReadOnly = user?.role ? isPageReadOnly(path, user.role) : true;
  
  return (
    <Route path={path}>
      {isLoading ? (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : user ? (
        hasAccess() ? (
          <Component readOnly={isReadOnly} />
        ) : (
          <Redirect to="/" />
        )
      ) : (
        <Redirect to="/auth" />
      )}
    </Route>
  );
}
