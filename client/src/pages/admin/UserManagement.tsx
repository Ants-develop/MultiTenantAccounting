import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Edit, Trash2, UserPlus, Building, Shield, ChevronDown, ChevronRight, Info } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getRolePermissions, getRoleDescription, canAssignRole, type Role } from "@shared/permissions";
import { usePageActions } from "@/hooks/usePageActions";

interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdAt: string;
}

interface Company {
  id: number;
  name: string;
  code: string;
  address: string | null;
  email: string | null;
  isActive: boolean;
}

interface UserCompany {
  id: number;
  userId: number;
  companyId: number;
  role: string;
  isActive: boolean;
  user?: User;
  company?: Company;
}

const userSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

const companySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  code: z.string().min(2, "Company code is required"),
  address: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  taxId: z.string().optional(),
});

const userCompanySchema = z.object({
  userId: z.number().min(1, "User is required"),
  companyId: z.number().min(1, "Company is required"),
  role: z.string().min(1, "Role is required"),
});

type UserForm = z.infer<typeof userSchema>;
type CompanyForm = z.infer<typeof companySchema>;
type UserCompanyForm = z.infer<typeof userCompanySchema>;

const roles = [
  { 
    value: "administrator", 
    label: "Administrator", 
    description: "Full system access including user management, company creation, and all accounting operations across all companies." 
  },
  { 
    value: "manager", 
    label: "Manager", 
    description: "Complete accounting access plus company management. Can manage users within their company and modify company settings." 
  },
  { 
    value: "accountant", 
    label: "Accountant", 
    description: "Full accounting operations including journal entries, invoices, bills, and financial reporting. Cannot manage users or companies." 
  },
  { 
    value: "assistant", 
    label: "Assistant Accountant", 
    description: "Limited data entry and basic reporting access. Can create customers, vendors, and basic transactions but cannot modify system settings." 
  },
];

export default function UserManagement() {
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isCompanyDialogOpen, setIsCompanyDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isRoleDetailsOpen, setIsRoleDetailsOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const { user: currentUser, companies: userCompanies } = useAuth();
  const currentCompany = userCompanies?.[0] || null;
  const { toast } = useToast();
  const { currentRole, canViewUsers, canCreateUsers, canAssignRoles } = usePermissions();
  const queryClient = useQueryClient();
  const { registerTrigger } = usePageActions();

  // Register the action for this page
  useEffect(() => {
    registerTrigger('newUser', () => {
      setIsUserDialogOpen(true);
    });
  }, [registerTrigger]);

  // Check if current user can manage users
  const canManageUsers = canViewUsers();

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: canManageUsers,
  });

  const { data: companies, isLoading: companiesLoading } = useQuery<Company[]>({
    queryKey: ['/api/companies'],
    enabled: canManageUsers,
  });

  const { data: userCompanyAssignments, isLoading: assignmentsLoading } = useQuery<UserCompany[]>({
    queryKey: ['/api/user-companies'],
    enabled: canManageUsers,
  });

  const userForm = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      firstName: "",
      lastName: "",
    },
  });

  const companyForm = useForm<CompanyForm>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: "",
      code: "",
      address: "",
      email: "",
      phone: "",
      taxId: "",
    },
  });

  const assignForm = useForm<UserCompanyForm>({
    resolver: zodResolver(userCompanySchema),
    defaultValues: {
      userId: 0,
      companyId: 0,
      role: "",
    },
  });

  const createUserMutation = useMutation({
    mutationFn: (data: UserForm) => apiRequest('POST', '/api/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsUserDialogOpen(false);
      userForm.reset();
      toast({
        title: "User created",
        description: "The user has been successfully created.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  const createCompanyMutation = useMutation({
    mutationFn: (data: CompanyForm) => apiRequest('POST', '/api/companies', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      setIsCompanyDialogOpen(false);
      companyForm.reset();
      toast({
        title: "Company created",
        description: "The company has been successfully created.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create company",
        variant: "destructive",
      });
    },
  });

  const assignUserMutation = useMutation({
    mutationFn: (data: UserCompanyForm) => apiRequest('POST', '/api/user-companies', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-companies'] });
      setIsAssignDialogOpen(false);
      assignForm.reset();
      toast({
        title: "User assigned",
        description: "The user has been successfully assigned to the company.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign user",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: number) => apiRequest('DELETE', `/api/users/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "User deleted",
        description: "The user has been successfully deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: (companyId: number) => apiRequest('DELETE', `/api/companies/${companyId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      toast({
        title: "Company deleted",
        description: "The company has been successfully deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete company",
        variant: "destructive",
      });
    },
  });

  const onUserSubmit = (data: UserForm) => {
    createUserMutation.mutate(data);
  };

  const onCompanySubmit = (data: CompanyForm) => {
    createCompanyMutation.mutate(data);
  };

  const onAssignSubmit = (data: UserCompanyForm) => {
    assignUserMutation.mutate(data);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'administrator':
        return 'bg-red-100 text-red-800';
      case 'manager':
        return 'bg-green-100 text-green-800';
      case 'accountant':
        return 'bg-blue-100 text-blue-800';
      case 'assistant':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatRole = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    // Pre-fill the form with user data
    userForm.reset({
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      password: "", // Don't pre-fill password
    });
    setIsUserDialogOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    if (confirm(`Are you sure you want to delete user "${user.firstName} ${user.lastName}"?`)) {
      deleteUserMutation.mutate(user.id);
    }
  };

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company);
    // Pre-fill the form with company data
    companyForm.reset({
      name: company.name,
      code: company.code,
      email: company.email || "",
      address: company.address || "",
      phone: "",
      taxId: "",
    });
    setIsCompanyDialogOpen(true);
  };

  const handleDeleteCompany = (company: Company) => {
    if (confirm(`Are you sure you want to delete company "${company.name}"?`)) {
      deleteCompanyMutation.mutate(company.id);
    }
  };

  if (!canManageUsers) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">Access Denied</h3>
          <p className="text-muted-foreground">
            You don't have permission to access user management.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground">
            Manage users, companies, and access permissions
          </p>
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="companies">Companies</TabsTrigger>
          <TabsTrigger value="assignments">User Assignments</TabsTrigger>
          <TabsTrigger value="roles">Role Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <div className="flex justify-end">
            <Dialog 
              open={isUserDialogOpen} 
              onOpenChange={(open) => {
                setIsUserDialogOpen(open);
                if (!open) {
                  setEditingUser(null);
                  userForm.reset();
                }
              }}
            >
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingUser ? "Edit User" : "Create New User"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={userForm.handleSubmit(onUserSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        {...userForm.register("firstName")}
                        placeholder="John"
                      />
                      {userForm.formState.errors.firstName && (
                        <p className="text-sm text-destructive">
                          {userForm.formState.errors.firstName.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        {...userForm.register("lastName")}
                        placeholder="Doe"
                      />
                      {userForm.formState.errors.lastName && (
                        <p className="text-sm text-destructive">
                          {userForm.formState.errors.lastName.message}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      {...userForm.register("username")}
                      placeholder="johndoe"
                    />
                    {userForm.formState.errors.username && (
                      <p className="text-sm text-destructive">
                        {userForm.formState.errors.username.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      {...userForm.register("email")}
                      placeholder="john.doe@example.com"
                    />
                    {userForm.formState.errors.email && (
                      <p className="text-sm text-destructive">
                        {userForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      {...userForm.register("password")}
                      placeholder="••••••••"
                    />
                    {userForm.formState.errors.password && (
                      <p className="text-sm text-destructive">
                        {userForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsUserDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createUserMutation.isPending}>
                      {createUserMutation.isPending ? "Creating..." : "Create User"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Loading users...</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users && users.length > 0 ? (
                      users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.firstName} {user.lastName}
                          </TableCell>
                          <TableCell>{user.username}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant={user.isActive ? "default" : "secondary"}>
                              {user.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(user.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleEditUser(user)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-destructive"
                                onClick={() => handleDeleteUser(user)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No users found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="companies" className="space-y-6">
          <div className="flex justify-end">
            <Dialog 
              open={isCompanyDialogOpen} 
              onOpenChange={(open) => {
                setIsCompanyDialogOpen(open);
                if (!open) {
                  setEditingCompany(null);
                  companyForm.reset();
                }
              }}
            >
              <DialogTrigger asChild>
                <Button>
                  <Building className="w-4 h-4 mr-2" />
                  Add Company
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingCompany ? "Edit Company" : "Create New Company"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={companyForm.handleSubmit(onCompanySubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Company Name</Label>
                      <Input
                        id="companyName"
                        {...companyForm.register("name")}
                        placeholder="Acme Corporation"
                      />
                      {companyForm.formState.errors.name && (
                        <p className="text-sm text-destructive">
                          {companyForm.formState.errors.name.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companyCode">Company Code</Label>
                      <Input
                        id="companyCode"
                        {...companyForm.register("code")}
                        placeholder="ACME"
                      />
                      {companyForm.formState.errors.code && (
                        <p className="text-sm text-destructive">
                          {companyForm.formState.errors.code.message}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="companyEmail">Email</Label>
                    <Input
                      id="companyEmail"
                      type="email"
                      {...companyForm.register("email")}
                      placeholder="info@acme.com"
                    />
                    {companyForm.formState.errors.email && (
                      <p className="text-sm text-destructive">
                        {companyForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="companyAddress">Address</Label>
                    <Input
                      id="companyAddress"
                      {...companyForm.register("address")}
                      placeholder="123 Business St, City, State 12345"
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCompanyDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createCompanyMutation.isPending}>
                      {createCompanyMutation.isPending ? "Creating..." : "Create Company"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Companies</CardTitle>
            </CardHeader>
            <CardContent>
              {companiesLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Loading companies...</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies && companies.length > 0 ? (
                      companies.map((company) => (
                        <TableRow key={company.id}>
                          <TableCell className="font-medium">{company.name}</TableCell>
                          <TableCell className="font-mono">{company.code}</TableCell>
                          <TableCell>{company.email || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={company.isActive ? "default" : "secondary"}>
                              {company.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleEditCompany(company)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-destructive"
                                onClick={() => handleDeleteCompany(company)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No companies found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-6">
          <div className="flex justify-end">
            <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Assign User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign User to Company</DialogTitle>
                </DialogHeader>
                <form onSubmit={assignForm.handleSubmit(onAssignSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="userId">User</Label>
                    <Select
                      value={assignForm.watch("userId").toString()}
                      onValueChange={(value) => assignForm.setValue("userId", parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users?.map((user) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.firstName} {user.lastName} ({user.username})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {assignForm.formState.errors.userId && (
                      <p className="text-sm text-destructive">
                        {assignForm.formState.errors.userId.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="companyId">Company</Label>
                    <Select
                      value={assignForm.watch("companyId").toString()}
                      onValueChange={(value) => assignForm.setValue("companyId", parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select company" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies?.map((company) => (
                          <SelectItem key={company.id} value={company.id.toString()}>
                            {company.name} ({company.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {assignForm.formState.errors.companyId && (
                      <p className="text-sm text-destructive">
                        {assignForm.formState.errors.companyId.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={assignForm.watch("role")}
                      onValueChange={(value) => assignForm.setValue("role", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            <div>
                              <div className="font-medium">{role.label}</div>
                              <div className="text-sm text-muted-foreground">{role.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {assignForm.formState.errors.role && (
                      <p className="text-sm text-destructive">
                        {assignForm.formState.errors.role.message}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAssignDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={assignUserMutation.isPending}>
                      {assignUserMutation.isPending ? "Assigning..." : "Assign User"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>User Company Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              {assignmentsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Loading assignments...</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userCompanyAssignments && userCompanyAssignments.length > 0 ? (
                      userCompanyAssignments.map((assignment) => {
                        const user = users?.find(u => u.id === assignment.userId);
                        const company = companies?.find(c => c.id === assignment.companyId);
                        return (
                          <TableRow key={assignment.id}>
                            <TableCell>
                              {user ? `${user.firstName} ${user.lastName}` : 'Unknown User'}
                            </TableCell>
                            <TableCell>
                              {company ? company.name : 'Unknown Company'}
                            </TableCell>
                            <TableCell>
                              <Badge className={getRoleColor(assignment.role)}>
                                {formatRole(assignment.role)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={assignment.isActive ? "default" : "secondary"}>
                                {assignment.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => {
                                    toast({
                                      title: "Edit Assignment",
                                      description: "Edit functionality will be implemented here",
                                    });
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-destructive"
                                  onClick={() => {
                                    toast({
                                      title: "Delete Assignment", 
                                      description: "Delete functionality will be implemented here",
                                    });
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No user assignments found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Role Permissions & Access Levels</CardTitle>
              <p className="text-sm text-muted-foreground">
                Detailed breakdown of what each role can access and perform in the system
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                {roles.map((role) => {
                  const permissions = getRolePermissions(role.value as Role);
                  const isCurrentRole = currentRole === role.value;
                  
                  // Group permissions by module
                  const groupedPermissions = permissions.reduce((acc, perm) => {
                    if (!acc[perm.module]) {
                      acc[perm.module] = [];
                    }
                    acc[perm.module].push(perm);
                    return acc;
                  }, {} as Record<string, typeof permissions>);

                  return (
                    <Card key={role.value} className={`border-2 ${isCurrentRole ? 'border-primary' : 'border-border'}`}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Badge className={getRoleColor(role.value)}>
                              {role.label}
                            </Badge>
                            {isCurrentRole && (
                              <Badge variant="outline" className="text-xs">
                                Your Role
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {permissions.length} permissions
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          {getRoleDescription(role.value as Role)}
                        </p>
                      </CardHeader>
                      <CardContent>
                        <Collapsible>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" className="w-full justify-between p-0">
                              <span className="font-medium">View Detailed Permissions</span>
                              <ChevronDown className="w-4 h-4" />
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-4">
                            <div className="space-y-4">
                              {Object.entries(groupedPermissions).map(([module, modulePermissions]) => (
                                <div key={module} className="border rounded-lg p-4">
                                  <h4 className="font-medium text-sm mb-2 capitalize flex items-center">
                                    <div className="w-2 h-2 bg-primary rounded-full mr-2"></div>
                                    {module.replace('_', ' ')} Module
                                  </h4>
                                  <div className="grid gap-1">
                                    {modulePermissions.map((perm) => (
                                      <div key={`${perm.module}-${perm.action}`} className="flex items-center text-sm">
                                        <ChevronRight className="w-3 h-3 mr-2 text-muted-foreground" />
                                        <span className="text-muted-foreground">{perm.description}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="mt-8 p-4 bg-muted rounded-lg">
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div className="space-y-2">
                    <h4 className="font-medium">Role Assignment Rules</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Administrators can assign any role to any user</li>
                      <li>• Managers can assign Assistant and Accountant roles only</li>
                      <li>• Accountants and Assistants cannot assign roles</li>
                      <li>• Users can belong to multiple companies with different roles</li>
                      <li>• Role permissions are company-specific and enforced throughout the system</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
