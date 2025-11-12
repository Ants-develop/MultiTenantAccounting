<?php
/**
 * Direct API Test for RS.ge get_adjusted_waybills
 * This script demonstrates how to make a direct SOAP call to the API
 */

require_once __DIR__ . '/../../functions.php';
require_once __DIR__ . '/../../backend/database.php';

// Configuration
$service_url = 'https://services.rs.ge/WayBillService/WayBillService.asmx';
$operation = 'get_adjusted_waybills';

// Get company credentials from database
$company_name = $_GET['company'] ?? 'სატესტო'; // Default company for testing
$waybill_id = $_GET['waybill_id'] ?? ''; // Get from URL parameter or use empty

// Handle waybill_id - can be empty or must be a positive integer
if ($waybill_id === '') {
    $waybill_id = null; // Empty waybill ID
} else {
    $waybill_id = intval($waybill_id);
    if ($waybill_id <= 0) {
        $waybill_id = null; // Invalid waybill ID
    }
}

// Fetch available companies and credentials from database
$available_companies = [];
$available_waybills = [];
$credentials = null;
$error_message = '';

try {
    $pdo = getDatabaseConnection();
    
    // Get available companies
    $stmt = $pdo->prepare("SELECT company_name, company_tin FROM rs_users ORDER BY company_name");
    $stmt->execute();
    $available_companies = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get available waybill IDs from multiple tables
    $waybill_sources = [
        "SELECT EXTERNAL_ID as waybill_id, 'Seller Waybill' as source FROM rs.sellers_waybills WHERE EXTERNAL_ID IS NOT NULL AND EXTERNAL_ID != '' LIMIT 50",
        "SELECT EXTERNAL_ID as waybill_id, 'Buyer Waybill' as source FROM rs.buyers_waybills WHERE EXTERNAL_ID IS NOT NULL AND EXTERNAL_ID != '' LIMIT 50",
        "SELECT WAYBILL_EXTERNAL_ID as waybill_id, 'Waybill Invoices' as source FROM rs.waybill_invoices WHERE WAYBILL_EXTERNAL_ID IS NOT NULL AND WAYBILL_EXTERNAL_ID != '' LIMIT 50"
    ];
    
    foreach ($waybill_sources as $query) {
        try {
            $stmt = $pdo->prepare($query);
            $stmt->execute();
            $waybills = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($waybills as $waybill) {
                if (!empty($waybill['waybill_id']) && is_numeric($waybill['waybill_id'])) {
                    $available_waybills[] = [
                        'id' => intval($waybill['waybill_id']),
                        'source' => $waybill['source']
                    ];
                }
            }
        } catch (Exception $e) {
            error_log("Error fetching waybills from query: " . $e->getMessage());
        }
    }
    
    // Remove duplicates and sort by ID
    $available_waybills = array_unique(array_column($available_waybills, 'id'));
    sort($available_waybills);
    
    // Get credentials for selected company
    $stmt = $pdo->prepare("SELECT s_user, s_password FROM rs_users WHERE company_name = ?");
    $stmt->execute([$company_name]);
    $credentials = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$credentials) {
        $error_message = "Credentials not found for company: $company_name";
    }
} catch (Exception $e) {
    $error_message = "Database error: " . $e->getMessage();
}

// Use credentials if found, otherwise show placeholder values
$service_user = $credentials['s_user'] ?? 'YOUR_SERVICE_USER';
$service_password = $credentials['s_password'] ?? 'YOUR_SERVICE_PASSWORD';

// Create SOAP request
$waybill_id_param = $waybill_id !== null ? '<waybill_id>' . htmlspecialchars($waybill_id) . '</waybill_id>' : '';
$soap_request = '<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <get_adjusted_waybills xmlns="http://tempuri.org/">
      <su>' . htmlspecialchars($service_user) . '</su>
      <sp>' . htmlspecialchars($service_password) . '</sp>
      ' . $waybill_id_param . '
    </get_adjusted_waybills>
  </soap:Body>
</soap:Envelope>';

// Headers for SOAP request
$headers = [
    'Content-Type: text/xml; charset=UTF-8',
    'SOAPAction: "http://tempuri.org/get_adjusted_waybills"',
    'Content-Length: ' . strlen($soap_request)
];

// Function to make SOAP request
function makeDirectSoapRequest($url, $soap_request, $headers) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $soap_request);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_VERBOSE, true);
    
    // Capture verbose output
    $verbose = fopen('php://temp', 'w+');
    curl_setopt($ch, CURLOPT_STDERR, $verbose);
    
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curl_error = curl_error($ch);
    $info = curl_getinfo($ch);
    curl_close($ch);
    
    // Get verbose output
    rewind($verbose);
    $verbose_log = stream_get_contents($verbose);
    fclose($verbose);
    
    return [
        'response' => $response,
        'http_code' => $http_code,
        'curl_error' => $curl_error,
        'info' => $info,
        'verbose_log' => $verbose_log
    ];
}

// Debug: Log the SOAP request being sent
error_log("Direct API Test - SOAP Request being sent:");
error_log("Service User: " . $service_user);
error_log("Service Password: " . substr($service_password, 0, 3) . "***");
error_log("Waybill ID: " . ($waybill_id ?? 'NULL') . " (type: " . gettype($waybill_id) . ")");
error_log("SOAP Request: " . $soap_request);

// Make the request
$result = makeDirectSoapRequest($service_url, $soap_request, $headers);

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Direct API Test - RS.ge get_adjusted_waybills</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        .code-block {
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 0.375rem;
            padding: 1rem;
            font-family: 'Courier New', monospace;
            font-size: 0.875rem;
            white-space: pre-wrap;
            word-wrap: break-word;
            max-height: 400px;
            overflow-y: auto;
        }
        .api-info {
            background-color: #e7f3ff;
            border: 1px solid #b3d9ff;
            border-radius: 0.375rem;
            padding: 1rem;
            margin-bottom: 1rem;
        }
        .curl-command {
            background-color: #2d3748;
            color: #e2e8f0;
            border-radius: 0.375rem;
            padding: 1rem;
            font-family: 'Courier New', monospace;
            font-size: 0.875rem;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
    </style>
</head>
<body>
    <div class="container mt-4">
        <div class="row">
            <div class="col-12">
                <h1 class="mb-4">
                    <i class="fas fa-code"></i> 
                    Direct API Test - RS.ge get_adjusted_waybills
                </h1>
                
                <div class="api-info">
                    <h5><i class="fas fa-info-circle"></i> API Information</h5>
                    <p><strong>Endpoint:</strong> <code><?php echo htmlspecialchars($service_url); ?></code></p>
                    <p><strong>Operation:</strong> <code><?php echo htmlspecialchars($operation); ?></code></p>
                    <p><strong>Direct API Link:</strong> <a href="https://services.rs.ge/WayBillService/WayBillService.asmx?op=get_adjusted_waybills" target="_blank">View API Documentation</a></p>
                </div>

                <!-- Company and Waybill Selection Form -->
                <div class="card mb-4">
                    <div class="card-header">
                        <h5 class="mb-0"><i class="fas fa-building"></i> Test Parameters</h5>
                    </div>
                    <div class="card-body">
                        <form method="GET" class="row g-3">
                            <div class="col-md-6">
                                <label for="company" class="form-label">Company Name:</label>
                                <select class="form-select" id="company" name="company">
                                    <?php foreach ($available_companies as $company): ?>
                                        <option value="<?php echo htmlspecialchars($company['company_name']); ?>" 
                                                <?php echo ($company['company_name'] === $company_name) ? 'selected' : ''; ?>>
                                            <?php echo htmlspecialchars($company['company_name']); ?>
                                            <?php if (!empty($company['company_tin'])): ?>
                                                (TIN: <?php echo htmlspecialchars($company['company_tin']); ?>)
                                            <?php endif; ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                                <div class="form-text">Select a company to fetch credentials from database</div>
                            </div>
                                                         <div class="col-md-4">
                                 <label for="waybill_id" class="form-label">Waybill ID:</label>
                                 <select class="form-select" id="waybill_id" name="waybill_id">
                                     <option value="">-- Select Waybill ID (Optional) --</option>
                                     <?php foreach ($available_waybills as $waybill_id_option): ?>
                                         <option value="<?php echo htmlspecialchars($waybill_id_option); ?>" 
                                                 <?php echo ($waybill_id_option == $waybill_id) ? 'selected' : ''; ?>>
                                             <?php echo htmlspecialchars($waybill_id_option); ?>
                                         </option>
                                     <?php endforeach; ?>
                                 </select>
                                 <div class="form-text">
                                     <?php echo count($available_waybills); ?> waybill IDs available from database. 
                                     Leave empty to test without waybill ID.
                                 </div>
                             </div>
                            <div class="col-md-2">
                                <label class="form-label">&nbsp;</label>
                                <button type="submit" class="btn btn-primary w-100">
                                    <i class="fas fa-search"></i> Update
                                </button>
                            </div>
                        </form>
                        
                        <!-- Credentials Status -->
                        <div class="mt-3">
                            <?php if ($credentials): ?>
                                <div class="alert alert-success">
                                    <h6><i class="fas fa-check-circle"></i> Credentials Found</h6>
                                    <p class="mb-1"><strong>Company:</strong> <?php echo htmlspecialchars($company_name); ?></p>
                                    <p class="mb-1"><strong>Service User:</strong> <code><?php echo htmlspecialchars($service_user); ?></code></p>
                                    <p class="mb-0"><strong>Status:</strong> Ready to test API</p>
                                </div>
                            <?php else: ?>
                                <div class="alert alert-warning">
                                    <h6><i class="fas fa-exclamation-triangle"></i> Credentials Not Found</h6>
                                    <p class="mb-1"><strong>Company:</strong> <?php echo htmlspecialchars($company_name); ?></p>
                                    <p class="mb-1"><strong>Error:</strong> <?php echo htmlspecialchars($error_message); ?></p>
                                    <p class="mb-0"><strong>Status:</strong> Using placeholder credentials (API calls will fail)</p>
                                </div>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>

                <div class="row">
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0"><i class="fas fa-cog"></i> Request Details</h5>
                            </div>
                            <div class="card-body">
                                <h6>SOAP Request:</h6>
                                <div class="code-block"><?php echo htmlspecialchars($soap_request); ?></div>
                                
                                <h6 class="mt-3">Headers:</h6>
                                <div class="code-block"><?php echo htmlspecialchars(implode("\n", $headers)); ?></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0"><i class="fas fa-arrow-down"></i> Response Details</h5>
                            </div>
                            <div class="card-body">
                                <h6>HTTP Status Code:</h6>
                                <div class="code-block"><?php echo htmlspecialchars($result['http_code']); ?></div>
                                
                                <h6 class="mt-3">Response:</h6>
                                <div class="code-block"><?php echo htmlspecialchars($result['response'] ?: 'No response'); ?></div>
                                
                                <?php if ($result['curl_error']): ?>
                                <h6 class="mt-3 text-danger">cURL Error:</h6>
                                <div class="code-block text-danger"><?php echo htmlspecialchars($result['curl_error']); ?></div>
                                <?php endif; ?>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card mt-4">
                    <div class="card-header">
                        <h5 class="mb-0"><i class="fas fa-terminal"></i> cURL Command</h5>
                    </div>
                    <div class="card-body">
                        <p>You can test this API directly using the following cURL command:</p>
                        <div class="curl-command">curl -X POST "<?php echo htmlspecialchars($service_url); ?>" \
  -H "Content-Type: text/xml; charset=UTF-8" \
  -H "SOAPAction: \"http://tempuri.org/get_adjusted_waybills\"" \
  -d '<?php echo str_replace("'", "'\"'\"'", $soap_request); ?>'</div>
                        
                        <div class="mt-3">
                            <h6>Direct API URL:</h6>
                            <p><code><?php echo htmlspecialchars($service_url); ?>?op=get_adjusted_waybills</code></p>
                        </div>
                    </div>
                </div>

                <div class="card mt-4">
                    <div class="card-header">
                        <h5 class="mb-0"><i class="fas fa-bug"></i> Debug Information</h5>
                    </div>
                    <div class="card-body">
                        <h6>cURL Info:</h6>
                        <div class="code-block"><?php echo htmlspecialchars(json_encode($result['info'], JSON_PRETTY_PRINT)); ?></div>
                        
                        <?php if ($result['verbose_log']): ?>
                        <h6 class="mt-3">Verbose Log:</h6>
                        <div class="code-block"><?php echo htmlspecialchars($result['verbose_log']); ?></div>
                        <?php endif; ?>
                    </div>
                </div>

                <div class="alert alert-info mt-4">
                    <h6><i class="fas fa-info-circle"></i> How to Use:</h6>
                    <ul class="mb-0">
                        <li><strong>Select a company</strong> from the dropdown to automatically fetch credentials from the database</li>
                        <li><strong>Select a waybill ID</strong> from the dropdown to test with real data, or leave empty to test without waybill ID</li>
                        <li><strong>Credentials are automatically loaded</strong> when you select a company</li>
                        <li><strong>Real API calls</strong> will be made using the selected company's credentials</li>
                        <li>This page is perfect for testing API responses with real company data</li>
                        <li><strong>Empty waybill ID</strong> can be useful for testing API behavior when no specific waybill is specified</li>
                    </ul>
                </div>
                
                <!-- Debug Information -->
                <div class="card mt-4">
                    <div class="card-header">
                        <h5 class="mb-0"><i class="fas fa-bug"></i> Debug Information</h5>
                    </div>
                    <div class="card-body">
                                                 <h6>Parameters Sent:</h6>
                         <div class="code-block">
Company: <?php echo htmlspecialchars($company_name); ?>
Waybill ID: <?php echo $waybill_id !== null ? htmlspecialchars($waybill_id) : 'NULL (Not specified)'; ?> (<?php echo gettype($waybill_id); ?>)
Service User: <?php echo htmlspecialchars($service_user); ?>
Service Password: <?php echo htmlspecialchars(substr($service_password, 0, 3) . '***'); ?>
                         </div>
                        
                        <h6 class="mt-3">Raw SOAP Request (<?php echo strlen($soap_request); ?> characters):</h6>
                        <div class="code-block"><?php echo htmlspecialchars($soap_request); ?></div>
                        
                        <h6 class="mt-3">Raw SOAP Response (<?php echo strlen($result['response'] ?: 'No response'); ?> characters):</h6>
                        <div class="code-block"><?php echo htmlspecialchars($result['response'] ?: 'No response'); ?></div>
                    </div>
                </div>
                
                <div class="alert alert-warning mt-3">
                    <h6><i class="fas fa-exclamation-triangle"></i> Important Notes:</h6>
                    <ul class="mb-0">
                        <li>This script makes <strong>real API calls</strong> to RS.ge services</li>
                        <li>Use with <strong>valid waybill IDs</strong> to avoid unnecessary API calls</li>
                        <li>This script is for <strong>testing and debugging purposes only</strong></li>
                        <li>In production, use the proper test page with authentication</li>
                        <li>Monitor your API usage to avoid hitting rate limits</li>
                    </ul>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        // Auto-refresh when company selection changes
        document.getElementById('company').addEventListener('change', function() {
            const company = this.value;
            const waybillId = document.getElementById('waybill_id').value;
            const currentUrl = new URL(window.location);
            currentUrl.searchParams.set('company', company);
            currentUrl.searchParams.set('waybill_id', waybillId);
            window.location.href = currentUrl.toString();
        });
        
        // Auto-refresh when waybill ID changes
        document.getElementById('waybill_id').addEventListener('change', function() {
            const company = document.getElementById('company').value;
            const waybillId = this.value;
            const currentUrl = new URL(window.location);
            currentUrl.searchParams.set('company', company);
            if (waybillId) {
                currentUrl.searchParams.set('waybill_id', waybillId);
            } else {
                currentUrl.searchParams.delete('waybill_id');
            }
            window.location.href = currentUrl.toString();
        });
    </script>
</body>
</html>
