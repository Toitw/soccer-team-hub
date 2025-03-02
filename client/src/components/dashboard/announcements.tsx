import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Announcement } from "@shared/schema";
import { format } from "date-fns";
import { PlusIcon } from "lucide-react";

interface AnnouncementsProps {
  announcements: (Announcement & { creator?: any })[];
}

export default function Announcements({ announcements }: AnnouncementsProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Announcements</h2>
          <Button variant="ghost" size="icon" className="text-sm text-primary">
            <PlusIcon className="h-5 w-5" />
          </Button>
        </div>
        
        {announcements.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No announcements found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map(announcement => {
              let borderColor = "border-secondary";
              
              if (announcement.title) {
                if (announcement.title.includes("Training")) {
                  borderColor = "border-accent";
                } else if (announcement.title.includes("Equipment")) {
                  borderColor = "border-primary";
                }
              }
              
              return (
                <div key={announcement.id} className={`p-3 border-l-4 ${borderColor} bg-white rounded-r-lg shadow-sm`}>
                  <h3 className="font-medium">{announcement.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{announcement.content}</p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-500">
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
    </Card>
  );
}
