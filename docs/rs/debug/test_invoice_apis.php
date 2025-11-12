<?php
/**
 * Invoice API Field Testing - Dedicated Testing Page
 * 
 * This page focuses specifically on testing get_buyer_invoices and get_seller_invoices APIs
 * to examine what fields are actually fetched and their data structures.
 * 
 * Based on the existing analyze_api_fields.php but simplified for invoice testing only.
 * 
 * @author System Administrator
 * @version 1.0
 * @since 2024-01-01
 */

// PHP-FPM Optimization for large API responses
ini_set('max_execution_time', 1800);        // 30 minutes
ini_set('memory_limit', '1G');              // 1GB memory
ini_set('max_input_time', 1800);            // 30 minutes input time

// Add shutdown handler for fatal errors
register_shutdown_function('handle_fatal_error');

function handle_fatal_error() {
    $error = error_get_last();
    if ($error !== NULL && in_array($error['type'], [E_ERROR, E_CORE_ERROR, E_PARSE, E_COMPILE_ERROR, E_USER_ERROR])) {
        error_log("[FATAL SCRIPT ERROR in test_invoice_apis.php] " . print_r($error, true));
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
    $selectedCompany = $availableCompanies[0]; // Fallback to first company
}

$credentials = [
    's_user' => $selectedCompany['S_USER'],
    's_password' => $selectedCompany['S_PASSWORD'],
    'company_tin' => $selectedCompany['COMPANY_TIN'],
    'user_id' => $selectedCompany['USER_ID'],
    'un_id' => $selectedCompany['UN_ID']
];

// === Use EXACT same API logic as sync_company_data.php ===
$company_tin = $credentials['company_tin'];
$user = $credentials['s_user'];
$password = $credentials['s_password'];
$user_id = $credentials['user_id'];
$un_id = $credentials['un_id'];

// Use same date range as sync script
$startDate = $_POST['start_date'] ?? '2024-01-01';
$endDate = $_POST['end_date'] ?? date('Y-m-d');
$dateFormat = 'Y-m-d\TH:i:s';

// For invoices - same logic as sync script
$s_dt_hardcoded = (new DateTime('2009-01-01'))->format($dateFormat);
$e_dt_hardcoded = (new DateTime('today 23:59:59'))->format($dateFormat);
$op_s_dt_chunk = (new DateTime($startDate))->format($dateFormat);
$op_e_dt_chunk = (new DateTime($endDate . ' 23:59:59'))->format($dateFormat);

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice API Field Testing</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        .field-table { font-size: 12px; }
        .field-name { font-weight: bold; color: #007bff; }
        .has-data { background-color: #d4edda; }
        .no-data { background-color: #fff3cd; }
        .api-section { border: 2px solid #007bff; border-radius: 10px; margin: 20px 0; padding: 20px; }
        .collapsible { cursor: pointer; background: #f8f9fa; padding: 10px; border-radius: 5px; margin: 10px 0; }
        .collapsible:hover { background: #e9ecef; }
        .content { display: none; padding: 10px; border: 1px solid #dee2e6; border-radius: 5px; }
        .content.show { display: block; }
    </style>
</head>
<body>
<div class="container-fluid mt-4">
    <div class="row">
        <div class="col-12">
            <h1 class="mb-4">📄 Invoice API Field Testing</h1>
            
            <div class="alert alert-info">
                <h5>🎯 Purpose</h5>
                <p>This page specifically tests <strong>get_buyer_invoices</strong> and <strong>get_seller_invoices</strong> APIs to examine:</p>
                <ul>
                    <li>What fields are actually returned by the APIs</li>
                    <li>Whether SEQ_NUM_S and SEQ_NUM_B are true declaration numbers</li>
                    <li>Field data types and sample values</li>
                    <li>Differences between buyer and seller invoice structures</li>
                </ul>
            </div>

            <!-- Company Selection Form -->
            <form method="post" class="mb-4">
                <div class="card">
                    <div class="card-header">
                        <h5>🏢 Company & Date Selection</h5>
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
                            <div class="col-md-3">
                                <label for="start_date" class="form-label">Start Date:</label>
                                <input type="date" name="start_date" id="start_date" class="form-control" value="<?= $startDate ?>">
                            </div>
                            <div class="col-md-3">
                                <label for="end_date" class="form-label">End Date:</label>
                                <input type="date" name="end_date" id="end_date" class="form-control" value="<?= $endDate ?>">
                            </div>
                        </div>
                        <div class="mt-3">
                            <button type="submit" class="btn btn-primary">🔄 Test Invoice APIs</button>
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
                            <p><strong>Date Range:</strong> <?= $startDate ?> to <?= $endDate ?></p>
                        </div>
                    </div>
                </div>
            </div>

<?php

// === Helper functions ===
function extractFields($node, &$fields, &$samples, $prefix = '') {
    // Process attributes of the current node
    foreach ($node->attributes() as $attrName => $attrValue) {
        $fieldName = $prefix ? $prefix . '_@' . $attrName : '@' . $attrName;
        $fields[$fieldName] = true;
        $value = (string)$attrValue;

        if ($value && trim($value) !== '' && (!isset($samples[$fieldName]) || strlen($value) > strlen($samples[$fieldName] ?? ''))) {
            $samples[$fieldName] = $value;
        }
    }

    foreach ($node->children() as $child) {
        $fieldName = $prefix ? $prefix . '_' . $child->getName() : $child->getName();
        
        $fields[$fieldName] = true;
        $value = (string)$child;
        
        if ($child->count() == 0) {
            if ($value && trim($value) !== '') {
                if (!isset($samples[$fieldName]) || strlen($value) > strlen($samples[$fieldName])) {
                    $samples[$fieldName] = $value;
                }
            } else {
                if (!isset($samples[$fieldName])) {
                    $samples[$fieldName] = '[NULL/EMPTY]';
                }
            }
        }
        
        if ($child->count() > 0) {
            extractFields($child, $fields, $samples, $fieldName);
        }
    }
}

function inferDataType($value) {
    if ($value === '' || $value === '[NULL/EMPTY]') return 'NULL';
    if (is_numeric($value)) return (strpos($value, '.') !== false) ? 'DECIMAL' : 'INT';
    if (strtotime($value) !== false) return 'DATETIME';
    return (strlen($value) > 255) ? 'NVARCHAR(MAX)' : 'NVARCHAR(' . strlen($value) . ')';
}

function analyzeInvoiceApi($name, $soapAction, $xml) {
    echo "<div class='api-section'>";
    echo "<h3>📄 $name</h3>";
    
    // Show the XML request being sent
    echo "<div class='collapsible' onclick='toggleContent(this)'>🔍 <strong>XML Request</strong> (Click to expand)</div>";
    echo "<div class='content'>";
    echo "<pre style='background:#f5f5f5; padding:10px; border:1px solid #ccc; max-height:300px; overflow:auto; font-size:11px;'>";
    echo htmlspecialchars($xml);
    echo "</pre></div>"; 
    
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => "https://www.revenue.mof.ge/ntosservice/ntosservice.asmx",
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $xml,
        CURLOPT_HTTPHEADER => [
            'Content-Type: text/xml; charset=utf-8',
            'SOAPAction: "http://tempuri.org/' . $soapAction . '"'
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 40,
    ]);
    
    $response = curl_exec($ch);
    $curl_error = curl_error($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $content_type = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    $response_size = curl_getinfo($ch, CURLINFO_SIZE_DOWNLOAD);
    curl_close($ch);
    
    // Show response info
    echo "<div class='collapsible' onclick='toggleContent(this)'>📊 <strong>Response Information</strong> (Click to expand)</div>";
    echo "<div class='content'>";
    echo "<div style='background:#fff3cd; padding:10px; border-radius:5px; margin:10px 0;'>";
    echo "<p><strong>HTTP Code:</strong> $http_code</p>";
    echo "<p><strong>Content Type:</strong> $content_type</p>";
    echo "<p><strong>Response Size:</strong> " . number_format($response_size) . " bytes</p>";
    echo "</div>";
    echo "</div>";

    if ($curl_error) {
        echo "<div class='alert alert-danger'>❌ cURL Error: $curl_error</div>";
        echo "</div>";
        return;
    }
    
    if ($http_code !== 200) {
        echo "<div class='alert alert-danger'>❌ HTTP Error $http_code</div>";
        echo "</div>";
        return;
    }

    // Show raw response
    echo "<div class='collapsible' onclick='toggleContent(this)'>📄 <strong>Raw XML Response</strong> (Click to expand)</div>";
    echo "<div class='content'>";
    echo "<pre style='background:#fff; border:1px solid #ccc; padding:10px; max-height:300px; overflow:auto; font-size:11px;'>";
    echo htmlspecialchars($response);
    echo "</pre>";
    echo "</div>";
    
    // === XML PARSING ===
    $clean_response = $response;
    
    // Clean the response
    if (strpos($clean_response, "\xEF\xBB\xBF") === 0) {
        $clean_response = str_replace("\xEF\xBB\xBF", '', $clean_response);
    }
    
    if (!mb_check_encoding($clean_response, 'UTF-8')) {
        $clean_response = mb_convert_encoding($clean_response, 'UTF-8', 'ISO-8859-1');
    }
    
    $clean_response = str_replace("\x00", '', $clean_response);
    $clean_response = preg_replace('/xmlns=""/', '', $clean_response);
    $clean_response = str_replace('>null<', '><', $clean_response);
    
    $prefixes = ['soap:', 'diffgr:', 'msdata:'];
    foreach ($prefixes as $prefix) {
        $clean_response = str_ireplace($prefix, '', $clean_response);
    }
    
    libxml_use_internal_errors(true);
    $xmlObj = simplexml_load_string($clean_response);
    
    if ($xmlObj === false) {
        $libxml_errors = libxml_get_errors();
        echo "<div class='alert alert-danger'>";
        echo "<h4>❌ XML Parse Error</h4>";
        foreach ($libxml_errors as $error) {
            echo "<p>Error (Line {$error->line}): " . htmlspecialchars(trim($error->message)) . "</p>";
        }
        echo "</div>";
        libxml_clear_errors();
        echo "</div>";
        return;
    }
    
    echo "<div class='alert alert-success'>✅ XML Parsed Successfully</div>";
    
    // === FIELD ANALYSIS ===
    $xmlObj->registerXPathNamespace('soap', 'http://schemas.xmlsoap.org/soap/envelope/');
    $xmlObj->registerXPathNamespace('ns', 'http://tempuri.org/');
    
    $xpath_patterns = [
        '//ns:' . $soapAction . 'Result',
        '//*[local-name()="' . $soapAction . 'Result"]',
        '//*[contains(local-name(), "Result")]'
    ];
    
    $resultNodes = [];
    foreach ($xpath_patterns as $pattern) {
        $nodes = $xmlObj->xpath($pattern);
        if (!empty($nodes)) {
            $resultNodes = $nodes;
            break;
        }
    }
    
    if (empty($resultNodes)) {
        echo "<div class='alert alert-warning'>⚠️ No Result Nodes Found</div>";
        echo "</div>";
        return;
    }

    $fields = $samples = [];
    $resultNode = $resultNodes[0];
    $potentialXmlString = (string)$resultNode;
    $nodesToProcess = [];

    if (strpos(trim($potentialXmlString), '<') === 0) {
        echo "<div class='alert alert-info'>ℹ️ Nested XML detected. Parsing inner content.</div>";
        libxml_use_internal_errors(true);
        $innerXml = simplexml_load_string($potentialXmlString);
        libxml_clear_errors();

        if ($innerXml) {
            $innerXml->registerXPathNamespace('diffgr', 'urn:schemas-microsoft-com:xml-diffgram-v1');
            $dataSetRecords = $innerXml->xpath('//diffgr:diffgram/*[1]/*');

            if (count($dataSetRecords) > 0) {
                echo "<div class='alert alert-success'>✅ Detected ADO.NET DataSet format.</div>";
                $nodesToProcess = $dataSetRecords;
            } else if ($innerXml->count() > 0) {
                if ($innerXml->count() == 1) {
                    $rootNode = $innerXml->children()[0];
                    if ($rootNode->count() > 0) {
                        echo "<div class='alert alert-success'>✅ Detected root node `{$rootNode->getName()}` with child records.</div>";
                        $nodesToProcess = $rootNode->children();
                    } else {
                        echo "<div class='alert alert-success'>✅ Detected single record response.</div>";
                        $nodesToProcess = [$rootNode];
                    }
                } else {
                    echo "<div class='alert alert-success'>✅ Detected list of sibling records.</div>";
                    $nodesToProcess = $innerXml->children();
                }
            } else {
                echo "<div class='alert alert-success'>✅ Detected single record response (no wrapper).</div>";
                $nodesToProcess = [$innerXml];
            }
        }
    } else {
        echo "<div class='alert alert-info'>ℹ️ No nested XML detected. Processing direct children of result node.</div>";
        $nodesToProcess = $resultNode->children();
    }

    $recordCount = count($nodesToProcess);
    echo "<div class='alert alert-primary'><strong>Found $recordCount invoice records to analyze.</strong></div>";

    if ($recordCount > 0) {
        foreach ($nodesToProcess as $recordNode) {
            extractFields($recordNode, $fields, $samples);
        }
    }
    
    if (empty($fields)) {
        echo "<div class='alert alert-warning'>⚠️ No fields found in result nodes. This could mean the API returned no data for the selected company and date range.</div>";
        echo "</div>";
        return;
    }
    
    // === FIELD ANALYSIS TABLE ===
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
    
    echo "<div class='collapsible' onclick='toggleContent(this)'>📊 <strong>Field Analysis Summary</strong> (Click to expand)</div>";
    echo "<div class='content show'>";
    echo "<div class='card mb-3'>";
    echo "<div class='card-body'>";
    echo "<h5>📈 Field Discovery Summary</h5>";
    echo "<p><strong>Total Fields Found:</strong> $totalFields</p>";
    echo "<p><strong>Fields With Data:</strong> <span class='text-success'>$fieldsWithData</span></p>";
    echo "<p><strong>Fields Without Data:</strong> <span class='text-warning'>$fieldsWithoutData</span></p>";
    echo "<p><strong>Field Coverage:</strong> " . round(($fieldsWithData / $totalFields) * 100, 1) . "%</p>";
    echo "</div>";
    echo "</div>";
    
    echo "<table class='table table-striped table-hover field-table'>";
    echo "<thead class='table-dark'>";
    echo "<tr><th>Field Name</th><th>Sample Value</th><th>Data Type</th><th>Length</th><th>Status</th></tr>";
    echo "</thead>";
    echo "<tbody>";
    
    // Sort fields alphabetically for better readability
    $sortedFields = array_keys($fields);
    sort($sortedFields);
    
    foreach ($sortedFields as $field) {
        $val = $samples[$field] ?? '';
        $rowClass = '';
        
        if ($val === '[NULL/EMPTY]') {
            $rowClass = 'no-data';
            $sampleDisplay = '<em class="text-muted">[NULL/EMPTY]</em>';
            $typeDisplay = '<em class="text-muted">UNKNOWN</em>';
            $lengthDisplay = '<em class="text-muted">-</em>';
            $statusDisplay = '<span class="badge bg-warning">NO DATA</span>';
        } else {
            $rowClass = 'has-data';
            $sampleDisplay = htmlspecialchars(substr($val, 0, 100));
            if (strlen($val) > 100) {
                $sampleDisplay .= '<span class="text-muted">... (truncated)</span>';
            }
            $typeDisplay = inferDataType($val);
            $lengthDisplay = strlen($val);
            $statusDisplay = '<span class="badge bg-success">HAS DATA</span>';
        }
        
        echo "<tr class='$rowClass'>";
        echo "<td><strong class='field-name'>$field</strong></td>";
        echo "<td>$sampleDisplay</td>";
        echo "<td>$typeDisplay</td>";
        echo "<td>$lengthDisplay</td>";
        echo "<td>$statusDisplay</td>";
        echo "</tr>";
    }
    echo "</tbody>";
    echo "</table>";
    echo "</div>";
    
    // === DECLARATION NUMBER ANALYSIS ===
    echo "<div class='card mt-4'>";
    echo "<div class='card-header'>";
    echo "<h5>🔍 Declaration Number Analysis</h5>";
    echo "</div>";
    echo "<div class='card-body'>";
    
    $seq_s_value = $samples['SEQ_NUM_S'] ?? '[NULL/EMPTY]';
    $seq_b_value = $samples['SEQ_NUM_B'] ?? '[NULL/EMPTY]';
    
    echo "<div class='row'>";
    echo "<div class='col-md-6'>";
    echo "<h6>SEQ_NUM_S (Sequence Number Seller)</h6>";
    echo "<p><strong>Sample Value:</strong> " . htmlspecialchars($seq_s_value) . "</p>";
    echo "<p><strong>Field Status:</strong> " . ($seq_s_value !== '[NULL/EMPTY]' ? '<span class="badge bg-success">HAS DATA</span>' : '<span class="badge bg-warning">NO DATA</span>') . "</p>";
    echo "</div>";
    echo "<div class='col-md-6'>";
    echo "<h6>SEQ_NUM_B (Sequence Number Buyer)</h6>";
    echo "<p><strong>Sample Value:</strong> " . htmlspecialchars($seq_b_value) . "</p>";
    echo "<p><strong>Field Status:</strong> " . ($seq_b_value !== '[NULL/EMPTY]' ? '<span class="badge bg-success">HAS DATA</span>' : '<span class="badge bg-warning">NO DATA</span>') . "</p>";
    echo "</div>";
    echo "</div>";
    
    echo "<div class='alert alert-info mt-3'>";
    echo "<h6>📝 Analysis Notes:</h6>";
    echo "<ul>";
    echo "<li>SEQ_NUM_S and SEQ_NUM_B are labeled as \"დეკლარაციის ნომერი\" (Declaration Number) in the UI</li>";
    echo "<li>These fields appear to be sequence numbers rather than traditional declaration numbers</li>";
    echo "<li>The actual declaration information might be in DEC_STATUS or other fields</li>";
    echo "<li>Further investigation needed to determine the true nature of these fields</li>";
    echo "</ul>";
    echo "</div>";
    echo "</div>";
    echo "</div>";
    
    echo "</div>"; // End api-section
}

// === Build Invoice Requests ===
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
    <max_records>100</max_records>
    <top>100</top>
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
    <max_records>100</max_records>
    <top>100</top>
    </get_buyer_invoices>
</soap:Body>
</soap:Envelope>'
];

// === If form submitted, run the analysis ===
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    echo "<h2>🔄 Running Invoice API Tests...</h2>";
    
    foreach ($invoiceRequests as $soapAction => $xml_request) {
        $name = ucfirst(str_replace(['get_', '_invoices'], ['', ''], $soapAction)) . " Invoices";
        analyzeInvoiceApi($name, $soapAction, $xml_request);
    }
    
    echo "<div class='alert alert-success mt-4'>";
    echo "<h4>✅ Invoice API Testing Complete</h4>";
    echo "<p><strong>Company:</strong> " . htmlspecialchars($selectedCompany['COMPANY_NAME']) . "</p>";
    echo "<p><strong>Date Range:</strong> $startDate to $endDate</p>";
    echo "<p><strong>APIs Tested:</strong> get_seller_invoices, get_buyer_invoices</p>";
    echo "</div>";
} else {
    echo "<div class='alert alert-primary'>";
    echo "<h4>📋 Ready to Test</h4>";
    echo "<p>Select a company and date range above, then click <strong>🔄 Test Invoice APIs</strong> to analyze the fields returned by get_buyer_invoices and get_seller_invoices APIs.</p>";
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

// Auto-expand field analysis by default
document.addEventListener('DOMContentLoaded', function() {
    const fieldAnalysis = document.querySelector('.collapsible');
    if (fieldAnalysis && fieldAnalysis.textContent.includes('Field Analysis Summary')) {
        fieldAnalysis.nextElementSibling.classList.add('show');
    }
});
</script>
</body>
</html>
