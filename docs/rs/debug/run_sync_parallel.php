<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../../functions.php';
require_once __DIR__ . '/../../backend/database.php';

// Admin-only access
if (!isAdmin()) {
    header('Location: ../../dashboard.php?error=access_denied');
    exit;
}

// This script runs multiple sync processes simultaneously
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json; charset=utf-8');
    
    try {
        $postData = json_decode(file_get_contents('php://input'), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('Invalid JSON input', 400);
        }
        
        $companies = $postData['companies'] ?? [];
        $startDate = $postData['startDate'] ?? date('Y-m-d', strtotime('-30 days'));
        $endDate = $postData['endDate'] ?? date('Y-m-d');
        $maxProcesses = $postData['maxProcesses'] ?? 3; // Maximum concurrent processes
        
        if (empty($companies)) {
            throw new Exception("Please select at least one company.", 400);
        }
        
        // Create a unique session ID for this batch
        $batchId = uniqid('sync_', true);
        $logDir = __DIR__ . '/logs';
        if (!is_dir($logDir)) {
            mkdir($logDir, 0755, true);
        }
        
        $processes = [];
        $running = 0;
        
        foreach ($companies as $company) {
            // Wait if we've reached max processes
            while ($running >= $maxProcesses) {
                // Check which processes are still running
                foreach ($processes as $pid => $info) {
                    if (!isProcessRunning($pid)) {
                        unset($processes[$pid]);
                        $running--;
                        error_log("[PARALLEL] Process $pid completed for {$info['company']}");
                    }
                }
                
                if ($running >= $maxProcesses) {
                    sleep(1); // Wait 1 second before checking again
                }
            }
            
            // Start new process
            $logFile = "$logDir/sync_{$company}_{$batchId}.log";
            $command = "php " . __DIR__ . "/sync_company_data.php " . 
                      escapeshellarg($company) . " " . 
                      escapeshellarg($startDate) . " " . 
                      escapeshellarg($endDate) . " > $logFile 2>&1 & echo \$!";
            
            $pid = exec($command);
            
            if ($pid && is_numeric($pid)) {
                $processes[$pid] = [
                    'company' => $company,
                    'startTime' => time(),
                    'logFile' => $logFile,
                    'command' => $command
                ];
                $running++;
                
                error_log("[PARALLEL] Started process $pid for company: $company");
            } else {
                error_log("[ERROR] Failed to start process for company: $company");
            }
        }
        
        // Wait for all remaining processes to complete
        while (!empty($processes)) {
            foreach ($processes as $pid => $info) {
                if (!isProcessRunning($pid)) {
                    $duration = time() - $info['startTime'];
                    error_log("[PARALLEL] Process $pid completed for {$info['company']} in {$duration}s");
                    
                    // Read log file for results
                    if (file_exists($info['logFile'])) {
                        $logContent = file_get_contents($info['logFile']);
                        error_log("[PARALLEL] Log for {$info['company']}: " . substr($logContent, -500));
                    }
                    
                    unset($processes[$pid]);
                    $running--;
                }
            }
            
            if (!empty($processes)) {
                sleep(2); // Wait 2 seconds before checking again
            }
        }
        
        echo json_encode([
            'success' => true,
            'message' => "Started " . count($companies) . " sync processes",
            'batchId' => $batchId,
            'companies' => $companies,
            'startDate' => $startDate,
            'endDate' => $endDate
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => true, 'message' => $e->getMessage()]);
    }
    exit;
}

/**
 * Check if a process is still running
 */
function isProcessRunning($pid) {
    if (PHP_OS_FAMILY === 'Windows') {
        // Windows implementation
        $output = [];
        exec("tasklist /FI \"PID eq $pid\" 2>NUL", $output);
        return count($output) > 1; // tasklist header + process line
    } else {
        // Unix/Linux implementation
        return file_exists("/proc/$pid");
    }
}

/**
 * Get running sync processes
 */
function getRunningProcesses() {
    $processes = [];
    
    if (PHP_OS_FAMILY === 'Windows') {
        // Windows: look for PHP processes running sync_company_data.php
        $output = [];
        exec('tasklist /FI "IMAGENAME eq php.exe" /FO CSV', $output);
        foreach ($output as $line) {
            if (strpos($line, 'php.exe') !== false) {
                $parts = str_getcsv($line);
                if (count($parts) >= 2) {
                    $processes[] = [
                        'pid' => $parts[1],
                        'name' => $parts[0]
                    ];
                }
            }
        }
    } else {
        // Unix/Linux: look for PHP processes
        $output = [];
        exec("ps aux | grep 'sync_company_data.php' | grep -v grep", $output);
        foreach ($output as $line) {
            $parts = preg_split('/\s+/', trim($line));
            if (count($parts) >= 2) {
                $processes[] = [
                    'pid' => $parts[1],
                    'command' => implode(' ', array_slice($parts, 10))
                ];
            }
        }
    }
    
    return $processes;
}

// Get companies for the form
$companies = [];
try {
    $pdo = getDatabaseConnection();
    $stmt = $pdo->query("SELECT DISTINCT company_name FROM rs_users ORDER BY company_name");
    $companies = $stmt->fetchAll(PDO::FETCH_COLUMN);
} catch (Exception $e) {
    error_log("Error fetching companies: " . $e->getMessage());
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Parallel Sync Runner</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body { padding-top: 5rem; }
        .process-status { font-family: monospace; }
        .log-viewer { 
            background-color: #f8f9fa; 
            border: 1px solid #dee2e6; 
            border-radius: 0.25rem; 
            padding: 1rem; 
            max-height: 400px; 
            overflow-y: auto; 
        }
    </style>
</head>
<body>
    <?php include '../../menu.php'; ?>
    <div class="container mt-4">
        <h2>Parallel Sync Runner</h2>
        <p>Run multiple company sync processes simultaneously for better performance.</p>
        
        <div class="row">
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">
                        <h5>Start Parallel Sync</h5>
                    </div>
                    <div class="card-body">
                        <form id="parallel-form">
                            <div class="mb-3">
                                <label for="companies" class="form-label">Select Companies</label>
                                <select id="companies" class="form-select" multiple size="8">
                                    <?php foreach ($companies as $company): ?>
                                        <option value="<?= htmlspecialchars($company) ?>"><?= htmlspecialchars($company) ?></option>
                                    <?php endforeach; ?>
                                </select>
                                <div class="form-text">Hold Ctrl/Cmd to select multiple companies</div>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label for="startDate" class="form-label">Start Date</label>
                                        <input type="date" id="startDate" class="form-control" value="<?= date('Y-m-d', strtotime('-30 days')) ?>">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label for="endDate" class="form-label">End Date</label>
                                        <input type="date" id="endDate" class="form-control" value="<?= date('Y-m-d') ?>">
                                    </div>
                                </div>
                            </div>
                            
                            <div class="mb-3">
                                <label for="maxProcesses" class="form-label">Max Concurrent Processes</label>
                                <input type="number" id="maxProcesses" class="form-control" value="3" min="1" max="10">
                                <div class="form-text">Recommended: 3-5 processes to avoid overwhelming the API</div>
                            </div>
                            
                            <button type="submit" id="start-btn" class="btn btn-primary">Start Parallel Sync</button>
                        </form>
                    </div>
                </div>
            </div>
            
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">
                        <h5>Process Status</h5>
                        <button id="refresh-status" class="btn btn-sm btn-outline-secondary">Refresh</button>
                    </div>
                    <div class="card-body">
                        <div id="process-status" class="process-status">
                            <div class="text-muted">Click "Refresh" to see running processes</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="row mt-4">
            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <h5>Recent Logs</h5>
                    </div>
                    <div class="card-body">
                        <div id="recent-logs" class="log-viewer">
                            <div class="text-muted">Logs will appear here when processes are running</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

<script>
document.getElementById('parallel-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const companies = Array.from(document.getElementById('companies').selectedOptions).map(opt => opt.value);
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const maxProcesses = document.getElementById('maxProcesses').value;
    
    if (companies.length === 0) {
        alert('Please select at least one company.');
        return;
    }
    
    const btn = document.getElementById('start-btn');
    btn.disabled = true;
    btn.textContent = 'Starting...';
    
    fetch('', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            companies: companies,
            startDate: startDate,
            endDate: endDate,
            maxProcesses: parseInt(maxProcesses)
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            alert('Error: ' + data.message);
        } else {
            alert('Success: ' + data.message);
            // Start monitoring
            startMonitoring();
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Failed to start parallel sync: ' + error.message);
    })
    .finally(() => {
        btn.disabled = false;
        btn.textContent = 'Start Parallel Sync';
    });
});

document.getElementById('refresh-status').addEventListener('click', function() {
    refreshProcessStatus();
});

function startMonitoring() {
    // Refresh status every 5 seconds
    setInterval(refreshProcessStatus, 5000);
    refreshProcessStatus();
}

function refreshProcessStatus() {
    // This would need a separate endpoint to get process status
    // For now, just show a message
    document.getElementById('process-status').innerHTML = 
        '<div class="text-success">Monitoring active processes...</div>';
}

function updateRecentLogs() {
    // This would fetch recent log entries
    // Implementation depends on your logging setup
}
</script>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
