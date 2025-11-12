import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Shield, Users, Building2, Search, Save, X, Eye, Plus, Edit, Trash2, ChevronDown, ChevronRight, Layers } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface User {
  id: number;
  name?: string;
  username?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isActive: boolean;
}

interface Client {
  id: number;
  name: string;
  code: string;
}

interface ModulePermission {
  id: number;
  userId: number;
  clientId: number;
  module: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

interface FeaturePermission {
  id: number;
  userId: number;
  clientId: number;
  module: string;
  feature: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

const MODULES = [
  { value: 'accounting', label: 'Accounting' },
  { value: 'audit', label: 'Audit' },
  { value: 'banking', label: 'Banking' },
  { value: 'reports', label: 'Reports' },
  { value: 'rs_integration', label: 'RS Integration' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'messenger', label: 'Messenger' },
] as const;

export default function PermissionsManagement() {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isFeatureDialogOpen, setIsFeatureDialogOpen] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Partial<ModulePermission> | null>(null);
  const [editingFeaturePermission, setEditingFeaturePermission] = useState<Partial<FeaturePermission> | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all users
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/users');
      return response.json();
    },
  });

  // Fetch all clients
  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/clients');
      return response.json();
    },
  });

  // Fetch permissions for selected user and client
  const { data: permissions = { modules: [], features: [] }, isLoading: permissionsLoading } = useQuery<{
    modules: ModulePermission[];
    features: FeaturePermission[];
  }>({
    queryKey: ['/api/permissions/user', selectedUserId, selectedClientId],
    queryFn: async () => {
      if (!selectedUserId || !selectedClientId) return { modules: [], features: [] };
      const response = await apiRequest('GET', `/api/permissions/user/${selectedUserId}/client/${selectedClientId}`);
      return response.json();
    },
    enabled: !!selectedUserId && !!selectedClientId,
  });

  // Save module permission mutation
  const savePermissionMutation = useMutation({
    mutationFn: async (data: {
      userId: number;
      clientId: number;
      module: string;
      canView: boolean;
      canCreate: boolean;
      canEdit: boolean;
      canDelete: boolean;
    }) => {
      const response = await apiRequest('POST', '/api/permissions/module', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/permissions/user', selectedUserId, selectedClientId] });
      toast({
        title: "Success",
        description: "Module permission saved successfully",
      });
      setIsEditDialogOpen(false);
      setEditingPermission(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save permission",
        variant: "destructive",
      });
    },
  });

  // Save feature permission mutation
  const saveFeaturePermissionMutation = useMutation({
    mutationFn: async (data: {
      userId: number;
      clientId: number;
      module: string;
      feature: string;
      canView: boolean;
      canCreate: boolean;
      canEdit: boolean;
      canDelete: boolean;
    }) => {
      const response = await apiRequest('POST', '/api/permissions/feature', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/permissions/user', selectedUserId, selectedClientId] });
      toast({
        title: "Success",
        description: "Feature permission saved successfully",
      });
      setIsFeatureDialogOpen(false);
      setEditingFeaturePermission(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save feature permission",
        variant: "destructive",
      });
    },
  });

  // Delete permission mutation
  const deletePermissionMutation = useMutation({
    mutationFn: async (permissionId: number) => {
      const response = await apiRequest('DELETE', `/api/permissions/${permissionId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/permissions/user', selectedUserId, selectedClientId] });
      toast({
        title: "Success",
        description: "Permission deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete permission",
        variant: "destructive",
      });
    },
  });

  const filteredUsers = users.filter(user => {
    const name = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || '';
    const email = user.email || '';
    const query = searchQuery.toLowerCase();
    return name.toLowerCase().includes(query) || email.toLowerCase().includes(query);
  });

  // Group features by module
  const featuresByModule = permissions.features.reduce((acc, feature) => {
    if (!acc[feature.module]) {
      acc[feature.module] = [];
    }
    acc[feature.module].push(feature);
    return acc;
  }, {} as Record<string, FeaturePermission[]>);

  const handleEditPermission = (module: string) => {
    const existing = permissions.modules.find(p => p.module === module);
    setEditingPermission({
      userId: selectedUserId!,
      clientId: selectedClientId!,
      module,
      canView: existing?.canView || false,
      canCreate: existing?.canCreate || false,
      canEdit: existing?.canEdit || false,
      canDelete: existing?.canDelete || false,
    });
    setIsEditDialogOpen(true);
  };

  const handleAddPermission = () => {
    setEditingPermission({
      userId: selectedUserId!,
      clientId: selectedClientId!,
      module: '',
      canView: false,
      canCreate: false,
      canEdit: false,
      canDelete: false,
    });
    setIsEditDialogOpen(true);
  };

  const handleAddFeaturePermission = (module: string) => {
    setEditingFeaturePermission({
      userId: selectedUserId!,
      clientId: selectedClientId!,
      module,
      feature: '',
      canView: false,
      canCreate: false,
      canEdit: false,
      canDelete: false,
    });
    setIsFeatureDialogOpen(true);
  };

  const handleEditFeaturePermission = (feature: FeaturePermission) => {
    setEditingFeaturePermission({
      ...feature,
    });
    setIsFeatureDialogOpen(true);
  };

  const toggleModule = (module: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(module)) {
      newExpanded.delete(module);
    } else {
      newExpanded.add(module);
    }
    setExpandedModules(newExpanded);
  };

  const handleSavePermission = () => {
    if (!editingPermission || !editingPermission.module) {
      toast({
        title: "Error",
        description: "Please select a module",
        variant: "destructive",
      });
      return;
    }
    savePermissionMutation.mutate(editingPermission as any);
  };

  const handleSaveFeaturePermission = () => {
    if (!editingFeaturePermission || !editingFeaturePermission.module || !editingFeaturePermission.feature) {
      toast({
        title: "Error",
        description: "Please select a module and feature",
        variant: "destructive",
      });
      return;
    }
    saveFeaturePermissionMutation.mutate(editingFeaturePermission as any);
  };

  const getPermissionBadge = (permission: ModulePermission) => {
    const actions = [];
    if (permission.canView) actions.push('View');
    if (permission.canCreate) actions.push('Create');
    if (permission.canEdit) actions.push('Edit');
    if (permission.canDelete) actions.push('Delete');
    return actions.length > 0 ? actions.join(', ') : 'No access';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Permissions Management</h1>
          <p className="text-muted-foreground">
            Manage user permissions per client and module
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select User and Client</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Search Users</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>User</Label>
              <Select
                value={selectedUserId?.toString() || ""}
                onValueChange={(value) => setSelectedUserId(value ? parseInt(value) : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {filteredUsers.map((user) => {
                    const name = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Unknown';
                    return (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {name} ({user.email})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Client</Label>
              <Select
                value={selectedClientId?.toString() || ""}
                onValueChange={(value) => setSelectedClientId(value ? parseInt(value) : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.name} ({client.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedUserId && selectedClientId && (
        <Tabs defaultValue="modules" className="space-y-4">
          <TabsList>
            <TabsTrigger value="modules">
              <Layers className="w-4 h-4 mr-2" />
              Module Permissions ({permissions.modules.length})
            </TabsTrigger>
            <TabsTrigger value="features">
              <Shield className="w-4 h-4 mr-2" />
              Feature Permissions ({permissions.features.length})
            </TabsTrigger>
            <TabsTrigger value="all">
              <Eye className="w-4 h-4 mr-2" />
              All Permissions ({permissions.modules.length + permissions.features.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="modules">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Module-Level Permissions</CardTitle>
                  <Button onClick={handleAddPermission} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Module Permission
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {permissionsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading permissions...</div>
                ) : permissions.modules.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No module permissions set. Click "Add Module Permission" to grant access.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Module</TableHead>
                        <TableHead>View</TableHead>
                        <TableHead>Create</TableHead>
                        <TableHead>Edit</TableHead>
                        <TableHead>Delete</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {permissions.modules.map((permission) => (
                        <TableRow key={permission.id}>
                          <TableCell className="font-medium">
                            {MODULES.find(m => m.value === permission.module)?.label || permission.module}
                          </TableCell>
                          <TableCell>
                            <Badge variant={permission.canView ? "default" : "secondary"}>
                              {permission.canView ? "Yes" : "No"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={permission.canCreate ? "default" : "secondary"}>
                              {permission.canCreate ? "Yes" : "No"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={permission.canEdit ? "default" : "secondary"}>
                              {permission.canEdit ? "Yes" : "No"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={permission.canDelete ? "default" : "secondary"}>
                              {permission.canDelete ? "Yes" : "No"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditPermission(permission.module)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (confirm('Are you sure you want to delete this permission?')) {
                                    deletePermissionMutation.mutate(permission.id);
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
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
          </TabsContent>

          <TabsContent value="features">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Feature-Level Permissions</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {permissionsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading permissions...</div>
                ) : permissions.features.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No feature permissions set.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(featuresByModule).map(([module, features]) => (
                      <Collapsible key={module} open={expandedModules.has(module)}>
                        <CollapsibleTrigger
                          onClick={() => toggleModule(module)}
                          className="flex items-center justify-between w-full p-3 rounded-lg border hover:bg-accent"
                        >
                          <div className="flex items-center gap-2">
                            {expandedModules.has(module) ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                            <span className="font-semibold">
                              {MODULES.find(m => m.value === module)?.label || module}
                            </span>
                            <Badge variant="secondary">{features.length} features</Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddFeaturePermission(module);
                            }}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Feature
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <Table className="mt-2">
                            <TableHeader>
                              <TableRow>
                                <TableHead>Feature</TableHead>
                                <TableHead>View</TableHead>
                                <TableHead>Create</TableHead>
                                <TableHead>Edit</TableHead>
                                <TableHead>Delete</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {features.map((feature) => (
                                <TableRow key={feature.id}>
                                  <TableCell className="font-medium">{feature.feature}</TableCell>
                                  <TableCell>
                                    <Badge variant={feature.canView ? "default" : "secondary"}>
                                      {feature.canView ? "Yes" : "No"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={feature.canCreate ? "default" : "secondary"}>
                                      {feature.canCreate ? "Yes" : "No"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={feature.canEdit ? "default" : "secondary"}>
                                      {feature.canEdit ? "Yes" : "No"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={feature.canDelete ? "default" : "secondary"}>
                                      {feature.canDelete ? "Yes" : "No"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEditFeaturePermission(feature)}
                                      >
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          if (confirm('Are you sure you want to delete this permission?')) {
                                            deletePermissionMutation.mutate(feature.id);
                                          }
                                        }}
                                      >
                                        <Trash2 className="w-4 h-4 text-destructive" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="all">
            <Card>
              <CardHeader>
                <CardTitle>All Permissions Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <div className="space-y-6">
                    {MODULES.map((module) => {
                      const modulePerm = permissions.modules.find(p => p.module === module.value);
                      const moduleFeatures = featuresByModule[module.value] || [];
                      const hasAnyPermission = !!modulePerm || moduleFeatures.length > 0;

                      if (!hasAnyPermission) return null;

                      return (
                        <div key={module.value} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-lg">{module.label}</h3>
                            {!modulePerm && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingPermission({
                                    userId: selectedUserId!,
                                    clientId: selectedClientId!,
                                    module: module.value,
                                    canView: false,
                                    canCreate: false,
                                    canEdit: false,
                                    canDelete: false,
                                  });
                                  setIsEditDialogOpen(true);
                                }}
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Module Permission
                              </Button>
                            )}
                          </div>

                          {modulePerm && (
                            <div className="bg-muted p-3 rounded">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">Module-Level Access</span>
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditPermission(modulePerm.module)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      if (confirm('Delete module permission?')) {
                                        deletePermissionMutation.mutate(modulePerm.id);
                                      }
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </div>
                              </div>
                              <div className="grid grid-cols-4 gap-2 text-sm">
                                <div>View: <Badge variant={modulePerm.canView ? "default" : "secondary"}>{modulePerm.canView ? "Yes" : "No"}</Badge></div>
                                <div>Create: <Badge variant={modulePerm.canCreate ? "default" : "secondary"}>{modulePerm.canCreate ? "Yes" : "No"}</Badge></div>
                                <div>Edit: <Badge variant={modulePerm.canEdit ? "default" : "secondary"}>{modulePerm.canEdit ? "Yes" : "No"}</Badge></div>
                                <div>Delete: <Badge variant={modulePerm.canDelete ? "default" : "secondary"}>{modulePerm.canDelete ? "Yes" : "No"}</Badge></div>
                              </div>
                            </div>
                          )}

                          {moduleFeatures.length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Feature-Level Permissions ({moduleFeatures.length})</span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAddFeaturePermission(module.value)}
                                >
                                  <Plus className="w-4 h-4 mr-2" />
                                  Add Feature
                                </Button>
                              </div>
                              <div className="space-y-1">
                                {moduleFeatures.map((feature) => (
                                  <div key={feature.id} className="flex items-center justify-between p-2 bg-background rounded border">
                                    <div className="flex-1">
                                      <span className="font-medium">{feature.feature}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                      <Badge variant={feature.canView ? "default" : "secondary"}>V</Badge>
                                      <Badge variant={feature.canCreate ? "default" : "secondary"}>C</Badge>
                                      <Badge variant={feature.canEdit ? "default" : "secondary"}>E</Badge>
                                      <Badge variant={feature.canDelete ? "default" : "secondary"}>D</Badge>
                                      <div className="flex gap-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleEditFeaturePermission(feature)}
                                        >
                                          <Edit className="w-3 h-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            if (confirm('Delete feature permission?')) {
                                              deletePermissionMutation.mutate(feature.id);
                                            }
                                          }}
                                        >
                                          <Trash2 className="w-3 h-3 text-destructive" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Edit Permission Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingPermission?.id ? 'Edit Permission' : 'Add Permission'}
            </DialogTitle>
          </DialogHeader>
          {editingPermission && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Module</Label>
                <Select
                  value={editingPermission.module || ""}
                  onValueChange={(value) => setEditingPermission({ ...editingPermission, module: value })}
                  disabled={!!editingPermission.id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a module" />
                  </SelectTrigger>
                  <SelectContent>
                    {MODULES.map((module) => (
                      <SelectItem key={module.value} value={module.value}>
                        {module.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label>Access Permissions</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="canView"
                      checked={editingPermission.canView || false}
                      onCheckedChange={(checked) =>
                        setEditingPermission({ ...editingPermission, canView: checked as boolean })
                      }
                    />
                    <Label htmlFor="canView" className="cursor-pointer">
                      View
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="canCreate"
                      checked={editingPermission.canCreate || false}
                      onCheckedChange={(checked) =>
                        setEditingPermission({ ...editingPermission, canCreate: checked as boolean })
                      }
                    />
                    <Label htmlFor="canCreate" className="cursor-pointer">
                      Create
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="canEdit"
                      checked={editingPermission.canEdit || false}
                      onCheckedChange={(checked) =>
                        setEditingPermission({ ...editingPermission, canEdit: checked as boolean })
                      }
                    />
                    <Label htmlFor="canEdit" className="cursor-pointer">
                      Edit
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="canDelete"
                      checked={editingPermission.canDelete || false}
                      onCheckedChange={(checked) =>
                        setEditingPermission({ ...editingPermission, canDelete: checked as boolean })
                      }
                    />
                    <Label htmlFor="canDelete" className="cursor-pointer">
                      Delete
                    </Label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditingPermission(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSavePermission}
                  disabled={savePermissionMutation.isPending}
                >
                  {savePermissionMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Feature Permission Dialog */}
      <Dialog open={isFeatureDialogOpen} onOpenChange={setIsFeatureDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingFeaturePermission?.id ? 'Edit Feature Permission' : 'Add Feature Permission'}
            </DialogTitle>
          </DialogHeader>
          {editingFeaturePermission && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Module</Label>
                <Select
                  value={editingFeaturePermission.module || ""}
                  onValueChange={(value) => setEditingFeaturePermission({ ...editingFeaturePermission, module: value })}
                  disabled={!!editingFeaturePermission.id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a module" />
                  </SelectTrigger>
                  <SelectContent>
                    {MODULES.map((module) => (
                      <SelectItem key={module.value} value={module.value}>
                        {module.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Feature Name</Label>
                <Input
                  placeholder="e.g., invoices, journal_entries, accounts"
                  value={editingFeaturePermission.feature || ""}
                  onChange={(e) => setEditingFeaturePermission({ ...editingFeaturePermission, feature: e.target.value })}
                  disabled={!!editingFeaturePermission.id}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the feature name (e.g., invoices, bills, journal_entries, accounts, bank_accounts)
                </p>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label>Access Permissions</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="featureCanView"
                      checked={editingFeaturePermission.canView || false}
                      onCheckedChange={(checked) =>
                        setEditingFeaturePermission({ ...editingFeaturePermission, canView: checked as boolean })
                      }
                    />
                    <Label htmlFor="featureCanView" className="cursor-pointer">
                      View
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="featureCanCreate"
                      checked={editingFeaturePermission.canCreate || false}
                      onCheckedChange={(checked) =>
                        setEditingFeaturePermission({ ...editingFeaturePermission, canCreate: checked as boolean })
                      }
                    />
                    <Label htmlFor="featureCanCreate" className="cursor-pointer">
                      Create
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="featureCanEdit"
                      checked={editingFeaturePermission.canEdit || false}
                      onCheckedChange={(checked) =>
                        setEditingFeaturePermission({ ...editingFeaturePermission, canEdit: checked as boolean })
                      }
                    />
                    <Label htmlFor="featureCanEdit" className="cursor-pointer">
                      Edit
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="featureCanDelete"
                      checked={editingFeaturePermission.canDelete || false}
                      onCheckedChange={(checked) =>
                        setEditingFeaturePermission({ ...editingFeaturePermission, canDelete: checked as boolean })
                      }
                    />
                    <Label htmlFor="featureCanDelete" className="cursor-pointer">
                      Delete
                    </Label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsFeatureDialogOpen(false);
                    setEditingFeaturePermission(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveFeaturePermission}
                  disabled={saveFeaturePermissionMutation.isPending}
                >
                  {saveFeaturePermissionMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

