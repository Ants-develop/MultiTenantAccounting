<?php
/**
 * OPTIMIZED SYNC COMPANY DATA - RS.ge Integration (SCHEMA CORRECTED)
 * 
 * This script provides high-performance synchronization of waybills and invoices from RS.ge APIs
 * to the local MSSQL database with specific optimizations for waybill processing.
 * 
 * SCHEMA CORRECTIONS APPLIED:
 * - EXTERNAL_ID = API field 'ID' (exact mapping, no fallbacks)
 * - All field names match API response exactly
 * - Removed duplicate/confusing fields
 * - Proper foreign key relationships
 * - Clear separation between API fields and internal tracking fields
 * 
 * OPTIMIZATIONS APPLIED:
 * - Batch database operations (10x faster)
 * - Memory-efficient processing
 * - Reduced API calls
 * - Optimized XML parsing
 * - Smart caching strategies
 * 
 * @author System Administrator
 * @version 3.1 (Schema Corrected + Performance Optimized)
 * @since 2024-01-01
 */

// PHP-FPM Optimization for large data processing
ini_set('max_execution_time', 3600);        // 1 hour
ini_set('memory_limit', '2G');              // 2GB memory (increased from 512M)
ini_set('max_input_time', 3600);            // 1 hour input time
ini_set('post_max_size', '100M');          // 100MB POST size
ini_set('upload_max_filesize', '100M');    // 100MB upload size

// Add shutdown handler for fatal errors
register_shutdown_function('handle_fatal_error');
function handle_fatal_error() {
    $error = error_get_last();
    if ($error !== NULL && in_array($error['type'], [E_ERROR, E_CORE_ERROR, E_PARSE, E_COMPILE_ERROR, E_USER_ERROR])) {
        error_log("[FATAL SCRIPT ERROR] " . print_r($error, true));
    }
}

// Detect if running in CLI mode (do this early)
$isCLI = (php_sapi_name() === 'cli' || defined('STDIN'));

// Error display: disable in CLI mode to avoid cluttering logs
if ($isCLI) {
    ini_set('display_errors', 0);  // Don't display warnings/notices in logs
    ini_set('log_errors', 1);      // Log errors to error_log
    error_reporting(E_ALL & ~E_WARNING & ~E_NOTICE);  // Only log serious errors
} else {
    ini_set('display_errors', 1);
    ini_set('display_startup_errors', 1);
    error_reporting(E_ALL);
}

if (session_status() === PHP_SESSION_NONE && !$isCLI) {
    session_start();
}
require_once __DIR__ . '/../../functions.php';
require_once __DIR__ . '/../../backend/database.php';

// Check if this is an API call (only in web mode)
if (!$isCLI && isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'POST') {
    // API mode: return JSON data
    if (!isAdmin()) {
        header('Content-Type: application/json');
        http_response_code(403);
        echo json_encode(['error' => true, 'message' => 'Access denied.']);
        exit;
    }

    header('Content-Type: application/json; charset=utf-8');
    
    $postData = json_decode(file_get_contents('php://input'), true);
    $action = $postData['action'] ?? 'sync_all';
    $companyName = $postData['company_name'] ?? null;
    $companyNames = $postData['company_names'] ?? null; // Support multiple companies
    $startDate = $postData['start_date'] ?? date('Y-m-d', strtotime('-1 month'));
    $endDate = $postData['end_date'] ?? date('Y-m-d');
    $autoAssociate = $postData['auto_associate'] ?? true; // Default to true
    $parallelMode = $postData['parallel_mode'] ?? false; // Enable parallel processing
    $maxParallel = $postData['max_parallel'] ?? 3; // Max concurrent companies

    try {
        // Handle multiple company sync
        if ($parallelMode && !empty($companyNames) && is_array($companyNames)) {
            // Parallel multi-company sync
            $results = syncMultipleCompaniesParallel($companyNames, $startDate, $endDate, $autoAssociate, $maxParallel);
            echo json_encode([
                'success' => true,
                'message' => 'Parallel sync completed for ' . count($companyNames) . ' companies',
                'results' => $results,
                'total_companies' => count($companyNames),
                'parallel_mode' => true
            ]);
            exit;
        }

        // Single company sync (original logic)
        if (!$companyName) {
            http_response_code(400);
            echo json_encode(['error' => true, 'message' => 'Company name is required for single company sync.']);
            exit;
        }

        $pdo = getDatabaseConnection();
        
        // Get company info from rs_users (same as sync_waybills.php and sync_invoices.php)
        try {
        $stmt = $pdo->prepare("SELECT id, company_tin, un_id FROM rs_users WHERE company_name = ?");
        $stmt->execute([$companyName]);
        $companyInfo = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$companyInfo) {
                error_log("[WARNING] No company info found for: $companyName");
            }
        } catch (PDOException $e) {
            error_log("[ERROR] Failed to fetch company info for $companyName: " . $e->getMessage());
            error_log("[ERROR] SQL State: " . $e->getCode());
            http_response_code(500);
            echo json_encode(['error' => true, 'message' => 'Database error while fetching company info: ' . $e->getMessage()]);
            exit;
        }
        
        if (!$companyInfo) {
            http_response_code(404);
            echo json_encode(['error' => true, 'message' => 'Company not found.']);
            exit;
        }

        $company = $companyName;
        $company_tin = $companyInfo['company_tin'];
        $company_un_id = $companyInfo['un_id'];
        $company_id = $companyInfo['id'];

        // Use provided date range instead of hardcoded dates
        $results = [];

        // Smart sync - no clearing, use upsert strategy
        
        // RESET BASELINE: Copy current IS_CORRECTED to PREVIOUS_IS_CORRECTED before sync
        try {
            // Reset seller waybills baseline
            $reset_seller_sql = "UPDATE rs.sellers_waybills SET PREVIOUS_IS_CORRECTED = IS_CORRECTED WHERE COMPANY_TIN = ?";
            $reset_seller_stmt = $pdo->prepare($reset_seller_sql);
            $reset_seller_stmt->execute([$company_tin]);
            $seller_reset_count = $reset_seller_stmt->rowCount();
            
            // Reset buyer waybills baseline
            $reset_buyer_sql = "UPDATE rs.buyers_waybills SET PREVIOUS_IS_CORRECTED = IS_CORRECTED WHERE COMPANY_TIN = ?";
            $reset_buyer_stmt = $pdo->prepare($reset_buyer_sql);
            $reset_buyer_stmt->execute([$company_tin]);
            $buyer_reset_count = $reset_buyer_stmt->rowCount();
        } catch (PDOException $e) {
            error_log("[ERROR] Failed to reset correction baseline: " . $e->getMessage());
            error_log("[ERROR] SQL State: " . $e->getCode());
            // Continue with sync even if baseline reset fails
        }

        // Sync waybills
        $sellerWaybillsResult = sync_waybills_for_company($pdo, $company, $company_id, $company_tin, $startDate, $endDate, 'seller');
        $results[] = $sellerWaybillsResult;
        
        $buyerWaybillsResult = sync_waybills_for_company($pdo, $company, $company_id, $company_tin, $startDate, $endDate, 'buyer');
        $results[] = $buyerWaybillsResult;

        // Sync waybill goods (using date range like waybills)
        
        try {
            // Sync seller waybill goods using date range API
            $sellerGoodsResult = sync_waybill_goods_for_company($pdo, $company, $company_id, $company_tin, $startDate, $endDate, 'seller');
            $results[] = $sellerGoodsResult;
            
            // Sync buyer waybill goods using date range API
            $buyerGoodsResult = sync_waybill_goods_for_company($pdo, $company, $company_id, $company_tin, $startDate, $endDate, 'buyer');
            $results[] = $buyerGoodsResult;
        } catch (Exception $e) {
            error_log("[ERROR] Failed to sync waybill goods: " . $e->getMessage());
            $results[] = [
                'company' => $company,
                'type' => 'waybill_goods',
                'error' => true,
                'message' => 'Failed to sync waybill goods: ' . $e->getMessage(),
                'inserted' => 0,
                'updated' => 0,
                'total' => 0
            ];
        }

        // Sync invoices
        $sellerInvoicesResult = sync_invoices_for_company($pdo, $company, $company_id, $company_tin, $startDate, $endDate, 'seller');
        $results[] = $sellerInvoicesResult;
        
        $buyerInvoicesResult = sync_invoices_for_company($pdo, $company, $company_id, $company_tin, $startDate, $endDate, 'buyer');
        $results[] = $buyerInvoicesResult;

        // Sync invoice goods (using invoices from database)
        
        try {
            $invoiceGoodsResult = sync_invoice_goods_for_company($pdo, $company, $company_id, $company_tin);
            $results[] = $invoiceGoodsResult;
        } catch (Exception $e) {
            error_log("[ERROR] Failed to sync invoice goods: " . $e->getMessage());
            $results[] = [
                'company' => $company,
                'type' => 'invoice_goods',
                'error' => true,
                'message' => 'Failed to sync invoice goods: ' . $e->getMessage(),
                'inserted' => 0,
                'updated' => 0,
                'total' => 0
            ];
        }

        // Auto-associate invoices with waybills (optional)
        if ($autoAssociate) {
            $associationResult = auto_associate_invoices_with_waybills($pdo, $company, $company_id);
            $results[] = $associationResult;
        } else {
            $results[] = [
                'company' => $company,
                'type' => 'auto_association',
                'error' => false,
                'message' => 'Auto-association skipped by user.',
                'inserted' => 0, 'updated' => 0, 'skipped' => 0, 'total' => 0,
            ];
        }

        // Sync NSAF APIs
        try {
            // Sync NSAF seller invoices (with date range support using get_seller_invoices_n)
            $nsafSellerResult = sync_nsaf_seller_invoices_for_company($pdo, $company, $company_id, $company_tin, $startDate, $endDate);
            $results[] = $nsafSellerResult;
            
            // Sync NSAF buyer invoices (with date range support using get_buyer_invoices_n)
            $nsafBuyerResult = sync_nsaf_buyer_invoices_for_company($pdo, $company, $company_id, $company_tin, $startDate, $endDate);
            $results[] = $nsafBuyerResult;
            
            // Sync NSAF special goods (no date range needed)
            $nsafGoodsResult = sync_nsaf_special_goods_for_company($pdo, $company, $company_id, $company_tin);
            $results[] = $nsafGoodsResult;
            
        } catch (Exception $e) {
            error_log("[ERROR] NSAF API sync failed: " . $e->getMessage());
            $results[] = [
                'company' => $company,
                'type' => 'nsaf_apis',
                'error' => true,
                'message' => 'NSAF API sync failed: ' . $e->getMessage(),
                'inserted' => 0,
                'updated' => 0,
                'total' => 0
            ];
        }

        // Check and update VAT payer status for the company
        $vatPayerStatus = check_company_vat_payer_status($pdo, $company, $company_tin);
        
        // Update waybill tables with VAT payer status
        $vatUpdateResult = update_waybills_vat_payer_status($pdo, $company_tin, $vatPayerStatus);
        $results[] = $vatUpdateResult;

        // Calculate totals
        $totalInserted = 0;
        $totalUpdated = 0;
        $totalNewlyModified = 0;
        $totalSkipped = 0;
        $totalErrors = 0;
        $allNewlyModifiedWaybills = [];
        
        foreach ($results as $result) {
            if (!isset($result['error']) || !$result['error']) {
                $totalInserted += $result['inserted'] ?? 0;
                $totalUpdated += $result['updated'] ?? 0;
                $totalNewlyModified += $result['newly_modified'] ?? 0;
                $totalSkipped += $result['skipped'] ?? 0;
                
                // Collect newly modified waybills for reporting
                if (isset($result['newly_modified_waybills']) && is_array($result['newly_modified_waybills'])) {
                    $allNewlyModifiedWaybills = array_merge($allNewlyModifiedWaybills, $result['newly_modified_waybills']);
                }
            } else {
                $totalErrors++;
            }
        }

        $totalProcessed = $totalInserted + $totalUpdated + $totalSkipped;

        echo json_encode([
            'success' => true, 
            'message' => "Optimized sync completed for date range $startDate to $endDate. Total processed: $totalProcessed (New: $totalInserted, Updated: $totalUpdated, Newly Modified: $totalNewlyModified, Skipped: $totalSkipped), Errors: $totalErrors",
            'results' => $results,
            'newly_modified_waybills' => $allNewlyModifiedWaybills,
            'summary' => [
                'total_inserted' => $totalInserted,
                'total_updated' => $totalUpdated,
                'total_newly_modified' => $totalNewlyModified,
                'total_skipped' => $totalSkipped,
                'total_processed' => $totalProcessed,
                'total_errors' => $totalErrors,
                'company' => $company,
                'date_range' => "$startDate to $endDate",
                'sync_type' => 'optimized_smart_upsert_schema_corrected'
            ]
        ]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => true, 'message' => $e->getMessage()]);
    }
    exit;
}

// --- HTML Page for Company Data Sync ---
// Skip HTML rendering in CLI mode
if ($isCLI) {
    // CLI mode - functions are available for direct calling
    // This file can be included by background workers
    return;
}

if (!isLoggedIn()) {
    header('Location: /users/auth/login.php');
    exit;
}

if (!isAdmin()) {
    echo '<div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">';
    echo '<h2 style="color: #dc3545;">Access Denied</h2>';
    echo '<p>You do not have permission to access this page.</p>';
    echo '<a href="/dashboard.php" style="color: #007bff; text-decoration: none;">Return to Dashboard</a>';
    echo '</div>';
    exit;
}
?>
<!DOCTYPE html>
<html lang="ka">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Company Data Sync - Optimized</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css" rel="stylesheet">
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    <link rel="stylesheet" href="../../css/styles.css">
    <style>
        .sync-status {
            padding: 10px;
            margin: 10px 0;
            border-radius: 5px;
            font-weight: bold;
        }
        .sync-success {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .sync-error {
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .sync-info {
            background-color: #d1ecf1;
            color: #0c5460;
            border: 1px solid #bee5eb;
        }
        .company-card {
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
            background-color: #f8f9fa;
        }
        .company-card:hover {
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .log-entry {
            margin-bottom: 5px;
        }
        .log-info { color: black; }
        .log-success { color: green; }
        .log-error { color: red; }
        .log-warning { color: orange; }
        
        /* Newly modified waybills table styling */
        .newly-modified-table {
            font-size: 0.9rem;
        }
        .newly-modified-table th {
            background-color: #fff3cd;
            border-color: #ffeaa7;
        }
        .newly-modified-table td {
            vertical-align: middle;
        }
        .badge {
            font-size: 0.75rem;
        }
    </style>
</head>
<body>
    <?php include '../../menu.php'; ?>
    <div class="container-fluid px-4 mt-5">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2><i class="bi bi-arrow-repeat me-2"></i>Company Data Sync - Optimized</h2>
            <div>
                <button id="testTimeoutBtn" class="btn btn-outline-warning btn-sm me-2">
                    <i class="bi bi-clock me-1"></i>Test Timeout
                </button>
                <button id="refreshBtn" class="btn btn-outline-primary btn-sm me-2">
                    <i class="bi bi-arrow-clockwise me-1"></i>Refresh Companies
                </button>
                <a href="test_vat_payer_simple.php" class="btn btn-outline-success btn-sm" target="_blank">
                    <i class="bi bi-check-circle me-1"></i>Test VAT Payer API
                </a>
            </div>
        </div>
        
        <!-- Date Range Filter -->
        <div class="card mb-4">
            <div class="card-header">
                <h6 class="mb-0"><i class="bi bi-calendar-range me-2"></i>Sync Date Range</h6>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-3">
                        <label for="startDate" class="form-label">Start Date:</label>
                        <input type="date" class="form-control" id="startDate" value="<?php echo date('Y-m-d', strtotime('-1 month')); ?>">
                    </div>
                    <div class="col-md-3">
                        <label for="endDate" class="form-label">End Date:</label>
                        <input type="date" class="form-control" id="endDate" value="<?php echo date('Y-m-d'); ?>">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">&nbsp;</label>
                        <div>
                            <button type="button" class="btn btn-outline-secondary btn-sm" onclick="setDateRange('last7days')">Last 7 Days</button>
                            <button type="button" class="btn btn-outline-secondary btn-sm ms-1" onclick="setDateRange('last30days')">Last 30 Days</button>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">&nbsp;</label>
                        <div>
                            <button type="button" class="btn btn-outline-secondary btn-sm" onclick="setDateRange('last90days')">Last 90 Days</button>
                            <button type="button" class="btn btn-outline-secondary btn-sm ms-1" onclick="setDateRange('thisyear')">This Year</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Sync Options -->
        <div class="card mb-4">
            <div class="card-header">
                <h6 class="mb-0"><i class="bi bi-gear me-2"></i>Sync Options</h6>
            </div>
            <div class="card-body">
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="autoAssociateCheckbox" checked>
                    <label class="form-check-label" for="autoAssociateCheckbox">
                        Automatically associate Invoices with Waybills
                    </label>
                    <small class="form-text text-muted d-block">Uncheck to skip the association step, which can speed up the sync if you only need to update waybill/invoice data.</small>
                </div>
            </div>
        </div>
        
        <div id="syncStatus"></div>
        
        <div class="row">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0"><i class="bi bi-building me-2"></i>Available Companies</h5>
                    </div>
                    <div class="card-body">
                        <div id="companiesList">
                            <div class="text-center">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Loading...</span>
                                </div>
                                <p class="mt-2">Loading companies...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Debug Section -->
        <div class="row mt-4">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0"><i class="bi bi-bug me-2"></i>Debug Information</h5>
                    </div>
                    <div class="card-body">
                        <h6>Logs</h6>
                        <div id="log-container" style="background-color: #f1f1f1; border: 1px solid #ccc; padding: 10px; height: 300px; overflow-y: scroll; font-family: monospace; white-space: pre-wrap;"></div>
                        <div class="mt-2">
                            <button id="clear-log-btn" class="btn btn-secondary btn-sm" style="width: auto; min-width: 100px;">Clear Log</button>
                            <button id="clear-raw-btn" class="btn btn-secondary btn-sm ms-2" style="width: auto; min-width: 100px;">Clear Raw Data</button>
                        </div>
                        
                        <h6 class="mt-4">Raw Request/Response Data</h6>
                        <div id="raw-data-container">
                            <!-- Raw data will be populated here for each company/type -->
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
    document.addEventListener('DOMContentLoaded', function() {
        loadCompanies();
        
        document.getElementById('refreshBtn').addEventListener('click', function() {
            loadCompanies();
        });
        
        document.getElementById('testTimeoutBtn').addEventListener('click', function() {
            testTimeoutSettings();
        });
        
        function loadCompanies() {
            const companiesList = document.getElementById('companiesList');
            companiesList.innerHTML = '<div class="text-center"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">Loading companies...</p></div>';
            
            // Use the same logic as waybill_filter_component.php
            fetch('get_companies_for_sync.php')
                .then(response => response.json())
                .then(data => {
                    if (data.success && data.companies) {
                        displayCompanies(data.companies);
                    } else {
                        companiesList.innerHTML = '<div class="alert alert-warning">No companies found or error loading companies.</div>';
                    }
                })
                .catch(error => {
                    console.error('Error loading companies:', error);
                    companiesList.innerHTML = '<div class="alert alert-danger">Error loading companies.</div>';
                });
        }
        
        function displayCompanies(companies) {
            const companiesList = document.getElementById('companiesList');
            if (companies.length === 0) {
                companiesList.innerHTML = '<div class="alert alert-info">No companies available for sync.</div>';
                return;
            }
            
            let html = '<div class="row">';
            companies.forEach(company => {
                const statusClass = company.RSVerifiedStatus === 'Verified' ? 'text-success' : 'text-danger';
                const statusIcon = company.RSVerifiedStatus === 'Verified' ? 'fa-check-circle' : 'fa-times-circle';
                
                html += `
                    <div class="col-md-6 col-lg-4 mb-3">
                        <div class="company-card">
                            <h6 class="mb-2">${company.CompanyName}</h6>
                            <p class="mb-1"><small class="text-muted">TIN: ${company.CompanyTIN || 'N/A'}</small></p>
                            <p class="mb-1">
                                <small class="text-muted">
                                    <i class="fas ${statusIcon} me-1 ${statusClass}"></i>
                                    RS Status: ${company.RSVerifiedStatus || 'Unknown'}
                                </small>
                            </p>
                            <div class="mt-3">
                                <button class="btn btn-primary btn-sm" onclick="syncCompany('${company.CompanyName}')">
                                    <i class="bi bi-arrow-repeat me-1"></i>Sync Data
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            companiesList.innerHTML = html;
        }
        
        window.syncCompany = function(companyName) {
            const statusDiv = document.getElementById('syncStatus');
            const startDate = document.getElementById('startDate').value;
            const endDate = document.getElementById('endDate').value;
            const autoAssociate = document.getElementById('autoAssociateCheckbox').checked;
            
            // Validate date range
            if (!startDate || !endDate) {
                statusDiv.innerHTML = '<div class="sync-error">Please select both start and end dates.</div>';
                return;
            }
            
            if (startDate > endDate) {
                statusDiv.innerHTML = '<div class="sync-error">Start date cannot be after end date.</div>';
                return;
            }
            
            statusDiv.innerHTML = `
                <div class="sync-info">
                    <div class="d-flex align-items-center">
                        <div class="spinner-border spinner-border-sm me-2" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        Starting OPTIMIZED sync for company: ${companyName}... (Date range: ${startDate} to ${endDate})<br>
                        <small class="text-muted">This may take up to 5 minutes with improved performance</small><br>
                        <small class="text-warning">🔄 Baseline reset: PREVIOUS_IS_CORRECTED will be updated before sync</small><br>
                        <small class="text-info">📝 Waybills: Always update existing records with latest API data (like invoices)</small><br>
                        <small class="text-success">💰 VAT Payer Status: Will be checked and updated for all waybills</small>
                    </div>
                </div>
            `;
            
            // Clear previous logs
            document.getElementById('log-container').innerHTML = '';
            document.getElementById('raw-data-container').innerHTML = '';
            
            logMessage(`Starting OPTIMIZED sync for ${companyName} (${startDate} to ${endDate})...`, 'log-info');
            
            // Create AbortController for timeout management
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3600000); // 1 hour timeout
            
            fetch('sync_company_data_optimized.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    company_name: companyName,
                    action: 'sync_all',
                    start_date: startDate,
                    end_date: endDate,
                    auto_associate: autoAssociate
                }),
                signal: controller.signal
            })
            .then(async response => {
                clearTimeout(timeoutId); // Clear timeout on response
                const contentType = response.headers.get('content-type') || '';
                const bodyText = await response.text();
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status} ${response.statusText} | ${bodyText.slice(0, 600)}`);
                }
                try {
                    return JSON.parse(bodyText);
                } catch (e) {
                    throw new Error(`Expected JSON, got '${contentType}'. Body: ${bodyText.slice(0, 600)}`);
                }
            })
            .then(data => {
                if (data.success) {
                    statusDiv.innerHTML = '<div class="sync-success">' + data.message + '</div>';
                    logMessage(`SUCCESS: ${data.message}`, 'log-success');
                    
                    // Show results if available
                    if (data.results) {
                        data.results.forEach(res => {
                            if (res.error) {
                                logMessage(`ERROR [${res.company}][${res.type}]: ${res.message}`, 'log-error');
                            } else {
                                const resultMessage = `SUCCESS [${res.company}][${res.type}]: ${res.inserted} new, ${res.updated} updated${res.newly_modified ? ` (${res.newly_modified} newly modified)` : ''}, ${res.skipped} skipped of ${res.total}`;
                                logMessage(resultMessage, 'log-success');
                            }
                            
                            // Show raw data for each result if available
                            if (res.raw_request || res.raw_response) {
                                showRawDataForResult(res);
                            }
                        });
                    }
                    
                    // Display newly modified waybills if any
                    if (data.newly_modified_waybills && data.newly_modified_waybills.length > 0) {
                        displayNewlyModifiedWaybills(data.newly_modified_waybills);
                    }
                    
                    // Reload companies after successful sync
                    setTimeout(() => loadCompanies(), 2000);
                } else {
                    statusDiv.innerHTML = '<div class="sync-error">Error: ' + (data.message || 'Unknown error') + '</div>';
                    logMessage(`ERROR: ${data.message}`, 'log-error');
                }
            })
            .catch(error => {
                clearTimeout(timeoutId); // Clear timeout on error
                console.error('Sync error:', error);
                
                if (error.name === 'AbortError') {
                    statusDiv.innerHTML = '<div class="sync-error">Sync operation timed out after 1 hour. The server may still be processing the request.</div>';
                    logMessage(`TIMEOUT ERROR: Sync operation timed out after 1 hour`, 'log-error');
                } else {
                    statusDiv.innerHTML = '<div class="sync-error">Network error during sync.</div>';
                    logMessage(`FATAL ERROR: ${error.message}`, 'log-error');
                }
            });
        };
        
        // Date range helper functions
        window.setDateRange = function(range) {
            const today = new Date();
            let startDate, endDate;
            
            switch(range) {
                case 'last7days':
                    startDate = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000));
                    endDate = today;
                    break;
                case 'last30days':
                    startDate = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
                    endDate = today;
                    break;
                case 'last90days':
                    startDate = new Date(today.getTime() - (90 * 24 * 60 * 60 * 1000));
                    endDate = today;
                    break;
                case 'thisyear':
                    startDate = new Date(today.getFullYear(), 0, 1); // January 1st of current year
                    endDate = today;
                    break;
                default:
                    return;
            }
            
            document.getElementById('startDate').value = startDate.toISOString().split('T')[0];
            document.getElementById('endDate').value = endDate.toISOString().split('T')[0];
        };
        
        // Initialize date range on page load
        document.addEventListener('DOMContentLoaded', function() {
            // Set default end date to today if not already set
            const endDateInput = document.getElementById('endDate');
            if (!endDateInput.value) {
                endDateInput.value = new Date().toISOString().split('T')[0];
            }
        });
        
        // Logging functions
        function logMessage(message, className) {
            const logContainer = document.getElementById('log-container');
            const entry = document.createElement('div');
            entry.className = 'log-entry ' + className;
            entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
            logContainer.appendChild(entry);
            logContainer.scrollTop = logContainer.scrollHeight; // Auto-scroll
        }
        
        // Function to show raw data for each result
        function showRawDataForResult(result) {
            const container = document.getElementById('raw-data-container');
            
            const resultDiv = document.createElement('div');
            resultDiv.className = 'mb-4 p-3 border rounded';
            resultDiv.style.backgroundColor = '#f8f9fa';
            
            const header = document.createElement('h6');
            header.textContent = `${result.company} - ${result.type.toUpperCase()}`;
            header.className = `mb-2 ${result.error ? 'text-danger' : 'text-success'}`;
            
            resultDiv.appendChild(header);
            
            if (result.raw_request) {
                const requestLabel = document.createElement('strong');
                requestLabel.textContent = 'Request:';
                resultDiv.appendChild(requestLabel);
                
                const requestPre = document.createElement('pre');
                requestPre.style.cssText = 'background:#fff; border:1px solid #ccc; padding:10px; max-height:200px; overflow:auto; margin:5px 0; font-size:12px;';
                requestPre.textContent = result.raw_request;
                resultDiv.appendChild(requestPre);
            }
            
            if (result.raw_response) {
                const responseLabel = document.createElement('strong');
                responseLabel.textContent = 'Response:';
                resultDiv.appendChild(responseLabel);
                
                const responsePre = document.createElement('pre');
                responsePre.style.cssText = 'background:#fff; border:1px solid #ccc; padding:10px; max-height:200px; overflow:auto; margin:5px 0; font-size:12px;';
                responsePre.textContent = result.raw_response;
                resultDiv.appendChild(responsePre);
            }
            
            container.appendChild(resultDiv);
        }
        
        // Test timeout settings
        function testTimeoutSettings() {
            const statusDiv = document.getElementById('syncStatus');
            statusDiv.innerHTML = `
                <div class="sync-info">
                    <div class="d-flex align-items-center">
                        <div class="spinner-border spinner-border-sm me-2" role="status">
                            <span class="visually-hidden">Testing...</span>
                        </div>
                        Testing server timeout settings...
                    </div>
                </div>
            `;
            
            logMessage('Starting timeout test...', 'log-info');
            
            // First test basic settings
            fetch('test_timeout.php')
                .then(response => response.json())
                .then(data => {
                    logMessage('PHP Settings:', 'log-info');
                    logMessage(`- max_execution_time: ${data.php_settings.max_execution_time}`, 'log-info');
                    logMessage(`- memory_limit: ${data.php_settings.memory_limit}`, 'log-info');
                    logMessage(`- Server: ${data.server_info.server_software}`, 'log-info');
                    
                    // Test for Cloudflare/CDN timeout
                    return fetch('test_cloudflare_timeout.php');
                })
                .then(response => response.json())
                .then(data => {
                    logMessage('Cloudflare/CDN Test:', 'log-info');
                    logMessage(`- Cloudflare Headers: ${Object.keys(data.cloudflare_headers).length} found`, 'log-info');
                    logMessage(`- Server Headers: ${JSON.stringify(data.server_headers)}`, 'log-info');
                    logMessage(`- Duration: ${data.actual_duration}s (expected: ${data.expected_duration}s)`, 'log-info');
                    logMessage(`- Completed: ${data.completed ? 'YES' : 'NO'}`, data.completed ? 'log-success' : 'log-error');
                    logMessage(`- Timeout Source: ${data.timeout_source}`, data.completed ? 'log-success' : 'log-error');
                    
                    // Now test long-running request
                    return fetch('test_long_request.php');
                })
                .then(response => response.json())
                .then(data => {
                    logMessage(`Long request test completed:`, 'log-success');
                    logMessage(`- Started: ${data.start_time}`, 'log-info');
                    logMessage(`- Ended: ${data.end_time}`, 'log-info');
                    logMessage(`- Duration: ${data.actual_duration}s (expected: ${data.expected_duration}s)`, 'log-info');
                    logMessage(`- Completed: ${data.completed ? 'YES' : 'NO'}`, data.completed ? 'log-success' : 'log-error');
                    logMessage(`- Message: ${data.message}`, data.completed ? 'log-success' : 'log-error');
                    
                    statusDiv.innerHTML = `
                        <div class="${data.completed ? 'sync-success' : 'sync-error'}">
                            Timeout test ${data.completed ? 'PASSED' : 'FAILED'}: ${data.message}
                        </div>
                    `;
                })
                .catch(error => {
                    logMessage(`Timeout test error: ${error.message}`, 'log-error');
                    statusDiv.innerHTML = `
                        <div class="sync-error">
                            Timeout test failed: ${error.message}
                        </div>
                    `;
                });
        }
        
        // Clear buttons
        document.getElementById('clear-log-btn').addEventListener('click', function() {
            document.getElementById('log-container').innerHTML = '';
        });
        
        document.getElementById('clear-raw-btn').addEventListener('click', function() {
            document.getElementById('raw-data-container').innerHTML = '';
        });
        
        // Display newly modified waybills
        function displayNewlyModifiedWaybills(waybills) {
            const container = document.getElementById('log-container');
            
            const headerDiv = document.createElement('div');
            headerDiv.className = 'alert alert-warning mt-3';
            headerDiv.innerHTML = `
                <h6 class="alert-heading">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    Newly Modified Waybills (${waybills.length})
                </h6>
                <p class="mb-2">The following waybills have been corrected/updated since the last sync:</p>
                <div class="mt-2">
                    <small class="text-muted">
                        <strong>Color Legend:</strong><br>
                        🟡 <span class="badge bg-warning">Yellow</span> = First correction since last sync (IS_CORRECTED increased by 1)<br>
                        🔴 <span class="badge bg-danger">Red</span> = Multiple corrections since last sync (IS_CORRECTED increased by 2+)<br>
                        <em>💡 Baseline is reset before each sync, so colors show NEW corrections only</em>
                    </small>
                </div>
            `;
            container.appendChild(headerDiv);
            
            const tableDiv = document.createElement('div');
            tableDiv.className = 'table-responsive mt-2';
            tableDiv.innerHTML = `
                <table class="table table-sm table-striped newly-modified-table">
                    <thead class="table-warning">
                        <tr>
                            <th>External ID</th>
                            <th>Waybill Number</th>
                            <th>Seller</th>
                            <th>Buyer</th>
                            <th>Old IS_CORRECTED</th>
                            <th>New IS_CORRECTED</th>
                            <th>Sync Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${waybills.map(wb => {
                            // Color coding based on correction level
                            const oldLevel = parseInt(wb.old_is_corrected) || 0;
                            const newLevel = parseInt(wb.new_is_corrected) || 0;
                            const correctionIncrease = newLevel - oldLevel;
                            
                            // Determine row color based on correction increase
                            let rowClass = '';
                            let rowStyle = '';
                            
                            if (correctionIncrease > 0) {
                                if (correctionIncrease === 1) {
                                    rowClass = 'table-warning'; // Yellow for first correction
                                    rowStyle = 'background-color: #fff3cd;';
                                } else if (correctionIncrease === 2) {
                                    rowClass = 'table-danger'; // Red for multiple corrections
                                    rowStyle = 'background-color: #f8d7da;';
                                } else {
                                    rowClass = 'table-danger'; // Red for many corrections
                                    rowStyle = 'background-color: #f8d7da; font-weight: bold;';
                                }
                            }
                            
                            return `
                                <tr class="${rowClass}" style="${rowStyle}">
                                    <td><code>${wb.external_id}</code></td>
                                    <td>${wb.waybill_number}</td>
                                    <td>${wb.seller_name}</td>
                                    <td>${wb.buyer_name}</td>
                                    <td><span class="badge bg-secondary">${wb.old_is_corrected}</span></td>
                                    <td><span class="badge bg-warning">${wb.new_is_corrected}</span></td>
                                    <td><small class="text-muted">${wb.sync_date}</small></td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
            container.appendChild(tableDiv);
            
            logMessage(`Found ${waybills.length} newly modified waybills`, 'log-warning');
        }
    });
    </script>
</body>
</html>

<?php
/**
 * PARALLEL MULTI-COMPANY SYNC FUNCTION
 * Syncs multiple companies in parallel using background processes
 */
function syncMultipleCompaniesParallel($companyNames, $startDate, $endDate, $autoAssociate, $maxParallel = 3) {
    
    $results = [];
    $startTime = microtime(true);
    
    // Split companies into parallel batches
    $company_batches = array_chunk($companyNames, $maxParallel);
    $total_batches = count($company_batches);
    
    
    foreach ($company_batches as $batch_index => $batch) {
        
        // Execute companies in this batch in parallel using multi-curl
        $batch_results = syncCompaniesBatchParallel($batch, $startDate, $endDate, $autoAssociate);
        
        // Merge results
        $results = array_merge($results, $batch_results);
        
        // Progress logging
        $completed_companies = ($batch_index + 1) * count($batch);
        $progress = round(($completed_companies / count($companyNames)) * 100, 1);
        
        // Brief pause between batches to avoid overwhelming the API
        if ($batch_index < $total_batches - 1) {
            sleep(2);
        }
    }
    
    $endTime = microtime(true);
    $totalTime = round($endTime - $startTime, 2);
    $avgTimePerCompany = round($totalTime / count($companyNames), 2);
    
    
    return [
        'companies' => $results,
        'summary' => [
            'total_companies' => count($companyNames),
            'total_time_seconds' => $totalTime,
            'average_time_per_company' => $avgTimePerCompany,
            'batches_processed' => $total_batches,
            'max_parallel' => $maxParallel
        ]
    ];
}

/**
 * Sync a batch of companies in parallel using multi-curl
 */
function syncCompaniesBatchParallel($companies, $startDate, $endDate, $autoAssociate) {
    error_log("[DEBUG] Starting parallel batch sync for: " . implode(', ', $companies));
    
    $results = [];
    $handles = [];
    $mh = curl_multi_init();
    
    // Prepare requests for each company
    foreach ($companies as $company) {
        $ch = prepareSingleCompanySyncRequest($company, $startDate, $endDate, $autoAssociate);
        if ($ch) {
            $handles[$company] = $ch;
            curl_multi_add_handle($mh, $ch);
        } else {
            // If we can't prepare the request, add an error result
            $results[$company] = [
                'company' => $company,
                'error' => true,
                'message' => 'Failed to prepare sync request',
                'results' => []
            ];
        }
    }
    
    // Execute all requests in parallel
    $running = null;
    do {
        curl_multi_exec($mh, $running);
        curl_multi_select($mh);
    } while ($running > 0);
    
    // Collect results
    foreach ($handles as $company => $ch) {
        $response = curl_multi_getcontent($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        
        curl_multi_remove_handle($mh, $ch);
        curl_close($ch);
        
        if ($error) {
            error_log("[ERROR] Parallel sync failed for $company: $error");
            $results[$company] = [
                'company' => $company,
                'error' => true,
                'message' => "cURL error: $error",
                'results' => []
            ];
        } elseif ($httpCode !== 200) {
            error_log("[ERROR] Parallel sync HTTP error for $company: $httpCode");
            $results[$company] = [
                'company' => $company,
                'error' => true,
                'message' => "HTTP error: $httpCode",
                'results' => []
            ];
        } else {
            // Parse the response
            $responseData = json_decode($response, true);
            if ($responseData) {
                $results[$company] = $responseData;
                error_log("[DEBUG] Parallel sync completed for $company");
            } else {
                error_log("[ERROR] Invalid JSON response for $company");
                $results[$company] = [
                    'company' => $company,
                    'error' => true,
                    'message' => 'Invalid JSON response',
                    'results' => []
                ];
            }
        }
    }
    
    curl_multi_close($mh);
    
    error_log("[DEBUG] Batch sync completed for " . count($companies) . " companies");
    return $results;
}

/**
 * Prepare a cURL handle for a single company sync request
 */
function prepareSingleCompanySyncRequest($company, $startDate, $endDate, $autoAssociate) {
    try {
        // Use the same endpoint but call it internally
        $url = "http://" . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'];
        
        $postData = [
            'action' => 'sync_all',
            'company_name' => $company,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'auto_associate' => $autoAssociate,
            'parallel_mode' => false // Prevent infinite recursion
        ];
        
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($postData),
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Content-Length: ' . strlen(json_encode($postData))
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 1800, // 30 minutes per company
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
            // Forward cookies for authentication
            CURLOPT_COOKIE => $_SERVER['HTTP_COOKIE'] ?? ''
        ]);
        
        return $ch;
        
    } catch (Exception $e) {
        error_log("[ERROR] Failed to prepare sync request for $company: " . $e->getMessage());
        return null;
    }
}

// Normalizes decimal-like inputs to a plain decimal string compatible with SQL DECIMAL(18,2)
// Handles scientific notation (e.g., 1.0E+14), trims thousand separators, and enforces 2 decimals
function normalize_decimal_value($value) {
	$raw = trim((string)$value);
	if ($raw === '' || strcasecmp($raw, 'null') === 0) {
		return '0.00';
	}

	// Remove spaces and non-breaking spaces
	$raw = str_replace(["\xC2\xA0", ' '], '', $raw);

	// If scientific notation, convert using float and format with 2 decimals
	if (preg_match('/^[+\-]?\d+(?:\.\d+)?[eE][+\-]?\d+$/', $raw)) {
		$floatVal = (float)$raw;
		return number_format($floatVal, 2, '.', '');
	}

	// If contains both comma and dot, assume comma is thousands separator -> remove commas
	if (strpos($raw, ',') !== false && strpos($raw, '.') !== false) {
		$raw = str_replace(',', '', $raw);
	}

	// European format like 1.234.567,89 -> remove thousand dots and replace comma with dot
	if (preg_match('/^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/', $raw)) {
		$raw = str_replace('.', '', $raw);
		$raw = str_replace(',', '.', $raw);
	}

	// Strip any remaining non-numeric characters except sign and dot
	$clean = preg_replace('/[^\d.\-+]/', '', $raw);
	if ($clean === '' || !is_numeric($clean)) {
		return '0.00';
	}

	return number_format((float)$clean, 2, '.', '');
}
// OPTIMIZED Helper function to sync waybills with performance improvements
function sync_waybills_for_company($pdo, $company, $company_id, $company_tin, $startDate, $endDate, $type) {
    $sync_type = $type === 'buyer' ? 'buyer_waybills' : 'seller_waybills';
    $skipped = 0; // Initialize skipped counter
    
    $table = $type === 'buyer' ? 'rs.buyers_waybills' : 'rs.sellers_waybills';

    // Fetch credentials
    try {
    $stmt = $pdo->prepare("SELECT s_user, s_password FROM rs_users WHERE company_name = ?");
    $stmt->execute([$company]);
    $credentials = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$credentials) {
            error_log("[ERROR] Credentials not found for company: $company");
            return [
                'company' => $company,
                'type' => $type,
                'error' => true,
                'message' => 'Credentials not found for the selected company.',
                'inserted' => 0,
                'updated' => 0,
                'skipped' => $skipped,
                'total' => 0
            ];
        }
    } catch (PDOException $e) {
        error_log("[ERROR] Failed to fetch credentials for $company: " . $e->getMessage());
        error_log("[ERROR] SQL State: " . $e->getCode());
        return [
            'company' => $company,
            'type' => $type,
            'error' => true,
            'message' => 'Database error while fetching credentials: ' . $e->getMessage(),
            'inserted' => 0,
            'updated' => 0,
            'skipped' => $skipped,
            'total' => 0
        ];
    }
    
    $user = $credentials['s_user'];
    $password = $credentials['s_password'];
    $url = "https://services.rs.ge/WayBillService/WayBillService.asmx";
    $useEx = true;
    $dateFormat = 'Y-m-d\\TH:i:s';
    $startDateObj = new DateTime($startDate);
    $endDateObj = new DateTime($endDate . ' 23:59:59');
    $create_date_s = $startDateObj->format($dateFormat);
    $create_date_e = $endDateObj->format($dateFormat);

    // SOAP function and nodes
    if ($type === 'buyer') {
        $soapFunction = $useEx ? 'get_buyer_waybills_ex' : 'get_buyer_waybills';
        $responseNode = $useEx ? 'get_buyer_waybills_exResponse' : 'get_buyer_waybillsResponse';
        $resultNode = $useEx ? 'get_buyer_waybills_exResult' : 'get_buyer_waybillsResult';
    } else {
        $soapFunction = $useEx ? 'get_waybills_ex' : 'get_waybills';
        $responseNode = $useEx ? 'get_waybills_exResponse' : 'get_waybillsResponse';
        $resultNode = $useEx ? 'get_waybills_exResult' : 'get_waybillsResult';
    }

    // Build XML request
    if ($type === 'buyer') {
        $xml_request = '<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
<' . $soapFunction . ' xmlns="http://tempuri.org/">
    <su>' . htmlspecialchars($user, ENT_XML1) . '</su>
    <sp>' . htmlspecialchars($password, ENT_XML1) . '</sp>
    <seller_tin xsi:nil="true"/>
    <statuses xsi:nil="true"/>
    <car_number xsi:nil="true"/>
    <begin_date_s xsi:nil="true"/>
    <begin_date_e xsi:nil="true"/>
    <create_date_s>' . $create_date_s . '</create_date_s>
    <create_date_e>' . $create_date_e . '</create_date_e>
    <driver_tin xsi:nil="true"/>
    <delivery_date_s xsi:nil="true"/>
    <delivery_date_e xsi:nil="true"/>
    <full_amount xsi:nil="true"/>
    <is_confirmed xsi:nil="true"/>
</' . $soapFunction . '>
</soap:Body>
</soap:Envelope>';
    } else {
        $xml_request = '<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
<' . $soapFunction . ' xmlns="http://tempuri.org/">
    <su>' . htmlspecialchars($user, ENT_XML1) . '</su>
    <sp>' . htmlspecialchars($password, ENT_XML1) . '</sp>
    <itypes xsi:nil="true"/>
    <buyer_tin xsi:nil="true"/>
    <statuses xsi:nil="true"/>
    <car_number xsi:nil="true"/>
    <begin_date_s>' . $create_date_s . '</begin_date_s>
    <begin_date_e>' . $create_date_e . '</begin_date_e>
    <create_date_s xsi:nil="true"/>
    <create_date_e xsi:nil="true"/>
    <driver_tin xsi:nil="true"/>
    <delivery_date_s xsi:nil="true"/>
    <delivery_date_e xsi:nil="true"/>
    <full_amount xsi:nil="true"/>
    <is_confirmed xsi:nil="true"/>
</' . $soapFunction . '>
</soap:Body>
</soap:Envelope>';
    }
    
    $headers = [
        "Content-type: text/xml;charset=utf-8",
        "SOAPAction: \"http://tempuri.org/$soapFunction\"",
        "Content-length: " . strlen($xml_request),
    ];
    
    // Retry wrapper for cURL (buyer endpoints can be slow on RS side)
    $maxAttempts = 3;
    $attempt = 0;
    $response = '';
    $curl_error = '';
    $http_code = 0;
    $timeoutSeconds = ($type === 'buyer') ? 300 : 120; // buyer often slower; original had no timeout
    do {
        $attempt++;
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $xml_request,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_TIMEOUT => $timeoutSeconds,
            CURLOPT_CONNECTTIMEOUT => 30,
            CURLOPT_NOSIGNAL => true, // allow long timeouts in some environments
        ]);
        error_log("[DEBUG] Sending waybill API request (attempt $attempt/$maxAttempts, timeout={$timeoutSeconds}s)...");
        error_log("[DEBUG] Waybill API URL: $url");
        error_log("[DEBUG] Waybill SOAP Function: $soapFunction");
        $t0 = microtime(true);
        $response = curl_exec($ch);
        $curl_error = curl_error($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        $dt = round((microtime(true) - $t0), 2);
        if ($curl_error) {
            error_log("[ERROR] Waybill API attempt $attempt failed after {$dt}s: $curl_error (HTTP $http_code)");
            // Exponential backoff for timeouts
            if ($attempt < $maxAttempts && stripos($curl_error, 'timed out') !== false) {
                $sleep = min(5 * $attempt, 15);
                error_log("[DEBUG] Sleeping {$sleep}s before retry due to timeout...");
                sleep($sleep);
            }
        } else {
            error_log("[DEBUG] Waybill API attempt $attempt succeeded in {$dt}s (HTTP $http_code)");
            break;
        }
    } while ($attempt < $maxAttempts);
    
    error_log("[DEBUG] ===== WAYBILL API RESPONSE ANALYSIS =====");
    error_log("[DEBUG] Waybill HTTP Code: $http_code");
    error_log("[DEBUG] Waybill Response length: " . strlen($response));
    
    $waybills_data = [];
    $error_message = '';
    
    if ($curl_error) {
        error_log("[ERROR] cURL failed: $curl_error");
        $error_message = "cURL Error: " . $curl_error;
    } else {
        error_log("[DEBUG] ===== XML PARSING STARTED =====");
        
        libxml_use_internal_errors(true);
        
        // Clean the response to handle potential encoding issues
        $clean_response = $response;
        
        // Remove any BOM characters
        $clean_response = str_replace("\xEF\xBB\xBF", '', $clean_response);
        
        // Handle potential encoding issues - preserve Georgian Unicode characters
        if (!mb_check_encoding($clean_response, 'UTF-8')) {
            // For Georgian text, try multiple encoding sources before falling back to ISO-8859-1
            $detected_encoding = mb_detect_encoding($clean_response, ['UTF-8', 'Windows-1252', 'ISO-8859-1'], true);
            if ($detected_encoding && $detected_encoding !== 'UTF-8') {
                $clean_response = mb_convert_encoding($clean_response, 'UTF-8', $detected_encoding);
                error_log("[DEBUG] Converted response encoding from $detected_encoding to UTF-8");
            } else {
                error_log("[WARNING] Could not detect encoding, keeping original response");
            }
        }
        
        // Remove any null bytes
        $clean_response = str_replace("\x00", '', $clean_response);
        
        // Fix empty xmlns attributes that can cause parsing issues
        $clean_response = preg_replace('/xmlns=""/', '', $clean_response);
        
        // Fix "null" strings that might be causing issues
        $clean_response = str_replace('>null<', '><', $clean_response);
        
        $sxe = simplexml_load_string($clean_response);
        if ($sxe === false) {
            $error_message = "Failed to parse XML response.";
            $libxml_errors = libxml_get_errors();
            error_log("[ERROR] XML parsing failed. LibXML errors:");
            foreach ($libxml_errors as $error) {
                error_log("[ERROR] LibXML: " . trim($error->message) . " (Line: {$error->line}, Column: {$error->column})");
            }
            libxml_clear_errors();
        } else {
            error_log("[DEBUG] XML parsed successfully");
            
            $sxe->registerXPathNamespace('soap', 'http://schemas.xmlsoap.org/soap/envelope/');
            $sxe->registerXPathNamespace('def', 'http://tempuri.org/');

            $resultNodeContent = $sxe->xpath('//def:' . $resultNode);
            error_log("[DEBUG] Found " . count($resultNodeContent) . " result nodes");

            if (!empty($resultNodeContent) && isset($resultNodeContent[0]->WAYBILL_LIST->WAYBILL)) {
                $waybills = $resultNodeContent[0]->WAYBILL_LIST->WAYBILL;
                error_log("[DEBUG] Found " . count($waybills) . " waybills in response");
                
                foreach ($waybills as $waybill) {
                    $wbArray = (array)$waybill;
                    $row = [];
                    
                    foreach ($wbArray as $fieldName => $fieldValue) {
                        $fieldName = strtoupper($fieldName);
                        if ($fieldValue === null || (is_string($fieldValue) && trim($fieldValue) === '')) continue;
                        
                        $value = (string)$fieldValue;
                        if (is_numeric($value)) {
                            $row[$fieldName] = $value;
                        } else {
                            $row[$fieldName] = $value;
                        }
                    }

                    if ($type === 'seller' && !isset($row['SELLER_TIN'])) {
                        $row['SELLER_TIN'] = $company_tin;
                        $row['SELLER_NAME'] = $company;
                    }
                    if ($type === 'buyer' && !isset($row['BUYER_TIN'])) {
                        $row['BUYER_TIN'] = $company_tin;
                        $row['BUYER_NAME'] = $company;
                    }

                    // EXTERNAL_ID = API field 'ID' (exact mapping, no fallbacks)
                    $externalId = $wbArray['ID'] ?? null;
                    if ($externalId === null) {
                        error_log("[ERROR] Waybill missing required ID field from API - skipping");
                        continue; // Skip waybills without proper ID
                    }
                    $row['EXTERNAL_ID'] = $externalId;
                    
                    // Check for invoice ID in the waybill data
                    $invoiceId = $wbArray['INVOICE_ID'] ?? $wbArray['INVOICEID'] ?? $wbArray['INVOICE'] ?? $wbArray['INV_ID'] ?? $wbArray['INVOICE_NUMBER'] ?? null;
                    if ($invoiceId) {
                        $row['INVOICE_ID'] = $invoiceId;
                    }

                    $row['COMPANY_NAME'] = $company;
                    $row['COMPANY_TIN'] = $company_tin;
                    $row['COMPANY_ID'] = $company_id;
                    $row['UPDATED_AT'] = date('Y-m-d H:i:s');
                    
                    $waybills_data[] = $row;
                }
            } elseif (!empty($resultNodeContent) && isset($resultNodeContent[0]->STATUS)) {
                $status = (string)$resultNodeContent[0]->STATUS;
                if ($status != 0) {
                     $error_message = "API returned a non-zero status code: " . $status;
                }
            }
        }
    }

    error_log("[DEBUG] ===== $sync_type PARSING SUMMARY =====");
    error_log("[DEBUG] Company: $company, Type: $sync_type");
    error_log("[DEBUG] Total parsed waybills: " . count($waybills_data));
    error_log("[DEBUG] SCHEMA CORRECTION: Using exact API field mapping (EXTERNAL_ID = API field 'ID')");
    
    // Define allowed fields arrays based on CORRECTED schema (exact API field mapping)
    $allowedSeller = [
        // Core waybill fields (exact API mapping)
        'EXTERNAL_ID','TYPE','CREATE_DATE','SELLER_TIN','SELLER_NAME','BUYER_TIN','CHEK_BUYER_TIN','BUYER_NAME',
        'START_ADDRESS','END_ADDRESS','DRIVER_TIN','CHEK_DRIVER_TIN','DRIVER_NAME','TRANSPORT_COAST',
        'RECEPTION_INFO','RECEIVER_INFO','DELIVERY_DATE','STATUS','SELER_UN_ID','ACTIVATE_DATE','PAR_ID',
        'FULL_AMOUNT','CAR_NUMBER','WAYBILL_NUMBER','CLOSE_DATE','S_USER_ID','BEGIN_DATE','TRAN_COST_PAYER',
        'TRANS_ID','TRANS_TXT','COMMENT','CATEGORY','IS_MED','WOOD_LABELS','CUST_STATUS','CUST_NAME',
        'QUANTITY_F','VAT_TYPE','BAR_CODE','A_ID','W_ID','WOOD_LABEL','INVOICE_ID','CONFIRMATION_DATE',
        'CORRECTION_DATE','TRANSPORTER_TIN','TOTAL_QUANTITY','ORIGIN_TYPE','ORIGIN_TEXT','BUYER_S_USER_ID',
        'IS_CONFIRMED','FULL_AMOUNT_TXT','IS_CORRECTED','IS_VAT_PAYER',
        // Internal tracking fields (not from API)
        'COMPANY_ID','COMPANY_TIN','COMPANY_NAME','UPDATED_AT'
    ];
    $allowedBuyer = [
        // Core waybill fields (exact API mapping)
        'EXTERNAL_ID','TYPE','CREATE_DATE','SELLER_TIN','SELLER_NAME','BUYER_TIN','CHEK_BUYER_TIN','BUYER_NAME',
        'START_ADDRESS','END_ADDRESS','DRIVER_TIN','CHEK_DRIVER_TIN','DRIVER_NAME','TRANSPORT_COAST',
        'RECEPTION_INFO','RECEIVER_INFO','DELIVERY_DATE','STATUS','SELER_UN_ID','ACTIVATE_DATE','PAR_ID',
        'FULL_AMOUNT','CAR_NUMBER','WAYBILL_NUMBER','CLOSE_DATE','S_USER_ID','BEGIN_DATE','TRAN_COST_PAYER',
        'TRANS_ID','TRANS_TXT','COMMENT','CATEGORY','IS_MED','WOOD_LABELS','CUST_STATUS','CUST_NAME',
        'QUANTITY_F','VAT_TYPE','BAR_CODE','A_ID','W_ID','WOOD_LABEL','INVOICE_ID','CONFIRMATION_DATE',
        'CORRECTION_DATE','TRANSPORTER_TIN','TOTAL_QUANTITY','ORIGIN_TYPE','ORIGIN_TEXT','BUYER_S_USER_ID',
        'IS_CONFIRMED','FULL_AMOUNT_TXT','IS_CORRECTED','IS_VAT_PAYER',
        // Internal tracking fields (not from API)
        'COMPANY_ID','COMPANY_TIN','COMPANY_NAME','UPDATED_AT'
    ];
    $allowed = ($table === 'rs.sellers_waybills') ? $allowedSeller : $allowedBuyer;
    
    if (!empty($waybills_data)) {
        error_log("[DEBUG] First waybill sample: " . print_r($waybills_data[0], true));
        error_log("[DEBUG] ===== STARTING OPTIMIZED DATABASE INSERTION =====");
        error_log("[DEBUG] Target table: $table");
        error_log("[DEBUG] Allowed fields count: " . count($allowed));
    } else {
        error_log("[WARNING] No waybills to insert for $company ($sync_type)");
        return [
            'company' => $company,
            'type' => $sync_type,
            'inserted' => 0,
            'updated' => 0,
            'newly_modified' => 0,
            'skipped' => $skipped,
            'total' => 0,
            'error' => !!$error_message,
            'message' => $error_message ?: "No waybills found for $company ($sync_type)",
            'newly_modified_waybills' => [],
            'raw_request' => $xml_request,
            'raw_response' => $response
        ];
    }
    
    $inserted = 0;
    $updated = 0;
    $newly_modified = 0;
    $skipped = 0;
    $failed = 0;
    
    // Track newly modified waybills for reporting
    $newly_modified_waybills = [];
    
    // OPTIMIZATION 1: Batch database operations for better performance
    $batch_size = 50; // Process 50 waybills at a time
    $chunks = array_chunk($waybills_data, $batch_size);
    
    error_log("[DEBUG] Processing " . count($waybills_data) . " waybills in " . count($chunks) . " batches of $batch_size");
    
    foreach ($chunks as $chunk_index => $chunk) {
        error_log("[DEBUG] Processing batch " . ($chunk_index + 1) . "/" . count($chunks) . " (" . count($chunk) . " records)");
        
        // OPTIMIZATION 2: Prepare batch statements for better performance
        $batch_inserts = [];
        $batch_updates = [];
        $batch_checks = [];
        
        foreach ($chunk as $record_index => $wb) {
            try {
                // Filter to allowed columns
                $wbFiltered = array_intersect_key($wb, array_flip($allowed));
                
                // Coerce date/time fields to SQL-friendly format
                $dateFields = ['CREATE_DATE','ACTIVATE_DATE','BEGIN_DATE','DELIVERY_DATE','CLOSE_DATE','CORRECTION_DATE','UPDATED_AT'];
                foreach ($dateFields as $df) {
                    if (!empty($wbFiltered[$df])) {
                        $ts = strtotime((string)$wbFiltered[$df]);
                        if ($ts !== false) {
                            $wbFiltered[$df] = date('Y-m-d H:i:s', $ts);
                        }
                    }
                }

				// Numeric coercion for decimals and ints (handle scientific notation safely)
				$decimalFields = ['TRANSPORT_COAST','FULL_AMOUNT','WAYBILL_FULL_AMOUNT','QUANTITY_F','TOTAL_QUANTITY'];
				foreach ($decimalFields as $nf) {
					if (isset($wbFiltered[$nf])) {
						$wbFiltered[$nf] = normalize_decimal_value($wbFiltered[$nf]);
					}
				}
                $intFields = ['TYPE','STATUS','IS_CONFIRMED','IS_CORRECTED','SELLER_ST','BUYER_ST','IS_MED','TRAN_COST_PAYER','CATEGORY','CUST_STATUS','CHEK_BUYER_TIN','CHEK_DRIVER_TIN','WAYBILL_TRAN_COST_PAYER','WAYBILL_CATEGORY','WAYBILL_CUST_STATUS','WAYBILL_IS_MED'];
                foreach ($intFields as $if) {
                    if (isset($wbFiltered[$if])) {
                        $v = trim((string)$wbFiltered[$if]);
                        $wbFiltered[$if] = is_numeric($v) ? (int)$v : (preg_match('/-?\d+/', $v, $m) ? (int)$m[0] : 0);
                    }
                }

                $fields = array_keys($wbFiltered);
                
                // Skip if no fields to insert
                if (empty($fields)) {
                    error_log("[WARNING] Waybill $record_index has no valid fields after filtering - skipping");
                    error_log("[WARNING] Original data sample: " . json_encode(array_slice($wb, 0, 3, true)));
                    error_log("[WARNING] EXTERNAL_ID: " . ($wb['EXTERNAL_ID'] ?? 'N/A'));
                    $skipped++;
                    continue;
                }
                
                        // Smart upsert logic: Check if waybill exists and always update with latest data
        $external_id = $wbFiltered['EXTERNAL_ID'] ?? null;
        $is_corrected = $wbFiltered['IS_CORRECTED'] ?? 0;
        
        if ($external_id) {
            // OPTIMIZATION 3: Batch check for existing waybills
            $batch_checks[] = [
                'external_id' => $external_id,
                'company_tin' => $company_tin,
                'data' => $wbFiltered,
                'is_corrected' => $is_corrected
            ];
        } else {
            // No EXTERNAL_ID - add to batch inserts
            $batch_inserts[] = [
                'fields' => $fields,
                'data' => $wbFiltered
            ];
        }
            } catch (Exception $e) {
                $failed++;
                error_log("[ERROR] General error processing waybill: " . $e->getMessage());
                error_log("[ERROR] Exception type: " . get_class($e));
                error_log("[ERROR] Waybill data sample: " . json_encode(array_slice($wb, 0, 3, true)));
                error_log("[ERROR] EXTERNAL_ID: " . ($wb['EXTERNAL_ID'] ?? 'N/A'));
                continue;
            }
        }
        
                        // OPTIMIZATION 4: Batch check existing waybills and always update with latest data
                if (!empty($batch_checks)) {
                    $check_ids = array_column($batch_checks, 'external_id');
                    $placeholders = str_repeat('?,', count($check_ids) - 1) . '?';
                    $check_sql = "SELECT EXTERNAL_ID, PREVIOUS_IS_CORRECTED, WAYBILL_NUMBER, SELLER_NAME, BUYER_NAME FROM $table WHERE EXTERNAL_ID IN ($placeholders) AND COMPANY_TIN = ?";
                    $check_params = array_merge($check_ids, [$company_tin]);
                    
                    try {
                        $check_stmt = $pdo->prepare($check_sql);
                        $check_stmt->execute($check_params);
                        $existing_waybills = $check_stmt->fetchAll(PDO::FETCH_ASSOC);
                        $existing_map = array_column($existing_waybills, null, 'EXTERNAL_ID');
                        
                        // Process each checked waybill
                        foreach ($batch_checks as $check) {
                            $external_id = $check['external_id'];
                            $existing = $existing_map[$external_id] ?? null;
                            
                            if ($existing) {
                                $previous_corrected = $existing['PREVIOUS_IS_CORRECTED'] ?? 0;
                                $current_is_corrected = $check['is_corrected'] ?? 0;
                                
                                // ALWAYS UPDATE existing waybills with latest data from API (like invoices do)
                                // This ensures we have the most current information and follows the same pattern as invoice sync
                                // The PREVIOUS_IS_CORRECTED field is still used to track NEW corrections since baseline reset
                                $batch_updates[] = [
                                    'external_id' => $external_id,
                                    'company_tin' => $company_tin,
                                    'fields' => array_keys($check['data']),
                                    'data' => $check['data']
                                ];
                                
                                $updated++;
                                
                                // Track newly modified waybill for reporting (comparing vs baseline)
                                if ($current_is_corrected > $previous_corrected) {
                                    $newly_modified++;
                                    $newly_modified_waybills[] = [
                                        'external_id' => $external_id,
                                        'waybill_number' => $existing['WAYBILL_NUMBER'] ?? 'N/A',
                                        'seller_name' => $existing['SELLER_NAME'] ?? 'N/A',
                                        'buyer_name' => $existing['BUYER_NAME'] ?? 'N/A',
                                        'old_is_corrected' => $previous_corrected,
                                        'new_is_corrected' => $current_is_corrected,
                                        'sync_date' => date('Y-m-d H:i:s')
                                    ];
                                    
                                    error_log("[DEBUG] Waybill NEWLY MODIFIED - ID: $external_id, PREVIOUS_IS_CORRECTED: $previous_corrected -> NEW IS_CORRECTED: {$current_is_corrected}");
                                } else {
                                    error_log("[DEBUG] Waybill UPDATED (no corrections) - ID: $external_id, PREVIOUS_IS_CORRECTED: $previous_corrected, NEW IS_CORRECTED: {$current_is_corrected}");
                                }
                            } else {
                                // Add to batch inserts
                                $batch_inserts[] = [
                                    'fields' => array_keys($check['data']),
                                    'data' => $check['data']
                                ];
                            }
                        }
                    } catch (PDOException $e) {
                        error_log("[ERROR] Batch check failed: " . $e->getMessage());
                        error_log("[ERROR] SQL State: " . $e->getCode());
                        error_log("[ERROR] Check batch size: " . count($batch_checks) . " records");
                        error_log("[ERROR] Check SQL: " . $check_sql);
                        $failed += count($batch_checks);
                    }
                }
        
        // OPTIMIZATION 5: Execute batch inserts
        if (!empty($batch_inserts)) {
            try {
                $pdo->beginTransaction();
                
                foreach ($batch_inserts as $insert) {
                    $fields = $insert['fields'];
                    $data = $insert['data'];
                    
                    $columns = '[' . implode('], [', $fields) . ']';
                    $placeholders = array_map(fn($f) => ':' . $f, $fields);
                    $params = [];
                    foreach ($fields as $f) { $params[':' . $f] = $data[$f]; }

                    $sql = "INSERT INTO $table ($columns) VALUES (" . implode(", ", $placeholders) . ")";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute($params);
                    $inserted++;
                }
                
                $pdo->commit();
                error_log("[DEBUG] Batch inserted $inserted waybills successfully");
                } catch (PDOException $e) {
                    $pdo->rollBack();
                    error_log("[ERROR] Batch insert failed: " . $e->getMessage());
                    error_log("[ERROR] SQL State: " . $e->getCode());
                    error_log("[ERROR] Batch size: " . count($batch_inserts) . " records");
                    error_log("[ERROR] First failed record EXTERNAL_ID: " . ($batch_inserts[0]['data']['EXTERNAL_ID'] ?? 'N/A'));
                    // Fallback to per-row insert to isolate bad records and continue
                foreach ($batch_inserts as $idx => $insert) {
                    try {
                        $fields = $insert['fields'];
                        $data = $insert['data'];
                        $columns = '[' . implode('], [', $fields) . ']';
                        $placeholders = array_map(fn($f) => ':' . $f, $fields);
                        $params = [];
                        foreach ($fields as $f) { $params[':' . $f] = $data[$f]; }
                        $sql = "INSERT INTO $table ($columns) VALUES (" . implode(", ", $placeholders) . ")";
                        $stmt = $pdo->prepare($sql);
                        $stmt->execute($params);
                        $inserted++;
                    } catch (PDOException $rowEx) {
                        // Log details and attempt a stricter sanitation retry
                        $extId = $insert['data']['EXTERNAL_ID'] ?? 'N/A';
                        error_log("[ERROR] Row insert failed (initial). EXTERNAL_ID=$extId; Error=" . $rowEx->getMessage());
                        error_log("[ERROR] SQL State: " . $rowEx->getCode());
                        error_log("[ERROR] Failed data sample: " . json_encode(array_slice($insert['data'], 0, 5, true)));
                        // Identify likely problematic numeric fields before sanitation
                        $rawData = $insert['data'];
                        $decimalCandidates = ['TRANSPORT_COAST','FULL_AMOUNT','WAYBILL_FULL_AMOUNT','QUANTITY_F','TOTAL_QUANTITY'];
                        $intCandidates = ['TYPE','STATUS','IS_CONFIRMED','IS_CORRECTED','SELLER_ST','BUYER_ST','IS_MED','TRAN_COST_PAYER','CATEGORY','CUST_STATUS','CHEK_BUYER_TIN','CHEK_DRIVER_TIN','WAYBILL_TRAN_COST_PAYER','WAYBILL_CATEGORY','WAYBILL_CUST_STATUS','WAYBILL_IS_MED'];
                        $suspects = [];
                        foreach ($decimalCandidates as $nf) {
                            if (isset($rawData[$nf])) {
                                $v = (string)$rawData[$nf];
                                $clean = preg_replace('/[^\d.-]/', '', $v);
                                if ($v !== $clean) {
                                    $suspects[$nf] = ['raw' => $v, 'clean' => $clean];
                                }
                            }
                        }
                        foreach ($intCandidates as $if) {
                            if (isset($rawData[$if])) {
                                $v = (string)$rawData[$if];
                                if (!preg_match('/^-?\d+$/', trim($v))) {
                                    $suspects[$if] = ['raw' => $v, 'clean' => (preg_match('/-?\d+/', $v, $m) ? $m[0] : '0')];
                                }
                            }
                        }
                        if (!empty($suspects)) {
                            error_log("[ERROR] Likely numeric conversion suspects (pre-sanitization) for EXTERNAL_ID=$extId: " . json_encode($suspects));
                        }
                        error_log("[ERROR] Row params: " . json_encode($rawData));
						// Retry after coercing numeric fields again using robust normalization (incl. scientific notation)
						$data = $insert['data'];
						foreach (['TRANSPORT_COAST','FULL_AMOUNT','WAYBILL_FULL_AMOUNT','QUANTITY_F','TOTAL_QUANTITY'] as $nf) {
							if (isset($data[$nf])) {
								$data[$nf] = normalize_decimal_value($data[$nf]);
							}
						}
                        foreach (['TYPE','STATUS','IS_CONFIRMED','IS_CORRECTED','SELLER_ST','BUYER_ST','IS_MED','TRAN_COST_PAYER','CATEGORY','CUST_STATUS','CHEK_BUYER_TIN','CHEK_DRIVER_TIN','WAYBILL_TRAN_COST_PAYER','WAYBILL_CATEGORY','WAYBILL_CUST_STATUS','WAYBILL_IS_MED'] as $if) {
                            if (isset($data[$if])) {
                                $v = trim((string)$data[$if]);
                                $data[$if] = is_numeric($v) ? (int)$v : (preg_match('/-?\d+/', $v, $m) ? (int)$m[0] : 0);
                            }
                        }
                        try {
                            $params = [];
                            foreach ($fields as $f) { $params[':' . $f] = $data[$f] ?? null; }
                            $stmt = $pdo->prepare($sql);
                            $stmt->execute($params);
                            $inserted++;
                            error_log("[DEBUG] Row insert succeeded on retry after sanitation. EXTERNAL_ID=$extId");
                        } catch (PDOException $rowEx2) {
                            $failed++;
                            error_log("[ERROR] Row insert failed after sanitation. EXTERNAL_ID=$extId; Error=" . $rowEx2->getMessage());
                            error_log("[ERROR] Sanitized params: " . json_encode($data));
                            // One more attempt: drop non-essential numeric fields entirely if still invalid
                            try {
                                foreach (['TRANSPORT_COAST','FULL_AMOUNT','WAYBILL_FULL_AMOUNT'] as $nf) {
                                    if (isset($data[$nf]) && !is_numeric($data[$nf])) unset($data[$nf]);
                                }
                                $params = [];
                                foreach ($fields as $f) { if (array_key_exists($f, $data)) { $params[':' . $f] = $data[$f]; } }
                                $cols = array_keys($data);
                                if (!empty($cols)) {
                                    $sql2 = "INSERT INTO $table ([" . implode('], [', $cols) . "]) VALUES (" . implode(', ', array_map(fn($f)=> ':' . $f, $cols)) . ")";
                                    $stmt = $pdo->prepare($sql2);
                                    $stmt->execute($params);
                                    $inserted++;
                                    error_log("[DEBUG] Row insert succeeded after dropping suspect numeric fields. EXTERNAL_ID=$extId");
                                }
                            } catch (PDOException $rowEx3) {
                                error_log("[ERROR] Row insert failed after dropping suspects. EXTERNAL_ID=$extId; Error=" . $rowEx3->getMessage());
                                error_log("[ERROR] SQL State: " . $rowEx3->getCode());
                                error_log("[ERROR] Dropped fields: " . implode(', ', $suspects));
                            }
                        }
                    }
                }
            }
        }
        
        // OPTIMIZATION 6: Execute batch updates
        if (!empty($batch_updates)) {
            try {
                $pdo->beginTransaction();
                
                foreach ($batch_updates as $update) {
                    $fields = $update['fields'];
                    $data = $update['data'];
                    
                    $update_set = implode(', ', array_map(fn($f) => "[$f] = :$f", $fields));
                    $update_params = [];
                    foreach ($fields as $f) { $update_params[':' . $f] = $data[$f]; }
                    
                    $update_sql = "UPDATE $table SET $update_set WHERE EXTERNAL_ID = :external_id AND COMPANY_TIN = :company_tin";
                    $update_params[':external_id'] = $update['external_id'];
                    $update_params[':company_tin'] = $update['company_tin'];
                    
                    $update_stmt = $pdo->prepare($update_sql);
                    $update_stmt->execute($update_params);
                }
                
                $pdo->commit();
                error_log("[DEBUG] Batch updated " . count($batch_updates) . " waybills successfully");
            } catch (PDOException $e) {
                $pdo->rollBack();
                error_log("[ERROR] Batch update failed: " . $e->getMessage());
                error_log("[ERROR] SQL State: " . $e->getCode());
                error_log("[ERROR] Update batch size: " . count($batch_updates) . " records");
                error_log("[ERROR] First failed update EXTERNAL_ID: " . ($batch_updates[0]['external_id'] ?? 'N/A'));
                $failed += count($batch_updates);
            }
        }
        
        // OPTIMIZATION 7: Memory management and progress tracking
        if (($chunk_index + 1) % 5 === 0) {
            error_log("[DEBUG] Progress: " . ($chunk_index + 1) . "/" . count($chunks) . " batches completed");
            gc_collect_cycles(); // Force garbage collection
        }
    }
    
            error_log("[DEBUG] ===== OPTIMIZED $sync_type INSERTION SUMMARY =====");
        error_log("[DEBUG] Company: $company, Type: $sync_type");
        error_log("[DEBUG] Total processed: " . count($waybills_data));
        error_log("[DEBUG] Successfully inserted: $inserted");
        error_log("[DEBUG] Successfully updated: $updated (always update existing waybills with latest data)");
        error_log("[DEBUG] Newly modified (corrections): $newly_modified");
        error_log("[DEBUG] Skipped: $skipped");
        error_log("[DEBUG] Failed operations: $failed");
        error_log("[DEBUG] Table: $table");
        error_log("[DEBUG] ===============================");
    
    return [
        'company' => $company,
        'type' => $sync_type,
        'inserted' => $inserted,
        'updated' => $updated,
        'newly_modified' => $newly_modified,
        'skipped' => $skipped,
        'total' => count($waybills_data),
        'error' => !!$error_message,
        'message' => $error_message ?: "Processed " . count($waybills_data) . " waybill records: $inserted new, $updated updated (always update existing with latest data, $newly_modified newly corrected), $skipped skipped, $failed failed.",
        'newly_modified_waybills' => $newly_modified_waybills,
        'raw_request' => $xml_request,
        'raw_response' => $response
    ];
}

/**
 * CORRECTED: Sync waybill goods data for a company using date range API (like waybills)
 * Uses get_waybill_goods_list and get_buyer_waybill_goods_list with date ranges, not individual waybill IDs
 */
function sync_waybill_goods_for_company($pdo, $company, $company_id, $company_tin, $startDate, $endDate, $type = 'seller') {
    $sync_type = $type === 'buyer' ? 'buyer_waybill_goods' : 'seller_waybill_goods';
    $skipped = 0; // Initialize skipped counter
    error_log("[DEBUG] ===== STARTING $sync_type SYNC =====");
    error_log("[DEBUG] Company: $company");
    error_log("[DEBUG] Type: $sync_type");
    error_log("[DEBUG] Company ID: $company_id");
    error_log("[DEBUG] Company TIN: $company_tin");
    error_log("[DEBUG] Date Range: $startDate to $endDate");
    
    $table = $type === 'buyer' ? 'rs.buyers_waybill_goods' : 'rs.sellers_waybill_goods';
    error_log("[DEBUG] Target table: $table");
    
    // Fetch credentials
    try {
        $stmt = $pdo->prepare("SELECT s_user, s_password FROM rs_users WHERE company_name = ?");
        $stmt->execute([$company]);
        $credentials = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$credentials) {
            error_log("[ERROR] Credentials not found for company: $company");
            return [
                'company' => $company,
                'type' => $sync_type,
                'error' => true,
                'message' => 'Credentials not found',
                'inserted' => 0,
                'updated' => 0,
                'total' => 0
            ];
        }
    } catch (PDOException $e) {
        error_log("[ERROR] Failed to fetch credentials: " . $e->getMessage());
        return [
            'company' => $company,
            'type' => $sync_type,
            'error' => true,
            'message' => 'Database error: ' . $e->getMessage(),
            'inserted' => 0,
            'updated' => 0,
            'total' => 0
        ];
    }
    
    $user = $credentials['s_user'];
    $password = $credentials['s_password'];
    $url = "https://services.rs.ge/WayBillService/WayBillService.asmx";
    
    // Date formatting (same as waybills)
    $dateFormat = 'Y-m-d\\TH:i:s';
    $startDateObj = new DateTime($startDate);
    $endDateObj = new DateTime($endDate . ' 23:59:59');
    $create_date_s = $startDateObj->format($dateFormat);
    $create_date_e = $endDateObj->format($dateFormat);
    
    // Determine SOAP function based on type
    $soapFunction = $type === 'buyer' ? 'get_buyer_waybilll_goods_list' : 'get_waybill_goods_list';
    $responseNode = $type === 'buyer' ? 'get_buyer_waybilll_goods_listResponse' : 'get_waybill_goods_listResponse';
    $resultNode = $type === 'buyer' ? 'get_buyer_waybilll_goods_listResult' : 'get_waybill_goods_listResult';
    
    // Build XML request using date range (like waybills)
    if ($type === 'buyer') {
        $xml_request = '<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
<' . $soapFunction . ' xmlns="http://tempuri.org/">
    <su>' . htmlspecialchars($user, ENT_XML1) . '</su>
    <sp>' . htmlspecialchars($password, ENT_XML1) . '</sp>
    <seller_tin xsi:nil="true"/>
    <statuses xsi:nil="true"/>
    <car_number xsi:nil="true"/>
    <begin_date_s>' . $create_date_s . '</begin_date_s>
    <begin_date_e>' . $create_date_e . '</begin_date_e>
    <create_date_s xsi:nil="true"/>
    <create_date_e xsi:nil="true"/>
    <driver_tin xsi:nil="true"/>
    <delivery_date_s xsi:nil="true"/>
    <delivery_date_e xsi:nil="true"/>
    <full_amount xsi:nil="true"/>
    <is_confirmed xsi:nil="true"/>
</' . $soapFunction . '>
</soap:Body>
</soap:Envelope>';
    } else {
        $xml_request = '<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
<' . $soapFunction . ' xmlns="http://tempuri.org/">
    <su>' . htmlspecialchars($user, ENT_XML1) . '</su>
    <sp>' . htmlspecialchars($password, ENT_XML1) . '</sp>
    <itypes xsi:nil="true"/>
    <buyer_tin xsi:nil="true"/>
    <statuses xsi:nil="true"/>
    <car_number xsi:nil="true"/>
    <begin_date_s>' . $create_date_s . '</begin_date_s>
    <begin_date_e>' . $create_date_e . '</begin_date_e>
    <create_date_s xsi:nil="true"/>
    <create_date_e xsi:nil="true"/>
    <driver_tin xsi:nil="true"/>
    <delivery_date_s xsi:nil="true"/>
    <delivery_date_e xsi:nil="true"/>
    <full_amount xsi:nil="true"/>
    <is_confirmed xsi:nil="true"/>
</' . $soapFunction . '>
</soap:Body>
</soap:Envelope>';
    }
    
    $headers = [
        "Content-type: text/xml;charset=utf-8",
        "SOAPAction: \"http://tempuri.org/$soapFunction\"",
        "Content-length: " . strlen($xml_request),
    ];
    
    // Retry wrapper for cURL (same as waybills)
    $maxAttempts = 3;
    $attempt = 0;
    $response = '';
    $curl_error = '';
    $http_code = 0;
    $timeoutSeconds = 120; // Standard timeout for goods API
    
    do {
        $attempt++;
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $xml_request,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_TIMEOUT => $timeoutSeconds,
            CURLOPT_CONNECTTIMEOUT => 30,
            CURLOPT_NOSIGNAL => true,
        ]);
        // error_log("[DEBUG] Sending goods API request (attempt $attempt/$maxAttempts, timeout={$timeoutSeconds}s)...");
        // error_log("[DEBUG] Goods API URL: $url");
        // error_log("[DEBUG] Goods SOAP Function: $soapFunction");
        $t0 = microtime(true);
        $response = curl_exec($ch);
        $curl_error = curl_error($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        $dt = round((microtime(true) - $t0), 2);
        if ($curl_error) {
            error_log("[ERROR] Goods API attempt $attempt failed after {$dt}s: $curl_error (HTTP $http_code)");
            // Exponential backoff for timeouts
            if ($attempt < $maxAttempts && stripos($curl_error, 'timed out') !== false) {
                $sleep = min(5 * $attempt, 15);
                error_log("[DEBUG] Sleeping {$sleep}s before retry due to timeout...");
                sleep($sleep);
            }
        } else {
            // error_log("[DEBUG] Goods API attempt $attempt succeeded in {$dt}s (HTTP $http_code)");
            break;
        }
    } while ($attempt < $maxAttempts);
    
    // error_log("[DEBUG] ===== GOODS API RESPONSE ANALYSIS =====");
    // error_log("[DEBUG] Goods HTTP Code: $http_code");
    // error_log("[DEBUG] Goods Response length: " . strlen($response));
    
    $goods_data = [];
    $error_message = '';
    
    if ($curl_error) {
        error_log("[ERROR] cURL failed: $curl_error");
        $error_message = "cURL Error: " . $curl_error;
    } else {
        error_log("[DEBUG] ===== XML PARSING STARTED =====");
        
        libxml_use_internal_errors(true);
        
        // Clean the response (same as waybills)
        $clean_response = $response;
        $clean_response = str_replace("\xEF\xBB\xBF", '', $clean_response);
        
        if (!mb_check_encoding($clean_response, 'UTF-8')) {
            // For Georgian text, try multiple encoding sources before falling back to ISO-8859-1
            $detected_encoding = mb_detect_encoding($clean_response, ['UTF-8', 'Windows-1252', 'ISO-8859-1'], true);
            if ($detected_encoding && $detected_encoding !== 'UTF-8') {
                $clean_response = mb_convert_encoding($clean_response, 'UTF-8', $detected_encoding);
                // error_log("[DEBUG] Converted goods response encoding from $detected_encoding to UTF-8");
            } else {
                error_log("[WARNING] Could not detect goods response encoding, keeping original");
            }
        }
        
        $clean_response = str_replace("\x00", '', $clean_response);
        $clean_response = preg_replace('/xmlns=""/', '', $clean_response);
        $clean_response = str_replace('>null<', '><', $clean_response);
        
        $sxe = simplexml_load_string($clean_response);
        if ($sxe === false) {
            $error_message = "Failed to parse XML response.";
            $libxml_errors = libxml_get_errors();
            error_log("[ERROR] XML parsing failed. LibXML errors:");
            foreach ($libxml_errors as $error) {
                error_log("[ERROR] LibXML: " . trim($error->message) . " (Line: {$error->line}, Column: {$error->column})");
            }
            libxml_clear_errors();
        } else {
            error_log("[DEBUG] XML parsed successfully");
            
            $sxe->registerXPathNamespace('soap', 'http://schemas.xmlsoap.org/soap/envelope/');
            $sxe->registerXPathNamespace('def', 'http://tempuri.org/');

            $resultNodeContent = $sxe->xpath('//def:' . $resultNode);
            error_log("[DEBUG] Found " . count($resultNodeContent) . " result nodes");

            if (!empty($resultNodeContent) && isset($resultNodeContent[0]->WAYBILL_LIST->WAYBILL)) {
                $waybill_list = $resultNodeContent[0]->WAYBILL_LIST->WAYBILL;
                // error_log("[DEBUG] Found " . count($waybill_list) . " waybills with goods in response");
                
                foreach ($waybill_list as $waybill) {
                    $waybillArray = (array)$waybill;
                    $row = [];
                    
                    foreach ($waybillArray as $fieldName => $fieldValue) {
                        $fieldName = strtoupper($fieldName);
                        
                        // Debug A_ID specifically
                        if ($fieldName === 'A_ID') {
                            error_log("[DEBUG] Raw A_ID from API: " . var_export($fieldValue, true) . " (type: " . gettype($fieldValue) . ")");
                        }
                        
                        if ($fieldValue === null || (is_string($fieldValue) && trim($fieldValue) === '')) continue;
                        
                        $value = (string)$fieldValue;
                        $row[$fieldName] = $value;
                        
                        // Debug A_ID after processing
                        if ($fieldName === 'A_ID') {
                            error_log("[DEBUG] Processed A_ID: " . var_export($value, true));
                        }
                    }

                    // CORRECTED LOGIC: Handle difference between seller and buyer goods APIs
                    // Seller goods API provides ID field, buyer goods API does not
                    if ($type === 'seller' && isset($row['ID']) && !empty($row['ID'])) {
                        // Seller goods: Use the ID field directly
                        $row['WAYBILL_ID'] = $row['ID'];
                        // error_log("[DEBUG] Seller goods: Using ID as WAYBILL_ID: {$row['ID']}");
                    } elseif ($type === 'buyer') {
                        // Buyer goods: API doesn't provide ID field, so don't set WAYBILL_ID
                        // We'll use natural identifiers (WAYBILL_NUMBER, A_ID, BAR_CODE) for uniqueness
                        // No artificial WAYBILL_ID generation - use live API data as-is
                        // error_log("[DEBUG] Buyer goods: Using natural identifiers (WAYBILL_NUMBER, A_ID, BAR_CODE) - no WAYBILL_ID needed");
                    } else {
                        // Seller goods missing ID - shouldn't happen but handle gracefully
                        error_log("[WARNING] Seller goods missing ID field. Available fields: " . implode(', ', array_keys($row)));
                        if (isset($row['WAYBILL_NUMBER']) && !empty($row['WAYBILL_NUMBER'])) {
                            $row['WAYBILL_ID'] = $row['WAYBILL_NUMBER'];
                            // error_log("[DEBUG] Seller goods fallback: Using WAYBILL_NUMBER as WAYBILL_ID: {$row['WAYBILL_NUMBER']}");
                        } else {
                            // Generate fallback ID
                            $row['WAYBILL_ID'] = 'SELLER_' . time() . '_' . ($row['A_ID'] ?? rand(1000, 9999));
                            // error_log("[DEBUG] Seller goods fallback: Generated WAYBILL_ID: {$row['WAYBILL_ID']}");
                        }
                    }

                    // Add company tracking fields (match NEW schema exactly)
                    $row['COMPANY_NAME'] = $company;
                    $row['COMPANY_TIN'] = $company_tin;  // NEW: Required for filtering
                    $row['COMPANY_ID'] = $company_id;
                    $row['UPDATED_AT'] = date('Y-m-d H:i:s');
                    
                    $goods_data[] = $row;
                }
            } elseif (!empty($resultNodeContent) && isset($resultNodeContent[0]->STATUS)) {
                $status = (string)$resultNodeContent[0]->STATUS;
                if ($status != 0) {
                     $error_message = "API returned a non-zero status code: " . $status;
                }
            }
        }
    }

    error_log("[DEBUG] ===== $sync_type PARSING SUMMARY =====");
    error_log("[DEBUG] Company: $company, Type: $sync_type");
    // error_log("[DEBUG] Total parsed goods: " . count($goods_data));
    
    // RAW REQUEST/RESPONSE DEBUG (FULL - NO TRUNCATION AS REQUESTED)
    error_log("[DEBUG] ===== RAW API REQUEST DEBUG =====");
    error_log("[DEBUG] Request URL: $url");
    error_log("[DEBUG] SOAP Function: $soapFunction");
    error_log("[DEBUG] Date Range: $create_date_s to $create_date_e");
    error_log("[DEBUG] Request XML (FULL): " . $xml_request);
    error_log("[DEBUG] ===== RAW API RESPONSE DEBUG =====");
    error_log("[DEBUG] HTTP Code: $http_code");
    error_log("[DEBUG] Response length: " . strlen($response) . " characters");
    error_log("[DEBUG] Response XML (FULL - NO TRUNCATION): " . $response);
    
    if (!empty($goods_data)) {
        // error_log("[DEBUG] First goods sample: " . print_r($goods_data[0], true));
        error_log("[DEBUG] ===== STARTING OPTIMIZED DATABASE INSERTION =====");
        error_log("[DEBUG] Target table: $table");
    } else {
        error_log("[WARNING] No goods to insert for $company ($sync_type)");
        return [
            'company' => $company,
            'type' => $sync_type,
            'inserted' => 0,
            'updated' => 0,
            'total' => 0,
            'error' => !!$error_message,
            'message' => $error_message ?: "No goods found for $company ($sync_type)",
        ];
    }
    
    $inserted = 0;
    $updated = 0;
    $skipped = 0;
    $failed = 0;
    
    // Batch processing for better performance
    $batch_size = 50;
    $chunks = array_chunk($goods_data, $batch_size);
    
        // error_log("[DEBUG] Processing " . count($goods_data) . " goods in " . count($chunks) . " batches of $batch_size");
    
    foreach ($chunks as $chunk_index => $chunk) {
        // error_log("[DEBUG] Processing goods batch " . ($chunk_index + 1) . "/" . count($chunks) . " (" . count($chunk) . " records)");
        
        foreach ($chunk as $goods) {
            try {
                // Comprehensive data type processing to match check_tables.php schema
                
                // 1. Normalize decimal/numeric fields (schema uses NVARCHAR for flexibility)
                $numericFields = ['PRICE', 'AMOUNT', 'TRANSPORT_COAST', 'FULL_AMOUNT', 'QUANTITY'];
                foreach ($numericFields as $nf) {
                    if (isset($goods[$nf])) {
                        $goods[$nf] = normalize_decimal_value($goods[$nf]);
                    }
                }
                
                // 2. Truncate string fields to match NEW schema constraints (check_tables.php)
                $stringLimits = [
                    'W_NAME' => 500,           // VARCHAR(500) - Increased to prevent data loss
                    'TIN' => 100,              // VARCHAR(100) - Increased to prevent data loss
                    'NAME' => 500,             // VARCHAR(500) - Increased to prevent data loss
                    'START_ADDRESS' => 500,    // VARCHAR(500) - Increased to prevent data loss
                    'END_ADDRESS' => 500,      // VARCHAR(500) - Increased to prevent data loss
                    'DRIVER_TIN' => 100,       // VARCHAR(100) - Increased to prevent data loss
                    'DRIVER_NAME' => 100,      // VARCHAR(100) - Increased to prevent data loss
                    'CAR_NUMBER' => 100,       // VARCHAR(100) - Increased to prevent data loss
                    'WAYBILL_NUMBER' => 100,   // VARCHAR(100) - Increased to prevent data loss
                    'TRANS_TXT' => 100,        // VARCHAR(100) - Increased to prevent data loss
                    'BAR_CODE' => 100,         // VARCHAR(100) - Increased to prevent data loss
                    'COMPANY_NAME' => 255      // VARCHAR(255) - Kept same size
                ];
                
                foreach ($stringLimits as $field => $limit) {
                    if (isset($goods[$field]) && mb_strlen($goods[$field], 'UTF-8') > $limit) {
                        $original_length = mb_strlen($goods[$field], 'UTF-8');
                        $goods[$field] = mb_substr($goods[$field], 0, $limit, 'UTF-8');
                        error_log("[WARNING] Truncated $field from {$original_length} to $limit characters (UTF-8 safe)");
                    }
                }
                
                // 3. Date field processing (schema stores as NVARCHAR for compatibility but with proper format)
                $dateFields = ['CREATE_DATE', 'ACTIVATE_DATE', 'BEGIN_DATE', 'DELIVERY_DATE', 'CLOSE_DATE', 'CONFIRMED_DT', 'CANCEL_DATE'];
                foreach ($dateFields as $df) {
                    if (!empty($goods[$df])) {
                        $ts = strtotime((string)$goods[$df]);
                        if ($ts !== false) {
                            $goods[$df] = date('Y-m-d H:i:s', $ts);
                        } else {
                            $goods[$df] = null;
                        }
                    }
                }
                
                // 4. Handle VARCHAR(100) fields - UTF-8 safe truncation (updated schema sizes)
                $varchar100Fields = ['TYPE', 'WAYBILL_ID', 'UNIT_ID', 'TRAN_COST_PAYER', 'TRANS_ID', 'IS_CONFIRMED', 'STATUS', 'CONFIRMED_DT', 'CANCEL_DATE', 'UNIT_TXT', 'A_ID', 'VAT_TYPE', 'COMPANY_ID'];
                foreach ($varchar100Fields as $field) {
                    if (isset($goods[$field]) && mb_strlen($goods[$field], 'UTF-8') > 100) {
                        $goods[$field] = mb_substr($goods[$field], 0, 100, 'UTF-8');
                        error_log("[WARNING] Truncated $field to 100 characters (UTF-8 safe)");
                    }
                }
                
                // 5. Handle VARCHAR(500) fields - UTF-8 safe truncation (updated schema sizes)
                $varchar500Fields = [
                    'WAYBILL_COMMENT', 'RECEPTION_INFO', 'RECEIVER_INFO'
                ];
                foreach ($varchar500Fields as $field) {
                    if (isset($goods[$field]) && mb_strlen($goods[$field], 'UTF-8') > 500) {
                        $goods[$field] = mb_substr($goods[$field], 0, 500, 'UTF-8');
                        error_log("[WARNING] Truncated $field to 500 characters (UTF-8 safe)");
                    }
                }
                
                // 6. Basic character cleanup - minimal processing since schema now supports proper encoding
                foreach ($goods as $field => $value) {
                    if (is_string($value) && !empty($value)) {
                        // Only remove null bytes and control characters that are truly problematic
                        $clean_value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', '', $value);
                        $clean_value = trim($clean_value);
                        $goods[$field] = $clean_value;
                    }
                }

                // === EXACT SCHEMA MATCH - NEW check_tables.php FIELDS ONLY ===
                // Table-specific field lists: seller has WAYBILL_ID, buyer uses WAYBILL_NUMBER
                if ($table === 'rs.sellers_waybill_goods') {
                    $allowedGoodsFields = [
                        // === SELLERS GOODS: EXACT check_tables.php SCHEMA MATCH ===
                        'WAYBILL_ID', 'TYPE', 'CREATE_DATE', 'ACTIVATE_DATE', 'CANCEL_DATE',
                        'TIN', 'NAME', 'START_ADDRESS', 'END_ADDRESS', 'TRANSPORT_COAST', 'FULL_AMOUNT',
                        'TRAN_COST_PAYER', 'TRANS_ID', 'TRANS_TXT', 'IS_CONFIRMED', 'STATUS', 'CONFIRMED_DT',
                        'W_NAME', 'UNIT_ID', 'UNIT_TXT', 'QUANTITY', 'PRICE', 'AMOUNT', 'BAR_CODE', 'A_ID', 'VAT_TYPE',
                        'BEGIN_DATE', 'DELIVERY_DATE', 'CLOSE_DATE', 'WAYBILL_NUMBER',
                        'DRIVER_TIN', 'DRIVER_NAME', 'CAR_NUMBER', 'WAYBILL_COMMENT',
                        'RECEPTION_INFO', 'RECEIVER_INFO',
                        // Internal tracking fields
                        'COMPANY_ID', 'COMPANY_TIN', 'COMPANY_NAME', 'UPDATED_AT'
                    ];
                } else { // buyers_waybill_goods
                    $allowedGoodsFields = [
                        // === BUYERS GOODS: EXACT check_tables.php SCHEMA MATCH ===
                        'WAYBILL_NUMBER', 'TYPE', 'CREATE_DATE', 'ACTIVATE_DATE', 
                        'TIN', 'NAME', 'START_ADDRESS', 'END_ADDRESS', 'TRANSPORT_COAST', 'FULL_AMOUNT',
                        'TRAN_COST_PAYER', 'IS_CONFIRMED', 'STATUS', 'CONFIRMED_DT',
                        'W_NAME', 'UNIT_ID', 'UNIT_TXT', 'QUANTITY', 'PRICE', 'AMOUNT', 'BAR_CODE', 'A_ID', 'VAT_TYPE',
                        'TRANS_ID', 'TRANS_TXT', 'WAYBILL_COMMENT', 'BEGIN_DATE', 'DELIVERY_DATE', 'CLOSE_DATE', 'CANCEL_DATE',
                        'DRIVER_TIN', 'DRIVER_NAME', 'CAR_NUMBER', 'RECEIVER_INFO', 'RECEPTION_INFO',
                        // Internal tracking fields
                        'COMPANY_ID', 'COMPANY_TIN', 'COMPANY_NAME', 'UPDATED_AT'
                        // NOTE: NO WAYBILL_ID - buyer goods API doesn't provide this field
                    ];
                }
                
                // Filter goods data to only include schema-defined fields
                $goods = array_intersect_key($goods, array_flip($allowedGoodsFields));
                
                $fields = array_keys($goods);
                
                if (empty($fields)) {
                    error_log("[WARNING] Goods record has no valid fields after filtering - skipping");
                    $skipped++;
                    continue;
                }
                
                // API-SPECIFIC LOGIC: Different approaches for seller vs buyer goods
                $waybill_id = $goods['WAYBILL_ID'] ?? null;      // Only for seller goods (has ID field)
                $waybill_number = $goods['WAYBILL_NUMBER'] ?? null; // Natural identifier for buyer goods
                $a_id = $goods['A_ID'] ?? null;                  // Goods ID from API
                $bar_code = $goods['BAR_CODE'] ?? null;          // Product barcode
                
                // Debug A_ID extraction specifically
                error_log("[DEBUG] Extracted values - A_ID: " . var_export($a_id, true) . ", BAR_CODE: " . var_export($bar_code, true) . ", WAYBILL_NUMBER: " . var_export($waybill_number, true));
                // error_log("[DEBUG] Available goods fields: " . implode(', ', array_keys($goods)));
                
                if ($table === 'rs.sellers_waybill_goods') {
                    // === SELLER GOODS: Use API's ID field (mapped to WAYBILL_ID) ===
                    if (!$waybill_id) {
                        error_log("[WARNING] Seller goods missing WAYBILL_ID (API ID field) - skipping");
                        $skipped++;
                        continue;
                    }
                    
                    // Use standard constraint: (WAYBILL_ID, A_ID, BAR_CODE)
                    $check_sql = "SELECT COUNT(*) FROM $table WHERE WAYBILL_ID = ?";
                    $check_params = [$waybill_id];
                    
                    if ($a_id !== null && $a_id !== '') {
                        $check_sql .= " AND A_ID = ?";
                        $check_params[] = $a_id;
                    } else {
                        $check_sql .= " AND (A_ID IS NULL OR A_ID = '')";
                    }
                    
                    if ($bar_code !== null && $bar_code !== '') {
                        $check_sql .= " AND BAR_CODE = ?";
                        $check_params[] = $bar_code;
                    } else {
                        $check_sql .= " AND (BAR_CODE IS NULL OR BAR_CODE = '')";
                    }
                    
                    // Add COMPANY_ID for logical data separation
                    $check_sql .= " AND COMPANY_ID = ?";
                    $check_params[] = $company_id;
                    
                    try {
                        $check_stmt = $pdo->prepare($check_sql);
                        $check_stmt->execute($check_params);
                        $exists = $check_stmt->fetchColumn() > 0;
                        
                        if ($exists) {
                            // Update existing record
                            $update_set = implode(', ', array_map(fn($f) => "[$f] = :$f", $fields));
                            $update_params = [];
                            foreach ($fields as $f) { $update_params[':' . $f] = $goods[$f]; }
                            
                            // Update using same constraint logic as check
                            $update_sql = "UPDATE $table SET $update_set WHERE WAYBILL_ID = :where_waybill_id";
                            $update_params[':where_waybill_id'] = $waybill_id;
                            
                            if ($a_id !== null && $a_id !== '') {
                                $update_sql .= " AND A_ID = :where_a_id";
                                $update_params[':where_a_id'] = $a_id;
                            } else {
                                $update_sql .= " AND (A_ID IS NULL OR A_ID = '')";
                            }
                            
                            if ($bar_code !== null && $bar_code !== '') {
                                $update_sql .= " AND BAR_CODE = :where_bar_code";
                                $update_params[':where_bar_code'] = $bar_code;
                            } else {
                                $update_sql .= " AND (BAR_CODE IS NULL OR BAR_CODE = '')";
                            }
                            
                            // Add COMPANY_ID for logical data separation
                            $update_sql .= " AND COMPANY_ID = :where_company_id";
                            $update_params[':where_company_id'] = $company_id;
                            
                            $update_stmt = $pdo->prepare($update_sql);
                            $update_stmt->execute($update_params);
                            $updated++;
                            
                            if ($updated <= 5) {
                                // error_log("[DEBUG] Updated goods record: WAYBILL_ID=$waybill_id, A_ID=" . ($a_id ?? 'NULL') . ", BAR_CODE=" . ($bar_code ?? 'NULL'));
                            }
                        } else {
                            // Insert new record  
                            $columns = '[' . implode('], [', $fields) . ']';
                            $placeholders = array_map(fn($f) => ':' . $f, $fields);
                            $params = [];
                            foreach ($fields as $f) { $params[':' . $f] = $goods[$f]; }
                            
                            $sql = "INSERT INTO $table ($columns) VALUES (" . implode(", ", $placeholders) . ")";
                            $stmt = $pdo->prepare($sql);
                            $stmt->execute($params);
                            $inserted++;
                            
                            if ($inserted <= 5) {
                                // error_log("[DEBUG] Inserted new goods record: WAYBILL_ID=$waybill_id, A_ID=" . ($a_id ?? 'NULL') . ", BAR_CODE=" . ($bar_code ?? 'NULL'));
                            }
                        }
                    } catch (PDOException $e) {
                        // Handle constraint violations gracefully - likely due to race conditions
                        if ($e->getCode() === '23000') {
                            // Duplicate key constraint - the record was inserted by another process, try update
                            try {
                                $update_set = implode(', ', array_map(fn($f) => "[$f] = :$f", $fields));
                                $update_params = [];
                                foreach ($fields as $f) { $update_params[':' . $f] = $goods[$f]; }
                                
                                $update_sql = "UPDATE $table SET $update_set WHERE WAYBILL_ID = :where_waybill_id";
                                $update_params[':where_waybill_id'] = $waybill_id;
                                
                                if ($a_id !== null && $a_id !== '') {
                                    $update_sql .= " AND A_ID = :where_a_id";
                                    $update_params[':where_a_id'] = $a_id;
                                } else {
                                    $update_sql .= " AND (A_ID IS NULL OR A_ID = '')";
                                }
                                
                                if ($bar_code !== null && $bar_code !== '') {
                                    $update_sql .= " AND BAR_CODE = :where_bar_code";
                                    $update_params[':where_bar_code'] = $bar_code;
                                } else {
                                    $update_sql .= " AND (BAR_CODE IS NULL OR BAR_CODE = '')";
                                }
                                
                                $update_sql .= " AND COMPANY_ID = :where_company_id";
                                $update_params[':where_company_id'] = $company_id;
                                
                                $update_stmt = $pdo->prepare($update_sql);
                                $update_stmt->execute($update_params);
                                $updated++;
                                
                                error_log("[DEBUG] Constraint violation resolved by update: WAYBILL_ID=$waybill_id");
                            } catch (PDOException $update_e) {
                                $failed++;
                                error_log("[ERROR] Failed to resolve constraint violation: " . $update_e->getMessage());
                            }
                        } else {
                            $failed++;
                            error_log("[ERROR] Database error processing goods: " . $e->getMessage());
                        }
                    }
                    
                } elseif ($table === 'rs.buyers_waybill_goods') {
                    // === BUYER GOODS: Use natural API identifiers (no WAYBILL_ID) ===
                    // API doesn't provide ID field, so use WAYBILL_NUMBER + A_ID + BAR_CODE
                    if (!$waybill_number) {
                        // Set missing WAYBILL_NUMBER to NULL
                        $waybill_number = null;
                        $goods['WAYBILL_NUMBER'] = null;
                        // error_log("[DEBUG] Buyer goods missing WAYBILL_NUMBER - setting to NULL");
                    }
                    
                    // Use natural constraint: (WAYBILL_NUMBER, A_ID, BAR_CODE) - NO WAYBILL_ID
                    if ($waybill_number !== null) {
                        $check_sql = "SELECT COUNT(*) FROM $table WHERE WAYBILL_NUMBER = ?";
                        $check_params = [$waybill_number];
                    } else {
                        $check_sql = "SELECT COUNT(*) FROM $table WHERE WAYBILL_NUMBER IS NULL";
                        $check_params = [];
                    }
                    
                    if ($a_id !== null && $a_id !== '') {
                        $check_sql .= " AND A_ID = ?";
                        $check_params[] = $a_id;
                    } else {
                        $check_sql .= " AND (A_ID IS NULL OR A_ID = '')";
                    }
                    
                    if ($bar_code !== null && $bar_code !== '') {
                        $check_sql .= " AND BAR_CODE = ?";
                        $check_params[] = $bar_code;
                    } else {
                        $check_sql .= " AND (BAR_CODE IS NULL OR BAR_CODE = '')";
                    }
                    
                    // Add COMPANY_ID for logical data separation
                    $check_sql .= " AND COMPANY_ID = ?";
                    $check_params[] = $company_id;
                    
                    try {
                        $check_stmt = $pdo->prepare($check_sql);
                        $check_stmt->execute($check_params);
                        $exists = $check_stmt->fetchColumn() > 0;
                        
                        if ($exists) {
                            // Update existing record using natural identifiers
                            $update_set = implode(', ', array_map(fn($f) => "[$f] = :$f", $fields));
                            $update_params = [];
                            foreach ($fields as $f) { $update_params[':' . $f] = $goods[$f]; }
                            
                            // Build UPDATE WHERE clause to exactly match the SELECT WHERE clause for update-proof operation
                            if ($waybill_number !== null) {
                                $update_sql = "UPDATE $table SET $update_set WHERE WAYBILL_NUMBER = :where_waybill_number";
                                $update_params[':where_waybill_number'] = $waybill_number;
                            } else {
                                $update_sql = "UPDATE $table SET $update_set WHERE WAYBILL_NUMBER IS NULL";
                            }
                            
                            if ($a_id !== null && $a_id !== '') {
                                $update_sql .= " AND A_ID = :where_a_id";
                                $update_params[':where_a_id'] = $a_id;
                            } else {
                                $update_sql .= " AND (A_ID IS NULL OR A_ID = '')";
                            }
                            
                            if ($bar_code !== null && $bar_code !== '') {
                                $update_sql .= " AND BAR_CODE = :where_bar_code";
                                $update_params[':where_bar_code'] = $bar_code;
                            } else {
                                $update_sql .= " AND (BAR_CODE IS NULL OR BAR_CODE = '')";
                            }
                            
                            // Always include COMPANY_ID for logical data separation (matches SELECT query)
                            $update_sql .= " AND COMPANY_ID = :where_company_id";
                            $update_params[':where_company_id'] = $company_id;
                            
                            $update_stmt = $pdo->prepare($update_sql);
                            $update_stmt->execute($update_params);
                            $updated++;
                            
                            if ($updated <= 5) {
                                // error_log("[DEBUG] Updated buyer goods: WAYBILL_NUMBER=" . ($waybill_number ?? 'NULL') . ", A_ID=" . ($a_id ?? 'NULL') . ", BAR_CODE=" . ($bar_code ?? 'NULL'));
                            }
                        } else {
                            // Insert new record using natural identifiers
                            $columns = '[' . implode('], [', $fields) . ']';
                            $placeholders = array_map(fn($f) => ':' . $f, $fields);
                            $params = [];
                            foreach ($fields as $f) { $params[':' . $f] = $goods[$f]; }
                            
                            $sql = "INSERT INTO $table ($columns) VALUES (" . implode(", ", $placeholders) . ")";
                            $stmt = $pdo->prepare($sql);
                            $stmt->execute($params);
                            $inserted++;
                            
                            if ($inserted <= 5) {
                                // error_log("[DEBUG] Inserted buyer goods: WAYBILL_NUMBER=" . ($waybill_number ?? 'NULL') . ", A_ID=" . ($a_id ?? 'NULL') . ", BAR_CODE=" . ($bar_code ?? 'NULL'));
                            }
                        }
                    } catch (PDOException $e) {
                        // Handle constraint violations gracefully for buyer goods
                        if ($e->getCode() === '23000') {
                            // Try update if insert failed due to constraint
                            try {
                                $update_set = implode(', ', array_map(fn($f) => "[$f] = :$f", $fields));
                                $update_params = [];
                                foreach ($fields as $f) { $update_params[':' . $f] = $goods[$f]; }
                                
                                // Build UPDATE WHERE clause to exactly match the constraint check for update-proof operation
                                if ($waybill_number !== null) {
                                    $update_sql = "UPDATE $table SET $update_set WHERE WAYBILL_NUMBER = :where_waybill_number";
                                    $update_params[':where_waybill_number'] = $waybill_number;
                                } else {
                                    $update_sql = "UPDATE $table SET $update_set WHERE WAYBILL_NUMBER IS NULL";
                                }
                                
                                if ($a_id !== null && $a_id !== '') {
                                    $update_sql .= " AND A_ID = :where_a_id";
                                    $update_params[':where_a_id'] = $a_id;
                                } else {
                                    $update_sql .= " AND (A_ID IS NULL OR A_ID = '')";
                                }
                                
                                if ($bar_code !== null && $bar_code !== '') {
                                    $update_sql .= " AND BAR_CODE = :where_bar_code";
                                    $update_params[':where_bar_code'] = $bar_code;
                                } else {
                                    $update_sql .= " AND (BAR_CODE IS NULL OR BAR_CODE = '')";
                                }
                                
                                $update_sql .= " AND COMPANY_ID = :where_company_id";
                                $update_params[':where_company_id'] = $company_id;
                                
                                $update_stmt = $pdo->prepare($update_sql);
                                $update_stmt->execute($update_params);
                                $updated++;
                                
                                // error_log("[DEBUG] Buyer goods constraint resolved by update: WAYBILL_NUMBER=" . ($waybill_number ?? 'NULL'));
                            } catch (PDOException $update_e) {
                                $failed++;
                                error_log("[ERROR] Failed to resolve buyer goods constraint violation: " . $update_e->getMessage());
                            }
                        } else {
                            $failed++;
                            error_log("[ERROR] Database error processing buyer goods: " . $e->getMessage());
                        }
                    }
                    
                } else {
                    // IMPROVED: No WAYBILL_ID - try alternative approach instead of skipping
                    // Check if we can use any other unique identifier for processing
                    $waybill_number = isset($goods['WAYBILL_NUMBER']) ? $goods['WAYBILL_NUMBER'] : null;
                    $bar_code = isset($goods['BAR_CODE']) ? $goods['BAR_CODE'] : null;
                    
                    if ($waybill_number) {
                        // Use WAYBILL_NUMBER as WAYBILL_ID for this record
                        $goods['WAYBILL_ID'] = $waybill_number;
                        $waybill_id = $waybill_number;
                        error_log("[DEBUG] Using WAYBILL_NUMBER as WAYBILL_ID for processing: {$waybill_number}");
                        
                        // Now process this record with the reconstructed WAYBILL_ID using same logic as above
                        try {
                            // Check if record exists using EXACT schema constraint: (WAYBILL_ID, A_ID, BAR_CODE)
                            $check_sql = "SELECT COUNT(*) FROM $table WHERE WAYBILL_ID = ?";
                            $check_params = [$waybill_id];
                            
                            if ($a_id !== null && $a_id !== '') {
                                $check_sql .= " AND A_ID = ?";
                                $check_params[] = $a_id;
                            } else {
                                $check_sql .= " AND (A_ID IS NULL OR A_ID = '')";
                            }
                            
                            if ($bar_code !== null && $bar_code !== '') {
                                $check_sql .= " AND BAR_CODE = ?";
                                $check_params[] = $bar_code;
                            } else {
                                $check_sql .= " AND (BAR_CODE IS NULL OR BAR_CODE = '')";
                            }
                            
                            $check_sql .= " AND COMPANY_ID = ?";
                            $check_params[] = $company_id;
                            
                            $check_stmt = $pdo->prepare($check_sql);
                            $check_stmt->execute($check_params);
                            $exists = $check_stmt->fetchColumn() > 0;
                            
                            if ($exists) {
                                // Update existing record
                                $update_set = implode(', ', array_map(fn($f) => "[$f] = :$f", $fields));
                                $update_params = [];
                                foreach ($fields as $f) { $update_params[':' . $f] = $goods[$f]; }
                                
                                $update_sql = "UPDATE $table SET $update_set WHERE WAYBILL_ID = :where_waybill_id";
                                $update_params[':where_waybill_id'] = $waybill_id;
                                
                                if ($a_id !== null && $a_id !== '') {
                                    $update_sql .= " AND A_ID = :where_a_id";
                                    $update_params[':where_a_id'] = $a_id;
                                } else {
                                    $update_sql .= " AND (A_ID IS NULL OR A_ID = '')";
                                }
                                
                                if ($bar_code !== null && $bar_code !== '') {
                                    $update_sql .= " AND BAR_CODE = :where_bar_code";
                                    $update_params[':where_bar_code'] = $bar_code;
                                } else {
                                    $update_sql .= " AND (BAR_CODE IS NULL OR BAR_CODE = '')";
                                }
                                
                                $update_sql .= " AND COMPANY_ID = :where_company_id";
                                $update_params[':where_company_id'] = $company_id;
                                
                                $update_stmt = $pdo->prepare($update_sql);
                                $update_stmt->execute($update_params);
                                $updated++;
                                // error_log("[DEBUG] Updated goods record using WAYBILL_NUMBER fallback: {$waybill_number}");
                            } else {
                                // Insert new record
                                $columns = '[' . implode('], [', $fields) . ']';
                                $placeholders = array_map(fn($f) => ':' . $f, $fields);
                                $params = [];
                                foreach ($fields as $f) { $params[':' . $f] = $goods[$f]; }
                                
                                $sql = "INSERT INTO $table ($columns) VALUES (" . implode(", ", $placeholders) . ")";
                                $stmt = $pdo->prepare($sql);
                                $stmt->execute($params);
                                $inserted++;
                                // error_log("[DEBUG] Inserted goods record using WAYBILL_NUMBER fallback: {$waybill_number}");
                            }
                        } catch (PDOException $fallback_e) {
                            // Handle constraint violations gracefully for fallback too
                            if ($fallback_e->getCode() === '23000') {
                                // Try update if insert failed due to constraint
                                try {
                                    $update_set = implode(', ', array_map(fn($f) => "[$f] = :$f", $fields));
                                    $update_params = [];
                                    foreach ($fields as $f) { $update_params[':' . $f] = $goods[$f]; }
                                    
                                    $update_sql = "UPDATE $table SET $update_set WHERE WAYBILL_ID = :where_waybill_id AND COMPANY_ID = :where_company_id";
                                    $update_params[':where_waybill_id'] = $waybill_id;
                                    $update_params[':where_company_id'] = $company_id;
                                    
                                    $update_stmt = $pdo->prepare($update_sql);
                                    $update_stmt->execute($update_params);
                                    $updated++;
                                    error_log("[DEBUG] Constraint resolved by update for fallback: {$waybill_number}");
                                } catch (PDOException $update_e) {
                                    error_log("[ERROR] Failed to resolve constraint violation for fallback: " . $update_e->getMessage());
                                    $failed++;
                                }
                            } else {
                                error_log("[ERROR] Failed to process goods with WAYBILL_NUMBER fallback: " . $fallback_e->getMessage());
                                $failed++;
                            }
                        }
                    } else {
                        // Last resort: Log and skip if we really can't process this record
                        error_log("[WARNING] Goods record missing WAYBILL_ID and WAYBILL_NUMBER - cannot process. A_ID: " . ($a_id ?? 'NULL') . ", BAR_CODE: " . ($bar_code ?? 'NULL'));
                        $skipped++;
                    }
                }
                
            } catch (Exception $e) {
                $failed++;
                error_log("[ERROR] General error processing goods: " . $e->getMessage());
                continue;
            }
        }
        
        // Memory management
        if (($chunk_index + 1) % 5 === 0) {
            error_log("[DEBUG] Progress: " . ($chunk_index + 1) . "/" . count($chunks) . " batches completed");
            gc_collect_cycles();
        }
    }
    
    error_log("[DEBUG] ===== $sync_type INSERTION SUMMARY =====");
    error_log("[DEBUG] Company: $company, Type: $sync_type");
    // error_log("[DEBUG] Total processed: " . count($goods_data));
    error_log("[DEBUG] Successfully inserted: $inserted");
    error_log("[DEBUG] Successfully updated: $updated");
    error_log("[DEBUG] Skipped: $skipped");
    error_log("[DEBUG] Failed operations: $failed");
    error_log("[DEBUG] Table: $table");
    
    return [
        'company' => $company,
        'type' => $sync_type,
        'inserted' => $inserted,
        'updated' => $updated,
        'skipped' => $skipped,
        'total' => count($goods_data),
        'error' => !!$error_message,
        'message' => $error_message ?: "Processed " . count($goods_data) . " goods records: $inserted new, $updated updated, $skipped skipped, $failed failed.",
    ];
}

/**
 * NEW (Optimized): Get details for multiple invoices in parallel from RS service.
 */
function getMultipleInvoiceDetailsFromRS($pdo, $invoice_ids, $company_name, $concurrency = 15) {
    if (empty($invoice_ids) || empty($company_name)) {
        return [];
    }

    $results = [];
    $credentials = null;

    try {
        $stmt = $pdo->prepare("SELECT s_user, s_password, user_id FROM rs_users WHERE company_name = ?");
        $stmt->execute([$company_name]);
        $credentials = $stmt->fetch(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        error_log("[ERROR] getMultipleInvoiceDetailsFromRS: DB error: " . $e->getMessage());
        return [];
    }
    
    if (!$credentials) {
        error_log("[ERROR] getMultipleInvoiceDetailsFromRS: Credentials not found for company: $company_name");
        return [];
    }

    $url = "https://www.revenue.mof.ge/ntosservice/ntosservice.asmx";
    $mh = curl_multi_init();
    $handles = [];

    $id_chunks = array_chunk($invoice_ids, $concurrency);
    error_log("[DEBUG] Starting parallel fetch for " . count($invoice_ids) . " invoices in " . count($id_chunks) . " chunks of $concurrency.");

    foreach ($id_chunks as $chunk_index => $chunk) {
        foreach ($chunk as $invoice_id) {
            $soap_request = '<?xml version="1.0" encoding="utf-8"?>
            <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
              <soap:Body>
                <get_invoice xmlns="http://tempuri.org/">
                  <user_id>' . htmlspecialchars($credentials['user_id'], ENT_XML1) . '</user_id>
                  <invois_id>' . htmlspecialchars($invoice_id, ENT_XML1) . '</invois_id>
                  <su>' . htmlspecialchars($credentials['s_user'], ENT_XML1) . '</su>
                  <sp>' . htmlspecialchars($credentials['s_password'], ENT_XML1) . '</sp>
                </get_invoice>
              </soap:Body>
            </soap:Envelope>';

            $headers = [
                "Content-type: text/xml;charset=utf-8",
                "SOAPAction: \"http://tempuri.org/get_invoice\"",
                "Content-length: " . strlen($soap_request),
            ];

            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => $soap_request,
                CURLOPT_HTTPHEADER => $headers,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_SSL_VERIFYPEER => true,
                CURLOPT_SSL_VERIFYHOST => 2,
                CURLOPT_TIMEOUT => 90,
                CURLOPT_CONNECTTIMEOUT => 30,
                CURLOPT_NOSIGNAL => 1,
            ]);
            
            curl_multi_add_handle($mh, $ch);
            $handles[(int)$ch] = $invoice_id;
        }

        $running = null;
        do {
            curl_multi_exec($mh, $running);
            curl_multi_select($mh);
        } while ($running > 0);

        // Process completed handles for the current chunk
        while ($info = curl_multi_info_read($mh)) {
            $ch = $info['handle'];
            $handle_id = (int)$ch;

            if (isset($handles[$handle_id])) {
                $invoice_id = $handles[$handle_id];

                if ($info['result'] == CURLE_OK) {
                    $response = curl_multi_getcontent($ch);
                    $clean_xml = str_ireplace(['soap:', 'diffgr:', 'msdata:'], '', $response);
                    $sxe = simplexml_load_string($clean_xml);
                    if ($sxe !== false && isset($sxe->Body->get_invoiceResponse)) {
                        $invoiceNode = $sxe->Body->get_invoiceResponse;
                        $results[$invoice_id] = [
                            'OVERHEAD_NO' => (string)$invoiceNode->overhead_no ?? null,
                            'OVERHEAD_DT' => (string)$invoiceNode->overhead_dt ?? null,
                            'R_UN_ID' => (string)$invoiceNode->r_un_id ?? null,
                            'DEC_STATUS' => (string)$invoiceNode->dec_status ?? null,
                            'WAYBILL_IDS' => (string)$invoiceNode->waybill_ids ?? (string)$invoiceNode->waybill_id ?? null,
                        ];
                    } else {
                        error_log("[WARNING] Parallel fetch for invoice $invoice_id: API response was successful but contained no data or had an unexpected structure. Raw response: " . substr($response, 0, 500));
                        $results[$invoice_id] = null; // Explicitly mark as failed/empty
                    }
                } else {
                    error_log("[ERROR] Parallel fetch cURL error for invoice $invoice_id: " . curl_error($ch));
                    $results[$invoice_id] = null; // Explicitly mark as failed
                }

                curl_multi_remove_handle($mh, $ch);
                curl_close($ch);
            }
        }
        $handles = []; // Clear handles for the next chunk
        error_log("[DEBUG] Finished parallel fetch chunk " . ($chunk_index + 1) . "/" . count($id_chunks));
    }

    curl_multi_close($mh);
    return $results;
}

/**
 * NEW (Optimized): Get declaration dates for multiple declaration numbers in parallel.
 */
function getMultipleDeclarationDatesFromRS($pdo, $decl_nums, $company_name, $concurrency = 15) {
    if (empty($decl_nums) || empty($company_name)) {
        return [];
    }

    $results = [];
    $credentials = null;

    try {
        $stmt = $pdo->prepare("SELECT s_user, s_password, un_id FROM rs_users WHERE company_name = ?");
        $stmt->execute([$company_name]);
        $credentials = $stmt->fetch(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        error_log("[ERROR] getMultipleDeclarationDatesFromRS: DB error: " . $e->getMessage());
        return [];
    }
    
    if (!$credentials) {
        error_log("[ERROR] getMultipleDeclarationDatesFromRS: Credentials not found for company: $company_name");
        return [];
    }
    
    if (empty($credentials['un_id'])) {
        error_log("[ERROR] getMultipleDeclarationDatesFromRS: UN_ID is missing for company: $company_name");
        return [];
    }

    $url = "https://www.revenue.mof.ge/ntosservice/ntosservice.asmx";
    $mh = curl_multi_init();
    $handles = [];

    $num_chunks = array_chunk($decl_nums, $concurrency);
    error_log("[DEBUG] Starting parallel fetch for " . count($decl_nums) . " declaration dates in " . count($num_chunks) . " chunks of $concurrency.");

    foreach ($num_chunks as $chunk_index => $chunk) {
        foreach ($chunk as $decl_num) {
            $soap_request = '<?xml version="1.0" encoding="utf-8"?>
            <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
              <soap:Body>
                <get_decl_date xmlns="http://tempuri.org/">
                  <su>' . htmlspecialchars($credentials['s_user'], ENT_XML1) . '</su>
                  <sp>' . htmlspecialchars($credentials['s_password'], ENT_XML1) . '</sp>
                  <decl_num>' . htmlspecialchars($decl_num, ENT_XML1) . '</decl_num>
                  <un_id>' . htmlspecialchars($credentials['un_id'], ENT_XML1) . '</un_id>
                </get_decl_date>
              </soap:Body>
            </soap:Envelope>';

            $headers = [
                "Content-type: text/xml;charset=utf-8",
                "SOAPAction: \"http://tempuri.org/get_decl_date\"",
                "Content-length: " . strlen($soap_request),
            ];

            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => $soap_request,
                CURLOPT_HTTPHEADER => $headers,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_SSL_VERIFYPEER => true,
                CURLOPT_SSL_VERIFYHOST => 2,
                CURLOPT_TIMEOUT => 90,
                CURLOPT_CONNECTTIMEOUT => 30,
                CURLOPT_NOSIGNAL => 1,
            ]);
            
            curl_multi_add_handle($mh, $ch);
            $handles[(int)$ch] = $decl_num;
        }

        $running = null;
        do {
            curl_multi_exec($mh, $running);
            curl_multi_select($mh);
        } while ($running > 0);

        while ($info = curl_multi_info_read($mh)) {
            $ch = $info['handle'];
            $handle_id = (int)$ch;

            if (isset($handles[$handle_id])) {
                $decl_num = $handles[$handle_id];

                if ($info['result'] == CURLE_OK) {
                    $response = curl_multi_getcontent($ch);
                    $clean_xml = str_ireplace(['soap:', 'diffgr:', 'msdata:'], '', $response);
                    $sxe = simplexml_load_string($clean_xml);
                    if ($sxe !== false && isset($sxe->Body->get_decl_dateResponse->get_decl_dateResult)) {
                        $date_result = (string)$sxe->Body->get_decl_dateResponse->get_decl_dateResult;
                        if (!empty($date_result)) {
                            // Handle YYYYMM format (e.g., "202506" = 2025-06)
                            if (preg_match('/^(\d{4})(\d{2})$/', $date_result, $matches)) {
                                $year = $matches[1];
                                $month = $matches[2];
                                // Convert to YYYY-MM format (year-month only)
                                $formatted_date = $year . '-' . $month;
                                $results[$decl_num] = $formatted_date;
                                error_log("[DEBUG] Fetched declaration date for decl_num $decl_num: $date_result -> $formatted_date");
                            } elseif (strtotime($date_result) !== false) {
                                // Handle standard date format as fallback
                                $results[$decl_num] = $date_result;
                                error_log("[DEBUG] Fetched declaration date for decl_num $decl_num: $date_result (standard format)");
                            } else {
                                error_log("[WARNING] Parallel fetch for decl_num $decl_num: API returned unrecognized format: '$date_result'");
                                $results[$decl_num] = null;
                            }
                        } else {
                            error_log("[WARNING] Parallel fetch for decl_num $decl_num: API returned empty date result");
                            $results[$decl_num] = null;
                        }
                    } else {
                        error_log("[WARNING] Parallel fetch for decl_num $decl_num: API response was successful but contained no data or had an unexpected structure.");
                        $results[$decl_num] = null;
                    }
                } else {
                    error_log("[ERROR] Parallel fetch cURL error for decl_num $decl_num: " . curl_error($ch));
                    $results[$decl_num] = null;
                }

                curl_multi_remove_handle($mh, $ch);
                curl_close($ch);
            }
        }
        $handles = []; // Clear handles for the next chunk
        error_log("[DEBUG] Finished parallel fetch chunk " . ($chunk_index + 1) . "/" . count($num_chunks) . " for declaration dates.");
    }

    curl_multi_close($mh);
    return $results;
}

// Helper function to sync invoices (from sync_invoices.php)
function sync_invoices_for_company($pdo, $company, $company_id, $company_tin, $startDate, $endDate, $type) {
    $sync_type = $type === 'buyer' ? 'buyer_invoices' : 'seller_invoices';
    error_log("[DEBUG] ===== STARTING $sync_type SYNC =====");
    error_log("[DEBUG] Company: $company");
    error_log("[DEBUG] Type: $sync_type");
    error_log("[DEBUG] Company ID: $company_id");
    error_log("[DEBUG] Company TIN: $company_tin");
    error_log("[DEBUG] Date Range: $startDate to $endDate");
    
    $table = $type === 'buyer' ? 'rs.buyer_invoices' : 'rs.seller_invoices';
    error_log("[DEBUG] Target table: $table");

    // Fetch credentials
    error_log("[DEBUG] Fetching credentials for company: $company");
    try {
        $stmt = $pdo->prepare("SELECT s_user, s_password, user_id, un_id FROM rs_users WHERE company_name = ?");
        $stmt->execute([$company]);
        $credentials = $stmt->fetch(PDO::FETCH_ASSOC);
        error_log("[DEBUG] Credentials query executed successfully");
        
        if (!$credentials) {
            error_log("[ERROR] Credentials not found for company: $company");
            return [
                'company' => $company, 
                'type' => $type, 
                'error' => true, 
                'message' => 'Credentials not found for the selected company.',
                'inserted' => 0,
                'total' => 0
            ];
        }
        
        error_log("[DEBUG] Credentials found - User: " . $credentials['s_user'] . ", User ID: " . $credentials['user_id'] . ", UN ID: " . $credentials['un_id']);
    } catch (PDOException $e) {
        error_log("[ERROR] Failed to fetch credentials for $company: " . $e->getMessage());
        error_log("[ERROR] SQL State: " . $e->getCode());
        return [
            'company' => $company, 
            'type' => $type, 
            'error' => true, 
            'message' => 'Database error while fetching credentials: ' . $e->getMessage(),
            'inserted' => 0,
            'total' => 0
        ];
    }
    
    error_log("[DEBUG] Credentials found for company: $company");
    error_log("[DEBUG] User: " . $credentials['s_user']);
    error_log("[DEBUG] User ID: " . $credentials['user_id']);
    error_log("[DEBUG] UN ID: " . $credentials['un_id']);
    
    $user = $credentials['s_user'];
    $password = $credentials['s_password'];
    $user_id = $credentials['user_id'];
    $un_id = $credentials['un_id'];
    $url = "https://www.revenue.mof.ge/ntosservice/ntosservice.asmx";
    
    $dateFormat = 'Y-m-d\\TH:i:s';
    $s_dt_hardcoded = (new DateTime('2009-01-01'))->format($dateFormat);
    $e_dt_hardcoded = (new DateTime('today 23:59:59'))->format($dateFormat);
    $op_s_dt_chunk = (new DateTime($startDate))->format($dateFormat);
    $op_e_dt_chunk = (new DateTime($endDate . ' 23:59:59'))->format($dateFormat);

    if ($type === 'buyer') {
        $soapFunction = 'get_buyer_invoices';
        $responseNode = 'get_buyer_invoicesResponse';
        $resultNode = 'get_buyer_invoicesResult';
    } else {
        $soapFunction = 'get_seller_invoices';
        $responseNode = 'get_seller_invoicesResponse';
        $resultNode = 'get_seller_invoicesResult';
    }

    $xml_request = '<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
    <' . $soapFunction . ' xmlns="http://tempuri.org/">
    <user_id>' . htmlspecialchars($user_id, ENT_XML1) . '</user_id>
    <un_id>' . htmlspecialchars($un_id, ENT_XML1) . '</un_id>
    <s_dt>' . $s_dt_hardcoded . '</s_dt>
    <e_dt>' . $e_dt_hardcoded . '</e_dt>
    <op_s_dt>' . $op_s_dt_chunk . '</op_s_dt>
    <op_e_dt>' . $op_e_dt_chunk . '</op_e_dt>
    <su>' . htmlspecialchars($user, ENT_XML1) . '</su>
    <sp>' . htmlspecialchars($password, ENT_XML1) . '</sp>
    </' . $soapFunction . '>
 </soap:Body>
</soap:Envelope>';

    $headers = [
        "Content-type: text/xml;charset=utf-8",
        "SOAPAction: \"http://tempuri.org/$soapFunction\"",
        "Content-length: " . strlen($xml_request),
    ];
    
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $xml_request,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
    ]);
    
    error_log("[DEBUG] Sending API request...");
    $response = curl_exec($ch);
    $curl_error = curl_error($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    $invoices_data = [];
    $error_message = '';
    
    if ($curl_error) {
        error_log("[ERROR] cURL failed: $curl_error");
        $error_message = "cURL Error: " . $curl_error;
    } else {
        error_log("[DEBUG] ===== XML PARSING STARTED =====");
        
        $clean_xml = $response;
        $clean_xml = str_replace("\xEF\xBB\xBF", '', $clean_xml);
        if (!mb_check_encoding($clean_xml, 'UTF-8')) {
            // For Georgian text, try multiple encoding sources before falling back to ISO-8859-1
            $detected_encoding = mb_detect_encoding($clean_xml, ['UTF-8', 'Windows-1252', 'ISO-8859-1'], true);
            if ($detected_encoding && $detected_encoding !== 'UTF-8') {
                $clean_xml = mb_convert_encoding($clean_xml, 'UTF-8', $detected_encoding);
                error_log("[DEBUG] Converted invoice response encoding from $detected_encoding to UTF-8");
            } else {
                error_log("[WARNING] Could not detect invoice response encoding, keeping original");
            }
        }
        $clean_xml = str_replace("\x00", '', $clean_xml);
        $clean_xml = preg_replace('/xmlns=""/', '', $clean_xml);
        $clean_xml = str_replace('>null<', '><', $clean_xml);
        $clean_xml = str_ireplace(['soap:', 'diffgr:', 'msdata:'], '', $clean_xml);
        
        error_log("[DEBUG] Cleaned XML length: " . strlen($clean_xml));
        error_log("[DEBUG] Cleaned XML preview: " . substr($clean_xml, 0, 500) . "...");
        
        libxml_use_internal_errors(true);
        $sxe = simplexml_load_string($clean_xml);
        
        if ($sxe === false) {
            $error_message = "Failed to parse XML response.";
            $libxml_errors = libxml_get_errors();
            error_log("[ERROR] XML parsing failed. LibXML errors:");
            foreach ($libxml_errors as $error) {
                error_log("[ERROR] LibXML: " . trim($error->message) . " (Line: {$error->line}, Column: {$error->column})");
            }
            libxml_clear_errors();
            
            error_log("[ERROR] Raw response (first 1000 chars): " . substr($response, 0, 1000));
            error_log("[ERROR] Raw response (last 500 chars): " . substr($response, -500));
            
            if (strpos($response, 'xmlns=""') !== false) {
                error_log("[ERROR] Found empty xmlns attribute which can cause parsing issues");
            }
            if (strpos($response, 'null') !== false) {
                error_log("[ERROR] Found 'null' string in response which might be causing issues");
            }
        } else {
            error_log("[DEBUG] XML parsed successfully after cleaning prefixes");
            
            $invoiceNodes = null;
            if (isset($sxe->Body->{$responseNode}->{$resultNode}->diffgram->DocumentElement->invoices)) {
                $invoiceNodes = $sxe->Body->{$responseNode}->{$resultNode}->diffgram->DocumentElement->invoices;
            }
            
            error_log("[DEBUG] Found " . ($invoiceNodes ? count($invoiceNodes) : '0') . " invoice nodes via direct access.");
            
            if ($invoiceNodes && count($invoiceNodes) > 0) {
                foreach ($invoiceNodes as $invoice) {
                    $invArray = (array)$invoice;
                    $row = [];
                    
                    $field_map = [
                        'ID' => 'INVOICE_ID', 'F_SERIES' => 'F_SERIES', 'F_NUMBER' => 'F_NUMBER',
                        'OPERATION_DT' => 'OPERATION_DT', 'REG_DT' => 'REG_DT', 'SELLER_UN_ID' => 'SELLER_UN_ID',
                        'BUYER_UN_ID' => 'BUYER_UN_ID', 'STATUS' => 'STATUS', 'SEQ_NUM_S' => 'SEQ_NUM_S',
                        'SEQ_NUM_B' => 'SEQ_NUM_B', 'S_USER_ID' => 'S_USER_ID', 'B_S_USER_ID' => 'B_S_USER_ID',
                        'K_ID' => 'K_ID', 'K_TYPE' => 'K_TYPE', 'WAS_REF' => 'WAS_REF', 'SA_IDENT_NO' => 'SA_IDENT_NO',
                        'ORG_NAME' => 'ORG_NAME', 'NOTES' => 'NOTES', 'TANXA' => 'TANXA', 'VAT' => 'VAT',
                        'AGREE_DATE' => 'AGREE_DATE', 'AGREE_S_USER_ID' => 'AGREE_S_USER_ID',
                        'REF_DATE' => 'REF_DATE', 'REF_S_USER_ID' => 'REF_S_USER_ID',
                        'DOC_MOS_NOM_S' => 'DOC_MOS_NOM_S', 'DOC_MOS_NOM_B' => 'DOC_MOS_NOM_B',
                        'OVERHEAD_NO' => 'OVERHEAD_NO', 'OVERHEAD_DT' => 'OVERHEAD_DT', 'R_UN_ID' => 'R_UN_ID', 'DEC_STATUS' => 'DEC_STATUS'
                    ];
                    
                    if (count($invoices_data) === 0) {
                        error_log("[DEBUG] API Response fields for first invoice: " . print_r(array_keys($invArray), true));
                        error_log("[DEBUG] API Response values for first invoice: " . print_r($invArray, true));
                    }
                    
                    foreach ($invArray as $apiField => $fieldValue) {
                        $apiField = strtoupper($apiField);
                        if (isset($field_map[$apiField])) {
                            $dbField = $field_map[$apiField];
                            if ($fieldValue === null || (is_string($fieldValue) && trim($fieldValue) === '')) continue;
                            
                            $value = (string)$fieldValue;
                            
                            $date_fields = ['operation_dt', 'reg_dt', 'agree_date', 'ref_date'];
                            if (in_array($dbField, $date_fields) && !empty($value)) {
                                try {
                                    $date = new DateTime($value);
                                    $row[$dbField] = $date->format('Y-m-d H:i:s');
                                } catch (Exception $e) {
                                    $row[$dbField] = null;
                                }
                            } elseif (is_numeric($value)) {
                                $row[$dbField] = $value;
                            } else {
                                $row[$dbField] = $value;
                            }
                        }
                    }
                    
                    if ($type === 'seller' && !isset($row['SELLER_UN_ID'])) {
                        $row['SELLER_UN_ID'] = $un_id;
                    }
                    if ($type === 'buyer' && !isset($row['BUYER_UN_ID'])) {
                        $row['BUYER_UN_ID'] = $un_id;
                    }
                    
                    $row['COMPANY_NAME'] = $company;
                    $row['COMPANY_TIN'] = $company_tin;
                    $row['COMPANY_ID'] = $company_id;
                    $row['UPDATED_AT'] = date('Y-m-d H:i:s');
                    
                    $invoices_data[] = $row;
                }
            }
        }
    }
    
    error_log("[DEBUG] ===== $sync_type PARSING SUMMARY =====");
    error_log("[DEBUG] Company: $company, Type: $sync_type");
    error_log("[DEBUG] Total parsed invoices: " . count($invoices_data));
    
    if (!empty($invoices_data)) {
        error_log("[DEBUG] First invoice sample: " . print_r($invoices_data[0], true));
        error_log("[DEBUG] ===== STARTING DATABASE INSERTION =====");
    } else {
        error_log("[WARNING] No invoices to insert for $company ($sync_type)");
    }
    
    $inserted = 0;
    $updated = 0;
    $skipped = 0;
    $failed = 0;
    
    $total_records = count($invoices_data);
    error_log("[DEBUG] Processing $total_records invoices with individual inserts");
    
    $chunk_size = 100;
    $chunks = array_chunk($invoices_data, $chunk_size);
    
    foreach ($chunks as $chunk_index => $chunk) {
        error_log("[DEBUG] Processing chunk " . ($chunk_index + 1) . "/" . count($chunks) . " (" . count($chunk) . " records)");
        
        // OPTIMIZED: Prepare a map of normalized invoices and a list of IDs for parallel fetching
        $normalized_invoices_map = [];
        $invoice_ids_to_fetch = [];
        $decl_nums_to_fetch = []; // NEW: Collect declaration numbers for batch fetching
        foreach($chunk as $inv) {
            $invoice_id = $inv['ID'] ?? ($inv['INVOICE_ID'] ?? null);
            if ($invoice_id) {
                $normalized_invoices_map[$invoice_id] = $inv;
                $invoice_ids_to_fetch[] = $invoice_id;

                $decl_num = $inv['SEQ_NUM_S'] ?? $inv['SEQ_NUM_B'] ?? null;
                if ($decl_num) {
                    $decl_nums_to_fetch[] = $decl_num;
                }
            } else {
                $skipped++;
            }
        }
        
        // OPTIMIZED: Fetch all details for the current chunk in parallel
        $all_detailed_data = getMultipleInvoiceDetailsFromRS($pdo, array_unique($invoice_ids_to_fetch), $company);
        
        // NEW OPTIMIZATION: Fetch all declaration dates for the current chunk in parallel
        $all_decl_dates = getMultipleDeclarationDatesFromRS($pdo, array_unique($decl_nums_to_fetch), $company);

        foreach ($normalized_invoices_map as $invoice_id => $inv) {
            try {
                // The map and loop here are redundant because $inv already has the correct DB column keys
                // from the initial parsing. We can use $inv directly as $invNorm.
                $invNorm = $inv;

                // CORRECTED LOGIC: Look up the specific decl_date from the pre-fetched batch
                $decl_num = $invNorm['SEQ_NUM_S'] ?? $invNorm['SEQ_NUM_B'] ?? null;
                if ($decl_num && isset($all_decl_dates[$decl_num])) {
                    $invNorm['DECL_DATE'] = $all_decl_dates[$decl_num];
                }

                $invNorm['COMPANY_NAME'] = $company;
                $invNorm['COMPANY_TIN'] = $company_tin;
                $invNorm['COMPANY_ID'] = $company_id;
                $invNorm['UPDATED_AT'] = date('Y-m-d H:i:s');

                if (empty($invNorm['INVOICE_ID'])) {
                    if (!empty($inv['INVOICE_ID'])) {
                        $invNorm['INVOICE_ID'] = (string)$inv['INVOICE_ID'];
                    } elseif (!empty($inv['ID'])) {
                        $invNorm['INVOICE_ID'] = (string)$inv['ID'];
                    } else {
                        error_log('[WARNING] Missing invoice ID; skipping invoice: ' . print_r($inv, true));
                        $skipped++;
                        continue;
                    }
                }

                // OPTIMIZED: Get pre-fetched detailed data
                $detailed_data = $all_detailed_data[$invNorm['INVOICE_ID']] ?? null;
                
                // NEW: Fallback mechanism if parallel fetch returned no data
                if (empty($detailed_data)) {
                    error_log("[INFO] Parallel fetch for invoice {$invNorm['INVOICE_ID']} was empty. Attempting fallback with 'get_ntos_invoices_inv_nos'.");
                    $fallback_data = getInvoiceOverheadDetailsFromRS($pdo, $invNorm['INVOICE_ID'], $company);
                    if ($fallback_data) {
                        error_log("[SUCCESS] Fallback successful for invoice {$invNorm['INVOICE_ID']}. Merging overhead data.");
                        $detailed_data = $fallback_data; // Use fallback data
                    } else {
                        error_log("[WARNING] Fallback attempt also failed for invoice {$invNorm['INVOICE_ID']}.");
                    }
                }

                if ($detailed_data) {
                    // NEW: Link waybills to invoice if WAYBILL_IDS are found
                    if (!empty($detailed_data['WAYBILL_IDS'])) {
                        link_waybills_to_invoice($pdo, $invNorm['INVOICE_ID'], $detailed_data['WAYBILL_IDS'], $company_id);
                    }
                    // Unset WAYBILL_IDS as it does not exist in the invoice tables
                    unset($detailed_data['WAYBILL_IDS']);
                    
                    $invNorm = array_merge($invNorm, $detailed_data);
                }

                foreach (['OPERATION_DT','REG_DT','AGREE_DATE','REF_DATE','UPDATED_AT'] as $df) {
                    if (!empty($invNorm[$df])) {
                        $ts = strtotime((string)$invNorm[$df]);
                        if ($ts !== false) $invNorm[$df] = date('Y-m-d H:i:s', $ts);
                    }
                }

                foreach (['TANXA','VAT'] as $df) {
                    if (isset($invNorm[$df])) {
                        $clean = preg_replace('/[^\d.-]/', '', (string)$invNorm[$df]);
                        $invNorm[$df] = is_numeric($clean) ? round((float)$clean, 2) : 0.00;
                    }
                }

                foreach (['SELLER_UN_ID','BUYER_UN_ID','S_USER_ID','B_S_USER_ID','K_ID','SA_IDENT_NO','DOC_MOS_NOM_S','DOC_MOS_NOM_B','F_SERIES','F_NUMBER','SEQ_NUM_S','SEQ_NUM_B'] as $sf) {
                    if (isset($invNorm[$sf])) $invNorm[$sf] = (string)$invNorm[$sf];
                }

                // Date field formatting to prevent conversion errors
                $date_fields_to_format = ['OPERATION_DT', 'REG_DT', 'OVERHEAD_DT', 'AGREE_DATE', 'DECL_DATE', 'REF_DATE'];
                foreach ($date_fields_to_format as $field) {
                    if (!empty($invNorm[$field])) {
                        try {
                            $dt = new DateTime($invNorm[$field]);
                            if ($dt->format('Y') < 1753) {
                                $invNorm[$field] = null; // SQL Server doesn't support dates before 1753
                            } else {
                                $invNorm[$field] = $dt->format('Y-m-d H:i:s');
                            }
                        } catch (Exception $e) {
                            $invNorm[$field] = null; // Set to null on parsing error
                        }
                    } else {
                        $invNorm[$field] = null;
                    }
                }

                $allowed = [
                    'INVOICE_ID','F_SERIES','F_NUMBER','OPERATION_DT','REG_DT','SELLER_UN_ID','BUYER_UN_ID','STATUS',
                    'SEQ_NUM_S','S_USER_ID','K_ID','K_TYPE','WAS_REF','SEQ_NUM_B','B_S_USER_ID','BUYER_TIN',
                    'BUYER_NAME','NOTES','LAST_UPDATE_DATE','SA_IDENT_NO','ORG_NAME','UPDATED_AT','COMPANY_ID','COMPANY_NAME',
                    'COMPANY_TIN','DOC_MOS_NOM_S','TANXA','VAT','AGREE_DATE','AGREE_S_USER_ID','REF_DATE','REF_S_USER_ID',
                    'DOC_MOS_NOM_B', 'OVERHEAD_NO', 'OVERHEAD_DT', 'R_UN_ID', 'DEC_STATUS', 'DECL_DATE'
                ];
                $invFiltered = array_intersect_key($invNorm, array_flip($allowed));

                $fields = array_keys($invFiltered);
                
                $invoice_id = $invFiltered['INVOICE_ID'] ?? null;
                
                if ($invoice_id) {
                    try {
                        $check_sql = "SELECT INVOICE_ID, UPDATED_AT FROM $table WHERE INVOICE_ID = ?";
                        $check_stmt = $pdo->prepare($check_sql);
                        $check_stmt->execute([$invoice_id]);
                        $existing = $check_stmt->fetch(PDO::FETCH_ASSOC);
                        
                        if ($existing) {
                            $update_fields = array_keys($invFiltered);
                            $update_fields = array_unique($update_fields);
                            $update_set = implode(', ', array_map(fn($f) => "[$f] = :$f", $update_fields));
                            $update_params = [];
                            foreach ($update_fields as $f) { $update_params[':' . $f] = $invFiltered[$f]; }
                            $update_sql = "UPDATE $table SET $update_set WHERE INVOICE_ID = :where_invoice_id";
                            $update_params[':where_invoice_id'] = $invoice_id;
                            if ($updated < 3) {
                                error_log("[DEBUG] Invoice UPDATE SQL: $update_sql");
                                error_log("[DEBUG] Invoice UPDATE Parameters: " . json_encode($update_params));
                                error_log("[DEBUG] Invoice UPDATE Fields: " . implode(', ', $update_fields));
                            }
                            $update_stmt = $pdo->prepare($update_sql);
                            $update_stmt->execute($update_params);
                            $updated++;
                            if ($updated % 50 === 0) {
                                error_log("[DEBUG] Invoice UPDATES progress: $updated processed");
                            }
                        } else {
                            $columns = '[' . implode('], [', $fields) . ']';
                            $placeholders = array_map(fn($f) => ':' . $f, $fields);
                            $params = [];
                            foreach ($fields as $f) { $params[':' . $f] = $invFiltered[$f]; }
                            $sql = "INSERT INTO $table ($columns) VALUES (" . implode(", ", $placeholders) . ")";
                            $stmt = $pdo->prepare($sql);
                            $stmt->execute($params);
                            $inserted++;
                            error_log("[DEBUG] Invoice INSERTED (new) - ID: $invoice_id for company: $company");
                        }
                    } catch (PDOException $e) {
                        $failed++;
                        error_log("[ERROR] Invoice upsert failed: " . $e->getMessage());
                        error_log("[ERROR] SQL State: " . $e->getCode());
                        error_log("[ERROR] Invoice ID: $invoice_id");
                        error_log("[ERROR] Invoice data: " . json_encode($invFiltered));
                        continue;
                    }
                } else {
                    $columns = '[' . implode('], [', $fields) . ']';
                    $placeholders = array_map(fn($f) => ':' . $f, $fields);
                    $params = [];
                    foreach ($fields as $f) { $params[':' . $f] = $invFiltered[$f]; }
                    $sql = "INSERT INTO $table ($columns) VALUES (" . implode(", ", $placeholders) . ")";
                    try {
                        $stmt = $pdo->prepare($sql);
                        $stmt->execute($params);
                        $inserted++;
                        error_log("[DEBUG] Invoice inserted (no INVOICE_ID) for company: $company");
                    } catch (PDOException $e) {
                        $failed++;
                        error_log("[ERROR] Invoice insert failed (no INVOICE_ID): " . $e->getMessage());
                        error_log("[ERROR] SQL State: " . $e->getCode());
                        error_log("[ERROR] SQL: $sql");
                        error_log("[ERROR] Parameters: " . json_encode($params));
                        error_log("[ERROR] Invoice data: " . json_encode($invFiltered));
                        continue;
                    }
                }
            } catch (Exception $e) {
                $failed++;
                error_log("[ERROR] General error processing invoice: " . $e->getMessage());
                error_log("[ERROR] Exception type: " . get_class($e));
                error_log("[ERROR] Invoice ID: " . ($invNorm['INVOICE_ID'] ?? 'N/A'));
                error_log("[ERROR] Invoice data sample: " . json_encode(array_slice($invNorm, 0, 3, true)));
                continue;
            }
        }
        if (($chunk_index + 1) % 10 === 0) {
            gc_collect_cycles();
        }
    }
    
    error_log("[SUCCESS] $sync_type: Inserted $inserted new, Updated $updated existing, Skipped $skipped, Failed $failed of " . count($invoices_data) . " total records for $company");
    
    return [
        'company' => $company,
        'type' => $sync_type,
        'inserted' => $inserted,
        'updated' => $updated,
        'skipped' => $skipped,
        'total' => count($invoices_data),
        'error' => !!$error_message,
        'message' => $error_message ?: "Processed $total_records invoice records: $inserted new, $updated updated, $skipped skipped, $failed failed.",
        'raw_request' => $xml_request,
        'raw_response' => $response
    ];
}

/**
 * OPTIMIZED: Auto-associate invoices with waybills for a company using batch operations
 * Uses database-stored invoice IDs and batch inserts for maximum performance
 */
function auto_associate_invoices_with_waybills($pdo, $company, $company_id) {
    error_log("[DEBUG] ===== STARTING OPTIMIZED AUTO-ASSOCIATION (BATCH MODE) =====");
    error_log("[DEBUG] Company: $company");
    error_log("[DEBUG] Company ID: $company_id");
    
    // Ensure waybill_invoices table exists (with corrected column name)
    error_log("[DEBUG] Ensuring waybill_invoices table exists");
    try {
        // First check if table exists with old column name
        $stmt = $pdo->prepare("
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'rs' 
            AND TABLE_NAME = 'waybill_invoices'
            AND COLUMN_NAME IN ('WAYBILL_ID', 'WAYBILL_EXTERNAL_ID')
        ");
        $stmt->execute();
        $existing_columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        if (in_array('WAYBILL_ID', $existing_columns) && !in_array('WAYBILL_EXTERNAL_ID', $existing_columns)) {
            // Table has old WAYBILL_ID column, rename it
            error_log("[DEBUG] Renaming WAYBILL_ID to WAYBILL_EXTERNAL_ID in waybill_invoices table");
            $stmt = $pdo->prepare("EXEC sp_rename 'rs.waybill_invoices.WAYBILL_ID', 'WAYBILL_EXTERNAL_ID', 'COLUMN'");
            $stmt->execute();
        }
        
        // Now ensure table exists with correct schema
        $stmt = $pdo->prepare("
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'rs' AND TABLE_NAME = 'waybill_invoices')
            CREATE TABLE rs.waybill_invoices (
                ID INT IDENTITY(1,1) PRIMARY KEY,
                WAYBILL_EXTERNAL_ID NVARCHAR(50) NOT NULL,
                INVOICE_ID NVARCHAR(50) NOT NULL,
                COMPANY_ID NVARCHAR(50) NULL,
                CREATED_AT DATETIME2 DEFAULT GETDATE(),
                UPDATED_AT DATETIME2 DEFAULT GETDATE(),
                CONSTRAINT UQ_waybill_invoices_pair UNIQUE (WAYBILL_EXTERNAL_ID, INVOICE_ID)
            )
        ");
        $stmt->execute();
        error_log("[SUCCESS] Waybill invoices table ensured with correct schema");
    } catch (PDOException $e) {
        error_log("[ERROR] Failed to ensure waybill_invoices table: " . $e->getMessage());
        error_log("[ERROR] SQL State: " . $e->getCode());
    }
    
    $totalAssociations = 0;
    $totalErrors = 0;
    $totalSkipped = 0;
    
    try {
        // OPTIMIZATION 1: Use single optimized query to get all waybills with invoice IDs
        error_log("[DEBUG] Fetching all waybills with invoice IDs for company: $company");
        
        $start_time = microtime(true);
        
        // Combined query for both seller and buyer waybills that have invoice IDs
        $stmt = $pdo->prepare("
            WITH AllWaybills AS (
                SELECT 
                    EXTERNAL_ID,
                    INVOICE_ID,
                    'seller' as waybill_type,
                    CREATE_DATE
                FROM rs.sellers_waybills 
                WHERE COMPANY_TIN IN (SELECT company_tin FROM rs_users WHERE company_name = ?)
                    AND INVOICE_ID IS NOT NULL 
                    AND INVOICE_ID != ''
                
                UNION ALL
                
                SELECT 
                    EXTERNAL_ID,
                    INVOICE_ID,
                    'buyer' as waybill_type,
                    CREATE_DATE
                FROM rs.buyers_waybills 
                WHERE COMPANY_TIN IN (SELECT company_tin FROM rs_users WHERE company_name = ?)
                    AND INVOICE_ID IS NOT NULL 
                    AND INVOICE_ID != ''
            )
            SELECT EXTERNAL_ID, INVOICE_ID, waybill_type
            FROM AllWaybills
            ORDER BY CREATE_DATE DESC
        ");
        $stmt->execute([$company, $company]);
        $waybills_with_invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $fetch_time = round(microtime(true) - $start_time, 2);
        error_log("[SUCCESS] Found " . count($waybills_with_invoices) . " waybills with invoice IDs in {$fetch_time}s");
        
        if (empty($waybills_with_invoices)) {
            error_log("[DEBUG] No waybills with invoice IDs found for company $company");
            return [
                'company' => $company,
                'type' => 'auto_association',
                'inserted' => 0,
                'total' => 0,
                'error' => false,
                'message' => "No waybills with invoice IDs found for company $company"
            ];
        }
        
        // OPTIMIZATION 2: Get all existing associations in one query
        error_log("[DEBUG] Fetching existing associations...");
        $waybill_ids = array_column($waybills_with_invoices, 'EXTERNAL_ID');
        $placeholders = str_repeat('?,', count($waybill_ids) - 1) . '?';
        
        $stmt = $pdo->prepare("
            SELECT WAYBILL_EXTERNAL_ID, INVOICE_ID 
            FROM rs.waybill_invoices 
            WHERE WAYBILL_EXTERNAL_ID IN ($placeholders)
        ");
        $stmt->execute($waybill_ids);
        $existing_associations = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Create a lookup map for existing associations
        $existing_map = [];
        foreach ($existing_associations as $assoc) {
            $key = $assoc['WAYBILL_EXTERNAL_ID'] . '_' . $assoc['INVOICE_ID'];
            $existing_map[$key] = true;
        }
        
        error_log("[DEBUG] Found " . count($existing_associations) . " existing associations");
        
        // OPTIMIZATION 3: Prepare batch insert data
        $associations_to_insert = [];
        
        foreach ($waybills_with_invoices as $waybill) {
            $waybill_id = $waybill['EXTERNAL_ID'];
            $invoice_id = $waybill['INVOICE_ID'];
            $key = $waybill_id . '_' . $invoice_id;
            
            // Check if association already exists
            if (isset($existing_map[$key])) {
                $totalSkipped++;
                continue;
            }
            
            // Add to batch insert list
            $associations_to_insert[] = [
                'waybill_id' => $waybill_id,
                'invoice_id' => $invoice_id,
                'company_id' => $company_id
            ];
        }
        
        error_log("[DEBUG] Prepared " . count($associations_to_insert) . " new associations to insert");
        
        // OPTIMIZATION 4: Batch insert all associations
        if (!empty($associations_to_insert)) {
            error_log("[DEBUG] Starting batch insert of " . count($associations_to_insert) . " associations");
            
            $batch_size = 100; // Insert 100 at a time
            $chunks = array_chunk($associations_to_insert, $batch_size);
            
            foreach ($chunks as $chunk_index => $chunk) {
                try {
                    $pdo->beginTransaction();
                    
                    // Use batch insert with VALUES constructor
                    $values = [];
                    $params = [];
                    
                    foreach ($chunk as $assoc) {
                        $values[] = "(?, ?, ?, GETDATE(), GETDATE())";
                        $params[] = $assoc['waybill_id'];
                        $params[] = $assoc['invoice_id'];
                        $params[] = $assoc['company_id'];
                    }
                    
                    $sql = "INSERT INTO rs.waybill_invoices (WAYBILL_EXTERNAL_ID, INVOICE_ID, COMPANY_ID, CREATED_AT, UPDATED_AT) 
                            VALUES " . implode(', ', $values);
                    
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute($params);
                    
                    $inserted_count = $stmt->rowCount();
                    $totalAssociations += $inserted_count;
                    
                    $pdo->commit();
                    
                    error_log("[SUCCESS] Batch " . ($chunk_index + 1) . "/" . count($chunks) . 
                             ": Inserted $inserted_count associations");
                    
                } catch (PDOException $e) {
                    $pdo->rollBack();
                    
                    // If batch fails, try individual inserts for this chunk
                    error_log("[WARNING] Batch insert failed, falling back to individual inserts: " . $e->getMessage());
                    
                    foreach ($chunk as $assoc) {
                        try {
                            $stmt = $pdo->prepare("
                                INSERT INTO rs.waybill_invoices 
                                (WAYBILL_EXTERNAL_ID, INVOICE_ID, COMPANY_ID, CREATED_AT, UPDATED_AT) 
                                VALUES (?, ?, ?, GETDATE(), GETDATE())
                            ");
                            $stmt->execute([
                                $assoc['waybill_id'],
                                $assoc['invoice_id'],
                                $assoc['company_id']
                            ]);
                            $totalAssociations++;
                        } catch (PDOException $individual_e) {
                            // Likely a duplicate key constraint, which is fine
                            if ($individual_e->getCode() !== '23000') {
                                error_log("[ERROR] Failed to insert individual association: " . $individual_e->getMessage());
                                $totalErrors++;
                            } else {
                                $totalSkipped++;
                            }
                        }
                    }
                }
                
                // Progress tracking
                if (($chunk_index + 1) % 10 === 0) {
                    $progress = round((($chunk_index + 1) / count($chunks)) * 100, 1);
                    error_log("[DEBUG] Progress: $progress% completed");
                }
            }
        }
        
    } catch (Exception $e) {
        error_log("[ERROR] Error in optimized auto-association process: " . $e->getMessage());
        return [
            'company' => $company,
            'type' => 'auto_association',
            'error' => true,
            'message' => 'Error in auto-association process: ' . $e->getMessage(),
            'inserted' => 0,
            'total' => 0
        ];
    }
    
    $end_time = microtime(true);
    $total_time = round($end_time - $start_time, 2);
    
    error_log("[DEBUG] ===== OPTIMIZED AUTO-ASSOCIATION SUMMARY =====");
    error_log("[DEBUG] Company: $company");
    error_log("[DEBUG] Total waybills with invoices: " . count($waybills_with_invoices));
    error_log("[DEBUG] New associations created: $totalAssociations");
    error_log("[DEBUG] Associations skipped (already exist): $totalSkipped");
    error_log("[DEBUG] Total errors: $totalErrors");
    error_log("[DEBUG] Total processing time: {$total_time}s");
    error_log("[DEBUG] Average time per association: " . 
              ($totalAssociations > 0 ? round($total_time / $totalAssociations, 4) . "s" : "N/A"));
    error_log("[DEBUG] ===============================");
    
    return [
        'company' => $company,
        'type' => 'auto_association',
        'inserted' => $totalAssociations,
        'updated' => 0,
        'skipped' => $totalSkipped,
        'total' => count($waybills_with_invoices),
        'error' => false,
        'message' => "Optimized auto-association completed in {$total_time}s. Created $totalAssociations new associations, skipped $totalSkipped existing ones for " . count($waybills_with_invoices) . " waybills with invoices."
    ];
}

/**
 * Check if a company is a VAT payer using the RS.ge API
 */
function check_company_vat_payer_status($pdo, $company, $company_tin) {
    error_log("[DEBUG] ===== CHECKING VAT PAYER STATUS =====");
    error_log("[DEBUG] Company: $company");
    error_log("[DEBUG] Company TIN: $company_tin");
    
    try {
        // Get company credentials
        $stmt = $pdo->prepare("SELECT s_user, s_password FROM rs_users WHERE company_name = ?");
        $stmt->execute([$company]);
        $credentials = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$credentials) {
            error_log("[ERROR] Credentials not found for company: $company");
            return false;
        }
        
        $user = $credentials['s_user'];
        $password = $credentials['s_password'];
        
        // Build VAT payer API request
        $xml_request = '<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
<is_vat_payer_tin xmlns="http://tempuri.org/">
    <su>' . htmlspecialchars($user, ENT_XML1) . '</su>
    <sp>' . htmlspecialchars($password, ENT_XML1) . '</sp>
    <tin>' . htmlspecialchars($company_tin, ENT_XML1) . '</tin>
</is_vat_payer_tin>
</soap:Body>
</soap:Envelope>';
        
        $url = "https://services.rs.ge/WayBillService/WayBillService.asmx";
        $headers = [
            "Content-type: text/xml;charset=utf-8",
            "SOAPAction: \"http://tempuri.org/is_vat_payer_tin\"",
            "Content-length: " . strlen($xml_request),
        ];
        
        // Make API call
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $xml_request,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_TIMEOUT => 30,
        ]);
        
        error_log("[DEBUG] Sending VAT payer status API request...");
        $response = curl_exec($ch);
        $curl_error = curl_error($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($curl_error) {
            error_log("[ERROR] VAT payer API cURL failed: $curl_error");
            return false;
        }
        
        if ($http_code !== 200) {
            error_log("[ERROR] VAT payer API HTTP error: $http_code");
            return false;
        }
        
        // Parse XML response
        libxml_use_internal_errors(true);
        $clean_response = str_replace("\xEF\xBB\xBF", '', $response);
        $clean_response = str_replace("\x00", '', $clean_response);
        
        $xmlObj = simplexml_load_string($clean_response);
        if ($xmlObj === false) {
            error_log("[ERROR] Failed to parse VAT payer API response");
            return false;
        }
        
        // Extract VAT status
        $vat_status = null;
        $possible_paths = [
            '//is_vat_payer_tinResult',
            '//*[contains(local-name(), "Result")]',
            '//soap:Body//is_vat_payer_tinResult'
        ];
        
        foreach ($possible_paths as $path) {
            $nodes = $xmlObj->xpath($path);
            if (!empty($nodes)) {
                $vat_status = (string)$nodes[0];
                break;
            }
        }
        
        if ($vat_status === null) {
            if (isset($xmlObj->Body->is_vat_payer_tinResponse->is_vat_payer_tinResult)) {
                $vat_status = (string)$xmlObj->Body->is_vat_payer_tinResponse->is_vat_payer_tinResult;
            }
        }
        
        $isVatPayer = ($vat_status === 'true');
        error_log("[DEBUG] VAT payer API response: $vat_status");
        error_log("[DEBUG] Company $company is VAT payer: " . ($isVatPayer ? 'YES' : 'NO'));
        
        return $isVatPayer;
        
    } catch (Exception $e) {
        error_log("[ERROR] Exception checking VAT payer status: " . $e->getMessage());
        return false;
    }
}

/**
 * Update waybill tables with VAT payer status for a company
 */
function update_waybills_vat_payer_status($pdo, $company_tin, $isVatPayer) {
    error_log("[DEBUG] ===== UPDATING WAYBILLS VAT PAYER STATUS =====");
    error_log("[DEBUG] Company TIN: $company_tin");
    error_log("[DEBUG] Is VAT Payer: " . ($isVatPayer ? 'YES' : 'NO'));
    
    try {
        $vat_payer_value = $isVatPayer ? 1 : 0;
        
        // Update seller waybills
        $seller_sql = "UPDATE rs.sellers_waybills SET IS_VAT_PAYER = ? WHERE COMPANY_TIN = ?";
        $seller_stmt = $pdo->prepare($seller_sql);
        $seller_stmt->execute([$vat_payer_value, $company_tin]);
        $seller_updated = $seller_stmt->rowCount();
        
        // Update buyer waybills
        $buyer_sql = "UPDATE rs.buyers_waybills SET IS_VAT_PAYER = ? WHERE COMPANY_TIN = ?";
        $buyer_stmt = $pdo->prepare($buyer_sql);
        $buyer_stmt->execute([$vat_payer_value, $company_tin]);
        $buyer_updated = $buyer_stmt->rowCount();
        
        error_log("[DEBUG] Updated $seller_updated seller waybills with VAT payer status");
        error_log("[DEBUG] Updated $buyer_updated buyer waybills with VAT payer status");
        error_log("[DEBUG] Total waybills updated: " . ($seller_updated + $buyer_updated));
        
        return [
            'company' => 'vat_payer_update',
            'type' => 'vat_payer_status',
            'inserted' => 0,
            'updated' => $seller_updated + $buyer_updated,
            'skipped' => 0,
            'total' => $seller_updated + $buyer_updated,
            'error' => false,
            'message' => "VAT payer status updated for company TIN $company_tin: " . ($isVatPayer ? 'VAT Payer' : 'Non-VAT Payer') . " ($seller_updated seller, $buyer_updated buyer waybills updated)"
        ];
        
    } catch (PDOException $e) {
        error_log("[ERROR] Failed to update waybills VAT payer status: " . $e->getMessage());
        error_log("[ERROR] SQL State: " . $e->getCode());
        
        return [
            'company' => 'vat_payer_update',
            'type' => 'vat_payer_status',
            'inserted' => 0,
            'updated' => 0,
            'skipped' => 0,
            'total' => 0,
            'error' => true,
            'message' => 'Error updating VAT payer status: ' . $e->getMessage()
        ];
    }
}

/**
 * NEW: Get single invoice details from RS service
 */
function getInvoiceDetailsFromRS($pdo, $invoice_id, $company_name) {
    if (empty($invoice_id) || empty($company_name)) {
        return null;
    }

    try {
        $stmt = $pdo->prepare("SELECT s_user, s_password, user_id FROM rs_users WHERE company_name = ?");
        $stmt->execute([$company_name]);
        $credentials = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$credentials) {
            error_log("[ERROR] getInvoiceDetailsFromRS: Credentials not found for company: $company_name");
            return null;
        }

        $url = "https://www.revenue.mof.ge/ntosservice/ntosservice.asmx";
        $soapFunction = 'get_invoice';
        $xml_request = '<?xml version="1.0" encoding="utf-8"?>
        <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
          <soap:Body>
            <get_invoice xmlns="http://tempuri.org/">
              <user_id>' . htmlspecialchars($credentials['user_id'], ENT_XML1) . '</user_id>
              <invois_id>' . htmlspecialchars($invoice_id, ENT_XML1) . '</invois_id>
              <su>' . htmlspecialchars($credentials['s_user'], ENT_XML1) . '</su>
              <sp>' . htmlspecialchars($credentials['s_password'], ENT_XML1) . '</sp>
            </get_invoice>
          </soap:Body>
        </soap:Envelope>';

        $headers = [
            "Content-type: text/xml;charset=utf-8",
            "SOAPAction: \"http://tempuri.org/$soapFunction\"",
            "Content-length: " . strlen($xml_request),
        ];

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $xml_request,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_TIMEOUT => 45, // 45 second timeout for individual call
        ]);
        
        $response = curl_exec($ch);
        $curl_error = curl_error($ch);
        curl_close($ch);

        if ($curl_error) {
            error_log("[ERROR] getInvoiceDetailsFromRS cURL failed for invoice_id=$invoice_id: $curl_error");
            return null;
        }
        
        $clean_xml = str_ireplace(['soap:', 'diffgr:', 'msdata:'], '', $response);
        $sxe = simplexml_load_string($clean_xml);

        if ($sxe === false) {
            error_log("[ERROR] getInvoiceDetailsFromRS failed to parse XML for invoice_id=$invoice_id");
            return null;
        }

        $invoiceNode = $sxe->Body->get_invoiceResponse;
        if (isset($invoiceNode)) {
             return [
                'OVERHEAD_NO' => (string)$invoiceNode->overhead_no ?? null,
                'OVERHEAD_DT' => (string)$invoiceNode->overhead_dt ?? null,
                'R_UN_ID' => (string)$invoiceNode->r_un_id ?? null,
                'DEC_STATUS' => (string)$invoiceNode->dec_status ?? null,
                'WAYBILL_IDS' => (string)$invoiceNode->waybill_ids ?? (string)$invoiceNode->waybill_id ?? null,
            ];
        }
        return null;

    } catch (Exception $e) {
        error_log("[ERROR] Exception in getInvoiceDetailsFromRS for invoice_id=$invoice_id: " . $e->getMessage());
        return null;
    }
}

/**
 * NEW: Fallback function to get invoice overhead details using get_ntos_invoices_inv_nos
 */
function getInvoiceOverheadDetailsFromRS($pdo, $invoice_id, $company_name) {
    if (empty($invoice_id) || empty($company_name)) {
        return null;
    }

    try {
        $stmt = $pdo->prepare("SELECT s_user, s_password, user_id FROM rs_users WHERE company_name = ?");
        $stmt->execute([$company_name]);
        $credentials = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$credentials) {
            error_log("[ERROR] getInvoiceOverheadDetailsFromRS: Credentials not found for company: $company_name");
            return null;
        }

        $url = "https://www.revenue.mof.ge/ntosservice/ntosservice.asmx";
        $soapFunction = 'get_ntos_invoices_inv_nos';
        $xml_request = '<?xml version="1.0" encoding="utf-8"?>
        <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
          <soap:Body>
            <get_ntos_invoices_inv_nos xmlns="http://tempuri.org/">
              <user_id>' . htmlspecialchars($credentials['user_id'], ENT_XML1) . '</user_id>
              <invois_id>' . htmlspecialchars($invoice_id, ENT_XML1) . '</invois_id>
              <su>' . htmlspecialchars($credentials['s_user'], ENT_XML1) . '</su>
              <sp>' . htmlspecialchars($credentials['s_password'], ENT_XML1) . '</sp>
            </get_ntos_invoices_inv_nos>
          </soap:Body>
        </soap:Envelope>';

        $headers = [
            "Content-type: text/xml;charset=utf-8",
            "SOAPAction: \"http://tempuri.org/$soapFunction\"",
            "Content-length: " . strlen($xml_request),
        ];

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $xml_request,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_TIMEOUT => 45,
        ]);
        
        $response = curl_exec($ch);
        $curl_error = curl_error($ch);
        curl_close($ch);

        if ($curl_error) {
            error_log("[ERROR] getInvoiceOverheadDetailsFromRS cURL failed for invoice_id=$invoice_id: $curl_error");
            return null;
        }
        
        $clean_xml = str_ireplace(['soap:', 'diffgr:', 'msdata:'], '', $response);
        $sxe = simplexml_load_string($clean_xml);

        if ($sxe === false) {
            error_log("[ERROR] getInvoiceOverheadDetailsFromRS failed to parse XML for invoice_id=$invoice_id");
            return null;
        }

        $resultNode = $sxe->Body->get_ntos_invoices_inv_nosResponse->get_ntos_invoices_inv_nosResult->diffgram->DocumentElement->ntos_invoices_inv_nos ?? null;

        if (isset($resultNode)) {
             return [
                'OVERHEAD_NO' => (string)$resultNode->OVERHEAD_NO ?? null,
                'OVERHEAD_DT' => (string)$resultNode->OVERHEAD_DT ?? null,
                // This endpoint does not return these fields, so we return null for them
                'R_UN_ID' => null,
                'DEC_STATUS' => null,
                'WAYBILL_IDS' => null,
            ];
        }
        return null;

    } catch (Exception $e) {
        error_log("[ERROR] Exception in getInvoiceOverheadDetailsFromRS for invoice_id=$invoice_id: " . $e->getMessage());
        return null;
    }
}

/**
 * NEW: Links waybills to an invoice in the rs.waybill_invoices table.
 */
function link_waybills_to_invoice($pdo, $invoice_id, $waybill_ids_str, $company_id) {
    if (empty($waybill_ids_str) || empty($invoice_id) || empty($company_id)) {
        return 0;
    }

    $waybill_ids = array_filter(array_map('trim', explode(',', $waybill_ids_str)));
    if (empty($waybill_ids)) {
        return 0;
    }
    
    $associations_created = 0;
    try {
        $pdo->beginTransaction();
        
        $stmt_check = $pdo->prepare("SELECT 1 FROM rs.waybill_invoices WHERE WAYBILL_EXTERNAL_ID = ? AND INVOICE_ID = ?");
        $stmt_insert = $pdo->prepare(
            "INSERT INTO rs.waybill_invoices (WAYBILL_EXTERNAL_ID, INVOICE_ID, COMPANY_ID, UPDATED_AT) VALUES (?, ?, ?, GETDATE())"
        );

        foreach ($waybill_ids as $waybill_id) {
            $stmt_check->execute([$waybill_id, $invoice_id]);
            if ($stmt_check->fetchColumn()) {
                continue; // Skip if already exists
            }
            
            if ($stmt_insert->execute([$waybill_id, $invoice_id, $company_id])) {
                $associations_created++;
            }
        }
        
        $pdo->commit();

        if ($associations_created > 0) {
            error_log("[DEBUG] Created $associations_created new associations for invoice $invoice_id");
        }
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log("[ERROR] Failed to link waybills for invoice $invoice_id: " . $e->getMessage());
    }
    return $associations_created;
}

/**
 * OPTIMIZED: Sync invoice goods for a company using parallel processing
 * Fetches invoice IDs from database and calls get_invoice_desc API in parallel
 */
function sync_invoice_goods_for_company($pdo, $company, $company_id, $company_tin) {
    $sync_type = 'invoice_goods';
    error_log("[DEBUG] ===== STARTING $sync_type SYNC =====");
    error_log("[DEBUG] Company: $company");
    error_log("[DEBUG] Company ID: $company_id");
    error_log("[DEBUG] Company TIN: $company_tin");

    // Fetch credentials
    try {
        $stmt = $pdo->prepare("SELECT s_user, s_password, user_id FROM rs_users WHERE company_name = ?");
        $stmt->execute([$company]);
        $credentials = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$credentials) {
            error_log("[ERROR] Credentials not found for company: $company");
            return [
                'company' => $company,
                'type' => $sync_type,
                'error' => true,
                'message' => 'Credentials not found',
                'inserted' => 0,
                'updated' => 0,
                'total' => 0
            ];
        }
        
        error_log("[DEBUG] Credentials found - User: " . $credentials['s_user'] . ", User ID: " . $credentials['user_id']);
    } catch (PDOException $e) {
        error_log("[ERROR] Failed to fetch credentials: " . $e->getMessage());
        return [
            'company' => $company,
            'type' => $sync_type,
            'error' => true,
            'message' => 'Database error: ' . $e->getMessage(),
            'inserted' => 0,
            'updated' => 0,
            'total' => 0
        ];
    }

    // Get invoice IDs with their numbers from both seller and buyer tables
    error_log("[DEBUG] Fetching invoice IDs and numbers from database...");
    try {
        $invoice_sql = "
            SELECT DISTINCT INVOICE_ID, F_SERIES, F_NUMBER, 'seller' as TYPE 
            FROM rs.seller_invoices 
            WHERE COMPANY_TIN = ? AND INVOICE_ID IS NOT NULL AND INVOICE_ID != ''
            UNION
            SELECT DISTINCT INVOICE_ID, F_SERIES, F_NUMBER, 'buyer' as TYPE 
            FROM rs.buyer_invoices 
            WHERE COMPANY_TIN = ? AND INVOICE_ID IS NOT NULL AND INVOICE_ID != ''
            ORDER BY INVOICE_ID
        ";
        
        $stmt = $pdo->prepare($invoice_sql);
        $stmt->execute([$company_tin, $company_tin]);
        $invoice_rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (empty($invoice_rows)) {
            error_log("[WARNING] No invoices found for company: $company");
            return [
                'company' => $company,
                'type' => $sync_type,
                'inserted' => 0,
                'updated' => 0,
                'total' => 0,
                'error' => false,
                'message' => "No invoices found for company $company"
            ];
        }
        
        // Separate invoices by type with their numbers
        $seller_invoices = [];
        $buyer_invoices = [];
        foreach ($invoice_rows as $row) {
            $invoice_data = [
                'INVOICE_ID' => $row['INVOICE_ID'],
                'F_SERIES' => $row['F_SERIES'],
                'F_NUMBER' => $row['F_NUMBER']
            ];
            
            if ($row['TYPE'] === 'seller') {
                $seller_invoices[] = $invoice_data;
            } else {
                $buyer_invoices[] = $invoice_data;
            }
        }
        
        error_log("[DEBUG] Found " . count($seller_invoices) . " seller invoices and " . count($buyer_invoices) . " buyer invoices to process");
        
    } catch (PDOException $e) {
        error_log("[ERROR] Failed to fetch invoice IDs: " . $e->getMessage());
        return [
            'company' => $company,
            'type' => $sync_type,
            'error' => true,
            'message' => 'Failed to fetch invoice IDs: ' . $e->getMessage(),
            'inserted' => 0,
            'updated' => 0,
            'total' => 0
        ];
    }

    $total_inserted = 0;
    $total_updated = 0;
    $total_skipped = 0;
    $total_failed = 0;
    $total_goods = 0;

    // Process seller invoices
    if (!empty($seller_invoices)) {
        // error_log("[DEBUG] ===== PROCESSING SELLER INVOICE GOODS =====");
        $seller_result = processInvoiceGoodsBatch($pdo, $seller_invoices, $company, $company_id, $company_tin, 'seller');
        $total_inserted += $seller_result['inserted'];
        $total_updated += $seller_result['updated'];
        $total_skipped += $seller_result['skipped'];
        $total_failed += $seller_result['failed'];
        $total_goods += $seller_result['total'];
    }

    // Process buyer invoices
    if (!empty($buyer_invoices)) {
        // error_log("[DEBUG] ===== PROCESSING BUYER INVOICE GOODS =====");
        $buyer_result = processInvoiceGoodsBatch($pdo, $buyer_invoices, $company, $company_id, $company_tin, 'buyer');
        $total_inserted += $buyer_result['inserted'];
        $total_updated += $buyer_result['updated'];
        $total_skipped += $buyer_result['skipped'];
        $total_failed += $buyer_result['failed'];
        $total_goods += $buyer_result['total'];
    }
    
    error_log("[DEBUG] ===== $sync_type SUMMARY =====");
    error_log("[DEBUG] Company: $company");
    error_log("[DEBUG] Total seller invoices: " . count($seller_invoices));
    error_log("[DEBUG] Total buyer invoices: " . count($buyer_invoices));
    // error_log("[DEBUG] Total goods records processed: $total_goods");
    error_log("[DEBUG] Successfully inserted: $total_inserted");
    error_log("[DEBUG] Successfully updated: $total_updated");
    error_log("[DEBUG] Skipped: $total_skipped");
    error_log("[DEBUG] Failed: $total_failed");
    
    return [
        'company' => $company,
        'type' => $sync_type,
        'inserted' => $total_inserted,
        'updated' => $total_updated,
        'skipped' => $total_skipped,
        'total' => $total_goods,
        'error' => false,
        'message' => "Processed $total_goods goods records from " . (count($seller_invoices) + count($buyer_invoices)) . " invoices: $total_inserted new, $total_updated updated, $total_skipped skipped, $total_failed failed."
    ];
}

/**
 * Process invoice goods for a specific type (seller or buyer)
 */
function processInvoiceGoodsBatch($pdo, $invoice_data, $company, $company_id, $company_tin, $type) {
    $table = $type === 'seller' ? 'rs.sellers_invoice_goods' : 'rs.buyers_invoice_goods';
    error_log("[DEBUG] Target table: $table");
    
    // Extract invoice IDs for API calls
    $invoice_ids = array_column($invoice_data, 'INVOICE_ID');
    
    // Create a lookup array for invoice numbers
    $invoice_lookup = [];
    foreach ($invoice_data as $invoice) {
        $invoice_lookup[$invoice['INVOICE_ID']] = [
            'F_SERIES' => $invoice['F_SERIES'],
            'F_NUMBER' => $invoice['F_NUMBER']
        ];
    }
    
    // Process invoices in batches with parallel API calls
    $batch_size = 50; // Process 50 invoices at a time
    $concurrency = 15; // 15 parallel API calls
    $chunks = array_chunk($invoice_ids, $batch_size);
    
    error_log("[DEBUG] Processing " . count($invoice_ids) . " $type invoices in " . count($chunks) . " batches of $batch_size");
    
    $total_inserted = 0;
    $total_updated = 0;
    $total_skipped = 0;
    $total_failed = 0;
    $total_goods = 0;
    
    foreach ($chunks as $chunk_index => $chunk) {
        error_log("[DEBUG] Processing $type batch " . ($chunk_index + 1) . "/" . count($chunks) . " (" . count($chunk) . " invoices)");
        
        // Get invoice goods for this batch in parallel
        $batch_start_time = microtime(true);
        $all_invoice_goods = getMultipleInvoiceGoodsFromRS($pdo, $chunk, $company, $concurrency);
        $fetch_time = round(microtime(true) - $batch_start_time, 2);
        
        // error_log("[DEBUG] Fetched goods for " . count($chunk) . " $type invoices in {$fetch_time}s");
        
        // Process each invoice's goods
        foreach ($chunk as $invoice_id) {
            $goods_data = $all_invoice_goods[$invoice_id] ?? [];
            
            if (empty($goods_data)) {
                $total_skipped++;
                // error_log("[DEBUG] No goods data found for $type invoice: $invoice_id");
                continue;
            }
            
            // error_log("[DEBUG] Processing " . count($goods_data) . " goods items for $type invoice: $invoice_id");
            
            // Process goods for this invoice
            foreach ($goods_data as $goods) {
                try {
                    // Add internal tracking fields
                    $goods['INVOICE_ID'] = $invoice_id;
                    $goods['COMPANY_ID'] = $company_id;
                    $goods['COMPANY_TIN'] = $company_tin;
                    $goods['COMPANY_NAME'] = $company;
                    $goods['UPDATED_AT'] = date('Y-m-d H:i:s');
                    
                    // Add invoice number fields from lookup
                    if (isset($invoice_lookup[$invoice_id])) {
                        $goods['F_SERIES'] = $invoice_lookup[$invoice_id]['F_SERIES'];
                        $goods['F_NUMBER'] = $invoice_lookup[$invoice_id]['F_NUMBER'];
                    }
                    
                    // Filter to only allowed fields (match check_tables.php schema)
                    $allowedFields = [
                        'INVOICE_ID', 'AKCIS_ID', 'AQCIZI_AMOUNT', 'DRG_AMOUNT', 'FULL_AMOUNT',
                        'GOODS', 'G_NUMBER', 'G_UNIT', 'ID_GOODS', 'INV_ID', 'SDRG_AMOUNT',
                        'VAT_TYPE', 'WAYBILL_ID', 'F_SERIES', 'F_NUMBER', 'COMPANY_ID', 'COMPANY_TIN', 'COMPANY_NAME', 'UPDATED_AT'
                    ];
                    
                    $filteredGoods = array_intersect_key($goods, array_flip($allowedFields));
                    
                    // Ensure required fields exist
                    if (empty($filteredGoods['INVOICE_ID'])) {
                        $total_skipped++;
                        continue;
                    }
                    
                    // Normalize numeric fields
                    $numericFields = ['AQCIZI_AMOUNT', 'DRG_AMOUNT', 'FULL_AMOUNT', 'G_NUMBER', 'SDRG_AMOUNT'];
                    foreach ($numericFields as $field) {
                        if (isset($filteredGoods[$field])) {
                            $filteredGoods[$field] = normalize_decimal_value($filteredGoods[$field]);
                        }
                    }
                    
                    $fields = array_keys($filteredGoods);
                    
                    // Check if goods record exists (using INVOICE_ID and ID_GOODS)
                    $id_goods = $filteredGoods['ID_GOODS'] ?? null;
                    
                    if ($id_goods) {
                        $check_sql = "SELECT COUNT(*) FROM $table WHERE INVOICE_ID = ? AND ID_GOODS = ?";
                        $check_params = [$invoice_id, $id_goods];
                    } else {
                        // If no ID_GOODS, use INVOICE_ID only (less reliable but better than nothing)
                        $check_sql = "SELECT COUNT(*) FROM $table WHERE INVOICE_ID = ? AND (ID_GOODS IS NULL OR ID_GOODS = '')";
                        $check_params = [$invoice_id];
                    }
                    
                    $check_stmt = $pdo->prepare($check_sql);
                    $check_stmt->execute($check_params);
                    $exists = $check_stmt->fetchColumn() > 0;
                    
                    if ($exists) {
                        // Update existing record
                        $update_set = implode(', ', array_map(fn($f) => "[$f] = :$f", $fields));
                        $update_params = [];
                        foreach ($fields as $f) { $update_params[':' . $f] = $filteredGoods[$f]; }
                        
                        if ($id_goods) {
                            $update_sql = "UPDATE $table SET $update_set WHERE INVOICE_ID = :where_invoice_id AND ID_GOODS = :where_id_goods";
                            $update_params[':where_invoice_id'] = $invoice_id;
                            $update_params[':where_id_goods'] = $id_goods;
                        } else {
                            $update_sql = "UPDATE $table SET $update_set WHERE INVOICE_ID = :where_invoice_id AND (ID_GOODS IS NULL OR ID_GOODS = '')";
                            $update_params[':where_invoice_id'] = $invoice_id;
                        }
                        
                        $update_stmt = $pdo->prepare($update_sql);
                        $update_stmt->execute($update_params);
                        $total_updated++;
                    } else {
                        // Insert new record
                        $columns = '[' . implode('], [', $fields) . ']';
                        $placeholders = array_map(fn($f) => ':' . $f, $fields);
                        $params = [];
                        foreach ($fields as $f) { $params[':' . $f] = $filteredGoods[$f]; }
                        
                        $sql = "INSERT INTO $table ($columns) VALUES (" . implode(", ", $placeholders) . ")";
                        $stmt = $pdo->prepare($sql);
                        $stmt->execute($params);
                        $total_inserted++;
                    }
                    
                    $total_goods++;
                    
                } catch (PDOException $e) {
                    $total_failed++;
                    error_log("[ERROR] Failed to process $type invoice goods: " . $e->getMessage());
                    error_log("[ERROR] Invoice ID: $invoice_id, ID_GOODS: " . ($goods['ID_GOODS'] ?? 'NULL'));
                    continue;
                }
            }
        }
        
        // Progress tracking and memory management
        if (($chunk_index + 1) % 5 === 0) {
            error_log("[DEBUG] Progress: " . ($chunk_index + 1) . "/" . count($chunks) . " $type batches completed");
            gc_collect_cycles();
        }
    }
    
    // error_log("[DEBUG] ===== $type INVOICE GOODS SUMMARY =====");
    error_log("[DEBUG] Company: $company");
    error_log("[DEBUG] Type: $type");
    error_log("[DEBUG] Total invoices processed: " . count($invoice_ids));
    // error_log("[DEBUG] Total goods records processed: $total_goods");
    error_log("[DEBUG] Successfully inserted: $total_inserted");
    error_log("[DEBUG] Successfully updated: $total_updated");
    error_log("[DEBUG] Skipped: $total_skipped");
    error_log("[DEBUG] Failed: $total_failed");
    error_log("[DEBUG] Table: $table");
    
    return [
        'inserted' => $total_inserted,
        'updated' => $total_updated,
        'skipped' => $total_skipped,
        'failed' => $total_failed,
        'total' => $total_goods
    ];
}

/**
 * OPTIMIZED: Get invoice goods for multiple invoices in parallel from RS service
 */
function getMultipleInvoiceGoodsFromRS($pdo, $invoice_ids, $company_name, $concurrency = 15) {
    if (empty($invoice_ids) || empty($company_name)) {
        return [];
    }

    $results = [];
    $credentials = null;

    try {
        $stmt = $pdo->prepare("SELECT s_user, s_password, user_id FROM rs_users WHERE company_name = ?");
        $stmt->execute([$company_name]);
        $credentials = $stmt->fetch(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        error_log("[ERROR] getMultipleInvoiceGoodsFromRS: DB error: " . $e->getMessage());
        return [];
    }
    
    if (!$credentials) {
        error_log("[ERROR] getMultipleInvoiceGoodsFromRS: Credentials not found for company: $company_name");
        return [];
    }

    $url = "https://www.revenue.mof.ge/ntosservice/ntosservice.asmx";
    $mh = curl_multi_init();
    $handles = [];

    $id_chunks = array_chunk($invoice_ids, $concurrency);
    // error_log("[DEBUG] Starting parallel invoice goods fetch for " . count($invoice_ids) . " invoices in " . count($id_chunks) . " chunks of $concurrency.");

    foreach ($id_chunks as $chunk_index => $chunk) {
        foreach ($chunk as $invoice_id) {
            $soap_request = '<?xml version="1.0" encoding="utf-8"?>
            <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
              <soap:Body>
                <get_invoice_desc xmlns="http://tempuri.org/">
                  <user_id>' . htmlspecialchars($credentials['user_id'], ENT_XML1) . '</user_id>
                  <invois_id>' . htmlspecialchars($invoice_id, ENT_XML1) . '</invois_id>
                  <su>' . htmlspecialchars($credentials['s_user'], ENT_XML1) . '</su>
                  <sp>' . htmlspecialchars($credentials['s_password'], ENT_XML1) . '</sp>
                </get_invoice_desc>
              </soap:Body>
            </soap:Envelope>';

            $headers = [
                "Content-type: text/xml;charset=utf-8",
                "SOAPAction: \"http://tempuri.org/get_invoice_desc\"",
                "Content-length: " . strlen($soap_request),
            ];

            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => $soap_request,
                CURLOPT_HTTPHEADER => $headers,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_SSL_VERIFYPEER => true,
                CURLOPT_SSL_VERIFYHOST => 2,
                CURLOPT_TIMEOUT => 90,
                CURLOPT_CONNECTTIMEOUT => 30,
                CURLOPT_NOSIGNAL => 1,
            ]);
            
            curl_multi_add_handle($mh, $ch);
            $handles[(int)$ch] = $invoice_id;
        }

        $running = null;
        do {
            curl_multi_exec($mh, $running);
            curl_multi_select($mh);
        } while ($running > 0);

        // Process completed handles for the current chunk
        while ($info = curl_multi_info_read($mh)) {
            $ch = $info['handle'];
            $handle_id = (int)$ch;

            if (isset($handles[$handle_id])) {
                $invoice_id = $handles[$handle_id];

                if ($info['result'] == CURLE_OK) {
                    $response = curl_multi_getcontent($ch);
                    $goods_data = parseInvoiceGoodsFromResponse($response, $invoice_id);
                    $results[$invoice_id] = $goods_data;
                    
                    // Debug log for first few invoices
                    if (count($results) <= 3) {
                        error_log("[DEBUG] Invoice $invoice_id API response length: " . strlen($response));
                        // error_log("[DEBUG] Invoice $invoice_id parsed goods count: " . count($goods_data));
                        if (!empty($goods_data)) {
                            // error_log("[DEBUG] Invoice $invoice_id first goods item: " . print_r($goods_data[0], true));
                        } else {
                            // Log part of the response to understand the structure
                            error_log("[DEBUG] Invoice $invoice_id sample response (first 1000 chars): " . substr($response, 0, 1000));
                        }
                    }
                } else {
                    error_log("[ERROR] Parallel fetch cURL error for invoice $invoice_id: " . curl_error($ch));
                    $results[$invoice_id] = [];
                }

                curl_multi_remove_handle($mh, $ch);
                curl_close($ch);
            }
        }
        $handles = []; // Clear handles for the next chunk
        // error_log("[DEBUG] Finished parallel invoice goods fetch chunk " . ($chunk_index + 1) . "/" . count($id_chunks));
    }

    curl_multi_close($mh);
    return $results;
}

/**
 * Parse invoice goods from get_invoice_desc API response
 */
function parseInvoiceGoodsFromResponse($response, $invoice_id) {
    $goods_data = [];
    
    try {
        // Clean the response
        $clean_response = str_replace("\xEF\xBB\xBF", '', $response);
        $clean_response = str_replace("\x00", '', $clean_response);
        $clean_response = preg_replace('/xmlns=""/', '', $clean_response);
        $clean_response = str_replace('>null<', '><', $clean_response);
        
        libxml_use_internal_errors(true);
        $sxe = simplexml_load_string($clean_response);
        
        if ($sxe === false) {
            error_log("[ERROR] Failed to parse invoice goods XML for invoice $invoice_id");
            return [];
        }
        
        // Register namespaces and find goods data
        $sxe->registerXPathNamespace('soap', 'http://schemas.xmlsoap.org/soap/envelope/');
        $sxe->registerXPathNamespace('diffgr', 'urn:schemas-microsoft-com:xml-diffgram-v1');
        $sxe->registerXPathNamespace('msdata', 'urn:schemas-microsoft-com:xml-msdata');
        
        // Debug: Log the XML structure for the first few invoices
        static $debug_count = 0;
        if ($debug_count < 3) {
            $debug_count++;
            error_log("[DEBUG] XML structure for invoice $invoice_id: " . $sxe->asXML());
        }
        
        // Try multiple possible paths for invoice goods
        $possible_paths = [
            '//diffgr:diffgram//invoices_descs',
            '//invoices_descs',
            '//DocumentElement//invoices_descs',
            '//get_invoice_descResult//invoices_descs',
            '//get_invoice_descResponse//invoices_descs',
            '//*[local-name()="invoices_descs"]',
            '//diffgram//invoices_descs',
            '//NewDataSet//invoices_descs'
        ];
        
        $goods_nodes = [];
        foreach ($possible_paths as $path) {
            $goods_nodes = $sxe->xpath($path);
            if (!empty($goods_nodes)) {
                // error_log("[DEBUG] Found goods using path: $path for invoice $invoice_id");
                break;
            }
        }
        
        if (!empty($goods_nodes)) {
            foreach ($goods_nodes as $goods_node) {
                $goods_array = (array)$goods_node;
                $goods_item = [];
                
                // Convert all field names to UPPERCASE (as per user requirement)
                foreach ($goods_array as $field_name => $field_value) {
                    $field_name = strtoupper($field_name);
                    
                    if ($field_value === null || (is_string($field_value) && trim($field_value) === '')) {
                        continue;
                    }
                    
                    // Handle special case: rename ID to ID_GOODS to avoid conflict with table primary key
                    if ($field_name === 'ID') {
                        $field_name = 'ID_GOODS';
                    }
                    
                    // Decode HTML entities (e.g., &#4315; -> ქ) for proper Georgian text
                    $stringValue = (string)$field_value;
                    $goods_item[$field_name] = html_entity_decode($stringValue, ENT_QUOTES | ENT_HTML5, 'UTF-8');
                }
                
                if (!empty($goods_item)) {
                    $goods_data[] = $goods_item;
                }
            }
        } else {
            // error_log("[DEBUG] No goods nodes found for invoice $invoice_id. Tried paths: " . implode(', ', $possible_paths));
        }
        
        // error_log("[DEBUG] Parsed " . count($goods_data) . " goods items for invoice $invoice_id");
        
    } catch (Exception $e) {
        error_log("[ERROR] Exception parsing invoice goods for invoice $invoice_id: " . $e->getMessage());
    }
    
    return $goods_data;
}

/**
 * Helper function to validate and convert date strings for SQL Server
 */
function validateAndConvertDate($dateString) {
    if (empty($dateString) || $dateString === 'null' || $dateString === '') {
        return null;
    }
    
    // Use the same approach as working APIs: strtotime + date format
    $ts = strtotime((string)$dateString);
    if ($ts !== false) {
        return date('Y-m-d H:i:s', $ts);
    }
    
    // Fallback: try DateTime approach (same as working invoice APIs)
    try {
        $date = new DateTime($dateString);
        return $date->format('Y-m-d H:i:s');
    } catch (Exception $e) {
        error_log("[WARNING] Invalid date format: $dateString - Error: " . $e->getMessage());
        return null;
    }
}

/**
 * Sync NSAF Seller Invoices for Company
 */
function sync_nsaf_seller_invoices_for_company($pdo, $company, $company_id, $company_tin, $startDate, $endDate) {
    $sync_type = 'nsaf_seller_invoices';
    error_log("[DEBUG] ===== STARTING $sync_type SYNC =====");
    error_log("[DEBUG] Company: $company");
    error_log("[DEBUG] Company ID: $company_id");
    error_log("[DEBUG] Company TIN: $company_tin");
    error_log("[DEBUG] Date Range: $startDate to $endDate");
    
    try {
        // Get company credentials
        $stmt = $pdo->prepare("SELECT USER_ID, UN_ID, S_USER, S_PASSWORD FROM rs_users WHERE company_name = ?");
        $stmt->execute([$company]);
        $companyData = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$companyData || !$companyData['S_USER'] || !$companyData['S_PASSWORD']) {
            throw new Exception("Company credentials not found or incomplete");
        }
        
        $user_id = $companyData['USER_ID'];
        $un_id = $companyData['UN_ID'];
        $s_user = $companyData['S_USER'];
        $s_password = $companyData['S_PASSWORD'];
        
        // Create SOAP request for get_seller_invoices_n (with date range support)
        // Format dates for API
        $startDateTime = date('Y-m-d\TH:i:s', strtotime($startDate . ' 00:00:00'));
        $endDateTime = date('Y-m-d\TH:i:s', strtotime($endDate . ' 23:59:59'));
        
        $xml = '<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
    <get_seller_invoices_n xmlns="http://tempuri.org/">
    <user_id>' . htmlspecialchars($user_id, ENT_XML1) . '</user_id>
    <un_id>' . htmlspecialchars($un_id, ENT_XML1) . '</un_id>
    <s_dt>' . htmlspecialchars($startDateTime, ENT_XML1) . '</s_dt>
    <e_dt>' . htmlspecialchars($endDateTime, ENT_XML1) . '</e_dt>
    <op_s_dt>' . htmlspecialchars($startDateTime, ENT_XML1) . '</op_s_dt>
    <op_e_dt>' . htmlspecialchars($endDateTime, ENT_XML1) . '</op_e_dt>
    <su>' . htmlspecialchars($s_user, ENT_XML1) . '</su>
    <sp>' . htmlspecialchars($s_password, ENT_XML1) . '</sp>
    </get_seller_invoices_n>
</soap:Body>
</soap:Envelope>';
        
        error_log("[DEBUG] NSAF Seller Invoices - API Request Parameters:");
        error_log("[DEBUG] - user_id: $user_id");
        error_log("[DEBUG] - un_id: $un_id");
        error_log("[DEBUG] - s_dt: $startDateTime");
        error_log("[DEBUG] - e_dt: $endDateTime");
        error_log("[DEBUG] - op_s_dt: $startDateTime");
        error_log("[DEBUG] - op_e_dt: $endDateTime");
        error_log("[DEBUG] - su: $s_user");
        error_log("[DEBUG] - sp: [HIDDEN]");

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => "https://webserv.rs.ge/specinvoices/SpecInvoicesService.asmx",
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $xml,
            CURLOPT_HTTPHEADER => [
                'Content-Type: text/xml; charset=utf-8',
                'SOAPAction: "http://tempuri.org/get_seller_invoices_n"'
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
        ]);
        
        $response = curl_exec($ch);
        $curl_error = curl_error($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        // Log raw response for debugging
        error_log("[DEBUG] NSAF Seller Invoices - Raw response length: " . strlen($response));
        error_log("[DEBUG] NSAF Seller Invoices - First 10000 chars: " . substr($response, 0, 10000));
        
        if ($curl_error) {
            throw new Exception("cURL Error: $curl_error");
        }
        
        if ($http_code !== 200) {
            throw new Exception("HTTP Error: $http_code");
        }
        
        // Parse response with improved XML cleaning
        $clean_response = $response;
        
        // Remove BOM if present
        if (strpos($clean_response, "\xEF\xBB\xBF") === 0) {
            $clean_response = str_replace("\xEF\xBB\xBF", '', $clean_response);
        }
        
        // Remove null bytes
        $clean_response = str_replace("\x00", '', $clean_response);
        
        // Clean up empty xmlns attributes
        $clean_response = preg_replace('/xmlns=""/', '', $clean_response);
        
        // Fix "null" strings that might be causing issues
        $clean_response = str_replace('>null<', '><', $clean_response);
        
        // Log the cleaned response for debugging
        error_log("[DEBUG] NSAF Seller Invoices - Cleaned XML response length: " . strlen($clean_response));
        error_log("[DEBUG] NSAF Seller Invoices - First 500 chars: " . substr($clean_response, 0, 500));
        
        // Check if response contains data
        if (strpos($clean_response, '<diffgr:diffgram') !== false && strpos($clean_response, '</diffgr:diffgram>') !== false) {
            $diffgram_start = strpos($clean_response, '<diffgr:diffgram');
            $diffgram_end = strpos($clean_response, '</diffgr:diffgram>') + strlen('</diffgr:diffgram>');
            $diffgram_content = substr($clean_response, $diffgram_start, $diffgram_end - $diffgram_start);
            error_log("[DEBUG] NSAF Seller Invoices - Diffgram content: " . $diffgram_content);
        }
        
        libxml_use_internal_errors(true);
        $xmlObj = simplexml_load_string($clean_response);
        
        if ($xmlObj === false) {
            $errors = libxml_get_errors();
            $error_messages = [];
            foreach ($errors as $error) {
                $error_messages[] = trim($error->message);
            }
            error_log("[ERROR] NSAF Seller Invoices XML Parse Errors: " . implode('; ', $error_messages));
            error_log("[ERROR] NSAF Seller Invoices Raw response (first 1000 chars): " . substr($response, 0, 1000));
            throw new Exception("XML Parse Error: " . implode('; ', $error_messages));
        }
        
        // Register namespaces for proper XPath queries
        $xmlObj->registerXPathNamespace('soap', 'http://schemas.xmlsoap.org/soap/envelope/');
        $xmlObj->registerXPathNamespace('diffgr', 'urn:schemas-microsoft-com:xml-diffgram-v1');
        $xmlObj->registerXPathNamespace('msdata', 'urn:schemas-microsoft-com:xml-msdata');
        $xmlObj->registerXPathNamespace('tempuri', 'http://tempuri.org/');
        
        // Check for SOAP faults
        $faults = $xmlObj->xpath('//soap:Fault');
        if (!empty($faults)) {
            $faultString = (string)$faults[0]->faultstring;
            throw new Exception("SOAP Fault: $faultString");
        }
        
        // Extract data from diffgram using proper namespace-aware XPath
        $invoice_nodes = $xmlObj->xpath('//diffgr:diffgram//*[local-name()="invoices"]');
        
        // Fallback: try without diffgr namespace
        if (empty($invoice_nodes)) {
            $invoice_nodes = $xmlObj->xpath('//*[local-name()="invoices"]');
        }
        
        // Additional fallback: try get_seller_invoices_nResult structure
        if (empty($invoice_nodes)) {
            $invoice_nodes = $xmlObj->xpath('//get_seller_invoices_nResult//*[local-name()="invoices"]');
        }
        
        $inserted = 0;
        $updated = 0;
        $skipped = 0;
        
        if (!empty($invoice_nodes)) {
            error_log("[DEBUG] Found " . count($invoice_nodes) . " NSAF seller invoices");
            error_log("[DEBUG] NSAF Seller Invoices - Processing " . count($invoice_nodes) . " records from API");
            
            foreach ($invoice_nodes as $invoice_node) {
                $invoice_data = (array)$invoice_node;
                
                // Convert all field names to UPPERCASE
                $processed_data = [];
                foreach ($invoice_data as $field_name => $field_value) {
                    $field_name = strtoupper($field_name);
                    if ($field_value !== null && $field_value !== '') {
                        $processed_data[$field_name] = (string)$field_value;
                    }
                }
                
                if (empty($processed_data['ID'])) {
                    $skipped++;
                    error_log("[DEBUG] NSAF Seller Invoice skipped - Missing ID field. Available fields: " . implode(', ', array_keys($processed_data)));
                    error_log("[DEBUG] NSAF Seller Invoice skipped - Raw invoice data: " . json_encode($invoice_data));
                    continue;
                }
                
                $external_id = $processed_data['ID'];
                
                // Prepare data for upsert
                $upsert_data = [
                    'EXTERNAL_ID' => $external_id,
                    'COMPANY_ID' => $company_id,
                    'COMPANY_TIN' => $company_tin,
                    'COMPANY_NAME' => $company,
                    'UPDATED_AT' => date('Y-m-d H:i:s')
                ];
                
                // Add all API fields with date validation
                foreach ($processed_data as $field => $value) {
                    if ($field !== 'ID') { // Skip ID as it's already EXTERNAL_ID
                        // Handle date fields using the same approach as working invoice APIs
                        $date_fields = ['OPERATION_DT', 'CALC_DATE', 'TR_ST_DATE', 'REG_DATE', 'REG_DT', 'SSD_DATE', 'SSAF_DATE', 'AGREE_DATE', 'AGREE_DATE_OLD', 'MODIFY_DATE_SELLER', 'MODIFY_DATE_BUYER', 'LAST_UPDATE_DATE', 'YELLOW_PAID_DATE', 'STOPPED_DATE', 'DECL_DATE', 'REF_DATE', 'OVERHEAD_DT'];
                        if (in_array($field, $date_fields) && !empty($value)) {
                            error_log("[DEBUG] NSAF Invoices - Processing date field $field with value: '$value'");
                            try {
                                $date = new DateTime($value);
                                if ($date->format('Y') < 1753) {
                                    error_log("[DEBUG] NSAF Invoices - Date before 1753, setting to null: $field = '$value'");
                                    $upsert_data[$field] = null; // SQL Server doesn't support dates before 1753
                                } else {
                                    $converted_date = $date->format('Y-m-d H:i:s');
                                    error_log("[DEBUG] NSAF Invoices - Date converted: $field '$value' -> '$converted_date'");
                                    $upsert_data[$field] = $converted_date;
                                }
                            } catch (Exception $e) {
                                error_log("[ERROR] NSAF Invoices - Date conversion failed for $field '$value': " . $e->getMessage());
                                $upsert_data[$field] = null; // Set to null on parsing error
                            }
                        } else {
                            $upsert_data[$field] = $value;
                        }
                    }
                }
                
                // Upsert to database
                $fields = array_keys($upsert_data);
                $placeholders = ':' . implode(', :', $fields);
                $update_fields = [];
                foreach ($fields as $field) {
                    if ($field !== 'EXTERNAL_ID') {
                        $update_fields[] = "$field = :$field";
                    }
                }
                
                // Check if record exists first
                $check_sql = "SELECT COUNT(*) FROM rs.spec_seller_invoices WHERE EXTERNAL_ID = :EXTERNAL_ID AND COMPANY_ID = :COMPANY_ID";
                $check_stmt = $pdo->prepare($check_sql);
                $check_stmt->execute(['EXTERNAL_ID' => $upsert_data['EXTERNAL_ID'], 'COMPANY_ID' => $upsert_data['COMPANY_ID']]);
                $record_exists = $check_stmt->fetchColumn() > 0;
                
                if ($record_exists) {
                    // Record exists, try UPDATE with comprehensive approach
                    error_log("[DEBUG] NSAF Seller Invoices - Record exists, attempting UPDATE for EXTERNAL_ID: " . $upsert_data['EXTERNAL_ID']);
                    
                    // Build comprehensive UPDATE query with all fields
                    $update_fields = [];
                    $update_params = [];
                    
                    foreach ($upsert_data as $field => $value) {
                        if ($field !== 'EXTERNAL_ID' && $field !== 'COMPANY_ID') {
                            $update_fields[] = "$field = :$field";
                            $update_params[$field] = $value;
                        }
                    }
                    
                    $update_params['EXTERNAL_ID'] = $upsert_data['EXTERNAL_ID'];
                    $update_params['COMPANY_ID'] = $upsert_data['COMPANY_ID'];
                    
                    $update_sql = "UPDATE rs.spec_seller_invoices SET " . implode(', ', $update_fields) . 
                                 " WHERE EXTERNAL_ID = :EXTERNAL_ID AND COMPANY_ID = :COMPANY_ID";
                    
                    error_log("[DEBUG] NSAF Seller Invoices - UPDATE SQL: " . $update_sql);
                    error_log("[DEBUG] NSAF Seller Invoices - UPDATE Params count: " . count($update_params));
                    
                    try {
                        $update_stmt = $pdo->prepare($update_sql);
                        $update_result = $update_stmt->execute($update_params);
                        
                        if ($update_result) {
                            $updated++;
                            error_log("[DEBUG] NSAF Seller Invoices - Record updated successfully for EXTERNAL_ID: " . $upsert_data['EXTERNAL_ID']);
                        } else {
                            $skipped++;
                            error_log("[ERROR] NSAF Seller Invoices - UPDATE failed for EXTERNAL_ID: " . $upsert_data['EXTERNAL_ID']);
                            error_log("[ERROR] NSAF Seller Invoices - UPDATE SQL: " . $update_sql);
                            error_log("[ERROR] NSAF Seller Invoices - UPDATE Params: " . json_encode($update_params));
                        }
                    } catch (Exception $e) {
                        $skipped++;
                        error_log("[ERROR] NSAF Seller Invoices - UPDATE failed with exception: " . $e->getMessage());
                        error_log("[ERROR] NSAF Seller Invoices - UPDATE SQL: " . $update_sql);
                        error_log("[ERROR] NSAF Seller Invoices - UPDATE Params: " . json_encode($update_params));
                    }
                } else {
                    // Record doesn't exist, try INSERT
                    error_log("[DEBUG] NSAF Seller Invoices - Record doesn't exist, attempting INSERT for EXTERNAL_ID: " . $upsert_data['EXTERNAL_ID']);
                    
                    $insert_sql = "INSERT INTO rs.spec_seller_invoices (" . implode(', ', $fields) . ") VALUES ($placeholders)";
                    error_log("[DEBUG] NSAF Seller Invoices - INSERT SQL: " . $insert_sql);
                    error_log("[DEBUG] NSAF Seller Invoices - INSERT Params count: " . count($upsert_data));
                    error_log("[DEBUG] NSAF Seller Invoices - INSERT Fields: " . implode(', ', $fields));
                    
                    try {
                        $insert_stmt = $pdo->prepare($insert_sql);
                        
                        // Debug: Log all date field values before insert
                        foreach ($upsert_data as $field => $value) {
                            if (in_array($field, ['OPERATION_DT', 'CALC_DATE', 'TR_ST_DATE', 'REG_DATE', 'REG_DT', 'SSD_DATE', 'SSAF_DATE', 'AGREE_DATE', 'AGREE_DATE_OLD', 'MODIFY_DATE_SELLER', 'MODIFY_DATE_BUYER', 'LAST_UPDATE_DATE', 'YELLOW_PAID_DATE', 'STOPPED_DATE', 'DECL_DATE', 'REF_DATE', 'OVERHEAD_DT'])) {
                                error_log("[DEBUG] NSAF Seller Invoices - Date field $field = '$value' (type: " . gettype($value) . ")");
                            }
                        }
                        
                        $insert_result = $insert_stmt->execute($upsert_data);
                        
                        if ($insert_result) {
                            $inserted++;
                            error_log("[DEBUG] NSAF Seller Invoices - New record inserted for EXTERNAL_ID: " . $upsert_data['EXTERNAL_ID']);
                        } else {
                            $skipped++;
                            error_log("[ERROR] NSAF Seller Invoices - INSERT failed for EXTERNAL_ID: " . $upsert_data['EXTERNAL_ID']);
                            error_log("[ERROR] NSAF Seller Invoices - INSERT SQL: " . $insert_sql);
                            error_log("[ERROR] NSAF Seller Invoices - INSERT Params: " . json_encode($upsert_data));
                        }
                    } catch (Exception $e2) {
                        $skipped++;
                        error_log("[ERROR] NSAF Seller Invoices - INSERT failed with exception: " . $e2->getMessage());
                        error_log("[ERROR] NSAF Seller Invoices - INSERT SQL: " . $insert_sql);
                        error_log("[ERROR] NSAF Seller Invoices - INSERT Params: " . json_encode($upsert_data));
                        error_log("[ERROR] NSAF Seller Invoices - Exception details: " . $e2->getTraceAsString());
                    }
                }
            }
        } else {
            error_log("[DEBUG] No NSAF seller invoices found in response");
        }
        
        error_log("[DEBUG] NSAF Seller Invoices Sync Complete - Inserted: $inserted, Updated: $updated, Skipped: $skipped, Total Processed: " . ($inserted + $updated + $skipped));
        
        return [
            'company' => $company,
            'type' => $sync_type,
            'error' => false,
            'message' => "NSAF seller invoices sync completed successfully",
            'inserted' => $inserted,
            'updated' => $updated,
            'skipped' => $skipped,
            'total' => $inserted + $updated + $skipped
        ];
        
    } catch (Exception $e) {
        error_log("[ERROR] NSAF seller invoices sync failed: " . $e->getMessage());
        error_log("[ERROR] Exception type: " . get_class($e));
        error_log("[ERROR] Company: $company, TIN: $company_tin");
        error_log("[ERROR] Stack trace: " . $e->getTraceAsString());
        return [
            'company' => $company,
            'type' => $sync_type,
            'error' => true,
            'message' => "NSAF seller invoices sync failed: " . $e->getMessage(),
            'inserted' => 0,
            'updated' => 0,
            'skipped' => $skipped,
            'total' => 0
        ];
    }
}

/**
 * Sync NSAF Buyer Invoices for Company
 */
function sync_nsaf_buyer_invoices_for_company($pdo, $company, $company_id, $company_tin, $startDate, $endDate) {
    $sync_type = 'nsaf_buyer_invoices';
    error_log("[DEBUG] ===== STARTING $sync_type SYNC =====");
    error_log("[DEBUG] Company: $company");
    error_log("[DEBUG] Company ID: $company_id");
    error_log("[DEBUG] Company TIN: $company_tin");
    error_log("[DEBUG] Date Range: $startDate to $endDate");
    
    try {
        // Get company credentials
        $stmt = $pdo->prepare("SELECT USER_ID, UN_ID, S_USER, S_PASSWORD FROM rs_users WHERE company_name = ?");
        $stmt->execute([$company]);
        $companyData = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$companyData || !$companyData['S_USER'] || !$companyData['S_PASSWORD']) {
            throw new Exception("Company credentials not found or incomplete");
        }
        
        $user_id = $companyData['USER_ID'];
        $un_id = $companyData['UN_ID'];
        $s_user = $companyData['S_USER'];
        $s_password = $companyData['S_PASSWORD'];
        
        // Create SOAP request for get_buyer_invoices_n (with date range support)
        // Format dates for API
        $startDateTime = date('Y-m-d\TH:i:s', strtotime($startDate . ' 00:00:00'));
        $endDateTime = date('Y-m-d\TH:i:s', strtotime($endDate . ' 23:59:59'));
        
        $xml = '<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
    <get_buyer_invoices_n xmlns="http://tempuri.org/">
    <user_id>' . htmlspecialchars($user_id, ENT_XML1) . '</user_id>
    <un_id>' . htmlspecialchars($un_id, ENT_XML1) . '</un_id>
    <s_dt>' . htmlspecialchars($startDateTime, ENT_XML1) . '</s_dt>
    <e_dt>' . htmlspecialchars($endDateTime, ENT_XML1) . '</e_dt>
    <op_s_dt>' . htmlspecialchars($startDateTime, ENT_XML1) . '</op_s_dt>
    <op_e_dt>' . htmlspecialchars($endDateTime, ENT_XML1) . '</op_e_dt>
    <su>' . htmlspecialchars($s_user, ENT_XML1) . '</su>
    <sp>' . htmlspecialchars($s_password, ENT_XML1) . '</sp>
    </get_buyer_invoices_n>
</soap:Body>
</soap:Envelope>';
        
        error_log("[DEBUG] NSAF Buyer Invoices - API Request Parameters:");
        error_log("[DEBUG] - user_id: $user_id");
        error_log("[DEBUG] - un_id: $un_id");
        error_log("[DEBUG] - s_dt: $startDateTime");
        error_log("[DEBUG] - e_dt: $endDateTime");
        error_log("[DEBUG] - op_s_dt: $startDateTime");
        error_log("[DEBUG] - op_e_dt: $endDateTime");
        error_log("[DEBUG] - su: $s_user");
        error_log("[DEBUG] - sp: [HIDDEN]");

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => "https://webserv.rs.ge/specinvoices/SpecInvoicesService.asmx",
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $xml,
            CURLOPT_HTTPHEADER => [
                'Content-Type: text/xml; charset=utf-8',
                'SOAPAction: "http://tempuri.org/get_buyer_invoices_n"'
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
        ]);
        
        $response = curl_exec($ch);
        $curl_error = curl_error($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        // Log raw response for debugging
        error_log("[DEBUG] NSAF Buyer Invoices - Raw response length: " . strlen($response));
        error_log("[DEBUG] NSAF Buyer Invoices - First 10000 chars: " . substr($response, 0, 10000));
        
        if ($curl_error) {
            throw new Exception("cURL Error: $curl_error");
        }
        
        if ($http_code !== 200) {
            throw new Exception("HTTP Error: $http_code");
        }
        
        // Parse response with improved XML cleaning
        $clean_response = $response;
        
        // Remove BOM if present
        if (strpos($clean_response, "\xEF\xBB\xBF") === 0) {
            $clean_response = str_replace("\xEF\xBB\xBF", '', $clean_response);
        }
        
        // Remove null bytes
        $clean_response = str_replace("\x00", '', $clean_response);
        
        // Clean up empty xmlns attributes
        $clean_response = preg_replace('/xmlns=""/', '', $clean_response);
        
        // Fix "null" strings that might be causing issues
        $clean_response = str_replace('>null<', '><', $clean_response);
        
        // Log the cleaned response for debugging
        error_log("[DEBUG] NSAF Buyer Invoices - Cleaned XML response length: " . strlen($clean_response));
        error_log("[DEBUG] NSAF Buyer Invoices - First 500 chars: " . substr($clean_response, 0, 500));
        
        // Check if response contains data
        if (strpos($clean_response, '<diffgr:diffgram') !== false && strpos($clean_response, '</diffgr:diffgram>') !== false) {
            $diffgram_start = strpos($clean_response, '<diffgr:diffgram');
            $diffgram_end = strpos($clean_response, '</diffgr:diffgram>') + strlen('</diffgr:diffgram>');
            $diffgram_content = substr($clean_response, $diffgram_start, $diffgram_end - $diffgram_start);
            error_log("[DEBUG] NSAF Buyer Invoices - Diffgram content: " . $diffgram_content);
        }
        
        libxml_use_internal_errors(true);
        $xmlObj = simplexml_load_string($clean_response);
        
        if ($xmlObj === false) {
            $errors = libxml_get_errors();
            $error_messages = [];
            foreach ($errors as $error) {
                $error_messages[] = trim($error->message);
            }
            error_log("[ERROR] NSAF Buyer Invoices XML Parse Errors: " . implode('; ', $error_messages));
            error_log("[ERROR] NSAF Buyer Invoices Raw response (first 1000 chars): " . substr($response, 0, 1000));
            throw new Exception("XML Parse Error: " . implode('; ', $error_messages));
        }
        
        // Register namespaces for proper XPath queries
        $xmlObj->registerXPathNamespace('soap', 'http://schemas.xmlsoap.org/soap/envelope/');
        $xmlObj->registerXPathNamespace('diffgr', 'urn:schemas-microsoft-com:xml-diffgram-v1');
        $xmlObj->registerXPathNamespace('msdata', 'urn:schemas-microsoft-com:xml-msdata');
        $xmlObj->registerXPathNamespace('tempuri', 'http://tempuri.org/');
        
        // Check for SOAP faults
        $faults = $xmlObj->xpath('//soap:Fault');
        if (!empty($faults)) {
            $faultString = (string)$faults[0]->faultstring;
            throw new Exception("SOAP Fault: $faultString");
        }
        
        // Extract data from diffgram using proper namespace-aware XPath
        $invoice_nodes = $xmlObj->xpath('//diffgr:diffgram//*[local-name()="invoices"]');
        
        // Fallback: try without diffgr namespace
        if (empty($invoice_nodes)) {
            $invoice_nodes = $xmlObj->xpath('//*[local-name()="invoices"]');
        }
        
        // Additional fallback: try get_buyer_invoices_nResult structure
        if (empty($invoice_nodes)) {
            $invoice_nodes = $xmlObj->xpath('//get_buyer_invoices_nResult//*[local-name()="invoices"]');
        }
        
        $inserted = 0;
        $updated = 0;
        $skipped = 0;
        
        if (!empty($invoice_nodes)) {
            error_log("[DEBUG] Found " . count($invoice_nodes) . " NSAF buyer invoices");
            error_log("[DEBUG] NSAF Buyer Invoices - Processing " . count($invoice_nodes) . " records from API");
            
            foreach ($invoice_nodes as $invoice_node) {
                $invoice_data = (array)$invoice_node;
                
                // Convert all field names to UPPERCASE
                $processed_data = [];
                foreach ($invoice_data as $field_name => $field_value) {
                    $field_name = strtoupper($field_name);
                    if ($field_value !== null && $field_value !== '') {
                        $processed_data[$field_name] = (string)$field_value;
                    }
                }
                
                if (empty($processed_data['ID'])) {
                    $skipped++;
                    error_log("[DEBUG] NSAF Buyer Invoice skipped - Missing ID field. Available fields: " . implode(', ', array_keys($processed_data)));
                    error_log("[DEBUG] NSAF Buyer Invoice skipped - Raw invoice data: " . json_encode($invoice_data));
                    continue;
                }
                
                $external_id = $processed_data['ID'];
                
                // Prepare data for upsert
                $upsert_data = [
                    'EXTERNAL_ID' => $external_id,
                    'COMPANY_ID' => $company_id,
                    'COMPANY_TIN' => $company_tin,
                    'COMPANY_NAME' => $company,
                    'UPDATED_AT' => date('Y-m-d H:i:s')
                ];
                
                // Add all API fields with date validation
                foreach ($processed_data as $field => $value) {
                    if ($field !== 'ID') { // Skip ID as it's already EXTERNAL_ID
                        // Handle date fields using the same approach as working invoice APIs
                        $date_fields = ['OPERATION_DT', 'CALC_DATE', 'TR_ST_DATE', 'REG_DATE', 'REG_DT', 'SSD_DATE', 'SSAF_DATE', 'AGREE_DATE', 'AGREE_DATE_OLD', 'MODIFY_DATE_SELLER', 'MODIFY_DATE_BUYER', 'LAST_UPDATE_DATE', 'YELLOW_PAID_DATE', 'STOPPED_DATE', 'DECL_DATE', 'REF_DATE', 'OVERHEAD_DT'];
                        if (in_array($field, $date_fields) && !empty($value)) {
                            error_log("[DEBUG] NSAF Invoices - Processing date field $field with value: '$value'");
                            try {
                                $date = new DateTime($value);
                                if ($date->format('Y') < 1753) {
                                    error_log("[DEBUG] NSAF Invoices - Date before 1753, setting to null: $field = '$value'");
                                    $upsert_data[$field] = null; // SQL Server doesn't support dates before 1753
                                } else {
                                    $converted_date = $date->format('Y-m-d H:i:s');
                                    error_log("[DEBUG] NSAF Invoices - Date converted: $field '$value' -> '$converted_date'");
                                    $upsert_data[$field] = $converted_date;
                                }
                            } catch (Exception $e) {
                                error_log("[ERROR] NSAF Invoices - Date conversion failed for $field '$value': " . $e->getMessage());
                                $upsert_data[$field] = null; // Set to null on parsing error
                            }
                        } else {
                            $upsert_data[$field] = $value;
                        }
                    }
                }
                
                // Upsert to database
                $fields = array_keys($upsert_data);
                $placeholders = ':' . implode(', :', $fields);
                $update_fields = [];
                foreach ($fields as $field) {
                    if ($field !== 'EXTERNAL_ID') {
                        $update_fields[] = "$field = :$field";
                    }
                }
                
                // Check if record exists first
                $check_sql = "SELECT COUNT(*) FROM rs.spec_buyer_invoices WHERE EXTERNAL_ID = :EXTERNAL_ID AND COMPANY_ID = :COMPANY_ID";
                $check_stmt = $pdo->prepare($check_sql);
                $check_stmt->execute(['EXTERNAL_ID' => $upsert_data['EXTERNAL_ID'], 'COMPANY_ID' => $upsert_data['COMPANY_ID']]);
                $record_exists = $check_stmt->fetchColumn() > 0;
                
                if ($record_exists) {
                    // Record exists, try UPDATE with comprehensive approach
                    error_log("[DEBUG] NSAF Buyer Invoices - Record exists, attempting UPDATE for EXTERNAL_ID: " . $upsert_data['EXTERNAL_ID']);
                    
                    // Build comprehensive UPDATE query with all fields
                    $update_fields = [];
                    $update_params = [];
                    
                    foreach ($upsert_data as $field => $value) {
                        if ($field !== 'EXTERNAL_ID' && $field !== 'COMPANY_ID') {
                            $update_fields[] = "$field = :$field";
                            $update_params[$field] = $value;
                        }
                    }
                    
                    $update_params['EXTERNAL_ID'] = $upsert_data['EXTERNAL_ID'];
                    $update_params['COMPANY_ID'] = $upsert_data['COMPANY_ID'];
                    
                    $update_sql = "UPDATE rs.spec_buyer_invoices SET " . implode(', ', $update_fields) . 
                                 " WHERE EXTERNAL_ID = :EXTERNAL_ID AND COMPANY_ID = :COMPANY_ID";
                    
                    error_log("[DEBUG] NSAF Buyer Invoices - UPDATE SQL: " . $update_sql);
                    error_log("[DEBUG] NSAF Buyer Invoices - UPDATE Params count: " . count($update_params));
                    
                    try {
                        $update_stmt = $pdo->prepare($update_sql);
                        $update_result = $update_stmt->execute($update_params);
                        
                        if ($update_result) {
                            $updated++;
                            error_log("[DEBUG] NSAF Buyer Invoices - Record updated successfully for EXTERNAL_ID: " . $upsert_data['EXTERNAL_ID']);
                        } else {
                            $skipped++;
                            error_log("[ERROR] NSAF Buyer Invoices - UPDATE failed for EXTERNAL_ID: " . $upsert_data['EXTERNAL_ID']);
                            error_log("[ERROR] NSAF Buyer Invoices - UPDATE SQL: " . $update_sql);
                            error_log("[ERROR] NSAF Buyer Invoices - UPDATE Params: " . json_encode($update_params));
                        }
                    } catch (Exception $e) {
                        $skipped++;
                        error_log("[ERROR] NSAF Buyer Invoices - UPDATE failed with exception: " . $e->getMessage());
                        error_log("[ERROR] NSAF Buyer Invoices - UPDATE SQL: " . $update_sql);
                        error_log("[ERROR] NSAF Buyer Invoices - UPDATE Params: " . json_encode($update_params));
                    }
                } else {
                    // Record doesn't exist, try INSERT
                    error_log("[DEBUG] NSAF Buyer Invoices - Record doesn't exist, attempting INSERT for EXTERNAL_ID: " . $upsert_data['EXTERNAL_ID']);
                    
                    $insert_sql = "INSERT INTO rs.spec_buyer_invoices (" . implode(', ', $fields) . ") VALUES ($placeholders)";
                    error_log("[DEBUG] NSAF Buyer Invoices - INSERT SQL: " . $insert_sql);
                    error_log("[DEBUG] NSAF Buyer Invoices - INSERT Params count: " . count($upsert_data));
                    error_log("[DEBUG] NSAF Buyer Invoices - INSERT Fields: " . implode(', ', $fields));
                    
                    try {
                        $insert_stmt = $pdo->prepare($insert_sql);
                        
                        // Debug: Log all date field values before insert
                        foreach ($upsert_data as $field => $value) {
                            if (in_array($field, ['OPERATION_DT', 'CALC_DATE', 'TR_ST_DATE', 'REG_DATE', 'REG_DT', 'SSD_DATE', 'SSAF_DATE', 'AGREE_DATE', 'AGREE_DATE_OLD', 'MODIFY_DATE_SELLER', 'MODIFY_DATE_BUYER', 'LAST_UPDATE_DATE', 'YELLOW_PAID_DATE', 'STOPPED_DATE', 'DECL_DATE', 'REF_DATE', 'OVERHEAD_DT'])) {
                                error_log("[DEBUG] NSAF Buyer Invoices - Date field $field = '$value' (type: " . gettype($value) . ")");
                            }
                        }
                        
                        $insert_result = $insert_stmt->execute($upsert_data);
                        
                        if ($insert_result) {
                            $inserted++;
                            error_log("[DEBUG] NSAF Buyer Invoices - New record inserted for EXTERNAL_ID: " . $upsert_data['EXTERNAL_ID']);
                        } else {
                            $skipped++;
                            error_log("[ERROR] NSAF Buyer Invoices - INSERT failed for EXTERNAL_ID: " . $upsert_data['EXTERNAL_ID']);
                            error_log("[ERROR] NSAF Buyer Invoices - INSERT SQL: " . $insert_sql);
                            error_log("[ERROR] NSAF Buyer Invoices - INSERT Params: " . json_encode($upsert_data));
                        }
                    } catch (Exception $e2) {
                        $skipped++;
                        error_log("[ERROR] NSAF Buyer Invoices - INSERT failed with exception: " . $e2->getMessage());
                        error_log("[ERROR] NSAF Buyer Invoices - INSERT SQL: " . $insert_sql);
                        error_log("[ERROR] NSAF Buyer Invoices - INSERT Params: " . json_encode($upsert_data));
                        error_log("[ERROR] NSAF Buyer Invoices - Exception details: " . $e2->getTraceAsString());
                    }
                }
            }
        } else {
            error_log("[DEBUG] No NSAF buyer invoices found in response");
        }
        
        error_log("[DEBUG] NSAF Buyer Invoices Sync Complete - Inserted: $inserted, Updated: $updated, Skipped: $skipped, Total Processed: " . ($inserted + $updated + $skipped));
        
        return [
            'company' => $company,
            'type' => $sync_type,
            'error' => false,
            'message' => "NSAF buyer invoices sync completed successfully",
            'inserted' => $inserted,
            'updated' => $updated,
            'skipped' => $skipped,
            'total' => $inserted + $updated + $skipped
        ];
        
    } catch (Exception $e) {
        error_log("[ERROR] NSAF buyer invoices sync failed: " . $e->getMessage());
        error_log("[ERROR] Exception type: " . get_class($e));
        error_log("[ERROR] Company: $company, TIN: $company_tin");
        error_log("[ERROR] Stack trace: " . $e->getTraceAsString());
        return [
            'company' => $company,
            'type' => $sync_type,
            'error' => true,
            'message' => "NSAF buyer invoices sync failed: " . $e->getMessage(),
            'inserted' => 0,
            'updated' => 0,
            'skipped' => $skipped,
            'total' => 0
        ];
    }
}

/**
 * Sync NSAF Special Goods for Company
 */
function sync_nsaf_special_goods_for_company($pdo, $company, $company_id, $company_tin) {
    $sync_type = 'nsaf_special_goods';
    error_log("[DEBUG] ===== STARTING $sync_type SYNC =====");
    error_log("[DEBUG] Company: $company");
    error_log("[DEBUG] Company ID: $company_id");
    error_log("[DEBUG] Company TIN: $company_tin");
    
    try {
        // Get company credentials
        $stmt = $pdo->prepare("SELECT USER_ID, UN_ID, S_USER, S_PASSWORD FROM rs_users WHERE company_name = ?");
        $stmt->execute([$company]);
        $companyData = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$companyData || !$companyData['S_USER'] || !$companyData['S_PASSWORD']) {
            throw new Exception("Company credentials not found or incomplete");
        }
        
        $user_id = $companyData['USER_ID'];
        $un_id = $companyData['UN_ID'];
        $s_user = $companyData['S_USER'];
        $s_password = $companyData['S_PASSWORD'];
        
        // Create SOAP request for get_spec_products_n
        $xml = '<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
    <get_spec_products_n xmlns="http://tempuri.org/">
    <user_id>' . htmlspecialchars($user_id, ENT_XML1) . '</user_id>
    <un_id>' . htmlspecialchars($un_id, ENT_XML1) . '</un_id>
    <su>' . htmlspecialchars($s_user, ENT_XML1) . '</su>
    <sp>' . htmlspecialchars($s_password, ENT_XML1) . '</sp>
    </get_spec_products_n>
</soap:Body>
</soap:Envelope>';

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => "https://webserv.rs.ge/specinvoices/SpecInvoicesService.asmx",
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $xml,
            CURLOPT_HTTPHEADER => [
                'Content-Type: text/xml; charset=utf-8',
                'SOAPAction: "http://tempuri.org/get_spec_products_n"'
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
        ]);
        
        $response = curl_exec($ch);
        $curl_error = curl_error($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($curl_error) {
            throw new Exception("cURL Error: $curl_error");
        }
        
        if ($http_code !== 200) {
            throw new Exception("HTTP Error: $http_code");
        }
        
        // Parse response with improved XML cleaning
        $clean_response = $response;
        
        // Remove BOM if present
        if (strpos($clean_response, "\xEF\xBB\xBF") === 0) {
            $clean_response = str_replace("\xEF\xBB\xBF", '', $clean_response);
        }
        
        // Remove null bytes
        $clean_response = str_replace("\x00", '', $clean_response);
        
        // Clean up empty xmlns attributes
        $clean_response = preg_replace('/xmlns=""/', '', $clean_response);
        
        // Fix "null" strings that might be causing issues
        $clean_response = str_replace('>null<', '><', $clean_response);
        
        // Log the cleaned response for debugging
        // error_log("[DEBUG] NSAF Special Goods - Cleaned XML response length: " . strlen($clean_response));
        // error_log("[DEBUG] NSAF Special Goods - First 500 chars: " . substr($clean_response, 0, 500));
        
        libxml_use_internal_errors(true);
        $xmlObj = simplexml_load_string($clean_response);
        
        if ($xmlObj === false) {
            $errors = libxml_get_errors();
            $error_messages = [];
            foreach ($errors as $error) {
                $error_messages[] = trim($error->message);
            }
            error_log("[ERROR] NSAF Special Goods XML Parse Errors: " . implode('; ', $error_messages));
            error_log("[ERROR] NSAF Special Goods Raw response (first 1000 chars): " . substr($response, 0, 1000));
            throw new Exception("XML Parse Error: " . implode('; ', $error_messages));
        }
        
        // Register namespaces for proper XPath queries
        $xmlObj->registerXPathNamespace('soap', 'http://schemas.xmlsoap.org/soap/envelope/');
        $xmlObj->registerXPathNamespace('diffgr', 'urn:schemas-microsoft-com:xml-diffgram-v1');
        $xmlObj->registerXPathNamespace('msdata', 'urn:schemas-microsoft-com:xml-msdata');
        $xmlObj->registerXPathNamespace('tempuri', 'http://tempuri.org/');
        
        // Check for SOAP faults
        $faults = $xmlObj->xpath('//soap:Fault');
        if (!empty($faults)) {
            $faultString = (string)$faults[0]->faultstring;
            throw new Exception("SOAP Fault: $faultString");
        }
        
        // Extract data from diffgram using proper namespace-aware XPath
        $goods_nodes = $xmlObj->xpath('//diffgr:diffgram//*[local-name()="spec_products"]');
        
        // Fallback: try without diffgr namespace
        if (empty($goods_nodes)) {
            $goods_nodes = $xmlObj->xpath('//*[local-name()="spec_products"]');
        }
        $inserted = 0;
        $updated = 0;
        $skipped = 0;
        
        if (!empty($goods_nodes)) {
            // error_log("[DEBUG] Found " . count($goods_nodes) . " NSAF special goods");
            
            foreach ($goods_nodes as $goods_node) {
                $goods_data = (array)$goods_node;
                
                // Convert all field names to UPPERCASE
                $processed_data = [];
                foreach ($goods_data as $field_name => $field_value) {
                    $field_name = strtoupper($field_name);
                    if ($field_value !== null && $field_value !== '') {
                        $processed_data[$field_name] = (string)$field_value;
                    }
                }
                
                // Debug: Log all fields found in this record
                // error_log("[DEBUG] NSAF Special Goods - Raw fields from API: " . implode(', ', array_keys($goods_data)));
                // error_log("[DEBUG] NSAF Special Goods - Raw field values: " . json_encode($goods_data));
                // error_log("[DEBUG] NSAF Special Goods - Processed fields: " . implode(', ', array_keys($processed_data)));
                // error_log("[DEBUG] NSAF Special Goods - Processed field values: " . json_encode($processed_data));
                
                if (empty($processed_data['ID'])) {
                    $skipped++;
                    // error_log("[DEBUG] NSAF Special Goods skipped - Missing ID field. Available fields: " . implode(', ', array_keys($processed_data)));
                    continue;
                }
                
                $external_id = $processed_data['ID'];
                
                // Prepare data for upsert
                $upsert_data = [
                    'EXTERNAL_ID' => $external_id,
                    'COMPANY_ID' => $company_id,
                    'COMPANY_TIN' => $company_tin,
                    'COMPANY_NAME' => $company,
                    'UPDATED_AT' => date('Y-m-d H:i:s')
                ];
                
                // Add all API fields (only ID is handled separately as EXTERNAL_ID)
                foreach ($processed_data as $field => $value) {
                    if ($field === 'ID') {
                        // Skip ID as it's already handled as EXTERNAL_ID
                        continue;
                    }
                    
                    
                    // All other fields are safe to use as-is
                    $upsert_data[$field] = $value;
                }
                
                // error_log("[DEBUG] NSAF Special Goods - Processing EXTERNAL_ID: $external_id, Fields: " . implode(', ', array_keys($upsert_data)));
                
                // Upsert to database
                $fields = array_keys($upsert_data);
                $placeholders = ':' . implode(', :', $fields);
                $update_fields = [];
                foreach ($fields as $field) {
                    if ($field !== 'EXTERNAL_ID') {
                        // Check for SQL reserved words and problematic field names
                        $sql_reserved_words = ['COUNT', 'ORDER', 'GROUP', 'SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP', 'TABLE', 'INDEX', 'VIEW'];
                        if (in_array(strtoupper($field), $sql_reserved_words)) {
                            error_log("[DEBUG] NSAF Special Goods - Skipping SQL reserved word field: $field");
                            continue;
                        }
                        $update_fields[] = "$field = :$field";
                    }
                }
                
                // Ensure we have fields to work with
                if (empty($fields)) {
                    error_log("[ERROR] NSAF Special Goods - No fields to process for EXTERNAL_ID: $external_id");
                    $skipped++;
                    continue;
                }
                
                if (empty($update_fields)) {
                    error_log("[ERROR] NSAF Special Goods - No update fields for EXTERNAL_ID: $external_id");
                    $skipped++;
                    continue;
                }
                
                // Check if table columns match our fields
                try {
                    $check_columns = $pdo->query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'spec_invoice_goods' AND TABLE_SCHEMA = 'rs'");
                    $table_columns = [];
                    while ($row = $check_columns->fetch(PDO::FETCH_ASSOC)) {
                        $table_columns[] = $row['COLUMN_NAME'];
                    }
                    error_log("[DEBUG] NSAF Special Goods - Table columns: " . implode(', ', $table_columns));
                    
                    // Filter fields to only include those that exist in the table
                    $valid_fields = [];
                    $valid_update_fields = [];
                    
                    foreach ($fields as $field) {
                        if (in_array($field, $table_columns)) {
                            $valid_fields[] = $field;
                        } else {
                            error_log("[WARNING] NSAF Special Goods - Field '$field' does not exist in table, skipping");
                        }
                    }
                    
                    foreach ($update_fields as $update_field) {
                        // Extract field name from "field = :field" format
                        if (preg_match('/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*:[a-zA-Z_][a-zA-Z0-9_]*$/', $update_field, $matches)) {
                            $field_name = $matches[1];
                            if (in_array($field_name, $table_columns)) {
                                $valid_update_fields[] = $update_field;
                            } else {
                                error_log("[WARNING] NSAF Special Goods - Update field '$field_name' does not exist in table, skipping");
                            }
                        }
                    }
                    
                    if (empty($valid_fields) || empty($valid_update_fields)) {
                        error_log("[ERROR] NSAF Special Goods - No valid fields to process for EXTERNAL_ID: $external_id");
                        $skipped++;
                        continue;
                    }
                    
                    $fields = $valid_fields;
                    $update_fields = $valid_update_fields;
                    
                } catch (Exception $e) {
                    error_log("[ERROR] NSAF Special Goods - Could not check table columns: " . $e->getMessage());
                }
                
                // Debug: Log the data being used
                error_log("[DEBUG] NSAF Special Goods - Data: " . json_encode($upsert_data));
                error_log("[DEBUG] NSAF Special Goods - Fields being processed: " . implode(', ', array_keys($upsert_data)));
                error_log("[DEBUG] NSAF Special Goods - Update fields: " . implode(', ', $update_fields));
                
                // Check if table exists before attempting operations
                try {
                    $check_stmt = $pdo->query("SELECT COUNT(*) FROM rs.spec_invoice_goods");
                    error_log("[DEBUG] NSAF Special Goods - Table exists, proceeding with UPDATE/INSERT");
                } catch (Exception $e) {
                    error_log("[ERROR] NSAF Special Goods - Table does not exist: " . $e->getMessage());
                    throw new Exception("Table rs.spec_invoice_goods does not exist. Please create it first using check_tables.php");
                }
                
                // Check if record exists first
                $check_sql = "SELECT COUNT(*) FROM rs.spec_invoice_goods WHERE EXTERNAL_ID = :EXTERNAL_ID AND COMPANY_ID = :COMPANY_ID";
                $check_stmt = $pdo->prepare($check_sql);
                $check_stmt->execute(['EXTERNAL_ID' => $upsert_data['EXTERNAL_ID'], 'COMPANY_ID' => $upsert_data['COMPANY_ID']]);
                $record_exists = $check_stmt->fetchColumn() > 0;
                
                if ($record_exists) {
                    // Record exists, try UPDATE with simplified approach
                    error_log("[DEBUG] NSAF Special Goods - Record exists, attempting UPDATE for EXTERNAL_ID: " . $upsert_data['EXTERNAL_ID']);
                    
                    // Break down UPDATE into smaller, simpler statements to avoid ODBC issues
                    $update_queries = [
                        [
                            'sql' => "UPDATE rs.spec_invoice_goods SET COMPANY_TIN = :COMPANY_TIN, COMPANY_NAME = :COMPANY_NAME, UPDATED_AT = :UPDATED_AT WHERE EXTERNAL_ID = :EXTERNAL_ID AND COMPANY_ID = :COMPANY_ID",
                            'params' => ['EXTERNAL_ID', 'COMPANY_ID', 'COMPANY_TIN', 'COMPANY_NAME', 'UPDATED_AT']
                        ],
                        [
                            'sql' => "UPDATE rs.spec_invoice_goods SET GOODS_NAME = :GOODS_NAME WHERE EXTERNAL_ID = :EXTERNAL_ID AND COMPANY_ID = :COMPANY_ID",
                            'params' => ['EXTERNAL_ID', 'COMPANY_ID', 'GOODS_NAME']
                        ],
                        [
                            'sql' => "UPDATE rs.spec_invoice_goods SET SSN_CODE = :SSN_CODE, SSF_CODE = :SSF_CODE WHERE EXTERNAL_ID = :EXTERNAL_ID AND COMPANY_ID = :COMPANY_ID",
                            'params' => ['EXTERNAL_ID', 'COMPANY_ID', 'SSN_CODE', 'SSF_CODE']
                        ],
                        [
                            'sql' => "UPDATE rs.spec_invoice_goods SET EXCISE_RATE = :EXCISE_RATE WHERE EXTERNAL_ID = :EXTERNAL_ID AND COMPANY_ID = :COMPANY_ID",
                            'params' => ['EXTERNAL_ID', 'COMPANY_ID', 'EXCISE_RATE']
                        ],
                        [
                            'sql' => "UPDATE rs.spec_invoice_goods SET SSN_CODE_OLD = :SSN_CODE_OLD, DISPLAY_NAME = :DISPLAY_NAME WHERE EXTERNAL_ID = :EXTERNAL_ID AND COMPANY_ID = :COMPANY_ID",
                            'params' => ['EXTERNAL_ID', 'COMPANY_ID', 'SSN_CODE_OLD', 'DISPLAY_NAME']
                        ]
                    ];
                    
                    $update_success = true;
                    foreach ($update_queries as $query) {
                        try {
                            // Extract only the parameters needed for this query
                            $query_data = [];
                            foreach ($query['params'] as $param) {
                                if (isset($upsert_data[$param])) {
                                    $query_data[$param] = $upsert_data[$param];
                                }
                            }
                            
                            $update_stmt = $pdo->prepare($query['sql']);
                            $update_result = $update_stmt->execute($query_data);
                            if (!$update_result) {
                                error_log("[WARNING] NSAF Special Goods - Partial UPDATE failed: " . $query['sql']);
                                $update_success = false;
                            }
                        } catch (Exception $e) {
                            error_log("[WARNING] NSAF Special Goods - Partial UPDATE failed: " . $e->getMessage());
                            $update_success = false;
                        }
                    }
                    
                    if ($update_success) {
                        $updated++;
                        error_log("[DEBUG] NSAF Special Goods - Record updated successfully for EXTERNAL_ID: " . $upsert_data['EXTERNAL_ID']);
                    } else {
                        $skipped++;
                        error_log("[DEBUG] NSAF Special Goods - UPDATE partially failed, skipped EXTERNAL_ID: " . $upsert_data['EXTERNAL_ID']);
                    }
                } else {
                    // Record doesn't exist, try INSERT
                    error_log("[DEBUG] NSAF Special Goods - Record doesn't exist, attempting INSERT for EXTERNAL_ID: " . $upsert_data['EXTERNAL_ID']);
                    
                    $insert_sql = "INSERT INTO rs.spec_invoice_goods (" . implode(', ', $fields) . ") VALUES ($placeholders)";
                    error_log("[DEBUG] NSAF Special Goods - INSERT SQL: " . $insert_sql);
                    
                    try {
                        $insert_stmt = $pdo->prepare($insert_sql);
                        $insert_result = $insert_stmt->execute($upsert_data);
                        $inserted++;
                        error_log("[DEBUG] NSAF Special Goods - New record inserted for EXTERNAL_ID: " . $upsert_data['EXTERNAL_ID']);
                    } catch (Exception $e2) {
                        error_log("[ERROR] NSAF Special Goods - INSERT failed: " . $e2->getMessage());
                        $skipped++;
                        error_log("[DEBUG] NSAF Special Goods - Skipped record with EXTERNAL_ID: " . $upsert_data['EXTERNAL_ID']);
                    }
                }
            }
        } else {
            error_log("[DEBUG] No NSAF special goods found in response");
        }
        
        error_log("[DEBUG] NSAF Special Goods Sync Complete - Inserted: $inserted, Updated: $updated, Skipped: $skipped, Total Processed: " . ($inserted + $updated + $skipped));
        
        return [
            'company' => $company,
            'type' => $sync_type,
            'error' => false,
            'message' => "NSAF special goods sync completed successfully",
            'inserted' => $inserted,
            'updated' => $updated,
            'skipped' => $skipped,
            'total' => $inserted + $updated + $skipped
        ];
        
    } catch (Exception $e) {
        error_log("[ERROR] NSAF special goods sync failed: " . $e->getMessage());
        error_log("[ERROR] Exception type: " . get_class($e));
        error_log("[ERROR] Company: $company, TIN: $company_tin");
        error_log("[ERROR] Stack trace: " . $e->getTraceAsString());
        return [
            'company' => $company,
            'type' => $sync_type,
            'error' => true,
            'message' => "NSAF special goods sync failed: " . $e->getMessage(),
            'inserted' => 0,
            'updated' => 0,
            'skipped' => $skipped,
            'total' => 0
        ];
    }
}
