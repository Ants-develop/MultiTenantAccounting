import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCompany } from "@/hooks/useCompany";
import { Plus, Receipt, DollarSign, Clock, CreditCard } from "lucide-react";

interface Bill {
  id: number;
  number: string;
  vendorId: number;
  vendorName: string;
  date: string;
  dueDate: string;
  amount: number;
  status: 'draft' | 'pending' | 'paid' | 'overdue';
  description?: string;
}

export default function AccountsPayable() {
  const { currentCompany } = useCompany();

  // Fetch bills
  const { data: bills, isLoading: billsLoading } = useQuery<Bill[]>({
    queryKey: ['/api/bills'],
    enabled: !!currentCompany,
  });

  // Calculate summary metrics
  const totalPayable = (bills || []).reduce((sum, bill) => 
    bill.status !== 'paid' ? sum + bill.amount : sum, 0
  );
  
  const overdueAmount = (bills || []).reduce((sum, bill) => 
    bill.status === 'overdue' ? sum + bill.amount : sum, 0
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: 'Draft', variant: 'secondary' as const },
      pending: { label: 'Pending', variant: 'default' as const },
      paid: { label: 'Paid', variant: 'outline' as const },
      overdue: { label: 'Overdue', variant: 'destructive' as const },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (!currentCompany) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-foreground">No Company Selected</h3>
          <p className="text-muted-foreground">Please select a company to view accounts payable.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Accounts Payable</h1>
          <p className="text-muted-foreground">
            Manage vendor bills and payments
          </p>
        </div>
        <div className="flex space-x-2">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Bill
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CreditCard className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Payable</p>
                <p className="text-2xl font-bold">{formatCurrency(totalPayable)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Overdue Amount</p>
                <p className="text-2xl font-bold">{formatCurrency(overdueAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Receipt className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Outstanding Bills</p>
                <p className="text-2xl font-bold">{(bills || []).filter(b => b.status !== 'paid').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bills Table */}
      <Card>
        <CardHeader>
          <CardTitle>Outstanding Bills</CardTitle>
        </CardHeader>
        <CardContent>
          {billsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading bills...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill #</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(bills || []).filter(bill => bill.status !== 'paid').map((bill) => (
                  <TableRow key={bill.id}>
                    <TableCell className="font-medium">{bill.number}</TableCell>
                    <TableCell>{bill.vendorName}</TableCell>
                    <TableCell>{formatDate(bill.date)}</TableCell>
                    <TableCell>{formatDate(bill.dueDate)}</TableCell>
                    <TableCell>{formatCurrency(bill.amount)}</TableCell>
                    <TableCell>{getStatusBadge(bill.status)}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">
                          Pay Bill
                        </Button>
                        <Button size="sm" variant="ghost">
                          View
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(bills || []).filter(b => b.status !== 'paid').length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No outstanding bills found.
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
