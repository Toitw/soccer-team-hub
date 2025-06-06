import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { useLocation } from "wouter";

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: teams, isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Prefetch team data when teams load
  useEffect(() => {
    if (teams && teams.length > 0 && !teamsLoading) {
      const firstTeam = teams[0];
      if (firstTeam?.id) {
        // Prefetch events immediately when team is available
        queryClient.prefetchQuery({
          queryKey: ["/api/teams", firstTeam.id, "events"],
          queryFn: async () => {
            const response = await fetch(`/api/teams/${firstTeam.id}/events`);
            if (!response.ok) throw new Error("Failed to fetch events");
            return await response.json();
          },
          staleTime: 2 * 60 * 1000,
        });
        
        // Prefetch other data too
        queryClient.prefetchQuery({
          queryKey: ["/api/teams", firstTeam.id, "matches/recent"],
          staleTime: 2 * 60 * 1000,
        });
        
        queryClient.prefetchQuery({
          queryKey: ["/api/teams", firstTeam.id, "announcements/recent"],
          staleTime: 2 * 60 * 1000,
        });
      }
    }
  }, [teams, teamsLoading, queryClient]);

  // Handle navigation and data loading
  useEffect(() => {
    // Check localStorage for recently created team
    const recentlyCreatedTeamData = window.localStorage.getItem('team_created');
    
    if (recentlyCreatedTeamData) {
      console.log("Found recently created team in localStorage, refreshing team list");
      
      try {
        // Parse the team data
        const teamData = JSON.parse(recentlyCreatedTeamData);
        
        // If the team was created within the last 5 minutes, don't create mock data
        if (teamData && teamData.timestamp && (Date.now() - teamData.timestamp < 5 * 60 * 1000)) {
          // Clear the localStorage entry after a delay to prevent persisting stale data
          setTimeout(() => {
            window.localStorage.removeItem('team_created');
          }, 10000);
          
          // Force refresh the teams data
          queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
          return;
        }
      } catch (e) {
        console.error("Error parsing team data from localStorage:", e);
        // Remove invalid data
        window.localStorage.removeItem('team_created');
      }
    }
    
    // Check if user just completed onboarding by joining a team
    const recentlyJoinedTeam = window.localStorage.getItem('team_joined');
    const hasRecentlyJoined = recentlyJoinedTeam && (Date.now() - parseInt(recentlyJoinedTeam) < 60000); // 60 seconds
    
    // If user hasn't completed onboarding, redirect to onboarding page
    if (user && !user.onboardingCompleted && window.location.pathname !== "/onboarding") {
      console.log("User hasn't completed onboarding, redirecting to onboarding page");
      setLocation("/onboarding");
      return;
    }
    
    // Only create mock data if:
    // 1. User has completed onboarding 
    // 2. Has no teams
    // 3. Teams data has finished loading
    // 4. User didn't just join a team
    if (teams && teams.length === 0 && user?.onboardingCompleted && !teamsLoading && !hasRecentlyJoined) {
      apiRequest("/api/mock-data", {
        method: "POST"
      })
        .then(() => {
          // Refetch teams after creating mock data
          window.location.reload();
        })
        .catch(error => {
          console.error("Failed to create mock data:", error);
        });
    }
    
    // Clean up the recently joined flag after some time
    if (hasRecentlyJoined && teams && teams.length > 0) {
      window.localStorage.removeItem('team_joined');
    }
  }, [teams, user, setLocation, queryClient, teamsLoading]);

  // Select the first team by default
  const selectedTeam = teams && teams.length > 0 ? teams[0] : null;

  // If we have a selected team, fetch related data with optimized caching
  const { data: recentMatches, isLoading: matchesLoading } = useQuery<Match[]>({
    queryKey: ["/api/teams", selectedTeam?.id, "matches/recent"],
    enabled: !!selectedTeam,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in memory for 10 minutes
  });

  const { data: upcomingEvents, isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/teams", selectedTeam?.id, "events"],
    enabled: !!selectedTeam,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in memory for 10 minutes
    queryFn: async () => {
      if (!selectedTeam) return [];
      console.log("Dashboard: Fetching events for team", selectedTeam.id);
      const response = await fetch(`/api/teams/${selectedTeam.id}/events`, {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch events");
      const allEvents = await response.json();
      console.log("Dashboard: Retrieved events:", allEvents);
      const now = new Date();
      const upcomingEvents = allEvents
        .filter((event: Event) => new Date(event.startTime) >= now)
        .sort((a: Event, b: Event) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
        .slice(0, 2); // Limit to maximum 2 upcoming events
      console.log("Dashboard: Filtered upcoming events (max 2):", upcomingEvents);
      return upcomingEvents;
    }
  });

  const { data: announcements, isLoading: announcementsLoading } = useQuery<
    (Announcement & { creator?: any })[]
  >({
    queryKey: ["/api/teams", selectedTeam?.id, "announcements/recent"],
    enabled: !!selectedTeam,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in memory for 10 minutes
    queryFn: async () => {
      if (!selectedTeam?.id) {
        return [];
      }
      try {
        console.log("Dashboard: Fetching announcements for team", selectedTeam.id);
        const response = await apiRequest(`/api/teams/${selectedTeam.id}/announcements/recent`);
        const data = Array.isArray(response) ? response : [];
        console.log("Dashboard: Retrieved announcements:", data);
        return data as (Announcement & { creator?: any })[];
      } catch (error) {
        console.error("Dashboard: Failed to fetch announcements:", error);
        return [];
      }
    },
  });

  const isLoading = teamsLoading;
  const isDataLoading = matchesLoading || eventsLoading || announcementsLoading;

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
              <UpcomingEvents 
                events={upcomingEvents || []} 
                onRefresh={() => queryClient.invalidateQueries({ queryKey: ["/api/teams", selectedTeam?.id, "events"] })}
              />
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