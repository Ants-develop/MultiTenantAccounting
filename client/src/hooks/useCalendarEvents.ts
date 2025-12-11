import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { getAccessToken } from "@/lib/auth";
import { addDays, addHours, startOfMonth, endOfMonth } from "date-fns";

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  event_type?: "meeting" | "deadline" | "task" | "other";
  start_time: string;
  end_time: string;
  all_day?: boolean;
  color?: string;
  meeting_link?: string;
  created_by: string;
  created_at: string;
  my_status?: "pending" | "accepted" | "declined" | "tentative";
  is_organizer?: boolean;
  is_recurring?: boolean;
  recurring_rule?: string;
  recurrence_end_date?: string;
}

export interface CalendarEventAttendee {
  id: string;
  event_id: string;
  user_id: string;
  rsvp_status: "pending" | "accepted" | "declined" | "tentative";
  user?: {
    id: string;
    display_name?: string;
    avatar_url?: string;
  };
}

export const useCalendarEvents = (startDate: Date, endDate: Date) => {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<any>(null);

  // Setup real-time subscription
  useEffect(() => {
    const setupSubscription = async () => {
      try {
        subscriptionRef.current = supabase
          .channel("calendar_events")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "calendar_events" },
            (payload: any) => {
              queryClient.invalidateQueries({
                queryKey: [
                  "calendar-events",
                  startDate.toISOString(),
                  endDate.toISOString(),
                ],
              });
            }
          )
          .subscribe();
      } catch (error) {
        console.error("Error setting up calendar subscription:", error);
      }
    };

    setupSubscription();

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [queryClient, startDate, endDate]);

  return useQuery({
    queryKey: ["calendar-events", startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calendar_events")
        .select(
          `
          *,
          attendees:calendar_event_attendees(
            id,
            event_id,
            user_id,
            rsvp_status,
            user:users(id, display_name, avatar_url)
          )
        `
        )
        .gte("start_time", startDate.toISOString())
        .lte("end_time", endDate.toISOString())
        .order("start_time", { ascending: true });

      if (error) throw error;
      return (data || []) as CalendarEvent[];
    },
  });
};

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
