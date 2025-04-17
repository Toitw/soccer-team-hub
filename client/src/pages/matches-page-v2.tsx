import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Team, Match, LeagueClassification } from "@shared/schema";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import MobileNavigation from "@/components/mobile-navigation";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
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
  Info as InfoIcon,
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
  position: z
    .number()
    .int()
    .min(1, "Position must be a positive number")
    .optional()
    .nullable(),
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
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("upcoming");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [matchToDelete, setMatchToDelete] = useState<Match | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  // Classification states
  const [classificationDialogOpen, setClassificationDialogOpen] =
    useState(false);
  const [editingClassification, setEditingClassification] =
    useState<LeagueClassification | null>(null);
  const [isEditingClassification, setIsEditingClassification] = useState(false);
  const [deleteClassificationDialogOpen, setDeleteClassificationDialogOpen] =
    useState(false);
  const [classificationToDelete, setClassificationToDelete] =
    useState<LeagueClassification | null>(null);
  const [csvUploadDialogOpen, setCsvUploadDialogOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);

  // Define forms
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

  // React Query client
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
      const response = await fetch(`/api/teams/${selectedTeam.id}/matches`);
      if (!response.ok) {
        throw new Error("Failed to fetch matches");
      }
      return response.json();
    },
  });

  const {
    data: classifications,
    isLoading: classificationsLoading,
    refetch: refetchClassifications,
  } = useQuery<LeagueClassification[]>({
    queryKey: ["classifications", selectedTeam?.id],
    enabled: !!selectedTeam,
    queryFn: async () => {
      if (!selectedTeam) return [];
      const response = await fetch(
        `/api/teams/${selectedTeam.id}/classifications`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch league classifications");
      }
      return response.json();
    },
  });

  // Function to refetch all match-related data
  const refetchMatchesData = () => {
    refetchMatches();
    refetchClassifications();
  };

  useEffect(() => {
    if (editingMatch) {
      const matchDate = new Date(editingMatch.matchDate)
        .toISOString()
        .slice(0, 16);
      form.reset({
        opponentName: editingMatch.opponentName,
        matchDate,
        location: editingMatch.location,
        isHome: editingMatch.isHome,
        notes: editingMatch.notes || "",
        status: editingMatch.status,
        matchType: editingMatch.matchType,
        goalsScored: editingMatch.goalsScored,
        goalsConceded: editingMatch.goalsConceded,
      });
    } else {
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
  }, [editingMatch, form]);

  useEffect(() => {
    if (editingClassification) {
      classificationForm.reset({
        externalTeamName: editingClassification.externalTeamName,
        points: editingClassification.points,
        position: editingClassification.position,
        gamesPlayed: editingClassification.gamesPlayed,
        gamesWon: editingClassification.gamesWon,
        gamesDrawn: editingClassification.gamesDrawn,
        gamesLost: editingClassification.gamesLost,
        goalsFor: editingClassification.goalsFor,
        goalsAgainst: editingClassification.goalsAgainst,
      });
    } else {
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
    }
  }, [editingClassification, classificationForm]);

  // Filter matches into upcoming and past
  const upcomingMatches =
    matches?.filter(
      (match) =>
        !isPast(new Date(match.matchDate)) ||
        match.status === "scheduled" ||
        match.status === "ongoing",
    ) || [];

  const pastMatches =
    matches?.filter(
      (match) =>
        (isPast(new Date(match.matchDate)) &&
          match.status !== "scheduled" &&
          match.status !== "ongoing") ||
        match.status === "completed" ||
        match.status === "cancelled",
    ) || [];

  // Handle dialog changes for match creation/editing
  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setIsEditing(false);
      setEditingMatch(null);
      form.reset();
    }
  };

  // Handle dialog changes for classification creation/editing
  const handleClassificationDialogChange = (open: boolean) => {
    setClassificationDialogOpen(open);
    if (!open) {
      setIsEditingClassification(false);
      setEditingClassification(null);
      classificationForm.reset();
    }
  };

  // Handle dialog changes for CSV upload
  const handleCsvUploadDialogChange = (open: boolean) => {
    setCsvUploadDialogOpen(open);
    if (!open) {
      setCsvFile(null);
    }
  };

  // Function to generate a sample CSV file for classification
  const generateSampleCsv = () => {
    const headers =
      "Team,Points,Position,GamesPlayed,GamesWon,GamesDrawn,GamesLost,GoalsFor,GoalsAgainst";
    const data = `Team A,10,1,5,3,1,1,12,5
Team B,7,2,5,2,1,2,8,7
Team C,5,3,5,1,2,2,6,8
Team D,2,4,5,0,2,3,4,10`;

    const csvContent = `${headers}\n${data}`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "classification_sample.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // Helper function to handle CSV file uploads
  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCsvFile(e.target.files[0]);
    }
  };

  // Handle CSV upload
  const handleCsvUpload = async () => {
    if (!csvFile || !selectedTeam) {
      toast({
        title: "Error",
        description: "Please select a CSV file to upload",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", csvFile);

    try {
      const response = await fetch(
        `/api/teams/${selectedTeam.id}/classifications/import`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        throw new Error("Failed to upload CSV file");
      }

      toast({
        title: t("matches.csvUploadSuccess"),
        description: t("matches.csvUploadSuccessDescription"),
      });

      // Refetch classifications
      refetchClassifications();
      setCsvUploadDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "An unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const handleEditClassification = (classification: LeagueClassification) => {
    setEditingClassification(classification);
    setIsEditingClassification(true);
    setClassificationDialogOpen(true);
  };

  const confirmDeleteClassification = (
    classification: LeagueClassification,
  ) => {
    setClassificationToDelete(classification);
    setDeleteClassificationDialogOpen(true);
  };

  const onClassificationSubmit = async (data: ClassificationFormData) => {
    if (!selectedTeam) return;

    try {
      const url = isEditingClassification
        ? `/api/teams/${selectedTeam.id}/classifications/${editingClassification?.id}`
        : `/api/teams/${selectedTeam.id}/classifications`;

      const method = isEditingClassification ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to save classification");
      }

      toast({
        title: isEditingClassification
          ? t("matches.classificationUpdated")
          : t("matches.classificationAdded"),
        description: isEditingClassification
          ? t("matches.classificationUpdatedDescription")
          : t("matches.classificationAddedDescription"),
      });

      // Refetch classifications
      refetchClassifications();
      setClassificationDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "An unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const deleteClassification = async (
    classification: LeagueClassification,
  ) => {
    if (!selectedTeam) return;

    try {
      const response = await fetch(
        `/api/teams/${selectedTeam.id}/classifications/${classification.id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete classification");
      }

      toast({
        title: t("matches.classificationDeleted"),
        description: t("matches.classificationDeletedDescription"),
      });

      // Refetch classifications
      refetchClassifications();
      setDeleteClassificationDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "An unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const handleEditMatch = (match: Match) => {
    setEditingMatch(match);
    setIsEditing(true);
    setDialogOpen(true);
  };

  const confirmDelete = (match: Match) => {
    setMatchToDelete(match);
    setDeleteDialogOpen(true);
  };

  const deleteMatch = async (match: Match) => {
    if (!selectedTeam) return;

    try {
      const response = await fetch(
        `/api/teams/${selectedTeam.id}/matches/${match.id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete match");
      }

      toast({
        title: t("matches.matchDeleted"),
        description: t("matches.matchDeletedDescription"),
      });

      // Refetch matches
      refetchMatches();
      setDeleteDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "An unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (data: MatchFormData) => {
    if (!selectedTeam) return;

    try {
      const url = isEditing
        ? `/api/teams/${selectedTeam.id}/matches/${editingMatch?.id}`
        : `/api/teams/${selectedTeam.id}/matches`;

      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          teamId: selectedTeam.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save match");
      }

      toast({
        title: isEditing ? t("matches.matchUpdated") : t("matches.matchAdded"),
        description: isEditing
          ? t("matches.matchUpdatedDescription")
          : t("matches.matchAddedDescription"),
      });

      // Refetch matches
      refetchMatches();
      setDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "An unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const checkAndUpdateMatchStatus = async (match: Match) => {
    if (
      match.status === "scheduled" &&
      isPast(new Date(match.matchDate)) &&
      !match.goalsScored &&
      !match.goalsConceded
    ) {
      // Show match details
      setSelectedMatch(match);
    } else {
      // Display match details directly
      setSelectedMatch(match);
    }
  };

  const renderMatchCard = (match: Match) => {
    const matchDate = new Date(match.matchDate);
    const isPastMatch = isPast(matchDate);
    const homeTeam = match.isHome ? selectedTeam?.name : match.opponentName;
    const awayTeam = match.isHome ? match.opponentName : selectedTeam?.name;
    const homeGoals = match.isHome ? match.goalsScored : match.goalsConceded;
    const awayGoals = match.isHome ? match.goalsConceded : match.goalsScored;
    const showScore =
      match.status === "completed" && homeGoals !== null && awayGoals !== null;
    
    return (
      <Card
        key={match.id}
        className={`transition-all hover:shadow-md ${
          match.status === "cancelled" ? "opacity-70" : ""
        }`}
      >
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center space-x-2">
                <Badge
                  variant={match.matchType === "friendly" ? "outline" : "default"}
                  className={
                    match.matchType === "league"
                      ? "bg-blue-500"
                      : match.matchType === "copa"
                      ? "bg-amber-500"
                      : ""
                  }
                >
                  {match.matchType === "league"
                    ? t("matches.official")
                    : match.matchType === "copa"
                    ? t("matches.tournament")
                    : t("matches.friendly")}
                </Badge>
                {match.status === "completed" && (
                  <Badge variant="outline" className="bg-green-500 text-white">
                    {t("matches.completed")}
                  </Badge>
                )}
                {match.status === "cancelled" && (
                  <Badge variant="outline" className="bg-red-500 text-white">
                    {t("matches.cancelled")}
                  </Badge>
                )}
                {match.status === "scheduled" && isPastMatch && (
                  <Badge variant="outline" className="bg-orange-500 text-white">
                    {t("matches.pendingResult")}
                  </Badge>
                )}
              </div>
              <div className="flex items-center mt-2 text-muted-foreground">
                <Clock className="h-4 w-4 mr-1" />
                <span className="text-sm">
                  {format(matchDate, "PPp")}
                </span>
              </div>
              <div className="flex items-center mt-1 text-muted-foreground">
                <MapPin className="h-4 w-4 mr-1" />
                <span className="text-sm">{match.location}</span>
              </div>
            </div>
            {canManage && (
              <div className="flex space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEditMatch(match)}
                >
                  <ClipboardEdit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => confirmDelete(match)}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                <Home className="h-4 w-4 text-primary" />
              </div>
              <span className="font-medium">{homeTeam}</span>
            </div>
            {showScore ? (
              <div className="text-xl font-bold">
                {homeGoals} - {awayGoals}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                {isPastMatch ? t("matches.pendingResult") : t("matches.upcoming")}
              </div>
            )}
            <div className="flex items-center space-x-2">
              <span className="font-medium">{awayTeam}</span>
              <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                <Trophy className="h-4 w-4 text-primary" />
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="pt-0">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => checkAndUpdateMatchStatus(match)}
          >
            <InfoIcon className="h-4 w-4 mr-2" />
            {t("matches.viewDetails")}
            <ChevronRight className="h-4 w-4 ml-auto" />
          </Button>
        </CardFooter>
      </Card>
    );
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 ml-0 md:ml-64 z-30 flex flex-col">
        <Header title="Matches" />
        
        <div className="flex flex-col h-full overflow-hidden">
          {/* Fixed header section with title and add button */}
          <div className="sticky top-0 z-10 bg-background p-4 md:p-6 pb-0">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-bold">{t("matches.matches")}</h1>
              {canManage && (
                <Button onClick={() => setDialogOpen(true)}>
                  <PlusCircle className="h-4 w-4 mr-2" /> {t("matches.addMatch")}
                </Button>
              )}
            </div>

            {/* Fixed tabs navigation */}
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex flex-col h-full"
            >
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="upcoming">
                  <Calendar className="h-4 w-4 mr-2" /> {t("matches.upcomingMatches")}
                </TabsTrigger>
                <TabsTrigger value="past">
                  <Trophy className="h-4 w-4 mr-2" /> {t("matches.pastMatches")}
                </TabsTrigger>
                <TabsTrigger value="classification">{t("matches.leagueClassification")}</TabsTrigger>
              </TabsList>

              {/* Scrollable content area */}
              <div className="overflow-y-auto pb-16 px-4 md:px-6 -mx-4 md:-mx-6">
                <TabsContent value="upcoming" className="space-y-4 mt-4">
                  {upcomingMatches && upcomingMatches.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                      {upcomingMatches.map((match) => renderMatchCard(match))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <p className="text-muted-foreground">
                          {t("matches.noMatches")}
                        </p>
                        {canManage && (
                          <Button
                            variant="outline"
                            className="mt-4"
                            onClick={() => setDialogOpen(true)}
                          >
                            <PlusCircle className="h-4 w-4 mr-2" /> {t("matches.addMatch")}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="past" className="space-y-4 mt-4">
                  {pastMatches && pastMatches.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                      {pastMatches.map((match) => renderMatchCard(match))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <p className="text-muted-foreground">
                          {t("matches.noMatches")}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="classification" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle>{t("matches.classificationSection.title")}</CardTitle>
                          <CardDescription>
                            {t("matches.classificationSection.description")}
                          </CardDescription>
                        </div>
                        {canManage && (
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setClassificationDialogOpen(true)}
                            >
                              <PlusSquare className="h-4 w-4 mr-1" /> {t("matches.classificationSection.addEntry")}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCsvUploadDialogOpen(true)}
                            >
                              <Upload className="h-4 w-4 mr-1" /> {t("matches.classificationSection.uploadCsv")}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={generateSampleCsv}
                            >
                              <FileText className="h-4 w-4 mr-1" /> {t("matches.classificationSection.sampleCsv")}
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                      {classifications && classifications.length > 0 ? (
                        <Table className="w-full min-w-[700px] md:min-w-full">
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12 truncate">{t("matches.classificationSection.position")}</TableHead>
                              <TableHead className="truncate">{t("matches.classificationSection.team")}</TableHead>
                              <TableHead className="text-center truncate">
                                {t("matches.classificationSection.points")}
                              </TableHead>
                              <TableHead className="text-center truncate">
                                {t("matches.classificationSection.played")}
                              </TableHead>
                              <TableHead className="text-center truncate">
                                {t("matches.classificationSection.won")}
                              </TableHead>
                              <TableHead className="text-center truncate">
                                {t("matches.classificationSection.drawn")}
                              </TableHead>
                              <TableHead className="text-center truncate">
                                {t("matches.classificationSection.lost")}
                              </TableHead>
                              <TableHead className="text-center truncate">
                                {t("matches.classificationSection.goalsFor")}
                              </TableHead>
                              <TableHead className="text-center truncate">
                                {t("matches.classificationSection.goalsAgainst")}
                              </TableHead>
                              <TableHead className="text-center truncate">
                                {t("matches.classificationSection.goalDifference")}
                              </TableHead>
                              {canManage && (
                                <TableHead className="truncate">{t("matches.classificationSection.actions")}</TableHead>
                              )}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {classifications
                              .sort((a, b) =>
                                a.position !== null && b.position !== null
                                  ? a.position - b.position
                                  : b.points - a.points,
                              )
                              .map((classification) => {
                                const goalsFor = classification.goalsFor || 0;
                                const goalsAgainst =
                                  classification.goalsAgainst || 0;
                                const goalDifference = goalsFor - goalsAgainst;
                                return (
                                  <TableRow key={classification.id}>
                                    <TableCell className="font-medium truncate">
                                      {classification.position || "-"}
                                    </TableCell>
                                    <TableCell className="truncate">
                                      {classification.externalTeamName}
                                    </TableCell>
                                    <TableCell className="text-center font-bold truncate">
                                      {classification.points}
                                    </TableCell>
                                    <TableCell className="text-center truncate">
                                      {classification.gamesPlayed || "-"}
                                    </TableCell>
                                    <TableCell className="text-center truncate">
                                      {classification.gamesWon || "-"}
                                    </TableCell>
                                    <TableCell className="text-center truncate">
                                      {classification.gamesDrawn || "-"}
                                    </TableCell>
                                    <TableCell className="text-center truncate">
                                      {classification.gamesLost || "-"}
                                    </TableCell>
                                    <TableCell className="text-center truncate">
                                      {classification.goalsFor || "-"}
                                    </TableCell>
                                    <TableCell className="text-center truncate">
                                      {classification.goalsAgainst || "-"}
                                    </TableCell>
                                    <TableCell className="text-center truncate">
                                      {goalDifference > 0
                                        ? `+${goalDifference}`
                                        : goalDifference}
                                    </TableCell>
                                    {canManage && (
                                      <TableCell className="truncate">
                                        <div className="flex space-x-2 justify-center">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() =>
                                              handleEditClassification(
                                                classification,
                                              )
                                            }
                                          >
                                            <ClipboardEdit className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() =>
                                              confirmDeleteClassification(
                                                classification,
                                              )
                                            }
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
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-muted-foreground">
                            {t("matches.noClassificationData")}
                          </p>
                          {canManage && (
                            <div className="flex flex-col space-y-2 mt-4 max-w-xs mx-auto">
                              <Button
                                variant="outline"
                                onClick={() => setClassificationDialogOpen(true)}
                              >
                                <PlusSquare className="h-4 w-4 mr-2" /> {t("matches.addManually")}
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => setCsvUploadDialogOpen(true)}
                              >
                                <Upload className="h-4 w-4 mr-2" /> {t("matches.uploadCSV")}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Match creation/editing dialog */}
          <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
            <DialogContent className="w-full max-w-[95vw] overflow-y-auto max-h-[90vh] sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {isEditing ? t("matches.editMatch") : t("matches.addMatch")}
                </DialogTitle>
                <DialogDescription>
                  {isEditing
                    ? t("matches.editMatchDescription")
                    : t("matches.addMatchDescription")}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="opponentName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("matches.opponent")}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={t("matches.enterOpponentName")} />
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
                        <FormLabel>{t("matches.date")} & {t("matches.time")}</FormLabel>
                        <FormControl>
                          <Input {...field} type="datetime-local" />
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
                        <FormLabel>{t("matches.matchType")}</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t("matches.selectMatchType")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="friendly">{t("matches.friendly")}</SelectItem>
                            <SelectItem value="league">{t("matches.official")}</SelectItem>
                            <SelectItem value="copa">{t("matches.tournament")}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("matches.location")}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={t("matches.enterLocation")} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isHome"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="h-4 w-4 mt-1"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t("matches.homeMatch")}</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            {t("matches.homeMatchDescription")}
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />

                  {isEditing && (
                    <>
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("matches.status")}</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={t("matches.selectStatus")} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="scheduled">{t("matches.scheduled")}</SelectItem>
                                <SelectItem value="completed">{t("matches.completed")}</SelectItem>
                                <SelectItem value="cancelled">{t("matches.cancelled")}</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {form.watch("status") === "completed" && (
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="goalsScored"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  {form.watch("isHome")
                                    ? t("matches.homeGoals")
                                    : t("matches.awayGoals")}
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    {...field}
                                    min={0}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      field.onChange(
                                        value === ""
                                          ? null
                                          : parseInt(value, 10),
                                      );
                                    }}
                                    value={
                                      field.value === null
                                        ? ""
                                        : field.value.toString()
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
                                <FormLabel>
                                  {form.watch("isHome")
                                    ? t("matches.awayGoals")
                                    : t("matches.homeGoals")}
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    {...field}
                                    min={0}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      field.onChange(
                                        value === ""
                                          ? null
                                          : parseInt(value, 10),
                                      );
                                    }}
                                    value={
                                      field.value === null
                                        ? ""
                                        : field.value.toString()
                                    }
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </>
                  )}

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("matches.notes")}</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder={t("matches.enterNotesOptional")}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit">
                      {isEditing ? t("common.save") : t("common.create")}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Classification creation/editing dialog */}
          <Dialog open={classificationDialogOpen} onOpenChange={handleClassificationDialogChange}>
            <DialogContent className="w-full max-w-[95vw] overflow-y-auto max-h-[90vh] sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {isEditingClassification
                    ? t("matches.classificationSection.editEntry")
                    : t("matches.classificationSection.addEntry")}
                </DialogTitle>
                <DialogDescription>
                  {isEditingClassification
                    ? t("matches.classificationSection.editEntryDescription")
                    : t("matches.classificationSection.addEntryDescription")}
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
                        <FormLabel>{t("matches.classificationSection.team")}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={t("matches.classificationSection.enterTeamName")} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={classificationForm.control}
                      name="position"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("matches.classificationSection.position")}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              min={1}
                              onChange={(e) => {
                                const value = e.target.value;
                                field.onChange(
                                  value === ""
                                    ? null
                                    : parseInt(value, 10),
                                );
                              }}
                              value={
                                field.value === null
                                  ? ""
                                  : field.value.toString()
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={classificationForm.control}
                      name="points"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("matches.classificationSection.points")}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              min={0}
                              onChange={(e) =>
                                field.onChange(parseInt(e.target.value, 10) || 0)
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={classificationForm.control}
                      name="gamesPlayed"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("matches.classificationSection.played")}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              min={0}
                              onChange={(e) => {
                                const value = e.target.value;
                                field.onChange(
                                  value === ""
                                    ? null
                                    : parseInt(value, 10),
                                );
                              }}
                              value={
                                field.value === null
                                  ? ""
                                  : field.value.toString()
                              }
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
                          <FormLabel>{t("matches.classificationSection.won")}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              min={0}
                              onChange={(e) => {
                                const value = e.target.value;
                                field.onChange(
                                  value === ""
                                    ? null
                                    : parseInt(value, 10),
                                );
                              }}
                              value={
                                field.value === null
                                  ? ""
                                  : field.value.toString()
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={classificationForm.control}
                      name="gamesDrawn"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("matches.classificationSection.drawn")}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              min={0}
                              onChange={(e) => {
                                const value = e.target.value;
                                field.onChange(
                                  value === ""
                                    ? null
                                    : parseInt(value, 10),
                                );
                              }}
                              value={
                                field.value === null
                                  ? ""
                                  : field.value.toString()
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={classificationForm.control}
                      name="gamesLost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("matches.classificationSection.lost")}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              min={0}
                              onChange={(e) => {
                                const value = e.target.value;
                                field.onChange(
                                  value === ""
                                    ? null
                                    : parseInt(value, 10),
                                );
                              }}
                              value={
                                field.value === null
                                  ? ""
                                  : field.value.toString()
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={classificationForm.control}
                      name="goalsFor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("matches.classificationSection.goalsFor")}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              min={0}
                              onChange={(e) => {
                                const value = e.target.value;
                                field.onChange(
                                  value === ""
                                    ? null
                                    : parseInt(value, 10),
                                );
                              }}
                              value={
                                field.value === null
                                  ? ""
                                  : field.value.toString()
                              }
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
                          <FormLabel>{t("matches.classificationSection.goalsAgainst")}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              min={0}
                              onChange={(e) => {
                                const value = e.target.value;
                                field.onChange(
                                  value === ""
                                    ? null
                                    : parseInt(value, 10),
                                );
                              }}
                              value={
                                field.value === null
                                  ? ""
                                  : field.value.toString()
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit">
                      {isEditingClassification ? t("common.save") : t("common.create")}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Classification CSV upload dialog */}
          <Dialog open={csvUploadDialogOpen} onOpenChange={handleCsvUploadDialogChange}>
            <DialogContent className="w-full max-w-[95vw] overflow-y-auto max-h-[90vh] sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{t("matches.uploadCSV")}</DialogTitle>
                <DialogDescription>
                  {t("matches.uploadCSVDescription")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Label htmlFor="csvfile">{t("matches.csvFile")}</Label>
                <Input
                  id="csvfile"
                  type="file"
                  accept=".csv"
                  onChange={handleCsvFileChange}
                />
                <p className="text-sm text-muted-foreground">
                  {t("matches.csvFormatDescription")}
                </p>
                <Button
                  onClick={generateSampleCsv}
                  variant="outline"
                  className="w-full"
                >
                  <FileText className="h-4 w-4 mr-2" /> {t("matches.downloadSampleCSV")}
                </Button>
              </div>
              <DialogFooter>
                <Button onClick={handleCsvUpload} disabled={!csvFile}>
                  {t("matches.upload")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Match deletion confirmation dialog */}
          <AlertDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("matches.confirmDelete")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("matches.confirmDeleteDescription")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => matchToDelete && deleteMatch(matchToDelete)}
                >
                  {t("common.delete")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Classification deletion confirmation dialog */}
          <AlertDialog
            open={deleteClassificationDialogOpen}
            onOpenChange={setDeleteClassificationDialogOpen}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("matches.classificationSection.confirmDelete")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("matches.classificationSection.confirmDeleteDescription")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    classificationToDelete &&
                    deleteClassification(classificationToDelete)
                  }
                >
                  {t("common.delete")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Match details dialog */}
          <Dialog
            open={!!selectedMatch}
            onOpenChange={(open) => !open && setSelectedMatch(null)}
          >
            <DialogContent className="w-full max-w-[95vw] h-[80vh] p-0 sm:max-w-[900px]">
              {selectedMatch && (
                <MatchDetails
                  match={selectedMatch}
                  teamId={selectedTeam.id}
                  onUpdate={refetchMatchesData}
                />
              )}
            </DialogContent>
          </Dialog>
        </div>
        <MobileNavigation />
      </div>
    </div>
  );
}