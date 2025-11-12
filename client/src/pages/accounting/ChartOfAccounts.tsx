import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Check, ChevronDown, ChevronRight } from "lucide-react";
import { useCompany } from "@/hooks/useCompany";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { usePageActions } from "@/hooks/usePageActions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Account {
  id: number;
  code: string;
  name: string;
  type: string;
  subType: string | null;
  parentId?: number | null;
  accountClass?: string | null;
  category?: string | null;
  isSubaccountAllowed?: boolean;
  isForeignCurrency?: boolean;
  isAnalytical?: boolean;
  isActive: boolean;
}

interface TreeNode {
  account: Account;
  children: TreeNode[];
  level: number;
}

const accountSchema = z.object({
  code: z.string().min(1, "Account code is required"),
  name: z.string().min(1, "Account name is required"),
  type: z.string().min(1, "Account type is required"),
  subType: z.string().optional(),
  accountClass: z.string().optional(),
  category: z.string().optional(),
  isSubaccountAllowed: z.boolean().optional(),
  isForeignCurrency: z.boolean().optional(),
  isAnalytical: z.boolean().optional(),
});

type AccountForm = z.infer<typeof accountSchema>;

const accountTypes = [
  { value: "asset", label: "Asset" },
  { value: "liability", label: "Liability" },
  { value: "equity", label: "Equity" },
  { value: "revenue", label: "Revenue" },
  { value: "expense", label: "Expense" },
];

const accountSubTypes = {
  asset: [
    { value: "current_asset", label: "Current Asset" },
    { value: "fixed_asset", label: "Fixed Asset" },
    { value: "other_asset", label: "Other Asset" },
  ],
  liability: [
    { value: "current_liability", label: "Current Liability" },
    { value: "long_term_liability", label: "Long-term Liability" },
  ],
  equity: [
    { value: "owner_equity", label: "Owner's Equity" },
    { value: "retained_earnings", label: "Retained Earnings" },
  ],
  revenue: [
    { value: "operating_revenue", label: "Operating Revenue" },
    { value: "other_revenue", label: "Other Revenue" },
  ],
  expense: [
    { value: "operating_expense", label: "Operating Expense" },
    { value: "other_expense", label: "Other Expense" },
  ],
};

export default function ChartOfAccounts() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("");
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const { currentCompany } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { registerTrigger } = usePageActions();

  const { data: accounts, isLoading } = useQuery<Account[]>({
    queryKey: ['/api/accounts'],
    enabled: !!currentCompany,
  });

  const form = useForm<AccountForm>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      code: "",
      name: "",
      type: "",
      subType: "",
      accountClass: "",
      category: "",
      isSubaccountAllowed: false,
      isForeignCurrency: false,
      isAnalytical: false,
    },
  });

  const createAccountMutation = useMutation({
    mutationFn: (data: AccountForm) => apiRequest('POST', '/api/accounts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Account created",
        description: "The account has been successfully created.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    },
  });

  const updateAccountMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: AccountForm }) => 
      apiRequest('PUT', `/api/accounts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      setIsDialogOpen(false);
      setEditingAccount(null);
      form.reset();
      toast({
        title: "Account updated",
        description: "The account has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update account",
        variant: "destructive",
      });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/accounts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      toast({
        title: "Account deleted",
        description: "The account has been successfully deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error", 
        description: error.message || "Failed to delete account",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AccountForm) => {
    if (editingAccount) {
      updateAccountMutation.mutate({ id: editingAccount.id, data });
    } else {
      createAccountMutation.mutate(data);
    }
  };

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account);
    setSelectedType(account.type);
    form.reset({
      code: account.code,
      name: account.name,
      type: account.type,
      subType: account.subType || "",
      accountClass: account.accountClass || "",
      category: account.category || "",
      isSubaccountAllowed: !!account.isSubaccountAllowed,
      isForeignCurrency: !!account.isForeignCurrency,
      isAnalytical: !!account.isAnalytical,
    });
    setIsDialogOpen(true);
  };

  const handleDeleteAccount = (account: Account) => {
    if (confirm(`Are you sure you want to delete the account "${account.name}"?`)) {
      deleteAccountMutation.mutate(account.id);
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingAccount(null);
    setSelectedType("");
    form.reset();
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'asset':
        return 'bg-blue-100 text-blue-800';
      case 'liability':
        return 'bg-red-100 text-red-800';
      case 'equity':
        return 'bg-purple-100 text-purple-800';
      case 'revenue':
        return 'bg-green-100 text-green-800';
      case 'expense':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  // Build tree structure from flat accounts list
  const treeData = useMemo(() => {
    if (!accounts) return [];

    // Create a map for quick lookups
    const accountMap = new Map<string, Account>();
    accounts.forEach(acc => accountMap.set(acc.code, acc));

    // Determine parent based on code hierarchy or parentId
    const getCodeParent = (code: string): string | null => {
      // Remove suffixes like .01, .02, etc. to find parent
      // Examples: 1100.01 -> 1100, 1100.01.001 -> 1100.01
      const parts = code.split('.');
      if (parts.length > 1) {
        // Remove last part and rejoin
        const parentCode = parts.slice(0, -1).join('.');
        if (accountMap.has(parentCode)) {
          return parentCode;
        }
      }
      return null;
    };

    // Build tree using code hierarchy
    const buildTree = (account: Account, level: number = 0): TreeNode => {
      const children: TreeNode[] = [];
      
      // Find all accounts that have this account as code parent
      accounts.forEach(acc => {
        const codeParent = getCodeParent(acc.code);
        if (codeParent === account.code) {
          children.push(buildTree(acc, level + 1));
        }
        // Also check explicit parentId for backward compatibility
        else if (acc.parentId === account.id) {
          children.push(buildTree(acc, level + 1));
        }
      });

      return {
        account,
        children: children.sort((a, b) => a.account.code.localeCompare(b.account.code)),
        level,
      };
    };

    // Get root accounts (no code parent and no explicit parent)
    const roots = accounts
      .filter(acc => {
        const codeParent = getCodeParent(acc.code);
        return !codeParent && !acc.parentId;
      })
      .map(acc => buildTree(acc, 0))
      .sort((a, b) => a.account.code.localeCompare(b.account.code));

    return roots;
  }, [accounts]);

  // Flatten tree for rendering with visual hierarchy
  const flattenTree = (nodes: TreeNode[]): Array<{ node: TreeNode; isLastInGroup: boolean }> => {
    const result: Array<{ node: TreeNode; isLastInGroup: boolean }> = [];
    
    nodes.forEach((node, index) => {
      result.push({ node, isLastInGroup: index === nodes.length - 1 });
      if (expandedIds.has(node.account.id)) {
        result.push(...flattenTree(node.children));
      }
    });

    return result;
  };

  const toggleExpand = (accountId: number) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedIds(newExpanded);
  };

  // Register the action for this page
  useEffect(() => {
    registerTrigger('newAccount', () => {
      setIsDialogOpen(true);
    });
  }, [registerTrigger]);

  if (!currentCompany) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-foreground">No Company Selected</h3>
          <p className="text-muted-foreground">Please select a company to view accounts.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Chart of Accounts</h1>
          <p className="text-muted-foreground">
            Manage your company's chart of accounts
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingAccount ? 'Edit Account' : 'Create New Account'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Account Code</Label>
                  <Input
                    id="code"
                    {...form.register("code")}
                    placeholder="e.g., 1000"
                  />
                  {form.formState.errors.code && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.code.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Account Name</Label>
                  <Input
                    id="name"
                    {...form.register("name")}
                    placeholder="e.g., Cash"
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="type">Account Type</Label>
                <Select
                  value={form.watch("type")}
                  onValueChange={(value) => {
                    form.setValue("type", value);
                    setSelectedType(value);
                    form.setValue("subType", ""); // Reset subtype when type changes
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    {accountTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.type && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.type.message}
                  </p>
                )}
              </div>

              {selectedType && accountSubTypes[selectedType as keyof typeof accountSubTypes] && (
                <div className="space-y-2">
                  <Label htmlFor="subType">Account Sub-type</Label>
                  <Select
                    value={form.watch("subType")}
                    onValueChange={(value) => form.setValue("subType", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sub-type (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {accountSubTypes[selectedType as keyof typeof accountSubTypes].map((subType) => (
                        <SelectItem key={subType.value} value={subType.value}>
                          {subType.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Additional fields aligned like reference system */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Account Class</Label>
                  <Select value={form.watch("accountClass") || ""} onValueChange={(v) => form.setValue("accountClass", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="balance_sheet">Balance Sheet</SelectItem>
                      <SelectItem value="profit_loss">Profit & Loss</SelectItem>
                      <SelectItem value="off_balance">Off-balance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input id="category" {...form.register("category")} placeholder="e.g., Cash & Banks" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-2">
                <Controller
                  name="isSubaccountAllowed"
                  control={form.control}
                  render={({ field }) => (
                    <label className="flex items-center space-x-2">
                      <Checkbox
                        checked={!!field.value}
                        onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                      />
                      <span>Subaccounts allowed</span>
                    </label>
                  )}
                />
                <Controller
                  name="isForeignCurrency"
                  control={form.control}
                  render={({ field }) => (
                    <label className="flex items-center space-x-2">
                      <Checkbox
                        checked={!!field.value}
                        onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                      />
                      <span>Foreign currency</span>
                    </label>
                  )}
                />
                <Controller
                  name="isAnalytical"
                  control={form.control}
                  render={({ field }) => (
                    <label className="flex items-center space-x-2">
                      <Checkbox
                        checked={!!field.value}
                        onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                      />
                      <span>Analytical</span>
                    </label>
                  )}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createAccountMutation.isPending || updateAccountMutation.isPending}>
                  {editingAccount 
                    ? (updateAccountMutation.isPending ? "Updating..." : "Update Account")
                    : (createAccountMutation.isPending ? "Creating..." : "Create Account")
                  }
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading accounts...</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Code</TableHead>
                    <TableHead className="w-[250px]">Description</TableHead>
                    <TableHead className="w-[140px]">Type</TableHead>
                    <TableHead className="w-[160px]">Class</TableHead>
                    <TableHead className="w-[120px]">Category</TableHead>
                    <TableHead className="w-[100px] text-center">Subaccounts</TableHead>
                    <TableHead className="w-[80px] text-center">FX</TableHead>
                    <TableHead className="w-[80px] text-center">Active</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {treeData && treeData.length > 0 ? (
                    flattenTree(treeData).map(({ node, isLastInGroup }, index) => {
                      const account = node.account;
                      const hasChildren = node.children.length > 0;
                      const isExpanded = expandedIds.has(account.id);
                      const paddingLeft = node.level * 24;

                      return (
                        <TableRow key={account.id} className="h-8">
                          <TableCell className="font-mono py-1">
                            <div style={{ paddingLeft: `${paddingLeft}px` }} className="flex items-center gap-1">
                              {hasChildren ? (
                                <button
                                  onClick={() => toggleExpand(account.id)}
                                  className="p-0 hover:bg-muted rounded"
                                  title={isExpanded ? "Collapse" : "Expand"}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )}
                                </button>
                              ) : (
                                <div className="w-4" /> /* Spacer for alignment */
                              )}
                              <span>{account.code}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-1">{account.name}</TableCell>
                          <TableCell className="py-1">
                            <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${getTypeColor(account.type)}`}>
                              {formatType(account.type)}
                            </span>
                          </TableCell>
                          <TableCell className="py-1">
                            {account.accountClass ? formatType(account.accountClass.replace(/_/g, ' ')) : '-'}
                          </TableCell>
                          <TableCell className="py-1 whitespace-nowrap">{account.category || '-'}</TableCell>
                          <TableCell className="text-center py-1">
                            {account.isSubaccountAllowed ? (
                              <Check className="w-4 h-4 mx-auto" />
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center py-1">
                            {account.isForeignCurrency ? (
                              <Check className="w-4 h-4 mx-auto" />
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center py-1">
                            {account.isActive ? (
                              <Check className="w-4 h-4 mx-auto text-green-600" />
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right py-1">
                            <div className="flex justify-end space-x-1">
                              <Button variant="ghost" size="sm" onClick={() => handleEditAccount(account)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteAccount(account)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No accounts found. Click "Add Account" to create your first account.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
