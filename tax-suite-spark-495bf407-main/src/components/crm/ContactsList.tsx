import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Mail, Phone, Plus, Pencil, Trash2, User } from "lucide-react";
import { DealContact } from "@/types/crm";
import { useState } from "react";
import { useDealMutations } from "@/hooks/useDealMutations";

interface ContactsListProps {
  contacts: DealContact[];
  isLoading: boolean;
  onAddContact: () => void;
  onEditContact: (contact: DealContact) => void;
}

export const ContactsList = ({
  contacts,
  isLoading,
  onAddContact,
  onEditContact,
}: ContactsListProps) => {
  const { deleteDealContact } = useDealMutations();
  const [deleteContactId, setDeleteContactId] = useState<string | null>(null);
  const [deleteDealId, setDeleteDealId] = useState<string | null>(null);

  const handleDeleteContact = () => {
    if (deleteContactId && deleteDealId) {
      deleteDealContact.mutate(
        { id: deleteContactId, dealId: deleteDealId },
        {
          onSuccess: () => {
            setDeleteContactId(null);
            setDeleteDealId(null);
          },
        }
      );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-6 w-32 bg-muted animate-pulse rounded" />
          <div className="h-9 w-32 bg-muted animate-pulse rounded" />
        </div>
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="h-20 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const additionalContacts = contacts.filter((c) => !c.is_primary);

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Contacts</h3>
          <Button onClick={onAddContact} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        </div>

        {additionalContacts.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No additional contacts. Add contacts to track key stakeholders.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {additionalContacts.map((contact) => (
              <Card key={contact.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{contact.name}</h4>
                          {contact.is_primary && (
                            <Badge variant="secondary">Primary</Badge>
                          )}
                        </div>
                        {contact.role && (
                          <p className="text-sm text-muted-foreground">
                            {contact.role}
                          </p>
                        )}
                        <div className="flex flex-col gap-1 mt-2">
                          {contact.email && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="h-4 w-4" />
                              <span className="truncate">{contact.email}</span>
                            </div>
                          )}
                          {contact.phone && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="h-4 w-4" />
                              <span>{contact.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEditContact(contact)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setDeleteContactId(contact.id);
                          setDeleteDealId(contact.deal_id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog
        open={!!deleteContactId}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteContactId(null);
            setDeleteDealId(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this contact from the deal? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteContact}
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
