# Production Deployment Checklist - lovable.ants.ge

## Pre-Deployment

- [ ] **Server Setup**
  - [ ] Ubuntu 20.04+ or Debian 11+ installed
  - [ ] Node.js 20.x installed
  - [ ] Nginx installed and running
  - [ ] SSH access configured
  - [ ] Domain DNS configured (A record for lovable.ants.ge)

- [ ] **Environment Configuration**
  - [ ] `.env` file created in project root
  - [ ] `client/.env` file created with Vite variables
  - [ ] Database URL configured
  - [ ] Supabase credentials added
  - [ ] Session secret generated (random string)
  - [ ] All sensitive data secured

- [ ] **Database Setup**
  - [ ] Supabase project created
  - [ ] Database migrations applied
  - [ ] Database connection tested

## Deployment Steps

### 1. Transfer Files to Server

```bash
# Option A: Git (Recommended)
git clone <repository-url> /var/www/lovable.ants.ge-app
cd /var/www/lovable.ants.ge-app

# Option B: SCP
scp -r ./MultiTenantAccounting user@server:/var/www/lovable.ants.ge-app
```

- [ ] Files transferred to server
- [ ] Navigate to project directory

### 2. Install Dependencies

```bash
npm ci --production=false
```

- [ ] Dependencies installed successfully
- [ ] No errors in installation

### 3. Configure Environment

```bash
# Copy .env files
cp .env.example .env
cp client/.env.example client/.env

# Edit with your values
nano .env
nano client/.env
```

- [ ] `.env` file configured
- [ ] `client/.env` file configured
- [ ] All credentials verified

### 4. Run Deployment

```bash
# Make deploy script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

- [ ] Build completed successfully
- [ ] PM2 started successfully
- [ ] Nginx configured
- [ ] No errors in deployment

### 5. Verify Deployment

```bash
# Check PM2 status
pm2 status

# Check application health
curl http://localhost:4000/health

# Check nginx
sudo nginx -t
```

- [ ] PM2 shows "online" status
- [ ] Backend responds on port 4000
- [ ] Nginx configuration is valid

### 6. Test Application

- [ ] Visit http://lovable.ants.ge
- [ ] Frontend loads correctly
- [ ] Can login to application
- [ ] API requests working
- [ ] No console errors

### 7. Setup SSL Certificate

```bash
sudo certbot --nginx -d lovable.ants.ge
```

- [ ] SSL certificate obtained
- [ ] HTTPS redirect working
- [ ] Visit https://lovable.ants.ge works
- [ ] Auto-renewal configured

## Post-Deployment

### Monitoring Setup

- [ ] PM2 logs working: `pm2 logs lovable-ants-backend`
- [ ] Nginx logs accessible
- [ ] PM2 startup configured: `pm2 startup`
- [ ] PM2 process list saved: `pm2 save`

### Performance Verification

- [ ] Static assets loading fast (check browser DevTools)
- [ ] API response times acceptable
- [ ] No memory leaks (check `pm2 monit`)
- [ ] Application restarts automatically on crash

### Security Checks

- [ ] SSL certificate valid
- [ ] Security headers present (check browser DevTools)
- [ ] No credentials in source code
- [ ] Firewall configured (if applicable)
- [ ] File permissions correct

### Documentation

- [ ] Update README with production URL
- [ ] Document any custom configuration
- [ ] Save deployment notes
- [ ] Update team on deployment status

## Useful Commands

### PM2 Management
```bash
pm2 status                          # Check status
pm2 logs lovable-ants-backend       # View logs
pm2 restart lovable-ants-backend    # Restart app
pm2 monit                           # Monitor resources
```

### Nginx Management
```bash
sudo nginx -t                       # Test config
sudo systemctl reload nginx         # Reload nginx
sudo systemctl status nginx         # Check status
```

### Quick Redeployment
```bash
git pull origin main                # Pull latest code
./deploy.sh                         # Redeploy
```

## Rollback Plan

If something goes wrong:

```bash
# Stop PM2 process
pm2 stop lovable-ants-backend

# Revert to previous commit
git checkout <previous-commit>

# Rebuild and restart
npm run build
pm2 restart lovable-ants-backend
```

## Common Issues & Solutions

### Issue: PM2 won't start
**Solution**: Check logs with `pm2 logs lovable-ants-backend --err`

### Issue: 502 Bad Gateway
**Solution**: 
```bash
pm2 restart lovable-ants-backend
sudo systemctl restart nginx
```

### Issue: Static files not loading
**Solution**:
```bash
sudo chown -R www-data:www-data /var/www/lovable.ants.ge/public/
sudo systemctl reload nginx
```

### Issue: Database connection failed
**Solution**: Verify `.env` DATABASE_URL is correct and accessible

## Support Contacts

- **Server Admin**: [Your Name]
- **Database Admin**: [Database Admin]
- **Emergency Contact**: [Emergency Contact]

## Next Steps After Deployment

1. [ ] Setup monitoring (optional - PM2 Plus, UptimeRobot, etc.)
2. [ ] Configure automated backups
3. [ ] Setup log rotation (if needed beyond PM2 default)
4. [ ] Document any custom configurations
5. [ ] Train team on deployment process
6. [ ] Setup CI/CD pipeline (optional)

---

**Deployment Date**: ___________  
**Deployed By**: ___________  
**Production URL**: https://lovable.ants.ge  
**Status**: [ ] Success [ ] Failed [ ] Partial
