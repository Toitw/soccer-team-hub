import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Team } from "@shared/schema";
import { useAuth } from "./use-auth";

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

  // Fetch user's teams
  const { data: teams = [], isLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
    queryFn: async () => {
      const response = await fetch("/api/teams");
      if (!response.ok) throw new Error("Failed to fetch teams");
      return response.json();
    },
    enabled: !!user,
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