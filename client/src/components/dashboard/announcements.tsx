
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Announcement } from "@shared/schema";
import { format } from "date-fns";
import { PlusIcon, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AnnouncementsProps {
  teamId: number;
}

export default function Announcements({ teamId }: AnnouncementsProps) {
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { data: announcements = [], isLoading, refetch } = useQuery<(Announcement & { creator?: any })[]>({
    queryKey: ["/api/teams", teamId, "announcements", "recent"],
    queryFn: async () => {
      console.log(`Dashboard: Fetching announcements for team ${teamId}`);
      const response = await apiRequest("GET", `/api/teams/${teamId}/announcements/recent?limit=5`);
      const data = response instanceof Response ? [] : response;
      console.log('Dashboard: Retrieved announcements:', data);
      return data;
    },
    enabled: !!teamId,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0, // Always consider data stale
  });
  
  // Force refetch on component mount
  useEffect(() => {
    if (teamId) {
      refetch();
    }
  }, [teamId, refetch]);
  
  // Manual refresh function
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast({
        title: "Refreshed",
        description: "Announcements have been updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh announcements",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex justify-between items-center">
          <span>Announcements</span>
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="text-sm mr-1"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Link to="/announcements">
              <Button variant="ghost" size="icon" className="text-sm text-primary">
                <PlusIcon className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="px-4 pb-2">
        {announcements.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            <p>No announcements found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.slice(0, 3).map(announcement => {
              let borderColor = "border-secondary";
              
              if (announcement.title) {
                if (announcement.title.includes("Training")) {
                  borderColor = "border-accent";
                } else if (announcement.title.includes("Equipment")) {
                  borderColor = "border-primary";
                }
              }
              
              return (
                <div key={announcement.id} className={`p-3 border-l-4 ${borderColor} bg-muted/20 rounded-r-lg shadow-sm`}>
                  <h3 className="font-medium">{announcement.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {announcement.content}
                  </p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-muted-foreground">
                      {announcement.createdAt ? format(new Date(announcement.createdAt), "MMMM d, yyyy") : "Date not available"}
                    </span>
                    <span className="text-xs font-medium text-primary">
                      {announcement.creator?.fullName || `User ${announcement.createdById}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="pt-2">
        <Link to="/announcements" className="w-full">
          <Button variant="ghost" className="w-full text-xs flex items-center justify-center gap-1 text-primary">
            View all announcements
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
