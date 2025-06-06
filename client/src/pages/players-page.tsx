import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { PlusIcon, Search, User, BarChart3, Award, ShirtIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

const playerProfileSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  position: z.string(),
  jerseyNumber: z.string().transform(val => parseInt(val) || 0),
  dateOfBirth: z.string().optional(),
  height: z.string().optional(),
  weight: z.string().optional(),
  preferredFoot: z.string().optional(),
  bio: z.string().optional(),
});

export default function PlayersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";
  const isCoach = user?.role === "coach";
  const canManage = isAdmin || isCoach;

  const { data: players, isLoading } = useQuery({
    queryKey: ["/api/players"],
  });

  const playerForm = useForm<z.infer<typeof playerProfileSchema>>({
    resolver: zodResolver(playerProfileSchema),
    defaultValues: {
      name: "",
      position: "forward",
      jerseyNumber: "0",
      preferredFoot: "right",
    },
  });

  const createPlayerMutation = useMutation({
    mutationFn: async (data: z.infer<typeof playerProfileSchema>) => {
      const res = await apiRequest("POST", "/api/players", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
      toast({
        titleKey: "toasts.success",
        description: "Jugador añadido al equipo",
      });
      playerForm.reset();
    },
    onError: (error) => {
      toast({
        titleKey: "toasts.error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function onCreatePlayerSubmit(values: z.infer<typeof playerProfileSchema>) {
    createPlayerMutation.mutate(values);
  }

  const getPositionBadgeColor = (position: string) => {
    switch (position.toLowerCase()) {
      case 'goalkeeper':
        return 'bg-yellow-100 text-yellow-800';
      case 'defender':
        return 'bg-blue-100 text-blue-800';
      case 'midfielder':
        return 'bg-green-100 text-green-800';
      case 'forward':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <div className="md:flex md:items-center md:justify-between mb-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-7 text-gray-900 font-inter sm:text-3xl sm:leading-9 sm:truncate">
              Players
            </h1>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            {canManage && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="inline-flex items-center">
                    <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                    Add Player
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[550px]">
                  <DialogHeader>
                    <DialogTitle>Create Player Profile</DialogTitle>
                    <DialogDescription>
                      Add a new player to your team roster.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...playerForm}>
                    <form onSubmit={playerForm.handleSubmit(onCreatePlayerSubmit)} className="space-y-4">
                      <FormField
                        control={playerForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Player Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Full name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={playerForm.control}
                          name="position"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Position</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select position" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="goalkeeper">Goalkeeper</SelectItem>
                                  <SelectItem value="defender">Defender</SelectItem>
                                  <SelectItem value="midfielder">Midfielder</SelectItem>
                                  <SelectItem value="forward">Forward</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={playerForm.control}
                          name="jerseyNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Jersey Number</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" max="99" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={playerForm.control}
                          name="dateOfBirth"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Date of Birth</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={playerForm.control}
                          name="preferredFoot"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Preferred Foot</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select foot" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="right">Right</SelectItem>
                                  <SelectItem value="left">Left</SelectItem>
                                  <SelectItem value="both">Both</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={playerForm.control}
                          name="height"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Height (cm)</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={playerForm.control}
                          name="weight"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Weight (kg)</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={playerForm.control}
                        name="bio"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Biography</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Brief player bio" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <DialogFooter>
                        <Button type="submit" disabled={createPlayerMutation.isPending}>
                          {createPlayerMutation.isPending ? "Creating..." : "Create Player"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <div className="flex items-center mb-6">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input 
              placeholder="Search players..."
              className="pl-9"
            />
          </div>
          <Select defaultValue="all">
            <SelectTrigger className="w-[180px] ml-4">
              <SelectValue placeholder="Position filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Positions</SelectItem>
              <SelectItem value="goalkeeper">Goalkeepers</SelectItem>
              <SelectItem value="defender">Defenders</SelectItem>
              <SelectItem value="midfielder">Midfielders</SelectItem>
              <SelectItem value="forward">Forwards</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {players?.map((player: any) => (
            <Card key={player.id} className="overflow-hidden">
              <CardHeader className="p-0">
                <div className="bg-primary h-16 relative">
                  <div className="absolute -bottom-10 left-4">
                    <div className="relative">
                      <div className="h-20 w-20 bg-white rounded-full border-4 border-white overflow-hidden">
                        <img 
                          src={player.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=0D47A1&color=fff&size=100`} 
                          alt={player.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      {player.jerseyNumber !== undefined && (
                        <div className="absolute -bottom-2 -right-2 bg-primary text-white h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm border-2 border-white">
                          {player.jerseyNumber}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="px-4 pt-12 pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold">{player.name}</h3>
                      <Badge className={getPositionBadgeColor(player.position)}>
                        {player.position.charAt(0).toUpperCase() + player.position.slice(1)}
                      </Badge>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          View Profile
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[650px]">
                        <DialogHeader>
                          <DialogTitle>Player Profile</DialogTitle>
                        </DialogHeader>
                        <div className="grid grid-cols-3 gap-6">
                          <div className="col-span-1 flex flex-col items-center">
                            <div className="h-32 w-32 bg-primary/10 rounded-full overflow-hidden mb-4">
                              <img 
                                src={player.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=0D47A1&color=fff&size=128`} 
                                alt={player.name}
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <h2 className="text-xl font-bold">{player.name}</h2>
                            <div className="mt-1 flex items-center justify-center space-x-2">
                              <Badge className={getPositionBadgeColor(player.position)}>
                                {player.position.charAt(0).toUpperCase() + player.position.slice(1)}
                              </Badge>
                              <Badge className="bg-primary text-white">#{player.jerseyNumber}</Badge>
                            </div>
                            
                            <div className="mt-4 w-full">
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="text-gray-500">Height:</div>
                                <div className="font-medium text-right">{player.height ? `${player.height} cm` : "N/A"}</div>
                                
                                <div className="text-gray-500">Weight:</div>
                                <div className="font-medium text-right">{player.weight ? `${player.weight} kg` : "N/A"}</div>
                                
                                <div className="text-gray-500">Date of Birth:</div>
                                <div className="font-medium text-right">{player.dateOfBirth ? new Date(player.dateOfBirth).toLocaleDateString() : "N/A"}</div>
                                
                                <div className="text-gray-500">Preferred Foot:</div>
                                <div className="font-medium text-right capitalize">{player.preferredFoot || "N/A"}</div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="col-span-2">
                            <Tabs defaultValue="stats">
                              <TabsList className="mb-4">
                                <TabsTrigger value="stats">Statistics</TabsTrigger>
                                <TabsTrigger value="history">Match History</TabsTrigger>
                                <TabsTrigger value="bio">Biography</TabsTrigger>
                              </TabsList>
                              
                              <TabsContent value="stats">
                                <div className="space-y-4">
                                  <div>
                                    <div className="flex justify-between mb-1">
                                      <span className="text-sm font-medium">Goals</span>
                                      <span className="text-sm font-medium">{player.stats?.goals || 0}</span>
                                    </div>
                                    <Progress value={
                                      Math.min(100, ((player.stats?.goals || 0) / 20) * 100)
                                    } className="h-2" />
                                  </div>
                                  
                                  <div>
                                    <div className="flex justify-between mb-1">
                                      <span className="text-sm font-medium">Assists</span>
                                      <span className="text-sm font-medium">{player.stats?.assists || 0}</span>
                                    </div>
                                    <Progress value={
                                      Math.min(100, ((player.stats?.assists || 0) / 15) * 100)
                                    } className="h-2" />
                                  </div>
                                  
                                  <div>
                                    <div className="flex justify-between mb-1">
                                      <span className="text-sm font-medium">Matches Played</span>
                                      <span className="text-sm font-medium">{player.stats?.matchesPlayed || 0}</span>
                                    </div>
                                    <Progress value={
                                      Math.min(100, ((player.stats?.matchesPlayed || 0) / 30) * 100)
                                    } className="h-2" />
                                  </div>
                                  
                                  <div>
                                    <div className="flex justify-between mb-1">
                                      <span className="text-sm font-medium">Minutes Played</span>
                                      <span className="text-sm font-medium">{player.stats?.minutesPlayed || 0}</span>
                                    </div>
                                    <Progress value={
                                      Math.min(100, ((player.stats?.minutesPlayed || 0) / 2700) * 100)
                                    } className="h-2" />
                                  </div>
                                  
                                  <div className="grid grid-cols-3 gap-4 mt-6">
                                    <div className="bg-gray-50 p-3 rounded-md text-center">
                                      <div className="text-lg font-bold text-primary">
                                        {player.stats?.yellowCards || 0}
                                      </div>
                                      <div className="text-xs text-gray-500">Yellow Cards</div>
                                    </div>
                                    
                                    <div className="bg-gray-50 p-3 rounded-md text-center">
                                      <div className="text-lg font-bold text-primary">
                                        {player.stats?.redCards || 0}
                                      </div>
                                      <div className="text-xs text-gray-500">Red Cards</div>
                                    </div>
                                    
                                    <div className="bg-gray-50 p-3 rounded-md text-center">
                                      <div className="text-lg font-bold text-primary">
                                        {player.stats?.cleanSheets || 0}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {player.position === 'goalkeeper' ? 'Clean Sheets' : 'Man of the Match'}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </TabsContent>
                              
                              <TabsContent value="history">
                                <div className="space-y-3">
                                  <p className="text-sm text-gray-500 mb-2">Recent matches and performance</p>
                                  {player.matchHistory?.length > 0 ? (
                                    player.matchHistory.map((match: any, idx: number) => (
                                      <div key={idx} className="border-b border-gray-200 pb-2 last:border-0">
                                        <div className="flex justify-between items-center">
                                          <div>
                                            <div className="font-medium">{match.opponent}</div>
                                            <div className="text-sm text-gray-500">{new Date(match.date).toLocaleDateString()}</div>
                                          </div>
                                          <div className="text-right">
                                            <div className="font-medium">{match.result}</div>
                                            <div className="text-sm text-gray-500">
                                              {match.goalsScored > 0 && `${match.goalsScored} ${match.goalsScored === 1 ? 'goal' : 'goals'}`}
                                              {match.goalsScored > 0 && match.assists > 0 && ', '}
                                              {match.assists > 0 && `${match.assists} ${match.assists === 1 ? 'assist' : 'assists'}`}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-center py-4 text-gray-500">
                                      No match history available
                                    </div>
                                  )}
                                </div>
                              </TabsContent>
                              
                              <TabsContent value="bio">
                                <div>
                                  <p className="text-gray-600">
                                    {player.bio || "No biography information available for this player."}
                                  </p>
                                </div>
                              </TabsContent>
                            </Tabs>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="flex flex-col items-center">
                      <BarChart3 className="h-4 w-4 text-primary mb-1" />
                      <span className="text-xs text-gray-500">Goals</span>
                      <span className="font-bold">{player.stats?.goals || 0}</span>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="flex flex-col items-center">
                      <Award className="h-4 w-4 text-primary mb-1" />
                      <span className="text-xs text-gray-500">Assists</span>
                      <span className="font-bold">{player.stats?.assists || 0}</span>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="flex flex-col items-center">
                      <ShirtIcon className="h-4 w-4 text-primary mb-1" />
                      <span className="text-xs text-gray-500">Games</span>
                      <span className="font-bold">{player.stats?.matchesPlayed || 0}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {(!players || players.length === 0) && (
            <div className="col-span-full text-center py-12">
              <User className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No players</h3>
              <p className="mt-1 text-sm text-gray-500">
                {canManage 
                  ? "Get started by adding players to your team." 
                  : "There are no player profiles available yet."}
              </p>
              {canManage && (
                <div className="mt-6">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="inline-flex items-center">
                        <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                        Add Player
                      </Button>
                    </DialogTrigger>
                  </Dialog>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
