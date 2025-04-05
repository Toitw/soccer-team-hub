import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Team, Event } from "@shared/schema";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import MobileNavigation from "@/components/mobile-navigation";
import { useAuth } from "@/hooks/use-auth";
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
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { apiRequest } from "@/lib/queryClient";

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

export default function EventPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // We control which tab is active:
  const [activeTab, setActiveTab] = useState<"calendar" | "list">("calendar");

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(),
  );
  const [dialogOpen, setDialogOpen] = useState(false);
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

      // Format dates properly for API
      const formattedData = {
        ...data,
        startTime: new Date(data.startTime).toISOString(),
        endTime: new Date(data.endTime).toISOString(),
      };

      const response = await apiRequest(
        "POST",
        `/api/teams/${selectedTeam.id}/events`,
        formattedData,
      );
      
      try {
        // Try to parse the response as JSON
        return await response.json();
      } catch (error) {
        // If parsing fails, just return a success indicator
        return { success: true };
      }
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

  const onSubmit = (data: EventFormData) => {
    createEventMutation.mutate(data);
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
      // Parse dates properly
      const eventDate = new Date(event.startTime);
      return isSameDay(eventDate, selectedDate);
    }) || [];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      <div className="flex-1 ml-0 md:ml-64 z-30">
        <Header title="Events" />

        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-primary">
                Event Management
              </h1>
              <p className="text-gray-500">
                Schedule and manage team events
              </p>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  className="bg-primary hover:bg-primary/90"
                  aria-label="New Event"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  New Event
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Event</DialogTitle>
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
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter event title"
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
                            <FormLabel>Start Time</FormLabel>
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
                            <FormLabel>End Time</FormLabel>
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
                          <FormLabel>Location</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter event location"
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
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <textarea
                              className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              placeholder="Enter event description, goals, equipment needed, etc."
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
                      disabled={createEventMutation.isPending}
                    >
                      {createEventMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Scheduling...
                        </>
                      ) : (
                        "Schedule Event"
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
              <TabsTrigger value="calendar">Calendar</TabsTrigger>
              <TabsTrigger value="list">List View</TabsTrigger>
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
                      modifiers={{
                        hasEvent:
                          events?.map((event) => new Date(event.startTime)) ||
                          [],
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
                        ? format(selectedDate, "EEEE, MMMM d, yyyy")
                        : "Select a date"}
                    </CardTitle>
                    <CardDescription>
                      {eventsForSelectedDate.length} event
                      {eventsForSelectedDate.length !== 1 ? "s" : ""} scheduled
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {eventsForSelectedDate.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <p>No events scheduled for this date</p>
                        <Button
                          variant="link"
                          onClick={() => setDialogOpen(true)}
                          className="text-primary mt-2"
                        >
                          Schedule an event
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
                                    "h:mm a",
                                  )}{" "}
                                  -
                                  {event.endTime
                                    ? format(new Date(event.endTime), " h:mm a")
                                    : ""}
                                </div>
                                <div className="text-sm text-gray-500 flex items-center">
                                  <MapPin className="h-4 w-4 mr-1" />
                                  {event.location}
                                </div>
                              </div>
                              <div>
                                <span
                                  className={`inline-block px-2 py-1 text-xs rounded ${
                                    event.type === "training"
                                      ? "bg-primary/10 text-primary"
                                      : event.type === "match"
                                        ? "bg-secondary/10 text-secondary"
                                        : "bg-accent/10 text-accent"
                                  }`}
                                >
                                  {event.type.charAt(0).toUpperCase() +
                                    event.type.slice(1)}
                                </span>
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
                                onClick={() => {
                                  setAttendanceStatus((prev) => ({
                                    ...prev,
                                    [event.id]: "attending",
                                  }));
                                  toast({
                                    title: "Attendance updated",
                                    description:
                                      "You're marked as attending this event",
                                  });
                                }}
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
                                  ? "Attending"
                                  : "Attend"}
                              </Button>
                              <Button
                                variant={
                                  attendanceStatus[event.id] ===
                                  "notAttending"
                                    ? "destructive"
                                    : "outline"
                                }
                                size="sm"
                                onClick={() => {
                                  setAttendanceStatus((prev) => ({
                                    ...prev,
                                    [event.id]: "notAttending",
                                  }));
                                  toast({
                                    title: "Attendance updated",
                                    description:
                                      "You're marked as not attending this event",
                                  });
                                }}
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
                                  ? "Not Attending"
                                  : "Can't Attend"}
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
                  <CardTitle>Events</CardTitle>
                  <CardDescription>
                    {events?.length || 0} event
                    {events?.length !== 1 ? "s" : ""} scheduled
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!events || events.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <p>No events scheduled</p>
                      <Button
                        variant="link"
                        onClick={() => setDialogOpen(true)}
                        className="text-primary mt-2"
                      >
                        Schedule your first event
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
                                      "EEEE, MMMM d, yyyy",
                                    )}
                                  </div>
                                  <div className="text-sm text-gray-500 flex items-center mb-1">
                                    <Clock className="h-4 w-4 mr-1" />
                                    {format(
                                      new Date(event.startTime),
                                      "h:mm a",
                                    )}{" "}
                                    -
                                    {event.endTime
                                      ? format(
                                          new Date(event.endTime),
                                          " h:mm a",
                                        )
                                      : ""}
                                  </div>
                                  <div className="text-sm text-gray-500 flex items-center">
                                    <MapPin className="h-4 w-4 mr-1" />
                                    {event.location}
                                  </div>
                                  {event.description && (
                                    <p className="text-sm mt-2 text-gray-700">
                                      {event.description}
                                    </p>
                                  )}
                                </div>
                                <div>
                                  <span
                                    className={`inline-block px-2 py-1 text-xs rounded ${
                                      event.type === "training"
                                        ? "bg-primary/10 text-primary"
                                        : event.type === "match"
                                          ? "bg-secondary/10 text-secondary"
                                          : "bg-accent/10 text-accent"
                                    }`}
                                  >
                                    {event.type.charAt(0).toUpperCase() +
                                      event.type.slice(1)}
                                  </span>
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
                                  onClick={() => {
                                    setAttendanceStatus((prev) => ({
                                      ...prev,
                                      [event.id]: "attending",
                                    }));
                                    toast({
                                      title: "Attendance updated",
                                      description:
                                        "You're marked as attending this event",
                                    });
                                  }}
                                >
                                  <CheckCircle
                                    className={`h-4 w-4 mr-1 ${
                                      attendanceStatus[event.id] === "attending"
                                        ? "text-white"
                                        : "text-secondary"
                                    }`}
                                  />
                                  {attendanceStatus[event.id] === "attending"
                                    ? "Attending"
                                    : "Attend"}
                                </Button>
                                <Button
                                  variant={
                                    attendanceStatus[event.id] === "notAttending"
                                      ? "destructive"
                                      : "outline"
                                  }
                                  size="sm"
                                  onClick={() => {
                                    setAttendanceStatus((prev) => ({
                                      ...prev,
                                      [event.id]: "notAttending",
                                    }));
                                    toast({
                                      title: "Attendance updated",
                                      description:
                                        "You're marked as not attending this event",
                                    });
                                  }}
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
                                    ? "Not Attending"
                                    : "Can't Attend"}
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

      <MobileNavigation />
    </div>
  );
}