import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Loader2, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { clientManagementApi, ClientContact } from "@/api/client-management";
import { insertClientContactSchema } from "@shared/schema";

interface ClientContactsListProps {
    clientId: number;
}

export function ClientContactsList({ clientId }: ClientContactsListProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingContact, setEditingContact] = useState<ClientContact | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

    // Schema for form (omit clientId as it's passed)
    const formSchema = insertClientContactSchema.omit({ clientId: true });
    type FormData = z.infer<typeof formSchema>;

    const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            email: "",
            phone: "",
            jobTitle: "",
            isPrimary: false,
        }
    });

    // Fetch contacts
    const { data: contacts, isLoading } = useQuery({
        queryKey: ["clientContacts", clientId],
        queryFn: () => clientManagementApi.fetchClientContacts(clientId),
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: (data: FormData) => clientManagementApi.createClientContact(clientId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["clientContacts", clientId] });
            toast({ title: "Success", description: "Contact created successfully" });
            setIsModalOpen(false);
            reset();
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    });

    const updateMutation = useMutation({
        mutationFn: (data: { id: number; formData: Partial<FormData> }) =>
            clientManagementApi.updateClientContact(clientId, data.id, data.formData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["clientContacts", clientId] });
            toast({ title: "Success", description: "Contact updated successfully" });
            setIsModalOpen(false);
            setEditingContact(null);
            reset();
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => clientManagementApi.deleteClientContact(clientId, id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["clientContacts", clientId] });
            toast({ title: "Success", description: "Contact deleted successfully" });
            setDeleteConfirmId(null);
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    });

    const onSubmit = (data: FormData) => {
        if (editingContact) {
            updateMutation.mutate({ id: editingContact.id, formData: data });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleEdit = (contact: ClientContact) => {
        setEditingContact(contact);
        reset({
            name: contact.name,
            email: contact.email || "",
            phone: contact.phone || "",
            jobTitle: contact.jobTitle || "",
            isPrimary: contact.isPrimary,
        });
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setEditingContact(null);
        reset({
            name: "",
            email: "",
            phone: "",
            jobTitle: "",
            isPrimary: false,
        });
        setIsModalOpen(true);
    };

    if (isLoading) return <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>;

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Contacts</CardTitle>
                <Button onClick={handleCreate} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Contact
                </Button>
            </CardHeader>
            <CardContent>
                {!contacts || contacts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No contacts found.</p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Job Title</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {contacts.map((contact) => (
                                <TableRow key={contact.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            {contact.isPrimary && <User className="w-3 h-3 text-blue-500" />}
                                            {contact.name}
                                        </div>
                                    </TableCell>
                                    <TableCell>{contact.email}</TableCell>
                                    <TableCell>{contact.phone || "—"}</TableCell>
                                    <TableCell>{contact.jobTitle || "—"}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" onClick={() => handleEdit(contact)}>
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteConfirmId(contact.id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>

            {/* Create/Edit Dialog */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingContact ? "Edit Contact" : "Add Contact"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name *</Label>
                            <Input id="name" {...register("name")} />
                            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" {...register("email")} />
                            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone</Label>
                            <Input id="phone" {...register("phone")} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="jobTitle">Job Title</Label>
                            <Input id="jobTitle" {...register("jobTitle")} placeholder="e.g. Manager, Accountant" />
                        </div>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="isPrimary" {...register("isPrimary")} className="rounded" />
                            <Label htmlFor="isPrimary">Primary Contact</Label>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                                {editingContact ? "Update" : "Create"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            {deleteConfirmId && (
                <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Delete Contact</DialogTitle></DialogHeader>
                        <p>Are you sure you want to delete this contact?</p>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
                            <Button variant="destructive" onClick={() => deleteMutation.mutate(deleteConfirmId!)}>Delete</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </Card>
    );
}
