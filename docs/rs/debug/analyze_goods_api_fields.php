<?php
/**
 * GOODS API FIELD ANALYZER
 * 
 * This script analyzes the RS.GE goods API endpoints to discover all possible fields
 * returned by get_waybill_goods_list and get_buyer_waybill_goods_list.
 * 
 * FEATURES:
 * - Tests both seller and buyer goods API endpoints
 * - Discovers all fields, data types, and sample values
 * - Generates MSSQL schema suggestions
 * - Compares actual API structure with current database schema
 * - Provides recommendations for schema improvements
 * 
 * @version 1.0
 */

// PHP optimization for large API responses
ini_set('max_execution_time', 1800);        // 30 minutes
ini_set('memory_limit', '1G');              // 1GB memory
ini_set('max_input_time', 1800);            // 30 minutes input time

// Add shutdown handler for fatal errors
register_shutdown_function('handle_fatal_error');

function handle_fatal_error() {
    $error = error_get_last();
    if ($error !== NULL && in_array($error['type'], [E_ERROR, E_CORE_ERROR, E_PARSE, E_COMPILE_ERROR, E_USER_ERROR])) {
        error_log("[FATAL SCRIPT ERROR in analyze_goods_api_fields.php] " . print_r($error, true));
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

require_once __DIR__ . '/../../backend/database.php';

// Check if we're running in web mode or CLI
$isWeb = !empty($_SERVER['HTTP_HOST']);

if ($isWeb) {
    header('Content-Type: text/html; charset=utf-8');
}

// Get companies from database
function getCompaniesFromDatabase() {
    try {
        $pdo = getDatabaseConnection();
        $stmt = $pdo->prepare("SELECT company_name, company_tin, s_user, s_password FROM rs_users ORDER BY company_name");
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        return [];
    }
}

// NOTE: Removed getTestWaybillIds function as goods APIs work with date ranges, not individual waybill IDs

// Analyze goods API fields
function analyzeGoodsApiFields($name, $url, $soapAction, $xml, $description) {
    echo "<h3>📦 $name ($description)</h3>";
    
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
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false
    ]);
    
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curl_error = curl_error($ch);
    curl_close($ch);
    
    if ($curl_error) {
        echo "<div class='alert alert-danger'>CURL Error: $curl_error</div>";
        return [];
    }
    
    if ($http_code !== 200) {
        echo "<div class='alert alert-warning'>HTTP Code: $http_code</div>";
        return [];
    }
    
    if (!$response) {
        echo "<div class='alert alert-warning'>Empty response received</div>";
        return [];
    }
    
    // Clean and parse XML
    libxml_use_internal_errors(true);
    $clean_response = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $response);
    $clean_response = str_replace("\xEF\xBB\xBF", '', $clean_response);
    
    $sxe = simplexml_load_string($clean_response);
    if ($sxe === false) {
        $errors = libxml_get_errors();
        echo "<div class='alert alert-danger'>XML Parse Error:<br>";
        foreach ($errors as $error) {
            echo "Line {$error->line}: {$error->message}<br>";
        }
        echo "</div>";
        return [];
    }
    
    // Show raw response (FULL - NO TRUNCATION AS REQUESTED)
    echo "<details><summary>📄 <strong>Raw XML Response (FULL)</strong> (" . strlen($response) . " bytes)</summary>";
    echo "<pre style='background:#f5f5f5; padding:10px; border:1px solid #ccc; max-height:600px; overflow:auto;'>";
    echo htmlspecialchars($response);
    echo "</pre></details>";
    
    // Register namespaces
    $sxe->registerXPathNamespace('soap', 'http://schemas.xmlsoap.org/soap/envelope/');
    $sxe->registerXPathNamespace('def', 'http://tempuri.org/');
    
    // Find goods data
    $goods_data = [];
    $response_node = str_replace('get_', 'get_', $soapAction) . 'Response';
    $result_node = str_replace('get_', 'get_', $soapAction) . 'Result';
    
    $resultNodeContent = $sxe->xpath("//def:$result_node");
    
    // Try both with and without namespace for WAYBILL_LIST
    $waybill_list = null;
    if (!empty($resultNodeContent)) {
        // Try with namespace first
        if (isset($resultNodeContent[0]->WAYBILL_LIST->WAYBILL)) {
            $waybill_list = $resultNodeContent[0]->WAYBILL_LIST->WAYBILL;
        }
        // Try without namespace (based on your real XML sample)
        elseif (isset($resultNodeContent[0]->WAYBILL_LIST)) {
            $children = $resultNodeContent[0]->WAYBILL_LIST->children();
            if ($children->count() > 0) {
                $waybill_list = $children;
            }
        }
        // Also try direct XPath to WAYBILL_LIST
        if (!$waybill_list) {
            $waybill_xpath = $sxe->xpath("//WAYBILL_LIST/WAYBILL");
            if (!empty($waybill_xpath)) {
                $waybill_list = $waybill_xpath;
            }
        }
    }
    
    if ($waybill_list && count($waybill_list) > 0) {
        $total_records = count($waybill_list);
        echo "<div class='alert alert-success'>✅ Found $total_records waybill-goods items</div>";
        
        // PHASE 1: Scan ALL records to find the one with most fields
        echo "<div class='alert alert-info'>🔍 Scanning all $total_records records to find the most complete one...</div>";
        
        $max_fields = 0;
        $best_record_index = 0;
        $field_frequency = [];
        
        foreach ($waybill_list as $index => $waybill) {
            $waybill_array = (array)$waybill;
            $field_count = 0;
            
            foreach ($waybill_array as $field => $value) {
                // Count non-empty fields
                if ($value !== null && $value !== '') {
                    $field_count++;
                }
                
                // Track field frequency across all records
                if (!isset($field_frequency[$field])) {
                    $field_frequency[$field] = ['total' => 0, 'non_empty' => 0];
                }
                $field_frequency[$field]['total']++;
                if ($value !== null && $value !== '') {
                    $field_frequency[$field]['non_empty']++;
                }
            }
            
            // Track record with most non-empty fields
            if ($field_count > $max_fields) {
                $max_fields = $field_count;
                $best_record_index = $index;
            }
        }
        
        echo "<div class='alert alert-success'>🎯 Best record found: Index $best_record_index with $max_fields non-empty fields</div>";
        
        // PHASE 2: Deep analyze the best record + frequent fields from others
        echo "<div class='alert alert-info'>📊 Analyzing the most complete record plus collecting samples from all records...</div>";
        
        // Get the best record for detailed analysis
        $best_waybill = $waybill_list[$best_record_index];
        $best_waybill_array = (array)$best_waybill;
        
        // Initialize goods_data with all possible fields from the best record
        foreach ($best_waybill_array as $field => $value) {
            $goods_data[$field] = [
                'type' => inferDataType($value),
                'max_length' => 0,
                'samples' => [],
                'null_count' => 0,
                'non_null_count' => 0,
                'frequency_total' => $field_frequency[$field]['total'],
                'frequency_non_empty' => $field_frequency[$field]['non_empty'],
                'frequency_percent' => round(($field_frequency[$field]['non_empty'] / $total_records) * 100, 1)
            ];
        }
        
        // Add any additional fields that appear frequently in other records
        foreach ($field_frequency as $field => $freq) {
            if (!isset($goods_data[$field]) && $freq['non_empty'] > 0) {
                $goods_data[$field] = [
                    'type' => 'NVARCHAR',
                    'max_length' => 0,
                    'samples' => [],
                    'null_count' => 0,
                    'non_null_count' => 0,
                    'frequency_total' => $freq['total'],
                    'frequency_non_empty' => $freq['non_empty'],
                    'frequency_percent' => round(($freq['non_empty'] / $total_records) * 100, 1)
                ];
            }
        }
        
        // PHASE 3: Collect samples and stats from ALL records
        $sample_limit = min($total_records, 50); // Analyze up to 50 records for samples
        echo "<div class='alert alert-info'>📝 Collecting samples and statistics from $sample_limit records...</div>";
        
        foreach ($waybill_list as $index => $waybill) {
            if ($index >= $sample_limit) break;
            
            $waybill_array = (array)$waybill;
            
            foreach ($waybill_array as $field => $value) {
                if (isset($goods_data[$field])) {
                    if ($value === null || $value === '') {
                        $goods_data[$field]['null_count']++;
                    } else {
                        $goods_data[$field]['non_null_count']++;
                        $str_value = (string)$value;
                        $goods_data[$field]['max_length'] = max($goods_data[$field]['max_length'], strlen($str_value));
                        
                        // Update data type if we find a more specific type
                        $current_type = $goods_data[$field]['type'];
                        $new_type = inferDataType($value);
                        if ($current_type === 'NVARCHAR' && $new_type !== 'NVARCHAR') {
                            $goods_data[$field]['type'] = $new_type;
                        }
                        
                        // Keep unique samples (max 10 for comprehensive analysis)
                        if (count($goods_data[$field]['samples']) < 10 && !in_array($str_value, $goods_data[$field]['samples'])) {
                            $goods_data[$field]['samples'][] = $str_value;
                        }
                    }
                }
            }
        }
        
        echo "<div class='alert alert-success'>✅ Analysis complete! Found " . count($goods_data) . " unique fields across all records</div>";
        
        // Show summary statistics
        echo "<div class='alert alert-light'>";
        echo "<h5>📈 Field Coverage Summary:</h5>";
        echo "<ul>";
        foreach ($goods_data as $field => $data) {
            $freq_pct = $data['frequency_percent'];
            $badge_class = $freq_pct > 80 ? 'success' : ($freq_pct > 50 ? 'warning' : 'secondary');
            echo "<li><strong>$field</strong>: <span class='badge badge-$badge_class'>{$freq_pct}%</span> ({$data['frequency_non_empty']}/{$total_records} records)</li>";
        }
        echo "</ul>";
        echo "</div>";
    } else {
        echo "<div class='alert alert-warning'>⚠️ No waybill-goods found or empty WAYBILL_LIST</div>";
        
        // Try to find any data in the response
        echo "<h4>Response Structure Analysis:</h4>";
        analyzeXmlStructure($sxe);
    }
    
    return $goods_data;
}

// Infer data type from value
function inferDataType($value) {
    if ($value === null || $value === '') return 'NVARCHAR';
    
    $str_value = (string)$value;
    
    // Check if it's a number
    if (is_numeric($str_value)) {
        if (strpos($str_value, '.') !== false) {
            return 'DECIMAL';
        } else {
            $int_val = (int)$str_value;
            if ($int_val >= -2147483648 && $int_val <= 2147483647) {
                return 'INT';
            } else {
                return 'BIGINT';
            }
        }
    }
    
    // Check if it's a date
    if (preg_match('/^\d{4}-\d{2}-\d{2}/', $str_value) || 
        preg_match('/^\d{2}\/\d{2}\/\d{4}/', $str_value)) {
        return 'DATETIME';
    }
    
    // Default to NVARCHAR
    return 'NVARCHAR';
}

// Analyze XML structure recursively
function analyzeXmlStructure($element, $depth = 0, $max_depth = 3) {
    if ($depth > $max_depth) return;
    
    $indent = str_repeat('&nbsp;&nbsp;&nbsp;&nbsp;', $depth);
    
    foreach ($element->children() as $child) {
        $name = $child->getName();
        $value = (string)$child;
        
        echo "$indent<strong>$name</strong>";
        if (strlen($value) > 0 && strlen($value) < 100) {
            echo ": " . htmlspecialchars($value);
        }
        echo "<br>";
        
        if ($child->children()->count() > 0) {
            analyzeXmlStructure($child, $depth + 1, $max_depth);
        }
    }
}

// Generate MSSQL CREATE TABLE statement
function generateMSSQLSchema($goods_data, $table_name) {
    echo "<h4>🏗️ Suggested MSSQL Schema for $table_name</h4>";
    
    $sql = "CREATE TABLE $table_name (\n";
    $sql .= "    ID INT IDENTITY(1,1) PRIMARY KEY,\n";
    $sql .= "    WAYBILL_EXTERNAL_ID NVARCHAR(50) NOT NULL, -- Links to waybill EXTERNAL_ID\n";
    
    foreach ($goods_data as $field => $info) {
        $sql_type = $info['type'];
        $max_length = $info['max_length'];
        
        switch ($sql_type) {
            case 'NVARCHAR':
                if ($max_length > 255) {
                    $sql_type = 'NVARCHAR(MAX)';
                } elseif ($max_length > 50) {
                    $sql_type = "NVARCHAR($max_length)";
                } else {
                    $sql_type = 'NVARCHAR(50)';
                }
                break;
            case 'DECIMAL':
                $sql_type = 'DECIMAL(18,4)';
                break;
            case 'INT':
                $sql_type = 'INT';
                break;
            case 'BIGINT':
                $sql_type = 'BIGINT';
                break;
            case 'DATETIME':
                $sql_type = 'DATETIME';
                break;
        }
        
        $nullable = $info['null_count'] > 0 ? 'NULL' : 'NOT NULL';
        $comment = "-- API field";
        if (!empty($info['samples'])) {
            $sample = $info['samples'][0];
            if (strlen($sample) > 30) $sample = substr($sample, 0, 30) . '...';
            $comment .= ": " . $sample;
        }
        
        $sql .= "    [$field] $sql_type $nullable, $comment\n";
    }
    
    $sql .= "    -- Internal tracking fields\n";
    $sql .= "    COMPANY_ID NVARCHAR(50) NULL, -- Internal: company reference\n";
    $sql .= "    COMPANY_NAME NVARCHAR(255) NULL, -- Internal: company name\n";
    $sql .= "    UPDATED_AT DATETIME NULL -- Internal: last update timestamp\n";
    $sql .= ");";
    
    echo "<pre style='background:#f8f8f8; padding:15px; border:1px solid #ddd; border-radius:5px; overflow:auto;'>";
    echo htmlspecialchars($sql);
    echo "</pre>";
    
    return $sql;
}

// Compare with existing schema
function compareWithExistingSchema($goods_data, $existing_schema) {
    echo "<h4>🔍 Schema Comparison</h4>";
    
    // Parse existing schema fields
    preg_match_all('/\[(\w+)\]\s+(\w+(?:\([^)]+\))?)/i', $existing_schema, $matches);
    $existing_fields = array_combine($matches[1], $matches[2]);
    
    echo "<table class='table table-striped'>";
    echo "<tr><th>Field</th><th>API Data Type</th><th>Current Schema</th><th>Status</th></tr>";
    
    foreach ($goods_data as $field => $info) {
        $api_type = $info['type'];
        $existing_type = $existing_fields[$field] ?? 'Missing';
        
        $status = 'OK';
        $status_class = 'success';
        
        if ($existing_type === 'Missing') {
            $status = 'Missing in DB';
            $status_class = 'danger';
        } elseif ($api_type === 'INT' && !strpos($existing_type, 'INT')) {
            $status = 'Type mismatch';
            $status_class = 'warning';
        } elseif ($api_type === 'DECIMAL' && !strpos($existing_type, 'DECIMAL') && !strpos($existing_type, 'FLOAT')) {
            $status = 'Type mismatch';
            $status_class = 'warning';
        }
        
        echo "<tr class='table-$status_class'>";
        echo "<td><strong>$field</strong></td>";
        echo "<td>$api_type</td>";
        echo "<td>$existing_type</td>";
        echo "<td>$status</td>";
        echo "</tr>";
    }
    
    echo "</table>";
}

// HTML Header
if ($isWeb) {
    echo '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RS.GE Goods API Field Analyzer</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        .alert { margin: 10px 0; }
        .analysis-section { margin: 30px 0; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
        pre { font-size: 12px; }
        .field-table th { background: #f8f9fa; }
    </style>
</head>
<body>
<div class="container-fluid mt-4">';

    echo '<h1>🏪 RS.GE Goods API Field Analyzer</h1>';
    echo '<p class="lead">Analyze goods API endpoints to determine optimal database schema</p>';

    // Company selection form
    if (!isset($_POST['company']) || !isset($_POST['analyze'])) {
        echo '<div class="row">
            <div class="col-md-6">
                <form method="post" class="border p-4 rounded">
                    <h3>Select Company for Analysis</h3>
                    <div class="mb-3">
                        <label for="company" class="form-label">Company:</label>
                        <select name="company" id="company" class="form-select" required>';
        
        $companies = getCompaniesFromDatabase();
        foreach ($companies as $company) {
            echo '<option value="' . htmlspecialchars($company['company_name']) . '">' . 
                 htmlspecialchars($company['company_name']) . ' (' . htmlspecialchars($company['company_tin']) . ')</option>';
        }
        
        echo '</select>
                    </div>
                    <button type="submit" name="analyze" value="1" class="btn btn-primary">🔍 Start Analysis</button>
                </form>
            </div>
        </div>';
        
        echo '</div></body></html>';
        exit;
    }
}

// Main analysis
$selectedCompany = $_POST['company'] ?? 'Test Company';

// Get company credentials
$companies = getCompaniesFromDatabase();
$companyData = null;
foreach ($companies as $company) {
    if ($company['company_name'] === $selectedCompany) {
        $companyData = $company;
        break;
    }
}

if (!$companyData) {
    die('<div class="alert alert-danger">Company not found!</div>');
}

$user = $companyData['s_user'];
$password = $companyData['s_password'];
$company_tin = $companyData['company_tin'];

echo '<div class="alert alert-info">
    <h4>📊 Analysis Configuration</h4>
    <strong>Company:</strong> ' . htmlspecialchars($selectedCompany) . '<br>
    <strong>Company TIN:</strong> ' . htmlspecialchars($company_tin) . '<br>
    <strong>Service User:</strong> ' . htmlspecialchars($user) . '
</div>';

// Use date range for API testing (correct approach like waybills) - 1 MONTH AS REQUESTED
$start_date = date('Y-m-d', strtotime('-1 month'));
$end_date = date('Y-m-d');
$dateFormat = 'Y-m-d\\TH:i:s';
$create_date_s = (new DateTime($start_date))->format($dateFormat);
$create_date_e = (new DateTime($end_date . ' 23:59:59'))->format($dateFormat);

echo '<div class="alert alert-success">Using date range for analysis: ' . $start_date . ' to ' . $end_date . ' (1 month)</div>';

// Analysis results storage
$seller_goods_data = [];
$buyer_goods_data = [];

// Test seller goods API (CORRECTED: using date range like waybills)
echo '<div class="analysis-section">
<h2>🏪 Seller Goods API Analysis (Date Range)</h2>';

$xml_request = '<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
<get_waybill_goods_list xmlns="http://tempuri.org/">
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
</get_waybill_goods_list>
</soap:Body>
</soap:Envelope>';

$url = "https://services.rs.ge/WayBillService/WayBillService.asmx";
$result = analyzeGoodsApiFields("Seller Goods (Date Range)", $url, "get_waybill_goods_list", $xml_request, "Date Range: $start_date to $end_date");

// Merge results
foreach ($result as $field => $data) {
    if (!isset($seller_goods_data[$field])) {
        $seller_goods_data[$field] = $data;
    } else {
        $seller_goods_data[$field]['max_length'] = max($seller_goods_data[$field]['max_length'], $data['max_length']);
        $seller_goods_data[$field]['null_count'] += $data['null_count'];
        $seller_goods_data[$field]['non_null_count'] += $data['non_null_count'];
        $seller_goods_data[$field]['samples'] = array_unique(array_merge($seller_goods_data[$field]['samples'], $data['samples']));
    }
}

echo '</div>';

// Test buyer goods API (CORRECTED: using date range like waybills)
echo '<div class="analysis-section">
<h2>🛒 Buyer Goods API Analysis (Date Range)</h2>';

$xml_request = '<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
<get_buyer_waybilll_goods_list xmlns="http://tempuri.org/">
    <su>' . htmlspecialchars($user, ENT_XML1) . '</su>
    <sp>' . htmlspecialchars($password, ENT_XML1) . '</sp>
    <seller_tin xsi:nil="true"/>
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
</get_buyer_waybilll_goods_list>
</soap:Body>
</soap:Envelope>';

$url = "https://services.rs.ge/WayBillService/WayBillService.asmx";
$result = analyzeGoodsApiFields("Buyer Goods (Date Range)", $url, "get_buyer_waybilll_goods_list", $xml_request, "Date Range: $start_date to $end_date");

// Merge results
foreach ($result as $field => $data) {
    if (!isset($buyer_goods_data[$field])) {
        $buyer_goods_data[$field] = $data;
    } else {
        $buyer_goods_data[$field]['max_length'] = max($buyer_goods_data[$field]['max_length'], $data['max_length']);
        $buyer_goods_data[$field]['null_count'] += $data['null_count'];
        $buyer_goods_data[$field]['non_null_count'] += $data['non_null_count'];
        $buyer_goods_data[$field]['samples'] = array_unique(array_merge($buyer_goods_data[$field]['samples'], $data['samples']));
    }
}

echo '</div>';

// Generate schemas and comparisons
if (!empty($seller_goods_data)) {
    echo '<div class="analysis-section">';
    generateMSSQLSchema($seller_goods_data, 'rs.sellers_waybill_goods');
    
    // Get current schema from check_tables.php
    $check_tables_content = file_get_contents(__DIR__ . '/check_tables.php');
    if (preg_match("/rs\.sellers_waybill_goods.*?CREATE TABLE.*?\)/s", $check_tables_content, $matches)) {
        compareWithExistingSchema($seller_goods_data, $matches[0]);
    }
    echo '</div>';
}

if (!empty($buyer_goods_data)) {
    echo '<div class="analysis-section">';
    generateMSSQLSchema($buyer_goods_data, 'rs.buyers_waybill_goods');
    
    // Get current schema from check_tables.php
    $check_tables_content = file_get_contents(__DIR__ . '/check_tables.php');
    if (preg_match("/rs\.buyers_waybill_goods.*?CREATE TABLE.*?\)/s", $check_tables_content, $matches)) {
        compareWithExistingSchema($buyer_goods_data, $matches[0]);
    }
    echo '</div>';
}

// Field summary table
if (!empty($seller_goods_data) || !empty($buyer_goods_data)) {
    echo '<div class="analysis-section">
    <h2>📋 Comprehensive Field Analysis</h2>
    <table class="table table-striped field-table">
        <thead>
            <tr>
                <th>Field Name</th>
                <th>Type</th>
                <th>Max Length</th>
                <th>Frequency</th>
                <th>Non-Null Count</th>
                <th>Sample Values</th>
                <th>Source</th>
            </tr>
        </thead>
        <tbody>';
    
    $all_fields = array_merge(
        array_map(function($k, $v) { return [$k, $v, 'Seller']; }, array_keys($seller_goods_data), $seller_goods_data),
        array_map(function($k, $v) { return [$k, $v, 'Buyer']; }, array_keys($buyer_goods_data), $buyer_goods_data)
    );
    
    foreach ($all_fields as $field_data) {
        list($field, $info, $source) = $field_data;
        $samples = implode(', ', array_slice($info['samples'], 0, 3));
        if (count($info['samples']) > 3) $samples .= '...';
        
        // Format frequency display
        $frequency_display = '';
        if (isset($info['frequency_percent'])) {
            $freq_pct = $info['frequency_percent'];
            $freq_count = "{$info['frequency_non_empty']}/{$info['frequency_total']}";
            $badge_class = $freq_pct > 80 ? 'success' : ($freq_pct > 50 ? 'warning' : 'secondary');
            $frequency_display = "<span class='badge bg-$badge_class'>{$freq_pct}%</span><br><small>$freq_count records</small>";
        } else {
            $frequency_display = "<span class='badge bg-secondary'>N/A</span>";
        }
        
        echo "<tr>
            <td><strong>$field</strong></td>
            <td><span class='badge bg-secondary'>{$info['type']}</span></td>
            <td>{$info['max_length']}</td>
            <td>$frequency_display</td>
            <td>{$info['non_null_count']}</td>
            <td><small>" . htmlspecialchars($samples) . "</small></td>
            <td><span class='badge bg-primary'>$source</span></td>
        </tr>";
    }
    
    echo '</tbody></table></div>';
}

if ($isWeb) {
    echo '</div></body></html>';
}
?>
