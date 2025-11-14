import React, { useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateSelectArg, EventClickArg } from "@fullcalendar/core";

interface CalendarEvent {
  id: string;
  title: string;
  start: string | Date;
  end: string | Date;
  backgroundColor?: string;
  borderColor?: string;
  extendedProps?: Record<string, any>;
}

interface CalendarViewProps {
  events: CalendarEvent[];
  onDateClick?: (date: Date) => void;
  onEventClick?: (event: any) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  onDateClick,
  onEventClick,
}) => {
  const calendarRef = useRef<FullCalendar>(null);

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    if (onDateClick) {
      onDateClick(selectInfo.start);
    }
    // Unselect the date
    if (calendarRef.current) {
      calendarRef.current.getApi().unselect();
    }
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    if (onEventClick) {
      // Transform FullCalendar event back to our format
      const event = {
        id: parseInt(clickInfo.event.id.replace(/^(task|event)-/, "")),
        title: clickInfo.event.title,
        start: clickInfo.event.start?.toISOString() || "",
        end: clickInfo.event.end?.toISOString() || "",
        ...clickInfo.event.extendedProps,
      };
      onEventClick(event);
    }
  };

  return (
    <div className="p-4">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        events={events}
        selectable={true}
        selectMirror={true}
        dayMaxEvents={true}
        weekends={true}
        select={handleDateSelect}
        eventClick={handleEventClick}
        height="auto"
        eventDisplay="block"
        eventTimeFormat={{
          hour: "numeric",
          minute: "2-digit",
          meridiem: "short",
        }}
        slotMinTime="06:00:00"
        slotMaxTime="22:00:00"
      />
    </div>
  );
};

