<?php
/**
 * Test Status Parameter Impact
 * 
 * This page tests whether the status parameter is truly mandatory
 * by testing the same API with and without the status parameter.
 */

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

// Get credentials
$pdo = getDatabaseConnection();
$companyStmt = $pdo->prepare("SELECT ID, COMPANY_NAME, COMPANY_TIN, S_USER, S_PASSWORD, USER_ID, UN_ID FROM rs_users WHERE S_USER IS NOT NULL AND S_PASSWORD IS NOT NULL ORDER BY COMPANY_NAME");
$companyStmt->execute();
$availableCompanies = $companyStmt->fetchAll(PDO::FETCH_ASSOC);

if (empty($availableCompanies)) {
    die("❌ No companies with credentials found in rs_users table");
}

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

$user_id = $selectedCompany['USER_ID'];
$un_id = $selectedCompany['UN_ID'];

function testApiRequest($name, $xml, $description) {
    echo "<div style='border: 2px solid #007bff; border-radius: 10px; margin: 20px 0; padding: 20px;'>";
    echo "<h3>$name</h3>";
    echo "<p><strong>Description:</strong> $description</p>";
    
    // Show XML request
    echo "<div style='background: #f8f9fa; padding: 10px; border-radius: 5px; margin: 10px 0;'>";
    echo "<h5>XML Request:</h5>";
    echo "<pre style='background: #fff; padding: 10px; border: 1px solid #ccc; max-height: 200px; overflow: auto; font-size: 11px;'>";
    echo htmlspecialchars($xml);
    echo "</pre></div>";
    
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => "https://webserv.rs.ge/specinvoices/SpecInvoicesService.asmx",
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $xml,
        CURLOPT_HTTPHEADER => [
            'Content-Type: text/xml; charset=utf-8',
            'SOAPAction: "http://tempuri.org/get_buyer_invoices_r_n"'
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
    ]);
    
    $response = curl_exec($ch);
    $curl_error = curl_error($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($curl_error) {
        echo "<div style='background: #f8d7da; padding: 10px; border-radius: 5px; color: #721c24;'>";
        echo "<strong>❌ cURL Error:</strong> $curl_error";
        echo "</div>";
        echo "</div>";
        return;
    }
    
    if ($http_code !== 200) {
        echo "<div style='background: #f8d7da; padding: 10px; border-radius: 5px; color: #721c24;'>";
        echo "<strong>❌ HTTP Error:</strong> $http_code";
        echo "</div>";
        echo "</div>";
        return;
    }
    
    // Parse response
    $clean_response = $response;
    if (strpos($clean_response, "\xEF\xBB\xBF") === 0) {
        $clean_response = str_replace("\xEF\xBB\xBF", '', $clean_response);
    }
    
    $clean_response = str_replace("\x00", '', $clean_response);
    $clean_response = preg_replace('/xmlns=""/', '', $clean_response);
    
    $prefixes = ['soap:', 'diffgr:', 'msdata:'];
    foreach ($prefixes as $prefix) {
        $clean_response = str_ireplace($prefix, '', $clean_response);
    }
    
    libxml_use_internal_errors(true);
    $xmlObj = simplexml_load_string($clean_response);
    
    if ($xmlObj === false) {
        echo "<div style='background: #fff3cd; padding: 10px; border-radius: 5px; color: #856404;'>";
        echo "<strong>⚠️ XML Parse Error</strong>";
        echo "</div>";
        echo "</div>";
        return;
    }
    
    // Check for SOAP faults
    $faults = $xmlObj->xpath('//Fault');
    if (!empty($faults)) {
        echo "<div style='background: #f8d7da; padding: 10px; border-radius: 5px; color: #721c24;'>";
        echo "<strong>❌ SOAP Fault Detected:</strong><br>";
        foreach ($faults as $fault) {
            $faultString = (string)$fault->faultstring;
            $faultCode = (string)$fault->faultcode;
            echo "Code: $faultCode<br>";
            echo "Message: $faultString";
        }
        echo "</div>";
        echo "</div>";
        return;
    }
    
    // Check for data
    $resultNodes = $xmlObj->xpath('//get_buyer_invoices_r_nResult');
    if (empty($resultNodes)) {
        echo "<div style='background: #fff3cd; padding: 10px; border-radius: 5px; color: #856404;'>";
        echo "<strong>⚠️ No Result Nodes Found</strong>";
        echo "</div>";
        echo "</div>";
        return;
    }
    
    $resultNode = $resultNodes[0];
    $potentialXmlString = (string)$resultNode;
    
    // Check if there's actual data
    if (strpos(trim($potentialXmlString), '<') === 0) {
        $innerXml = simplexml_load_string($potentialXmlString);
        if ($innerXml) {
            $innerXml->registerXPathNamespace('diffgr', 'urn:schemas-microsoft-com:xml-diffgram-v1');
            $dataRecords = $innerXml->xpath('//diffgr:diffgram/*[1]/*');
            
            if (count($dataRecords) > 0) {
                echo "<div style='background: #d4edda; padding: 10px; border-radius: 5px; color: #155724;'>";
                echo "<strong>✅ SUCCESS:</strong> Found " . count($dataRecords) . " data records";
                echo "</div>";
            } else {
                echo "<div style='background: #fff3cd; padding: 10px; border-radius: 5px; color: #856404;'>";
                echo "<strong>⚠️ NO DATA:</strong> API responded successfully but returned no data records";
                echo "</div>";
            }
        }
    } else {
        echo "<div style='background: #fff3cd; padding: 10px; border-radius: 5px; color: #856404;'>";
        echo "<strong>⚠️ NO DATA:</strong> API responded but no XML data found";
        echo "</div>";
    }
    
    // Show raw response
    echo "<div style='background: #f8f9fa; padding: 10px; border-radius: 5px; margin: 10px 0;'>";
    echo "<h5>Raw Response:</h5>";
    echo "<pre style='background: #fff; padding: 10px; border: 1px solid #ccc; max-height: 300px; overflow: auto; font-size: 11px;'>";
    echo htmlspecialchars($response);
    echo "</pre></div>";
    
    echo "</div>";
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Status Parameter Test</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
<div class="container-fluid mt-4">
    <div class="row">
        <div class="col-12">
            <h1 class="mb-4">🧪 Status Parameter Impact Test</h1>
            
            <div class="alert alert-info">
                <h5>🎯 Purpose</h5>
                <p>This test compares API responses with and without the <code>status</code> parameter to determine if it's truly mandatory for data retrieval.</p>
            </div>

            <!-- Company Selection Form -->
            <form method="post" class="mb-4">
                <div class="card">
                    <div class="card-header">
                        <h5>🏢 Select Company</h5>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-6">
                                <label for="company_id" class="form-label">Company:</label>
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
                                    <strong>Selected Company:</strong><br>
                                    <?= htmlspecialchars($selectedCompany['COMPANY_NAME']) ?><br>
                                    <small>User ID: <?= htmlspecialchars($user_id) ?> | UN ID: <?= htmlspecialchars($un_id) ?></small>
                                </div>
                            </div>
                        </div>
                        <div class="mt-3">
                            <button type="submit" class="btn btn-primary">🧪 Test Status Parameter Impact</button>
                        </div>
                    </div>
                </div>
            </form>

<?php
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    echo "<h2>🔄 Running Status Parameter Tests...</h2>";
    
    // Test 1: WITH status parameter
    $withStatusRequest = '<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
    <get_buyer_invoices_r_n xmlns="http://tempuri.org/">
    <user_id>' . htmlspecialchars($user_id, ENT_XML1) . '</user_id>
    <un_id>' . htmlspecialchars($un_id, ENT_XML1) . '</un_id>
    <status>7</status>
    </get_buyer_invoices_r_n>
</soap:Body>
</soap:Envelope>';

    testApiRequest(
        "Test 1: WITH Status Parameter (status=7)",
        $withStatusRequest,
        "This test includes the status parameter set to 7 (all statuses). According to XSD schema, this should work."
    );
    
    // Test 2: WITHOUT status parameter
    $withoutStatusRequest = '<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
    <get_buyer_invoices_r_n xmlns="http://tempuri.org/">
    <user_id>' . htmlspecialchars($user_id, ENT_XML1) . '</user_id>
    <un_id>' . htmlspecialchars($un_id, ENT_XML1) . '</un_id>
    </get_buyer_invoices_r_n>
</soap:Body>
</soap:Envelope>';

    testApiRequest(
        "Test 2: WITHOUT Status Parameter",
        $withoutStatusRequest,
        "This test omits the status parameter. According to XSD schema (minOccurs='1'), this should fail or return no data."
    );
    
    // Test 3: Different status values
    $statusValues = [1, 2, 4, 3, 5, 6];
    foreach ($statusValues as $statusValue) {
        $statusRequest = '<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
    <get_buyer_invoices_r_n xmlns="http://tempuri.org/">
    <user_id>' . htmlspecialchars($user_id, ENT_XML1) . '</user_id>
    <un_id>' . htmlspecialchars($un_id, ENT_XML1) . '</un_id>
    <status>' . $statusValue . '</status>
    </get_buyer_invoices_r_n>
</soap:Body>
</soap:Envelope>';

        testApiRequest(
            "Test 3." . $statusValue . ": Status = $statusValue",
            $statusRequest,
            "Testing with status value $statusValue to see if different status values return different data."
        );
    }
    
    echo "<div class='alert alert-success mt-4'>";
    echo "<h4>✅ Status Parameter Testing Complete</h4>";
    echo "<p><strong>Company:</strong> " . htmlspecialchars($selectedCompany['COMPANY_NAME']) . "</p>";
    echo "<p><strong>Purpose:</strong> Determine if status parameter is mandatory for data retrieval</p>";
    echo "</div>";
} else {
    echo "<div class='alert alert-primary'>";
    echo "<h4>📋 Ready to Test</h4>";
    echo "<p>Click <strong>🧪 Test Status Parameter Impact</strong> to compare API responses with and without the status parameter.</p>";
    echo "</div>";
}
?>

        </div>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
