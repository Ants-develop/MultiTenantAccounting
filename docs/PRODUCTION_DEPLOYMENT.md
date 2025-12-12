# Production Deployment Guide - lovable.ants.ge

This guide covers deploying the Multi-Tenant Accounting application to production using PM2 and Nginx on **lovable.ants.ge**.

## Prerequisites

### Server Requirements
- Ubuntu 20.04+ or Debian 11+
- Node.js 20.x LTS
- Nginx 1.18+
- PM2 (will be installed automatically)
- Domain pointing to server: `lovable.ants.ge`

### Before You Start
Ensure you have:
- ✅ SSH access to your production server
- ✅ Domain DNS configured (A record pointing to server IP)
- ✅ Supabase project configured
- ✅ All environment variables ready

## Quick Deployment

### Option 1: Automated Deployment (Recommended)

```bash
# On your production server, navigate to the project directory
cd /path/to/MultiTenantAccounting

# Make deploy script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

The script will automatically:
1. Install PM2 if needed
2. Install dependencies
3. Build the application
4. Copy static files to nginx directory
5. Configure nginx
6. Start the backend with PM2
7. Setup auto-restart on reboot

### Option 2: Manual Deployment

If you prefer manual control, follow these steps:

#### Step 1: Install PM2

```bash
sudo npm install -g pm2
```

#### Step 2: Build Application

```bash
# Install dependencies
npm ci --production=false

# Build frontend and backend
npm run build
```

This creates:
- `dist/public/` - Frontend static files
- `dist/index.js` - Backend server bundle

#### Step 3: Setup Nginx

```bash
# Create deployment directory
sudo mkdir -p /var/www/lovable.ants.ge/public
sudo chown -R $USER:$USER /var/www/lovable.ants.ge

# Copy static files
cp -r dist/public/* /var/www/lovable.ants.ge/public/

# Copy nginx configuration
sudo cp nginx.lovable.ants.ge.conf /etc/nginx/sites-available/lovable.ants.ge

# Create symlink
sudo ln -s /etc/nginx/sites-available/lovable.ants.ge /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

#### Step 4: Start with PM2

```bash
# Start application
pm2 start ecosystem.config.cjs

# Save PM2 process list
pm2 save

# Setup startup script (run once)
pm2 startup systemd
# Follow the command PM2 outputs
```

## Configuration Files

### PM2 Configuration: `ecosystem.config.cjs`

```javascript
module.exports = {
  apps: [{
    name: 'lovable-ants-backend',
    script: './dist/index.js',
    instances: 1,
    env: {
      NODE_ENV: 'production',
      PORT: 4000,
    },
    env_file: '.env',
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    autorestart: true,
    max_memory_restart: '1G',
    cron_restart: '0 4 * * *', // Restart daily at 4 AM
  }]
};
```

### Nginx Configuration: `nginx.lovable.ants.ge.conf`

Key features:
- Serves static files from `/var/www/lovable.ants.ge/public`
- Proxies API requests to backend on port 4000
- Gzip compression enabled
- Security headers configured
- Static asset caching (1 year)
- SPA routing support
- File upload limit: 50MB

## Environment Variables

### Required `.env` file

Create/update `.env` in project root:

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/database

# Backend Server
NODE_ENV=production
PORT=4000
SESSION_SECRET=your-random-secret-key-here-change-this

# Supabase (Practice Management)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Frontend Environment: `client/.env`

```bash
# Supabase for Vite client
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## SSL Certificate Setup

After initial deployment, secure your site with SSL:

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain certificate
sudo certbot --nginx -d lovable.ants.ge

# Test auto-renewal
sudo certbot renew --dry-run
```

Certbot will automatically:
- Generate SSL certificates
- Update nginx configuration
- Setup auto-renewal cron job

After SSL setup, your site will be available at: `https://lovable.ants.ge`

## PM2 Commands

### Status & Monitoring

```bash
# View all processes
pm2 status

# Monitor resources in real-time
pm2 monit

# View logs (live)
pm2 logs lovable-ants-backend

# View last 100 lines
pm2 logs lovable-ants-backend --lines 100

# View only errors
pm2 logs lovable-ants-backend --err
```

### Process Management

```bash
# Restart application
pm2 restart lovable-ants-backend

# Stop application
pm2 stop lovable-ants-backend

# Delete process
pm2 delete lovable-ants-backend

# Reload (zero-downtime restart)
pm2 reload lovable-ants-backend
```

### Useful PM2 Commands

```bash
# Show detailed process info
pm2 describe lovable-ants-backend

# Reset restart count
pm2 reset lovable-ants-backend

# Pull logs (last 20 lines)
pm2 flush  # Clear logs
```

## Nginx Commands

```bash
# Test configuration
sudo nginx -t

# Reload configuration (no downtime)
sudo systemctl reload nginx

# Restart nginx
sudo systemctl restart nginx

# Check status
sudo systemctl status nginx

# View error logs
sudo tail -f /var/log/nginx/lovable.ants.ge.error.log

# View access logs
sudo tail -f /var/log/nginx/lovable.ants.ge.access.log
```

## Troubleshooting

### Application Not Starting

```bash
# Check PM2 logs
pm2 logs lovable-ants-backend --err

# Common issues:
# 1. Missing .env file
# 2. Wrong NODE_ENV
# 3. Port already in use
# 4. Missing dependencies

# Verify environment
pm2 describe lovable-ants-backend

# Check if port is available
sudo lsof -i :4000
```

### 502 Bad Gateway

```bash
# Check if backend is running
pm2 status

# Check backend logs
pm2 logs lovable-ants-backend

# Restart backend
pm2 restart lovable-ants-backend

# Check nginx error logs
sudo tail -f /var/log/nginx/lovable.ants.ge.error.log
```

### Static Files Not Loading

```bash
# Verify files exist
ls -la /var/www/lovable.ants.ge/public/

# Check permissions
sudo chown -R www-data:www-data /var/www/lovable.ants.ge/public/
sudo chmod -R 755 /var/www/lovable.ants.ge/public/

# Check nginx configuration
sudo nginx -t
```

### Database Connection Issues

```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1;"

# Check environment variables
pm2 describe lovable-ants-backend | grep -A 20 "env:"

# Restart with fresh environment
pm2 restart lovable-ants-backend --update-env
```

## Updates & Redeployment

### Quick Update

```bash
# Pull latest code
git pull origin main

# Run deployment script
./deploy.sh
```

### Manual Update

```bash
# Pull code
git pull origin main

# Install dependencies
npm ci --production=false

# Build
npm run build

# Copy static files
cp -r dist/public/* /var/www/lovable.ants.ge/public/

# Restart backend
pm2 restart lovable-ants-backend
```

## Performance Optimization

### PM2 Cluster Mode (Optional)

For high-traffic scenarios, use cluster mode:

```javascript
// ecosystem.config.cjs
module.exports = {
  apps: [{
    name: 'lovable-ants-backend',
    script: './dist/index.js',
    instances: 'max', // or specific number like 2, 4
    exec_mode: 'cluster',
    // ... rest of config
  }]
};
```

### Nginx Caching

Already configured in `nginx.lovable.ants.ge.conf`:
- Static assets: 1 year cache
- API requests: No cache
- Gzip compression enabled

## Monitoring

### Setup PM2 Monitoring (Optional)

```bash
# Create PM2 account at https://app.pm2.io/
pm2 link <secret> <public>

# Now monitor from web dashboard
```

### Log Rotation

PM2 log rotation is built-in. Logs are at:
- `./logs/pm2-out.log` - Standard output
- `./logs/pm2-error.log` - Error output

### Health Checks

```bash
# Check backend health
curl http://localhost:4000/health

# Check public site
curl http://lovable.ants.ge/health

# Check API
curl http://lovable.ants.ge/api/
```

## Security Checklist

- [x] SSL certificate installed
- [x] Security headers configured in nginx
- [x] File upload limits set (50MB)
- [x] Session secret is random and secure
- [x] Database credentials in .env (not committed)
- [x] PM2 process running as non-root user
- [ ] Firewall configured (allow 80, 443, SSH only)
- [ ] Regular backups scheduled
- [ ] Log monitoring setup

## Backup Strategy

### Database Backups

```bash
# Manual backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Automated backups (add to crontab)
0 2 * * * pg_dump $DATABASE_URL > /backups/db_$(date +\%Y\%m\%d).sql
```

### Application Backups

```bash
# Backup .env and uploads
tar -czf backup_$(date +%Y%m%d).tar.gz .env uploads/ logs/
```

## Support

For issues or questions:
1. Check logs: `pm2 logs lovable-ants-backend`
2. Check nginx logs: `/var/log/nginx/lovable.ants.ge.error.log`
3. Review this guide's troubleshooting section
4. Check application status: `pm2 status`

## Quick Reference

| Command | Description |
|---------|-------------|
| `./deploy.sh` | Full deployment |
| `pm2 restart lovable-ants-backend` | Restart app |
| `pm2 logs lovable-ants-backend` | View logs |
| `pm2 monit` | Monitor resources |
| `sudo nginx -t` | Test nginx config |
| `sudo systemctl reload nginx` | Reload nginx |
| `pm2 save` | Save process list |

---

**Production URL**: https://lovable.ants.ge  
**Backend Port**: 4000  
**Process Name**: lovable-ants-backend  
**Deployment Directory**: /var/www/lovable.ants.ge
