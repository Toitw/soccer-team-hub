import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import RegisterPage from "@/pages/register-page";
import OnboardingPage from "@/pages/onboarding-page";
import DashboardPage from "@/pages/dashboard-page";
import MockPage from "@/pages/mock-page";
import TeamPage from "@/pages/team-page";
import MatchesPage from "./pages/matches-page";
import EventPage from "@/pages/event-page";
import PlayerProfilePage from "@/pages/player-profile-page";
import AnnouncementsPage from "@/pages/announcements-page";
import StatisticsPage from "@/pages/statistics-page";
import SettingsPage from "@/pages/settings-page";
import AdminPage from "@/pages/admin-page";
import VerifyEmailPage from "@/pages/verify-email-page";
import ResetPasswordPage from "@/pages/reset-password-page";
import ForgotPasswordPage from "@/pages/forgot-password-page";
import SimpleClaimsPage from "./pages/simple-claims-page";
import SimpleTeamPage from "./pages/simple-team-page";
import { AuthProvider } from "./hooks/use-auth";
import { LanguageProvider } from "./hooks/use-language";
import { TeamProvider } from "./hooks/use-team";
import { ProtectedRoute } from "./lib/protected-route";
import { useState, useEffect, lazy, Suspense } from "react";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/onboarding" component={OnboardingPage} />
      <Route path="/verify-email" component={VerifyEmailPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />

      {/* Dashboard accessible to all authenticated users */}
      <ProtectedRoute path="/" component={DashboardPage} />

      {/* Mock page for demonstration */}
      <ProtectedRoute path="/mock" component={MockPage} />

      {/* Redirect from /team to /teams/ */}
      <Route path="/team">
        {() => {
          console.log("Team redirect hit, redirecting to /teams/4");
          window.location.href = "/teams/4";
          return <div>Redirecting...</div>;
        }}
      </Route>

      {/* Team management - accessible to all but players are read-only */}
      <Route path="/teams/:id">
        {(params) => {
          console.log("Teams route match with params:", params);
          return <SimpleTeamPage />;
        }}
      </Route>
      <Route path="/teams/:id/claims">
        {(params) => {
          console.log("Teams claims route match with params:", params);
          return (
            <Suspense fallback={<div className="flex h-screen items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>}>
              <SimpleClaimsPage />
            </Suspense>
          );
        }}
      </Route>

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

      {/* Statistics - accessible to all but players are read-only */}
      <ProtectedRoute
        path="/statistics"
        component={StatisticsPage}
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
          <TeamProvider>
            <Router />
            <Toaster />
            {/* Global Feedback Button */}
            <FeedbackButton />
          </TeamProvider>
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

// Lazy-load the feedback component to avoid showing it during development
const FeedbackButton = () => {
  const [hasLoaded, setHasLoaded] = useState(false);
  
  useEffect(() => {
    // Delay loading the feedback button to improve initial load performance
    const timer = setTimeout(() => {
      setHasLoaded(true);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  if (!hasLoaded) return null;
  
  // Dynamically import the feedback component
  const FeedbackDialog = lazy(() => import("./components/feedback-dialog"));
  
  return (
    <Suspense fallback={null}>
      <FeedbackDialog />
    </Suspense>
  );
}

export default App;