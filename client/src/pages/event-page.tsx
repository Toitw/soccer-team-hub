import { useState, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Team, Event } from "@shared/schema";
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
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Calendar as CalendarIcon,
  Loader2,
  PlusCircle,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Edit,
  Trash2,
  Users,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { format, isSameDay } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";


// Define form schema for creating an event
const eventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  location: z.string().min(1, "Location is required"),
  description: z.string().max(500, "Description must be 500 characters or less").optional(),
  eventType: z.enum(["training", "meeting", "match", "other"]).default("training"),
});

type EventFormData = z.infer<typeof eventSchema>;

// Define a type for the attendance data
type AttendanceData = {
  total: number;
  confirmed: number;
  attendees: Array<{
    id: number;
    eventId: number;
    userId: number;
    status: 'confirmed' | 'declined' | 'pending';
  }>;
};

export default function EventPage() {
  // Hooks setup - all hooks must be declared before any conditional logic
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  // State hooks - declare all state hooks up front  
  const [activeTab, setActiveTab] = useState<"calendar" | "list">("calendar");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [attendanceMap, setAttendanceMap] = useState<Record<number, AttendanceData>>({});
  const [attendanceStatus, setAttendanceStatus] = useState<Record<number, "attending" | "notAttending" | null>>({});

  // Query hooks
  const { data: teams, isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  // Select the first team by default
  const selectedTeam = teams && teams.length > 0 ? teams[0] : null;

  const { data: events, isLoading: eventsLoading, refetch: refetchEvents } = useQuery<Event[]>({
    queryKey: ["/api/teams", selectedTeam?.id, "events"],
    enabled: !!selectedTeam,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in memory for 10 minutes
    queryFn: async () => {
      if (!selectedTeam) return [];
      console.log("Events page: Fetching events for team", selectedTeam.id);
      const response = await fetch(`/api/teams/${selectedTeam.id}/events`, {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch events");
      const allEvents = await response.json();
      console.log("Events page: Retrieved events:", allEvents);
      return allEvents;
    },
  });

  // Form setup
  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      startTime: new Date().toISOString().slice(0, 16),
      endTime: new Date(new Date().getTime() + 90 * 60 * 1000)
        .toISOString()
        .slice(0, 16),
      location: "",
      description: "",
      eventType: "training",
    },
  });

  // Mutation hooks
  const createEventMutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      if (!selectedTeam) {
        throw new Error("No team selected");
      }

      // Format dates properly for API by converting HTML datetime-local format to ISO format
      const formattedData = {
        ...data,
        startTime: new Date(data.startTime).toISOString(), // Format as full ISO string
        endTime: data.endTime ? new Date(data.endTime).toISOString() : undefined, // Format as full ISO string
      };

      console.log("Formatted event data for API:", formattedData);

      return await apiRequest(`/api/teams/${selectedTeam.id}/events`, {
        method: "POST",
        data: formattedData,
      });
    },
    onSuccess: () => {
      // Invalidate events query to trigger a refetch
      if (selectedTeam?.id) {
        queryClient.invalidateQueries({
          queryKey: ["/api/teams", selectedTeam.id, "events"],
        });
      }
      setDialogOpen(false);
      toast({
        titleKey: "toasts.eventCreated",
        descriptionKey: "toasts.eventCreatedDesc",
      });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        titleKey: "toasts.error",
        description: `${t("toasts.actionFailed")}: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async (data: EventFormData & { id: number }) => {
      if (!selectedTeam) {
        throw new Error("No team selected");
      }

      // Format dates properly for API by converting HTML datetime-local format to ISO format
      const { id, ...formData } = data;
      const formattedData = {
        ...formData,
        startTime: new Date(formData.startTime).toISOString(), // Format as full ISO string
        endTime: formData.endTime ? new Date(formData.endTime).toISOString() : undefined, // Format as full ISO string
      };

      console.log("Formatted update event data for API:", formattedData);

      return await apiRequest(`/api/teams/${selectedTeam.id}/events/${id}`, {
        method: "PATCH",
        data: formattedData,
      });
    },
    onSuccess: () => {
      // Invalidate events query to trigger a refetch
      if (selectedTeam?.id) {
        queryClient.invalidateQueries({
          queryKey: ["/api/teams", selectedTeam.id, "events"],
        });
      }
      setDialogOpen(false);
      setIsEditMode(false);
      setCurrentEvent(null);
      toast({
        titleKey: "toasts.eventUpdated",
        descriptionKey: "toasts.eventUpdatedDesc",
      });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        titleKey: "toasts.error",
        description: `${t("toasts.actionFailed")}: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id: number) => {
      if (!selectedTeam) {
        throw new Error("No team selected");
      }

      return await apiRequest(`/api/teams/${selectedTeam.id}/events/${id}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      // Invalidate events query to trigger a refetch
      if (selectedTeam?.id) {
        queryClient.invalidateQueries({
          queryKey: ["/api/teams", selectedTeam.id, "events"],
        });
      }
      setDeleteDialogOpen(false);
      setCurrentEvent(null);
      toast({
        titleKey: "toasts.eventDeleted",
        descriptionKey: "toasts.eventDeletedDesc",
      });
    },
    onError: (error: Error) => {
      toast({
        titleKey: "toasts.error",
        description: `${t("toasts.actionFailed")}: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const updateAttendanceMutation = useMutation({
    mutationFn: async ({ 
      eventId, 
      status 
    }: { 
      eventId: number, 
      status: 'confirmed' | 'declined' | 'pending' 
    }) => {
      if (!selectedTeam || !user) {
        throw new Error("Not authorized");
      }

      // apiRequest returns the parsed JSON from the response
      return await apiRequest(`/api/teams/${selectedTeam.id}/events/${eventId}/attendance`, {
        method: "POST",
        data: { status }
      });
    },
    onSuccess: (_, variables) => {
      // After successful update, refresh the attendance data
      if (selectedTeam) {
        fetchAttendance(selectedTeam.id, variables.eventId);
      }
    },
    onError: (error: Error) => {
      toast({
        titleKey: "toasts.error",
        description: `${t("toasts.actionFailed")}: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Computed values - always compute these, don't make them conditional
  const isLoading = teamsLoading || eventsLoading;
  const trainingEvents = events?.filter((event) => event.eventType === "training") || [];

  // Get events for the selected date - always compute this
  const eventsForSelectedDate = events?.filter((event) => {
    if (!selectedDate || !event.startTime) return false;
    // Parse dates properly - make sure we're comparing just the dates without time
    const eventStartDate = new Date(event.startTime);
    return isSameDay(eventStartDate, selectedDate);
  }) || [];

  // Function declarations
  const fetchAttendance = async (teamId: number, eventId: number) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/events/${eventId}/attendance`);
      if (!response.ok) {
        throw new Error('Failed to fetch attendance data');
      }
      const attendees = await response.json();

      // Transform the data to match expected format
      const data: AttendanceData = {
        attendees: attendees,
        total: attendees.length,
        confirmed: attendees.filter((a: any) => a.status === 'confirmed').length
      };

      setAttendanceMap(prev => ({
        ...prev,
        [eventId]: data
      }));

      // Set current user's attendance status
      if (user) {
        const userAttendance = attendees.find((a: any) => a.userId === user.id);
        if (userAttendance) {
          setAttendanceStatus(prev => ({
            ...prev,
            [eventId]: userAttendance.status === 'confirmed' ? 'attending' : 
                      userAttendance.status === 'declined' ? 'notAttending' : null
          }));
        }
      }

      return data;
    } catch (error) {
      console.error('Error fetching attendance:', error);
      return null;
    }
  };

  const handleEditEvent = (event: Event) => {
    setIsEditMode(true);
    setCurrentEvent(event);

    form.reset({
      title: event.title,
      startTime: new Date(event.startTime).toISOString().slice(0, 16),
      endTime: event.endTime ? new Date(event.endTime).toISOString().slice(0, 16) : "",
      location: event.location,
      description: event.description || "",
      eventType: event.eventType,
    });

    setDialogOpen(true);
  };

  const handleDeleteDialog = (event: Event) => {
    setCurrentEvent(event);
    setDeleteDialogOpen(true);
  };

  const onSubmit = (data: EventFormData) => {
    if (isEditMode && currentEvent) {
      updateEventMutation.mutate({ ...data, id: currentEvent.id });
    } else {
      createEventMutation.mutate(data);
    }
  };

  const handleAttendanceChange = (eventId: number, attending: boolean) => {
    setAttendanceStatus(prev => ({
      ...prev,
      [eventId]: attending ? "attending" : "notAttending"
    }));

    // Call API to update attendance
    updateAttendanceMutation.mutate({ 
      eventId, 
      status: attending ? 'confirmed' : 'declined' 
    });
  };

  // useEffect hooks - keep them grouped together
  useEffect(() => {
    if (events && events.length > 0 && selectedTeam) {
      // Fetch attendance for each event
      events.forEach(event => {
        fetchAttendance(selectedTeam.id, event.id);
      });
    }
  }, [events, selectedTeam, user?.id]);

  // Debug effect
  useEffect(() => {
    if (events && events.length > 0) {
      console.log('All events data:', events);
      if (selectedDate) {
        console.log('Selected date:', selectedDate);
        console.log('Events for selected date:', eventsForSelectedDate);
      }
    }
  }, [events, selectedDate]);

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
        <Header title={t("common.events")} />

        <div className="px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6">
          <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-primary">
                {t("events.eventManagement")}
              </h1>
              <p className="text-gray-500">
                {t("events.scheduleAndManage")}
              </p>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              {user && user.role !== 'player' && user.role !== 'colaborador' && (
                <DialogTrigger asChild>
                  <Button
                    className="bg-primary hover:bg-primary/90"
                    aria-label={t("events.addEvent")}
                    onClick={() => {
                      // Update form with selected date when opening dialog
                      if (selectedDate) {
                        // Create date at noon on the selected day to avoid timezone issues
                        const localDate = new Date(selectedDate);
                        localDate.setHours(12, 0, 0, 0);

                        const selectedDateString = localDate.toISOString().slice(0, 16);
                        const endTime = new Date(localDate.getTime() + 90 * 60 * 1000)
                          .toISOString()
                          .slice(0, 16);

                        form.setValue("startTime", selectedDateString);
                        form.setValue("endTime", endTime);
                      }
                    }}
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    {t("events.addEvent")}
                  </Button>
                </DialogTrigger>
              )}
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{isEditMode ? t("events.editEvent") : t("events.createEvent")}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("events.title")}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t("events.enterTitle")}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="startTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("events.time")}</FormLabel>
                            <FormControl>
                              <Input type="datetime-local" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="endTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("events.time")}</FormLabel>
                            <FormControl>
                              <Input type="datetime-local" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("events.location")}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t("events.enterLocation")}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="eventType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("events.type")}</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t("events.selectType")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="training">{t("events.types.training")}</SelectItem>
                              <SelectItem value="meeting">{t("events.types.meeting")}</SelectItem>
                              <SelectItem value="other">{t("events.types.other")}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("events.description")}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <textarea
                                className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder={t("events.enterDescription")}
                                maxLength={500}
                                {...field}
                              ></textarea>
                              <div className="absolute bottom-2 right-2 text-xs text-gray-500">
                                {field.value?.length || 0}/500
                              </div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full bg-primary hover:bg-primary/90"
                      disabled={createEventMutation.isPending || updateEventMutation.isPending}
                    >
                      {createEventMutation.isPending || updateEventMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {isEditMode ? t("common.loading") : t("common.loading")}
                        </>
                      ) : (
                        isEditMode ? t("events.updateEvent") : t("events.scheduleEvent")
                      )}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {/*
            Use the Tabs component from shadcn UI or Radix, 
            letting it handle showing/hiding tab content.
          */}
          <Tabs
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as "calendar" | "list")}
          >
            <TabsList>
              <TabsTrigger value="calendar">{t("events.calendar")}</TabsTrigger>
              <TabsTrigger value="list">{t("events.listView")}</TabsTrigger>
            </TabsList>

            {/* CALENDAR TAB CONTENT */}
            <TabsContent value="calendar" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6">
                <Card className="h-fit">
                  <CardContent className="p-4">
                    <div className="max-h-[400px] overflow-hidden">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => setSelectedDate(date)}
                        className="rounded-md border w-full"
                        locale={t("lang") === "es" ? "es" : "en"}
                        modifiers={{
                          hasEvent: events?.map(event => {
                            // Ensure we create a proper date object without time component
                            const date = new Date(event.startTime);
                            return new Date(date.getFullYear(), date.getMonth(), date.getDate());
                          }) || []
                        }}
                        modifiersStyles={{
                          hasEvent: {
                            backgroundColor: "rgba(var(--primary), 0.1)",
                            fontWeight: "bold",
                            color: "rgb(var(--primary))",
                            borderRadius: "0",
                            textDecoration: "underline",
                          },
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>
                      {selectedDate
                        ? format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: t("lang") === "es" ? "es" : "en" })
                        : t("events.selectDate")}
                    </CardTitle>
                    <CardDescription>
                      {eventsForSelectedDate.length} {t("events.eventsScheduled")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {eventsForSelectedDate.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <p>{t("events.noEventsForDate")}</p>
                        {user && user.role !== 'player' && user.role !== 'colaborador' && (
                          <Button
                            variant="link"
                            onClick={() => {
                              // Update form with selected date when opening dialog
                              if (selectedDate) {
                                // Create date at noon on the selected day to avoid timezone issues
                                const localDate = new Date(selectedDate);
                                localDate.setHours(12, 0, 0, 0);

                                const selectedDateString = localDate.toISOString().slice(0, 16);
                                const endTime = new Date(localDate.getTime() + 90 * 60 * 1000)
                                  .toISOString()
                                  .slice(0, 16);

                                form.setValue("startTime", selectedDateString);
                                form.setValue("endTime", endTime);
                              }
                              setDialogOpen(true);
                            }}
                            className="text-primary mt-2"
                          >
                            {t("events.scheduleEvent")}
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {eventsForSelectedDate.map((event) => (
                          <div
                            key={event.id}
                            className="bg-background p-4 rounded-lg"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-medium text-lg mb-1">
                                  {event.title}
                                </h3>
                                <div className="text-sm text-gray-500 flex items-center mb-1">
                                  <Clock className="h-4 w-4 mr-1" />
                                  {format(
                                    new Date(event.startTime),
                                    "H:mm",
                                    { locale: t("lang") === "es" ? "es" : "en" }
                                  )}{" "}
                                  -
                                  {event.endTime
                                    ? format(new Date(event.endTime), " H:mm", { locale: t("lang") === "es" ? "es" : "en" })
                                    : ""}
                                </div>
                                <div className="text-sm text-gray-500 flex items-center mb-1">
                                  <MapPin className="h-4 w-4 mr-1" />
                                  {event.location}
                                </div>
                                {event.description && (
                                  <div className="text-sm text-gray-700 mt-2 p-2 bg-gray-50 rounded">
                                    {event.description}
                                  </div>
                                )}
                                {attendanceMap[event.id] && (
                                  <div className="text-sm text-gray-600 flex items-center mt-2">
                                    <Users className="h-4 w-4 mr-1" />
                                    <Badge variant="secondary" className="mr-1">
                                      {attendanceMap[event.id].confirmed} {t("events.attending")}
                                    </Badge>
                                    <Badge variant="outline">
                                      {attendanceMap[event.id].total} {t("events.responses")}
                                    </Badge>
                                  </div>
                                )}


                              </div>
                              <div className="flex flex-col items-end">
                                <span
                                  className={`inline-block px-2 py-1 text-xs rounded mb-2 ${
                                    event.eventType === "training"
                                      ? "bg-primary/10 text-primary"
                                      : event.eventType === "match"
                                        ? "bg-secondary/10 text-secondary"
                                        : "bg-accent/10 text-accent"
                                  }`}
                                >
                                  {t(`events.types.${event.eventType}`)}
                                </span>

                                {/* Admin controls */}
                                {user && (selectedTeam?.createdById === user.id || user.role === 'admin' || user.role === 'coach') && (
                                  <div className="flex space-x-1">
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditEvent(event);
                                      }}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteDialog(event);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Attendance buttons */}
                            <div className="mt-4 flex items-center space-x-2">
                              <Button
                                variant={
                                  attendanceStatus[event.id] === "attending"
                                    ? "default"
                                    : "outline"
                                }
                                size="sm"
                                onClick={() => handleAttendanceChange(event.id, true)}
                              >
                                <CheckCircle
                                  className={`h-4 w-4 mr-1 ${
                                    attendanceStatus[event.id] ===
                                    "attending"
                                      ? "text-white"
                                      : "text-secondary"
                                  }`}
                                />
                                {attendanceStatus[event.id] === "attending"
                                  ? t("events.attendingStatus")
                                  : t("events.attend")}
                              </Button>
                              <Button
                                variant={
                                  attendanceStatus[event.id] ===
                                  "notAttending"
                                    ? "destructive"
                                    : "outline"
                                }
                                size="sm"
                                onClick={() => handleAttendanceChange(event.id, false)}
                              >
                                <XCircle
                                  className={`h-4 w-4 mr-1 ${
                                    attendanceStatus[event.id] ===
                                    "notAttending"
                                      ? "text-white"
                                      : "text-destructive"
                                  }`}
                                />
                                {attendanceStatus[event.id] === "notAttending"
                                  ? t("events.notAttendingStatus")
                                  : t("events.cantAttend")}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* LIST TAB CONTENT */}
            <TabsContent value="list" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t("common.events")}</CardTitle>
                  <CardDescription>
                    {events?.length || 0} {t("events.eventsScheduled")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!events || events.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <p>{t("events.noEvents")}</p>
                      {user && user.role !== 'player' && user.role !== 'colaborador' && (
                        <Button
                          variant="link"
                          onClick={() => {
                            // Use current date if no date is selected
                            const today = new Date();
                            today.setHours(12, 0, 0, 0);

                            const selectedDateString = today.toISOString().slice(0, 16);
                            const endTime = new Date(today.getTime() + 90 * 60 * 1000)
                              .toISOString()
                              .slice(0, 16);

                            form.setValue("startTime", selectedDateString);
                            form.setValue("endTime", endTime);
                            setDialogOpen(true);
                          }}
                          className="text-primary mt-2"
                        >
                          {t("events.scheduleFirstEvent")}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {events
                        ?.sort(
                          (a, b) =>
                            new Date(a.startTime).getTime() -
                            new Date(b.startTime).getTime(),
                        )
                        .map((event) => (
                          <div
                            key={event.id}
                            className="border rounded-lg overflow-hidden"
                          >
                            <div className="p-4">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h3 className="font-medium text-lg mb-1">
                                    {event.title}
                                  </h3>
                                  <div className="text-sm text-gray-500 flex items-center mb-1">
                                    <CalendarIcon className="h-4 w-4 mr-1" />
                                    {format(
                                      new Date(event.startTime),
                                      "EEEE, d 'de' MMMM 'de' yyyy",
                                      { locale: t("lang") === "es" ? "es" : "en" }
                                    )}
                                  </div>
                                  <div className="text-sm text-gray-500 flex items-center mb-1">
                                    <Clock className="h-4 w-4 mr-1" />
                                    {format(
                                      new Date(event.startTime),
                                      "H:mm",
                                      { locale: t("lang") === "es" ? "es" : "en" }
                                    )}{" "}
                                    -
                                    {event.endTime
                                      ? format(
                                          new Date(event.endTime),
                                          " H:mm",
                                          { locale: t("lang") === "es" ? "es" : "en" }
                                        )
                                      : ""}
                                  </div>
                                  <div className="text-sm text-gray-500 flex items-center mb-1">
                                    <MapPin className="h-4 w-4 mr-1" />
                                    {event.location}
                                  </div>
                                  {event.description && (
                                    <div className="text-sm text-gray-700 mt-2 p-2 bg-gray-50 rounded">
                                      {event.description}
                                    </div>
                                  )}
                                  {attendanceMap[event.id] && (
                                    <div className="text-sm text-gray-600 flex items-center mt-2">
                                      <Users className="h-4 w-4 mr-1" />
                                      <Badge variant="secondary" className="mr-1">
                                        {attendanceMap[event.id].confirmed} {t("events.attending")}
                                      </Badge>
                                      <Badge variant="outline">
                                        {attendanceMap[event.id].total} {t("events.responses")}
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-col items-end">
                                  <span
                                    className={`inline-block px-2 py-1 text-xs rounded mb-2 ${
                                      event.eventType === "training"
                                        ? "bg-primary/10 text-primary"
                                        : event.eventType === "match"
                                          ? "bg-secondary/10 text-secondary"
                                          : "bg-accent/10 text-accent"
                                    }`}
                                  >
                                    {t(`events.types.${event.eventType}`)}
                                  </span>

                                  {/* Admin controls */}
                                  {user && (selectedTeam?.createdById === user.id || user.role === 'admin' || user.role === 'coach') && (
                                    <div className="flex space-x-1">
                                      <Button 
                                        variant="ghost" 
                                        size="icon"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditEvent(event);
                                        }}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteDialog(event);
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Attendance buttons */}
                              <div className="mt-4 flex items-center space-x-2">
                                <Button
                                  variant={
                                    attendanceStatus[event.id] === "attending"
                                      ? "default"
                                      : "outline"
                                  }
                                  size="sm"
                                  onClick={() => handleAttendanceChange(event.id, true)}
                                >
                                  <CheckCircle
                                    className={`h-4 w-4 mr-1 ${
                                      attendanceStatus[event.id] === "attending"
                                        ? "text-white"
                                        : "text-secondary"
                                    }`}
                                  />
                                  {attendanceStatus[event.id] === "attending"
                                    ? t("events.attendingStatus")
                                    : t("events.attend")}
                                </Button>
                                <Button
                                  variant={
                                    attendanceStatus[event.id] === "notAttending"
                                      ? "destructive"
                                      : "outline"
                                  }
                                  size="sm"
                                  onClick={() => handleAttendanceChange(event.id, false)}
                                >
                                  <XCircle
                                    className={`h-4 w-4 mr-1 ${
                                      attendanceStatus[event.id] ===
                                      "notAttending"
                                        ? "text-white"
                                        : "text-destructive"
                                    }`}
                                  />
                                  {attendanceStatus[event.id] === "notAttending"
                                    ? t("events.notAttendingStatus")
                                    : t("events.cantAttend")}
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("events.deleteEvent")}</DialogTitle>
            <DialogDescription>
              {t("events.deleteEventConfirmation")}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {currentEvent && (
              <div className="p-4 border rounded-md mb-4">
                <h3 className="font-medium">{currentEvent.title}</h3>
                <div className="text-sm text-gray-500 mt-1">
                  {format(new Date(currentEvent.startTime), "EEEE, d 'de' MMMM 'de' yyyy • H:mm", { locale: t("lang") === "es" ? "es" : "en" })}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => currentEvent && deleteEventMutation.mutate(currentEvent.id)}
              disabled={deleteEventMutation.isPending}
            >
              {deleteEventMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("events.deleting")}
                </>
              ) : (
                t("events.deleteEvent")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MobileNavigation />
    </div>
  );
}