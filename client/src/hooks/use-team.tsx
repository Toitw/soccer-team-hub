import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Team } from '@shared/schema';
import { useAuth } from './use-auth';

interface TeamContextType {
  teams: Team[];
  selectedTeam: Team | null;
  selectTeam: (teamId: number) => void;
  isLoading: boolean;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export function TeamProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);

  // Fetch user's teams
  const {
    data: teams = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['/api/teams'],
    enabled: isAuthenticated,
  });

  // Find the selected team in the list
  const selectedTeam = teams.find((team) => team.id === selectedTeamId) || null;

  // Select a team by ID
  const selectTeam = (teamId: number) => {
    setSelectedTeamId(teamId);
    localStorage.setItem('selectedTeamId', teamId.toString());
  };

  // Load selected team from local storage on initial render
  useEffect(() => {
    if (teams.length > 0) {
      const savedTeamId = localStorage.getItem('selectedTeamId');
      
      if (savedTeamId && teams.some(team => team.id === parseInt(savedTeamId))) {
        setSelectedTeamId(parseInt(savedTeamId));
      } else {
        // Default to first team if saved team not found
        setSelectedTeamId(teams[0].id);
        localStorage.setItem('selectedTeamId', teams[0].id.toString());
      }
    }
  }, [teams]);

  // Refetch teams when user changes
  useEffect(() => {
    if (isAuthenticated) {
      refetch();
    }
  }, [isAuthenticated, refetch]);

  return (
    <TeamContext.Provider
      value={{
        teams,
        selectedTeam,
        selectTeam,
        isLoading,
      }}
    >
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
}