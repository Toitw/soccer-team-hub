import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { PlusIcon, Search, ChevronLeft, ChevronRight, Soccer, Filter, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const matchSchema = z.object({
  opponent: z.string().min(1, { message: "Opponent name is required" }),
  date: z.date({ required_error: "Match date is required" }),
  time: z.string().min(1, { message: "Match time is required" }),
  location: z.string().min(1, { message: "Location is required" }),
  isHome: z.boolean(),
  type: z.string(),
});

export default function MatchesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";
  const isCoach = user?.role === "coach";
  const canManage = isAdmin || isCoach;

  const { data: matches, isLoading } = useQuery({
    queryKey: ["/api/matches"],
  });

  const matchForm = useForm<z.infer<typeof matchSchema>>({
    resolver: zodResolver(matchSchema),
    defaultValues: {
      opponent: "",
      date: new Date(),
      time: "15:00",
      location: "",
      isHome: true,
      type: "league",
    },
  });

  const createMatchMutation = useMutation({
    mutationFn: async (data: z.infer<typeof matchSchema>) => {
      const res = await apiRequest("POST", "/api/matches", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      toast({
        title: "Match created",
        description: "The match has been added to the schedule.",
      });
      matchForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to create match",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMatchResultMutation = useMutation({
    mutationFn: async ({ matchId, result }: { matchId: number; result: any }) => {
      const res = await apiRequest("PUT", `/api/matches/${matchId}/result`, result);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      toast({
        title: "Result updated",
        description: "The match result has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update result",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMatchMutation = useMutation({
    mutationFn: async (matchId: number) => {
      await apiRequest("DELETE", `/api/matches/${matchId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      toast({
        title: "Match deleted",
        description: "The match has been removed from the schedule.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete match",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function onCreateMatchSubmit(values: z.infer<typeof matchSchema>) {
    createMatchMutation.mutate(values);
  }

  function getStatusBadge(match: any) {
    const matchDate = new Date(match.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (match.homeScore !== undefined && match.awayScore !== undefined) {
      if (match.homeScore > match.awayScore) {
        return <Badge className="bg-green-100 text-green-800">Win</Badge>;
      } else if (match.homeScore < match.awayScore) {
        return <Badge className="bg-red-100 text-red-800">Loss</Badge>;
      } else {
        return <Badge className="bg-yellow-100 text-yellow-800">Draw</Badge>;
      }
    } else if (matchDate < today) {
      return <Badge variant="outline" className="text-red-600 border-red-600">Result Pending</Badge>;
    } else if (matchDate.toDateString() === today.toDateString()) {
      return <Badge className="bg-accent text-text">Today</Badge>;
    } else {
      return <Badge variant="outline">Upcoming</Badge>;
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <div className="md:flex md:items-center md:justify-between mb-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-7 text-gray-900 font-inter sm:text-3xl sm:leading-9 sm:truncate">
              Matches
            </h1>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            {canManage && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="inline-flex items-center">
                    <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                    Add Match
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[550px]">
                  <DialogHeader>
                    <DialogTitle>Add New Match</DialogTitle>
                    <DialogDescription>
                      Schedule a new match for your team.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...matchForm}>
                    <form onSubmit={matchForm.handleSubmit(onCreateMatchSubmit)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={matchForm.control}
                          name="opponent"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Opponent</FormLabel>
                              <FormControl>
                                <Input placeholder="Opponent team name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={matchForm.control}
                          name="type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Match Type</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select match type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="league">League</SelectItem>
                                  <SelectItem value="cup">Cup</SelectItem>
                                  <SelectItem value="friendly">Friendly</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={matchForm.control}
                          name="date"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Date</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant={"outline"}
                                      className={cn(
                                        "w-full pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                      )}
                                    >
                                      {field.value ? (
                                        format(field.value, "PPP")
                                      ) : (
                                        <span>Pick a date</span>
                                      )}
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={matchForm.control}
                          name="time"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Time</FormLabel>
                              <FormControl>
                                <Input type="time" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={matchForm.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Location</FormLabel>
                            <FormControl>
                              <Input placeholder="Match venue" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={matchForm.control}
                        name="isHome"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Match Type</FormLabel>
                            <Select 
                              onValueChange={(value) => field.onChange(value === "home")}
                              defaultValue={field.value ? "home" : "away"}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select match type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="home">Home</SelectItem>
                                <SelectItem value="away">Away</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <DialogFooter>
                        <Button type="submit" disabled={createMatchMutation.isPending}>
                          {createMatchMutation.isPending ? "Creating..." : "Add Match"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <h2 className="text-lg font-medium text-gray-900 font-inter mb-2 md:mb-0">
                Match Schedule
              </h2>
              <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <Input
                    placeholder="Search matches..."
                    className="pl-9 w-full md:w-auto"
                  />
                </div>
                <Select defaultValue="all">
                  <SelectTrigger className="w-full md:w-[180px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Matches</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="past">Past Matches</SelectItem>
                    <SelectItem value="home">Home Games</SelectItem>
                    <SelectItem value="away">Away Games</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <div className="p-4">
            <Tabs defaultValue="all">
              <TabsList className="mb-4">
                <TabsTrigger value="all">All Matches</TabsTrigger>
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="results">Results</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="mt-0">
                <div className="space-y-4">
                  {matches?.map((match: any) => (
                    <Card key={match.id} className="overflow-hidden">
                      <CardContent className="p-0">
                        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                          <div className="flex items-center">
                            <Badge className={`mr-2 ${match.type === 'league' ? 'bg-primary' : match.type === 'cup' ? 'bg-secondary' : 'bg-accent/80 text-text'}`}>
                              {match.type.charAt(0).toUpperCase() + match.type.slice(1)}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              {new Date(match.date).toLocaleDateString()} • {match.time}
                            </span>
                          </div>
                          <div>
                            {getStatusBadge(match)}
                          </div>
                        </div>
                        <div className="p-4">
                          <div className="flex flex-col md:flex-row items-center justify-between">
                            <div className="flex flex-col md:flex-row items-center mb-4 md:mb-0">
                              <div className="flex flex-col items-center md:items-end mr-4 mb-2 md:mb-0">
                                <span className="text-lg font-medium">{match.isHome ? "Our Team" : match.opponent}</span>
                                {match.homeScore !== undefined && <span className="text-3xl font-bold">{match.isHome ? match.homeScore : match.awayScore}</span>}
                              </div>
                              <div className="flex items-center mx-4">
                                <span className="text-sm font-medium px-2 py-1 bg-gray-100 rounded">VS</span>
                              </div>
                              <div className="flex flex-col items-center md:items-start ml-4">
                                <span className="text-lg font-medium">{match.isHome ? match.opponent : "Our Team"}</span>
                                {match.awayScore !== undefined && <span className="text-3xl font-bold">{match.isHome ? match.awayScore : match.homeScore}</span>}
                              </div>
                            </div>
                            
                            <div className="flex flex-col items-center md:items-start">
                              <div className="text-sm text-gray-500 flex items-center">
                                <Soccer className="h-4 w-4 mr-1" />
                                {match.location}
                              </div>
                              {match.homeScore === undefined && match.awayScore === undefined && canManage && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="mt-2">
                                      Add Result
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Add Match Result</DialogTitle>
                                      <DialogDescription>
                                        Enter the final score for this match.
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid grid-cols-5 gap-4 py-4">
                                      <div className="col-span-2">
                                        <Label htmlFor="home-score" className="block text-center mb-2">
                                          {match.isHome ? "Our Team" : match.opponent}
                                        </Label>
                                        <Input
                                          id="home-score"
                                          type="number"
                                          min="0"
                                          className="text-center"
                                          placeholder="0"
                                        />
                                      </div>
                                      <div className="flex items-center justify-center">
                                        <span className="text-lg font-bold">-</span>
                                      </div>
                                      <div className="col-span-2">
                                        <Label htmlFor="away-score" className="block text-center mb-2">
                                          {match.isHome ? match.opponent : "Our Team"}
                                        </Label>
                                        <Input
                                          id="away-score"
                                          type="number"
                                          min="0"
                                          className="text-center"
                                          placeholder="0"
                                        />
                                      </div>
                                    </div>
                                    <DialogFooter>
                                      <Button 
                                        onClick={() => {
                                          const homeScore = parseInt((document.getElementById("home-score") as HTMLInputElement).value);
                                          const awayScore = parseInt((document.getElementById("away-score") as HTMLInputElement).value);
                                          
                                          if (isNaN(homeScore) || isNaN(awayScore)) {
                                            toast({
                                              title: "Invalid score",
                                              description: "Please enter valid numbers for both scores",
                                              variant: "destructive",
                                            });
                                            return;
                                          }
                                          
                                          updateMatchResultMutation.mutate({
                                            matchId: match.id,
                                            result: { homeScore, awayScore }
                                          });
                                        }}
                                      >
                                        Save Result
                                      </Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                              )}
                            </div>
                          </div>
                        </div>
                        {canManage && (
                          <div className="bg-gray-50 px-4 py-2 border-t border-gray-200 flex justify-end">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-red-600 hover:text-red-900 hover:bg-red-50"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this match?")) {
                                  deleteMatchMutation.mutate(match.id);
                                }
                              }}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  
                  {!matches || matches.length === 0 && (
                    <div className="text-center py-12">
                      <Soccer className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No matches</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {canManage ? "Get started by creating your first match." : "No matches have been scheduled yet."}
                      </p>
                      {canManage && (
                        <div className="mt-6">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button className="inline-flex items-center">
                                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                                Add Match
                              </Button>
                            </DialogTrigger>
                          </Dialog>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="upcoming" className="mt-0">
                {/* Similar content for upcoming matches */}
              </TabsContent>
              
              <TabsContent value="results" className="mt-0">
                {/* Similar content for past matches with results */}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
