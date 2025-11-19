import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, Users, CheckCircle, XCircle } from "lucide-react";
import { format, startOfDay, endOfDay, isSameDay } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useCalendarEvents, useUpdateEventStatus } from "@/hooks/useCalendarEvents";
import { EventDetailsDialog } from "./EventDetailsDialog";
import type { CalendarEvent } from "@/hooks/useCalendarEvents";

const CalendarWidget = () => {
  const navigate = useNavigate();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  
  const today = new Date();
  const startOfToday = startOfDay(today);
  const endOfToday = endOfDay(today);
  
  const { events, isLoading } = useCalendarEvents(
    startOfToday,
    endOfToday
  );
  
  const { mutate: updateStatus, isPending: isUpdating } = useUpdateEventStatus();

  // Filter and sort today's events
  const todayEvents = (events || [])
    .filter((event) => {
      const eventDate = new Date(event.start_time);
      return isSameDay(eventDate, today);
    })
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .slice(0, 5);

  const handleRSVP = (eventId: string, status: 'accepted' | 'declined') => {
    updateStatus({ eventId, status });
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'accepted': return 'border-l-success';
      case 'declined': return 'border-l-destructive';
      case 'tentative': return 'border-l-warning';
      default: return 'border-l-primary';
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
                  const isPending = userParticipant?.status === 'pending';

                  return (
                    <div
                      key={event.id}
                      className={`border-l-4 ${getStatusColor(userParticipant?.status)} bg-card hover:bg-accent/50 p-3 rounded-r cursor-pointer transition-colors`}
                      onClick={() => setSelectedEvent(event)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <span className="text-xs text-muted-foreground">
                              {event.all_day
                                ? "All Day"
                                : format(new Date(event.start_time), "h:mm a")}
                            </span>
                          </div>
                          <p className="font-medium text-sm line-clamp-1">
                            {event.title}
                          </p>
                          {event.participants.length > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              <Users className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {event.participants.length} participant{event.participants.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          )}
                        </div>
                        {isPending && (
                          <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => handleRSVP(event.id, 'accepted')}
                              disabled={isUpdating}
                            >
                              <CheckCircle className="h-4 w-4 text-success" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => handleRSVP(event.id, 'declined')}
                              disabled={isUpdating}
                            >
                              <XCircle className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/calendar')}
              >
                View All Events
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {selectedEvent && (
        <EventDetailsDialog
          event={selectedEvent}
          open={!!selectedEvent}
          onOpenChange={(open) => !open && setSelectedEvent(null)}
        />
      )}
    </>
  );
};

export default CalendarWidget;
