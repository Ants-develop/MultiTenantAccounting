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

### System Requirements

- **Operating System**: Ubuntu 24.04 LTS (fresh installation recommended)
- **RAM**: Minimum 2GB, 4GB+ recommended
- **Disk Space**: Minimum 10GB free space
- **Network**: Internet connection for package installation and database access

### Required Software

- **Node.js** 20.x LTS and npm 10.x
- **Docker** 24.0+ and Docker Compose plugin
- **Git** for cloning the repository
- **Build tools**: build-essential, python3
- **Neon Database** account (free tier available) - for PostgreSQL
- **Domain name** (optional, for production)

### Optional Software

- **PM2** for process management (production)
- **Nginx** for reverse proxy (production)
- **Certbot** for SSL certificates (production)

## Installation Steps

### 1. Initial Server Setup (Ubuntu 24.04)

Update the system and install essential build tools:

```bash
# Update package lists
sudo apt update && sudo apt upgrade -y

# Install essential build tools and dependencies
sudo apt install -y \
    build-essential \
    curl \
    wget \
    git \
    python3 \
    python3-pip \
    ca-certificates \
    gnupg \
    lsb-release

# Verify Git installation
git --version
```

**Verification:**
```bash
# Check system information
lsb_release -a
python3 --version
```

### 2. Node.js Installation

Install Node.js 20.x LTS using the official NodeSource repository:

```bash
# Add NodeSource repository for Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

**Important**: Ensure you have Node.js 20.x. If you see a different version, remove it first:
```bash
# Remove old Node.js if needed
sudo apt remove nodejs npm -y
sudo apt autoremove -y
# Then re-run the NodeSource installation above
```

Install global packages required for development:

```bash
# Install tsx (TypeScript executor) - version 4.19.1+ required for --env-file support
sudo npm install -g tsx@^4.19.1

# Install Drizzle Kit for database management
sudo npm install -g drizzle-kit

# Install PM2 for process management (production)
sudo npm install -g pm2

# Verify tsx installation and version
tsx --version  # Should show 4.19.1 or higher
```

**Verification:**
```bash
# Check all global packages
npm list -g --depth=0
```

### 3. Docker Installation

Install Docker using the official Docker repository (not Ubuntu's docker.io package):

```bash
# Remove old Docker versions if any
sudo apt remove docker docker-engine docker.io containerd runc -y

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Update package index
sudo apt update

# Install Docker Engine, CLI, and Docker Compose plugin
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start and enable Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Add current user to docker group (to run docker without sudo)
sudo usermod -aG docker $USER

# Verify Docker installation
docker --version
docker compose version
```

**Important**: After adding user to docker group, you MUST either:
1. **Log out and log back in** (recommended), OR
2. Run `newgrp docker` in your current terminal session

**Verification:**
```bash
# If you didn't log out, activate docker group in current session:
newgrp docker

# Test Docker without sudo
docker run hello-world

# Check Docker service status
sudo systemctl status docker

# Verify you're in docker group
groups | grep docker
```

### 4. MSSQL Server Setup (Docker)

MSSQL Server is required for importing legacy .bak files from MSSQL databases.

```bash
# Navigate to your project directory
cd ~/MultiTenantAccounting

# Start MSSQL Server container using docker-compose
docker compose up -d

# Wait a few seconds for MSSQL to initialize, then verify it's running
docker compose ps

# Check MSSQL logs to ensure it started successfully
docker compose logs mssql

# Test MSSQL connection (using password from docker-compose.yml)
docker exec -it mssql-server /opt/mssql-tools/bin/sqlcmd \
  -S localhost -U SA -P "asQW12ZX12!!" \
  -Q "SELECT @@VERSION"
```

**Default MSSQL Credentials** (from docker-compose.yml):
- **Server**: localhost
- **Port**: 1433
- **Username**: sa (or SA)
- **Password**: asQW12ZX12!!

**IMPORTANT**: Your `.env` file MUST use the same password:
```env
MSSQL_PASSWORD="asQW12ZX12!!"
```

**To change the password**, edit both `docker-compose.yml` AND `.env` file:
1. Update `MSSQL_SA_PASSWORD` in docker-compose.yml
2. Update `MSSQL_PASSWORD` in .env file
3. Restart container:
```bash
docker compose down
docker compose up -d
```

**Verification:**
```bash
# Check container status
docker compose ps

# Check if port 1433 is listening
sudo netstat -tlnp | grep 1433
# or
sudo ss -tlnp | grep 1433
```

### 5. Clone and Setup Application

```bash
# Clone the repository (replace with your repository URL)
git clone <your-repository-url>
cd MultiTenantAccounting

# Install project dependencies
npm install

# Verify dependencies installed correctly
npm list --depth=0
```

**Verification:**
```bash
# Check if all required packages are installed
npm run check  # TypeScript type checking
```

### 6. Environment Configuration

Create the `.env` file with all required environment variables:

```bash
# Create .env file
nano .env
```

Add the following configuration (replace with your actual values):

```env
# PostgreSQL Database (Neon)
DATABASE_URL="postgresql://username:password@hostname/database?sslmode=require"
NODE_ENV="development"

# Session Configuration
SESSION_SECRET="your-super-secret-session-key-change-this-in-production-min-32-chars"

# Server Configuration
PORT=5000
ALLOWED_HOSTS="react.ants.ge,.ants.ge,localhost"
DOMAIN="react.ants.ge"

# MSSQL Server Configuration (for legacy imports)
# These match the docker-compose.yml defaults
MSSQL_SERVER=localhost
MSSQL_PORT=1433
MSSQL_USERNAME=sa
MSSQL_PASSWORD="asQW12ZX12!!"
MSSQL_DATABASE=Audit
MSSQL_ENCRYPT=true
MSSQL_TRUST_SERVER_CERTIFICATE=true

# Optional: MSSQL Backup Directory (for Windows compatibility)
# MSSQL_BACKUP_PATH="C:\\MSSQLBackups"

# Optional: Google Drive OAuth (for backup restore features)
# GOOGLE_DRIVE_CLIENT_ID="your-client-id"
# GOOGLE_DRIVE_CLIENT_SECRET="your-client-secret"
# GOOGLE_DRIVE_REFRESH_TOKEN="your-refresh-token"

# Optional: Supabase Storage (for backup storage)
# SUPABASE_URL="https://your-project.supabase.co"
# SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

**Important Notes:**
- Replace `DATABASE_URL` with your Neon database connection string
- Generate a strong `SESSION_SECRET` (minimum 32 characters)
- MSSQL credentials match docker-compose.yml defaults
- Optional variables can be added later if needed

**Verification:**
```bash
# Check if .env file exists and is readable
cat .env | grep -v PASSWORD  # View .env without passwords
```

### 7. Neon Database Setup

1. **Create Neon Account**:
   - Go to [neon.tech](https://neon.tech)
   - Sign up for a free account
   - Create a new project

2. **Get Database URL**:
   - In your Neon dashboard, go to "Connection Details"
   - Copy the connection string (format: `postgresql://username:password@hostname/database`)
   - Add `?sslmode=require` to the end if not present

3. **Update .env file** with your `DATABASE_URL`

### 8. Database Schema & Migrations

**Important**: This project uses Supabase for database management. The complete schema is defined in a single unified migration file for clarity and maintainability.

**Schema Location**: `supabase/migrations/20251213000000_unified_schema.sql`

This unified migration includes:
- **Core Module**: User profiles, roles, and permissions
- **Client Module**: Client management, contacts, team assignments
- **Workflow Module**: Templates, stages, pipelines, and workflow execution
- **Task Module**: Task management with templates and checklists
- **CRM Module**: Deal pipeline with stages, activities, and contacts
- **Calendar Module**: Events and participants with RLS
- **Messaging Module**: Conversations, participants, and messages
- **Notification Module**: User notifications
- **Feed Module**: Social feed with posts, likes, and comments

**For New Installations**:
```bash
# Link to your Supabase project
npx supabase link --project-ref your-project-ref

# Push the unified schema to your database
npx supabase db push --linked

# Verify migration status
npx supabase migration list --linked
```

**For Existing Installations**:
The database is already up to date. Old migrations have been archived to `supabase/migrations/archive/` for historical reference.

**Verification:**
```bash
# Check migration status (all should show as applied)
npx supabase migration list --linked

# Test database connection
npm run db:status
```

### 9. Fix tsx --env-file Issue

If you encounter the error `/usr/bin/node: bad option: --env-file=.env`, follow these steps:

**Check tsx version:**
```bash
tsx --version
```

**If version is below 4.19.1**, reinstall tsx:
```bash
sudo npm uninstall -g tsx
sudo npm install -g tsx@^4.19.1
tsx --version  # Verify it's 4.19.1 or higher
```

**Note**: The application also loads `.env` files manually in `server/index.ts`, so even if `--env-file` doesn't work, the application should still function. However, it's recommended to use tsx 4.19.1+ for proper environment variable loading.

**Verification:**
```bash
# Test tsx with env file
tsx --env-file=.env -e "console.log(process.env.NODE_ENV)"
# Should output: development
```

### 10. Build and Test Application

Build the application:

```bash
# Build the frontend and backend
npm run build

# Verify build completed successfully
ls -la dist/
ls -la client/dist/
```

Test the development server:

```bash
# Start development server
npm run dev
```

The application should start on `http://localhost:5000`. Open it in your browser to verify.

**Verification:**
```bash
# Check if server is running
curl http://localhost:5000

# Check process
ps aux | grep node
```

### 11. PM2 Process Management (Production)

For production deployment, use PM2 to manage the application:

Create PM2 ecosystem file:
```bash
nano ecosystem.config.js
```

Add the following configuration:
```javascript
module.exports = {
  apps: [{
    name: 'multitenant-accounting',
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
mkdir -p logs

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the command output to complete the setup
```

**Verification:**
```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs multitenant-accounting

# Monitor resources
pm2 monit
```

### 12. Nginx Reverse Proxy (Optional, Production)

Install and configure Nginx:

```bash
# Install Nginx
sudo apt install nginx -y

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/multitenant-accounting
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
sudo ln -s /etc/nginx/sites-available/multitenant-accounting /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Enable Nginx to start on boot
sudo systemctl enable nginx
```

**Verification:**
```bash
# Check Nginx status
sudo systemctl status nginx

# Test configuration
sudo nginx -t
```

### 13. SSL Certificate (Optional, Production)

Install Certbot for free SSL certificates:

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d react.ants.ge -d www.react.ants.ge

# Test auto-renewal
sudo certbot renew --dry-run
```

**Verification:**
```bash
# Check certificate status
sudo certbot certificates
```

### 14. Firewall Configuration

Configure UFW firewall:

```bash
# Configure UFW firewall
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'  # If using Nginx
# OR
sudo ufw allow 5000/tcp      # If not using Nginx

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

**Verification:**
```bash
# Check firewall rules
sudo ufw status verbose
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

### 4. MSSQL Server Setup (Docker)

**Note**: MSSQL Server is required for importing legacy .bak files from MSSQL databases.

```bash
# The docker-compose.yml file is already configured
# Start MSSQL Server container
cd ~/MultiTenantAccounting
docker-compose up -d

# Verify MSSQL is running
docker-compose ps
docker-compose logs mssql

# Test connection
docker exec -it mssql-server /opt/mssql-tools/bin/sqlcmd \
  -S localhost -U SA -P "xxxxxxxxxx" \
  -Q "SELECT @@VERSION"
```

**Add MSSQL credentials to `.env`:**
```env
# MSSQL Server Configuration (for legacy imports)
MSSQL_SERVER=localhost
MSSQL_PORT=1433
MSSQL_USER=sa
MSSQL_PASSWORD="xxxxxxxxx"
MSSQL_DATABASE=Audit
MSSQL_ENCRYPT=true
MSSQL_TRUST_SERVER_CERTIFICATE=true
```

### 5. PostgreSQL Database Migration

```bash
# Push database schema to Neon
npm run db:push

# Verify tables were created
npx drizzle-kit studio  # Opens database browser
```

### 6. Build Application

```bash
# Build the frontend
npm run build

# Test the build
npm start
```

### 7. PM2 Process Management

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

### 8. Nginx Reverse Proxy (Optional)

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

### 9. SSL Certificate (Optional)

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

#### 1. tsx --env-file Error

**Error**: `/usr/bin/node: bad option: --env-file=.env`

**Solution**:
```bash
# Check tsx version
tsx --version

# If version is below 4.19.1, reinstall
sudo npm uninstall -g tsx
sudo npm install -g tsx@^4.19.1

# Verify installation
tsx --version  # Should show 4.19.1 or higher
```

**Note**: The application also loads `.env` manually, so it may work even with older tsx versions, but 4.19.1+ is recommended.

#### 2. Database Connection Failed

**Symptoms**: Application can't connect to PostgreSQL

**Solutions**:
```bash
# Verify DATABASE_URL in .env file
cat .env | grep DATABASE_URL

# Test connection manually
psql "$DATABASE_URL" -c "SELECT version();"

# Check if SSL mode is required
# Ensure ?sslmode=require is in DATABASE_URL

# Verify Neon database is active
# Check Neon dashboard for database status
```

#### 3. Docker Permission Denied

**Error**: `permission denied while trying to connect to the Docker daemon socket`

**Solution**:
```bash
# Add user to docker group
sudo usermod -aG docker $USER

# IMPORTANT: You must either:
# Option 1: Log out and log back in (recommended)
# Option 2: Activate docker group in current session:
newgrp docker

# Verify you're in docker group
groups | grep docker

# Test Docker without sudo
docker run hello-world

# If still having issues, check docker socket permissions
ls -la /var/run/docker.sock
# Should show: srw-rw---- 1 root docker

# If permissions are wrong, restart docker service
sudo systemctl restart docker
```

#### 4. MSSQL Connection Failed

**Symptoms**: Can't connect to MSSQL Server, "Login failed for user 'sa'"

**Solutions**:

**Step 1: Verify MSSQL container is running**
```bash
# Check container status
docker compose ps

# If not running, start it
docker compose up -d

# Wait 10-15 seconds for MSSQL to initialize, then check logs
docker compose logs mssql | tail -20
```

**Step 2: Test connection from inside container**
```bash
# Test with password from docker-compose.yml
docker exec -it mssql-server /opt/mssql-tools/bin/sqlcmd \
  -S localhost -U SA -P "asQW12ZX12!!" \
  -Q "SELECT @@VERSION"
```

**Step 3: Verify .env file matches docker-compose.yml**
```bash
# Check MSSQL password in .env
grep MSSQL_PASSWORD .env

# It should match docker-compose.yml password: asQW12ZX12!!
# If different, update .env:
nano .env
# Set: MSSQL_PASSWORD="asQW12ZX12!!"
```

**Step 4: Check if MSSQL is listening**
```bash
# Verify port 1433 is open
sudo ss -tlnp | grep 1433
# Should show: LISTEN 0 128 *:1433

# If not listening, restart container
docker compose restart mssql
```

**Step 5: Reset MSSQL password (if needed)**
```bash
# Stop container
docker compose down

# Remove the volume (WARNING: This deletes all MSSQL data)
docker volume rm multitenantaccounting_mssql-data

# Start fresh
docker compose up -d

# Wait 15-20 seconds, then test
docker exec -it mssql-server /opt/mssql-tools/bin/sqlcmd \
  -S localhost -U SA -P "asQW12ZX12!!" \
  -Q "SELECT 1"
```

**Step 6: Verify environment variables are loaded**
```bash
# Test if .env is being read correctly
node -e "require('dotenv').config(); console.log('MSSQL_PASSWORD:', process.env.MSSQL_PASSWORD ? 'SET' : 'NOT SET')"

# Or check in application
npm run dev
# Look for MSSQL Connection Config in logs
```

**Common Issues:**
- Password mismatch between .env and docker-compose.yml
- MSSQL container not fully initialized (wait 15-20 seconds after start)
- MSSQL container crashed (check logs: `docker compose logs mssql`)
- Wrong username (should be `sa` or `SA`, not `MSSQL_USER`)

#### 5. Port Already in Use

**Error**: `EADDRINUSE: address already in use :::5000`

**Solution**:
```bash
# Find process using port 5000
sudo lsof -i :5000
# or
sudo ss -tlnp | grep 5000

# Kill the process (replace PID with actual process ID)
sudo kill -9 <PID>

# OR change PORT in .env file
nano .env  # Change PORT=5000 to PORT=5001
```

#### 6. Node.js Version Issues

**Error**: Package requires different Node.js version

**Solution**:
```bash
# Check current Node.js version
node --version  # Should be v20.x.x

# If wrong version, reinstall Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version
npm --version
```

#### 7. Build Failures

**Error**: Build process fails or dependencies don't install

**Solution**:
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall dependencies
npm install

# If still failing, check Node.js and npm versions
node --version  # Should be v20.x.x
npm --version   # Should be 10.x.x
```

#### 8. Docker Compose Command Not Found

**Error**: `docker-compose: command not found`

**Solution**:
```bash
# Ubuntu 24.04 uses Docker Compose plugin (docker compose, not docker-compose)
# Use: docker compose up -d
# Instead of: docker-compose up -d

# Verify plugin is installed
docker compose version
```

#### 9. MSSQL Backup Access Denied (Windows)

**Error**: `Cannot open backup device... Access is denied`

**Solution**:
- The application automatically uses SQL Server-accessible directories
- Set `MSSQL_BACKUP_PATH` in .env to a directory SQL Server can access
- Default locations tried: `C:\Program Files\Microsoft SQL Server\MSSQL15.MSSQLSERVER\MSSQL\Backup`

#### 10. PM2 Process Not Starting

**Error**: PM2 can't start the application

**Solution**:
```bash
# Check PM2 logs
pm2 logs

# Check if .env file is readable
cat .env

# Verify NODE_ENV is set correctly
echo $NODE_ENV

# Try starting manually first
npm start

# Then use PM2
pm2 start ecosystem.config.js
```

### Verification Commands

Run these commands to verify your installation:

```bash
# System
lsb_release -a                    # Ubuntu version
node --version                    # Node.js version (should be v20.x.x)
npm --version                     # npm version (should be 10.x.x)
tsx --version                     # tsx version (should be 4.19.1+)

# Docker
docker --version                  # Docker version
docker compose version            # Docker Compose version
docker compose ps                 # Running containers

# MSSQL
docker compose logs mssql         # MSSQL logs
sudo ss -tlnp | grep 1433         # Check if MSSQL port is open

# Application
npm run db:status                 # Database connection status
npm run check                     # TypeScript compilation
npm run build                     # Build application
```

### Logs Location

- **PM2 logs**: `./logs/err.log`, `./logs/out.log`, `./logs/combined.log`
- **Nginx logs**: `/var/log/nginx/access.log`, `/var/log/nginx/error.log`
- **Docker logs**: `docker compose logs mssql`
- **Application logs**: Check PM2 logs or console output

### Getting Help

If you encounter issues not covered here:

1. Check application logs: `pm2 logs` or `npm run dev` output
2. Verify all environment variables are set: `cat .env`
3. Check database connectivity: `npm run db:status`
4. Verify Docker containers: `docker compose ps`
5. Review system resources: `free -h`, `df -h`

## Environment Variables

### Required Variables

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string (Neon) | `postgresql://user:pass@host/db?sslmode=require` | Yes |
| `SESSION_SECRET` | Secret key for session encryption (min 32 chars) | `your-super-secret-key-here` | Yes |

### Server Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode (`development` or `production`) | `development` | No |
| `PORT` | Application server port | `5000` | No |
| `ALLOWED_HOSTS` | Comma-separated list of allowed hostnames | - | No |
| `DOMAIN` | Primary domain name | - | No |

### MSSQL Server Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `MSSQL_SERVER` | MSSQL server hostname | `localhost` | Yes* |
| `MSSQL_PORT` | MSSQL server port | `1433` | No |
| `MSSQL_USERNAME` or `MSSQL_USER` | MSSQL username | `sa` | Yes* |
| `MSSQL_PASSWORD` | MSSQL password | - | Yes* |
| `MSSQL_DATABASE` | Default MSSQL database | `Audit` | No |
| `MSSQL_ENCRYPT` | Enable encryption | `true` | No |
| `MSSQL_TRUST_SERVER_CERTIFICATE` | Trust server certificate | `true` | No |
| `MSSQL_BACKUP_PATH` | Custom backup directory path (Windows) | - | No |

*Required only if using MSSQL import/restore features

### Optional: Google Drive OAuth

| Variable | Description | Required |
|----------|-------------|----------|
| `GOOGLE_DRIVE_CLIENT_ID` | Google OAuth client ID | No |
| `GOOGLE_DRIVE_CLIENT_SECRET` | Google OAuth client secret | No |
| `GOOGLE_DRIVE_REFRESH_TOKEN` | Google OAuth refresh token | No |

### Optional: Supabase Storage

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Supabase project URL | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | No |

### Frontend: Supabase (Practice Management)

The React app uses `supabase-js` directly for Practice Management data.

- Vite loads env files from the Vite `root`, which is the `client/` folder in this repo.
- Create `client/.env` based on `client/.env.example`.

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Supabase project URL | Yes (for Practice Management) |
| `VITE_SUPABASE_ANON_KEY` or `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key | Yes (for Practice Management) |

### Example .env File

```env
# PostgreSQL Database
DATABASE_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require"
NODE_ENV="development"

# Session
SESSION_SECRET="your-super-secret-session-key-minimum-32-characters-long"

# Server
PORT=5000
ALLOWED_HOSTS="react.ants.ge,.ants.ge,localhost"
DOMAIN="react.ants.ge"

# MSSQL (matches docker-compose.yml)
MSSQL_SERVER=localhost
MSSQL_PORT=1433
MSSQL_USERNAME=sa
MSSQL_PASSWORD="asQW12ZX12!!"
MSSQL_DATABASE=Audit
MSSQL_ENCRYPT=true
MSSQL_TRUST_SERVER_CERTIFICATE=true

# Optional: Google Drive
# GOOGLE_DRIVE_CLIENT_ID="your-client-id"
# GOOGLE_DRIVE_CLIENT_SECRET="your-client-secret"
# GOOGLE_DRIVE_REFRESH_TOKEN="your-refresh-token"

# Optional: Supabase
# SUPABASE_URL="https://xxx.supabase.co"
# SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

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
