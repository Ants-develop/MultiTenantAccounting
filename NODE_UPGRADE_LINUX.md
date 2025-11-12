# Upgrading Node.js on Linux Server

## Current Status
- **Current**: Node.js v18.19.1, npm 9.2.0
- **Required**: Node.js >=24.2.0, npm >=10.0.0

## Method 1: Using NVM (Node Version Manager) - Recommended

```bash
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload your shell
source ~/.bashrc

# Install Node.js 24
nvm install 24

# Use Node.js 24
nvm use 24

# Make it default
nvm alias default 24

# Verify
node --version  # Should show v24.x.x
npm --version   # Should show 10.x.x
```

## Method 2: Using NodeSource Repository

```bash
# Remove old Node.js
sudo apt remove nodejs npm -y

# Add NodeSource repository for Node.js 24
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -

# Install Node.js 24
sudo apt-get install -y nodejs

# Verify
node --version  # Should show v24.x.x
npm --version   # Should show 10.x.x
```

## Method 3: Using Snap

```bash
# Remove old Node.js
sudo apt remove nodejs npm -y

# Install Node.js 24 via snap
sudo snap install node --channel=24/stable --classic

# Verify
node --version  # Should show v24.x.x
npm --version   # Should show 10.x.x
```

## After Upgrading

```bash
# Reinstall dependencies
npm install

# Run dev server
npm run dev
```

