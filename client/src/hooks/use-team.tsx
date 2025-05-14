import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Team } from "@shared/schema";
import { useAuth } from "./use-auth";
import { queryClient } from "@/lib/queryClient";

interface TeamContextType {
  teams: Team[];
  isLoading: boolean;
  selectedTeam: Team | null;
  setSelectedTeam: (team: Team) => void;
  selectTeamById: (id: number) => void;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export function TeamProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  // Check localStorage for newly created team
  useEffect(() => {
    const teamCreated = localStorage.getItem('team_created');
    if (teamCreated) {
      const parsed = JSON.parse(teamCreated);
      const timestamp = parsed.timestamp;
      
      // If created within the last 10 seconds
      if (Date.now() - timestamp < 10000) {
        // Clear it after reading
        localStorage.removeItem('team_created');
        console.log("Found recently created team in localStorage, refreshing team list");
        
        // Invalidate teams query to force a refetch
        queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
      }
    }
  }, []);

  // Fetch user's teams
  const { data: teams = [], isLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
    queryFn: async () => {
      const response = await fetch("/api/teams");
      if (!response.ok) throw new Error("Failed to fetch teams");
      return response.json();
    },
    enabled: !!user,
    // Force refetch on mount and window focus to ensure we have fresh data after creation
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  // Set the first team as selected by default when teams load
  useEffect(() => {
    if (teams.length > 0 && !selectedTeam) {
      setSelectedTeam(teams[0]);
    }
  }, [teams, selectedTeam]);

  // Function to select a team by ID
  const selectTeamById = (id: number) => {
    const team = teams.find((t) => t.id === id);
    if (team) {
      setSelectedTeam(team);
    }
  };

  return (
    <TeamContext.Provider
      value={{
        teams,
        isLoading,
        selectedTeam,
        setSelectedTeam,
        selectTeamById,
      }}
    >
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error("useTeam must be used within a TeamProvider");
  }
  return context;
}