import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Team, Match } from "@shared/schema";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import MobileNavigation from "@/components/mobile-navigation";
import { useAuth } from "@/hooks/use-auth";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  PlusCircle, 
  Calendar, 
  Trophy, 
  ClipboardEdit, 
  MapPin, 
  Clock, 
  Home, 
  ChevronRight,
  CheckCircle2,
  Users,
  Share2
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { format, isPast, isFuture } from "date-fns";
import { Badge } from "@/components/ui/badge";

// Define form schema for creating a match
const matchSchema = z.object({
  opponentName: z.string().min(1, "Opponent name is required"),
  matchDate: z.string().min(1, "Match date is required"),
  location: z.string().min(1, "Location is required"),
  isHome: z.boolean().default(true),
  notes: z.string().optional(),
});

type MatchFormData = z.infer<typeof matchSchema>;

export default function MatchesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("upcoming");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: teams, isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  // Select the first team by default
  const selectedTeam = teams && teams.length > 0 ? teams[0] : null;

  // Use React Query client for manual invalidation
  const queryClient = useQueryClient();
  
  const { 
    data: matches, 
    isLoading: matchesLoading,
    refetch: refetchMatches 
  } = useQuery<Match[]>({
    queryKey: ["matches", selectedTeam?.id],
    enabled: !!selectedTeam,
    queryFn: async () => {
      if (!selectedTeam) return [];
      console.log(`Fetching matches for team ${selectedTeam.id}`);
      const response = await fetch(`/api/teams/${selectedTeam.id}/matches`);
      if (!response.ok) throw new Error('Failed to fetch matches');
      const matchesData = await response.json();
      console.log("Fetched matches:", matchesData);
      return matchesData;
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0 // Consider data stale immediately
  });
  
  // We need to make sure refetchMatches properly invalidates the cache
  const refetchMatchesData = async () => {
    console.log("Manually invalidating matches cache");
    await queryClient.invalidateQueries({ queryKey: ["matches", selectedTeam?.id] });
    return refetchMatches();
  };

  const isLoading = teamsLoading || matchesLoading;

  const form = useForm<MatchFormData>({
    resolver: zodResolver(matchSchema),
    defaultValues: {
      opponentName: "",
      matchDate: new Date().toISOString().slice(0, 16),
      location: "",
      isHome: true,
      notes: "",
    },
  });

  const onSubmit = async (data: MatchFormData) => {
    try {
      if (!selectedTeam) {
        throw new Error("No team selected");
      }

      // Format match date properly
      const formattedData = {
        ...data,
        matchDate: new Date(data.matchDate).toISOString(),
        status: "scheduled" // Ensure status is set for new matches
      };

      console.log("Submitting match data:", formattedData);

      const response = await fetch(`/api/teams/${selectedTeam.id}/matches`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formattedData),
      });

      if (!response.ok) {
        throw new Error("Failed to create match");
      }

      // Get the created match
      const createdMatch = await response.json();
      console.log("Created match:", createdMatch);

      setDialogOpen(false);
      form.reset();
      
      // Force refetch with a different query key to trigger refresh
      await refetchMatchesData();
      console.log("Matches refetched");

      toast({
        title: "Match created",
        description: "The match has been created successfully",
      });
    } catch (error) {
      console.error("Error creating match:", error);
      toast({
        title: "Error",
        description: "Failed to create match",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  console.log("All matches data:", matches);
  
  // Safely handle matches array
  const upcomingMatches = Array.isArray(matches) ? 
    matches.filter(match => match.status === "scheduled") : [];
  
  const pastMatches = Array.isArray(matches) ?
    matches.filter(match => match.status === "completed") : [];
  
  console.log("Upcoming matches:", upcomingMatches);
  console.log("Past matches:", pastMatches);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      <div className="flex-1 ml-0 md:ml-64">
        <Header title="Matches" />

        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-primary">Match Management</h1>
              <p className="text-gray-500">Track fixtures, results, and match statistics</p>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Match
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Match</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="opponentName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Opponent Team</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter opponent team name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="matchDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Match Date & Time</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter match location" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="isHome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Match Type</FormLabel>
                          <FormControl>
                            <select 
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              onChange={(e) => field.onChange(e.target.value === "home")}
                              value={field.value ? "home" : "away"}
                            >
                              <option value="home">Home Match</option>
                              <option value="away">Away Match</option>
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional Notes</FormLabel>
                          <FormControl>
                            <textarea 
                              className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              placeholder="Enter any additional information about the match"
                              {...field}
                            ></textarea>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
                      Schedule Match
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <Tabs defaultValue="upcoming" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="upcoming" className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Upcoming Matches
              </TabsTrigger>
              <TabsTrigger value="past" className="flex items-center gap-1">
                <Trophy className="h-4 w-4" />
                Past Matches
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="mt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingMatches.length === 0 ? (
                  <Card className="col-span-full">
                    <CardContent className="pt-6 flex flex-col items-center justify-center h-40">
                      <Calendar className="h-12 w-12 text-gray-300 mb-2" />
                      <p className="text-lg text-gray-500">No upcoming matches scheduled</p>
                      <Button 
                        variant="link" 
                        onClick={() => setDialogOpen(true)}
                        className="text-primary mt-2"
                      >
                        Schedule your first match
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  upcomingMatches.map(match => {
                    const matchDate = new Date(match.matchDate);
                    const isToday = new Date().toDateString() === matchDate.toDateString();
                    const daysDifference = Math.ceil((matchDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                    
                    return (
                      <Card key={match.id} className="overflow-hidden border-t-4 border-t-primary">
                        <CardHeader className="pb-2 relative">
                          {/* Status Badge */}
                          <Badge 
                            className="absolute right-4 top-4" 
                            variant={isToday ? "destructive" : "default"}
                          >
                            {isToday ? "Today" : daysDifference <= 3 ? "Soon" : "Scheduled"}
                          </Badge>
                          
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2 mb-1">
                              {match.isHome ? 
                                <Badge variant="outline" className="flex items-center gap-1 bg-blue-50">
                                  <Home className="h-3 w-3" />
                                  Home
                                </Badge> : 
                                <Badge variant="outline" className="flex items-center gap-1">
                                  <Share2 className="h-3 w-3" />
                                  Away
                                </Badge>
                              }
                              <CardDescription className="text-xs">
                                {format(matchDate, "EEEE, MMM d, yyyy")}
                              </CardDescription>
                            </div>
                            <CardTitle>{match.isHome ? "vs " : "@ "}{match.opponentName}</CardTitle>
                          </div>
                        </CardHeader>
                        
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex items-center space-x-4 text-sm">
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 mr-1 text-gray-500" />
                                <span>{format(matchDate, "h:mm a")}</span>
                              </div>
                              <div className="flex items-center">
                                <MapPin className="h-4 w-4 mr-1 text-gray-500" />
                                <span>{match.location}</span>
                              </div>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center">
                                  <div className="relative">
                                    <img 
                                      src={selectedTeam?.logo || "https://ui-avatars.com/api/?name=Team&background=0D47A1&color=fff"} 
                                      alt={selectedTeam?.name}
                                      className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                                    />
                                    {match.isHome && 
                                      <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                                        H
                                      </div>
                                    }
                                  </div>
                                  <div className="ml-3">
                                    <p className="font-medium">{selectedTeam?.name}</p>
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                    <span className="text-lg font-bold">VS</span>
                                  </div>
                                </div>
                                <div className="flex items-center">
                                  <div className="mr-3 text-right">
                                    <p className="font-medium">{match.opponentName}</p>
                                  </div>
                                  <div className="relative">
                                    <img 
                                      src={match.opponentLogo || "https://ui-avatars.com/api/?name=" + match.opponentName.charAt(0) + "&background=f44336&color=fff"} 
                                      alt={match.opponentName}
                                      className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                                    />
                                    {!match.isHome && 
                                      <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                                        H
                                      </div>
                                    }
                                  </div>
                                </div>
                              </div>
                            </div>

                            {match.notes && (
                              <div className="text-sm p-3 bg-amber-50 rounded-md">
                                <p className="font-medium mb-1 flex items-center">
                                  <span className="bg-amber-200 rounded-full p-1 mr-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </span>
                                  Notes
                                </p>
                                <p className="text-gray-700 pl-7">{match.notes}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                        
                        <CardFooter className="flex gap-2 border-t bg-gray-50 px-6 py-3">
                          <Button variant="outline" size="sm" className="flex-1 gap-1">
                            <Users className="h-4 w-4" />
                            Team Sheet
                          </Button>
                          <Button size="sm" className="flex-1 gap-1 bg-primary hover:bg-primary/90">
                            <CheckCircle2 className="h-4 w-4" />
                            Confirm
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                            <ClipboardEdit className="h-4 w-4" />
                          </Button>
                        </CardFooter>
                      </Card>
                    );
                  })
                )}
              </div>
            </TabsContent>

            <TabsContent value="past" className="mt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pastMatches.length === 0 ? (
                  <Card className="col-span-full">
                    <CardContent className="pt-6 flex flex-col items-center justify-center h-40">
                      <Trophy className="h-12 w-12 text-gray-300 mb-2" />
                      <p className="text-lg text-gray-500">No past matches recorded</p>
                      <Button 
                        variant="link" 
                        onClick={() => setDialogOpen(true)}
                        className="text-primary mt-2"
                      >
                        Add a past match
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  pastMatches.map(match => {
                    const matchDate = new Date(match.matchDate);
                    const matchResult = match.goalsScored !== undefined && match.goalsConceded !== undefined
                      ? match.goalsScored > match.goalsConceded
                        ? "win"
                        : match.goalsScored < match.goalsConceded
                          ? "loss"
                          : "draw"
                      : null;
                      
                    const resultColors = {
                      win: "border-t-green-500 bg-green-50",
                      loss: "border-t-red-500 bg-red-50",
                      draw: "border-t-yellow-500 bg-yellow-50",
                    };
                    
                    return (
                      <Card 
                        key={match.id} 
                        className={`overflow-hidden border-t-4 ${
                          matchResult ? resultColors[matchResult] : "border-t-gray-300"
                        }`}
                      >
                        <CardHeader className="pb-2 relative">
                          {/* Result Badge */}
                          {matchResult && (
                            <Badge 
                              className="absolute right-4 top-4" 
                              variant={
                                matchResult === "win" 
                                  ? "success" 
                                  : matchResult === "loss" 
                                    ? "destructive" 
                                    : "outline"
                              }
                            >
                              {matchResult.toUpperCase()}
                            </Badge>
                          )}
                          
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2 mb-1">
                              {match.isHome ? 
                                <Badge variant="outline" className="flex items-center gap-1 bg-blue-50">
                                  <Home className="h-3 w-3" />
                                  Home
                                </Badge> : 
                                <Badge variant="outline" className="flex items-center gap-1">
                                  <Share2 className="h-3 w-3" />
                                  Away
                                </Badge>
                              }
                              <CardDescription className="text-xs">
                                {format(matchDate, "EEEE, MMM d, yyyy")}
                              </CardDescription>
                            </div>
                            <CardTitle>{match.isHome ? "vs " : "@ "}{match.opponentName}</CardTitle>
                          </div>
                        </CardHeader>
                        
                        <CardContent>
                          <div className="space-y-4">
                            <div className="bg-white p-4 rounded-lg border">
                              <p className="text-xs text-center text-gray-500 mb-2">Full Time Result</p>
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
                                    <p className={`text-3xl font-bold ${matchResult === "win" ? "text-green-600" : ""}`}>
                                      {match.goalsScored || 0}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="bg-gray-100 text-gray-500 text-xs font-medium px-2 py-1 rounded">
                                    FT
                                  </div>
                                </div>
                                <div className="flex items-center">
                                  <div className="mr-3 text-right">
                                    <p className="font-medium">{match.opponentName}</p>
                                    <p className={`text-3xl font-bold ${matchResult === "loss" ? "text-red-600" : ""}`}>
                                      {match.goalsConceded || 0}
                                    </p>
                                  </div>
                                  <div className="relative">
                                    <img 
                                      src={match.opponentLogo || "https://ui-avatars.com/api/?name=" + match.opponentName.charAt(0) + "&background=f44336&color=fff"} 
                                      alt={match.opponentName}
                                      className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-4 text-sm">
                              <div className="flex items-center">
                                <MapPin className="h-4 w-4 mr-1 text-gray-500" />
                                <span>{match.location}</span>
                              </div>
                            </div>

                            {match.notes && (
                              <div className="text-sm p-3 bg-gray-50 rounded-md">
                                <p className="font-medium mb-1 flex items-center">
                                  <span className="bg-gray-200 rounded-full p-1 mr-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </span>
                                  Match Notes
                                </p>
                                <p className="text-gray-700 pl-7">{match.notes}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                        
                        <CardFooter className="flex gap-2 border-t px-6 py-3 bg-gray-50">
                          <Button 
                            className="w-full gap-2 bg-primary hover:bg-primary/90"
                          >
                            <Trophy className="h-4 w-4" />
                            View Match Report
                          </Button>
                        </CardFooter>
                      </Card>
                    );
                  })
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <MobileNavigation />
      </div>
    </div>
  );
}