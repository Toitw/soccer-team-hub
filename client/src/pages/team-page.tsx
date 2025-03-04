import { useQuery, useMutation } from "@tanstack/react-query";
import { Team, TeamMember, User, User as SelectUser, InsertTeamMember } from "@shared/schema";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import MobileNavigation from "@/components/mobile-navigation";
import { useAuth } from "@/hooks/use-auth";
import { 
  Card, 
  CardContent,
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";

// Define a type that includes user data with our extended fields
interface TeamMemberWithUser extends TeamMember {
  user: Omit<SelectUser, 'password'> & {
    profilePicture?: string | null;
    position?: string;
    jerseyNumber?: number;
    email?: string;
    phoneNumber?: string;
  };
}
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Filter
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";

// Schema for adding a team member
const addTeamMemberSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().min(3, "Full name must be at least 3 characters"),
  role: z.enum(["coach", "player"]),
  position: z.string().optional(),
  jerseyNumber: z.coerce.number().int().optional(),
  email: z.string().email("Invalid email format").optional(),
  phoneNumber: z.string().optional(),
});

type AddTeamMemberFormData = z.infer<typeof addTeamMemberSchema>;

export default function TeamPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [openAddMemberDialog, setOpenAddMemberDialog] = useState(false);
  const [openRemoveMemberDialog, setOpenRemoveMemberDialog] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<TeamMemberWithUser | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const { data: teams, isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  // Select the first team by default
  const selectedTeam = teams && teams.length > 0 ? teams[0] : null;

  // Get team members
  const { data: teamMembers, isLoading: teamMembersLoading } = useQuery<TeamMemberWithUser[]>({
    queryKey: ["/api/teams", selectedTeam?.id, "members"],
    enabled: !!selectedTeam?.id,
    retry: 1,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Filtered team members based on role and search query
  const filteredTeamMembers = useMemo(() => {
    if (!teamMembers) return [];
    
    return teamMembers.filter(member => {
      // Filter by role
      const roleMatch = roleFilter === "all" || member.role === roleFilter;
      
      // Filter by search query
      const searchMatch = 
        searchQuery === "" || 
        member.user.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        member.user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.user.position?.toLowerCase().includes(searchQuery.toLowerCase());
      
      return roleMatch && searchMatch;
    });
  }, [teamMembers, roleFilter, searchQuery]);

  // Form for adding a new team member
  const form = useForm<AddTeamMemberFormData>({
    resolver: zodResolver(addTeamMemberSchema),
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
      role: "player",
      position: "",
      email: "",
      phoneNumber: "",
    },
  });
  
  // Remove team member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: number) => {
      if (!selectedTeam) throw new Error("No team selected");
      
      // Delete the team member
      await apiRequest(
        "DELETE",
        `/api/teams/${selectedTeam.id}/members/${memberId}`
      );
    },
    onSuccess: () => {
      toast({
        title: "Team member removed",
        description: "The team member has been removed successfully.",
      });
      setOpenRemoveMemberDialog(false);
      setMemberToRemove(null);
      queryClient.invalidateQueries({ queryKey: ["/api/teams", selectedTeam?.id, "members"] });
    },
    onError: (error) => {
      toast({
        title: "Error removing team member",
        description: error.message || "There was an error removing the team member.",
        variant: "destructive",
      });
    },
  });
  
  // Handle member removal confirmation
  const handleRemoveMember = () => {
    if (memberToRemove) {
      removeMemberMutation.mutate(memberToRemove.id);
    }
  };

  // Add user mutation
  const addUserMutation = useMutation({
    mutationFn: async (data: AddTeamMemberFormData) => {
      // First create the user
      const response = await apiRequest(
        "POST",
        "/api/register",
        data
      );
      
      const newUser = await response.json();

      // Then add them to the team
      if (selectedTeam) {
        await apiRequest(
          "POST", 
          `/api/teams/${selectedTeam.id}/members`,
          {
            userId: newUser.id,
            teamId: selectedTeam.id,
            role: data.role,
          } as InsertTeamMember
        );
      }

      return newUser;
    },
    onSuccess: () => {
      toast({
        title: "Team member added",
        description: "The new team member has been added successfully.",
      });
      setOpenAddMemberDialog(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/teams", selectedTeam?.id, "members"] });
    },
    onError: (error) => {
      toast({
        title: "Error adding team member",
        description: error.message || "There was an error adding the team member.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AddTeamMemberFormData) => {
    addUserMutation.mutate(data);
  };

  if (teamsLoading || teamMembersLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check if user is an admin to enable member management
  const isAdmin = user?.role === "admin" || teamMembers?.some(
    member => member.userId === user?.id && member.role === "admin"
  );

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      <div className="flex-1 ml-0 md:ml-64 overflow-y-auto">
        <Header title="Team" />

        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-primary">{selectedTeam?.name || "Team"}</h1>
              <p className="text-gray-500">{selectedTeam?.division || "No division set"}</p>
            </div>
            {isAdmin && (
              <Dialog open={openAddMemberDialog} onOpenChange={setOpenAddMemberDialog}>
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
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="johndoe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
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
                                  <SelectValue placeholder="Select a role" />
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
                            <FormLabel>Position</FormLabel>
                            <FormControl>
                              <Input placeholder="Forward" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="jerseyNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Jersey Number</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="10" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input placeholder="john.doe@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phoneNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input placeholder="+1 (123) 456-7890" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={addUserMutation.isPending}>
                        {addUserMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          "Add Member"
                        )}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Lineup Section */}
          <Card className="mb-8">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5 text-primary" />
                Team Lineup
              </CardTitle>
              {isAdmin && (
                <Button variant="outline" size="sm">
                  Save Lineup
                </Button>
              )}
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <div className="relative bg-green-800 w-full aspect-[16/9] min-h-[400px] rounded-md flex items-center justify-center">
                <div className="absolute top-0 left-0 w-full h-full flex flex-col">
                  {/* Field markings */}
                  <div className="border-2 border-white m-4 flex-1 rounded-md flex flex-col">
                    {/* Center circle */}
                    <div className="flex-1 relative">
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 border-2 border-white rounded-full"></div>
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-white rounded-full"></div>
                      {/* Center line */}
                      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 h-full w-0.5 bg-white"></div>
                      {/* Penalty areas */}
                      <div className="absolute top-1/2 transform -translate-y-1/2 left-0 h-40 w-16 border-r-2 border-t-2 border-b-2 border-white"></div>
                      <div className="absolute top-1/2 transform -translate-y-1/2 right-0 h-40 w-16 border-l-2 border-t-2 border-b-2 border-white"></div>
                      {/* Goal areas */}
                      <div className="absolute top-1/2 transform -translate-y-1/2 left-0 h-20 w-6 border-r-2 border-t-2 border-b-2 border-white"></div>
                      <div className="absolute top-1/2 transform -translate-y-1/2 right-0 h-20 w-6 border-l-2 border-t-2 border-b-2 border-white"></div>
                      {/* Goal posts */}
                      <div className="absolute top-1/2 transform -translate-y-1/2 left-0 h-12 w-1 bg-white"></div>
                      <div className="absolute top-1/2 transform -translate-y-1/2 right-0 h-12 w-1 bg-white"></div>
                      
                      {/* Sample player positions - these would be draggable in a full implementation */}
                      {teamMembers && teamMembers.length > 0 && (
                        <>
                          {/* Display players by position - simplified version */}
                          {teamMembers
                            .filter(member => member.role === "player" && member.user.position?.toLowerCase().includes("goalkeeper"))
                            .slice(0, 1)
                            .map(member => (
                              <div key={member.id} className="absolute bottom-10 left-1/2 transform -translate-x-1/2 w-10 h-10">
                                <div className="bg-blue-500 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg border-2 border-white">
                                  <span className="font-bold text-xs">{member.user.jerseyNumber || "?"}</span>
                                </div>
                                <div className="text-white text-xs mt-1 text-center font-semibold bg-black bg-opacity-50 rounded px-1">
                                  {member.user.fullName?.split(" ")[0] || ""}
                                </div>
                              </div>
                            ))}
                            
                          {/* Defenders */}
                          {teamMembers
                            .filter(member => member.role === "player" && member.user.position?.toLowerCase().includes("defender"))
                            .slice(0, 4)
                            .map((member, idx) => {
                              const positions = [
                                { left: '20%', bottom: '30%' },
                                { left: '40%', bottom: '30%' },
                                { left: '60%', bottom: '30%' },
                                { left: '80%', bottom: '30%' }
                              ];
                              return (
                                <div key={member.id} className="absolute w-10 h-10" style={{ 
                                  left: positions[idx].left, 
                                  bottom: positions[idx].bottom 
                                }}>
                                  <div className="bg-red-500 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg border-2 border-white">
                                    <span className="font-bold text-xs">{member.user.jerseyNumber || "?"}</span>
                                  </div>
                                  <div className="text-white text-xs mt-1 text-center font-semibold bg-black bg-opacity-50 rounded px-1">
                                    {member.user.fullName?.split(" ")[0] || ""}
                                  </div>
                                </div>
                              );
                            })}
                            
                          {/* Midfielders */}
                          {teamMembers
                            .filter(member => member.role === "player" && member.user.position?.toLowerCase().includes("midfielder"))
                            .slice(0, 3)
                            .map((member, idx) => {
                              const positions = [
                                { left: '30%', bottom: '50%' },
                                { left: '50%', bottom: '50%' },
                                { left: '70%', bottom: '50%' }
                              ];
                              return (
                                <div key={member.id} className="absolute w-10 h-10" style={{ 
                                  left: positions[idx].left, 
                                  bottom: positions[idx].bottom 
                                }}>
                                  <div className="bg-green-500 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg border-2 border-white">
                                    <span className="font-bold text-xs">{member.user.jerseyNumber || "?"}</span>
                                  </div>
                                  <div className="text-white text-xs mt-1 text-center font-semibold bg-black bg-opacity-50 rounded px-1">
                                    {member.user.fullName?.split(" ")[0] || ""}
                                  </div>
                                </div>
                              );
                            })}
                            
                          {/* Forwards */}
                          {teamMembers
                            .filter(member => member.role === "player" && member.user.position?.toLowerCase().includes("forward"))
                            .slice(0, 3)
                            .map((member, idx) => {
                              const positions = [
                                { left: '30%', bottom: '70%' },
                                { left: '50%', bottom: '75%' },
                                { left: '70%', bottom: '70%' }
                              ];
                              return (
                                <div key={member.id} className="absolute w-10 h-10" style={{ 
                                  left: positions[idx].left, 
                                  bottom: positions[idx].bottom 
                                }}>
                                  <div className="bg-yellow-500 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg border-2 border-white">
                                    <span className="font-bold text-xs">{member.user.jerseyNumber || "?"}</span>
                                  </div>
                                  <div className="text-white text-xs mt-1 text-center font-semibold bg-black bg-opacity-50 rounded px-1">
                                    {member.user.fullName?.split(" ")[0] || ""}
                                  </div>
                                </div>
                              );
                            })}
                        </>
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
              
              <div className="mt-4 text-sm text-muted-foreground">
                <p className="flex items-center">
                  <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                  Goalkeeper
                  <span className="inline-block w-3 h-3 bg-red-500 rounded-full ml-4 mr-2"></span>
                  Defender
                  <span className="inline-block w-3 h-3 bg-green-500 rounded-full ml-4 mr-2"></span>
                  Midfielder
                  <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full ml-4 mr-2"></span>
                  Forward
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Team Members Table */}
          <Card className="mb-8">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center">
                <UserCircle className="mr-2 h-5 w-5 text-primary" />
                Team Members
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Select 
                  value={roleFilter} 
                  onValueChange={setRoleFilter}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Filter by role">
                      <div className="flex items-center">
                        <Filter className="h-4 w-4 mr-2" />
                        {roleFilter === "all" ? "All Members" : 
                         roleFilter === "admin" ? "Admins" : 
                         roleFilter === "coach" ? "Coaches" : 
                         "Players"}
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
                    {filteredTeamMembers.length} {filteredTeamMembers.length === 1 ? 'result' : 'results'}
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
                      <TableCell colSpan={isAdmin ? 6 : 5} className="text-center py-8">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <AlertCircle className="h-12 w-12 mb-2" />
                          <div className="text-lg font-medium">No team members found</div>
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
                    // Safety check to ensure both member and user data exist
                    if (!member || !member.user) return null;
                    
                    return (
                      <TableRow key={member.id} className="hover:bg-accent/50">
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <Avatar className="h-10 w-10 mr-3 border border-primary/30">
                              <AvatarImage src={member.user.profilePicture || '/default-avatar.png'} alt={member.user.fullName} />
                              <AvatarFallback>{member.user.fullName?.charAt(0) || 'U'}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-semibold">{member.user.fullName || 'Unknown User'}</div>
                              <div className="text-xs text-muted-foreground">@{member.user.username}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {member.role === "admin" ? (
                              <Shield className="h-4 w-4 mr-1 text-primary" />
                            ) : member.role === "coach" ? (
                              <UserCog className="h-4 w-4 mr-1 text-primary" />
                            ) : (
                              <UserCircle className="h-4 w-4 mr-1 text-primary" />
                            )}
                            <span className="font-medium">
                              {member.role?.charAt(0).toUpperCase() + member.role?.slice(1) || 'Unknown'}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Joined {new Date(member.joinedAt || Date.now()).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          {member.user.position ? (
                            <div className="inline-flex px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                              {member.user.position}
                            </div>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          {member.user.jerseyNumber ? (
                            <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white font-bold">
                              {member.user.jerseyNumber}
                            </div>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col space-y-2">
                            {member.user.email && (
                              <div className="flex items-center text-sm">
                                <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                                <a href={`mailto:${member.user.email}`} className="hover:underline">
                                  {member.user.email}
                                </a>
                              </div>
                            )}
                            {member.user.phoneNumber && (
                              <div className="flex items-center text-sm">
                                <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                                <a href={`tel:${member.user.phoneNumber}`} className="hover:underline">
                                  {member.user.phoneNumber}
                                </a>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button variant="outline" size="sm">
                                Edit
                              </Button>
                              {/* Don't allow removing yourself */}
                              {member.userId !== user?.id && (
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  onClick={() => {
                                    setMemberToRemove(member);
                                    setOpenRemoveMemberDialog(true);
                                  }}
                                >
                                  Remove
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
                
                {/* Remove Member Confirmation Dialog */}
                <Dialog open={openRemoveMemberDialog} onOpenChange={setOpenRemoveMemberDialog}>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Confirm Removal</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to remove {memberToRemove?.user.fullName} from the team?
                        This action cannot be undone.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center space-x-3 py-3">
                      <Avatar className="h-12 w-12 border border-primary/30">
                        <AvatarImage 
                          src={memberToRemove?.user.profilePicture || '/default-avatar.png'} 
                          alt={memberToRemove?.user.fullName || ''} 
                        />
                        <AvatarFallback>
                          {memberToRemove?.user.fullName?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold">{memberToRemove?.user.fullName || 'Unknown User'}</div>
                        <div className="text-sm text-muted-foreground">
                          {memberToRemove?.role?.charAt(0).toUpperCase() + memberToRemove?.role?.slice(1) || 'Team Member'}
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setOpenRemoveMemberDialog(false)}>
                        Cancel
                      </Button>
                      <Button 
                        variant="destructive" 
                        onClick={handleRemoveMember}
                        disabled={removeMemberMutation.isPending}
                      >
                        {removeMemberMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Removing...
                          </>
                        ) : (
                          "Remove Member"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </Table>
            </CardContent>
          </Card>
        </div>

        <MobileNavigation />
      </div>
    </div>
  );
}
