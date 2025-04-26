import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

// Define props type for the protected component
interface ComponentWithReadOnly {
  readOnly?: boolean;
}

export function ProtectedRoute({
  path,
  component: Component,
  requiredRole,
  allowedRoles = ["admin", "coach", "player"],
  readOnly = false,
}: {
  path: string;
  component: React.ComponentType<ComponentWithReadOnly>;
  requiredRole?: string;
  allowedRoles?: string[];
  readOnly?: boolean;
}) {
  const { user, isLoading } = useAuth();

  const hasRequiredRole = () => {
    // If a specific role is required, check only that role
    if (requiredRole) {
      return user?.role === requiredRole;
    }
    
    // Otherwise, check if user's role is in the allowed roles list
    return user?.role ? allowedRoles.includes(user.role) : false;
  };

  // Create a special property to pass to components for read-only mode
  // This is particularly useful for player role which can only view data
  const isReadOnly = readOnly || (user?.role === "player");
  
  return (
    <Route path={path}>
      {isLoading ? (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : user ? (
        hasRequiredRole() ? (
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
