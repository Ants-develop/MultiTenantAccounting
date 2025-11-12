import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useTranslation } from "react-i18next";
import { 
  Plus, Edit, Trash2, Save, X, Shield, Building2, Users, Database,
  Activity, BarChart3, Settings, Globe, UserPlus, Building, Eye,
  Download, Upload, RefreshCw, AlertTriangle, CheckCircle, XCircle,
  Calendar, Clock, TrendingUp, HardDrive
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Role, GlobalRole } from "@shared/permissions";
import { ClientCompaniesGrid } from "@/components/admin/ClientCompaniesGrid";

interface ClientCompanyUserPreview {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
}

interface ClientCompany {
  id: number;
  name: string;
  code: string;
  address: string | null;
  tenantCode: number | null;
  isActive: boolean;
  createdAt: string;
  userCount: number;
  users?: ClientCompanyUserPreview[];
  lastActivity: string | null;
}

interface GlobalUser {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  globalRole: GlobalRole;
  isActive: boolean;
  createdAt: string;
  lastLogin: string | null;
  companiesCount: number;
}

interface SystemStats {
  totalCompanies: number;
  activeCompanies: number;
  totalUsers: number;
  activeUsers: number;
  totalTransactions: number;
  storageUsed: string;
  systemUptime: string;
  lastBackup: string | null;
}

interface ActivityLog {
  id: number;
  userId: number;
  userName: string;
  action: string;
  resource: string;
  details: string | null;
  timestamp: string;
  ipAddress: string | null;
}

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
  assignmentId: number; // ID of the user-company assignment
}

interface UserAssignment {
  id: number;
  userId: number;
  companyId: number;
  role: string;
  isActive: boolean;
}

interface AvailableUser {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  globalRole: GlobalRole;
  isActive: boolean;
}

const clientCompanySchema = z.object({
  name: z.string().min(1, "Client company name is required"),
  code: z.string().min(1, "Client company code is required").max(11, "Code must be 11 characters or less"),
  description: z.string().optional(),
  tenantCode: z.string()
    .optional()
    .refine((val) => {
      if (!val || val.trim() === '') return true;
      return /^\d+$/.test(val.trim());
    }, {
      message: "Tenant code must be a valid integer (numbers only)"
    }),
});

const globalUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
  globalRole: z.enum(['global_administrator', 'user']),
});

const userAssignmentSchema = z.object({
  userId: z.number().min(1, "User is required"),
  companyId: z.number().min(1, "Client company is required"),
  role: z.string().min(1, "Role is required"),
});

type ClientCompanyForm = z.infer<typeof clientCompanySchema>;
type GlobalUserForm = z.infer<typeof globalUserSchema>;
type UserAssignmentForm = z.infer<typeof userAssignmentSchema>;

export default function GlobalAdministration() {
  const [activeTab, setActiveTab] = useState("overview");
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isCompanyUsersDialogOpen, setIsCompanyUsersDialogOpen] = useState(false);
  const [isAssignUserDialogOpen, setIsAssignUserDialogOpen] = useState(false);
  const [isEditRoleDialogOpen, setIsEditRoleDialogOpen] = useState(false);
  const { t } = useTranslation();
  const [editingUser, setEditingUser] = useState<GlobalUser | null>(null);
  const [managingCompany, setManagingCompany] = useState<ClientCompany | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<UserAssignment | null>(null);

  const { user } = useAuth();
  
  // Check if user is global administrator
  const isGlobalAdmin = user?.globalRole === 'global_administrator';
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: systemStats, isLoading: statsLoading } = useQuery<SystemStats>({
    queryKey: ['/api/global-admin/stats'],
    queryFn: async () => {
      const response = await fetch('/api/global-admin/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch system stats');
      }
      return response.json();
    },
  });

  const { data: companiesData = [], isLoading: companiesLoading } = useQuery<ClientCompany[]>({
    queryKey: ['/api/global-admin/clients'],
    queryFn: async () => {
      const response = await fetch('/api/global-admin/clients');
      if (!response.ok) {
        throw new Error('Failed to fetch companies');
      }
      return response.json();
    },
  });

  // Ensure companies is always an array
  const companies = Array.isArray(companiesData) ? companiesData : [];

  const { data: globalUsers = [], isLoading: usersLoading } = useQuery<GlobalUser[]>({
    queryKey: ['/api/global-admin/users'],
    queryFn: async () => {
      const response = await fetch('/api/global-admin/users');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      return response.json();
    },
  });

  // Activity logs state
  const [activityFilters, setActivityFilters] = useState({
    page: 1,
    limit: 50,
    action: 'all',
    resource: 'all',
    userId: 'all',
    startDate: '',
    endDate: '',
    search: ''
  });

  const { data: activityData, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ['/api/activity-logs', activityFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(activityFilters).forEach(([key, value]) => {
        // Don't include "all" values or empty strings in the API request
        if (value && value !== 'all') {
          params.append(key, value.toString());
        }
      });
      
      const response = await fetch(`/api/activity-logs?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch activity logs');
      }
      return response.json();
    },
  });

  const { data: activityFiltersData } = useQuery({
    queryKey: ['/api/activity-logs/filters'],
    queryFn: async () => {
      const response = await fetch('/api/activity-logs/filters');
      if (!response.ok) {
        throw new Error('Failed to fetch filter options');
      }
      return response.json();
    },
  });

  const { data: activitySummary } = useQuery({
    queryKey: ['/api/activity-logs/summary'],
    queryFn: async () => {
      const response = await fetch('/api/activity-logs/summary?days=7');
      if (!response.ok) {
        throw new Error('Failed to fetch activity summary');
      }
      return response.json();
    },
  });

  // Company users query
  const { data: companyUsers = [], isLoading: companyUsersLoading, refetch: refetchCompanyUsers } = useQuery<CompanyUser[]>({
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

  // Form handling
  const userForm = useForm<GlobalUserForm>({
    resolver: zodResolver(globalUserSchema),
    defaultValues: {
      username: "",
      email: "",
      firstName: "",
      lastName: "",
      password: "",
      globalRole: "user",
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

  // Mutations
  // Note: Company mutations removed - ClientCompaniesGrid handles CRUD independently

  const createGlobalUserMutation = useMutation({
    mutationFn: (data: GlobalUserForm) => apiRequest('POST', '/api/global-admin/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/global-admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/global-admin/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/global-admin/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/global-admin/activity'] });
      setIsUserDialogOpen(false);
      userForm.reset();
      toast({
        title: "User created",
        description: "The global user has been successfully created.",
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

  const updateGlobalUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<GlobalUserForm> }) => 
      apiRequest('PUT', `/api/global-admin/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/global-admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/global-admin/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/global-admin/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/global-admin/activity'] });
      setEditingUser(null);
      setIsUserDialogOpen(false);
      userForm.reset();
      toast({
        title: "User updated",
        description: "The user has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });

  const toggleUserStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => 
      apiRequest('PUT', `/api/global-admin/users/${id}/status`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/global-admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/global-admin/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/global-admin/activity'] });
      toast({
        title: "User status updated",
        description: "The user status has been successfully changed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user status",
        variant: "destructive",
      });
    },
  });

  const toggleCompanyStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => 
      apiRequest('PUT', `/api/global-admin/clients/${id}/status`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/global-admin/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/global-admin/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/global-admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/global-admin/activity'] });
      toast({
        title: "Client Company status updated",
        description: "The client company status has been successfully changed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update company status",
        variant: "destructive",
      });
    },
  });

  const deleteGlobalUserMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/global-admin/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/global-admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/global-admin/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/global-admin/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/global-admin/activity'] });
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

  const assignUserToCompanyMutation = useMutation({
    mutationFn: (data: UserAssignmentForm) => apiRequest('POST', '/api/global-admin/assign-user', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/global-admin/company-users', managingCompany?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/global-admin/clients'] });
      setIsAssignUserDialogOpen(false);
      assignmentForm.reset();
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

  const updateUserRoleMutation = useMutation({
    mutationFn: ({ assignmentId, role }: { assignmentId: number; role: string }) => 
      apiRequest('PUT', `/api/global-admin/user-assignments/${assignmentId}`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/global-admin/company-users', managingCompany?.id] });
      setIsEditRoleDialogOpen(false);
      setEditingAssignment(null);
      toast({
        title: "Role updated",
        description: "The user's role has been successfully updated.",
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

  const removeUserFromCompanyMutation = useMutation({
    mutationFn: (assignmentId: number) => apiRequest('DELETE', `/api/global-admin/user-assignments/${assignmentId}`),
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

  // Helper functions
  // Note: handleEditCompany and handleCreateCompany removed - ClientCompaniesGrid handles these

  const handleEditUser = (user: GlobalUser) => {
    setEditingUser(user);
    userForm.setValue("username", user.username);
    userForm.setValue("email", user.email);
    userForm.setValue("firstName", user.firstName);
    userForm.setValue("lastName", user.lastName);
    userForm.setValue("globalRole", user.globalRole);
    // Don't pre-fill password for editing
    setIsUserDialogOpen(true);
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    userForm.reset();
    setIsUserDialogOpen(true);
  };

  const handleManageCompanyUsers = (company: ClientCompany) => {
    setManagingCompany(company);
    setIsCompanyUsersDialogOpen(true);
  };

  const onUserSubmit = (data: GlobalUserForm) => {
    if (editingUser) {
      // For editing, password is optional
      if (!data.password || data.password.trim() === '') {
        const { password, ...dataWithoutPassword } = data;
        updateGlobalUserMutation.mutate({ id: editingUser.id, data: dataWithoutPassword });
      } else {
        updateGlobalUserMutation.mutate({ id: editingUser.id, data });
      }
    } else {
      // For creating, password is required
      if (!data.password || data.password.trim() === '') {
        toast({
          title: "Error",
          description: "Password is required when creating a new user.",
          variant: "destructive",
        });
        return;
      }
      createGlobalUserMutation.mutate(data);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRoleColor = (role: GlobalRole) => {
    return role === 'global_administrator' ? 
      'bg-red-100 text-red-800' : 
      'bg-blue-100 text-blue-800';
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 
      'bg-green-100 text-green-800' : 
      'bg-gray-100 text-gray-800';
  };

  const getCompanyRoleColor = (role: string) => {
    switch (role) {
      case 'administrator':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'manager':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'accountant':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'assistant':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const formatCompanyRole = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

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

  const handleAssignUser = () => {
    if (managingCompany) {
      assignmentForm.setValue("companyId", managingCompany.id);
      setIsAssignUserDialogOpen(true);
    }
  };

  const handleEditUserRole = (user: CompanyUser) => {
    // Create assignment object with the correct assignment ID
    const assignment: UserAssignment = {
      id: user.assignmentId, // Use the assignment ID from the API
      userId: user.id,
      companyId: managingCompany?.id || 0,
      role: user.role,
      isActive: user.isActive
    };
    setEditingAssignment(assignment);
    setIsEditRoleDialogOpen(true);
  };

  const handleRemoveUser = (user: CompanyUser) => {
    if (confirm(`Are you sure you want to remove ${user.firstName} ${user.lastName} from ${managingCompany?.name}?`)) {
      // Use the assignment ID from the API
      removeUserFromCompanyMutation.mutate(user.assignmentId);
    }
  };

  const onAssignmentSubmit = (data: UserAssignmentForm) => {
    assignUserToCompanyMutation.mutate(data);
  };

  const onRoleUpdateSubmit = (newRole: string) => {
    if (editingAssignment) {
      updateUserRoleMutation.mutate({
        assignmentId: editingAssignment.id,
        role: newRole
      });
    }
  };

  // Show access denied for non-global administrators
  if (!isGlobalAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Shield className="w-16 h-16 text-muted-foreground mx-auto" />
          <h3 className="text-lg font-medium text-foreground">Global Administrator Access Required</h3>
          <div className="space-y-2 text-muted-foreground max-w-md">
            <p>This section requires global administrator privileges.</p>
            <p>Please login with a global administrator account to access:</p>
            <ul className="text-sm list-disc list-inside space-y-1 text-left">
              <li>System overview and statistics</li>
              <li>Company management</li>
              <li>Global user management</li>
              <li>User-company assignments</li>
              <li>Activity logs and monitoring</li>
            </ul>
            <div className="mt-4 p-3 bg-muted rounded-lg text-sm">
              <p className="font-medium">Demo Credentials:</p>
              <p>Username: <code className="bg-background px-1 py-0.5 rounded">admin</code></p>
              <p>Password: <code className="bg-background px-1 py-0.5 rounded">admin123</code></p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center">
            <Globe className="w-6 h-6 mr-2" />
            Global Administration
          </h1>
          <p className="text-muted-foreground">
            Comprehensive system management and monitoring
          </p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['/api/global-admin/clients'] });
              queryClient.invalidateQueries({ queryKey: ['/api/global-admin/users'] });
              queryClient.invalidateQueries({ queryKey: ['/api/global-admin/stats'] });
              queryClient.invalidateQueries({ queryKey: ['/api/global-admin/activity'] });
              toast({
                title: "Data refreshed",
                description: "All data has been refreshed from the server.",
              });
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Backup System
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="companies">Client Companies</TabsTrigger>
          <TabsTrigger value="users">Global Users</TabsTrigger>
          <TabsTrigger value="activity">Activity Logs</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Client Companies</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemStats?.totalCompanies || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {systemStats?.activeCompanies || 0} active
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemStats?.totalUsers || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {systemStats?.activeUsers || 0} active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Transactions</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemStats?.totalTransactions || 0}</div>
                <p className="text-xs text-muted-foreground">
                  This month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemStats?.storageUsed || "0 MB"}</div>
                <p className="text-xs text-muted-foreground">
                  Database size
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Client Companies</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {companies.slice(0, 5).map((company) => (
                    <div key={company.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{company.name}</p>
                        <p className="text-sm text-muted-foreground">{company.code}</p>
                      </div>
                      <Badge className={getStatusColor(company.isActive)}>
                        {company.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>System Uptime</span>
                    <Badge variant="outline">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {systemStats?.systemUptime || "Unknown"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Last Backup</span>
                    <Badge variant="outline">
                      <Clock className="w-3 h-3 mr-1" />
                      {systemStats?.lastBackup ? formatDate(systemStats.lastBackup) : "Never"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Database Status</span>
                    <Badge variant="outline">
                      <CheckCircle className="w-3 h-3 mr-1 text-green-600" />
                      Healthy
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Client Companies Tab */}
        <TabsContent value="companies" className="space-y-4">
          <ClientCompaniesGrid onManageUsers={handleManageCompanyUsers} />
        </TabsContent>

        {/* Global Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Global User Management</h3>
              <p className="text-muted-foreground">Manage system-wide user accounts and global roles</p>
            </div>
            <Button onClick={handleCreateUser}>
              <UserPlus className="w-4 h-4 mr-2" />
              New Global User
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Global Role</TableHead>
                    <TableHead>Companies</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {globalUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            @{user.username}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge className={getRoleColor(user.globalRole)}>
                          {user.globalRole === 'global_administrator' ? 'Global Admin' : 'User'}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.companiesCount}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(user.isActive)}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.lastLogin ? formatDate(user.lastLogin) : 'Never'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                            disabled={updateGlobalUserMutation.isPending}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleUserStatusMutation.mutate({
                              id: user.id,
                              isActive: !user.isActive
                            })}
                            disabled={toggleUserStatusMutation.isPending}
                          >
                            {user.isActive ? (
                              <XCircle className="w-4 h-4" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-destructive"
                                disabled={deleteGlobalUserMutation.isPending}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete User</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{user.firstName} {user.lastName}"? This action cannot be undone and will remove all associated data.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteGlobalUserMutation.mutate(user.id)}
                                  className="bg-destructive text-destructive-foreground"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Logs Tab */}
        <TabsContent value="activity" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">System Activity Logs</h3>
              <p className="text-muted-foreground">Monitor all system activities and user actions</p>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => refetchLogs()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export Logs
              </Button>
            </div>
          </div>

          {/* Activity Summary Cards */}
          {activitySummary?.data && (
            <div className="grid gap-4 md:grid-cols-4">
          <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {activitySummary.data.actionCounts?.reduce((sum: number, item: any) => sum + item.count, 0) || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Last {activitySummary.data.period}
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Top Action</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {activitySummary.data.actionCounts?.[0]?.action || 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {activitySummary.data.actionCounts?.[0]?.count || 0} times
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Resources</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {activitySummary.data.resourceCounts?.length || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Types affected
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Math.round((activitySummary.data.dailyCounts?.reduce((sum: number, item: any) => sum + item.count, 0) || 0) / (activitySummary.data.dailyCounts?.length || 1))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Actions per day
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-6">
                <div>
                  <Label htmlFor="search">Search</Label>
                  <Input
                    id="search"
                    placeholder="Search logs..."
                    value={activityFilters.search}
                    onChange={(e) => setActivityFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="action">Action</Label>
                  <Select
                    value={activityFilters.action}
                    onValueChange={(value) => setActivityFilters(prev => ({ ...prev, action: value, page: 1 }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All actions</SelectItem>
                      {activityFiltersData?.data?.actions?.map((action: any) => (
                        <SelectItem key={action.value} value={action.value}>
                          {action.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="resource">Resource</Label>
                  <Select
                    value={activityFilters.resource}
                    onValueChange={(value) => setActivityFilters(prev => ({ ...prev, resource: value, page: 1 }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by resource" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All resources</SelectItem>
                      {activityFiltersData?.data?.resources?.map((resource: any) => (
                        <SelectItem key={resource.value} value={resource.value}>
                          {resource.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="user">User</Label>
                  <Select
                    value={activityFilters.userId}
                    onValueChange={(value) => setActivityFilters(prev => ({ ...prev, userId: value, page: 1 }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by user" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('common.all')} {t('common.user')}s</SelectItem>
                      {activityFiltersData?.data?.users?.map((user: any) => (
                        <SelectItem key={user.value || user.label} value={user.value?.toString() || user.label}>
                          {user.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={activityFilters.startDate}
                    onChange={(e) => setActivityFilters(prev => ({ ...prev, startDate: e.target.value, page: 1 }))}
                  />
                </div>

                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={activityFilters.endDate}
                    onChange={(e) => setActivityFilters(prev => ({ ...prev, endDate: e.target.value, page: 1 }))}
                  />
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setActivityFilters({
                    page: 1,
                    limit: 50,
                    action: 'all',
                    resource: 'all',
                    userId: 'all',
                    startDate: '',
                    endDate: '',
                    search: ''
                  })}
                >
                  Clear Filters
                </Button>
                
                <div className="flex items-center space-x-2">
                  <Label htmlFor="limit">Per page:</Label>
                  <Select
                    value={activityFilters.limit.toString()}
                    onValueChange={(value) => setActivityFilters(prev => ({ ...prev, limit: parseInt(value), page: 1 }))}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity Logs Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Activity Logs</CardTitle>
                {activityData?.data?.pagination && (
                  <div className="text-sm text-muted-foreground">
                    Showing {((activityData.data.pagination.currentPage - 1) * activityData.data.pagination.limit) + 1} to {Math.min(activityData.data.pagination.currentPage * activityData.data.pagination.limit, activityData.data.pagination.totalCount)} of {activityData.data.pagination.totalCount} entries
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>IP Address</TableHead>
                      <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                    {logsLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2" />
                          Loading activity logs...
                        </TableCell>
                      </TableRow>
                    ) : activityData?.data?.logs?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No activity logs found
                        </TableCell>
                      </TableRow>
                    ) : (
                      activityData?.data?.logs?.map((log: any) => (
                    <TableRow key={log.id}>
                          <TableCell className="font-mono text-xs">
                            {log.formattedTimestamp}
                          </TableCell>
                      <TableCell>
                            <div>
                              <div className="font-medium">{log.user?.name}</div>
                              <div className="text-xs text-muted-foreground">@{log.user?.username}</div>
                            </div>
                      </TableCell>
                      <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {log.actionDisplayName}
                            </Badge>
                      </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {log.resourceDisplayName}
                            </Badge>
                      </TableCell>
                          <TableCell className="max-w-xs">
                            <div className="text-xs">
                              {log.details?.error ? (
                                <div className="space-y-1">
                                  <div className="text-muted-foreground">{log.description || log.actionDisplayName}</div>
                                  <div className="text-red-600 bg-red-50 p-2 rounded border-l-2 border-red-200">
                                    <strong>❌ Error:</strong> {log.details.error}
                                  </div>
                                  {log.details?.errorStack && (
                                    <details className="text-xs">
                                      <summary className="cursor-pointer text-red-500 hover:text-red-700">
                                        📋 Stack Trace
                                      </summary>
                                      <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-32">
                                        {log.details.errorStack}
                                      </pre>
                                    </details>
                                  )}
                                </div>
                              ) : (
                                <div className="text-muted-foreground">
                                  {log.description || log.actionDisplayName}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {log.ipAddress || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {log.details?.success !== false ? (
                              <Badge className="bg-green-100 text-green-800 text-xs">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Success
                              </Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-800 text-xs">
                                <XCircle className="w-3 h-3 mr-1" />
                                Failed
                              </Badge>
                            )}
                      </TableCell>
                    </TableRow>
                      ))
                    )}
                </TableBody>
              </Table>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Pagination */}
          {activityData?.data?.pagination && activityData.data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Page {activityData.data.pagination.currentPage} of {activityData.data.pagination.totalPages}
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!activityData.data.pagination.hasPrevPage}
                  onClick={() => setActivityFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!activityData.data.pagination.hasNextPage}
                  onClick={() => setActivityFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </TabsContent>


      </Tabs>

      {/* Global User Dialog */}
      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUser ? `Edit User: ${editingUser.username}` : 'Create New Global User'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={userForm.handleSubmit(onUserSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  {...userForm.register("firstName")}
                  placeholder="Enter first name"
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
                  placeholder="Enter last name"
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
                placeholder="Enter username"
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
                placeholder="user@example.com"
              />
              {userForm.formState.errors.email && (
                <p className="text-sm text-destructive">
                  {userForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                Password {editingUser && "(leave empty to keep current)"}
              </Label>
              <Input
                id="password"
                type="password"
                {...userForm.register("password")}
                placeholder="Enter password"
              />
              {userForm.formState.errors.password && (
                <p className="text-sm text-destructive">
                  {userForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="globalRole">Global Role</Label>
              <Select
                value={userForm.watch("globalRole")}
                onValueChange={(value) => userForm.setValue("globalRole", value as GlobalRole)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select global role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Standard User</SelectItem>
                  <SelectItem value="global_administrator">Global Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end space-x-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsUserDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createGlobalUserMutation.isPending || updateGlobalUserMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                {(createGlobalUserMutation.isPending || updateGlobalUserMutation.isPending) 
                  ? 'Saving...' 
                  : editingUser ? 'Update User' : 'Create User'
                }
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Company Users Management Dialog */}
      <Dialog open={isCompanyUsersDialogOpen} onOpenChange={setIsCompanyUsersDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Manage Users - {managingCompany?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Company Code: {managingCompany?.code}
                </p>
                <p className="text-sm text-muted-foreground">
                  Total Users: {companyUsers.length}
                </p>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => refetchCompanyUsers()}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
                <Button onClick={handleAssignUser}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add User to Company
                </Button>
              </div>
            </div>

            {companyUsersLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                Loading company users...
              </div>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {companyUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No users found for this company
                          </TableCell>
                        </TableRow>
                      ) : (
                        companyUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {user.firstName} {user.lastName}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  @{user.username}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <Badge className={getCompanyRoleColor(user.role)}>
                                {formatCompanyRole(user.role)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(user.isActive)}>
                                {user.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatDate(user.joinedAt)}</TableCell>
                            <TableCell>
                              {user.lastLogin ? formatDate(user.lastLogin) : 'Never'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  title="Edit User Role"
                                  onClick={() => handleEditUserRole(user)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  title="Remove from Company"
                                  className="text-destructive"
                                  onClick={() => handleRemoveUser(user)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end">
              <Button 
                variant="outline" 
                onClick={() => setIsCompanyUsersDialogOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign User to Company Dialog */}
      <Dialog open={isAssignUserDialogOpen} onOpenChange={setIsAssignUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign User to {managingCompany?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={assignmentForm.handleSubmit(onAssignmentSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="userId">User</Label>
              <Select
                value={assignmentForm.watch("userId").toString()}
                onValueChange={(value) => assignmentForm.setValue("userId", parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
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
              {assignmentForm.formState.errors.userId && (
                <p className="text-sm text-destructive">
                  {assignmentForm.formState.errors.userId.message}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={assignmentForm.watch("role")}
                onValueChange={(value) => assignmentForm.setValue("role", value)}
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
              {assignmentForm.formState.errors.role && (
                <p className="text-sm text-destructive">
                  {assignmentForm.formState.errors.role.message}
                </p>
              )}
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAssignUserDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={assignUserToCompanyMutation.isPending}>
                {assignUserToCompanyMutation.isPending ? "Assigning..." : "Assign User"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Role Dialog */}
      <Dialog open={isEditRoleDialogOpen} onOpenChange={setIsEditRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Current Role</Label>
              <div className="p-2 bg-muted rounded">
                <Badge className={getCompanyRoleColor(editingAssignment?.role || '')}>
                  {formatCompanyRole(editingAssignment?.role || '')}
                </Badge>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="newRole">New Role</Label>
              <Select
                defaultValue={editingAssignment?.role}
                onValueChange={(value) => onRoleUpdateSubmit(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select new role" />
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
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditRoleDialogOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 