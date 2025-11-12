<?php
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

// === Build VAT Payer API requests ===
$vatPayerRequests = [
    'is_vat_payer_tin' => '<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
<is_vat_payer_tin xmlns="http://tempuri.org/">
    <su>' . htmlspecialchars($user, ENT_XML1) . '</su>
    <sp>' . htmlspecialchars($password, ENT_XML1) . '</sp>
    <tin>' . htmlspecialchars($company_tin, ENT_XML1) . '</tin>
</is_vat_payer_tin>
</soap:Body>
</soap:Envelope>',

    'is_vat_payer_tin_test' => '<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
<is_vat_payer_tin xmlns="http://tempuri.org/">
    <su>' . htmlspecialchars($user, ENT_XML1) . '</su>
    <sp>' . htmlspecialchars($password, ENT_XML1) . '</sp>
    <tin>12345678910</tin>
</is_vat_payer_tin>
</soap:Body>
</soap:Envelope>',

    'is_vat_payer_tin_company' => '<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
<is_vat_payer_tin xmlns="http://tempuri.org/">
    <su>' . htmlspecialchars($user, ENT_XML1) . '</su>
    <sp>' . htmlspecialchars($password, ENT_XML1) . '</sp>
    <tin>202450640</tin>
</is_vat_payer_tin>
</soap:Body>
</soap:Envelope>'
];

// === Show form with company selection ===
echo "<h2>🔍 VAT Payer Status API Analysis - RS.ge WayBill Service</h2>";

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
echo "<h3>🎯 VAT Payer API Information</h3>";
echo "<p><strong>Selected Company:</strong> <span style='color:#28a745; font-weight:bold;'>{$selectedCompany['company_name']}</span></p>";
echo "<p><strong>Company TIN:</strong> " . ($credentials['company_tin'] ?? 'Not found') . "</p>";
echo "<p><strong>Service User:</strong> " . ($credentials['s_user'] ?? 'Not found') . "</p>";
echo "<p><strong>API Endpoint:</strong> <code>https://services.rs.ge/WayBillService/WayBillService.asmx</code></p>";
echo "<p><strong>SOAP Action:</strong> <code>is_vat_payer_tin</code></p>";
echo "<p><strong>Purpose:</strong> Check if a specific TIN number is a VAT payer</p>";
echo "<p><em>💡 This API is useful for validating VAT payer status before processing waybills or invoices</em></p>";
echo "</div>";

// === Custom TIN Input Form ===
echo "<form method='post' style='margin-bottom:20px;'>";
echo "<input type='hidden' name='company_id' value='$selectedCompanyId'>";
echo "<fieldset style='margin-bottom:15px;'><legend><b>Custom TIN Testing</b></legend>";
echo "<label>Test TIN Number: <input type='text' name='custom_tin' placeholder='Enter TIN to test' style='padding:8px; border-radius:4px; border:1px solid #ced4da; margin-right:10px; min-width:200px;'></label><br>";
echo "<button type='submit' style='margin-top:10px; padding:8px 16px; background:#28a745; color:white; border:none; border-radius:4px; cursor:pointer;'>Test Custom TIN</button>";
echo "</fieldset>";
echo "</form>";

// === If form submitted, add custom TIN request ===
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['custom_tin']) && !empty($_POST['custom_tin'])) {
    $custom_tin = trim($_POST['custom_tin']);
    
    // Validate TIN format (basic validation)
    if (preg_match('/^\d{9,11}$/', $custom_tin)) {
        $vatPayerRequests['custom_tin_test'] = '<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
<is_vat_payer_tin xmlns="http://tempuri.org/">
    <su>' . htmlspecialchars($user, ENT_XML1) . '</su>
    <sp>' . htmlspecialchars($password, ENT_XML1) . '</sp>
    <tin>' . htmlspecialchars($custom_tin, ENT_XML1) . '</tin>
</is_vat_payer_tin>
</soap:Body>
</soap:Envelope>';
        
        echo "<div style='background:#fff3cd; padding:15px; border-radius:5px; margin:20px 0;'>";
        echo "<h3>✅ Custom TIN Added</h3>";
        echo "<p><strong>Custom TIN:</strong> $custom_tin</p>";
        echo "<p>This TIN will be tested in the analysis below.</p>";
        echo "</div>";
    } else {
        echo "<div style='background:#f8d7da; padding:15px; border-radius:5px; margin:20px 0;'>";
        echo "<h3>❌ Invalid TIN Format</h3>";
        echo "<p>TIN must be 9-11 digits. Please enter a valid TIN number.</p>";
        echo "</div>";
    }
}

// === Helper functions ===
function analyzeVatPayerApi($name, $url, $soapAction, $xml) {
    echo "<h3>📡 $name</h3>";
    
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
        CURLOPT_TIMEOUT => 30,
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
    
    if ($curl_error) {
        echo "<p style='color:red;'>❌ cURL Error: $curl_error</p>";
        return;
    }
    
    if ($http_code !== 200) {
        echo "<p style='color:red;'>❌ HTTP Error $http_code</p>";
        return;
    }
    
    // === XML RESPONSE ANALYSIS ===
    echo "<details><summary>📥 <strong>XML Response Analysis</strong></summary>";
    
    // Show response size and encoding info
    echo "<div style='background:#fff3cd; padding:10px; border-radius:5px; margin:10px 0;'>";
    echo "<h4>📊 Response Information</h4>";
    echo "<p><strong>Response Size:</strong> " . strlen($response) . " bytes</p>";
    echo "<p><strong>Content Type:</strong> $content_type</p>";
    echo "<p><strong>First 100 chars:</strong> " . htmlspecialchars(substr($response, 0, 100)) . "</p>";
    echo "<p><strong>Last 100 chars:</strong> " . htmlspecialchars(substr($response, -100)) . "</p>";
    echo "</div>";
    
    // Show raw response
    echo "<div style='background:#f8f9fa; padding:10px; border-radius:5px; margin:10px 0;'>";
    echo "<h4>📄 Raw Response</h4>";
    echo "<pre style='background:#fff; border:1px solid #ccc; padding:10px; max-height:300px; overflow:auto; font-size:11px;'>";
    echo htmlspecialchars($response);
    echo "</pre>";
    echo "</div>";
    
    echo "</details>";
    
    // === XML PARSING ===
    echo "<details><summary>🔧 <strong>XML Parsing & VAT Status</strong></summary>";
    
    // Clean the response
    $clean_response = $response;
    $clean_response = str_replace("\xEF\xBB\xBF", '', $clean_response); // Remove BOM
    $clean_response = str_replace("\x00", '', $clean_response); // Remove null bytes
    
    libxml_use_internal_errors(true);
    $xmlObj = simplexml_load_string($clean_response);
    
    if ($xmlObj === false) {
        echo "<div style='background:#f8d7da; padding:15px; border-radius:5px; margin:10px 0;'>";
        echo "<h4>❌ XML Parse Error</h4>";
        $libxml_errors = libxml_get_errors();
        if (!empty($libxml_errors)) {
            echo "<ul>";
            foreach ($libxml_errors as $error) {
                echo "<li>" . htmlspecialchars(trim($error->message)) . "</li>";
            }
            echo "</ul>";
        }
        echo "</div>";
        libxml_clear_errors();
        return;
    }
    
    echo "<div style='background:#d4edda; padding:10px; border-radius:5px; margin:10px 0;'>";
    echo "<h4>✅ XML Parsed Successfully</h4>";
    echo "<p>XML structure loaded without errors.</p>";
    echo "</div>";
    
    // === VAT STATUS EXTRACTION ===
    echo "<div style='background:#e8f5e8; padding:15px; border-radius:5px; margin:15px 0;'>";
    echo "<h4>💰 VAT Payer Status Analysis</h4>";
    
    // Try to extract VAT status
    $vat_status = null;
    $tin_tested = null;
    
    // Look for the result in different possible locations
    $possible_paths = [
        '//is_vat_payer_tinResult',
        '//*[contains(local-name(), "Result")]',
        '//*[contains(name(), "Result")]',
        '//soap:Body//is_vat_payer_tinResult'
    ];
    
    foreach ($possible_paths as $path) {
        $nodes = $xmlObj->xpath($path);
        if (!empty($nodes)) {
            $vat_status = (string)$nodes[0];
            break;
        }
    }
    
    // Try direct access if XPath fails
    if ($vat_status === null) {
        if (isset($xmlObj->Body->is_vat_payer_tinResponse->is_vat_payer_tinResult)) {
            $vat_status = (string)$xmlObj->Body->is_vat_payer_tinResponse->is_vat_payer_tinResult;
        }
    }
    
    // Extract TIN from request for display
    if (preg_match('/<tin>([^<]+)<\/tin>/', $xml, $matches)) {
        $tin_tested = $matches[1];
    }
    
    if ($vat_status !== null) {
        $status_text = $vat_status === 'true' ? 'VAT PAYER' : 'NOT VAT PAYER';
        $status_color = $vat_status === 'true' ? '#28a745' : '#dc3545';
        $status_icon = $vat_status === 'true' ? '✅' : '❌';
        
        echo "<div style='background:#fff; border:2px solid $status_color; border-radius:10px; padding:20px; text-align:center; margin:15px 0;'>";
        echo "<h2 style='color:$status_color; margin:0;'>$status_icon $status_text</h2>";
        if ($tin_tested) {
            echo "<p style='font-size:18px; margin:10px 0;'><strong>TIN Tested:</strong> $tin_tested</p>";
        }
        echo "<p style='font-size:16px; margin:5px 0;'><strong>Raw Response:</strong> <code>$vat_status</code></p>";
        echo "</div>";
        
        // Business logic implications
        echo "<div style='background:#d1ecf1; padding:15px; border-radius:5px; margin:15px 0;'>";
        echo "<h5>💼 Business Implications</h5>";
        if ($vat_status === 'true') {
            echo "<ul>";
            echo "<li>✅ This TIN is registered as a VAT payer</li>";
            echo "<li>✅ Can issue VAT invoices</li>";
            echo "<li>✅ Can claim VAT input tax</li>";
            echo "<li>✅ Subject to VAT reporting requirements</li>";
            echo "</ul>";
        } else {
            echo "<ul>";
            echo "<li>❌ This TIN is NOT a VAT payer</li>";
            echo "<li>❌ Cannot issue VAT invoices</li>";
            echo "<li>❌ Cannot claim VAT input tax</li>";
            echo "<li>❌ Not subject to VAT reporting</li>";
            echo "</ul>";
        }
        echo "</div>";
        
    } else {
        echo "<div style='background:#fff3cd; padding:15px; border-radius:5px; margin:15px 0;'>";
        echo "<h4>⚠️ VAT Status Not Found</h4>";
        echo "<p>Could not extract VAT payer status from the response. The API might have returned an error or unexpected format.</p>";
        echo "<p><strong>Response Preview:</strong> " . htmlspecialchars(substr($response, 0, 200)) . "...</p>";
        echo "</div>";
    }
    
    echo "</div>";
    
    echo "</details>";
}

// === Run VAT Payer API analysis ===
$targetCalls = array_keys($vatPayerRequests);

echo "<div style='background:#f0f8ff; padding:15px; border-radius:5px; margin:20px 0;'>";
echo "<h3>📈 VAT Payer API Analysis Summary</h3>";
echo "<p>This tool analyzes the <strong>is_vat_payer_tin</strong> API from RS.ge WayBill Service</p>";
echo "<p>Key features:</p>";
echo "<ul>";
echo "<li>✅ Tests company's own TIN for VAT payer status</li>";
echo "<li>✅ Tests sample TINs for comparison</li>";
echo "<li>✅ Allows custom TIN testing</li>";
echo "<li>✅ Shows detailed API request/response analysis</li>";
echo "<li>✅ Explains business implications of VAT status</li>";
echo "</ul>";
echo "</div>";

// === Test VAT Payer APIs ===
echo "<h2>💰 VAT Payer Status API Analysis</h2>";

foreach ($vatPayerRequests as $soapAction => $xml_request) {
    $url = "https://services.rs.ge/WayBillService/WayBillService.asmx";
    
    // Handle different naming for different test types
    switch ($soapAction) {
        case 'is_vat_payer_tin':
            $name = "Company TIN VAT Status Check";
            break;
        case 'is_vat_payer_tin_test':
            $name = "Sample TIN Test (12345678910)";
            break;
        case 'is_vat_payer_tin_company':
            $name = "Company TIN Test (202450640)";
            break;
        case 'custom_tin_test':
            $name = "Custom TIN Test";
            break;
        default:
            $name = ucfirst(str_replace(['is_vat_payer_tin_', '_'], ['', ' '], $soapAction));
    }
    
    echo "<div style='border:2px solid #17a2b8; border-radius:10px; margin:20px 0; padding:20px;'>";
    analyzeVatPayerApi($name, $url, $soapAction, $xml_request);
    echo "</div>";
}

// === Show final summary ===
echo "<div style='background:#d4edda; padding:15px; border-radius:5px; margin:20px 0;'>";
echo "<h3>🎯 VAT Payer Analysis Complete</h3>";
echo "<p><strong>Selected Company:</strong> <span style='color:#28a745; font-weight:bold;'>{$selectedCompany['company_name']}</span></p>";
echo "<p><strong>Company TIN:</strong> " . ($credentials['company_tin'] ?? 'Unknown') . "</p>";
echo "<p><strong>APIs Tested:</strong> " . implode(', ', $targetCalls) . "</p>";
echo "<p><strong>Total Tests:</strong> " . count($targetCalls) . "</p>";
echo "<p><strong>API Endpoint:</strong> <a href='https://services.rs.ge/WayBillService/WayBillService.asmx?op=is_vat_payer_tin' target='_blank'>RS.ge WayBill Service - is_vat_payer_tin</a></p>";
echo "<p>This analysis shows the VAT payer status for different TIN numbers using the RS.ge API.</p>";
echo "<p><em>💡 <strong>Purpose:</strong> Validate VAT payer status for business compliance and invoice processing</em></p>";
echo "<p><em>💡 <strong>Business Use:</strong> Determine if a company can issue VAT invoices or claim VAT input tax</em></p>";
echo "</div>";
?>
