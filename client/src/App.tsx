import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import DashboardPage from "@/pages/dashboard-page";
import AuthPage from "@/pages/auth-page";
import MatchesPage from "@/pages/matches-page-v2";
import PlayersPage from "@/pages/players-page";
import StatisticsPage from "@/pages/statistics-page";
import AnnouncementsPage from "@/pages/announcements-page";
import EventPage from "@/pages/event-page";
import SettingsPage from "@/pages/settings-page";
import AdminPage from "@/pages/admin-page";
import PlayerProfilePage from "@/pages/player-profile-page";
import TeamPage from "@/pages/team-page";
import ForgotPasswordPage from "@/pages/forgot-password-page";
import ResetPasswordPage from "@/pages/reset-password-page";
import VerifyEmailPage from "@/pages/verify-email-page";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/matches" component={MatchesPage} />
      <Route path="/players" component={PlayersPage} />
      <Route path="/statistics" component={StatisticsPage} />
      <Route path="/announcements" component={AnnouncementsPage} />
      <Route path="/events" component={EventPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/players/:id" component={PlayerProfilePage} />
      <Route path="/teams/:id" component={TeamPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/verify-email/:token" component={VerifyEmailPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
