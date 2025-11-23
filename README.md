# AccountFlow Pro - Multi-Tenant Accounting Software

A comprehensive accounting application built with React, Express.js, and PostgreSQL, featuring role-based access control and multi-company support.

## Features

- **Multi-tenant architecture** with company isolation
- **Role-based access control** (Assistant, Accountant, Manager, Administrator)
- **Complete accounting modules**: Chart of Accounts, Journal Entries, Invoices, Bills
- **Financial reporting**: P&L, Balance Sheet, Trial Balance
- **User management** with granular permissions
- **Real-time dashboard** with key metrics
- **Professional UI** built with shadcn/ui components

## Prerequisites

- **Node.js** 18+ and npm
- **Linux server** (Ubuntu 20.04+ recommended)
- **Neon Database** account (free tier available)
- **Domain name** (optional, for production)

## Installation Steps

### 1. Server Setup

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx (optional, for reverse proxy)
sudo apt install nginx -y
```

### 2. Clone and Setup Application

```bash
# Clone the repository
git clone <your-repository-url>
cd accounting-app

# Install dependencies
npm install

# Install development dependencies globally (optional)
npm install -g tsx drizzle-kit
```

### 3. Neon Database Setup

1. **Create Neon Account**:
   - Go to [neon.tech](https://neon.tech)
   - Sign up for a free account
   - Create a new project

2. **Get Database URL**:
   - In your Neon dashboard, go to "Connection Details"
   - Copy the connection string (format: `postgresql://username:password@hostname/database`)

3. **Create Environment File**:
```bash
# Create .env file
cp .env.example .env

# Edit with your database URL
nano .env
```

Add the following to your `.env` file:
```env
DATABASE_URL="postgresql://username:password@hostname/database?sslmode=require"
SESSION_SECRET="your-super-secret-session-key-change-this-in-production"
NODE_ENV="production"
PORT=5000
ALLOWED_HOSTS="react.ants.ge,.ants.ge,localhost"
DOMAIN="react.ants.ge"
```

### 4. Database Migration

```bash
# Push database schema to Neon
npm run db:push

# Verify tables were created
npx drizzle-kit studio  # Opens database browser
```

### 5. Build Application

```bash
# Build the frontend
npm run build

# Test the build
npm start
```

### 6. PM2 Process Management

Create PM2 ecosystem file:
```bash
nano ecosystem.config.js
```

Add the following configuration:
```javascript
module.exports = {
  apps: [{
    name: 'accountflow-pro',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

Start the application:
```bash
# Create logs directory
mkdir logs

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $(whoami) --hp $(eval echo ~$(whoami))
```

### 7. Nginx Reverse Proxy (Optional)

Create Nginx configuration:
```bash
sudo nano /etc/nginx/sites-available/accountflow
```

Add the following configuration:
```nginx
server {
    listen 80;
    server_name react.ants.ge www.react.ants.ge;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:
```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/accountflow /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Enable Nginx to start on boot
sudo systemctl enable nginx
```

### 8. SSL Certificate (Optional)

Install Certbot for free SSL:
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d react.ants.ge -d www.react.ants.ge

# Test auto-renewal
sudo certbot renew --dry-run
```

### 9. Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 5000  # Only if not using Nginx
sudo ufw enable

# Check status
sudo ufw status
```

## Initial Setup

### 1. Create Admin User

The application will be available at:
- Without Nginx: `http://your-server-ip:5000`
- With Nginx: `http://your-domain.com`

1. Go to the registration page
2. Create your first admin user
3. Create your first company
4. Start using the accounting features

### 2. Sample Data (Optional)

To populate with sample data for testing:
```bash
# Connect to your Neon database and run:
npm run db:seed  # If you create a seed script
```

## Monitoring and Maintenance

### PM2 Commands
```bash
# Check application status
pm2 status

# View logs
pm2 logs accountflow-pro

# Restart application
pm2 restart accountflow-pro

# Stop application
pm2 stop accountflow-pro

# Monitor resources
pm2 monit
```

### Database Backup
```bash
# Backup database (run from local machine)
pg_dump "postgresql://username:password@hostname/database" > backup.sql

# Restore database
psql "postgresql://username:password@hostname/database" < backup.sql
```

### Update Application
```bash
# Pull latest changes
git pull origin main

# Install new dependencies
npm install

# Rebuild application
npm run build

# Apply database migrations
npm run db:push

# Restart application
pm2 restart accountflow-pro
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**:
   - Verify DATABASE_URL in .env file
   - Check Neon database is active
   - Ensure SSL mode is enabled

2. **Permission Denied**:
   - Check file permissions: `chmod +x node_modules/.bin/*`
   - Verify user has access to application directory

3. **Port Already in Use**:
   - Change PORT in .env file
   - Kill existing processes: `sudo lsof -i :5000`

4. **Build Failures**:
   - Clear node_modules: `rm -rf node_modules && npm install`
   - Check Node.js version compatibility

### Logs Location
- PM2 logs: `./logs/`
- Nginx logs: `/var/log/nginx/`
- Application logs: Check PM2 logs

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| DATABASE_URL | Neon database connection string | Yes | - |
| SESSION_SECRET | Secret key for sessions | Yes | - |
| NODE_ENV | Environment mode | No | development |
| PORT | Application port | No | 5000 |

## Architecture

- **Frontend**: React with TypeScript, Vite, shadcn/ui, routing via `wouter`
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL (Neon serverless)
- **ORM**: Drizzle ORM
- **Authentication**: Session-based with bcrypt
- **Build**: Vite for frontend, esbuild for backend

### Database Schema Organization

This application uses a **schema-based approach** to organize the PostgreSQL database. Instead of putting all tables in the default `public` schema, we logically separate tables into multiple schemas based on their functional domain.

#### Why Schema-Based Architecture?

1. **Logical Separation**: Each module has its own namespace, making the database structure clearer
2. **Better Organization**: Related tables are grouped together, improving maintainability
3. **Permission Control**: PostgreSQL schemas allow fine-grained access control per module
4. **Naming Clarity**: Reduces naming conflicts and makes table purposes obvious
5. **Migration Management**: Easier to manage and rollback module-specific changes

#### Schema Structure

```
PostgreSQL Database
├── public (default schema)
│   ├── users
│   ├── clients (client companies)
│   ├── company_users (user-company assignments)
│   └── user_permissions
│
├── accounting
│   ├── accounts (chart of accounts)
│   ├── journal_entries
│   ├── journal_entry_lines
│   ├── invoices
│   ├── invoice_lines
│   ├── bills
│   └── bill_lines
│
├── rs (Revenue Service Integration)
│   ├── rs_users
│   ├── rs_companies
│   ├── rs_invoices
│   └── rs_sync_logs
│
├── crm (Client Relationship Management)
│   ├── client_documents
│   ├── client_service_packages
│   ├── client_team_assignments
│   ├── client_onboarding_forms
│   ├── client_onboarding_steps
│   └── client_checklists
│
└── tasks
    ├── tasks
    ├── task_assignments
    ├── checklist_templates
    └── task_comments
```

#### Schema Definitions

**`public` Schema** (Core System)
- Contains fundamental system tables: users, clients, permissions
- Accessed by all modules
- Managed by migration: `001_core_module.sql`

**`accounting` Schema** (Financial Data)
- All accounting-related tables
- Chart of accounts, journal entries, invoices, bills
- Managed by migration: `002_accounting_module.sql`

**`rs` Schema** (Revenue Service)
- Integration with Georgian Revenue Service (RS.GE)
- Stores synced data from external tax system
- Managed by migration: `005_rs_module.sql`

**`crm` Schema** (Client Management)
- Client documents, service packages, team assignments
- Onboarding workflows and checklists
- Managed by migration: `007_crm_module.sql`

**`tasks` Schema** (Task Management)
- Task tracking, assignments, templates
- Shared across all modules
- Managed by migration: `006_tasks_module.sql`

#### Working with Schemas in Code

**Drizzle ORM Schema Definition** (`shared/schema.ts`):
```typescript
import { pgSchema } from "drizzle-orm/pg-core";

// Define schemas
const accounting = pgSchema("accounting");
const rs = pgSchema("rs");
const crm = pgSchema("crm");

// Use schema in table definitions
export const accounts = accounting.table("accounts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  // ...
});

export const rsInvoices = rs.table("rs_invoices", {
  id: serial("id").primaryKey(),
  // ...
});
```

**Querying Across Schemas**:
```typescript
// Drizzle automatically handles schema prefixes
const accounts = await db.select().from(accountingAccounts);
// Generates: SELECT * FROM accounting.accounts

// Join across schemas
const result = await db
  .select()
  .from(clients)  // public.clients
  .leftJoin(clientDocuments, eq(clients.id, clientDocuments.clientId))  // crm.client_documents
```

#### Migration Management

Migrations are organized by module in the `migrations/` directory:

```
migrations/
├── 001_core_module.sql          # public schema
├── 002_accounting_module.sql    # accounting schema
├── 003_audit_module.sql         # audit tables
├── 004_bank_module.sql          # bank integration
├── 005_rs_module.sql            # rs schema
├── 006_tasks_module.sql         # tasks schema
├── 007_crm_module.sql           # crm schema
├── 008_email_module.sql         # email integration
└── 009_migration_tracking.sql   # migration history
```

**Running Migrations**:
```bash
# Apply all migrations
npm run db:push

# Or manually run specific migration
psql $DATABASE_URL -f migrations/007_crm_module.sql
```

#### Best Practices

1. **Schema Naming**: Use lowercase, descriptive names (e.g., `accounting`, `crm`)
2. **Table References**: Always use schema-qualified names in migrations
3. **Cross-Schema Foreign Keys**: Fully qualify table names when referencing across schemas
4. **Migration Order**: Core modules first, dependent modules later
5. **Rollback Strategy**: Each migration includes a `-- DOWN` section for rollback

#### Example Migration Structure

```sql
-- =====================================================
-- CRM Module Migration
-- Schema: crm
-- =====================================================

-- UP
CREATE SCHEMA IF NOT EXISTS crm;

CREATE TABLE IF NOT EXISTS crm.client_documents (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    -- ...
);

-- DOWN
DROP SCHEMA IF EXISTS crm CASCADE;
```

#### Troubleshooting Schema Issues

**Table Not Found Error**:
```
ERROR: relation "client_team_assignments" does not exist
```
**Solution**: The table exists in `crm` schema, not `public`. Ensure:
1. Migration `007_crm_module.sql` has been run
2. Drizzle schema definition uses `pgSchema("crm")`
3. API queries reference the correct schema

**Check Existing Schemas**:
```sql
-- List all schemas
SELECT schema_name FROM information_schema.schemata;

-- List tables in a schema
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'crm';
```

### Module/Submodule Navigation

The UI is organized by modules with submodules. The first module implemented is `Accounting` with the following submodules. A dedicated home page at `/accounting` gives quick access tiles similar to ERP dashboards.

- Accounting (module)
  - Chart of Accounts
  - General Ledger
  - Accounts Receivable
  - Accounts Payable
  - Bank Reconciliation

Routing lives in `client/src/App.tsx` and the sidebar configuration in `client/src/components/layout/Sidebar.tsx`. The Accounting module home is at `client/src/pages/accounting/AccountingHome.tsx`.

Permissions for visibility are enforced in the sidebar through `usePermissions`. The Accounting module requires `ACCOUNTS_VIEW` at minimum.

## Security Notes

1. **Change default secrets** in production
2. **Use HTTPS** in production (Certbot recommended)
3. **Regular updates** of dependencies
4. **Database backups** scheduled regularly
5. **Firewall configuration** properly set
6. **User permissions** reviewed periodically

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review logs for error details
3. Verify all environment variables are set correctly
4. Ensure database connectivity

## License

This project is licensed under the MIT License.
