import React from "react";
import { useClientEvents } from "@/hooks/useClientEvents";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock, MapPin } from "lucide-react";

interface ClientCalendarProps {
  clientId: number;
}

export const ClientCalendar: React.FC<ClientCalendarProps> = ({ clientId }) => {
  const { data: events, isLoading } = useClientEvents(clientId);

  if (isLoading) {
    return <div className="p-4 text-center text-muted-foreground">Loading events...</div>;
  }

  if (!events || events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/10">
        No upcoming events for this client.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <Card key={event.id} className="hover:bg-muted/50 transition-colors">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <CalendarIcon className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-medium leading-none mb-1">{event.title}</h4>
                {event.description && (
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {event.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 text-sm text-muted-foreground">
              <div className="flex items-center">
                <Clock className="mr-1 h-3.5 w-3.5" />
                {event.isAllDay ? (
                  <span>{format(new Date(event.start), "MMM d")} (All Day)</span>
                ) : (
                  <span>
                    {format(new Date(event.start), "MMM d, h:mm a")}
                  </span>
                )}
              </div>
              {event.location && (
                <div className="flex items-center">
                  <MapPin className="mr-1 h-3.5 w-3.5" />
                  {event.location}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
