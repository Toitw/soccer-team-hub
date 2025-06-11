import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Team, TeamMember } from "@shared/schema";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import MobileNavigation from "@/components/mobile-navigation";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, UserPlus, Mail, Copy, Eye, EyeOff, RefreshCw, X, AlertTriangle, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import MemberClaimsManager from "@/components/team/MemberClaimsManager";

// Define form schema for inviting members
const inviteSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  role: z.enum(["admin", "coach", "player", "colaborador"]),
});

// Define form schema for team settings
const teamSettingsSchema = z.object({
  name: z.string().min(1, "Team name is required"),
  division: z.string().optional(),
  // seasonYear removed as per requirements - now managed in competitions page
  logo: z.string().optional(),
  teamType: z.enum(["11-a-side", "7-a-side", "Futsal"]).optional(),
  category: z.enum(["PROFESSIONAL", "FEDERATED", "AMATEUR"]).optional(),
});

type InviteFormData = z.infer<typeof inviteSchema>;
type TeamSettingsFormData = z.infer<typeof teamSettingsSchema>;

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("members");
  const [isGeneratingJoinCode, setIsGeneratingJoinCode] = useState(false);
  const [joinCodeVisible, setJoinCodeVisible] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<(TeamMember & { user: any }) | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [teamSettingsChanged, setTeamSettingsChanged] = useState(false);
  const [isLogoDialogOpen, setIsLogoDialogOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  // Keep track of the currently selected team ID
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);

  const { data: teams, isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  // Debug logging
  useEffect(() => {
    if (teams) {
      console.log("Teams data loaded:", teams);
    }
  }, [teams]);

  // Regenerate join code mutation
  const regenerateJoinCodeMutation = useMutation({
    mutationFn: async (teamId: number) => {
      return apiRequest('POST', `/api/teams/${teamId}/regenerate-join-code`, {});
    },
    onSuccess: () => {
      // Invalidate team data
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });

      // Also invalidate team members to ensure they are refreshed
      if (selectedTeamId) {
        queryClient.invalidateQueries({ queryKey: ["/api/teams", selectedTeamId, "members"] });
      }

      toast({
        title: "Join code regenerated",
        description: "New join code has been generated successfully",
      });
      setIsGeneratingJoinCode(false);
    },
    onError: (error) => {
      console.error("Failed to regenerate join code:", error);
      toast({
        title: "Error",
        description: "Failed to regenerate join code. Please try again.",
        variant: "destructive",
      });
      setIsGeneratingJoinCode(false);
    }
  });

  const handleRegenerateJoinCode = () => {
    if (!selectedTeamId) return;

    setIsGeneratingJoinCode(true);
    regenerateJoinCodeMutation.mutate(selectedTeamId);
  };

  const copyJoinCodeToClipboard = () => {
    if (!selectedTeam?.joinCode) return;

    navigator.clipboard.writeText(selectedTeam.joinCode)
      .then(() => {
        toast({
          title: "Copied to clipboard",
          description: "Team join code has been copied to clipboard",
        });
      })
      .catch(err => {
        console.error("Failed to copy join code:", err);
        toast({
          title: "Error",
          description: "Failed to copy join code to clipboard",
          variant: "destructive",
        });
      });
  };

  // Find the selected team from teams data
  const selectedTeam = teams?.find(team => team.id === selectedTeamId) || 
                       (teams && teams.length > 0 ? teams[0] : null);

  // Set the selected team ID when teams data is loaded
  useEffect(() => {
    if (teams && teams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, selectedTeamId]);

  // Use the selected team ID for members query to maintain consistency
  const { data: teamMembers, isLoading: membersLoading } = useQuery<(TeamMember & { user: any })[]>({
    queryKey: [`/api/teams/${selectedTeamId}/members`],
    enabled: !!selectedTeamId,
    staleTime: 0, // Force refetch every time
    refetchOnMount: true, // Always refetch when component mounts
  });

  const isLoading = teamsLoading || membersLoading;

  // Team settings form
  const teamSettingsForm = useForm<TeamSettingsFormData>({
    resolver: zodResolver(teamSettingsSchema),
    defaultValues: {
      name: selectedTeam?.name || "",
      division: selectedTeam?.division || "",
      // seasonYear removed as per requirements - now managed in competitions page
      logo: selectedTeam?.logo || "",
      teamType: selectedTeam?.teamType as ("11-a-side" | "7-a-side" | "Futsal") || "11-a-side",
      category: selectedTeam?.category as ("PROFESSIONAL" | "FEDERATED" | "AMATEUR") || "AMATEUR",
    }
  });

  // Update teamSettingsForm values when selectedTeam changes
  useEffect(() => {
    if (selectedTeam) {
      console.log("Selected team changed, updating form values:", selectedTeam);

      // If we have a teamId, fetch the latest data directly from the API
      // This ensures we get the most up-to-date information including teamType
      if (selectedTeam.id) {
        // Direct fetch to get fresh team data
        fetch(`/api/teams/${selectedTeam.id}`)
          .then(response => {
            if (!response.ok) throw new Error("Failed to fetch team details");
            return response.json();
          })
          .then(freshTeamData => {
            console.log("Fresh team data loaded:", freshTeamData);
            
            // Reset the form with freshly fetched values
            teamSettingsForm.reset({
              name: freshTeamData.name,
              division: freshTeamData.division || "",
              logo: freshTeamData.logo || "",
              teamType: freshTeamData.teamType as ("11-a-side" | "7-a-side" | "Futsal") || "11-a-side",
              category: freshTeamData.category as ("PROFESSIONAL" | "FEDERATED" | "AMATEUR") || "AMATEUR",
            });
            
            // Update logoUrl for preview
            setLogoUrl(freshTeamData.logo || "");
          })
          .catch(error => {
            console.error("Error fetching team details:", error);
            // Fall back to the existing selectedTeam data
            teamSettingsForm.reset({
              name: selectedTeam.name,
              division: selectedTeam.division || "",
              logo: selectedTeam.logo || "",
              teamType: selectedTeam.teamType as ("11-a-side" | "7-a-side" | "Futsal") || "11-a-side",
              category: selectedTeam.category as ("PROFESSIONAL" | "FEDERATED" | "AMATEUR") || "AMATEUR",
            });
            
            // Update logoUrl for preview
            setLogoUrl(selectedTeam.logo || "");
          });
      } else {
        // Fallback for when we don't have an ID yet
        teamSettingsForm.reset({
          name: selectedTeam.name,
          division: selectedTeam.division || "",
          logo: selectedTeam.logo || "",
          teamType: selectedTeam.teamType as ("11-a-side" | "7-a-side" | "Futsal") || "11-a-side",
          category: selectedTeam.category as ("PROFESSIONAL" | "FEDERATED" | "AMATEUR") || "AMATEUR",
        });
        
        // Update logoUrl for preview
        setLogoUrl(selectedTeam.logo || "");
      }
    }
  }, [selectedTeam, teamSettingsForm]);

  // Add debug for form values
  useEffect(() => {
    console.log("Current form values:", teamSettingsForm.getValues());
    console.log("Form state:", { 
      isDirty: teamSettingsForm.formState.isDirty,
      dirtyFields: teamSettingsForm.formState.dirtyFields
    });
  }, [teamSettingsForm.formState.isDirty]);

  // Mutation for updating team settings
  const updateTeamMutation = useMutation({
    mutationFn: async (data: TeamSettingsFormData) => {
      if (!selectedTeamId) throw new Error("No team selected");
      console.log("Updating team settings:", { teamId: selectedTeamId, data });
      return apiRequest("PATCH", `/api/teams/${selectedTeamId}`, data);
    },
    onSuccess: (response, submittedData) => {
      console.log("Team update successful, response:", response);
      console.log("Submitted data:", submittedData);

      // Invalidate all related queries to force a complete refresh
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });

      // Force refetch of team members immediately using the correct URL-based query key
      if (selectedTeamId) {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/teams/${selectedTeamId}/members`],
          refetchType: 'active', 
        });

        // Manually refetch to ensure immediate update
        queryClient.refetchQueries({ 
          queryKey: [`/api/teams/${selectedTeamId}/members`],
          exact: true 
        });
      }

      toast({
        title: "Team updated",
        description: "Team settings have been updated successfully.",
      });
      setTeamSettingsChanged(false);
    },
    onError: (error) => {
      toast({
        title: "Error updating team",
        description: error.message || "There was an error updating the team settings.",
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting team members
  const deleteTeamMemberMutation = useMutation({
    mutationFn: async (memberId: number) => {
      if (!selectedTeamId) throw new Error("No team selected");
      return apiRequest("DELETE", `/api/teams/${selectedTeamId}/members/${memberId}`, {});
    },
    onSuccess: () => {
      setIsDeleteDialogOpen(false);
      setMemberToDelete(null);

      // Use the same more aggressive refetch strategy
      setTimeout(() => {
        forceRefreshTeamMembers();
      }, 300);
      toast({
        title: "Member removed",
        description: "Team member has been removed successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error removing member",
        description: error.message || "There was an error removing the team member.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteMember = (member: TeamMember & { user: any }) => {
    setMemberToDelete(member);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteMember = () => {
    if (memberToDelete) {
      deleteTeamMemberMutation.mutate(memberToDelete.id);
    }
  };

  // Upload logo mutation
  const uploadLogoMutation = useMutation({
    mutationFn: async (imageData: string) => {
      if (!selectedTeamId) throw new Error("No team selected");
      return apiRequest("POST", `/api/teams/${selectedTeamId}/logo`, { imageData });
    },
    onSuccess: (data) => {
      // Update team logo in the form and invalidate queries
      teamSettingsForm.setValue("logo", data.logo);

      // Invalidate team data
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });

      // Use our force refresh function to ensure team members are reloaded
      setTimeout(() => {
        forceRefreshTeamMembers();
      }, 300);

      toast({
        title: "Logo updated",
        description: "Your team logo has been updated successfully.",
      });
      setIsUploadingLogo(false);
      setIsLogoDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error updating logo",
        description: error.message || "There was an error updating the team logo.",
        variant: "destructive",
      });
      setIsUploadingLogo(false);
    },
  });

  // Handle file selection and conversion to base64
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLogoFile(file);

    // Convert the file to base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64String = e.target?.result as string;
      setLogoUrl(base64String);
    };
    reader.readAsDataURL(file);
  };

  // Handle logo upload
  const handleLogoUpload = () => {
    if (!logoUrl) return;

    setIsUploadingLogo(true);
    uploadLogoMutation.mutate(logoUrl);
  };

  // Helper function to force refresh team members
  const forceRefreshTeamMembers = () => {
    if (!selectedTeamId) return;

    console.log("Force refreshing team members for team:", selectedTeamId);

    // Force immediate invalidation and refetch with the correct query key
    queryClient.invalidateQueries({ 
      queryKey: [`/api/teams/${selectedTeamId}/members`],
      refetchType: 'all'
    });

    queryClient.refetchQueries({ 
      queryKey: [`/api/teams/${selectedTeamId}/members`],
      exact: true
    }).then(() => {
      console.log("Team members refetch completed");
    }).catch(error => {
      console.error("Error refetching team members:", error);
    });
  };

  const handleTeamSettingsSubmit = (data: TeamSettingsFormData) => {
    updateTeamMutation.mutate(data);

    // Set a small delay to ensure the mutation has time to complete
    setTimeout(() => {
      forceRefreshTeamMembers();
    }, 300);
  };

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      role: "player",
    },
  });

  const onSubmit = (data: InviteFormData) => {
    // In a real implementation, you would make an API call to send the invitation
    console.log("Invitation data:", data);
    toast({
      title: "Invitation sent",
      description: `Invitation sent to ${data.email}`,
    });
    form.reset();
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Group members by role
  const adminMembers = teamMembers?.filter(member => member.role === "admin") || [];
  const coachMembers = teamMembers?.filter(member => member.role === "coach") || [];
  const playerMembers = teamMembers?.filter(member => member.role === "player") || [];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      <div className="flex-1 ml-0 md:ml-64 z-30">
        <Header title={t("navigation.settings")} />

        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-primary">{selectedTeam?.name || t("team.title")}</h1>
              <p className="text-gray-500">{selectedTeam?.division || t("common.notAvailable")}</p>
            </div>

            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">
                  <UserPlus className="h-4 w-4 mr-2" />
                  {t("settings.inviteMember")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("settings.inviteTeamMember")}</DialogTitle>
                  <DialogDescription>
                    {t("settings.inviteDescription")}
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("settings.email")}</FormLabel>
                          <FormControl>
                            <Input placeholder={t("settings.enterEmailAddress")} {...field} />
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
                          <FormLabel>{t("settings.role")}</FormLabel>
                          <FormControl>
                            <select 
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              {...field}
                            >
                              <option value="player">{t("auth.player")}</option>
                              <option value="coach">{t("auth.coach")}</option>
                              <option value="colaborador">{t("auth.colaborador")}</option>
                              <option value="admin">{t("auth.admin")}</option>
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="submit" className="bg-primary hover:bg-primary/90">
                        <Mail className="h-4 w-4 mr-2" />
                        {t("settings.sendInvitation")}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <Tabs defaultValue="members" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="members">{t("settings.membersTab")}</TabsTrigger>
              <TabsTrigger value="claims">{t("settings.claimsTab")}</TabsTrigger>
              <TabsTrigger value="settings">{t("settings.configTab")}</TabsTrigger>
            </TabsList>

            <TabsContent value="members" className="mt-6 w-full">
              <div className="grid grid-cols-1 gap-6 max-w-full">
                {/* Administrators */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>{t("settings.administrators")}</CardTitle>
                    <CardDescription>{t("settings.administratorsDescription")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("settings.name")}</TableHead>
                          <TableHead>{t("settings.position")}</TableHead>
                          <TableHead>{t("settings.contact")}</TableHead>
                          <TableHead className="text-right">{t("settings.actions")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {adminMembers.map(member => (
                          <TableRow key={member.id}>
                            <TableCell className="font-medium flex items-center gap-2">
                              <img 
                                src={member.user?.profilePicture || "https://ui-avatars.com/api/?name=Admin+User&background=0D47A1&color=fff"} 
                                alt={member.user?.fullName || member.fullName}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                              {member.user?.fullName || member.fullName}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{t("settings.administrator")}</Badge>
                            </TableCell>
                            <TableCell>{member.user?.email || "No email linked"}</TableCell>
                            <TableCell className="text-right">
                              {/* Don't show delete button for current user */}
                              {member.user?.id !== user?.id && (
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleDeleteMember(member)}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-100"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Coaches */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>{t("settings.coaches")}</CardTitle>
                    <CardDescription>{t("settings.coachesDescription")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("settings.name")}</TableHead>
                          <TableHead>{t("settings.position")}</TableHead>
                          <TableHead>{t("settings.contact")}</TableHead>
                          <TableHead className="text-right">{t("settings.actions")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {coachMembers.map(member => (
                          <TableRow key={member.id}>
                            <TableCell className="font-medium flex items-center gap-2">
                              <img 
                                src={member.user?.profilePicture || "https://ui-avatars.com/api/?name=Coach&background=4CAF50&color=fff"} 
                                alt={member.user?.fullName || member.fullName}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                              {member.user?.fullName || member.fullName}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-[#4CAF50]/10 text-[#4CAF50] hover:bg-[#4CAF50]/20">{t("auth.coach")}</Badge>
                            </TableCell>
                            <TableCell>{member.user?.email || "No email linked"}</TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleDeleteMember(member)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-100"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Players */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>{t("settings.players")}</CardTitle>
                    <CardDescription>{t("settings.playersDescription")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("settings.name")}</TableHead>
                          <TableHead>{t("settings.position")}</TableHead>
                          <TableHead>{t("team.jerseyNumberColumn")}</TableHead>
                          <TableHead>{t("settings.contact")}</TableHead>
                          <TableHead className="text-right">{t("settings.actions")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {playerMembers.map(member => (
                          <TableRow key={member.id}>
                            <TableCell className="font-medium flex items-center gap-2">
                              <img 
                                src={member.user?.profilePicture || "https://ui-avatars.com/api/?name=Player&background=FFC107&color=fff"} 
                                alt={member.user?.fullName || member.fullName}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                              {member.user?.fullName || member.fullName}
                            </TableCell>
                            <TableCell>{member.user?.position || member.position || t("common.notAvailable")}</TableCell>
                            <TableCell>{member.user?.jerseyNumber || member.jerseyNumber || "-"}</TableCell>
                            <TableCell>{member.user?.email || "No email linked"}</TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleDeleteMember(member)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-100"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="claims" className="mt-6 w-full">
              <div className="grid grid-cols-1 gap-6 max-w-full">
                {/* Import and use the MemberClaimsManager component */}
                {selectedTeamId && (
                  <div>
                    <MemberClaimsManager teamId={selectedTeamId} />
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="settings" className="mt-6 w-full">
              <Card className="w-full">
                <CardHeader>
                  <CardTitle>{t("settings.teamSettings")}</CardTitle>
                  <CardDescription>{t("settings.manageTeamInformation")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...teamSettingsForm}>
                    <form onSubmit={teamSettingsForm.handleSubmit(handleTeamSettingsSubmit)} className="space-y-4">
                      <FormField
                        control={teamSettingsForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("settings.teamName")}</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                onChange={(e) => {
                                  field.onChange(e);
                                  setTeamSettingsChanged(true);
                                }} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={teamSettingsForm.control}
                        name="division"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("settings.division")}</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                onChange={(e) => {
                                  field.onChange(e);
                                  setTeamSettingsChanged(true);
                                }} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* seasonYear field removed as per requirements - now managed in competitions page */}

                      <FormField
                        control={teamSettingsForm.control}
                        name="teamType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Team Type</FormLabel>
                            <FormControl>
                              <select 
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={field.value}
                                onChange={(e) => {
                                  field.onChange(e);
                                  setTeamSettingsChanged(true);
                                }}
                              >
                                <option value="11-a-side">11-a-side</option>
                                <option value="7-a-side">7-a-side</option>
                                <option value="Futsal">Futsal</option>
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={teamSettingsForm.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <FormControl>
                              <select 
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={field.value}
                                onChange={(e) => {
                                  field.onChange(e);
                                  setTeamSettingsChanged(true);
                                }}
                              >
                                <option value="PROFESSIONAL">Professional</option>
                                <option value="FEDERATED">Federated</option>
                                <option value="AMATEUR">Amateur</option>
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="space-y-2">
                        <label className="text-sm font-medium">{t("settings.logo")}</label>
                        <div className="flex items-center gap-4">
                          <img 
                            src={selectedTeam?.logo || "https://ui-avatars.com/api/?name=Team&background=0D47A1&color=fff"} 
                            alt={t("settings.logo")} 
                            className="w-16 h-16 rounded-full object-cover border-2 border-primary"
                          />
                          <Button 
                            variant="outline" 
                            type="button" 
                            onClick={() => {
                              setLogoUrl(selectedTeam?.logo || "");
                              setIsLogoDialogOpen(true);
                            }}
                          >
                            {t("settings.changeTeamLogo")}
                          </Button>
                        </div>
                      </div>

                      {/* Logo Dialog */}
                      <Dialog open={isLogoDialogOpen} onOpenChange={setIsLogoDialogOpen}>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{t("settings.changeTeamLogo")}</DialogTitle>
                            <DialogDescription>
                              {t("settings.uploadNewLogo")}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-2">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">{t("settings.selectImageFile")}</label>
                              <div className="flex items-center gap-2">
                                <Input 
                                  type="file" 
                                  accept="image/*" 
                                  onChange={handleFileChange}
                                  className="flex-1"
                                />
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {t("settings.selectImageFile")} (PNG, JPG, GIF).
                              </p>
                            </div>

                            {logoUrl && (
                              <div className="mt-4 flex justify-center">
                                <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-primary">
                                  <img 
                                    src={logoUrl} 
                                    alt={t("settings.currentLogo")} 
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = "https://ui-avatars.com/api/?name=Error&background=FF5252&color=fff";
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setIsLogoDialogOpen(false);
                                setLogoFile(null);
                              }}
                            >
                              {t("settings.cancel")}
                            </Button>
                            <Button
                              onClick={handleLogoUpload}
                              disabled={!logoUrl || isUploadingLogo}
                            >
                              {isUploadingLogo ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  {t("common.loading")}
                                </>
                              ) : (
                                t("settings.uploadLogo")
                              )}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <div className="space-y-2 pt-4 border-t">
                        <label className="text-sm font-medium flex items-center justify-between">
                          <span>{t("settings.joinCode")}</span>
                          <Badge variant="outline" className="ml-2 bg-primary/10 text-primary">{t("auth.admin")}</Badge>
                        </label>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <Input 
                                type={joinCodeVisible ? "text" : "password"} 
                                value={selectedTeam?.joinCode || ''} 
                                disabled={true}
                                className="pr-10"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full aspect-square"
                                onClick={() => setJoinCodeVisible(!joinCodeVisible)}
                                title={joinCodeVisible ? t("settings.hideCode") : t("settings.showCode")}
                              >
                                {joinCodeVisible ? 
                                  <EyeOff className="h-4 w-4" /> : 
                                  <Eye className="h-4 w-4" />
                                }
                              </Button>
                            </div>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              onClick={copyJoinCodeToClipboard}
                              type="button"
                              title={t("settings.copyToClipboard")}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={handleRegenerateJoinCode} 
                              disabled={isGeneratingJoinCode}
                              type="button"
                            >
                              {isGeneratingJoinCode ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  {t("common.loading")}
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  {t("settings.regenerateJoinCode")}
                                </>
                              )}
                            </Button>
                          </div>
                          <p className="text-xs text-gray-500">
                            {t("settings.joinCodeDescription")}
                          </p>
                        </div>
                      </div>

                      <Button 
                        type="submit" 
                        className="mt-6 bg-primary hover:bg-primary/90"
                        disabled={!teamSettingsChanged || updateTeamMutation.isPending}
                      >
                        {updateTeamMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            {t("common.loading")}
                          </>
                        ) : (
                          t("common.saveChanges")
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="pb-16">
          <MobileNavigation />
        </div>
      </div>

      {/* Delete Member Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="h-5 w-5" />
              {t("team.removeTeamMember")}
            </DialogTitle>
            <DialogDescription>
              {t("settings.confirmDeleteMember")}<br/>
              {t("settings.deleteWarning")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              {t("settings.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteMember}
              disabled={deleteTeamMemberMutation.isPending}
              className="gap-1"
            >
              {deleteTeamMemberMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("common.loading")}
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  {t("settings.confirmDelete")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}