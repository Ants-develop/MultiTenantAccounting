import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Pencil, Trash2, Mail, Phone, Building2, Calendar as CalendarIcon, DollarSign, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useDeal } from "@/hooks/useDeals";
import { useDealActivities } from "@/hooks/useDealActivities";
import { useDealContacts } from "@/hooks/useDealContacts";
import { useDealMutations } from "@/hooks/useDealMutations";
import { EditDealDialog } from "@/components/crm/EditDealDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { toast } from "sonner";

export default function DealDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: deal, isLoading: dealLoading } = useDeal(id);
  const { data: activities, isLoading: activitiesLoading } = useDealActivities(id);
  const { data: contacts, isLoading: contactsLoading } = useDealContacts(id);
  const { deleteDeal } = useDealMutations();

  const handleDelete = () => {
    if (!id) return;
    
    deleteDeal.mutate(id, {
      onSuccess: () => {
        toast.success("Deal deleted successfully");
        navigate("/crm");
      },
    });
  };

  const formatCurrency = (value: number | null | undefined, currency: string = 'USD') => {
    if (!value) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'won':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'lost':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'abandoned':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call':
        return Phone;
      case 'email':
        return Mail;
      case 'meeting':
        return CalendarIcon;
      default:
        return User;
    }
  };

  if (dealLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-muted-foreground">Deal not found</p>
        <Button onClick={() => navigate("/crm")}>Back to CRM</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb & Header */}
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/crm")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to CRM
        </Button>

        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">{deal.name}</h1>
            <div className="flex items-center gap-2">
              <Badge 
                style={{ 
                  backgroundColor: deal.deal_stages?.color || '#gray',
                  color: 'white'
                }}
              >
                {deal.deal_stages?.name}
              </Badge>
              <Badge className={getStatusColor(deal.status)}>
                {deal.status}
              </Badge>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content - Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Deal Details */}
          <Card>
            <CardHeader>
              <CardTitle>Deal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Value</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(deal.deal_value, deal.currency)}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Probability</p>
                  <p className="text-lg font-semibold">{deal.probability}%</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Expected Close Date</p>
                  <p className="text-lg">
                    {deal.expected_close_date 
                      ? format(new Date(deal.expected_close_date), 'MMM dd, yyyy')
                      : 'Not set'}
                  </p>
                </div>

                {deal.actual_close_date && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Actual Close Date</p>
                    <p className="text-lg">
                      {format(new Date(deal.actual_close_date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                )}
              </div>

              {deal.description && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Description</p>
                    <p className="text-sm">{deal.description}</p>
                  </div>
                </>
              )}

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                {deal.company_name && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{deal.company_name}</span>
                  </div>
                )}

                {deal.lead_source && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Lead Source</p>
                    <p className="text-sm">{deal.lead_source}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Activities */}
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {activitiesLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : activities && activities.length > 0 ? (
                <div className="space-y-4">
                  {activities.map((activity) => {
                    const Icon = getActivityIcon(activity.activity_type);
                    return (
                      <div key={activity.id} className="flex gap-3">
                        <div className="mt-1">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                            <Icon className="h-4 w-4" />
                          </div>
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{activity.subject}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(activity.created_at), 'MMM dd, yyyy')}
                            </p>
                          </div>
                          {activity.description && (
                            <p className="text-sm text-muted-foreground">{activity.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            by {activity.profiles?.full_name}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No activities yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Owner Info */}
          <Card>
            <CardHeader>
              <CardTitle>Deal Owner</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={deal.profiles?.avatar_url || undefined} />
                  <AvatarFallback>
                    {deal.profiles?.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{deal.profiles?.full_name}</p>
                  <p className="text-sm text-muted-foreground">Owner</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Primary Contact */}
          <Card>
            <CardHeader>
              <CardTitle>Primary Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <p className="font-medium">{deal.contact_name}</p>
              </div>
              {deal.contact_email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${deal.contact_email}`} className="hover:underline">
                    {deal.contact_email}
                  </a>
                </div>
              )}
              {deal.contact_phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${deal.contact_phone}`} className="hover:underline">
                    {deal.contact_phone}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional Contacts */}
          {contacts && contacts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Additional Contacts</CardTitle>
              </CardHeader>
              <CardContent>
                {contactsLoading ? (
                  <Skeleton className="h-20 w-full" />
                ) : (
                  <div className="space-y-3">
                    {contacts.map((contact) => (
                      <div key={contact.id} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{contact.name}</p>
                          {contact.is_primary && (
                            <Badge variant="secondary">Primary</Badge>
                          )}
                        </div>
                        {contact.role && (
                          <p className="text-sm text-muted-foreground">{contact.role}</p>
                        )}
                        {contact.email && (
                          <p className="text-sm">{contact.email}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <EditDealDialog
        deal={deal}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the deal "{deal.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
