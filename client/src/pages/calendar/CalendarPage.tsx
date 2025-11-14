import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { calendarApi, CalendarEvent, CreateEventPayload } from "@/api/calendar";
import { tasksApi } from "@/api/tasks";
import { CalendarView } from "@/components/calendar/CalendarView";
import { EventForm } from "@/components/calendar/EventForm";
import { TaxDomeCard, TaxDomeButton } from "@/components/taxdome";
import { Plus, Calendar as CalendarIcon } from "lucide-react";
import dayjs from "dayjs";

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const workspaceId = 1; // Default workspace
  const [isEventFormOpen, setIsEventFormOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Get date range for current month
  const now = dayjs();
  const startOfMonth = now.startOf("month").toISOString();
  const endOfMonth = now.endOf("month").toISOString();

  const { data: aggregated, isLoading } = useQuery({
    queryKey: ["/api/calendar/aggregated", { workspaceId, from: startOfMonth, to: endOfMonth }],
    queryFn: () => calendarApi.fetchAggregated({ workspaceId, from: startOfMonth, to: endOfMonth }),
  });

  const createEventMutation = useMutation({
    mutationFn: (data: CreateEventPayload) => calendarApi.createEvent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar"] });
      setIsEventFormOpen(false);
      setSelectedDate(null);
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateEventPayload> }) =>
      calendarApi.updateEvent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar"] });
      setIsEventFormOpen(false);
      setSelectedEvent(null);
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: (id: number) => calendarApi.deleteEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar"] });
    },
  });

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setSelectedEvent(null);
    setIsEventFormOpen(true);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setSelectedDate(null);
    setIsEventFormOpen(true);
  };

  const handleCreateEvent = async (data: CreateEventPayload) => {
    await createEventMutation.mutateAsync(data);
  };

  const handleUpdateEvent = async (data: Partial<CreateEventPayload>) => {
    if (selectedEvent) {
      await updateEventMutation.mutateAsync({ id: selectedEvent.id, data });
    }
  };

  const handleDeleteEvent = async () => {
    if (selectedEvent) {
      if (confirm("Are you sure you want to delete this event?")) {
        await deleteEventMutation.mutateAsync(selectedEvent.id);
      }
    }
  };

  // Transform aggregated data for FullCalendar
  const calendarEvents = aggregated?.all.map((item: any) => {
    if (item.type === "task") {
      return {
        id: `task-${item.taskId}`,
        title: item.title,
        start: item.start,
        end: item.end,
        backgroundColor: "#3b82f6",
        borderColor: "#2563eb",
        extendedProps: {
          type: "task",
          taskId: item.taskId,
          status: item.status,
          priority: item.priority,
        },
      };
    } else {
      return {
        id: `event-${item.eventId}`,
        title: item.title,
        start: item.start,
        end: item.end,
        backgroundColor: "#10b981",
        borderColor: "#059669",
        extendedProps: {
          type: "event",
          eventId: item.eventId,
          location: item.location,
          isAllDay: item.isAllDay,
        },
      };
    }
  }) || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <p className="text-sm text-gray-500 mt-1">View and manage events and tasks</p>
        </div>
        <TaxDomeButton variant="primary" onClick={() => setIsEventFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Event
        </TaxDomeButton>
      </div>

      <TaxDomeCard className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Loading calendar...</p>
            </div>
          </div>
        ) : (
          <CalendarView
            events={calendarEvents}
            onDateClick={handleDateClick}
            onEventClick={handleEventClick}
          />
        )}
      </TaxDomeCard>

      {isEventFormOpen && (
        <EventForm
          isOpen={isEventFormOpen}
          onClose={() => {
            setIsEventFormOpen(false);
            setSelectedEvent(null);
            setSelectedDate(null);
          }}
          onSubmit={selectedEvent ? handleUpdateEvent : handleCreateEvent}
          onDelete={selectedEvent ? handleDeleteEvent : undefined}
          initialData={selectedEvent}
          initialDate={selectedDate}
          workspaceId={workspaceId}
        />
      )}
    </div>
  );
}

