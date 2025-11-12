<?php
/**
 * Diagnostic Tool: Check Why Companies Don't Appear in RS Sync Dropdown
 * Shows which companies are missing and the reason why
 */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../functions.php';
require_once __DIR__ . '/../backend/database.php';

// Only admin can run this
if (!isAdmin()) {
    die('Access denied. Admin only.');
}

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html>
<head>
    <title>RS Sync Companies Diagnostic</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body { padding: 20px; background: #f5f5f5; }
        .status-ok { color: green; font-weight: bold; }
        .status-missing { color: red; font-weight: bold; }
        .status-partial { color: orange; font-weight: bold; }
    </style>
</head>
<body>
<div class="container">
    <h1><i class="bi bi-search"></i> RS Sync Companies Diagnostic</h1>
    <p class="text-muted">This page shows why companies may not appear in the RS sync dropdown</p>
    <hr>

    <?php
    try {
        $pdo = getDatabaseConnection();
        
        // Get all companies with their status
        $sql = "
            SELECT 
                c.CompanyID,
                c.CompanyName,
                c.IdentificationCode,
                c.RSVerifiedStatus,
                rs.id AS rs_user_id,
                rs.company_name AS rs_company_name,
                rs.s_user,
                rs.s_password,
                CASE 
                    WHEN c.RSVerifiedStatus = 'Verified' 
                        AND rs.s_user IS NOT NULL 
                        AND rs.s_password IS NOT NULL 
                    THEN 1 
                    ELSE 0 
                END AS appears_in_sync
            FROM [dbo].[Companies] c
            LEFT JOIN rs_users rs ON c.IdentificationCode = rs.company_tin
            ORDER BY c.CompanyName
        ";
        
        $stmt = $pdo->query($sql);
        $companies = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $total = count($companies);
        $visible = 0;
        $invisible = 0;
        
        foreach ($companies as $company) {
            if ($company['appears_in_sync']) {
                $visible++;
            } else {
                $invisible++;
            }
        }
        
        echo "<div class='alert alert-info'>";
        echo "<h5>Summary</h5>";
        echo "<ul>";
        echo "<li><strong>Total Companies:</strong> $total</li>";
        echo "<li><strong class='status-ok'>Visible in Sync Dropdown:</strong> $visible</li>";
        echo "<li><strong class='status-missing'>Not Visible:</strong> $invisible</li>";
        echo "</ul>";
        echo "</div>";
        
        // Companies that WILL appear in sync
        echo "<h3 class='status-ok'>✅ Companies That Appear in Sync Dropdown ($visible)</h3>";
        echo "<table class='table table-bordered table-sm'>";
        echo "<thead class='table-success'>";
        echo "<tr>";
        echo "<th>Company Name</th>";
        echo "<th>TIN</th>";
        echo "<th>RS Status</th>";
        echo "<th>Has Credentials</th>";
        echo "</tr>";
        echo "</thead>";
        echo "<tbody>";
        
        foreach ($companies as $company) {
            if ($company['appears_in_sync']) {
                echo "<tr>";
                echo "<td>" . htmlspecialchars($company['CompanyName']) . "</td>";
                echo "<td>" . htmlspecialchars($company['IdentificationCode']) . "</td>";
                echo "<td><span class='badge bg-success'>Verified</span></td>";
                echo "<td><span class='badge bg-success'>✓ Yes</span></td>";
                echo "</tr>";
            }
        }
        
        echo "</tbody></table>";
        
        // Companies that WON'T appear in sync
        echo "<h3 class='status-missing'>❌ Companies NOT in Sync Dropdown ($invisible)</h3>";
        echo "<p class='text-muted'>These companies are missing for one or more reasons:</p>";
        echo "<table class='table table-bordered table-sm'>";
        echo "<thead class='table-danger'>";
        echo "<tr>";
        echo "<th>Company Name</th>";
        echo "<th>TIN</th>";
        echo "<th>RS Verified?</th>";
        echo "<th>In rs_users?</th>";
        echo "<th>Has s_user?</th>";
        echo "<th>Has s_password?</th>";
        echo "<th>Missing</th>";
        echo "</tr>";
        echo "</thead>";
        echo "<tbody>";
        
        foreach ($companies as $company) {
            if (!$company['appears_in_sync']) {
                $issues = [];
                
                $rsVerified = ($company['RSVerifiedStatus'] === 'Verified');
                $inRsUsers = !empty($company['rs_user_id']);
                $hasUser = !empty($company['s_user']);
                $hasPassword = !empty($company['s_password']);
                
                if (!$rsVerified) $issues[] = 'Not RS Verified';
                if (!$inRsUsers) $issues[] = 'Not in rs_users table';
                if (!$hasUser) $issues[] = 'Missing s_user';
                if (!$hasPassword) $issues[] = 'Missing s_password';
                
                echo "<tr>";
                echo "<td>" . htmlspecialchars($company['CompanyName']) . "</td>";
                echo "<td>" . htmlspecialchars($company['IdentificationCode']) . "</td>";
                echo "<td>" . ($rsVerified ? '<span class="badge bg-success">✓ Yes</span>' : '<span class="badge bg-danger">✗ No</span>') . "</td>";
                echo "<td>" . ($inRsUsers ? '<span class="badge bg-success">✓ Yes</span>' : '<span class="badge bg-danger">✗ No</span>') . "</td>";
                echo "<td>" . ($hasUser ? '<span class="badge bg-success">✓ Yes</span>' : '<span class="badge bg-danger">✗ No</span>') . "</td>";
                echo "<td>" . ($hasPassword ? '<span class="badge bg-success">✓ Yes</span>' : '<span class="badge bg-danger">✗ No</span>') . "</td>";
                echo "<td class='status-missing'>" . implode(', ', $issues) . "</td>";
                echo "</tr>";
            }
        }
        
        echo "</tbody></table>";
        
        // How to fix
        echo "<hr>";
        echo "<h3>🔧 How to Fix Missing Companies</h3>";
        echo "<div class='alert alert-warning'>";
        echo "<h5>Step 1: Verify Company in RS</h5>";
        echo "<p>Go to: <a href='../company/companies_admin.php'>Companies Admin</a></p>";
        echo "<p>Set <code>RSVerifiedStatus = 'Verified'</code> for the company</p>";
        echo "</div>";
        
        echo "<div class='alert alert-warning'>";
        echo "<h5>Step 2: Add RS Credentials</h5>";
        echo "<p>Go to: <a href='rs_admin.php'>RS Administration</a></p>";
        echo "<p>Add the company's RS credentials (s_user and s_password)</p>";
        echo "</div>";
        
        echo "<div class='alert alert-info'>";
        echo "<h5>Step 3: Test</h5>";
        echo "<p>After adding credentials, the company will automatically appear in the sync dropdown</p>";
        echo "<p>No page refresh needed - dropdown loads companies dynamically</p>";
        echo "</div>";
        
    } catch (Exception $e) {
        echo "<div class='alert alert-danger'>";
        echo "<strong>Error:</strong> " . htmlspecialchars($e->getMessage());
        echo "</div>";
    }
    ?>
    
    <hr>
    <p><a href="../menu.php" class="btn btn-secondary">← Back to Menu</a></p>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
