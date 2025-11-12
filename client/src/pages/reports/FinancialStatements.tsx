import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { FileText, Download, Printer, Calendar } from "lucide-react";
import { useCompany } from "@/hooks/useCompany";
import { useToast } from "@/hooks/use-toast";

interface Account {
  id: number;
  code: string;
  name: string;
  type: string;
  subType: string | null;
}

interface FinancialStatementAccount {
  type: string;
  subType: string | null;
  name: string;
  amount: number;
}

interface FinancialStatementData {
  type: string;
  accounts: FinancialStatementAccount[];
}

interface TrialBalanceAccount {
  id: number;
  code: string;
  name: string;
  type: string;
  debitBalance: number;
  creditBalance: number;
}

interface TrialBalanceData {
  accounts: TrialBalanceAccount[];
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
}

export default function FinancialStatements() {
  const [reportType, setReportType] = useState("profit-loss");
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const { currentCompany } = useCompany();
  const { toast } = useToast();

  const { data: accounts, isLoading: accountsLoading } = useQuery<Account[]>({
    queryKey: ['/api/accounts'],
    enabled: !!currentCompany,
  });

  const { data: financialData, isLoading: financialLoading } = useQuery<FinancialStatementData>({
    queryKey: ['/api/reports/financial-statements', reportType, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        type: reportType,
        startDate,
        endDate,
      });
      const response = await fetch(`/api/reports/financial-statements?${params}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch financial statements');
      }
      return response.json();
    },
    enabled: !!currentCompany && (reportType === 'profit-loss' || reportType === 'balance-sheet'),
  });

  const { data: trialBalanceData, isLoading: trialBalanceLoading } = useQuery<TrialBalanceData>({
    queryKey: ['/api/reports/trial-balance', endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        date: endDate,
      });
      const response = await fetch(`/api/reports/trial-balance?${params}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch trial balance');
      }
      return response.json();
    },
    enabled: !!currentCompany && reportType === 'trial-balance',
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderProfitLoss = () => {
    if (!financialData || financialLoading) {
      return (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading profit & loss statement...</p>
        </div>
      );
    }

    // Group accounts by type and subtype
    const revenueAccounts = financialData.accounts.filter(acc => acc.type === 'revenue');
    const expenseAccounts = financialData.accounts.filter(acc => acc.type === 'expense');
    
    const totalRevenue = revenueAccounts.reduce((sum, acc) => sum + acc.amount, 0);
    const totalExpenses = expenseAccounts.reduce((sum, acc) => sum + acc.amount, 0);
    const netIncome = totalRevenue - totalExpenses;

    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">{currentCompany?.name}</h2>
          <h3 className="text-xl font-semibold">Profit & Loss Statement</h3>
          <p className="text-muted-foreground">
            For the period {formatDate(startDate)} to {formatDate(endDate)}
          </p>
        </div>

        <div className="space-y-6">
          {/* Revenue Section */}
          <div>
            <h4 className="font-semibold text-lg mb-3">Revenue</h4>
            <Table>
              <TableBody>
                {revenueAccounts.map((account, index) => (
                  <TableRow key={index}>
                    <TableCell className="pl-4">{account.name}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(account.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-2 pt-2 border-t">
              <div className="flex justify-between font-semibold">
                <span>Total Revenue</span>
                <span>{formatCurrency(totalRevenue)}</span>
              </div>
            </div>
          </div>

          {/* Expenses Section */}
          <div>
            <h4 className="font-semibold text-lg mb-3">Expenses</h4>
            <Table>
              <TableBody>
                {expenseAccounts.map((account, index) => (
                  <TableRow key={index}>
                    <TableCell className="pl-4">{account.name}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(account.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-2 pt-2 border-t">
              <div className="flex justify-between font-semibold">
                <span>Total Expenses</span>
                <span>{formatCurrency(totalExpenses)}</span>
              </div>
            </div>
          </div>

          {/* Net Income */}
          <div className="mt-4 pt-4 border-t-2 border-black">
            <div className="flex justify-between font-bold text-lg">
              <span>Net Income</span>
              <span className={netIncome >= 0 ? 'text-green-600' : 'text-red-600'}>
                {formatCurrency(netIncome)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderBalanceSheet = () => {
    if (!financialData || financialLoading) {
      return (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading balance sheet...</p>
        </div>
      );
    }

    // Group accounts by type and subtype
    const assetAccounts = financialData.accounts.filter(acc => acc.type === 'asset');
    const liabilityAccounts = financialData.accounts.filter(acc => acc.type === 'liability');
    const equityAccounts = financialData.accounts.filter(acc => acc.type === 'equity');
    
    const totalAssets = assetAccounts.reduce((sum, acc) => sum + acc.amount, 0);
    const totalLiabilities = liabilityAccounts.reduce((sum, acc) => sum + acc.amount, 0);
    const totalEquity = equityAccounts.reduce((sum, acc) => sum + acc.amount, 0);

    // Group by subtype
    const groupedAssets = assetAccounts.reduce((acc, account) => {
      const subType = account.subType || 'Other Assets';
      if (!acc[subType]) acc[subType] = [];
      acc[subType].push(account);
      return acc;
    }, {} as Record<string, FinancialStatementAccount[]>);

    const groupedLiabilities = liabilityAccounts.reduce((acc, account) => {
      const subType = account.subType || 'Other Liabilities';
      if (!acc[subType]) acc[subType] = [];
      acc[subType].push(account);
      return acc;
    }, {} as Record<string, FinancialStatementAccount[]>);

    const groupedEquity = equityAccounts.reduce((acc, account) => {
      const subType = account.subType || 'Owner\'s Equity';
      if (!acc[subType]) acc[subType] = [];
      acc[subType].push(account);
      return acc;
    }, {} as Record<string, FinancialStatementAccount[]>);

    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">{currentCompany?.name}</h2>
          <h3 className="text-xl font-semibold">Balance Sheet</h3>
          <p className="text-muted-foreground">
            As of {formatDate(endDate)}
          </p>
        </div>

        <div className="space-y-6">
          {/* Assets */}
          <div>
            <h4 className="font-semibold text-lg mb-3">Assets</h4>
            {Object.entries(groupedAssets).map(([subType, accounts]) => {
              const subtypeTotal = accounts.reduce((sum, acc) => sum + acc.amount, 0);
              return (
                <div key={subType} className="mb-4">
                  <h5 className="font-medium text-base mb-2 pl-2">{subType}</h5>
                  <Table>
                    <TableBody>
                      {accounts.map((account, index) => (
                        <TableRow key={index}>
                          <TableCell className="pl-6">{account.name}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(account.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="mt-2 pt-2 border-t">
                    <div className="flex justify-between font-semibold pl-2">
                      <span>Total {subType}</span>
                      <span>{formatCurrency(subtypeTotal)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="mt-4 pt-2 border-t-2 border-black">
              <div className="flex justify-between font-bold text-lg">
                <span>Total Assets</span>
                <span>{formatCurrency(totalAssets)}</span>
              </div>
            </div>
          </div>

          {/* Liabilities */}
          <div>
            <h4 className="font-semibold text-lg mb-3">Liabilities</h4>
            {Object.entries(groupedLiabilities).map(([subType, accounts]) => {
              const subtypeTotal = accounts.reduce((sum, acc) => sum + acc.amount, 0);
              return (
                <div key={subType} className="mb-4">
                  <h5 className="font-medium text-base mb-2 pl-2">{subType}</h5>
                  <Table>
                    <TableBody>
                      {accounts.map((account, index) => (
                        <TableRow key={index}>
                          <TableCell className="pl-6">{account.name}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(account.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="mt-2 pt-2 border-t">
                    <div className="flex justify-between font-semibold pl-2">
                      <span>Total {subType}</span>
                      <span>{formatCurrency(subtypeTotal)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="mt-4 pt-2 border-t-2 border-black">
              <div className="flex justify-between font-bold text-lg">
                <span>Total Liabilities</span>
                <span>{formatCurrency(totalLiabilities)}</span>
              </div>
            </div>
          </div>

          {/* Equity */}
          <div>
            <h4 className="font-semibold text-lg mb-3">Equity</h4>
            {Object.entries(groupedEquity).map(([subType, accounts]) => {
              const subtypeTotal = accounts.reduce((sum, acc) => sum + acc.amount, 0);
              return (
                <div key={subType} className="mb-4">
                  <h5 className="font-medium text-base mb-2 pl-2">{subType}</h5>
                  <Table>
                    <TableBody>
                      {accounts.map((account, index) => (
                        <TableRow key={index}>
                          <TableCell className="pl-6">{account.name}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(account.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="mt-2 pt-2 border-t">
                    <div className="flex justify-between font-semibold pl-2">
                      <span>Total {subType}</span>
                      <span>{formatCurrency(subtypeTotal)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="mt-4 pt-2 border-t-2 border-black">
              <div className="flex justify-between font-bold text-lg">
                <span>Total Equity</span>
                <span>{formatCurrency(totalEquity)}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t-2 border-black">
            <div className="flex justify-between font-bold text-lg">
              <span>Total Liabilities and Equity</span>
              <span>{formatCurrency(totalLiabilities + totalEquity)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTrialBalance = () => {
    if (!trialBalanceData || trialBalanceLoading) {
      return (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading trial balance...</p>
        </div>
      );
    }

    // Group accounts by type for trial balance
    const accountsByType = trialBalanceData.accounts.reduce((acc, account) => {
      if (!acc[account.type]) {
        acc[account.type] = [];
      }
      acc[account.type].push(account);
      return acc;
    }, {} as Record<string, TrialBalanceAccount[]>);

    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">{currentCompany?.name}</h2>
          <h3 className="text-xl font-semibold">Trial Balance</h3>
          <p className="text-muted-foreground">
            As of {formatDate(endDate)}
          </p>
          {!trialBalanceData.isBalanced && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <strong>Warning:</strong> Trial balance does not balance! 
              Debits: {formatCurrency(trialBalanceData.totalDebits)}, 
              Credits: {formatCurrency(trialBalanceData.totalCredits)}
            </div>
          )}
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account Code</TableHead>
              <TableHead>Account Name</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(accountsByType).map(([type, typeAccounts]) => (
              <>
                <TableRow key={type}>
                  <TableCell colSpan={4} className="font-semibold bg-muted">
                    {type.charAt(0).toUpperCase() + type.slice(1)} Accounts
                  </TableCell>
                </TableRow>
                {typeAccounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-mono">{account.code}</TableCell>
                    <TableCell>{account.name}</TableCell>
                    <TableCell className="text-right">
                      {account.debitBalance > 0 ? formatCurrency(account.debitBalance) : ''}
                    </TableCell>
                    <TableCell className="text-right">
                      {account.creditBalance > 0 ? formatCurrency(account.creditBalance) : ''}
                    </TableCell>
                  </TableRow>
                ))}
              </>
            ))}
            <TableRow className="font-bold border-t-2">
              <TableCell colSpan={2}>TOTALS</TableCell>
              <TableCell className="text-right">{formatCurrency(trialBalanceData.totalDebits)}</TableCell>
              <TableCell className="text-right">{formatCurrency(trialBalanceData.totalCredits)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  };

  if (!currentCompany) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-foreground">No Company Selected</h3>
          <p className="text-muted-foreground">Please select a company to view financial statements.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Financial Statements</h1>
          <p className="text-muted-foreground">
            Generate and view financial reports
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button 
            variant="outline"
            onClick={async () => {
              try {
                const { exportFinancialStatementToPDF } = await import('@/lib/pdfExport');
                
                let data;
                if (reportType === 'trial-balance') {
                  data = trialBalanceData;
                } else {
                  data = financialData;
                }

                if (!data || !currentCompany) {
                  toast({
                    title: "Export failed",
                    description: "No data available to export.",
                    variant: "destructive",
                  });
                  return;
                }

                await exportFinancialStatementToPDF(
                  data,
                  reportType,
                  {
                    name: currentCompany.name,
                    address: (currentCompany as any).address || '',
                    phone: (currentCompany as any).phone || '',
                    email: (currentCompany as any).email || '',
                    taxId: (currentCompany as any).taxId || '',
                  },
                  {
                    startDate: reportType === 'profit-loss' ? startDate : undefined,
                    endDate: endDate,
                  }
                );

                toast({
                  title: "Export successful",
                  description: "Financial statement has been exported to PDF.",
                });
              } catch (error) {
                console.error('PDF export error:', error);
                toast({
                  title: "Export failed",
                  description: "Failed to generate PDF. Please try again.",
                  variant: "destructive",
                });
              }
            }}
          >
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Report Parameters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Report Parameters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reportType">Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="profit-loss">Profit & Loss</SelectItem>
                  <SelectItem value="balance-sheet">Balance Sheet</SelectItem>
                  <SelectItem value="trial-balance">Trial Balance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={reportType === 'balance-sheet' || reportType === 'trial-balance'}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Statement Content */}
      <Card>
        <CardContent className="p-6">
          {reportType === 'profit-loss' && renderProfitLoss()}
          {reportType === 'balance-sheet' && renderBalanceSheet()}
          {reportType === 'trial-balance' && renderTrialBalance()}
        </CardContent>
      </Card>
    </div>
  );
}
