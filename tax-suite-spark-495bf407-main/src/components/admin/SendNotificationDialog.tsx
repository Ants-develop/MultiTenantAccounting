import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { notificationService } from "@/services/notificationService";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const formSchema = z.object({
  recipient_type: z.enum(["all_users", "all_staff", "all_clients", "specific_user"]),
  user_id: z.string().optional(),
  type: z.enum(["task_assigned", "task_completed", "document_uploaded", "message_received", "client_assigned", "portal_invitation", "system_alert"]),
  title: z.string().min(1, "Title is required").max(100),
  message: z.string().min(1, "Message is required").max(500),
  link: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface SendNotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SendNotificationDialog = ({
  open,
  onOpenChange,
}: SendNotificationDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      recipient_type: "all_staff",
      type: "system_alert",
      title: "",
      message: "",
      link: "",
    },
  });

  const recipientType = form.watch("recipient_type");

  const loadUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .order("full_name");
    
    if (data) setUsers(data);
  };

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      let recipientIds: string[] = [];

      if (data.recipient_type === "specific_user" && data.user_id) {
        recipientIds = [data.user_id];
      } else if (data.recipient_type === "all_users") {
        const { data: allUsers } = await supabase
          .from("profiles")
          .select("id");
        recipientIds = allUsers?.map(u => u.id) || [];
      } else if (data.recipient_type === "all_staff") {
        const { data: staffUsers } = await supabase
          .from("profiles")
          .select("id")
          .is("client_id", null);
        recipientIds = staffUsers?.map(u => u.id) || [];
      } else if (data.recipient_type === "all_clients") {
        const { data: clientUsers } = await supabase
          .from("profiles")
          .select("id")
          .not("client_id", "is", null);
        recipientIds = clientUsers?.map(u => u.id) || [];
      }

      if (recipientIds.length > 0) {
        await notificationService.notifyMultipleUsers(
          recipientIds,
          data.type,
          data.title,
          data.message,
          data.link || undefined
        );

        toast.success(`Notification sent to ${recipientIds.length} user(s)`);
        form.reset();
        onOpenChange(false);
      } else {
        toast.error("No recipients found");
      }
    } catch (error: any) {
      toast.error("Failed to send notification", {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send System Notification</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="recipient_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Send To</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="all_users">All Users</SelectItem>
                      <SelectItem value="all_staff">All Staff</SelectItem>
                      <SelectItem value="all_clients">All Clients</SelectItem>
                      <SelectItem value="specific_user">Specific User</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {recipientType === "specific_user" && (
              <FormField
                control={form.control}
                name="user_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      onOpenChange={(open) => open && loadUsers()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a user" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name} ({user.email})
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
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="system_alert">System Alert</SelectItem>
                      <SelectItem value="task_assigned">Task Assigned</SelectItem>
                      <SelectItem value="document_uploaded">Document Uploaded</SelectItem>
                      <SelectItem value="message_received">Message Received</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Notification title" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Notification message"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="link"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="/page-url" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Sending..." : "Send Notification"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
