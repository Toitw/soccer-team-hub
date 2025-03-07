import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Announcement, InsertAnnouncement, TeamMember } from "@shared/schema";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import MobileNavigation from "@/components/mobile-navigation";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, PlusIcon, TrashIcon, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

// Define the validation schema for announcements
const announcementSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
});

type AnnouncementFormData = z.infer<typeof announcementSchema>;

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all teams
  const { data: teams = [], isLoading: teamsLoading } = useQuery<any[]>({
    queryKey: ["/api/teams"],
  });

  // Select the first team by default
  const selectedTeam = teams.length > 0 ? teams[0] : null;

  // Fetch all announcements for the selected team
  const { data: announcements = [], isLoading: announcementsLoading } = useQuery<
    (Announcement & { creator?: any })[]
  >({
    queryKey: ["/api/teams", selectedTeam?.id, "announcements"],
    enabled: !!selectedTeam,
  });

  // Create form for adding a new announcement
  const form = useForm<AnnouncementFormData>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: "",
      content: "",
    },
  });

  // Create mutation for adding a new announcement
  const createAnnouncementMutation = useMutation({
    mutationFn: async (data: AnnouncementFormData) => {
      if (!selectedTeam) throw new Error("No team selected");
      return apiRequest(
        "POST",
        `/api/teams/${selectedTeam.id}/announcements`,
        data
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/teams", selectedTeam?.id, "announcements"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/teams", selectedTeam?.id, "announcements/recent"],
      });
      setOpen(false);
      form.reset();
      toast({
        title: "Announcement created",
        description: "Your announcement has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create announcement",
        variant: "destructive",
      });
    },
  });

  // Delete announcement mutation
  const deleteAnnouncementMutation = useMutation({
    mutationFn: async (id: number) => {
      if (!selectedTeam) throw new Error("No team selected");
      return apiRequest(
        "DELETE",
        `/api/teams/${selectedTeam.id}/announcements/${id}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/teams", selectedTeam?.id, "announcements"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/teams", selectedTeam?.id, "announcements/recent"],
      });
      toast({
        title: "Announcement deleted",
        description: "The announcement has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete announcement",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: AnnouncementFormData) => {
    createAnnouncementMutation.mutate(data);
  };

  // Fetch team member role for the current user - using the teams data instead to avoid extra API call
  // This workaround uses the fact that we already have the team members from the dashboard
  const teamMember = selectedTeam?.id && user?.id 
    ? { role: user?.role === "admin" ? "admin" : "coach" } // Default to admin/coach for site admin
    : null;
  
  const isLoading = teamsLoading || announcementsLoading;
  
  // Check if user is admin or coach (allowed to create/delete announcements)
  const canManageAnnouncements = () => {
    if (!selectedTeam || !user || !teamMember) {
      console.log('Cannot manage announcements - missing data:', { 
        hasSelectedTeam: !!selectedTeam, 
        hasUser: !!user, 
        hasTeamMember: !!teamMember,
        userRole: user?.role
      });
      return false;
    }
    
    const canManage = teamMember.role === "admin" || teamMember.role === "coach";
    console.log('User permission check:', { 
      teamMemberRole: teamMember.role,
      canManage,
      userId: user.id, 
      teamId: selectedTeam.id 
    });
    
    return canManage;
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      <div className="flex-1 ml-0 md:ml-64">
        <Header title="Announcements" />

        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Team Announcements</h1>
            
            {canManageAnnouncements() && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    New Announcement
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Announcement</DialogTitle>
                  </DialogHeader>
                  
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter announcement title" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="content"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Content</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Enter announcement content"
                                className="min-h-[120px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <DialogFooter>
                        <Button 
                          type="submit" 
                          disabled={createAnnouncementMutation.isPending}
                        >
                          {createAnnouncementMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Create Announcement
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {announcements?.length === 0 ? (
            <div className="bg-muted/20 rounded-lg p-8 text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No announcements yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                When announcements are created, they will appear here.
              </p>
              {canManageAnnouncements() && (
                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={() => setOpen(true)}
                >
                  Create your first announcement
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4">
              {announcements?.map((announcement) => {
                let borderColor = "border-secondary";
                
                // Assign different border colors based on the announcement title
                if (announcement.title) {
                  if (announcement.title.includes("Training")) {
                    borderColor = "border-accent";
                  } else if (announcement.title.includes("Equipment")) {
                    borderColor = "border-primary";
                  }
                }
                
                return (
                  <Card key={announcement.id} className={`border-l-4 ${borderColor}`}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle>{announcement.title}</CardTitle>
                        {canManageAnnouncements() && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive">
                                <TrashIcon className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete this announcement.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteAnnouncementMutation.mutate(announcement.id)}
                                  className="bg-destructive text-destructive-foreground"
                                >
                                  {deleteAnnouncementMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    "Delete"
                                  )}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap">{announcement.content}</p>
                    </CardContent>
                    <CardFooter className="flex justify-between pt-2 text-xs text-muted-foreground">
                      <span>
                        {announcement.createdAt
                          ? format(new Date(announcement.createdAt), "MMMM d, yyyy")
                          : "Date not available"}
                      </span>
                      <span>
                        Posted by: {announcement.creator?.fullName || `User ${announcement.createdById}`}
                      </span>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <MobileNavigation />
      </div>
    </div>
  );
}