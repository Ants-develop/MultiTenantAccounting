<?php
/**
 * Check Spec Users API Testing
 * 
 * This page tests the check_spec_users API to validate company credentials.
 * Based on: https://webserv.rs.ge/specinvoices/SpecInvoicesService.asmx?op=check_spec_users
 * 
 * @author System Administrator
 * @version 1.0
 * @since 2024-01-01
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
$companyStmt = $pdo->prepare("
    SELECT 
        ID, 
        COMPANY_NAME, 
        COMPANY_TIN, 
        S_USER, 
        S_PASSWORD, 
        USER_ID, 
        UN_ID
    FROM rs_users 
    WHERE S_USER IS NOT NULL AND S_PASSWORD IS NOT NULL 
    ORDER BY COMPANY_NAME
");
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
$s_user = $selectedCompany['S_USER'];
$s_password = $selectedCompany['S_PASSWORD'];

function testCheckSpecUsers($name, $user_id, $su, $sp, $description) {
    echo "<div style='border: 2px solid #007bff; border-radius: 10px; margin: 20px 0; padding: 20px;'>";
    echo "<h3>$name</h3>";
    echo "<p><strong>Description:</strong> $description</p>";
    
    // Show parameters
    echo "<div style='background: #e7f3ff; padding: 10px; border-radius: 5px; margin: 10px 0;'>";
    echo "<h5>Parameters:</h5>";
    echo "<ul>";
    echo "<li><strong>user_id:</strong> " . htmlspecialchars($user_id) . "</li>";
    echo "<li><strong>su:</strong> " . htmlspecialchars($su) . "</li>";
    echo "<li><strong>sp:</strong> " . str_repeat('*', strlen($sp)) . " (hidden)</li>";
    echo "</ul>";
    echo "</div>";
    
    // Create SOAP request
    $xml = '<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
    <check_spec_users xmlns="http://tempuri.org/">
    <user_id>' . htmlspecialchars($user_id, ENT_XML1) . '</user_id>
    <su>' . htmlspecialchars($su, ENT_XML1) . '</su>
    <sp>' . htmlspecialchars($sp, ENT_XML1) . '</sp>
    </check_spec_users>
</soap:Body>
</soap:Envelope>';
    
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
            'SOAPAction: "http://tempuri.org/check_spec_users"'
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
    ]);
    
    $response = curl_exec($ch);
    $curl_error = curl_error($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $content_type = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    $response_size = curl_getinfo($ch, CURLINFO_SIZE_DOWNLOAD);
    curl_close($ch);
    
    // Show response info
    echo "<div style='background: #e7f3ff; padding: 10px; border-radius: 5px; margin: 10px 0;'>";
    echo "<p><strong>HTTP Code:</strong> $http_code</p>";
    echo "<p><strong>Content Type:</strong> $content_type</p>";
    echo "<p><strong>Response Size:</strong> " . number_format($response_size) . " bytes</p>";
    if ($curl_error) {
        echo "<p><strong>cURL Error:</strong> $curl_error</p>";
    }
    echo "</div>";
    
    if ($curl_error) {
        echo "<div style='background: #f8d7da; padding: 10px; border-radius: 5px; color: #721c24;'>";
        echo "<strong>❌ cURL Error:</strong> $curl_error";
        echo "</div>";
        echo "</div>";
        return false;
    }
    
    if ($http_code !== 200) {
        echo "<div style='background: #f8d7da; padding: 10px; border-radius: 5px; color: #721c24;'>";
        echo "<strong>❌ HTTP Error:</strong> $http_code";
        echo "</div>";
        echo "</div>";
        return false;
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
        $libxml_errors = libxml_get_errors();
        foreach ($libxml_errors as $error) {
            echo "<p>Error (Line {$error->line}): " . htmlspecialchars(trim($error->message)) . "</p>";
        }
        libxml_clear_errors();
        echo "</div>";
        echo "</div>";
        return false;
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
        return false;
    }
    
    // Check for result with multiple XPath patterns
    $resultNodes = [];
    $xpathPatterns = [
        '//check_spec_usersResult',
        '//*[local-name()="check_spec_usersResult"]',
        '//*[contains(local-name(), "Result")]',
        '//*[contains(local-name(), "check_spec_users")]'
    ];
    
    foreach ($xpathPatterns as $pattern) {
        $nodes = $xmlObj->xpath($pattern);
        if (!empty($nodes)) {
            $resultNodes = $nodes;
            break;
        }
    }
    
    if (empty($resultNodes)) {
        echo "<div style='background: #fff3cd; padding: 10px; border-radius: 5px; color: #856404;'>";
        echo "<strong>⚠️ No Result Found</strong><br>";
        echo "Tried XPath patterns: " . implode(', ', $xpathPatterns) . "<br>";
        echo "This might indicate an issue with the API response structure.";
        echo "</div>";
        
        // Show raw response for debugging
        echo "<div style='background: #f8f9fa; padding: 10px; border-radius: 5px; margin: 10px 0;'>";
        echo "<h5>Raw XML Response (for debugging):</h5>";
        echo "<pre style='background: #fff; padding: 10px; border: 1px solid #ccc; max-height: 300px; overflow: auto; font-size: 11px; white-space: pre-wrap; word-wrap: break-word;'>";
        echo htmlspecialchars($response);
        echo "</pre></div>";
        
        echo "</div>";
        return false;
    }
    
    $result = (string)$resultNodes[0];
    $isValid = strtolower($result) === 'true';
    
    if ($isValid) {
        echo "<div style='background: #d4edda; padding: 10px; border-radius: 5px; color: #155724;'>";
        echo "<strong>✅ SUCCESS:</strong> Credentials are VALID<br>";
        echo "<strong>Result:</strong> $result (boolean true)";
        echo "</div>";
    } else {
        echo "<div style='background: #f8d7da; padding: 10px; border-radius: 5px; color: #721c24;'>";
        echo "<strong>❌ FAILED:</strong> Credentials are INVALID<br>";
        echo "<strong>Result:</strong> $result (boolean false)";
        echo "</div>";
    }
    
    // Show raw response
    echo "<div style='background: #f8f9fa; padding: 10px; border-radius: 5px; margin: 10px 0;'>";
    echo "<h5>Raw XML Response:</h5>";
    echo "<div style='margin-bottom: 10px;'>";
    echo "<button type='button' class='btn btn-sm btn-outline-primary' onclick='copyToClipboard(\"response_" . uniqid() . "\")'>📋 Copy to Clipboard</button>";
    echo "<button type='button' class='btn btn-sm btn-outline-secondary' onclick='toggleRawResponse(\"response_" . uniqid() . "\")'>👁️ Toggle View</button>";
    echo "</div>";
    echo "<textarea id='response_" . uniqid() . "' readonly style='width: 100%; height: 200px; font-family: monospace; font-size: 11px; background: #fff; border: 1px solid #ccc; padding: 10px; resize: vertical;'>";
    echo htmlspecialchars($response);
    echo "</textarea>";
    echo "</div>";
    
    // Show formatted response for better readability
    if ($xmlObj !== false) {
        echo "<div style='background: #e7f3ff; padding: 10px; border-radius: 5px; margin: 10px 0;'>";
        echo "<h5>Formatted Response Analysis:</h5>";
        
        // Show SOAP envelope structure
        echo "<p><strong>SOAP Envelope:</strong> " . $xmlObj->getName() . "</p>";
        
        // Show all elements found in the XML
        echo "<p><strong>All Elements Found:</strong></p>";
        $allElements = $xmlObj->xpath('//*');
        $elementNames = array_unique(array_map(function($el) { return $el->getName(); }, $allElements));
        echo "<code>" . implode(', ', $elementNames) . "</code><br><br>";
        
        // Show body
        $body = $xmlObj->xpath('//Body')[0] ?? null;
        if ($body) {
            echo "<p><strong>SOAP Body:</strong> " . $body->getName() . "</p>";
            
            // Show response element
            $responseElement = $body->xpath('//check_spec_usersResponse')[0] ?? null;
            if ($responseElement) {
                echo "<p><strong>Response Element:</strong> " . $responseElement->getName() . "</p>";
                
                // Show result
                $resultElement = $responseElement->xpath('//check_spec_usersResult')[0] ?? null;
                if ($resultElement) {
                    $resultValue = (string)$resultElement;
                    echo "<p><strong>Result Value:</strong> <code>$resultValue</code> (" . gettype($resultValue) . ")</p>";
                } else {
                    echo "<p><strong>Result Element:</strong> Not found in response</p>";
                }
            } else {
                echo "<p><strong>Response Element:</strong> check_spec_usersResponse not found</p>";
            }
        }
        
        // Show any faults
        $faults = $xmlObj->xpath('//Fault');
        if (!empty($faults)) {
            echo "<p><strong>SOAP Faults Found:</strong> " . count($faults) . "</p>";
            foreach ($faults as $i => $fault) {
                $faultCode = (string)$fault->faultcode;
                $faultString = (string)$fault->faultstring;
                echo "<p><strong>Fault " . ($i + 1) . ":</strong> Code: <code>$faultCode</code>, Message: <code>$faultString</code></p>";
            }
        }
        
        echo "</div>";
    }
    
    echo "</div>";
    return $isValid;
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Check Spec Users API Testing</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
<div class="container-fluid mt-4">
    <div class="row">
        <div class="col-12">
            <h1 class="mb-4">🔐 Check Spec Users API Testing</h1>
            
            <div class="alert alert-info">
                <h5>🎯 Purpose</h5>
                <p>This page tests the <code>check_spec_users</code> API to validate company credentials. Based on the <a href="https://webserv.rs.ge/specinvoices/SpecInvoicesService.asmx?op=check_spec_users" target="_blank">official RS.ge documentation</a>.</p>
                <p><strong>API Parameters:</strong> user_id (MANDATORY), su (optional), sp (optional)</p>
                <p><strong>Returns:</strong> boolean (true if credentials are valid, false if invalid)</p>
                <div class="alert alert-warning mt-2">
                    <strong>⚠️ Important:</strong> According to XSD schema, only <code>user_id</code> is mandatory. The <code>su</code> and <code>sp</code> parameters are optional!
                </div>
            </div>

            <!-- Company Selection Form -->
            <form method="post" class="mb-4">
                <div class="card">
                    <div class="card-header">
                        <h5>🏢 Select Company to Test</h5>
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
                                    <small>
                                        User ID: <?= htmlspecialchars($user_id) ?><br>
                                        UN ID: <?= htmlspecialchars($un_id) ?><br>
                                        Service User: <?= htmlspecialchars($s_user) ?>
                                    </small>
                                </div>
                            </div>
                        </div>
                        <div class="mt-3">
                            <button type="submit" class="btn btn-primary">🔐 Test Credentials</button>
                        </div>
                    </div>
                </div>
            </form>

<?php
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    echo "<h2>🔄 Testing Credentials...</h2>";
    
    $validCredentials = 0;
    $totalTests = 0;
    
    // Test 1: Only mandatory user_id (no su/sp)
    $totalTests++;
    $isValid = testCheckSpecUsers(
        "Test 1: Only USER_ID (Mandatory Parameter)",
        $user_id,
        "", // Empty su
        "", // Empty sp
        "Testing with only the mandatory user_id parameter (no su/sp). According to XSD schema, su and sp are optional."
    );
    if ($isValid) $validCredentials++;
    
    // Test 2: Current company credentials (all parameters)
    $totalTests++;
    $isValid = testCheckSpecUsers(
        "Test 2: All Parameters (user_id, su, sp)",
        $user_id,
        $s_user,
        $s_password,
        "Testing with all parameters (user_id, su, sp)."
    );
    if ($isValid) $validCredentials++;
    
    // Test 3: Test with wrong user_id
    $totalTests++;
    $wrongUserId = $user_id + 1; // Try next user_id
    testCheckSpecUsers(
        "Test 3: Wrong USER_ID",
        $wrongUserId,
        $s_user,
        $s_password,
        "Testing with wrong user_id to verify the API properly validates credentials."
    );
    
    // Test 4: Test with wrong service username
    $totalTests++;
    $wrongSu = $s_user . "_wrong";
    testCheckSpecUsers(
        "Test 4: Wrong Service Username (su)",
        $user_id,
        $wrongSu,
        $s_password,
        "Testing with wrong service username to verify the API properly validates credentials."
    );
    
    // Test 5: Test with wrong service password
    $totalTests++;
    $wrongSp = $s_password . "_wrong";
    testCheckSpecUsers(
        "Test 5: Wrong Service Password (sp)",
        $user_id,
        $s_user,
        $wrongSp,
        "Testing with wrong service password to verify the API properly validates credentials."
    );
    
    // Test 5: Test all companies
    echo "<div style='border: 2px solid #28a745; border-radius: 10px; margin: 20px 0; padding: 20px;'>";
    echo "<h3>📊 Test All Companies</h3>";
    echo "<p>Testing credentials for all companies in the database:</p>";
    
    $allValid = 0;
    $allTotal = 0;
    
    foreach ($availableCompanies as $company) {
        $allTotal++;
        $companyUserId = $company['USER_ID'];
        $companySu = $company['S_USER'];
        $companySp = $company['S_PASSWORD'];
        
        echo "<div style='margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 5px;'>";
        echo "<h6>" . htmlspecialchars($company['COMPANY_NAME']) . "</h6>";
        
        if (!$companyUserId || !$companySu || !$companySp) {
            echo "<span class='badge bg-warning'>⚠️ Missing Credentials</span>";
            continue;
        }
        
        // Quick test for this company
        $xml = '<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
    <check_spec_users xmlns="http://tempuri.org/">
    <user_id>' . htmlspecialchars($companyUserId, ENT_XML1) . '</user_id>
    <su>' . htmlspecialchars($companySu, ENT_XML1) . '</su>
    <sp>' . htmlspecialchars($companySp, ENT_XML1) . '</sp>
    </check_spec_users>
</soap:Body>
</soap:Envelope>';

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => "https://webserv.rs.ge/specinvoices/SpecInvoicesService.asmx",
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $xml,
            CURLOPT_HTTPHEADER => [
                'Content-Type: text/xml; charset=utf-8',
                'SOAPAction: "http://tempuri.org/check_spec_users"'
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10,
        ]);
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($http_code === 200) {
            $clean_response = $response;
            if (strpos($clean_response, "\xEF\xBB\xBF") === 0) {
                $clean_response = str_replace("\xEF\xBB\xBF", '', $clean_response);
            }
            
            libxml_use_internal_errors(true);
            $xmlObj = simplexml_load_string($clean_response);
            
            if ($xmlObj !== false) {
                $faults = $xmlObj->xpath('//Fault');
                if (empty($faults)) {
                    $resultNodes = $xmlObj->xpath('//check_spec_usersResult');
                    if (!empty($resultNodes)) {
                        $result = (string)$resultNodes[0];
                        $isValid = strtolower($result) === 'true';
                        
                        if ($isValid) {
                            echo "<span class='badge bg-success'>✅ Valid</span>";
                            $allValid++;
                        } else {
                            echo "<span class='badge bg-danger'>❌ Invalid</span>";
                        }
                        
                        // Show raw response for this company
                        echo "<div style='margin-top: 5px;'>";
                        echo "<details>";
                        echo "<summary style='cursor: pointer; font-size: 12px; color: #666;'>View Raw Response</summary>";
                        echo "<div style='margin-top: 5px;'>";
                        echo "<button type='button' class='btn btn-sm btn-outline-primary' onclick='copyToClipboard(\"company_response_" . $allTotal . "\")'>📋 Copy</button>";
                        echo "<textarea id='company_response_" . $allTotal . "' readonly style='width: 100%; height: 150px; font-family: monospace; font-size: 10px; background: #f8f9fa; border: 1px solid #ddd; padding: 5px; margin-top: 5px; resize: vertical;'>";
                        echo htmlspecialchars($response);
                        echo "</textarea>";
                        echo "</div>";
                        echo "</details>";
                        echo "</div>";
                    } else {
                        echo "<span class='badge bg-warning'>⚠️ No Result</span>";
                    }
                } else {
                    echo "<span class='badge bg-danger'>❌ SOAP Fault</span>";
                }
            } else {
                echo "<span class='badge bg-warning'>⚠️ Parse Error</span>";
            }
        } else {
            echo "<span class='badge bg-danger'>❌ HTTP $http_code</span>";
        }
        
        echo "</div>";
    }
    
    echo "<div style='background: #e7f3ff; padding: 10px; border-radius: 5px; margin: 10px 0;'>";
    echo "<h6>Summary:</h6>";
    echo "<p><strong>Valid Companies:</strong> $allValid / $allTotal</p>";
    echo "<p><strong>Success Rate:</strong> " . round(($allValid / $allTotal) * 100, 1) . "%</p>";
    echo "</div>";
    
    echo "</div>";
    
    echo "<div class='alert alert-success mt-4'>";
    echo "<h4>✅ Credential Testing Complete</h4>";
    echo "<p><strong>Company:</strong> " . htmlspecialchars($selectedCompany['COMPANY_NAME']) . "</p>";
    echo "<p><strong>Valid Credentials:</strong> $validCredentials / $totalTests</p>";
    echo "<p><strong>Purpose:</strong> Validate company credentials using check_spec_users API</p>";
    echo "</div>";
} else {
    echo "<div class='alert alert-primary'>";
    echo "<h4>📋 Ready to Test</h4>";
    echo "<p>Click <strong>🔐 Test Credentials</strong> to validate the selected company's credentials using the check_spec_users API.</p>";
    echo "<p><strong>This will help identify if the issue with data fetching is due to invalid credentials.</strong></p>";
    echo "</div>";
}
?>

        </div>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
<script>
function copyToClipboard(textareaId) {
    const textarea = document.getElementById(textareaId);
    if (textarea) {
        textarea.select();
        textarea.setSelectionRange(0, 99999); // For mobile devices
        try {
            document.execCommand('copy');
            // Show success feedback
            const button = event.target;
            const originalText = button.innerHTML;
            button.innerHTML = '✅ Copied!';
            button.classList.remove('btn-outline-primary');
            button.classList.add('btn-success');
            setTimeout(() => {
                button.innerHTML = originalText;
                button.classList.remove('btn-success');
                button.classList.add('btn-outline-primary');
            }, 2000);
        } catch (err) {
            console.error('Failed to copy: ', err);
            alert('Failed to copy to clipboard');
        }
    }
}

function toggleRawResponse(textareaId) {
    const textarea = document.getElementById(textareaId);
    if (textarea) {
        if (textarea.style.height === '200px') {
            textarea.style.height = '50px';
        } else {
            textarea.style.height = '200px';
        }
    }
}

// Auto-expand all textareas on page load
document.addEventListener('DOMContentLoaded', function() {
    const textareas = document.querySelectorAll('textarea[readonly]');
    textareas.forEach(textarea => {
        // Auto-resize based on content
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 300) + 'px';
    });
});
</script>
</body>
</html>
