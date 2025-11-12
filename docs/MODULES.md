# Module Structure Documentation

## Overview

The AccountFlow Pro application is organized into **6 distinct modules**, each with its own permissions, API endpoints, frontend components, and database tables. This modular architecture ensures clear boundaries, scalability, and maintainability.

---

## Module Architecture

### 1. Accounting Module

**Purpose:** Core accounting functionality including chart of accounts, journal entries, accounts receivable/payable, invoices, and bills.

**Permissions:**
- `ACCOUNTS_VIEW` - View chart of accounts
- `ACCOUNTS_CREATE` - Create new accounts
- `ACCOUNTS_EDIT` - Edit account details
- `ACCOUNTS_DELETE` - Delete accounts
- `JOURNAL_VIEW` - View journal entries
- `JOURNAL_CREATE` - Create journal entries
- `JOURNAL_EDIT` - Edit journal entries
- `JOURNAL_DELETE` - Delete journal entries
- `JOURNAL_POST` - Post journal entries
- `JOURNAL_UNPOST` - Unpost journal entries
- `CUSTOMERS_VIEW/CREATE/EDIT/DELETE` - Customer management
- `VENDORS_VIEW/CREATE/EDIT/DELETE` - Vendor management
- `INVOICES_VIEW/CREATE/EDIT/DELETE/SEND` - Invoice management
- `BILLS_VIEW/CREATE/EDIT/DELETE/PAY` - Bill management

**API Endpoints:**
- `GET/POST/PUT/DELETE /api/accounts` - Account management
- `GET /api/accounts/balances` - Account balances
- `GET/POST/PUT/DELETE /api/journal-entries` - Journal entry management
- `GET /api/journal-entries/:id/lines` - Journal entry lines
- `GET/POST /api/customers` - Customer management
- `GET/POST /api/vendors` - Vendor management

**Frontend Routes:**
- `/accounting/chart-of-accounts` - Chart of Accounts page
- `/accounting/journal-entries` - Journal Entries grid
- `/accounting/accounts-receivable` - Accounts Receivable
- `/accounting/accounts-payable` - Accounts Payable
- `/accounting/invoices` - Invoices management
- `/bills` - Bills management

**Database Tables:**
- `accounts` - Chart of accounts
- `journal_entries` - Journal entry headers
- `journal_entry_lines` - Journal entry line items
- `customers` - Customer records
- `vendors` - Vendor records
- `invoices` - Invoice records
- `bills` - Bill records

---

### 2. Audit Module

**Purpose:** Audit analytics and reporting for data quality checks and compliance monitoring.

**Permissions:**
- `AUDIT_VIEW` - View audit reports
- `AUDIT_EXPORT` - Export audit data

**API Endpoints:**
- `GET /api/audit/:tableName` - Fetch audit data with pagination and filtering

**Frontend Routes:**
- `/audit` - Audit Dashboard with table selector

**Frontend Components:**
- `AuditDashboard.tsx` - Main audit page with dropdown selector
- `AuditGrid.tsx` - Reusable grid component for displaying audit data
- `auditTables.ts` - Configuration for all audit tables

**Database Tables (Audit Schema):**
- `audit.1690_stock`
- `audit.accounts_summary`
- `audit.accrued_interest`
- `audit.analytics`
- `audit.analytics_balance_summary`
- `audit.capital_accounts`
- `audit.capital_accounts_summary`
- `audit.creditors_avans`
- `audit.debitors_avans`
- `audit.dublicate_creditors`
- `audit.dublicate_debitors`
- `audit.high_amount_per_quantity_summary`
- `audit.negativ_creditor`
- `audit.negativ_debitor`
- `audit.negative_balance_141_summary`
- `audit.negative_balance_311_summary`
- `audit.negative_balance_summary`
- `audit.negative_loans`
- `audit.negative_stock`
- `audit.negativ_interest`
- `audit.negativ_salary`
- `audit.positive_balance_summary`
- `audit.revaluation_status_summary`
- `audit.salary_expense`
- `audit.writeoff_stock`

---

### 3. Reporting Module

**Purpose:** Financial reporting including trial balance, profit & loss, balance sheet, cash flow, and custom reports.

**Permissions:**
- `REPORTING_VIEW` - View financial reports
- `REPORTING_EXPORT` - Export reports
- `REPORTING_CUSTOM` - Create custom reports
- `REPORTING_SCHEDULE` - Schedule automated reports

**API Endpoints:**
- `GET /api/reporting/trial-balance` - Trial balance report
- `GET /api/reporting/profit-loss` - Profit & Loss statement
- `GET /api/reporting/balance-sheet` - Balance sheet
- `GET /api/reporting/cash-flow` - Cash flow statement
- `GET /api/reporting/financial-statements` - Unified financial statements (backward compatibility)
- `GET /api/reporting/custom` - List custom reports
- `POST /api/reporting/custom` - Create custom report
- `GET /api/reporting/custom/:id` - Get specific custom report
- `POST /api/reporting/schedule` - Schedule report

**Frontend Routes:**
- `/trial-balance` - Trial Balance report
- `/financial-statements` - Financial Statements (P&L, Balance Sheet)
- `/custom-reports` - Custom report builder

**Database Tables:**
Uses existing accounting tables (`accounts`, `journal_entries`, `journal_entry_lines`) for report generation.

---

### 4. Bank Module

**Purpose:** Bank account management, statement import, and bank reconciliation.

**Permissions:**
- `BANK_VIEW` - View bank accounts
- `BANK_CREATE` - Create bank accounts
- `BANK_EDIT` - Edit bank accounts
- `BANK_DELETE` - Delete bank accounts
- `BANK_UPLOAD` - Upload bank statements
- `BANK_IMPORT` - Import bank statements
- `BANK_RECONCILE` - Reconcile bank statements
- `BANK_EXPORT` - Export bank data

**API Endpoints:**
- `GET/POST/PUT/DELETE /api/bank/accounts` - Bank account management
- `GET /api/bank/statements` - Fetch bank statements
- `POST /api/bank/import` - Import bank statement
- `GET/POST/PUT /api/bank/reconciliation/:id` - Bank reconciliation

**Frontend Routes:**
- `/bank/accounts` - Bank accounts list
- `/bank/reconciliation` - Bank reconciliation interface
- `/bank/import` - Import bank statement

**Database Tables:**
- `bank_accounts` - Bank account information
- `bank_statements` - Imported bank statements
- `bank_reconciliation` - Reconciliation records

**Migration:** `migrations/003_bank_module.sql`

---

### 5. Chat Module

**Purpose:** Team communication and collaboration within companies.

**Permissions:**
- `CHAT_VIEW` - View chat messages
- `CHAT_SEND` - Send chat messages
- `CHAT_EDIT` - Edit own messages
- `CHAT_DELETE` - Delete messages
- `CHAT_ADMIN` - Manage chat channels

**API Endpoints:**
- `GET/POST /api/chat/channels` - Channel management
- `GET /api/chat/channels/:id/messages` - Fetch messages
- `POST /api/chat/channels/:id/messages` - Send message
- `PUT /api/chat/messages/:id` - Edit message
- `DELETE /api/chat/messages/:id` - Delete message
- `GET /api/chat/unread-count` - Unread message count

**Frontend Routes:**
- `/chat` - Chat dashboard
- `/chat/:channelId` - Specific channel view

**Database Tables:**
- `chat_channels` - Chat channels
- `chat_messages` - Chat messages
- `chat_channel_members` - Channel membership and read status

**Migration:** `migrations/004_chat_module.sql`

---

### 6. Tasks Module

**Purpose:** Task management and workflow tracking.

**Permissions:**
- `TASKS_VIEW` - View tasks
- `TASKS_CREATE` - Create tasks
- `TASKS_EDIT` - Edit tasks
- `TASKS_DELETE` - Delete tasks
- `TASKS_ASSIGN` - Assign tasks to users
- `TASKS_COMPLETE` - Complete tasks

**API Endpoints:**
- `GET/POST /api/tasks` - Task CRUD
- `GET /api/tasks/:id` - Fetch specific task
- `PUT/DELETE /api/tasks/:id` - Update/delete task
- `PUT /api/tasks/:id/assign` - Assign task
- `PUT /api/tasks/:id/status` - Update task status
- `GET /api/tasks/assigned-to-me` - My assigned tasks
- `GET /api/tasks/created-by-me` - Tasks I created
- `POST /api/tasks/:id/comments` - Add comment

**Frontend Routes:**
- `/tasks` - All tasks list
- `/tasks/my` - My assigned tasks
- `/tasks/new` - Create new task
- `/tasks/:id` - Task detail view

**Database Tables:**
- `tasks` - Task records
- `task_comments` - Task comments
- `task_attachments` - Task file attachments

**Migration:** `migrations/005_tasks_module.sql`

---

## Role-Based Access

### Assistant Accountant
- **Accounting:** View-only + basic data entry (journal entries, invoices, bills)
- **Audit:** View only
- **Reporting:** View only
- **Bank:** View only
- **Chat:** View, send, edit own messages
- **Tasks:** View, create, edit, complete

### Accountant
- **Accounting:** Full operations except deletions
- **Audit:** View + Export
- **Reporting:** View + Export
- **Bank:** Full operations + Reconciliation
- **Chat:** View, send, edit, delete
- **Tasks:** Full operations

### Manager
- **Accounting:** Full access
- **Audit:** Full access
- **Reporting:** Full access + Custom reports + Scheduling
- **Bank:** Full access
- **Chat:** Full access + Admin
- **Tasks:** Full access + Assign

### Administrator
- **All Modules:** Complete access to all features

---

## Frontend Architecture

### API Clients (`client/src/api/`)
- `accounts.ts` - Accounting accounts API
- `journal-entries.ts` - Journal entries API
- `audit.ts` - Audit module API
- `reporting.ts` - Reporting module API
- `bank.ts` - Bank module API
- `chat.ts` - Chat module API
- `tasks.ts` - Tasks module API
- `index.ts` - Centralized exports

### Module Organization
Each module follows a consistent structure:
```
client/src/
├── api/
│   └── [module].ts           # API client
├── pages/
│   └── [module]/             # Page components
│       ├── [Module]Dashboard.tsx
│       └── [Feature].tsx
└── components/
    └── [module]/             # Reusable components
        └── [Component].tsx
```

---

## Backend Architecture

### API Routers (`server/api/`)
- `accounts.ts` - Accounting accounts routes
- `journal-entries.ts` - Journal entries routes
- `audit.ts` - Audit module routes
- `reporting.ts` - Reporting module routes
- `bank.ts` - Bank module routes
- `chat.ts` - Chat module routes
- `tasks.ts` - Tasks module routes

### Middleware (`server/middleware/`)
- `auth.ts` - Authentication middleware (`requireAuth`, `requireCompany`)

### Router Mounting (`server/routes.ts`)
All modular routers are mounted with clear module grouping:
```typescript
// Accounting Module
app.use('/api/accounts', accountsRouter);
app.use('/api/journal-entries', journalEntriesRouter);

// Audit Module
app.use('/api/audit', auditRouter);

// Reporting Module
app.use('/api/reporting', reportingRouter);

// Bank Module
app.use('/api/bank', bankRouter);

// Chat Module
app.use('/api/chat', chatRouter);

// Tasks Module
app.use('/api/tasks', tasksRouter);
```

---

## Database Migrations

### Existing Migrations
1. `001_initial_schema.sql` - Core application tables
2. `002_audit_schema.sql` - Audit analytics tables

### New Module Migrations
3. `003_bank_module.sql` - Bank module tables
4. `004_chat_module.sql` - Chat module tables
5. `005_tasks_module.sql` - Tasks module tables

---

## Navigation Structure (`client/src/components/layout/Sidebar.tsx`)

The sidebar is organized by modules with permission-based visibility:

1. **Dashboard** - Home page
2. **Accounting** - Chart of Accounts, Journal Entries, AR/AP, Invoices, Bills
3. **Audit** - Audit Analytics
4. **Reporting** - Trial Balance, Financial Statements, Custom Reports
5. **Bank** - Bank Accounts, Reconciliation, Import
6. **Chat** - Messages
7. **Tasks** - My Tasks, All Tasks, Create Task
8. **Administration** - User Management, Settings, MSSQL Import

---

## Benefits of Modular Architecture

✅ **Clear Boundaries** - Each module is self-contained with its own domain
✅ **Scalability** - Easy to add new modules without affecting existing ones
✅ **Maintainability** - Changes in one module don't impact others
✅ **Team Collaboration** - Different teams can own different modules
✅ **Permission Management** - Fine-grained access control per module
✅ **Code Organization** - Consistent structure across frontend and backend
✅ **Testing** - Modules can be tested independently
✅ **Documentation** - Clear module boundaries make documentation easier

---

## Adding a New Module

To add a new module, follow these steps:

1. **Define Permissions** (`shared/permissions.ts`)
2. **Create Database Migration** (`migrations/00X_[module]_module.sql`)
3. **Create Backend API Router** (`server/api/[module].ts`)
4. **Mount Router** (`server/routes.ts`)
5. **Create Frontend API Client** (`client/src/api/[module].ts`)
6. **Export from Index** (`client/src/api/index.ts`)
7. **Create Page Components** (`client/src/pages/[module]/`)
8. **Add to Sidebar** (`client/src/components/layout/Sidebar.tsx`)
9. **Add Routes** (`client/src/App.tsx`)
10. **Update Documentation** (this file)

---

## Related Documentation

- `PERMISSIONS.md` - Detailed permission matrix
- `MODULARIZATION_SUMMARY.md` - Backend modularization summary
- `README.md` - Project overview and setup

