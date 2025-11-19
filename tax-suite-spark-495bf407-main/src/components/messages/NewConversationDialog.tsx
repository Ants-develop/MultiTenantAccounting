import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const conversationSchema = z.object({
  title: z.string().trim().min(2, "Title must be at least 2 characters"),
  type: z.enum(["direct", "group", "client"]),
  client_id: z.string().uuid().optional().or(z.literal("")),
  participant_ids: z.array(z.string().uuid()).min(1, "Select at least one participant"),
});

type ConversationFormData = z.infer<typeof conversationSchema>;

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const NewConversationDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: NewConversationDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const { user } = useAuth();

  const form = useForm<ConversationFormData>({
    resolver: zodResolver(conversationSchema),
    defaultValues: {
      title: "",
      type: "direct",
      client_id: "",
      participant_ids: [],
    },
  });

  useEffect(() => {
    if (open) {
      fetchClients();
      fetchStaff();
    }
  }, [open]);

  const fetchClients = async () => {
    const { data } = await supabase
      .from("clients")
      .select("id, name")
      .order("name");
    setClients(data || []);
  };

  const fetchStaff = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .order("full_name");
    setStaff(data || []);
  };

  const onSubmit = async (data: ConversationFormData) => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Create conversation
      const { data: conversation, error: convError } = await supabase
        .from("conversations")
        .insert({
          title: data.title,
          type: data.type,
          client_id: data.client_id || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add participants including creator
      const participants = [
        { conversation_id: conversation.id, user_id: user.id },
        ...data.participant_ids.map(pid => ({
          conversation_id: conversation.id,
          user_id: pid,
        })),
      ];

      const { error: partError } = await supabase
        .from("conversation_participants")
        .insert(participants);

      if (partError) throw partError;

      toast("Conversation created successfully");
      form.reset();
      setSelectedParticipants([]);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast("Failed to create conversation", { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
          <DialogDescription>
            Start a new conversation with team members or clients
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conversation Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Q4 Tax Planning" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="direct">Direct Message</SelectItem>
                      <SelectItem value="group">Group Chat</SelectItem>
                      <SelectItem value="client">Client Discussion</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch("type") === "client" && (
              <FormField
                control={form.control}
                name="client_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select client" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="participant_ids"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Add Participants *</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      const newParticipants = [...selectedParticipants, value];
                      setSelectedParticipants(newParticipants);
                      field.onChange(newParticipants);
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select team members" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {staff
                        .filter(s => !selectedParticipants.includes(s.id))
                        .map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.full_name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {selectedParticipants.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedParticipants.map(pid => {
                        const member = staff.find(s => s.id === pid);
                        return member ? (
                          <span
                            key={pid}
                            className="text-xs bg-secondary px-2 py-1 rounded"
                          >
                            {member.full_name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Conversation"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
