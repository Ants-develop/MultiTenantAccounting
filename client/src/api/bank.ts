// Bank Module API Client
import { apiRequest } from "@/lib/queryClient";

export interface BankAccount {
  id: number;
  companyId: number;
  accountName: string;
  accountNumber?: string;
  bankName?: string;
  currency: string;
  currentBalance: number;
  isActive: boolean;
  createdAt: string;
}

export interface BankStatement {
  id: number;
  bankAccountId: number;
  statementDate: string;
  openingBalance: number;
  closingBalance: number;
  filePath?: string;
  importedAt: string;
}

export interface BankReconciliation {
  id: number;
  bankAccountId: number;
  journalEntryId?: number;
  statementLineId?: number;
  reconciledDate: string;
  reconciledBy: number;
  status: string;
}

export const bankApi = {
  // Bank Accounts
  fetchAccounts: async (companyId: number) => {
    const response = await apiRequest('GET', `/api/bank/accounts?companyId=${companyId}`);
    return response.json();
  },

  createAccount: async (data: Partial<BankAccount>) => {
    const response = await apiRequest('POST', '/api/bank/accounts', data);
    return response.json();
  },

  updateAccount: async (id: number, data: Partial<BankAccount>) => {
    const response = await apiRequest('PUT', `/api/bank/accounts/${id}`, data);
    return response.json();
  },

  deleteAccount: async (id: number) => {
    const response = await apiRequest('DELETE', `/api/bank/accounts/${id}`);
    return response.json();
  },

  // Bank Statements
  fetchStatements: async (bankAccountId: number) => {
    const response = await apiRequest('GET', `/api/bank/statements?bankAccountId=${bankAccountId}`);
    return response.json();
  },

  importStatement: async (data: { bankAccountId: number; statementDate: string; openingBalance: number; closingBalance: number; filePath?: string }) => {
    const response = await apiRequest('POST', '/api/bank/import', data);
    return response.json();
  },

  // Bank Reconciliation
  fetchReconciliation: async (id: number) => {
    const response = await apiRequest('GET', `/api/bank/reconciliation/${id}`);
    return response.json();
  },

  createReconciliation: async (data: Partial<BankReconciliation>) => {
    const response = await apiRequest('POST', '/api/bank/reconciliation', data);
    return response.json();
  },

  updateReconciliation: async (id: number, data: Partial<BankReconciliation>) => {
    const response = await apiRequest('PUT', `/api/bank/reconciliation/${id}`, data);
    return response.json();
  },
};

