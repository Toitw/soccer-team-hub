
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Announcement } from "@shared/schema";
import { format } from "date-fns";
import { PlusIcon, Loader2, RefreshCw, Megaphone } from "lucide-react";
import { Link } from "wouter";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";

interface AnnouncementsProps {
  teamId?: number;
  announcements?: (Announcement & { creator?: any })[];
  isDemoMode?: boolean;
  disableActions?: boolean;
  onCreateClick?: () => void;
}

export default function Announcements({ 
  teamId, 
  announcements: propAnnouncements, 
  isDemoMode = false,
  disableActions = false,
  onCreateClick
}: AnnouncementsProps) {
  // Use the teamId if provided, otherwise use announcement data passed as props
  const useProvidedData = !!propAnnouncements;
  const { toast } = useToast();
  const { t } = useLanguage();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // If propAnnouncements is provided, use that instead of making an API call
  const { data: fetchedAnnouncements = [], isLoading, refetch } = useQuery<(Announcement & { creator?: any })[]>({
    queryKey: ["/api/teams", teamId, "announcements", "recent"],
    queryFn: async () => {
      console.log(`Dashboard: Fetching announcements for team ${teamId}`);
      try {
        if (!teamId) {
          console.warn('Dashboard: No teamId provided for announcements fetch');
          return [];
        }
        const response = await apiRequest(`/api/teams/${teamId}/announcements/recent?limit=5`);
        console.log('Dashboard: Retrieved announcements:', response);
        // Ensure response is an array before sorting
        return Array.isArray(response) 
          ? response.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          : [];
      } catch (error) {
        console.error('Dashboard: Error fetching announcements:', error);
        return [];
      }
    },
    enabled: !!teamId && !useProvidedData, // Only enable if teamId is provided and we're not using prop data
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0, // Always consider data stale
    retry: 3, // Retry failed requests up to 3 times
    refetchInterval: 60000 // Refresh data every minute
  });
  
  // Use provided announcements or fetched announcements
  // Ensure announcements is always an array
  const announcements = Array.isArray(useProvidedData ? propAnnouncements : fetchedAnnouncements) 
    ? (useProvidedData ? propAnnouncements : fetchedAnnouncements) 
    : [];
  
  // Force refetch on component mount
  useEffect(() => {
    if (teamId) {
      refetch();
    }
  }, [teamId, refetch]);
  
  // Manual refresh function with improved error handling
  const handleRefresh = async () => {
    console.log('Dashboard: Manually refreshing announcements for team', teamId);
    setIsRefreshing(true);
    
    try {
      // If we're using provided data, we can't refresh it directly
      if (useProvidedData) {
        // Show a toast that we can't refresh provided data
        toast({
          titleKey: "toasts.info",
          descriptionKey: "toasts.refreshingAnnouncements",
        });
        
        // Allow a small delay to show loading state
        await new Promise(resolve => setTimeout(resolve, 500));
        return;
      }
      
      // Otherwise, use the refetch function from the query
      const result = await refetch();
      console.log('Dashboard: Manual refresh result:', result);
      
      if (result.isSuccess) {
        toast({
          titleKey: "toasts.refreshed",
          descriptionKey: "toasts.announcementsLoaded",
          descriptionParams: { count: result.data?.length || 0 },
        });
      } else if (result.isError && result.error) {
        console.error('Dashboard: Error during manual refresh:', result.error);
        throw result.error;
      }
    } catch (error) {
      console.error('Dashboard: Failed to refresh announcements:', error);
      toast({
        titleKey: "toasts.error",
        description: error instanceof Error ? error.message : t("toasts.failedToRefresh"),
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
        <CardTitle className="text-lg flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" />
          {t("announcements.latestAnnouncements")}
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {!useProvidedData && (
          <div className="flex justify-end mb-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="text-sm"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        )}
        
        {announcements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6">
            <Megaphone className="h-12 w-12 text-gray-300 mb-2" />
            <p className="text-gray-500 mb-2">{t("announcements.noAnnouncements")}</p>
            {isDemoMode ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onCreateClick}
              >
                {t("dashboard.createTeamFirst")}
              </Button>
            ) : (
              <Link to="/announcements">
                <Button variant="outline" size="sm">
                  {t("announcements.createAnnouncement")}
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-gray-50 p-4 rounded-lg">
              {announcements.slice(0, 2).map((announcement, index) => {
                let borderColor = "border-secondary";
                
                if (announcement.title) {
                  if (announcement.title.includes("Training")) {
                    borderColor = "border-accent";
                  } else if (announcement.title.includes("Equipment")) {
                    borderColor = "border-primary";
                  }
                }
                
                return (
                  <div key={announcement.id} className={`${index > 0 ? 'border-t border-gray-200 pt-3 mt-3' : ''}`}>
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-white rounded-lg border border-gray-200 flex items-center justify-center">
                        <Megaphone className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{announcement.title}</h3>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {announcement.content}
                        </p>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs text-gray-500">
                            {announcement.createdAt ? format(new Date(announcement.createdAt), "MMM d, yyyy") : t("common.notAvailable")}
                          </span>
                          <span className="text-xs font-medium text-primary">
                            {announcement.creator?.fullName || `${t("common.user")} ${announcement.createdById}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <Link to="/announcements">
              <Button variant="outline" className="w-full">
                {t("common.viewAll")} {t("navigation.announcements").toLowerCase()}
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
