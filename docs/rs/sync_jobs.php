<?php
/**
 * RS Sync Background Jobs Manager
 * Handles starting, monitoring, and tracking sync jobs
 */

ini_set('display_errors', 0);
error_reporting(E_ALL);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../functions.php';
require_once __DIR__ . '/../backend/database.php';

header('Content-Type: application/json');

// Check if user is logged in
if (!isLoggedIn()) {
    http_response_code(401);
    echo json_encode(['error' => true, 'message' => 'User not logged in']);
    exit;
}

$action = $_GET['action'] ?? $_POST['action'] ?? null;

try {
    $pdo = getDatabaseConnection();
    
    switch ($action) {
        case 'start':
            // Start a new sync job
            $postData = json_decode(file_get_contents('php://input'), true);
            $companyName = $postData['company_name'] ?? null; // For display only
            $companyTin = $postData['company_tin'] ?? null;
            $startDate = $postData['start_date'] ?? date('Y-m-d', strtotime('-1 month'));
            $endDate = $postData['end_date'] ?? date('Y-m-d');
            $autoAssociate = $postData['auto_associate'] ?? true;
            
            // Only TIN is required - name is just for display
            if (!$companyTin) {
                http_response_code(400);
                echo json_encode(['error' => true, 'message' => 'Company TIN is required']);
                exit;
            }
            
            // Get actual company name from rs_users by TIN
            $stmt = $pdo->prepare("SELECT company_name FROM rs_users WHERE company_tin = ?");
            $stmt->execute([$companyTin]);
            $rsCompany = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$rsCompany) {
                http_response_code(404);
                echo json_encode(['error' => true, 'message' => 'Company not found in rs_users with TIN: ' . $companyTin]);
                exit;
            }
            
            // Use the actual name from rs_users (guaranteed to match)
            $companyName = $rsCompany['company_name'];
            
            // Create job record
            $jobId = uniqid('sync_', true);
            $userId = $_SESSION['user_id'];
            $username = $_SESSION['username'] ?? 'Unknown';
            
            // Create jobs table if it doesn't exist
            $createTableSQL = "
                IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'rs_sync_jobs' AND schema_id = SCHEMA_ID('dbo'))
                BEGIN
                    CREATE TABLE [dbo].[rs_sync_jobs] (
                        JOB_ID NVARCHAR(100) PRIMARY KEY,
                        USER_ID INT NOT NULL,
                        USERNAME NVARCHAR(100) NULL,
                        COMPANY_NAME NVARCHAR(255) NOT NULL,
                        COMPANY_TIN NVARCHAR(50) NULL,
                        START_DATE NVARCHAR(50) NULL,
                        END_DATE NVARCHAR(50) NULL,
                        AUTO_ASSOCIATE BIT NULL,
                        STATUS NVARCHAR(50) NOT NULL DEFAULT 'pending',
                        PROGRESS INT DEFAULT 0,
                        CURRENT_STEP NVARCHAR(255) NULL,
                        TOTAL_RECORDS INT DEFAULT 0,
                        PROCESSED_RECORDS INT DEFAULT 0,
                        ERROR_MESSAGE NVARCHAR(MAX) NULL,
                        RESULT_DATA NVARCHAR(MAX) NULL,
                        CREATED_AT DATETIME2 DEFAULT GETDATE(),
                        STARTED_AT DATETIME2 NULL,
                        COMPLETED_AT DATETIME2 NULL,
                        UPDATED_AT DATETIME2 DEFAULT GETDATE()
                    )
                END
            ";
            $pdo->exec($createTableSQL);
            
            // Add COMPANY_TIN column if it doesn't exist (for existing tables)
            $alterTableSQL = "
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[dbo].[rs_sync_jobs]') AND name = 'COMPANY_TIN')
                BEGIN
                    ALTER TABLE [dbo].[rs_sync_jobs] ADD COMPANY_TIN NVARCHAR(50) NULL
                END
            ";
            $pdo->exec($alterTableSQL);
            
            // Insert job record
            $insertSQL = "
                INSERT INTO [dbo].[rs_sync_jobs] 
                (JOB_ID, USER_ID, USERNAME, COMPANY_NAME, COMPANY_TIN, START_DATE, END_DATE, AUTO_ASSOCIATE, STATUS, CREATED_AT)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', GETDATE())
            ";
            $stmt = $pdo->prepare($insertSQL);
            $stmt->execute([
                $jobId,
                $userId,
                $username,
                $companyName,
                $companyTin,
                $startDate,
                $endDate,
                $autoAssociate ? 1 : 0
            ]);
            
            // Start background process
            $scriptPath = __DIR__ . '/debug/sync_company_background_worker.php';
            $logPath = __DIR__ . '/../logs/sync_jobs/' . $jobId . '.log';
            
            // Create logs directory if it doesn't exist
            $logDir = dirname($logPath);
            if (!is_dir($logDir)) {
                if (!@mkdir($logDir, 0775, true)) {
                    // Fallback: try to create without full path
                    $parentDir = __DIR__ . '/../logs';
                    if (!is_dir($parentDir)) {
                        @mkdir($parentDir, 0775, true);
                    }
                    @mkdir($logDir, 0775, true);
                }
            }
            
            // Build command to run in background
            // Find PHP CLI binary (not PHP-FPM)
            $phpBinary = PHP_BINARY;
            
            // If PHP_BINARY is php-fpm, find the CLI version
            if (strpos($phpBinary, 'php-fpm') !== false) {
                // Try common PHP CLI locations
                $possiblePaths = [
                    '/usr/bin/php8.1',
                    '/usr/bin/php8.2',
                    '/usr/bin/php',
                    '/usr/local/bin/php',
                    str_replace('php-fpm', 'php', $phpBinary),
                    str_replace('/sbin/', '/bin/', str_replace('php-fpm', 'php', $phpBinary))
                ];
                
                foreach ($possiblePaths as $path) {
                    if (file_exists($path) && is_executable($path)) {
                        $phpBinary = $path;
                        error_log("[SYNC JOBS] Found PHP CLI: $phpBinary");
                        break;
                    }
                }
            }
            
            // Log command for debugging
            error_log("[SYNC JOBS] PHP Binary: $phpBinary");
            error_log("[SYNC JOBS] Script Path: $scriptPath");
            error_log("[SYNC JOBS] Job ID: $jobId");
            error_log("[SYNC JOBS] Log Path: $logPath");
            
            // Try to execute background process
            $executed = false;
            $executionMethod = '';
            
            if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
                // Windows
                $command = sprintf(
                    'start /B %s %s %s > %s 2>&1',
                    escapeshellarg($phpBinary),
                    escapeshellarg($scriptPath),
                    escapeshellarg($jobId),
                    escapeshellarg($logPath)
                );
                error_log("[SYNC JOBS] Windows command: $command");
                pclose(popen($command, "r"));
                $executed = true;
                $executionMethod = 'Windows popen';
            } else {
                // Linux/Unix - try multiple methods
                
                // Method 1: Standard exec with nohup
                $command = sprintf(
                    'nohup %s %s %s > %s 2>&1 &',
                    escapeshellarg($phpBinary),
                    escapeshellarg($scriptPath),
                    escapeshellarg($jobId),
                    escapeshellarg($logPath)
                );
                error_log("[SYNC JOBS] Linux command (nohup): $command");
                
                $output = [];
                $return_var = 0;
                @exec($command, $output, $return_var);
                
                if ($return_var === 0 || $return_var === null) {
                    $executed = true;
                    $executionMethod = 'Linux exec with nohup';
                    error_log("[SYNC JOBS] Executed successfully with nohup");
                } else {
                    // Method 2: Try without nohup
                    $command = sprintf(
                        '%s %s %s > %s 2>&1 &',
                        escapeshellarg($phpBinary),
                        escapeshellarg($scriptPath),
                        escapeshellarg($jobId),
                        escapeshellarg($logPath)
                    );
                    error_log("[SYNC JOBS] Trying without nohup: $command");
                    @exec($command);
                    $executed = true;
                    $executionMethod = 'Linux exec without nohup';
                }
            }
            
            // If exec failed, update job to show error
            if (!$executed) {
                $pdo->exec("UPDATE [dbo].[rs_sync_jobs] SET STATUS = 'failed', ERROR_MESSAGE = 'Could not start background process. exec() may be disabled.' WHERE JOB_ID = '$jobId'");
                
                echo json_encode([
                    'success' => false,
                    'job_id' => $jobId,
                    'message' => 'Failed to start background process. Please check server configuration.',
                    'error' => 'exec() function may be disabled on server'
                ]);
                break;
            }
            
            error_log("[SYNC JOBS] Background process started using: $executionMethod");
            
            echo json_encode([
                'success' => true,
                'job_id' => $jobId,
                'message' => 'Sync job started in background',
                'company_name' => $companyName,
                'execution_method' => $executionMethod
            ]);
            break;
            
        case 'status':
            // Get job status
            $jobId = $_GET['job_id'] ?? null;
            
            if (!$jobId) {
                http_response_code(400);
                echo json_encode(['error' => true, 'message' => 'Job ID is required']);
                exit;
            }
            
            $stmt = $pdo->prepare("
                SELECT 
                    JOB_ID,
                    COMPANY_NAME,
                    STATUS,
                    PROGRESS,
                    CURRENT_STEP,
                    TOTAL_RECORDS,
                    PROCESSED_RECORDS,
                    ERROR_MESSAGE,
                    RESULT_DATA,
                    CREATED_AT,
                    STARTED_AT,
                    COMPLETED_AT,
                    UPDATED_AT
                FROM [dbo].[rs_sync_jobs]
                WHERE JOB_ID = ?
            ");
            $stmt->execute([$jobId]);
            $job = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$job) {
                http_response_code(404);
                echo json_encode(['error' => true, 'message' => 'Job not found']);
                exit;
            }
            
            // Parse result data if available
            if ($job['RESULT_DATA']) {
                $job['RESULT_DATA'] = json_decode($job['RESULT_DATA'], true);
            }
            
            echo json_encode([
                'success' => true,
                'job' => $job
            ]);
            break;
            
        case 'list':
            // List recent jobs for current user
            $userId = $_SESSION['user_id'];
            $isAdmin = isAdmin();
            
            if ($isAdmin) {
                // Admin sees all jobs
                $stmt = $pdo->prepare("
                    SELECT TOP 50
                        JOB_ID,
                        USERNAME,
                        COMPANY_NAME,
                        STATUS,
                        PROGRESS,
                        CREATED_AT,
                        COMPLETED_AT
                    FROM [dbo].[rs_sync_jobs]
                    ORDER BY CREATED_AT DESC
                ");
                $stmt->execute();
            } else {
                // Regular user sees only their jobs
                $stmt = $pdo->prepare("
                    SELECT TOP 50
                        JOB_ID,
                        COMPANY_NAME,
                        STATUS,
                        PROGRESS,
                        CREATED_AT,
                        COMPLETED_AT
                    FROM [dbo].[rs_sync_jobs]
                    WHERE USER_ID = ?
                    ORDER BY CREATED_AT DESC
                ");
                $stmt->execute([$userId]);
            }
            
            $jobs = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'jobs' => $jobs,
                'count' => count($jobs)
            ]);
            break;
            
        case 'cancel':
            // Cancel a running job
            $jobId = $_POST['job_id'] ?? null;
            
            if (!$jobId) {
                http_response_code(400);
                echo json_encode(['error' => true, 'message' => 'Job ID is required']);
                exit;
            }
            
            $stmt = $pdo->prepare("
                UPDATE [dbo].[rs_sync_jobs]
                SET STATUS = 'cancelled',
                    UPDATED_AT = GETDATE(),
                    COMPLETED_AT = GETDATE()
                WHERE JOB_ID = ?
                    AND STATUS IN ('pending', 'running')
            ");
            $stmt->execute([$jobId]);
            
            if ($stmt->rowCount() > 0) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Job cancelled successfully'
                ]);
            } else {
                echo json_encode([
                    'success' => false,
                    'message' => 'Job not found or already completed'
                ]);
            }
            break;
            
        default:
            http_response_code(400);
            echo json_encode(['error' => true, 'message' => 'Invalid action']);
            break;
    }
    
} catch (PDOException $e) {
    error_log('RS Sync Jobs Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => true,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
} catch (Exception $e) {
    error_log('RS Sync Jobs Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => true,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
