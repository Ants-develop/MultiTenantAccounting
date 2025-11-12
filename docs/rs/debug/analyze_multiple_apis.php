<?php
/**
 * Multiple API Field Testing - Comprehensive Analysis
 * 
 * This page tests multiple RS.ge API functions to analyze their field structures:
 * - get_seller_invoices_r_n
 * - get_buyer_invoices_r_n  
 * - get_spec_products_n
 * - get_invoice_desc_n
 * 
 * Based on analyze_invoice_desc_api.php structure for consistency.
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
        error_log("[FATAL SCRIPT ERROR in analyze_multiple_apis.php] " . print_r($error, true));
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

// Get sample invoice IDs for testing (required by some APIs)
function getSampleInvoiceIds($company_tin, $limit = 50) {
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

$sampleInvoices = getSampleInvoiceIds($company_tin, 50);

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Multiple API Field Testing</title>
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
        .api-badge { font-size: 0.8em; margin-left: 10px; }
        .summary-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
    </style>
</head>
<body>
<div class="container-fluid mt-4">
    <div class="row">
        <div class="col-12">
            <h1 class="mb-4">🔍 Multiple API Field Testing</h1>
            
            <div class="alert alert-info">
                <h5>🎯 Purpose</h5>
                <p>This page tests <strong>four key RS.ge API functions</strong> to examine their field structures:</p>
                <ul>
                    <li><strong>get_seller_invoices_n</strong> - Seller invoices with date range (Includes su/sp auth + date parameters)</li>
                    <li><strong>get_buyer_invoices_n</strong> - Buyer invoices with date range (Includes su/sp auth + date parameters)</li>
                    <li><strong>get_spec_products_n</strong> - Available products/goods (Includes su/sp auth)</li>
                    <li><strong>get_invoice_desc_n</strong> - Invoice goods/details (Includes su/sp auth)</li>
                </ul>
                <p><strong>Note:</strong> The invoice APIs now use the same structure as sync_company_data_optimized.php with date range support and proper authentication.</p>
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
                                    <strong>ℹ️ API Mode:</strong> Testing multiple APIs with different parameters<br>
                                    <small>Will test 4 different API functions to discover all possible fields</small>
                                </div>
                            </div>
                        </div>
                        <div class="mt-3">
                            <button type="submit" class="btn btn-primary">🔄 Test All APIs</button>
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
                            <p><strong>Request Mode:</strong> Multiple API testing</p>
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
    
    // Handle schema-based field types
    if (strpos($value, '[SCHEMA:') === 0) {
        $schemaType = str_replace(['[SCHEMA: ', ']'], '', $value);
        return mapSchemaTypeToMSSQL($schemaType);
    }
    
    if (is_numeric($value)) return (strpos($value, '.') !== false) ? 'DECIMAL' : 'INT';
    if (strtotime($value) !== false) return 'DATETIME';
    return (strlen($value) > 255) ? 'NVARCHAR(MAX)' : 'NVARCHAR(' . strlen($value) . ')';
}

function mapSchemaTypeToMSSQL($xsdType) {
    $typeMap = [
        'xs:decimal' => 'DECIMAL(18,4)',
        'xs:string' => 'NVARCHAR(MAX)',
        'xs:dateTime' => 'DATETIME',
        'xs:int' => 'INT',
        'xs:long' => 'BIGINT',
        'xs:boolean' => 'BIT',
        'xs:float' => 'FLOAT',
        'xs:double' => 'FLOAT'
    ];
    
    return $typeMap[$xsdType] ?? 'NVARCHAR(MAX)';
}

function analyzeApi($name, $soapAction, $xml, $apiType = 'general') {
    echo "<div class='api-section'>";
    echo "<h3>📦 $name <span class='badge bg-primary api-badge'>$apiType</span></h3>";
    
    // Show the XML request being sent
    echo "<div class='collapsible' onclick='toggleContent(this)'>🔍 <strong>XML Request</strong> (Click to expand)</div>";
    echo "<div class='content'>";
    echo "<pre style='background:#f5f5f5; padding:10px; border:1px solid #ccc; max-height:300px; overflow:auto; font-size:11px;'>";
    echo htmlspecialchars($xml);
    echo "</pre></div>"; 
    
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
    
    // Use the same XPath patterns as sync_company_data_optimized.php
    $xpath_patterns = [];
    
    if (strpos($soapAction, 'invoices_n') !== false) {
        // For get_seller_invoices_n and get_buyer_invoices_n, use the same patterns as sync_company_data_optimized.php
        $xpath_patterns = [
            '//ns:' . $soapAction . 'Result',
            '//*[local-name()="' . $soapAction . 'Result"]',
            '//*[contains(local-name(), "Result")]'
        ];
    } else {
        // For other APIs, use the original patterns
        $xpath_patterns = [
            '//ns:' . $soapAction . 'Result',
            '//*[local-name()="' . $soapAction . 'Result"]',
            '//*[contains(local-name(), "Result")]'
        ];
    }
    
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
            // For invoices_n APIs, use the same logic as sync_company_data_optimized.php
            if (strpos($soapAction, 'invoices_n') !== false) {
                // Look for NewDataSet structure first (like in sync_company_data_optimized.php)
                $newDataSetNodes = $innerXml->xpath('//NewDataSet');
                if (!empty($newDataSetNodes)) {
                    $dataSetNode = $newDataSetNodes[0];
                    $invoicesNodes = $dataSetNode->xpath('.//invoices');
                    if (!empty($invoicesNodes)) {
                        echo "<div class='alert alert-success'>✅ Detected NewDataSet format with invoices elements.</div>";
                        $nodesToProcess = $invoicesNodes;
                    } else {
                        echo "<div class='alert alert-success'>✅ Detected NewDataSet format, processing children.</div>";
                        $nodesToProcess = $dataSetNode->children();
                    }
                } else {
                    // Fallback to diffgram format
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
                // For other APIs, use the original logic
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
        }
    } else {
        echo "<div class='alert alert-info'>ℹ️ No nested XML detected. Processing direct children of result node.</div>";
        $nodesToProcess = $resultNode->children();
    }

    $recordCount = count($nodesToProcess);
    echo "<div class='alert alert-primary'><strong>Found $recordCount records to analyze.</strong></div>";

    if ($recordCount > 0) {
        foreach ($nodesToProcess as $recordNode) {
            extractFields($recordNode, $fields, $samples);
        }
    }
    
    if (empty($fields)) {
        // Check if we have schema information even without data
        $schemaFields = [];
        $schemaSamples = [];
        
        // Try to extract schema information from the response
        if (isset($xmlObj)) {
            $schemaNodes = $xmlObj->xpath('//xs:element[@name]');
            if (!empty($schemaNodes)) {
                echo "<div class='alert alert-info'>";
                echo "<h5>ℹ️ Schema Information Found</h5>";
                echo "<p>No actual data records found, but schema definition is available. This shows the field structure that would be returned when data exists.</p>";
                echo "</div>";
                
                foreach ($schemaNodes as $schemaNode) {
                    $fieldName = (string)$schemaNode['name'];
                    $fieldType = (string)$schemaNode['type'];
                    $fieldName = strtoupper($fieldName); // UPPERCASE for MSSQL
                    
                    $schemaFields[$fieldName] = true;
                    $schemaSamples[$fieldName] = '[SCHEMA: ' . $fieldType . ']';
                }
                
                $fields = $schemaFields;
                $samples = $schemaSamples;
            }
        }
        
        if (empty($fields)) {
            echo "<div class='alert alert-warning'>";
            echo "<h5>⚠️ No Data Found</h5>";
            echo "<p><strong>Possible reasons:</strong></p>";
            echo "<ul>";
            echo "<li>This company has no data in the system for this API</li>";
            echo "<li>The API might require specific parameters</li>";
            echo "<li>The service credentials may not have access to this data</li>";
            echo "<li>Try testing with a different company that has more activity</li>";
            echo "</ul>";
            echo "</div>";
            echo "</div>";
            return;
        }
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
    echo "<div class='card-body summary-card'>";
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
        } elseif (strpos($val, '[SCHEMA:') === 0) {
            $rowClass = 'has-data';
            $sampleDisplay = '<em class="text-info">' . htmlspecialchars($val) . '</em>';
            $typeDisplay = inferDataType($val);
            $lengthDisplay = '<em class="text-muted">Schema</em>';
            $statusDisplay = '<span class="badge bg-info">SCHEMA</span>';
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
    
    echo "</div>"; // End api-section
}

// === If form submitted, run the analysis ===
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    echo "<h2>🔄 Running Multiple API Tests...</h2>";
    
    $tested_apis = 0;
    
    // Test 1: get_seller_invoices_n
    echo "<div class='alert alert-info'>Testing get_seller_invoices_n (Includes su/sp for authentication with date range)</div>";
    $sellerInvoicesRequest = '<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
    <get_seller_invoices_n xmlns="http://tempuri.org/">
    <user_id>' . htmlspecialchars($user_id, ENT_XML1) . '</user_id>
    <un_id>' . htmlspecialchars($un_id, ENT_XML1) . '</un_id>
    <s_dt>' . date('Y-m-d\TH:i:s', strtotime('-30 days')) . '</s_dt>
    <e_dt>' . date('Y-m-d\TH:i:s') . '</e_dt>
    <op_s_dt>' . date('Y-m-d\TH:i:s', strtotime('-30 days')) . '</op_s_dt>
    <op_e_dt>' . date('Y-m-d\TH:i:s') . '</op_e_dt>
    <su>' . htmlspecialchars($user, ENT_XML1) . '</su>
    <sp>' . htmlspecialchars($password, ENT_XML1) . '</sp>
    </get_seller_invoices_n>
</soap:Body>
</soap:Envelope>';
    
    analyzeApi("Seller Invoices", "get_seller_invoices_n", $sellerInvoicesRequest, "INVOICES");
    $tested_apis++;
    
    // Test 2: get_buyer_invoices_n
    echo "<div class='alert alert-info'>Testing get_buyer_invoices_n (Includes su/sp for authentication with date range)</div>";
    $buyerInvoicesRequest = '<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
    <get_buyer_invoices_n xmlns="http://tempuri.org/">
    <user_id>' . htmlspecialchars($user_id, ENT_XML1) . '</user_id>
    <un_id>' . htmlspecialchars($un_id, ENT_XML1) . '</un_id>
    <s_dt>' . date('Y-m-d\TH:i:s', strtotime('-30 days')) . '</s_dt>
    <e_dt>' . date('Y-m-d\TH:i:s') . '</e_dt>
    <op_s_dt>' . date('Y-m-d\TH:i:s', strtotime('-30 days')) . '</op_s_dt>
    <op_e_dt>' . date('Y-m-d\TH:i:s') . '</op_e_dt>
    <su>' . htmlspecialchars($user, ENT_XML1) . '</su>
    <sp>' . htmlspecialchars($password, ENT_XML1) . '</sp>
    </get_buyer_invoices_n>
</soap:Body>
</soap:Envelope>';
    
    analyzeApi("Buyer Invoices", "get_buyer_invoices_n", $buyerInvoicesRequest, "INVOICES");
    $tested_apis++;
    
    // Test 3: get_spec_products_n
    echo "<div class='alert alert-info'>Testing get_spec_products_n (Includes su/sp for authentication)</div>";
    $productsRequest = '<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
    <get_spec_products_n xmlns="http://tempuri.org/">
    <p_like></p_like>
    <p_un_id>' . htmlspecialchars($un_id, ENT_XML1) . '</p_un_id>
    <p_series></p_series>
    <user_id>' . htmlspecialchars($user_id, ENT_XML1) . '</user_id>
    <su>' . htmlspecialchars($user, ENT_XML1) . '</su>
    <sp>' . htmlspecialchars($password, ENT_XML1) . '</sp>
    </get_spec_products_n>
</soap:Body>
</soap:Envelope>';
    
    analyzeApi("Products/Goods List", "get_spec_products_n", $productsRequest, "PRODUCTS");
    $tested_apis++;
    
    // Test 4: get_invoice_desc_n (test with sample invoices)
    if (!empty($sampleInvoices)) {
        echo "<div class='alert alert-info'>Testing get_invoice_desc_n with sample invoices (Includes su/sp for authentication)</div>";
        
        $tested_invoices = 0;
        foreach (array_slice($sampleInvoices, 0, 5) as $invoice) { // Test first 5 invoices
            $invoice_id = $invoice['INVOICE_ID'];
            $series_number = trim(($invoice['F_SERIES'] ?? '') . ' ' . ($invoice['F_NUMBER'] ?? ''));
            
            $invoiceDescRequest = '<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
    <get_invoice_desc_n xmlns="http://tempuri.org/">
    <user_id>' . htmlspecialchars($user_id, ENT_XML1) . '</user_id>
    <invois_id>' . htmlspecialchars($invoice_id, ENT_XML1) . '</invois_id>
    <su>' . htmlspecialchars($user, ENT_XML1) . '</su>
    <sp>' . htmlspecialchars($password, ENT_XML1) . '</sp>
    </get_invoice_desc_n>
</soap:Body>
</soap:Envelope>';
            
            $invoice_type = strtoupper($invoice['TYPE'] ?? 'unknown');
            $name = "Invoice Details: " . htmlspecialchars($series_number) . " ($invoice_type - ID: " . htmlspecialchars($invoice_id) . ")";
            analyzeApi($name, "get_invoice_desc_n", $invoiceDescRequest, "INVOICE_DETAILS");
            $tested_invoices++;
        }
        $tested_apis++;
    } else {
        echo "<div class='alert alert-warning'>⚠️ No sample invoices found for get_invoice_desc_n testing</div>";
    }
    
    echo "<div class='alert alert-success mt-4'>";
    echo "<h4>✅ Multiple API Testing Complete</h4>";
    echo "<p><strong>Company:</strong> " . htmlspecialchars($selectedCompany['COMPANY_NAME']) . "</p>";
    echo "<p><strong>APIs Tested:</strong> $tested_apis</p>";
    echo "<p><strong>APIs Tested:</strong> get_seller_invoices_n, get_buyer_invoices_n, get_spec_products_n, get_invoice_desc_n</p>";
    echo "</div>";
} else {
    echo "<div class='alert alert-primary'>";
    echo "<h4>📋 Ready to Test</h4>";
    echo "<p>Select a company above, then click <strong>🔄 Test All APIs</strong> to analyze the fields returned by all four API functions.</p>";
    echo "<p><strong>Note:</strong> This will test multiple APIs to discover all possible field structures for database schema generation.</p>";
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
