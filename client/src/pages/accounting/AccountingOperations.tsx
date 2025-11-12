import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Save, X, ChevronUp, ChevronDown, Calendar, Clock, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { usePageActions } from "@/hooks/usePageActions";

interface Account {
  id: number;
  code: string;
  name: string;
  type: string;
}

interface Customer {
  id: number;
  name: string;
  code: string;
}

interface Vendor {
  id: number;
  name: string;
  code: string;
}

interface JournalEntry {
  id: number;
  entryNumber: string;
  date: string;
  description: string;
  reference: string | null;
  totalAmount: string;
  isPosted: boolean;
  createdAt: string;
}

interface JournalEntryLine {
  id: number;
  accountId: number;
  description: string | null;
  debitAmount: string;
  creditAmount: string;
  debitAnalytics?: any;
  creditAnalytics?: any;
}

// Analytics selection modal component
interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (analytics: any) => void;
  accountType: 'debit' | 'credit';
  accountId: number;
}

function AnalyticsModal({ isOpen, onClose, onSelect, accountType, accountId }: AnalyticsModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("customers");
  
  const { data: customers } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
    enabled: isOpen && selectedTab === "customers",
  });

  const { data: vendors } = useQuery<Vendor[]>({
    queryKey: ['/api/vendors'],
    enabled: isOpen && selectedTab === "vendors",
  });

  const handleSelect = (item: any) => {
    onSelect({
      type: selectedTab,
      id: item.id,
      name: item.name,
      code: item.code,
    });
    onClose();
  };

  const filteredItems = () => {
    const items = selectedTab === "customers" ? customers : vendors;
    if (!items) return [];
    
    return items.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Additional Analytics Form</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex space-x-2 border-b">
            <Button
              variant={selectedTab === "customers" ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedTab("customers")}
            >
              Customers
            </Button>
            <Button
              variant={selectedTab === "vendors" ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedTab("vendors")}
            >
              Vendors
            </Button>
          </div>

          {/* Search */}
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Button variant="outline" size="sm">
              <Search className="w-4 h-4" />
            </Button>
          </div>

          {/* Analytics List */}
          <div className="border rounded-lg max-h-60 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems().map((item) => (
                  <TableRow 
                    key={item.id} 
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => handleSelect(item)}
                  >
                    <TableCell className="font-mono">{item.code}</TableCell>
                    <TableCell>{item.name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onClose}>
              OK
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const journalEntryLineSchema = z.object({
  accountId: z.number().min(1, "Account is required"),
  description: z.string().optional(),
  debitAmount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, "Must be a valid positive number"),
  creditAmount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, "Must be a valid positive number"),
  debitAnalytics: z.any().optional(),
  creditAnalytics: z.any().optional(),
});

const journalEntrySchema = z.object({
  entryNumber: z.string().min(1, "Entry number is required"),
  date: z.string().min(1, "Date is required"),
  description: z.string().min(1, "Description is required"),
  reference: z.string().optional(),
  lines: z.array(journalEntryLineSchema).min(2, "At least 2 lines are required").refine(
    (lines) => {
      const totalDebits = lines.reduce((sum, line) => sum + parseFloat(line.debitAmount || '0'), 0);
      const totalCredits = lines.reduce((sum, line) => sum + parseFloat(line.creditAmount || '0'), 0);
      return Math.abs(totalDebits - totalCredits) < 0.01;
    },
    "Total debits must equal total credits"
  ),
});

type JournalEntryForm = z.infer<typeof journalEntrySchema>;

export default function AccountingOperations() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [analyticsModal, setAnalyticsModal] = useState<{
    isOpen: boolean;
    accountType: 'debit' | 'credit';
    lineIndex: number;
  }>({ isOpen: false, accountType: 'debit', lineIndex: 0 });
  
  const { companies } = useAuth();
  const currentCompany = companies?.[0] || null;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { registerTrigger } = usePageActions();

  // Register the action for this page
  useEffect(() => {
    registerTrigger('newAccountingOperation', () => {
      setIsDialogOpen(true);
    });
  }, [registerTrigger]);

  const { data: journalEntries, isLoading: entriesLoading } = useQuery<JournalEntry[]>({
    queryKey: ['/api/journal-entries'],
    enabled: !!currentCompany,
  });

  const { data: accounts, isLoading: accountsLoading } = useQuery<Account[]>({
    queryKey: ['/api/accounts'],
    enabled: !!currentCompany,
  });

  const form = useForm<JournalEntryForm>({
    resolver: zodResolver(journalEntrySchema),
    defaultValues: {
      entryNumber: "",
      date: new Date().toISOString().split('T')[0],
      description: "",
      reference: "",
      lines: [
        { accountId: 0, description: "", debitAmount: "0.00", creditAmount: "0.00" },
        { accountId: 0, description: "", debitAmount: "0.00", creditAmount: "0.00" },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  const createEntryMutation = useMutation({
    mutationFn: async (data: JournalEntryForm) => {
      const totalAmount = data.lines.reduce((sum, line) => sum + parseFloat(line.debitAmount || '0'), 0);
      
      const entryResponse = await apiRequest('POST', '/api/journal-entries', {
        entryNumber: data.entryNumber,
        date: new Date(data.date).toISOString(),
        description: data.description,
        reference: data.reference || null,
        totalAmount: totalAmount.toString(),
      });
      
      const entry = await entryResponse.json();
      
      // Create journal entry lines
      for (const line of data.lines) {
        if (line.accountId && (parseFloat(line.debitAmount) > 0 || parseFloat(line.creditAmount) > 0)) {
          await apiRequest('POST', '/api/journal-entry-lines', {
            journalEntryId: entry.id,
            accountId: line.accountId,
            description: line.description || null,
            debitAmount: line.debitAmount,
            creditAmount: line.creditAmount,
          });
        }
      }
      
      return entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/journal-entries'] });
      setIsDialogOpen(false);
      setEditingEntry(null);
      form.reset();
      toast({
        title: "Accounting operation created",
        description: "The accounting operation has been successfully created.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create accounting operation",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: JournalEntryForm) => {
    createEntryMutation.mutate(data);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingEntry(null);
    form.reset();
  };

  const addLine = () => {
    append({ accountId: 0, description: "", debitAmount: "0.00", creditAmount: "0.00" });
  };

  const moveLineUp = (index: number) => {
    if (index > 0) {
      const lines = form.getValues("lines");
      const newLines = [...lines];
      [newLines[index], newLines[index - 1]] = [newLines[index - 1], newLines[index]];
      form.setValue("lines", newLines);
    }
  };

  const moveLineDown = (index: number) => {
    const lines = form.getValues("lines");
    if (index < lines.length - 1) {
      const newLines = [...lines];
      [newLines[index], newLines[index + 1]] = [newLines[index + 1], newLines[index]];
      form.setValue("lines", newLines);
    }
  };

  const openAnalyticsModal = (accountType: 'debit' | 'credit', lineIndex: number) => {
    setAnalyticsModal({ isOpen: true, accountType, lineIndex });
  };

  const handleAnalyticsSelect = (analytics: any) => {
    const { lineIndex, accountType } = analyticsModal;
    const fieldName = accountType === 'debit' ? 'debitAnalytics' : 'creditAnalytics';
    form.setValue(`lines.${lineIndex}.${fieldName}`, analytics);
    setAnalyticsModal({ isOpen: false, accountType: 'debit', lineIndex: 0 });
  };

  const calculateTotals = () => {
    const lines = form.watch("lines");
    const totalDebits = lines.reduce((sum, line) => sum + parseFloat(line.debitAmount || '0'), 0);
    const totalCredits = lines.reduce((sum, line) => sum + parseFloat(line.creditAmount || '0'), 0);
    return { totalDebits, totalCredits };
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(parseFloat(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (!currentCompany) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-foreground">No Company Selected</h3>
          <p className="text-muted-foreground">Please select a company to manage accounting operations.</p>
        </div>
      </div>
    );
  }

  const { totalDebits, totalCredits } = calculateTotals();
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Accounting Operations</h1>
          <p className="text-muted-foreground">
            Create and manage manual accounting entries
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Operation
        </Button>
      </div>

      {/* Main Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Accounting Operation (Create)</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            {/* Top Action Bar */}
            <div className="flex items-center justify-between p-4 border-b bg-muted/50">
              <div className="flex items-center space-x-4">
                <Button type="submit" disabled={createEntryMutation.isPending || !isBalanced}>
                  <Save className="w-4 h-4 mr-2" />
                  Post and Close
                </Button>
                <Button type="button" variant="outline">
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
                <Button type="button" variant="outline">
                  Post
                </Button>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <Input
                    type="datetime-local"
                    {...form.register("date")}
                    className="w-48"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm text-muted-foreground">Dr Cr</span>
                </div>
              </div>
            </div>

            {/* Operation Description */}
            <div className="p-4 border-b">
              <div className="space-y-2">
                <Label htmlFor="description">Operation:</Label>
                <Input
                  id="description"
                  {...form.register("description")}
                  placeholder="Enter operation description"
                />
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Left Panel - Entry Table */}
              <div className="flex-1 p-4 border-r">
                <div className="space-y-4">
                  {/* Add Button */}
                  <div className="flex items-center space-x-2">
                    <Button type="button" variant="outline" size="sm" onClick={addLine}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add
                    </Button>
                    <Button type="button" variant="ghost" size="sm">
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="sm">
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Entry Table */}
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">N</TableHead>
                          <TableHead>Account Dr</TableHead>
                          <TableHead>Analytics Dr</TableHead>
                          <TableHead className="w-24">Quantity Dr</TableHead>
                          <TableHead>Account Cr</TableHead>
                          <TableHead>Analytics Cr</TableHead>
                          <TableHead className="w-24">Quantity Cr</TableHead>
                          <TableHead className="w-20">Currency</TableHead>
                          <TableHead className="w-24">Rate</TableHead>
                          <TableHead className="w-32">Amount</TableHead>
                          <TableHead>Content</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fields.map((field, index) => (
                          <TableRow key={field.id}>
                            <TableCell className="text-center">{index + 1}</TableCell>
                            
                            {/* Debit Account */}
                            <TableCell>
                              <Select
                                value={form.watch(`lines.${index}.accountId`).toString()}
                                onValueChange={(value) => form.setValue(`lines.${index}.accountId`, parseInt(value))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Account" />
                                </SelectTrigger>
                                <SelectContent>
                                  {accounts?.map((account) => (
                                    <SelectItem key={account.id} value={account.id.toString()}>
                                      {account.code} - {account.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            
                            {/* Debit Analytics */}
                            <TableCell>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => openAnalyticsModal('debit', index)}
                                className="w-full justify-start"
                              >
                                {form.watch(`lines.${index}.debitAnalytics`)?.name || "Select Analytics"}
                              </Button>
                            </TableCell>
                            
                            {/* Debit Quantity */}
                            <TableCell>
                              <Input
                                {...form.register(`lines.${index}.debitAmount`)}
                                type="number"
                                step="0.01"
                                min="0"
                                className="text-right"
                                placeholder="0.00"
                              />
                            </TableCell>
                            
                            {/* Credit Account */}
                            <TableCell>
                              <Select
                                value={form.watch(`lines.${index}.accountId`).toString()}
                                onValueChange={(value) => form.setValue(`lines.${index}.accountId`, parseInt(value))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Account" />
                                </SelectTrigger>
                                <SelectContent>
                                  {accounts?.map((account) => (
                                    <SelectItem key={account.id} value={account.id.toString()}>
                                      {account.code} - {account.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            
                            {/* Credit Analytics */}
                            <TableCell>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => openAnalyticsModal('credit', index)}
                                className="w-full justify-start"
                              >
                                {form.watch(`lines.${index}.creditAnalytics`)?.name || "Select Analytics"}
                              </Button>
                            </TableCell>
                            
                            {/* Credit Quantity */}
                            <TableCell>
                              <Input
                                {...form.register(`lines.${index}.creditAmount`)}
                                type="number"
                                step="0.01"
                                min="0"
                                className="text-right"
                                placeholder="0.00"
                              />
                            </TableCell>
                            
                            {/* Currency */}
                            <TableCell>
                              <Select defaultValue="USD">
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="USD">USD</SelectItem>
                                  <SelectItem value="EUR">EUR</SelectItem>
                                  <SelectItem value="GEL">GEL</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            
                            {/* Rate */}
                            <TableCell>
                              <Input
                                type="number"
                                step="0.0001"
                                defaultValue="1.0000"
                                className="text-right"
                              />
                            </TableCell>
                            
                            {/* Amount */}
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                className="text-right"
                                placeholder="0.00"
                              />
                            </TableCell>
                            
                            {/* Content */}
                            <TableCell>
                              <Input
                                {...form.register(`lines.${index}.description`)}
                                placeholder="Content"
                              />
                            </TableCell>
                            
                            {/* Actions */}
                            <TableCell>
                              {fields.length > 2 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => remove(index)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Total Amount */}
                  <div className="flex justify-end">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total Amount</p>
                      <p className="text-lg font-bold">{formatCurrency(totalDebits.toString())}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Panel - Details */}
              <div className="w-80 p-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="key">Key</Label>
                  <Input id="key" placeholder="Key" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="author">Author</Label>
                  <Input id="author" placeholder="Author" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="comments">Comments</Label>
                  <Textarea
                    id="comments"
                    placeholder="Enter comments"
                    rows={4}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="primaryDocument">Primary Document</Label>
                  <Input id="primaryDocument" placeholder="Primary Document" />
                </div>
              </div>
            </div>

            {/* Analytics Display Section */}
            <div className="p-4 border-t bg-muted/30">
              <h3 className="text-sm font-medium mb-2">Selected Analytics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-1">Debit Analytics</h4>
                  <div className="space-y-1">
                    {form.watch("lines").map((line, index) => (
                      line.debitAnalytics && (
                        <div key={index} className="text-xs">
                          <span className="font-medium">{line.debitAnalytics.type}:</span> {line.debitAnalytics.name}
                        </div>
                      )
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-1">Credit Analytics</h4>
                  <div className="space-y-1">
                    {form.watch("lines").map((line, index) => (
                      line.creditAnalytics && (
                        <div key={index} className="text-xs">
                          <span className="font-medium">{line.creditAnalytics.type}:</span> {line.creditAnalytics.name}
                        </div>
                      )
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Analytics Modal */}
      <AnalyticsModal
        isOpen={analyticsModal.isOpen}
        onClose={() => setAnalyticsModal({ isOpen: false, accountType: 'debit', lineIndex: 0 })}
        onSelect={handleAnalyticsSelect}
        accountType={analyticsModal.accountType}
        accountId={0}
      />

      {/* Entries List */}
      <Card>
        <CardHeader>
          <CardTitle>Accounting Operations</CardTitle>
        </CardHeader>
        <CardContent>
          {entriesLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading operations...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Entry Number</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {journalEntries && journalEntries.length > 0 ? (
                  journalEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{formatDate(entry.date)}</TableCell>
                      <TableCell className="font-mono">{entry.entryNumber}</TableCell>
                      <TableCell>{entry.description}</TableCell>
                      <TableCell>{entry.reference || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={entry.isPosted ? "default" : "secondary"}>
                          {entry.isPosted ? "Posted" : "Draft"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(entry.totalAmount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          {!entry.isPosted && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No accounting operations found. Create your first operation to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
