import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Team, TeamUser } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Match } from "@shared/schema";
import { Link } from "wouter";
import { useLanguage } from "@/hooks/use-language";
import { Users } from "lucide-react";

// Interface for Season data
interface Season {
  id: number;
  teamId: number;
  name: string;
  startDate: string;
  endDate: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TeamSummaryProps {
  team: Team | null;
  isDemoMode?: boolean;
}

export default function TeamSummary({ team, isDemoMode = false }: TeamSummaryProps) {
  const { t } = useLanguage();

  // Fetch active season
  const { data: seasons } = useQuery<Season[]>({
    queryKey: ["/api/teams", team?.id, "seasons"],
    enabled: !!team && !isDemoMode,
    queryFn: async () => {
      if (!team?.id) return [];
      const response = await fetch(`/api/teams/${team.id}/seasons`, {
        credentials: "include",
      });
      if (!response.ok) return [];
      return response.json();
    },
  });

  const activeSeason = seasons?.find(s => s.isActive);

  const { data: allMatches } = useQuery<Match[]>({
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

  // Filter matches by active season (same logic as matches page)
  const matches = allMatches ? (() => {
    if (activeSeason) {
      return allMatches.filter(match => match.seasonId === activeSeason.id);
    }
    // If no active season, show legacy data (matches without seasonId)
    return allMatches.filter(match => !match.seasonId);
  })() : [];

  // Get team users to show accurate player count
  const { data: teamUsers } = useQuery<TeamUser[]>({
    queryKey: ["/api/teams", team?.id, "users"],
    enabled: !!team && !isDemoMode,
    queryFn: async () => {
      if (!team?.id) return [];
      console.log(`Dashboard: Fetching team users for team ${team.id}`);
      const response = await fetch(`/api/teams/${team.id}/users`, {
        credentials: "include",
      });
      if (!response.ok) {
        console.error(`Dashboard: Error fetching team users: ${response.statusText}`);
        return [];
      }
      const users = await response.json();
      console.log(`Dashboard: Retrieved ${users.length} team users for team ${team.id}`);
      return users;
    },
  });

  if (!team) return null;

  // If in demo mode, use mock counts, otherwise use actual data
  const playerCount = isDemoMode ? 15 : teamUsers?.length || 0;
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
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          {t("dashboard.teamSummary")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Show message when no active season exists */}
        {!isDemoMode && seasons && seasons.length > 0 && !activeSeason && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              {t("dashboard.noActiveSeason")}
            </p>
          </div>
        )}

        <div className="space-y-3">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center space-x-4 mb-4">
              <img 
                src={team.logo || "https://ui-avatars.com/api/?name=Team&background=0D47A1&color=fff"} 
                alt={`Team ${team.name}`} 
                className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
              />
              <div>
                <h3 className="font-medium">{team.name}</h3>
                <p className="text-sm text-gray-500">{team.division}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="text-center p-3 rounded-lg bg-white border border-gray-200">
                <p className="text-sm text-gray-500">{t("dashboard.players")}</p>
                <p className="text-xl font-semibold text-primary">{playerCount}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-white border border-gray-200">
                <p className="text-sm text-gray-500">{t("dashboard.matches")}</p>
                <p className="text-xl font-semibold text-primary">{matchCount}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-white border border-gray-200">
                <p className="text-sm text-gray-500">{t("dashboard.wins")}</p>
                <p className="text-xl font-semibold text-primary">{winCount}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-white border border-gray-200">
                <p className="text-sm text-gray-500">{t("dashboard.goals")}</p>
                <p className="text-xl font-semibold text-primary">{goalCount}</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}