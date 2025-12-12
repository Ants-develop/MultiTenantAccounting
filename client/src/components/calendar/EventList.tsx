import { format, isToday, isTomorrow, isPast } from "date-fns";
import { CalendarEvent } from "@/hooks/useCalendarEvents";
import { Clock, CheckCircle, XCircle, HelpCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface EventListProps {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  isLoading: boolean;
}

export const EventList = ({ events, onEventClick, isLoading }: EventListProps) => {
  const getDateLabel = (date: Date) => {
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "EEEE, MMMM d");
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "accepted":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "declined":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "tentative":
        return <HelpCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // Group events by date
  const groupedEvents = events.reduce((acc, event) => {
    const dateKey = format(new Date(event.start_time), "yyyy-MM-dd");
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(event);
    return acc;
  }, {} as Record<string, CalendarEvent[]>);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No events scheduled</p>
            <p className="text-sm mt-2">Create your first event to get started</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedEvents)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([dateKey, dateEvents]) => {
          const date = new Date(dateKey);
          const isDatePast = isPast(date) && !isToday(date);

          return (
            <div key={dateKey}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 sticky top-0 bg-background py-2">
                {getDateLabel(date)}
              </h3>
              <div className="space-y-3">
                {dateEvents
                  .sort((a, b) => 
                    new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
                  )
                  .map((event) => (
                    <Card
                      key={event.id}
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-md",
                        isDatePast && "opacity-60"
                      )}
                      onClick={() => onEventClick(event)}
                    >
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          {/* Time & Color Indicator */}
                          <div className="flex flex-col items-center gap-1 min-w-[80px]">
                            <div
                              className="w-1 h-full rounded-full absolute left-0 top-0 bottom-0"
                              style={{ backgroundColor: event.color }}
                            />
                            <span className="text-sm font-bold">
                              {format(new Date(event.start_time), "HH:mm")}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(event.end_time), "HH:mm")}
                            </span>
                          </div>

                          {/* Event Details */}
                          <div className="flex-1">
                            <h4 className="font-semibold mb-1">{event.title}</h4>
                            {event.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                {event.description}
                              </p>
                            )}
                            
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              {event.location && (
                                <span className="flex items-center gap-1">
                                  📍 {event.location}
                                </span>
                              )}
                              {event.my_status && (
                                <span className="flex items-center gap-1">
                                  {getStatusIcon(event.my_status)}
                                  {event.my_status.charAt(0).toUpperCase() + event.my_status.slice(1)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          );
        })}
    </div>
  );
};
