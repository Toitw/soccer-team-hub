import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Team, Match, LeagueClassification } from "@shared/schema";
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
  Trash,
  ListOrdered,
  PlusSquare,
  FileText,
  Upload,
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
import { format, isPast } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

// Define form schema for creating a classification entry
const classificationSchema = z.object({
  externalTeamName: z.string().min(1, "Team name is required"),
  points: z.number().int().min(0, "Points must be a positive number"),
  position: z.number().int().min(1, "Position must be a positive number").optional().nullable(),
  gamesPlayed: z.number().int().min(0).optional().nullable(),
  gamesWon: z.number().int().min(0).optional().nullable(),
  gamesDrawn: z.number().int().min(0).optional().nullable(),
  gamesLost: z.number().int().min(0).optional().nullable(),
  goalsFor: z.number().int().min(0).optional().nullable(),
  goalsAgainst: z.number().int().min(0).optional().nullable(),
});

type ClassificationFormData = z.infer<typeof classificationSchema>;

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
  
  // Classification states
  const [classificationDialogOpen, setClassificationDialogOpen] = useState(false);
  const [editingClassification, setEditingClassification] = useState<LeagueClassification | null>(null);
  const [isEditingClassification, setIsEditingClassification] = useState(false);
  const [deleteClassificationDialogOpen, setDeleteClassificationDialogOpen] = useState(false);
  const [classificationToDelete, setClassificationToDelete] = useState<LeagueClassification | null>(null);
  const [csvUploadDialogOpen, setCsvUploadDialogOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  
  // Define forms here to maintain hook order
  const matchForm = useForm<MatchFormData>({
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
  
  // Classification form
  const classificationForm = useForm<ClassificationFormData>({
    resolver: zodResolver(classificationSchema),
    defaultValues: {
      externalTeamName: "",
      points: 0,
      position: null,
      gamesPlayed: null,
      gamesWon: null,
      gamesDrawn: null,
      gamesLost: null,
      goalsFor: null,
      goalsAgainst: null,
    },
  });
  
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

  // Query for league classification data
  const {
    data: classifications,
    isLoading: classificationsLoading,
    refetch: refetchClassifications,
  } = useQuery<LeagueClassification[]>({
    queryKey: ["classifications", selectedTeam?.id],
    enabled: !!selectedTeam,
    queryFn: async () => {
      if (!selectedTeam) return [];
      console.log(`Fetching classifications for team ${selectedTeam.id}`);
      const response = await fetch(`/api/teams/${selectedTeam.id}/classification`);
      if (!response.ok) throw new Error("Failed to fetch classifications");
      const classificationsData = await response.json();
      console.log("Fetched classifications:", classificationsData);
      return classificationsData;
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0, // Consider data stale immediately
  });

  // We need to make sure refetchClassifications properly invalidates the cache
  const refetchClassificationsData = async () => {
    console.log("Manually invalidating classifications cache");
    await queryClient.invalidateQueries({
      queryKey: ["classifications", selectedTeam?.id],
    });
    return refetchClassifications();
  };

  // Handle dialog close for classification form
  const handleClassificationDialogChange = (open: boolean) => {
    if (!open) {
      // Reset the form and editing state when dialog is closed
      setTimeout(() => {
        setIsEditingClassification(false);
        setEditingClassification(null);
        classificationForm.reset({
          externalTeamName: "",
          points: 0,
          position: null,
          gamesPlayed: null,
          gamesWon: null,
          gamesDrawn: null,
          gamesLost: null,
          goalsFor: null,
          goalsAgainst: null,
        });
      }, 100);
    }
    setClassificationDialogOpen(open);
  };

  // Handle editing a classification entry
  const handleEditClassification = (classification: LeagueClassification) => {
    setEditingClassification(classification);
    setIsEditingClassification(true);

    // Reset the form with the classification data
    classificationForm.reset({
      externalTeamName: classification.externalTeamName,
      points: classification.points,
      position: classification.position,
      gamesPlayed: classification.gamesPlayed,
      gamesWon: classification.gamesWon,
      gamesDrawn: classification.gamesDrawn,
      gamesLost: classification.gamesLost,
      goalsFor: classification.goalsFor,
      goalsAgainst: classification.goalsAgainst,
    });

    setClassificationDialogOpen(true);
  };

  // Handle classification form submission
  const onClassificationSubmit = async (data: ClassificationFormData) => {
    try {
      if (!selectedTeam) {
        throw new Error("No team selected");
      }

      console.log("Submitting classification data:", data);

      let response;
      let successMessage;

      // If editing an existing classification
      if (isEditingClassification && editingClassification) {
        response = await fetch(
          `/api/classification/${editingClassification.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
          },
        );
        successMessage = "Classification updated successfully";
      } else {
        // Creating a new classification
        response = await fetch(`/api/teams/${selectedTeam.id}/classification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });
        successMessage = "Classification created successfully";
      }

      if (!response.ok) {
        throw new Error(
          isEditingClassification 
          ? "Failed to update classification" 
          : "Failed to create classification",
        );
      }

      // Get the result
      const result = await response.json();
      console.log(
        isEditingClassification 
        ? "Updated classification:" 
        : "Created classification:", 
        result
      );

      // Reset editing state
      setIsEditingClassification(false);
      setEditingClassification(null);
      setClassificationDialogOpen(false);
      classificationForm.reset();

      // Force refetch with a different query key to trigger refresh
      await refetchClassificationsData();
      console.log("Classifications refetched");

      toast({
        title: isEditingClassification ? "Classification updated" : "Classification created",
        description: successMessage,
      });
    } catch (error) {
      console.error(
        isEditingClassification 
        ? "Error updating classification:" 
        : "Error creating classification:",
        error,
      );
      toast({
        title: "Error",
        description: isEditingClassification
          ? "Failed to update classification"
          : "Failed to create classification",
        variant: "destructive",
      });
    }
  };

  // Handle deleting a classification
  const handleDeleteClassification = async () => {
    if (!classificationToDelete) return;

    try {
      const response = await fetch(
        `/api/classification/${classificationToDelete.id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete classification");
      }

      await refetchClassificationsData();
      setDeleteClassificationDialogOpen(false);
      setClassificationToDelete(null);

      toast({
        title: "Classification deleted",
        description: "The classification entry has been deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting classification:", error);
      toast({
        title: "Error",
        description: "Failed to delete classification",
        variant: "destructive",
      });
    }
  };

  // Handle CSV file upload
  const handleCsvUpload = async () => {
    if (!csvFile || !selectedTeam) {
      toast({
        title: "Error",
        description: "Please select a CSV file first",
        variant: "destructive",
      });
      return;
    }

    try {
      // Read the CSV file
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const csvData = e.target?.result;
          if (!csvData) {
            throw new Error("Failed to read CSV file");
          }

          // Parse CSV (simple parsing for team,points format)
          const lines = (csvData as string).split("\n");
          const classifications = [];
          
          // Skip header line if exists
          const startIndex = lines[0].toLowerCase().includes("team") ? 1 : 0;
          
          for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const parts = line.split(",");
            if (parts.length < 2) continue;
            
            // Remove quotation marks from team name if present
            let externalTeamName = parts[0].trim();
            if (externalTeamName.startsWith('"') && externalTeamName.endsWith('"')) {
              externalTeamName = externalTeamName.substring(1, externalTeamName.length - 1);
            } else if (externalTeamName.startsWith('"')) {
              externalTeamName = externalTeamName.substring(1);
            }
            
            const points = parseInt(parts[1].trim(), 10);
            
            if (!externalTeamName || isNaN(points)) continue;
            
            // Create classification object
            const classification = {
              externalTeamName,
              points,
              position: i - startIndex + 1,
              gamesPlayed: parts.length > 2 ? parseInt(parts[2].trim(), 10) || null : null,
              gamesWon: parts.length > 3 ? parseInt(parts[3].trim(), 10) || null : null,
              gamesDrawn: parts.length > 4 ? parseInt(parts[4].trim(), 10) || null : null,
              gamesLost: parts.length > 5 ? parseInt(parts[5].trim(), 10) || null : null,
              goalsFor: parts.length > 6 ? parseInt(parts[6].trim(), 10) || null : null,
              goalsAgainst: parts.length > 7 ? parseInt(parts[7].trim(), 10) || null : null,
            };
            
            classifications.push(classification);
          }
          
          // Send the parsed data to the API
          const response = await fetch(`/api/teams/${selectedTeam.id}/classification/bulk`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ classifications }),
          });
          
          if (!response.ok) {
            throw new Error("Failed to upload classification data");
          }
          
          const result = await response.json();
          console.log("Uploaded classifications:", result);
          
          // Reset state
          setCsvUploadDialogOpen(false);
          setCsvFile(null);
          
          // Refetch classifications
          await refetchClassificationsData();
          
          toast({
            title: "CSV data uploaded",
            description: `Successfully created ${result.classifications.length} classification entries`,
          });
        } catch (error) {
          console.error("Error processing CSV:", error);
          toast({
            title: "Error",
            description: "Failed to process CSV file",
            variant: "destructive",
          });
        }
      };
      
      reader.readAsText(csvFile);
    } catch (error) {
      console.error("Error uploading CSV:", error);
      toast({
        title: "Error",
        description: "Failed to upload CSV file",
        variant: "destructive",
      });
    }
  };

  // Open delete confirmation dialog for classification
  const confirmDeleteClassification = (classification: LeagueClassification) => {
    setClassificationToDelete(classification);
    setDeleteClassificationDialogOpen(true);
  };

  // Create a downloadable sample CSV template
  const generateSampleCsv = () => {
    const header = "Team,Points,GamesPlayed,GamesWon,GamesDrawn,GamesLost,GoalsFor,GoalsAgainst";
    const rows = [
      "Team A,21,10,7,0,3,22,12",
      "Team B,18,10,6,0,4,20,15",
      "Team C,15,10,5,0,5,17,18"
    ];
    const csvContent = [header, ...rows].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("href", url);
    a.setAttribute("download", "classification_template.csv");
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle editing a match
  const handleEditMatch = (match: Match) => {
    setEditingMatch(match);
    setIsEditing(true);

    // Convert date to format expected by datetime-local input
    const matchDate = new Date(match.matchDate);
    const formattedDate = matchDate.toISOString().slice(0, 16);

    // Reset the form with the match data
    matchForm.reset({
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

  // Handle dialog close - we need to clear form and reset editing state
  const handleDialogChange = (open: boolean) => {
    if (!open) {
      // Reset the form and editing state when dialog is closed
      setTimeout(() => {
        if (!isEditing) return;
        setIsEditing(false);
        setEditingMatch(null);
        matchForm.reset({
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
      matchForm.reset();

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

  // Function to check and update match status based on date
  const checkAndUpdateMatchStatus = async (match: Match) => {
    // If the match is scheduled but the date has passed, update it to completed
    if (
      match.status === "scheduled" &&
      new Date(match.matchDate) < new Date() &&
      selectedTeam
    ) {
      try {
        const response = await fetch(
          `/api/teams/${selectedTeam.id}/matches/${match.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ...match,
              status: "completed",
            }),
          },
        );

        if (response.ok) {
          console.log(`Updated match ${match.id} status to completed`);
          // Trigger a refetch to get the updated data
          await refetchMatchesData();
        }
      } catch (error) {
        console.error("Error updating match status:", error);
      }
    }
  };

  // Check and update match statuses
  useEffect(() => {
    if (matches && matches.length > 0) {
      matches.forEach((match) => {
        checkAndUpdateMatchStatus(match);
      });
    }
  }, [matches, selectedTeam]);

  const isLoading = teamsLoading || matchesLoading || classificationsLoading;

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

  // Get upcoming matches (scheduled matches with future dates)
  const upcomingMatches = matches
    ?.filter(
      (match) =>
        match.status === "scheduled" && new Date(match.matchDate) > currentDate,
    )
    .sort(
      (a, b) =>
        new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime(),
    );

  // Get past matches (completed matches or scheduled matches with past dates)
  const pastMatches = matches
    ?.filter(
      (match) =>
        match.status === "completed" ||
        (match.status === "scheduled" &&
          new Date(match.matchDate) < currentDate),
    )
    .sort(
      (a, b) =>
        new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime(),
    );

  // Format match type badge
  const getMatchTypeBadge = (matchType?: string) => {
    if (!matchType) return null;

    let variant: "default" | "destructive" | "outline" | "secondary" = "default";
    if (matchType === "league") variant = "default";
    else if (matchType === "copa") variant = "destructive";
    else if (matchType === "friendly") variant = "outline";

    return (
      <Badge variant={variant} className="ml-2 capitalize">
        {matchType}
      </Badge>
    );
  };

  // Function to render match card
  const renderMatchCard = (match: Match) => {
    const matchDate = new Date(match.matchDate);
    const isPastMatch = isPast(matchDate) || match.status === "completed";
    const hasScores = match.goalsScored !== null && match.goalsConceded !== null;

    // Get match result badge variant
    const getResultBadgeVariant = () => {
      if (!hasScores) return "secondary";
      if (match.goalsScored! > match.goalsConceded!) return "secondary"; // Win (using secondary instead of success)
      if (match.goalsScored! < match.goalsConceded!) return "destructive"; // Loss
      return "secondary"; // Draw
    };

    // Get match result text
    const getResultText = () => {
      if (!hasScores) return "No Score";
      if (match.goalsScored! > match.goalsConceded!) return "Win";
      if (match.goalsScored! < match.goalsConceded!) return "Loss";
      return "Draw";
    };

    return (
      <Card
        key={match.id}
        className="mb-4 overflow-hidden hover:shadow-md transition-shadow"
      >
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 text-muted-foreground mr-1" />
              <span className="text-sm text-muted-foreground">
                {format(matchDate, "EEEE, MMMM d, yyyy")}
              </span>
              {getMatchTypeBadge(match.matchType)}
            </div>
            {isPastMatch && match.status !== "cancelled" && hasScores && (
              <Badge
                variant={getResultBadgeVariant()}
                className="ml-2"
              >
                {getResultText()}
              </Badge>
            )}
          </div>
          <div className="flex justify-between items-center mt-2">
            <CardTitle className="text-xl flex items-center">
              {match.isHome ? (
                <>
                  {selectedTeam?.name}{" "}
                  <Home className="h-4 w-4 mx-1 text-emerald-500" />{" "}
                  <span className="text-muted-foreground">vs</span>{" "}
                  {match.opponentName}
                </>
              ) : (
                <>
                  {match.opponentName}{" "}
                  <Home className="h-4 w-4 mx-1 text-emerald-500" />{" "}
                  <span className="text-muted-foreground">vs</span>{" "}
                  {selectedTeam?.name}
                </>
              )}
            </CardTitle>
            {match.status === "completed" && hasScores && (
              <div className="text-2xl font-bold">
                {match.isHome
                  ? `${match.goalsScored} - ${match.goalsConceded}`
                  : `${match.goalsConceded} - ${match.goalsScored}`}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center text-sm">
              <MapPin className="h-4 w-4 mr-1 text-muted-foreground" />
              <span>{match.location}</span>
            </div>
            <div className="flex items-center text-sm">
              <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
              <span>{format(matchDate, "h:mm a")}</span>
            </div>
          </div>
          {match.notes && (
            <div className="mt-2 text-sm text-muted-foreground">
              {match.notes}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between py-2 bg-muted/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedMatch(match)}
          >
            Details <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
          {canManage && (
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEditMatch(match)}
              >
                <ClipboardEdit className="h-4 w-4 mr-1" /> Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => confirmDelete(match)}
              >
                <Trash className="h-4 w-4 mr-1" /> Delete
              </Button>
            </div>
          )}
        </CardFooter>
      </Card>
    );
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Matches" />
        <main className="flex-1 p-4 md:p-6 space-y-4 mt-16 pt-6 md:mt-16 md:pt-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Matches</h1>
            {canManage && (
              <Button onClick={() => setDialogOpen(true)}>
                <PlusCircle className="h-4 w-4 mr-2" /> Add Match
              </Button>
            )}
          </div>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-4"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="upcoming">
                <Calendar className="h-4 w-4 mr-2" /> Upcoming Matches
              </TabsTrigger>
              <TabsTrigger value="past">
                <Trophy className="h-4 w-4 mr-2" /> Past Matches
              </TabsTrigger>
              <TabsTrigger value="classification">
                <ListOrdered className="h-4 w-4 mr-2" /> Classification
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="space-y-4">
              {upcomingMatches && upcomingMatches.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {upcomingMatches.map((match) => renderMatchCard(match))}
                </div>
              ) : (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-muted-foreground">
                      No upcoming matches scheduled.
                    </p>
                    {canManage && (
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => setDialogOpen(true)}
                      >
                        <PlusCircle className="h-4 w-4 mr-2" /> Schedule a new
                        match
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="past" className="space-y-4">
              {pastMatches && pastMatches.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {pastMatches.map((match) => renderMatchCard(match))}
                </div>
              ) : (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-muted-foreground">
                      No past matches available.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="classification" className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle>League Classification</CardTitle>
                    {canManage && (
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setClassificationDialogOpen(true)}
                        >
                          <PlusSquare className="h-4 w-4 mr-1" /> Add Entry
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCsvUploadDialogOpen(true)}
                        >
                          <Upload className="h-4 w-4 mr-1" /> Upload CSV
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={generateSampleCsv}
                        >
                          <FileText className="h-4 w-4 mr-1" /> Sample CSV
                        </Button>
                      </div>
                    )}
                  </div>
                  <CardDescription>
                    Current standings in the league
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {classifications && classifications.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">#</TableHead>
                            <TableHead>Team</TableHead>
                            <TableHead className="text-center">Pts</TableHead>
                            <TableHead className="text-center">P</TableHead>
                            <TableHead className="text-center">W</TableHead>
                            <TableHead className="text-center">D</TableHead>
                            <TableHead className="text-center">L</TableHead>
                            <TableHead className="text-center">GF</TableHead>
                            <TableHead className="text-center">GA</TableHead>
                            <TableHead className="text-center">GD</TableHead>
                            {canManage && <TableHead>Actions</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {classifications
                            .sort((a, b) => {
                              // Sort by position if available, otherwise by points
                              if (a.position !== null && b.position !== null) {
                                return a.position - b.position;
                              }
                              return b.points - a.points;
                            })
                            .map((classification) => {
                              // Calculate goal difference
                              const goalsFor = classification.goalsFor || 0;
                              const goalsAgainst = classification.goalsAgainst || 0;
                              const goalDifference = goalsFor - goalsAgainst;
                              
                              return (
                                <TableRow key={classification.id}>
                                  <TableCell className="font-medium">
                                    {classification.position || "-"}
                                  </TableCell>
                                  <TableCell>
                                    {classification.externalTeamName}
                                  </TableCell>
                                  <TableCell className="text-center font-bold">
                                    {classification.points}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {classification.gamesPlayed || "-"}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {classification.gamesWon || "-"}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {classification.gamesDrawn || "-"}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {classification.gamesLost || "-"}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {classification.goalsFor || "-"}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {classification.goalsAgainst || "-"}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {goalDifference > 0 
                                      ? `+${goalDifference}` 
                                      : goalDifference}
                                  </TableCell>
                                  {canManage && (
                                    <TableCell>
                                      <div className="flex space-x-2">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleEditClassification(classification)}
                                        >
                                          <ClipboardEdit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => confirmDeleteClassification(classification)}
                                        >
                                          <Trash className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  )}
                                </TableRow>
                              );
                            })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground">
                        No classification data available.
                      </p>
                      {canManage && (
                        <div className="flex flex-col space-y-2 mt-4 max-w-xs mx-auto">
                          <Button
                            variant="outline"
                            onClick={() => setClassificationDialogOpen(true)}
                          >
                            <PlusSquare className="h-4 w-4 mr-2" /> Add manually
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setCsvUploadDialogOpen(true)}
                          >
                            <Upload className="h-4 w-4 mr-2" /> Upload CSV
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Match creation/editing dialog */}
          <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {isEditing ? "Edit Match" : "Add New Match"}
                </DialogTitle>
                <DialogDescription>
                  {isEditing
                    ? "Edit the match details below."
                    : "Enter match details below to create a new match."}
                </DialogDescription>
              </DialogHeader>
              <Form {...matchForm}>
                <form
                  onSubmit={matchForm.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={matchForm.control}
                    name="opponentName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Opponent Team</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter opponent name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={matchForm.control}
                    name="matchDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Match Date and Time</FormLabel>
                        <FormControl>
                          <Input {...field} type="datetime-local" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={matchForm.control}
                    name="matchType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Match Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select match type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="friendly">Friendly</SelectItem>
                            <SelectItem value="league">League</SelectItem>
                            <SelectItem value="copa">Copa</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={matchForm.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter match location" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={matchForm.control}
                    name="isHome"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="h-4 w-4 rounded border-gray-300 text-primary"
                          />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Home match
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={matchForm.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select match status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {matchForm.watch("status") === "completed" && (
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={matchForm.control}
                        name="goalsScored"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Goals Scored</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                value={
                                  field.value !== null ? field.value : ""
                                }
                                onChange={(e) => {
                                  const value = e.target.value;
                                  field.onChange(
                                    value === "" ? null : parseInt(value, 10),
                                  );
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={matchForm.control}
                        name="goalsConceded"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Goals Conceded</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                value={
                                  field.value !== null ? field.value : ""
                                }
                                onChange={(e) => {
                                  const value = e.target.value;
                                  field.onChange(
                                    value === "" ? null : parseInt(value, 10),
                                  );
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  <FormField
                    control={matchForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Enter any additional notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button type="submit">
                      {isEditing ? "Save Changes" : "Add Match"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Classification creation/editing dialog */}
          <Dialog
            open={classificationDialogOpen}
            onOpenChange={handleClassificationDialogChange}
          >
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {isEditingClassification ? "Edit Classification" : "Add Classification Entry"}
                </DialogTitle>
                <DialogDescription>
                  {isEditingClassification
                    ? "Edit the classification details below."
                    : "Enter team details below to add to the classification table."}
                </DialogDescription>
              </DialogHeader>
              <Form {...classificationForm}>
                <form
                  onSubmit={classificationForm.handleSubmit(onClassificationSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={classificationForm.control}
                    name="externalTeamName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Team Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter team name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={classificationForm.control}
                      name="points"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Points</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={classificationForm.control}
                      name="position"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Position</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              value={field.value !== null ? field.value : ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                field.onChange(
                                  value === "" ? null : parseInt(value, 10),
                                );
                              }}
                              placeholder="Optional"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={classificationForm.control}
                      name="gamesPlayed"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Games Played</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              value={field.value !== null ? field.value : ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                field.onChange(
                                  value === "" ? null : parseInt(value, 10),
                                );
                              }}
                              placeholder="Optional"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={classificationForm.control}
                      name="gamesWon"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Games Won</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              value={field.value !== null ? field.value : ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                field.onChange(
                                  value === "" ? null : parseInt(value, 10),
                                );
                              }}
                              placeholder="Optional"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={classificationForm.control}
                      name="gamesDrawn"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Games Drawn</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              value={field.value !== null ? field.value : ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                field.onChange(
                                  value === "" ? null : parseInt(value, 10),
                                );
                              }}
                              placeholder="Optional"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={classificationForm.control}
                      name="gamesLost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Games Lost</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              value={field.value !== null ? field.value : ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                field.onChange(
                                  value === "" ? null : parseInt(value, 10),
                                );
                              }}
                              placeholder="Optional"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={classificationForm.control}
                      name="goalsFor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Goals For</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              value={field.value !== null ? field.value : ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                field.onChange(
                                  value === "" ? null : parseInt(value, 10),
                                );
                              }}
                              placeholder="Optional"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={classificationForm.control}
                      name="goalsAgainst"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Goals Against</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              value={field.value !== null ? field.value : ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                field.onChange(
                                  value === "" ? null : parseInt(value, 10),
                                );
                              }}
                              placeholder="Optional"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <DialogFooter>
                    <Button type="submit">
                      {isEditingClassification ? "Save Changes" : "Add Entry"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* CSV Upload Dialog */}
          <Dialog open={csvUploadDialogOpen} onOpenChange={setCsvUploadDialogOpen}>
            <DialogContent className="w-full max-w-[95vw] sm:max-w-[500px] overflow-hidden">
              <DialogHeader>
                <DialogTitle>Upload Classification Data</DialogTitle>
                <DialogDescription>
                  Upload a CSV file with team classification data. The file should have columns for team name and points.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                  <Label htmlFor="csv-file">CSV File</Label>
                  <Input
                    id="csv-file"
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setCsvFile(e.target.files[0]);
                      }
                    }}
                  />
                  <p className="text-sm text-muted-foreground">
                    Required format: "Team,Points" with optional columns for games played, won, drawn, lost, and goals.
                  </p>
                </div>
                
                <div className="rounded-md bg-muted p-3">
                  <div className="text-sm font-medium">Example CSV Format:</div>
                  <div className="max-h-28 overflow-y-auto">
                    <pre className="mt-2 text-xs text-muted-foreground whitespace-pre overflow-x-auto break-all px-2">
                      Team,Points,GamesPlayed,GamesWon,GamesDrawn,GamesLost,GoalsFor,GoalsAgainst<br />
                      Team A,21,10,7,0,3,22,12<br />
                      Team B,18,10,6,0,4,20,15<br />
                      Team C,15,10,5,0,5,17,18
                    </pre>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  Need a template?{" "}
                  <Button variant="link" className="p-0 h-auto" onClick={generateSampleCsv}>
                    Download sample CSV
                  </Button>
                </p>
              </div>
              <DialogFooter>
                <Button type="button" onClick={handleCsvUpload}>
                  Upload and Process
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Match delete confirmation */}
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the match against{" "}
                  {matchToDelete?.opponentName}. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteMatch}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Classification delete confirmation */}
          <AlertDialog 
            open={deleteClassificationDialogOpen} 
            onOpenChange={setDeleteClassificationDialogOpen}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the classification entry for{" "}
                  {classificationToDelete?.externalTeamName}. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteClassification}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Match details dialog */}
          <Dialog
            open={!!selectedMatch}
            onOpenChange={(open) => {
              if (!open) setSelectedMatch(null);
            }}
          >
            <DialogContent className="sm:max-w-[600px]">
              {selectedMatch && selectedTeam && <MatchDetails match={selectedMatch} teamId={selectedTeam.id} onUpdate={refetchMatchesData} />}
            </DialogContent>
          </Dialog>
        </main>
      </div>
      <MobileNavigation />
    </div>
  );
}