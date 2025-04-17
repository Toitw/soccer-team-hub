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
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";

// Define form schema for creating an event
const eventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  location: z.string().min(1, "Location is required"),
  description: z.string().optional(),
  type: z.string().default("training"),
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
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();

  // We control which tab is active:
  const [activeTab, setActiveTab] = useState<"calendar" | "list">("calendar");

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(),
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [attendanceMap, setAttendanceMap] = useState<Record<number, AttendanceData>>({});
  const [attendanceStatus, setAttendanceStatus] = useState<
    Record<number, "attending" | "notAttending" | null>
  >({});

  // Use React Query client for manual invalidation
  const queryClient = useQueryClient();

  const { data: teams, isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  // Select the first team by default
  const selectedTeam = teams && teams.length > 0 ? teams[0] : null;

  const {
    data: events,
    isLoading: eventsLoading,
    refetch: refetchEvents,
  } = useQuery<Event[]>({
    queryKey: ["/api/teams", selectedTeam?.id, "events"],
    enabled: !!selectedTeam,
    queryFn: async () => {
      if (!selectedTeam) return [];
      const response = await fetch(`/api/teams/${selectedTeam.id}/events`);
      if (!response.ok) throw new Error("Failed to fetch events");
      return await response.json();
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Define mutation for creating events
  const createEventMutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      if (!selectedTeam) {
        throw new Error("No team selected");
      }

      // Format dates properly for API, ensuring we use the exact date selected
      const formattedData = {
        ...data,
        startTime: data.startTime, // Use the ISO string from the form directly
        endTime: data.endTime,     // Use the ISO string from the form directly
      };

      return await apiRequest(`/api/teams/${selectedTeam.id}/events`, {
        method: "POST",
        data: formattedData,
      });
    },
    onSuccess: () => {
      // Invalidate events query to trigger a refetch
      queryClient.invalidateQueries({
        queryKey: ["/api/teams", selectedTeam?.id, "events"],
      });
      setDialogOpen(false);
      toast({
        title: "Event created",
        description: "Event has been scheduled successfully",
      });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create event: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Define mutation for updating events
  const updateEventMutation = useMutation({
    mutationFn: async (data: EventFormData & { id: number }) => {
      if (!selectedTeam) {
        throw new Error("No team selected");
      }

      // Format dates properly for API, ensuring we use the exact date selected
      const { id, ...formData } = data;
      const formattedData = {
        ...formData,
        startTime: formData.startTime, // Use the ISO string from the form directly
        endTime: formData.endTime,     // Use the ISO string from the form directly
      };

      return await apiRequest(`/api/teams/${selectedTeam.id}/events/${id}`, {
        method: "PATCH",
        data: formattedData,
      });
    },
    onSuccess: () => {
      // Invalidate events query to trigger a refetch
      queryClient.invalidateQueries({
        queryKey: ["/api/teams", selectedTeam?.id, "events"],
      });
      setDialogOpen(false);
      setIsEditMode(false);
      setCurrentEvent(null);
      toast({
        title: "Event updated",
        description: "Event has been updated successfully",
      });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update event: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Define mutation for deleting events
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
      queryClient.invalidateQueries({
        queryKey: ["/api/teams", selectedTeam?.id, "events"],
      });
      setDeleteDialogOpen(false);
      setCurrentEvent(null);
      toast({
        title: "Event deleted",
        description: "Event has been deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete event: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Function to fetch attendance data for an event
  const fetchAttendance = async (teamId: number, eventId: number) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/events/${eventId}/attendance`);
      if (!response.ok) {
        throw new Error('Failed to fetch attendance data');
      }
      const data: AttendanceData = await response.json();
      
      setAttendanceMap(prev => ({
        ...prev,
        [eventId]: data
      }));
      
      // Set current user's attendance status
      if (user) {
        const userAttendance = data.attendees.find(a => a.userId === user.id);
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

  // Mutation for updating attendance
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
        title: "Error",
        description: `Failed to update attendance: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Effect to load attendance data for events
  useEffect(() => {
    if (events && events.length > 0 && selectedTeam) {
      // Fetch attendance for each event
      events.forEach(event => {
        fetchAttendance(selectedTeam.id, event.id);
      });
    }
  }, [events, selectedTeam]);

  const isLoading = teamsLoading || eventsLoading;

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
      type: "training",
    },
  });

  // Handle opening the edit dialog
  const handleEditEvent = (event: Event) => {
    setIsEditMode(true);
    setCurrentEvent(event);
    
    form.reset({
      title: event.title,
      startTime: new Date(event.startTime).toISOString().slice(0, 16),
      endTime: event.endTime ? new Date(event.endTime).toISOString().slice(0, 16) : "",
      location: event.location,
      description: event.description || "",
      type: event.type,
    });
    
    setDialogOpen(true);
  };

  // Handle opening the delete confirmation dialog
  const handleDeleteDialog = (event: Event) => {
    setCurrentEvent(event);
    setDeleteDialogOpen(true);
  };

  // Handle form submission (create or update)
  const onSubmit = (data: EventFormData) => {
    if (isEditMode && currentEvent) {
      updateEventMutation.mutate({ ...data, id: currentEvent.id });
    } else {
      createEventMutation.mutate(data);
    }
  };

  // Handle attendance status change
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

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Filter events to show only training sessions
  const trainingEvents =
    events?.filter((event) => event.type === "training") || [];

  // Get events for the selected date
  const eventsForSelectedDate =
    events?.filter((event) => {
      if (!selectedDate || !event.startTime) return false;
      
      // Parse dates properly - make sure we're comparing just the dates without time
      const eventStartDate = new Date(event.startTime);
      return isSameDay(eventStartDate, selectedDate);
    }) || [];
    
  // Log events information to help debug
  useEffect(() => {
    if (events && events.length > 0) {
      console.log('All events data:', events);
      if (selectedDate) {
        console.log('Selected date:', selectedDate);
        console.log('Events for selected date:', eventsForSelectedDate);
      }
    }
  }, [events, selectedDate, eventsForSelectedDate]);

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
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("events.description")}</FormLabel>
                          <FormControl>
                            <textarea
                              className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              placeholder={t("events.enterDescription")}
                              {...field}
                            ></textarea>
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
                <Card>
                  <CardContent className="p-4">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      className="rounded-md border"
                      locale={es}
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
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>
                      {selectedDate
                        ? format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })
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
                                    { locale: es }
                                  )}{" "}
                                  -
                                  {event.endTime
                                    ? format(new Date(event.endTime), " H:mm", { locale: es })
                                    : ""}
                                </div>
                                <div className="text-sm text-gray-500 flex items-center mb-1">
                                  <MapPin className="h-4 w-4 mr-1" />
                                  {event.location}
                                </div>
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
                                    event.type === "training"
                                      ? "bg-primary/10 text-primary"
                                      : event.type === "match"
                                        ? "bg-secondary/10 text-secondary"
                                        : "bg-accent/10 text-accent"
                                  }`}
                                >
                                  {t(`events.types.${event.type}`)}
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
                                      { locale: es }
                                    )}
                                  </div>
                                  <div className="text-sm text-gray-500 flex items-center mb-1">
                                    <Clock className="h-4 w-4 mr-1" />
                                    {format(
                                      new Date(event.startTime),
                                      "H:mm",
                                      { locale: es }
                                    )}{" "}
                                    -
                                    {event.endTime
                                      ? format(
                                          new Date(event.endTime),
                                          " H:mm",
                                          { locale: es }
                                        )
                                      : ""}
                                  </div>
                                  <div className="text-sm text-gray-500 flex items-center mb-1">
                                    <MapPin className="h-4 w-4 mr-1" />
                                    {event.location}
                                  </div>
                                  {event.description && (
                                    <p className="text-sm mt-2 text-gray-700">
                                      {event.description}
                                    </p>
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
                                      event.type === "training"
                                        ? "bg-primary/10 text-primary"
                                        : event.type === "match"
                                          ? "bg-secondary/10 text-secondary"
                                          : "bg-accent/10 text-accent"
                                    }`}
                                  >
                                    {t(`events.types.${event.type}`)}
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
                  {format(new Date(currentEvent.startTime), "EEEE, d 'de' MMMM 'de' yyyy • H:mm", { locale: es })}
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