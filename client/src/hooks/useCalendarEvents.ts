import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  event_type: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  is_recurring: boolean;
  recurrence_pattern: any;
  color: string;
  meeting_link: string | null;
  attachments: any[];
  created_by: string;
  created_at: string;
  updated_at: string;
  participants: EventParticipant[];
  my_status?: 'pending' | 'accepted' | 'declined' | 'tentative';
  is_organizer?: boolean;
}

export interface EventParticipant {
  id: string;
  user_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'tentative';
  is_organizer: boolean;
  can_edit: boolean;
  response_at: string | null;
  reminder_minutes: number;
  profiles?: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
}

/**
 * Hook to fetch and subscribe to calendar events
 */
export const useCalendarEvents = (startDate?: Date, endDate?: Date) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch events for the current user within date range
  const { data: events = [], isLoading, error, refetch } = useQuery({
    queryKey: ["calendar-events", startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      // Get current user from Supabase auth (or session)
      // In MultiTenantAccounting, we use session-based auth for the app, but Supabase client might not have the session if it's not synced.
      // However, the app seems to use Supabase for DB.
      // If we use `supabase.from(...)`, we are using the Supabase client.
      // We need to know the current user ID.
      // We can get it from `useAuth` hook, but we can't use hooks inside `queryFn`.
      // We can assume the user is authenticated if they are on the calendar page.
      // But we need the ID to filter participants.
      
      // Let's try to get the user from the session endpoint or local storage if available.
      // Or we can rely on RLS if set up.
      // But for now, let's fetch the user from the API or assume we can get it.
      
      // Actually, `useAuth` stores user in query cache.
      const user = queryClient.getQueryData<any>(['/api/auth/me'])?.user;
      if (!user) throw new Error("Not authenticated");

      let query = supabase
        .from("calendar_events")
        .select(`
          *,
          participants:calendar_event_participants(
            id,
            user_id,
            response_status,
            is_organizer,
            can_edit,
            response_at,
            reminder_minutes,
            user:profiles!calendar_event_participants_user_id_fkey(full_name, avatar_url)
          )
        `)
        .order("start_time", { ascending: true });

      // Apply date filters if provided
      if (startDate) {
        query = query.gte("start_time", startDate.toISOString());
      }
      if (endDate) {
        query = query.lte("start_time", endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching events:", error);
        throw error;
      }

      // Add my_status and is_organizer to each event
      return (data as any[]).map(event => {
        const myParticipant = event.participants.find((p: any) => p.user_id === user.id);
        
        // Map user data to profiles structure expected by frontend
        const participants = event.participants.map((p: any) => ({
          ...p,
          profiles: p.user
        }));

        return {
          ...event,
          participants,
          my_status: myParticipant?.status,
          is_organizer: myParticipant?.is_organizer || false,
        };
      }) as CalendarEvent[];
    },
    enabled: !!queryClient.getQueryData(['/api/auth/me']),
  });

  // Real-time subscription for calendar updates
  useEffect(() => {
    const channel = supabase
      .channel("calendar-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "calendar_events",
        },
        () => {
          refetch();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "calendar_event_participants",
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  return {
    events,
    isLoading,
    error,
    refetch,
  };
};

/**
 * Hook to create a new calendar event
 */
export const useCreateEvent = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      eventData,
      participantIds,
      reminderMinutes,
    }: {
      eventData: Partial<CalendarEvent>;
      participantIds: string[];
      reminderMinutes: number;
    }) => {
      const user = queryClient.getQueryData<any>(['/api/auth/me'])?.user;
      if (!user) throw new Error("Not authenticated");

      // 1. Create event
      const { data: event, error: eventError } = await supabase
        .from("calendar_events")
        .insert({
          ...eventData,
          created_by: user.id,
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // 2. Add participants
      const participants = participantIds.map((userId) => ({
        event_id: event.id,
        user_id: parseInt(userId), // Ensure ID is number
        status: parseInt(userId) === user.id ? "accepted" : "pending",
        is_organizer: parseInt(userId) === user.id,
        can_edit: parseInt(userId) === user.id,
        reminder_minutes: reminderMinutes,
      }));

      // Ensure creator is added if not selected
      if (!participantIds.includes(String(user.id))) {
        participants.push({
          event_id: event.id,
          user_id: user.id,
          status: "accepted",
          is_organizer: true,
          can_edit: true,
          reminder_minutes: reminderMinutes,
        });
      }

      const { error: participantsError } = await supabase
        .from("calendar_event_participants")
        .insert(participants);

      if (participantsError) throw participantsError;

      return event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      toast({
        title: "Event created",
        description: "The event has been successfully scheduled.",
      });
    },
    onError: (error) => {
      console.error("Error creating event:", error);
      toast({
        title: "Error",
        description: "Failed to create event. Please try again.",
        variant: "destructive",
      });
    },
  });
};

/**
 * Hook to update an event
 */
export const useUpdateEvent = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      eventId,
      eventData,
      participantIds,
      reminderMinutes,
    }: {
      eventId: string;
      eventData: Partial<CalendarEvent>;
      participantIds?: string[];
      reminderMinutes?: number;
    }) => {
      // 1. Update event details
      const { error: eventError } = await supabase
        .from("calendar_events")
        .update(eventData)
        .eq("id", eventId);

      if (eventError) throw eventError;

      // 2. Update participants if provided
      if (participantIds) {
        // Get existing participants
        const { data: existingParticipants } = await supabase
          .from("calendar_event_participants")
          .select("user_id")
          .eq("event_id", eventId);

        const existingIds = existingParticipants?.map(p => String(p.user_id)) || [];
        
        // Determine to add and remove
        const toAdd = participantIds.filter(id => !existingIds.includes(id));
        const toRemove = existingIds.filter(id => !participantIds.includes(id));

        if (toRemove.length > 0) {
          await supabase
            .from("calendar_event_participants")
            .delete()
            .eq("event_id", eventId)
            .in("user_id", toRemove.map(Number));
        }

        if (toAdd.length > 0) {
          const newParticipants = toAdd.map(userId => ({
            event_id: eventId,
            user_id: parseInt(userId),
            status: "pending",
            is_organizer: false,
            can_edit: false,
            reminder_minutes: reminderMinutes || 15,
          }));

          await supabase
            .from("calendar_event_participants")
            .insert(newParticipants);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      toast({
        title: "Event updated",
        description: "The event has been successfully updated.",
      });
    },
    onError: (error) => {
      console.error("Error updating event:", error);
      toast({
        title: "Error",
        description: "Failed to update event.",
        variant: "destructive",
      });
    },
  });
};

/**
 * Hook to update event status (RSVP)
 */
export const useUpdateEventStatus = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      eventId,
      status,
    }: {
      eventId: string;
      status: 'accepted' | 'declined' | 'tentative';
    }) => {
      const user = queryClient.getQueryData<any>(['/api/auth/me'])?.user;
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("calendar_event_participants")
        .update({ status, response_at: new Date().toISOString() })
        .eq("event_id", eventId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      toast({
        title: "Status updated",
        description: "Your response has been recorded.",
      });
    },
    onError: (error) => {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update status.",
        variant: "destructive",
      });
    },
  });
};

/**
 * Hook to delete an event
 */
export const useDeleteEvent = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      eventId,
      eventTitle,
    }: {
      eventId: string;
      eventTitle: string;
    }) => {
      const { error } = await supabase
        .from("calendar_events")
        .delete()
        .eq("id", eventId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      toast({
        title: "Event deleted",
        description: `"${variables.eventTitle}" has been deleted.`,
      });
    },
    onError: (error) => {
      console.error("Error deleting event:", error);
      toast({
        title: "Error",
        description: "Failed to delete event.",
        variant: "destructive",
      });
    },
  });
};
