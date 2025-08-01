import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Match,
  MatchLineup,
  MatchSubstitution,
  MatchGoal,
  MatchCard,
  TeamMember,
  User,
  Team
} from "@shared/schema";
import { useLanguage } from "@/hooks/use-language";
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
  DialogClose,
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
  Camera,
  Clipboard,
  Plus,
  X,
  Edit,
  Trash
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { es } from 'date-fns/locale';

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
  type: z.string({
    required_error: "Card type is required"
  }),
  reason: z.string().optional()
});

interface MatchDetailsProps {
  match: Match;
  teamId: number;
  onUpdate: () => void;
}

interface TeamMemberWithUser extends TeamMember {
  user?: User;
}

export default function MatchDetails({ match, teamId, onUpdate }: MatchDetailsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t, currentLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState("lineup");

  // Dialogs state
  const [lineupDialogOpen, setLineupDialogOpen] = useState(false);
  const [substitutionDialogOpen, setSubstitutionDialogOpen] = useState(false);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [showAddToLineupDialog, setShowAddToLineupDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Function to handle opening the lineup dialog and initialize form with existing data
  const handleOpenLineupDialog = () => {
    // Always start with clean positions
    setLineupPositions({});

    if (lineup) {
      // Initialize form with existing lineup data
      lineupForm.setValue('formation', lineup.formation || '4-4-2');

      // Set player IDs and bench player IDs from existing lineup
      const existingPlayerIds = lineup.players.map(player => player.id);
      lineupForm.setValue('playerIds', existingPlayerIds);

      const existingBenchPlayerIds = lineup.benchPlayers?.map(player => player.id) || [];
      lineupForm.setValue('benchPlayerIds', existingBenchPlayerIds);

      // Populate positions with players based on position mapping
      if (lineup.formation) {
        const formationStr = typeof lineup.formation === 'string' ? lineup.formation : "4-4-2";

        // If we have a position mapping, use it
        if (lineup.positionMapping && typeof lineup.positionMapping === 'object') {
          // Safely type the position mapping as a Record<string, number>
          const typedPositionMapping = lineup.positionMapping as Record<string, number>;

          // For each position that has a player assigned
          Object.entries(typedPositionMapping).forEach(([positionId, playerId]) => {
            if (typeof playerId === 'number') {
              // Find the team member by userId or member id
              const teamMember = teamMembers?.find(m => m.userId === playerId || m.id === playerId);

              if (teamMember) {
                // Set this position with the team member
                setLineupPositions(prev => ({
                  ...prev,
                  [positionId]: teamMember
                }));
              }
            }
          });
        } 
        // If no position mapping exists or as a fallback, clear positions
        else {
          console.log("No position mapping found, starting fresh");
          // We won't try to guess positions - better to start fresh than to be wrong
        }
      }
    } else {
      // Reset form for new lineup with formation based on team type
      const defaultFormation = teamData?.teamType === "7-a-side" 
        ? "7a-2-3-1" 
        : teamData?.teamType === "Futsal"
          ? "5a-1-2-1"
          : "4-4-2";

      // Only reset formation, let the useEffect handle playerIds
      lineupForm.setValue('formation', defaultFormation);
      setLineupPositions({});
    }

    setLineupDialogOpen(true);
  };

  // Forms
  // Function to get available formations based on team type
  const getAvailableFormations = (teamType: string | undefined | null) => {
    switch (teamType) {
      case "7-a-side":
        return [
          // 7-a-side formations
          "7a-2-3-1",
          "7a-3-2-1",
          "7a-2-2-2",
          "7a-3-1-2",
          "7a-3-3-0",
        ];
      case "Futsal":
        return [
          // Futsal/5-a-side formations
          "5a-1-2-1",
          "5a-2-1-1",
          "5a-1-1-2",
          "5a-2-2-0",
          "5a-1-3-0",
        ];
      case "11-a-side":
      default:
        return [
          // 11-a-side formations
          "4-3-3",
          "4-4-2",
          "3-5-2",
          "3-4-3",
          "5-3-2",
        ];
    }
  };

  // Get the team data to determine team type
  const { data: teamData } = useQuery<Team>({
    queryKey: [`/api/teams/${teamId}`],
  });

  // Available formations based on team type
  const availableFormations = getAvailableFormations(teamData?.teamType);

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

    // Check formation type by prefix
    const isSevenASide = formation.startsWith("7a-");
    const isFutsalOrFiveASide = formation.startsWith("5a-");

    if (isSevenASide) {
      // 7-a-side formations
      // Extract pattern after the "7a-" prefix
      const pattern = formation.substring(3);
      const [defenders, midfielders, forwards] = pattern.split("-").map(Number);

      // Add goalkeeper
      positions.push({ id: "gk", label: t("team.gk"), top: 82, left: 50 });

      // Add defenders - wider spacing for fewer players
      const defenderWidth = 90 / (defenders + 1);
      for (let i = 1; i <= defenders; i++) {
        positions.push({
          id: `def-${i}`,
          label: t("team.def"),
          top: 60,
          left: 5 + i * defenderWidth,
        });
      }

      // Add midfielders - wider spacing for fewer players
      const midfielderWidth = 90 / (midfielders + 1);
      for (let i = 1; i <= midfielders; i++) {
        positions.push({
          id: `mid-${i}`,
          label: t("team.mid"),
          top: 35,
          left: 5 + i * midfielderWidth,
        });
      }

      // Add forwards - wider spacing for fewer players
      const forwardWidth = 90 / (forwards + 1);
      for (let i = 1; i <= forwards; i++) {
        positions.push({
          id: `fwd-${i}`,
          label: t("team.fw"),
          top: 10,
          left: 5 + i * forwardWidth,
        });
      }
    } else if (isFutsalOrFiveASide) {
      // 5-a-side/Futsal formations
      // Extract pattern after the "5a-" prefix
      const pattern = formation.substring(3);
      const [defenders, midfielders, forwards] = pattern.split("-").map(Number);

      // Add goalkeeper
      positions.push({ id: "gk", label: t("team.gk"), top: 82, left: 50 });

      // Add defenders - wider spacing for even fewer players
      const defenderWidth = 90 / (defenders + 1);
      for (let i = 1; i <= defenders; i++) {
        positions.push({
          id: `def-${i}`,
          label: t("team.def"),
          top: 60,
          left: 5 + i * defenderWidth,
        });
      }

      // Add midfielders - wider spacing for even fewer players
      const midfielderWidth = 90 / (midfielders + 1);
      for (let i = 1; i <= midfielders; i++) {
        positions.push({
          id: `mid-${i}`,
          label: t("team.mid"),
          top: 35,
          left: 5 + i * midfielderWidth,
        });
      }

      // Add forwards - wider spacing for even fewer players
      const forwardWidth = 90 / (forwards + 1);
      for (let i = 1; i <= forwards; i++) {
        positions.push({
          id: `fwd-${i}`,
          label: t("team.fw"),
          top: 10,
          left: 5 + i * forwardWidth,
        });
      }
    } else {
      // 11-a-side formations (original logic)
      const [defenders, midfielders, forwards] = formation.split("-").map(Number);
      positions.push({ id: "gk", label: t("team.gk"), top: 82, left: 50 });
      const defenderWidth = 90 / (defenders + 1);
      for (let i = 1; i <= defenders; i++) {
        positions.push({
          id: `def-${i}`,
          label: t("team.def"),
          top: 60,
          left: 5 + i * defenderWidth,
        });
      }
      const midfielderWidth = 80 / (midfielders + 1);
      for (let i = 1; i <= midfielders; i++) {
        positions.push({
          id: `mid-${i}`,
          label: t("team.mid"),
          top: 35,
          left: 10 + i * midfielderWidth,
        });
      }
      const forwardWidth = 80 / (forwards + 1);
      for (let i = 1; i <= forwards; i++) {
        positions.push({
          id: `fwd-${i}`,
          label: t("team.fw"),
          top: 10,
          left: 10 + i * forwardWidth,
        });
      }
    }

    return positions;
  };

  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);

  const handlePositionClick = (positionId: string) => {
    setSelectedPosition(positionId);
    setShowAddToLineupDialog(true);
  };

  const addPlayerToLineup = (member: TeamMemberWithUser) => {
    if (Object.values(lineupPositions).some(p => p?.id === member.id)) {
      toast({
        titleKey: "toasts.playerAlreadyInLineup",
        descriptionKey: "toasts.playerAlreadyAssigned",
        variant: "destructive"
      });
      return;
    }

    if (selectedPosition) {
      setLineupPositions(prev => ({
        ...prev,
        [selectedPosition]: member
      }));

      // Add to form's playerIds if not already included - use userId if available, otherwise use member id
      const currentIds = lineupForm.getValues().playerIds || [];
      const playerId = member.userId || member.id;
      if (playerId && !currentIds.includes(playerId)) {
        lineupForm.setValue('playerIds', [...currentIds, playerId]);
      }

      setShowAddToLineupDialog(false);
      setSelectedPosition(null);

      toast({
        titleKey: "matches.playerAddedToLineup",
        descriptionKey: "matches.playerAssigned"
      });
    }
  };

  const removePlayerFromPosition = (positionId: string) => {
    const player = lineupPositions[positionId];
    if (player) {
      // Remove from form's playerIds - use userId if available, otherwise use member id
      const currentIds = lineupForm.getValues().playerIds || [];
      const playerId = player.userId || player.id;
      if (playerId) {
        lineupForm.setValue('playerIds', currentIds.filter(id => id !== playerId));
      }

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
        titleKey: "toasts.playerAlreadyInLineup",
        descriptionKey: "toasts.removePlayerFirst",
        variant: "destructive"
      });
      return;
    }

    // Check if player is already on the bench
    if (member.userId && currentBenchIds.includes(member.userId)) {
      toast({
        titleKey: "toasts.playerAlreadyOnBench",
        descriptionKey: "toasts.playerAlreadyOnBenchDesc",
        variant: "destructive"
      });
      return;
    }

    if (member.userId) {
      lineupForm.setValue('benchPlayerIds', [...currentBenchIds, member.userId]);
      setBenchPlayers([...benchPlayers, member.userId]);
    }
  };

  // Remove player from bench
  const removePlayerFromBench = (userId: number) => {
    const currentBenchIds = lineupForm.getValues().benchPlayerIds || [];
    lineupForm.setValue('benchPlayerIds', currentBenchIds.filter(id => id !== userId));
    setBenchPlayers(benchPlayers.filter(id => id !== userId));
  };

  // Get default formation based on team type
  const getDefaultFormation = () => {
    if (teamData?.teamType === "7-a-side") {
      return "7a-2-3-1";
    } else if (teamData?.teamType === "Futsal") {
      return "5a-1-2-1";
    } else {
      return "4-4-2";
    }
  };

  const lineupForm = useForm<z.infer<typeof lineupSchema>>({
    resolver: zodResolver(lineupSchema),
    defaultValues: {
      formation: getDefaultFormation(),
      playerIds: [],
      benchPlayerIds: []
    },
    mode: "onChange"
  });

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
      type: "",
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
    queryKey: [`/api/teams/${teamId}/matches/${match.id}/lineup`]
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

  // Update lineup positions when lineup data changes (after save)
  useEffect(() => {
    if (lineup && teamMembers && lineup.positionMapping) {
      // Clear existing positions
      setLineupPositions({});

      // Populate positions from the lineup data
      const typedPositionMapping = lineup.positionMapping as Record<string, number>;
      const playerIds: number[] = [];

      Object.entries(typedPositionMapping).forEach(([positionId, playerId]) => {
        if (typeof playerId === 'number') {
          // Find the team member by userId or member id
          const teamMember = teamMembers?.find(m => m.userId === playerId || m.id === playerId);

          if (teamMember) {
            setLineupPositions(prev => ({
              ...prev,
              [positionId]: teamMember
            }));

            // Add to playerIds array for form validation
            const memberPlayerId = teamMember.userId || teamMember.id;
            if (memberPlayerId && !playerIds.includes(memberPlayerId)) {
              playerIds.push(memberPlayerId);
            }
          }
        }
      });

      // Update form with the loaded player IDs - force update
      setTimeout(() => {
        lineupForm.setValue('playerIds', playerIds, { shouldValidate: true });
        lineupForm.setValue('formation', lineup.formation || '4-4-2');
        lineupForm.setValue('benchPlayerIds', lineup.benchPlayerIds || []);
      }, 0);
    }
  }, [lineup, teamMembers, lineupForm]);

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
        titleKey: "toasts.lineupSaved",
        descriptionKey: "toasts.lineupSavedDesc"
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
  // Convert all lineup positions to playerIds and position mapping
  const handleLineupSubmit = (data: z.infer<typeof lineupSchema>) => {
    console.log("handleLineupSubmit called with data:", data);
    console.log("Current lineupPositions:", lineupPositions);

    // Create a clean position mapping
    const positionMapping: Record<string, number> = {};

    // Only include valid player assignments in the mapping
    // This ensures no position has multiple players and no player is in multiple positions
    Object.entries(lineupPositions).forEach(([positionId, playerInfo]) => {
      if (playerInfo) {
        // Use userId if available, otherwise use member id
        const playerId = playerInfo.userId || playerInfo.id;
        if (playerId) {
          positionMapping[positionId] = playerId;
        }
      }
    });

    // Get unique player IDs from the position mapping
    const playerIds = Array.from(new Set(Object.values(positionMapping)));

    // Get bench player IDs (maintaining any that were already set in the form)
    const benchPlayerIds = Array.isArray(data.benchPlayerIds) ? data.benchPlayerIds : [];

    // Create the complete data object
    const dataWithPositions = {
      ...data,
      playerIds,
      benchPlayerIds,
      positionMapping
    };

    console.log("Saving lineup with position mapping:", positionMapping);
    console.log("Player IDs:", playerIds);
    console.log("Bench players:", benchPlayerIds);
    console.log("Final data to save:", dataWithPositions);

    try {
      saveLineup.mutate(dataWithPositions);
      console.log("saveLineup.mutate called successfully");
    } catch (error) {
      console.error("Error calling saveLineup.mutate:", error);
    }
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
          <span>{t("matches.matchDetails")}</span>
          <Badge className="bg-green-500 text-lg px-3 py-1">{match.goalsScored} - {match.goalsConceded}</Badge>
        </CardTitle>
        <CardDescription>
          {format(new Date(match.matchDate), t("matches.dateTimeFormat"), {
            locale: currentLanguage === "es" ? es : undefined
          })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 min-h-[45px]">
            <TabsTrigger value="lineup">
              {t("matches.lineups")}
            </TabsTrigger>
            <TabsTrigger value="substitutions">
              {t("matches.substitutions")}
            </TabsTrigger>
            <TabsTrigger value="goals">
              {t("matches.goals")}
            </TabsTrigger>
            <TabsTrigger value="cards">
              {t("matches.cards")}
            </TabsTrigger>
          </TabsList>

          {/* Lineup Tab */}
          <TabsContent value="lineup" className="py-6">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-lg font-medium">{t("matches.startingLineup")}</h3>

              {/* Add Player to Lineup Dialog */}
              <Dialog
                open={showAddToLineupDialog}
                onOpenChange={setShowAddToLineupDialog}
              >
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>{t("team.addPlayerToLineup")}</DialogTitle>
                    <DialogDescription>
                      {t("team.selectPlayerForPosition")}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="max-h-80 overflow-y-auto py-4">
                    <div className="space-y-2">
                      <div className="mb-4">
                        <Input
                          placeholder={t("team.searchPlayers")}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          value={searchQuery}
                          className="mb-2"
                          autoFocus={false}
                        />
                      </div>
                      {teamMembers
                        ?.filter(
                          (m) =>
                            m.role === "player" &&
                            !Object.values(lineupPositions).some(p => p?.id === m.id) &&
                            (m.user?.fullName
                              ?.toLowerCase()
                              .includes(searchQuery.toLowerCase()) ||
                              m.user?.position
                                ?.toLowerCase()
                                .includes(searchQuery.toLowerCase()) ||
                              m.fullName
                                ?.toLowerCase()
                                .includes(searchQuery.toLowerCase()) ||
                              !searchQuery),
                        )
                        .map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center p-2 rounded-md hover:bg-gray-100 cursor-pointer"
                            onClick={() => addPlayerToLineup(member)}
                          >
                            <div className="flex-1">
                              <div className="font-medium">{member.user?.fullName || member.fullName}</div>
                              <div className="text-sm text-gray-500 flex items-center">
                                {(member.user?.position || member.position) && (
                                  <span className="mr-2">{member.user?.position || member.position}</span>
                                )}
                                {(member.user?.jerseyNumber || member.jerseyNumber) && (
                                  <span className="text-xs px-1.5 py-0.5 bg-gray-200 rounded">
                                    #{member.user?.jerseyNumber || member.jerseyNumber}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      {teamMembers?.filter(
                        (m) =>
                          m.role === "player" &&
                          !Object.values(lineupPositions).some(
                            (p) => p?.id === m.id,
                          ),
                      ).length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>{t("team.allPlayersInLineup")}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowAddToLineupDialog(false)}
                    >
                      {t("common.cancel")}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={lineupDialogOpen} onOpenChange={setLineupDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={handleOpenLineupDialog}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-6xl w-[90vw] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{lineup ? t("matches.editMatchLineup") : t("matches.addMatchLineup")}</DialogTitle>
                    <DialogDescription>
                      {t("matches.matchDetailsDescription")}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...lineupForm}>
                    <form onSubmit={lineupForm.handleSubmit(handleLineupSubmit)} className="space-y-4">


                      <FormField
                        control={lineupForm.control}
                        name="formation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("team.formation")}</FormLabel>
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
                                  <SelectValue placeholder={t("team.selectFormation")} />
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
                            <FormLabel>{t("team.teamLineup")}</FormLabel>
                            <FormMessage />

                            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mt-2">
                              {/* Soccer Field */}
                              <div className="lg:col-span-3">
                                <div className="relative bg-gradient-to-b from-green-700 to-green-900 w-full mx-auto rounded-md flex items-center justify-center overflow-hidden" style={{ height: 'min(80vh, 500px)' }}>
                                  <div className="absolute top-0 left-0 w-full h-full">
                                    <div className="border-2 border-white border-b-0 mx-4 mt-4 h-full rounded-t-md relative">
                                      {/* Soccer field markings based on team type */}
                                      {lineupForm.watch("formation").startsWith("7a-") ? (
                                        <>
                                          {/* 7-a-side field markings - simplified */}
                                          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-16 border-2 border-t-0 border-white rounded-b-full"></div>
                                          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-24 w-48 border-2 border-b-0 border-white"></div>
                                          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-12 w-24 border-2 border-b-0 border-white"></div>
                                          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-2 w-16 bg-white"></div>
                                          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full"></div>
                                        </>
                                      ) : lineupForm.watch("formation").startsWith("5a-") ? (
                                        <>
                                          {/* Futsal/5-a-side field markings - more compact */}
                                          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-24 h-12 border-2 border-t-0 border-white rounded-b-full"></div>
                                          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-20 w-40 border-2 border-b-0 border-white"></div>
                                          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-10 w-20 border-2 border-b-0 border-white"></div>
                                          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-2 w-12 bg-white"></div>
                                          <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full"></div>
                                        </>
                                      ) : (
                                        <>
                                          {/* 11-a-side field markings - full size */}
                                          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-40 h-20 border-2 border-t-0 border-white rounded-b-full"></div>
                                          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-32 w-64 border-2 border-b-0 border-white"></div>
                                          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-16 w-32 border-2 border-b-0 border-white"></div>
                                          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-2 w-24 bg-white"></div>
                                          <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full"></div>
                                        </>
                                      )}

                                      {/* Player positions */}
                                      <div className="absolute top-0 left-0 w-full h-full">
                                        {getPositionsByFormation(lineupForm.watch("formation") || "4-4-2").map(
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
                                                  className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-white border-1 border-white shadow-lg transition-all ${
                                                    player
                                                      ? "scale-100"
                                                      : "scale-90 opacity-70"
                                                  } ${
                                                    position.label === t("team.gk")
                                                      ? "bg-blue-500"
                                                      : position.label === t("team.def")
                                                        ? "bg-red-500"
                                                        : position.label === t("team.mid")
                                                          ? "bg-green-500"
                                                          : "bg-yellow-500"
                                                  } hover:scale-110 hover:opacity-100`}
                                                >
                                                  {player ? (
                                                    <div className="flex flex-col items-center">
                                                      <span className="font-bold text-xs">
                                                        {player.user?.jerseyNumber || player.jerseyNumber || "?"}
                                                      </span>
                                                    </div>
                                                  ) : (
                                                    <div className="opacity-50 text-sm">+</div>
                                                  )}
                                                </div>

                                                {/* Player tooltip - only showing name */}
                                                {player && (
                                                  <div className="opacity-0 bg-black text-white text-xs rounded py-1 px-2 absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 pointer-events-none group-hover:opacity-100 whitespace-nowrap shadow-lg">
                                                    {player.user?.fullName || player.fullName}
                                                  </div>
                                                )}

                                                {/* Remove player button (red X) */}
                                                {player && (
                                                  <div
                                                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center opacity-80 hover:opacity-100 transition-all cursor-pointer shadow-lg"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      removePlayerFromPosition(position.id);
                                                    }}
                                                  >
                                                    <span className="text-white text-xs font-bold">
                                                      ✕
                                                    </span>
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
                                    <span>{t("team.gk")}</span>
                                  </div>
                                  <div className="flex items-center mr-3 mb-1">
                                    <span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-1"></span>
                                    <span>{t("team.def")}</span>
                                  </div>
                                  <div className="flex items-center mr-3 mb-1">
                                    <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-1"></span>
                                    <span>{t("team.mid")}</span>
                                  </div>
                                  <div className="flex items-center mb-1">
                                    <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full mr-1"></span>
                                    <span>{t("team.fw")}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Available Players */}
                              <div className="lg:col-span-2">
                                <div className="bg-muted/30 rounded-md p-2">
                                  <h4 className="font-medium mb-2 text-sm">{t("team.availablePlayers")}</h4>
                                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                                    {selectedPosition && (
                                      <div className="bg-primary/10 p-2 rounded-md mb-2 text-sm">
                                        <p>{t("team.selectPlayerForPosition")}: <span className="font-bold">{selectedPosition}</span></p>
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
                                            addPlayerToLineup(member);
                                          }}
                                        >
                                          <div className="flex items-center">
                                            <div className="ml-2">
                                              <div className="font-medium">{member.user?.fullName || member.fullName}</div>
                                              <div className="text-xs text-gray-500 flex">
                                                {(member.user?.position || member.position) && (
                                                  <span className="mr-2">{member.user?.position || member.position}</span>
                                                )}
                                                {(member.user?.jerseyNumber || member.jerseyNumber) && (
                                                  <span>#{member.user?.jerseyNumber || member.jerseyNumber}</span>
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
                                        <p>{t("team.allPlayersInLineup")}</p>
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
                                            member.userId !== null &&
                                            !Object.values(lineupPositions).some(p => p?.id === member.id) &&
                                            !field.value.includes(member.userId)
                                          ).map((member, index) => (
                                            <div
                                              key={`available-player-${member.userId || member.id}-${index}`}
                                              className="flex items-center justify-between p-2 bg-white border rounded-md cursor-pointer hover:bg-gray-50"
                                              onClick={() => addPlayerToBench(member)}
                                            >
                                              <div className="flex items-center">
                                                <div>
                                                  <div className="font-medium">{member.user?.fullName || member.fullName}</div>
                                                  <div className="text-xs text-gray-500 flex">
                                                    {(member.user?.position || member.position) && (
                                                      <span className="mr-2">{member.user?.position || member.position}</span>
                                                    )}
                                                    {(member.user?.jerseyNumber || member.jerseyNumber) && (
                                                      <span>#{member.user?.jerseyNumber || member.jerseyNumber}</span>
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
                                                {field.value.map((playerId, index) => {
                                                  const member = teamMembers?.find(m => m.userId === playerId);
                                                  return member ? (
                                                    <div key={`bench-player-${playerId}-${index}`} className="flex justify-between items-center bg-primary/10 p-2 rounded-md">
                                                      <div className="text-sm font-medium">
                                                        {member.user?.fullName || member.fullName}
                                                        {(member.user?.jerseyNumber || member.jerseyNumber) && <span className="text-xs ml-1">#{member.user?.jerseyNumber || member.jerseyNumber}</span>}
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
                                                }).filter(Boolean)}
                                              </div>
                                            </div>
                                          )}

                                          {/* Empty state */}
                                          {teamMembers?.filter(member => 
                                            member.role === "player" && 
                                            member.userId !== null &&
                                            !Object.values(lineupPositions).some(p => p?.id === member.id) &&
                                            !field.value.includes(member.userId)
                                          ).length === 0 && field.value.length === 0 && (
                                            <div className="text-center py-4 text-muted-foreground">
                                              <p>{t("team.noPlayersAvailableForBench")}</p>
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
                          <Button type="button" variant="outline">{t("common.cancel")}</Button>
                        </DialogClose>
                        <Button 
                          type="submit" 
                          disabled={saveLineup.isPending}
                          onClick={() => {
                            // Sync form with current lineup positions before validation
                            const playerIds = Object.values(lineupPositions)
                              .filter(player => player)
                              .map(player => player!.userId || player!.id)
                              .filter(id => id) as number[];

                            lineupForm.setValue('playerIds', playerIds, { shouldValidate: true });
                          }}
                        >
                          {saveLineup.isPending && <span className="mr-2 animate-spin">⟳</span>}
                          {t("matches.saveLineup")}
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
                  <div className="font-medium">{t("team.formation")}: {lineup.formation}</div>
                </div>

                {/* Field Visualization */}
                <div className="mb-6">
                  <h4 className="font-medium text-sm mb-2">{t("matches.fieldPositions")}</h4>
                  <div className="relative bg-gradient-to-b from-green-700 to-green-900 w-full mx-auto rounded-md flex items-center justify-center overflow-hidden" style={{ height: 'min(80vw, 400px)', maxWidth: '100%' }}>
                    <div className="absolute top-0 left-0 w-full h-full">
                      <div className="border-2 border-white border-b-0 mx-4 mt-4 h-full rounded-t-md relative">
                        {/* Soccer field markings based on team type */}
                        {(lineup?.formation?.toString() || "").startsWith("7a-") ? (
                          <>
                            {/* 7-a-side field markings - simplified */}
                            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-16 border-2 border-t-0 border-white rounded-b-full"></div>
                            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-24 w-48 border-2 border-b-0 border-white"></div>
                            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-12 w-24 border-2 border-b-0 border-white"></div>
                            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-2 w-16 bg-white"></div>
                            <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full"></div>
                          </>
                        ) : (lineup?.formation?.toString() || "").startsWith("5a-") ? (
                          <>
                            {/* Futsal/5-a-side field markings - more compact */}
                            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-24 h-12 border-2 border-t-0 border-white rounded-b-full"></div>
                            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-20 w-40 border-2 border-b-0 border-white"></div>
                            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-10 w-20 border-2 border-b-0 border-white"></div>
                            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-2 w-12 bg-white"></div>
                            <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full"></div>
                          </>
                        ) : (
                          <>
                            {/* 11-a-side field markings - full size */}
                            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-40 h-20 border-2 border-t-0 border-white rounded-b-full"></div>
                            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-32 w-64 border-2 border-b-0 border-white"></div>
                            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-16 w-32 border-2 border-b-0 border-white"></div>
                            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-2 w-24 bg-white"></div>
                            <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full"></div>
                          </>
                        )}

                        {/* Player positions */}
                        <div className="absolute top-0 left-0 w-full h-full">
                          {lineup.formation && getPositionsByFormation(lineup.formation).map((position) => {
                            // Use the lineupPositions state that was populated by the useEffect
                            const positionPlayer = lineupPositions[position.id];
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
                                  className={`w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center text-white border-1 border-white shadow-lg ${
                                    positionPlayer
                                      ? "scale-100"
                                      : "scale-90 opacity-70"
                                  } ${
                                    position.label === t("team.gk")
                                      ? "bg-blue-500"
                                      : position.label === t("team.def")
                                        ? "bg-red-500"
                                        : position.label === t("team.mid")
                                          ? "bg-green-500"
                                          : "bg-yellow-500"
                                  }`}
                                >
                                  {positionPlayer ? (
                                    <div className="flex flex-col items-center">
                                      <span className="font-bold text-xs">
                                        {(positionPlayer.user?.jerseyNumber || positionPlayer.jerseyNumber) || "?"}
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="opacity-50 text-xs">?</div>
                                  )}
                                </div>

                                {/* Player name below icon - only showing name */}
                                {positionPlayer && (
                                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 bg-black/80 text-white text-[10px] rounded px-1 py-0.5 whitespace-nowrap max-w-[100px] truncate shadow-lg">
                                    {positionPlayer.fullName}
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
                      <span>{t("team.gk")}</span>
                    </div>
                    <div className="flex items-center mr-3 mb-1">
                      <span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-1"></span>
                      <span>{t("team.def")}</span>
                    </div>
                    <div className="flex items-center mr-3 mb-1">
                      <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-1"></span>
                      <span>{t("team.mid")}</span>
                    </div>
                    <div className="flex items-center mb-1">
                      <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full mr-1"></span>
                      <span>{t("team.fw")}</span>
                    </div>
                  </div>
                </div>

                {/* Match Statistics: Starting and Bench Players with Stats */}
                <div className="space-y-6 mt-8">
                  <div>
                    <h4 className="font-medium text-sm mb-2 border-b pb-1">{t("matches.startingLineup")}</h4>
                    {lineup.players && lineup.players.length > 0 ? (
                      <ul className="divide-y overflow-hidden">
                        {lineup.players.map((player) => {
                          // Find stats for this player
                          const playerGoals = goals?.filter(g => g.scorerId === player.id) || [];
                          const playerAssists = goals?.filter(g => g.assistId === player.id) || [];
                          const playerCards = cards?.filter(c => c.playerId === player.id) || [];
                          const yellowCards = playerCards.filter(c => c.isYellow && !c.isSecondYellow);
                          const redCards = playerCards.filter(c => !c.isYellow || c.isSecondYellow);
                          const playerSubstitutions = substitutions?.filter(s => 
                            s.playerInId === player.id || s.playerOutId === player.id
                          ) || [];

                          return (
                            <li key={player.id} className="flex justify-between items-center py-3 px-2 hover:bg-gray-50 min-w-0">

                                <div className="flex-1 min-w-0">
                                <div className="flex items-center min-w-0">
                                  <div className="font-medium truncate">{player.fullName}</div>
                                  {player.jerseyNumber && (
                                    <span className="ml-2 text-sm text-gray-600 flex-shrink-0">#{player.jerseyNumber}</span>
                                  )}
                                  {player.position && (
                                    <span className="ml-2 text-xs text-gray-500 flex-shrink-0">{t(`team.positions.${player.position}`) || player.position}</span>
                                  )}
                                </div>
                              </div>

                              <div className="flex space-x-1 items-center flex-shrink-0">
                                {/* Show goals as soccer ball icons */}
                                {playerGoals.length > 0 && (
                                  <div className="flex items-center" title={`${playerGoals.length} goal${playerGoals.length > 1 ? 's' : ''}`}>
                                    <span className="text-xs font-semibold mr-1">{playerGoals.length}</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <circle cx="12" cy="12" r="10" />
                                      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
                                      <path d="M12 7v4l3 3" />
                                    </svg>
                                  </div>
                                )}

                                {/* Show assists */}
                                {playerAssists.length > 0 && (
                                  <div className="flex items-center" title={`${playerAssists.length} assist${playerAssists.length > 1 ? 's' : ''}`}>
                                    <span className="text-xs font-semibold mr-1">{playerAssists.length}</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M4 12h16" />
                                      <path d="M16 6l4 6-4 6" />
                                    </svg>
                                  </div>
                                )}

                                {/* Show yellow cards */}
                                {yellowCards.length > 0 && (
                                  <div className="flex items-center" title={`${yellowCards.length} yellow card${yellowCards.length > 1 ? 's' : ''}`}>
                                    <span className="text-xs font-semibold mr-1">{yellowCards.length}</span>
                                    <div className="h-4 w-3 bg-yellow-400 rounded-sm"></div>
                                  </div>
                                )}

                                {/* Show red cards */}
                                {redCards.length > 0 && (
                                  <div className="flex items-center" title="Red card">
                                    <div className="h-4 w-3 bg-red-600 rounded-sm"></div>
                                  </div>
                                )}

                                {/* Show substitutions */}
                                {playerSubstitutions.some(s => s.playerOutId === player.id) && (
                                  <div className="flex items-center" title="Substituted out">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="7 11 12 6 17 11" />
                                      <polyline points="7 17 12 12 17 17" />
                                    </svg>
                                  </div>                                )}

                                {playerSubstitutions.some(s => s.playerInId === player.id) && (
                                  <div className="flex items-center" title="Substituted in">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="7 13 12 18 17 13" />
                                      <polyline points="7 6 12 11 17 6" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-gray-500 italic mb-4">{t("team.noPlayersInStartingLineup")}</p>
                    )}
                  </div>

                  {/* Bench Players with Stats */}
                  {lineup.benchPlayers && lineup.benchPlayers.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-2 border-b pb-1">{t("team.bench")}</h4>
                      <ul className="divide-y overflow-hidden">
                        {lineup.benchPlayers.map((player) => {
                          // Find stats for bench players
                          const playerGoals = goals?.filter(g => g.scorerId === player.id) || [];
                          const playerAssists = goals?.filter(g => g.assistId === player.id) || [];
                          const playerCards = cards?.filter(c => c.playerId === player.id) || [];
                          const yellowCards = playerCards.filter(c => c.isYellow && !c.isSecondYellow);
                          const redCards = playerCards.filter(c => !c.isYellow || c.isSecondYellow);
                          const playerSubstitutions = substitutions?.filter(s => 
                            s.playerInId === player.id || s.playerOutId === player.id
                          ) || [];

                          return (
                            <li key={player.id} className="flex justify-between items-center py-3 px-2 bg-gray-50 hover:bg-gray-100 min-w-0">

                                <div className="flex-1 min-w-0">
                                <div className="flex items-center min-w-0">
                                  <div className="font-medium truncate">{player.fullName}</div>
                                  {player.jerseyNumber && (
                                    <span className="ml-2 text-sm text-gray-600 flex-shrink-0">#{player.jerseyNumber}</span>
                                  )}
                                  {player.position && (
                                    <span className="ml-2 text-xs text-gray-500 flex-shrink-0">{t(`team.positions.${player.position}`) || player.position}</span>
                                  )}
                                </div>
                              </div>

                              <div className="flex space-x-1 items-center flex-shrink-0">
                                {/* Show goals for bench players (might score after substitution) */}
                                {playerGoals.length > 0 && (
                                  <div className="flex items-center" title={`${playerGoals.length} goal${playerGoals.length > 1 ? 's' : ''}`}>
                                    <span className="text-xs font-semibold mr-1">{playerGoals.length}</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <circle cx="12" cy="12" r="10" />
                                      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
                                      <path d="M12 7v4l3 3" />
                                    </svg>
                                  </div>
                                )}

                                {/* Show assists */}
                                {playerAssists.length > 0 && (
                                  <div className="flex items-center" title={`${playerAssists.length} assist${playerAssists.length > 1 ? 's' : ''}`}>
                                    <span className="text-xs font-semibold mr-1">{playerAssists.length}</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M4 12h16" />
                                      <path d="M16 6l4 6-4 6" />
                                    </svg>
                                  </div>
                                )}

                                {/* Show yellow cards */}
                                {yellowCards.length > 0 && (
                                  <div className="flex items-center" title={`${yellowCards.length} yellow card${yellowCards.length > 1 ? 's' : ''}`}>
                                    <span className="text-xs font-semibold mr-1">{yellowCards.length}</span>
                                    <div className="h-4 w-3 bg-yellow-400 rounded-sm"></div>
                                  </div>
                                )}

                                {/* Show red cards */}
                                {redCards.length > 0 && (
                                  <div className="flex items-center" title="Red card">
                                    <div className="h-4 w-3 bg-red-600 rounded-sm"></div>
                                  </div>
                                )}

                                {/* Show substitutions */}
                                {playerSubstitutions.some(s => s.playerInId === player.id) && (
                                  <div className="flex items-center" title="Substituted in">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="7 13 12 18 17 13" />
                                      <polyline points="7 6 12 11 17 6" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center p-6 border-dashed border-2 rounded-md">
                <p className="text-gray-500">{t("matches.noLineupSet")}</p>
                <p className="text-sm text-gray-400 mt-1">{t("matches.addLineupHelp")}</p>
              </div>
            )}
          </TabsContent>

          {/* Substitutions Tab */}
          <TabsContent value="substitutions" className="py-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium">{t("matches.subs")}</h3>
              <Dialog open={substitutionDialogOpen} onOpenChange={setSubstitutionDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>{t("matches.recordSubstitution")}</DialogTitle>
                    <DialogDescription>
                      {t("matches.setupStartingLineupDescription")}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...substitutionForm}>
                    <form onSubmit={substitutionForm.handleSubmit(handleSubstitutionSubmit)} className="space-y-4">
                      <FormField
                        control={substitutionForm.control}
                        name="playerInId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("matches.playerIn")}</FormLabel>
                            <FormControl>
                              <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={field.value || ""}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              >
                                <option value="">{t("matches.selectPlayerIn")}</option>
                                {teamMembers?.filter(member => member.role === "player").map((member) => (
                                  <option key={member.userId || member.id} value={member.userId || member.id}>
                                    {member.user?.fullName || member.fullName} 
                                    {(member.user?.jerseyNumber || member.jerseyNumber) ? ` (#${member.user?.jerseyNumber || member.jerseyNumber})` : ""}
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
                            <FormLabel>{t("matches.playerOut")}</FormLabel>
                            <FormControl>
                              <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={field.value || ""}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              >
                                <option value="">{t("matches.selectPlayerOut")}</option>
                                {teamMembers?.filter(member => member.role === "player").map((member) => (
                                  <option key={member.userId || member.id} value={member.userId || member.id}>
                                    {member.user?.fullName || member.fullName}
                                    {(member.user?.jerseyNumber || member.jerseyNumber) ? ` (#${member.user?.jerseyNumber || member.jerseyNumber})` : ""}
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
                            <FormLabel>{t("matches.minute")}</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="1" 
                                max="120"
                                placeholder={t("matches.whenSubHappened")} 
                                {...field}
                                value={field.value || ""}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />



                      <div className="flex justify-end gap-2">
                        <DialogClose asChild>
                          <Button type="button" variant="outline">{t("common.cancel")}</Button>
                        </DialogClose>
                        <Button type="submit" disabled={addSubstitution.isPending}>
                          {addSubstitution.isPending && <span className="mr-2 animate-spin">⟳</span>}
                          {t("matches.recordSubstitution")}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {substitutions && substitutions.length > 0 ? (
              <div className="w-full overflow-x-auto">
                <Table className="w-full min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">{t("matches.min")}</TableHead>
                      <TableHead>{t("matches.playerIn")}</TableHead>
                      <TableHead>{t("matches.playerOut")}</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {substitutions.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium">{sub.minute}'</TableCell>
                        <TableCell className="max-w-[100px] truncate">
                          {sub.playerIn.fullName}
                          {sub.playerIn.jerseyNumber && <span className="text-gray-500 ml-1">#{sub.playerIn.jerseyNumber}</span>}
                        </TableCell>
                        <TableCell className="max-w-[100px] truncate">
                          {sub.playerOut.fullName}
                          {sub.playerOut.jerseyNumber && <span className="text-gray-500 ml-1">#{sub.playerOut.jerseyNumber}</span>}
                        </TableCell>
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
              </div>
            ) : (
              <div className="text-center p-6 border-dashed border-2 rounded-md">
                <p className="text-gray-500">{t("matches.noSubstitutionsRecorded")}</p>
                <p className="text-sm text-gray-400 mt-1">{t("matches.recordSubstitutionsHelp")}</p>
              </div>
            )}
          </TabsContent>

          {/* Goals Tab */}
          <TabsContent value="goals" className="py-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium">{t("matches.goals")}</h3>
              <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    {t("matches.addGoal")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>{t("matches.recordGoal")}</DialogTitle>
                    <DialogDescription>
                      {t("matches.setupStartingLineupDescription")}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...goalForm}>
                    <form onSubmit={goalForm.handleSubmit(handleGoalSubmit)} className="space-y-4">
                      <FormField
                        control={goalForm.control}
                        name="scorerId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("matches.scorer")}</FormLabel>
                            <FormControl>
                              <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={field.value || ""}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              >
                                <option value="">{t("matches.selectGoalScorer")}</option>
                                {teamMembers?.filter(member => member.role === "player").map((member) => (
                                  <option key={member.userId || member.id} value={member.userId || member.id}>
                                    {member.user?.fullName || member.fullName}
                                    {(member.user?.jerseyNumber || member.jerseyNumber) ? ` (#${member.user?.jerseyNumber || member.jerseyNumber})` : ""}
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
                            <FormLabel>{t("matches.assistOptional")}</FormLabel>
                            <FormControl>
                              <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={field.value || ""}
                                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                              >
                                <option value="">{t("matches.noAssist")}</option>
                                {teamMembers?.filter(member => member.role === "player").map((member) => (
                                  <option key={member.userId || member.id} value={member.userId || member.id}>
                                    {member.user?.fullName || member.fullName}
                                    {(member.user?.jerseyNumber || member.jerseyNumber) ? ` (#${member.user?.jerseyNumber || member.jerseyNumber})` : ""}
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
                            <FormLabel>{t("matches.minute")}</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="1" 
                                max="120"
                                placeholder={t("matches.whenGoalScored")} 
                                {...field}
                                value={field.value || ""}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex space-x-4">
                        <FormField
                          control={goalForm.control}
                          name="isOwnGoal"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2">
                              <FormControl>
                                <input
                                  type="checkbox"
                                  checked={field.value || false}
                                  onChange={field.onChange}
                                  className="h-4 w-4 rounded border border-input"
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal">{t("matches.ownGoal")}</FormLabel>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={goalForm.control}
                          name="isPenalty"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2">
                              <FormControl>
                                <input
                                  type="checkbox"
                                  checked={field.value || false}
                                  onChange={field.onChange}
                                  className="h-4 w-4 rounded border border-input"
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal">{t("matches.penalty")}</FormLabel>
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <DialogClose asChild>
                          <Button type="button" variant="outline">{t("common.cancel")}</Button>
                        </DialogClose>
                        <Button type="submit" disabled={addGoal.isPending}>
                          {addGoal.isPending && <span className="mr-2 animate-spin">⟳</span>}
                          {t("matches.recordGoal")}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {goals && goals.length > 0 ? (
              <div className="w-full overflow-x-auto">
                <Table className="w-full min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">{t("matches.min")}</TableHead>
                      <TableHead>{t("matches.scorer")}</TableHead>
                      <TableHead className="hidden sm:table-cell">{t("matches.assist")}</TableHead>
                      <TableHead>{t("matches.type")}</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {goals.map((goal) => (
                      <TableRow key={goal.id}>
                        <TableCell className="font-medium">{goal.minute}'</TableCell>
                        <TableCell className="max-w-[100px] truncate">
                          {goal.scorer.fullName}
                          {goal.scorer.jerseyNumber && <span className="text-gray-500 ml-1">#{goal.scorer.jerseyNumber}</span>}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {goal.assistPlayer ? (
                            <>
                              {goal.assistPlayer.fullName}
                              {goal.assistPlayer.jerseyNumber && <span className="text-gray-500 ml-1">#{goal.assistPlayer.jerseyNumber}</span>}
                            </>
                          ) : "-"}
                        </TableCell>
                        <TableCell>
                          {goal.isOwnGoal ? t("matches.ownGoalShort") : 
                           goal.isPenalty ? t("matches.penaltyShort") : 
                           t("matches.regularShort")}
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
              </div>
            ) : (
              <div className="text-center p-6 border-dashed border-2 rounded-md">
                <p className="text-gray-500">{t("matches.noGoalsRecorded")}</p>
                <p className="text-sm text-gray-400 mt-1">{t("matches.recordGoalsHelp")}</p>
              </div>
            )}
          </TabsContent>

          {/* Cards Tab */}
          <TabsContent value="cards" className="py-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium">{t("matches.cards")}</h3>
              <Dialog open={cardDialogOpen} onOpenChange={setCardDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    {t("matches.addCard")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>{t("matches.recordCard")}</DialogTitle>
                    <DialogDescription>
                      {t("matches.setupStartingLineupDescription")}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...cardForm}>
                    <form onSubmit={cardForm.handleSubmit(handleCardSubmit)} className="space-y-4">
                      <FormField
                        control={cardForm.control}
                        name="playerId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("matches.player")}</FormLabel>
                            <FormControl>
                              <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={field.value || ""}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              >
                                <option value="">{t("matches.selectPlayer")}</option>
                                {teamMembers?.filter(member => member.role === "player").map((member) => (
                                  <option key={member.userId || member.id} value={member.userId || member.id}>
                                    {member.user?.fullName || member.fullName}
                                    {(member.user?.jerseyNumber || member.jerseyNumber) ? ` (#${member.user?.jerseyNumber || member.jerseyNumber})` : ""}
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
                            <FormLabel>{t("matches.cardType")}</FormLabel>
                            <FormControl>
                              <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={field.value || ""}
                                onChange={(e) => field.onChange(e.target.value as any)}
                              >
                                <option value="">{t("matches.selectCardType")}</option>
                                <option value="yellow">{t("matches.yellowCard")}</option>
                                <option value="red">{t("matches.redCard")}</option>
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
                            <FormLabel>{t("matches.minute")}</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="1" 
                                max="120"
                                placeholder={t("matches.whenCardShown")} 
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
                            <FormLabel>{t("matches.reasonOptional")}</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder={t("matches.reasonForCard")}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end gap-2">
                        <DialogClose asChild>
                          <Button type="button" variant="outline">{t("common.cancel")}</Button>
                        </DialogClose>
                        <Button type="submit" disabled={addCard.isPending}>
                          {addCard.isPending && <span className="mr-2 animate-spin">⟳</span>}
                          {t("matches.recordCard")}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {cards && cards.length > 0 ? (
              <div className="w-full overflow-x-auto">
                <Table className="w-full min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">{t("matches.min")}</TableHead>
                      <TableHead>{t("matches.player")}</TableHead>
                      <TableHead>{t("matches.type")}</TableHead>
                      <TableHead className="hidden sm:table-cell">{t("matches.reason")}</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cards.map((card) => (
                      <TableRow key={card.id}>
                        <TableCell className="font-medium">{card.minute}'</TableCell>
                        <TableCell className="max-w-[100px] truncate">
                          {card.player.fullName}
                          {card.player.jerseyNumber && <span className="text-gray-500 ml-1">#{card.player.jerseyNumber}</span>}
                        </TableCell>
                        <TableCell>
                          <Badge className={(card.isYellow && !card.isSecondYellow) ? "bg-yellow-500 text-white" : "bg-red-600 text-white"}>
                            {(card.isYellow && !card.isSecondYellow) ? t("matches.yellow") : t("matches.red")}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{card.reason || "-"}</TableCell>
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
              </div>
            ) : (
              <div className="text-center p-6 border-dashed border-2 rounded-md">
                <p className="text-gray-500">{t("matches.noCardsRecorded")}</p>
                <p className="text-sm text-gray-400 mt-1">{t("matches.recordCardsHelp")}</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}