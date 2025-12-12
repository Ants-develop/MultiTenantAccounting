import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "lucide-react";
import { format, startOfDay, endOfDay, isSameDay } from "date-fns";
import { useLocation } from "wouter";
import { useCalendarEvents, useUpdateEventStatus } from "@/hooks/useCalendarEvents";
import type { CalendarEvent } from "@/hooks/useCalendarEvents";

const CalendarWidget = () => {
  const [, setLocation] = useLocation();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  
  const today = new Date();
  const startOfToday = startOfDay(today);
  const endOfToday = endOfDay(today);
  
  const { events, isLoading } = useCalendarEvents(
    startOfToday,
    endOfToday
  );
  
  const { mutate: updateStatus } = useUpdateEventStatus();

  // Filter and sort today's events
  const todayEvents = (events || [])
    .filter((event) => {
      const eventDate = new Date(event.start_time);
      return isSameDay(eventDate, today);
    })
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .slice(0, 5);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'accepted': return 'border-l-green-500';
      case 'declined': return 'border-l-red-500';
      case 'tentative': return 'border-l-yellow-500';
      default: return 'border-l-blue-500';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5" />
            Today's Events
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-primary" />
            Today's Events
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {format(today, "EEEE, MMMM d")}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {todayEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                No events scheduled for today
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {todayEvents.map((event) => {
                  const userParticipant = event.participants.find(
                    (p) => p.user_id === event.created_by // This should use actual auth user
                  );

                  return (
                    <div
                      key={event.id}
                      className={`border-l-4 ${getStatusColor(userParticipant?.status)} bg-card hover:bg-accent/50 p-3 rounded-r cursor-pointer transition-colors`}
                      onClick={() => setLocation("/calendar")}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-sm">{event.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(event.start_time), "h:mm a")} - {format(new Date(event.end_time), "h:mm a")}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="pt-2">
                <button 
                  onClick={() => setLocation("/calendar")}
                  className="text-xs text-primary hover:underline w-full text-center"
                >
                  View all events
                </button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default CalendarWidget;
