<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('error_log', dirname(__DIR__) . '/logs/error.log');

// Register shutdown function to catch fatal errors (simplified)
register_shutdown_function(function() {
    $error = error_get_last();
    if ($error !== null && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        error_log("Fatal error in get_invoice_details_rs.php: " . json_encode($error));
        http_response_code(500);
        echo json_encode(['error' => true, 'message' => 'Internal server error']);
    }
});

require_once __DIR__ . '/../functions.php';
require_once __DIR__ . '/../backend/database.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['api'])) {
    // API mode: return JSON data for invoice details from RS service
    
    // Debug logging
    error_log("RS Invoice details API called - User ID: " . ($_SESSION['user_id'] ?? 'NOT SET'));
    error_log("Request parameters: " . json_encode($_GET));
    
    if (!isLoggedIn()) {
        error_log("RS Invoice details API - User not logged in");
        http_response_code(401);
        echo json_encode(['error' => true, 'message' => 'User not logged in']);
        exit;
    }
    
    $invoice_id = $_GET['invoice_id'] ?? null;
    $company_name = $_GET['company'] ?? null;
    $debug_mode = isset($_GET['debug']) && $_GET['debug'] == '1';
    $sync_mode = isset($_GET['sync']) && $_GET['sync'] == '1';
    
    if (!$invoice_id) {
        http_response_code(400);
        echo json_encode(['error' => true, 'message' => 'Invoice ID is required']);
        exit;
    }
    
    try {
        // First try to get invoice from database
        $invoice_data = getInvoiceFromDatabase($invoice_id);
        
        if (!$invoice_data) {
            // Invoice not in database, try to fetch from RS.ge API
            error_log("Invoice $invoice_id not found in database, attempting to fetch from RS.ge API");
            
            // Get company name for API call
            $company_name = getCompanyNameFromInvoice($invoice_id);
            if (!$company_name) {
                // Try to get any company name as fallback
                $company_name = getFallbackCompanyName();
            }
            
            if ($company_name) {
                // Fetch from RS.ge API
                $invoice_data = getInvoiceFromRS($invoice_id, $company_name, $debug_mode);
                
                if ($invoice_data) {
                    // Save to database
                    $update_result = updateInvoiceInDatabase($invoice_id, $invoice_data, $company_name);
                    if ($update_result['success']) {
                        error_log("Successfully fetched and saved invoice $invoice_id from RS.ge API");
                    }
                }
            }
        } else {
            // Invoice found in database, but try to refresh with latest data from RS.ge
            error_log("Invoice $invoice_id found in database, refreshing with latest data from RS.ge");
            
            $company_name = $invoice_data['COMPANY_NAME'] ?? getCompanyNameFromInvoice($invoice_id);
            if (!$company_name) {
                $company_name = getFallbackCompanyName();
            }
            
            if ($company_name) {
                // Fetch fresh data from RS.ge API
                $fresh_data = getInvoiceFromRS($invoice_id, $company_name, $debug_mode);
                
                if ($fresh_data) {
                    // Update database with fresh data
                    $update_result = updateInvoiceInDatabase($invoice_id, $fresh_data, $company_name);
                    if ($update_result['success']) {
                        error_log("Successfully updated invoice $invoice_id with fresh data from RS.ge API");
                        // Merge fresh data over existing data to preserve fields not returned by RS
                        $invoice_data = array_merge($invoice_data, $fresh_data);
                    }
                }
            }
        }
        
        if (!$invoice_data) {
            http_response_code(404);
            echo json_encode(['error' => true, 'message' => 'Invoice not found in database or RS.ge API']);
            exit;
        }
        
        error_log("Invoice data ready for display");
        
        // Auto-associate waybills with invoice if WAYBILL_IDS are found in fresh data
        if (isset($fresh_data['WAYBILL_IDS']) && !empty($fresh_data['WAYBILL_IDS'])) {
            $waybill_ids = $fresh_data['WAYBILL_IDS'];
            if (is_string($waybill_ids)) {
                $waybill_ids = explode(',', $waybill_ids);
            }
            $company_name = $invoice_data['COMPANY_NAME'] ?? getFallbackCompanyName();
            if ($company_name) {
                error_log("Auto-associating waybills " . implode(',', $waybill_ids) . " with invoice $invoice_id");
                autoAssociateWaybillsWithInvoice($invoice_id, $waybill_ids, $company_name);
            }
        }
        
        // Format the response
        $response = [
            'success' => true,
            'invoice' => $invoice_data,
            'source' => isset($fresh_data) ? 'rs_service' : 'database'
        ];
        
        error_log("Sending successful response");
        echo json_encode($response);
        
    } catch (Exception $e) {
        error_log("RS Invoice details API error: " . $e->getMessage());
        error_log("Stack trace: " . $e->getTraceAsString());
        
        $raw_response = null;
        if (isset($debug_info['response']['raw_response'])) {
            $raw_response = $debug_info['response']['raw_response'];
        }
        
        $error_response = createErrorResponse($invoice_id, $e->getMessage(), $debug_mode, $raw_response);
        http_response_code(500);
        echo json_encode($error_response);
    }
    exit;
}

/**
 * Create standardized error response
 */
function createErrorResponse($invoice_id, $message, $debug_mode = false, $raw_response = null) {
    $error_response = [
        'success' => false,
        'error' => true,
        'message' => $message,
        'invoice_id' => $invoice_id,
        'source' => 'rs_service_error'
    ];
    
    if ($debug_mode) {
        $error_response['debug'] = [
            'request' => [
                'url' => 'https://www.revenue.mof.ge/ntosservice/ntosservice.asmx',
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
 * Get invoice details from database
 */
function getInvoiceFromDatabase($invoice_id) {
    try {
        $pdo = getDatabaseConnection();
        
        // Try seller invoices first
        $stmt = $pdo->prepare("
            SELECT INVOICE_ID, F_SERIES, F_NUMBER, OPERATION_DT, REG_DT, SELLER_UN_ID, BUYER_UN_ID, 
                   STATUS, SEQ_NUM_S, S_USER_ID, K_ID, WAS_REF, SEQ_NUM_B, B_S_USER_ID, BUYER_TIN, 
                   BUYER_NAME, NOTES, LAST_UPDATE_DATE, SA_IDENT_NO, ORG_NAME, UPDATED_AT, COMPANY_ID, 
                   COMPANY_NAME, COMPANY_TIN, DOC_MOS_NOM_S, TANXA, VAT, AGREE_DATE, AGREE_S_USER_ID, 
                   REF_DATE, REF_S_USER_ID, DOC_MOS_NOM_B, OVERHEAD_NO, OVERHEAD_DT, R_UN_ID, K_TYPE, DEC_STATUS, DECL_DATE
            FROM rs.seller_invoices 
            WHERE INVOICE_ID = ?
        ");
        $stmt->execute([$invoice_id]);
        $invoice = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($invoice) {
            error_log("Found invoice in seller_invoices: " . $invoice_id);
            return $invoice;
        }
        
        // Try buyer invoices
        $stmt = $pdo->prepare("
            SELECT INVOICE_ID, F_SERIES, F_NUMBER, OPERATION_DT, REG_DT, SELLER_UN_ID, BUYER_UN_ID, 
                   STATUS, SEQ_NUM_S, S_USER_ID, K_ID, WAS_REF, SEQ_NUM_B, B_S_USER_ID, BUYER_TIN, 
                   BUYER_NAME, NOTES, LAST_UPDATE_DATE, SA_IDENT_NO, ORG_NAME, UPDATED_AT, COMPANY_ID, 
                   COMPANY_NAME, COMPANY_TIN, DOC_MOS_NOM_S, TANXA, VAT, AGREE_DATE, AGREE_S_USER_ID, 
                   REF_DATE, REF_S_USER_ID, DOC_MOS_NOM_B, OVERHEAD_NO, OVERHEAD_DT, R_UN_ID, K_TYPE, DEC_STATUS, DECL_DATE
            FROM rs.buyer_invoices 
            WHERE INVOICE_ID = ?
        ");
        $stmt->execute([$invoice_id]);
        $invoice = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($invoice) {
            error_log("Found invoice in buyer_invoices: " . $invoice_id);
            return $invoice;
        }
        
        error_log("Invoice not found in database: " . $invoice_id);
        return null;
        
    } catch (Exception $e) {
        error_log("Error getting invoice from database: " . $e->getMessage());
        return null;
    }
}

/**
 * Call RS service to get invoice details
 */
function getInvoiceFromRS($invoice_id, $company_name, $debug_mode = false) {
    // Get RS service credentials from database
    $credentials = getRSCredentials($company_name, 'service');
    
    if (!$credentials) {
        error_log("RS credentials not found for company: " . $company_name);
        throw new Exception("RS credentials not found for company: " . $company_name);
    }
    
    $service_user = $credentials['user'];
    $service_password = $credentials['password'];
    
    // Get user_id from rs_users table
    $user_id = getUserIdFromRSUsers($company_name);
    if (!$user_id) {
        error_log("User ID not found for company: " . $company_name);
        throw new Exception("User ID not found for company: " . $company_name);
    }
    
    // Create SOAP request
    $soap_request = createInvoiceSoapRequest($service_user, $service_password, $invoice_id, $user_id);
    $service_url = 'https://www.revenue.mof.ge/ntosservice/ntosservice.asmx';
    $headers = [
        'Content-Type: text/xml; charset=UTF-8',
        'SOAPAction: "http://tempuri.org/get_invoice"',
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
    $response = makeInvoiceSoapRequest($service_url, $soap_request, $headers, $debug_info);
    
    // Update debug info with raw response
    if ($debug_mode) {
        $debug_info['response']['raw_response'] = $response;
        $debug_info['response']['response_length'] = strlen($response);
    }
    
    // Log raw response to console for debugging

    
    // Validate response
    validateInvoiceSoapResponse($response, $debug_mode);
    
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
    
    // Check if get_invoice returned false (invoice not found)
    if (strpos($response, '<get_invoiceResult>false</get_invoiceResult>') !== false) {
        error_log("RS API returned get_invoiceResult false (invoice not found)");
        if ($debug_mode) {
            $debug_info['rs_result'] = 'false';
            $debug_info['rs_error'] = "Invoice not found in RS service";
            $debug_info['invoice_id'] = $invoice_id;
            $debug_info['raw_request'] = $soap_request;
            $debug_info['raw_response'] = $response;
        }
        
        // Return debug info even when invoice is not found
        if ($debug_mode) {
            return ['_debug' => $debug_info, '_not_found' => true];
        }
        return null;
    }
    
    // Parse XML response
    $xml = parseInvoiceXmlResponse($response, $debug_mode, $debug_info);
    
    // Extract invoice data
    $invoice_data = parseInvoiceResponse($xml, $invoice_id, $company_name, $debug_mode);
    
    if (!$invoice_data) {
        error_log("Failed to parse invoice data, returning raw response");
        $invoice_data = [
            'ID' => $invoice_id,
            'RAW_RESPONSE' => $response,
            'PARSE_ERROR' => true
        ];
    }
    
    // Fetch declaration date
    $decl_num = $invoice_data['SEQ_NUM_S'] ?? $invoice_data['SEQ_NUM_B'] ?? null;
    if ($decl_num) {
        try {
            $invoice_data['DECL_DATE'] = getDeclarationDateFromRS($decl_num, $company_name);
        } catch (Exception $e) {
            error_log("Failed to get declaration date for decl_num $decl_num: " . $e->getMessage());
            $invoice_data['DECL_DATE'] = null;
        }
    }
            // Add debug information if requested
        if ($debug_mode) {
            // Preserve any existing debug info (like goods_debug) and merge with main debug info
            if (isset($invoice_data['_debug'])) {
                $debug_info = array_merge($debug_info, $invoice_data['_debug']);
            }
            $invoice_data['_debug'] = $debug_info;
        }
    
    return $invoice_data;
}

/**
 * NEW: Get declaration date from RS service
 */
function getDeclarationDateFromRS($decl_num, $company_name) {
    if (empty($decl_num) || empty($company_name)) {
        return null;
    }

    $pdo = getDatabaseConnection();
    $stmt = $pdo->prepare("SELECT s_user, s_password, un_id FROM rs_users WHERE company_name = ?");
    $stmt->execute([$company_name]);
    $credentials = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$credentials) {
        error_log("[ERROR] getDeclarationDateFromRS: Credentials not found for company: $company_name");
        return null;
    }

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
    
    $url = "https://www.revenue.mof.ge/ntosservice/ntosservice.asmx";
    $debug_info = []; // Dummy for makeInvoiceSoapRequest
    $response = makeInvoiceSoapRequest($url, $soap_request, $headers, $debug_info);

    $clean_xml = str_ireplace(['soap:', 'diffgr:', 'msdata:'], '', $response);
    $sxe = simplexml_load_string($clean_xml);
    if ($sxe !== false && isset($sxe->Body->get_decl_dateResponse->get_decl_dateResult)) {
        $date_result = (string)$sxe->Body->get_decl_dateResponse->get_decl_dateResult;
        
        // Validate that the result is a non-empty, parsable date
        if (!empty($date_result) && strtotime($date_result) !== false) {
            return $date_result;
        } else {
            error_log("[WARNING] getDeclarationDateFromRS: Received an invalid or empty date string for decl_num $decl_num. Result: '$date_result'");
            return null;
        }
    } else {
        error_log("[ERROR] getDeclarationDateFromRS: Failed to parse XML or find result node for decl_num $decl_num. Raw response: " . $response);
        return null;
    }
}

/**
 * Create SOAP request XML for getting invoice details
 */
function createInvoiceSoapRequest($service_user, $service_password, $invoice_id, $user_id) {
    $soap_request = '<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <get_invoice xmlns="http://tempuri.org/">
      <user_id>' . htmlspecialchars($user_id) . '</user_id>
      <invois_id>' . htmlspecialchars($invoice_id) . '</invois_id>
      <su>' . htmlspecialchars($service_user) . '</su>
      <sp>' . htmlspecialchars($service_password) . '</sp>
    </get_invoice>
  </soap:Body>
</soap:Envelope>';
    

    return $soap_request;
}

/**
 * Make SOAP request using cURL
 */
function makeInvoiceSoapRequest($service_url, $soap_request, $headers, &$debug_info) {
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
    

    return $response;
}

/**
 * Validate SOAP response
 */
function validateInvoiceSoapResponse($response, $debug_mode) {
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
function parseInvoiceXmlResponse($response, $debug_mode, &$debug_info) {
    libxml_use_internal_errors(true);
    
    // Log the raw response first for debugging
    error_log("Raw response from RS service: " . $response);
    
    // Check if response is already a simple string (not XML)
    if (!preg_match('/^<\?xml/', $response) && !preg_match('/<soap:/', $response)) {
        error_log("Response is not XML format, treating as raw data");
        
        // Parse the raw string response
        $parsed_data = parseRawInvoiceResponse($response);
        if ($parsed_data) {
            // Create a simple XML structure for consistency
            $xml_string = '<?xml version="1.0" encoding="UTF-8"?><invoice_data>' . 
                         '<get_invoiceResult>true</get_invoiceResult>' .
                         '<invois_id>' . htmlspecialchars($parsed_data['ID'] ?? '') . '</invois_id>' .
                         '<f_series>' . htmlspecialchars($parsed_data['F_SERIES'] ?? '') . '</f_series>' .
                         '<f_number>' . htmlspecialchars($parsed_data['F_NUMBER'] ?? '') . '</f_number>' .
                         '<operation_dt>' . htmlspecialchars($parsed_data['OPERATION_DT'] ?? '') . '</operation_dt>' .
                         '<reg_dt>' . htmlspecialchars($parsed_data['REG_DT'] ?? '') . '</reg_dt>' .
                         '<seller_un_id>' . htmlspecialchars($parsed_data['SELLER_UN_ID'] ?? '') . '</seller_un_id>' .
                         '<buyer_un_id>' . htmlspecialchars($parsed_data['BUYER_UN_ID'] ?? '') . '</buyer_un_id>' .
                         '<status>' . htmlspecialchars($parsed_data['STATUS'] ?? '') . '</status>' .
                         '<seq_num_s>' . htmlspecialchars($parsed_data['SEQ_NUM_S'] ?? '') . '</seq_num_s>' .
                         '<seq_num_b>' . htmlspecialchars($parsed_data['SEQ_NUM_B'] ?? '') . '</seq_num_b>' .
                         '<k_id>' . htmlspecialchars($parsed_data['K_ID'] ?? '') . '</k_id>' .
                         '<r_un_id>' . htmlspecialchars($parsed_data['R_UN_ID'] ?? '') . '</r_un_id>' .
                         '<k_type>' . htmlspecialchars($parsed_data['K_TYPE'] ?? '') . '</k_type>' .
                         '<b_s_user_id>' . htmlspecialchars($parsed_data['B_S_USER_ID'] ?? '') . '</b_s_user_id>' .
                         '<dec_status>' . htmlspecialchars($parsed_data['DEC_STATUS'] ?? '') . '</dec_status>' .
                         '<overhead_no>' . htmlspecialchars($parsed_data['OVERHEAD_NO'] ?? '') . '</overhead_no>' .
                         '<overhead_dt>' . htmlspecialchars($parsed_data['OVERHEAD_DT'] ?? '') . '</overhead_dt>' .
                         '</invoice_data>';
            
            $xml = simplexml_load_string($xml_string);
            if ($xml) {
                error_log("Created XML from raw response data");
                return $xml;
            }
        }
    } else {
        error_log("Response appears to be valid XML format, proceeding with normal XML parsing");
    }
    
    // Check if response contains the expected structure
    if (strpos($response, '<get_invoiceResponse') !== false && strpos($response, '<soap:Envelope') !== false) {
        error_log("Response contains expected get_invoiceResponse and SOAP structure");
    } else {
        error_log("Response does not contain expected structure");
        error_log("Response preview: " . substr($response, 0, 500));
    }
    
    // First, try a simple XML test
    $simple_test = simplexml_load_string($response);
    if ($simple_test) {
        error_log("XML parsed successfully with simple load");
        return $simple_test;
    } else {
        $simple_errors = libxml_get_errors();
        libxml_clear_errors();
        error_log("Simple XML load failed. Errors: " . print_r($simple_errors, true));
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
            error_log("Response length: " . strlen($test_response));
            error_log("Response contains XML declaration: " . (preg_match('/^<\?xml/', $test_response) ? 'YES' : 'NO'));
            error_log("Response contains SOAP envelope: " . (preg_match('/<soap:Envelope/', $test_response) ? 'YES' : 'NO'));
        }
    }
    
    // If we get here, try with LIBXML_PARSEHUGE option
    libxml_use_internal_errors(true);
    $xml = simplexml_load_string($response, 'SimpleXMLElement', LIBXML_NOERROR | LIBXML_NOWARNING | LIBXML_PARSEHUGE);
    $xml_errors = libxml_get_errors();
    libxml_clear_errors();
    
    if ($xml) {
        error_log("XML parsed successfully with LIBXML_PARSEHUGE option");
        return $xml;
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
    
    // Try extracting the full get_invoice response from the SOAP response
    if (preg_match('/<get_invoiceResponse[^>]*>(.*?)<\/get_invoiceResponse>/s', $response, $matches)) {
        $response_xml = '<get_invoiceResponse xmlns="http://tempuri.org/">' . $matches[1] . '</get_invoiceResponse>';
        error_log("Extracted get_invoice response XML: " . substr($response_xml, 0, 500));
        
        $xml = simplexml_load_string($response_xml);
        $xml_errors = libxml_get_errors();
        libxml_clear_errors();
        
        if ($xml) {
            error_log("XML parsed successfully from extracted get_invoice response");
            return $xml;
        }
    }
    
    // Try extracting just the get_invoice result from the SOAP response
    if (preg_match('/<get_invoiceResult[^>]*>(.*?)<\/get_invoiceResult>/s', $response, $matches)) {
        $result_xml = '<get_invoiceResult>' . $matches[1] . '</get_invoiceResult>';
        error_log("Extracted get_invoice result XML: " . substr($result_xml, 0, 500));
        
        $xml = simplexml_load_string($result_xml);
        $xml_errors = libxml_get_errors();
        libxml_clear_errors();
        
        if ($xml) {
            error_log("XML parsed successfully from extracted get_invoice result");
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
 * Parse invoice data from SOAP response
 */
function parseInvoiceResponse($xml, $target_invoice_id, $company_name, $debug_mode) {
    // Register namespaces
    $xml->registerXPathNamespace('soap', 'http://schemas.xmlsoap.org/soap/envelope/');
    $xml->registerXPathNamespace('ns', 'http://tempuri.org/');
    
    // Try to find the get_invoice response
    $response_nodes = findInvoiceResponseNodes($xml);
    
    if (empty($response_nodes)) {
        error_log("No invoice response found in XML.");
        return null;
    }
    
    error_log("Found invoice response node");
    
    // Parse invoice data from the response
    $invoice_data = parseInvoiceBasicInfo($response_nodes[0]);
    
    if (!$invoice_data) {
        error_log("Invoice data parsing returned null - invoice not found");
        return null;
    }
    
            // Get goods data using get_invoice_desc method
        
        
        try {
            $goods_result = getInvoiceGoodsFromRS($target_invoice_id, $company_name, $debug_mode);
            
        } catch (Exception $e) {
            
            $goods_result = [];
        }
    
    // Initialize debug info array
    $debug_info = [];
    
                            if ($debug_mode && is_array($goods_result) && isset($goods_result['_debug'])) {
            $invoice_data['GOODS_LIST'] = $goods_result['goods_list'];
            $debug_info['goods_debug'] = $goods_result['_debug'];
        } else {
            $invoice_data['GOODS_LIST'] = $goods_result;
        }
        
        // Get waybill IDs from database
        $waybill_ids = getWaybillIdsFromInvoice($target_invoice_id);
        
        // Also check if RS service response contains waybill IDs
        if (isset($invoice_data['WAYBILL_IDS']) && !empty($invoice_data['WAYBILL_IDS'])) {
            $rs_waybill_ids = $invoice_data['WAYBILL_IDS'];
            if (is_string($rs_waybill_ids)) {
                $rs_waybill_ids = explode(',', $rs_waybill_ids);
            }
            $waybill_ids = array_merge($waybill_ids, $rs_waybill_ids);
            $waybill_ids = array_unique($waybill_ids);
        }
        
        $invoice_data['WAYBILL_IDS'] = $waybill_ids;
        
        // Debug logging
        if ($debug_mode) {
            error_log("Invoice $target_invoice_id - Found waybill IDs: " . json_encode($waybill_ids));
        }
    
    // Add goods debug info if requested
    if ($debug_mode) {
        $debug_info['goods_request'] = [
            'url' => 'https://www.revenue.mof.ge/ntosservice/ntosservice.asmx',
            'method' => 'get_invoice_desc',
            'invoice_id' => $target_invoice_id,
            'company_name' => $company_name
        ];
    }
    
    // Add debug info to invoice data if requested
    if ($debug_mode && !empty($debug_info)) {
        $invoice_data['_debug'] = $debug_info;
    
    } else if ($debug_mode) {
    
    }
    
    return $invoice_data;
}

/**
 * Find invoice response nodes using various XPath patterns
 */
function findInvoiceResponseNodes($xml) {
    $patterns = [
        '//get_invoiceResponse',
        '//get_invoiceResult',
        '//ns:get_invoiceResponse',
        '//soap:Body//get_invoiceResponse',
        '//*[local-name()="get_invoiceResponse"]',
        '//get_invoiceResult',
        '//ns:get_invoiceResult',
        '//soap:Body//get_invoiceResult',
        '//*[local-name()="get_invoiceResult"]'
    ];
    
    foreach ($patterns as $pattern) {
        $nodes = $xml->xpath($pattern);
        if (!empty($nodes)) {
            error_log("Found " . count($nodes) . " response nodes with pattern: " . $pattern);
            return $nodes;
        }
    }
    
    // Try direct child access
    if (isset($xml->Body->get_invoiceResponse)) {
        error_log("Found response using direct child access");
        return [$xml->Body->get_invoiceResponse];
    }
    
    if (isset($xml->Body->get_invoiceResponse->get_invoiceResult)) {
        error_log("Found result using direct child access");
        return [$xml->Body->get_invoiceResponse->get_invoiceResult];
    }
    
    // If XML is already a get_invoiceResponse element (from extraction), return it directly
    if ($xml->getName() === 'get_invoiceResponse') {
        error_log("XML is already a get_invoiceResponse element");
        return [$xml];
    }
    
    // If XML is already a get_invoiceResult element (from extraction), return it directly
    if ($xml->getName() === 'get_invoiceResult') {
        error_log("XML is already a get_invoiceResult element");
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
 * Parse basic invoice information from get_invoice response
 */
function parseInvoiceBasicInfo($response) {
    // Debug: Log available fields
    $available_fields = [];
    foreach ($response as $key => $value) {
        $available_fields[] = $key;
    }

    
    // Check if get_invoiceResult is false (invoice not found)
    $result = (string)$response->get_invoiceResult ?? 'false';
    if ($result === 'false') {
    
        return null;
    }
    
    // The get_invoice method returns a boolean and uses out parameters
    // The response should contain the out parameters as child elements
    $invoice_data = [
        'ID' => (string)$response->invois_id ?? '',
        'F_SERIES' => (string)$response->f_series ?? '',
        'F_NUMBER' => (string)$response->f_number ?? '',
        'OPERATION_DT' => (string)$response->operation_dt ?? '',
        'REG_DT' => (string)$response->reg_dt ?? '',
        'SELLER_UN_ID' => (string)$response->seller_un_id ?? '',
        'BUYER_UN_ID' => (string)$response->buyer_un_id ?? '',
        'STATUS' => (string)$response->status ?? '',
        'SEQ_NUM_S' => (string)$response->seq_num_s ?? '',
        'SEQ_NUM_B' => (string)$response->seq_num_b ?? '',
        'K_ID' => (string)$response->k_id ?? '',
        'R_UN_ID' => (string)$response->r_un_id ?? '',
        'K_TYPE' => (string)$response->k_type ?? '',
        'B_S_USER_ID' => (string)$response->b_s_user_id ?? '',
        'DEC_STATUS' => (string)$response->dec_status ?? '',
        'OVERHEAD_NO' => (string)$response->overhead_no ?? '',
        'OVERHEAD_DT' => (string)$response->overhead_dt ?? '',
        'WAYBILL_IDS' => (string)$response->waybill_ids ?? (string)$response->waybill_id ?? '',
        'SUCCESS' => $result
    ];
    

    return $invoice_data;
}

/**
 * Get invoice goods data using get_invoice_desc method
 */
function getInvoiceGoodsFromRS($invoice_id, $company_name, $debug_mode = false) {

    
    try {
        // Get RS service credentials from database
        $credentials = getRSCredentials($company_name, 'service');
        
        if (!$credentials) {
            error_log("RS credentials not found for company: " . $company_name);
            return [];
        }
        
        $service_user = $credentials['user'];
        $service_password = $credentials['password'];
        
        // Get user_id from rs_users table
        $user_id = getUserIdFromRSUsers($company_name);
        if (!$user_id) {
            error_log("User ID not found for company: " . $company_name);
            return [];
        }
        
        // Create SOAP request for get_invoice_desc
        $soap_request = createInvoiceDescSoapRequest($service_user, $service_password, $invoice_id, $user_id);
        $service_url = 'https://www.revenue.mof.ge/ntosservice/ntosservice.asmx';
        $headers = [
            'Content-Type: text/xml; charset=UTF-8',
            'SOAPAction: "http://tempuri.org/get_invoice_desc"',
            'Content-Length: ' . strlen($soap_request)
        ];
        
        // Make SOAP request
        $debug_info = [];
        $response = makeInvoiceSoapRequest($service_url, $soap_request, $headers, $debug_info);
        
        // Build debug info structure for get_invoice_desc (same as get_invoice)
        $goods_debug_info = [
            'request' => [
                'url' => $service_url,
                'headers' => $headers,
                'soap_request' => $soap_request
            ],
            'response' => [
                'http_code' => $debug_info['response']['http_code'],
                'curl_error' => $debug_info['response']['curl_error'],
                'raw_response' => $debug_info['response']['raw_response'],
                'response_length' => $debug_info['response']['response_length']
            ]
        ];
        
                // Parse goods data
        $goods_data = parseInvoiceDescXmlResponse($response, $debug_mode);
        
        // Return debug info if requested
        if ($debug_mode) {
            $debug_data = [
                'goods_list' => $goods_data,
                '_debug' => $goods_debug_info
            ];
            
            return $debug_data;
        }
        
        return $goods_data;
        
    } catch (Exception $e) {
        
        return [];
    }
}

/**
 * Create SOAP request XML for getting invoice goods
 */
function createInvoiceDescSoapRequest($service_user, $service_password, $invoice_id, $user_id) {
    $soap_request = '<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <get_invoice_desc xmlns="http://tempuri.org/">
      <user_id>' . htmlspecialchars($user_id) . '</user_id>
      <invois_id>' . htmlspecialchars($invoice_id) . '</invois_id>
      <su>' . htmlspecialchars($service_user) . '</su>
      <sp>' . htmlspecialchars($service_password) . '</sp>
    </get_invoice_desc>
  </soap:Body>
</soap:Envelope>';
    

    return $soap_request;
}

/**
 * Parse invoice goods from get_invoice_desc response
 */
function parseInvoiceDescXmlResponse($response, $debug_mode = false) {
    libxml_use_internal_errors(true);

    $goods = [];

    // Load the XML
    $xml = simplexml_load_string($response);
    if ($xml === false) {
    
        return $goods;
    }

    // Register namespaces
    $xml->registerXPathNamespace('soap', 'http://schemas.xmlsoap.org/soap/envelope/');
    $xml->registerXPathNamespace('ns', 'http://tempuri.org/');
    $xml->registerXPathNamespace('diffgr', 'urn:schemas-microsoft-com:xml-diffgram-v1');

    // Find the diffgram node
    $diffgram = $xml->xpath('//diffgr:diffgram');
    if (!$diffgram || !isset($diffgram[0])) {
    
        return $goods;
    }

    // Find DocumentElement inside diffgram
    $docElement = $diffgram[0]->DocumentElement ?? null;
    if (!$docElement) {

        return $goods;
    }

    // Extract all <invoices_descs> nodes
    foreach ($docElement->invoices_descs as $item) {
        $goods[] = [
            'ID'           => (string)$item->ID,
            'INV_ID'       => (string)$item->INV_ID,
            'GOODS'        => (string)$item->GOODS,
            'G_UNIT'       => (string)$item->G_UNIT,
            'G_NUMBER'     => (string)$item->G_NUMBER,
            'FULL_AMOUNT'  => (string)$item->FULL_AMOUNT,
            'DRG_AMOUNT'   => (string)$item->DRG_AMOUNT,
            'AQCIZI_AMOUNT'=> (string)$item->AQCIZI_AMOUNT,
            'AKCIS_ID'     => (string)$item->AKCIS_ID,
            'WAYBILL_ID'   => (string)$item->WAYBILL_ID,
            'VAT_TYPE'     => (string)$item->VAT_TYPE,
            'SDRG_AMOUNT'  => (string)$item->SDRG_AMOUNT,
        ];
    }



    return $goods;
}

/**
 * Parse individual goods record from XML
 */
function parseGoodsRecord($record_xml) {
    $goods_item = [
        'ID' => '',
        'INV_ID' => '',
        'GOODS' => '',
        'G_UNIT' => '',
        'G_NUMBER' => '',
        'FULL_AMOUNT' => '',
        'DRG_AMOUNT' => '',
        'AQCIZI_AMOUNT' => '',
        'AKCIS_ID' => '',
        'SDRG_AMOUNT' => '',
        'WAYBILL_ID' => '',
        'VAT_TYPE' => ''
    ];
    
    // Extract fields using regex
    $fields = ['ID', 'INV_ID', 'GOODS', 'G_UNIT', 'G_NUMBER', 'FULL_AMOUNT', 'DRG_AMOUNT', 'AQCIZI_AMOUNT', 'AKCIS_ID', 'SDRG_AMOUNT', 'WAYBILL_ID', 'VAT_TYPE'];
    
    foreach ($fields as $field) {
        if (preg_match("/<$field>(.*?)<\/$field>/s", $record_xml, $matches)) {
            $goods_item[$field] = trim($matches[1]);
        }
    }
    

    return $goods_item;
}

/**
 * Parse invoice goods list from get_invoice_desc response
 */
function parseInvoiceGoodsList($xml) {
    $goods_list = [];
    
    // Try different patterns to find goods data in the response
    $patterns = [
        '//get_invoice_descResult//*',
        '//get_invoice_descResult',
        '//*[local-name()="get_invoice_descResult"]//*',
        '//diffgram//*',
        '//DocumentElement//*'
    ];
    
    foreach ($patterns as $pattern) {
        $goods_nodes = $xml->xpath($pattern);
        
        if (!empty($goods_nodes)) {

            
            foreach ($goods_nodes as $good) {
                // Debug: Log available goods fields
                $goods_fields = [];
                foreach ($good as $key => $value) {
                    $goods_fields[] = $key;
                }

                
                $goods_list[] = [
                    'ID' => (string)$good->id ?? '',
                    'INV_ID' => (string)$good->inv_id ?? '',
                    'GOODS' => (string)$good->goods ?? '',
                    'G_UNIT' => (string)$good->g_unit ?? '',
                    'G_NUMBER' => (string)$good->g_number ?? '',
                    'FULL_AMOUNT' => (string)$good->full_amount ?? '',
                    'DRG_AMOUNT' => (string)$good->drg_amount ?? '',
                    'AQCIZI_AMOUNT' => (string)$good->aqcizi_amount ?? '',
                    'AKCIS_ID' => (string)$good->akcis_id ?? '',
                    'SDRG_AMOUNT' => (string)$good->sdrg_amount ?? '',
                    'WAYBILL_ID' => (string)$good->waybill_id ?? '',
                    'VAT_TYPE' => (string)$good->vat_type ?? ''
                ];
            }
            
            if (!empty($goods_list)) {
                return $goods_list;
            }
        }
    }
    

    return $goods_list;
}



/**
 * Parse raw invoice response string
 */
function parseRawInvoiceResponse($response) {

    
    // The response format appears to be: "trueეკ136668482025-07-29T17:45:592025-07-29T18:13:357319371149251 2025-07-01T00:00:005nullnull327075530-1400"
    // We need to parse this concatenated string
    
    // Extract the result (true/false)
    $result = substr($response, 0, 4); // "true" or "false"
    
    // Remove the result from the beginning
    $data = substr($response, 4);
    
    // Parse the remaining data - this is a fixed-width format
    // Based on the example: "trueეკ136668482025-07-29T17:45:592025-07-29T18:13:357319371149251 2025-07-01T00:00:005nullnull327075530-1400"
    
    $parsed = [
        'ID' => '', // Will be extracted from the data
        'F_SERIES' => '',
        'F_NUMBER' => '',
        'OPERATION_DT' => '',
        'REG_DT' => '',
        'SELLER_UN_ID' => '',
        'BUYER_UN_ID' => '',
        'STATUS' => '',
        'SEQ_NUM_S' => '',
        'SEQ_NUM_B' => '',
        'K_ID' => '',
        'R_UN_ID' => '',
        'K_TYPE' => '',
        'B_S_USER_ID' => '',
        'DEC_STATUS' => '',
        'OVERHEAD_NO' => '',
        'OVERHEAD_DT' => ''
    ];
    
    // Try to extract data using regex patterns
    // Look for date patterns (YYYY-MM-DDTHH:MM:SS)
    if (preg_match_all('/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/', $data, $dates)) {
        if (isset($dates[1][0])) $parsed['OPERATION_DT'] = $dates[1][0];
        if (isset($dates[1][1])) $parsed['REG_DT'] = $dates[1][1];
        if (isset($dates[1][2])) $parsed['OVERHEAD_DT'] = $dates[1][2];
    }
    
    // Look for numeric IDs
    if (preg_match_all('/(\d{6,})/', $data, $ids)) {
        $numeric_ids = $ids[1];
        if (isset($numeric_ids[0])) $parsed['SELLER_UN_ID'] = $numeric_ids[0];
        if (isset($numeric_ids[1])) $parsed['BUYER_UN_ID'] = $numeric_ids[1];
        if (isset($numeric_ids[2])) $parsed['K_ID'] = $numeric_ids[2];
    }
    
    // Look for series/number pattern (like "ეკ13666848")
    if (preg_match('/([ა-ჰ]+)(\d+)/', $data, $series_match)) {
        $parsed['F_SERIES'] = $series_match[1];
        $parsed['F_NUMBER'] = $series_match[2];
    }
    
    // Look for status numbers
    if (preg_match_all('/(-?\d+)/', $data, $statuses)) {
        $status_numbers = $statuses[1];
        if (isset($status_numbers[0])) $parsed['STATUS'] = $status_numbers[0];
        if (isset($status_numbers[1])) $parsed['R_UN_ID'] = $status_numbers[1];
        if (isset($status_numbers[2])) $parsed['K_TYPE'] = $status_numbers[2];
        if (isset($status_numbers[3])) $parsed['B_S_USER_ID'] = $status_numbers[3];
        if (isset($status_numbers[4])) $parsed['DEC_STATUS'] = $status_numbers[4];
    }
    
    // Set default values for null fields
    $parsed['SEQ_NUM_S'] = 'null';
    $parsed['SEQ_NUM_B'] = 'null';
    $parsed['OVERHEAD_NO'] = '';
    

    
    return $parsed;
}

/**
 * Get user_id from rs_users table for a company
 */
function getUserIdFromRSUsers($company_name) {
    try {
        $pdo = getDatabaseConnection();
        
        $stmt = $pdo->prepare("SELECT USER_ID FROM rs_users WHERE COMPANY_NAME = ?");
        $stmt->execute([$company_name]);
        $user_id = $stmt->fetchColumn();
        
        return $user_id;
    } catch (Exception $e) {
        error_log("Error getting user_id for company: " . $e->getMessage());
        return null;
    }
}

/**
 * Get company name from invoice ID
 */
function getCompanyNameFromInvoice($invoice_id) {
    try {
        $pdo = getDatabaseConnection();
        
        error_log("Looking for company name for invoice ID: " . $invoice_id);
        
        // Try seller invoices first
        $stmt = $pdo->prepare("SELECT COMPANY_NAME FROM rs.seller_invoices WHERE INVOICE_ID = ?");
        $stmt->execute([$invoice_id]);
        $company_name = $stmt->fetchColumn();
        
        if ($company_name) {
            error_log("Found company name in seller_invoices: " . $company_name);
            return $company_name;
        }
        
        // Try buyer invoices
        $stmt = $pdo->prepare("SELECT COMPANY_NAME FROM rs.buyer_invoices WHERE INVOICE_ID = ?");
        $stmt->execute([$invoice_id]);
        $company_name = $stmt->fetchColumn();
        
        if ($company_name) {
            error_log("Found company name in buyer_invoices: " . $company_name);
            return $company_name;
        }
        
        // Debug: Check if invoice exists at all
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM rs.seller_invoices WHERE INVOICE_ID = ?");
        $stmt->execute([$invoice_id]);
        $seller_count = $stmt->fetchColumn();
        
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM rs.buyer_invoices WHERE INVOICE_ID = ?");
        $stmt->execute([$invoice_id]);
        $buyer_count = $stmt->fetchColumn();
        
        error_log("Invoice $invoice_id not found in database. Seller count: $seller_count, Buyer count: $buyer_count");
        
        // Try to get company name from waybills that reference this invoice
        $stmt = $pdo->prepare("SELECT COMPANY_NAME FROM rs.sellers_waybills WHERE INVOICE_ID = ? AND COMPANY_NAME IS NOT NULL LIMIT 1");
        $stmt->execute([$invoice_id]);
        $company_name = $stmt->fetchColumn();
        
        if ($company_name) {
            error_log("Found company name from seller waybills: " . $company_name);
            return $company_name;
        }
        
        $stmt = $pdo->prepare("SELECT COMPANY_NAME FROM rs.buyers_waybills WHERE INVOICE_ID = ? AND COMPANY_NAME IS NOT NULL LIMIT 1");
        $stmt->execute([$invoice_id]);
        $company_name = $stmt->fetchColumn();
        
        if ($company_name) {
            error_log("Found company name from buyer waybills: " . $company_name);
            return $company_name;
        }
        
        error_log("No company name found for invoice $invoice_id in any table");
        
        // TEMPORARY FALLBACK: Try to get any company name from rs_users table
        $stmt = $pdo->prepare("SELECT TOP 1 COMPANY_NAME FROM rs_users WHERE COMPANY_NAME IS NOT NULL");
        $stmt->execute();
        $fallback_company = $stmt->fetchColumn();
        
        if ($fallback_company) {
            error_log("Using fallback company name: " . $fallback_company);
            return $fallback_company;
        }
        
        return null;
    } catch (Exception $e) {
        error_log("Error getting company name for invoice: " . $e->getMessage());
        return null;
    }
}

/**
 * Get fallback company name from rs_users table
 */
function getFallbackCompanyName() {
    try {
        $pdo = getDatabaseConnection();
        $stmt = $pdo->prepare("SELECT TOP 1 COMPANY_NAME FROM rs_users WHERE COMPANY_NAME IS NOT NULL");
        $stmt->execute();
        $company_name = $stmt->fetchColumn();
        
        if ($company_name) {
            error_log("Using fallback company name: " . $company_name);
            return $company_name;
        }
        
        return null;
    } catch (Exception $e) {
        error_log("Error getting fallback company name: " . $e->getMessage());
        return null;
    }
}

/**
 * Get waybill IDs from database by invoice ID
 */
function getWaybillIdsFromInvoice($invoice_id) {
    try {
        $pdo = getDatabaseConnection();
        
        // Try seller waybills first
        $stmt = $pdo->prepare("SELECT EXTERNAL_ID FROM rs.sellers_waybills WHERE INVOICE_ID = ?");
        $stmt->execute([$invoice_id]);
        $seller_waybills = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        // Try buyer waybills
        $stmt = $pdo->prepare("SELECT EXTERNAL_ID FROM rs.buyers_waybills WHERE INVOICE_ID = ?");
        $stmt->execute([$invoice_id]);
        $buyer_waybills = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        return array_merge($seller_waybills, $buyer_waybills);
    } catch (Exception $e) {
        error_log("Error getting waybill IDs for invoice: " . $e->getMessage());
        return [];
    }
}

/**
 * Auto-associate waybills with invoice in rs.waybill_invoices table
 */
function autoAssociateWaybillsWithInvoice($invoice_id, $waybill_ids, $company_name) {
    try {
        $pdo = getDatabaseConnection();
        
            // Get company_id from rs_users table
    $stmt = $pdo->prepare("SELECT ID FROM rs_users WHERE COMPANY_NAME = ?");
    $stmt->execute([$company_name]);
    $company_id = $stmt->fetchColumn();
    
    // Debug: Log the company lookup
    error_log("Auto-associating waybills with invoice - company_name: " . $company_name . " -> company_id: " . ($company_id ?: 'NULL'));
        
        $associations_created = 0;
        
        foreach ($waybill_ids as $waybill_id) {
            $waybill_id = trim($waybill_id);
            if (empty($waybill_id)) continue;
            
            // Check if association already exists
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM rs.waybill_invoices WHERE WAYBILL_EXTERNAL_ID = ? AND INVOICE_ID = ?");
            $stmt->execute([$waybill_id, $invoice_id]);
            $exists = $stmt->fetchColumn() > 0;
            
            if ($exists) {
                error_log("Association already exists for waybill $waybill_id and invoice $invoice_id");
                continue;
            }
            
            // Insert association with simplified schema
            $stmt = $pdo->prepare("INSERT INTO rs.waybill_invoices (WAYBILL_EXTERNAL_ID, INVOICE_ID, COMPANY_ID, UPDATED_AT) VALUES (?, ?, ?, ?)");
            $stmt->execute([$waybill_id, $invoice_id, $company_id, date('Y-m-d H:i:s')]);
            
            $associations_created++;
            error_log("Successfully auto-associated waybill $waybill_id with invoice $invoice_id");
        }
        
        error_log("Auto-association complete: created $associations_created associations for invoice $invoice_id");
        
    } catch (Exception $e) {
        error_log("Error auto-associating waybills with invoice: " . $e->getMessage());
    }
}

/**
 * Update invoice data in database with fresh data from API
 */
function updateInvoiceInDatabase($invoice_id, $invoice_data, $company_name) {
    try {
        $pdo = getDatabaseConnection();
        
        // Get company_id from rs_users table
        $stmt = $pdo->prepare("SELECT ID FROM rs_users WHERE COMPANY_NAME = ?");
        $stmt->execute([$company_name]);
        $company_id = $stmt->fetchColumn();
        
        if (!$company_id) {
            return ['success' => false, 'message' => 'Company not found in rs_users table'];
        }
        
        // Determine if this is a seller or buyer invoice based on the data
        $is_seller_invoice = isset($invoice_data['SELLER_TIN']) && !empty($invoice_data['SELLER_TIN']);
        
        $table_name = $is_seller_invoice ? 'rs.seller_invoices' : 'rs.buyer_invoices';
        error_log("Updating invoice in table: $table_name");
        
        // Prepare the update data
        $update_fields = [];
        $update_values = [];
        
        // Map API fields to database columns
        $field_mapping = [
            'F_SERIES' => 'F_SERIES',
            'F_NUMBER' => 'F_NUMBER',
            'OPERATION_DT' => 'OPERATION_DT',
            'REG_DT' => 'REG_DT',
            'SELLER_UN_ID' => 'SELLER_UN_ID',
            'BUYER_UN_ID' => 'BUYER_UN_ID',
            'STATUS' => 'STATUS',
            'SEQ_NUM_S' => 'SEQ_NUM_S',
            'S_USER_ID' => 'S_USER_ID',
            'K_ID' => 'K_ID',
            'K_TYPE' => 'K_TYPE',
            'WAS_REF' => 'WAS_REF',
            'SEQ_NUM_B' => 'SEQ_NUM_B',
            'B_S_USER_ID' => 'B_S_USER_ID',
            'BUYER_TIN' => 'BUYER_TIN',
            'BUYER_NAME' => 'BUYER_NAME',
            'NOTES' => 'NOTES',
            'LAST_UPDATE_DATE' => 'LAST_UPDATE_DATE',
            'SA_IDENT_NO' => 'SA_IDENT_NO',
            'ORG_NAME' => 'ORG_NAME',
            'DOC_MOS_NOM_S' => 'DOC_MOS_NOM_S',
            'TANXA' => 'TANXA',
            'VAT' => 'VAT',
            'AGREE_DATE' => 'AGREE_DATE',
            'AGREE_S_USER_ID' => 'AGREE_S_USER_ID',
            'REF_DATE' => 'REF_DATE',
            'REF_S_USER_ID' => 'REF_S_USER_ID',
            'DOC_MOS_NOM_B' => 'DOC_MOS_NOM_B',
            'OVERHEAD_NO' => 'OVERHEAD_NO',
            'OVERHEAD_DT' => 'OVERHEAD_DT',
            'R_UN_ID' => 'R_UN_ID',
            'DEC_STATUS' => 'DEC_STATUS',
            'DECL_DATE' => 'DECL_DATE',
            'COMPANY_ID' => 'COMPANY_ID',
            'COMPANY_NAME' => 'COMPANY_NAME',
            'COMPANY_TIN' => 'COMPANY_TIN'
        ];
        
        foreach ($field_mapping as $api_field => $db_field) {
            if (isset($invoice_data[$api_field]) && $invoice_data[$api_field] !== null) {
                $update_fields[] = "$db_field = ?";
                $update_values[] = $invoice_data[$api_field];
            }
        }
        
        // Add updated_at timestamp
        $update_fields[] = "UPDATED_AT = ?";
        $update_values[] = date('Y-m-d H:i:s');
        
        if (empty($update_fields)) {
            return ['success' => false, 'message' => 'No valid fields to update'];
        }
        
        // Build the UPDATE query
        $sql = "UPDATE $table_name SET " . implode(', ', $update_fields) . " WHERE INVOICE_ID = ?";
        $update_values[] = $invoice_id;
        
        error_log("Update SQL: $sql");
        error_log("Update values: " . json_encode($update_values));
        
        $stmt = $pdo->prepare($sql);
        $result = $stmt->execute($update_values);
        
        if ($result) {
            $rows_affected = $stmt->rowCount();
            error_log("Successfully updated invoice $invoice_id in $table_name. Rows affected: $rows_affected");
            return ['success' => true, 'message' => "Updated $rows_affected rows"];
        } else {
            error_log("Failed to update invoice $invoice_id in $table_name");
            return ['success' => false, 'message' => 'Database update failed'];
        }
        
    } catch (Exception $e) {
        error_log("Error updating invoice in database: " . $e->getMessage());
        return ['success' => false, 'message' => $e->getMessage()];
    }
}
?> 