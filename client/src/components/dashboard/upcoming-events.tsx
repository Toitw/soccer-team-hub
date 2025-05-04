import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Event } from "@shared/schema";
import { Link } from "wouter";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { PlusIcon, Users, MapPin } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";

interface UpcomingEventsProps {
  events: Event[];
  isDemoMode?: boolean;
}

export default function UpcomingEvents({ events, isDemoMode = false }: UpcomingEventsProps) {
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
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">{t("dashboard.upcomingEvents")}</h2>
          <div
            onClick={() => window.location.href = '/events'}
            className="text-sm text-primary cursor-pointer"
          >
            {t("common.viewAll")}
          </div>
        </div>
        
        {events.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>{t("dashboard.noUpcomingEvents")}</p>
          </div>
        ) : (
          <div className="space-y-4 mb-4">
            {events.map(event => {
              const dateObj = formatDate(event.startTime || event.startDate);
              return (
                <div 
                  key={event.id} 
                  className={`mb-4 border-l-4 ${getEventTypeColor(event.type)} bg-white rounded-r-lg shadow-sm overflow-hidden`}
                >
                  <div className="flex">
                    <div className="w-16 sm:w-24 bg-accent/10 flex flex-col items-center justify-center p-2">
                      <span className="text-sm font-medium text-gray-500">{dateObj.day}</span>
                      <span className="text-xl font-bold text-primary">{dateObj.number}</span>
                      <span className="text-xs text-gray-500">{dateObj.month}</span>
                    </div>
                    <div className="flex-1 p-3 pl-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className={`inline-block px-2 py-1 text-xs rounded ${getEventTypeLabel(event.type || 'other')} mb-1`}>
                            {event.type ? (event.type.charAt(0).toUpperCase() + event.type.slice(1)) : 'Event'}
                          </span>
                          <h3 className="font-medium">{event.title}</h3>
                        </div>
                        <span className="text-sm font-medium">{dateObj.time}</span>
                      </div>
                      <p className="text-sm text-gray-500">{event.location}</p>
                      <div className="flex items-center mt-2 space-x-4">
                        <span className="text-xs flex items-center">
                          <MapPin className="h-3 w-3 mr-1 text-gray-400" /> 
                          {event.type === "match" ? 
                            ((event.location && typeof event.location === 'string' && event.location.includes && event.location.includes("Home")) ? t("common.home") : t("common.away")) 
                            : (event.location || t("common.locationNotSet"))}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {isDemoMode ? (
          <Button 
            variant="outline" 
            className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-primary hover:text-primary"
            onClick={() => {
              window.location.href = '/onboarding';
            }}
          >
            <PlusIcon className="h-4 w-4 mr-2" /> {t("dashboard.createTeamFirst")}
          </Button>
        ) : (
          <Link href="/events">
            <Button variant="outline" className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-primary hover:text-primary">
              <PlusIcon className="h-4 w-4 mr-2" /> {t("dashboard.addNewEvent")}
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
