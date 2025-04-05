import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Team, TeamMember } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Match } from "@shared/schema";
import { Link } from "wouter";

interface TeamSummaryProps {
  team: Team | null;
}

export default function TeamSummary({ team }: TeamSummaryProps) {
  const { data: matches } = useQuery<Match[]>({
    queryKey: ["/api/teams", team?.id, "matches"],
    enabled: !!team,
  });
  
  // Get team members to show accurate player count
  const { data: teamMembers } = useQuery<(TeamMember & { user: any })[]>({
    queryKey: ["/api/teams", team?.id, "members"],
    enabled: !!team,
  });

  if (!team) return null;

  const winCount = matches?.filter(m => {
    // Only count completed matches where our team scored more than the opponent
    if (m.status !== "completed") return false;
    if (m.goalsScored === null || m.goalsScored === undefined) return false;
    if (m.goalsConceded === null || m.goalsConceded === undefined) return false;
    return m.goalsScored > m.goalsConceded;
  }).length || 0;

  const goalCount = matches?.reduce((total, match) => 
    total + (match.goalsScored || 0), 0
  ) || 0;

  const playerCount = teamMembers?.length || 0;
  const matchCount = matches?.length || 0;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Team Summary</h2>
          <span className="bg-primary/10 text-primary text-sm px-3 py-1 rounded-full">
            Season {team.seasonYear || "2023/24"}
          </span>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center p-2 rounded-lg bg-background">
            <p className="text-sm text-gray-500">Players</p>
            <p className="text-xl font-semibold text-primary">{playerCount}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-background">
            <p className="text-sm text-gray-500">Matches</p>
            <p className="text-xl font-semibold text-primary">{matchCount}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-background">
            <p className="text-sm text-gray-500">Wins</p>
            <p className="text-xl font-semibold text-secondary">{winCount}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-background">
            <p className="text-sm text-gray-500">Goals</p>
            <p className="text-xl font-semibold text-accent">{goalCount}</p>
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
          <div className="ml-auto">
            <Link href="/team">
              <Button className="text-sm bg-primary text-white py-2 px-4 rounded-md hover:bg-primary/90">
                Team Details
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
