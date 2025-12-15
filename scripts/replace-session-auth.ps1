# PowerShell script to replace req.session.userId with req.user.id across all backend files

$files = @(
    "server\api\company.ts",
    "server\api\clients.ts",
    "server\api\bank.ts",
    "server\api\storage.ts",
    "server\api\rs-admin.ts",
    "server\api\messages.ts",
    "server\api\backup-restore.ts",
    "server\routes\notifications.ts",
    "server\routes\feed.ts"
)

foreach ($file in $files) {
    $fullPath = "C:\Users\User\Desktop\MultiTenantAccounting\$file"
    if (Test-Path $fullPath) {
        Write-Host "Processing $file..."
        $content = Get-Content $fullPath -Raw
        
        # Replace all instances of req.session.userId
        $newContent = $content -replace 'req\.session\.userId!', 'req.user?.id'
        $newContent = $newContent -replace 'req\.session\.userId', 'req.user?.id'
        
        # Replace (req.session as any)?.userId pattern
        $newContent = $newContent -replace '\(req\.session as any\)\?\.userId', 'req.user?.id'
        
        # Save the file
        Set-Content $fullPath $newContent -NoNewline
        Write-Host "  ✓ Updated $file"
    } else {
        Write-Host "  ✗ File not found: $file" -ForegroundColor Red
    }
}

Write-Host "`nDone! Now add authentication checks where needed."
Write-Host "Pattern to add after 'const userId = req.user?.id;':"
Write-Host "if (!userId) return res.status(401).json({ message: 'Not authenticated' });"
