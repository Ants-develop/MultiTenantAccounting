<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../functions.php';
require_once __DIR__ . '/../backend/database.php';

// Admin-only access
if (!isAdmin()) {
    echo "Access denied. Admin privileges required.";
    exit;
}

/**
 * Create waybill_invoices table with correct schema if it doesn't exist
 */
function createWaybillInvoicesTable($pdo) {
    try {
        // Check if table exists
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'rs' AND TABLE_NAME = 'waybill_invoices'");
        $stmt->execute();
        $table_exists = $stmt->fetchColumn() > 0;
        
        if (!$table_exists) {
            // Create table with minimal schema for many-to-many relationship
            $create_sql = "
                CREATE TABLE rs.waybill_invoices (
                    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
                    [waybill_id] NVARCHAR(100) NOT NULL,
                    [invoice_id] NVARCHAR(100) NOT NULL,
                    [company_id] INT NULL,
                    [created_at] DATETIME DEFAULT GETDATE(),
                    [updated_at] DATETIME DEFAULT GETDATE()
                )
            ";
            
            $pdo->exec($create_sql);
            error_log("Created rs.waybill_invoices table with minimal schema");
            return "Table created successfully";
        } else {
            // Check if we need to simplify the existing table
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'rs' AND TABLE_NAME = 'waybill_invoices'");
            $stmt->execute();
            $column_count = $stmt->fetchColumn();
            
            if ($column_count > 6) {
                // Table has too many columns, suggest recreation
                return "Table exists but has too many columns. Consider recreating with minimal schema.";
            } else {
                return "Table already exists with correct schema";
            }
        }
    } catch (Exception $e) {
        error_log("Error creating/checking waybill_invoices table: " . $e->getMessage());
        return "Error: " . $e->getMessage();
    }
}

// Create table if needed
$pdo = getDatabaseConnection();
$schema_result = createWaybillInvoicesTable($pdo);

// Handle form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['waybill_id'])) {
    $waybill_id = $_POST['waybill_id'];
    header("Location: associate_invoices_with_waybill.php?waybill_id=" . urlencode($waybill_id));
    exit;
}

// Get recent waybills for quick access
$recent_waybills = [];
try {
    $pdo = getDatabaseConnection();
    
    // Get recent waybills from sellers_waybills
    $stmt = $pdo->prepare("SELECT TOP 10 DISTINCT EXTERNAL_ID, SELLER_NAME, CREATE_DATE FROM rs.sellers_waybills ORDER BY CREATE_DATE DESC");
    $stmt->execute();
    $seller_waybills = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get recent waybills from buyers_waybills
    $stmt = $pdo->prepare("SELECT TOP 10 DISTINCT EXTERNAL_ID, BUYER_NAME, CREATE_DATE FROM rs.buyers_waybills ORDER BY CREATE_DATE DESC");
    $stmt->execute();
    $buyer_waybills = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Combine and sort by date
    $all_waybills = array_merge($seller_waybills, $buyer_waybills);
    usort($all_waybills, function($a, $b) {
        return strtotime($b['CREATE_DATE']) - strtotime($a['CREATE_DATE']);
    });
    
    $recent_waybills = array_slice($all_waybills, 0, 10);
    
} catch (Exception $e) {
    error_log("Error getting recent waybills: " . $e->getMessage());
}
?>

<!DOCTYPE html>
<html lang="ka">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Waybill Association Manager</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.7.2/font/bootstrap-icons.css" rel="stylesheet">
</head>
<body>
    <div class="container mt-4">
        <h2><i class="bi bi-link-45deg me-2"></i>Waybill Association Manager</h2>
        
        <!-- Schema Status Alert -->
        <div class="alert alert-info">
            <i class="bi bi-database me-2"></i>
            <strong>Database Schema:</strong> <?php echo htmlspecialchars($schema_result); ?>
            <?php if (strpos($schema_result, 'too many columns') !== false): ?>
                <br><br>
                <a href="recreate_waybill_invoices_table.php" class="btn btn-warning btn-sm">
                    <i class="bi bi-arrow-clockwise me-1"></i>Recreate Table with Minimal Schema
                </a>
            <?php endif; ?>
        </div>
        
        <div class="row">
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">
                        <h5><i class="bi bi-search me-2"></i>Enter Waybill ID</h5>
                    </div>
                    <div class="card-body">
                        <form method="POST">
                            <div class="mb-3">
                                <label for="waybill_id" class="form-label">Waybill ID:</label>
                                <input type="text" class="form-control" id="waybill_id" name="waybill_id" 
                                       placeholder="Enter waybill ID (e.g., 954391449)" required>
                            </div>
                            <button type="submit" class="btn btn-primary">
                                <i class="bi bi-arrow-right me-1"></i>Manage Associations
                            </button>
                        </form>
                    </div>
                </div>
            </div>
            
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">
                        <h5><i class="bi bi-clock-history me-2"></i>Recent Waybills</h5>
                    </div>
                    <div class="card-body">
                        <?php if (empty($recent_waybills)): ?>
                            <p class="text-muted">No recent waybills found</p>
                        <?php else: ?>
                            <div class="list-group">
                                <?php foreach ($recent_waybills as $waybill): ?>
                                    <a href="associate_invoices_with_waybill.php?waybill_id=<?php echo htmlspecialchars($waybill['EXTERNAL_ID']); ?>" 
                                       class="list-group-item list-group-item-action">
                                        <div class="d-flex w-100 justify-content-between">
                                            <h6 class="mb-1"><?php echo htmlspecialchars($waybill['EXTERNAL_ID']); ?></h6>
                                            <small class="text-muted"><?php echo htmlspecialchars($waybill['CREATE_DATE'] ?? ''); ?></small>
                                        </div>
                                        <small class="text-muted">
                                            <?php echo htmlspecialchars($waybill['SELLER_NAME'] ?? $waybill['BUYER_NAME'] ?? 'Unknown Company'); ?>
                                        </small>
                                    </a>
                                <?php endforeach; ?>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="row mt-4">
            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <h5><i class="bi bi-info-circle me-2"></i>About Waybill Associations</h5>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-6">
                                <h6>🔄 Automatic Association</h6>
                                <ul class="small">
                                    <li>RS service APIs automatically create associations</li>
                                    <li>Triggers when waybill/invoice details are fetched</li>
                                    <li>Uses official RS.ge service data</li>
                                </ul>
                            </div>
                            <div class="col-md-6">
                                <h6>⚙️ Manual Management</h6>
                                <ul class="small">
                                    <li>Add/remove associations manually</li>
                                    <li>Search and select from available invoices</li>
                                    <li>Discover waybills from invoice IDs</li>
                                </ul>
                            </div>
                        </div>
                        
                        <div class="alert alert-info mt-3">
                            <strong>Quick Test:</strong> Try waybill ID <code>954391449</code> to see the association manager in action!
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="mt-3">
            <a href="../index.php" class="btn btn-secondary">
                <i class="bi bi-arrow-left me-1"></i>Back to Main Menu
            </a>
            <a href="verify_association.php" class="btn btn-info">
                <i class="bi bi-bug me-1"></i>Verify Association
            </a>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html> 