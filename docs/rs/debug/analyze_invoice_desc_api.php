<?php
/**
 * Invoice Goods API Field Testing - Dedicated Testing Page
 * 
 * This page focuses specifically on testing get_invoice_desc API
 * to examine what fields are actually fetched and their data structures.
 * 
 * Based on test_invoice_apis.php structure for consistency.
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
        error_log("[FATAL SCRIPT ERROR in analyze_invoice_desc_api.php] " . print_r($error, true));
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

// === Use EXACT same logic ===
$company_tin = $credentials['company_tin'];
$user = $credentials['s_user'];
$password = $credentials['s_password'];
$user_id = $credentials['user_id'];
$un_id = $credentials['un_id'];

// Get sample invoice IDs for testing (required by API)
function getSampleInvoiceIds($company_tin, $limit = 100) {
    try {
        $pdo = getDatabaseConnection();
        
        // Get mixed invoices from both seller and buyer tables for better field diversity
        $half_limit = intval($limit / 2);
        
        // Get from seller invoices
        $stmt = $pdo->prepare("
            SELECT TOP ($half_limit) INVOICE_ID, F_SERIES, F_NUMBER, OPERATION_DT, 'seller' as TYPE
            FROM rs.seller_invoices 
            WHERE COMPANY_TIN = ? AND INVOICE_ID IS NOT NULL 
            ORDER BY OPERATION_DT DESC
        ");
        $stmt->execute([$company_tin]);
        $seller_invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get from buyer invoices
        $stmt = $pdo->prepare("
            SELECT TOP ($half_limit) INVOICE_ID, F_SERIES, F_NUMBER, OPERATION_DT, 'buyer' as TYPE
            FROM rs.buyer_invoices 
            WHERE COMPANY_TIN = ? AND INVOICE_ID IS NOT NULL 
            ORDER BY OPERATION_DT DESC
        ");
        $stmt->execute([$company_tin]);
        $buyer_invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Combine and limit to requested amount
        $all_invoices = array_merge($seller_invoices, $buyer_invoices);
        return array_slice($all_invoices, 0, $limit);
        
    } catch (Exception $e) {
        error_log("Error getting sample invoices: " . $e->getMessage());
        return [];
    }
}

$sampleInvoices = getSampleInvoiceIds($company_tin, 100);

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice Goods API Field Testing</title>
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
            <h1 class="mb-4">📦 Invoice Goods API Field Testing</h1>
            
            <div class="alert alert-info">
                <h5>🎯 Purpose</h5>
                <p>This page specifically tests <strong>get_invoice_desc</strong> API to examine:</p>
                <ul>
                    <li>What fields are actually returned by the invoice goods API</li>
                    <li>Field data types and sample values for invoice items</li>
                    <li>Goods structure and schema for rs.invoice_goods table</li>
                    <li>Comprehensive analysis of all invoice goods fields</li>
                </ul>
            </div>

            <!-- Company Selection Form -->
            <form method="post" class="mb-4">
                <div class="card">
                    <div class="card-header">
                        <h5>🏢 Company & Testing Configuration</h5>
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
                                    <strong>ℹ️ API Mode:</strong> Testing multiple invoices (user_id/invois_id/su/sp)<br>
                                    <small>Will test <?= count($sampleInvoices) ?> sample invoices to discover all possible fields</small>
                                </div>
                            </div>
                        </div>
                        <div class="mt-3">
                            <button type="submit" class="btn btn-primary">🔄 Test Invoice Goods API</button>
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
                            <p><strong>Request Mode:</strong> Multiple invoice testing (user_id/invois_id/su/sp)</p>
                            <p><strong>Sample Invoices:</strong> <?= count($sampleInvoices) ?> found</p>
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
        $fieldName = strtoupper($fieldName); // UPPERCASE for MSSQL
        $fields[$fieldName] = true;
        $value = (string)$attrValue;

        if ($value && trim($value) !== '' && (!isset($samples[$fieldName]) || strlen($value) > strlen($samples[$fieldName] ?? ''))) {
            $samples[$fieldName] = $value;
        }
    }

    foreach ($node->children() as $child) {
        $fieldName = $prefix ? $prefix . '_' . $child->getName() : $child->getName();
        $fieldName = strtoupper($fieldName); // UPPERCASE for MSSQL
        
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
    echo "<h3>📦 $name</h3>";
    
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
    echo "<div class='alert alert-primary'><strong>Found $recordCount invoice goods records to analyze.</strong></div>";

    if ($recordCount > 0) {
        foreach ($nodesToProcess as $recordNode) {
            extractFields($recordNode, $fields, $samples);
        }
    }
    
    if (empty($fields)) {
        echo "<div class='alert alert-warning'>";
        echo "<h5>⚠️ No Invoice Goods Data Found</h5>";
        echo "<p><strong>Possible reasons:</strong></p>";
        echo "<ul>";
        echo "<li>This company has no invoice goods data in the system</li>";
        echo "<li>The API might require a specific <code>invois_id</code> parameter</li>";
        echo "<li>The service credentials may not have access to goods data</li>";
        echo "<li>Try testing with a different company that has more invoice activity</li>";
        echo "</ul>";
        echo "<p><strong>Response structure detected:</strong> Empty invoices_descs dataset</p>";
        echo "</div>";
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
    
    // === GOODS ANALYSIS ===
    echo "<div class='card mt-4'>";
    echo "<div class='card-header'>";
    echo "<h5>🔍 Invoice Goods Analysis</h5>";
    echo "</div>";
    echo "<div class='card-body'>";
    
    $goods_value = $samples['GOODS'] ?? '[NULL/EMPTY]';
    $g_unit_value = $samples['G_UNIT'] ?? '[NULL/EMPTY]';
    $g_number_value = $samples['G_NUMBER'] ?? '[NULL/EMPTY]';
    $full_amount_value = $samples['FULL_AMOUNT'] ?? '[NULL/EMPTY]';
    
    echo "<div class='row'>";
    echo "<div class='col-md-6'>";
    echo "<h6>GOODS (საქონლის დასახელება)</h6>";
    echo "<p><strong>Sample Value:</strong> " . htmlspecialchars($goods_value) . "</p>";
    echo "<p><strong>Field Status:</strong> " . ($goods_value !== '[NULL/EMPTY]' ? '<span class="badge bg-success">HAS DATA</span>' : '<span class="badge bg-warning">NO DATA</span>') . "</p>";
    echo "</div>";
    echo "<div class='col-md-6'>";
    echo "<h6>G_UNIT (საქონლის ერთეული)</h6>";
    echo "<p><strong>Sample Value:</strong> " . htmlspecialchars($g_unit_value) . "</p>";
    echo "<p><strong>Field Status:</strong> " . ($g_unit_value !== '[NULL/EMPTY]' ? '<span class="badge bg-success">HAS DATA</span>' : '<span class="badge bg-warning">NO DATA</span>') . "</p>";
    echo "</div>";
    echo "</div>";
    
    echo "<div class='row'>";
    echo "<div class='col-md-6'>";
    echo "<h6>G_NUMBER (რაოდენობა)</h6>";
    echo "<p><strong>Sample Value:</strong> " . htmlspecialchars($g_number_value) . "</p>";
    echo "<p><strong>Field Status:</strong> " . ($g_number_value !== '[NULL/EMPTY]' ? '<span class="badge bg-success">HAS DATA</span>' : '<span class="badge bg-warning">NO DATA</span>') . "</p>";
    echo "</div>";
    echo "<div class='col-md-6'>";
    echo "<h6>FULL_AMOUNT (თანხა დღგ-ს და აქციზის ჩათვლით)</h6>";
    echo "<p><strong>Sample Value:</strong> " . htmlspecialchars($full_amount_value) . "</p>";
    echo "<p><strong>Field Status:</strong> " . ($full_amount_value !== '[NULL/EMPTY]' ? '<span class="badge bg-success">HAS DATA</span>' : '<span class="badge bg-warning">NO DATA</span>') . "</p>";
    echo "</div>";
    echo "</div>";
    
    echo "<div class='alert alert-info mt-3'>";
    echo "<h6>📝 Analysis Notes:</h6>";
    echo "<ul>";
    echo "<li>This API returns detailed invoice goods information for storage in rs.invoice_goods table</li>";
    echo "<li>All field names are automatically converted to UPPERCASE for MSSQL compatibility</li>";
    echo "<li>The data structure follows the documented RS.ge invoice goods specification</li>";
    echo "<li>Use this data to populate the local invoice goods database table</li>";
    echo "</ul>";
    echo "</div>";
    echo "</div>";
    echo "</div>";
    
    // === SUGGESTED SCHEMA GENERATION ===
    if (!empty($fields)) {
        echo "<div class='card mt-4'>";
        echo "<div class='card-header'>";
        echo "<h5>🏗️ Suggested MSSQL Schema for rs.invoice_goods</h5>";
        echo "</div>";
        echo "<div class='card-body'>";
        
        $sql = "CREATE TABLE rs.invoice_goods (\n";
        $sql .= "    ID INT IDENTITY(1,1) PRIMARY KEY,\n";
        $sql .= "    INVOICE_ID NVARCHAR(50) NOT NULL, -- Links to invoice\n\n";
        
        // Add all discovered API fields
        foreach (array_keys($fields) as $field) {
            $sample = $samples[$field] ?? '';
            $dataType = inferDataType($sample);
            
            // Adjust data types based on field names
            if (strpos($field, 'AMOUNT') !== false || strpos($field, 'NUMBER') !== false) {
                $dataType = 'DECIMAL(18,4)';
            } elseif (strpos($field, 'DATE') !== false || strpos($field, 'DT') !== false) {
                $dataType = 'DATETIME';
            } elseif (strpos($field, 'ID') !== false) {
                $dataType = 'NVARCHAR(50)';
            } elseif (strpos($field, 'GOODS') !== false) {
                $dataType = 'NVARCHAR(MAX)';
            }
            
            $sql .= "    [$field] $dataType NULL, -- API field\n";
        }
        
        $sql .= "\n    -- Internal tracking fields\n";
        $sql .= "    COMPANY_ID NVARCHAR(50) NULL,\n";
        $sql .= "    COMPANY_NAME NVARCHAR(255) NULL,\n";
        $sql .= "    COMPANY_TIN NVARCHAR(20) NULL,\n";
        $sql .= "    UPDATED_AT DATETIME NULL,\n\n";
        $sql .= "    CONSTRAINT UQ_INVOICE_GOODS_UNIQUE UNIQUE (INVOICE_ID, [ID])\n";
        $sql .= ");";
        
        echo "<pre style='background:#f8f8f8; padding:15px; border:1px solid #ddd; border-radius:5px; overflow:auto;'>";
        echo htmlspecialchars($sql);
        echo "</pre>";
        
        echo "<div class='alert alert-success mt-3'>";
        echo "<h6>✅ Schema Features:</h6>";
        echo "<ul>";
        echo "<li><strong>Primary Key:</strong> Auto-incrementing ID column</li>";
        echo "<li><strong>Foreign Key:</strong> INVOICE_ID links to parent invoice</li>";
        echo "<li><strong>API Fields:</strong> All discovered fields with appropriate data types</li>";
        echo "<li><strong>Unique Constraint:</strong> Prevents duplicate goods entries per invoice</li>";
        echo "<li><strong>Company Tracking:</strong> Links goods to specific company</li>";
        echo "</ul>";
        echo "</div>";
        echo "</div>";
        echo "</div>";
    }
    
    echo "</div>"; // End api-section
}

// === If form submitted, run the analysis ===
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    echo "<h2>🔄 Running Invoice Goods API Tests...</h2>";
    
    if (empty($sampleInvoices)) {
        echo "<div class='alert alert-danger'>";
        echo "<h4>❌ No Invoices Found</h4>";
        echo "<p>This company has no invoices in the database. Cannot test the get_invoice_desc API without invoice IDs.</p>";
        echo "<p><strong>Note:</strong> The API requires both user_id and invois_id parameters (both mandatory).</p>";
        echo "</div>";
    } else {
        echo "<div class='alert alert-success'>✅ Found " . count($sampleInvoices) . " sample invoices for analysis</div>";
        
        $all_fields = [];
        $tested_invoices = 0;
        
        // Test each invoice
        foreach ($sampleInvoices as $invoice) {
            $invoice_id = $invoice['INVOICE_ID'];
            $series_number = trim(($invoice['F_SERIES'] ?? '') . ' ' . ($invoice['F_NUMBER'] ?? ''));
            
            // Build Invoice Desc Request for this specific invoice
            $invoiceDescRequest = '<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
    <get_invoice_desc xmlns="http://tempuri.org/">
    <user_id>' . htmlspecialchars($user_id, ENT_XML1) . '</user_id>
    <invois_id>' . htmlspecialchars($invoice_id, ENT_XML1) . '</invois_id>
    <su>' . htmlspecialchars($user, ENT_XML1) . '</su>
    <sp>' . htmlspecialchars($password, ENT_XML1) . '</sp>
    </get_invoice_desc>
</soap:Body>
</soap:Envelope>';
            
            $invoice_type = strtoupper($invoice['TYPE'] ?? 'unknown');
            $name = "Invoice Goods: " . htmlspecialchars($series_number) . " ($invoice_type - ID: " . htmlspecialchars($invoice_id) . ")";
            analyzeInvoiceApi($name, 'get_invoice_desc', $invoiceDescRequest);
            $tested_invoices++;
        }
    }
    
    echo "<div class='alert alert-success mt-4'>";
    echo "<h4>✅ Invoice Goods API Testing Complete</h4>";
    echo "<p><strong>Company:</strong> " . htmlspecialchars($selectedCompany['COMPANY_NAME']) . "</p>";
    echo "<p><strong>Invoices Tested:</strong> " . ($tested_invoices ?? 0) . "</p>";
    echo "<p><strong>API Tested:</strong> get_invoice_desc (with required user_id + invois_id)</p>";
    echo "</div>";
} else {
    echo "<div class='alert alert-primary'>";
    echo "<h4>📋 Ready to Test</h4>";
    echo "<p>Select a company above, then click <strong>🔄 Test Invoice Goods API</strong> to analyze the fields returned by get_invoice_desc API.</p>";
    echo "<p><strong>Note:</strong> The API requires specific invoice IDs, so we'll test multiple sample invoices to discover all possible fields.</p>";
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
