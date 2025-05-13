import React from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { format } from "date-fns";

type ClaimNotification = {
  id: number;
  teamId: number;
  teamName: string;
  count: number;
  latestCreatedAt: string;
};

export default function NotificationButton() {
  // Fetch notifications for pending claims
  const { data: notifications = [], isLoading } = useQuery<ClaimNotification[]>({
    queryKey: ["/api/notifications/claims"],
    refetchInterval: 60000, // Refetch every minute
  });

  // Calculate total pending claims
  const totalPendingClaims = notifications?.reduce((sum, notification) => sum + notification.count, 0) || 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          className="text-sm text-primary hover:text-primary/80 relative"
          disabled={isLoading}
        >
          <Bell className="h-5 w-5" />
          {totalPendingClaims > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs bg-red-500 text-white rounded-full">
              {totalPendingClaims > 9 ? '9+' : totalPendingClaims}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-2">
          <h3 className="font-medium text-lg border-b pb-2">Notificaciones</h3>
          
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No hay notificaciones pendientes</p>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {notifications.map((notification) => (
                <Link key={notification.teamId} href={`/settings?teamId=${notification.teamId}&tab=claims`}>
                  <div className="border-b last:border-b-0 py-3 cursor-pointer hover:bg-gray-50 px-2 rounded">
                    <p className="font-medium text-primary">
                      {notification.teamName}
                    </p>
                    <p className="text-sm">
                      {notification.count} {notification.count === 1 ? 'reclamación pendiente' : 'reclamaciones pendientes'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Última: {format(new Date(notification.latestCreatedAt), 'dd/MM/yyyy HH:mm')}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}