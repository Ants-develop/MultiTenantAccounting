import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { clientManagementApi, ClientProfile as ClientProfileType } from "@/api/client-management";
import { useFlexLayout } from "@/hooks/useFlexLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Edit, Save, X, User, Building2, Mail, Phone, MapPin, Calendar, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ClientTasks } from "@/components/clients/ClientTasks";
import { ClientJobs } from "@/components/clients/ClientJobs";
import { ClientCalendar } from "@/components/clients/ClientCalendar";

const clientProfileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  taxId: z.string().optional(),
});

type ClientProfileFormValues = z.infer<typeof clientProfileSchema>;

interface ClientProfileProps {
  clientId: number;
  onClose?: () => void; // Optional callback for closing when in dialog mode
}

export const ClientProfile: React.FC<ClientProfileProps> = ({ clientId, onClose }) => {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const flexLayout = useFlexLayout();
  const [isEditing, setIsEditing] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["/api/clients", clientId, "profile"],
    queryFn: () => clientManagementApi.fetchClientProfile(clientId),
  });

  const updateMutation = useMutation({
    mutationFn: (updates: Partial<ClientProfileFormValues>) =>
      clientManagementApi.updateClientProfile(clientId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "profile"] });
      toast({
        title: "Profile updated",
        description: "Client profile has been updated successfully.",
      });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ClientProfileFormValues>({
    resolver: zodResolver(clientProfileSchema),
    defaultValues: profile?.client || {},
  });

  React.useEffect(() => {
    if (profile?.client) {
      reset(profile.client);
    }
  }, [profile, reset]);

  const onSubmit = (data: ClientProfileFormValues) => {
    updateMutation.mutate(data);
  };

  const handleBack = () => {
    if (onClose) {
      // If onClose is provided, we're in dialog mode
      onClose();
    } else {
      // Otherwise, navigate back to clients list
      if (flexLayout) {
        flexLayout.openTab("/clients", undefined, "Clients");
      } else {
        setLocation("/clients");
      }
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

  const getStatusColor = (isActive: boolean) => {
    return isActive
      ? "bg-green-500/10 text-green-500 border-green-500/20"
      : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">Client not found</p>
            <Button variant="outline" onClick={handleBack} className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Clients
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                {getInitials(profile.client.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold">{profile.client.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={getStatusColor(profile.client.isActive)}>
                  {profile.client.isActive ? "Active" : "Inactive"}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Code: {profile.client.code}
                </span>
              </div>
            </div>
          </div>
        </div>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditing(false);
                reset(profile.client);
              }}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSubmit(onSubmit)} disabled={updateMutation.isPending}>
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="team">Team & Services</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Client Information</CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Company Name</Label>
                      <Input id="name" {...register("name")} />
                      {errors.name && (
                        <p className="text-sm text-destructive">{errors.name.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="code">Code</Label>
                      <Input id="code" {...register("code")} />
                      {errors.code && (
                        <p className="text-sm text-destructive">{errors.code.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" {...register("email")} />
                      {errors.email && (
                        <p className="text-sm text-destructive">{errors.email.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" {...register("phone")} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Input id="address" {...register("address")} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="taxId">Tax ID</Label>
                      <Input id="taxId" {...register("taxId")} />
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Company Name</p>
                        <p className="font-medium">{profile.client.name}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Code</p>
                        <p className="font-medium">{profile.client.code}</p>
                      </div>
                    </div>

                    {profile.client.email && (
                      <div className="flex items-start gap-3">
                        <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="font-medium">{profile.client.email}</p>
                        </div>
                      </div>
                    )}

                    {profile.client.phone && (
                      <div className="flex items-start gap-3">
                        <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Phone</p>
                          <p className="font-medium">{profile.client.phone}</p>
                        </div>
                      </div>
                    )}

                    {profile.client.address && (
                      <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Address</p>
                          <p className="font-medium">{profile.client.address}</p>
                        </div>
                      </div>
                    )}

                    {profile.client.taxId && (
                      <div className="flex items-start gap-3">
                        <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Tax ID</p>
                          <p className="font-medium">{profile.client.taxId}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Client Since</p>
                        <p className="font-medium">
                          {profile.client.createdAt
                            ? new Date(profile.client.createdAt).toLocaleDateString()
                            : "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Additional Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile.client.currency && (
                  <div className="flex items-start gap-3">
                    <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Currency</p>
                      <p className="font-medium">{profile.client.currency}</p>
                    </div>
                  </div>
                )}

                {profile.client.fiscalYearStart && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Fiscal Year Start</p>
                      <p className="font-medium">
                        Month {profile.client.fiscalYearStart}
                      </p>
                    </div>
                  </div>
                )}

                {profile.client.manager && (
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Manager</p>
                      <p className="font-medium">{profile.client.manager}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks">
          <ClientTasks clientId={clientId} />
        </TabsContent>

        {/* Jobs Tab */}
        <TabsContent value="jobs">
          <ClientJobs clientId={clientId} />
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar">
          <ClientCalendar clientId={clientId} />
        </TabsContent>

        {/* Team & Services Tab */}
        <TabsContent value="team" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Team Assignments</CardTitle>
                <CardDescription>
                  {profile.teamAssignments.length} team member(s) assigned
                </CardDescription>
              </CardHeader>
              <CardContent>
                {profile.teamAssignments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No team members assigned</p>
                ) : (
                  <div className="space-y-3">
                    {profile.teamAssignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {getInitials(
                                `${assignment.user.firstName} ${assignment.user.lastName}`
                              )}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">
                              {assignment.user.firstName} {assignment.user.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {assignment.user.email}
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary">{assignment.role}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Service Packages</CardTitle>
                <CardDescription>
                  {profile.servicePackages.length} package(s) active
                </CardDescription>
              </CardHeader>
              <CardContent>
                {profile.servicePackages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No service packages assigned
                  </p>
                ) : (
                  <div className="space-y-3">
                    {profile.servicePackages.map((pkg) => (
                      <div
                        key={pkg.id}
                        className="p-3 rounded-lg border bg-card"
                      >
                        <p className="font-medium text-sm">{pkg.packageName}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(pkg.startDate).toLocaleDateString()} -{" "}
                          {pkg.endDate
                            ? new Date(pkg.endDate).toLocaleDateString()
                            : "Ongoing"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Document management coming soon. Upload and manage client documents here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
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
    </div>
  );
};
