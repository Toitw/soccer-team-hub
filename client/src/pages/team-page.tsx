import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Team,
  TeamMember,
  User,
  User as SelectUser,
  InsertTeamMember,
} from "@shared/schema";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import MobileNavigation from "@/components/mobile-navigation";
import { useAuth } from "@/hooks/use-auth";
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
  role: z.enum(["coach", "player"]),
  position: z.string().optional(),
  jerseyNumber: z.coerce.number().int().optional(),
  profilePicture: z
    .union([z.string().url(), z.string().length(0), z.null(), z.undefined()])
    .optional(),
});

// Schema for editing a team member
const editTeamMemberSchema = z.object({
  role: z.enum(["coach", "player"]),
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
  role: "coach" | "player";
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
  const [openAddMemberDialog, setOpenAddMemberDialog] = useState(false);
  const [openEditMemberDialog, setOpenEditMemberDialog] = useState(false);
  const [openRemoveMemberDialog, setOpenRemoveMemberDialog] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<TeamMemberWithUser | null>(
    null,
  );
  const [memberToRemove, setMemberToRemove] =
    useState<TeamMemberWithUser | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedFormation, setSelectedFormation] = useState<string>("4-3-3");
  const [lineup, setLineup] = useState<{
    [position: string]: TeamMemberWithUser | null;
  }>({});
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [showAddToLineupDialog, setShowAddToLineupDialog] =
    useState<boolean>(false);

  const { data: teams, isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  // Select the first team by default
  const selectedTeam = teams && teams.length > 0 ? teams[0] : null;

  // Get team members
  const teamMembersQueryKey = ["/api/teams", selectedTeam?.id, "members"];
  const { data: teamMembers, isLoading: teamMembersLoading } = useQuery<
    TeamMemberWithUser[]
  >({
    queryKey: teamMembersQueryKey,
    queryFn: async () => {
      if (!selectedTeam?.id) return [];
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
      return await response.json();
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
        role: memberToEdit.role as "coach" | "player",
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
      await apiRequest(
        "DELETE",
        `/api/teams/${selectedTeam.id}/members/${memberId}`,
      );
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
      return apiRequest("POST", `/api/teams/${selectedTeam.id}/members`, {
        role: data.role,
        user: {
          fullName: data.user.fullName,
          position: data.user.position,
          jerseyNumber: data.user.jerseyNumber,
          profilePicture: data.user.profilePicture,
        },
      });
    },
    onSuccess: () => {
      toast({
        title: "Team member added",
        description: "The new team member has been added successfully.",
      });
      setOpenAddMemberDialog(false);
      form.reset();
      queryClient.invalidateQueries({
        queryKey: ["/api/teams", selectedTeam?.id, "members"],
      });
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
      return apiRequest(
        "PATCH",
        `/api/teams/${selectedTeam.id}/members/${memberToEdit.id}`,
        {
          role: data.role,
          position: data.position,
          jerseyNumber: data.jerseyNumber,
          profilePicture: data.profilePicture,
        },
      );
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
        profilePicture: data.profilePicture || undefined,
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

  // Expanded vertical spacing: GK at 95%, defenders at 70%, midfielders at 45%, forwards at 10%
  const getPositionsByFormation = (formation: string) => {
    const positions: {
      id: string;
      label: string;
      top: number;
      left: number;
    }[] = [];
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
    return positions;
  };

  const availableFormations = [
    "4-3-3",
    "4-4-2",
    "3-5-2",
    "3-4-3",
    "5-3-2",
    "4-2-3-1",
  ];

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
      <div className="flex-1 ml-0 md:ml-64 overflow-y-auto">
        <Header title="Team" />
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
                    Add Member
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Add Team Member</DialogTitle>
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
                            <FormLabel>Full Name</FormLabel>
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
                            <FormLabel>Role</FormLabel>
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
                                <SelectItem value="coach">Coach</SelectItem>
                                <SelectItem value="player">Player</SelectItem>
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
                            <FormLabel>Position (optional)</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select position" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectGroup>
                                  <SelectLabel>Goalkeepers</SelectLabel>
                                  <SelectItem value="Goalkeeper">
                                    Goalkeeper
                                  </SelectItem>
                                </SelectGroup>
                                <SelectGroup>
                                  <SelectLabel>Defenders</SelectLabel>
                                  <SelectItem value="Center Back">
                                    Center Back
                                  </SelectItem>
                                  <SelectItem value="Left Back">
                                    Left Back
                                  </SelectItem>
                                  <SelectItem value="Right Back">
                                    Right Back
                                  </SelectItem>
                                  <SelectItem value="Wing Back">
                                    Wing Back
                                  </SelectItem>
                                  <SelectItem value="Sweeper">
                                    Sweeper
                                  </SelectItem>
                                </SelectGroup>
                                <SelectGroup>
                                  <SelectLabel>Midfielders</SelectLabel>
                                  <SelectItem value="Defensive Midfielder">
                                    Defensive Midfielder
                                  </SelectItem>
                                  <SelectItem value="Central Midfielder">
                                    Central Midfielder
                                  </SelectItem>
                                  <SelectItem value="Attacking Midfielder">
                                    Attacking Midfielder
                                  </SelectItem>
                                  <SelectItem value="Left Midfielder">
                                    Left Midfielder
                                  </SelectItem>
                                  <SelectItem value="Right Midfielder">
                                    Right Midfielder
                                  </SelectItem>
                                </SelectGroup>
                                <SelectGroup>
                                  <SelectLabel>Forwards</SelectLabel>
                                  <SelectItem value="Center Forward">
                                    Center Forward
                                  </SelectItem>
                                  <SelectItem value="Striker">
                                    Striker
                                  </SelectItem>
                                  <SelectItem value="Left Winger">
                                    Left Winger
                                  </SelectItem>
                                  <SelectItem value="Right Winger">
                                    Right Winger
                                  </SelectItem>
                                </SelectGroup>
                                <SelectItem value="none">None</SelectItem>
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
                            <FormLabel>Jersey Number (optional)</FormLabel>
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
                            <FormLabel>Profile Picture</FormLabel>
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
                          Add Team Member
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
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl">Team Lineup</CardTitle>
              <div className="flex items-center space-x-2">
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
                  <Button variant="outline" size="sm">
                    Save Lineup
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
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-40 h-20 border-2 border-t-0 border-white rounded-b-full"></div>
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-32 w-64 border-2 border-b-0 border-white"></div>
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-16 w-32 border-2 border-b-0 border-white"></div>
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-2 w-24 bg-white"></div>
                        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full"></div>
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
                                        {position.label}
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
                        No team members available for lineup
                      </div>
                    )}
                  </div>
                  <div className="mt-4 text-sm text-muted-foreground hidden md:block">
                    <p className="flex items-center mb-2">
                      <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                      Goalkeeper
                      <span className="inline-block w-3 h-3 bg-red-500 rounded-full ml-4 mr-2"></span>
                      Defender
                      <span className="inline-block w-3 h-3 bg-green-500 rounded-full ml-4 mr-2"></span>
                      Midfielder
                      <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full ml-4 mr-2"></span>
                      Forward
                    </p>
                    <p className="text-xs text-gray-500">
                      {isAdmin
                        ? "Click on a position to assign a player to it."
                        : "Team lineup is set by the coach."}
                    </p>
                  </div>
                </div>
                <div className="lg:col-span-2">
                  <div className="bg-muted/30 rounded-md p-4">
                    <h3 className="text-lg font-semibold mb-3">Bench</h3>
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
                                Add to Lineup
                              </Button>
                            )}
                          </div>
                        ))}
                      {teamMembers?.filter(
                        (member) =>
                          member.role === "player" &&
                          !Object.values(lineup).some(
                            (p) => p?.id === member.id,
                          ),
                      ).length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>All players are in the lineup</p>
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
                    <DialogTitle>Add Player to Lineup</DialogTitle>
                    <DialogDescription>
                      Select a player to add to the selected position.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="max-h-80 overflow-y-auto py-4">
                    <div className="space-y-2">
                      <div className="mb-4">
                        <Input
                          placeholder="Search players..."
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
                          No players available. Add players to your team first.
                        </div>
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowAddToLineupDialog(false)}
                    >
                      Cancel
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
          <Card className="mb-8">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center">
                <UserCircle className="mr-2 h-5 w-5 text-primary" />
                Team Members
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Filter by role">
                      <div className="flex items-center">
                        <Filter className="h-4 w-4 mr-2" />
                        {roleFilter === "all"
                          ? "All Members"
                          : roleFilter === "admin"
                            ? "Admins"
                            : roleFilter === "coach"
                              ? "Coaches"
                              : "Players"}
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Members</SelectItem>
                    <SelectItem value="admin">Admins</SelectItem>
                    <SelectItem value="coach">Coaches</SelectItem>
                    <SelectItem value="player">Players</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="w-[200px] pl-9"
                    placeholder="Search members..."
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
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Jersey #</TableHead>
                    <TableHead>Contact</TableHead>
                    {isAdmin && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!filteredTeamMembers.length && (
                    <TableRow>
                      <TableCell
                        colSpan={isAdmin ? 6 : 5}
                        className="text-center py-8"
                      >
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <AlertCircle className="h-12 w-12 mb-2" />
                          <div className="text-lg font-medium">
                            No team members found
                          </div>
                          {searchQuery || roleFilter !== "all" ? (
                            <p>Try adjusting your filters</p>
                          ) : (
                            <p>Add team members to get started</p>
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
                            <span className="capitalize">{member.role}</span>
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
                        {isAdmin && (
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setMemberToEdit(member);
                                  setOpenEditMemberDialog(true);
                                }}
                              >
                                Edit
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
                                Remove
                              </Button>
                            </div>
                          </TableCell>
                        )}
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
    </div>
  );
}
