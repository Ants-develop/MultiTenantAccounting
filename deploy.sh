#!/bin/bash

# Production Deployment Script for lovable.ants.ge
# This script builds the application and deploys it with PM2

set -e  # Exit on error

echo "======================================"
echo "  lovable.ants.ge Deployment Script"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_DIR="/var/www/lovable.ants.ge"
APP_NAME="lovable-ants-backend"
BACKEND_PORT=4000

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check if running on production server
if [ ! -d "/etc/nginx" ]; then
    print_error "This script should be run on the production server with nginx installed"
    exit 1
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    print_warning "PM2 is not installed. Installing globally..."
    sudo npm install -g pm2
    print_status "PM2 installed successfully"
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_error ".env file not found! Please create it from .env.example"
    exit 1
fi

# Check if client/.env file exists
if [ ! -f "client/.env" ]; then
    print_warning "client/.env file not found! Frontend build may fail or be missing configuration."
    print_warning "Creating client/.env from .env (filtering for VITE_ variables)..."
    grep "^VITE_" .env > client/.env || true
    if [ ! -s "client/.env" ]; then
        print_error "No VITE_ variables found in .env and client/.env is missing."
        print_error "Please create client/.env with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY"
        exit 1
    fi
    print_status "Created client/.env from .env"
fi

print_status "Environment variables loaded"

# Create logs directory
mkdir -p logs
print_status "Logs directory created"

# Install dependencies
echo ""
echo "Installing dependencies..."
npm ci --production=false
print_status "Dependencies installed"

# Build the application
echo ""
echo "Building application..."
npm run build
print_status "Application built successfully"

# Check if build output exists
if [ ! -d "dist/public" ]; then
    print_error "Build failed! dist/public directory not found"
    exit 1
fi

if [ ! -f "dist/index.js" ]; then
    print_error "Build failed! dist/index.js not found"
    exit 1
fi

print_status "Build verification passed"

# Create deployment directory if it doesn't exist
echo ""
echo "Setting up deployment directory..."
sudo mkdir -p "$DEPLOY_DIR/public"
sudo chown -R $USER:$USER "$DEPLOY_DIR"
print_status "Deployment directory ready: $DEPLOY_DIR"

# Copy static files to nginx directory
echo ""
echo "Copying static files to $DEPLOY_DIR/public..."
cp -r dist/public/* "$DEPLOY_DIR/public/"
print_status "Static files copied"

# Setup nginx if not already configured
echo ""
if [ ! -f "/etc/nginx/sites-available/lovable.ants.ge" ]; then
    print_warning "Nginx configuration not found. Setting up..."
    
    sudo cp nginx.lovable.ants.ge.conf /etc/nginx/sites-available/lovable.ants.ge
    
    # Update root path in nginx config
    sudo sed -i "s|/var/www/lovable.ants.ge/public|$DEPLOY_DIR/public|g" /etc/nginx/sites-available/lovable.ants.ge
    
    # Create symlink
    sudo ln -sf /etc/nginx/sites-available/lovable.ants.ge /etc/nginx/sites-enabled/lovable.ants.ge
    
    # Test nginx configuration
    if sudo nginx -t; then
        sudo systemctl reload nginx
        print_status "Nginx configured and reloaded"
    else
        print_error "Nginx configuration test failed!"
        exit 1
    fi
else
    print_status "Nginx already configured"
fi

# Stop existing PM2 process if running
echo ""
if pm2 describe "$APP_NAME" &> /dev/null; then
    print_warning "Stopping existing PM2 process..."
    pm2 stop "$APP_NAME"
    pm2 delete "$APP_NAME"
    print_status "Existing process stopped"
fi

# Start application with PM2
echo ""
echo "Starting application with PM2..."
pm2 start ecosystem.config.cjs
print_status "Application started with PM2"

# Save PM2 process list
pm2 save
print_status "PM2 process list saved"

# Setup PM2 to start on boot (only needs to be done once)
if ! systemctl is-enabled pm2-$USER &> /dev/null; then
    print_warning "Setting up PM2 startup script..."
    pm2 startup systemd -u $USER --hp $HOME
    sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME
    print_status "PM2 startup configured"
fi

# Display PM2 status
echo ""
echo "======================================"
echo "  Deployment Status"
echo "======================================"
pm2 status

echo ""
echo "======================================"
echo "  Application Information"
echo "======================================"
echo "Backend URL: http://localhost:$BACKEND_PORT"
echo "Public URL: http://lovable.ants.ge"
echo "Static files: $DEPLOY_DIR/public"
echo "Logs: ./logs/pm2-*.log"
echo ""
echo "Useful commands:"
echo "  pm2 status              - View process status"
echo "  pm2 logs $APP_NAME      - View logs"
echo "  pm2 restart $APP_NAME   - Restart application"
echo "  pm2 stop $APP_NAME      - Stop application"
echo "  pm2 monit               - Monitor resources"
echo ""

# Check if application is responding
echo "Checking application health..."
sleep 3
if curl -f http://localhost:$BACKEND_PORT/health &> /dev/null || curl -f http://localhost:$BACKEND_PORT/api/ &> /dev/null; then
    print_status "Application is responding"
else
    print_warning "Application may not be responding. Check logs: pm2 logs $APP_NAME"
fi

echo ""
print_status "Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Verify the site is working: http://lovable.ants.ge"
echo "2. Setup SSL certificate: sudo certbot --nginx -d lovable.ants.ge"
echo "3. Monitor logs: pm2 logs $APP_NAME"
echo ""
