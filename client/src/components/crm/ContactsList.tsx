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

interface ContactsListProps {
  contacts: DealContact[];
  isLoading: boolean;
  dealId?: string;
  onAddContact: () => void;
  onEditContact: (contact: DealContact) => void;
  onDeleteContact?: (contactId: string) => void;
}

export const ContactsList = ({
  contacts,
  isLoading,
  dealId,
  onAddContact,
  onEditContact,
  onDeleteContact,
}: ContactsListProps) => {
  const [deleteContactId, setDeleteContactId] = useState<string | null>(null);

  const handleDelete = () => {
    if (deleteContactId && onDeleteContact) {
      onDeleteContact(deleteContactId);
      setDeleteContactId(null);
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

  const primaryContact = contacts.find((c) => c.is_primary);
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

        {/* Primary Contact */}
        {primaryContact && (
          <Card className="border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{primaryContact.name}</p>
                      <Badge variant="secondary" className="text-xs">Primary</Badge>
                    </div>
                    {primaryContact.role && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {primaryContact.role}
                      </p>
                    )}
                    <div className="flex flex-col gap-1">
                      {primaryContact.email && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <a 
                            href={`mailto:${primaryContact.email}`}
                            className="hover:underline"
                          >
                            {primaryContact.email}
                          </a>
                        </div>
                      )}
                      {primaryContact.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <a 
                            href={`tel:${primaryContact.phone}`}
                            className="hover:underline"
                          >
                            {primaryContact.phone}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onEditContact(primaryContact)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Additional Contacts */}
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
                          <p className="font-medium">{contact.name}</p>
                        </div>
                        {contact.role && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {contact.role}
                          </p>
                        )}
                        <div className="flex flex-col gap-1">
                          {contact.email && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="h-4 w-4" />
                              <a 
                                href={`mailto:${contact.email}`}
                                className="hover:underline"
                              >
                                {contact.email}
                              </a>
                            </div>
                          )}
                          {contact.phone && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="h-4 w-4" />
                              <a 
                                href={`tel:${contact.phone}`}
                                className="hover:underline"
                              >
                                {contact.phone}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onEditContact(contact)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {onDeleteContact && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteContactId(contact.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteContactId} onOpenChange={() => setDeleteContactId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this contact? This action cannot be undone.
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
