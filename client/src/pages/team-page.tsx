import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Team,
  TeamMember,
  User,
  User as SelectUser,
  InsertTeamMember,
  MemberClaim,
} from "@shared/schema";
import { MemberClaimButton } from "@/components/team/MemberClaimButton";
import MemberClaimsManager from "@/components/team/MemberClaimsManager";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import MobileNavigation from "@/components/mobile-navigation";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Loader2,
  UserPlus,
  UserCog,
  Shield,
  UserCircle,
  Mail,
  Phone,
  AlertCircle,
  Search,
  Filter,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";

// Define a type that includes user data with our extended fields
interface TeamMemberWithUser extends TeamMember {
  user: Omit<SelectUser, "password"> & {
    profilePicture?: string | null;
    position?: string;
    jerseyNumber?: number;
    email?: string;
    phoneNumber?: string;
  };
}

// Schema for adding a team member
const addTeamMemberSchema = z.object({
  fullName: z.string().min(3, "Full name must be at least 3 characters"),
  role: z.enum(["coach", "player", "colaborador"]),
  position: z.string().optional(),
  jerseyNumber: z.coerce.number().int().optional(),
  profilePicture: z
    .union([z.string().url(), z.string().length(0), z.null(), z.undefined()])
    .optional(),
});

// Schema for editing a team member
const editTeamMemberSchema = z.object({
  role: z.enum(["coach", "player", "colaborador"]),
  position: z.string().optional(),
  jerseyNumber: z.coerce.number().int().optional(),
  profilePicture: z
    .union([z.string().url(), z.string().length(0), z.null(), z.undefined()])
    .optional(),
});

type AddTeamMemberFormData = z.infer<typeof addTeamMemberSchema>;
type EditTeamMemberFormData = z.infer<typeof editTeamMemberSchema>;

// Type for the simplified payload sent to the server
interface SimplifiedMemberPayload {
  role: "coach" | "player" | "colaborador";
  user: {
    fullName: string;
    position?: string;
    jerseyNumber?: number;
    profilePicture?: string | null | undefined;
  };
}

export default function TeamPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [openAddMemberDialog, setOpenAddMemberDialog] = useState(false);
  const [openEditMemberDialog, setOpenEditMemberDialog] = useState(false);
  const [openRemoveMemberDialog, setOpenRemoveMemberDialog] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<TeamMemberWithUser | null>(
    null,
  );
  const [memberToRemove, setMemberToRemove] =
    useState<TeamMemberWithUser | null>(null);
  

  const { data: teams, isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  // Select the first team by default
  const selectedTeam = teams && teams.length > 0 ? teams[0] : null;

  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedFormation, setSelectedFormation] = useState<string>("4-3-3");
  const [lineup, setLineup] = useState<{
    [position: string]: TeamMemberWithUser | null;
  }>({});

  useEffect(() => {
    if (selectedTeam?.teamType) {
      setSelectedFormation(
        selectedTeam.teamType === "Futsal" ? "5a-1-2-1" : 
        selectedTeam.teamType === "7-a-side" ? "7a-2-3-1" : 
        "4-3-3"
      );
    }
  }, [selectedTeam?.teamType]);
  
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [showAddToLineupDialog, setShowAddToLineupDialog] =
    useState<boolean>(false);
  const [isSavingLineup, setIsSavingLineup] = useState<boolean>(false);



  // Fetch team lineup
  const teamLineupQueryKey = ["/api/teams", selectedTeam?.id, "lineup"];
  const { data: teamLineup, isLoading: teamLineupLoading } = useQuery({
    queryKey: teamLineupQueryKey,
    queryFn: async () => {
      if (!selectedTeam?.id) return null;
      try {
        const response = await fetch(`/api/teams/${selectedTeam.id}/lineup`, {
          credentials: "include",
        });
        if (!response.ok) {
          if (response.status === 404) {
            // Lineup not found, this is okay
            return null;
          }
          throw new Error(`Failed to fetch team lineup: ${response.statusText}`);
        }
        return await response.json();
      } catch (error) {
        console.error("Error fetching team lineup:", error);
        return null;
      }
    },
    enabled: !!selectedTeam?.id,
    retry: 1,
    staleTime: 1000 * 60 * 5,
  });

  // Get team members
  const teamMembersQueryKey = ["/api/teams", selectedTeam?.id, "members"];
  const { data: teamMembers, isLoading: teamMembersLoading } = useQuery<
    TeamMemberWithUser[]
  >({
    queryKey: teamMembersQueryKey,
    queryFn: async () => {
      if (!selectedTeam?.id) return [];
      console.log(`Fetching team members for team ${selectedTeam.id}`);
      const response = await fetch(`/api/teams/${selectedTeam.id}/members`, {
        credentials: "include",
      });
      if (!response.ok) {
        if (response.status === 401) {
          console.error("Authorization error: User not authenticated");
          return [];
        }
        throw new Error(`Failed to fetch team members: ${response.statusText}`);
      }
      const members = await response.json();
      console.log(`Retrieved ${members.length} team members for team ${selectedTeam.id}`);
      return members;
    },
    enabled: !!selectedTeam?.id,
    retry: 1,
    staleTime: 1000 * 60 * 5,
  });

  // Filtered team members based on role and search query
  const filteredTeamMembers = useMemo(() => {
    if (!teamMembers) return [];
    return teamMembers.filter((member) => {
      const roleMatch = roleFilter === "all" || member.role === roleFilter;
      const searchMatch =
        searchQuery === "" ||
        member.user.fullName
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        member.user.username
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        member.user.position?.toLowerCase().includes(searchQuery.toLowerCase());
      return roleMatch && searchMatch;
    });
  }, [teamMembers, roleFilter, searchQuery]);

  // Form for adding a new team member
  const form = useForm<AddTeamMemberFormData>({
    resolver: zodResolver(addTeamMemberSchema),
    defaultValues: {
      fullName: "",
      role: "player",
      position: "",
      jerseyNumber: undefined,
      profilePicture: "",
    },
  });

  // Form for editing an existing team member
  const editForm = useForm<EditTeamMemberFormData>({
    resolver: zodResolver(editTeamMemberSchema),
    defaultValues: {
      role: "player",
      position: "",
      jerseyNumber: undefined,
      profilePicture: "",
    },
  });

  // Update the edit form when memberToEdit changes
  useEffect(() => {
    if (memberToEdit) {
      editForm.reset({
        role: memberToEdit.role as "coach" | "player" | "colaborador",
        position: memberToEdit.user.position || "",
        jerseyNumber: memberToEdit.user.jerseyNumber || undefined,
        profilePicture: memberToEdit.user.profilePicture || "",
      });
    }
  }, [memberToEdit, editForm]);

  // Remove team member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: number) => {
      if (!selectedTeam) throw new Error("No team selected");
      return apiRequest(`/api/teams/${selectedTeam.id}/members/${memberId}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      toast({
        title: "Team member removed",
        description: "The team member has been removed successfully.",
      });
      setOpenRemoveMemberDialog(false);
      setMemberToRemove(null);
      queryClient.invalidateQueries({
        queryKey: ["/api/teams", selectedTeam?.id, "members"],
      });
    },
    onError: (error) => {
      toast({
        title: "Error removing team member",
        description:
          error.message || "There was an error removing the team member.",
        variant: "destructive",
      });
    },
  });

  const handleRemoveMember = () => {
    if (memberToRemove) {
      removeMemberMutation.mutate(memberToRemove.id);
    }
  };

  // Add team member mutation
  const addTeamMemberMutation = useMutation({
    mutationFn: async (data: SimplifiedMemberPayload) => {
      if (!selectedTeam) throw new Error("No team selected");
      console.log("Sending team member creation request:", {
        teamId: selectedTeam.id,
        payload: data
      });
      return apiRequest(`/api/teams/${selectedTeam.id}/members`, {
        method: "POST",
        data: {
          role: data.role,
          user: {
            fullName: data.user.fullName,
            position: data.user.position,
            jerseyNumber: data.user.jerseyNumber,
            profilePicture: data.user.profilePicture,
          },
        }
      });
    },
    onSuccess: (data) => {
      console.log("Team member added successfully. Response data:", data);
      toast({
        title: "Team member added",
        description: "The new team member has been added successfully.",
      });
      setOpenAddMemberDialog(false);
      form.reset();
      console.log("Invalidating query for team members with key:", ["/api/teams", selectedTeam?.id, "members"]);
      queryClient.invalidateQueries({
        queryKey: ["/api/teams", selectedTeam?.id, "members"],
      });
      // Force a refetch to ensure the latest data
      setTimeout(() => {
        console.log("Refetching team members after short delay");
        queryClient.fetchQuery({
          queryKey: ["/api/teams", selectedTeam?.id, "members"]
        });
      }, 300);
    },
    onError: (error) => {
      toast({
        title: "Error adding team member",
        description:
          error.message || "There was an error adding the team member.",
        variant: "destructive",
      });
    },
  });

  // Edit team member mutation
  const editTeamMemberMutation = useMutation({
    mutationFn: async (data: EditTeamMemberFormData) => {
      if (!selectedTeam || !memberToEdit)
        throw new Error("No team or member selected");
      return apiRequest(`/api/teams/${selectedTeam.id}/members/${memberToEdit.id}`, {
        method: "PATCH",
        data: {
          role: data.role,
          position: data.position,
          jerseyNumber: data.jerseyNumber,
          profilePicture: data.profilePicture,
        },
      });
    },
    onSuccess: () => {
      toast({
        title: "Team member updated",
        description: "The team member has been updated successfully.",
      });
      setOpenEditMemberDialog(false);
      setMemberToEdit(null);
      queryClient.invalidateQueries({
        queryKey: ["/api/teams", selectedTeam?.id, "members"],
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating team member",
        description:
          error.message || "There was an error updating the team member.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AddTeamMemberFormData) => {
    if (!selectedTeam) {
      toast({
        title: "Error",
        description: "No team selected",
        variant: "destructive",
      });
      return;
    }
    const fullName = data.fullName || "Team Member";
    const role = data.role || "player";
    let position = data.position;
    if (position === "none" || !position) position = "";
    const payload: SimplifiedMemberPayload = {
      role,
      user: {
        fullName,
        position,
        jerseyNumber: data.jerseyNumber || undefined,
        profilePicture: data.profilePicture || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png",
      },
    };
    addTeamMemberMutation.mutate(payload);
  };

  const onEditSubmit = (data: EditTeamMemberFormData) => {
    if (!selectedTeam || !memberToEdit) {
      toast({
        title: "Error",
        description: "No team or member selected to edit",
        variant: "destructive",
      });
      return;
    }
    let position = data.position;
    if (position === "none" || !position) position = "";
    editTeamMemberMutation.mutate({ ...data, position });
  };

  const onRemoveSubmit = () => {
    if (memberToRemove) {
      removeMemberMutation.mutate(memberToRemove.id);
    }
  };

  // Expanded vertical spacing: GK at 95%, defenders at 70%, midfielders at 45%, forwards at 10%
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
      positions.push({ id: "gk", label: "GK", top: 82, left: 50 });

      // Add defenders - wider spacing for fewer players
      const defenderWidth = 90 / (defenders + 1);
      for (let i = 1; i <= defenders; i++) {
        positions.push({
          id: `def-${i}`,
          label: "DEF",
          top: 60,
          left: 5 + i * defenderWidth,
        });
      }

      // Add midfielders - wider spacing for fewer players
      const midfielderWidth = 90 / (midfielders + 1);
      for (let i = 1; i <= midfielders; i++) {
        positions.push({
          id: `mid-${i}`,
          label: "MID",
          top: 35,
          left: 5 + i * midfielderWidth,
        });
      }

      // Add forwards - wider spacing for fewer players
      const forwardWidth = 90 / (forwards + 1); 
      for (let i = 1; i <= forwards; i++) {
        positions.push({
          id: `fwd-${i}`,
          label: "FWD",
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
      positions.push({ id: "gk", label: "GK", top: 82, left: 50 });

      // Add defenders - wider spacing for even fewer players
      const defenderWidth = 90 / (defenders + 1);
      for (let i = 1; i <= defenders; i++) {
        positions.push({
          id: `def-${i}`,
          label: "DEF",
          top: 60,
          left: 5 + i * defenderWidth,
        });
      }

      // Add midfielders - wider spacing for even fewer players
      const midfielderWidth = 90 / (midfielders + 1);
      for (let i = 1; i <= midfielders; i++) {
        positions.push({
          id: `mid-${i}`,
          label: "MID",
          top: 35,
          left: 5 + i * midfielderWidth,
        });
      }

      // Add forwards - wider spacing for even fewer players
      const forwardWidth = 90 / (forwards + 1); 
      for (let i = 1; i <= forwards; i++) {
        positions.push({
          id: `fwd-${i}`,
          label: "FWD",
          top: 10,
          left: 5 + i * forwardWidth,
        });
      }
    } else {
      // 11-a-side formations (original logic)
      const [defenders, midfielders, forwards] = formation.split("-").map(Number);
      positions.push({ id: "gk", label: "GK", top: 82, left: 50 });
      const defenderWidth = 90 / (defenders + 1);
      for (let i = 1; i <= defenders; i++) {
        positions.push({
          id: `def-${i}`,
          label: "DEF",
          top: 60,
          left: 5 + i * defenderWidth,
        });
      }
      const midfielderWidth = 80 / (midfielders + 1);
      for (let i = 1; i <= midfielders; i++) {
        positions.push({
          id: `mid-${i}`,
          label: "MID",
          top: 35,
          left: 10 + i * midfielderWidth,
        });
      }
      const forwardWidth = 80 / (forwards + 1);
      for (let i = 1; i <= forwards; i++) {
        positions.push({
          id: `fwd-${i}`,
          label: "FWD",
          top: 10,
          left: 10 + i * forwardWidth,
        });
      }
    }

    return positions;
  };

  // Determine available formations based on team type
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
          "4-2-3-1",
        ];
    }
  };

  // Get available formations based on selected team type
  const availableFormations = getAvailableFormations(selectedTeam?.teamType);

  const handleFormationChange = (formation: string) =>
    setSelectedFormation(formation);
  const handlePositionClick = (positionId: string) => {
    setSelectedPosition(positionId);
    setShowAddToLineupDialog(true);
  };

  const addPlayerToLineup = (member: TeamMemberWithUser) => {
    if (Object.values(lineup).some((p) => p?.id === member.id)) {
      toast({
        title: "Player already in lineup",
        description: "This player is already assigned to a position.",
        variant: "destructive",
      });
      return;
    }
    if (selectedPosition) {
      setLineup((prev) => ({ ...prev, [selectedPosition]: member }));
      setShowAddToLineupDialog(false);
      setSelectedPosition(null);
      toast({
        title: "Player added to lineup",
        description: `${member.user.fullName} has been added to the lineup.`,
      });
    }
  };

  const addPlayerToFirstAvailablePosition = (member: TeamMemberWithUser) => {
    if (Object.values(lineup).some((p) => p?.id === member.id)) {
      toast({
        title: "Player already in lineup",
        description: "This player is already assigned to a position.",
        variant: "destructive",
      });
      return;
    }
    const positions = getPositionsByFormation(selectedFormation);
    const available = positions.find((pos) => !lineup[pos.id]);
    if (available) {
      setLineup((prev) => ({ ...prev, [available.id]: member }));
      toast({
        title: "Player added to lineup",
        description: `${member.user.fullName} has been added at position ${available.label}.`,
      });
    } else {
      toast({
        title: "No available position",
        description: "There is no available position in the lineup.",
        variant: "destructive",
      });
    }
  };

  const removePlayerFromLineup = (positionId: string) => {
    setLineup((prev) => ({ ...prev, [positionId]: null }));
    toast({
      title: "Player removed from lineup",
      description: "Player has been removed from the lineup.",
    });
  };

  // Save lineup mutation
  const saveLineupMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTeam) throw new Error("No team selected");

      // Convert lineup object to arrays of player IDs for storage
      const playerIds: number[] = [];
      const benchPlayerIds: number[] = [];

      // Create a position mapping object from the lineup for storing position assignments
      const positionMapping: { [key: string]: number } = {};

      // Process the lineup object to extract player IDs and position mappings
      Object.entries(lineup).forEach(([positionId, member]) => {
        if (member) {
          playerIds.push(member.userId);
          positionMapping[positionId] = member.userId;
        }
      });

      // Find players who are on the team but not in the starting lineup - they go to the bench
      if (teamMembers) {
        teamMembers.forEach(member => {
          if (member.role === "player" && !playerIds.includes(member.userId) && !benchPlayerIds.includes(member.userId)) {
            benchPlayerIds.push(member.userId);
          }
        });
      }

      return apiRequest(`/api/teams/${selectedTeam.id}/lineup`, {
        method: "POST",
        data: {
          formation: selectedFormation,
          playerIds,
          benchPlayerIds,
          positionMapping
        }
      });
    },
    onSuccess: () => {
      toast({
        title: "Lineup saved",
        description: "The team lineup has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: teamLineupQueryKey });
      setIsSavingLineup(false);
    },
    onError: (error) => {
      toast({
        title: "Error saving lineup",
        description: error.message || "There was an error saving the lineup.",
        variant: "destructive",
      });
      setIsSavingLineup(false);
    }
  });

  const handleSaveLineup = () => {
    setIsSavingLineup(true);
    saveLineupMutation.mutate();
  };

  // Initialize lineup from server data when it's available
  useEffect(() => {
    if (teamLineup && teamMembers) {
      // Set the formation from the saved data
      if (teamLineup.formation) {
        setSelectedFormation(teamLineup.formation);
      }

      // Initialize an empty lineup object
      const newLineup: {[key: string]: TeamMemberWithUser | null} = {};

      // Process the position mapping to place players in their positions
      if (teamLineup.positionMapping) {
        Object.entries(teamLineup.positionMapping).forEach(([positionId, userId]) => {
          // Find the team member that matches this user ID
          const member = teamMembers.find(m => m.userId === userId);
          if (member) {
            newLineup[positionId] = member;
          } else {
            newLineup[positionId] = null;
          }
        });
      }

      setLineup(newLineup);
    }
  }, [teamLineup, teamMembers]);

  if (teamsLoading || teamMembersLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isAdmin =
    user?.role === "admin" ||
    teamMembers?.some(
      (member) => member.userId === user?.id && member.role === "admin",
    );

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 ml-0 md:ml-64 overflow-y-auto z-30">
        <Header title={t("team.title")} />
        <div className="px-4 sm:px-6 lg:px-8 py-6 pb-16">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-primary">
                {selectedTeam?.name || "Team"}
              </h1>
              <p className="text-gray-500">
                {selectedTeam?.division || "No division set"}
              </p>
            </div>
            {isAdmin && (
              <Dialog
                open={openAddMemberDialog}
                onOpenChange={setOpenAddMemberDialog}
              >
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="mr-2 h-4 w-4" />
                    {t("team.addMember")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>{t("team.addTeamMember")}</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onSubmit)}
                      className="space-y-4"
                    >
                      <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("team.form.fullName")}</FormLabel>
                            <FormControl>
                              <Input placeholder="John Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("team.form.role")}</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={t("team.selectRole")} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="coach">{t("auth.coach")}</SelectItem>
                                <SelectItem value="player">{t("auth.player")}</SelectItem>
                                <SelectItem value="colaborador">{t("auth.colaborador")}</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="position"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("team.form.position")}</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={t("team.selectPosition")} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="overflow-y-auto max-h-[300px] pt-1" position="item-aligned">
                                <SelectGroup>
                                  <SelectLabel>{t("team.goalkeepers")}</SelectLabel>
                                  <SelectItem value="Goalkeeper">
                                    {t("team.goalkeeper")}
                                  </SelectItem>
                                </SelectGroup>

                                {/* Show positions based on team type */}
                                {selectedTeam?.teamType === "7-a-side" && (
                                  <SelectGroup>
                                    <SelectLabel>{t("team.sevenASidePositions")}</SelectLabel>
                                    <SelectItem value="7-a-side Center Defender">
                                      {t("team.centerDefender")} (7-a-side)
                                    </SelectItem>
                                    <SelectItem value="7-a-side Wide Defender">
                                      {t("team.wideDefender")} (7-a-side)
                                    </SelectItem>
                                    <SelectItem value="7-a-side Center Midfielder">
                                      {t("team.centerMidfielder")} (7-a-side)
                                    </SelectItem>
                                    <SelectItem value="7-a-side Wide Midfielder">
                                      {t("team.wideMidfielder")} (7-a-side)
                                    </SelectItem>
                                    <SelectItem value="7-a-side Forward">
                                      {t("team.forward")} (7-a-side)
                                    </SelectItem>
                                  </SelectGroup>
                                )}

                                {/* Futsal/5-a-side positions */}
                                {selectedTeam?.teamType === "Futsal" && (
                                  <SelectGroup>
                                    <SelectLabel>{t("team.futsalPositions")}</SelectLabel>
                                    <SelectItem value="Futsal Defender">
                                      {t("team.defender")} (Futsal)
                                    </SelectItem>
                                    <SelectItem value="Futsal Pivot">
                                      {t("team.pivot")} (Futsal)
                                    </SelectItem>
                                    <SelectItem value="Futsal Winger">
                                      {t("team.winger")} (Futsal)
                                    </SelectItem>
                                    <SelectItem value="Futsal Universal">
                                      {t("team.universal")} (Futsal)
                                    </SelectItem>
                                  </SelectGroup>
                                )}

                                {/* 11-a-side positions, only shown when team type is 11-a-side or not set */}
                                {(selectedTeam?.teamType === "11-a-side" || !selectedTeam?.teamType) && (
                                  <>
                                    <SelectGroup>
                                      <SelectLabel>{t("team.defenders")}</SelectLabel>
                                      <SelectItem value="Center Back">
                                        {t("team.centerBack")}
                                      </SelectItem>
                                      <SelectItem value="Left Back">
                                        {t("team.leftBack")}
                                      </SelectItem>
                                      <SelectItem value="Right Back">
                                        {t("team.rightBack")}
                                      </SelectItem>
                               ```python
                                      <SelectItem value="Wing Back">
                                        {t("team.wingBack")}
                                      </SelectItem>
                                      <SelectItem value="Sweeper">
                                        {t("team.sweeper")}
                                      </SelectItem>
                                    </SelectGroup>
                                    <SelectGroup>
                                      <SelectLabel>{t("team.midfielders")}</SelectLabel>
                                      <SelectItem value="Defensive Midfielder">
                                        {t("team.defensiveMidfielder")}
                                      </SelectItem>
                                      <SelectItem value="Central Midfielder">
                                        {t("team.centralMidfielder")}
                                      </SelectItem>
                                      <SelectItem value="Attacking Midfielder">
                                        {t("team.attackingMidfielder")}
                                      </SelectItem>
                                      <SelectItem value="Left Midfielder">
                                        {t("team.leftMidfielder")}
                                      </SelectItem>
                                      <SelectItem value="Right Midfielder">
                                        {t("team.rightMidfielder")}
                                      </SelectItem>
                                    </SelectGroup>
                                    <SelectGroup>
                                      <SelectLabel>{t("team.forwards")}</SelectLabel>
                                      <SelectItem value="Center Forward">
                                        {t("team.centerForward")}
                                      </SelectItem>
                                      <SelectItem value="Striker">
                                        {t("team.striker")}
                                      </SelectItem>
                                      <SelectItem value="Left Winger">
                                        {t("team.leftWinger")}
                                      </SelectItem>
                                      <SelectItem value="Right Winger">
                                        {t("team.rightWinger")}
                                      </SelectItem>
                                    </SelectGroup>
                                  </>
                                )}
                                <SelectItem value="none">{t("team.none")}</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="jerseyNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("team.form.jerseyNumber")}</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="profilePicture"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("team.form.profilePicture")}</FormLabel>
                            <FormControl>
                              <Input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    // Convert file to base64
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      field.onChange(reader.result);
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button
                          type="submit"
                          disabled={addTeamMemberMutation.isPending}
                        >
                          {addTeamMemberMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          {t("team.addTeamMember")}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Team Lineup Card */}
          <Card className="mb-8">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <CardTitle className="text-xl">{t("team.teamLineup")}</CardTitle>
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
                <Select
                  defaultValue={selectedFormation}
                  onValueChange={handleFormationChange}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="Formation" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFormations.map((formation) => (
                      <SelectItem key={formation} value={formation}>
                        {formation}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isAdmin && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleSaveLineup}
                    disabled={isSavingLineup || saveLineupMutation.isPending}
                    className="w-full sm:w-auto"
                  >
                    {(isSavingLineup || saveLineupMutation.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {t("team.saveLineup")}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                {/* Field Container */}
                <div className="lg:col-span-3">
                  <div className="relative bg-gradient-to-b from-green-700 to-green-900 w-full h-96 sm:aspect-[16/9] md:max-w-3xl mx-auto rounded-md flex items-center justify-center overflow-hidden">

































































<div className="absolute top-0 left-0 w-full h-full">
                      <div className="border-2 border-white border-b-0 mx-4 mt-4 h-full rounded-t-md relative">
                        {/* Different field markings based on team type */}
                        {selectedTeam?.teamType === "Futsal" ? (
                          <>
                            {/* Futsal/5-a-side field markings */}
                            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-28 h-14 border-2 border-t-0 border-white rounded-b-full"></div>
                            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-20 w-40 border-2 border-b-0 border-white"></div>
                            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-10 w-20 border-2 border-b-0 border-white"></div>
                            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-2 w-12 bg-white"></div>
                            <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full"></div>
                            {/* Futsal specific text indicator */}
                            <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                              Futsal
                            </div>
                          </>
                        ) : selectedTeam?.teamType === "7-a-side" ? (
                          <>
                            {/* 7-a-side field markings */}
                            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-16 border-2 border-t-0 border-white rounded-b-full"></div>
                            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-24 w-48 border-2 border-b-0 border-white"></div>
                            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-12 w-24 border-2 border-b-0 border-white"></div>
                            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-2 w-16 bg-white"></div>
                            <div className="absolute bottom-18 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full"></div>
                            {/* 7-a-side specific text indicator */}
                            <div className="absolute top-2 right-2 bg-primary text-white text-xs px-2 py-1 rounded-full">
                              7-a-side
                            </div>
                          </>
                        ) : (
                          <>
                            {/* 11-a-side field markings */}
                            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-40 h-20 border-2 border-t-0 border-white rounded-b-full"></div>
                            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-32 w-64 border-2 border-b-0 border-white"></div>
                            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-16 w-32 border-2 border-b-0 border-white"></div>
                            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-2 w-24 bg-white"></div>
                            <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full"></div>
                            {/* 11-a-side specific text indicator */}
                            <div className="absolute top-2 right-2 bg-green-700 text-white text-xs px-2 py-1 rounded-full">
                              11-a-side
                            </div>
                          </>
                        )}
                        <div className="absolute top-0 left-0 w-full h-full">
                          {getPositionsByFormation(selectedFormation).map(
                            (position) => {
                              const player = lineup[position.id];
                              return (
                                <div
                                  key={position.id}
                                  className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                                  style={{
                                    top: `${position.top}%`,
                                    left: `${position.left}%`,
                                  }}
                                  onClick={() =>
                                    handlePositionClick(position.id)
                                  }
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
                                    } ${isAdmin ? "hover:scale-110 hover:opacity-100" : ""}`}
                                  >
                                    {player ? (
                                      <div className="flex flex-col items-center">
                                        <span className="font-bold text-sm">
                                          {player.user.jerseyNumber || "?"}
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="text-xs md:text-sm font-bold">
                                        {position.label === "GK" ? t("team.gk") :
                                         position.label === "DEF" ? t("team.def") :
                                         position.label === "MID" ? t("team.mid") :
                                         t("team.fw")}
                                      </div>
                                    )}
                                  </div>
                                  {player && (
                                    <div className="absolute top-full mt-1 left-1/2 transform -translate-x-1/2 w-max">
                                      <div className="text-white text-xs text-center font-semibold bg-black bg-opacity-70 rounded px-2 py-1 whitespace-nowrap">
                                        {player.user.fullName?.split(" ")[0] ||
                                          ""}
                                      </div>
                                    </div>
                                  )}
                                  {player && isAdmin && (
                                    <div
                                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removePlayerFromLineup(position.id);
                                      }}
                                    >
                                      <span className="text-white text-xs font-bold">
                                        ✕
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            },
                          )}
                        </div>
                      </div>
                    </div>
                    {(!teamMembers || teamMembers.length === 0) && (
                      <div className="relative z-10 text-white text-center p-4 bg-black bg-opacity-50 rounded">
                        {t("team.noTeamMembersForLineup")}
                      </div>
                    )}
                  </div>
                  <div className="mt-4 text-sm text-muted-foreground hidden md:block">
                    <p className="flex items-center mb-2">
                      <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                      {t("team.goalkeeper")}
                      <span className="inline-block w-3 h-3 bg-red-500 rounded-full ml-4 mr-2"></span>
                      {t("team.defender")}
                      <span className="inline-block w-3 h-3 bg-green-500 rounded-full ml-4 mr-2"></span>
                      {t("team.midfielder")}
                      <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full ml-4 mr-2"></span>
                      {t("team.forward")}
                    </p>
                    <p className="text-xs text-gray-500">
                      {isAdmin
                        ? t("team.lineupPositionInstructions")
                        : t("team.lineupSetByCoach")}
                    </p>
                  </div>
                </div>
                <div className="lg:col-span-2">
                  <div className="bg-muted/30 rounded-md p-4">
                    <h3 className="text-lg font-semibold mb-3">{t("team.bench")}</h3>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                      {teamMembers
                        ?.filter(
                          (member) =>
                            member.role === "player" &&
                            !Object.values(lineup).some(
                              (p) => p?.id === member.id,
                            ),
                        )
                        .map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center p-2 bg-background rounded-md hover:bg-accent/50 transition-colors"
                          >
                            <Avatar className="h-8 w-8 mr-3">
                              <AvatarImage
                                src={member.user.profilePicture || undefined}
                                alt={member.user.fullName || ""}
                              />
                              <AvatarFallback>
                                {member.user.fullName?.charAt(0) || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">
                                {member.user.fullName}
                              </div>
                              <div className="text-xs text-muted-foreground flex items-center">
                                {member.user.position && (
                                  <span className="truncate">
                                    {member.user.position}
                                  </span>
                                )}
                                {member.user.jerseyNumber && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs ml-1"
                                  >
                                    #{member.user.jerseyNumber}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="ml-2"
                                onClick={() =>
                                  addPlayerToFirstAvailablePosition(member)
                                }
                              >
                                <span className="hidden sm:inline-block">{t("team.addToLineup")}</span>
                                <span className="sm:hidden">+</span>
                              </Button>
                            )}
                          </div>
                        ))}
                      {teamMembers?.filter(
                        (member)=>
                          member.role === "player" &&
                          !Object.values(lineup).some(
                            (p) => p?.id === member.id,
                          ),
                      ).length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>{t("team.allPlayersInLineup")}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
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
                        />
                      </div>
                      {teamMembers
                        ?.filter(
                          (m) =>
                            m.role === "player" &&
                            (m.user.fullName
                              ?.toLowerCase()
                              .includes(searchQuery.toLowerCase()) ||
                              m.user.position
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
                            <Avatar className="h-10 w-10 mr-3">
                              <AvatarImage
                                src={member.user.profilePicture || undefined}
                                alt={member.user.fullName || ""}
                              />
                              <AvatarFallback>
                                {member.user.fullName?.charAt(0) || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">
                                {member.user.fullName}
                              </div>
                              <div className="text-sm text-gray-500 flex items-center">
                                {member.user.position && (
                                  <span className="mr-2">
                                    {member.user.position}
                                  </span>
                                )}
                                {member.user.jerseyNumber && (
                                  <Badge variant="outline" className="text-xs">
                                    #{member.user.jerseyNumber}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      {teamMembers?.filter((m) => m.role === "player")
                        .length === 0 && (
                        <div className="text-center p-4 text-gray-500">
                          {t("team.noPlayersAvailable")}
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
            </CardContent>
          </Card>
          <Card className="mb-8">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <CardTitle className="text-xl">
                {t("team.teamMembers")}
              </CardTitle>
              <div className="flex flex-row items-center space-x-2 w-full sm:w-auto">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder={t("team.filterByRole")}>
                      <div className="flex items-center">
                        <Filter className="h-4 w-4 mr-2" />
                        {roleFilter === "all"
                          ? t("team.allMembers")
                          : roleFilter === "admin"
                            ? t("auth.admin") + "s"
                            : roleFilter === "coach"
                              ? t("auth.coach") + "es"
                              : t("auth.player") + "es"}
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("team.allMembers")}</SelectItem>
                    <SelectItem value="admin">{t("auth.admin") + "s"}</SelectItem>
                    <SelectItem value="coach">{t("auth.coach") + "es"}</SelectItem>
                    <SelectItem value="colaborador">{t("auth.colaborador") + "es"}</SelectItem>
                    <SelectItem value="player">{t("auth.player") + "es"}</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="w-[140px] pl-9 text-sm"
                    placeholder={t("common.search")}
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                {(roleFilter !== "all" || searchQuery) && (
                  <Badge variant="outline" className="px-3 py-1">
                    {filteredTeamMembers.length}{" "}
                    {filteredTeamMembers.length === 1 ? "result" : "results"}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("team.table.name")}</TableHead>
                    <TableHead>{t("team.table.role")}</TableHead>
                    <TableHead>{t("team.table.position")}</TableHead>
                    <TableHead>{t("team.table.jerseyNumber")}</TableHead>
                    <TableHead>{t("team.table.contact")}</TableHead>
                    <TableHead>{t("team.table.actions") || "Acciones"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!filteredTeamMembers.length && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-8"
                      >
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <AlertCircle className="h-12 w-12 mb-2" />
                          <div className="text-lg font-medium">
                            {t("team.noTeamMembersFound")}
                          </div>
                          {searchQuery || roleFilter !== "all" ? (
                            <p>{t("team.filters.tryAdjusting")}</p>
                          ) : (
                            <p>{t("team.filters.addToStart")}</p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredTeamMembers.map((member) => {
                    if (!member || !member.user) return null;
                    return (
                      <TableRow key={member.id} className="hover:bg-accent/50">
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <Avatar className="h-10 w-10 mr-3 border border-primary/30">
                              <AvatarImage
                                src={
                                  member.user.profilePicture ||
                                  "/default-avatar.png"
                                }
                                alt={member.user.fullName}
                              />
                              <AvatarFallback>
                                {member.user.fullName?.charAt(0) || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-semibold">
                                {member.user.fullName || "Unknown User"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                @{member.user.username}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              member.role === "admin"
                                ? "destructive"
                                : member.role === "coach"
                                  ? "default"
                                  : "secondary"
                            }
                          >
                            {member.role === "admin" ? (
                              <Shield className="h-3 w-3 mr-1" />
                            ) : member.role === "coach" ? (
                              <UserCog className="h-3 w-3 mr-1" />
                            ) : (
                              <UserCircle className="h-3 w-3 mr-1" />
                            )}
                            <span className="capitalize">{t(`auth.${member.role}`)}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>{member.user.position || "-"}</TableCell>
                        <TableCell>
                          {member.user.jerseyNumber ? (
                            <Badge variant="outline">
                              #{member.user.jerseyNumber}
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col space-y-1">
                            {member.user.email && (
                              <div className="flex items-center text-xs text-muted-foreground">
                                <Mail className="h-3 w-3 mr-1" />
                                <span>{member.user.email}</span>
                              </div>
                            )}
                            {member.user.phoneNumber && (
                              <div className="flex items-center text-xs text-muted-foreground">
                                <Phone className="h-3 w-3 mr-1" />
                                <span>{member.user.phoneNumber}</span>
                              </div>
                            )}
                            {!member.user.email &&
                              !member.user.phoneNumber &&
                              "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {isAdmin ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setMemberToEdit(member);
                                    setOpenEditMemberDialog(true);
                                  }}
                                >
                                  {t("common.edit")}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive/90"
                                  onClick={() => {
                                    setMemberToRemove(member);
                                    setOpenRemoveMemberDialog(true);
                                  }}
                                >
                                  {t("team.remove")}
                                </Button>
                              </>
                            ) : (
                              <MemberClaimButton member={member} />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
        <MobileNavigation />
      </div>

      {/* Edit Member Dialog */}
      <Dialog open={openEditMemberDialog} onOpenChange={setOpenEditMemberDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("team.editTeamMember")}</DialogTitle>
            <DialogDescription>
              Update the information for {memberToEdit?.user.fullName}.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(onEditSubmit)}
              className="space-y-4"
            >
              <FormField
                control={editForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("team.form.role")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="coach">{t("auth.coach")}</SelectItem>
                        <SelectItem value="player">{t("auth.player")}</SelectItem>
                        <SelectItem value="colaborador">{t("auth.colaborador")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("team.form.position")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("team.selectPosition")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="overflow-y-auto max-h-[300px] pt-1" position="item-aligned">
                        <SelectItem value="none">{t("team.none")}</SelectItem>
                        <SelectItem value="Goalkeeper">{t("team.goalkeeper")}</SelectItem>
                        <SelectItem value="Defender">{t("team.defender")}</SelectItem>
                        <SelectItem value="Midfielder">{t("team.midfielder")}</SelectItem>
                        <SelectItem value="Forward">{t("team.forward")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="jerseyNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("team.form.jerseyNumber")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="1-99"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => {
                          const value = e.target.value
                            ? parseInt(e.target.value)
                            : undefined;
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="profilePicture"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("team.form.profilePicture")}</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // Convert file to base64
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              field.onChange(reader.result);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      {t("settings.profilePictureDescription")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={editTeamMemberMutation.isPending}
                >
                  {editTeamMemberMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {t("common.save")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Remove Member Dialog */}
      <Dialog open={openRemoveMemberDialog} onOpenChange={setOpenRemoveMemberDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("team.removeTeamMember")}</DialogTitle>
            <DialogDescription>
              {memberToRemove?.user.fullName && t("team.removeConfirmation", {name: memberToRemove.user.fullName})}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setOpenRemoveMemberDialog(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={onRemoveSubmit}
              disabled={removeMemberMutation.isPending}
            >
              {removeMemberMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t("team.remove")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}