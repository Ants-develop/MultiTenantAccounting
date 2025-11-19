import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { auditLog } from "@/services/auditLog";
import { notificationService } from "@/services/notificationService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Send, CheckCircle2 } from "lucide-react";

interface SendPortalInvitationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: {
    id: string;
    name: string;
    email?: string;
    portal_enabled?: boolean;
    portal_invitation_sent_at?: string;
  };
  onSuccess?: () => void;
}

export function SendPortalInvitationDialog({
  open,
  onOpenChange,
  client,
  onSuccess,
}: SendPortalInvitationDialogProps) {
  const [email, setEmail] = useState(client.email || "");
  const [isLoading, setIsLoading] = useState(false);

  const handleSendInvitation = async () => {
    if (!email) {
      toast.error("Please enter an email address");
      return;
    }

    setIsLoading(true);
    try {
      // Get sender name from current user profile
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user?.id)
        .single();

      const senderName = profile?.full_name || "Your Account Team";

      // Call the edge function to send the invitation
      const { data, error } = await supabase.functions.invoke("send-portal-invitation", {
        body: {
          clientId: client.id,
          clientName: client.name,
          clientEmail: email,
          senderName: senderName,
        },
      });

      if (error) throw error;

      if (data?.success) {
      // Log the invitation
      await auditLog.logPortalInvitation(client.id, client.name, email);
      
      // Notify client portal users
      try {
        const { data: clientUsers } = await supabase
          .from("profiles")
          .select("id")
          .eq("client_id", client.id);

        if (clientUsers && clientUsers.length > 0) {
          await notificationService.notifyMultipleUsers(
            clientUsers.map(u => u.id),
            "portal_invitation",
            "Portal Access Granted",
            `Welcome! Your client portal for ${client.name} is now active. Check your email for login instructions.`,
            "/portal/dashboard"
          );
        }
      } catch (notifError) {
        console.error("Failed to send portal invitation notification:", notifError);
      }
      
      toast.success("Portal invitation sent successfully!", {
        description: `An invitation email has been sent to ${email}`,
      });
        onSuccess?.();
        onOpenChange(false);
      } else {
        throw new Error(data?.error || "Failed to send invitation");
      }
    } catch (error: any) {
      console.error("Error sending invitation:", error);
      toast.error("Failed to send invitation", {
        description: error.message || "Please try again",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getInvitationStatus = () => {
    if (!client.portal_enabled) {
      return null;
    }
    if (client.portal_invitation_sent_at) {
      const sentDate = new Date(client.portal_invitation_sent_at);
      return (
        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <p className="text-sm text-green-700 dark:text-green-400">
            Invitation sent on {sentDate.toLocaleDateString()} at{" "}
            {sentDate.toLocaleTimeString()}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Portal Invitation
          </DialogTitle>
          <DialogDescription>
            Invite {client.name} to access their secure client portal. They'll receive an
            email with instructions to set up their account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {getInvitationStatus()}

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="client@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              The invitation link will be valid for 7 days
            </p>
          </div>

          <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
            <h4 className="text-sm font-medium">What clients can do in the portal:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• View and upload documents securely</li>
              <li>• Track tasks and deadlines</li>
              <li>• Communicate with their account team</li>
              <li>• View billing and invoices</li>
              <li>• Access their account 24/7</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleSendInvitation} disabled={isLoading}>
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Invitation
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
