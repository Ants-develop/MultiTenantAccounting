<?php
/**
 * Mandatory Fields Testing - API Parameter Validation
 * 
 * This page tests different parameter combinations to determine which fields are mandatory
 * for RS.ge API functions by systematically testing with and without each parameter.
 * 
 * @author System Administrator
 * @version 1.0
 * @since 2024-01-01
 */

// PHP-FPM Optimization
ini_set('max_execution_time', 1800);
ini_set('memory_limit', '1G');
ini_set('max_input_time', 1800);

// Add shutdown handler for fatal errors
register_shutdown_function('handle_fatal_error');

function handle_fatal_error() {
    $error = error_get_last();
    if ($error !== NULL && in_array($error['type'], [E_ERROR, E_CORE_ERROR, E_PARSE, E_COMPILE_ERROR, E_USER_ERROR])) {
        error_log("[FATAL SCRIPT ERROR in test_mandatory_fields.php] " . print_r($error, true));
        if (!headers_sent()) {
            echo "<div style='background:#f8d7da; padding:15px; border-radius:5px; margin:20px; border:1px solid #f5c6cb;'>";
            echo "<h4>🚨 A fatal error occurred</h4>";
            echo "<p>The script stopped unexpectedly. Please check the server error logs for details.</p>";
            echo "<pre>Error: {$error['message']} in {$error['file']} on line {$error['line']}</pre>";
            echo "</div>";
        }
    }
}

ini_set('display_errors', 1);
error_reporting(E_ALL);

if (session_status() === PHP_SESSION_NONE) session_start();

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

// === Get credentials ===
$pdo = getDatabaseConnection();

// Get list of available companies for selection
$companyStmt = $pdo->prepare("SELECT ID, COMPANY_NAME, COMPANY_TIN, S_USER, S_PASSWORD, USER_ID, UN_ID FROM rs_users WHERE S_USER IS NOT NULL AND S_PASSWORD IS NOT NULL ORDER BY COMPANY_NAME");
$companyStmt->execute();
$availableCompanies = $companyStmt->fetchAll(PDO::FETCH_ASSOC);

if (empty($availableCompanies)) {
    die("❌ No companies with credentials found in rs_users table");
}

// Get selected company or default to first one
$selectedCompanyId = $_POST['company_id'] ?? $availableCompanies[0]['ID'];
$selectedCompany = null;

foreach ($availableCompanies as $company) {
    if ($company['ID'] == $selectedCompanyId) {
        $selectedCompany = $company;
        break;
    }
}

if (!$selectedCompany) {
    $selectedCompany = $availableCompanies[0];
}

$credentials = [
    's_user' => $selectedCompany['S_USER'],
    's_password' => $selectedCompany['S_PASSWORD'],
    'company_tin' => $selectedCompany['COMPANY_TIN'],
    'user_id' => $selectedCompany['USER_ID'],
    'un_id' => $selectedCompany['UN_ID']
];

$company_tin = $credentials['company_tin'];
$user = $credentials['s_user'];
$password = $credentials['s_password'];
$user_id = $credentials['user_id'];
$un_id = $credentials['un_id'];

function testApiWithParameters($apiName, $soapAction, $parameters, $description) {
    echo "<div class='api-test-section'>";
    echo "<h4>🧪 $description</h4>";
    
    // Build XML request
    $xml = '<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
    <' . $soapAction . ' xmlns="http://tempuri.org/">';
    
    foreach ($parameters as $param => $value) {
        if ($value !== null) {
            $xml .= "\n    <$param>" . htmlspecialchars($value, ENT_XML1) . "</$param>";
        }
    }
    
    $xml .= '
    </' . $soapAction . '>
</soap:Body>
</soap:Envelope>';
    
    // Show request
    echo "<div class='collapsible' onclick='toggleContent(this)'>🔍 <strong>Request XML</strong> (Click to expand)</div>";
    echo "<div class='content'>";
    echo "<pre style='background:#f5f5f5; padding:10px; border:1px solid #ccc; max-height:200px; overflow:auto; font-size:11px;'>";
    echo htmlspecialchars($xml);
    echo "</pre></div>";
    
    // Make API call
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => "https://webserv.rs.ge/specinvoices/SpecInvoicesService.asmx",
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $xml,
        CURLOPT_HTTPHEADER => [
            'Content-Type: text/xml; charset=utf-8',
            'SOAPAction: "http://tempuri.org/' . $soapAction . '"'
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
    ]);
    
    $response = curl_exec($ch);
    $curl_error = curl_error($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    // Analyze response
    echo "<div class='response-analysis'>";
    
    if ($curl_error) {
        echo "<div class='alert alert-danger'>❌ cURL Error: $curl_error</div>";
    } elseif ($http_code !== 200) {
        echo "<div class='alert alert-danger'>❌ HTTP Error $http_code</div>";
    } else {
        // Parse response for errors
        $hasError = false;
        $errorMessage = '';
        
        if (strpos($response, '<soap:Fault>') !== false) {
            $hasError = true;
            if (preg_match('/<faultstring>(.*?)<\/faultstring>/', $response, $matches)) {
                $errorMessage = $matches[1];
            }
        }
        
        if (strpos($response, 'error') !== false || strpos($response, 'Error') !== false) {
            $hasError = true;
            $errorMessage = 'Error detected in response';
        }
        
        // Check if response has data
        $hasData = false;
        if (strpos($response, '<xs:element name=') !== false) {
            $hasData = true;
        }
        
        if ($hasError) {
            echo "<div class='alert alert-warning'>⚠️ API Error: " . htmlspecialchars($errorMessage) . "</div>";
            echo "<div class='alert alert-info'>❌ <strong>Result:</strong> This parameter combination is INVALID</div>";
        } elseif ($hasData) {
            echo "<div class='alert alert-success'>✅ <strong>Result:</strong> This parameter combination is VALID</div>";
        } else {
            echo "<div class='alert alert-info'>ℹ️ <strong>Result:</strong> No data returned (may be valid but empty)</div>";
        }
    }
    
    echo "</div>";
    echo "</div>";
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mandatory Fields Testing</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        .api-test-section { border: 1px solid #dee2e6; border-radius: 8px; margin: 15px 0; padding: 15px; }
        .collapsible { cursor: pointer; background: #f8f9fa; padding: 8px; border-radius: 4px; margin: 8px 0; }
        .collapsible:hover { background: #e9ecef; }
        .content { display: none; padding: 8px; border: 1px solid #dee2e6; border-radius: 4px; }
        .content.show { display: block; }
        .response-analysis { margin-top: 10px; }
        .parameter-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin: 10px 0; }
        .parameter-item { background: #f8f9fa; padding: 8px; border-radius: 4px; border-left: 4px solid #007bff; }
        .parameter-item.required { border-left-color: #dc3545; }
        .parameter-item.optional { border-left-color: #28a745; }
    </style>
</head>
<body>
<div class="container-fluid mt-4">
    <div class="row">
        <div class="col-12">
            <h1 class="mb-4">🔍 Mandatory Fields Testing</h1>
            
            <div class="alert alert-info">
                <h5>🎯 Purpose</h5>
                <p>This page systematically tests different parameter combinations to determine which fields are mandatory for RS.ge API functions.</p>
                <p><strong>Method:</strong> Test each API with different parameter combinations and analyze the responses to identify required vs optional parameters.</p>
            </div>

            <!-- Company Selection Form -->
            <form method="post" class="mb-4">
                <div class="card">
                    <div class="card-header">
                        <h5>🏢 Company Selection</h5>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-6">
                                <label for="company_id" class="form-label">Select Company:</label>
                                <select name="company_id" id="company_id" class="form-select" required>
                                    <?php foreach ($availableCompanies as $company): ?>
                                        <?php 
                                        $selected = ($company['ID'] == $selectedCompanyId) ? 'selected' : '';
                                        $status = ($company['S_USER'] && $company['S_PASSWORD']) ? '✅' : '❌';
                                        ?>
                                        <option value="<?= $company['ID'] ?>" <?= $selected ?>>
                                            <?= $status ?> <?= htmlspecialchars($company['COMPANY_NAME']) ?> (TIN: <?= htmlspecialchars($company['COMPANY_TIN']) ?>)
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                            <div class="col-md-6">
                                <div class="alert alert-info">
                                    <strong>ℹ️ Testing Mode:</strong> Parameter validation testing<br>
                                    <small>Will test different parameter combinations to identify mandatory fields</small>
                                </div>
                            </div>
                        </div>
                        <div class="mt-3">
                            <button type="submit" class="btn btn-primary">🔄 Test Mandatory Fields</button>
                        </div>
                    </div>
                </div>
            </form>

            <!-- Current Configuration -->
            <div class="card mb-4">
                <div class="card-header">
                    <h5>⚙️ Current Test Configuration</h5>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <p><strong>Selected Company:</strong> <span class="text-success fw-bold"><?= htmlspecialchars($selectedCompany['COMPANY_NAME']) ?></span></p>
                            <p><strong>Company TIN:</strong> <?= htmlspecialchars($credentials['company_tin'] ?? 'Not found') ?></p>
                            <p><strong>Service User:</strong> <?= htmlspecialchars($credentials['s_user'] ?? 'Not found') ?></p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>User ID:</strong> <?= htmlspecialchars($credentials['user_id'] ?? 'Not found') ?></p>
                            <p><strong>UN ID:</strong> <?= htmlspecialchars($credentials['un_id'] ?? 'Not found') ?></p>
                            <p><strong>Test Mode:</strong> Parameter validation</p>
                        </div>
                    </div>
                </div>
            </div>

<?php

// === If form submitted, run the tests ===
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    echo "<h2>🔄 Running Mandatory Fields Tests...</h2>";
    
    // Test 1: get_seller_invoices_r_n (Unfinished Seller Invoices)
    echo "<h3>📦 get_seller_invoices_r_n Parameter Testing (Unfinished Seller Invoices)</h3>";
    echo "<div class='alert alert-info'>According to XSD schema: user_id, un_id, status are MANDATORY; su, sp are OPTIONAL</div>";
    
    // Test with only mandatory parameters (no su/sp)
    testApiWithParameters(
        'get_seller_invoices_r_n',
        'get_seller_invoices_r_n',
        [
            'user_id' => $user_id,
            'un_id' => $un_id,
            'status' => 7 // All statuses
        ],
        "Test 1: Only mandatory parameters (user_id, un_id, status=7) - NO su/sp"
    );
    
    // Test with all parameters
    testApiWithParameters(
        'get_seller_invoices_r_n',
        'get_seller_invoices_r_n',
        [
            'user_id' => $user_id,
            'un_id' => $un_id,
            'status' => 7,
            'su' => $user,
            'sp' => $password
        ],
        "Test 2: All parameters (user_id, un_id, status=7, su, sp)"
    );
    
    // Test without user_id (should fail)
    testApiWithParameters(
        'get_seller_invoices_r_n',
        'get_seller_invoices_r_n',
        [
            'un_id' => $un_id,
            'status' => 7,
            'su' => $user,
            'sp' => $password
        ],
        "Test 3: Without user_id (un_id, status=7, su, sp) - SHOULD FAIL"
    );
    
    // Test without un_id (should fail)
    testApiWithParameters(
        'get_seller_invoices_r_n',
        'get_seller_invoices_r_n',
        [
            'user_id' => $user_id,
            'status' => 7,
            'su' => $user,
            'sp' => $password
        ],
        "Test 4: Without un_id (user_id, status=7, su, sp) - SHOULD FAIL"
    );
    
    // Test without status (should fail)
    testApiWithParameters(
        'get_seller_invoices_r_n',
        'get_seller_invoices_r_n',
        [
            'user_id' => $user_id,
            'un_id' => $un_id,
            'su' => $user,
            'sp' => $password
        ],
        "Test 5: Without status (user_id, un_id, su, sp) - SHOULD FAIL"
    );
    
    // Test with only su and sp (should fail - missing mandatory)
    testApiWithParameters(
        'get_seller_invoices_r_n',
        'get_seller_invoices_r_n',
        [
            'su' => $user,
            'sp' => $password
        ],
        "Test 6: Only su and sp - SHOULD FAIL (missing mandatory)"
    );
    
    echo "<hr>";
    
    // Test 2: get_buyer_invoices_r_n (Unfinished Buyer Invoices)
    echo "<h3>📦 get_buyer_invoices_r_n Parameter Testing (Unfinished Buyer Invoices)</h3>";
    echo "<div class='alert alert-info'>According to XSD schema: user_id, un_id, status are MANDATORY; su, sp are OPTIONAL</div>";
    
    // Test with only mandatory parameters (no su/sp)
    testApiWithParameters(
        'get_buyer_invoices_r_n',
        'get_buyer_invoices_r_n',
        [
            'user_id' => $user_id,
            'un_id' => $un_id,
            'status' => 7 // All statuses
        ],
        "Test 1: Only mandatory parameters (user_id, un_id, status=7) - NO su/sp"
    );
    
    // Test with all parameters
    testApiWithParameters(
        'get_buyer_invoices_r_n',
        'get_buyer_invoices_r_n',
        [
            'user_id' => $user_id,
            'un_id' => $un_id,
            'status' => 7,
            'su' => $user,
            'sp' => $password
        ],
        "Test 2: All parameters (user_id, un_id, status=7, su, sp)"
    );
    
    // Test without user_id (should fail)
    testApiWithParameters(
        'get_buyer_invoices_r_n',
        'get_buyer_invoices_r_n',
        [
            'un_id' => $un_id,
            'status' => 7,
            'su' => $user,
            'sp' => $password
        ],
        "Test 3: Without user_id (un_id, status=7, su, sp) - SHOULD FAIL"
    );
    
    // Test without un_id (should fail)
    testApiWithParameters(
        'get_buyer_invoices_r_n',
        'get_buyer_invoices_r_n',
        [
            'user_id' => $user_id,
            'status' => 7,
            'su' => $user,
            'sp' => $password
        ],
        "Test 4: Without un_id (user_id, status=7, su, sp) - SHOULD FAIL"
    );
    
    // Test without status (should fail)
    testApiWithParameters(
        'get_buyer_invoices_r_n',
        'get_buyer_invoices_r_n',
        [
            'user_id' => $user_id,
            'un_id' => $un_id,
            'su' => $user,
            'sp' => $password
        ],
        "Test 5: Without status (user_id, un_id, su, sp) - SHOULD FAIL"
    );
    
    echo "<hr>";
    
    // Test 3: get_seller_invoices_n (General Filter)
    echo "<h3>📦 get_seller_invoices_n Parameter Testing (General Filter)</h3>";
    echo "<div class='alert alert-info'>According to documentation, this API requires: user_id, un_id, s_dt, e_dt, op_s_dt, op_e_dt, invoice_no, sa_ident_no, desc, doc_mos_nom, su, sp</div>";
    
    $current_date = date('Y-m-d\TH:i:s\Z');
    $start_date = date('Y-m-d\TH:i:s\Z', strtotime('-30 days'));
    
    // Test with all parameters
    testApiWithParameters(
        'get_seller_invoices_n',
        'get_seller_invoices_n',
        [
            'user_id' => $user_id,
            'un_id' => $un_id,
            's_dt' => $start_date,
            'e_dt' => $current_date,
            'op_s_dt' => $start_date,
            'op_e_dt' => $current_date,
            'invoice_no' => '',
            'sa_ident_no' => '',
            'desc' => '',
            'doc_mos_nom' => '',
            'su' => $user,
            'sp' => $password
        ],
        "Test 1: All parameters with date range"
    );
    
    // Test without some optional parameters
    testApiWithParameters(
        'get_seller_invoices_n',
        'get_seller_invoices_n',
        [
            'user_id' => $user_id,
            'un_id' => $un_id,
            's_dt' => $start_date,
            'e_dt' => $current_date,
            'op_s_dt' => $start_date,
            'op_e_dt' => $current_date,
            'su' => $user,
            'sp' => $password
        ],
        "Test 2: Without optional filter parameters"
    );
    
    echo "<hr>";
    
    // Test 4: get_buyer_invoices_n (General Filter)
    echo "<h3>📦 get_buyer_invoices_n Parameter Testing (General Filter)</h3>";
    echo "<div class='alert alert-info'>According to documentation, this API requires: user_id, un_id, s_dt, e_dt, op_s_dt, op_e_dt, invoice_no, sa_ident_no, desc, doc_mos_nom, su, sp</div>";
    
    // Test with all parameters
    testApiWithParameters(
        'get_buyer_invoices_n',
        'get_buyer_invoices_n',
        [
            'user_id' => $user_id,
            'un_id' => $un_id,
            's_dt' => $start_date,
            'e_dt' => $current_date,
            'op_s_dt' => $start_date,
            'op_e_dt' => $current_date,
            'invoice_no' => '',
            'sa_ident_no' => '',
            'desc' => '',
            'doc_mos_nom' => '',
            'su' => $user,
            'sp' => $password
        ],
        "Test 1: All parameters with date range"
    );
    
    echo "<hr>";
    
    // Test 5: get_spec_products_n
    echo "<h3>📦 get_spec_products_n Parameter Testing</h3>";
    echo "<div class='alert alert-info'>This API requires: p_like, p_un_id, p_series, user_id, su, sp</div>";
    
    // Test with all parameters
    testApiWithParameters(
        'get_spec_products_n',
        'get_spec_products_n',
        [
            'p_like' => '',
            'p_un_id' => $un_id,
            'p_series' => '',
            'user_id' => $user_id,
            'su' => $user,
            'sp' => $password
        ],
        "Test 1: All parameters"
    );
    
    // Test without p_like and p_series
    testApiWithParameters(
        'get_spec_products_n',
        'get_spec_products_n',
        [
            'p_un_id' => $un_id,
            'user_id' => $user_id,
            'su' => $user,
            'sp' => $password
        ],
        "Test 2: Without p_like and p_series"
    );
    
    // Test with only su and sp
    testApiWithParameters(
        'get_spec_products_n',
        'get_spec_products_n',
        [
            'su' => $user,
            'sp' => $password
        ],
        "Test 3: Only su and sp"
    );
    
    echo "<div class='alert alert-success mt-4'>";
    echo "<h4>✅ Mandatory Fields Testing Complete</h4>";
    echo "<p><strong>Company:</strong> " . htmlspecialchars($selectedCompany['COMPANY_NAME']) . "</p>";
    echo "<p><strong>APIs Tested:</strong> get_seller_invoices_r_n, get_buyer_invoices_r_n, get_seller_invoices_n, get_buyer_invoices_n, get_spec_products_n</p>";
    echo "<p><strong>Method:</strong> Systematic parameter combination testing based on official documentation</p>";
    echo "</div>";
    
} else {
    echo "<div class='alert alert-primary'>";
    echo "<h4>📋 Ready to Test</h4>";
    echo "<p>Select a company above, then click <strong>🔄 Test Mandatory Fields</strong> to systematically test different parameter combinations.</p>";
    echo "<p><strong>Note:</strong> This will help identify which parameters are mandatory vs optional for each API.</p>";
    echo "</div>";
}

?>

        </div>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
<script>
function toggleContent(element) {
    const content = element.nextElementSibling;
    content.classList.toggle('show');
}
</script>
</body>
</html>
