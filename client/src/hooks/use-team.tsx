import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Team } from '@shared/schema';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './use-auth';

interface TeamContextType {
  selectedTeam: Team | null;
  setSelectedTeam: (team: Team | null) => void;
  teams: Team[];
  isLoading: boolean;
  error: Error | null;
}

// Create context
const TeamContext = createContext<TeamContextType | null>(null);

// Provider component
export function TeamProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  // Fetch user teams
  const { 
    data: teams = [], 
    isLoading,
    error 
  } = useQuery<Team[]>({
    queryKey: ['/api/teams'],
    enabled: !!isAuthenticated,
  });

  // Set the first team as selected if none is selected and teams are loaded
  useEffect(() => {
    if (teams?.length > 0 && !selectedTeam) {
      setSelectedTeam(teams[0]);
    }
  }, [teams, selectedTeam]);

  // Get from localStorage on initial load
  useEffect(() => {
    const savedTeamId = localStorage.getItem('selectedTeamId');
    if (savedTeamId && teams?.length > 0) {
      const team = teams.find(t => t.id === parseInt(savedTeamId));
      if (team) {
        setSelectedTeam(team);
      }
    }
  }, [teams]);

  // Save to localStorage when selection changes
  useEffect(() => {
    if (selectedTeam) {
      localStorage.setItem('selectedTeamId', selectedTeam.id.toString());
    }
  }, [selectedTeam]);

  return (
    <TeamContext.Provider value={{ 
      selectedTeam, 
      setSelectedTeam, 
      teams: teams || [], 
      isLoading, 
      error 
    }}>
      {children}
    </TeamContext.Provider>
  );
}

// Custom hook to use the team context
export function useTeam() {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
}

export default useTeam;