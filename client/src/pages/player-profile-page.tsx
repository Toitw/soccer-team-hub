import { useQuery } from "@tanstack/react-query";
import { User, PlayerStat, Match } from "@shared/schema";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import MobileNavigation from "@/components/mobile-navigation";
import { useAuth } from "@/hooks/use-auth";
import { useParams } from "wouter";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, BarChart2, Phone, Mail, Pencil } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

export default function PlayerProfilePage() {
  const { id } = useParams();
  const userId = parseInt(id);
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  // For a real implementation, fetch player data from API
  // This is mocked for demonstration
  const { data: playerData, isLoading: playerLoading } = useQuery<User>({
    queryKey: ["/api/user", userId],
    enabled: !isNaN(userId),
  });

  // Mock player stats for demonstration
  const playerStats = {
    matches: 12,
    goals: 9,
    assists: 3,
    yellowCards: 2,
    redCards: 0,
    minutesPlayed: 1080,
    passAccuracy: 87,
    tackleSuccess: 75,
    shotAccuracy: 65,
    matchAttendance: 92,
    trainingAttendance: 96,
    recentMatches: [
      { date: new Date(2023, 5, 10), opponent: "Arsenal", goals: 2, assists: 0, yellowCards: 1, redCards: 0, minutesPlayed: 90, performance: 8 },
      { date: new Date(2023, 5, 3), opponent: "Chelsea", goals: 1, assists: 1, yellowCards: 0, redCards: 0, minutesPlayed: 90, performance: 7 },
      { date: new Date(2023, 4, 27), opponent: "Liverpool", goals: 0, assists: 1, yellowCards: 0, redCards: 0, minutesPlayed: 75, performance: 6 },
    ]
  };

  if (playerLoading || isNaN(userId)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Use either the fetched player data or a mock object
  const player = playerData || {
    id: userId,
    username: "player1",
    fullName: "Marcus Rashford",
    role: "player",
    profilePicture: "https://ui-avatars.com/api/?name=Marcus+Rashford&background=FFC107&color=fff",
    position: "Forward",
    jerseyNumber: 9,
    email: "rashford@example.com",
    phoneNumber: "+44 123 456 7890",
    password: "" // Password should never be displayed in the UI
  };

  const isCurrentUser = user?.id === userId;
  const canEdit = isCurrentUser || user?.role === "admin" || user?.role === "coach";

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      <div className="flex-1 ml-0 md:ml-64 z-30">
        <Header title="Player Profile" />

        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-6">
            {/* Profile Sidebar */}
            <div>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      <img 
                        src={player.profilePicture} 
                        alt={player.fullName} 
                        className="w-32 h-32 rounded-full object-cover border-4 border-primary" 
                      />
                      {canEdit && (
                        <button className="absolute bottom-0 right-0 bg-primary text-white w-8 h-8 rounded-full flex items-center justify-center">
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <h2 className="mt-4 text-2xl font-bold">{player.fullName}</h2>
                    <div className="flex items-center mt-1 space-x-2">
                      <span className="bg-secondary/10 text-secondary text-sm px-3 py-1 rounded-full">{player.position}</span>
                      <span className="bg-primary/10 text-primary text-sm px-3 py-1 rounded-full">#{player.jerseyNumber}</span>
                    </div>

                    <div className="w-full mt-6 space-y-4">
                      <div className="flex items-center">
                        <Phone className="h-5 w-5 text-gray-400 mr-3" />
                        <span>{player.phoneNumber || "Not provided"}</span>
                      </div>
                      <div className="flex items-center">
                        <Mail className="h-5 w-5 text-gray-400 mr-3" />
                        <span>{player.email || "Not provided"}</span>
                      </div>
                    </div>

                    {canEdit && (
                      <Button className="w-full mt-6 bg-primary hover:bg-primary/90">
                        Edit Profile
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Season Stats</CardTitle>
                  <CardDescription>Performance for current season</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-5">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Goals</span>
                        <span className="text-sm font-medium">{playerStats.goals}</span>
                      </div>
                      <Progress value={Math.min(100, playerStats.goals * 10)} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Assists</span>
                        <span className="text-sm font-medium">{playerStats.assists}</span>
                      </div>
                      <Progress value={Math.min(100, playerStats.assists * 10)} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Pass Accuracy</span>
                        <span className="text-sm font-medium">{playerStats.passAccuracy}%</span>
                      </div>
                      <Progress value={playerStats.passAccuracy} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Shot Accuracy</span>
                        <span className="text-sm font-medium">{playerStats.shotAccuracy}%</span>
                      </div>
                      <Progress value={playerStats.shotAccuracy} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Tackle Success</span>
                        <span className="text-sm font-medium">{playerStats.tackleSuccess}%</span>
                      </div>
                      <Progress value={playerStats.tackleSuccess} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div>
              <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="matches">Matches</TabsTrigger>
                  <TabsTrigger value="stats">Statistics</TabsTrigger>
                  <TabsTrigger value="attendance">Attendance</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Player Overview</CardTitle>
                      <CardDescription>Summary of player performance and activities</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-background p-4 rounded-lg text-center">
                          <p className="text-sm text-gray-500">Matches</p>
                          <p className="text-2xl font-bold text-primary">{playerStats.matches}</p>
                        </div>
                        <div className="bg-background p-4 rounded-lg text-center">
                          <p className="text-sm text-gray-500">Goals</p>
                          <p className="text-2xl font-bold text-accent">{playerStats.goals}</p>
                        </div>
                        <div className="bg-background p-4 rounded-lg text-center">
                          <p className="text-sm text-gray-500">Assists</p>
                          <p className="text-2xl font-bold text-secondary">{playerStats.assists}</p>
                        </div>
                        <div className="bg-background p-4 rounded-lg text-center">
                          <p className="text-sm text-gray-500">Minutes</p>
                          <p className="text-2xl font-bold text-primary">{playerStats.minutesPlayed}</p>
                        </div>
                      </div>

                      <h3 className="text-lg font-medium mb-3">Recent Performance</h3>
                      <div className="space-y-4">
                        {playerStats.recentMatches.map((match, index) => (
                          <div key={index} className="bg-background p-4 rounded-lg">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium">vs. {match.opponent}</h4>
                                <p className="text-sm text-gray-500">{format(match.date, "MMMM d, yyyy")}</p>
                              </div>
                              <div className="flex items-center">
                                <div className="flex items-center mr-4">
                                  <BarChart2 className="h-4 w-4 text-gray-400 mr-1" />
                                  <span className="text-sm font-medium">{match.performance}/10</span>
                                </div>
                                <div className={`px-2 py-1 rounded text-xs font-medium ${
                                  match.performance >= 8 
                                    ? "bg-green-100 text-green-800" 
                                    : match.performance >= 6 
                                      ? "bg-yellow-100 text-yellow-800" 
                                      : "bg-red-100 text-red-800"
                                }`}>
                                  {match.performance >= 8 
                                    ? "Excellent" 
                                    : match.performance >= 6 
                                      ? "Good" 
                                      : "Fair"}
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-5 gap-2 mt-3 pt-3 border-t text-center">
                              <div>
                                <p className="text-xs text-gray-500">Goals</p>
                                <p className="font-medium">{match.goals}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Assists</p>
                                <p className="font-medium">{match.assists}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Yellow Cards</p>
                                <p className="font-medium">{match.yellowCards}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Red Cards</p>
                                <p className="font-medium">{match.redCards}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Minutes</p>
                                <p className="font-medium">{match.minutesPlayed}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="matches" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Match History</CardTitle>
                      <CardDescription>Player's performance in recent matches</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead>
                            <tr>
                              <th className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                              <th className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opponent</th>
                              <th className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Goals</th>
                              <th className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assists</th>
                              <th className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cards</th>
                              <th className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Minutes</th>
                              <th className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {playerStats.recentMatches.map((match, index) => (
                              <tr key={index}>
                                <td className="px-4 py-3 whitespace-nowrap text-sm">{format(match.date, "MMM d, yyyy")}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">{match.opponent}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm">{match.goals}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm">{match.assists}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                  {match.yellowCards > 0 && (
                                    <span className="inline-block w-4 h-5 bg-yellow-400 mr-1"></span>
                                  )}
                                  {match.redCards > 0 && (
                                    <span className="inline-block w-4 h-5 bg-red-500"></span>
                                  )}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm">{match.minutesPlayed}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    match.performance >= 8 
                                      ? "bg-green-100 text-green-800" 
                                      : match.performance >= 6 
                                        ? "bg-yellow-100 text-yellow-800" 
                                        : "bg-red-100 text-red-800"
                                  }`}>
                                    {match.performance}/10
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="stats" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Detailed Statistics</CardTitle>
                      <CardDescription>Comprehensive view of player statistics</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h3 className="text-lg font-medium mb-4">Offensive Stats</h3>
                          <div className="space-y-4">
                            <div>
                              <div className="flex justify-between mb-1">
                                <span className="text-sm">Goals</span>
                                <span className="text-sm font-medium">{playerStats.goals}</span>
                              </div>
                              <Progress value={Math.min(100, playerStats.goals * 10)} className="h-2" />
                            </div>
                            <div>
                              <div className="flex justify-between mb-1">
                                <span className="text-sm">Assists</span>
                                <span className="text-sm font-medium">{playerStats.assists}</span>
                              </div>
                              <Progress value={Math.min(100, playerStats.assists * 10)} className="h-2" />
                            </div>
                            <div>
                              <div className="flex justify-between mb-1">
                                <span className="text-sm">Shot Accuracy</span>
                                <span className="text-sm font-medium">{playerStats.shotAccuracy}%</span>
                              </div>
                              <Progress value={playerStats.shotAccuracy} className="h-2" />
                            </div>
                            <div>
                              <div className="flex justify-between mb-1">
                                <span className="text-sm">Pass Accuracy</span>
                                <span className="text-sm font-medium">{playerStats.passAccuracy}%</span>
                              </div>
                              <Progress value={playerStats.passAccuracy} className="h-2" />
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-lg font-medium mb-4">Defensive Stats</h3>
                          <div className="space-y-4">
                            <div>
                              <div className="flex justify-between mb-1">
                                <span className="text-sm">Tackle Success</span>
                                <span className="text-sm font-medium">{playerStats.tackleSuccess}%</span>
                              </div>
                              <Progress value={playerStats.tackleSuccess} className="h-2" />
                            </div>
                            <div>
                              <div className="flex justify-between mb-1">
                                <span className="text-sm">Interceptions</span>
                                <span className="text-sm font-medium">14</span>
                              </div>
                              <Progress value={70} className="h-2" />
                            </div>
                            <div>
                              <div className="flex justify-between mb-1">
                                <span className="text-sm">Aerial Duels Won</span>
                                <span className="text-sm font-medium">68%</span>
                              </div>
                              <Progress value={68} className="h-2" />
                            </div>
                            <div>
                              <div className="flex justify-between mb-1">
                                <span className="text-sm">Clearances</span>
                                <span className="text-sm font-medium">8</span>
                              </div>
                              <Progress value={40} className="h-2" />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-8">
                        <h3 className="text-lg font-medium mb-4">Disciplinary Record</h3>
                        <div className="bg-background p-4 rounded-lg">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center">
                              <p className="text-sm text-gray-500">Yellow Cards</p>
                              <p className="text-2xl font-bold text-yellow-500">{playerStats.yellowCards}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-sm text-gray-500">Red Cards</p>
                              <p className="text-2xl font-bold text-red-500">{playerStats.redCards}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-sm text-gray-500">Fouls Committed</p>
                              <p className="text-2xl font-bold text-gray-700">17</p>
                            </div>
                            <div className="text-center">
                              <p className="text-sm text-gray-500">Fouls Suffered</p>
                              <p className="text-2xl font-bold text-gray-700">23</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="attendance" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Attendance Record</CardTitle>
                      <CardDescription>Player's attendance at team events</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="bg-background p-4 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-medium">Match Attendance</h3>
                            <span className="text-lg font-bold text-primary">{playerStats.matchAttendance}%</span>
                          </div>
                          <Progress value={playerStats.matchAttendance} className="h-2 mb-2" />
                          <p className="text-sm text-gray-500">Attended {Math.round(playerStats.matches * playerStats.matchAttendance / 100)} of {playerStats.matches} matches</p>
                        </div>

                        <div className="bg-background p-4 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-medium">Training Attendance</h3>
                            <span className="text-lg font-bold text-primary">{playerStats.trainingAttendance}%</span>
                          </div>
                          <Progress value={playerStats.trainingAttendance} className="h-2 mb-2" />
                          <p className="text-sm text-gray-500">Attended 24 of 25 training sessions</p>
                        </div>
                      </div>

                      <h3 className="text-lg font-medium mb-3">Recent Activity</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead>
                            <tr>
                              <th className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                              <th className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                              <th className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            <tr>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">{format(new Date(2023, 5, 15), "MMM d, yyyy")}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <div>
                                  <p className="font-medium">Tactical Training</p>
                                  <p className="text-xs text-gray-500">Training Ground • 18:00</p>
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Confirmed
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">{format(new Date(2023, 5, 12), "MMM d, yyyy")}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <div>
                                  <p className="font-medium">Team Meeting</p>
                                  <p className="text-xs text-gray-500">Club House • 19:00</p>
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Attended
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">{format(new Date(2023, 5, 10), "MMM d, yyyy")}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <div>
                                  <p className="font-medium">vs. Arsenal</p>
                                  <p className="text-xs text-gray-500">Emirates Stadium • 15:00</p>
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Played
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">{format(new Date(2023, 5, 8), "MMM d, yyyy")}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <div>
                                  <p className="font-medium">Fitness Training</p>
                                  <p className="text-xs text-gray-500">Training Ground • 10:00</p>
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  Missed
                                </span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>

        <div className="pb-16">
          <MobileNavigation />
        </div>
      </div>
    </div>
  );
}