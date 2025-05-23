import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Match,
  MatchLineup,
  MatchSubstitution,
  MatchGoal,
  MatchCard,
  TeamMember,
  User
} from "@shared/schema";
import { useLanguage } from "@/hooks/use-language";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Trophy,
  Users,
  ArrowRightLeft,
  AlertTriangle,
  Plus
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

// Simplified schemas matching actual database structure
const substitutionSchema = z.object({
  playerInId: z.number({
    required_error: "Player coming in is required"
  }),
  playerOutId: z.number({
    required_error: "Player going out is required"
  }),
  minute: z.number({
    required_error: "Minute is required"
  }).int().positive()
});

const goalSchema = z.object({
  scorerId: z.number({
    required_error: "Scorer is required"
  }),
  assistId: z.number().optional().nullable(),
  minute: z.number({
    required_error: "Minute is required"
  }).int().positive(),
  isOwnGoal: z.boolean().default(false),
  isPenalty: z.boolean().default(false)
});

const cardSchema = z.object({
  playerId: z.number({
    required_error: "Player is required"
  }),
  minute: z.number({
    required_error: "Minute is required"
  }).int().positive(),
  isYellow: z.boolean().default(true),
  isSecondYellow: z.boolean().default(false)
});

interface MatchDetailsProps {
  match: Match;
  teamId: number;
  onUpdate: () => void;
}

export default function MatchDetailsFixed({ match, teamId, onUpdate }: MatchDetailsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("lineup");
  
  // Dialog states
  const [substitutionDialogOpen, setSubstitutionDialogOpen] = useState(false);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [cardDialogOpen, setCardDialogOpen] = useState(false);

  // Forms
  const substitutionForm = useForm<z.infer<typeof substitutionSchema>>({
    resolver: zodResolver(substitutionSchema),
    defaultValues: {
      playerInId: undefined,
      playerOutId: undefined,
      minute: undefined
    }
  });
  
  const goalForm = useForm<z.infer<typeof goalSchema>>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      scorerId: undefined,
      assistId: null,
      minute: undefined,
      isOwnGoal: false,
      isPenalty: false
    }
  });
  
  const cardForm = useForm<z.infer<typeof cardSchema>>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      playerId: undefined,
      minute: undefined,
      isYellow: true,
      isSecondYellow: false
    }
  });

  // Queries with safe fallbacks
  const { data: teamMembers = [], isLoading: teamMembersLoading } = useQuery<TeamMember[]>({
    queryKey: [`/api/teams/${teamId}/members`],
  });

  const { data: substitutions = [], isLoading: substitutionsLoading } = useQuery<(MatchSubstitution & {
    playerIn: User;
    playerOut: User;
  })[]>({
    queryKey: [`/api/teams/${teamId}/matches/${match.id}/substitutions`],
    enabled: match.status === "completed"
  });

  const { data: goals = [], isLoading: goalsLoading } = useQuery<(MatchGoal & {
    scorer: User;
    assistPlayer?: User;
  })[]>({
    queryKey: [`/api/teams/${teamId}/matches/${match.id}/goals`],
    enabled: match.status === "completed"
  });

  const { data: cards = [], isLoading: cardsLoading } = useQuery<(MatchCard & {
    player: User;
  })[]>({
    queryKey: [`/api/teams/${teamId}/matches/${match.id}/cards`],
    enabled: match.status === "completed"
  });

  // Mutations
  const addSubstitution = useMutation({
    mutationFn: async (data: z.infer<typeof substitutionSchema>) => {
      const response = await fetch(`/api/teams/${teamId}/matches/${match.id}/substitutions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, matchId: match.id })
      });
      if (!response.ok) throw new Error("Failed to add substitution");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/matches/${match.id}/substitutions`] });
      setSubstitutionDialogOpen(false);
      substitutionForm.reset();
      toast({
        titleKey: "matches.substitutionAdded",
        descriptionKey: "matches.substitutionAddedSuccess"
      });
    },
    onError: () => {
      toast({
        titleKey: "toasts.error",
        descriptionKey: "toasts.failedToAddSubstitution",
        variant: "destructive"
      });
    }
  });

  const addGoal = useMutation({
    mutationFn: async (data: z.infer<typeof goalSchema>) => {
      const response = await fetch(`/api/teams/${teamId}/matches/${match.id}/goals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, matchId: match.id })
      });
      if (!response.ok) throw new Error("Failed to add goal");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/matches/${match.id}/goals`] });
      setGoalDialogOpen(false);
      goalForm.reset();
      toast({
        titleKey: "matches.goalAdded",
        descriptionKey: "matches.goalAddedSuccess"
      });
    },
    onError: () => {
      toast({
        titleKey: "toasts.error",
        descriptionKey: "toasts.failedToAddGoal",
        variant: "destructive"
      });
    }
  });

  const addCard = useMutation({
    mutationFn: async (data: z.infer<typeof cardSchema>) => {
      const response = await fetch(`/api/teams/${teamId}/matches/${match.id}/cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, matchId: match.id })
      });
      if (!response.ok) throw new Error("Failed to add card");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/matches/${match.id}/cards`] });
      setCardDialogOpen(false);
      cardForm.reset();
      toast({
        titleKey: "matches.cardAdded",
        descriptionKey: "matches.cardAddedSuccess"
      });
    },
    onError: () => {
      toast({
        titleKey: "toasts.error",
        descriptionKey: "toasts.failedToAddCard",
        variant: "destructive"
      });
    }
  });

  // Helper function to get player name safely
  const getPlayerName = (member: TeamMember) => {
    return member.fullName || `Player ${member.id}`;
  };

  // Filter available players (only those with fullName)
  const availablePlayers = teamMembers.filter(member => member.fullName);

  if (match.status !== "completed") {
    return (
      <Card className="border-dashed border-gray-300">
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">Match statistics will be available once the match is completed.</p>
          <p className="text-sm text-gray-400 mt-2">Update match status to "completed" to add lineup, goals, and other details.</p>
        </CardContent>
      </Card>
    );
  }

  const isLoading = teamMembersLoading || substitutionsLoading || goalsLoading || cardsLoading;
  if (isLoading) {
    return (
      <Card className="border-gray-300">
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">Loading match statistics...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Match Details</span>
          <div className="text-sm font-normal flex items-center">
            <span className="mr-2">Score:</span>
            <Badge className="bg-green-500">{match.goalsScored || 0} - {match.goalsConceded || 0}</Badge>
          </div>
        </CardTitle>
        <CardDescription>
          {format(new Date(match.matchDate), "EEEE, MMMM d, yyyy 'at' h:mm a")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 min-h-[45px]">
            <TabsTrigger value="substitutions">
              Substitutions
            </TabsTrigger>
            <TabsTrigger value="goals">
              Goals
            </TabsTrigger>
            <TabsTrigger value="cards">
              Cards
            </TabsTrigger>
          </TabsList>

          {/* Substitutions Tab */}
          <TabsContent value="substitutions" className="mt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold flex items-center">
                <ArrowRightLeft className="mr-2 h-5 w-5" />
                Substitutions
              </h3>
              <Dialog open={substitutionDialogOpen} onOpenChange={setSubstitutionDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Substitution
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Substitution</DialogTitle>
                    <DialogDescription>Record a player substitution</DialogDescription>
                  </DialogHeader>
                  <Form {...substitutionForm}>
                    <form onSubmit={substitutionForm.handleSubmit((data) => addSubstitution.mutate(data))} className="space-y-4">
                      <FormField
                        control={substitutionForm.control}
                        name="playerInId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Player Coming In</FormLabel>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select player coming in" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {availablePlayers.map((member) => (
                                  <SelectItem key={member.id} value={member.id.toString()}>
                                    {getPlayerName(member)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={substitutionForm.control}
                        name="playerOutId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Player Going Out</FormLabel>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select player going out" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {availablePlayers.map((member) => (
                                  <SelectItem key={member.id} value={member.id.toString()}>
                                    {getPlayerName(member)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={substitutionForm.control}
                        name="minute"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Minute</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="Match minute" 
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button type="submit" disabled={addSubstitution.isPending}>
                          {addSubstitution.isPending ? "Adding..." : "Add Substitution"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
            
            {substitutions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ArrowRightLeft className="mx-auto h-12 w-12 mb-4 opacity-30" />
                <p>No substitutions recorded for this match.</p>
                <p className="text-sm mt-2">Record player substitutions to track changes during the match.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Minute</TableHead>
                    <TableHead>Player In</TableHead>
                    <TableHead>Player Out</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {substitutions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>{sub.minute}'</TableCell>
                      <TableCell>{sub.playerIn?.fullName || 'Unknown Player'}</TableCell>
                      <TableCell>{sub.playerOut?.fullName || 'Unknown Player'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          {/* Goals Tab */}
          <TabsContent value="goals" className="mt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold flex items-center">
                <Trophy className="mr-2 h-5 w-5" />
                Goals
              </h3>
              <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Goal
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Goal</DialogTitle>
                    <DialogDescription>Record a goal scored by your team</DialogDescription>
                  </DialogHeader>
                  <Form {...goalForm}>
                    <form onSubmit={goalForm.handleSubmit((data) => addGoal.mutate(data))} className="space-y-4">
                      <FormField
                        control={goalForm.control}
                        name="scorerId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Scorer</FormLabel>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select scorer" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {availablePlayers.map((member) => (
                                  <SelectItem key={member.id} value={member.id.toString()}>
                                    {getPlayerName(member)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={goalForm.control}
                        name="assistId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Assist (Optional)</FormLabel>
                            <Select onValueChange={(value) => field.onChange(value ? parseInt(value) : null)} value={field.value?.toString() || ''}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select assist player" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="">No assist</SelectItem>
                                {availablePlayers.map((member) => (
                                  <SelectItem key={member.id} value={member.id.toString()}>
                                    {getPlayerName(member)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={goalForm.control}
                        name="minute"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Minute</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="Match minute" 
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex space-x-4">
                        <FormField
                          control={goalForm.control}
                          name="isPenalty"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Penalty</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={goalForm.control}
                          name="isOwnGoal"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Own Goal</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={addGoal.isPending}>
                          {addGoal.isPending ? "Adding..." : "Add Goal"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
            
            {goals.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Trophy className="mx-auto h-12 w-12 mb-4 opacity-30" />
                <p>No goals recorded for this match.</p>
                <p className="text-sm mt-2">Add details of each goal scored by your team.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Minute</TableHead>
                    <TableHead>Scorer</TableHead>
                    <TableHead>Assist</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {goals.map((goal) => (
                    <TableRow key={goal.id}>
                      <TableCell>{goal.minute}'</TableCell>
                      <TableCell>{goal.scorer?.fullName || 'Unknown Player'}</TableCell>
                      <TableCell>{goal.assistPlayer?.fullName || '-'}</TableCell>
                      <TableCell>
                        {goal.isPenalty ? "Penalty" : goal.isOwnGoal ? "Own Goal" : "Regular"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          {/* Cards Tab */}
          <TabsContent value="cards" className="mt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold flex items-center">
                <AlertTriangle className="mr-2 h-5 w-5" />
                Cards
              </h3>
              <Dialog open={cardDialogOpen} onOpenChange={setCardDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Card
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Card</DialogTitle>
                    <DialogDescription>Record a yellow or red card</DialogDescription>
                  </DialogHeader>
                  <Form {...cardForm}>
                    <form onSubmit={cardForm.handleSubmit((data) => addCard.mutate(data))} className="space-y-4">
                      <FormField
                        control={cardForm.control}
                        name="playerId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Player</FormLabel>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select player" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {availablePlayers.map((member) => (
                                  <SelectItem key={member.id} value={member.id.toString()}>
                                    {getPlayerName(member)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={cardForm.control}
                        name="minute"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Minute</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="Match minute" 
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex space-x-4">
                        <FormField
                          control={cardForm.control}
                          name="isYellow"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Yellow Card</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={cardForm.control}
                          name="isSecondYellow"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Second Yellow (Red)</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={addCard.isPending}>
                          {addCard.isPending ? "Adding..." : "Add Card"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
            
            {cards.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertTriangle className="mx-auto h-12 w-12 mb-4 opacity-30" />
                <p>No cards recorded for this match.</p>
                <p className="text-sm mt-2">Record yellow and red cards received by your team.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Minute</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead>Card Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cards.map((card) => (
                    <TableRow key={card.id}>
                      <TableCell>{card.minute}'</TableCell>
                      <TableCell>{card.player?.fullName || 'Unknown Player'}</TableCell>
                      <TableCell>
                        <Badge variant={card.isSecondYellow ? "destructive" : card.isYellow ? "default" : "destructive"}>
                          {card.isSecondYellow ? "Second Yellow (Red)" : card.isYellow ? "Yellow" : "Red"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}