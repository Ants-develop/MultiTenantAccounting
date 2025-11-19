import { Mail, Phone, User, Edit, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";

interface ContactCardProps {
  contact: {
    id: string;
    name: string;
    role: string | null;
    email: string | null;
    phone: string | null;
    is_primary: boolean;
    created_at: string;
  };
  onEdit: () => void;
  onDelete: () => void;
}

export const ContactCard = ({ contact, onEdit, onDelete }: ContactCardProps) => {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getInitials(contact.name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-foreground">{contact.name}</h4>
              {contact.is_primary && (
                <Badge variant="default" className="text-xs">
                  Primary
                </Badge>
              )}
            </div>

            <div className="space-y-1.5">
              {contact.role && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{contact.role}</span>
                </div>
              )}

              {contact.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <a
                    href={`mailto:${contact.email}`}
                    className="text-primary hover:underline truncate"
                  >
                    {contact.email}
                  </a>
                </div>
              )}

              {contact.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <a
                    href={`tel:${contact.phone}`}
                    className="text-primary hover:underline truncate"
                  >
                    {contact.phone}
                  </a>
                </div>
              )}

              <p className="text-xs text-muted-foreground mt-2">
                Added {format(new Date(contact.created_at), "MMM d, yyyy")}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-1 ml-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
            className="h-8 w-8"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="h-8 w-8 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
