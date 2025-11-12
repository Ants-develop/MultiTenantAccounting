import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Plus, Edit, Trash2, Users, Building2, Search, RefreshCw, Loader2,
  UserPlus, X
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Role } from "@shared/permissions";
import { ClientCompaniesGrid, ClientCompanyGridItem } from "@/components/admin/ClientCompaniesGrid";

interface CompanyUser {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive: boolean;
  lastLogin: string | null;
  joinedAt: string;
  assignmentId: number;
}

interface AvailableUser {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  globalRole: string;
  isActive: boolean;
}

const userAssignmentSchema = z.object({
  userId: z.number().min(1, "User is required"),
  companyId: z.number().min(1, "Client company is required"),
  role: z.string().min(1, "Role is required"),
});

type UserAssignmentForm = z.infer<typeof userAssignmentSchema>;

export default function Clients() {
  const [managingCompany, setManagingCompany] = useState<ClientCompanyGridItem | null>(null);
  const [isAssignUserDialogOpen, setIsAssignUserDialogOpen] = useState(false);
  const [isEditRoleDialogOpen, setIsEditRoleDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<CompanyUser | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Company users query
  const { data: companyUsers = [], isLoading: companyUsersLoading } = useQuery<CompanyUser[]>({
    queryKey: ['/api/global-admin/company-users', managingCompany?.id],
    queryFn: async () => {
      if (!managingCompany?.id) return [];
      const response = await fetch(`/api/global-admin/clients/${managingCompany.id}/users`, {
        credentials: 'include'
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch company users: ${errorText}`);
      }
      return response.json();
    },
    enabled: !!managingCompany?.id,
  });

  // Available users query (all global users for assignment)
  const { data: availableUsers = [] } = useQuery<AvailableUser[]>({
    queryKey: ['/api/global-admin/users'],
    queryFn: async () => {
      const response = await fetch('/api/global-admin/users', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      return response.json();
    },
  });

  const assignmentForm = useForm<UserAssignmentForm>({
    resolver: zodResolver(userAssignmentSchema),
    defaultValues: {
      userId: 0,
      companyId: 0,
      role: "",
    },
  });

  // Assign user to company mutation
  const assignUserMutation = useMutation({
    mutationFn: (data: UserAssignmentForm) => 
      apiRequest('POST', '/api/global-admin/assign-user', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/global-admin/company-users', managingCompany?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/global-admin/clients'] });
      toast({
        title: "User assigned",
        description: "The user has been successfully assigned to the company.",
      });
      assignmentForm.reset();
      setIsAssignUserDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign user",
        variant: "destructive",
      });
    },
  });

  // Update user role mutation
  const updateRoleMutation = useMutation({
    mutationFn: ({ assignmentId, role }: { assignmentId: number; role: string }) =>
      apiRequest('PUT', `/api/global-admin/user-assignments/${assignmentId}`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/global-admin/company-users', managingCompany?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/global-admin/clients'] });
      toast({
        title: "Role updated",
        description: "The user role has been successfully updated.",
      });
      setIsEditRoleDialogOpen(false);
      setEditingAssignment(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "destructive",
      });
    },
  });

  // Remove user from company mutation
  const removeUserMutation = useMutation({
    mutationFn: (assignmentId: number) =>
      apiRequest('DELETE', `/api/global-admin/user-assignments/${assignmentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/global-admin/company-users', managingCompany?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/global-admin/clients'] });
      toast({
        title: "User removed",
        description: "The user has been successfully removed from the company.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove user",
        variant: "destructive",
      });
    },
  });

  const handleManageCompanyUsers = (company: ClientCompanyGridItem) => {
    setManagingCompany(company);
    setIsAssignUserDialogOpen(true);
    assignmentForm.reset({
      userId: 0,
      companyId: company.id,
      role: "",
    });
  };

  const handleAssignUser = (data: UserAssignmentForm) => {
    assignUserMutation.mutate(data);
  };

  const handleEditRole = (user: CompanyUser) => {
    setEditingAssignment(user);
    setIsEditRoleDialogOpen(true);
  };

  const handleUpdateRole = (role: string) => {
    if (!editingAssignment) return;
    updateRoleMutation.mutate({ assignmentId: editingAssignment.assignmentId, role });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clients</h1>
          <p className="text-muted-foreground">
            Manage client companies and their user assignments
          </p>
        </div>
      </div>

      <ClientCompaniesGrid onManageUsers={handleManageCompanyUsers} />

      {/* Manage Company Users Dialog */}
      <Dialog open={isAssignUserDialogOpen} onOpenChange={setIsAssignUserDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Manage Users - {managingCompany?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Assign New User */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Assign User to Company</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={assignmentForm.handleSubmit(handleAssignUser)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>User</Label>
                      <Select
                        value={assignmentForm.watch("userId")?.toString() || ""}
                        onValueChange={(value) => assignmentForm.setValue("userId", parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a user" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableUsers
                            .filter(user => !companyUsers.some(cu => cu.id === user.id))
                            .map((user) => (
                              <SelectItem key={user.id} value={user.id.toString()}>
                                {user.firstName} {user.lastName} ({user.username})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select
                        value={assignmentForm.watch("role") || ""}
                        onValueChange={(value) => assignmentForm.setValue("role", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="accountant">Accountant</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAssignUserDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={assignUserMutation.isPending}
                    >
                      {assignUserMutation.isPending ? 'Assigning...' : 'Assign User'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Current Users */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Current Users ({companyUsers.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {companyUsersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : companyUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No users assigned to this company
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {companyUsers.map((user) => (
                        <TableRow key={user.assignmentId}>
                          <TableCell className="font-medium">
                            {user.firstName} {user.lastName}
                            <div className="text-sm text-muted-foreground">{user.username}</div>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{user.role}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.isActive ? "default" : "secondary"}>
                              {user.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(user.joinedAt)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditRole(user)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => {
                                  if (confirm(`Remove ${user.firstName} ${user.lastName} from this company?`)) {
                                    removeUserMutation.mutate(user.assignmentId);
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={isEditRoleDialogOpen} onOpenChange={setIsEditRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Role</DialogTitle>
          </DialogHeader>
          {editingAssignment && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  User: {editingAssignment.firstName} {editingAssignment.lastName}
                </p>
                <Label>Role</Label>
                <Select
                  value={editingAssignment.role}
                  onValueChange={handleUpdateRole}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="accountant">Accountant</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditRoleDialogOpen(false);
                    setEditingAssignment(null);
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

