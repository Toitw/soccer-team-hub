import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import TeamPage from "@/pages/team-page";
import MatchesPage from "@/pages/matches-page-v2";
import EventPage from "@/pages/event-page";
import PlayerProfilePage from "@/pages/player-profile-page";
import AnnouncementsPage from "@/pages/announcements-page";
import SettingsPage from "@/pages/settings-page";
import AdminPage from "@/pages/admin-page";
import VerifyEmailPage from "@/pages/verify-email-page";
import { AuthProvider } from "./hooks/use-auth";
import { LanguageProvider } from "./hooks/use-language";
import { ProtectedRoute } from "./lib/protected-route";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/verify-email" component={VerifyEmailPage} />
      
      {/* Dashboard accessible to all authenticated users */}
      <ProtectedRoute path="/" component={DashboardPage} />
      
      {/* Team management - accessible to all but players are read-only */}
      <ProtectedRoute path="/team" component={TeamPage} />
      
      {/* Match-related pages - accessible to all but players are read-only */}
      <ProtectedRoute path="/matches" component={MatchesPage} />
      <ProtectedRoute path="/player/:id" component={PlayerProfilePage} />
      
      {/* Events page - accessible to all but players are read-only */}
      <ProtectedRoute path="/events" component={EventPage} />
      
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

      {/* Admin panel - restricted to superuser only */}
      <ProtectedRoute 
        path="/admin" 
        component={AdminPage} 
        requiredRole="superuser" 
        allowedRoles={["superuser"]} 
      />
      
      {/* 404 Page */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <Router />
          <Toaster />
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
