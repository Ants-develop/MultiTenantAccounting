# Installing ODBC Driver 17 for SQL Server on Linux

This guide explains how to install the Microsoft ODBC Driver 17 for SQL Server on Linux to enable MSSQL database connections.

## For Ubuntu/Debian

### Method 1: Using Microsoft's Official Repository (Recommended)

```bash
# 1. Import Microsoft repository signing key
curl https://packages.microsoft.com/keys/microsoft.asc | sudo apt-key add -

# 2. Add Microsoft's Ubuntu repository
# For Ubuntu 22.04 (Jammy)
curl https://packages.microsoft.com/config/ubuntu/22.04/prod.list | sudo tee /etc/apt/sources.list.d/mssql-release.list

# For Ubuntu 20.04 (Focal), use:
# curl https://packages.microsoft.com/config/ubuntu/20.04/prod.list | sudo tee /etc/apt/sources.list.d/mssql-release.list

# 3. Update package list
sudo apt-get update

# 4. Install ODBC Driver 17
sudo ACCEPT_EULA=Y apt-get install -y msodbcsql17

# 5. Install unixODBC development package (required for pyodbc)
sudo apt-get install -y unixodbc-dev

# 6. Verify installation
odbcinst -q -d
```

You should see `ODBC Driver 17 for SQL Server` in the output.

### Method 2: Manual Installation (Alternative)

If the repository method doesn't work, you can download the .deb package directly:

```bash
# Download the package (for Ubuntu 22.04)
wget https://packages.microsoft.com/ubuntu/22.04/prod/pool/main/m/msodbcsql17/msodbcsql17_17.10.2.1-1_amd64.deb

# Install it
sudo ACCEPT_EULA=Y dpkg -i msodbcsql17_17.10.2.1-1_amd64.deb

# Fix any dependency issues
sudo apt-get install -f
```

## For RHEL/CentOS/Fedora

```bash
# 1. Add Microsoft's repository
sudo curl -o /etc/yum.repos.d/mssql-release.repo https://packages.microsoft.com/config/rhel/8/prod.repo

# 2. Remove any existing older versions
sudo yum remove unixODBC-utf16 unixODBC-utf16-devel

# 3. Install ODBC Driver 17
sudo ACCEPT_EULA=Y yum install -y msodbcsql17

# 4. Install unixODBC development package
sudo yum install -y unixODBC-devel

# 5. Verify installation
odbcinst -q -d
```

## Alternative: FreeTDS Driver (Open Source)

If you prefer an open-source alternative or have issues with Microsoft's driver:

### For Ubuntu/Debian:
```bash
sudo apt-get update
sudo apt-get install -y tdsodbc unixodbc-dev
```

### For RHEL/CentOS:
```bash
sudo yum install -y freetds freetds-devel unixODBC unixODBC-devel
```

Then configure FreeTDS:
```bash
# Edit FreeTDS configuration
sudo nano /etc/freetds/freetds.conf

# Or use environment variable in your Python script:
# For FreeTDS, change driver to: 'FreeTDS'
```

## Verify Installation

After installation, verify the driver is available:

```bash
# List all available ODBC drivers
odbcinst -q -d

# You should see:
# ODBC Driver 17 for SQL Server
# (or FreeTDS if using that)
```

## Python Dependencies

Make sure you have the Python packages installed:

```bash
# If using virtual environment (recommended)
source .venv/bin/activate  # or venv/bin/activate

# Install required packages
pip install pyodbc

# If pyodbc installation fails, you may need:
sudo apt-get install -y unixodbc-dev gcc g++ python3-dev
pip install pyodbc
```

## Test Connection

Test the connection with a Python script:

```python
import pyodbc

# List available drivers
print("Available drivers:")
for driver in pyodbc.drivers():
    print(f"  - {driver}")

# Test connection
try:
    conn_str = """
    DRIVER={ODBC Driver 17 for SQL Server};
    SERVER=95.104.94.20;
    DATABASE=Audit;
    UID=su;
    PWD=asQW12ZX12!!;
    Trusted_Connection=no;
    """
    conn = pyodbc.connect(conn_str)
    print("Connection successful!")
    conn.close()
except Exception as e:
    print(f"Connection failed: {e}")
```

## Troubleshooting

### Issue: "Driver not found"

1. Check if driver is installed:
   ```bash
   odbcinst -q -d
   ```

2. Check driver configuration:
   ```bash
   cat /etc/odbcinst.ini
   ```

3. Try using FreeTDS instead:
   - Install FreeTDS as shown above
   - Change driver name in config to: `FreeTDS`

### Issue: "pyodbc not compiling"

Install build dependencies:
```bash
sudo apt-get install -y unixodbc-dev gcc g++ python3-dev build-essential
pip install pyodbc
```

### Issue: Connection timeout

Check firewall and network:
```bash
# Test connectivity
telnet 95.104.94.20 1433

# Or with netcat
nc -zv 95.104.94.20 1433
```

If connection fails, check:
- Firewall rules on your Linux server
- MSSQL server firewall allowing your IP
- Network routing

## Update migration-config.json

After installation, make sure your config has the correct driver name:

```json
{
  "mssql": {
    "driver": "ODBC Driver 17 for SQL Server",
    "server": "95.104.94.20",
    "database": "Audit",
    "username": "su",
    "password": "asQW12ZX12!!"
  }
}
```

For FreeTDS, use:
```json
{
  "mssql": {
    "driver": "FreeTDS",
    "server": "95.104.94.20",
    "database": "Audit",
    "username": "su",
    "password": "asQW12ZX12!!"
  }
}
```

