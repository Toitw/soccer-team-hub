import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { PlusIcon, UserPlusIcon, MailIcon, ClipboardIcon, ChevronDownIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const inviteSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  role: z.string({
    required_error: "Please select a role",
  }),
});

export default function TeamPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";
  const isCoach = user?.role === "coach";
  const canManage = isAdmin || isCoach;

  const { data: team, isLoading } = useQuery({
    queryKey: ["/api/team"],
  });

  const { data: invitations } = useQuery({
    queryKey: ["/api/team/invitations"],
  });

  const inviteForm = useForm<z.infer<typeof inviteSchema>>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      role: "player",
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: z.infer<typeof inviteSchema>) => {
      const res = await apiRequest("POST", "/api/team/invite", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team/invitations"] });
      toast({
        title: "Invitation sent",
        description: "The team invitation has been sent successfully.",
      });
      inviteForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to send invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest("DELETE", `/api/team/members/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team"] });
      toast({
        title: "Member removed",
        description: "The team member has been removed successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to remove member",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const cancelInvitationMutation = useMutation({
    mutationFn: async (invitationId: number) => {
      await apiRequest("DELETE", `/api/team/invitations/${invitationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team/invitations"] });
      toast({
        title: "Invitation cancelled",
        description: "The invitation has been cancelled successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to cancel invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      await apiRequest("PATCH", `/api/team/members/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team"] });
      toast({
        title: "Role updated",
        description: "The member's role has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update role",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function onInviteSubmit(values: z.infer<typeof inviteSchema>) {
    inviteMutation.mutate(values);
  }

  const copyInviteLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/auth?invite=true`);
    toast({
      title: "Invite link copied",
      description: "Team invitation link has been copied to clipboard.",
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <div className="md:flex md:items-center md:justify-between mb-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-7 text-gray-900 font-inter sm:text-3xl sm:leading-9 sm:truncate">
              Team Management
            </h1>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            {canManage && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="inline-flex items-center">
                    <UserPlusIcon className="-ml-1 mr-2 h-5 w-5" />
                    Invite Member
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Invite Team Member</DialogTitle>
                    <DialogDescription>
                      Send an invitation to a new team member. They'll receive an email with instructions to join.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...inviteForm}>
                    <form onSubmit={inviteForm.handleSubmit(onInviteSubmit)} className="space-y-4">
                      <FormField
                        control={inviteForm.control}
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
                        control={inviteForm.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Role</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {isAdmin && <SelectItem value="admin">Administrator</SelectItem>}
                                {(isAdmin || isCoach) && <SelectItem value="coach">Coach</SelectItem>}
                                <SelectItem value="player">Player</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button type="submit" disabled={inviteMutation.isPending}>
                          {inviteMutation.isPending ? "Sending..." : "Send Invitation"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <Tabs defaultValue="members" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="members">Team Members</TabsTrigger>
                {canManage && <TabsTrigger value="invitations">Pending Invitations</TabsTrigger>}
              </TabsList>
            </Tabs>
          </div>
          
          <div className="p-4">
            <Tabs defaultValue="members">
              <TabsContent value="members">
                <div className="overflow-hidden">
                  <div className="mb-4 flex justify-between items-center">
                    <h3 className="text-lg font-medium">Team Roster</h3>
                    {canManage && (
                      <Button variant="outline" className="text-sm" onClick={copyInviteLink}>
                        <ClipboardIcon className="mr-2 h-4 w-4" />
                        Copy Invite Link
                      </Button>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Role
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Position
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Joined
                          </th>
                          {canManage && (
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {team?.members?.map((member: any) => (
                          <tr key={member.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <img className="h-10 w-10 rounded-full" src={`https://ui-avatars.com/api/?name=${encodeURIComponent(member.username)}&background=0D47A1&color=fff`} alt="" />
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {member.username}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {member.email || "No email provided"}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge className={`
                                ${member.role === 'admin' ? 'bg-primary text-white' : 
                                  member.role === 'coach' ? 'bg-secondary text-white' : 
                                  'bg-accent text-text'}
                              `}>
                                {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{member.position || "Not specified"}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(member.joinedAt || Date.now()).toLocaleDateString()}
                            </td>
                            {canManage && (
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                {member.id !== user?.id ? (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" className="h-8 w-8 p-0">
                                        <span className="sr-only">Open menu</span>
                                        <ChevronDownIcon className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                      <DropdownMenuSeparator />
                                      {isAdmin && (
                                        <>
                                          <DropdownMenuItem 
                                            onClick={() => updateRoleMutation.mutate({ userId: member.id, role: "admin" })}
                                            disabled={member.role === "admin"}
                                          >
                                            Set as Admin
                                          </DropdownMenuItem>
                                          <DropdownMenuItem 
                                            onClick={() => updateRoleMutation.mutate({ userId: member.id, role: "coach" })}
                                            disabled={member.role === "coach"}
                                          >
                                            Set as Coach
                                          </DropdownMenuItem>
                                          <DropdownMenuItem 
                                            onClick={() => updateRoleMutation.mutate({ userId: member.id, role: "player" })}
                                            disabled={member.role === "player"}
                                          >
                                            Set as Player
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                        </>
                                      )}
                                      <DropdownMenuItem 
                                        className="text-red-600"
                                        onClick={() => {
                                          if (confirm("Are you sure you want to remove this member from the team?")) {
                                            removeMemberMutation.mutate(member.id);
                                          }
                                        }}
                                      >
                                        Remove
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                ) : (
                                  <span className="text-gray-400">You</span>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>
              
              {canManage && (
                <TabsContent value="invitations">
                  <div className="overflow-hidden">
                    <div className="mb-4">
                      <h3 className="text-lg font-medium">Pending Invitations</h3>
                    </div>
                    {invitations?.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Email
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Role
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Sent
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {invitations.map((invitation: any) => (
                              <tr key={invitation.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">{invitation.email}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <Badge className={`
                                    ${invitation.role === 'admin' ? 'bg-primary text-white' : 
                                      invitation.role === 'coach' ? 'bg-secondary text-white' : 
                                      'bg-accent text-text'}
                                  `}>
                                    {invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}
                                  </Badge>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(invitation.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <Badge variant="outline" className="text-amber-600 border-amber-600">
                                    Pending
                                  </Badge>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <Button 
                                    variant="ghost" 
                                    className="text-red-600 hover:text-red-900 hover:bg-red-50"
                                    onClick={() => {
                                      if (confirm("Are you sure you want to cancel this invitation?")) {
                                        cancelInvitationMutation.mutate(invitation.id);
                                      }
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <MailIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No pending invitations</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Get started by inviting team members.
                        </p>
                        <div className="mt-6">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button className="inline-flex items-center">
                                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                                Invite Member
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                              <DialogHeader>
                                <DialogTitle>Invite Team Member</DialogTitle>
                                <DialogDescription>
                                  Send an invitation to a new team member. They'll receive an email with instructions to join.
                                </DialogDescription>
                              </DialogHeader>
                              <Form {...inviteForm}>
                                <form onSubmit={inviteForm.handleSubmit(onInviteSubmit)} className="space-y-4">
                                  <FormField
                                    control={inviteForm.control}
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
                                    control={inviteForm.control}
                                    name="role"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Role</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                          <FormControl>
                                            <SelectTrigger>
                                              <SelectValue placeholder="Select a role" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            {isAdmin && <SelectItem value="admin">Administrator</SelectItem>}
                                            {(isAdmin || isCoach) && <SelectItem value="coach">Coach</SelectItem>}
                                            <SelectItem value="player">Player</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <DialogFooter>
                                    <Button type="submit" disabled={inviteMutation.isPending}>
                                      {inviteMutation.isPending ? "Sending..." : "Send Invitation"}
                                    </Button>
                                  </DialogFooter>
                                </form>
                              </Form>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
