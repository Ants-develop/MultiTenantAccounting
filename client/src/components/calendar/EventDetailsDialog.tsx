import { format } from "date-fns";
import {
  Clock,
  MapPin,
  Link as LinkIcon,
  Users,
  Calendar as CalendarIcon,
  Trash2,
  CheckCircle,
  XCircle,
  HelpCircle,
  Edit,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CalendarEvent } from "@/hooks/useCalendarEvents";
import { useUpdateEventStatus, useDeleteEvent } from "@/hooks/useCalendarEvents";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { EditEventDialog } from "./EditEventDialog";

interface EventDetailsDialogProps {
  event: CalendarEvent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EventDetailsDialog = ({
  event,
  open,
  onOpenChange,
}: EventDetailsDialogProps) => {
  const { data: user } = useAuth();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const updateStatus = useUpdateEventStatus();
  const deleteEvent = useDeleteEvent();

  const currentUserParticipant = event.participants.find(
    (p) => String(p.user_id) === String(user?.user?.id)
  );

  const isOrganizer = currentUserParticipant?.is_organizer || false;
  const canEdit = currentUserParticipant?.can_edit || isOrganizer;

  const handleRSVP = async (status: 'accepted' | 'declined' | 'tentative') => {
    await updateStatus.mutateAsync({ eventId: event.id, status });
  };

  const handleDelete = async () => {
    await deleteEvent.mutateAsync({
      eventId: event.id,
      eventTitle: event.title,
    });
    setShowDeleteDialog(false);
    onOpenChange(false);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { color: string; icon: any }> = {
      accepted: { color: "bg-green-500/10 text-green-500 border-green-500/20", icon: CheckCircle },
      declined: { color: "bg-red-500/10 text-red-500 border-red-500/20", icon: XCircle },
      tentative: { color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", icon: HelpCircle },
      pending: { color: "bg-muted text-muted-foreground border-border", icon: Clock },
    };

    const { color, icon: Icon } = variants[status] || variants.pending;

    return (
      <Badge variant="outline" className={color}>
        <Icon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <div className="flex items-start justify-between pr-8">
              <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: event.color }}
                />
                {event.title}
              </DialogTitle>
              {canEdit && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowEditDialog(true)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Time & Date */}
            <div className="flex items-start gap-3">
              <CalendarIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">
                  {format(new Date(event.start_time), "EEEE, MMMM d, yyyy")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(event.start_time), "h:mm a")} -{" "}
                  {format(new Date(event.end_time), "h:mm a")}
                </p>
              </div>
            </div>

            {/* Location */}
            {event.location && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm">{event.location}</p>
                </div>
              </div>
            )}

            {/* Meeting Link */}
            {event.meeting_link && (
              <div className="flex items-start gap-3">
                <LinkIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <a
                    href={event.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline break-all"
                  >
                    {event.meeting_link}
                  </a>
                </div>
              </div>
            )}

            {/* Description */}
            {event.description && (
              <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">
                {event.description}
              </div>
            )}

            <Separator />

            {/* Participants */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-medium">Participants</h4>
              </div>
              <div className="space-y-3">
                {event.participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={participant.profiles?.avatar_url || undefined} />
                        <AvatarFallback>
                          {getInitials(participant.profiles?.full_name || "Unknown")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {participant.profiles?.full_name}
                          {participant.is_organizer && (
                            <span className="text-xs text-muted-foreground ml-2">
                              (Organizer)
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {participant.profiles?.email}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(participant.status)}
                  </div>
                ))}
              </div>
            </div>

            {/* RSVP Actions */}
            {!isOrganizer && currentUserParticipant && (
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant={currentUserParticipant.status === "accepted" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleRSVP("accepted")}
                  className="gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Accept
                </Button>
                <Button
                  variant={currentUserParticipant.status === "tentative" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleRSVP("tentative")}
                  className="gap-2"
                >
                  <HelpCircle className="h-4 w-4" />
                  Maybe
                </Button>
                <Button
                  variant={currentUserParticipant.status === "declined" ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => handleRSVP("declined")}
                  className="gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  Decline
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{event.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showEditDialog && (
        <EditEventDialog
          event={event}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
        />
      )}
    </>
  );
};
