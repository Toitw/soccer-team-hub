import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Team, TeamMember } from "@shared/schema";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import MobileNavigation from "@/components/mobile-navigation";
import { useAuth } from "@/hooks/use-auth";
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
  DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, UserPlus, Mail } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

// Define form schema for inviting members
const inviteSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  role: z.enum(["admin", "coach", "player"]),
});

type InviteFormData = z.infer<typeof inviteSchema>;

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("members");

  const { data: teams, isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  // Select the first team by default
  const selectedTeam = teams && teams.length > 0 ? teams[0] : null;

  const { data: teamMembers, isLoading: membersLoading } = useQuery<(TeamMember & { user: any })[]>({
    queryKey: ["/api/teams", selectedTeam?.id, "members"],
    enabled: !!selectedTeam,
  });

  const isLoading = teamsLoading || membersLoading;

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

      <div className="flex-1 ml-0 md:ml-64">
        <Header title="Settings" />

        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-primary">{selectedTeam?.name || "Team"}</h1>
              <p className="text-gray-500">{selectedTeam?.division || "No division set"}</p>
            </div>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                  <DialogDescription>
                    Send an invitation email to add a new member to the team.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter email address" {...field} />
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
                          <FormControl>
                            <select 
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              {...field}
                            >
                              <option value="player">Player</option>
                              <option value="coach">Coach</option>
                              <option value="admin">Administrator</option>
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="submit" className="bg-primary hover:bg-primary/90">
                        <Mail className="h-4 w-4 mr-2" />
                        Send Invitation
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <Tabs defaultValue="members" value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="members">Team Members</TabsTrigger>
              <TabsTrigger value="settings">Team Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="members" className="mt-6">
              <div className="grid grid-cols-1 gap-6">
                {/* Administrators */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Administrators</CardTitle>
                    <CardDescription>Team administrators with full access to team settings</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Position</TableHead>
                          <TableHead>Contact</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {adminMembers.map(member => (
                          <TableRow key={member.id}>
                            <TableCell className="font-medium flex items-center gap-2">
                              <img 
                                src={member.user.profilePicture || "https://ui-avatars.com/api/?name=Admin+User&background=0D47A1&color=fff"} 
                                alt={member.user.fullName}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                              {member.user.fullName}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">Administrator</Badge>
                            </TableCell>
                            <TableCell>{member.user.email}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Coaches */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Coaches</CardTitle>
                    <CardDescription>Team coaches who manage training sessions and matches</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Position</TableHead>
                          <TableHead>Contact</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {coachMembers.map(member => (
                          <TableRow key={member.id}>
                            <TableCell className="font-medium flex items-center gap-2">
                              <img 
                                src={member.user.profilePicture || "https://ui-avatars.com/api/?name=Coach&background=4CAF50&color=fff"} 
                                alt={member.user.fullName}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                              {member.user.fullName}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-[#4CAF50]/10 text-[#4CAF50] hover:bg-[#4CAF50]/20">Coach</Badge>
                            </TableCell>
                            <TableCell>{member.user.email}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Players */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Players</CardTitle>
                    <CardDescription>Team players roster</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Position</TableHead>
                          <TableHead>Jersey #</TableHead>
                          <TableHead>Contact</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {playerMembers.map(member => (
                          <TableRow key={member.id}>
                            <TableCell className="font-medium flex items-center gap-2">
                              <img 
                                src={member.user.profilePicture || "https://ui-avatars.com/api/?name=Player&background=FFC107&color=fff"} 
                                alt={member.user.fullName}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                              {member.user.fullName}
                            </TableCell>
                            <TableCell>{member.user.position || "Not set"}</TableCell>
                            <TableCell>{member.user.jerseyNumber || "-"}</TableCell>
                            <TableCell>{member.user.email}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Team Settings</CardTitle>
                  <CardDescription>Manage your team's information and preferences</CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Team Name</label>
                      <Input defaultValue={selectedTeam?.name || ''} />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Division</label>
                      <Input defaultValue={selectedTeam?.division || ''} />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Season Year</label>
                      <Input defaultValue={selectedTeam?.seasonYear || ''} />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Team Logo</label>
                      <div className="flex items-center gap-4">
                        <img 
                          src={selectedTeam?.logo || "https://ui-avatars.com/api/?name=Team&background=0D47A1&color=fff"} 
                          alt="Team Logo" 
                          className="w-16 h-16 rounded-full object-cover border-2 border-primary"
                        />
                        <Button variant="outline">Change Logo</Button>
                      </div>
                    </div>
                    
                    <Button className="mt-6 bg-primary hover:bg-primary/90">Save Changes</Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <MobileNavigation />
      </div>
    </div>
  );
}