/**
 * Audit Tables Configuration
 * Maps audit analytics tables to their display names, columns, and menu structure
 */

export interface AuditColumn {
  field: string;
  header: string;
  type: 'text' | 'numeric' | 'date' | 'checkbox';
  width?: number;
}

export interface AuditTable {
  id: string;
  displayNameKa: string; // Georgian
  displayNameEn: string; // English
  tableName: string; // Database table name in audit schema
  columns: AuditColumn[];
}

export interface AuditSection {
  id: string;
  displayNameKa: string;
  displayNameEn: string;
  tables: AuditTable[];
}

// Common columns that appear in most audit tables
const commonCompanyColumns: AuditColumn[] = [
  { field: 'company_name', header: 'Company Name', type: 'text', width: 200 },
  { field: 'identification_code', header: 'ID Code', type: 'text', width: 120 },
  { field: 'company_id', header: 'Company ID', type: 'text', width: 100 },
  { field: 'manager', header: 'Manager', type: 'text', width: 150 },
  { field: 'accountant', header: 'Accountant', type: 'text', width: 150 },
];

// Audit table definitions organized by sections
export const auditSections: AuditSection[] = [
  {
    id: '1410-buyers',
    displayNameKa: '1410 მყიდველები',
    displayNameEn: '1410 Buyers',
    tables: [
      {
        id: 'negativ-debitor',
        displayNameKa: 'გამინუსებული დებიტორები',
        displayNameEn: 'Negative Debtors',
        tableName: 'negativ_debitor',
        columns: [
          { field: 'tenant_code', header: 'Tenant Code', type: 'text', width: 120 },
          { field: 'posting_month', header: 'Posting Month', type: 'text', width: 120 },
          { field: 'account_number', header: 'Account Number', type: 'text', width: 120 },
          { field: 'analytic', header: 'Analytic', type: 'text', width: 200 },
          { field: 'balance', header: 'Balance', type: 'numeric', width: 120 },
          ...commonCompanyColumns,
        ],
      },
      {
        id: 'negative-balance-141',
        displayNameKa: 'დებიტორებზე მცირე მორჩენილი ნაშთები',
        displayNameEn: 'Small Remaining Balances on Debtors',
        tableName: 'negative_balance_141_summary',
        columns: [
          { field: 'tenant_code', header: 'Tenant Code', type: 'text', width: 120 },
          { field: 'posting_month', header: 'Posting Month', type: 'text', width: 120 },
          { field: 'account_number', header: 'Account Number', type: 'text', width: 120 },
          { field: 'analytic', header: 'Analytic', type: 'text', width: 200 },
          { field: 'balance', header: 'Balance', type: 'numeric', width: 120 },
          ...commonCompanyColumns,
        ],
      },
      {
        id: 'dublicate-debitors',
        displayNameKa: 'გადუბლირებული დებიტორები',
        displayNameEn: 'Duplicate Debtors',
        tableName: 'dublicate_debitors',
        columns: [
          { field: 'tenant_code', header: 'Tenant Code', type: 'text', width: 120 },
          { field: 'account', header: 'Account', type: 'text', width: 120 },
          { field: 'analytic', header: 'Analytic', type: 'text', width: 200 },
          { field: 'unique_id_count', header: 'Unique ID Count', type: 'numeric', width: 120 },
          ...commonCompanyColumns,
        ],
      },
      {
        id: 'debitors-avans',
        displayNameKa: 'ავანსებით ხომ არაა გასაქვითი',
        displayNameEn: 'Advances to be Offset',
        tableName: 'debitors_avans',
        columns: [
          { field: 'tenant_code', header: 'Tenant Code', type: 'text', width: 120 },
          { field: 'posting_month', header: 'Posting Month', type: 'text', width: 120 },
          { field: 'analytic', header: 'Analytic', type: 'text', width: 200 },
          { field: 'balance_141', header: 'Balance 141', type: 'numeric', width: 120 },
          { field: 'balance_312', header: 'Balance 312', type: 'numeric', width: 120 },
          ...commonCompanyColumns,
        ],
      },
    ],
  },
  {
    id: '16-inventory',
    displayNameKa: '16 მარაგები',
    displayNameEn: '16 Inventory',
    tables: [
      {
        id: 'negative-stock',
        displayNameKa: 'გამინუსებული მარაგები',
        displayNameEn: 'Negative Stock',
        tableName: 'negative_stock',
        columns: [
          { field: 'tenant_code', header: 'Tenant Code', type: 'text', width: 120 },
          { field: 'posting_month', header: 'Posting Month', type: 'text', width: 120 },
          { field: 'account_number', header: 'Account Number', type: 'text', width: 120 },
          { field: 'analytic', header: 'Analytic', type: 'text', width: 200 },
          { field: 'balance', header: 'Balance', type: 'numeric', width: 120 },
          ...commonCompanyColumns,
        ],
      },
      {
        id: 'writeoff-stock',
        displayNameKa: 'ჩამოსაწერი მარაგები',
        displayNameEn: 'Stock to Write Off',
        tableName: 'writeoff_stock',
        columns: [
          { field: 'tenant_code', header: 'Tenant Code', type: 'text', width: 120 },
          { field: 'posting_month', header: 'Posting Month', type: 'text', width: 120 },
          { field: 'account_number', header: 'Account Number', type: 'text', width: 120 },
          { field: 'analytic', header: 'Analytic', type: 'text', width: 200 },
          { field: 'balance', header: 'Balance', type: 'numeric', width: 120 },
          ...commonCompanyColumns,
        ],
      },
      {
        id: '1690-stock',
        displayNameKa: 'დამატებითი ხარჯები',
        displayNameEn: 'Additional Expenses',
        tableName: '1690_stock',
        columns: [
          { field: 'tenant_code', header: 'Tenant Code', type: 'text', width: 120 },
          { field: 'posting_month', header: 'Posting Month', type: 'text', width: 120 },
          { field: 'account_number', header: 'Account Number', type: 'text', width: 120 },
          { field: 'analytic', header: 'Analytic', type: 'text', width: 200 },
          { field: 'balance', header: 'Balance', type: 'numeric', width: 120 },
          ...commonCompanyColumns,
        ],
      },
    ],
  },
  {
    id: '18-interest',
    displayNameKa: '18 მისაღები პროცენტები/დივიდენდები',
    displayNameEn: '18 Receivable Interest/Dividends',
    tables: [
      {
        id: 'accrued-interest',
        displayNameKa: 'მისაღები პროცენტები',
        displayNameEn: 'Accrued Interest',
        tableName: 'accrued_interest',
        columns: [
          { field: 'tenant_code', header: 'Tenant Code', type: 'text', width: 120 },
          { field: 'posting_month', header: 'Posting Month', type: 'text', width: 120 },
          { field: 'analytic', header: 'Analytic', type: 'text', width: 200 },
          { field: 'account_number', header: 'Account Number', type: 'text', width: 120 },
          { field: 'balance', header: 'Balance', type: 'numeric', width: 120 },
          { field: 'has_181_turnover', header: 'Has 181 Turnover', type: 'text', width: 120 },
          ...commonCompanyColumns,
        ],
      },
      {
        id: 'negative-interest',
        displayNameKa: 'მისაღები დივიდენდები',
        displayNameEn: 'Receivable Dividends',
        tableName: 'negativ_interest',
        columns: [
          { field: 'tenant_code', header: 'Tenant Code', type: 'text', width: 120 },
          { field: 'posting_month', header: 'Posting Month', type: 'text', width: 120 },
          { field: 'account_number', header: 'Account Number', type: 'text', width: 120 },
          { field: 'analytic', header: 'Analytic', type: 'text', width: 200 },
          { field: 'balance', header: 'Balance', type: 'numeric', width: 120 },
          ...commonCompanyColumns,
        ],
      },
    ],
  },
  {
    id: '311-creditors',
    displayNameKa: '311 კრედიტორები',
    displayNameEn: '311 Creditors',
    tables: [
      {
        id: 'negative-creditor',
        displayNameKa: 'გამინუსებული კრედიტორები',
        displayNameEn: 'Negative Creditors',
        tableName: 'negativ_creditor',
        columns: [
          { field: 'tenant_code', header: 'Tenant Code', type: 'text', width: 120 },
          { field: 'posting_month', header: 'Posting Month', type: 'text', width: 120 },
          { field: 'account_number', header: 'Account Number', type: 'text', width: 120 },
          { field: 'analytic', header: 'Analytic', type: 'text', width: 200 },
          { field: 'balance', header: 'Balance', type: 'numeric', width: 120 },
          ...commonCompanyColumns,
        ],
      },
      {
        id: 'negative-balance-311',
        displayNameKa: 'კრედიტორებზე მცირე მორჩენილი ნაშთები',
        displayNameEn: 'Small Remaining Balances on Creditors',
        tableName: 'negative_balance_311_summary',
        columns: [
          { field: 'tenant_code', header: 'Tenant Code', type: 'text', width: 120 },
          { field: 'posting_month', header: 'Posting Month', type: 'text', width: 120 },
          { field: 'account_number', header: 'Account Number', type: 'text', width: 120 },
          { field: 'analytic', header: 'Analytic', type: 'text', width: 200 },
          { field: 'balance', header: 'Balance', type: 'numeric', width: 120 },
          ...commonCompanyColumns,
        ],
      },
      {
        id: 'dublicate-creditors',
        displayNameKa: 'გადუბლირებული კრედიტორები',
        displayNameEn: 'Duplicate Creditors',
        tableName: 'dublicate_creditors',
        columns: [
          { field: 'tenant_code', header: 'Tenant Code', type: 'text', width: 120 },
          { field: 'account', header: 'Account', type: 'text', width: 120 },
          { field: 'analytic', header: 'Analytic', type: 'text', width: 200 },
          { field: 'unique_id_count', header: 'Unique ID Count', type: 'numeric', width: 120 },
          ...commonCompanyColumns,
        ],
      },
      {
        id: 'creditors-avans',
        displayNameKa: 'ავანსებით ხომ არ არიან გასაქვითი',
        displayNameEn: 'Advances to be Offset',
        tableName: 'creditors_avans',
        columns: [
          { field: 'tenant_code', header: 'Tenant Code', type: 'text', width: 120 },
          { field: 'posting_month', header: 'Posting Month', type: 'text', width: 120 },
          { field: 'analytic', header: 'Analytic', type: 'text', width: 200 },
          { field: 'balance_311', header: 'Balance 311', type: 'numeric', width: 120 },
          { field: 'balance_148', header: 'Balance 148', type: 'numeric', width: 120 },
          ...commonCompanyColumns,
        ],
      },
    ],
  },
  {
    id: '3130-salaries',
    displayNameKa: '3130 ხელფასები',
    displayNameEn: '3130 Salaries',
    tables: [
      {
        id: 'negative-salary',
        displayNameKa: 'გამინუსებული ხელფასები',
        displayNameEn: 'Negative Salaries',
        tableName: 'negativ_salary',
        columns: [
          { field: 'tenant_code', header: 'Tenant Code', type: 'text', width: 120 },
          { field: 'posting_month', header: 'Posting Month', type: 'text', width: 120 },
          { field: 'account_number', header: 'Account Number', type: 'text', width: 120 },
          { field: 'analytic', header: 'Analytic', type: 'text', width: 200 },
          { field: 'balance', header: 'Balance', type: 'numeric', width: 120 },
          ...commonCompanyColumns,
        ],
      },
      {
        id: 'salary-expense',
        displayNameKa: 'ხელფასების გამორჩენა',
        displayNameEn: 'Salary Expense',
        tableName: 'salary_expense',
        columns: [
          { field: 'tenant_code', header: 'Tenant Code', type: 'text', width: 120 },
          { field: 'doc_date', header: 'Document Date', type: 'date', width: 120 },
          { field: 'account_dr', header: 'Account Dr', type: 'text', width: 100 },
          { field: 'account_cr', header: 'Account Cr', type: 'text', width: 100 },
          { field: 'amount', header: 'Amount', type: 'numeric', width: 120 },
          { field: 'document_comments', header: 'Comments', type: 'text', width: 250 },
          ...commonCompanyColumns,
        ],
      },
    ],
  },
  {
    id: '32-41-loans',
    displayNameKa: '32-41 სესხები',
    displayNameEn: '32-41 Loans',
    tables: [
      {
        id: 'negative-loans',
        displayNameKa: 'სესხების გამინუსება',
        displayNameEn: 'Negative Loans',
        tableName: 'negative_loans',
        columns: [
          { field: 'tenant_code', header: 'Tenant Code', type: 'text', width: 120 },
          { field: 'posting_month', header: 'Posting Month', type: 'text', width: 120 },
          { field: 'analytic', header: 'Analytic', type: 'text', width: 200 },
          { field: 'account_number', header: 'Account Number', type: 'text', width: 120 },
          { field: 'balance', header: 'Balance', type: 'numeric', width: 120 },
          ...commonCompanyColumns,
        ],
      },
    ],
  },
  {
    id: '34-interest-payable',
    displayNameKa: '34 გასაცემი პროცენტები/დივიდენდები',
    displayNameEn: '34 Payable Interest/Dividends',
    tables: [
      {
        id: 'positive-balance',
        displayNameKa: 'გადასახდელი პროცენტების დარიცხვა',
        displayNameEn: 'Accrued Interest Payable',
        tableName: 'positive_balance_summary',
        columns: [
          { field: 'tenant_code', header: 'Tenant Code', type: 'text', width: 120 },
          { field: 'posting_month', header: 'Posting Month', type: 'text', width: 120 },
          { field: 'analytic', header: 'Analytic', type: 'text', width: 200 },
          { field: 'account_number', header: 'Account Number', type: 'text', width: 120 },
          { field: 'balance', header: 'Balance', type: 'numeric', width: 120 },
          { field: 'has_342_turnover', header: 'Has 342 Turnover', type: 'text', width: 120 },
          ...commonCompanyColumns,
        ],
      },
      {
        id: 'capital-accounts-summary',
        displayNameKa: '34 ანგარიში ხომ არაა გამინუსებული',
        displayNameEn: '34 Account Not Negative',
        tableName: 'capital_accounts_summary',
        columns: [
          { field: 'tenant_code', header: 'Tenant Code', type: 'text', width: 120 },
          { field: 'posting_month', header: 'Posting Month', type: 'text', width: 120 },
          { field: 'account_number', header: 'Account Number', type: 'text', width: 120 },
          { field: 'analytic', header: 'Analytic', type: 'text', width: 200 },
          { field: 'balance', header: 'Balance', type: 'numeric', width: 120 },
          ...commonCompanyColumns,
        ],
      },
    ],
  },
  {
    id: '515-capital',
    displayNameKa: '515 საწესდებო კაპიტალი',
    displayNameEn: '515 Charter Capital',
    tables: [
      {
        id: 'accounts-summary',
        displayNameKa: '515 ანგარიში სადაცაა გამოყენებული',
        displayNameEn: '515 Account Usage',
        tableName: 'accounts_summary',
        columns: [
          { field: 'tenant_code', header: 'Tenant Code', type: 'text', width: 120 },
          { field: 'doc_date', header: 'Document Date', type: 'date', width: 120 },
          { field: 'account_dr', header: 'Account Dr', type: 'text', width: 100 },
          { field: 'account_cr', header: 'Account Cr', type: 'text', width: 100 },
          { field: 'amount', header: 'Amount', type: 'numeric', width: 120 },
          { field: 'document_comments', header: 'Comments', type: 'text', width: 250 },
          ...commonCompanyColumns,
        ],
      },
      {
        id: 'capital-accounts',
        displayNameKa: 'სხვა ანგარიშზე ხომ არაა გატარებული კაპიტალი',
        displayNameEn: 'Capital on Other Accounts',
        tableName: 'capital_accounts',
        columns: [
          { field: 'tenant_code', header: 'Tenant Code', type: 'text', width: 120 },
          { field: 'doc_date', header: 'Document Date', type: 'date', width: 120 },
          { field: 'account_dr', header: 'Account Dr', type: 'text', width: 100 },
          { field: 'account_cr', header: 'Account Cr', type: 'text', width: 100 },
          { field: 'content', header: 'Content', type: 'text', width: 250 },
          { field: 'amount', header: 'Amount', type: 'numeric', width: 120 },
          ...commonCompanyColumns,
        ],
      },
      {
        id: 'negative-balance-summary',
        displayNameKa: 'გამინუსებული კაპიტალი',
        displayNameEn: 'Negative Capital',
        tableName: 'negative_balance_summary',
        columns: [
          { field: 'tenant_code', header: 'Tenant Code', type: 'text', width: 120 },
          { field: 'posting_month', header: 'Posting Month', type: 'text', width: 120 },
          { field: 'account_number', header: 'Account Number', type: 'text', width: 120 },
          { field: 'analytic', header: 'Analytic', type: 'text', width: 200 },
          { field: 'balance', header: 'Balance', type: 'numeric', width: 120 },
          ...commonCompanyColumns,
        ],
      },
    ],
  },
  {
    id: 'other',
    displayNameKa: 'სხვადასხვა',
    displayNameEn: 'Other',
    tables: [
      {
        id: 'revaluation',
        displayNameKa: 'გადაფასება',
        displayNameEn: 'Revaluation',
        tableName: 'revaluation_status_summary',
        columns: [
          { field: 'tenant_code', header: 'Tenant Code', type: 'text', width: 120 },
          { field: 'posting_month', header: 'Posting Month', type: 'text', width: 120 },
          { field: 'revaluation_status', header: 'Revaluation Status', type: 'text', width: 200 },
          ...commonCompanyColumns,
        ],
      },
      {
        id: 'analytics-balance',
        displayNameKa: 'დებიტორ-კრედიტორები',
        displayNameEn: 'Debtor-Creditor Balance',
        tableName: 'analytics_balance_summary',
        columns: [
          { field: 'tenant_code', header: 'Tenant Code', type: 'text', width: 120 },
          { field: 'posting_month', header: 'Posting Month', type: 'text', width: 120 },
          { field: 'analytic', header: 'Analytic', type: 'text', width: 200 },
          { field: 'balance_141', header: 'Balance 141', type: 'numeric', width: 120 },
          { field: 'balance_311', header: 'Balance 311', type: 'numeric', width: 120 },
          ...commonCompanyColumns,
        ],
      },
      {
        id: 'high-amount-per-quantity',
        displayNameKa: 'ხარჯად ჩამოწერილი ძირითადები',
        displayNameEn: 'Fixed Assets Written Off',
        tableName: 'high_amount_per_quantity_summary',
        columns: [
          { field: 'tenant_code', header: 'Tenant Code', type: 'text', width: 120 },
          { field: 'doc_date', header: 'Document Date', type: 'date', width: 120 },
          { field: 'account_cr', header: 'Account Cr', type: 'text', width: 100 },
          { field: 'account_dr', header: 'Account Dr', type: 'text', width: 100 },
          { field: 'analytic_cr', header: 'Analytic Cr', type: 'text', width: 200 },
          { field: 'amount', header: 'Amount', type: 'numeric', width: 120 },
          { field: 'quantity_cr', header: 'Quantity Cr', type: 'numeric', width: 100 },
          { field: 'amount_per_quantity', header: 'Amount per Quantity', type: 'numeric', width: 140 },
          ...commonCompanyColumns,
        ],
      },
      {
        id: 'analytics',
        displayNameKa: 'ანალიტიკა',
        displayNameEn: 'Analytics',
        tableName: 'analytics',
        columns: [
          { field: 'tenant_code', header: 'Tenant Code', type: 'text', width: 120 },
          { field: 'posting_month', header: 'Posting Month', type: 'text', width: 120 },
          { field: 'analytic', header: 'Analytic', type: 'text', width: 200 },
          { field: 'tenant_name', header: 'Tenant Name', type: 'text', width: 200 },
          { field: 'ხარჯი', header: 'Expense', type: 'numeric', width: 120 },
          { field: 'შემოსავალი', header: 'Income', type: 'numeric', width: 120 },
          { field: 'უნიკალური_გატარებები', header: 'Unique Transactions', type: 'numeric', width: 150 },
          ...commonCompanyColumns,
        ],
      },
    ],
  },
];

// Helper function to get all tables as a flat array
export const getAllAuditTables = (): AuditTable[] => {
  return auditSections.flatMap(section => section.tables);
};

// Helper function to find a table by ID
export const getAuditTableById = (id: string): AuditTable | undefined => {
  return getAllAuditTables().find(table => table.id === id);
};

// Helper function to get section by table ID
export const getSectionByTableId = (tableId: string): AuditSection | undefined => {
  return auditSections.find(section => 
    section.tables.some(table => table.id === tableId)
  );
};

