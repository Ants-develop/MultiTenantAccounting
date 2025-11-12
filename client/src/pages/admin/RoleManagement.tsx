import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Plus, Edit, Save, X, Shield, Users, Settings, Eye } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Role, 
  GlobalRole, 
  PERMISSIONS, 
  GLOBAL_PERMISSIONS,
  ROLE_PERMISSIONS, 
  GLOBAL_ROLE_PERMISSIONS,
  getAllPermissions,
  getRoleDescription,
  hasPermission,
  hasGlobalPermission
} from "@shared/permissions";

interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  type: 'company' | 'global';
  isSystem: boolean;
}

interface UserRole {
  id: number;
  userId: number;
  companyId?: number;
  role: Role;
  globalRole?: GlobalRole;
  userName: string;
  companyName?: string;
}

const roleFormSchema = z.object({
  name: z.string().min(1, "Role name is required"),
  description: z.string().min(1, "Description is required"),
  permissions: z.array(z.string()),
});

type RoleForm = z.infer<typeof roleFormSchema>;

export default function RoleManagement() {
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isEditingRole, setIsEditingRole] = useState<RoleDefinition | null>(null);
  const [selectedTab, setSelectedTab] = useState("company-roles");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: roles = [], isLoading: rolesLoading } = useQuery<RoleDefinition[]>({
    queryKey: ['/api/roles'],
    queryFn: async () => {
      // For now, return system-defined roles
      // In a real implementation, this would fetch custom roles from the database
      const companyRoles: RoleDefinition[] = Object.entries(ROLE_PERMISSIONS).map(([roleKey, permissions]) => ({
        id: roleKey,
        name: roleKey.charAt(0).toUpperCase() + roleKey.slice(1),
        description: getRoleDescription(roleKey as Role),
        permissions,
        type: 'company',
        isSystem: true,
      }));

      const globalRoles: RoleDefinition[] = Object.entries(GLOBAL_ROLE_PERMISSIONS).map(([roleKey, permissions]) => ({
        id: roleKey,
        name: roleKey.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: roleKey === 'global_administrator' ? 'Complete system access across all companies' : 'Standard user access',
        permissions,
        type: 'global',
        isSystem: true,
      }));

      return [...companyRoles, ...globalRoles];
    },
  });

  const { data: userRoles = [], isLoading: userRolesLoading } = useQuery<UserRole[]>({
    queryKey: ['/api/user-roles'],
    queryFn: async () => {
      // This would fetch actual user role assignments
      // For now, return empty array - would be implemented with real data
      return [];
    },
  });

  // Form handling
  const form = useForm<RoleForm>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: "",
      description: "",
      permissions: [],
    },
  });

  // Mutations for custom roles (if implementing custom roles)
  const createRoleMutation = useMutation({
    mutationFn: (data: RoleForm) => apiRequest('POST', '/api/roles', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/roles'] });
      setIsRoleDialogOpen(false);
      form.reset();
      toast({
        title: "Role created",
        description: "The custom role has been successfully created.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create role",
        variant: "destructive",
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: RoleForm }) => 
      apiRequest('PUT', `/api/roles/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/roles'] });
      setIsEditingRole(null);
      setIsRoleDialogOpen(false);
      form.reset();
      toast({
        title: "Role updated",
        description: "The role has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const getPermissionsByModule = (permissions: typeof PERMISSIONS | typeof GLOBAL_PERMISSIONS) => {
    const grouped: Record<string, Array<{key: string, permission: any}>> = {};
    
    Object.entries(permissions).forEach(([key, permission]) => {
      if (!grouped[permission.module]) {
        grouped[permission.module] = [];
      }
      grouped[permission.module].push({ key, permission });
    });
    
    return grouped;
  };

  const handleEditRole = (role: RoleDefinition) => {
    setIsEditingRole(role);
    form.setValue("name", role.name);
    form.setValue("description", role.description);
    form.setValue("permissions", role.permissions);
    setIsRoleDialogOpen(true);
  };

  const handleCreateRole = () => {
    setIsEditingRole(null);
    form.reset();
    setIsRoleDialogOpen(true);
  };

  const onSubmit = (data: RoleForm) => {
    if (isEditingRole) {
      updateRoleMutation.mutate({ id: isEditingRole.id, data });
    } else {
      createRoleMutation.mutate(data);
    }
  };

  const getRoleTypeIcon = (type: string) => {
    return type === 'global' ? <Shield className="w-4 h-4" /> : <Users className="w-4 h-4" />;
  };

  const getRoleTypeBadge = (type: string) => {
    return type === 'global' ? 
      <Badge variant="destructive">Global</Badge> : 
      <Badge variant="default">Company</Badge>;
  };

  // Permission management component
  const PermissionManager = ({ 
    roleType, 
    selectedPermissions, 
    onPermissionChange 
  }: { 
    roleType: 'company' | 'global';
    selectedPermissions: string[];
    onPermissionChange: (permissions: string[]) => void;
  }) => {
    const permissions = roleType === 'company' ? PERMISSIONS : GLOBAL_PERMISSIONS;
    const groupedPermissions = getPermissionsByModule(permissions);

    const handlePermissionToggle = (permissionKey: string, checked: boolean) => {
      if (checked) {
        onPermissionChange([...selectedPermissions, permissionKey]);
      } else {
        onPermissionChange(selectedPermissions.filter(p => p !== permissionKey));
      }
    };

    const handleModuleToggle = (modulePermissions: Array<{key: string}>, checked: boolean) => {
      const moduleKeys = modulePermissions.map(p => p.key);
      if (checked) {
        const newPermissions = Array.from(new Set([...selectedPermissions, ...moduleKeys]));
        onPermissionChange(newPermissions);
      } else {
        onPermissionChange(selectedPermissions.filter(p => !moduleKeys.includes(p)));
      }
    };

    return (
      <ScrollArea className="h-96">
        <div className="space-y-6">
          {Object.entries(groupedPermissions).map(([module, modulePermissions]) => {
            const allSelected = modulePermissions.every(p => selectedPermissions.includes(p.key));
            const someSelected = modulePermissions.some(p => selectedPermissions.includes(p.key));

            return (
              <div key={module} className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id={`module-${module}`}
                    checked={allSelected}
                    onCheckedChange={(checked) =>
                      handleModuleToggle(modulePermissions, checked as boolean)
                    }
                  />
                  <Label 
                    htmlFor={`module-${module}`} 
                    className="text-sm font-semibold capitalize cursor-pointer"
                  >
                    {module.replace('_', ' ')}
                  </Label>
                </div>
                
                <div className="ml-6 space-y-2">
                  {modulePermissions.map(({ key, permission }) => (
                    <div key={key} className="flex items-center space-x-3">
                      <Checkbox
                        id={key}
                        checked={selectedPermissions.includes(key)}
                        onCheckedChange={(checked) => 
                          handlePermissionToggle(key, checked as boolean)
                        }
                      />
                      <div className="flex-1">
                        <Label htmlFor={key} className="text-sm cursor-pointer">
                          {permission.description}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {module}.{permission.action}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <Separator />
              </div>
            );
          })}
        </div>
      </ScrollArea>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Role Management</h1>
          <p className="text-muted-foreground">
            Manage user roles and permissions across the system
          </p>
        </div>
        <Button onClick={handleCreateRole}>
          <Plus className="w-4 h-4 mr-2" />
          Create Custom Role
        </Button>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="company-roles">Company Roles</TabsTrigger>
          <TabsTrigger value="global-roles">Global Roles</TabsTrigger>
          <TabsTrigger value="user-assignments">User Assignments</TabsTrigger>
          <TabsTrigger value="permissions">Permission Matrix</TabsTrigger>
        </TabsList>

        <TabsContent value="company-roles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Company-Level Roles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {roles
                  .filter(role => role.type === 'company')
                  .map((role) => (
                    <Card key={role.id} className="relative">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{role.name}</CardTitle>
                          <div className="flex items-center space-x-2">
                            {getRoleTypeBadge(role.type)}
                            {!role.isSystem && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditRole(role)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-3">
                          {role.description}
                        </p>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Permissions:</span>
                            <Badge variant="outline">
                              {role.permissions.length}
                            </Badge>
                          </div>
                          {role.isSystem && (
                            <Badge variant="secondary" className="text-xs">
                              System Role
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="global-roles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Global System Roles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {roles
                  .filter(role => role.type === 'global')
                  .map((role) => (
                    <Card key={role.id} className="relative">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{role.name}</CardTitle>
                          {getRoleTypeBadge(role.type)}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-3">
                          {role.description}
                        </p>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Global Permissions:</span>
                            <Badge variant="outline">
                              {role.permissions.length}
                            </Badge>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            System Role
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="user-assignments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Role Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Company Role</TableHead>
                    <TableHead>Global Role</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userRoles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No user role assignments found
                      </TableCell>
                    </TableRow>
                  ) : (
                    userRoles.map((userRole) => (
                      <TableRow key={userRole.id}>
                        <TableCell>{userRole.userName}</TableCell>
                        <TableCell>{userRole.companyName || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="default">
                            {userRole.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {userRole.globalRole && (
                            <Badge variant="destructive">
                              {userRole.globalRole}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Permission Matrix</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="company-permissions">
                <TabsList>
                  <TabsTrigger value="company-permissions">Company Permissions</TabsTrigger>
                  <TabsTrigger value="global-permissions">Global Permissions</TabsTrigger>
                </TabsList>
                
                <TabsContent value="company-permissions">
                  <div className="space-y-4">
                    {Object.entries(getPermissionsByModule(PERMISSIONS)).map(([module, permissions]) => (
                      <Card key={module}>
                        <CardHeader>
                          <CardTitle className="text-base capitalize">
                            {module.replace('_', ' ')} Permissions
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Permission</TableHead>
                                <TableHead>Assistant</TableHead>
                                <TableHead>Accountant</TableHead>
                                <TableHead>Manager</TableHead>
                                <TableHead>Administrator</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {permissions.map(({ key, permission }) => (
                                <TableRow key={key}>
                                  <TableCell>
                                    <div>
                                      <div className="font-medium">{permission.description}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {module}.{permission.action}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {hasPermission('assistant', key as keyof typeof PERMISSIONS) ? (
                                      <Badge variant="default" className="bg-green-100 text-green-800">
                                        ✓
                                      </Badge>
                                    ) : (
                                      <Badge variant="secondary">-</Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {hasPermission('accountant', key as keyof typeof PERMISSIONS) ? (
                                      <Badge variant="default" className="bg-green-100 text-green-800">
                                        ✓
                                      </Badge>
                                    ) : (
                                      <Badge variant="secondary">-</Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {hasPermission('manager', key as keyof typeof PERMISSIONS) ? (
                                      <Badge variant="default" className="bg-green-100 text-green-800">
                                        ✓
                                      </Badge>
                                    ) : (
                                      <Badge variant="secondary">-</Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {hasPermission('administrator', key as keyof typeof PERMISSIONS) ? (
                                      <Badge variant="default" className="bg-green-100 text-green-800">
                                        ✓
                                      </Badge>
                                    ) : (
                                      <Badge variant="secondary">-</Badge>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="global-permissions">
                  <Card>
                    <CardHeader>
                      <CardTitle>Global System Permissions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Permission</TableHead>
                            <TableHead>Global Administrator</TableHead>
                            <TableHead>User</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(GLOBAL_PERMISSIONS).map(([key, permission]) => (
                            <TableRow key={key}>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{permission.description}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {permission.module}.{permission.action}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {hasGlobalPermission('global_administrator', key as keyof typeof GLOBAL_PERMISSIONS) ? (
                                  <Badge variant="default" className="bg-green-100 text-green-800">
                                    ✓
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">-</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {hasGlobalPermission('user', key as keyof typeof GLOBAL_PERMISSIONS) ? (
                                  <Badge variant="default" className="bg-green-100 text-green-800">
                                    ✓
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">-</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Role Creation/Edit Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {isEditingRole ? `Edit Role: ${isEditingRole.name}` : 'Create Custom Role'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Role Name</Label>
                <Input
                  id="name"
                  {...form.register("name")}
                  placeholder="Enter role name"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label>Role Type</Label>
                <div className="flex space-x-4">
                  <Badge variant="default">Company Role</Badge>
                  <Badge variant="outline">Custom</Badge>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...form.register("description")}
                placeholder="Describe what this role can do"
                rows={3}
              />
              {form.formState.errors.description && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.description.message}
                </p>
              )}
            </div>

            <div className="space-y-4">
              <Label>Permissions</Label>
              <PermissionManager
                roleType="company"
                selectedPermissions={form.watch("permissions") || []}
                onPermissionChange={(permissions) => form.setValue("permissions", permissions)}
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsRoleDialogOpen(false)}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button type="submit">
                <Save className="w-4 h-4 mr-2" />
                {isEditingRole ? 'Update Role' : 'Create Role'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 