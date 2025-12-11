import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronRight } from 'lucide-react';
import { format, addDays, startOfDay } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface CalendarEvent {
  id: string;
  title: string;
  start_time: string;
  all_day?: boolean;
}

interface UpcomingEventsWidgetProps {
  events?: CalendarEvent[];
  isLoading?: boolean;
  onViewAll?: () => void;
  onEventClick?: (eventId: string) => void;
}

export const UpcomingEventsWidget = ({
  events = [],
  isLoading = false,
  onViewAll,
  onEventClick,
}: UpcomingEventsWidgetProps) => {
  const today = startOfDay(new Date());

  // Get next 5 upcoming events
  const upcomingEvents = events
    .filter(e => new Date(e.start_time) >= today)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .slice(0, 5);

  return (
    <Card className="rounded-2xl border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Calendar className="h-4 w-4 text-primary" />
          Upcoming Events
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </>
        ) : upcomingEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No upcoming events
          </p>
        ) : (
          upcomingEvents.map((event) => {
            const eventDate = new Date(event.start_time);
            return (
              <div
                key={event.id}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => onEventClick?.(event.id)}
              >
                <div className="flex flex-col items-center justify-center min-w-[40px] h-10 rounded-lg bg-primary/10 text-primary">
                  <span className="text-xs font-medium">{format(eventDate, 'MMM')}</span>
                  <span className="text-sm font-bold leading-none">{format(eventDate, 'd')}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{event.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {event.all_day ? 'All day' : format(eventDate, 'h:mm a')}
                  </p>
                </div>
              </div>
            );
          })
        )}
        
        {onViewAll && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-primary hover:text-primary"
            onClick={onViewAll}
          >
            View All Events
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
