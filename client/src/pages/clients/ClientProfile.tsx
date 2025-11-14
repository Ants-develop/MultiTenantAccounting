import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { clientManagementApi, ClientProfile as ClientProfileType } from "@/api/client-management";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Edit, Save, X, User, Building2, Mail, Phone, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

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
}

export const ClientProfile: React.FC<ClientProfileProps> = ({ clientId }) => {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
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

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">Client not found</p>
            <Button variant="outline" onClick={() => setLocation("/clients")} className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Clients
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setLocation("/clients")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Client Profile</h1>
        </div>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              setIsEditing(false);
              reset(profile.client);
            }}>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Company Name</Label>
                    <Input id="name" {...register("name")} />
                    {errors.name && (
                      <p className="text-sm text-red-500">{errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="code">Code</Label>
                    <Input id="code" {...register("code")} />
                    {errors.code && (
                      <p className="text-sm text-red-500">{errors.code.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" {...register("email")} />
                    {errors.email && (
                      <p className="text-sm text-red-500">{errors.email.message}</p>
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
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Company Name</p>
                      <p className="font-medium">{profile.client.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Code</p>
                      <p className="font-medium">{profile.client.code}</p>
                    </div>
                  </div>

                  {profile.client.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium">{profile.client.email}</p>
                      </div>
                    </div>
                  )}

                  {profile.client.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Phone</p>
                        <p className="font-medium">{profile.client.phone}</p>
                      </div>
                    </div>
                  )}

                  {profile.client.address && (
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Address</p>
                        <p className="font-medium">{profile.client.address}</p>
                      </div>
                    </div>
                  )}

                  {profile.client.taxId && (
                    <div>
                      <p className="text-sm text-gray-500">Tax ID</p>
                      <p className="font-medium">{profile.client.taxId}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Team Assignments */}
          <Card>
            <CardHeader>
              <CardTitle>Team Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              {profile.teamAssignments.length === 0 ? (
                <p className="text-sm text-gray-500">No team members assigned</p>
              ) : (
                <div className="space-y-2">
                  {profile.teamAssignments.map((assignment) => (
                    <div key={assignment.id} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                      <div>
                        <p className="font-medium text-sm">
                          {assignment.user.firstName} {assignment.user.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{assignment.user.email}</p>
                      </div>
                      <Badge variant="secondary">{assignment.role}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Service Packages */}
          <Card>
            <CardHeader>
              <CardTitle>Service Packages</CardTitle>
            </CardHeader>
            <CardContent>
              {profile.servicePackages.length === 0 ? (
                <p className="text-sm text-gray-500">No service packages assigned</p>
              ) : (
                <div className="space-y-2">
                  {profile.servicePackages.map((pkg) => (
                    <div key={pkg.id} className="p-2 rounded border">
                      <p className="font-medium text-sm">{pkg.packageName}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(pkg.startDate).toLocaleDateString()} -{" "}
                        {pkg.endDate ? new Date(pkg.endDate).toLocaleDateString() : "Ongoing"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

