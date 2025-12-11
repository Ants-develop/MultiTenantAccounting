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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { useState } from "react";

interface EventParticipant {
  user_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'tentative';
  is_organizer?: boolean;
  can_edit?: boolean;
  user?: {
    full_name: string;
    email?: string;
  };
}

interface CalendarEventDetails {
  id: string;
  title: string;
  description?: string | null;
  start_time: string;
  end_time: string;
  location?: string | null;
  meeting_url?: string | null;
  participants: EventParticipant[];
  created_by: string;
}

interface EventDetailsDialogProps {
  event: CalendarEventDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId?: string;
  onRSVP?: (status: 'accepted' | 'declined' | 'tentative') => void;
  onDelete?: () => void;
  onEdit?: () => void;
}

export const EventDetailsDialog = ({
  event,
  open,
  onOpenChange,
  currentUserId,
  onRSVP,
  onDelete,
  onEdit,
}: EventDetailsDialogProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const currentUserParticipant = event.participants.find(
    (p) => p.user_id === currentUserId
  );

  const isOrganizer = currentUserParticipant?.is_organizer || event.created_by === currentUserId;
  const canEdit = currentUserParticipant?.can_edit || isOrganizer;

  const handleRSVP = (status: 'accepted' | 'declined' | 'tentative') => {
    onRSVP?.(status);
  };

  const handleDelete = () => {
    onDelete?.();
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
            <DialogTitle className="text-2xl">{event.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Date & Time */}
            <div className="flex items-start gap-3">
              <CalendarIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <div className="font-medium">
                  {format(new Date(event.start_time), "EEEE, MMMM d, yyyy")}
                </div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(event.start_time), "h:mm a")} -{" "}
                  {format(new Date(event.end_time), "h:mm a")}
                </div>
              </div>
            </div>

            {/* Location */}
            {event.location && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="text-sm">{event.location}</div>
              </div>
            )}

            {/* Meeting URL */}
            {event.meeting_url && (
              <div className="flex items-start gap-3">
                <LinkIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                <a
                  href={event.meeting_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  {event.meeting_url}
                </a>
              </div>
            )}

            {/* Description */}
            {event.description && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {event.description}
                  </p>
                </div>
              </>
            )}

            {/* Participants */}
            {event.participants.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Participants ({event.participants.length})
                  </h4>
                  <div className="space-y-2">
                    {event.participants.map((participant) => (
                      <div
                        key={participant.user_id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {getInitials(participant.user?.full_name || "U")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-sm font-medium">
                              {participant.user?.full_name || "Unknown User"}
                              {participant.is_organizer && (
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  Organizer
                                </Badge>
                              )}
                            </div>
                            {participant.user?.email && (
                              <div className="text-xs text-muted-foreground">
                                {participant.user.email}
                              </div>
                            )}
                          </div>
                        </div>
                        {getStatusBadge(participant.status)}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* RSVP Actions */}
            {currentUserParticipant && currentUserParticipant.status === 'pending' && onRSVP && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-3">RSVP</h4>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleRSVP('accepted')}
                    >
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                      Accept
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleRSVP('tentative')}
                    >
                      <HelpCircle className="h-4 w-4 mr-2 text-yellow-500" />
                      Maybe
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleRSVP('declined')}
                    >
                      <XCircle className="h-4 w-4 mr-2 text-red-500" />
                      Decline
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="gap-2">
            {canEdit && onDelete && (
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
            {canEdit && onEdit && (
              <Button variant="outline" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
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
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
