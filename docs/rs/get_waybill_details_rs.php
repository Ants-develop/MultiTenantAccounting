<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../functions.php';
require_once __DIR__ . '/../backend/database.php';

// Log all errors to a file
ini_set('log_errors', 1);
ini_set('error_log', dirname(__DIR__) . '/logs/error.log');

if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['api'])) {
    // API mode: return JSON data for waybill details from RS service
    
    // Debug logging
    error_log("RS Waybill details API called - User ID: " . ($_SESSION['user_id'] ?? 'NOT SET'));
    error_log("Request parameters: " . json_encode($_GET));
    
    if (!isLoggedIn()) {
        error_log("RS Waybill details API - User not logged in");
        http_response_code(401);
        echo json_encode(['error' => true, 'message' => 'User not logged in']);
        exit;
    }
    
    $waybill_id = $_GET['waybill_id'] ?? null;
    $company_name = $_GET['company'] ?? null;
    $debug_mode = isset($_GET['debug']) && $_GET['debug'] == '1';
    
    if (!$waybill_id) {
        http_response_code(400);
        echo json_encode(['error' => true, 'message' => 'Waybill ID is required']);
        exit;
    }
    
    // Get company name from waybill if not provided
    if (!$company_name) {
        $company_name = getCompanyNameFromWaybill($waybill_id);
    }
    
    if (!$company_name) {
        http_response_code(400);
        echo json_encode(['error' => true, 'message' => 'Company name not found for waybill']);
        exit;
    }
    
    try {
        // Call RS service to get waybill details
        $waybill_data = getWaybillFromRS($waybill_id, $company_name, $debug_mode);
        
        if (!$waybill_data) {
            $error_response = createErrorResponse($waybill_id, 'Waybill not found in RS service', $debug_mode, $debug_info['response']['raw_response'] ?? null);
            echo json_encode($error_response);
            exit;
        }
        
        error_log("Waybill found successfully in RS service");
        
        // Auto-associate invoices with waybill if INVOICE_ID is found
        if (isset($waybill_data['INVOICE_ID']) && !empty($waybill_data['INVOICE_ID'])) {
            $invoice_id = $waybill_data['INVOICE_ID'];
            error_log("Auto-associating invoice $invoice_id with waybill $waybill_id");
            autoAssociateInvoiceWithWaybill($waybill_id, $invoice_id, $company_name);
        }
        
        // Format the response
        $response = [
            'success' => true,
            'waybill' => $waybill_data,
            'source' => 'rs_service'
        ];
        
        // Add debug information if requested
        if ($debug_mode && isset($waybill_data['_debug'])) {
            $response['debug'] = $waybill_data['_debug'];
            unset($response['waybill']['_debug']);
        }
        
        error_log("Sending successful response from RS service");
        echo json_encode($response);
        
    } catch (Exception $e) {
        error_log("RS Waybill details API error: " . $e->getMessage());
        error_log("Stack trace: " . $e->getTraceAsString());
        
        $raw_response = null;
        if (isset($debug_info['response']['raw_response'])) {
            $raw_response = $debug_info['response']['raw_response'];
        }
        
        $error_response = createErrorResponse($waybill_id, $e->getMessage(), $debug_mode, $raw_response);
        http_response_code(500);
        echo json_encode($error_response);
    }
    exit;
}

// If not API call, return 404
http_response_code(404);
echo 'Not Found';

/**
 * Get company name from waybill ID
 */
function getCompanyNameFromWaybill($waybill_id) {
    try {
        $pdo = getDatabaseConnection();
        
        // Try seller waybills first
        $stmt = $pdo->prepare("SELECT SELLER_NAME FROM rs.sellers_waybills WHERE EXTERNAL_ID = ?");
        $stmt->execute([$waybill_id]);
        $company_name = $stmt->fetchColumn();
        
        if (!$company_name) {
            // Try buyer waybills
            $stmt = $pdo->prepare("SELECT BUYER_NAME FROM rs.buyers_waybills WHERE EXTERNAL_ID = ?");
            $stmt->execute([$waybill_id]);
            $company_name = $stmt->fetchColumn();
        }
        
        return $company_name;
    } catch (Exception $e) {
        error_log("Error getting company name for waybill: " . $e->getMessage());
        return null;
    }
}

/**
 * Create standardized error response
 */
function createErrorResponse($waybill_id, $message, $debug_mode = false, $raw_response = null) {
    $error_response = [
        'success' => false,
        'error' => true,
        'message' => $message,
        'waybill_id' => $waybill_id,
        'source' => 'rs_service_error'
    ];
    
    if ($debug_mode) {
        $error_response['debug'] = [
            'request' => [
                'url' => 'https://services.rs.ge/WayBillService/WayBillService.asmx',
                'headers' => ['Content-Type: text/xml; charset=UTF-8'],
                'soap_request' => 'SOAP request to RS service'
            ],
            'response' => [
                'http_code' => 500,
                'curl_error' => $message,
                'raw_response' => $raw_response ?: 'Error: ' . $message,
                'response_length' => $raw_response ? strlen($raw_response) : 0
            ]
        ];
    }
    
    return $error_response;
}

/**
 * Call RS service to get waybill details
 */
function getWaybillFromRS($waybill_id, $company_name, $debug_mode = false) {
    // Get RS service credentials from database
    $credentials = getRSCredentials($company_name, 'service');
    
    if (!$credentials) {
        error_log("RS credentials not found for company: " . $company_name);
        throw new Exception("RS credentials not found for company: " . $company_name);
    }
    
    $service_user = $credentials['user'];
    $service_password = $credentials['password'];
    
    // Create SOAP request
    $soap_request = createSoapRequest($service_user, $service_password, $waybill_id);
    $service_url = 'https://services.rs.ge/WayBillService/WayBillService.asmx';
    $headers = [
        'Content-Type: text/xml; charset=UTF-8',
        'SOAPAction: "http://tempuri.org/get_waybill"',
        'Content-Length: ' . strlen($soap_request)
    ];
    
    // Initialize debug information
    $debug_info = [
        'request' => [
            'url' => $service_url,
            'headers' => $headers,
            'soap_request' => $soap_request
        ],
        'response' => [
            'http_code' => null,
            'curl_error' => null,
            'raw_response' => null,
            'response_length' => null
        ]
    ];
    
    // Make SOAP request
    $response = makeSoapRequest($service_url, $soap_request, $headers, $debug_info);
    
    // Update debug info with raw response
    if ($debug_mode) {
        $debug_info['response']['raw_response'] = $response;
        $debug_info['response']['response_length'] = strlen($response);
    }
    
    // Validate response
    validateSoapResponse($response, $debug_mode);
    
    // Check for error status
    if (strpos($response, '<STATUS>-100</STATUS>') !== false) {
        error_log("RS API returned STATUS -100 (authentication error)");
        if ($debug_mode) {
            $debug_info['rs_status'] = '-100';
            $debug_info['rs_error'] = "Service user or password is incorrect (Status: -100)";
            $debug_info['company_name'] = $company_name;
            $debug_info['service_user'] = $service_user;
        }
        return null;
    }
    
    // Parse XML response
    $xml = parseXmlResponse($response, $debug_mode, $debug_info);
    
    // Extract waybill data
    $waybill_data = parseWaybillResponse($xml);
    
    if (!$waybill_data) {
        error_log("Failed to parse waybill data, returning raw response");
        $waybill_data = [
            'EXTERNAL_ID' => $waybill_id,
            'RAW_RESPONSE' => $response,
            'PARSE_ERROR' => true
        ];
    }
    
    // Add debug information if requested
    if ($debug_mode) {
        $waybill_data['_debug'] = $debug_info;
    }
    
    return $waybill_data;
}

/**
 * Create SOAP request XML
 */
function createSoapRequest($service_user, $service_password, $waybill_id) {
    return '<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <get_waybill xmlns="http://tempuri.org/">
      <su>' . htmlspecialchars($service_user) . '</su>
      <sp>' . htmlspecialchars($service_password) . '</sp>
      <waybill_id>' . htmlspecialchars($waybill_id) . '</waybill_id>
    </get_waybill>
  </soap:Body>
</soap:Envelope>';
}

/**
 * Make SOAP request using cURL
 */
function makeSoapRequest($service_url, $soap_request, $headers, &$debug_info) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $service_url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $soap_request);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curl_error = curl_error($ch);
    curl_close($ch);
    
    // Update debug information
    $debug_info['response']['http_code'] = $http_code;
    $debug_info['response']['curl_error'] = $curl_error;
    $debug_info['response']['raw_response'] = $response;
    $debug_info['response']['response_length'] = strlen($response);
    
    if ($curl_error) {
        error_log("CURL Error: " . $curl_error);
        throw new Exception("Failed to connect to RS service: " . $curl_error);
    }
    
    if ($http_code !== 200) {
        error_log("HTTP Error: " . $http_code);
        throw new Exception("RS service returned HTTP code: " . $http_code);
    }
    
    if (!$response) {
        error_log("Empty response from RS service");
        throw new Exception("Empty response from RS service");
    }
    
    error_log("RS Service Response Length: " . strlen($response) . " characters");
    error_log("RS Service Response Preview: " . substr($response, 0, 500) . "...");
    error_log("RS Service Full Response: " . $response);
    return $response;
}

/**
 * Validate SOAP response
 */
function validateSoapResponse($response, $debug_mode) {
    // Check if response is valid XML
    if (!preg_match('/^<\?xml/', $response)) {
        error_log("Response is not valid XML: " . substr($response, 0, 200));
        throw new Exception("Invalid XML response from RS service");
    }
    
    // Check for basic XML structure
    if (strpos($response, '<soap:Envelope') === false || strpos($response, '<soap:Body') === false) {
        error_log("Response missing SOAP structure: " . substr($response, 0, 200));
        throw new Exception("Invalid SOAP response from RS service");
    }
}

/**
 * Parse XML response
 */
function parseXmlResponse($response, $debug_mode, &$debug_info) {
    libxml_use_internal_errors(true);
    
    // Log the raw response first for debugging
    error_log("Raw response from RS service length: " . strlen($response) . " characters");
    error_log("Raw response from RS service: " . $response);
    
    // Check if response contains the expected structure
    if (strpos($response, '<WAYBILL') !== false && strpos($response, '<soap:Envelope') !== false) {
        error_log("Response contains expected WAYBILL and SOAP structure");
    } else {
        error_log("Response does not contain expected structure");
    }
    
    // Try multiple encoding approaches
    $encoding_attempts = [
        function($r) { return $r; }, // Original
        function($r) { return mb_convert_encoding($r, 'UTF-8', 'UTF-8'); },
        function($r) { return mb_convert_encoding($r, 'UTF-8', 'ISO-8859-1'); },
        function($r) { return mb_convert_encoding($r, 'UTF-8', 'Windows-1252'); }
    ];
    
    foreach ($encoding_attempts as $i => $encode_func) {
        $test_response = $encode_func($response);
        
        // Remove any BOM characters
        $test_response = str_replace("\xEF\xBB\xBF", '', $test_response);
        
        $xml = simplexml_load_string($test_response);
        $xml_errors = libxml_get_errors();
        libxml_clear_errors();
        
        if ($xml) {
            error_log("XML parsed successfully with encoding attempt " . ($i + 1));
            return $xml;
        }
        
        if ($i === 0) { // Only log errors for first attempt
            error_log("Failed to parse XML response. XML Errors: " . print_r($xml_errors, true));
            error_log("Response preview: " . substr($test_response, 0, 1000));
        }
    }
    
    // Try alternative parsing method with DOMDocument
    $dom = new DOMDocument();
    $dom->loadXML($response, LIBXML_NOERROR | LIBXML_NOWARNING);
    $xml_errors = libxml_get_errors();
    libxml_clear_errors();
    
    if ($dom->documentElement) {
        $xml = simplexml_import_dom($dom);
        if ($xml) {
            error_log("XML parsed successfully using DOMDocument fallback");
            return $xml;
        }
    }
    
    // Try with different libxml options
    libxml_use_internal_errors(true);
    $xml = simplexml_load_string($response, 'SimpleXMLElement', LIBXML_NOERROR | LIBXML_NOWARNING | LIBXML_PARSEHUGE);
    $xml_errors = libxml_get_errors();
    libxml_clear_errors();
    
    if ($xml) {
        error_log("XML parsed successfully with LIBXML_PARSEHUGE option");
        return $xml;
    }
    
    // Try removing any potential problematic characters
    $clean_response = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $response);
    $xml = simplexml_load_string($clean_response);
    $xml_errors = libxml_get_errors();
    libxml_clear_errors();
    
    if ($xml) {
        error_log("XML parsed successfully after cleaning control characters");
        return $xml;
    }
    
    // Try extracting just the waybill data from the SOAP response
    if (preg_match('/<WAYBILL[^>]*>(.*?)<\/WAYBILL>/s', $response, $matches)) {
        $waybill_xml = '<WAYBILL>' . $matches[1] . '</WAYBILL>';
        error_log("Extracted waybill XML: " . substr($waybill_xml, 0, 500));
        
        $xml = simplexml_load_string($waybill_xml);
        $xml_errors = libxml_get_errors();
        libxml_clear_errors();
        
        if ($xml) {
            error_log("XML parsed successfully from extracted waybill data");
            return $xml;
        }
    }
    
    $error_msg = "Failed to parse XML response from RS service after multiple encoding attempts. ";
    if (!empty($xml_errors)) {
        $error_msg .= "XML Errors: " . implode(", ", array_map(function($err) {
            return $err->message;
        }, $xml_errors));
    }
    
    if ($debug_mode) {
        $debug_info['xml_errors'] = $xml_errors;
        $debug_info['raw_response'] = $response;
    }
    
    throw new Exception($error_msg);
}

/**
 * Parse waybill data from SOAP response
 */
function parseWaybillResponse($xml) {
    // Register namespaces
    $xml->registerXPathNamespace('soap', 'http://schemas.xmlsoap.org/soap/envelope/');
    $xml->registerXPathNamespace('ns', 'http://tempuri.org/');
    
    // Try different XPath patterns to find waybill data
    $waybill_nodes = findWaybillNodes($xml);
    
    if (empty($waybill_nodes)) {
        error_log("No waybill data found in response.");
        return null;
    }
    
    error_log("Found " . count($waybill_nodes) . " waybill nodes");
    $waybill = $waybill_nodes[0];
    
    // Parse waybill data
    $waybill_data = parseWaybillBasicInfo($waybill);
    $waybill_data['GOODS_LIST'] = parseGoodsList($waybill);
    $waybill_data['SUB_WAYBILLS'] = parseSubWaybills($waybill);
    
    return $waybill_data;
}

/**
 * Find waybill nodes using various XPath patterns
 */
function findWaybillNodes($xml) {
    $patterns = [
        '//get_waybillResult/WAYBILL',
        '//get_waybillResult//WAYBILL',
        '//ns:get_waybillResult//WAYBILL',
        '//soap:Body//get_waybillResult//WAYBILL',
        '//WAYBILL[@xmlns=""]',
        '//WAYBILL',
        '//*[local-name()="WAYBILL"]',
        '//get_waybillResponse//get_waybillResult//WAYBILL',
        '//get_waybillResponse//WAYBILL'
    ];
    
    foreach ($patterns as $pattern) {
        $nodes = $xml->xpath($pattern);
        if (!empty($nodes)) {
            error_log("Found " . count($nodes) . " waybill nodes with pattern: " . $pattern);
            return $nodes;
        }
    }
    
    // Try direct child access
    if (isset($xml->Body->get_waybillResponse->get_waybillResult->WAYBILL)) {
        error_log("Found waybill using direct child access");
        return [$xml->Body->get_waybillResponse->get_waybillResult->WAYBILL];
    }
    
    // If XML is already a WAYBILL element (from extraction), return it directly
    if ($xml->getName() === 'WAYBILL') {
        error_log("XML is already a WAYBILL element");
        return [$xml];
    }
    
    // Log available elements for debugging
    $all_elements = $xml->xpath('//*');
    error_log("Available elements count: " . count($all_elements));
    foreach ($all_elements as $i => $element) {
        if ($i < 10) {
            error_log("Element " . $i . ": " . $element->getName());
        }
    }
    
    return [];
}

/**
 * Parse basic waybill information
 */
function parseWaybillBasicInfo($waybill) {
    // Debug: Log available fields
    $available_fields = [];
    foreach ($waybill as $key => $value) {
        $available_fields[] = $key;
    }
    error_log("Available waybill fields: " . implode(', ', $available_fields));
    
    return [
        'ID' => (string)$waybill->ID,
        'EXTERNAL_ID' => (string)$waybill->ID,
        'TYPE' => (string)$waybill->TYPE,
        'CREATE_DATE' => (string)$waybill->CREATE_DATE,
        'SELLER_TIN' => (string)$waybill->SELLER_TIN,
        'SELLER_NAME' => (string)$waybill->SELLER_NAME,
        'BUYER_TIN' => (string)$waybill->BUYER_TIN,
        'CHEK_BUYER_TIN' => (string)$waybill->CHEK_BUYER_TIN,
        'BUYER_NAME' => (string)$waybill->BUYER_NAME,
        'START_ADDRESS' => (string)$waybill->START_ADDRESS,
        'END_ADDRESS' => (string)$waybill->END_ADDRESS,
        'DRIVER_TIN' => (string)$waybill->DRIVER_TIN,
        'CHEK_DRIVER_TIN' => (string)$waybill->CHEK_DRIVER_TIN,
        'DRIVER_NAME' => (string)$waybill->DRIVER_NAME,
        'TRANSPORT_COAST' => (string)$waybill->TRANSPORT_COAST,
        'RECEPTION_INFO' => (string)$waybill->RECEPTION_INFO,
        'RECEIVER_INFO' => (string)$waybill->RECEIVER_INFO,
        'DELIVERY_DATE' => (string)$waybill->DELIVERY_DATE,
        'STATUS' => (string)$waybill->STATUS,
        'SELER_UN_ID' => (string)$waybill->SELER_UN_ID,
        'ACTIVATE_DATE' => (string)$waybill->ACTIVATE_DATE,
        'PAR_ID' => (string)$waybill->PAR_ID,
        'FULL_AMOUNT' => (string)$waybill->FULL_AMOUNT,
        'CAR_NUMBER' => (string)$waybill->CAR_NUMBER,
        'WAYBILL_NUMBER' => (string)$waybill->WAYBILL_NUMBER,
        'CLOSE_DATE' => (string)$waybill->CLOSE_DATE,
        'S_USER_ID' => (string)$waybill->S_USER_ID,
        'BEGIN_DATE' => (string)$waybill->BEGIN_DATE,
        'TRAN_COST_PAYER' => (string)$waybill->TRAN_COST_PAYER,
        'TRANS_ID' => (string)$waybill->TRANS_ID,
        'TRANS_TXT' => (string)$waybill->TRANS_TXT,
        'COMMENT' => (string)$waybill->COMMENT,
        'CATEGORY' => (string)$waybill->CATEGORY,
        'IS_MED' => (string)$waybill->IS_MED,
        'WOOD_LABELS' => (string)$waybill->WOOD_LABELS,
        'CUST_STATUS' => (string)$waybill->CUST_STATUS,
        'CUST_NAME' => (string)$waybill->CUST_NAME,
        'STATUS' => (string)$waybill->STATUS,
        'QUANTITY_F' => (string)$waybill->QUANTITY_F,
        'VAT_TYPE' => (string)$waybill->VAT_TYPE,
        'BAR_CODE' => (string)$waybill->BAR_CODE,
        'A_ID' => (string)$waybill->A_ID,
        'W_ID' => (string)$waybill->W_ID,
        'WOOD_LABEL' => (string)$waybill->WOOD_LABEL,
        'INVOICE_ID' => (string)$waybill->INVOICE_ID,
        'CONFIRMATION_DATE' => (string)$waybill->CONFIRMATION_DATE,
        'CORRECTION_DATE' => (string)$waybill->CORRECTION_DATE,
        'TRANSPORTER_TIN' => (string)$waybill->TRANSPORTER_TIN,
        'TOTAL_QUANTITY' => (string)$waybill->TOTAL_QUANTITY,
        'ORIGIN_TYPE' => (string)$waybill->ORIGIN_TYPE,
        'ORIGIN_TEXT' => (string)$waybill->ORIGIN_TEXT,
        'BUYER_S_USER_ID' => (string)$waybill->BUYER_S_USER_ID,
        'IS_CONFIRMED' => (string)$waybill->IS_CONFIRMED,
        'FULL_AMOUNT_TXT' => (string)$waybill->FULL_AMOUNT_TXT
    ];
}

/**
 * Parse goods list
 */
function parseGoodsList($waybill) {
    $goods_list = [];
    
    if (isset($waybill->GOODS_LIST)) {
        foreach ($waybill->GOODS_LIST->GOODS as $good) {
            // Debug: Log available goods fields
            $goods_fields = [];
            foreach ($good as $key => $value) {
                $goods_fields[] = $key;
            }
            error_log("Available goods fields: " . implode(', ', $goods_fields));
            
            // Extract quantity number from item name for unit column
            $w_name = (string)$good->W_NAME;
            $extracted_quantity = '';
            
            // Extract number before "ცალი" or similar Georgian units
            if (preg_match('/\*\*(\d+)\s*[ა-ჰ]+\*\*$/', $w_name, $matches)) {
                $extracted_quantity = $matches[1]; // Extract number from **50 ცალი**
            } elseif (preg_match('/(\d+)\s*[ა-ჰ]+$/', $w_name, $matches)) {
                $extracted_quantity = $matches[1]; // Extract number from 50 ცალი
            }
            
            // Use extracted quantity as unit if UNIT_TXT is empty
            $unit_txt = (string)$good->UNIT_TXT;
            if (empty($unit_txt) && !empty($extracted_quantity)) {
                $unit_txt = $extracted_quantity;
            }
            
            $goods_list[] = [
                'ID' => (string)$good->ID,
                'W_NAME' => $w_name,
                'UNIT_ID' => (string)$good->UNIT_ID,
                'UNIT_TXT' => $unit_txt,
                'QUANTITY' => (string)$good->QUANTITY,
                'QUANTITY_EXT' => (string)$good->QUANTITY_EXT,
                'PRICE' => (string)$good->PRICE,
                'AMOUNT' => (string)$good->AMOUNT,
                'BAR_CODE' => (string)$good->BAR_CODE,
                'A_ID' => (string)$good->A_ID,
                'W_ID' => (string)$good->W_ID,
                'VAT_TYPE' => (string)$good->VAT_TYPE,
                'WOOD_LABEL' => (string)$good->WOOD_LABEL,
                'STATUS' => (string)$good->STATUS,
                'QUANTITY_F' => (string)$good->QUANTITY_F
            ];
        }
    }
    
    return $goods_list;
}

/**
 * Parse sub-waybills
 */
function parseSubWaybills($waybill) {
    $sub_waybills = [];
    
    if (isset($waybill->SUB_WAYBILLS)) {
        foreach ($waybill->SUB_WAYBILLS->SUB_WAYBILL as $sub_waybill) {
            $sub_waybills[] = [
                'ID' => (string)$sub_waybill->ID,
                'WAYBILL_NUMBER' => (string)$sub_waybill->WAYBILL_NUMBER
            ];
        }
    }
    
    return $sub_waybills;
}

/**
 * Auto-associate invoice with waybill in rs.waybill_invoices table
 */
function autoAssociateInvoiceWithWaybill($waybill_id, $invoice_id, $company_name) {
    try {
        $pdo = getDatabaseConnection();
        
        // Check if association already exists
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM rs.waybill_invoices WHERE WAYBILL_EXTERNAL_ID = ? AND INVOICE_ID = ?");
        $stmt->execute([$waybill_id, $invoice_id]);
        $exists = $stmt->fetchColumn() > 0;
        
        if ($exists) {
            error_log("Association already exists for waybill $waybill_id and invoice $invoice_id");
            return;
        }
        
            // Get company_id from rs_users table
    $stmt = $pdo->prepare("SELECT ID FROM rs_users WHERE COMPANY_NAME = ?");
    $stmt->execute([$company_name]);
    $company_id = $stmt->fetchColumn();
    
    // Debug: Log the company lookup
    error_log("Auto-associating invoice with waybill - company_name: " . $company_name . " -> company_id: " . ($company_id ?: 'NULL'));
        
        // Insert association with simplified schema
        $stmt = $pdo->prepare("INSERT INTO rs.waybill_invoices (WAYBILL_EXTERNAL_ID, INVOICE_ID, COMPANY_ID, UPDATED_AT) VALUES (?, ?, ?, ?)");
        $stmt->execute([$waybill_id, $invoice_id, $company_id, date('Y-m-d H:i:s')]);
        
        error_log("Successfully auto-associated invoice $invoice_id with waybill $waybill_id");
        
    } catch (Exception $e) {
        error_log("Error auto-associating invoice with waybill: " . $e->getMessage());
    }
}
?> 