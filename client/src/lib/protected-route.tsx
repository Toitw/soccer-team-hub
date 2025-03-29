import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
  requiredRole,
}: {
  path: string;
  component: () => React.JSX.Element;
  requiredRole?: string;
}) {
  const { user, isLoading } = useAuth();

  const hasRequiredRole = () => {
    if (!requiredRole) return true;
    return user?.role === requiredRole;
  };

  return (
    <Route path={path}>
      {isLoading ? (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : user ? (
        hasRequiredRole() ? (
          <Component />
        ) : (
          <Redirect to="/" />
        )
      ) : (
        <Redirect to="/auth" />
      )}
    </Route>
  );
}
