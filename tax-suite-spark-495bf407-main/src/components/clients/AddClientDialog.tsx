import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { toast } from "sonner";
import { useUsers } from "@/hooks/useUsers";
import { notificationService } from "@/services/notificationService";
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
import { Textarea } from "@/components/ui/textarea";

const clientSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  business_type: z.enum(["individual", "sole_proprietor", "partnership", "llc", "s_corp", "c_corp", "nonprofit"]),
  tax_id: z.string().trim().optional(),
  industry: z.string().trim().optional(),
  email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().trim().optional(),
  notes: z.string().optional(),
  assigned_owner_id: z.string().optional(),
  assigned_accountant_id: z.string().optional(),
  assigned_reviewer_id: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

interface AddClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const AddClientDialog = ({ open, onOpenChange, onSuccess }: AddClientDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { data: users = [] } = useUsers();

  const staffMembers = users.filter(user => !user.client_id && user.is_active);

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      business_type: "individual",
      tax_id: "",
      industry: "",
      email: "",
      phone: "",
      notes: "",
      assigned_owner_id: "",
      assigned_accountant_id: "",
      assigned_reviewer_id: "",
    },
  });

  const onSubmit = async (data: ClientFormData) => {
    setIsLoading(true);
    try {
      const clientData: any = {
        name: data.name,
        business_type: data.business_type,
        tax_id: data.tax_id || null,
        industry: data.industry || null,
        email: data.email || null,
        phone: data.phone || null,
        notes: data.notes || null,
        assigned_owner_id: data.assigned_owner_id || null,
        assigned_accountant_id: data.assigned_accountant_id || null,
        assigned_reviewer_id: data.assigned_reviewer_id || null,
        created_by: user?.id,
      };

      const { data: newClient, error } = await supabase
        .from("clients")
        .insert(clientData)
        .select()
        .single();

      if (error) throw error;

      // Send notifications to assigned staff
      try {
        const { data: currentUserProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user?.id)
          .single();

        const assignerName = currentUserProfile?.full_name || "An administrator";

        if (data.assigned_owner_id) {
          await notificationService.notifyClientAssigned(
            data.assigned_owner_id,
            newClient.id,
            data.name,
            assignerName,
            "Manager"
          );
        }

        if (data.assigned_accountant_id) {
          await notificationService.notifyClientAssigned(
            data.assigned_accountant_id,
            newClient.id,
            data.name,
            assignerName,
            "Accountant"
          );
        }

        if (data.assigned_reviewer_id) {
          await notificationService.notifyClientAssigned(
            data.assigned_reviewer_id,
            newClient.id,
            data.name,
            assignerName,
            "Reviewer"
          );
        }
      } catch (notifError) {
        console.error("Failed to send assignment notification:", notifError);
      }

      toast.success("Client created successfully");
      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to create client");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Client</DialogTitle>
          <DialogDescription>
            Create a new client profile with their business information
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe or ABC Corp" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="business_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="individual">Individual</SelectItem>
                        <SelectItem value="sole_proprietor">Sole Proprietor</SelectItem>
                        <SelectItem value="partnership">Partnership</SelectItem>
                        <SelectItem value="llc">LLC</SelectItem>
                        <SelectItem value="s_corp">S-Corp</SelectItem>
                        <SelectItem value="c_corp">C-Corp</SelectItem>
                        <SelectItem value="nonprofit">Nonprofit</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tax_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax ID / EIN</FormLabel>
                    <FormControl>
                      <Input placeholder="XX-XXXXXXX" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="industry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Industry</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Technology, Healthcare" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="client@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="(555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-sm font-semibold">Staff Assignment</h3>
              
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="assigned_owner_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned Manager</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a manager (optional)" />
                          </SelectTrigger>
                        </FormControl>
            <SelectContent>
              {staffMembers
                .filter(user => user.roles.includes('admin') || user.roles.includes('manager'))
                .map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name} {user.job_title ? `(${user.job_title})` : ''}
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
                  name="assigned_accountant_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Accountant 1</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select accountant (optional)" />
                          </SelectTrigger>
                        </FormControl>
            <SelectContent>
              {staffMembers
                .filter(user => user.roles.includes('accountant') || user.roles.includes('admin'))
                .map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name} {user.job_title ? `(${user.job_title})` : ''}
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
                  name="assigned_reviewer_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Accountant 2 / Reviewer</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select accountant/reviewer (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {staffMembers
                            .filter(user => 
                              user.roles.includes('accountant') || 
                              user.roles.includes('admin')
                            )
                            .map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.full_name} {user.job_title ? `(${user.job_title})` : ''}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional information about this client..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
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
                {isLoading ? "Creating..." : "Create Client"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
