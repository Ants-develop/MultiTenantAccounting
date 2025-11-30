# Define parameters for server, database, SQL username, and password
param (
    [string]$serverInstance = "127.0.0.1,1433",
    [string]$databaseName = "AntsDBRestore",
    [string]$auditDatabaseName = "Audit",
    [string]$sqlUsername = "sa",
    [string]$sqlPassword = "asQW12ZX12!!"
)

# Import the SqlServer module if not already loaded
if (-not (Get-Module -Name SqlServer)) {
    try {
        Import-Module SqlServer -ErrorAction Stop
    } catch {
        Write-Host "Error: SqlServer module not found. Please install it using 'Install-Module -Name SqlServer'."
        Write-Error "Failed to import SqlServer module: $_"
        exit 1
    }
}

# Define the SQL query using a here-string
$query = @"
-- Step 1: Update the GeneralLedger table with overflow protection
UPDATE [$databaseName].[dbo].[GeneralLedger]
SET 
    DocumentModifyDate = CASE 
        WHEN DocumentModifyDate < '4001-01-01' THEN CAST('0001-01-01' AS datetime2)
        ELSE DATEADD(YEAR, -2000, DocumentModifyDate)
    END,
    PostingsPeriod = CASE 
        WHEN PostingsPeriod < '4001-01-01' THEN CAST('0001-01-01' AS datetime2)
        ELSE DATEADD(YEAR, -2000, PostingsPeriod)
    END,
    DocDate = CASE 
        WHEN DocDate < '4001-01-01' THEN CAST('0001-01-01' AS datetime2)
        ELSE DATEADD(YEAR, -2000, DocDate)
    END,
    DocumentCreationDate = CASE 
        WHEN DocumentCreationDate < '4001-01-01' THEN CAST('0001-01-01' AS datetime2)
        ELSE DATEADD(YEAR, -2000, DocumentCreationDate)
    END
OPTION (MAXDOP 8);

SELECT @@ROWCOUNT AS RowsAffected;

-- Step 2: Check if the table exists in Audit database and delete if it does
IF EXISTS (
    SELECT 1 
    FROM [$auditDatabaseName].INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA = 'dbo' 
      AND TABLE_NAME = 'GeneralLedger'
)
BEGIN
    DELETE FROM [$auditDatabaseName].[dbo].[GeneralLedger];
END;

-- Step 3: Create the table if it does not exist
IF NOT EXISTS (
    SELECT 1 
    FROM [$auditDatabaseName].INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA = 'dbo' 
      AND TABLE_NAME = 'GeneralLedger'
)
BEGIN
    SELECT TOP 0 *
    INTO [$auditDatabaseName].[dbo].[GeneralLedger]
    FROM [$databaseName].[dbo].[GeneralLedger];
END;

-- Step 4: Insert filtered data
INSERT INTO [$auditDatabaseName].[dbo].[GeneralLedger]
SELECT *
FROM [$databaseName].[dbo].[GeneralLedger]
OPTION (MAXDOP 8);
"@

# Execute the query with SQL Server authentication and error handling
try {
    $result = Invoke-Sqlcmd -ServerInstance $serverInstance `
                           -Database $databaseName `
                           -Username $sqlUsername `
                           -Password $sqlPassword `
                           -Query $query `
                           -TrustServerCertificate `
                           -ErrorAction Stop
    Write-Host "Script executed successfully. Rows affected by update: $($result.RowsAffected)"
    exit 0
    } catch {
        Write-Host "Error executing query: $_"
        Write-Error "Failed to execute update and transfer: $_"
        exit 1
    }