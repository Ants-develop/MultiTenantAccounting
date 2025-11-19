import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Mail, Phone, Building2, Calendar, User, Send, Plus, Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SendPortalInvitationDialog } from "@/components/clients/SendPortalInvitationDialog";
import { AddContactDialog } from "@/components/clients/AddContactDialog";
import { EditContactDialog } from "@/components/clients/EditContactDialog";
import { DeleteContactDialog } from "@/components/clients/DeleteContactDialog";
import { ContactCard } from "@/components/clients/ContactCard";

const ClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInvitationDialog, setShowInvitationDialog] = useState(false);
  const [showAddContactDialog, setShowAddContactDialog] = useState(false);
  const [showEditContactDialog, setShowEditContactDialog] = useState(false);
  const [showDeleteContactDialog, setShowDeleteContactDialog] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);

  useEffect(() => {
    fetchClientData();
  }, [id]);

  const fetchClientData = async () => {
    setIsLoading(true);
    try {
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select(`
          *,
          assigned_owner:profiles!clients_assigned_owner_id_fkey(full_name),
          assigned_accountant:profiles!clients_assigned_accountant_id_fkey(full_name),
          assigned_reviewer:profiles!clients_assigned_reviewer_id_fkey(full_name)
        `)
        .eq("id", id)
        .maybeSingle();

      if (clientError) throw clientError;
      if (!clientData) {
        toast.error("Client not found");
        navigate("/clients");
        return;
      }

      setClient(clientData);

      const { data: contactsData, error: contactsError } = await supabase
        .from("client_contacts")
        .select("*")
        .eq("client_id", id)
        .order("is_primary", { ascending: false });

      if (contactsError) throw contactsError;
      setContacts(contactsData || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to load client data");
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getBusinessTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      individual: "Individual",
      sole_proprietor: "Sole Proprietor",
      partnership: "Partnership",
      llc: "LLC",
      s_corp: "S-Corp",
      c_corp: "C-Corp",
      nonprofit: "Nonprofit",
    };
    return labels[type] || type;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "inactive":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "archived":
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
      default:
        return "";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!client) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/clients")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                {getInitials(client.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold">{client.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={getStatusColor(client.status)}>
                  {client.status}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {getBusinessTypeLabel(client.business_type)}
                </span>
              </div>
            </div>
          </div>
        </div>
        <Button
          onClick={() => setShowInvitationDialog(true)}
          className="gap-2"
        >
          <Send className="h-4 w-4" />
          Send Portal Invitation
        </Button>
      </div>

      <SendPortalInvitationDialog
        open={showInvitationDialog}
        onOpenChange={setShowInvitationDialog}
        client={client}
        onSuccess={fetchClientData}
      />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Client Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {client.tax_id && (
                  <div className="flex items-start gap-3">
                    <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Tax ID</p>
                      <p className="font-medium">{client.tax_id}</p>
                    </div>
                  </div>
                )}

                {client.industry && (
                  <div className="flex items-start gap-3">
                    <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Industry</p>
                      <p className="font-medium">{client.industry}</p>
                    </div>
                  </div>
                )}

                {client.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{client.email}</p>
                    </div>
                  </div>
                )}

                {client.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{client.phone}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Client Since</p>
                    <p className="font-medium">
                      {new Date(client.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Assigned Team</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {client.assigned_owner && (
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Owner</p>
                      <p className="font-medium">{client.assigned_owner.full_name}</p>
                      {client.assigned_owner.email && (
                        <p className="text-sm text-muted-foreground">{client.assigned_owner.email}</p>
                      )}
                    </div>
                  </div>
                )}

                {client.assigned_accountant && (
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Accountant</p>
                      <p className="font-medium">{client.assigned_accountant.full_name}</p>
                      {client.assigned_accountant.email && (
                        <p className="text-sm text-muted-foreground">{client.assigned_accountant.email}</p>
                      )}
                    </div>
                  </div>
                )}

                {client.assigned_reviewer && (
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Reviewer</p>
                      <p className="font-medium">{client.assigned_reviewer.full_name}</p>
                      {client.assigned_reviewer.email && (
                        <p className="text-sm text-muted-foreground">{client.assigned_reviewer.email}</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {client.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">{client.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="contacts" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Contact List ({contacts.length})</CardTitle>
                  <CardDescription>
                    Manage contacts for this client
                  </CardDescription>
                </div>
                <Button onClick={() => setShowAddContactDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Contact
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {contacts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No contacts yet</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setShowAddContactDialog(true)}
                  >
                    Add First Contact
                  </Button>
                </div>
              ) : (
                contacts.map((contact) => (
                  <ContactCard
                    key={contact.id}
                    contact={contact}
                    onEdit={() => {
                      setSelectedContact(contact);
                      setShowEditContactDialog(true);
                    }}
                    onDelete={() => {
                      setSelectedContact(contact);
                      setShowDeleteContactDialog(true);
                    }}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Document management integrated. Upload documents from the Documents page.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardContent className="py-12">
              <p className="text-center text-muted-foreground">
                Activity timeline coming soon
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <SendPortalInvitationDialog
        open={showInvitationDialog}
        onOpenChange={setShowInvitationDialog}
        client={client}
      />

      <AddContactDialog
        open={showAddContactDialog}
        onOpenChange={setShowAddContactDialog}
        clientId={id!}
        onSuccess={fetchClientData}
      />

      <EditContactDialog
        open={showEditContactDialog}
        onOpenChange={setShowEditContactDialog}
        contact={selectedContact}
        onSuccess={fetchClientData}
      />

      <DeleteContactDialog
        open={showDeleteContactDialog}
        onOpenChange={setShowDeleteContactDialog}
        contact={selectedContact}
        onSuccess={fetchClientData}
      />
    </div>
  );
};

export default ClientDetail;
