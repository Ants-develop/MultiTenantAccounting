import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { formatDistanceToNow } from "date-fns";

export const UpcomingEventsWidget = () => {
  const { data: events = [] } = useCalendarEvents();
  
  // Get upcoming events (next 5)
  const upcomingEvents = events
    .filter((event: any) => new Date(event.start) > new Date())
    .sort((a: any, b: any) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 5);

  return (
    <Card className="rounded-2xl border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Upcoming Events
        </CardTitle>
      </CardHeader>
      <CardContent>
        {upcomingEvents.length > 0 ? (
          <div className="space-y-3">
            {upcomingEvents.map((event: any) => (
              <div key={event.id} className="flex gap-3 pb-3 border-b last:border-0">
                <div className="flex-1">
                  <p className="text-sm font-medium">{event.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(event.start), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No upcoming events
          </p>
        )}
      </CardContent>
    </Card>
  );
};


