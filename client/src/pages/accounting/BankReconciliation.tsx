import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Banknote, CheckCircle, AlertCircle, DollarSign, Calendar } from "lucide-react";

interface BankTransaction {
  id: number;
  date: string;
  description: string;
  amount: number;
  type: 'deposit' | 'withdrawal';
  matched: boolean;
  journalEntryId?: number;
}

interface JournalEntry {
  id: number;
  date: string;
  reference: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  matched: boolean;
  bankTransactionId?: number;
}

export default function BankReconciliation() {
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [reconciliationDate, setReconciliationDate] = useState(new Date().toISOString().split('T')[0]);
  const [bankStatementBalance, setBankStatementBalance] = useState("");
  const [selectedBankTransactions, setSelectedBankTransactions] = useState<Set<number>>(new Set());
  const [selectedJournalEntries, setSelectedJournalEntries] = useState<Set<number>>(new Set());
  
  const { companies } = useAuth();
  const currentCompany = companies?.[0] || null;

  // Mock data - in a real app, this would come from the API
  const bankTransactions: BankTransaction[] = [
    {
      id: 1,
      date: '2024-01-15',
      description: 'Customer Payment - Invoice #INV-001',
      amount: 1500.00,
      type: 'deposit',
      matched: false,
    },
    {
      id: 2,
      date: '2024-01-16',
      description: 'Office Supplies Purchase',
      amount: -350.00,
      type: 'withdrawal',
      matched: false,
    },
    {
      id: 3,
      date: '2024-01-17',
      description: 'Vendor Payment - Acme Corp',
      amount: -2200.00,
      type: 'withdrawal',
      matched: true,
    },
    {
      id: 4,
      date: '2024-01-18',
      description: 'Customer Payment - Invoice #INV-005',
      amount: 850.00,
      type: 'deposit',
      matched: false,
    },
  ];

  const journalEntries: JournalEntry[] = [
    {
      id: 1,
      date: '2024-01-15',
      reference: 'JE-001',
      description: 'Customer Payment Received',
      amount: 1500.00,
      type: 'debit',
      matched: false,
    },
    {
      id: 2,
      date: '2024-01-16',
      reference: 'JE-002',
      description: 'Office Supplies Expense',
      amount: 350.00,
      type: 'credit',
      matched: false,
    },
    {
      id: 3,
      date: '2024-01-17',
      reference: 'JE-003',
      description: 'Vendor Payment Made',
      amount: 2200.00,
      type: 'credit',
      matched: true,
    },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Calculate reconciliation summary
  const unmatchedBankTransactions = bankTransactions.filter(t => !t.matched);
  const unmatchedJournalEntries = journalEntries.filter(e => !e.matched);
  
  const bankBalance = bankTransactions.reduce((sum, transaction) => {
    return sum + transaction.amount;
  }, parseFloat(bankStatementBalance) || 0);

  const bookBalance = journalEntries.reduce((sum, entry) => {
    return entry.type === 'debit' ? sum + entry.amount : sum - entry.amount;
  }, 0);

  const difference = bankBalance - bookBalance;

  const handleBankTransactionSelect = (transactionId: number, checked: boolean) => {
    const newSelected = new Set(selectedBankTransactions);
    if (checked) {
      newSelected.add(transactionId);
    } else {
      newSelected.delete(transactionId);
    }
    setSelectedBankTransactions(newSelected);
  };

  const handleJournalEntrySelect = (entryId: number, checked: boolean) => {
    const newSelected = new Set(selectedJournalEntries);
    if (checked) {
      newSelected.add(entryId);
    } else {
      newSelected.delete(entryId);
    }
    setSelectedJournalEntries(newSelected);
  };

  if (!currentCompany) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-foreground">No Company Selected</h3>
          <p className="text-muted-foreground">Please select a company to perform bank reconciliation.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bank Reconciliation</h1>
          <p className="text-muted-foreground">
            Reconcile bank statements with accounting records
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            Import Bank Statement
          </Button>
          <Button>
            Start Reconciliation
          </Button>
        </div>
      </div>

      {/* Reconciliation Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Reconciliation Setup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reconciliation-date">Reconciliation Date</Label>
              <Input
                id="reconciliation-date"
                type="date"
                value={reconciliationDate}
                onChange={(e) => setReconciliationDate(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bank-balance">Bank Statement Balance</Label>
              <Input
                id="bank-balance"
                type="number"
                step="0.01"
                value={bankStatementBalance}
                onChange={(e) => setBankStatementBalance(e.target.value)}
                placeholder="Enter ending balance"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="account">Bank Account</Label>
              <Input
                id="account"
                value="Primary Checking Account"
                disabled
                placeholder="Select bank account"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Banknote className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Bank Balance</p>
                <p className="text-2xl font-bold">{formatCurrency(bankBalance)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Book Balance</p>
                <p className="text-2xl font-bold">{formatCurrency(bookBalance)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertCircle className={`h-8 w-8 ${Math.abs(difference) < 0.01 ? 'text-green-600' : 'text-red-600'}`} />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Difference</p>
                <p className={`text-2xl font-bold ${Math.abs(difference) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(difference)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Unmatched Items</p>
                <p className="text-2xl font-bold">
                  {unmatchedBankTransactions.length + unmatchedJournalEntries.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reconciliation Tables */}
      <Tabs defaultValue="bank-transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="bank-transactions">
            Bank Transactions ({unmatchedBankTransactions.length} unmatched)
          </TabsTrigger>
          <TabsTrigger value="journal-entries">
            Journal Entries ({unmatchedJournalEntries.length} unmatched)
          </TabsTrigger>
          <TabsTrigger value="matched">
            Matched Items
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bank-transactions">
          <Card>
            <CardHeader>
              <CardTitle>Bank Statement Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bankTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedBankTransactions.has(transaction.id)}
                          onCheckedChange={(checked) => 
                            handleBankTransactionSelect(transaction.id, checked as boolean)
                          }
                          disabled={transaction.matched}
                        />
                      </TableCell>
                      <TableCell>{formatDate(transaction.date)}</TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell className={transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(Math.abs(transaction.amount))}
                      </TableCell>
                      <TableCell>
                        <Badge variant={transaction.type === 'deposit' ? 'default' : 'secondary'}>
                          {transaction.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={transaction.matched ? 'outline' : 'secondary'}>
                          {transaction.matched ? 'Matched' : 'Unmatched'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="journal-entries">
          <Card>
            <CardHeader>
              <CardTitle>Journal Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {journalEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedJournalEntries.has(entry.id)}
                          onCheckedChange={(checked) => 
                            handleJournalEntrySelect(entry.id, checked as boolean)
                          }
                          disabled={entry.matched}
                        />
                      </TableCell>
                      <TableCell>{formatDate(entry.date)}</TableCell>
                      <TableCell className="font-medium">{entry.reference}</TableCell>
                      <TableCell>{entry.description}</TableCell>
                      <TableCell className={entry.type === 'debit' ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(entry.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={entry.type === 'debit' ? 'default' : 'secondary'}>
                          {entry.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={entry.matched ? 'outline' : 'secondary'}>
                          {entry.matched ? 'Matched' : 'Unmatched'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matched">
          <Card>
            <CardHeader>
              <CardTitle>Matched Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4" />
                <p>Matched transactions will appear here</p>
                <p className="text-sm">Select transactions from both tabs to match them</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <div className="flex space-x-2">
          <Button 
            variant="outline"
            disabled={selectedBankTransactions.size === 0 || selectedJournalEntries.size === 0}
          >
            Match Selected Items
          </Button>
          <Button variant="outline">
            Add Adjustment Entry
          </Button>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline">
            Save Draft
          </Button>
          <Button 
            disabled={Math.abs(difference) >= 0.01}
            className={Math.abs(difference) < 0.01 ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            Complete Reconciliation
          </Button>
        </div>
      </div>
    </div>
  );
}
