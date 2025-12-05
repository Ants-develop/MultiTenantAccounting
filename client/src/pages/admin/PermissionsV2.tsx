import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, Users, Building2, Search, Save, X, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface User {
    id: number;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
}

interface Client {
    id: number;
    name: string;
    code: string;
}

interface Role {
    id: number;
    name: string;
    description: string;
    scope: string;
    isSystem: boolean;
}

interface UserClientRole {
    id: number;
    userId: number;
    clientId: number;
    roleId: number;
    isActive: boolean;
    user: { firstName: string; lastName: string; email: string };
    client: { name: string; code: string };
    role: { name: string; description: string };
}

interface Permission {
    resource: string;
    action: string;
    description?: string;
}

export default function PermissionsV2() {
    const [selectedUser, setSelectedUser] = useState<number | null>(null);
    const [selectedClient, setSelectedClient] = useState<number | null>(null);
    const [selectedRole, setSelectedRole] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);

    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Fetch data
    const { data: users = [] } = useQuery<User[]>({
        queryKey: ['/api/users'],
        queryFn: async () => {
            const res = await apiRequest('GET', '/api/users');
            return res.json();
        },
    });

    const { data: clients = [] } = useQuery<Client[]>({
        queryKey: ['/api/clients'],
        queryFn: async () => {
            const res = await apiRequest('GET', '/api/clients');
            return res.json();
        },
    });

    const { data: roles = [] } = useQuery<Role[]>({
        queryKey: ['/api/permissions/roles'],
        queryFn: async () => {
            const res = await apiRequest('GET', '/api/permissions/roles');
            return res.json();
        },
    });

    const { data: userClientRoles = [] } = useQuery<UserClientRole[]>({
        queryKey: ['/api/permissions/user-client-roles'],
        queryFn: async () => {
            const res = await apiRequest('GET', '/api/permissions/user-client-roles');
            return res.json();
        },
    });

    const { data: permissions = [] } = useQuery<Permission[]>({
        queryKey: ['/api/permissions/list'],
        queryFn: async () => {
            const res = await apiRequest('GET', '/api/permissions/list');
            return res.json();
        },
    });

    // Assign role mutation
    const assignRoleMutation = useMutation({
        mutationFn: async (data: { userId: number; clientId: number; roleId: number }) => {
            const res = await apiRequest('POST', '/api/permissions/assign-role', data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/permissions/user-client-roles'] });
            toast({ title: "Role assigned successfully" });
            setIsAssignDialogOpen(false);
            setSelectedUser(null);
            setSelectedClient(null);
            setSelectedRole(null);
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    // Revoke role mutation
    const revokeRoleMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await apiRequest('DELETE', `/api/permissions/user-client-roles/${id}`);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/permissions/user-client-roles'] });
            toast({ title: "Role revoked successfully" });
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const filteredUsers = users.filter(u => {
        const name = `${u.firstName} ${u.lastName}`.toLowerCase();
        const query = searchQuery.toLowerCase();
        return name.includes(query) || u.email.toLowerCase().includes(query);
    });

    const handleAssignRole = () => {
        if (!selectedUser || !selectedClient || !selectedRole) {
            toast({ title: "Error", description: "Please select user, client, and role", variant: "destructive" });
            return;
        }
        assignRoleMutation.mutate({
            userId: selectedUser!,
            clientId: selectedClient!,
            roleId: selectedRole!,
        });
    };

    // Group permissions by resource
    const permissionsByResource = permissions.reduce((acc, p) => {
        if (!acc[p.resource]) acc[p.resource] = [];
        acc[p.resource].push(p);
        return acc;
    }, {} as Record<string, Permission[]>);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Permission Management</h1>
                    <p className="text-muted-foreground">
                        Manage user roles and permissions using new authorization system
                    </p>
                </div>
                <Button onClick={() => setIsAssignDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Assign Role
                </Button>
            </div>

            <Tabs defaultValue="assignments" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="assignments">
                        <Users className="w-4 h-4 mr-2" />
                        User Assignments ({userClientRoles.length})
                    </TabsTrigger>
                    <TabsTrigger value="roles">
                        <Shield className="w-4 h-4 mr-2" />
                        Roles ({roles.length})
                    </TabsTrigger>
                    <TabsTrigger value="permissions">
                        <Building2 className="w-4 h-4 mr-2" />
                        Permissions ({permissions.length})
                    </TabsTrigger>
                </TabsList>

                {/* User Assignments Tab */}
                <TabsContent value="assignments">
                    <Card>
                        <CardHeader>
                            <CardTitle>User Role Assignments</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[600px]">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>User</TableHead>
                                            <TableHead>Client</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {userClientRoles.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                                    No role assignments found. Click "Assign Role" to add one.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            userClientRoles.map((assignment) => (
                                                <TableRow key={assignment.id}>
                                                    <TableCell>
                                                        <div>
                                                            <div className="font-medium">
                                                                {assignment.user.firstName} {assignment.user.lastName}
                                                            </div>
                                                            <div className="text-sm text-muted-foreground">
                                                                {assignment.user.email}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div>
                                                            <div className="font-medium">{assignment.client.name}</div>
                                                            <div className="text-sm text-muted-foreground">
                                                                {assignment.client.code}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="default">{assignment.role.name}</Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={assignment.isActive ? "default" : "secondary"}>
                                                            {assignment.isActive ? "Active" : "Inactive"}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                if (confirm('Revoke this role assignment?')) {
                                                                    revokeRoleMutation.mutate(assignment.id);
                                                                }
                                                            }}
                                                        >
                                                            <Trash2 className="w-4 h-4 text-destructive" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Roles Tab */}
                <TabsContent value="roles">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {roles.map((role) => (
                            <Card key={role.id}>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg">{role.name}</CardTitle>
                                        <div className="flex gap-2">
                                            <Badge variant={role.scope === 'global' ? 'destructive' : 'default'}>
                                                {role.scope}
                                            </Badge>
                                            {role.isSystem && (
                                                <Badge variant="secondary">System</Badge>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        {role.description || 'No description'}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {/* Permissions Tab */}
                <TabsContent value="permissions">
                    <Card>
                        <CardHeader>
                            <CardTitle>Permission Matrix</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[600px]">
                                <div className="space-y-6">
                                    {Object.entries(permissionsByResource).map(([resource, perms]) => (
                                        <div key={resource} className="border rounded-lg p-4">
                                            <h3 className="font-semibold text-lg mb-3 capitalize">
                                                {resource.replace('_', ' ')} Module
                                            </h3>
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                                {perms.map((perm) => (
                                                    <div
                                                        key={`${perm.resource}:${perm.action}`}
                                                        className="flex items-center p-2 bg-muted rounded text-sm"
                                                    >
                                                        <Badge variant="outline" className="mr-2">
                                                            {perm.action}
                                                        </Badge>
                                                        <span className="text-muted-foreground">
                                                            {perm.description || perm.action}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Assign Role Dialog */}
            <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Assign Role to User</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Search User</Label>
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

                        <div className="space-y-2">
                            <Label>User</Label>
                            <Select value={selectedUser?.toString() || ""} onValueChange={(v) => setSelectedUser(parseInt(v))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select user" />
                                </SelectTrigger>
                                <SelectContent>
                                    {filteredUsers.map((user) => (
                                        <SelectItem key={user.id} value={user.id.toString()}>
                                            {user.firstName} {user.lastName} ({user.email})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Client</Label>
                            <Select value={selectedClient?.toString() || ""} onValueChange={(v) => setSelectedClient(parseInt(v))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select client" />
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

                        <div className="space-y-2">
                            <Label>Role</Label>
                            <Select value={selectedRole?.toString() || ""} onValueChange={(v) => setSelectedRole(parseInt(v))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                    {roles.filter(r => r.scope === 'client').map((role) => (
                                        <SelectItem key={role.id} value={role.id.toString()}>
                                            {role.name} - {role.description}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                                <X className="w-4 h-4 mr-2" />
                                Cancel
                            </Button>
                            <Button onClick={handleAssignRole} disabled={assignRoleMutation.isPending}>
                                <Save className="w-4 h-4 mr-2" />
                                Assign Role
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
