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
  DialogDescription,
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
import { useAuth } from "@/contexts/AuthProvider";
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
  const { user } = useAuth();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const updateStatus = useUpdateEventStatus();
  const deleteEvent = useDeleteEvent();

  const currentUserParticipant = event.participants.find(
    (p) => p.user_id === user?.id
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <DialogTitle className="text-2xl">{event.title}</DialogTitle>
                <DialogDescription className="mt-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarIcon className="h-4 w-4" />
                    {format(new Date(event.start_time), "EEEE, MMMM d, yyyy")}
                  </div>
                </DialogDescription>
              </div>
              <div
                className="w-4 h-4 rounded-full shrink-0"
                style={{ backgroundColor: event.color }}
              />
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Time */}
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <div className="font-medium">Time</div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(event.start_time), "h:mm a")} -{" "}
                  {format(new Date(event.end_time), "h:mm a")}
                </div>
              </div>
            </div>

            {/* Description */}
            {event.description && (
              <div>
                <div className="font-medium mb-2">Description</div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {event.description}
                </p>
              </div>
            )}

            {/* Location */}
            {event.location && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="font-medium">Location</div>
                  <div className="text-sm text-muted-foreground">
                    {event.location}
                  </div>
                </div>
              </div>
            )}

            {/* Meeting Link */}
            {event.meeting_link && (
              <div className="flex items-start gap-3">
                <LinkIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="font-medium">Meeting Link</div>
                  <a
                    href={event.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    {event.meeting_link}
                  </a>
                </div>
              </div>
            )}

            <Separator />

            {/* Participants */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div className="font-medium">
                  Participants ({event.participants.length})
                </div>
              </div>
              <div className="space-y-3">
                {event.participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={participant.profiles?.avatar_url || undefined} />
                        <AvatarFallback>
                          {getInitials(participant.profiles?.full_name || "?")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium">
                          {participant.profiles?.full_name}
                          {participant.is_organizer && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              Organizer
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {participant.profiles?.email}
                        </div>
                      </div>
                    </div>
                    {getStatusBadge(participant.status)}
                  </div>
                ))}
              </div>
            </div>

            {/* RSVP Section */}
            {event.my_status && !event.is_organizer && !canEdit && (
              <>
                <Separator />
                <div>
                  <div className="font-medium mb-3">Your Response</div>
                  <div className="flex gap-2">
                    <Button
                      variant={event.my_status === "accepted" ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleRSVP("accepted")}
                      disabled={updateStatus.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Accept
                    </Button>
                    <Button
                      variant={event.my_status === "tentative" ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleRSVP("tentative")}
                      disabled={updateStatus.isPending}
                    >
                      <HelpCircle className="h-4 w-4 mr-2" />
                      Maybe
                    </Button>
                    <Button
                      variant={event.my_status === "declined" ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleRSVP("declined")}
                      disabled={updateStatus.isPending}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Decline
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="flex justify-between items-center">
            <div className="flex gap-2">
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEditDialog(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Event
                </Button>
              )}
              {isOrganizer && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Event
                </Button>
              )}
            </div>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Event Dialog */}
      <EditEventDialog
        event={event}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{event.title}" and notify all
              participants. This action cannot be undone.
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
    </>
  );
};
