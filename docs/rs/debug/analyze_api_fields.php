<?php
/**
 * ADVANCED API FIELD ANALYZER
 * 
 * This script makes live API calls to RS.ge to discover all possible fields,
 * including nested fields and attributes, for waybills and invoices. It is
 * designed for developers to analyze the API response structure for database
 * schema design and ETL logic.
 * 
 * FEATURES:
 * - Dynamic company selection with credential fetching.
 * - Recursive XML parsing to find all nested fields and attributes.
 * - Handles ADO.NET DataSet format (diffgram).
 * - Enhanced debugging for cURL, XML parsing, and data cleaning.
 * - Infers data types for SQL schema planning.
 * - Uses the exact same request logic as the production sync script.
 * 
 * @version 2.0
 */

// PHP-FPM Optimization for large API responses
ini_set('max_execution_time', 1800);        // 30 minutes
ini_set('memory_limit', '1G');              // 1GB memory
ini_set('max_input_time', 1800);            // 30 minutes input time

// Add shutdown handler for fatal errors
register_shutdown_function('handle_fatal_error');

// Centralized logging to PHP-FPM error log
ini_set('log_errors', 1);
ini_set('error_log', '/var/log/php-fpm/error.log'); // Adjust path if needed

function handle_fatal_error() {
    $error = error_get_last();
    if ($error !== NULL && in_array($error['type'], [E_ERROR, E_CORE_ERROR, E_PARSE, E_COMPILE_ERROR, E_USER_ERROR])) {
        error_log("[FATAL SCRIPT ERROR in analyze_api_fields.php] " . print_r($error, true));
        // Attempt to display a clean error message if output hasn't started
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

// === Get credentials ===
$pdo = getDatabaseConnection();

// Get list of available companies for selection
$companyStmt = $pdo->prepare("SELECT id, company_name, company_tin, s_user, s_password, user_id, un_id FROM rs_users WHERE s_user IS NOT NULL AND s_password IS NOT NULL ORDER BY company_name");
$companyStmt->execute();
$availableCompanies = $companyStmt->fetchAll(PDO::FETCH_ASSOC);

if (empty($availableCompanies)) {
    die("❌ No companies with credentials found in rs_users table");
}

// Get selected company or default to first one
$selectedCompanyId = $_POST['company_id'] ?? $availableCompanies[0]['id'];
$selectedCompany = null;

foreach ($availableCompanies as $company) {
    if ($company['id'] == $selectedCompanyId) {
        $selectedCompany = $company;
        break;
    }
}

if (!$selectedCompany) {
    $selectedCompany = $availableCompanies[0]; // Fallback to first company
}

$credentials = [
    's_user' => $selectedCompany['s_user'],
    's_password' => $selectedCompany['s_password'],
    'company_tin' => $selectedCompany['company_tin'],
    'user_id' => $selectedCompany['user_id'],
    'un_id' => $selectedCompany['un_id']
];

// === Use EXACT same API logic as sync_company_data.php ===
$company_tin = $credentials['company_tin'];
$user = $credentials['s_user'];
$password = $credentials['s_password'];
$user_id = $credentials['user_id'];
$un_id = $credentials['un_id'];

// Use same date range as sync script
$startDate = '2024-01-01';
$endDate = date('Y-m-d');
$dateFormat = 'Y-m-d\TH:i:s';
$startDateObj = new DateTime($startDate);
$endDateObj = new DateTime($endDate . ' 23:59:59');
$create_date_s = $startDateObj->format($dateFormat);
$create_date_e = $endDateObj->format($dateFormat);

// For invoices - same logic as sync script
$s_dt_hardcoded = (new DateTime('2009-01-01'))->format($dateFormat);
$e_dt_hardcoded = (new DateTime('today 23:59:59'))->format($dateFormat);
$op_s_dt_chunk = (new DateTime($startDate))->format($dateFormat);
$op_e_dt_chunk = (new DateTime($endDate . ' 23:59:59'))->format($dateFormat);

// === Build EXACT same XML requests as sync_company_data.php ===
$waybillRequests = [
    'get_waybills_ex' => '<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
<get_waybills_ex xmlns="http://tempuri.org/">
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
    <max_records>1000</max_records>
    <top>1000</top>
</get_waybills_ex>
</soap:Body>
</soap:Envelope>',

    'get_buyer_waybills_ex' => '<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
<get_buyer_waybills_ex xmlns="http://tempuri.org/">
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
    <max_records>1000</max_records>
    <top>1000</top>
</get_buyer_waybills_ex>
</soap:Body>
</soap:Envelope>',

    'get_waybill' => '<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
<get_waybill xmlns="http://tempuri.org/">
    <su>' . htmlspecialchars($user, ENT_XML1) . '</su>
    <sp>' . htmlspecialchars($password, ENT_XML1) . '</sp>
    <waybill_id>2972</waybill_id>
</get_waybill>
</soap:Body>
</soap:Envelope>'
];

$invoiceRequests = [
    'get_seller_invoices' => '<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
    <get_seller_invoices xmlns="http://tempuri.org/">
    <user_id>' . htmlspecialchars($user_id, ENT_XML1) . '</user_id>
    <un_id>' . htmlspecialchars($un_id, ENT_XML1) . '</un_id>
    <s_dt>' . $s_dt_hardcoded . '</s_dt>
    <e_dt>' . $e_dt_hardcoded . '</e_dt>
    <op_s_dt>' . $op_s_dt_chunk . '</op_s_dt>
    <op_e_dt>' . $op_e_dt_chunk . '</op_e_dt>
    <su>' . htmlspecialchars($user, ENT_XML1) . '</su>
    <sp>' . htmlspecialchars($password, ENT_XML1) . '</sp>
    <max_records>1000</max_records>
    <top>1000</top>
    </get_seller_invoices>
</soap:Body>
</soap:Envelope>',

    'get_buyer_invoices' => '<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
    <get_buyer_invoices xmlns="http://tempuri.org/">
    <user_id>' . htmlspecialchars($user_id, ENT_XML1) . '</user_id>
    <un_id>' . htmlspecialchars($un_id, ENT_XML1) . '</un_id>
    <s_dt>' . $s_dt_hardcoded . '</s_dt>
    <e_dt>' . $e_dt_hardcoded . '</e_dt>
    <op_s_dt>' . $op_s_dt_chunk . '</op_s_dt>
    <op_e_dt>' . $op_e_dt_chunk . '</op_e_dt>
    <su>' . htmlspecialchars($user, ENT_XML1) . '</su>
    <sp>' . htmlspecialchars($password, ENT_XML1) . '</sp>
    <max_records>1000</max_records>
    <top>1000</top>
    </get_buyer_invoices>
</soap:Body>
</soap:Envelope>',

    'get_invoice' => '<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
<get_invoice xmlns="http://tempuri.org/">
    <user_id>' . htmlspecialchars($user_id, ENT_XML1) . '</user_id>
    <un_id>' . htmlspecialchars($un_id, ENT_XML1) . '</un_id>
    <invois_id>12345</invois_id>
    <su>' . htmlspecialchars($user, ENT_XML1) . '</su>
    <sp>' . htmlspecialchars($password, ENT_XML1) . '</sp>
</get_invoice>
</soap:Body>
</soap:Envelope>'
];

// === Show form with EXACT same parameters ===
echo "<h2>🔧 API Analysis - EXACT Same Parameters as sync_company_data.php</h2>";

// Company Selection Form
echo "<form method='post' style='margin-bottom:20px;'>";
echo "<div style='background:#f8f9fa; padding:15px; border-radius:5px; margin:20px 0; border:1px solid #dee2e6;'>";
echo "<h4>🏢 Company Selection</h4>";
echo "<p><strong>Select Company:</strong></p>";
echo "<select name='company_id' style='padding:8px; border-radius:4px; border:1px solid #ced4da; margin-right:10px; min-width:300px;'>";

foreach ($availableCompanies as $company) {
    $selected = ($company['id'] == $selectedCompanyId) ? 'selected' : '';
    $status = ($company['s_user'] && $company['s_password']) ? '✅' : '❌';
    echo "<option value='{$company['id']}' $selected>";
    echo "{$status} {$company['company_name']} (TIN: {$company['company_tin']})";
    echo "</option>";
}

echo "</select>";
echo "<button type='submit' style='padding:8px 16px; background:#007bff; color:white; border:none; border-radius:4px; cursor:pointer;'>";
echo "🔄 Switch Company";
echo "</button>";
echo "</div>";
echo "</form>";

echo "<div style='background:#e8f5e8; padding:15px; border-radius:5px; margin:20px 0;'>";
echo "<h3>🎯 Current API Parameters (Matching sync_company_data.php)</h3>";
echo "<p><strong>Selected Company:</strong> <span style='color:#28a745; font-weight:bold;'>{$selectedCompany['company_name']}</span></p>";
echo "<p><strong>Company TIN:</strong> " . ($credentials['company_tin'] ?? 'Not found') . "</p>";
echo "<p><strong>Service User:</strong> " . ($credentials['s_user'] ?? 'Not found') . "</p>";
echo "<p><strong>User ID:</strong> " . ($credentials['user_id'] ?? 'Not found') . "</p>";
echo "<p><strong>UN ID:</strong> " . ($credentials['un_id'] ?? 'Not found') . "</p>";
echo "<p><strong>Date Range:</strong> $startDate to $endDate</p>";
echo "<p><strong>Waybill Date Format:</strong> $create_date_s to $create_date_e</p>";
echo "<p><strong>Invoice Date Format:</strong> $op_s_dt_chunk to $op_e_dt_chunk</p>";
echo "<p><strong>Record Limit:</strong> <span style='color:#28a745; font-weight:bold;'>1000 records per bulk API call</span></p>";
echo "<p><em>💡 Fetching 1000 records to discover ALL possible columns and data types for comprehensive schema analysis</em></p>";
echo "<p><em>💡 <strong>Individual APIs:</strong> get_waybill (waybill ID: 2972) and get_invoice (invoice ID: 12345) for single record analysis</em></p>";
echo "<p><em>💡 <strong>Test IDs:</strong> Using sample IDs from your XML response for realistic testing</em></p>";
echo "</div>";

echo "<form method='post' style='margin-bottom:20px;'>";
echo "<input type='hidden' name='company_id' value='$selectedCompanyId'>";
echo "<fieldset style='margin-bottom:15px;'><legend><b>Date Range Override</b></legend>";
echo "<label>Start Date: <input type='date' name='start_date' value='$startDate'></label><br>";
echo "<label>End Date: <input type='date' name='end_date' value='$endDate'></label><br>";
echo "<button type='submit'>Update Date Range & Re-analyze</button>";
echo "</fieldset>";
echo "</form>";

// === If form submitted, update date range ===
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_POST['start_date']) && isset($_POST['end_date'])) {
        $startDate = $_POST['start_date'];
        $endDate = $_POST['end_date'];
        
        // Rebuild requests with new dates
        $startDateObj = new DateTime($startDate);
        $endDateObj = new DateTime($endDate . ' 23:59:59');
        $create_date_s = $startDateObj->format($dateFormat);
        $create_date_e = $endDateObj->format($dateFormat);
        $op_s_dt_chunk = (new DateTime($startDate))->format($dateFormat);
        $op_e_dt_chunk = (new DateTime($endDate . ' 23:59:59'))->format($dateFormat);
        
        // Rebuild waybill requests
        $waybillRequests['get_waybills_ex'] = str_replace(
            ['<begin_date_s>2024-01-01T00:00:00</begin_date_s>', '<begin_date_e>2024-12-31T23:59:59</begin_date_e>'],
            ["<begin_date_s>$create_date_s</begin_date_s>", "<begin_date_e>$create_date_e</begin_date_e>"],
            $waybillRequests['get_waybills_ex']
        );
        
        $waybillRequests['get_buyer_waybills_ex'] = str_replace(
            ['<create_date_s>2024-01-01T00:00:00</create_date_s>', '<create_date_e>2024-12-31T23:59:59</create_date_e>'],
            ["<create_date_s>$create_date_s</create_date_s>", "<create_date_e>$create_date_e</create_date_e>"],
            $waybillRequests['get_buyer_waybills_ex']
        );
        
        // Rebuild invoice requests
        $invoiceRequests['get_seller_invoices'] = str_replace(
            ['<op_s_dt>2024-01-01T00:00:00</op_s_dt>', '<op_e_dt>2024-12-31T23:59:59</op_e_dt>'],
            ["<op_s_dt>$op_s_dt_chunk</op_s_dt>", "<op_e_dt>$op_e_dt_chunk</op_e_dt>"],
            $invoiceRequests['get_seller_invoices']
        );
        
        $invoiceRequests['get_buyer_invoices'] = str_replace(
            ['<op_s_dt>2024-01-01T00:00:00</op_s_dt>', '<op_e_dt>2024-12-31T23:59:59</op_e_dt>'],
            ["<op_s_dt>$op_s_dt_chunk</op_s_dt>", "<op_e_dt>$op_e_dt_chunk</op_e_dt>"],
            $invoiceRequests['get_buyer_invoices']
        );
        
        echo "<div style='background:#fff3cd; padding:15px; border-radius:5px; margin:20px 0;'>";
        echo "<h3>✅ Date Range Updated</h3>";
        echo "<p><strong>New Date Range:</strong> $startDate to $endDate</p>";
        echo "<p><strong>New Waybill Range:</strong> $create_date_s to $create_date_e</p>";
        echo "<p><strong>New Invoice Range:</strong> $op_s_dt_chunk to $op_e_dt_chunk</p>";
        echo "</div>";
    }
}

// === Helper functions ===
function replaceXmlValues($xml, $values) {
    foreach ($values as $tag => $val) {
        if ($val === null) {
            // Handle null values as xsi:nil="true" (matching sync script)
            $xml = preg_replace('/<' . $tag . '>.*?<\/' . $tag . '>/',
                                '<' . $tag . ' xsi:nil="true"/>', $xml);
        } else {
            $xml = preg_replace('/<' . $tag . '>.*?<\/' . $tag . '>/',
                                '<' . $tag . '>' . $val . '</' . $tag . '>', $xml);
        }
    }
    return $xml;
}

function extractFields($node, &$fields, &$samples, $prefix = '') {
    // Also process attributes of the current node
    foreach ($node->attributes() as $attrName => $attrValue) {
        $fieldName = $prefix ? $prefix . '_@' . $attrName : '@' . $attrName;
        $fields[$fieldName] = true; // Mark field as seen
        $value = (string)$attrValue;

        // Store sample value
        if ($value && trim($value) !== '' && (!isset($samples[$fieldName]) || strlen($value) > strlen($samples[$fieldName] ?? ''))) {
            $samples[$fieldName] = $value;
        }
    }

    foreach ($node->children() as $child) {
        $fieldName = $prefix ? $prefix . '_' . $child->getName() : $child->getName();
        
        // ALWAYS capture the field name
        $fields[$fieldName] = true;
        
        $value = (string)$child;
        
        if ($child->count() == 0) { // It's a leaf node (or has a simple value)
            if ($value && trim($value) !== '') {
                // Only update sample if we don't have one, or this one is longer
                if (!isset($samples[$fieldName]) || strlen($value) > strlen($samples[$fieldName])) {
                    $samples[$fieldName] = $value;
                }
            } else {
                // Mark as null/empty if we don't have a sample yet
                if (!isset($samples[$fieldName])) {
                    $samples[$fieldName] = '[NULL/EMPTY]';
                }
            }
        }
        
        // Recursively process child elements to find nested fields
        if ($child->count() > 0) {
            extractFields($child, $fields, $samples, $fieldName);
        }
    }
}
function inferDataType($value) {
    if ($value === '') return 'NULL';
    if (is_numeric($value)) return (strpos($value, '.') !== false) ? 'DECIMAL' : 'INT';
    if (strtotime($value) !== false) return 'DATETIME';
    return (strlen($value) > 255) ? 'NVARCHAR(MAX)' : 'NVARCHAR(' . strlen($value) . ')';
}
function analyzeApiFields($name, $url, $soapAction, $xml, $idFieldToCapture = null) {
    echo "<h3>📡 $name</h3>";
    
    // Log to server error log and browser console
    error_log("[$name] Raw SOAP Request:\n" . $xml);
    echo "<script>console.log('[$name] Raw SOAP Request:', " . json_encode($xml) . ");</script>";

    // Show the XML request being sent
    echo "<details><summary>🔍 <strong>XML Request</strong></summary>";
    echo "<pre style='background:#f5f5f5; padding:10px; border:1px solid #ccc; max-height:300px; overflow:auto;'>";
    echo htmlspecialchars($xml);
    echo "</pre></details>"; 
    
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $xml,
        CURLOPT_HTTPHEADER => [
            'Content-Type: text/xml; charset=utf-8',
            'SOAPAction: "http://tempuri.org/' . $soapAction . '"'
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 40,
        CURLOPT_VERBOSE => true
    ]);
    
    // Capture verbose output for debugging
    $verbose = fopen('php://temp', 'w+');
    curl_setopt($ch, CURLOPT_STDERR, $verbose);
    
    $response = curl_exec($ch);
    $curl_error = curl_error($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $content_type = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    $response_size = curl_getinfo($ch, CURLINFO_SIZE_DOWNLOAD);
    curl_close($ch);
    
    // Log to server error log and browser console
    error_log("[$name] Raw SOAP Response (HTTP {$http_code}):\n" . $response);
    echo "<script>console.log('[$name] Raw SOAP Response (HTTP {$http_code}):', " . json_encode($response) . ");</script>";

    // Show verbose cURL output
    rewind($verbose);
    $verbose_output = stream_get_contents($verbose);
    fclose($verbose);
    
    echo "<details><summary>🔧 <strong>cURL Debug Info</strong></summary>";
    echo "<pre style='background:#f8f9fa; padding:10px; border:1px solid #dee2e6; max-height:200px; overflow:auto; font-size:12px;'>";
    echo "HTTP Code: $http_code\n";
    echo "Content-Type: $content_type\n";
    echo "Response Size: $response_size bytes\n";
    echo "cURL Verbose Output:\n$verbose_output";
    echo "</pre></details>";
    
    $capturedId = null; // Initialize captured ID

    if ($curl_error) {
        echo "<p style='color:red;'>❌ cURL Error: $curl_error</p>";
        return null;
    }
    
    if ($http_code !== 200) {
        echo "<p style='color:red;'>❌ HTTP Error $http_code</p>";
        return null;
    }
    
    // === ENHANCED XML RESPONSE DEBUGGING ===
    echo "<details><summary>📥 <strong>XML Response Analysis</strong></summary>";
    
    // Show response size and encoding info
    echo "<div style='background:#fff3cd; padding:10px; border-radius:5px; margin:10px 0;'>";
    echo "<h4>📊 Response Information</h4>";
    echo "<p><strong>Response Size:</strong> " . strlen($response) . " bytes</p>";
    echo "<p><strong>Content Type:</strong> $content_type</p>";
    echo "<p><strong>First 100 chars:</strong> " . htmlspecialchars(substr($response, 0, 100)) . "</p>";
    echo "<p><strong>Last 100 chars:</strong> " . htmlspecialchars(substr($response, -100)) . "</p>";
    echo "</div>";
    
    // Detect encoding issues
    echo "<div style='background:#d1ecf1; padding:10px; border-radius:5px; margin:10px 0;'>";
    echo "<h4>🔍 Encoding Analysis</h4>";
    
    $encodings = ['UTF-8', 'ISO-8859-1', 'Windows-1252', 'ASCII'];
    foreach ($encodings as $encoding) {
        if (mb_check_encoding($response, $encoding)) {
            echo "<p style='color:green;'>✅ Valid $encoding encoding</p>";
        } else {
            echo "<p style='color:red;'>❌ Invalid $encoding encoding</p>";
        }
    }
    
    // Check for BOM
    if (strpos($response, "\xEF\xBB\xBF") === 0) {
        echo "<p style='color:orange;'>⚠️ BOM detected at start</p>";
    }
    
    // Check for null bytes
    $null_count = substr_count($response, "\x00");
    if ($null_count > 0) {
        echo "<p style='color:orange;'>⚠️ $null_count null bytes found</p>";
    }
    
    echo "</div>";
    
    // Show raw response
    echo "<div style='background:#f8f9fa; padding:10px; border-radius:5px; margin:10px 0;'>";
    echo "<h4>📄 Raw Response</h4>";
    echo "<pre style='background:#fff; border:1px solid #ccc; padding:10px; max-height:300px; overflow:auto; font-size:11px;'>";
    echo htmlspecialchars($response);
    echo "</pre>";
    echo "</div>";
    
    echo "</details>";
    
    // === ENHANCED XML PARSING WITH DEBUGGING ===
    echo "<details><summary>🔧 <strong>XML Parsing Debug</strong></summary>";
    
    // Clean the response step by step
    $clean_response = $response;
    $cleaning_steps = [];
    
    // Step 1: Remove BOM
    if (strpos($clean_response, "\xEF\xBB\xBF") === 0) {
        $clean_response = str_replace("\xEF\xBB\xBF", '', $clean_response);
        $cleaning_steps[] = "Removed BOM";
    }
    
    // Step 2: Handle encoding
    if (!mb_check_encoding($clean_response, 'UTF-8')) {
        $original_size = strlen($clean_response);
        $clean_response = mb_convert_encoding($clean_response, 'UTF-8', 'ISO-8859-1');
        $cleaning_steps[] = "Converted from ISO-8859-1 to UTF-8 (size: $original_size → " . strlen($clean_response) . ")";
    }
    
    // Step 3: Remove null bytes
    $null_count = substr_count($clean_response, "\x00");
    if ($null_count > 0) {
        $clean_response = str_replace("\x00", '', $clean_response);
        $cleaning_steps[] = "Removed $null_count null bytes";
    }
    
    // Step 4: Fix empty xmlns attributes
    $xmlns_count = substr_count($clean_response, 'xmlns=""');
    if ($xmlns_count > 0) {
        $clean_response = preg_replace('/xmlns=""/', '', $clean_response);
        $cleaning_steps[] = "Removed $xmlns_count empty xmlns attributes";
    }
    
    // Step 5: Fix "null" strings
    $null_string_count = substr_count($clean_response, '>null<');
    if ($null_string_count > 0) {
        $clean_response = str_replace('>null<', '><', $clean_response);
        $cleaning_steps[] = "Fixed $null_string_count 'null' strings";
    }
    
    // Step 6: Remove problematic prefixes
    $prefixes = ['soap:', 'diffgr:', 'msdata:'];
    foreach ($prefixes as $prefix) {
        $prefix_count = substr_count($clean_response, $prefix);
        if ($prefix_count > 0) {
            $clean_response = str_ireplace($prefix, '', $clean_response);
            $cleaning_steps[] = "Removed $prefix_count '$prefix' prefixes";
        }
    }
    
    // Show cleaning steps
    echo "<div style='background:#e8f5e8; padding:10px; border-radius:5px; margin:10px 0;'>";
    echo "<h4>🧹 XML Cleaning Steps</h4>";
    if (empty($cleaning_steps)) {
        echo "<p>✅ No cleaning needed - XML is clean</p>";
    } else {
        echo "<ul>";
        foreach ($cleaning_steps as $step) {
            echo "<li>$step</li>";
        }
        echo "</ul>";
    }
    echo "<p><strong>Original size:</strong> " . strlen($response) . " bytes</p>";
    echo "<p><strong>Cleaned size:</strong> " . strlen($clean_response) . " bytes</p>";
    echo "</div>";
    
    // Show cleaned XML
    echo "<div style='background:#f8f9fa; padding:10px; border-radius:5px; margin:10px 0;'>";
    echo "<h4>✨ Cleaned XML</h4>";
    echo "<pre style='background:#fff; border:1px solid #ccc; padding:10px; max-height:300px; overflow:auto; font-size:11px;'>";
    echo htmlspecialchars($clean_response);
    echo "</pre>";
    echo "</div>";
    
    echo "</details>";
    
    // === XML PARSING ATTEMPT ===
    libxml_use_internal_errors(true);
    $xmlObj = simplexml_load_string($clean_response);
    
    if ($xmlObj === false) {
        echo "<details open><summary>❌ <strong>XML Parse Error Details</strong></summary>";
        
        $libxml_errors = libxml_get_errors();
        echo "<div style='background:#f8d7da; padding:15px; border-radius:5px; margin:10px 0;'>";
        echo "<h4>🚨 LibXML Errors</h4>";
        
        if (empty($libxml_errors)) {
            echo "<p>No LibXML errors reported, but parsing failed.</p>";
        } else {
            echo "<ul>";
            foreach ($libxml_errors as $error) {
                $error_type = '';
                switch ($error->level) {
                    case LIBXML_ERR_WARNING: $error_type = 'WARNING'; break;
                    case LIBXML_ERR_ERROR: $error_type = 'ERROR'; break;
                    case LIBXML_ERR_FATAL: $error_type = 'FATAL'; break;
                }
                
                echo "<li style='margin-bottom:10px;'>";
                echo "<strong>$error_type</strong> (Line {$error->line}, Column {$error->column}):<br>";
                echo "<code>" . htmlspecialchars(trim($error->message)) . "</code>";
                echo "</li>";
            }
            echo "</ul>";
        }
        echo "</div>";
        
        // Show problematic areas in the XML
        echo "<div style='background:#fff3cd; padding:15px; border-radius:5px; margin:10px 0;'>";
        echo "<h4>🔍 Problematic XML Areas</h4>";
        
        // Find lines around errors
        $lines = explode("\n", $clean_response);
        foreach ($libxml_errors as $error) {
            if ($error->line > 0 && $error->line <= count($lines)) {
                $line_num = $error->line;
                $start = max(0, $line_num - 3);
                $end = min(count($lines), $line_num + 3);
                
                echo "<p><strong>Error around line $line_num:</strong></p>";
                echo "<pre style='background:#fff; border:1px solid #ccc; padding:10px; max-height:150px; overflow:auto; font-size:11px;'>";
                for ($i = $start; $i < $end; $i++) {
                    $line_content = $lines[$i];
                    $line_style = ($i == $line_num - 1) ? 'background:#ffebee; font-weight:bold;' : '';
                    echo "<div style='$line_style'>" . str_pad($i + 1, 4, ' ', STR_PAD_LEFT) . ": " . htmlspecialchars($line_content) . "</div>";
                }
                echo "</pre>";
            }
        }
        echo "</div>";
        
        libxml_clear_errors();
        echo "</details>";
        return null;
    }
    
    echo "<div style='background:#d4edda; padding:10px; border-radius:5px; margin:10px 0;'>";
    echo "<h4>✅ XML Parsed Successfully</h4>";
    echo "<p>XML structure loaded without errors.</p>";
    echo "</div>";
    
    echo "</details>";
    
    // === FIELD ANALYSIS ===
    $xmlObj->registerXPathNamespace('soap', 'http://schemas.xmlsoap.org/soap/envelope/');
    $xmlObj->registerXPathNamespace('ns', 'http://tempuri.org/');
    
    // Try multiple XPath patterns to find result nodes
    $resultNodes = [];
    $xpath_patterns = [
        '//ns:' . $soapAction . 'Result',
        '//*[local-name()="' . $soapAction . 'Result"]',
        '//*[contains(local-name(), "Result")]'
    ];
    
    foreach ($xpath_patterns as $pattern) {
        $nodes = $xmlObj->xpath($pattern);
        if (!empty($nodes)) {
            $resultNodes = $nodes;
            break;
        }
    }
    
    if (empty($resultNodes)) {
        echo "<details open><summary>⚠️ <strong>No Result Nodes Found</strong></summary>";
        echo "<div style='background:#fff3cd; padding:15px; border-radius:5px; margin:10px 0;'>";
        echo "<h4>🔍 XPath Search Results</h4>";
        echo "<p>Tried the following XPath patterns:</p>";
        echo "<ul>";
        foreach ($xpath_patterns as $pattern) {
            echo "<li><code>" . htmlspecialchars($pattern) . "</code></li>";
        }
        echo "</ul>";
        
        // Show XML structure for debugging
        echo "<h4>📋 XML Structure</h4>";
        echo "<pre style='background:#fff; border:1px solid #ccc; padding:10px; max-height:200px; overflow:auto; font-size:11px;'>";
        echo htmlspecialchars($xmlObj->asXML());
        echo "</pre>";
        echo "</div>";
        echo "</details>";
        return null;
    }

    $fields = $samples = [];
    $resultNode = $resultNodes[0];
    $potentialXmlString = (string)$resultNode;
    $nodesToProcess = [];

    if (strpos(trim($potentialXmlString), '<') === 0) {
        echo "<p style='background:#e2e3e5; padding: 5px; border-radius:3px;'>ℹ️ Nested XML detected. Parsing inner content.</p>";
        libxml_use_internal_errors(true);
        $innerXml = simplexml_load_string($potentialXmlString);
        $xml_errors = libxml_get_errors();
        libxml_clear_errors();

        if ($innerXml) {
            $innerXml->registerXPathNamespace('diffgr', 'urn:schemas-microsoft-com:xml-diffgram-v1');
            $dataSetRecords = $innerXml->xpath('//diffgr:diffgram/*[1]/*');

            if (count($dataSetRecords) > 0) {
                echo "<p style='background:#d4edda; padding: 5px; border-radius:3px;'>✅ Detected ADO.NET DataSet format.</p>";
                $nodesToProcess = $dataSetRecords;
            } else if ($innerXml->count() > 0) {
                if ($innerXml->count() == 1) {
                    $rootNode = $innerXml->children()[0];
                    if ($rootNode->count() > 0) {
                        echo "<p style='background:#d4edda; padding: 5px; border-radius:3px;'>✅ Detected root node `{$rootNode->getName()}` with child records.</p>";
                        $nodesToProcess = $rootNode->children();
                    } else {
                        echo "<p style='background:#d4edda; padding: 5px; border-radius:3px;'>✅ Detected single record response.</p>";
                        $nodesToProcess = [$rootNode];
                    }
                } else {
                    echo "<p style='background:#d4edda; padding: 5px; border-radius:3px;'>✅ Detected list of sibling records.</p>";
                    $nodesToProcess = $innerXml->children();
                }
            } else {
                echo "<p style='background:#d4edda; padding: 5px; border-radius:3px;'>✅ Detected single record response (no wrapper).</p>";
                $nodesToProcess = [$innerXml];
            }
        } else {
            echo "<p style='color:red;'>❌ Error parsing nested XML.</p>";
            if (!empty($xml_errors)) {
                echo "<pre>"; print_r($xml_errors); echo "</pre>";
            }
        }
    } else {
        echo "<p style='background:#e2e3e5; padding: 5px; border-radius:3px;'>ℹ️ No nested XML detected. Processing direct children of result node.</p>";
        $nodesToProcess = $resultNode->children();
    }

    $recordCount = count($nodesToProcess);
    echo "<h4>Found $recordCount records to analyze.</h4>";

    if ($recordCount > 0) {
        foreach ($nodesToProcess as $recordNode) {
            extractFields($recordNode, $fields, $samples);
        }
    }

    // After samples are populated, look for the ID
    if ($idFieldToCapture && isset($samples[$idFieldToCapture]) && $samples[$idFieldToCapture] !== '[NULL/EMPTY]') {
        $capturedId = $samples[$idFieldToCapture];
        echo "<div style='background:#d1ecf1; padding:10px; border-radius:5px; margin:10px 0;'>";
        echo "<h4>🔑 Captured ID for Individual Test</h4>";
        echo "<p>Found <strong>$idFieldToCapture</strong>: <code>" . htmlspecialchars($capturedId) . "</code>. This will be used for the subsequent individual record API call.</p>";
        echo "</div>";
    }
    
    if (empty($fields)) {
        echo "<p style='color:orange;'>⚠️ No fields found in result nodes. This could mean the API returned no data for the selected company and date range, or the response structure is unexpected.</p>";
        return $capturedId; // Return ID even if no other fields, it might be the only thing that came back
    }
    
    echo "<details open><summary>📊 <strong>Field Analysis</strong></summary>";
    
    // Count fields by data status
    $fieldsWithData = 0;
    $fieldsWithoutData = 0;
    $totalFields = count($fields);
    
    foreach ($fields as $field => $trueVal) {
        $val = $samples[$field] ?? '';
        if ($val === '[NULL/EMPTY]') {
            $fieldsWithoutData++;
        } else {
            $fieldsWithData++;
        }
    }
    
    // Show field statistics
    echo "<div style='background:#e8f5e8; padding:10px; border-radius:5px; margin:10px 0;'>";
    echo "<h4>📈 Field Discovery Summary</h4>";
    echo "<p><strong>Total Fields Found:</strong> $totalFields</p>";
    echo "<p><strong>Fields With Data:</strong> <span style='color:#28a745;'>$fieldsWithData</span></p>";
    echo "<p><strong>Fields Without Data:</strong> <span style='color:#ffc107;'>$fieldsWithoutData</span></p>";
    echo "<p><strong>Field Coverage:</strong> " . round(($fieldsWithData / $totalFields) * 100, 1) . "%</p>";
    echo "<p><em>💡 Fields without data are still important for database schema planning - they represent potential columns that may contain data in other records.</em></p>";
    echo "</div>";
    
    echo "<table border='1' style='border-collapse:collapse;width:100%;'>";
    echo "<tr><th>Field</th><th>Sample/Status</th><th>Type</th><th>Len</th><th>Data Status</th></tr>";
    
    foreach ($fields as $field => $trueVal) {
        $val = $samples[$field] ?? '';
        $dataStatus = '';
        $rowStyle = '';
        
        if ($val === '[NULL/EMPTY]') {
            $dataStatus = '<span style="color:#ffc107; font-weight:bold;">NO DATA</span>';
            $rowStyle = 'background-color:#fff3cd;';
            $sampleDisplay = '<em style="color:#6c757d;">[NULL/EMPTY]</em>';
            $typeDisplay = '<em style="color:#6c757d;">UNKNOWN</em>';
            $lengthDisplay = '<em style="color:#6c757d;">-</em>';
        } else {
            $dataStatus = '<span style="color:#28a745; font-weight:bold;">HAS DATA</span>';
            $sampleDisplay = htmlspecialchars(substr($val, 0, 50));
            $typeDisplay = inferDataType($val);
            $lengthDisplay = strlen($val);
        }
        
        echo "<tr style='$rowStyle'>";
        echo "<td><strong>$field</strong></td>";
        echo "<td>$sampleDisplay</td>";
        echo "<td>$typeDisplay</td>";
        echo "<td>$lengthDisplay</td>";
        echo "<td>$dataStatus</td>";
        echo "</tr>";
    }
    echo "</table>";
    
    // Show recommendations for database schema
    echo "<div style='background:#d1ecf1; padding:15px; border-radius:5px; margin:15px 0;'>";
    echo "<h4>💡 Database Schema Recommendations</h4>";
    echo "<ul>";
    echo "<li><strong>Fields with data:</strong> Use actual data types and lengths for these fields</li>";
    echo "<li><strong>Fields without data:</strong> Consider using nullable fields with appropriate default data types</li>";
    echo "<li><strong>Field naming:</strong> All discovered field names should be included in your schema</li>";
    echo "<li><strong>Data type planning:</strong> Plan for both current data and potential future data</li>";
    echo "</ul>";
    echo "</div>";
    
    echo "</details>";
    return $capturedId;
}

// ===  Run API analysis with EXACT same requests as sync_company_data.php ===
$first_waybill_id = null;
$first_invoice_id = null;
$first_decl_num = null; // Variable to hold a declaration number for testing
$dateFormat = 'Y-m-d\TH:i:s'; // Ensure date format is available in this scope

echo "<div style='background:#f0f8ff; padding:15px; border-radius:5px; margin:20px 0;'>";
echo "<h3>📈 Overall Analysis Summary</h3>";
echo "<p>This tool now uses the <strong>exact same API parameters</strong> as <code>sync_company_data.php</code></p>";
echo "<p>Key improvements:</p>";
echo "<ul>";
echo "<li>✅ Uses real company TIN from database</li>";
echo "<li>✅ Matches exact parameter structure (xsi:nil=\"true\" for optional fields)</li>";
echo "<li>✅ Shows both request and response XML</li>";
echo "<li>✅ Collapsible sections for better readability</li>";
echo "<li>✅ Field type inference for database schema planning</li>";
echo "<li>✅ Automatically retries with a wider date range if no data is found initially.</li>";
echo "</ul>";
echo "</div>";

// === Test Waybill APIs (Bulk Calls First) ===
echo "<h2>🚚 Waybill API Analysis (Bulk)</h2>";
$bulkWaybillRequests = [
    'get_waybills_ex' => $waybillRequests['get_waybills_ex'],
    'get_buyer_waybills_ex' => $waybillRequests['get_buyer_waybills_ex'],
];

foreach ($bulkWaybillRequests as $soapAction => $xml_request) {
    $url = "https://services.rs.ge/WayBillService/WayBillService.asmx";
    $name = ucfirst(str_replace(['get_', '_ex'], ['', ''], $soapAction)) . " Waybills";
    
    echo "<div style='border:2px solid #007bff; border-radius:10px; margin:20px 0; padding:20px;'>";
    $foundId = analyzeApiFields($name, $url, $soapAction, $xml_request, 'ID');
    if ($foundId && !$first_waybill_id) {
        $first_waybill_id = $foundId;
    }
    echo "</div>";
}

// Retry waybills with wider date range if no ID was found
if (!$first_waybill_id) {
    echo "<div class='sync-info' style='padding: 15px; border: 1px solid #bee5eb; background-color: #d1ecf1; border-radius: 5px; margin-bottom: 20px;'><strong>Notice:</strong> No waybills found in the selected date range. Retrying with an extended 2-year date range to find a sample record...</div>";
    
    $extendedStartDate = date('Y-m-d', strtotime('-2 years'));
    $extendedEndDate = date('Y-m-d');
    $extended_create_date_s = (new DateTime($extendedStartDate))->format($dateFormat);
    $extended_create_date_e = (new DateTime($extendedEndDate . ' 23:59:59'))->format($dateFormat);

    foreach ($bulkWaybillRequests as $soapAction => $xml_request) {
        $updated_xml_request = preg_replace('/(<begin_date_s>|<create_date_s>).*?(<\/begin_date_s>|<\/create_date_s>)/', '${1}' . $extended_create_date_s . '${2}', $xml_request);
        $updated_xml_request = preg_replace('/(<begin_date_e>|<create_date_e>).*?(<\/begin_date_e>|<\/create_date_e>)/', '${1}' . $extended_create_date_e . '${2}', $updated_xml_request);

        $url = "https://services.rs.ge/WayBillService/WayBillService.asmx";
        $name = ucfirst(str_replace(['get_', '_ex'], ['', ''], $soapAction)) . " Waybills (Extended Search)";
        
        echo "<div style='border:2px solid #007bff; border-radius:10px; margin:20px 0; padding:20px;'>";
        $foundId = analyzeApiFields($name, $url, $soapAction, $updated_xml_request, 'ID');
        if ($foundId && !$first_waybill_id) {
            $first_waybill_id = $foundId;
        }
        echo "</div>";
    }
}

// === Test Invoice APIs (Bulk Calls First) ===
echo "<h2>📄 Invoice API Analysis (Bulk)</h2>";
$bulkInvoiceRequests = [
    'get_seller_invoices' => $invoiceRequests['get_seller_invoices'],
    'get_buyer_invoices' => $invoiceRequests['get_buyer_invoices'],
];

foreach ($bulkInvoiceRequests as $soapAction => $xml_request) {
    $url = "https://www.revenue.mof.ge/ntosservice/ntosservice.asmx";
    $name = ucfirst(str_replace(['get_', '_invoices'], ['', ''], $soapAction)) . " Invoices";
    
    echo "<div style='border:2px solid #28a745; border-radius:10px; margin:20px 0; padding:20px;'>";
    analyzeApiFields($name, $url, $soapAction, $xml_request);
    echo "</div>";
}

// Retry invoices with wider date range if no ID was found
if (!$first_invoice_id) {
    echo "<div class='sync-info' style='padding: 15px; border: 1px solid #bee5eb; background-color: #d1ecf1; border-radius: 5px; margin-bottom: 20px;'><strong>Notice:</strong> No invoices found in the selected date range. Retrying with an extended 2-year date range to find a sample record...</div>";

    $extendedStartDate = date('Y-m-d', strtotime('-2 years'));
    $extendedEndDate = date('Y-m-d');
    $extended_op_s_dt_chunk = (new DateTime($extendedStartDate))->format($dateFormat);
    $extended_op_e_dt_chunk = (new DateTime($extendedEndDate . ' 23:59:59'))->format($dateFormat);

    foreach ($bulkInvoiceRequests as $soapAction => $xml_request) {
        $updated_xml_request = preg_replace('/(<op_s_dt>).*?(<\/op_s_dt>)/', '${1}' . $extended_op_s_dt_chunk . '${2}', $xml_request);
        $updated_xml_request = preg_replace('/(<op_e_dt>).*?(<\/op_e_dt>)/', '${1}' . $extended_op_e_dt_chunk . '${2}', $updated_xml_request);

        $url = "https://www.revenue.mof.ge/ntosservice/ntosservice.asmx";
        $name = ucfirst(str_replace(['get_', '_invoices'], ['', ''], $soapAction)) . " Invoices (Extended Search)";
        
        echo "<div style='border:2px solid #28a745; border-radius:10px; margin:20px 0; padding:20px;'>";
        analyzeApiFields($name, $url, $soapAction, $updated_xml_request);
        echo "</div>";
    }
}

// === Test Individual Waybill API ===
echo "<h2>🚚 Individual Waybill Details</h2>";
echo "<div style='border:2px solid #007bff; border-radius:10px; margin:20px 0; padding:20px;'>";
if ($first_waybill_id) {
    $getWaybillXml = str_replace('<waybill_id>2972</waybill_id>', "<waybill_id>$first_waybill_id</waybill_id>", $waybillRequests['get_waybill']);
    $url = "https://services.rs.ge/WayBillService/WayBillService.asmx";
    analyzeApiFields("Individual Waybill Details (ID: $first_waybill_id)", $url, 'get_waybill', $getWaybillXml);
} else {
    echo "<div class='sync-info' style='padding: 15px; border: 1px solid #bee5eb; background-color: #d1ecf1; border-radius: 5px;'>";
    echo "<strong>Skipping individual waybill test:</strong> No waybill ID could be found in the bulk API calls, even after extending the date range by 2 years.";
    echo "</div>";
}
echo "</div>";

// === Test Individual Invoice API ===
echo "<h2>📄 Individual Invoice Details (using ID from Database)</h2>";
echo "<div style='border:2px solid #28a745; border-radius:10px; margin:20px 0; padding:20px;'>";

// New logic: Get a recent invoice ID and declaration number from the database for the selected company.
$db_fetch_error = null;
$recent_invoice = null; 
try {
    error_log("Attempting to fetch a recent invoice with a declaration number from DB for company_id: $selectedCompanyId");
    // Try seller invoices first
    $stmt = $pdo->prepare("SELECT TOP 1 INVOICE_ID, SEQ_NUM_S FROM rs.seller_invoices WHERE COMPANY_ID = ? AND INVOICE_ID IS NOT NULL AND SEQ_NUM_S IS NOT NULL ORDER BY OPERATION_DT DESC");
    $stmt->execute([$selectedCompanyId]);
    $recent_invoice = $stmt->fetch(PDO::FETCH_ASSOC);
    error_log("Seller invoices check for company_id $selectedCompanyId result: " . ($recent_invoice ? json_encode($recent_invoice) : 'not found'));

    if (!$recent_invoice) {
        // Try buyer invoices if no seller invoices found
        $stmt = $pdo->prepare("SELECT TOP 1 INVOICE_ID, SEQ_NUM_B FROM rs.buyer_invoices WHERE COMPANY_ID = ? AND INVOICE_ID IS NOT NULL AND SEQ_NUM_B IS NOT NULL ORDER BY OPERATION_DT DESC");
        $stmt->execute([$selectedCompanyId]);
        $recent_invoice = $stmt->fetch(PDO::FETCH_ASSOC);
        error_log("Buyer invoices check for company_id $selectedCompanyId result: " . ($recent_invoice ? json_encode($recent_invoice) : 'not found'));
    }
} catch (Exception $e) {
    $db_fetch_error = $e->getMessage();
    error_log("Error fetching invoice ID from DB for company_id $selectedCompanyId: " . $db_fetch_error);
}


$first_invoice_id = $recent_invoice['INVOICE_ID'] ?? null;
$first_decl_num = $recent_invoice['SEQ_NUM_S'] ?? $recent_invoice['SEQ_NUM_B'] ?? null;


if ($first_invoice_id) {
    echo "<div class='sync-info' style='padding: 15px; border: 1px solid #bee5eb; background-color: #d1ecf1; border-radius: 5px; margin-bottom: 15px;'>";
    echo "<strong>Database Fetch Success:</strong> Found existing Invoice ID <code>{$first_invoice_id}</code> in the local database for company '{$selectedCompany['company_name']}'. Using this ID for the individual API analysis below.";
    echo "</div>";

    $getInvoiceXml = str_replace('<invois_id>12345</invois_id>', "<invois_id>$first_invoice_id</invois_id>", $invoiceRequests['get_invoice']);
    $url = "https://www.revenue.mof.ge/ntosservice/ntosservice.asmx";
    analyzeApiFields("Individual Invoice Details (ID: $first_invoice_id)", $url, 'get_invoice', $getInvoiceXml);

    // Also analyze the goods/line items for this invoice
    echo "<div style='border-top: 2px dashed #28a745; margin-top: 20px; padding-top: 20px;'>";
    $getInvoiceDescXml = '<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
    <get_invoice_desc xmlns="http://tempuri.org/">
    <user_id>' . htmlspecialchars($user_id, ENT_XML1) . '</user_id>
    <invois_id>' . htmlspecialchars($first_invoice_id, ENT_XML1) . '</invois_id>
    <su>' . htmlspecialchars($user, ENT_XML1) . '</su>
    <sp>' . htmlspecialchars($password, ENT_XML1) . '</sp>
    </get_invoice_desc>
</soap:Body>
</soap:Envelope>';
    analyzeApiFields("Individual Invoice Goods (ID: $first_invoice_id)", $url, 'get_invoice_desc', $getInvoiceDescXml, 'INV_ID');
    echo "</div>";

    // Analyze get_ntos_invoices_inv_nos
    echo "<div style='border-top: 2px dashed #28a745; margin-top: 20px; padding-top: 20px;'>";
    $getNtosInvoicesInvNosXml = '<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
    <get_ntos_invoices_inv_nos xmlns="http://tempuri.org/">
    <user_id>' . htmlspecialchars($user_id, ENT_XML1) . '</user_id>
    <invois_id>' . htmlspecialchars($first_invoice_id, ENT_XML1) . '</invois_id>
    <su>' . htmlspecialchars($user, ENT_XML1) . '</su>
    <sp>' . htmlspecialchars($password, ENT_XML1) . '</sp>
    </get_ntos_invoices_inv_nos>
</soap:Body>
</soap:Envelope>';
    analyzeApiFields("Individual Invoice Overhead/Associated Numbers (ID: $first_invoice_id)", $url, 'get_ntos_invoices_inv_nos', $getNtosInvoicesInvNosXml, 'INV_ID');
    echo "</div>";

} else {
    echo "<div class='sync-info' style='padding: 15px; border: 1px solid #ffc107; background-color: #fff3cd; border-radius: 5px;'>";
    echo "<strong>Skipping individual invoice test:</strong> Could not find an existing invoice in the local `rs.seller_invoices` or `rs.buyer_invoices` tables for company '{$selectedCompany['company_name']}'. Run a data sync for this company first.";
    if($db_fetch_error) {
        echo "<br><small><strong>DB Error:</strong> " . htmlspecialchars($db_fetch_error) . "</small>";
    }
    echo "</div>";
}
echo "</div>";

// === Test Utility APIs ===
echo "<h2>🛠️ Utility API Analysis (Based on Postman Collection)</h2>";
echo "<div style='border:2px solid #6c757d; border-radius:10px; margin:20px 0; padding:20px;'>";

// 1. Analyze get_un_id_from_tin
$getUnIdFromTinXml = '<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <get_un_id_from_tin xmlns="http://tempuri.org/">
      <user_id>' . htmlspecialchars($user_id, ENT_XML1) . '</user_id>
      <tin>' . htmlspecialchars($company_tin, ENT_XML1) . '</tin>
      <su>' . htmlspecialchars($user, ENT_XML1) . '</su>
      <sp>' . htmlspecialchars($password, ENT_XML1) . '</sp>
    </get_un_id_from_tin>
  </soap:Body>
</soap:Envelope>';
$url = "https://www.revenue.mof.ge/ntosservice/ntosservice.asmx";
analyzeApiFields("Utility: Get UN_ID from TIN", $url, 'get_un_id_from_tin', $getUnIdFromTinXml);

// 2. Analyze get_tin_from_un_id
if ($un_id) {
    echo "<div style='border-top: 2px dashed #6c757d; margin-top: 20px; padding-top: 20px;'>";
    $getTinFromUnIdXml = '<?xml version="1.0" encoding="utf-8"?>
    <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
      <soap:Body>
        <get_tin_from_un_id xmlns="http://tempuri.org/">
          <user_id>' . htmlspecialchars($user_id, ENT_XML1) . '</user_id>
          <un_id>' . htmlspecialchars($un_id, ENT_XML1) . '</un_id>
          <su>' . htmlspecialchars($user, ENT_XML1) . '</su>
          <sp>' . htmlspecialchars($password, ENT_XML1) . '</sp>
        </get_tin_from_un_id>
      </soap:Body>
    </soap:Envelope>';
    analyzeApiFields("Utility: Get TIN from UN_ID (UN_ID: $un_id)", $url, 'get_tin_from_un_id', $getTinFromUnIdXml);
    echo "</div>";
} else {
     echo "<div class='sync-info' style='padding: 15px; border: 1px solid #ffc107; background-color: #fff3cd; border-radius: 5px; margin-top: 20px;'>";
    echo "<strong>Skipping get_tin_from_un_id test:</strong> No UN_ID is available for the selected company in the `rs_users` table.";
    echo "</div>";
}

// 3. Analyze get_decl_date
if ($first_decl_num) {
    echo "<div style='border-top: 2px dashed #6c757d; margin-top: 20px; padding-top: 20px;'>";
    $getDeclDateXml = '<?xml version="1.0" encoding="utf-8"?>
    <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
      <soap:Body>
        <get_decl_date xmlns="http://tempuri.org/">
          <su>' . htmlspecialchars($user, ENT_XML1) . '</su>
          <sp>' . htmlspecialchars($password, ENT_XML1) . '</sp>
          <decl_num>' . htmlspecialchars($first_decl_num, ENT_XML1) . '</decl_num>
          <un_id>' . htmlspecialchars($un_id, ENT_XML1) . '</un_id>
        </get_decl_date>
      </soap:Body>
    </soap:Envelope>';
    analyzeApiFields("Utility: Get Declaration Date (Decl Num: $first_decl_num)", $url, 'get_decl_date', $getDeclDateXml);
    echo "</div>";
} else {
     echo "<div class='sync-info' style='padding: 15px; border: 1px solid #ffc107; background-color: #fff3cd; border-radius: 5px; margin-top: 20px;'>";
    echo "<strong>Skipping get_decl_date test:</strong> Could not find an invoice with a declaration number in the local database for the selected company.";
    echo "</div>";
}

echo "</div>";

// === Show final summary ===
$apisTested = array_keys(array_merge($bulkWaybillRequests, $bulkInvoiceRequests));
if ($first_waybill_id) $apisTested[] = 'get_waybill';
if ($first_invoice_id) {
    $apisTested[] = 'get_invoice';
    $apisTested[] = 'get_invoice_desc';
    $apisTested[] = 'get_ntos_invoices_inv_nos'; // Add this line
}
$apisTested[] = 'get_un_id_from_tin';
if ($un_id) {
    $apisTested[] = 'get_tin_from_un_id';
}
if ($first_decl_num) $apisTested[] = 'get_decl_date'; // Add get_decl_date to the list

echo "<div style='background:#d4edda; padding:15px; border-radius:5px; margin:20px 0;'>";
echo "<h3>🎯 Analysis Complete</h3>";
echo "<p><strong>Selected Company:</strong> <span style='color:#28a745; font-weight:bold;'>{$selectedCompany['company_name']}</span></p>";
echo "<p><strong>APIs Tested:</strong> " . implode(', ', $apisTested) . "</p>";
echo "<p><strong>Total APIs:</strong> " . count($apisTested) . " (including individual detail APIs if an ID was found)</p>";
echo "<p><strong>Date Range Used:</strong> $startDate to $endDate (with up to a 2-year extension if no data was found)</p>";
echo "<p><strong>Company TIN:</strong> " . ($credentials['company_tin'] ?? 'Unknown') . "</p>";
echo "<p><strong>Record Limit:</strong> <span style='color:#28a745; font-weight:bold;'>1000 records per API call</span></p>";
echo "<p>This analysis shows the <strong>exact same data structure</strong> that your sync script will encounter for <strong>{$selectedCompany['company_name']}</strong>.</p>";
echo "<p><em>💡 <strong>Purpose:</strong> Fetching 1000 records to discover ALL possible columns, data types, and field variations for comprehensive database schema planning.</em></p>";
echo "<p><em>💡 <strong>Company-Specific:</strong> Results may vary between companies due to different business types, data availability, and API access levels.</em></p>";
echo "</div>";
?>
