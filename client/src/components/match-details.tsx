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
  
  // Function to handle opening the lineup dialog and initialize form with existing data
  const handleOpenLineupDialog = () => {
    if (lineup) {
      // Reset positions state
      setLineupPositions({});
      
      // Initialize form with existing lineup data
      lineupForm.setValue('formation', lineup.formation || '4-4-2');
      lineupForm.setValue('playerIds', lineup.players.map(player => player.id));
      lineupForm.setValue('benchPlayerIds', lineup.benchPlayers?.map(player => player.id) || []);
      
      // Populate positions with players
      if (lineup.players.length > 0 && lineup.formation) {
        const positions = getPositionsByFormation(lineup.formation);
        
        // Map players to positions
        lineup.players.forEach((player, index) => {
          if (index < positions.length) {
            const position = positions[index];
            const teamMember = teamMembers?.find(m => m.userId === player.id);
            
            if (teamMember) {
              setLineupPositions(prev => ({
                ...prev,
                [position.id]: {
                  ...teamMember,
                  user: player
                }
              }));
            }
          }
        });
      }
    } else {
      // Reset form for new lineup
      lineupForm.reset({
        formation: "4-4-2",
        playerIds: [],
        benchPlayerIds: []
      });
      setLineupPositions({});
    }
    
    setLineupDialogOpen(true);
  };
  
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

  // Handle lineup form submission
  const handleLineupSubmit = async (data: z.infer<typeof lineupSchema>) => {
    try {
      await saveLineup.mutateAsync(data);
    } catch (error) {
      console.error("Failed to save lineup:", error);
    }
  };
  
  // Handle substitution form submission
  const handleSubstitutionSubmit = async (data: z.infer<typeof substitutionSchema>) => {
    try {
      await addSubstitution.mutateAsync(data);
    } catch (error) {
      console.error("Failed to add substitution:", error);
    }
  };
  
  // Handle goal form submission
  const handleGoalSubmit = async (data: z.infer<typeof goalSchema>) => {
    try {
      await addGoal.mutateAsync(data);
    } catch (error) {
      console.error("Failed to add goal:", error);
    }
  };
  
  // Handle card form submission
  const handleCardSubmit = async (data: z.infer<typeof cardSchema>) => {
    try {
      await addCard.mutateAsync(data);
    } catch (error) {
      console.error("Failed to add card:", error);
    }
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

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <CardTitle className="text-xl">{match.opponentTeam}</CardTitle>
            <CardDescription className="text-sm mt-1">
              {format(new Date(match.date), "EEEE, MMMM d, yyyy 'at' h:mm a")}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={match.status === "upcoming" ? "outline" : match.status === "ongoing" ? "secondary" : "default"}>
              {match.status.charAt(0).toUpperCase() + match.status.slice(1)}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Trophy className="h-3.5 w-3.5" />
              Score: {match.homeScore ?? 0} - {match.awayScore ?? 0}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {match.locationType}
            </Badge>
          </div>
        </div>
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
              <h3 className="text-lg font-medium">Match Lineup</h3>
              <Dialog open={lineupDialogOpen} onOpenChange={setLineupDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={handleOpenLineupDialog}>
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
                            <FormControl>
                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2">
                                  <div className="relative bg-gradient-to-b from-green-700 to-green-900 w-full aspect-[4/5] rounded-md flex items-center justify-center overflow-hidden border-4 border-green-900/50">
                                    <div className="absolute top-0 left-0 w-full h-full">
                                      <div className="border-2 border-white border-b-0 mx-4 mt-4 h-full rounded-t-md relative">
                                      {/* Soccer field markings */}
                                      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-40 h-20 border-2 border-t-0 border-white rounded-b-full"></div>
                                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-32 w-64 border-2 border-b-0 border-white"></div>
                                      <div className="absolute top-1/2 left-0 right-0 transform -translate-y-1/2 h-0.5 bg-white"></div>
                                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border-2 border-white"></div>
                                      </div>
                                    </div>
                                    
                                    {/* Players positioned on field */}
                                    {lineupForm.watch('formation') && (
                                      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                                        {getPositionsByFormation(lineupForm.watch('formation')).map((position) => (
                                          <div
                                            key={position.id}
                                            className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                                            style={{ top: `${position.top}%`, left: `${position.left}%` }}
                                          >
                                            {lineupPositions[position.id] ? (
                                              <div
                                                className="relative group cursor-pointer"
                                                onClick={() => removePlayerFromPosition(position.id)}
                                              >
                                                <div 
                                                  className={`h-10 w-10 rounded-full flex items-center justify-center text-xs font-medium text-white border-2 border-white relative ${
                                                    position.label === "GK" ? "bg-yellow-600" :
                                                    position.label === "DEF" ? "bg-blue-600" :
                                                    position.label === "MID" ? "bg-green-600" :
                                                    "bg-red-600"
                                                  }`}
                                                >
                                                  <span className="text-[10px]">
                                                    {lineupPositions[position.id]?.user?.jerseyNumber || "?"}
                                                  </span>
                                                </div>
                                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 whitespace-nowrap px-2 py-1 bg-black/75 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                  {lineupPositions[position.id]?.user?.fullName}
                                                  <span className="block text-[10px] opacity-75">Click to remove</span>
                                                </div>
                                              </div>
                                            ) : (
                                              <div
                                                className={`h-10 w-10 rounded-full flex items-center justify-center text-xs font-medium text-white/50 border-2 border-white/50 cursor-pointer ${
                                                  position.label === "GK" ? "bg-yellow-600/30" :
                                                  position.label === "DEF" ? "bg-blue-600/30" :
                                                  position.label === "MID" ? "bg-green-600/30" :
                                                  "bg-red-600/30"
                                                }`}
                                                onClick={() => handlePositionClick(position.id)}
                                              >
                                                <span>{position.label}</span>
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    
                                    {/* Player selection modal */}
                                    {selectedPosition && (
                                      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedPosition(null)}>
                                        <div className="bg-card p-4 rounded-md max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                                          <h3 className="text-lg font-medium mb-4">Select Player for Position</h3>
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {teamMembers?.filter(member => 
                                              member.role === "player" && 
                                              !Object.values(lineupPositions).some(p => p?.id === member.id)
                                            ).map(member => (
                                              <div 
                                                key={member.id}
                                                className="flex items-center p-2 border rounded-md cursor-pointer hover:bg-muted"
                                                onClick={() => addPlayerToPosition(member, selectedPosition)}
                                              >
                                                <div className="mr-2 h-8 w-8 rounded-full flex items-center justify-center bg-primary text-white text-xs">
                                                  {member.user.jerseyNumber || "?"}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                  <div className="font-medium truncate">{member.user.fullName}</div>
                                                  <div className="text-xs text-muted-foreground">
                                                    {member.user.position || "No position"}
                                                  </div>
                                                </div>
                                              </div>
                                            ))}
                                            
                                            {teamMembers?.filter(member => 
                                              member.role === "player" && 
                                              !Object.values(lineupPositions).some(p => p?.id === member.id)
                                            ).length === 0 && (
                                              <div className="col-span-2 text-center py-4">
                                                <p className="text-muted-foreground">No more players available</p>
                                                <p className="text-xs">All players are already assigned or there are no players in the team.</p>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                <div>
                                  <h5 className="font-medium text-sm mb-2">Players for Selection</h5>
                                  <div className="bg-muted/30 rounded-md p-2 h-[calc(100%-2rem)] min-h-[250px] overflow-y-auto">
                                    <FormField
                                      control={lineupForm.control}
                                      name="benchPlayerIds"
                                      render={({ field }) => (
                                        <FormItem>
                                          <div className="mt-4 bg-muted/30 rounded-md p-2">
                                            <h5 className="text-xs font-medium text-gray-500 mb-2">Click to add to bench:</h5>
                                            {/* Players not in the field lineup or on bench */}
                                            {teamMembers?.filter(member => 
                                              member.role === "player" && 
                                              !Object.values(lineupPositions).some(p => p?.id === member.id) &&
                                              !field.value.includes(member.userId)
                                            ).map(member => (
                                              <div 
                                                key={member.id}
                                                className="flex items-center p-2 border rounded-md cursor-pointer hover:bg-muted mb-1"
                                                onClick={() => addPlayerToBench(member)}
                                              >
                                                <div className="mr-2 h-6 w-6 rounded-full flex items-center justify-center bg-primary text-white text-xs">
                                                  {member.user.jerseyNumber || "?"}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                  <div className="font-medium truncate text-xs">{member.user.fullName}</div>
                                                  <div className="text-[10px] text-muted-foreground">
                                                    {member.user.position || "No position"}
                                                  </div>
                                                </div>
                                                <Button 
                                                  size="sm" 
                                                  variant="secondary" 
                                                  className="h-6 text-xs ml-1"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    addPlayerToBench(member);
                                                  }}
                                                >
                                                  Add
                                                </Button>
                                              </div>
                                            ))}
                                            
                                            {/* Selected bench players */}
                                            {field.value.length > 0 && (
                                              <div className="mt-4">
                                                <h5 className="text-xs font-medium text-gray-500 mb-2">Selected Bench Players:</h5>
                                                <div className="space-y-1 mt-2">
                                                  {field.value.map((playerId) => {
                                                    const member = teamMembers?.find(m => m.userId === playerId);
                                                    return member ? (
                                                      <div 
                                                        key={member.id} 
                                                        className="flex items-center p-2 border rounded-md bg-muted/50"
                                                      >
                                                        <div className="mr-2 h-6 w-6 rounded-full flex items-center justify-center bg-secondary text-secondary-foreground text-xs">
                                                          {member.user.jerseyNumber || "?"}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                          <div className="font-medium truncate text-xs">{member.user.fullName}</div>
                                                          <div className="text-[10px] text-muted-foreground">
                                                            {member.user.position || "No position"}
                                                          </div>
                                                        </div>
                                                        <Button 
                                                          size="sm" 
                                                          variant="ghost" 
                                                          className="h-6 w-6 p-0 text-destructive"
                                                          onClick={() => removePlayerFromBench(member.userId)}
                                                        >
                                                          <X className="h-3 w-3" />
                                                        </Button>
                                                      </div>
                                                    ) : null;
                                                  })}
                                                </div>
                                              </div>
                                            )}
                                            
                                            {/* Empty state for players */}
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
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                </div>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex justify-end space-x-2 pt-4">
                        <DialogClose asChild>
                          <Button variant="outline" type="button">Cancel</Button>
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
                {/* Field and Players Content */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  {/* Field Visualization - Smaller */}
                  <div className="md:col-span-1">
                    <h4 className="font-medium text-sm mb-2">Formation: {lineup.formation}</h4>
                    <div className="relative bg-gradient-to-b from-green-700 to-green-900 w-full aspect-[4/5] mx-auto rounded-md flex items-center justify-center overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-full">
                        <div className="border-2 border-white border-b-0 mx-4 mt-4 h-full rounded-t-md relative">
                        {/* Soccer field markings */}
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-40 h-20 border-2 border-t-0 border-white rounded-b-full"></div>
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-32 w-64 border-2 border-b-0 border-white"></div>
                        <div className="absolute top-1/2 left-0 right-0 transform -translate-y-1/2 h-0.5 bg-white"></div>
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border-2 border-white"></div>
                        </div>
                      </div>
                      
                      {/* Players positioned on field */}
                      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                        {getPositionsByFormation(lineup.formation).map((position, index) => {
                          const player = index < lineup.players.length ? lineup.players[index] : null;
                          
                          if (!player) return null;
                          
                          return (
                            <div
                              key={position.id}
                              className="absolute transform -translate-x-1/2 -translate-y-1/2"
                              style={{ top: `${position.top}%`, left: `${position.left}%` }}
                            >
                              <div className="relative group">
                                <div 
                                  className={`h-10 w-10 rounded-full flex items-center justify-center text-xs font-medium text-white border-2 border-white ${
                                    position.label === "GK" ? "bg-yellow-600" :
                                    position.label === "DEF" ? "bg-blue-600" :
                                    position.label === "MID" ? "bg-green-600" :
                                    "bg-red-600"
                                  }`}
                                >
                                  <span className="text-[10px]">{player.jerseyNumber || "?"}</span>
                                </div>
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 whitespace-nowrap px-2 py-1 bg-black/75 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                  {player.fullName}
                                  <span className="block text-[10px] opacity-75">{player.position || "No position"}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  
                  {/* Starting Players */}
                  <div className="md:col-span-1">
                    <h4 className="font-medium text-sm mb-2">Starting Players</h4>
                    <ul className="space-y-2 max-h-[300px] overflow-y-auto bg-muted/20 p-2 rounded-md">
                      {lineup.players.map((player) => (
                        <li key={player.id} className="flex items-center p-2 bg-card rounded-md border">
                          <div className="mr-3 h-8 w-8 rounded-full flex items-center justify-center bg-primary/80 text-primary-foreground text-xs">
                            {player.jerseyNumber || "?"}
                          </div>
                          <div>
                            <div className="font-medium">{player.fullName}</div>
                            <div className="text-xs text-muted-foreground">
                              {player.position || "No position"}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {/* Bench Players */}
                  <div className="md:col-span-1">
                    <h4 className="font-medium text-sm mb-2">Bench Players</h4>
                    <ul className="space-y-2 max-h-[300px] overflow-y-auto bg-muted/20 p-2 rounded-md">
                      {lineup.benchPlayers && lineup.benchPlayers.length > 0 ? (
                        lineup.benchPlayers.map((player) => (
                          <li key={player.id} className="flex items-center p-2 bg-card rounded-md border">
                            <div className="mr-3 h-8 w-8 rounded-full flex items-center justify-center bg-secondary/80 text-secondary-foreground text-xs">
                              {player.jerseyNumber || "?"}
                            </div>
                            <div>
                              <div className="font-medium">{player.fullName}</div>
                              <div className="text-xs text-muted-foreground">
                                {player.position || "No position"}
                              </div>
                            </div>
                          </li>
                        ))
                      ) : (
                        <div className="text-center py-4 text-muted-foreground">
                          <p>No bench players assigned</p>
                        </div>
                      )}
                    </ul>
                  </div>
                </div>
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
                        name="playerOutId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Player Out</FormLabel>
                            <FormControl>
                              <Select
                                onValueChange={(value) => field.onChange(parseInt(value))}
                                defaultValue={field.value?.toString()}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select player going out" />
                                </SelectTrigger>
                                <SelectContent>
                                  {teamMembers?.filter(member => member.role === "player").map((member) => (
                                    <SelectItem key={member.user.id} value={member.user.id.toString()}>
                                      {member.user.fullName} {member.user.jerseyNumber ? `(#${member.user.jerseyNumber})` : ""}
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
                        control={substitutionForm.control}
                        name="playerInId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Player In</FormLabel>
                            <FormControl>
                              <Select
                                onValueChange={(value) => field.onChange(parseInt(value))}
                                defaultValue={field.value?.toString()}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select player coming in" />
                                </SelectTrigger>
                                <SelectContent>
                                  {teamMembers?.filter(member => 
                                    member.role === "player" && 
                                    member.user.id !== substitutionForm.watch("playerOutId")
                                  ).map((member) => (
                                    <SelectItem key={member.user.id} value={member.user.id.toString()}>
                                      {member.user.fullName} {member.user.jerseyNumber ? `(#${member.user.jerseyNumber})` : ""}
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
                                placeholder="When the substitution occurred" 
                                {...field}
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
                              <Input placeholder="Reason for the substitution" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end space-x-2 pt-4">
                        <DialogClose asChild>
                          <Button variant="outline" type="button">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={addSubstitution.isPending}>
                          {addSubstitution.isPending && <span className="mr-2 animate-spin">⟳</span>}
                          Save Substitution
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
            
            {substitutions && substitutions.length > 0 ? (
              <div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Minute</TableHead>
                      <TableHead>Out</TableHead>
                      <TableHead>In</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {substitutions.map((substitution) => (
                      <TableRow key={substitution.id}>
                        <TableCell>{substitution.minute}'</TableCell>
                        <TableCell className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full flex items-center justify-center bg-secondary/80 text-secondary-foreground text-xs">
                            {substitution.playerOut.jerseyNumber || "?"}
                          </div>
                          <span>{substitution.playerOut.fullName}</span>
                        </TableCell>
                        <TableCell className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full flex items-center justify-center bg-primary/80 text-primary-foreground text-xs">
                            {substitution.playerIn.jerseyNumber || "?"}
                          </div>
                          <span>{substitution.playerIn.fullName}</span>
                        </TableCell>
                        <TableCell>{substitution.reason || "-"}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive"
                            onClick={() => deleteSubstitution.mutate(substitution.id)}
                            disabled={deleteSubstitution.isPending}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center p-6 border-dashed border-2 rounded-md">
                <p className="text-gray-500">No substitutions have been recorded for this match.</p>
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
                              <Select
                                onValueChange={(value) => field.onChange(parseInt(value))}
                                defaultValue={field.value?.toString()}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select goal scorer" />
                                </SelectTrigger>
                                <SelectContent>
                                  {teamMembers?.filter(member => member.role === "player").map((member) => (
                                    <SelectItem key={member.user.id} value={member.user.id.toString()}>
                                      {member.user.fullName} {member.user.jerseyNumber ? `(#${member.user.jerseyNumber})` : ""}
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
                        control={goalForm.control}
                        name="assistId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Assist (Optional)</FormLabel>
                            <FormControl>
                              <Select
                                onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                                defaultValue={field.value?.toString()}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select player who assisted" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">No assist</SelectItem>
                                  {teamMembers?.filter(member => 
                                    member.role === "player" && 
                                    member.user.id !== goalForm.watch("scorerId")
                                  ).map((member) => (
                                    <SelectItem key={member.user.id} value={member.user.id.toString()}>
                                      {member.user.fullName} {member.user.jerseyNumber ? `(#${member.user.jerseyNumber})` : ""}
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
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select goal type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="regular">Regular play</SelectItem>
                                  <SelectItem value="penalty">Penalty kick</SelectItem>
                                  <SelectItem value="free_kick">Free kick</SelectItem>
                                  <SelectItem value="own_goal">Own goal</SelectItem>
                                </SelectContent>
                              </Select>
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
                              <Input placeholder="Brief description of the goal" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end space-x-2 pt-4">
                        <DialogClose asChild>
                          <Button variant="outline" type="button">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={addGoal.isPending}>
                          {addGoal.isPending && <span className="mr-2 animate-spin">⟳</span>}
                          Save Goal
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
            
            {goals && goals.length > 0 ? (
              <div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Minute</TableHead>
                      <TableHead>Scorer</TableHead>
                      <TableHead>Assist</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {goals.map((goal) => (
                      <TableRow key={goal.id}>
                        <TableCell>{goal.minute}'</TableCell>
                        <TableCell className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full flex items-center justify-center bg-primary/80 text-primary-foreground text-xs">
                            {goal.scorer.jerseyNumber || "?"}
                          </div>
                          <span>{goal.scorer.fullName}</span>
                        </TableCell>
                        <TableCell>
                          {goal.assistPlayer ? (
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full flex items-center justify-center bg-secondary/80 text-secondary-foreground text-xs">
                                {goal.assistPlayer.jerseyNumber || "?"}
                              </div>
                              <span>{goal.assistPlayer.fullName}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {goal.type === "regular" ? "Regular play" :
                             goal.type === "penalty" ? "Penalty kick" :
                             goal.type === "free_kick" ? "Free kick" :
                             "Own goal"}
                          </Badge>
                        </TableCell>
                        <TableCell>{goal.description || "-"}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive"
                            onClick={() => deleteGoal.mutate(goal.id)}
                            disabled={deleteGoal.isPending}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center p-6 border-dashed border-2 rounded-md">
                <p className="text-gray-500">No goals have been recorded for this match.</p>
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
                              <Select
                                onValueChange={(value) => field.onChange(parseInt(value))}
                                defaultValue={field.value?.toString()}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select player who received card" />
                                </SelectTrigger>
                                <SelectContent>
                                  {teamMembers?.filter(member => member.role === "player").map((member) => (
                                    <SelectItem key={member.user.id} value={member.user.id.toString()}>
                                      {member.user.fullName} {member.user.jerseyNumber ? `(#${member.user.jerseyNumber})` : ""}
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
                        control={cardForm.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Card Type</FormLabel>
                            <FormControl>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select card type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="yellow">Yellow card</SelectItem>
                                  <SelectItem value="red">Red card</SelectItem>
                                </SelectContent>
                              </Select>
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
                              <Input placeholder="Reason for the card" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end space-x-2 pt-4">
                        <DialogClose asChild>
                          <Button variant="outline" type="button">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={addCard.isPending}>
                          {addCard.isPending && <span className="mr-2 animate-spin">⟳</span>}
                          Save Card
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
            
            {cards && cards.length > 0 ? (
              <div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Minute</TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead>Card</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cards.map((card) => (
                      <TableRow key={card.id}>
                        <TableCell>{card.minute}'</TableCell>
                        <TableCell className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full flex items-center justify-center bg-primary/80 text-primary-foreground text-xs">
                            {card.player.jerseyNumber || "?"}
                          </div>
                          <span>{card.player.fullName}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={card.type === "yellow" ? "warning" : "destructive"}>
                            {card.type === "yellow" ? "Yellow" : "Red"}
                          </Badge>
                        </TableCell>
                        <TableCell>{card.reason || "-"}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive"
                            onClick={() => deleteCard.mutate(card.id)}
                            disabled={deleteCard.isPending}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center p-6 border-dashed border-2 rounded-md">
                <p className="text-gray-500">No cards have been recorded for this match.</p>
                <p className="text-sm text-gray-400 mt-1">Record any yellow or red cards received by your team.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-4">
        <div className="text-sm text-muted-foreground">
          {match.location ? (
            <>
              <span className="font-medium">Location:</span> {match.location}
            </>
          ) : (
            <span>No location specified</span>
          )}
        </div>
        <div className="text-sm">
          <span className="font-medium">Last updated:</span> {format(new Date(match.updatedAt || match.date), "MMM d, yyyy")}
        </div>
      </CardFooter>
    </Card>
  );
}