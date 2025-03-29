import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import TeamPage from "@/pages/team-page";
import MatchesPage from "@/pages/matches-page";
import TrainingPage from "@/pages/training-page";
import PlayerProfilePage from "@/pages/player-profile-page";
import AnnouncementsPage from "@/pages/announcements-page";
import SettingsPage from "@/pages/settings-page";
import { AuthProvider } from "./hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      
      {/* Dashboard accessible to all authenticated users */}
      <ProtectedRoute path="/" component={DashboardPage} />
      
      {/* Team management - accessible to all but players are read-only */}
      <ProtectedRoute path="/team" component={TeamPage} />
      
      {/* Match-related pages - accessible to all but players are read-only */}
      <ProtectedRoute path="/matches" component={MatchesPage} />
      <ProtectedRoute path="/player/:id" component={PlayerProfilePage} />
      
      {/* Training page - accessible to all but players are read-only */}
      <ProtectedRoute path="/training" component={TrainingPage} />
      
      {/* Announcements - accessible to all but players are read-only */}
      <ProtectedRoute 
        path="/announcements" 
        component={AnnouncementsPage} 
      />
      
      {/* Settings - restricted to admin only */}
      <ProtectedRoute 
        path="/settings" 
        component={SettingsPage} 
        requiredRole="admin" 
        allowedRoles={["admin"]} 
      />
      
      {/* 404 Page */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
