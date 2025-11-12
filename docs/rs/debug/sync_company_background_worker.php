<?php
/**
 * Background Worker for RS Sync Jobs
 * This script runs in the background to perform sync operations
 * Usage: php sync_company_background_worker.php <job_id>
 */

// Get job ID from command line
$jobId = $argv[1] ?? null;

if (!$jobId) {
    error_log('[BACKGROUND WORKER] No job ID provided');
    exit(1);
}

error_log("[BACKGROUND WORKER] Starting job: $jobId");

// Set unlimited execution time for background jobs
set_time_limit(0);
ini_set('memory_limit', '2G');
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Log all errors to the error log
ini_set('log_errors', 1);

error_log("[BACKGROUND WORKER] PHP Version: " . PHP_VERSION);
error_log("[BACKGROUND WORKER] Working directory: " . getcwd());
error_log("[BACKGROUND WORKER] Script directory: " . __DIR__);

// Don't start a session for background jobs
// Define constants to prevent session start and login checks in CLI mode
if (!defined('NO_LOGIN_CHECK')) {
    define('NO_LOGIN_CHECK', true);
}

// Start a minimal session for compatibility (but don't redirect)
if (session_status() === PHP_SESSION_NONE) {
    // In CLI mode, sessions work differently - just initialize the $_SESSION array
    $_SESSION = [];
    $_SESSION['user_id'] = 1; // Fake user ID for background jobs
    $_SESSION['username'] = 'background_worker';
    $_SESSION['role'] = '1'; // Admin role
}

error_log("[BACKGROUND WORKER] Session initialized for CLI mode");

try {
    error_log("[BACKGROUND WORKER] Loading functions.php");
    
    // Capture any output during require
    ob_start();
    $loadResult = require_once __DIR__ . '/../../functions.php';
    $output = ob_get_clean();
    
    if ($output) {
        error_log("[BACKGROUND WORKER] Output during functions.php load: " . $output);
    }
    
    error_log("[BACKGROUND WORKER] Functions loaded successfully");
} catch (Exception $e) {
    error_log("[BACKGROUND WORKER] FATAL: Failed to load functions.php: " . $e->getMessage());
    error_log("[BACKGROUND WORKER] Exception trace: " . $e->getTraceAsString());
    exit(1);
} catch (Error $e) {
    error_log("[BACKGROUND WORKER] FATAL PHP Error loading functions.php: " . $e->getMessage());
    error_log("[BACKGROUND WORKER] Error in file: " . $e->getFile() . " line " . $e->getLine());
    error_log("[BACKGROUND WORKER] Error trace: " . $e->getTraceAsString());
    exit(1);
}

try {
    error_log("[BACKGROUND WORKER] Loading database.php");
    require_once __DIR__ . '/../../backend/database.php';
    error_log("[BACKGROUND WORKER] Database module loaded successfully");
} catch (Exception $e) {
    error_log("[BACKGROUND WORKER] FATAL: Failed to load database.php: " . $e->getMessage());
    exit(1);
}

try {
    error_log("[BACKGROUND WORKER] Connecting to database");
    $pdo = getDatabaseConnection();
    error_log("[BACKGROUND WORKER] Database connected successfully");
    
    // Get job details
    $stmt = $pdo->prepare("
        SELECT 
            JOB_ID,
            USER_ID,
            COMPANY_NAME,
            COMPANY_TIN,
            START_DATE,
            END_DATE,
            AUTO_ASSOCIATE,
            STATUS
        FROM [dbo].[rs_sync_jobs]
        WHERE JOB_ID = ?
    ");
    $stmt->execute([$jobId]);
    $job = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$job) {
        error_log("[BACKGROUND WORKER] Job not found: $jobId");
        exit(1);
    }
    
    if ($job['STATUS'] === 'cancelled') {
        error_log("[BACKGROUND WORKER] Job already cancelled: $jobId");
        exit(0);
    }
    
    // Update job status to running
    updateJobStatus($pdo, $jobId, 'running', 0, 'Starting sync...');
    $stmt = $pdo->prepare("UPDATE [dbo].[rs_sync_jobs] SET STARTED_AT = GETDATE() WHERE JOB_ID = ?");
    $stmt->execute([$jobId]);
    
    $displayName = $job['COMPANY_NAME']; // For display only
    $companyTin = $job['COMPANY_TIN'];
    $startDate = $job['START_DATE'];
    $endDate = $job['END_DATE'];
    $autoAssociate = $job['AUTO_ASSOCIATE'];
    
    if (!$companyTin) {
        throw new Exception("Job missing COMPANY_TIN - cannot proceed");
    }
    
    error_log("[BACKGROUND WORKER] Syncing company: $displayName (TIN: $companyTin, $startDate to $endDate)");
    
    // Include the sync functions
    require_once __DIR__ . '/sync_company_data_optimized.php';
    
    // Get company info using TIN (TIN is the source of truth)
    $stmt = $pdo->prepare("SELECT id, company_tin, company_name, un_id FROM rs_users WHERE company_tin = ?");
    $stmt->execute([$companyTin]);
    $companyInfo = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$companyInfo) {
        throw new Exception("Company not found in rs_users with TIN: $companyTin");
    }
    
    // Use the company_name from rs_users for API calls (guaranteed correct)
    $companyName = $companyInfo['company_name'];
    error_log("[BACKGROUND WORKER] Using company_name from rs_users: $companyName");
    
    $company_id = $companyInfo['id'];
    $company_tin = $companyInfo['company_tin'];
    
    $allResults = [];
    $totalSteps = 11; // Total sync steps (including VAT payer check)
    $currentStep = 0;
    
    // Step 1: Sync seller waybills
    updateJobStatus($pdo, $jobId, 'running', 10, 'Syncing seller waybills...');
    $result = sync_waybills_for_company($pdo, $companyName, $company_id, $company_tin, $startDate, $endDate, 'seller');
    $allResults['seller_waybills'] = $result;
    $currentStep++;
    
    // Check if cancelled
    if (isJobCancelled($pdo, $jobId)) {
        throw new Exception('Job cancelled by user');
    }
    
    // Step 2: Sync buyer waybills
    updateJobStatus($pdo, $jobId, 'running', 20, 'Syncing buyer waybills...');
    $result = sync_waybills_for_company($pdo, $companyName, $company_id, $company_tin, $startDate, $endDate, 'buyer');
    $allResults['buyer_waybills'] = $result;
    $currentStep++;
    
    if (isJobCancelled($pdo, $jobId)) {
        throw new Exception('Job cancelled by user');
    }
    
    // Step 3: Sync seller waybill goods
    updateJobStatus($pdo, $jobId, 'running', 30, 'Syncing seller waybill goods...');
    $result = sync_waybill_goods_for_company($pdo, $companyName, $company_id, $company_tin, $startDate, $endDate, 'seller');
    $allResults['seller_waybill_goods'] = $result;
    $currentStep++;
    
    if (isJobCancelled($pdo, $jobId)) {
        throw new Exception('Job cancelled by user');
    }
    
    // Step 4: Sync buyer waybill goods
    updateJobStatus($pdo, $jobId, 'running', 40, 'Syncing buyer waybill goods...');
    $result = sync_waybill_goods_for_company($pdo, $companyName, $company_id, $company_tin, $startDate, $endDate, 'buyer');
    $allResults['buyer_waybill_goods'] = $result;
    $currentStep++;
    
    if (isJobCancelled($pdo, $jobId)) {
        throw new Exception('Job cancelled by user');
    }
    
    // Step 5: Sync seller invoices
    updateJobStatus($pdo, $jobId, 'running', 50, 'Syncing seller invoices...');
    $result = sync_invoices_for_company($pdo, $companyName, $company_id, $company_tin, $startDate, $endDate, 'seller');
    $allResults['seller_invoices'] = $result;
    $currentStep++;
    
    if (isJobCancelled($pdo, $jobId)) {
        throw new Exception('Job cancelled by user');
    }
    
    // Step 6: Sync buyer invoices
    updateJobStatus($pdo, $jobId, 'running', 60, 'Syncing buyer invoices...');
    $result = sync_invoices_for_company($pdo, $companyName, $company_id, $company_tin, $startDate, $endDate, 'buyer');
    $allResults['buyer_invoices'] = $result;
    $currentStep++;
    
    if (isJobCancelled($pdo, $jobId)) {
        throw new Exception('Job cancelled by user');
    }
    
    // Step 7: Sync invoice goods
    updateJobStatus($pdo, $jobId, 'running', 70, 'Syncing invoice goods...');
    $result = sync_invoice_goods_for_company($pdo, $companyName, $company_id, $company_tin);
    $allResults['invoice_goods'] = $result;
    $currentStep++;
    
    if (isJobCancelled($pdo, $jobId)) {
        throw new Exception('Job cancelled by user');
    }
    
    // Step 8: Sync NSAF seller invoices
    updateJobStatus($pdo, $jobId, 'running', 80, 'Syncing NSAF seller invoices...');
    $result = sync_nsaf_seller_invoices_for_company($pdo, $companyName, $company_id, $company_tin, $startDate, $endDate);
    $allResults['nsaf_seller_invoices'] = $result;
    $currentStep++;
    
    if (isJobCancelled($pdo, $jobId)) {
        throw new Exception('Job cancelled by user');
    }
    
    // Step 9: Sync NSAF buyer invoices
    updateJobStatus($pdo, $jobId, 'running', 85, 'Syncing NSAF buyer invoices...');
    $result = sync_nsaf_buyer_invoices_for_company($pdo, $companyName, $company_id, $company_tin, $startDate, $endDate);
    $allResults['nsaf_buyer_invoices'] = $result;
    $currentStep++;
    
    if (isJobCancelled($pdo, $jobId)) {
        throw new Exception('Job cancelled by user');
    }
    
    // Step 10: Sync NSAF special goods
    updateJobStatus($pdo, $jobId, 'running', 90, 'Syncing NSAF special goods...');
    $result = sync_nsaf_special_goods_for_company($pdo, $companyName, $company_id, $company_tin);
    $allResults['nsaf_special_goods'] = $result;
    $currentStep++;
    
    // Auto-associate if requested
    if ($autoAssociate) {
        updateJobStatus($pdo, $jobId, 'running', 90, 'Auto-associating invoices with waybills...');
        $result = auto_associate_invoices_with_waybills($pdo, $companyName, $company_id);
        $allResults['auto_associate'] = $result;
    }
    
    // Step: Check and update VAT payer status
    updateJobStatus($pdo, $jobId, 'running', 95, 'Checking VAT payer status...');
    $vatPayerStatus = check_company_vat_payer_status($pdo, $companyName, $company_tin);
    $vatUpdateResult = update_waybills_vat_payer_status($pdo, $company_tin, $vatPayerStatus);
    $allResults['vat_payer_status'] = $vatUpdateResult;
    
    // Job completed successfully
    updateJobStatus($pdo, $jobId, 'completed', 100, 'Sync completed successfully');
    
    // Store results using prepared statement to avoid SQL injection
    $stmt = $pdo->prepare("
        UPDATE [dbo].[rs_sync_jobs] 
        SET RESULT_DATA = ?,
            COMPLETED_AT = GETDATE()
        WHERE JOB_ID = ?
    ");
    $stmt->execute([json_encode($allResults), $jobId]);
    
    error_log("[BACKGROUND WORKER] Job completed successfully: $jobId");
    
} catch (Exception $e) {
    error_log("[BACKGROUND WORKER] Job failed: $jobId - " . $e->getMessage());
    error_log("[BACKGROUND WORKER] Stack trace: " . $e->getTraceAsString());
    
    // Update job status to failed
    try {
        if (isset($pdo)) {
            updateJobStatus($pdo, $jobId, 'failed', null, 'Error: ' . $e->getMessage(), $e->getMessage());
            $stmt = $pdo->prepare("UPDATE [dbo].[rs_sync_jobs] SET COMPLETED_AT = GETDATE() WHERE JOB_ID = ?");
            $stmt->execute([$jobId]);
            error_log("[BACKGROUND WORKER] Job status updated to failed");
        } else {
            error_log("[BACKGROUND WORKER] Cannot update job status - no database connection");
        }
    } catch (Exception $updateEx) {
        error_log("[BACKGROUND WORKER] Failed to update job status: " . $updateEx->getMessage());
    }
    
    exit(1);
} catch (Error $e) {
    // Catch PHP errors (like fatal errors)
    error_log("[BACKGROUND WORKER] PHP Error in job: $jobId - " . $e->getMessage());
    error_log("[BACKGROUND WORKER] Error trace: " . $e->getTraceAsString());
    exit(1);
}

/**
 * Update job status in database
 */
function updateJobStatus($pdo, $jobId, $status, $progress = null, $currentStep = null, $errorMessage = null) {
    try {
        $sql = "UPDATE [dbo].[rs_sync_jobs] SET STATUS = ?, UPDATED_AT = GETDATE()";
        $params = [$status];
        
        if ($progress !== null) {
            $sql .= ", PROGRESS = ?";
            $params[] = $progress;
        }
        
        if ($currentStep !== null) {
            $sql .= ", CURRENT_STEP = ?";
            $params[] = $currentStep;
        }
        
        if ($errorMessage !== null) {
            $sql .= ", ERROR_MESSAGE = ?";
            $params[] = $errorMessage;
        }
        
        $sql .= " WHERE JOB_ID = ?";
        $params[] = $jobId;
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
    } catch (Exception $e) {
        error_log("[BACKGROUND WORKER] Failed to update job status: " . $e->getMessage());
    }
}

/**
 * Check if job was cancelled
 */
function isJobCancelled($pdo, $jobId) {
    try {
        $stmt = $pdo->prepare("SELECT STATUS FROM [dbo].[rs_sync_jobs] WHERE JOB_ID = ?");
        $stmt->execute([$jobId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row && $row['STATUS'] === 'cancelled';
    } catch (Exception $e) {
        error_log("[BACKGROUND WORKER] Failed to check job status: " . $e->getMessage());
        return false;
    }
}
