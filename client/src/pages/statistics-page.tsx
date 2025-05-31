import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useState, useMemo, useEffect } from "react";
import { useTeam } from "../hooks/use-team";
import { Match, TeamMember, LeagueClassification } from "@shared/schema";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import MobileNavigation from "@/components/mobile-navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Loader2, BarChart3, TrendingUp, Trophy, Users, Goal, Award, Clock, Calendar, FilterIcon } from "lucide-react";
import { useTranslation } from "../hooks/use-translation";
import { format, parseISO } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Interface for Season data
interface Season {
  id: number;
  name: string;
  teamId: number;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function StatisticsPage() {
  const { user } = useAuth();
  const { selectedTeam } = useTeam();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("team");
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);

  // Fetch team members
  const { data: teamMembers, isLoading: teamMembersLoading } = useQuery<
    (TeamMember & { user: any })[]
  >({
    queryKey: ["/api/teams", selectedTeam?.id, "members"],
    queryFn: async () => {
      if (!selectedTeam?.id) return [];
      const response = await fetch(`/api/teams/${selectedTeam.id}/members`);
      if (!response.ok) throw new Error("Failed to fetch team members");
      return response.json();
    },
    enabled: !!selectedTeam,
  });

  // Fetch matches (filtered by season if selected)
  const { data: matches, isLoading: matchesLoading } = useQuery<Match[]>({
    queryKey: ["/api/teams", selectedTeam?.id, "matches", selectedSeasonId],
    queryFn: async () => {
      if (!selectedTeam?.id) return [];
      
      let url = `/api/teams/${selectedTeam.id}/matches`;
      if (selectedSeasonId) {
        // For now, we don't have season-specific matches endpoint, but we can filter client-side
        // In the future, you might want to implement a server-side endpoint for this
        url = `/api/teams/${selectedTeam.id}/matches`;
      }
      
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch matches");
      
      const allMatches = await response.json();
      
      // If a season is selected, filter matches based on date range
      if (selectedSeasonId && seasons) {
        const season = seasons.find(s => s.id.toString() === selectedSeasonId);
        if (season) {
          const startDate = new Date(season.startDate);
          const endDate = season.endDate ? new Date(season.endDate) : new Date();
          
          return allMatches.filter((match: Match) => {
            const matchDate = new Date(match.matchDate);
            return matchDate >= startDate && matchDate <= endDate;
          });
        }
      }
      
      return allMatches;
    },
    enabled: !!selectedTeam,
  });

  // Fetch available seasons for the team
  const { data: seasons, isLoading: seasonsLoading } = useQuery<Season[]>({
    queryKey: ["/api/teams", selectedTeam?.id, "seasons"],
    queryFn: async () => {
      if (!selectedTeam?.id) return [];
      const response = await fetch(`/api/teams/${selectedTeam.id}/seasons`);
      if (!response.ok) throw new Error("Failed to fetch team seasons");
      return response.json();
    },
    enabled: !!selectedTeam,
  });
  
  // Set default selected season when seasons are loaded
  useEffect(() => {
    if (seasons && seasons.length > 0 && !selectedSeasonId) {
      // Find an active season if any
      const activeSeason = seasons.find(s => s.isActive);
      if (activeSeason) {
        setSelectedSeasonId(activeSeason.id.toString());
      } else {
        // Default to the most recent season
        const mostRecent = [...seasons].sort((a, b) => 
          new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
        )[0];
        setSelectedSeasonId(mostRecent.id.toString());
      }
    }
  }, [seasons, selectedSeasonId]);

  // Fetch league classification (either for all seasons or for a specific season)
  const { data: classification, isLoading: classificationLoading } = useQuery<LeagueClassification[]>({
    queryKey: ["/api/teams", selectedTeam?.id, "seasons", selectedSeasonId, "classifications"],
    queryFn: async () => {
      if (!selectedTeam?.id) return [];
      
      let url = `/api/teams/${selectedTeam.id}/classification`;
      if (selectedSeasonId) {
        url = `/api/teams/${selectedTeam.id}/seasons/${selectedSeasonId}/classifications`;
      }
      
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch league classification");
      return response.json();
    },
    enabled: !!selectedTeam,
  });

  // Calculate team statistics
  const teamStats = useMemo(() => {
    if (!matches) return {
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsScored: 0,
      goalsConceded: 0,
      winPercentage: 0,
      cleanSheets: 0,
      form: []
    };

    // Only count completed matches
    const completedMatches = matches.filter(m => m.status === "completed");
    
    const won = completedMatches.filter(m => (m.goalsScored || 0) > (m.goalsConceded || 0)).length;
    const drawn = completedMatches.filter(m => (m.goalsScored || 0) === (m.goalsConceded || 0)).length;
    const lost = completedMatches.filter(m => (m.goalsScored || 0) < (m.goalsConceded || 0)).length;
    const goalsScored = completedMatches.reduce((total, match) => total + (match.goalsScored || 0), 0);
    const goalsConceded = completedMatches.reduce((total, match) => total + (match.goalsConceded || 0), 0);
    const cleanSheets = completedMatches.filter(m => m.goalsConceded === 0).length;
    
    // Get the last 5 matches for form (W/D/L)
    const lastFiveMatches = [...completedMatches]
      .sort((a, b) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime())
      .slice(0, 5)
      .map(match => {
        if (match.goalsScored > match.goalsConceded) return 'W';
        if (match.goalsScored === match.goalsConceded) return 'D';
        return 'L';
      });

    return {
      played: completedMatches.length,
      won,
      drawn,
      lost,
      goalsScored,
      goalsConceded,
      winPercentage: completedMatches.length ? Math.round((won / completedMatches.length) * 100) : 0,
      cleanSheets,
      form: lastFiveMatches
    };
  }, [matches]);

  // Fetch player statistics from API
  const { data: apiPlayerStats, isLoading: playerStatsLoading } = useQuery<any[]>({
    queryKey: ["/api/teams", selectedTeam?.id, "player-stats", selectedSeasonId],
    queryFn: async () => {
      if (!selectedTeam?.id) return [];
      
      // Build URL with season filter if selected
      let url = `/api/teams/${selectedTeam.id}/player-stats`;
      if (selectedSeasonId) {
        url += `?seasonId=${selectedSeasonId}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch player statistics");
      
      return response.json();
    },
    enabled: !!selectedTeam,
  });

  // Process player statistics
  const playerStats = useMemo(() => {
    // If API data is available, use it
    if (apiPlayerStats) return apiPlayerStats;
    
    // Fallback to empty array if no data
    return [];
  }, [apiPlayerStats]);

  // Sort player stats by goals scored
  const topScorers = useMemo(() => {
    return [...playerStats].sort((a, b) => b.goals - a.goals);
  }, [playerStats]);

  // Sort player stats by assists
  const topAssistProviders = useMemo(() => {
    return [...playerStats].sort((a, b) => b.assists - a.assists);
  }, [playerStats]);

  // Calculate match distribution by type
  const matchesByType = useMemo(() => {
    if (!matches) return { league: 0, friendly: 0, cup: 0, other: 0 };
    
    // Create base stats object
    const stats = { league: 0, friendly: 0, cup: 0, other: 0 };
    
    // Count matches by type
    matches.forEach(match => {
      const type = match.matchType || 'other';
      
      // Map copa type to cup in our UI
      if (type === 'copa') {
        stats.cup += 1;
      } else if (type === 'league' || type === 'friendly') {
        stats[type] += 1;
      } else {
        stats.other += 1;
      }
    });
    
    return stats;
  }, [matches]);

  // Calculate home/away stats
  const homeAwayStats = useMemo(() => {
    if (!matches) return { home: { played: 0, won: 0, drawn: 0, lost: 0 }, away: { played: 0, won: 0, drawn: 0, lost: 0 } };
    
    // Only use completed matches
    const completedMatches = matches.filter(m => m.status === "completed");
    
    const homeMatches = completedMatches.filter(m => m.isHome);
    const awayMatches = completedMatches.filter(m => !m.isHome);
    
    return {
      home: {
        played: homeMatches.length,
        won: homeMatches.filter(m => m.goalsScored > m.goalsConceded).length,
        drawn: homeMatches.filter(m => m.goalsScored === m.goalsConceded).length,
        lost: homeMatches.filter(m => m.goalsScored < m.goalsConceded).length,
      },
      away: {
        played: awayMatches.length,
        won: awayMatches.filter(m => m.goalsScored > m.goalsConceded).length,
        drawn: awayMatches.filter(m => m.goalsScored === m.goalsConceded).length,
        lost: awayMatches.filter(m => m.goalsScored < m.goalsConceded).length,
      }
    };
  }, [matches]);

  // Calculate monthly performance
  const monthlyPerformance = useMemo(() => {
    if (!matches) return [];
    
    // Only use completed matches
    const completedMatches = matches.filter(m => m.status === "completed");
    
    // Group matches by month
    const monthlyStats = completedMatches.reduce((acc, match) => {
      const date = new Date(match.matchDate);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!acc[monthYear]) {
        acc[monthYear] = {
          month: format(date, 'MMM yyyy'),
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goalsScored: 0,
          goalsConceded: 0
        };
      }
      
      acc[monthYear].played++;
      
      if (match.goalsScored > match.goalsConceded) {
        acc[monthYear].won++;
      } else if (match.goalsScored === match.goalsConceded) {
        acc[monthYear].drawn++;
      } else {
        acc[monthYear].lost++;
      }
      
      acc[monthYear].goalsScored += match.goalsScored || 0;
      acc[monthYear].goalsConceded += match.goalsConceded || 0;
      
      return acc;
    }, {});
    
    // Convert to array and sort chronologically
    return Object.values(monthlyStats).sort((a, b) => {
      const [aYear, aMonth] = a.month.split(' ');
      const [bYear, bMonth] = b.month.split(' ');
      return new Date(`${bMonth} ${bYear}`).getTime() - new Date(`${aMonth} ${aYear}`).getTime();
    });
  }, [matches]);

  const isLoading = teamMembersLoading || matchesLoading || classificationLoading || playerStatsLoading || seasonsLoading;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 ml-0 md:ml-64 flex flex-col overflow-hidden">
        <Header title={t("navigation.statistics")} />
        
        <div className="flex-1 overflow-auto p-4 pb-16 md:pb-16 pb-24">
          <div className="max-w-6xl mx-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex flex-col space-y-4 mb-4">
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-bold hidden md:block">
                    {t("statistics.teamStats")}
                  </h1>
                  <TabsList className="w-full md:w-auto grid grid-cols-4 max-w-full">
                    <TabsTrigger value="team" className="px-1 sm:px-2">
                      <span className="text-xs sm:text-sm">{t("statistics.team")}</span>
                    </TabsTrigger>
                    <TabsTrigger value="players" className="px-1 sm:px-2">
                      <span className="text-xs sm:text-sm">{t("statistics.players")}</span>
                    </TabsTrigger>
                    <TabsTrigger value="performance" className="px-1 sm:px-2">
                      <span className="text-xs sm:text-sm">{t("statistics.performance")}</span>
                    </TabsTrigger>
                    <TabsTrigger value="league" className="px-1 sm:px-2">
                      <span className="text-xs sm:text-sm">{t("statistics.league")}</span>
                    </TabsTrigger>
                  </TabsList>
                </div>
                
                {/* Season selector */}
                {seasons && seasons.length > 0 && (
                  <div className="flex items-center space-x-2 px-2 py-1 bg-muted/50 rounded-lg w-full md:w-auto">
                    <FilterIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground hidden md:inline">
                      {t("statistics.filterBySeason")}:
                    </span>
                    <Select
                      value={selectedSeasonId || ""}
                      onValueChange={(value) => setSelectedSeasonId(value)}
                    >
                      <SelectTrigger className="w-full md:w-[200px] h-8 text-sm bg-background">
                        <SelectValue placeholder={t("statistics.selectSeason")} />
                      </SelectTrigger>
                      <SelectContent>
                        {seasons.map((season) => (
                          <SelectItem key={season.id} value={season.id.toString()}>
                            {season.name}
                            {season.isActive && (
                              <span className="ml-2 text-primary text-xs">
                                ({t("seasons.active")})
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              
              {/* Team Overview */}
              <TabsContent value="team" className="space-y-4">
                {/* Season display banner */}
                {selectedSeasonId && seasons && (
                  <div className="bg-primary/10 text-primary rounded-lg p-3 text-sm">
                    {t("statistics.viewing")} 
                    <span className="font-semibold mx-1">
                      {seasons.find(s => s.id.toString() === selectedSeasonId)?.name}
                    </span>
                    {t("statistics.statistics")}
                  </div>
                )}
                
                {/* Overview Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        {t("statistics.played")}
                      </CardTitle>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{teamStats.played}</div>
                      <p className="text-xs text-muted-foreground">
                        {teamStats.won} {t("statistics.wins")}, {teamStats.drawn} {t("statistics.draws")}, {teamStats.lost} {t("statistics.losses")}
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        {t("statistics.win")} %
                      </CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{teamStats.winPercentage}%</div>
                      <Progress 
                        value={teamStats.winPercentage} 
                        className="h-2 mt-2" 
                      />
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        {t("statistics.goals")}
                      </CardTitle>
                      <Goal className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{teamStats.goalsScored}</div>
                      <p className="text-xs text-muted-foreground">
                        {(teamStats.played > 0 
                          ? (teamStats.goalsScored / teamStats.played).toFixed(1) 
                          : "0")} {t("statistics.goalsPerMatch")}
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        {t("statistics.cleanSheets")}
                      </CardTitle>
                      <Trophy className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{teamStats.cleanSheets}</div>
                      <p className="text-xs text-muted-foreground">
                        {(teamStats.played > 0 
                          ? Math.round((teamStats.cleanSheets / teamStats.played) * 100) 
                          : 0)}% {t("statistics.ofMatches")}
                      </p>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Form and Match Distribution */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("statistics.recentForm")}</CardTitle>
                      <CardDescription>
                        {t("statistics.lastFiveMatches")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex space-x-2">
                        {teamStats.form.length > 0 ? (
                          teamStats.form.map((result, index) => (
                            <div 
                              key={index}
                              className={`w-10 h-10 flex items-center justify-center rounded-full font-bold text-white ${
                                result === 'W' ? 'bg-green-500' : 
                                result === 'D' ? 'bg-yellow-500' : 
                                'bg-red-500'
                              }`}
                            >
                              {result}
                            </div>
                          ))
                        ) : (
                          <p className="text-muted-foreground">{t("statistics.noRecentMatches")}</p>
                        )}
                      </div>
                      
                      <div className="mt-4 text-sm text-muted-foreground">
                        <div className="flex items-center mb-1">
                          <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                          <span>{t("statistics.win")}</span>
                        </div>
                        <div className="flex items-center mb-1">
                          <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                          <span>{t("statistics.draw")}</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                          <span>{t("statistics.loss")}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("statistics.matchDistribution")}</CardTitle>
                      <CardDescription>
                        {t("statistics.matchesByType")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span>{t("statistics.league")}</span>
                            <span>{matchesByType.league}</span>
                          </div>
                          <Progress 
                            value={matches?.length ? (matchesByType.league / matches.length) * 100 : 0} 
                            className="h-2" 
                          />
                        </div>
                        
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span>{t("statistics.friendlyMatch")}</span>
                            <span>{matchesByType.friendly}</span>
                          </div>
                          <Progress 
                            value={matches?.length ? (matchesByType.friendly / matches.length) * 100 : 0} 
                            className="h-2" 
                          />
                        </div>
                        
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span>{t("statistics.cupMatch")}</span>
                            <span>{matchesByType.cup}</span>
                          </div>
                          <Progress 
                            value={matches?.length ? (matchesByType.cup / matches.length) * 100 : 0} 
                            className="h-2" 
                          />
                        </div>
                        
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span>{t("statistics.otherMatch")}</span>
                            <span>{matchesByType.other}</span>
                          </div>
                          <Progress 
                            value={matches?.length ? (matchesByType.other / matches.length) * 100 : 0} 
                            className="h-2" 
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Home vs Away Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t("statistics.homeVsAway")}</CardTitle>
                    <CardDescription>
                      {t("statistics.performanceByVenue")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-lg font-medium mb-3">{t("statistics.home")}</h3>
                        <div className="space-y-2">
                          <div className="grid grid-cols-4 gap-2 text-center">
                            <div className="bg-gray-100 rounded p-2">
                              <div className="text-lg font-semibold">{homeAwayStats.home.played}</div>
                              <div className="text-xs text-gray-500">{t("statistics.played")}</div>
                            </div>
                            <div className="bg-gray-100 rounded p-2">
                              <div className="text-lg font-semibold">{homeAwayStats.home.won}</div>
                              <div className="text-xs text-gray-500">{t("statistics.won")}</div>
                            </div>
                            <div className="bg-gray-100 rounded p-2">
                              <div className="text-lg font-semibold">{homeAwayStats.home.drawn}</div>
                              <div className="text-xs text-gray-500">{t("statistics.drawn")}</div>
                            </div>
                            <div className="bg-gray-100 rounded p-2">
                              <div className="text-lg font-semibold">{homeAwayStats.home.lost}</div>
                              <div className="text-xs text-gray-500">{t("statistics.lost")}</div>
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium mb-1">{t("statistics.winRate")}</div>
                            <Progress 
                              value={homeAwayStats.home.played > 0 
                                ? (homeAwayStats.home.won / homeAwayStats.home.played) * 100 
                                : 0
                              } 
                              className="h-2" 
                            />
                            <div className="text-xs text-right mt-1">
                              {homeAwayStats.home.played > 0 
                                ? Math.round((homeAwayStats.home.won / homeAwayStats.home.played) * 100) 
                                : 0}%
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-medium mb-3">{t("statistics.away")}</h3>
                        <div className="space-y-2">
                          <div className="grid grid-cols-4 gap-2 text-center">
                            <div className="bg-gray-100 rounded p-2">
                              <div className="text-lg font-semibold">{homeAwayStats.away.played}</div>
                              <div className="text-xs text-gray-500">{t("statistics.played")}</div>
                            </div>
                            <div className="bg-gray-100 rounded p-2">
                              <div className="text-lg font-semibold">{homeAwayStats.away.won}</div>
                              <div className="text-xs text-gray-500">{t("statistics.won")}</div>
                            </div>
                            <div className="bg-gray-100 rounded p-2">
                              <div className="text-lg font-semibold">{homeAwayStats.away.drawn}</div>
                              <div className="text-xs text-gray-500">{t("statistics.drawn")}</div>
                            </div>
                            <div className="bg-gray-100 rounded p-2">
                              <div className="text-lg font-semibold">{homeAwayStats.away.lost}</div>
                              <div className="text-xs text-gray-500">{t("statistics.lost")}</div>
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium mb-1">{t("statistics.winRate")}</div>
                            <Progress 
                              value={homeAwayStats.away.played > 0 
                                ? (homeAwayStats.away.won / homeAwayStats.away.played) * 100 
                                : 0
                              } 
                              className="h-2" 
                            />
                            <div className="text-xs text-right mt-1">
                              {homeAwayStats.away.played > 0 
                                ? Math.round((homeAwayStats.away.won / homeAwayStats.away.played) * 100) 
                                : 0}%
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Player Statistics */}
              <TabsContent value="players" className="space-y-4">
                {/* Season display banner */}
                {selectedSeasonId && seasons && (
                  <div className="bg-primary/10 text-primary rounded-lg p-3 text-sm">
                    {t("statistics.viewing")} 
                    <span className="font-semibold mx-1">
                      {seasons.find(s => s.id.toString() === selectedSeasonId)?.name}
                    </span>
                    {t("statistics.playerStatistics")}
                  </div>
                )}
                
                {/* Goal Scorers */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t("statistics.topScorers")}</CardTitle>
                    <CardDescription>
                      {t("statistics.topScorersDesc")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">{t("statistics.rank")}</TableHead>
                          <TableHead>{t("statistics.player")}</TableHead>
                          <TableHead className="text-right">{t("statistics.played")}</TableHead>
                          <TableHead className="text-right">{t("statistics.goals")}</TableHead>
                          <TableHead className="text-right">{t("statistics.goalsPerMatch")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topScorers.length > 0 ? (
                          topScorers.slice(0, 5).map((player, index) => (
                            <TableRow key={player.id}>
                              <TableCell className="font-medium">{index + 1}</TableCell>
                              <TableCell className="font-medium">{player.name}</TableCell>
                              <TableCell className="text-right">{player.matchesPlayed}</TableCell>
                              <TableCell className="text-right">{player.goals}</TableCell>
                              <TableCell className="text-right">
                                {player.matchesPlayed > 0 
                                  ? (player.goals / player.matchesPlayed).toFixed(2) 
                                  : "0"}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                              {t("statistics.noPlayersFound")}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
                
                {/* Assist Providers */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t("statistics.topAssists")}</CardTitle>
                    <CardDescription>
                      {t("statistics.topAssistsDesc")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">{t("statistics.rank")}</TableHead>
                          <TableHead>{t("statistics.player")}</TableHead>
                          <TableHead className="text-right">{t("statistics.played")}</TableHead>
                          <TableHead className="text-right">{t("statistics.playerAssists")}</TableHead>
                          <TableHead className="text-right">{t("statistics.assistsPerMatch")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topAssistProviders.length > 0 ? (
                          topAssistProviders.slice(0, 5).map((player, index) => (
                            <TableRow key={player.id}>
                              <TableCell className="font-medium">{index + 1}</TableCell>
                              <TableCell className="font-medium">{player.name}</TableCell>
                              <TableCell className="text-right">{player.matchesPlayed}</TableCell>
                              <TableCell className="text-right">{player.assists}</TableCell>
                              <TableCell className="text-right">
                                {player.matchesPlayed > 0 
                                  ? (player.assists / player.matchesPlayed).toFixed(2) 
                                  : "0"}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                              {t("statistics.noPlayersFound")}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
                
                {/* Player Appearances */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t("statistics.playerAppearances")}</CardTitle>
                    <CardDescription>
                      {t("statistics.playerAppearancesDesc")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("statistics.player")}</TableHead>
                          <TableHead className="text-right">{t("statistics.played")}</TableHead>
                          <TableHead className="text-right">{t("statistics.minutes")}</TableHead>
                          <TableHead className="text-right">{t("statistics.cards")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {playerStats.length > 0 ? (
                          [...playerStats]
                            .sort((a, b) => b.minutesPlayed - a.minutesPlayed)
                            .slice(0, 5)
                            .map((player) => (
                              <TableRow key={player.id}>
                                <TableCell className="font-medium">{player.name}</TableCell>
                                <TableCell className="text-right">{player.matchesPlayed}</TableCell>
                                <TableCell className="text-right">{player.minutesPlayed}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end space-x-1">
                                    {player.yellowCards > 0 && (
                                      <div className="flex items-center">
                                        <span className="w-3 h-4 bg-yellow-400 inline-block mr-1"></span>
                                        <span>{player.yellowCards}</span>
                                      </div>
                                    )}
                                    {player.redCards > 0 && (
                                      <div className="flex items-center ml-2">
                                        <span className="w-3 h-4 bg-red-500 inline-block mr-1"></span>
                                        <span>{player.redCards}</span>
                                      </div>
                                    )}
                                    {player.yellowCards === 0 && player.redCards === 0 && "-"}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground">
                              {t("statistics.noPlayersFound")}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Performance Analysis */}
              <TabsContent value="performance" className="space-y-4">
                {/* Season display banner */}
                {selectedSeasonId && seasons && (
                  <div className="bg-primary/10 text-primary rounded-lg p-3 text-sm">
                    {t("statistics.viewing")} 
                    <span className="font-semibold mx-1">
                      {seasons.find(s => s.id.toString() === selectedSeasonId)?.name}
                    </span>
                    {t("statistics.performanceStatistics")}
                  </div>
                )}
                
                {/* Monthly Performance */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t("statistics.monthlyPerformance")}</CardTitle>
                    <CardDescription>
                      {t("statistics.monthlyPerformanceDesc")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("statistics.month")}</TableHead>
                          <TableHead className="text-right">{t("statistics.played")}</TableHead>
                          <TableHead className="text-right">{t("statistics.won")}</TableHead>
                          <TableHead className="text-right">{t("statistics.drawn")}</TableHead>
                          <TableHead className="text-right">{t("statistics.lost")}</TableHead>
                          <TableHead className="text-right">{t("statistics.goalsFor")}</TableHead>
                          <TableHead className="text-right">{t("statistics.goalsAgainst")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {monthlyPerformance.length > 0 ? (
                          monthlyPerformance.map((month, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{month.month}</TableCell>
                              <TableCell className="text-right">{month.played}</TableCell>
                              <TableCell className="text-right">{month.won}</TableCell>
                              <TableCell className="text-right">{month.drawn}</TableCell>
                              <TableCell className="text-right">{month.lost}</TableCell>
                              <TableCell className="text-right">{month.goalsScored}</TableCell>
                              <TableCell className="text-right">{month.goalsConceded}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground">
                              {t("statistics.noDataAvailable")}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
                
                {/* Goals Timing Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t("statistics.goalsAnalysis")}</CardTitle>
                    <CardDescription>
                      {t("statistics.goalsAnalysisDesc")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center text-muted-foreground py-8">
                      <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p>{t("statistics.goalsTimingNotAvailable")}</p>
                      <p className="text-sm mt-1">{t("statistics.futureFeature")}</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* League Table */}
              <TabsContent value="league" className="space-y-4">
                {/* Season display banner */}
                {selectedSeasonId && seasons && (
                  <div className="bg-primary/10 text-primary rounded-lg p-3 text-sm">
                    {t("statistics.viewing")} 
                    <span className="font-semibold mx-1">
                      {seasons.find(s => s.id.toString() === selectedSeasonId)?.name}
                    </span>
                    {t("statistics.leagueStatistics")}
                  </div>
                )}
                
                <Card>
                  <CardHeader>
                    <CardTitle>{t("statistics.leagueTable")}</CardTitle>
                    <CardDescription>
                      {t("statistics.leagueTableDesc")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {classification && classification.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]">{t("statistics.position")}</TableHead>
                            <TableHead>{t("statistics.team")}</TableHead>
                            <TableHead className="text-right">{t("statistics.played")}</TableHead>
                            <TableHead className="text-right">{t("statistics.won")}</TableHead>
                            <TableHead className="text-right">{t("statistics.drawn")}</TableHead>
                            <TableHead className="text-right">{t("statistics.lost")}</TableHead>
                            <TableHead className="text-right">{t("statistics.goalsFor")}</TableHead>
                            <TableHead className="text-right">{t("statistics.goalsAgainst")}</TableHead>
                            <TableHead className="text-right">{t("statistics.goalDifference")}</TableHead>
                            <TableHead className="text-right">{t("statistics.points")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[...classification]
                            .sort((a, b) => {
                              // Sort by points (desc), then goal difference (desc)
                              if (a.points !== b.points) return b.points - a.points;
                              const aDiff = a.goalsFor - a.goalsAgainst;
                              const bDiff = b.goalsFor - b.goalsAgainst;
                              if (aDiff !== bDiff) return bDiff - aDiff;
                              // If still tied, sort by goals scored (desc)
                              return b.goalsFor - a.goalsFor;
                            })
                            .map((team, index) => (
                              <TableRow key={team.id} className={team.externalTeamName === selectedTeam?.name ? "bg-primary/10" : ""}>
                                <TableCell className="font-medium">{team.position || index + 1}</TableCell>
                                <TableCell className="font-medium">{team.externalTeamName}</TableCell>
                                <TableCell className="text-right">{team.gamesPlayed}</TableCell>
                                <TableCell className="text-right">{team.gamesWon}</TableCell>
                                <TableCell className="text-right">{team.gamesDrawn}</TableCell>
                                <TableCell className="text-right">{team.gamesLost}</TableCell>
                                <TableCell className="text-right">{team.goalsFor}</TableCell>
                                <TableCell className="text-right">{team.goalsAgainst}</TableCell>
                                <TableCell className="text-right">{team.goalsFor - team.goalsAgainst}</TableCell>
                                <TableCell className="text-right font-bold">{team.points}</TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center p-8 text-muted-foreground">
                        <Trophy className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        <p>{t("statistics.noLeagueData")}</p>
                        <p className="text-sm mt-1">{t("statistics.leagueDataInstruction")}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
        
        <MobileNavigation />
      </div>
    </div>
  );
}