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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  Phone
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";

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
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5 text-primary" />
                Team Lineup
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <div className="relative bg-green-800 w-full aspect-[16/9] min-h-[300px] rounded-md flex items-center justify-center">
                <div className="absolute top-0 left-0 w-full h-full flex flex-col">
                  {/* Field markings */}
                  <div className="border-2 border-white m-4 flex-1 rounded-md flex flex-col">
                    {/* Center circle */}
                    <div className="flex-1 relative">
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 border-2 border-white rounded-full"></div>
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-white rounded-full"></div>
                      {/* Center line */}
                      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 h-full w-0.5 bg-white"></div>
                    </div>
                  </div>
                </div>
                <div className="relative z-10 text-white text-center">
                  {!teamMembers?.length && "No team members available for lineup"}
                  {teamMembers?.length > 0 && "Drag & drop players here to create lineup (Coming soon)"}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Members Table */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserCircle className="mr-2 h-5 w-5 text-primary" />
                Team Members
              </CardTitle>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!teamMembers?.length && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">No team members found</TableCell>
                    </TableRow>
                  )}
                  {teamMembers?.map((member) => {
                    // Safety check to ensure both member and user data exist
                    if (!member || !member.user) return null;
                    
                    return (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <Avatar className="h-8 w-8 mr-2">
                              <AvatarImage src={member.user.profilePicture || '/default-avatar.png'} alt={member.user.fullName} />
                              <AvatarFallback>{member.user.fullName?.charAt(0) || 'U'}</AvatarFallback>
                            </Avatar>
                            {member.user.fullName || 'Unknown User'}
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
                            {member.role?.charAt(0).toUpperCase() + member.role?.slice(1) || 'Unknown'}
                          </div>
                        </TableCell>
                        <TableCell>{member.user.position || "—"}</TableCell>
                        <TableCell>{member.user.jerseyNumber || "—"}</TableCell>
                        <TableCell>
                          <div className="flex flex-col space-y-1">
                            {member.user.email && (
                              <div className="flex items-center text-xs">
                                <Mail className="h-3 w-3 mr-1" />
                                {member.user.email}
                              </div>
                            )}
                            {member.user.phoneNumber && (
                              <div className="flex items-center text-xs">
                                <Phone className="h-3 w-3 mr-1" />
                                {member.user.phoneNumber}
                              </div>
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
    </div>
  );
}
