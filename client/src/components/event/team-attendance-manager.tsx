import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserCheck, UserX } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface TeamMember {
  id: number;
  userId: number;
  role: string;
  user: {
    id: number;
    fullName: string;
    profilePicture: string;
  };
}

interface Attendance {
  id: number;
  userId: number;
  eventId: number;
  status: string;
}

interface AttendanceData {
  total: number;
  confirmed: number;
  attendees: Attendance[];
}

interface TeamAttendanceManagerProps {
  teamId: number;
  eventId: number;
  showLabel?: boolean;
}

export default function TeamAttendanceManager({ teamId, eventId, showLabel = true }: TeamAttendanceManagerProps) {
  const { toast } = useToast();
  const [memberAttendance, setMemberAttendance] = useState<Record<number, string>>({});

  // Fetch team users
  const { data: teamUsers, isLoading: teamUsersLoading } = useQuery<any[]>({
    queryKey: ["/api/teams", teamId, "users"],
    enabled: !!teamId,
    queryFn: async () => {
      const response = await fetch(`/api/teams/${teamId}/users`);
      if (!response.ok) throw new Error("Failed to fetch team users");
      return await response.json();
    }
  });

  // Fetch attendance for this event
  const { data: attendance, isLoading: attendanceLoading, refetch: refetchAttendance } = useQuery<AttendanceData>({
    queryKey: ["/api/teams", teamId, "events", eventId, "attendance"],
    enabled: !!teamId && !!eventId,
    queryFn: async () => {
      const response = await fetch(`/api/teams/${teamId}/events/${eventId}/attendance`);
      if (!response.ok) throw new Error("Failed to fetch attendance");
      return await response.json();
    }
  });

  // Mutation to update attendance
  const updateAttendanceMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: number; status: string }) => {
      return await apiRequest(`/api/teams/${teamId}/events/${eventId}/attendance/${userId}`, {
        method: "POST",
        data: { status }
      });
    },
    onSuccess: () => {
      refetchAttendance();
      toast({
        title: "Success",
        description: "Attendance updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update attendance: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Update local state when attendance data changes
  useEffect(() => {
    if (attendance?.attendees) {
      const newMemberAttendance: Record<number, string> = {};
      
      attendance.attendees.forEach(att => {
        newMemberAttendance[att.userId] = att.status;
      });
      
      setMemberAttendance(newMemberAttendance);
    }
  }, [attendance]);

  // Handle attendance status change
  const handleAttendanceChange = (userId: number, status: string) => {
    updateAttendanceMutation.mutate({ userId, status });
  };

  if (teamUsersLoading || attendanceLoading) {
    return (
      <Card>
        <CardContent className="pt-4">
          <div className="flex justify-center items-center h-32">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {showLabel && (
        <CardHeader>
          <CardTitle className="text-lg">Team Attendance</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <div className="space-y-2">
          {teamUsers?.map(teamUser => (
            <div key={teamUser.userId || teamUser.id} className="flex items-center justify-between p-2 bg-background rounded-md">
              <div className="flex items-center gap-2">
                <img 
                  src={teamUser.user?.profilePicture || "/default-avatar.png"} 
                  alt={teamUser.user?.fullName || 'Unknown User'}
                  className="h-8 w-8 rounded-full"
                />
                <span>{teamUser.user?.fullName || 'Unknown User'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={memberAttendance[teamUser.userId] === "confirmed" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleAttendanceChange(teamUser.userId, "confirmed")}
                >
                  <UserCheck className={`h-4 w-4 mr-1 ${memberAttendance[teamUser.userId] === "confirmed" ? "text-white" : "text-secondary"}`} />
                  Confirm
                </Button>
                <Button
                  variant={memberAttendance[teamUser.userId] === "declined" ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => handleAttendanceChange(teamUser.userId, "declined")}
                >
                  <UserX className={`h-4 w-4 mr-1 ${memberAttendance[teamUser.userId] === "declined" ? "text-white" : "text-destructive"}`} />
                  Decline
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}