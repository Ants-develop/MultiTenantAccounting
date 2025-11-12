import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Upload, FileText, Trash2, Filter, Search, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { RawBankTransaction, BankAccount } from "@shared/schema";
import { format } from "date-fns";

// CSV Import Preview Dialog
function CSVImportDialog({ 
  open, 
  onOpenChange, 
  onImport,
  bankAccounts
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onImport: (transactions: any[], bankAccountId: number | null) => void;
  bankAccounts: BankAccount[];
}) {
  const [csvData, setCsvData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      alert('CSV file must have headers and at least one row');
      setIsProcessing(false);
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      return row;
    });

    setCsvData(rows);
    setIsProcessing(false);
  };

  const handleImport = () => {
    if (!selectedBankAccountId) {
      alert('Please select a bank account before importing');
      return;
    }
    onImport(csvData, parseInt(selectedBankAccountId));
    setCsvData([]);
    setSelectedBankAccountId("");
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Bank Transactions from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with transaction data. Preview and confirm before importing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Bank Account *</label>
            <Select value={selectedBankAccountId} onValueChange={setSelectedBankAccountId}>
              <SelectTrigger data-testid="select-import-bank-account">
                <SelectValue placeholder="Select bank account for these transactions" />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id.toString()}>
                    {account.accountName} - {account.accountNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              All imported transactions will be linked to this bank account
            </p>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">CSV File</label>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={isProcessing}
              data-testid="input-csv-file"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Required columns: movementId, debitCredit, amount, currency, accountNumber, uniqueTransactionId
            </p>
          </div>

          {csvData.length > 0 && (
            <div className="border rounded-lg">
              <div className="p-4 bg-muted">
                <p className="text-sm font-medium">Preview: {csvData.length} transactions</p>
              </div>
              <div className="max-h-[300px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Movement ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Currency</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Partner</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvData.slice(0, 10).map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-xs">{row.movementId}</TableCell>
                        <TableCell>
                          <Badge variant={row.debitCredit === 'DEBIT' ? 'destructive' : 'default'}>
                            {row.debitCredit}
                          </Badge>
                        </TableCell>
                        <TableCell>{row.amount}</TableCell>
                        <TableCell>{row.currency}</TableCell>
                        <TableCell className="font-mono text-xs">{row.accountNumber}</TableCell>
                        <TableCell className="text-xs">{row.partnerName || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {csvData.length > 10 && (
                <div className="p-2 text-center text-sm text-muted-foreground border-t">
                  ... and {csvData.length - 10} more transactions
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={csvData.length === 0 || isProcessing}
            data-testid="button-confirm-import"
          >
            Import {csvData.length} Transactions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ImportStatement() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [bankAccountFilter, setBankAccountFilter] = useState<string>("all");
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const { toast } = useToast();

  // Fetch bank accounts for filter
  const { data: bankAccounts = [] } = useQuery<BankAccount[]>({
    queryKey: ["/api/bank/accounts"],
  });

  // Fetch transactions with pagination
  const { data: transactionsData, isLoading } = useQuery({
    queryKey: ["/api/bank/transactions", { page, search, bankAccountId: bankAccountFilter }],
    queryFn: async ({ queryKey }) => {
      const [url, params] = queryKey as [string, any];
      const queryParams = new URLSearchParams();
      queryParams.set('page', params.page.toString());
      queryParams.set('limit', '50');
      if (params.search) queryParams.set('search', params.search);
      if (params.bankAccountId && params.bankAccountId !== 'all') queryParams.set('bankAccountId', params.bankAccountId);
      
      const response = await fetch(`${url}?${queryParams}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch transactions');
      return response.json();
    },
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async ({ transactions, bankAccountId }: { transactions: any[], bankAccountId: number | null }) => {
      return await apiRequest("POST", "/api/bank/transactions/import", { transactions, bankAccountId });
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bank/transactions"] });
      queryClient.refetchQueries({ queryKey: ["/api/bank/transactions"] });
      
      const results = response?.results || response;
      const imported = results?.imported || 0;
      const duplicates = results?.duplicates || 0;
      const errors = results?.errors || [];
      
      if (errors.length > 0) {
        // Show detailed error message
        const errorDetails = errors.slice(0, 3).map((err: any, idx: number) => {
          const fieldErrors = err.error;
          const fields = Object.keys(fieldErrors || {});
          return `Row ${idx + 1}: ${fields.join(', ')}`;
        }).join('\n');
        
        toast({
          title: "Import Completed with Errors",
          description: `Imported: ${imported}, Duplicates: ${duplicates}, Errors: ${errors.length}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Import Complete",
          description: `Successfully imported ${imported} transactions. Duplicates skipped: ${duplicates}`,
        });
      }
      
      if (imported > 0 || duplicates > 0) {
        setIsImportDialogOpen(false);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import transactions",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/bank/transactions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bank/transactions"] });
      toast({
        title: "Success",
        description: "Transaction deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete transaction",
        variant: "destructive",
      });
    },
  });

  const handleImport = (transactions: any[], bankAccountId: number | null) => {
    importMutation.mutate({ transactions, bankAccountId });
  };

  const handleDelete = (transaction: RawBankTransaction) => {
    if (confirm(`Delete transaction ${transaction.movementId}?`)) {
      deleteMutation.mutate(transaction.id);
    }
  };

  const downloadExampleCSV = () => {
    // Create example CSV with headers and sample data
    const headers = [
      'movementId',
      'uniqueTransactionId',
      'debitCredit',
      'description',
      'amount',
      'endBalance',
      'currency',
      'accountNumber',
      'accountName',
      'documentDate',
      'documentNumber',
      'partnerAccountNumber',
      'partnerName',
      'partnerTaxCode',
      'partnerBankCode',
      'partnerBank',
      'additionalInformation'
    ];

    const sampleData = [
      [
        'MOV-2024-001',
        'UNIQUE-2024-001-ACC123',
        'CREDIT',
        'Payment from customer ABC Ltd',
        '1500.00',
        '15000.00',
        'USD',
        'ACC-123456',
        'Main Business Account',
        '2024-01-15',
        'INV-2024-001',
        'PART-987654',
        'ABC Ltd',
        '123456789',
        'BANK001',
        'Partner Bank Name',
        'Invoice payment'
      ],
      [
        'MOV-2024-002',
        'UNIQUE-2024-002-ACC123',
        'DEBIT',
        'Office supplies purchase',
        '250.50',
        '14749.50',
        'USD',
        'ACC-123456',
        'Main Business Account',
        '2024-01-16',
        'BILL-2024-050',
        'SUPP-555123',
        'Office Supplies Inc',
        '987654321',
        'BANK002',
        'Supplier Bank Name',
        'Monthly supplies'
      ]
    ];

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...sampleData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'bank_transactions_example.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Example CSV Downloaded",
      description: "Use this template to format your bank transactions",
    });
  };

  const transactions = transactionsData?.data || [];
  const pagination = transactionsData?.pagination || { page: 1, totalPages: 1, total: 0 };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Import Statement</h1>
          <p className="text-muted-foreground mt-1">
            Import and manage bank transaction statements
          </p>
        </div>
        <Button 
          onClick={() => setIsImportDialogOpen(true)} 
          data-testid="button-import-csv"
        >
          <Upload className="w-4 h-4 mr-2" />
          Import CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search description, partner..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Bank Account</label>
              <Select value={bankAccountFilter} onValueChange={setBankAccountFilter}>
                <SelectTrigger data-testid="select-bank-account">
                  <SelectValue placeholder="All accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All accounts</SelectItem>
                  {bankAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      {account.accountName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Transactions ({pagination.total})</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                data-testid="button-prev-page"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={page >= pagination.totalPages}
                data-testid="button-next-page"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading transactions...
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No transactions found</h3>
              <p className="text-muted-foreground mb-4">
                Import your first bank statement to get started
              </p>
              <div className="flex gap-3 justify-center">
                <Button 
                  variant="outline" 
                  onClick={downloadExampleCSV}
                  data-testid="button-download-example"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Example CSV
                </Button>
                <Button onClick={() => setIsImportDialogOpen(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Import CSV
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Movement ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Partner</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx: RawBankTransaction) => (
                    <TableRow key={tx.id} data-testid={`row-transaction-${tx.id}`}>
                      <TableCell className="text-sm">
                        {tx.documentDate ? format(new Date(tx.documentDate), 'MMM dd, yyyy') : '-'}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{tx.movementId}</TableCell>
                      <TableCell>
                        <Badge variant={tx.debitCredit === 'DEBIT' ? 'destructive' : 'default'}>
                          {tx.debitCredit}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={tx.description || ''}>
                        {tx.description || '-'}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate" title={tx.partnerName || ''}>
                        {tx.partnerName || '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {parseFloat(tx.amount).toFixed(2)} {tx.currency}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {tx.endBalance ? parseFloat(tx.endBalance).toFixed(2) : '-'}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{tx.accountNumber}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(tx)}
                            data-testid={`button-delete-${tx.id}`}
                          >
                            <Trash2 className="w-3 h-3" />
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

      <CSVImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        onImport={handleImport}
        bankAccounts={bankAccounts}
      />
    </div>
  );
}

