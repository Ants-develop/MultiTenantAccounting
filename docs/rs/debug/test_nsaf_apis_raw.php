<?php
/**
 * NSAF APIs Raw Response Testing Page
 * 
 * This page tests all NSAF APIs and displays raw XML responses for analysis.
 * Useful for debugging API issues and understanding response structure.
 */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../../functions.php';
require_once __DIR__ . '/../../backend/database.php';

// Check admin access
if (!isAdmin()) {
    die('Access denied. Admin privileges required.');
}

// Get all companies with credentials
$pdo = getDatabaseConnection();
$stmt = $pdo->prepare("SELECT company_name, USER_ID, UN_ID, S_USER, S_PASSWORD FROM rs_users WHERE S_USER IS NOT NULL AND S_PASSWORD IS NOT NULL ORDER BY company_name");
$stmt->execute();
$companies = $stmt->fetchAll(PDO::FETCH_ASSOC);

$selectedCompany = $_GET['company'] ?? '';
$testResults = [];

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $selectedCompany) {
    // Get company credentials
    $stmt = $pdo->prepare("SELECT USER_ID, UN_ID, S_USER, S_PASSWORD FROM rs_users WHERE company_name = ?");
    $stmt->execute([$selectedCompany]);
    $companyData = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($companyData && $companyData['S_USER'] && $companyData['S_PASSWORD']) {
        $user_id = $companyData['USER_ID'];
        $un_id = $companyData['UN_ID'];
        $s_user = $companyData['S_USER'];
        $s_password = $companyData['S_PASSWORD'];
        
        // Test all NSAF APIs
        $apis = [
            'get_seller_invoices_n' => [
                'url' => 'https://webserv.rs.ge/specinvoices/SpecInvoicesService.asmx',
                'soap_action' => 'http://tempuri.org/get_seller_invoices_n',
                'xml' => '<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
    <get_seller_invoices_n xmlns="http://tempuri.org/">
    <user_id>' . htmlspecialchars($user_id, ENT_XML1) . '</user_id>
    <un_id>' . htmlspecialchars($un_id, ENT_XML1) . '</un_id>
    <s_dt>' . date('Y-m-d\TH:i:s', strtotime('-30 days')) . '</s_dt>
    <e_dt>' . date('Y-m-d\TH:i:s') . '</e_dt>
    <op_s_dt>' . date('Y-m-d\TH:i:s', strtotime('-30 days')) . '</op_s_dt>
    <op_e_dt>' . date('Y-m-d\TH:i:s') . '</op_e_dt>
    <su>' . htmlspecialchars($s_user, ENT_XML1) . '</su>
    <sp>' . htmlspecialchars($s_password, ENT_XML1) . '</sp>
    </get_seller_invoices_n>
</soap:Body>
</soap:Envelope>'
            ],
            'get_buyer_invoices_n' => [
                'url' => 'https://webserv.rs.ge/specinvoices/SpecInvoicesService.asmx',
                'soap_action' => 'http://tempuri.org/get_buyer_invoices_n',
                'xml' => '<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
    <get_buyer_invoices_n xmlns="http://tempuri.org/">
    <user_id>' . htmlspecialchars($user_id, ENT_XML1) . '</user_id>
    <un_id>' . htmlspecialchars($un_id, ENT_XML1) . '</un_id>
    <s_dt>' . date('Y-m-d\TH:i:s', strtotime('-30 days')) . '</s_dt>
    <e_dt>' . date('Y-m-d\TH:i:s') . '</e_dt>
    <op_s_dt>' . date('Y-m-d\TH:i:s', strtotime('-30 days')) . '</op_s_dt>
    <op_e_dt>' . date('Y-m-d\TH:i:s') . '</op_e_dt>
    <su>' . htmlspecialchars($s_user, ENT_XML1) . '</su>
    <sp>' . htmlspecialchars($s_password, ENT_XML1) . '</sp>
    </get_buyer_invoices_n>
</soap:Body>
</soap:Envelope>'
            ],
            'get_spec_products_n' => [
                'url' => 'https://webserv.rs.ge/specinvoices/SpecInvoicesService.asmx',
                'soap_action' => 'http://tempuri.org/get_spec_products_n',
                'xml' => '<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
    <get_spec_products_n xmlns="http://tempuri.org/">
    <user_id>' . htmlspecialchars($user_id, ENT_XML1) . '</user_id>
    <un_id>' . htmlspecialchars($un_id, ENT_XML1) . '</un_id>
    <su>' . htmlspecialchars($s_user, ENT_XML1) . '</su>
    <sp>' . htmlspecialchars($s_password, ENT_XML1) . '</sp>
    </get_spec_products_n>
</soap:Body>
</soap:Envelope>'
            ],
            'check_spec_users' => [
                'url' => 'https://webserv.rs.ge/specinvoices/SpecInvoicesService.asmx',
                'soap_action' => 'http://tempuri.org/check_spec_users',
                'xml' => '<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
    <check_spec_users xmlns="http://tempuri.org/">
    <user_id>' . htmlspecialchars($user_id, ENT_XML1) . '</user_id>
    <su>' . htmlspecialchars($s_user, ENT_XML1) . '</su>
    <sp>' . htmlspecialchars($s_password, ENT_XML1) . '</sp>
    </check_spec_users>
</soap:Body>
</soap:Envelope>'
            ]
        ];
        
        foreach ($apis as $apiName => $apiConfig) {
            $testResults[$apiName] = testNSAFAPI($apiName, $apiConfig);
        }
    }
}

function testNSAFAPI($apiName, $config) {
    $startTime = microtime(true);
    
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $config['url'],
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $config['xml'],
        CURLOPT_HTTPHEADER => [
            'Content-Type: text/xml; charset=utf-8',
            'SOAPAction: "' . $config['soap_action'] . '"'
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_VERBOSE => false,
        CURLOPT_HEADER => true
    ]);
    
    $response = curl_exec($ch);
    $curl_error = curl_error($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    $total_time = curl_getinfo($ch, CURLINFO_TOTAL_TIME);
    curl_close($ch);
    
    $headers = substr($response, 0, $header_size);
    $body = substr($response, $header_size);
    
    $result = [
        'api_name' => $apiName,
        'url' => $config['url'],
        'soap_action' => $config['soap_action'],
        'request_xml' => $config['xml'],
        'http_code' => $http_code,
        'curl_error' => $curl_error,
        'total_time' => $total_time,
        'response_headers' => $headers,
        'response_body' => $body,
        'response_size' => strlen($body),
        'success' => ($http_code === 200 && !$curl_error)
    ];
    
    // Try to parse XML for additional analysis
    if ($result['success'] && !empty($body)) {
        $clean_response = $body;
        
        // Remove BOM if present
        if (strpos($clean_response, "\xEF\xBB\xBF") === 0) {
            $clean_response = str_replace("\xEF\xBB\xBF", '', $clean_response);
        }
        
        // Remove null bytes
        $clean_response = str_replace("\x00", '', $clean_response);
        
        // Clean up empty xmlns attributes
        $clean_response = preg_replace('/xmlns=""/', '', $clean_response);
        
        // Fix "null" strings that might be causing issues
        $clean_response = str_replace('>null<', '><', $clean_response);
        
        $result['cleaned_response'] = $clean_response;
        
        libxml_use_internal_errors(true);
        $xmlObj = simplexml_load_string($clean_response);
        
        if ($xmlObj !== false) {
            $result['xml_parse_success'] = true;
            
            // Register namespaces for proper XPath queries
            $xmlObj->registerXPathNamespace('soap', 'http://schemas.xmlsoap.org/soap/envelope/');
            $xmlObj->registerXPathNamespace('diffgr', 'urn:schemas-microsoft-com:xml-diffgram-v1');
            $xmlObj->registerXPathNamespace('msdata', 'urn:schemas-microsoft-com:xml-msdata');
            $xmlObj->registerXPathNamespace('tempuri', 'http://tempuri.org/');
            
            // Check for SOAP faults
            $faults = $xmlObj->xpath('//soap:Fault');
            if (!empty($faults)) {
                $result['soap_fault'] = true;
                $result['fault_string'] = (string)$faults[0]->faultstring;
                $result['fault_code'] = (string)$faults[0]->faultcode;
            } else {
                $result['soap_fault'] = false;
                
                // Try to find data nodes using the same logic as sync_company_data_optimized.php
                $data_nodes = [];
                
                // For get_seller_invoices_n and get_buyer_invoices_n, look for invoices elements
                if (strpos($apiName, 'invoices_n') !== false) {
                    // Try multiple XPath patterns like in sync_company_data_optimized.php
                    $xpath_patterns = [
                        '//get_seller_invoices_nResult//*[local-name()="invoices"]',
                        '//get_buyer_invoices_nResult//*[local-name()="invoices"]',
                        '//*[local-name()="invoices"]'
                    ];
                    
                    foreach ($xpath_patterns as $pattern) {
                        $nodes = $xmlObj->xpath($pattern);
                        if (!empty($nodes)) {
                            $data_nodes = $nodes;
                            break;
                        }
                    }
                } else {
                    // For other APIs, use the original logic
                    $data_nodes = $xmlObj->xpath('//diffgr:diffgram//*[local-name()="invoice_descs" or local-name()="spec_products"]');
                    
                    if (count($data_nodes) === 0) {
                        $data_nodes = $xmlObj->xpath('//*[local-name()="invoice_descs" or local-name()="spec_products"]');
                    }
                }
                
                $result['data_nodes_found'] = count($data_nodes);
                $result['has_data'] = count($data_nodes) > 0;
                
                // Try to find any data in the response
                if (count($data_nodes) === 0) {
                    $all_elements = $xmlObj->xpath('//*');
                    $result['total_elements'] = count($all_elements);
                    $result['response_structure'] = [];
                    foreach ($all_elements as $element) {
                        $name = $element->getName();
                        if (!in_array($name, $result['response_structure'])) {
                            $result['response_structure'][] = $name;
                        }
                    }
                }
            }
        } else {
            $result['xml_parse_success'] = false;
            $errors = libxml_get_errors();
            $result['xml_errors'] = array_map(function($error) {
                return trim($error->message);
            }, $errors);
            libxml_clear_errors();
        }
    }
    
    $result['execution_time'] = microtime(true) - $startTime;
    
    return $result;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NSAF APIs Raw Response Testing</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css" rel="stylesheet">
    <style>
        .api-result {
            margin-bottom: 2rem;
            border: 1px solid #dee2e6;
            border-radius: 0.375rem;
        }
        .api-header {
            background-color: #f8f9fa;
            padding: 1rem;
            border-bottom: 1px solid #dee2e6;
        }
        .api-body {
            padding: 1rem;
        }
        .status-success {
            color: #198754;
        }
        .status-error {
            color: #dc3545;
        }
        .status-warning {
            color: #fd7e14;
        }
        .raw-response {
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 0.375rem;
            padding: 1rem;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            max-height: 400px;
            overflow-y: auto;
            white-space: pre-wrap;
            word-break: break-all;
        }
        .collapsible {
            cursor: pointer;
            user-select: none;
        }
        .collapsible:hover {
            background-color: #e9ecef;
        }
        .collapsible-content {
            display: none;
        }
        .collapsible-content.show {
            display: block;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 1rem;
        }
        .stat-card {
            background-color: #f8f9fa;
            padding: 1rem;
            border-radius: 0.375rem;
            text-align: center;
        }
        .stat-value {
            font-size: 1.5rem;
            font-weight: bold;
        }
        .stat-label {
            font-size: 0.875rem;
            color: #6c757d;
        }
    </style>
</head>
<body>
    <div class="container-fluid">
        <div class="row">
            <div class="col-12">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h1><i class="bi bi-bug"></i> NSAF APIs Raw Response Testing</h1>
                    <a href="../debug/" class="btn btn-outline-secondary">
                        <i class="bi bi-arrow-left"></i> Back to Debug
                    </a>
                </div>
                
                <div class="card mb-4">
                    <div class="card-header">
                        <h5 class="mb-0">Test Configuration</h5>
                    </div>
                    <div class="card-body">
                        <form method="GET" class="row g-3">
                            <div class="col-md-8">
                                <label for="company" class="form-label">Select Company</label>
                                <select class="form-select" id="company" name="company" required>
                                    <option value="">Choose a company...</option>
                                    <?php foreach ($companies as $company): ?>
                                        <option value="<?= htmlspecialchars($company['company_name']) ?>" 
                                                <?= $selectedCompany === $company['company_name'] ? 'selected' : '' ?>>
                                            <?= htmlspecialchars($company['company_name']) ?> 
                                            (TIN: <?= htmlspecialchars($company['USER_ID']) ?>, UN: <?= htmlspecialchars($company['UN_ID']) ?>)
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">&nbsp;</label>
                                <div>
                                    <button type="submit" class="btn btn-primary">
                                        <i class="bi bi-play-circle"></i> Test APIs
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
                
                <?php if ($selectedCompany && !empty($testResults)): ?>
                    <div class="card mb-4">
                        <div class="card-header">
                            <h5 class="mb-0">Test Results Summary</h5>
                        </div>
                        <div class="card-body">
                            <div class="stats-grid">
                                <div class="stat-card">
                                    <div class="stat-value"><?= count($testResults) ?></div>
                                    <div class="stat-label">APIs Tested</div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-value status-success"><?= count(array_filter($testResults, fn($r) => $r['success'])) ?></div>
                                    <div class="stat-label">Successful</div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-value status-error"><?= count(array_filter($testResults, fn($r) => !$r['success'])) ?></div>
                                    <div class="stat-label">Failed</div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-value status-warning"><?= count(array_filter($testResults, fn($r) => $r['success'] && isset($r['has_data']) && !$r['has_data'])) ?></div>
                                    <div class="stat-label">No Data</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <?php foreach ($testResults as $apiName => $result): ?>
                        <div class="api-result">
                            <div class="api-header collapsible" onclick="toggleCollapse('<?= $apiName ?>')">
                                <div class="d-flex justify-content-between align-items-center">
                                    <h5 class="mb-0">
                                        <i class="bi bi-chevron-right" id="icon-<?= $apiName ?>"></i>
                                        <?= htmlspecialchars($apiName) ?>
                                        <?php if ($result['success']): ?>
                                            <span class="badge bg-success ms-2">SUCCESS</span>
                                        <?php else: ?>
                                            <span class="badge bg-danger ms-2">FAILED</span>
                                        <?php endif; ?>
                                        
                                        <?php if ($result['success'] && isset($result['has_data'])): ?>
                                            <?php if ($result['has_data']): ?>
                                                <span class="badge bg-info ms-1">HAS DATA</span>
                                            <?php else: ?>
                                                <span class="badge bg-warning ms-1">NO DATA</span>
                                            <?php endif; ?>
                                        <?php endif; ?>
                                        
                                        <?php if (isset($result['soap_fault']) && $result['soap_fault']): ?>
                                            <span class="badge bg-danger ms-1">SOAP FAULT</span>
                                        <?php endif; ?>
                                    </h5>
                                    <div class="text-muted">
                                        HTTP <?= $result['http_code'] ?> | 
                                        <?= number_format($result['total_time'], 3) ?>s | 
                                        <?= number_format($result['response_size']) ?> bytes
                                    </div>
                                </div>
                            </div>
                            
                            <div class="api-body collapsible-content" id="content-<?= $apiName ?>">
                                <div class="row">
                                    <div class="col-md-6">
                                        <h6>Request Details</h6>
                                        <ul class="list-unstyled">
                                            <li><strong>URL:</strong> <?= htmlspecialchars($result['url']) ?></li>
                                            <li><strong>SOAP Action:</strong> <?= htmlspecialchars($result['soap_action']) ?></li>
                                            <li><strong>HTTP Code:</strong> 
                                                <span class="<?= $result['http_code'] === 200 ? 'status-success' : 'status-error' ?>">
                                                    <?= $result['http_code'] ?>
                                                </span>
                                            </li>
                                            <li><strong>Response Time:</strong> <?= number_format($result['total_time'], 3) ?>s</li>
                                            <li><strong>Response Size:</strong> <?= number_format($result['response_size']) ?> bytes</li>
                                        </ul>
                                        
                                        <?php if ($result['curl_error']): ?>
                                            <div class="alert alert-danger">
                                                <strong>cURL Error:</strong> <?= htmlspecialchars($result['curl_error']) ?>
                                            </div>
                                        <?php endif; ?>
                                        
                                        <?php if (isset($result['soap_fault']) && $result['soap_fault']): ?>
                                            <div class="alert alert-danger">
                                                <strong>SOAP Fault:</strong><br>
                                                <strong>Code:</strong> <?= htmlspecialchars($result['fault_code']) ?><br>
                                                <strong>String:</strong> <?= htmlspecialchars($result['fault_string']) ?>
                                            </div>
                                        <?php endif; ?>
                                        
                                        <?php if (isset($result['xml_parse_success'])): ?>
                                            <div class="alert alert-<?= $result['xml_parse_success'] ? 'success' : 'danger' ?>">
                                                <strong>XML Parse:</strong> <?= $result['xml_parse_success'] ? 'SUCCESS' : 'FAILED' ?>
                                                <?php if (!$result['xml_parse_success'] && isset($result['xml_errors'])): ?>
                                                    <br><strong>Errors:</strong> <?= htmlspecialchars(implode('; ', $result['xml_errors'])) ?>
                                                <?php endif; ?>
                                            </div>
                                        <?php endif; ?>
                                        
                                        <?php if (isset($result['data_nodes_found'])): ?>
                                            <div class="alert alert-info">
                                                <strong>Data Nodes Found:</strong> <?= $result['data_nodes_found'] ?>
                                            </div>
                                        <?php endif; ?>
                                    </div>
                                    
                                    <div class="col-md-6">
                                        <h6>Response Headers</h6>
                                        <div class="raw-response"><?= htmlspecialchars($result['response_headers']) ?></div>
                                    </div>
                                </div>
                                
                                <div class="mt-3">
                                    <h6>Request XML</h6>
                                    <div class="raw-response"><?= htmlspecialchars($result['request_xml']) ?></div>
                                </div>
                                
                                <div class="mt-3">
                                    <h6>Raw Response Body</h6>
                                    <div class="raw-response"><?= htmlspecialchars($result['response_body']) ?></div>
                                </div>
                                
                                <?php if (isset($result['cleaned_response'])): ?>
                                    <div class="mt-3">
                                        <h6>Cleaned Response (for parsing)</h6>
                                        <div class="raw-response"><?= htmlspecialchars($result['cleaned_response']) ?></div>
                                    </div>
                                <?php endif; ?>
                            </div>
                        </div>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>
        </div>
    </div>
    
    <script>
        function toggleCollapse(apiName) {
            const content = document.getElementById('content-' + apiName);
            const icon = document.getElementById('icon-' + apiName);
            
            if (content.classList.contains('show')) {
                content.classList.remove('show');
                icon.classList.remove('bi-chevron-down');
                icon.classList.add('bi-chevron-right');
            } else {
                content.classList.add('show');
                icon.classList.remove('bi-chevron-right');
                icon.classList.add('bi-chevron-down');
            }
        }
        
        // Auto-expand first result if there are errors
        document.addEventListener('DOMContentLoaded', function() {
            const failedResults = document.querySelectorAll('.api-result .badge.bg-danger');
            if (failedResults.length > 0) {
                const firstFailed = failedResults[0].closest('.api-result');
                const firstContent = firstFailed.querySelector('.collapsible-content');
                const firstIcon = firstFailed.querySelector('.collapsible i');
                if (firstContent && firstIcon) {
                    firstContent.classList.add('show');
                    firstIcon.classList.remove('bi-chevron-right');
                    firstIcon.classList.add('bi-chevron-down');
                }
            }
        });
    </script>
</body>
</html>
