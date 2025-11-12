import { useState, useEffect } from "react";
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
import { Plus, Edit, Eye, Send, Trash2 } from "lucide-react";
import { useCompany } from "@/hooks/useCompany";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { usePageActions } from "@/hooks/usePageActions";

interface Customer {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  status: string;
  customerId: number;
  createdAt: string;
}

const invoiceSchema = z.object({
  customerId: z.number().min(1, "Customer is required"),
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  date: z.string().min(1, "Date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  subtotal: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, "Must be a valid positive number"),
  taxAmount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, "Must be a valid positive number"),
  totalAmount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, "Must be a valid positive number"),
});

type InvoiceForm = z.infer<typeof invoiceSchema>;

export default function Invoices() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const { currentCompany } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { registerTrigger } = usePageActions();

  const { data: invoices, isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ['/api/invoices'],
    enabled: !!currentCompany,
  });

  const { data: customers, isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
    enabled: !!currentCompany,
  });

  const form = useForm<InvoiceForm>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      customerId: 0,
      invoiceNumber: "",
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      subtotal: "0.00",
      taxAmount: "0.00",
      totalAmount: "0.00",
    },
  });

  const customerForm = useForm({
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
    },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: (data: InvoiceForm) => apiRequest('POST', '/api/invoices', {
      ...data,
      date: new Date(data.date).toISOString(),
      dueDate: new Date(data.dueDate).toISOString(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Invoice created",
        description: "The invoice has been successfully created.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice",
        variant: "destructive",
      });
    },
  });

  const createCustomerMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/customers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      setIsCustomerDialogOpen(false);
      customerForm.reset();
      toast({
        title: "Customer created",
        description: "The customer has been successfully created.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create customer",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InvoiceForm) => {
    createInvoiceMutation.mutate(data);
  };

  const onCustomerSubmit = (data: any) => {
    createCustomerMutation.mutate(data);
  };

  const calculateTotal = () => {
    const subtotal = parseFloat(form.watch("subtotal") || "0");
    const taxAmount = parseFloat(form.watch("taxAmount") || "0");
    const total = subtotal + taxAmount;
    form.setValue("totalAmount", total.toFixed(2));
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'draft':
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Register the action for this page
  useEffect(() => {
    registerTrigger('newInvoice', () => {
      setIsDialogOpen(true);
    });
  }, [registerTrigger]);

  if (!currentCompany) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-foreground">No Company Selected</h3>
          <p className="text-muted-foreground">Please select a company to manage invoices.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
          <p className="text-muted-foreground">
            Create and manage customer invoices
          </p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                New Customer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Customer</DialogTitle>
              </DialogHeader>
              <form onSubmit={customerForm.handleSubmit(onCustomerSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Customer Name</Label>
                  <Input
                    id="customerName"
                    {...customerForm.register("name")}
                    placeholder="Enter customer name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerEmail">Email</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    {...customerForm.register("email")}
                    placeholder="customer@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerPhone">Phone</Label>
                  <Input
                    id="customerPhone"
                    {...customerForm.register("phone")}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerAddress">Address</Label>
                  <Textarea
                    id="customerAddress"
                    {...customerForm.register("address")}
                    placeholder="Enter customer address"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCustomerDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createCustomerMutation.isPending}>
                    {createCustomerMutation.isPending ? "Creating..." : "Create Customer"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Invoice</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="invoiceNumber">Invoice Number</Label>
                    <Input
                      id="invoiceNumber"
                      {...form.register("invoiceNumber")}
                      placeholder="INV-001"
                    />
                    {form.formState.errors.invoiceNumber && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.invoiceNumber.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerId">Customer</Label>
                    <Select
                      value={form.watch("customerId").toString()}
                      onValueChange={(value) => form.setValue("customerId", parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers?.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id.toString()}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.customerId && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.customerId.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Invoice Date</Label>
                    <Input
                      id="date"
                      type="date"
                      {...form.register("date")}
                    />
                    {form.formState.errors.date && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.date.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      {...form.register("dueDate")}
                    />
                    {form.formState.errors.dueDate && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.dueDate.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="subtotal">Subtotal</Label>
                    <Input
                      id="subtotal"
                      type="number"
                      step="0.01"
                      {...form.register("subtotal")}
                      onChange={(e) => {
                        form.setValue("subtotal", e.target.value);
                        setTimeout(calculateTotal, 0);
                      }}
                      placeholder="0.00"
                    />
                    {form.formState.errors.subtotal && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.subtotal.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="taxAmount">Tax Amount</Label>
                    <Input
                      id="taxAmount"
                      type="number"
                      step="0.01"
                      {...form.register("taxAmount")}
                      onChange={(e) => {
                        form.setValue("taxAmount", e.target.value);
                        setTimeout(calculateTotal, 0);
                      }}
                      placeholder="0.00"
                    />
                    {form.formState.errors.taxAmount && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.taxAmount.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="totalAmount">Total Amount</Label>
                    <Input
                      id="totalAmount"
                      type="number"
                      step="0.01"
                      {...form.register("totalAmount")}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createInvoiceMutation.isPending}>
                    {createInvoiceMutation.isPending ? "Creating..." : "Create Invoice"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {invoicesLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading invoices...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices && invoices.length > 0 ? (
                  invoices.map((invoice) => {
                    const customer = customers?.find(c => c.id === invoice.customerId);
                    return (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono">{invoice.invoiceNumber}</TableCell>
                        <TableCell>{customer?.name || 'Unknown Customer'}</TableCell>
                        <TableCell>{formatDate(invoice.date)}</TableCell>
                        <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(invoice.status)}>
                            {formatStatus(invoice.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(invoice.totalAmount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button variant="ghost" size="sm" title="View Invoice">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" title="Edit Invoice">
                              <Edit className="w-4 h-4" />
                            </Button>
                            {invoice.status === 'draft' && (
                              <Button variant="ghost" size="sm" title="Send Invoice">
                                <Send className="w-4 h-4" />
                              </Button>
                            )}
                            {invoice.status === 'draft' && (
                              <Button variant="ghost" size="sm" className="text-destructive" title="Delete Invoice">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No invoices found. Create your first invoice to get started.
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
