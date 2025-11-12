<?php
/**
 * Manual Declaration Number Date Testing API
 * 
 * This page allows manual testing of the get_decl_date API endpoint
 * used to fetch declaration dates from RS.ge for specific declaration numbers.
 * 
 * @author System Administrator
 * @version 1.0
 * @since 2024-01-01
 */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
require_once __DIR__ . '/../../functions.php';
require_once __DIR__ . '/../../backend/database.php';

// Check if user is logged in and is admin
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

// Handle fetch declaration numbers request
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'fetch_declaration_numbers') {
    header('Content-Type: application/json');
    
    $company_name = $_POST['company_name'] ?? '';
    $begin_date = $_POST['begin_date'] ?? '';
    $end_date = $_POST['end_date'] ?? '';
    
    if (empty($company_name)) {
        echo json_encode([
            'success' => false,
            'error' => 'Company name is required'
        ]);
        exit;
    }
    
    try {
        $pdo = getDatabaseConnection();
        
        // Get company TIN
        $stmt = $pdo->prepare("SELECT company_tin FROM rs_users WHERE company_name = ?");
        $stmt->execute([$company_name]);
        $company_data = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$company_data) {
            echo json_encode([
                'success' => false,
                'error' => 'Company not found'
            ]);
            exit;
        }
        
        $company_tin = $company_data['company_tin'];
        
        // Fetch declaration numbers from both seller and buyer invoices
        $declaration_numbers = [];
        
        // Build date filter
        $date_filter = '';
        $params = [$company_tin];
        
        if (!empty($begin_date) && !empty($end_date)) {
            $begin_date_fmt = (new DateTime($begin_date))->format('Y-m-d 00:00:00');
            $end_date_fmt = (new DateTime($end_date))->format('Y-m-d 23:59:59');
            $date_filter = ' AND OPERATION_DT BETWEEN ? AND ?';
            $params[] = $begin_date_fmt;
            $params[] = $end_date_fmt;
        }
        
        // Fetch from seller invoices (SEQ_NUM_S)
        $sql_seller = "SELECT DISTINCT SEQ_NUM_S as decl_num, 'seller' as type, OPERATION_DT 
                      FROM rs.seller_invoices 
                      WHERE COMPANY_TIN = ? AND SEQ_NUM_S IS NOT NULL AND SEQ_NUM_S != ''" . $date_filter . "
                      ORDER BY OPERATION_DT DESC";
        
        $stmt = $pdo->prepare($sql_seller);
        $stmt->execute($params);
        $seller_results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($seller_results as $row) {
            $declaration_numbers[] = [
                'number' => $row['decl_num'],
                'type' => 'გამყიდველის დეკლარაციის ნომერი',
                'operation_date' => $row['OPERATION_DT']
            ];
        }
        
        // Fetch from buyer invoices (SEQ_NUM_B)
        $sql_buyer = "SELECT DISTINCT SEQ_NUM_B as decl_num, 'buyer' as type, OPERATION_DT 
                     FROM rs.buyer_invoices 
                     WHERE COMPANY_TIN = ? AND SEQ_NUM_B IS NOT NULL AND SEQ_NUM_B != ''" . $date_filter . "
                     ORDER BY OPERATION_DT DESC";
        
        $stmt = $pdo->prepare($sql_buyer);
        $stmt->execute($params);
        $buyer_results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($buyer_results as $row) {
            $declaration_numbers[] = [
                'number' => $row['decl_num'],
                'type' => 'მყიდველის დეკლარაციის ნომერი',
                'operation_date' => $row['OPERATION_DT']
            ];
        }
        
        // Sort by operation date descending
        usort($declaration_numbers, function($a, $b) {
            return strtotime($b['operation_date']) - strtotime($a['operation_date']);
        });
        
        echo json_encode([
            'success' => true,
            'company_name' => $company_name,
            'company_tin' => $company_tin,
            'date_range' => !empty($begin_date) && !empty($end_date) ? "$begin_date to $end_date" : 'All dates',
            'total_found' => count($declaration_numbers),
            'declaration_numbers' => $declaration_numbers
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'error' => 'Database error: ' . $e->getMessage()
        ]);
    }
    exit;
}

// Handle API testing request
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'test_declaration_api') {
    header('Content-Type: application/json');
    
    $company_name = $_POST['company_name'] ?? '';
    $declaration_numbers = $_POST['declaration_numbers'] ?? '';
    
    if (empty($company_name) || empty($declaration_numbers)) {
        echo json_encode([
            'success' => false,
            'error' => 'Company name and declaration numbers are required'
        ]);
        exit;
    }
    
    // Parse declaration numbers (support comma-separated or newline-separated)
    $decl_nums = array_filter(array_map('trim', preg_split('/[,\n\r]+/', $declaration_numbers)));
    
    if (empty($decl_nums)) {
        echo json_encode([
            'success' => false,
            'error' => 'No valid declaration numbers provided'
        ]);
        exit;
    }
    
    try {
        $pdo = getDatabaseConnection();
        
        // Get company credentials
        $stmt = $pdo->prepare("SELECT s_user, s_password, un_id, company_tin FROM rs_users WHERE company_name = ?");
        $stmt->execute([$company_name]);
        $credentials = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$credentials) {
            echo json_encode([
                'success' => false,
                'error' => 'Company credentials not found'
            ]);
            exit;
        }
        
        if (empty($credentials['un_id'])) {
            echo json_encode([
                'success' => false,
                'error' => 'Company UN_ID is missing'
            ]);
            exit;
        }
        
        $results = [];
        $url = "https://www.revenue.mof.ge/ntosservice/ntosservice.asmx";
        
        foreach ($decl_nums as $decl_num) {
            $start_time = microtime(true);
            
            // Build SOAP request
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

            // Make API call
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => $soap_request,
                CURLOPT_HTTPHEADER => $headers,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_SSL_VERIFYPEER => true,
                CURLOPT_SSL_VERIFYHOST => 2,
                CURLOPT_TIMEOUT => 60,
                CURLOPT_CONNECTTIMEOUT => 30,
                CURLOPT_NOSIGNAL => 1,
            ]);
            
            $response = curl_exec($ch);
            $curl_error = curl_error($ch);
            $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $response_time = round((microtime(true) - $start_time) * 1000, 2); // ms
            curl_close($ch);
            
            $result = [
                'declaration_number' => $decl_num,
                'response_time_ms' => $response_time,
                'http_code' => $http_code,
                'success' => false,
                'declaration_date' => null,
                'error' => null,
                'raw_request' => $soap_request,
                'raw_response' => $response
            ];
            
            if ($curl_error) {
                $result['error'] = "cURL Error: " . $curl_error;
            } elseif ($http_code !== 200) {
                $result['error'] = "HTTP Error: " . $http_code;
            } else {
                // Parse XML response
                libxml_use_internal_errors(true);
                $clean_xml = str_ireplace(['soap:', 'diffgr:', 'msdata:'], '', $response);
                $clean_xml = str_replace("\xEF\xBB\xBF", '', $clean_xml);
                $clean_xml = str_replace("\x00", '', $clean_xml);
                
                $sxe = simplexml_load_string($clean_xml);
                if ($sxe === false) {
                    $libxml_errors = libxml_get_errors();
                    $error_messages = [];
                    foreach ($libxml_errors as $error) {
                        $error_messages[] = trim($error->message);
                    }
                    $result['error'] = "XML Parse Error: " . implode('; ', $error_messages);
                    libxml_clear_errors();
                } else {
                    // Extract declaration date
                    if (isset($sxe->Body->get_decl_dateResponse->get_decl_dateResult)) {
                        $date_result = (string)$sxe->Body->get_decl_dateResponse->get_decl_dateResult;
                        
                        if (!empty($date_result)) {
                            // Handle YYYYMM format (e.g., "202506" = 2025-06)
                            if (preg_match('/^(\d{4})(\d{2})$/', $date_result, $matches)) {
                                $year = $matches[1];
                                $month = $matches[2];
                                
                                $result['success'] = true;
                                $result['declaration_date'] = $date_result;
                                $result['raw_format'] = 'YYYYMM';
                                
                                // Format for display (year-month only)
                                $result['formatted_date'] = $year . '-' . $month;
                                $result['georgian_date'] = $month . '.' . $year;
                                $result['year'] = $year;
                                $result['month'] = $month;
                                $result['month_name'] = date('F', mktime(0, 0, 0, (int)$month, 1));
                                $result['display_text'] = "Year: $year, Month: $month (" . $result['month_name'] . ")";
                            } elseif (strtotime($date_result) !== false) {
                                // Handle standard date format as fallback
                                $result['success'] = true;
                                $result['declaration_date'] = $date_result;
                                $result['raw_format'] = 'Standard Date';
                                
                                try {
                                    $dt = new DateTime($date_result);
                                    $result['formatted_date'] = $dt->format('Y-m-d H:i:s');
                                    $result['georgian_date'] = $dt->format('d.m.Y H:i:s');
                                    $result['display_text'] = $result['georgian_date'];
                                } catch (Exception $e) {
                                    $result['formatted_date'] = $date_result;
                                    $result['georgian_date'] = $date_result;
                                    $result['display_text'] = $date_result;
                                }
                            } else {
                                $result['error'] = "Unrecognized date format returned: '" . $date_result . "'. Expected YYYYMM (e.g., 202506) or standard date format.";
                            }
                        } else {
                            $result['error'] = "Empty date returned from API";
                        }
                    } else {
                        $result['error'] = "Expected response node not found in XML";
                    }
                }
            }
            
            $results[] = $result;
        }
        
        echo json_encode([
            'success' => true,
            'company_name' => $company_name,
            'company_tin' => $credentials['company_tin'],
            'company_un_id' => $credentials['un_id'],
            'total_declarations' => count($decl_nums),
            'results' => $results
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'error' => 'Exception: ' . $e->getMessage()
        ]);
    }
    exit;
}

// Get available companies for dropdown
$companies = [];
try {
    $pdo = getDatabaseConnection();
    $stmt = $pdo->prepare("
        SELECT DISTINCT company_name, company_tin, un_id
        FROM rs_users 
        WHERE s_user IS NOT NULL 
        AND s_password IS NOT NULL 
        AND un_id IS NOT NULL 
        AND un_id != ''
        ORDER BY company_name
    ");
    $stmt->execute();
    $companies = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) {
    error_log("Error fetching companies: " . $e->getMessage());
}
?>
<!DOCTYPE html>
<html lang="ka">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Declaration API Testing - RS System</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css" rel="stylesheet">
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    <link rel="stylesheet" href="../../css/styles.css">
    <style>
        .test-result {
            margin-bottom: 20px;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            overflow: hidden;
        }
        .test-result-header {
            background-color: #f8f9fa;
            padding: 15px;
            border-bottom: 1px solid #dee2e6;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .test-result-body {
            padding: 15px;
        }
        .test-success {
            border-left: 4px solid #28a745;
        }
        .test-success .test-result-header {
            background-color: #d4edda;
        }
        .test-error {
            border-left: 4px solid #dc3545;
        }
        .test-error .test-result-header {
            background-color: #f8d7da;
        }
        .raw-data {
            background-color: #f1f3f4;
            border: 1px solid #dee2e6;
            border-radius: 4px;
            padding: 10px;
            margin-top: 10px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            max-height: 300px;
            overflow-y: auto;
            white-space: pre-wrap;
        }
        .declaration-input {
            min-height: 150px;
        }
        .company-info {
            background-color: #e3f2fd;
            border: 1px solid #bbdefb;
            border-radius: 6px;
            padding: 10px;
            margin-bottom: 20px;
        }
        .response-time {
            font-size: 0.875rem;
            color: #6c757d;
        }
        .status-badge {
            font-size: 0.75rem;
        }
        .fetch-status {
            font-size: 0.875rem;
            padding: 8px 12px;
            border-radius: 6px;
            margin-top: 8px;
        }
        .fetch-status.success {
            background-color: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
        }
        .fetch-status.error {
            background-color: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
        }
        .fetch-status.loading {
            background-color: #e2e3e5;
            border: 1px solid #d6d8db;
            color: #383d41;
        }
    </style>
</head>
<body>
    <?php include '../../menu.php'; ?>
    
    <div class="container-fluid px-4 mt-5">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2><i class="bi bi-calendar-check me-2"></i>Declaration API Testing</h2>
            <a href="analyze_api_fields.php" class="btn btn-outline-secondary btn-sm">
                <i class="bi bi-arrow-left me-1"></i>Back to API Analysis
            </a>
        </div>
        
        <div class="row">
            <div class="col-md-4">
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0"><i class="bi bi-gear me-2"></i>Test Configuration</h5>
                    </div>
                    <div class="card-body">
                        <form id="testForm">
                            <div class="mb-3">
                                <label for="companySelect" class="form-label">Select Company:</label>
                                <select class="form-select" id="companySelect" name="company_name" required>
                                    <option value="">Choose a company...</option>
                                    <?php foreach ($companies as $company): ?>
                                    <option value="<?php echo htmlspecialchars($company['company_name']); ?>" 
                                            data-tin="<?php echo htmlspecialchars($company['company_tin']); ?>"
                                            data-un-id="<?php echo htmlspecialchars($company['un_id']); ?>">
                                        <?php echo htmlspecialchars($company['company_name']); ?>
                                    </option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                            
                            <div id="companyInfo" class="company-info" style="display: none;">
                                <h6><i class="bi bi-building me-1"></i>Company Information:</h6>
                                <div><strong>Name:</strong> <span id="companyName"></span></div>
                                <div><strong>TIN:</strong> <span id="companyTin"></span></div>
                                <div><strong>UN ID:</strong> <span id="companyUnId"></span></div>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">Date Range (Optional):</label>
                                <div class="row">
                                    <div class="col-md-6">
                                        <input type="date" class="form-control" id="beginDate" name="begin_date" placeholder="Begin Date">
                                        <div class="form-text">Begin Date</div>
                                    </div>
                                    <div class="col-md-6">
                                        <input type="date" class="form-control" id="endDate" name="end_date" placeholder="End Date">
                                        <div class="form-text">End Date</div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="mb-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <label for="declarationNumbers" class="form-label">Declaration Numbers:</label>
                                    <button type="button" class="btn btn-outline-primary btn-sm" id="refreshDeclarationNumbers">
                                        <i class="bi bi-arrow-clockwise me-1"></i>Fetch from Database
                                    </button>
                                </div>
                                <textarea class="form-control declaration-input" id="declarationNumbers" name="declaration_numbers" 
                                         placeholder="Enter declaration numbers (one per line or comma-separated)&#10;OR&#10;Use the 'Fetch from Database' button to auto-populate from selected company and date range&#10;&#10;Example:&#10;123456789&#10;987654321&#10;456789123" required></textarea>
                                <div class="form-text">
                                    <strong>Manual Entry:</strong> Enter declaration numbers separated by commas or new lines.<br>
                                    <strong>Auto-Fetch:</strong> Select company (and optionally date range) then click "Fetch from Database" to auto-populate.
                                </div>
                                <div id="fetchStatus" class="mt-2" style="display: none;"></div>
                            </div>
                            
                            <button type="submit" class="btn btn-primary w-100" id="testButton">
                                <i class="bi bi-play-circle me-1"></i>Test Declaration API
                            </button>
                        </form>
                        
                        <div class="mt-3">
                            <div class="card card-body bg-light">
                                <h6><i class="bi bi-info-circle me-1"></i>API Information:</h6>
                                <div><strong>Endpoint:</strong> https://www.revenue.mof.ge/ntosservice/ntosservice.asmx</div>
                                <div><strong>SOAP Action:</strong> get_decl_date</div>
                                <div><strong>Purpose:</strong> Retrieve declaration dates for specific declaration numbers</div>
                                <div><strong>Parameters:</strong> su (username), sp (password), decl_num (declaration number), un_id (company UN ID)</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="col-md-8">
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0"><i class="bi bi-list-check me-2"></i>Test Results</h5>
                    </div>
                    <div class="card-body">
                        <div id="testResults">
                            <div class="text-center text-muted py-5">
                                <i class="bi bi-clock" style="font-size: 3rem;"></i>
                                <p class="mt-3">No tests run yet. Select a company and enter declaration numbers to begin testing.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        $(document).ready(function() {
            // Company selection handler
            $('#companySelect').change(function() {
                const selectedOption = $(this).find('option:selected');
                if (selectedOption.val()) {
                    $('#companyName').text(selectedOption.text());
                    $('#companyTin').text(selectedOption.data('tin'));
                    $('#companyUnId').text(selectedOption.data('un-id'));
                    $('#companyInfo').show();
                } else {
                    $('#companyInfo').hide();
                }
            });
            
            // Refresh declaration numbers handler
            $('#refreshDeclarationNumbers').click(function() {
                const company = $('#companySelect').val();
                
                if (!company) {
                    showFetchStatus('Please select a company first.', 'error');
                    return;
                }
                
                const beginDate = $('#beginDate').val();
                const endDate = $('#endDate').val();
                
                // Show loading state
                $(this).prop('disabled', true).html('<i class="bi bi-hourglass-split me-1"></i>Fetching...');
                showFetchStatus('Fetching declaration numbers from database...', 'loading');
                
                // Make AJAX request
                $.ajax({
                    url: 'test_declaration_api.php',
                    method: 'POST',
                    data: {
                        action: 'fetch_declaration_numbers',
                        company_name: company,
                        begin_date: beginDate,
                        end_date: endDate
                    },
                    dataType: 'json',
                    timeout: 30000,
                    success: function(response) {
                        if (response.success) {
                            if (response.total_found > 0) {
                                // Format declaration numbers for textarea
                                const declNumbers = response.declaration_numbers.map(function(item) {
                                    return item.number + ' // ' + item.type + ' (' + formatDate(item.operation_date) + ')';
                                }).join('\n');
                                
                                $('#declarationNumbers').val(declNumbers);
                                
                                showFetchStatus(
                                    `Successfully fetched ${response.total_found} declaration numbers from ${response.company_name} (${response.date_range})`,
                                    'success'
                                );
                            } else {
                                $('#declarationNumbers').val('');
                                showFetchStatus(
                                    `No declaration numbers found for ${response.company_name} in the specified date range.`,
                                    'error'
                                );
                            }
                        } else {
                            showFetchStatus('Error: ' + (response.error || 'Unknown error occurred'), 'error');
                        }
                    },
                    error: function(xhr, status, error) {
                        showFetchStatus('Request failed: ' + error, 'error');
                    },
                    complete: function() {
                        $('#refreshDeclarationNumbers').prop('disabled', false).html('<i class="bi bi-arrow-clockwise me-1"></i>Fetch from Database');
                    }
                });
            });
            
            // Form submission handler
            $('#testForm').submit(function(e) {
                e.preventDefault();
                
                const company = $('#companySelect').val();
                let declarations = $('#declarationNumbers').val().trim();
                
                // Clean up declaration numbers (remove comments added by auto-fetch)
                declarations = declarations.split('\n').map(function(line) {
                    // Remove comments (anything after //)
                    return line.split('//')[0].trim();
                }).filter(function(line) {
                    return line.length > 0;
                }).join('\n');
                
                if (!company || !declarations) {
                    alert('Please select a company and enter declaration numbers.');
                    return;
                }
                
                // Show loading state
                $('#testButton').prop('disabled', true).html('<i class="bi bi-hourglass-split me-1"></i>Testing...');
                $('#testResults').html(`
                    <div class="text-center py-5">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="mt-3">Testing declaration API... This may take a few moments.</p>
                    </div>
                `);
                
                // Make AJAX request
                $.ajax({
                    url: 'test_declaration_api.php',
                    method: 'POST',
                    data: {
                        action: 'test_declaration_api',
                        company_name: company,
                        declaration_numbers: declarations
                    },
                    dataType: 'json',
                    timeout: 120000, // 2 minutes timeout
                    success: function(response) {
                        displayResults(response);
                    },
                    error: function(xhr, status, error) {
                        displayError('Request failed: ' + error);
                    },
                    complete: function() {
                        $('#testButton').prop('disabled', false).html('<i class="bi bi-play-circle me-1"></i>Test Declaration API');
                    }
                });
            });
            
            function displayResults(response) {
                if (!response.success) {
                    displayError(response.error || 'Unknown error occurred');
                    return;
                }
                
                let html = `
                    <div class="alert alert-info">
                        <h6><i class="bi bi-info-circle me-1"></i>Test Summary</h6>
                        <div><strong>Company:</strong> ${escapeHtml(response.company_name)} (TIN: ${escapeHtml(response.company_tin)})</div>
                        <div><strong>UN ID:</strong> ${escapeHtml(response.company_un_id)}</div>
                        <div><strong>Total Declarations Tested:</strong> ${response.total_declarations}</div>
                    </div>
                `;
                
                response.results.forEach(function(result, index) {
                    const isSuccess = result.success;
                    const statusClass = isSuccess ? 'test-success' : 'test-error';
                    const statusIcon = isSuccess ? 'bi-check-circle-fill text-success' : 'bi-x-circle-fill text-danger';
                    const statusText = isSuccess ? 'SUCCESS' : 'ERROR';
                    
                    html += `
                        <div class="test-result ${statusClass}">
                            <div class="test-result-header">
                                <div>
                                    <h6 class="mb-0">
                                        <i class="bi ${statusIcon} me-2"></i>
                                        Declaration #${escapeHtml(result.declaration_number)}
                                    </h6>
                                </div>
                                <div class="d-flex align-items-center gap-2">
                                    <span class="badge ${isSuccess ? 'bg-success' : 'bg-danger'} status-badge">${statusText}</span>
                                    <span class="response-time">${result.response_time_ms}ms</span>
                                    <span class="badge bg-secondary status-badge">HTTP ${result.http_code}</span>
                                </div>
                            </div>
                            <div class="test-result-body">
                    `;
                    
                    if (isSuccess) {
                        html += `
                            <div class="row">
                                <div class="col-md-6">
                                    <strong>Declaration Date:</strong><br>
                                    <span class="text-success">${escapeHtml(result.declaration_date)}</span>
                                </div>
                                <div class="col-md-6">
                                    <strong>Formatted Date:</strong><br>
                                    <span class="text-primary">${escapeHtml(result.formatted_date || result.declaration_date)}</span>
                                </div>
                            </div>
                        `;
                    } else {
                        html += `
                            <div class="alert alert-danger mb-0">
                                <strong>Error:</strong> ${escapeHtml(result.error)}
                            </div>
                        `;
                    }
                    
                    // Add raw data section
                    html += `
                        <div class="mt-3">
                            <button class="btn btn-outline-secondary btn-sm" type="button" data-bs-toggle="collapse" data-bs-target="#rawData${index}">
                                <i class="bi bi-code me-1"></i>Show Raw Request/Response
                            </button>
                            <div class="collapse mt-2" id="rawData${index}">
                                <div class="row">
                                    <div class="col-md-6">
                                        <h6>Raw Request:</h6>
                                        <div class="raw-data">${escapeHtml(result.raw_request)}</div>
                                    </div>
                                    <div class="col-md-6">
                                        <h6>Raw Response:</h6>
                                        <div class="raw-data">${escapeHtml(result.raw_response)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                    
                    html += `
                            </div>
                        </div>
                    `;
                });
                
                $('#testResults').html(html);
            }
            
            function displayError(error) {
                $('#testResults').html(`
                    <div class="alert alert-danger">
                        <h6><i class="bi bi-exclamation-triangle me-1"></i>Test Failed</h6>
                        <p class="mb-0">${escapeHtml(error)}</p>
                    </div>
                `);
            }
            
            function escapeHtml(text) {
                if (text === null || text === undefined) {
                    return '';
                }
                const div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML;
            }
            
            function showFetchStatus(message, type) {
                const statusDiv = $('#fetchStatus');
                statusDiv.removeClass('success error loading')
                         .addClass('fetch-status ' + type)
                         .html(message)
                         .show();
                         
                // Auto-hide success messages after 5 seconds
                if (type === 'success') {
                    setTimeout(function() {
                        statusDiv.fadeOut();
                    }, 5000);
                }
            }
            
            function formatDate(dateString) {
                if (!dateString) return '';
                try {
                    const date = new Date(dateString);
                    return date.toLocaleDateString('ka-GE') + ' ' + date.toLocaleTimeString('ka-GE', {hour: '2-digit', minute: '2-digit'});
                } catch (e) {
                    return dateString;
                }
            }
        });
    </script>
</body>
</html>
