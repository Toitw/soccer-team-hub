import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Match, Team } from "@shared/schema";
import { Link } from "wouter";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";

interface RecentMatchesProps {
  matches: Match[];
  teamId?: number;
}

export default function RecentMatches({ matches, teamId }: RecentMatchesProps) {
  const { data: teams } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  // Select the first team by default or find team by ID
  const selectedTeam = teamId 
    ? teams?.find(team => team.id === teamId) 
    : teams && teams.length > 0 ? teams[0] : null;
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Recent Matches</h2>
          <div 
            onClick={() => window.location.href = '/matches'}
            className="text-sm text-primary cursor-pointer"
          >
            View All Matches
          </div>
        </div>
        
        {matches.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No recent matches found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map(match => (
              <div key={match.id} className="bg-background rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-2">
                  {match.location} • {match.matchDate ? format(new Date(match.matchDate), "MMMM d, yyyy") : "Date not set"}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <img 
                      src={selectedTeam?.logo || "https://ui-avatars.com/api/?name=Team&background=0D47A1&color=fff"} 
                      alt={selectedTeam?.name || "Team logo"} 
                      className="w-8 h-8 rounded-full object-cover" 
                    />
                    <span className="font-medium">{selectedTeam?.name || "Our Team"}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-lg">{match.goalsScored || 0}</span>
                    {match.goalsScored !== undefined && match.goalsConceded !== undefined && match.goalsScored !== null && match.goalsConceded !== null && (
                      <span className={`text-xs px-3 py-1 text-white rounded ${
                        match.goalsScored > match.goalsConceded 
                          ? "bg-secondary" 
                          : match.goalsScored < match.goalsConceded 
                            ? "bg-red-500" 
                            : "bg-yellow-500"
                      }`}>
                        {match.goalsScored > match.goalsConceded ? "WIN" : match.goalsScored < match.goalsConceded ? "LOSS" : "DRAW"}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center space-x-3">
                    <img 
                      src={match.opponentLogo || "https://ui-avatars.com/api/?name=Opponent&background=f44336&color=fff"} 
                      alt="Team logo" 
                      className="w-8 h-8 rounded-full object-cover" 
                    />
                    <span className="font-medium">{match.opponentName}</span>
                  </div>
                  <div>
                    <span className="font-bold text-lg">{match.goalsConceded || 0}</span>
                  </div>
                </div>
                <Link href={`/matches/${match.id}`}>
                  <Button variant="outline" className="w-full mt-3 py-1.5 text-sm text-primary border border-primary rounded-md hover:bg-primary/5">
                    View Match Details
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
