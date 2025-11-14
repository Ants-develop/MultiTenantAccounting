import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
  Plus, Loader2, Search, Eye, Edit, Trash2, RefreshCw, Users
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertClientSchemaEnhanced } from "@shared/schema";
import { z } from "zod";

export interface ClientCompanyGridItem {
  id: number;
  name: string;
  code: string;
  address: string | null;
  tenantCode: number | null;
  isActive: boolean;
  createdAt: string;
  userCount: number;
  users?: Array<{
    id: number;
    firstName: string;
    lastName: string;
    username: string;
  }>;
  lastActivity: string | null;
  manager?: string | null;
  accountingSoftware?: string | null;
  email?: string | null;
  verificationStatus?: "verified" | "not_registered" | "pending";
  idCode?: string;
}

interface ClientCompaniesGridProps<T extends ClientCompanyGridItem = ClientCompanyGridItem> {
  onCreateNew?: () => void;
  onEdit?: (company: T) => void;
  onDelete?: (company: T) => void;
  onManageUsers?: (company: T) => void;
  onViewProfile?: (company: T) => void;
  onViewOnboarding?: (company: T) => void;
}

type ClientCompanyFormData = z.infer<typeof insertClientSchemaEnhanced>;

export function ClientCompaniesGrid<T extends ClientCompanyGridItem = ClientCompanyGridItem>({
  onCreateNew,
  onEdit,
  onDelete,
  onManageUsers,
  onViewProfile,
  onViewOnboarding
}: ClientCompaniesGridProps<T>) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [verificationFilter, setVerificationFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<ClientCompanyGridItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<ClientCompanyFormData>({
    resolver: zodResolver(insertClientSchemaEnhanced),
    defaultValues: {
      name: "",
      code: "",
      email: undefined,
      address: "",
      fiscalYearStart: 1,
      currency: "GEL",
      tenantCode: undefined,
      manager: "",
      accountingSoftware: "",
      idCode: "",
      isActive: true,
    }
  });

  // Fetch client companies
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["clientCompanies", searchTerm, statusFilter, verificationFilter],
    queryFn: async () => {
      try {
        const response = await apiRequest(
          "GET",
          `/api/global-admin/clients?search=${encodeURIComponent(searchTerm)}&status=${statusFilter}&verification=${verificationFilter}`
        );
        
        if (!response) {
          throw new Error("No response from server");
        }

        // Parse JSON from Response object
        const json = await response.json();
        
        // Handle both { data: [...] } and direct array responses
        const result = json?.data || json;
        if (!Array.isArray(result)) {
          console.error("Unexpected response format:", json);
          throw new Error("Invalid response format");
        }
        
        return result;
      } catch (err) {
        console.error("Failed to fetch client companies:", err);
        throw err;
      }
    },
  });

  const companies: T[] = Array.isArray(data) ? data : [];

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (formData: ClientCompanyFormData) => 
      apiRequest("POST", "/api/global-admin/clients", formData).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientCompanies"] });
      toast({
        title: "Success",
        description: "Client company created successfully",
      });
      reset();
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create client company",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: { id: number; formData: Partial<ClientCompanyFormData> }) =>
      apiRequest("PUT", `/api/global-admin/clients/${data.id}`, data.formData).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientCompanies"] });
      toast({
        title: "Success",
        description: "Client company updated successfully",
      });
      reset();
      setIsModalOpen(false);
      setEditingCompany(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update client company",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/global-admin/clients/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientCompanies"] });
      toast({
        title: "Success",
        description: "Client company deleted successfully",
      });
      setDeleteConfirmId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete company",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (formData: ClientCompanyFormData) => {
    if (editingCompany) {
      updateMutation.mutate({ id: editingCompany.id, formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleCreate = () => {
    reset({
      name: "",
      code: "",
      email: undefined,
      address: "",
      fiscalYearStart: 1,
      currency: "GEL",
      tenantCode: undefined,
      manager: "",
      accountingSoftware: "",
      idCode: "",
      isActive: true,
    });
    setEditingCompany(null);
    setIsModalOpen(true);
  };

  const handleEdit = (company: ClientCompanyGridItem) => {
    reset({
      name: company.name,
      code: company.code,
      email: company.email || undefined,
      address: company.address || "",
      fiscalYearStart: (company as any).fiscalYearStart || 1,
      currency: (company as any).currency || "GEL",
      tenantCode: company.tenantCode || undefined,
      manager: company.manager || "",
      accountingSoftware: company.accountingSoftware || "",
      idCode: company.idCode || "",
      isActive: company.isActive,
    });
    setEditingCompany(company);
    setIsModalOpen(true);
    onEdit?.(company as T);
  };

  const getVerificationBadge = (status: string | undefined) => {
    const finalStatus = status || "not_registered";
    return finalStatus === "verified" ? (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
        ✓ Verified
      </Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
        ✗ Not Registered
      </Badge>
    );
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive
      ? "bg-blue-100 text-blue-800 hover:bg-blue-100"
      : "bg-gray-100 text-gray-800 hover:bg-gray-100";
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Client Companies</h3>
          <p className="text-sm text-muted-foreground">
            Manage all client companies in the system
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            New Client Company
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Select value={verificationFilter} onValueChange={setVerificationFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Verification" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="not_registered">Not Registered</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">
              <p>Failed to load client companies</p>
              <p className="text-sm mt-2">{(error as any)?.message || "Unknown error"}</p>
            </div>
          ) : companies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No client companies found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12">
                      <input type="checkbox" className="rounded" />
                    </TableHead>
                    <TableHead className="font-semibold">Company ID</TableHead>
                    <TableHead className="font-semibold">Company Name</TableHead>
                    <TableHead className="font-semibold">Code</TableHead>
                    <TableHead className="font-semibold">Tenant Code</TableHead>
                    <TableHead className="font-semibold">Manager</TableHead>
                    <TableHead className="font-semibold">Accounting Software</TableHead>
                    <TableHead className="font-semibold">RS Verified Status</TableHead>
                    <TableHead className="text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((company) => (
                    <TableRow key={company.id} className="hover:bg-muted/50">
                      <TableCell>
                        <input type="checkbox" className="rounded" />
                      </TableCell>
                      <TableCell className="font-medium text-blue-600">
                        {company.id}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{company.name}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{company.code}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={company.tenantCode ? "bg-blue-100 text-blue-800" : ""}
                          variant={company.tenantCode ? "default" : "outline"}
                        >
                          {company.tenantCode || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {company.manager || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {company.accountingSoftware ? company.accountingSoftware : "—"}
                      </TableCell>
                      <TableCell>
                        {getVerificationBadge(company.verificationStatus)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(company)}
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {onViewProfile && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onViewProfile(company)}
                              title="View Profile"
                            >
                              <User className="h-4 w-4" />
                            </Button>
                          )}
                          {onViewOnboarding && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onViewOnboarding(company)}
                              title="View Onboarding"
                            >
                              <ClipboardList className="h-4 w-4" />
                            </Button>
                          )}
                          {onManageUsers && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onManageUsers(company)}
                              title="Manage Users"
                            >
                              <Users className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirmId(company.id)}
                            title="Delete"
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer Info */}
      {companies.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Showing {companies.length} client compan{companies.length !== 1 ? "ies" : "y"}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCompany ? 'Edit Client Company' : 'Create New Client Company'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Company Name *</Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="Enter company name"
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            {/* Code */}
            <div className="space-y-2">
              <Label htmlFor="code">Company Code *</Label>
              <Input
                id="code"
                {...register("code")}
                placeholder="e.g., ABC"
                maxLength={10}
              />
              {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="company@example.com"
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                {...register("address")}
                placeholder="Company address"
              />
              {errors.address && <p className="text-sm text-destructive">{errors.address.message}</p>}
            </div>

            {/* Fiscal Year Start */}
            <div className="space-y-2">
              <Label htmlFor="fiscalYearStart">Fiscal Year Start Month *</Label>
              <Select
                value={watch("fiscalYearStart")?.toString() || "1"}
                onValueChange={(value) => setValue("fiscalYearStart", parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">January</SelectItem>
                  <SelectItem value="2">February</SelectItem>
                  <SelectItem value="3">March</SelectItem>
                  <SelectItem value="4">April</SelectItem>
                  <SelectItem value="5">May</SelectItem>
                  <SelectItem value="6">June</SelectItem>
                  <SelectItem value="7">July</SelectItem>
                  <SelectItem value="8">August</SelectItem>
                  <SelectItem value="9">September</SelectItem>
                  <SelectItem value="10">October</SelectItem>
                  <SelectItem value="11">November</SelectItem>
                  <SelectItem value="12">December</SelectItem>
                </SelectContent>
              </Select>
              {errors.fiscalYearStart && <p className="text-sm text-destructive">{errors.fiscalYearStart.message}</p>}
            </div>

            {/* Currency */}
            <div className="space-y-2">
              <Label htmlFor="currency">Currency *</Label>
              <Input
                id="currency"
                {...register("currency")}
                placeholder="GEL"
                maxLength={3}
              />
              <p className="text-xs text-muted-foreground">
                3-letter ISO currency code (e.g., GEL, USD, EUR)
              </p>
              {errors.currency && <p className="text-sm text-destructive">{errors.currency.message}</p>}
            </div>

            {/* Tenant Code */}
            <div className="space-y-2">
              <Label htmlFor="tenantCode">Tenant Code</Label>
              <Input
                id="tenantCode"
                type="number"
                {...register("tenantCode", { valueAsNumber: true })}
                placeholder="e.g., 1924"
              />
              <p className="text-xs text-muted-foreground">
                Numeric code for MSSQL tenant data filtering
              </p>
              {errors.tenantCode && <p className="text-sm text-destructive">{errors.tenantCode.message}</p>}
            </div>

            {/* Manager */}
            <div className="space-y-2">
              <Label htmlFor="manager">Manager</Label>
              <Input
                id="manager"
                {...register("manager")}
                placeholder="Manager name"
              />
              {errors.manager && <p className="text-sm text-destructive">{errors.manager.message}</p>}
            </div>

            {/* Accounting Software */}
            <div className="space-y-2">
              <Label htmlFor="accountingSoftware">Accounting Software</Label>
              <Input
                id="accountingSoftware"
                {...register("accountingSoftware")}
                placeholder="e.g., 1C, QuickBooks"
              />
              {errors.accountingSoftware && <p className="text-sm text-destructive">{errors.accountingSoftware.message}</p>}
            </div>

            {/* ID Code */}
            <div className="space-y-2">
              <Label htmlFor="idCode">ID Code</Label>
              <Input
                id="idCode"
                {...register("idCode")}
                placeholder="Tax ID or registration number"
              />
              {errors.idCode && <p className="text-sm text-destructive">{errors.idCode.message}</p>}
            </div>

            {/* Active Status */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                {...register("isActive")}
                className="rounded"
              />
              <Label htmlFor="isActive" className="cursor-pointer">Mark as Active</Label>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingCompany ? 'Update' : 'Create'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsModalOpen(false);
                  reset();
                  setEditingCompany(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Client Company</DialogTitle>
            </DialogHeader>
            <p className="py-4">
              Are you sure you want to delete this client company? This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmId(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (deleteConfirmId) {
                    deleteMutation.mutate(deleteConfirmId);
                  }
                }}
                disabled={deleteMutation.isPending}
              >
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
