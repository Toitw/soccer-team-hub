import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Team, Match, Event, Announcement } from "@shared/schema";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import MobileNavigation from "@/components/mobile-navigation";
import TeamSummary from "@/components/dashboard/team-summary";
import UpcomingEvents from "@/components/dashboard/upcoming-events";
import RecentMatches from "@/components/dashboard/recent-matches";
import Announcements from "@/components/dashboard/announcements";
import NextMatch from "@/components/dashboard/next-match";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const { data: teams, isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  // Create mock data for demonstration if none exists
  useEffect(() => {
    if (teams && teams.length === 0) {
      apiRequest("POST", "/api/mock-data")
        .then(() => {
          // Refetch teams after creating mock data
          window.location.reload();
        })
        .catch(error => {
          console.error("Failed to create mock data:", error);
        });
    }
  }, [teams]);

  // Select the first team by default
  const selectedTeam = teams && teams.length > 0 ? teams[0] : null;

  // If we have a selected team, fetch related data
  const { data: recentMatches, isLoading: matchesLoading } = useQuery<Match[]>({
    queryKey: ["/api/teams", selectedTeam?.id, "matches/recent"],
    enabled: !!selectedTeam,
  });

  const { data: upcomingEvents, isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/teams", selectedTeam?.id, "events"],
    enabled: !!selectedTeam,
    queryFn: async () => {
      if (!selectedTeam) return [];
      const response = await fetch(`/api/teams/${selectedTeam.id}/events`);
      if (!response.ok) throw new Error("Failed to fetch events");
      // Use only the most recent events (next 3 upcoming events)
      const allEvents = await response.json();
      const now = new Date();
      return allEvents
        .filter((event: Event) => new Date(event.startTime) >= now)
        .sort((a: Event, b: Event) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
        .slice(0, 3);
    }
  });

  const { data: announcements, isLoading: announcementsLoading } = useQuery<
    (Announcement & { creator?: any })[]
  >({
    queryKey: ["/api/teams", selectedTeam?.id, "announcements/recent"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/teams/${selectedTeam?.id}/announcements/recent`);
      return response instanceof Response ? [] : response as (Announcement & { creator?: any })[];
    },
    enabled: !!selectedTeam,
  });

  const isLoading = teamsLoading || matchesLoading || eventsLoading || announcementsLoading;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      <div className="flex-1 ml-0 md:ml-64 z-30">
        <Header title={t("navigation.dashboard")} />

        <div className="px-4 sm:px-6 lg:px-8 py-6 pb-20"> {/* Changed padding-bottom */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              <TeamSummary team={selectedTeam} />
              <UpcomingEvents events={upcomingEvents || []} />
              <NextMatch teamId={selectedTeam?.id} /> {/* Use NextMatch with teamId */}
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <Announcements teamId={selectedTeam?.id} announcements={announcements || []} />
            </div>
          </div>
        </div>

        <MobileNavigation />
      </div>
    </div>
  );
}