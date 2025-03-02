import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Match } from "@shared/schema";
import { Link } from "wouter";
import { format } from "date-fns";

interface RecentMatchesProps {
  matches: Match[];
}

export default function RecentMatches({ matches }: RecentMatchesProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Recent Matches</h2>
          <Link href="/matches">
            <a className="text-sm text-primary">View All Matches</a>
          </Link>
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
                      src="https://ui-avatars.com/api/?name=Team&background=0D47A1&color=fff" 
                      alt="Team logo" 
                      className="w-8 h-8 rounded-full object-cover" 
                    />
                    <span className="font-medium">Manchester United</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-lg">{match.goalsScored || 0}</span>
                    {match.goalsScored !== undefined && match.goalsConceded !== undefined && (
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
                <Button variant="outline" className="w-full mt-3 py-1.5 text-sm text-primary border border-primary rounded-md hover:bg-primary/5">
                  View Match Details
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
