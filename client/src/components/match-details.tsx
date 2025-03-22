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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
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
  DialogClose
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
  Camera,
  Clipboard,
  Plus,
  X,
  Edit,
  Trash
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Define schemas for the various forms
const lineupSchema = z.object({
  formation: z.string().min(1, "Formation is required"),
  playerIds: z.array(z.number()).min(1, "At least one player must be selected"),
  benchPlayerIds: z.array(z.number()).optional().default([])
});

const substitutionSchema = z.object({
  playerInId: z.number({
    required_error: "Player coming in is required"
  }),
  playerOutId: z.number({
    required_error: "Player going out is required"
  }),
  minute: z.number({
    required_error: "Minute is required"
  }).int().positive(),
  reason: z.string().optional()
});

const goalSchema = z.object({
  scorerId: z.number({
    required_error: "Scorer is required"
  }),
  assistId: z.number().optional().nullable(),
  minute: z.number({
    required_error: "Minute is required"
  }).int().positive(),
  type: z.enum(["regular", "penalty", "free_kick", "own_goal"], {
    required_error: "Goal type is required"
  }),
  description: z.string().optional()
});

const cardSchema = z.object({
  playerId: z.number({
    required_error: "Player is required"
  }),
  type: z.enum(["yellow", "red"], {
    required_error: "Card type is required"
  }),
  minute: z.number({
    required_error: "Minute is required"
  }).int().positive(),
  reason: z.string().optional()
});

interface MatchDetailsProps {
  match: Match;
  teamId: number;
  onUpdate: () => void;
}

interface TeamMemberWithUser extends TeamMember {
  user: User;
}

export default function MatchDetails({ match, teamId, onUpdate }: MatchDetailsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("lineup");
  
  // Dialogs state
  const [lineupDialogOpen, setLineupDialogOpen] = useState(false);
  const [substitutionDialogOpen, setSubstitutionDialogOpen] = useState(false);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  
  // Forms
  // Available formations for the soccer field
  const availableFormations = [
    "4-3-3",
    "4-4-2",
    "3-5-2",
    "3-4-3",
    "5-3-2",
    "4-2-3-1",
  ];
  
  // State for the soccer field player positioning
  const [lineupPositions, setLineupPositions] = useState<{
    [position: string]: TeamMemberWithUser | null;
  }>({});
  
  // Function to calculate player positions based on formation
  const getPositionsByFormation = (formation: string) => {
    const positions: {
      id: string;
      label: string;
      top: number;
      left: number;
    }[] = [];
    const [defenders, midfielders, forwards] = formation.split("-").map(Number);
    
    // Add goalkeeper
    positions.push({ id: "gk", label: "GK", top: 82, left: 50 });
    
    // Add defenders
    const defenderWidth = 90 / (defenders + 1);
    for (let i = 1; i <= defenders; i++) {
      positions.push({
        id: `def-${i}`,
        label: "DEF",
        top: 60,
        left: 5 + i * defenderWidth,
      });
    }
    
    // Add midfielders
    const midfielderWidth = 80 / (midfielders + 1);
    for (let i = 1; i <= midfielders; i++) {
      positions.push({
        id: `mid-${i}`,
        label: "MID",
        top: 35,
        left: 10 + i * midfielderWidth,
      });
    }
    
    // Add forwards
    const forwardWidth = 80 / (forwards + 1);
    for (let i = 1; i <= forwards; i++) {
      positions.push({
        id: `fwd-${i}`,
        label: "FWD",
        top: 10,
        left: 10 + i * forwardWidth,
      });
    }
    
    return positions;
  };
  
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  
  const handlePositionClick = (positionId: string) => {
    setSelectedPosition(positionId);
  };
  
  const addPlayerToPosition = (member: TeamMemberWithUser, positionId: string) => {
    if (Object.values(lineupPositions).some(p => p?.id === member.id)) {
      toast({
        title: "Player already in lineup",
        description: "This player is already assigned to a position.",
        variant: "destructive"
      });
      return;
    }
    
    setLineupPositions(prev => ({
      ...prev,
      [positionId]: member
    }));
    
    // Add to form's playerIds if not already included
    const currentIds = lineupForm.getValues().playerIds;
    if (!currentIds.includes(member.userId)) {
      lineupForm.setValue('playerIds', [...currentIds, member.userId]);
    }
    
    setSelectedPosition(null);
  };
  
  const removePlayerFromPosition = (positionId: string) => {
    const player = lineupPositions[positionId];
    if (player) {
      // Remove from form's playerIds
      const currentIds = lineupForm.getValues().playerIds;
      lineupForm.setValue('playerIds', currentIds.filter(id => id !== player.userId));
      
      // Remove from positions
      setLineupPositions(prev => {
        const newPositions = { ...prev };
        delete newPositions[positionId];
        return newPositions;
      });
    }
  };
  
  // State for bench players
  const [benchPlayers, setBenchPlayers] = useState<number[]>([]);
  
  // Add player to bench
  const addPlayerToBench = (member: TeamMemberWithUser) => {
    const currentBenchIds = lineupForm.getValues().benchPlayerIds || [];
    
    // Check if player is already on the field
    if (Object.values(lineupPositions).some(p => p?.id === member.id)) {
      toast({
        title: "Player already in lineup",
        description: "Remove the player from the field position first before adding to bench.",
        variant: "destructive"
      });
      return;
    }
    
    // Check if player is already on the bench
    if (currentBenchIds.includes(member.userId)) {
      toast({
        title: "Player already on bench",
        description: "This player is already on the bench.",
        variant: "destructive"
      });
      return;
    }
    
    lineupForm.setValue('benchPlayerIds', [...currentBenchIds, member.userId]);
    setBenchPlayers([...benchPlayers, member.userId]);
  };
  
  // Remove player from bench
  const removePlayerFromBench = (userId: number) => {
    const currentBenchIds = lineupForm.getValues().benchPlayerIds || [];
    lineupForm.setValue('benchPlayerIds', currentBenchIds.filter(id => id !== userId));
    setBenchPlayers(benchPlayers.filter(id => id !== userId));
  };

  const lineupForm = useForm<z.infer<typeof lineupSchema>>({
    resolver: zodResolver(lineupSchema),
    defaultValues: {
      formation: "4-4-2",
      playerIds: [],
      benchPlayerIds: []
    }
  });
  
  const substitutionForm = useForm<z.infer<typeof substitutionSchema>>({
    resolver: zodResolver(substitutionSchema),
    defaultValues: {
      playerInId: undefined,
      playerOutId: undefined,
      minute: undefined,
      reason: ""
    }
  });
  
  const goalForm = useForm<z.infer<typeof goalSchema>>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      scorerId: undefined,
      assistId: null,
      minute: undefined,
      type: undefined,
      description: ""
    }
  });
  
  const cardForm = useForm<z.infer<typeof cardSchema>>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      playerId: undefined,
      type: undefined,
      minute: undefined,
      reason: ""
    }
  });

  // Queries
  const { data: teamMembers, isLoading: teamMembersLoading } = useQuery<TeamMemberWithUser[]>({
    queryKey: [`/api/teams/${teamId}/members`],
  });

  const { data: lineup, isLoading: lineupLoading } = useQuery<MatchLineup & { 
    players: User[],
    benchPlayers?: User[] 
  }>({
    queryKey: [`/api/teams/${teamId}/matches/${match.id}/lineup`],
    enabled: match.status === "completed"
  });

  const { data: substitutions, isLoading: substitutionsLoading } = useQuery<(MatchSubstitution & {
    playerIn: User;
    playerOut: User;
  })[]>({
    queryKey: [`/api/teams/${teamId}/matches/${match.id}/substitutions`],
    enabled: match.status === "completed"
  });

  const { data: goals, isLoading: goalsLoading } = useQuery<(MatchGoal & {
    scorer: User;
    assistPlayer?: User;
  })[]>({
    queryKey: [`/api/teams/${teamId}/matches/${match.id}/goals`],
    enabled: match.status === "completed"
  });

  const { data: cards, isLoading: cardsLoading } = useQuery<(MatchCard & {
    player: User;
  })[]>({
    queryKey: [`/api/teams/${teamId}/matches/${match.id}/cards`],
    enabled: match.status === "completed"
  });

  // Mutations
  const saveLineup = useMutation({
    mutationFn: async (data: z.infer<typeof lineupSchema>) => {
      const response = await fetch(`/api/teams/${teamId}/matches/${match.id}/lineup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error("Failed to save lineup");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/matches/${match.id}/lineup`] });
      toast({
        title: "Lineup saved",
        description: "Match lineup has been saved successfully"
      });
      setLineupDialogOpen(false);
      lineupForm.reset();
      onUpdate();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save lineup",
        variant: "destructive"
      });
    }
  });

  const addSubstitution = useMutation({
    mutationFn: async (data: z.infer<typeof substitutionSchema>) => {
      const response = await fetch(`/api/teams/${teamId}/matches/${match.id}/substitutions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error("Failed to add substitution");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/matches/${match.id}/substitutions`] });
      toast({
        title: "Substitution added",
        description: "Match substitution has been recorded"
      });
      setSubstitutionDialogOpen(false);
      substitutionForm.reset();
      onUpdate();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add substitution",
        variant: "destructive"
      });
    }
  });

  const deleteSubstitution = useMutation({
    mutationFn: async (substitutionId: number) => {
      const response = await fetch(`/api/teams/${teamId}/matches/${match.id}/substitutions/${substitutionId}`, {
        method: "DELETE"
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete substitution");
      }
      
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/matches/${match.id}/substitutions`] });
      toast({
        title: "Substitution removed",
        description: "Substitution has been deleted successfully"
      });
      onUpdate();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete substitution",
        variant: "destructive"
      });
    }
  });

  const addGoal = useMutation({
    mutationFn: async (data: z.infer<typeof goalSchema>) => {
      const response = await fetch(`/api/teams/${teamId}/matches/${match.id}/goals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error("Failed to add goal");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/matches/${match.id}/goals`] });
      toast({
        title: "Goal added",
        description: "Match goal has been recorded"
      });
      setGoalDialogOpen(false);
      goalForm.reset();
      onUpdate();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add goal",
        variant: "destructive"
      });
    }
  });

  const deleteGoal = useMutation({
    mutationFn: async (goalId: number) => {
      const response = await fetch(`/api/teams/${teamId}/matches/${match.id}/goals/${goalId}`, {
        method: "DELETE"
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete goal");
      }
      
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/matches/${match.id}/goals`] });
      toast({
        title: "Goal removed",
        description: "Goal has been deleted successfully"
      });
      onUpdate();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete goal",
        variant: "destructive"
      });
    }
  });

  const addCard = useMutation({
    mutationFn: async (data: z.infer<typeof cardSchema>) => {
      const response = await fetch(`/api/teams/${teamId}/matches/${match.id}/cards`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error("Failed to add card");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/matches/${match.id}/cards`] });
      toast({
        title: "Card added",
        description: "Match card has been recorded"
      });
      setCardDialogOpen(false);
      cardForm.reset();
      onUpdate();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add card",
        variant: "destructive"
      });
    }
  });

  const deleteCard = useMutation({
    mutationFn: async (cardId: number) => {
      const response = await fetch(`/api/teams/${teamId}/matches/${match.id}/cards/${cardId}`, {
        method: "DELETE"
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete card");
      }
      
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/matches/${match.id}/cards`] });
      toast({
        title: "Card removed",
        description: "Card has been deleted successfully"
      });
      onUpdate();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete card",
        variant: "destructive"
      });
    }
  });

  // Form handlers
  const handleLineupSubmit = (data: z.infer<typeof lineupSchema>) => {
    saveLineup.mutate(data);
  };

  const handleSubstitutionSubmit = (data: z.infer<typeof substitutionSchema>) => {
    addSubstitution.mutate(data);
  };

  const handleGoalSubmit = (data: z.infer<typeof goalSchema>) => {
    addGoal.mutate(data);
  };

  const handleCardSubmit = (data: z.infer<typeof cardSchema>) => {
    addCard.mutate(data);
  };

  // Only show match statistics if match is completed
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

  // Loading state
  const isLoading = teamMembersLoading || lineupLoading || substitutionsLoading || goalsLoading || cardsLoading;
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
            <Badge className="bg-green-500">{match.goalsScored} - {match.goalsConceded}</Badge>
          </div>
        </CardTitle>
        <CardDescription>
          {format(new Date(match.matchDate), "EEEE, MMMM d, yyyy 'at' h:mm a")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="lineup">
              Lineup
            </TabsTrigger>
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

          {/* Lineup Tab */}
          <TabsContent value="lineup" className="py-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Starting Lineup</h3>
              <Dialog open={lineupDialogOpen} onOpenChange={setLineupDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    {lineup ? <Edit className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                    {lineup ? "Edit Lineup" : "Add Lineup"}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-6xl w-[90vw] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{lineup ? "Edit Match Lineup" : "Add Match Lineup"}</DialogTitle>
                  </DialogHeader>
                  <Form {...lineupForm}>
                    <form onSubmit={lineupForm.handleSubmit(handleLineupSubmit)} className="space-y-4">

                      
                      <FormField
                        control={lineupForm.control}
                        name="formation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Formation</FormLabel>
                            <FormControl>
                              <Select 
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  // Reset lineup positions when formation changes
                                  setLineupPositions({});
                                }}
                                defaultValue={field.value}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select formation" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableFormations.map((formation) => (
                                    <SelectItem key={formation} value={formation}>
                                      {formation}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={lineupForm.control}
                        name="playerIds"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Team Lineup</FormLabel>
                            <FormMessage />
                            
                            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mt-2">
                              {/* Soccer Field */}
                              <div className="lg:col-span-3">
                                <div className="relative bg-gradient-to-b from-green-700 to-green-900 w-full h-80 sm:aspect-[16/9] mx-auto rounded-md flex items-center justify-center overflow-hidden">
                                  <div className="absolute top-0 left-0 w-full h-full">
                                    <div className="border-2 border-white border-b-0 mx-4 mt-4 h-full rounded-t-md relative">
                                      {/* Soccer field markings */}
                                      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-40 h-20 border-2 border-t-0 border-white rounded-b-full"></div>
                                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-32 w-64 border-2 border-b-0 border-white"></div>
                                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-16 w-32 border-2 border-b-0 border-white"></div>
                                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-2 w-24 bg-white"></div>
                                      <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full"></div>
                                      
                                      {/* Player positions */}
                                      <div className="absolute top-0 left-0 w-full h-full">
                                        {getPositionsByFormation(lineupForm.watch("formation")).map(
                                          (position) => {
                                            const player = lineupPositions[position.id];
                                            return (
                                              <div
                                                key={position.id}
                                                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                                                style={{
                                                  top: `${position.top}%`,
                                                  left: `${position.left}%`,
                                                }}
                                                onClick={() => handlePositionClick(position.id)}
                                              >
                                                <div
                                                  className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-white border-2 border-white shadow-lg transition-all ${
                                                    player
                                                      ? "scale-100"
                                                      : "scale-90 opacity-70"
                                                  } ${
                                                    position.label === "GK"
                                                      ? "bg-blue-500"
                                                      : position.label === "DEF"
                                                        ? "bg-red-500"
                                                        : position.label === "MID"
                                                          ? "bg-green-500"
                                                          : "bg-yellow-500"
                                                  } hover:scale-110 hover:opacity-100`}
                                                >
                                                  {player ? (
                                                    <div className="flex flex-col items-center">
                                                      <span className="font-bold text-sm">
                                                        {player.user.jerseyNumber || "?"}
                                                      </span>
                                                    </div>
                                                  ) : (
                                                    <div className="opacity-50 text-sm">+</div>
                                                  )}
                                                </div>
                                                
                                                {/* Player tooltip */}
                                                {player && (
                                                  <div className="opacity-0 bg-black text-white text-xs rounded p-2 absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 pointer-events-none group-hover:opacity-100 whitespace-nowrap">
                                                    {player.user.fullName}
                                                    {player.user.position && ` (${player.user.position})`}
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          }
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="mt-2 text-sm text-muted-foreground flex flex-wrap justify-center">
                                  <div className="flex items-center mr-3 mb-1">
                                    <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-1"></span>
                                    <span>GK</span>
                                  </div>
                                  <div className="flex items-center mr-3 mb-1">
                                    <span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-1"></span>
                                    <span>DEF</span>
                                  </div>
                                  <div className="flex items-center mr-3 mb-1">
                                    <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-1"></span>
                                    <span>MID</span>
                                  </div>
                                  <div className="flex items-center mb-1">
                                    <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full mr-1"></span>
                                    <span>FWD</span>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Available Players */}
                              <div className="lg:col-span-2">
                                <div className="bg-muted/30 rounded-md p-2">
                                  <h4 className="font-medium mb-2 text-sm">Available Players</h4>
                                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                                    {selectedPosition && (
                                      <div className="bg-primary/10 p-2 rounded-md mb-2 text-sm">
                                        <p>Select a player for position: <span className="font-bold">{selectedPosition}</span></p>
                                      </div>
                                    )}
                                    
                                    {teamMembers
                                      ?.filter(
                                        (member) =>
                                          member.role === "player" &&
                                          !Object.values(lineupPositions).some(
                                            (p) => p?.id === member.id
                                          )
                                      )
                                      .map((member) => (
                                        <div
                                          key={member.userId}
                                          className={`flex items-center justify-between p-2 bg-white border rounded-md ${
                                            selectedPosition ? "cursor-pointer hover:bg-primary/5" : ""
                                          }`}
                                          onClick={() => {
                                            if (selectedPosition) {
                                              addPlayerToPosition(member, selectedPosition);
                                            }
                                          }}
                                        >
                                          <div className="flex items-center">
                                            <div className="ml-2">
                                              <div className="font-medium">{member.user.fullName}</div>
                                              <div className="text-xs text-gray-500 flex">
                                                {member.user.position && (
                                                  <span className="mr-2">{member.user.position}</span>
                                                )}
                                                {member.user.jerseyNumber && (
                                                  <span>#{member.user.jerseyNumber}</span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                      
                                    {/* Empty state */}
                                    {teamMembers?.filter(
                                      (member) =>
                                        member.role === "player" &&
                                        !Object.values(lineupPositions).some(
                                          (p) => p?.id === member.id
                                        )
                                    ).length === 0 && (
                                      <div className="text-center py-4 text-muted-foreground">
                                        <p>All players are in the lineup</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Bench section */}
                                <FormField
                                  control={lineupForm.control}
                                  name="benchPlayerIds"
                                  render={({ field }) => (
                                    <FormItem>
                                      <div className="mt-4 bg-muted/30 rounded-md p-2">
                                        <h4 className="font-medium mb-2 text-sm">Players on the Bench</h4>
                                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                                          {/* Players not in the field lineup or on bench */}
                                          {teamMembers?.filter(member => 
                                            member.role === "player" && 
                                            !Object.values(lineupPositions).some(p => p?.id === member.id) &&
                                            !field.value.includes(member.userId)
                                          ).map(member => (
                                            <div
                                              key={member.userId}
                                              className="flex items-center justify-between p-2 bg-white border rounded-md cursor-pointer hover:bg-gray-50"
                                              onClick={() => addPlayerToBench(member)}
                                            >
                                              <div className="flex items-center">
                                                <div>
                                                  <div className="font-medium">{member.user.fullName}</div>
                                                  <div className="text-xs text-gray-500 flex">
                                                    {member.user.position && (
                                                      <span className="mr-2">{member.user.position}</span>
                                                    )}
                                                    {member.user.jerseyNumber && (
                                                      <span>#{member.user.jerseyNumber}</span>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                type="button"
                                                className="h-7 p-0"
                                              >
                                                <Plus className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          ))}
                                          
                                          {/* Show bench players */}
                                          {field.value.length > 0 && (
                                            <div className="mt-4">
                                              <h5 className="text-xs font-medium text-gray-500 mb-2">Selected Bench Players:</h5>
                                              <div className="flex flex-col gap-2">
                                                {field.value.map((playerId) => {
                                                  const member = teamMembers?.find(m => m.userId === playerId);
                                                  return member ? (
                                                    <div key={playerId} className="flex justify-between items-center bg-primary/10 p-2 rounded-md">
                                                      <div className="text-sm font-medium">
                                                        {member.user.fullName}
                                                        {member.user.jerseyNumber && <span className="text-xs ml-1">#{member.user.jerseyNumber}</span>}
                                                      </div>
                                                      <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        type="button"
                                                        onClick={() => removePlayerFromBench(playerId)}
                                                        className="h-7 w-7 p-0"
                                                      >
                                                        <X className="h-4 w-4" />
                                                      </Button>
                                                    </div>
                                                  ) : null;
                                                })}
                                              </div>
                                            </div>
                                          )}
                                          
                                          {/* Empty state */}
                                          {teamMembers?.filter(member => 
                                            member.role === "player" && 
                                            !Object.values(lineupPositions).some(p => p?.id === member.id) &&
                                            !field.value.includes(member.userId)
                                          ).length === 0 && field.value.length === 0 && (
                                            <div className="text-center py-4 text-muted-foreground">
                                              <p>No players available for bench</p>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex justify-end gap-2">
                        <DialogClose asChild>
                          <Button type="button" variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={saveLineup.isPending}>
                          {saveLineup.isPending && <span className="mr-2 animate-spin">⟳</span>}
                          Save Lineup
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
            
            {lineup ? (
              <div>
                <div className="bg-gray-50 p-3 rounded-md mb-3">
                  <div className="font-medium">Formation: {lineup.formation}</div>
                </div>
                
                {/* Field Visualization */}
                <div className="mb-6">
                  <h4 className="font-medium text-sm mb-2">Field Positions</h4>
                  <div className="relative bg-gradient-to-b from-green-700 to-green-900 w-full aspect-[16/9] mx-auto rounded-md flex items-center justify-center overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full">
                      <div className="border-2 border-white border-b-0 mx-4 mt-4 h-full rounded-t-md relative">
                        {/* Soccer field markings */}
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-40 h-20 border-2 border-t-0 border-white rounded-b-full"></div>
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-32 w-64 border-2 border-b-0 border-white"></div>
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-16 w-32 border-2 border-b-0 border-white"></div>
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-2 w-24 bg-white"></div>
                        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full"></div>
                        
                        {/* Player positions */}
                        <div className="absolute top-0 left-0 w-full h-full">
                          {lineup.players && lineup.players.length > 0 && lineup.formation && getPositionsByFormation(lineup.formation).map((position, index) => {
                            const player = index < lineup.players.length ? lineup.players[index] : null;
                            return (
                              <div
                                key={position.id}
                                className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
                                style={{
                                  top: `${position.top}%`,
                                  left: `${position.left}%`,
                                }}
                              >
                                <div
                                  className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-white border-2 border-white shadow-lg ${
                                    player
                                      ? "scale-100"
                                      : "scale-90 opacity-70"
                                  } ${
                                    position.label === "GK"
                                      ? "bg-blue-500"
                                      : position.label === "DEF"
                                        ? "bg-red-500"
                                        : position.label === "MID"
                                          ? "bg-green-500"
                                          : "bg-yellow-500"
                                  }`}
                                >
                                  {player ? (
                                    <div className="flex flex-col items-center">
                                      <span className="font-bold text-sm">
                                        {player.jerseyNumber || "?"}
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="opacity-50 text-sm">?</div>
                                  )}
                                </div>
                                
                                {/* Player tooltip */}
                                {player && (
                                  <div className="opacity-0 bg-black text-white text-xs rounded p-2 absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 pointer-events-none group-hover:opacity-100 whitespace-nowrap">
                                    {player.fullName}
                                    {player.position && ` (${player.position})`}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-2 text-sm text-muted-foreground flex flex-wrap justify-center">
                    <div className="flex items-center mr-3 mb-1">
                      <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-1"></span>
                      <span>GK</span>
                    </div>
                    <div className="flex items-center mr-3 mb-1">
                      <span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-1"></span>
                      <span>DEF</span>
                    </div>
                    <div className="flex items-center mr-3 mb-1">
                      <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-1"></span>
                      <span>MID</span>
                    </div>
                    <div className="flex items-center mb-1">
                      <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full mr-1"></span>
                      <span>FWD</span>
                    </div>
                  </div>
                </div>
                
                {/* Starting Lineup List */}
                <h4 className="font-medium text-sm mb-2">Starting Players</h4>
                {lineup.players && lineup.players.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                    {lineup.players.map((player) => (
                      <div key={player.id} className="flex items-center p-2 bg-white border rounded-md">
                        <div className="flex-1 ml-2">
                          <div className="font-medium">{player.fullName}</div>
                          <div className="text-sm text-gray-500 flex items-center">
                            {player.position && <span className="mr-2">{player.position}</span>}
                            {player.jerseyNumber && <span>#{player.jerseyNumber}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic mb-4">No players in starting lineup</p>
                )}
                
                {/* Bench Players List */}
                {lineup.benchPlayers && lineup.benchPlayers.length > 0 && (
                  <>
                    <h4 className="font-medium text-sm mb-2">Bench Players</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {lineup.benchPlayers.map((player) => (
                        <div key={player.id} className="flex items-center p-2 bg-gray-50 border rounded-md">
                          <div className="flex-1 ml-2">
                            <div className="font-medium">{player.fullName}</div>
                            <div className="text-sm text-gray-500 flex items-center">
                              {player.position && <span className="mr-2">{player.position}</span>}
                              {player.jerseyNumber && <span>#{player.jerseyNumber}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="text-center p-6 border-dashed border-2 rounded-md">
                <p className="text-gray-500">No lineup has been set for this match.</p>
                <p className="text-sm text-gray-400 mt-1">Add a lineup to track player positions.</p>
              </div>
            )}
          </TabsContent>

          {/* Substitutions Tab */}
          <TabsContent value="substitutions" className="py-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Substitutions</h3>
              <Dialog open={substitutionDialogOpen} onOpenChange={setSubstitutionDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Substitution
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Record Substitution</DialogTitle>
                  </DialogHeader>
                  <Form {...substitutionForm}>
                    <form onSubmit={substitutionForm.handleSubmit(handleSubstitutionSubmit)} className="space-y-4">
                      <FormField
                        control={substitutionForm.control}
                        name="playerInId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Player In</FormLabel>
                            <FormControl>
                              <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={field.value || ""}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              >
                                <option value="">Select player coming in</option>
                                {teamMembers?.filter(member => member.role === "player").map((member) => (
                                  <option key={member.userId} value={member.userId}>
                                    {member.user.fullName} 
                                    {member.user.jerseyNumber ? ` (#${member.user.jerseyNumber})` : ""}
                                  </option>
                                ))}
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={substitutionForm.control}
                        name="playerOutId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Player Out</FormLabel>
                            <FormControl>
                              <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={field.value || ""}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              >
                                <option value="">Select player going out</option>
                                {teamMembers?.filter(member => member.role === "player").map((member) => (
                                  <option key={member.userId} value={member.userId}>
                                    {member.user.fullName}
                                    {member.user.jerseyNumber ? ` (#${member.user.jerseyNumber})` : ""}
                                  </option>
                                ))}
                              </select>
                            </FormControl>
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
                                min="1" 
                                max="120"
                                placeholder="When the substitution happened" 
                                {...field}
                                value={field.value || ""}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={substitutionForm.control}
                        name="reason"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Reason (Optional)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g. Tactical, Injury, etc."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex justify-end gap-2">
                        <DialogClose asChild>
                          <Button type="button" variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={addSubstitution.isPending}>
                          {addSubstitution.isPending && <span className="mr-2 animate-spin">⟳</span>}
                          Record Substitution
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
            
            {substitutions && substitutions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Min</TableHead>
                    <TableHead>Player In</TableHead>
                    <TableHead>Player Out</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {substitutions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">{sub.minute}'</TableCell>
                      <TableCell>
                        {sub.playerIn.fullName}
                        {sub.playerIn.jerseyNumber && <span className="text-gray-500 ml-1">#{sub.playerIn.jerseyNumber}</span>}
                      </TableCell>
                      <TableCell>
                        {sub.playerOut.fullName}
                        {sub.playerOut.jerseyNumber && <span className="text-gray-500 ml-1">#{sub.playerOut.jerseyNumber}</span>}
                      </TableCell>
                      <TableCell>{sub.reason || "-"}</TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => deleteSubstitution.mutate(sub.id)}
                          disabled={deleteSubstitution.isPending}
                        >
                          <Trash className="h-4 w-4 text-gray-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center p-6 border-dashed border-2 rounded-md">
                <p className="text-gray-500">No substitutions recorded for this match.</p>
                <p className="text-sm text-gray-400 mt-1">Record player substitutions to track changes during the match.</p>
              </div>
            )}
          </TabsContent>

          {/* Goals Tab */}
          <TabsContent value="goals" className="py-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Goals</h3>
              <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Goal
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Record Goal</DialogTitle>
                  </DialogHeader>
                  <Form {...goalForm}>
                    <form onSubmit={goalForm.handleSubmit(handleGoalSubmit)} className="space-y-4">
                      <FormField
                        control={goalForm.control}
                        name="scorerId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Scorer</FormLabel>
                            <FormControl>
                              <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={field.value || ""}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              >
                                <option value="">Select goal scorer</option>
                                {teamMembers?.filter(member => member.role === "player").map((member) => (
                                  <option key={member.userId} value={member.userId}>
                                    {member.user.fullName}
                                    {member.user.jerseyNumber ? ` (#${member.user.jerseyNumber})` : ""}
                                  </option>
                                ))}
                              </select>
                            </FormControl>
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
                            <FormControl>
                              <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={field.value || ""}
                                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                              >
                                <option value="">No assist / Not applicable</option>
                                {teamMembers?.filter(member => member.role === "player").map((member) => (
                                  <option key={member.userId} value={member.userId}>
                                    {member.user.fullName}
                                    {member.user.jerseyNumber ? ` (#${member.user.jerseyNumber})` : ""}
                                  </option>
                                ))}
                              </select>
                            </FormControl>
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
                                min="1" 
                                max="120"
                                placeholder="When the goal was scored" 
                                {...field}
                                value={field.value || ""}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={goalForm.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Goal Type</FormLabel>
                            <FormControl>
                              <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={field.value || ""}
                                onChange={(e) => field.onChange(e.target.value as any)}
                              >
                                <option value="">Select goal type</option>
                                <option value="regular">Regular</option>
                                <option value="penalty">Penalty</option>
                                <option value="free_kick">Free Kick</option>
                                <option value="own_goal">Own Goal</option>
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={goalForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description (Optional)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Brief description of the goal"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex justify-end gap-2">
                        <DialogClose asChild>
                          <Button type="button" variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={addGoal.isPending}>
                          {addGoal.isPending && <span className="mr-2 animate-spin">⟳</span>}
                          Record Goal
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
            
            {goals && goals.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Min</TableHead>
                    <TableHead>Scorer</TableHead>
                    <TableHead>Assist</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {goals.map((goal) => (
                    <TableRow key={goal.id}>
                      <TableCell className="font-medium">{goal.minute}'</TableCell>
                      <TableCell>
                        {goal.scorer.fullName}
                        {goal.scorer.jerseyNumber && <span className="text-gray-500 ml-1">#{goal.scorer.jerseyNumber}</span>}
                      </TableCell>
                      <TableCell>
                        {goal.assistPlayer ? (
                          <>
                            {goal.assistPlayer.fullName}
                            {goal.assistPlayer.jerseyNumber && <span className="text-gray-500 ml-1">#{goal.assistPlayer.jerseyNumber}</span>}
                          </>
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        {goal.type === "regular" ? "Regular" : 
                         goal.type === "penalty" ? "Penalty" : 
                         goal.type === "free_kick" ? "Free Kick" : 
                         goal.type === "own_goal" ? "Own Goal" : 
                         "Unknown"}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => deleteGoal.mutate(goal.id)}
                          disabled={deleteGoal.isPending}
                        >
                          <Trash className="h-4 w-4 text-gray-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center p-6 border-dashed border-2 rounded-md">
                <p className="text-gray-500">No goals recorded for this match.</p>
                <p className="text-sm text-gray-400 mt-1">Add details of each goal scored by your team.</p>
              </div>
            )}
          </TabsContent>

          {/* Cards Tab */}
          <TabsContent value="cards" className="py-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Cards</h3>
              <Dialog open={cardDialogOpen} onOpenChange={setCardDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Card
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Record Card</DialogTitle>
                  </DialogHeader>
                  <Form {...cardForm}>
                    <form onSubmit={cardForm.handleSubmit(handleCardSubmit)} className="space-y-4">
                      <FormField
                        control={cardForm.control}
                        name="playerId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Player</FormLabel>
                            <FormControl>
                              <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={field.value || ""}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              >
                                <option value="">Select player</option>
                                {teamMembers?.filter(member => member.role === "player").map((member) => (
                                  <option key={member.userId} value={member.userId}>
                                    {member.user.fullName}
                                    {member.user.jerseyNumber ? ` (#${member.user.jerseyNumber})` : ""}
                                  </option>
                                ))}
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={cardForm.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Card Type</FormLabel>
                            <FormControl>
                              <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={field.value || ""}
                                onChange={(e) => field.onChange(e.target.value as any)}
                              >
                                <option value="">Select card type</option>
                                <option value="yellow">Yellow Card</option>
                                <option value="red">Red Card</option>
                              </select>
                            </FormControl>
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
                                min="1" 
                                max="120"
                                placeholder="When the card was shown" 
                                {...field}
                                value={field.value || ""}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={cardForm.control}
                        name="reason"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Reason (Optional)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Reason for the card"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex justify-end gap-2">
                        <DialogClose asChild>
                          <Button type="button" variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={addCard.isPending}>
                          {addCard.isPending && <span className="mr-2 animate-spin">⟳</span>}
                          Record Card
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
            
            {cards && cards.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Min</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cards.map((card) => (
                    <TableRow key={card.id}>
                      <TableCell className="font-medium">{card.minute}'</TableCell>
                      <TableCell>
                        {card.player.fullName}
                        {card.player.jerseyNumber && <span className="text-gray-500 ml-1">#{card.player.jerseyNumber}</span>}
                      </TableCell>
                      <TableCell>
                        <Badge className={card.type === "yellow" ? "bg-yellow-500 text-white" : "bg-red-600 text-white"}>
                          {card.type === "yellow" ? "Yellow" : "Red"}
                        </Badge>
                      </TableCell>
                      <TableCell>{card.reason || "-"}</TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => deleteCard.mutate(card.id)}
                          disabled={deleteCard.isPending}
                        >
                          <Trash className="h-4 w-4 text-gray-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center p-6 border-dashed border-2 rounded-md">
                <p className="text-gray-500">No cards recorded for this match.</p>
                <p className="text-sm text-gray-400 mt-1">Record yellow and red cards received by your team.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}