import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Clock, MapPin, Video, Users, Palette, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useUpdateEvent, CalendarEvent } from "@/hooks/useCalendarEvents";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  startDate: z.date(),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  endDate: z.date(),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  eventType: z.string(),
  color: z.string(),
  location: z.string().optional(),
  meetingLink: z.string().url().optional().or(z.literal("")),
  participants: z.array(z.string()),
  allDay: z.boolean(),
  reminderMinutes: z.number().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface EditEventDialogProps {
  event: CalendarEvent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditEventDialog({ event, open, onOpenChange }: EditEventDialogProps) {
  const updateEvent = useUpdateEvent();

  // Get current user's reminder setting
  const getCurrentUserReminder = () => {
    const currentParticipant = event.participants.find(p => p.is_organizer);
    return currentParticipant?.reminder_minutes || 15;
  };

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: event.title,
      description: event.description || "",
      startDate: new Date(event.start_time),
      startTime: format(new Date(event.start_time), "HH:mm"),
      endDate: new Date(event.end_time),
      endTime: format(new Date(event.end_time), "HH:mm"),
      eventType: event.event_type,
      color: event.color || "#6366f1",
      location: event.location || "",
      meetingLink: event.meeting_link || "",
      participants: event.participants.map(p => p.user_id),
      allDay: event.all_day || false,
      reminderMinutes: getCurrentUserReminder(),
    },
  });

  // Reset form when event changes
  useEffect(() => {
    form.reset({
      title: event.title,
      description: event.description || "",
      startDate: new Date(event.start_time),
      startTime: format(new Date(event.start_time), "HH:mm"),
      endDate: new Date(event.end_time),
      endTime: format(new Date(event.end_time), "HH:mm"),
      eventType: event.event_type,
      color: event.color || "#6366f1",
      location: event.location || "",
      meetingLink: event.meeting_link || "",
      participants: event.participants.map(p => p.user_id),
      allDay: event.all_day || false,
      reminderMinutes: getCurrentUserReminder(),
    });
  }, [event, form]);

  const { data: users } = useQuery({
    queryKey: ["active-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .eq("is_active", true)
        .order("full_name");

      if (error) throw error;
      return data;
    },
  });

  const onSubmit = (data: FormData) => {
    const startDateTime = new Date(data.startDate);
    const [startHours, startMinutes] = data.startTime.split(":").map(Number);
    startDateTime.setHours(startHours, startMinutes, 0, 0);

    const endDateTime = new Date(data.endDate);
    const [endHours, endMinutes] = data.endTime.split(":").map(Number);
    endDateTime.setHours(endHours, endMinutes, 0, 0);

    // Determine which participants to add and remove
    const originalParticipantIds = event.participants.map(p => p.user_id);
    const newParticipantIds = data.participants;
    
    const addParticipantIds = newParticipantIds.filter(
      id => !originalParticipantIds.includes(id)
    );
    const removeParticipantIds = originalParticipantIds.filter(
      id => !newParticipantIds.includes(id)
    );

    updateEvent.mutate(
      {
        eventId: event.id,
        eventData: {
          title: data.title,
          description: data.description,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          event_type: data.eventType,
          color: data.color,
          location: data.location,
          meeting_link: data.meetingLink,
          all_day: data.allDay,
        },
        addParticipantIds: addParticipantIds.length > 0 ? addParticipantIds : undefined,
        removeParticipantIds: removeParticipantIds.length > 0 ? removeParticipantIds : undefined,
        reminderMinutes: data.reminderMinutes,
        changeDescription: "Event details updated",
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  const eventTypeOptions = [
    { value: "meeting", label: "Meeting" },
    { value: "deadline", label: "Deadline" },
    { value: "reminder", label: "Reminder" },
    { value: "event", label: "Event" },
  ];

  const colorOptions = [
    { value: "#6366f1", label: "Indigo" },
    { value: "#3b82f6", label: "Blue" },
    { value: "#10b981", label: "Green" },
    { value: "#f59e0b", label: "Amber" },
    { value: "#ef4444", label: "Red" },
    { value: "#8b5cf6", label: "Purple" },
    { value: "#ec4899", label: "Pink" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Event</DialogTitle>
          <DialogDescription>
            Update the event details and notify participants of changes
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="Event title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add event description..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="eventType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {eventTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Palette className="h-4 w-4 inline mr-2" />
                      Color
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select color" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {colorOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-4 h-4 rounded"
                                style={{ backgroundColor: option.value }}
                              />
                              {option.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="allDay"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="!mt-0">All-day event</FormLabel>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>
                      <CalendarIcon className="h-4 w-4 inline mr-2" />
                      Start Date *
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Clock className="h-4 w-4 inline mr-2" />
                      Start Time *
                    </FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>
                      <CalendarIcon className="h-4 w-4 inline mr-2" />
                      End Date *
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Clock className="h-4 w-4 inline mr-2" />
                      End Time *
                    </FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <MapPin className="h-4 w-4 inline mr-2" />
                    Location
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Add location" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="meetingLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <Video className="h-4 w-4 inline mr-2" />
                    Meeting Link
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="https://meet.google.com/..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="participants"
              render={() => (
                <FormItem>
                  <FormLabel>
                    <Users className="h-4 w-4 inline mr-2" />
                    Participants
                  </FormLabel>
                  <div className="border rounded-lg p-4 max-h-48 overflow-y-auto space-y-2">
                    {users?.map((user) => (
                      <FormField
                        key={user.id}
                        control={form.control}
                        name="participants"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(user.id)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...field.value, user.id])
                                    : field.onChange(
                                        field.value?.filter((id) => id !== user.id)
                                      );
                                }}
                              />
                            </FormControl>
                            <FormLabel className="!mt-0 font-normal cursor-pointer">
                              {user.full_name} ({user.email})
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reminderMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reminder Time</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === "none" ? undefined : parseInt(value))}
                    value={field.value?.toString() || "15"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select reminder time" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No reminder</SelectItem>
                      <SelectItem value="5">5 minutes before</SelectItem>
                      <SelectItem value="15">15 minutes before</SelectItem>
                      <SelectItem value="30">30 minutes before</SelectItem>
                      <SelectItem value="60">1 hour before</SelectItem>
                      <SelectItem value="1440">1 day before</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateEvent.isPending}>
                {updateEvent.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
