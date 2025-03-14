
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Announcement } from "@shared/schema";
import { format } from "date-fns";
import { PlusIcon, ArrowRight, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface AnnouncementsProps {
  teamId: number;
}

export default function Announcements({ teamId }: AnnouncementsProps) {
  const { data: announcements = [], isLoading } = useQuery<(Announcement & { creator?: any })[]>({
    queryKey: ["/api/teams", teamId, "announcements", "recent"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/teams/${teamId}/announcements/recent?limit=5`);
      return response instanceof Response ? [] : response;
    },
    enabled: !!teamId,
  });

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
          <Link to="/announcements">
            <Button variant="ghost" size="icon" className="text-sm text-primary">
              <PlusIcon className="h-5 w-5" />
            </Button>
          </Link>
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
