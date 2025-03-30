import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Team, Match } from "@shared/schema";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import MobileNavigation from "@/components/mobile-navigation";
import { useAuth } from "@/hooks/use-auth";
import MatchDetails from "@/components/match-details";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
  Check,
  X,
  Share2,
  Trash,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { format, isPast, isFuture } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

// Define form schema for creating a match
const matchSchema = z.object({
  opponentName: z.string().min(1, "Opponent name is required"),
  matchDate: z.string().min(1, "Match date is required"),
  location: z.string().min(1, "Location is required"),
  isHome: z.boolean().default(true),
  notes: z.string().optional(),
  status: z.enum(["scheduled", "completed", "cancelled"]).default("scheduled"),
  matchType: z.enum(["league", "copa", "friendly"]).default("friendly"),
  goalsScored: z.number().int().optional().nullable(),
  goalsConceded: z.number().int().optional().nullable(),
});

type MatchFormData = z.infer<typeof matchSchema>;

export default function MatchesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("upcoming");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [matchToDelete, setMatchToDelete] = useState<Match | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  
  // Check if user can manage matches (admin or coach)
  const canManage = user?.role === "admin" || user?.role === "coach";

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
    refetch: refetchMatches,
  } = useQuery<Match[]>({
    queryKey: ["matches", selectedTeam?.id],
    enabled: !!selectedTeam,
    queryFn: async () => {
      if (!selectedTeam) return [];
      console.log(`Fetching matches for team ${selectedTeam.id}`);
      const response = await fetch(`/api/teams/${selectedTeam.id}/matches`);
      if (!response.ok) throw new Error("Failed to fetch matches");
      const matchesData = await response.json();
      console.log("Fetched matches:", matchesData);
      return matchesData;
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0, // Consider data stale immediately
  });

  // We need to make sure refetchMatches properly invalidates the cache
  const refetchMatchesData = async () => {
    console.log("Manually invalidating matches cache");
    await queryClient.invalidateQueries({
      queryKey: ["matches", selectedTeam?.id],
    });
    return refetchMatches();
  };

  const isLoading = teamsLoading || matchesLoading;

  // Handle editing a match
  const handleEditMatch = (match: Match) => {
    setEditingMatch(match);
    setIsEditing(true);

    // Convert date to format expected by datetime-local input
    const matchDate = new Date(match.matchDate);
    const formattedDate = matchDate.toISOString().slice(0, 16);

    // Reset the form with the match data
    form.reset({
      opponentName: match.opponentName,
      matchDate: formattedDate,
      location: match.location,
      isHome: match.isHome,
      notes: match.notes || "",
      status: match.status || "scheduled",
      matchType: match.matchType || "friendly",
      goalsScored: match.goalsScored || null,
      goalsConceded: match.goalsConceded || null,
    });

    setDialogOpen(true);
  };

  // Handle deleting a match
  const handleDeleteMatch = async () => {
    if (!matchToDelete || !selectedTeam) return;

    try {
      const response = await fetch(
        `/api/teams/${selectedTeam.id}/matches/${matchToDelete.id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete match");
      }

      await refetchMatchesData();
      setDeleteDialogOpen(false);
      setMatchToDelete(null);

      toast({
        title: "Match deleted",
        description: "The match has been deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting match:", error);
      toast({
        title: "Error",
        description: "Failed to delete match",
        variant: "destructive",
      });
    }
  };

  // Open delete confirmation dialog
  const confirmDelete = (match: Match) => {
    setMatchToDelete(match);
    setDeleteDialogOpen(true);
  };

  const form = useForm<MatchFormData>({
    resolver: zodResolver(matchSchema),
    defaultValues: {
      opponentName: "",
      matchDate: new Date().toISOString().slice(0, 16),
      location: "",
      isHome: true,
      notes: "",
      status: "scheduled",
      matchType: "friendly",
      goalsScored: null,
      goalsConceded: null,
    },
  });

  // Handle dialog close - we need to clear form and reset editing state
  const handleDialogChange = (open: boolean) => {
    if (!open) {
      // Reset the form and editing state when dialog is closed
      setTimeout(() => {
        if (!isEditing) return;
        setIsEditing(false);
        setEditingMatch(null);
        form.reset({
          opponentName: "",
          matchDate: new Date().toISOString().slice(0, 16),
          location: "",
          isHome: true,
          notes: "",
          status: "scheduled",
          matchType: "friendly",
          goalsScored: null,
          goalsConceded: null,
        });
      }, 100);
    }
    setDialogOpen(open);
  };

  const onSubmit = async (data: MatchFormData) => {
    try {
      if (!selectedTeam) {
        throw new Error("No team selected");
      }

      // Format match date properly
      const formattedData = {
        ...data,
        matchDate: new Date(data.matchDate).toISOString(),
      };

      console.log("Submitting match data:", formattedData);

      let response;
      let successMessage;

      // If editing an existing match
      if (isEditing && editingMatch) {
        response = await fetch(
          `/api/teams/${selectedTeam.id}/matches/${editingMatch.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(formattedData),
          },
        );
        successMessage = "Match updated successfully";
      } else {
        // Creating a new match
        response = await fetch(`/api/teams/${selectedTeam.id}/matches`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formattedData),
        });
        successMessage = "Match created successfully";
      }

      if (!response.ok) {
        throw new Error(
          isEditing ? "Failed to update match" : "Failed to create match",
        );
      }

      // Get the result
      const result = await response.json();
      console.log(isEditing ? "Updated match:" : "Created match:", result);

      // Reset editing state
      setIsEditing(false);
      setEditingMatch(null);
      setDialogOpen(false);
      form.reset();

      // Force refetch with a different query key to trigger refresh
      await refetchMatchesData();
      console.log("Matches refetched");

      toast({
        title: isEditing ? "Match updated" : "Match created",
        description: successMessage,
      });
    } catch (error) {
      console.error(
        isEditing ? "Error updating match:" : "Error creating match:",
        error,
      );
      toast({
        title: "Error",
        description: isEditing
          ? "Failed to update match"
          : "Failed to create match",
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

  // Safely handle matches array and properly categorize by status and date
  const currentDate = new Date();

  // Function to check and update match status based on date
  const checkAndUpdateMatchStatus = async () => {
    if (!Array.isArray(matches) || !selectedTeam || !canManage) return;
    
    const currentDate = new Date();
    const updatedMatches = [];
    
    for (const match of matches) {
      if (match.status === "scheduled") {
        const matchDate = new Date(match.matchDate);
        
        // If match date has passed, update its status to completed
        if (matchDate < currentDate) {
          console.log(`Match ${match.id} date has passed, updating status to completed`);
          
          try {
            const response = await fetch(
              `/api/teams/${selectedTeam.id}/matches/${match.id}`,
              {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ status: "completed" }),
              }
            );
            
            if (response.ok) {
              updatedMatches.push(match.id);
            }
          } catch (error) {
            console.error(`Error updating match ${match.id} status:`, error);
          }
        }
      }
    }
    
    // If any matches were updated, refetch the data
    if (updatedMatches.length > 0) {
      console.log(`Updated ${updatedMatches.length} matches, refetching data`);
      await refetchMatchesData();
    }
  };
  
  // Run the check on component mount and when matches change
  useEffect(() => {
    // Only run auto-update if user has management permissions
    if (canManage) {
      checkAndUpdateMatchStatus();
    }
  }, [matches, selectedTeam, canManage]);

  const upcomingMatches = Array.isArray(matches)
    ? matches.filter((match) => {
        // Consider a match as upcoming if:
        // 1. It's scheduled AND the date is in the future
        if (match.status === "completed" || match.status === "cancelled") {
          return false; // Completed or cancelled matches always go to past tab
        }
        
        // Check if match date has passed
        const matchDate = new Date(match.matchDate);
        const currentDate = new Date();
        
        if (match.status === "scheduled" && matchDate < currentDate) {
          return false; // Don't show scheduled matches with past dates in upcoming tab
        }
        
        return true; // All other scheduled matches go to upcoming tab
      })
    : [];

  const pastMatches = Array.isArray(matches)
    ? matches.filter((match) => {
        // Consider a match as past if:
        // 1. It's completed or cancelled (regardless of date)
        // 2. OR it's scheduled but the date has passed
        if (match.status === "completed" || match.status === "cancelled") {
          return true;
        }
        
        // Check if match date has passed but status is still scheduled
        const matchDate = new Date(match.matchDate);
        const currentDate = new Date();
        
        return match.status === "scheduled" && matchDate < currentDate;
      })
    : [];

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
              <h1 className="text-2xl font-bold text-primary">
                Match Management
              </h1>
              <p className="text-gray-500">
                Track fixtures, results, and match statistics
              </p>
            </div>

            <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
              {canManage && (
                <DialogTrigger asChild>
                  <Button
                    onClick={() => {
                      // Reset form to default values before opening dialog for new match
                      if (isEditing) {
                        setIsEditing(false);
                        setEditingMatch(null);
                        form.reset({
                          opponentName: "",
                          matchDate: new Date().toISOString().slice(0, 16),
                          location: "",
                          isHome: true,
                          notes: "",
                          status: "scheduled",
                          matchType: "friendly",
                          goalsScored: null,
                          goalsConceded: null,
                        });
                      }
                    }}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Match
                  </Button>
                </DialogTrigger>
              )}
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {isEditing ? "Edit Match" : "Create New Match"}
                  </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-3"
                  >
                    <FormField
                      control={form.control}
                      name="opponentName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Opponent Team</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter opponent team name"
                              {...field}
                            />
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
                            <Input
                              placeholder="Enter match location"
                              {...field}
                            />
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
                              onChange={(e) =>
                                field.onChange(e.target.value === "home")
                              }
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
                      name="matchType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Competition Type</FormLabel>
                          <FormControl>
                            <select
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              onChange={(e) => field.onChange(e.target.value)}
                              value={field.value}
                            >
                              <option value="league">League</option>
                              <option value="copa">Copa</option>
                              <option value="friendly">Friendly</option>
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Match Status</FormLabel>
                          <FormControl>
                            <select
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              onChange={(e) => field.onChange(e.target.value)}
                              value={field.value}
                            >
                              <option value="scheduled">Scheduled</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {form.watch("status") === "completed" && (
                      <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-md">
                        <FormField
                          control={form.control}
                          name="goalsScored"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Goals Scored</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(
                                      parseInt(e.target.value) || 0,
                                    )
                                  }
                                  value={
                                    field.value === null ||
                                    field.value === undefined
                                      ? ""
                                      : field.value
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="goalsConceded"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Goals Conceded</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(
                                      parseInt(e.target.value) || 0,
                                    )
                                  }
                                  value={
                                    field.value === null ||
                                    field.value === undefined
                                      ? ""
                                      : field.value
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes (Optional)</FormLabel>
                          <FormControl>
                            <textarea
                              placeholder="Add any notes about this match"
                              {...field}
                              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end gap-2 pt-3">
                      <Button
                        type="submit"
                        className="bg-primary hover:bg-primary/90"
                      >
                        {isEditing ? "Update Match" : "Create Match"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {selectedMatch ? (
            <div className="mb-4">
              <Button
                variant="ghost"
                onClick={() => setSelectedMatch(null)}
                className="mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Match List
              </Button>

              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">
                        {selectedMatch.isHome ? (
                          <>
                            <span className="text-primary">Our Team</span> vs{" "}
                            {selectedMatch.opponentName}
                          </>
                        ) : (
                          <>
                            {selectedMatch.opponentName} vs{" "}
                            <span className="text-primary">Our Team</span>
                          </>
                        )}
                      </CardTitle>
                      <CardDescription>
                        <div className="mt-1 mb-2">
                          {format(
                            new Date(selectedMatch.matchDate),
                            "EEEE, MMMM d, yyyy 'at' h:mm a",
                          )}
                        </div>
                        <Badge>
                          {selectedMatch.status.charAt(0).toUpperCase() +
                            selectedMatch.status.slice(1)}
                        </Badge>
                        <Badge variant="outline" className="ml-2">
                          {selectedMatch.isHome ? "Home" : "Away"}
                        </Badge>
                        <Badge 
                          variant="secondary" 
                          className="ml-2"
                          style={{
                            backgroundColor: selectedMatch.matchType === 'league' ? '#4caf50' : 
                                           selectedMatch.matchType === 'copa' ? '#2196f3' : '#ff9800',
                            color: 'white'
                          }}
                        >
                          {selectedMatch.matchType ? 
                            selectedMatch.matchType.charAt(0).toUpperCase() + selectedMatch.matchType.slice(1) : 
                            'Friendly'}
                        </Badge>
                        <div className="mt-2">
                          <span className="text-muted-foreground">
                            Location:
                          </span>{" "}
                          {selectedMatch.location}
                        </div>
                      </CardDescription>
                    </div>

                    {selectedMatch.status === "completed" && 
                     selectedMatch.goalsScored !== null && 
                     selectedMatch.goalsConceded !== null && (
                      <div className="text-3xl font-bold">
                        {selectedMatch.goalsScored}-
                        {selectedMatch.goalsConceded}
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent>
                  {/* Notes */}
                  {selectedMatch.notes && (
                    <div className="mb-6">
                      <h3 className="text-lg font-medium mb-2">Match Notes</h3>
                      <div className="p-4 bg-gray-50 rounded-md">
                        {selectedMatch.notes}
                      </div>
                    </div>
                  )}

                  {/* Match Details Component */}
                  {selectedTeam && selectedMatch.status === "completed" && (
                    <MatchDetails
                      match={selectedMatch}
                      teamId={selectedTeam.id}
                      onUpdate={() => refetchMatchesData()}
                    />
                  )}
                </CardContent>

                <CardFooter className="flex justify-end gap-2">
                  {canManage && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditMatch(selectedMatch)}
                      >
                        <ClipboardEdit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => confirmDelete(selectedMatch)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </>
                  )}
                </CardFooter>
              </Card>
            </div>
          ) : (
            <Tabs
              defaultValue="upcoming"
              value={activeTab}
              onValueChange={setActiveTab}
            >
              <TabsList className="mb-6">
                <TabsTrigger
                  value="upcoming"
                  className="flex items-center gap-1"
                >
                  <Calendar className="h-4 w-4" />
                  Upcoming Matches
                </TabsTrigger>
                <TabsTrigger value="past" className="flex items-center gap-1">
                  <Trophy className="h-4 w-4" />
                  Past Matches
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming">
                {upcomingMatches.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6 flex flex-col items-center justify-center h-40">
                      <Calendar className="h-12 w-12 text-gray-300 mb-2" />
                      <p className="text-lg text-gray-500">
                        No upcoming matches scheduled
                      </p>
                      {canManage && (
                        <Button
                          variant="link"
                          onClick={() => setDialogOpen(true)}
                          className="text-primary mt-2"
                        >
                          Schedule your first match
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle>Upcoming Matches</CardTitle>
                      <CardDescription>
                        Scheduled matches for your team
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Opponent</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {upcomingMatches.map((match) => {
                            const matchDate = new Date(match.matchDate);
                            const isToday =
                              new Date().toDateString() ===
                              matchDate.toDateString();
                            const daysDifference = Math.ceil(
                              (matchDate.getTime() - new Date().getTime()) /
                                (1000 * 3600 * 24),
                            );

                            return (
                              <TableRow
                                key={match.id}
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => setSelectedMatch(match)}
                              >
                                <TableCell className="font-medium">
                                  {match.isHome ? (
                                    <>
                                      vs{" "}
                                      <span className="font-semibold">
                                        {match.opponentName}
                                      </span>
                                      <Badge variant="outline" className="ml-2">
                                        Home
                                      </Badge>
                                    </>
                                  ) : (
                                    <>
                                      @{" "}
                                      <span className="font-semibold">
                                        {match.opponentName}
                                      </span>
                                      <Badge variant="outline" className="ml-2">
                                        Away
                                      </Badge>
                                    </>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {format(
                                    new Date(match.matchDate),
                                    "EEE, MMM d, yyyy",
                                  )}
                                  <div className="text-xs text-muted-foreground">
                                    {format(
                                      new Date(match.matchDate),
                                      "h:mm a",
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>{match.location}</TableCell>
                                <TableCell>
                                  <Badge
                                    variant="secondary"
                                    style={{
                                      backgroundColor: match.matchType === 'league' ? '#4caf50' : 
                                                      match.matchType === 'copa' ? '#2196f3' : '#ff9800',
                                      color: 'white'
                                    }}
                                  >
                                    {match.matchType ? 
                                      match.matchType.charAt(0).toUpperCase() + match.matchType.slice(1) : 
                                      'Friendly'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      match.status === "cancelled"
                                        ? "outline"
                                        : match.status === "scheduled"
                                          ? "default"
                                          : "secondary"
                                    }
                                  >
                                    {match.status === "cancelled" &&
                                      "Cancelled"}
                                    {match.status === "scheduled" &&
                                      (isToday
                                        ? "Today"
                                        : `In ${daysDifference} days`)}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="past">
                {pastMatches.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6 flex flex-col items-center justify-center h-40">
                      <Trophy className="h-12 w-12 text-gray-300 mb-2" />
                      <p className="text-lg text-gray-500">
                        No past matches available
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle>Past Matches</CardTitle>
                      <CardDescription>
                        Completed and cancelled matches
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Opponent</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Result</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pastMatches.map((match) => {
                            const result =
                              match.status === "completed" && 
                                match.goalsScored !== null && 
                                match.goalsConceded !== null
                                ? match.goalsScored > match.goalsConceded
                                  ? "win"
                                  : match.goalsScored < match.goalsConceded
                                    ? "loss"
                                    : "draw"
                                : null;

                            return (
                              <TableRow
                                key={match.id}
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => setSelectedMatch(match)}
                              >
                                <TableCell className="font-medium">
                                  {match.isHome ? (
                                    <>
                                      vs{" "}
                                      <span className="font-semibold">
                                        {match.opponentName}
                                      </span>
                                      <Badge variant="outline" className="ml-2">
                                        Home
                                      </Badge>
                                    </>
                                  ) : (
                                    <>
                                      @{" "}
                                      <span className="font-semibold">
                                        {match.opponentName}
                                      </span>
                                      <Badge variant="outline" className="ml-2">
                                        Away
                                      </Badge>
                                    </>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {format(
                                    new Date(match.matchDate),
                                    "EEE, MMM d, yyyy",
                                  )}
                                </TableCell>
                                <TableCell>
                                  {match.status === "completed" ? (
                                    <div className="flex items-center">
                                      <Badge
                                        variant={
                                          result === "win"
                                            ? "default"
                                            : result === "loss"
                                              ? "destructive"
                                              : "outline"
                                        }
                                        className="mr-2"
                                      >
                                        {result === "win" && "Win"}
                                        {result === "loss" && "Loss"}
                                        {result === "draw" && "Draw"}
                                      </Badge>
                                      <span className="font-semibold">
                                        {match.goalsScored !== null && match.goalsConceded !== null && (
                                          match.isHome
                                            ? `${match.goalsScored}-${match.goalsConceded}`
                                            : `${match.goalsConceded}-${match.goalsScored}`
                                        )}
                                      </span>
                                    </div>
                                  ) : (
                                    <Badge variant="outline">N/A</Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="secondary"
                                    style={{
                                      backgroundColor: match.matchType === 'league' ? '#4caf50' : 
                                                      match.matchType === 'copa' ? '#2196f3' : '#ff9800',
                                      color: 'white'
                                    }}
                                  >
                                    {match.matchType ? 
                                      match.matchType.charAt(0).toUpperCase() + match.matchType.slice(1) : 
                                      'Friendly'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      match.status === "cancelled"
                                        ? "outline"
                                        : "secondary"
                                    }
                                  >
                                    {match.status.charAt(0).toUpperCase() +
                                      match.status.slice(1)}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          )}

          {/* Delete Confirmation Dialog */}
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Match</DialogTitle>
              </DialogHeader>
              <DialogDescription>
                Are you sure you want to delete this match? This action cannot
                be undone.
              </DialogDescription>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDeleteMatch}>
                  Delete Match
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="pb-16">
        <MobileNavigation />
      </div>
    </div>
  );
}
