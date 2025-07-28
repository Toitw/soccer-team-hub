import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Event } from "@shared/schema";
import { Link } from "wouter";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { PlusIcon, Users, MapPin, CalendarDays } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";

interface UpcomingEventsProps {
  events: Event[];
  isDemoMode?: boolean;
  onRefresh?: () => void;
}

export default function UpcomingEvents({ events, isDemoMode = false, onRefresh }: UpcomingEventsProps) {
  const { t, currentLanguage } = useLanguage();
  const getEventTypeColor = (type: string) => {
    switch(type) {
      case "match":
        return "border-accent bg-accent/10";
      case "training":
        return "border-secondary bg-secondary/10";
      case "meeting":
        return "border-primary bg-primary/10";
      default:
        return "border-gray-300 bg-gray-50";
    }
  };

  const getEventTypeLabel = (type: string) => {
    switch(type) {
      case "match":
        return "bg-secondary/10 text-secondary";
      case "training":
        return "bg-primary/10 text-primary";
      case "meeting":
        return "bg-accent/10 text-accent";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const formatDate = (dateInput: Date | string) => {
    // Handle invalid dates
    try {
      const date = new Date(dateInput);
      if (isNaN(date.getTime())) {
        throw new Error("Invalid date");
      }
      
      // Usar localización española si el idioma actual es español
      const locale = currentLanguage === "es" ? es : undefined;
      
      return {
        // Usar EEE para el formato corto del día de la semana
        day: format(date, "EEE", { locale }).toUpperCase(),
        // Mantener el número del día igual
        number: format(date, "d", { locale }),
        // Usar MMM para el formato corto del mes
        month: format(date, "MMM", { locale }).toUpperCase(),
        // Mantener el formato de hora
        time: format(date, "HH:mm", { locale })
      };
    } catch (error) {
      return {
        day: "---",
        number: "--",
        month: "---",
        time: "--:--"
      };
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          {t("dashboard.upcomingEvents")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {onRefresh && (
          <div className="flex justify-end mb-2">
            <button
              onClick={onRefresh}
              className="text-sm text-gray-500 hover:text-primary cursor-pointer"
              title="Refresh events"
            >
              ↻
            </button>
          </div>
        )}
        
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6">
            <CalendarDays className="h-12 w-12 text-gray-300 mb-2" />
            <p className="text-gray-500 mb-2">{t("dashboard.noUpcomingEvents")}</p>
            {isDemoMode ? (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  window.location.href = '/onboarding?fromMock=true';
                }}
              >
                {t("dashboard.createTeamFirst")}
              </Button>
            ) : (
              <Link href="/events">
                <Button variant="outline" size="sm">
                  {t("dashboard.addNewEvent")}
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-gray-50 p-4 rounded-lg">
              {events.slice(0, 2).map((event, index) => {
                // Handle both field names for compatibility
                const dateObj = formatDate(event.startTime || (event as any).startDate);
                return (
                  <div 
                    key={event.id} 
                    className={`${index > 0 ? 'border-t border-gray-200 pt-3 mt-3' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center justify-center w-12 h-12 bg-white rounded-lg border border-gray-200">
                        <span className="text-xs font-medium text-gray-500">{dateObj.day}</span>
                        <span className="text-sm font-bold text-primary">{dateObj.number}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className={`inline-block px-2 py-1 text-xs rounded ${getEventTypeLabel(event.eventType || 'other')} mb-1`}>
                              {event.eventType ? (event.eventType.charAt(0).toUpperCase() + event.eventType.slice(1)) : 'Event'}
                            </span>
                            <h3 className="font-medium">{event.title}</h3>
                            <div className="flex items-center mt-1 text-sm text-gray-500">
                              <MapPin className="h-3 w-3 mr-1" />
                              <span className="mr-3">{event.location || t("common.locationNotSet")}</span>
                              <span className="text-sm font-medium">{dateObj.time}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <Link href="/events">
              <Button variant="outline" className="w-full">
                {t("common.viewAll")} {t("dashboard.upcomingEvents").toLowerCase()}
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
