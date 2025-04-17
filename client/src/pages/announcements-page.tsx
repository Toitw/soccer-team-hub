import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Announcement, InsertAnnouncement, TeamMember } from "@shared/schema";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import MobileNavigation from "@/components/mobile-navigation";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, PlusIcon, TrashIcon, AlertTriangle, PencilIcon, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
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
  DialogDescription,
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

interface PageProps {
  readOnly?: boolean;
}

export default function AnnouncementsPage(props: PageProps = {}) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentAnnouncement, setCurrentAnnouncement] = useState<Announcement | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all teams
  const { data: teams = [], isLoading: teamsLoading } = useQuery<any[]>({
    queryKey: ["/api/teams"],
  });

  // Select the first team by default
  const selectedTeam = teams.length > 0 ? teams[0] : null;

  // Fetch all announcements for the selected team
  const { data: announcements = [], isLoading: announcementsLoading, refetch: refetchAnnouncements } = useQuery<
    (Announcement & { creator?: any })[]
  >({
    queryKey: ["/api/teams", selectedTeam?.id, "announcements"],
    queryFn: async () => {
      console.log(`AnnouncementsPage: Fetching announcements for team ${selectedTeam?.id}`);
      try {
        if (!selectedTeam?.id) {
          console.warn('AnnouncementsPage: No team ID available');
          return [];
        }
        
        // Use apiRequest without specifying method to use the default GET
        const response = await apiRequest(`/api/teams/${selectedTeam.id}/announcements`);
        
        // Handle empty or invalid responses
        if (!response || typeof response !== 'object') {
          console.error('AnnouncementsPage: Invalid response format:', response);
          return [];
        }
        
        // Make sure we have an array
        const data = Array.isArray(response) ? response : [];
        console.log('AnnouncementsPage: Retrieved announcements:', data);
        
        // Sort announcements by creation date (newest first)
        const sorted = data.sort((a, b) => 
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        return sorted;
      } catch (error) {
        console.error('AnnouncementsPage: Error fetching announcements:', error);
        return [];
      }
    },
    enabled: !!selectedTeam?.id, // Only run query if we have a team ID
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0, // Always consider data stale to ensure fresh data
    retry: 3, // Retry failed requests up to 3 times
    refetchInterval: 60000 // Refresh data every minute
  });

  // Create form for adding a new announcement
  const form = useForm<AnnouncementFormData>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: "",
      content: "",
    },
  });
  
  // Edit form
  const editForm = useForm<AnnouncementFormData>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: "",
      content: "",
    },
  });
  
  // Update form values when currentAnnouncement changes
  useEffect(() => {
    if (currentAnnouncement) {
      editForm.reset({
        title: currentAnnouncement.title,
        content: currentAnnouncement.content,
      });
    }
  }, [currentAnnouncement, editForm]);

  // Create announcement mutation
  const createAnnouncementMutation = useMutation({
    mutationFn: async (data: AnnouncementFormData) => {
      if (!selectedTeam) throw new Error("No team selected");
      return apiRequest(`/api/teams/${selectedTeam.id}/announcements`, {
        method: "POST",
        data: data
      });
    },
    onSuccess: async (response) => {
      // Explicitly invalidate the queries
      await queryClient.invalidateQueries({
        queryKey: ["/api/teams", selectedTeam?.id, "announcements"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["/api/teams", selectedTeam?.id, "announcements/recent"],
      });
      
      // Force an immediate refetch to update the UI
      await refetchAnnouncements();
      
      // Close the form and show success message
      setOpen(false);
      form.reset();
      console.log('Announcement created successfully:', response);
      toast({
        title: t("announcements.createAnnouncement"),
        description: t("announcements.createAnnouncementSuccess"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("common.error"),
        description: error.message || t("announcements.failedToCreate"),
        variant: "destructive",
      });
    },
  });

  // Update announcement mutation
  const updateAnnouncementMutation = useMutation({
    mutationFn: async (data: { id: number; title: string; content: string }) => {
      if (!selectedTeam) throw new Error("No team selected");
      return apiRequest(`/api/teams/${selectedTeam.id}/announcements/${data.id}`, {
        method: "PATCH",
        data: { title: data.title, content: data.content }
      });
    },
    onSuccess: async (response) => {
      // Explicitly invalidate the queries
      await queryClient.invalidateQueries({
        queryKey: ["/api/teams", selectedTeam?.id, "announcements"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["/api/teams", selectedTeam?.id, "announcements/recent"],
      });
      
      // Force an immediate refetch to update the UI
      await refetchAnnouncements();
      
      // Close the form and show success message
      setEditDialogOpen(false);
      setCurrentAnnouncement(null);
      console.log('Announcement updated successfully:', response);
      toast({
        title: t("announcements.editAnnouncement"),
        description: t("announcements.updateAnnouncementSuccess"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("common.error"),
        description: error.message || t("announcements.failedToUpdate"),
        variant: "destructive",
      });
    },
  });

  // Delete announcement mutation
  const deleteAnnouncementMutation = useMutation({
    mutationFn: async (id: number) => {
      if (!selectedTeam) throw new Error("No team selected");
      return apiRequest(`/api/teams/${selectedTeam.id}/announcements/${id}`, {
        method: "DELETE"
      });
    },
    onSuccess: async (response) => {
      // Explicitly invalidate the queries
      await queryClient.invalidateQueries({
        queryKey: ["/api/teams", selectedTeam?.id, "announcements"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["/api/teams", selectedTeam?.id, "announcements/recent"],
      });
      
      // Force an immediate refetch to update the UI
      await refetchAnnouncements();
      
      console.log('Announcement deleted successfully:', response);
      toast({
        title: t("announcements.deleteAnnouncement"),
        description: t("announcements.deleteAnnouncementSuccess"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("common.error"),
        description: error.message || t("announcements.failedToDelete"),
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: AnnouncementFormData) => {
    createAnnouncementMutation.mutate(data);
  };
  
  // Handle edit form submission
  const onEditSubmit = (data: AnnouncementFormData) => {
    if (!currentAnnouncement) return;
    
    updateAnnouncementMutation.mutate({
      id: currentAnnouncement.id,
      title: data.title,
      content: data.content,
    });
  };

  // Fetch team member role for the current user - using the teams data instead to avoid extra API call
  // This workaround uses the fact that we already have the team members from the dashboard
  const teamMember = selectedTeam?.id && user?.id 
    ? { role: user?.role === "admin" ? "admin" : "coach" } // Default to admin/coach for site admin
    : null;

  const isLoading = teamsLoading || announcementsLoading;

  // Check if user is admin or coach (allowed to create/delete announcements)
  // Players are only allowed to view announcements
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

    // Strict role-based permission check:
    // 1. Administrators: Full access to create/edit/delete announcements
    // 2. Coaches: Can create/edit/delete announcements
    // 3. Players: No management permissions, read-only access
    const canManage = user.role === "admin" || user.role === "coach";
    
    console.log('User permission check:', { 
      userRole: user.role,
      canManage,
      userId: user.id, 
      teamId: selectedTeam.id 
    });

    // If readOnly prop is passed from ProtectedRoute, enforce read-only mode
    if (props.readOnly === true) {
      console.log('Component is in read-only mode');
      return false;
    }

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

      <div className="flex-1 ml-0 md:ml-64 z-30">
        <Header title={t("announcements.latestAnnouncements")} />

        <div className="px-3 sm:px-6 lg:px-8 py-6 pb-24 max-w-full overflow-x-hidden"> {/* Added max-width and overflow control */}
          <div className="flex flex-wrap justify-between items-center mb-6 gap-y-2">
            <div className="flex items-center">
              <h1 className="text-xl sm:text-2xl font-bold">{t("announcements.teamAnnouncements")}</h1>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => {
                  console.log('Current announcements:', announcements);
                  refetchAnnouncements();
                  toast({
                    title: t("announcements.refreshed"),
                    description: t("announcements.announcementsUpdated"),
                  });
                }}
                className="ml-2"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {canManageAnnouncements() && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="sm:text-base">
                    <PlusIcon className="h-4 w-4 mr-1 sm:mr-2" />
                    <span className="whitespace-nowrap">{t("announcements.newAnnouncement")}</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t("announcements.createAnnouncement")}</DialogTitle>
                    <DialogDescription>
                      {t("announcements.createAnnouncementDescription")}
                    </DialogDescription>
                  </DialogHeader>

                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("announcements.title")}</FormLabel>
                            <FormControl>
                              <Input placeholder={t("announcements.title")} {...field} />
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
                            <FormLabel>{t("announcements.content")}</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder={t("announcements.content")}
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
                          {t("announcements.createAnnouncement")}
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
              <h3 className="mt-4 text-lg font-medium">{t("announcements.noAnnouncements")}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("announcements.noAnnouncementsDescription")}
              </p>
              {canManageAnnouncements() && (
                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={() => setOpen(true)}
                >
                  {t("announcements.createFirstAnnouncement")}
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 max-w-full">
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
                  <Card key={announcement.id} className={`border-l-4 ${borderColor} max-w-full overflow-hidden`}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="break-words mr-2">{announcement.title}</CardTitle>
                        {canManageAnnouncements() && (
                          <div className="flex shrink-0">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => {
                                setCurrentAnnouncement(announcement);
                                setEditDialogOpen(true);
                              }}
                            >
                              <PencilIcon className="h-4 w-4" />
                            </Button>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive">
                                  <TrashIcon className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t("announcements.areYouSure")}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t("announcements.deleteConfirmation")}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteAnnouncementMutation.mutate(announcement.id)}
                                    className="bg-destructive text-destructive-foreground"
                                  >
                                    {deleteAnnouncementMutation.isPending ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      t("announcements.deleteAnnouncement")
                                    )}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap break-words">{announcement.content}</p>
                    </CardContent>
                    <CardFooter className="flex flex-wrap justify-between pt-2 text-xs text-muted-foreground gap-y-1">
                      <span className="break-words">
                        {announcement.createdAt
                          ? format(
                              new Date(announcement.createdAt),
                              // Use different date formats based on current language
                              t("language") === "es" 
                                ? "d 'de' MMMM 'de' yyyy"
                                : "MMMM d, yyyy",
                              { locale: t("language") === "es" ? es : undefined }
                            )
                          : t("common.notAvailable")}
                      </span>
                      <span className="break-words">
                        {t("announcements.author")}: {announcement.creator?.fullName || `${t("common.user")} ${announcement.createdById}`}
                      </span>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Edit Announcement Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("announcements.editAnnouncement")}</DialogTitle>
              <DialogDescription>
                {t("announcements.editAnnouncementDescription")}
              </DialogDescription>
            </DialogHeader>

            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("announcements.title")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("announcements.title")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("announcements.content")}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t("announcements.content")}
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
                    disabled={updateAnnouncementMutation.isPending}
                  >
                    {updateAnnouncementMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {t("announcements.editAnnouncement")}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <MobileNavigation />
      </div>
    </div>
  );
}