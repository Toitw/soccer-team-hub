
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Match, Team } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { CalendarIcon, MapPin, Clock, Share2, Home } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/hooks/use-language";

interface NextMatchProps {
  teamId?: number;
  isDemoMode?: boolean;
}

export default function NextMatch({ teamId, isDemoMode = false }: NextMatchProps) {
  const { t } = useLanguage();
  const { data: teams } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  // Select the first team by default
  const selectedTeam = teamId 
    ? teams?.find(team => team.id === teamId) 
    : teams && teams.length > 0 ? teams[0] : null;

  const { data: matches, isLoading } = useQuery<Match[]>({
    queryKey: ["matches", selectedTeam?.id],
    enabled: !!selectedTeam && !isDemoMode,
    queryFn: async () => {
      if (!selectedTeam) return [];
      const response = await fetch(`/api/teams/${selectedTeam.id}/matches`);
      if (!response.ok) throw new Error('Failed to fetch matches');
      return response.json();
    }
  });

  // Get the next upcoming match (closest match with status "scheduled")
  const getNextMatch = () => {
    // If we're in demo mode, return a mock match
    if (isDemoMode) {
      // Create a date 3 days from now
      const matchDate = new Date();
      matchDate.setDate(matchDate.getDate() + 3);
      
      return {
        id: 9991,
        teamId: 999,
        opponentName: "Demo FC",
        opponentLogo: "https://upload.wikimedia.org/wikipedia/commons/c/ce/Football_rough.svg",
        matchDate: matchDate.toISOString(),
        location: "Demo Stadium",
        isHome: true,
        goalsScored: null,
        goalsConceded: null,
        status: "scheduled",
        matchType: "league",
        notes: "Important match in demo mode",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
    
    // Otherwise proceed with normal match retrieval 
    if (!matches || matches.length === 0) return null;
    
    const now = new Date();
    const upcomingMatches = matches
      .filter(match => match.status === "scheduled")
      .sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());
    
    return upcomingMatches.length > 0 ? upcomingMatches[0] : null;
  };

  const nextMatch = getNextMatch();
  
  // Calculate days remaining until the match
  const getDaysRemaining = (matchDate: string) => {
    const now = new Date();
    const match = new Date(matchDate);
    const diffTime = Math.abs(match.getTime() - now.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-primary" />
          {t("matches.nextMatch")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : nextMatch ? (
          <div className="space-y-3">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {nextMatch.isHome ? (
                    <Badge variant="outline" className="flex items-center gap-1 bg-blue-50">
                      <Home className="h-3 w-3" />
                      {t("common.home")}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Share2 className="h-3 w-3" />
                      {t("common.away")}
                    </Badge>
                  )}
                  <span className="text-sm font-medium">
                    {getDaysRemaining(nextMatch.matchDate) === 0 
                      ? t("matches.today") 
                      : getDaysRemaining(nextMatch.matchDate) === 1 
                        ? t("matches.tomorrow") 
                        : t("matches.inDays", { days: getDaysRemaining(nextMatch.matchDate) })}
                  </span>
                </div>
                <Badge variant={getDaysRemaining(nextMatch.matchDate) <= 3 ? "default" : "outline"}>
                  {getDaysRemaining(nextMatch.matchDate) <= 3 ? t("matches.soon") : t("matches.scheduled")}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="relative">
                    <img 
                      src={selectedTeam?.logo || "https://ui-avatars.com/api/?name=Team&background=0D47A1&color=fff"} 
                      alt={selectedTeam?.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                    />
                  </div>
                  <div className="ml-3">
                    <p className="font-medium">{selectedTeam?.name}</p>
                  </div>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <span className="text-lg font-bold">{t("matches.vs")}</span>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="mr-3 text-right">
                    <p className="font-medium">{nextMatch.opponentName}</p>
                  </div>
                  <div className="relative">
                    <img 
                      src={nextMatch.opponentLogo || `https://ui-avatars.com/api/?name=${nextMatch.opponentName.charAt(0)}&background=f44336&color=fff`} 
                      alt={nextMatch.opponentName}
                      className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 text-sm mt-4">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1 text-gray-500" />
                  <span>{format(new Date(nextMatch.matchDate), "h:mm a")}</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1 text-gray-500" />
                  <span>{nextMatch.location}</span>
                </div>
              </div>
            </div>
            
            <Link href="/matches">
              <Button variant="outline" className="w-full">
                {t("matches.viewAllMatches")}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6">
            <CalendarIcon className="h-12 w-12 text-gray-300 mb-2" />
            <p className="text-gray-500 mb-2">{t("matches.noUpcomingMatches")}</p>
            {isDemoMode ? (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  window.location.href = '/onboarding';
                }}
              >
                {t("dashboard.createTeamFirst")}
              </Button>
            ) : (
              <Link href="/matches">
                <Button variant="outline" size="sm">
                  {t("matches.scheduleMatch")}
                </Button>
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
