import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Clock, MapPin, Link as LinkIcon, Users } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useUpdateEvent, CalendarEvent } from "@/hooks/useCalendarEvents";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

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

  const { data: users = [] } = useQuery({
    queryKey: ["users-for-calendar"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name");

      if (error) throw error;
      return data.map((u: any) => ({
        id: u.id,
        full_name: u.full_name,
        email: ""
      }));
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const startDateTime = new Date(data.startDate);
      const [startHours, startMinutes] = data.startTime.split(":").map(Number);
      startDateTime.setHours(startHours, startMinutes);

      const endDateTime = new Date(data.endDate);
      const [endHours, endMinutes] = data.endTime.split(":").map(Number);
      endDateTime.setHours(endHours, endMinutes);

      await updateEvent.mutateAsync({
        eventId: event.id,
        eventData: {
          title: data.title,
          description: data.description || null,
          location: data.location || null,
          event_type: data.eventType,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          all_day: data.allDay,
          color: data.color,
          meeting_link: data.meetingLink || null,
        },
        participantIds: data.participants,
        reminderMinutes: data.reminderMinutes,
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update event:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Event</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Team Meeting" {...field} />
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
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="call">Call</SelectItem>
                        <SelectItem value="task">Task</SelectItem>
                        <SelectItem value="personal">Personal</SelectItem>
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
                    <FormLabel>Color</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: field.value }} />
                            <SelectValue placeholder="Select color" />
                          </div>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="#6366f1">Indigo</SelectItem>
                        <SelectItem value="#ef4444">Red</SelectItem>
                        <SelectItem value="#22c55e">Green</SelectItem>
                        <SelectItem value="#eab308">Yellow</SelectItem>
                        <SelectItem value="#ec4899">Pink</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
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
                    <FormLabel>Start Time</FormLabel>
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
                    <FormLabel>End Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
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
                    <FormLabel>End Time</FormLabel>
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Add details..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input className="pl-9" placeholder="Add location" {...field} />
                    </div>
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
                  <FormLabel>Meeting Link</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input className="pl-9" placeholder="https://meet.google.com/..." {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="participants"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Participants</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      const current = field.value || [];
                      if (!current.includes(value)) {
                        field.onChange([...current, value]);
                      }
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Add participants" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {users.map((user: any) => (
                        <SelectItem key={user.id} value={String(user.id)}>
                          {user.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {field.value?.map((id) => {
                      const user = users.find((u: any) => String(u.id) === id);
                      return user ? (
                        <div key={id} className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm flex items-center gap-1">
                          {user.full_name}
                          <button
                            type="button"
                            onClick={() => field.onChange(field.value?.filter((i) => i !== id))}
                            className="hover:text-destructive"
                          >
                            ×
                          </button>
                        </div>
                      ) : null;
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
