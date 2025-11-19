import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarEvent } from "@/types/calendar";
import { addDays, addHours } from "date-fns";

// Mock calendar events
const mockEvents: CalendarEvent[] = [
    {
        id: "1",
        title: "Team Standup",
        description: "Daily sync with the team",
        location: "Conference Room A",
        event_type: "meeting",
        start_time: addDays(new Date(), 1).setHours(9, 0, 0, 0).toString(),
        end_time: addDays(new Date(), 1).setHours(9, 30, 0, 0).toString(),
        all_day: false,
        color: "#6366f1",
        meeting_link: "https://meet.google.com/abc-defg-hij",
        created_by: "current",
        created_at: new Date().toISOString(),
        my_status: "accepted",
        is_organizer: true,
    },
    {
        id: "2",
        title: "Client Meeting",
        description: "Quarterly review with Acme Corp",
        location: null,
        event_type: "meeting",
        start_time: addDays(new Date(), 2).setHours(14, 0, 0, 0).toString(),
        end_time: addDays(new Date(), 2).setHours(15, 30, 0, 0).toString(),
        all_day: false,
        color: "#10b981",
        meeting_link: "https://zoom.us/j/123456789",
        created_by: "other",
        created_at: new Date().toISOString(),
        my_status: "accepted",
        is_organizer: false,
    },
    {
        id: "3",
        title: "Tax Filing Deadline",
        description: "Q4 tax filing due",
        location: null,
        event_type: "deadline",
        start_time: addDays(new Date(), 7).setHours(0, 0, 0, 0).toString(),
        end_time: addDays(new Date(), 7).setHours(23, 59, 0, 0).toString(),
        all_day: true,
        color: "#ef4444",
        meeting_link: null,
        created_by: "current",
        created_at: new Date().toISOString(),
        my_status: "accepted",
        is_organizer: true,
    },
];

export function useCalendarEvents(startDate?: Date, endDate?: Date) {
    return useQuery({
        queryKey: ["calendar-events", startDate?.toISOString(), endDate?.toISOString()],
        queryFn: async () => {
            // TODO: Replace with actual API call
            // const response = await fetch(`/api/calendar/events?start=${startDate}&end=${endDate}`);
            // return await response.json();

            let filteredEvents = [...mockEvents];

            if (startDate || endDate) {
                filteredEvents = mockEvents.filter(event => {
                    const eventStart = new Date(Number(event.start_time));
                    if (startDate && eventStart < startDate) return false;
                    if (endDate && eventStart > endDate) return false;
                    return true;
                });
            }

            return filteredEvents;
        },
    });
}

export function useCreateEvent() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (eventData: Partial<CalendarEvent>) => {
            // TODO: Replace with actual API call
            // const response = await fetch("/api/calendar/events", {
            //   method: "POST",
            //   headers: { "Content-Type": "application/json" },
            //   body: JSON.stringify(eventData),
            // });
            // return await response.json();

            console.log("Create event:", eventData);
            return { id: Date.now().toString(), ...eventData };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
        },
    });
}

export function useUpdateEventStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ eventId, status }: { eventId: string; status: string }) => {
            // TODO: Replace with actual API call
            console.log("Update event status:", eventId, status);
            return { eventId, status };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
        },
    });
}
