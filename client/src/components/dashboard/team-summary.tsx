import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Team, TeamMember } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Match } from "@shared/schema";
import { Link } from "wouter";
import { useLanguage } from "@/hooks/use-language";

interface TeamSummaryProps {
  team: Team | null;
  isDemoMode?: boolean;
}

export default function TeamSummary({ team, isDemoMode = false }: TeamSummaryProps) {
  const { t } = useLanguage();

  const { data: matches } = useQuery<Match[]>({
    queryKey: ["/api/teams", team?.id, "matches"],
    enabled: !!team && !isDemoMode,
    queryFn: async () => {
      if (!team?.id) return [];
      console.log(`Dashboard: Fetching matches for team ${team.id}`);
      const response = await fetch(`/api/teams/${team.id}/matches`, {
        credentials: "include",
      });
      if (!response.ok) {
        console.error(`Dashboard: Error fetching matches: ${response.statusText}`);
        return [];
      }
      const matchData = await response.json();
      console.log(`Dashboard: Retrieved ${matchData.length} matches for team ${team.id}`, matchData);
      return matchData;
    },
  });

  // Get team members to show accurate player count
  const { data: teamMembers } = useQuery<(TeamMember & { user: any })[]>({
    queryKey: ["/api/teams", team?.id, "members"],
    enabled: !!team && !isDemoMode,
    queryFn: async () => {
      if (!team?.id) return [];
      console.log(`Dashboard: Fetching team members for team ${team.id}`);
      const response = await fetch(`/api/teams/${team.id}/members`, {
        credentials: "include",
      });
      if (!response.ok) {
        console.error(`Dashboard: Error fetching team members: ${response.statusText}`);
        return [];
      }
      const members = await response.json();
      console.log(`Dashboard: Retrieved ${members.length} team members for team ${team.id}`);
      return members;
    },
  });

  if (!team) return null;

  // If in demo mode, use mock counts, otherwise use actual data
  const playerCount = isDemoMode ? 15 : teamMembers?.length || 0;
  const matchCount = isDemoMode ? 8 : matches?.length || 0;
  
  // Calculate win count
  const winCount = isDemoMode ? 5 : matches?.filter(m => {
    // Only count completed matches where our team scored more than the opponent
    if (m.status !== "completed") return false;
    if (m.goalsScored === null || m.goalsScored === undefined) return false;
    if (m.goalsConceded === null || m.goalsConceded === undefined) return false;
    return m.goalsScored > m.goalsConceded;
  }).length || 0;
  
  // Calculate goal count
  const goalCount = isDemoMode ? 12 : matches?.reduce((total, match) => 
    total + (match.goalsScored || 0), 0
  ) || 0;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">{t("dashboard.teamSummary")}</h2>
          <div className="flex items-center justify-center">
            <span className="bg-primary/10 text-primary text-sm px-3 py-1 rounded-full text-center">
              {t("dashboard.season")} {team.seasonYear || "2023/24"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center p-2 rounded-lg bg-background">
            <p className="text-sm text-gray-500">{t("dashboard.players")}</p>
            <p className="text-xl font-semibold text-primary">{playerCount}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-background">
            <p className="text-sm text-gray-500">{t("dashboard.matches")}</p>
            <p className="text-xl font-semibold text-primary">{matchCount}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-background">
            <p className="text-sm text-gray-500">{t("dashboard.wins")}</p>
            <p className="text-xl font-semibold text-primary">{winCount}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-background">
            <p className="text-sm text-gray-500">{t("dashboard.goals")}</p>
            <p className="text-xl font-semibold text-primary">{goalCount}</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <img 
            src={team.logo || "https://ui-avatars.com/api/?name=Team&background=0D47A1&color=fff"} 
            alt={`Team ${team.name}`} 
            className="w-14 h-14 rounded-full object-cover border-2 border-primary"
          />
          <div>
            <h3 className="text-lg font-medium">{team.name}</h3>
            <p className="text-sm text-gray-500">{team.division}</p>
          </div>
          
        </div>
      </CardContent>
    </Card>
  );
}