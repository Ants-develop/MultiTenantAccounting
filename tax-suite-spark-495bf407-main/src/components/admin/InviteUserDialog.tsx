import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AppRole } from "@/types/user";
import { ROLE_PERMISSIONS } from "@/config/permissions";
import { RoleBadge } from "./RoleBadge";
import { Mail, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const InviteUserDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: InviteUserDialogProps) => {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<AppRole[]>([]);
  const [clientId, setClientId] = useState<string>("");
  const [customMessage, setCustomMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: clients } = useQuery({
    queryKey: ["clients-for-invite"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const handleToggleRole = (role: AppRole) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !fullName || selectedRoles.length === 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (selectedRoles.includes("client") && !clientId) {
      toast.error("Please select a client when assigning the client role");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from("user_invitations").insert({
        email,
        full_name: fullName,
        job_title: jobTitle || null,
        invited_by: user?.id,
        initial_roles: selectedRoles,
        client_id: clientId || null,
        custom_message: customMessage || null,
      });

      if (error) throw error;

      toast.success("Invitation sent successfully");
      onOpenChange(false);
      onSuccess?.();

      // Reset form
      setEmail("");
      setFullName("");
      setJobTitle("");
      setSelectedRoles([]);
      setClientId("");
      setCustomMessage("");
    } catch (error: any) {
      toast.error(error.message || "Failed to send invitation");
    } finally {
      setIsSubmitting(false);
    }
  };

  const needsClientLink = selectedRoles.includes("client");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Invite New User
          </DialogTitle>
          <DialogDescription>
            Send an email invitation to add a new team member or client
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">
                Email Address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fullName"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job Title (Optional)</Label>
              <Input
                id="jobTitle"
                placeholder="Senior Accountant"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <Label>
                Assign Roles <span className="text-destructive">*</span>
              </Label>
              <div className="grid gap-3">
                {ROLE_PERMISSIONS.map((roleConfig) => (
                  <div
                    key={roleConfig.role}
                    className="flex items-start space-x-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors"
                  >
                    <Checkbox
                      id={`invite-${roleConfig.role}`}
                      checked={selectedRoles.includes(roleConfig.role)}
                      onCheckedChange={() => handleToggleRole(roleConfig.role)}
                    />
                    <div className="flex-1 space-y-1">
                      <Label
                        htmlFor={`invite-${roleConfig.role}`}
                        className="cursor-pointer flex items-center gap-2"
                      >
                        <RoleBadge role={roleConfig.role} />
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {roleConfig.modules.admin?.level === 'full'
                          ? 'Full system access'
                          : roleConfig.modules.clients?.description || 'Standard access'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {needsClientLink && (
              <>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Client role requires linking to a specific client
                  </AlertDescription>
                </Alert>
                <div className="space-y-2">
                  <Label htmlFor="client">
                    Link to Client <span className="text-destructive">*</span>
                  </Label>
                  <Select value={clientId} onValueChange={setClientId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients?.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="message">Custom Welcome Message (Optional)</Label>
              <Textarea
                id="message"
                placeholder="Add a personal message to the invitation email..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || selectedRoles.length === 0}>
              {isSubmitting ? "Sending..." : "Send Invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
