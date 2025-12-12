import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, startOfWeek, endOfWeek } from "date-fns";
import { CalendarEvent } from "@/hooks/useCalendarEvents";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface CalendarGridProps {
  events: CalendarEvent[];
  currentDate: Date;
  onEventClick: (event: CalendarEvent) => void;
  onDayClick?: (day: Date) => void;
  isLoading: boolean;
}

export const CalendarGrid = ({
  events,
  currentDate,
  onEventClick,
  onDayClick,
  isLoading,
}: CalendarGridProps) => {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getEventsForDay = (day: Date) => {
    return events.filter((event) => {
      const eventDate = new Date(event.start_time);
      return isSameDay(eventDate, day);
    });
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border p-4">
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border overflow-hidden">
      {/* Header - Day Names */}
      <div className="grid grid-cols-7 border-b bg-muted/50">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="p-3 text-center text-sm font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isDayToday = isToday(day);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-[120px] p-2 border-b border-r",
                !isCurrentMonth && "bg-muted/20",
                idx % 7 === 6 && "border-r-0"
              )}
              role={onDayClick ? "button" : undefined}
              tabIndex={onDayClick ? 0 : undefined}
              onClick={() => onDayClick?.(day)}
              onKeyDown={(e) => {
                if (!onDayClick) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onDayClick(day);
                }
              }}
            >
              {/* Day Number */}
              <div
                className={cn(
                  "text-sm font-medium mb-2 w-7 h-7 flex items-center justify-center rounded-full",
                  isDayToday && "bg-primary text-primary-foreground",
                  !isCurrentMonth && "text-muted-foreground"
                )}
              >
                {format(day, "d")}
              </div>

              {/* Events */}
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event) => (
                  <button
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                    className="w-full text-left group"
                  >
                    <div
                      className={cn(
                        "text-xs px-2 py-1 rounded truncate transition-opacity",
                        "group-hover:opacity-80"
                      )}
                      style={{
                        backgroundColor: `${event.color}20`,
                        color: event.color,
                        borderLeft: `2px solid ${event.color}`
                      }}
                    >
                      <span className="font-medium">
                        {format(new Date(event.start_time), "HH:mm")}
                      </span>{" "}
                      {event.title}
                    </div>
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <div
                    className="text-xs text-muted-foreground pl-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    + {dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
