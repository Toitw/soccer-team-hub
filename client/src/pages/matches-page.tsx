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
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, Calendar, Trophy, ClipboardEdit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

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
            <TabsList>
              <TabsTrigger value="upcoming">Upcoming Matches</TabsTrigger>
              <TabsTrigger value="past">Past Matches</TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingMatches.length === 0 ? (
                  <Card className="col-span-full">
                    <CardContent className="pt-6 flex flex-col items-center justify-center h-40">
                      <Calendar className="h-12 w-12 text-gray-300 mb-2" />
                      <p className="text-lg text-gray-500">No upcoming matches scheduled</p>
                      <Button 
                        variant="link" 
                        onClick={() => document.querySelector('[aria-label="Add Match"]')?.click()}
                        className="text-primary mt-2"
                      >
                        Schedule your first match
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  upcomingMatches.map(match => (
                    <Card key={match.id}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle>{match.isHome ? "vs " : "@ "}{match.opponentName}</CardTitle>
                            <CardDescription>
                              {format(new Date(match.matchDate), "EEEE, MMM d, yyyy")}
                            </CardDescription>
                          </div>
                          <Button variant="ghost" size="icon">
                            <ClipboardEdit className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <div className="text-sm">
                              <p className="font-medium">Time</p>
                              <p className="text-gray-500">
                                {format(new Date(match.matchDate), "h:mm a")}
                              </p>
                            </div>
                            <div className="text-sm text-right">
                              <p className="font-medium">Location</p>
                              <p className="text-gray-500">{match.location}</p>
                            </div>
                          </div>

                          <div className="bg-gray-50 p-3 rounded-md">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center">
                                <img 
                                  src={selectedTeam?.logo || "https://ui-avatars.com/api/?name=Team&background=0D47A1&color=fff"} 
                                  alt={selectedTeam?.name}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                                <div className="ml-3">
                                  <p className="text-sm font-medium">{selectedTeam?.name}</p>
                                  <p className="text-xs text-gray-500">{match.isHome ? "Home" : "Away"}</p>
                                </div>
                              </div>
                              <p className="text-xl font-bold">vs</p>
                              <div className="flex items-center">
                                <div className="mr-3 text-right">
                                  <p className="text-sm font-medium">{match.opponentName}</p>
                                  <p className="text-xs text-gray-500">{match.isHome ? "Away" : "Home"}</p>
                                </div>
                                <img 
                                  src={match.opponentLogo || "https://ui-avatars.com/api/?name=Opponent&background=f44336&color=fff"} 
                                  alt={match.opponentName}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              </div>
                            </div>
                          </div>

                          {match.notes && (
                            <div className="text-sm">
                              <p className="font-medium mb-1">Notes</p>
                              <p className="text-gray-500">{match.notes}</p>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <Button variant="outline" className="flex-1">Team Sheet</Button>
                            <Button className="flex-1 bg-primary hover:bg-primary/90">Confirm Attendance</Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="past" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pastMatches.length === 0 ? (
                  <Card className="col-span-full">
                    <CardContent className="pt-6 flex flex-col items-center justify-center h-40">
                      <Trophy className="h-12 w-12 text-gray-300 mb-2" />
                      <p className="text-lg text-gray-500">No past matches recorded</p>
                    </CardContent>
                  </Card>
                ) : (
                  pastMatches.map(match => (
                    <Card key={match.id}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle>{match.isHome ? "vs " : "@ "}{match.opponentName}</CardTitle>
                            <CardDescription>
                              {format(new Date(match.matchDate), "EEEE, MMM d, yyyy")}
                            </CardDescription>
                          </div>
                          <div className={`px-2 py-1 rounded text-xs font-medium ${
                            match.goalsScored && match.goalsConceded 
                              ? match.goalsScored > match.goalsConceded
                                ? "bg-green-100 text-green-800"
                                : match.goalsScored < match.goalsConceded
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                              : ""
                          }`}>
                            {match.goalsScored && match.goalsConceded 
                              ? match.goalsScored > match.goalsConceded
                                ? "WIN"
                                : match.goalsScored < match.goalsConceded
                                  ? "LOSS"
                                  : "DRAW"
                              : ""}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="bg-gray-50 p-3 rounded-md">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center">
                                <img 
                                  src={selectedTeam?.logo || "https://ui-avatars.com/api/?name=Team&background=0D47A1&color=fff"} 
                                  alt={selectedTeam?.name}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                                <div className="ml-3">
                                  <p className="text-sm font-medium">{selectedTeam?.name}</p>
                                  <p className="text-2xl font-bold">{match.goalsScored || 0}</p>
                                </div>
                              </div>
                              <p className="text-gray-500">FT</p>
                              <div className="flex items-center">
                                <div className="mr-3 text-right">
                                  <p className="text-sm font-medium">{match.opponentName}</p>
                                  <p className="text-2xl font-bold">{match.goalsConceded || 0}</p>
                                </div>
                                <img 
                                  src={match.opponentLogo || "https://ui-avatars.com/api/?name=Opponent&background=f44336&color=fff"} 
                                  alt={match.opponentName}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="text-sm flex justify-between">
                            <div>
                              <p className="font-medium">Location</p>
                              <p className="text-gray-500">{match.location}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">Match Type</p>
                              <p className="text-gray-500">{match.isHome ? "Home" : "Away"}</p>
                            </div>
                          </div>

                          {match.notes && (
                            <div className="text-sm">
                              <p className="font-medium mb-1">Notes</p>
                              <p className="text-gray-500">{match.notes}</p>
                            </div>
                          )}

                          <Button className="w-full bg-primary hover:bg-primary/90">
                            View Match Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
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