import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { notificationService } from "@/services/notificationService";
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

  // Fetch events for the current user within date range
  const { data: events = [], isLoading, error, refetch } = useQuery({
    queryKey: ["calendar-events", startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let query = supabase
        .from("calendar_events")
        .select(`
          *,
          participants:calendar_event_participants(
            id,
            user_id,
            status,
            is_organizer,
            can_edit,
            response_at,
            reminder_minutes,
            profiles!calendar_event_participants_user_id_fkey(full_name, email, avatar_url)
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

      if (error) throw error;

      // Add my_status and is_organizer to each event
      return (data as CalendarEvent[]).map(event => {
        const myParticipant = event.participants.find(p => p.user_id === user.id);
        return {
          ...event,
          my_status: myParticipant?.status,
          is_organizer: myParticipant?.is_organizer || false,
        };
      });
    },
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

  return useMutation({
    mutationFn: async ({
      eventData,
      participantIds,
      reminderMinutes,
    }: {
      eventData: Partial<CalendarEvent>;
      participantIds: string[];
      reminderMinutes?: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create the event
      const { data: newEvent, error: eventError } = await supabase
        .from("calendar_events")
        .insert({
          title: eventData.title,
          description: eventData.description,
          location: eventData.location,
          event_type: eventData.event_type || 'meeting',
          start_time: eventData.start_time,
          end_time: eventData.end_time,
          all_day: eventData.all_day || false,
          is_recurring: eventData.is_recurring || false,
          recurrence_pattern: eventData.recurrence_pattern,
          color: eventData.color || '#6366f1',
          meeting_link: eventData.meeting_link,
          attachments: eventData.attachments || [],
          created_by: user.id,
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Add creator as organizer
      const participants = [
        {
          event_id: newEvent.id,
          user_id: user.id,
          is_organizer: true,
          can_edit: true,
          status: 'accepted',
          reminder_minutes: reminderMinutes || 15,
        },
        ...participantIds
          .filter(id => id !== user.id) // Don't duplicate creator
          .map(userId => ({
            event_id: newEvent.id,
            user_id: userId,
            status: 'pending',
            reminder_minutes: reminderMinutes || 15,
          })),
      ];

      const { error: participantsError } = await supabase
        .from("calendar_event_participants")
        .insert(participants);

      if (participantsError) throw participantsError;

      // Send notifications to participants
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      const organizerName = userProfile?.full_name || "Someone";

      // Notify all participants except creator
      await Promise.all(
        participantIds
          .filter(id => id !== user.id)
          .map(userId =>
            notificationService.notifyEventInvitation(
              userId,
              newEvent.id,
              eventData.title!,
              organizerName,
              eventData.start_time!
            )
          )
      );

      return newEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      toast.success("Event created successfully");
    },
    onError: (error: any) => {
      console.error("Failed to create event:", error);
      toast.error("Failed to create event", {
        description: error.message,
      });
    },
  });
};

/**
 * Hook to update participant status (RSVP)
 */
export const useUpdateEventStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      status,
    }: {
      eventId: string;
      status: 'accepted' | 'declined' | 'tentative';
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("calendar_event_participants")
        .update({
          status,
          response_at: new Date().toISOString(),
        })
        .eq("event_id", eventId)
        .eq("user_id", user.id);

      if (error) throw error;

      // Fetch event details and notify organizer
      const { data: event } = await supabase
        .from("calendar_events")
        .select("created_by, title")
        .eq("id", eventId)
        .single();

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (event && userProfile && event.created_by !== user.id) {
        await notificationService.notifyEventResponse(
          event.created_by,
          eventId,
          event.title,
          userProfile.full_name,
          status
        );
      }

      return { eventId, status };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      const statusText = {
        accepted: 'accepted',
        declined: 'declined',
        tentative: 'marked as tentative'
      }[variables.status];
      toast.success(`Event ${statusText}`);
    },
    onError: (error: any) => {
      console.error("Failed to update event status:", error);
      toast.error("Failed to update response", {
        description: error.message,
      });
    },
  });
};

/**
 * Hook to update an existing event
 */
export const useUpdateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      eventData,
      addParticipantIds,
      removeParticipantIds,
      reminderMinutes,
      changeDescription,
    }: {
      eventId: string;
      eventData: Partial<CalendarEvent>;
      addParticipantIds?: string[];
      removeParticipantIds?: string[];
      reminderMinutes?: number;
      changeDescription?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update the event
      const { error: eventError } = await supabase
        .from("calendar_events")
        .update({
          title: eventData.title,
          description: eventData.description,
          location: eventData.location,
          event_type: eventData.event_type,
          start_time: eventData.start_time,
          end_time: eventData.end_time,
          all_day: eventData.all_day,
          color: eventData.color,
          meeting_link: eventData.meeting_link,
        })
        .eq("id", eventId);

      if (eventError) throw eventError;

      // Update reminder_minutes for all existing participants if provided
      if (reminderMinutes !== undefined) {
        const { error: reminderError } = await supabase
          .from("calendar_event_participants")
          .update({ reminder_minutes: reminderMinutes })
          .eq("event_id", eventId);

        if (reminderError) throw reminderError;
      }

      // Add new participants
      if (addParticipantIds && addParticipantIds.length > 0) {
        const newParticipants = addParticipantIds.map(userId => ({
          event_id: eventId,
          user_id: userId,
          status: 'pending',
          reminder_minutes: reminderMinutes || 15,
        }));

        const { error: addError } = await supabase
          .from("calendar_event_participants")
          .insert(newParticipants);

        if (addError) throw addError;
      }

      // Remove participants
      if (removeParticipantIds && removeParticipantIds.length > 0) {
        const { error: removeError } = await supabase
          .from("calendar_event_participants")
          .delete()
          .eq("event_id", eventId)
          .in("user_id", removeParticipantIds);

        if (removeError) throw removeError;
      }

      // Notify all existing participants about the update
      const { data: participants } = await supabase
        .from("calendar_event_participants")
        .select("user_id")
        .eq("event_id", eventId)
        .neq("user_id", user.id);

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      const updatedBy = userProfile?.full_name || "Someone";

      if (participants && participants.length > 0) {
        await Promise.all(
          participants.map(p =>
            notificationService.notifyEventUpdated(
              p.user_id,
              eventId,
              eventData.title!,
              updatedBy,
              changeDescription
            )
          )
        );
      }

      // Notify new participants
      if (addParticipantIds && addParticipantIds.length > 0) {
        await Promise.all(
          addParticipantIds.map(userId =>
            notificationService.notifyEventInvitation(
              userId,
              eventId,
              eventData.title!,
              updatedBy,
              eventData.start_time!
            )
          )
        );
      }

      return eventId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      toast.success("Event updated successfully");
    },
    onError: (error: any) => {
      console.error("Failed to update event:", error);
      toast.error("Failed to update event", {
        description: error.message,
      });
    },
  });
};

/**
 * Hook to delete an event
 */
export const useDeleteEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      eventTitle,
      reason,
    }: {
      eventId: string;
      eventTitle: string;
      reason?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get all participants before deleting
      const { data: participants } = await supabase
        .from("calendar_event_participants")
        .select("user_id")
        .eq("event_id", eventId)
        .neq("user_id", user.id);

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      const cancelledBy = userProfile?.full_name || "Someone";

      // Delete the event (participants will cascade delete)
      const { error } = await supabase
        .from("calendar_events")
        .delete()
        .eq("id", eventId);

      if (error) throw error;

      // Notify all participants about cancellation
      if (participants && participants.length > 0) {
        await Promise.all(
          participants.map(p =>
            notificationService.notifyEventCancelled(
              p.user_id,
              eventId,
              eventTitle,
              cancelledBy,
              reason
            )
          )
        );
      }

      return eventId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      toast.success("Event deleted successfully");
    },
    onError: (error: any) => {
      console.error("Failed to delete event:", error);
      toast.error("Failed to delete event", {
        description: error.message,
      });
    },
  });
};
