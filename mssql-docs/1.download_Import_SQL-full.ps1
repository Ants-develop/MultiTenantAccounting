<#
.SYNOPSIS
    Download a .bak file from Google Drive named "Ants_<dd.MM.yyyy>.bak" 
    and restore it to SQL. If not found, list all visible files for debugging.

.DESCRIPTION
    1) Obtains an OAuth2 access token from a Google service account (PKCS#8 key).
    2) Searches Drive for "Ants_<dd.MM.yyyy>.bak".
    3) If missing, prints all files the service account can see (debug).
    4) If found, downloads it locally.
    5) Restores it to a SQL database named "Audit".

.PARAMETER CustomDate
    Optional parameter to specify a custom date in dd.MM.yyyy format (e.g., "19.05.2025").
    If not provided, uses today's date.

.EXAMPLE
    .\script.ps1 -CustomDate "19.05.2025"

.NOTES
    - Requires PowerShell 7+ (on .NET 5/6).
    - Ensure you share the file/folder with the service account if it's in your personal "My Drive".
#>

param(
    [Parameter(Mandatory=$false)]
    [string]$CustomDate
)

# ---------------------------------------------------------------------------------
# 1) Configuration Variables
# ---------------------------------------------------------------------------------
$ServiceAccountJson     = "credentials.json"  # Path to your service-account JSON
$BackupDestinationPath  = "C:\SQL-export-Powershell\downloads"
$SqlServer              = "127.0.0.1"
$SqlPort                = 1433           # SQL Server port (default is 1433)
$SqlRestoreDatabaseName = "AntsDBRestore"
$SqlUsername            = "sa"
$SqlPassword            = "asQW12ZX12!!"
# Form the server instance string with TCP
$ServerInstance = "tcp:$SqlServer,$SqlPort"

# ---------------------------------------------------------------------------------
# 2) ConvertFrom-Pkcs8PEM (For PKCS#8 keys: "-----BEGIN PRIVATE KEY-----")
# ---------------------------------------------------------------------------------
function ConvertFrom-Pkcs8PEM {
    param(
        [Parameter(Mandatory)]
        [string] $PemString
    )

    $body = $PemString -replace '-----BEGIN [^-]+-----', '' `
                       -replace '-----END [^-]+-----', '' `
                       -replace '\s+', ''

    $keyBytes = [Convert]::FromBase64String($body)
    $rsa = [System.Security.Cryptography.RSA]::Create()
    [void]$rsa.ImportPkcs8PrivateKey($keyBytes, [ref]0)
    return $rsa
}

# ---------------------------------------------------------------------------------
# 3) Get-GoogleDriveAccessToken
# ---------------------------------------------------------------------------------
function Get-GoogleDriveAccessToken {
    param(
        [Parameter(Mandatory)]
        [string] $CredentialsFile
    )

    if (!(Test-Path $CredentialsFile)) {
        throw "Credentials file not found: $CredentialsFile"
    }

    $credentials = Get-Content $CredentialsFile -Raw | ConvertFrom-Json
    $now         = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    $oneHour     = 3600

    $headerJson = '{"alg":"RS256","typ":"JWT"}'
    $payloadMap = @{
        iss   = $credentials.client_email
        scope = "https://www.googleapis.com/auth/drive"
        aud   = "https://oauth2.googleapis.com/token"
        iat   = $now
        exp   = $now + $oneHour
    }
    $payloadJson = $payloadMap | ConvertTo-Json -Compress

    function Convert-ToBase64Url([byte[]] $bytes) {
        $encoded = [Convert]::ToBase64String($bytes)
        $encoded = $encoded -replace '\+', '-' -replace '\/', '_' -replace '=+$', ''
        return $encoded
    }

    $headerEncoded  = Convert-ToBase64Url ([System.Text.Encoding]::UTF8.GetBytes($headerJson))
    $payloadEncoded = Convert-ToBase64Url ([System.Text.Encoding]::UTF8.GetBytes($payloadJson))
    $tokenToSign    = "$headerEncoded.$payloadEncoded"

    $rsaProvider = ConvertFrom-Pkcs8PEM -PemString $credentials.private_key
    $bytesToSign = [System.Text.Encoding]::UTF8.GetBytes($tokenToSign)
    $signatureBytes = $rsaProvider.SignData(
        $bytesToSign,
        [System.Security.Cryptography.HashAlgorithmName]::SHA256,
        [System.Security.Cryptography.RSASignaturePadding]::Pkcs1
    )
    $signatureEncoded = Convert-ToBase64Url $signatureBytes
    $assertion        = "$headerEncoded.$payloadEncoded.$signatureEncoded"

    $body = @{
        grant_type = "urn:ietf:params:oauth:grant-type:jwt-bearer"
        assertion  = $assertion
    }
    $tokenUri = "https://oauth2.googleapis.com/token"

    $tokenResponse = Invoke-RestMethod -Uri $tokenUri `
                                       -Method POST `
                                       -Body $body `
                                       -ContentType "application/x-www-form-urlencoded"
    if (-not $tokenResponse.access_token) {
        throw "Failed to retrieve access token from Google: $($tokenResponse | ConvertTo-Json)"
    }

    return $tokenResponse.access_token
}

# ---------------------------------------------------------------------------------
# 4) Get-SqlRestoreFileList
# ---------------------------------------------------------------------------------
function Get-SqlRestoreFileList {
    param (
        [Parameter(Mandatory)]
        [string] $BackupFile,
        [Parameter(Mandatory)]
        [string] $SqlServer,
        [Parameter(Mandatory)]
        [string] $SqlUsername,
        [Parameter(Mandatory)]
        [string] $SqlPassword
    )

    $query = "RESTORE FILELISTONLY FROM DISK = N'$BackupFile'"
    
    # Correct interpolation of variables
    $sqlCmdCommand = "sqlcmd -S tcp:$SqlServer,$SqlPort -U $SqlUsername -P $SqlPassword -d master -Q `"$query`" -s '|'"
    $result = Invoke-Expression $sqlCmdCommand

    # Process the result
    $fileList = $result -split "`r`n" | Where-Object { $_ -match '\|' } | ForEach-Object {
        $fields = $_ -split '\|'
        [PSCustomObject]@{
            LogicalName  = $fields[0].Trim()
            PhysicalName = $fields[1].Trim()
        }
    }
    return $fileList
}

# ---------------------------------------------------------------------------------
# 5) Clear-SqlDatabase
# ---------------------------------------------------------------------------------
function Clear-SqlDatabase {
    param(
        [Parameter(Mandatory)]
        [string] $DatabaseName,
        [Parameter(Mandatory)]
        [string] $SqlServer,
        [Parameter(Mandatory)]
        [string] $SqlUsername,
        [Parameter(Mandatory)]
        [string] $SqlPassword
    )

    $query = @"
IF EXISTS (SELECT 1 FROM sys.databases WHERE name = N'$DatabaseName')
BEGIN
    ALTER DATABASE [$DatabaseName] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE [$DatabaseName];
END;
"@

    # Properly escape the query for sqlcmd
    $escapedQuery = $query -replace '"', '""'

    $sqlCmdCommand = "sqlcmd -S tcp:$SqlServer,$SqlPort -U $SqlUsername -P $SqlPassword -d master -Q `"$escapedQuery`" -C"
    Invoke-Expression $sqlCmdCommand
    Write-Host "Database [$DatabaseName] dropped if it existed."
}

# ---------------------------------------------------------------------------------
# 6) Restore-SqlDatabase
# ---------------------------------------------------------------------------------
function Restore-SqlDatabase {
    param(
        [Parameter(Mandatory)]
        [string] $BackupFile,
        [Parameter(Mandatory)]
        [string] $DatabaseName,
        [Parameter(Mandatory)]
        [string] $SqlServer,
        [Parameter(Mandatory)]
        [string] $SqlUsername,
        [Parameter(Mandatory)]
        [string] $SqlPassword
    )

    $fileList = Get-SqlRestoreFileList -BackupFile $BackupFile `
                                       -SqlServer $SqlServer `
                                       -SqlUsername $SqlUsername `
                                       -SqlPassword $SqlPassword

    $dataFile = $fileList | Where-Object { $_.LogicalName -like '*Ants*' -and $_.LogicalName -notlike '*log*' } | Select-Object -First 1
    $logFile = $fileList | Where-Object { $_.LogicalName -like '*Ants_log*' } | Select-Object -First 1

    if (-not $dataFile -or -not $logFile) {
        throw "Could not identify data or log file in backup: $($fileList | ConvertTo-Json)"
    }

    # Ensure unique paths using the database name
    $dataPath = "C:\SQLData\$DatabaseName.mdf"
    $logPath = "C:\SQLData\$DatabaseName_log.ldf"

    Write-Host "Restoring to Data: $dataPath, Log: $logPath"

    $query = @"
RESTORE DATABASE [$DatabaseName]
FROM DISK = N'$BackupFile'
WITH MOVE '$($dataFile.LogicalName)' TO '$dataPath',
     MOVE '$($logFile.LogicalName)' TO '$logPath',
     FILE = 1,
     REPLACE,
     STATS = 5;
"@

    # Escape quotes for sqlcmd
    $escapedQuery = $query -replace '"', '""'

    $sqlCmdCommand = "sqlcmd -S tcp:$SqlServer,$SqlPort -U $SqlUsername -P $SqlPassword -d master -Q `"$escapedQuery`" -C"
    Invoke-Expression $sqlCmdCommand
}

# ---------------------------------------------------------------------------------
# 7) List-GoogleDriveFileByName
# ---------------------------------------------------------------------------------
function List-GoogleDriveFileByName {
    param(
        [Parameter(Mandatory)]
        [string] $AccessToken,
        [Parameter(Mandatory)]
        [string] $ExactFileName
    )

    $query        = "name = '$ExactFileName' and trashed = false"
    $queryEncoded = [System.Uri]::EscapeDataString($query)
    $pageSize     = 100

    $url = "https://www.googleapis.com/drive/v3/files" +
           "?q=$queryEncoded&fields=files(id,name)" +
           "&supportsAllDrives=true&includeItemsFromAllDrives=true" +
           "&pageSize=$pageSize"

    $headers  = @{ Authorization = "Bearer $AccessToken" }
    $response = Invoke-RestMethod -Uri $url -Headers $headers -Method GET
    return $response.files
}

# ---------------------------------------------------------------------------------
# 8) Download-GoogleDriveFile (with ?alt=media)
# ---------------------------------------------------------------------------------
function Download-GoogleDriveFile {
    param(
        [Parameter(Mandatory)]
        [string] $AccessToken,
        [Parameter(Mandatory)]
        [string] $FileId,
        [Parameter(Mandatory)]
        [string] $DestinationPath
    )

    # Print the FileId for debugging
    Write-Host "DEBUG: The FileId is '$FileId'"

    # Construct the final download URL, including ?alt=media
    $baseUri = 'https://www.googleapis.com/drive/v3/files/$FileId'
	$downloadUri = 'https://www.googleapis.com/drive/v3/files/'+$FileId+'?alt=media'
    Write-Host "DEBUG: Download URL => $downloadUri"

    # Ensure destination folder
    $parentPath = Split-Path $DestinationPath
    if (!(Test-Path $parentPath)) {
        New-Item -ItemType Directory -Path $parentPath | Out-Null
    }

    # Bearer token
    $headers = @{ Authorization = "Bearer $AccessToken" }

    # Download
    Invoke-RestMethod -Uri $downloadUri -Headers $headers -Method GET -OutFile $DestinationPath

    return $DestinationPath
}

# ---------------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------------
try {
    # Determine which date to use
    if ($CustomDate) {
        # Validate the custom date format
        try {
            $parsedDate = [DateTime]::ParseExact($CustomDate, 'dd.MM.yyyy', $null)
            $dateToUse = $CustomDate
            Write-Host "Using custom date: $dateToUse"
        }
        catch {
            throw "Invalid date format. Please use dd.MM.yyyy format (e.g., '19.05.2025')"
        }
    }
    else {
        $dateToUse = (Get-Date).ToString('dd.MM.yyyy')
        Write-Host "Using today's date: $dateToUse"
    }
    
    $expectedFileName = "Ants_$dateToUse.bak"
    Write-Host "Looking for file: $expectedFileName"

    $accessToken = Get-GoogleDriveAccessToken -CredentialsFile $ServiceAccountJson
    Write-Host "Access token acquired successfully."

    $matchingFiles = List-GoogleDriveFileByName -AccessToken $accessToken -ExactFileName $expectedFileName
    if (-not $matchingFiles -or $matchingFiles.Count -eq 0) {
        Write-Warning "No file found in Drive named '$expectedFileName'."
        throw "No file named '$expectedFileName'. Check permissions or file availability."
    }

    $file = $matchingFiles[0]
    Write-Host "Found file in Drive => ID=$($file.id) Name=$($file.name)"

    if (!(Test-Path $BackupDestinationPath)) {
        New-Item -ItemType Directory -Path $BackupDestinationPath | Out-Null
    }

    $localFile = Join-Path $BackupDestinationPath $file.name

    if (Test-Path $localFile) {
        Write-Host "File already exists locally: $localFile. Skipping download."
    } else {
        Write-Host "Downloading file: $($file.name)"
        Download-GoogleDriveFile -AccessToken $accessToken -FileId $file.id -DestinationPath $localFile
        Write-Host "Downloaded to $localFile"
    }

    # Clear the database before restore
    Clear-SqlDatabase -DatabaseName $SqlRestoreDatabaseName `
                      -SqlServer $SqlServer `
                      -SqlUsername $SqlUsername `
                      -SqlPassword $SqlPassword

    # Restore the database
    Restore-SqlDatabase -BackupFile $localFile `
                        -DatabaseName $SqlRestoreDatabaseName `
                        -SqlServer $SqlServer `
                        -SqlUsername $SqlUsername `
                        -SqlPassword $SqlPassword
}
catch {
    Write-Error $_
}