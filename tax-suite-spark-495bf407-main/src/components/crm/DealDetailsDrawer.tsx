import { useState } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Deal, DealContact } from "@/types/crm";
import { useDeal } from "@/hooks/useDeals";
import { useDealActivities } from "@/hooks/useDealActivities";
import { useDealContacts } from "@/hooks/useDealContacts";
import { useDealMutations } from "@/hooks/useDealMutations";
import { ActivityTimeline } from "./ActivityTimeline";
import { ContactsList } from "./ContactsList";
import { AddActivityDialog } from "./AddActivityDialog";
import { AddContactDialog } from "./AddContactDialog";
import { EditContactDialog } from "./EditContactDialog";
import {
  X,
  DollarSign,
  Calendar,
  TrendingUp,
  Mail,
  Phone,
  Building,
  User,
  Edit,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

interface DealDetailsDrawerProps {
  dealId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (deal: Deal) => void;
}

export const DealDetailsDrawer = ({
  dealId,
  open,
  onOpenChange,
  onEdit,
}: DealDetailsDrawerProps) => {
  const { data: deal, isLoading } = useDeal(dealId || undefined);
  const { data: activities = [], isLoading: activitiesLoading } = useDealActivities(dealId || undefined);
  const { data: contacts = [], isLoading: contactsLoading } = useDealContacts(dealId || undefined);
  const { deleteDeal } = useDealMutations();
  const [activeTab, setActiveTab] = useState("overview");
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [editingContact, setEditingContact] = useState<DealContact | null>(null);

  const handleDelete = async () => {
    if (!dealId || !confirm("Are you sure you want to delete this deal?")) return;
    await deleteDeal.mutateAsync(dealId);
    onOpenChange(false);
  };

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[90vh]">
          <DrawerHeader className="border-b">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-muted-foreground">Loading...</span>
                  </div>
                ) : (
                  <>
                    <DrawerTitle className="text-2xl mb-2">{deal?.name}</DrawerTitle>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      {deal?.company_name && (
                        <div className="flex items-center gap-1">
                          <Building className="h-4 w-4" />
                          <span>{deal.company_name}</span>
                        </div>
                      )}
                      <Badge variant="secondary">{deal?.deal_stages?.name}</Badge>
                      <Badge
                        variant={
                          deal?.status === "won"
                            ? "default"
                            : deal?.status === "lost"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {deal?.status}
                      </Badge>
                    </div>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                {deal && (
                  <Button variant="outline" size="sm" onClick={() => onEdit(deal)}>
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleDelete} disabled={deleteDeal.isPending}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
                <DrawerClose asChild>
                  <Button variant="ghost" size="icon">
                    <X className="h-4 w-4" />
                  </Button>
                </DrawerClose>
              </div>
            </div>
          </DrawerHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="border-b px-6">
              <TabsList className="h-auto p-0 bg-transparent">
                <TabsTrigger value="overview" className="data-[state=active]:bg-transparent">Overview</TabsTrigger>
                <TabsTrigger value="activities" className="data-[state=active]:bg-transparent">Activities</TabsTrigger>
                <TabsTrigger value="contacts" className="data-[state=active]:bg-transparent">Contacts</TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-6">
                <TabsContent value="overview" className="mt-0 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <h3 className="font-semibold">Deal Value</h3>
                        </div>
                        <p className="text-2xl font-bold">
                          {deal?.deal_value ? `${deal.currency || "USD"} ${deal.deal_value.toLocaleString()}` : "Not specified"}
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <h3 className="font-semibold">Probability</h3>
                        </div>
                        <p className="text-2xl font-bold">{deal?.probability || 0}%</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <h3 className="font-semibold">Expected Close Date</h3>
                        </div>
                        <p className="text-lg">
                          {deal?.expected_close_date ? format(new Date(deal.expected_close_date), "MMM d, yyyy") : "Not set"}
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <h3 className="font-semibold">Owner</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={deal?.profiles?.avatar_url || undefined} />
                            <AvatarFallback>{deal?.profiles?.full_name?.[0]}</AvatarFallback>
                          </Avatar>
                          <span className="text-lg">{deal?.profiles?.full_name}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {deal?.description && (
                    <Card>
                      <CardContent className="pt-6">
                        <h3 className="font-semibold mb-2">Description</h3>
                        <p className="text-muted-foreground">{deal.description}</p>
                      </CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardContent className="pt-6">
                      <h3 className="font-semibold mb-3">Contact Information</h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{deal?.contact_name}</span>
                        </div>
                        {deal?.contact_email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <a href={`mailto:${deal.contact_email}`} className="text-primary hover:underline">
                              {deal.contact_email}
                            </a>
                          </div>
                        )}
                        {deal?.contact_phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <a href={`tel:${deal.contact_phone}`} className="text-primary hover:underline">
                              {deal.contact_phone}
                            </a>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {deal?.lead_source && (
                    <Card>
                      <CardContent className="pt-6">
                        <h3 className="font-semibold mb-2">Lead Source</h3>
                        <Badge variant="outline">{deal.lead_source}</Badge>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="activities" className="mt-0">
                  <ActivityTimeline
                    activities={activities}
                    isLoading={activitiesLoading}
                    onAddActivity={() => setShowAddActivity(true)}
                  />
                </TabsContent>

                <TabsContent value="contacts" className="mt-0">
                  <ContactsList
                    contacts={contacts}
                    isLoading={contactsLoading}
                    onAddContact={() => setShowAddContact(true)}
                    onEditContact={(contact) => setEditingContact(contact)}
                  />
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        </DrawerContent>
      </Drawer>

      <AddActivityDialog dealId={dealId || ""} open={showAddActivity} onOpenChange={setShowAddActivity} />
      <AddContactDialog dealId={dealId || ""} open={showAddContact} onOpenChange={setShowAddContact} />
      <EditContactDialog contact={editingContact} open={!!editingContact} onOpenChange={(open) => !open && setEditingContact(null)} />
    </>
  );
};
