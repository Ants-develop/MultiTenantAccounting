<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
require_once __DIR__ . '/../../functions.php';
require_once __DIR__ . '/../../backend/database.php';

// Admin-only access
if (!isAdmin()) {
    // For API requests, return a JSON error
    if (!empty($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) == 'xmlhttprequest') {
        header('Content-Type: application/json');
        http_response_code(403);
        echo json_encode(['error' => true, 'message' => 'Access denied.']);
        exit;
    }
    // For direct access, redirect to a safe page
    header('Location: ../../dashboard.php?error=access_denied');
    exit;
}

// This script acts as an API endpoint
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json; charset=utf-8');
    
    try {
        $postData = json_decode(file_get_contents('php://input'), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('Invalid JSON input', 400);
        }
        
        $company = $postData['company'] ?? '';

        if (empty($company)) {
            throw new Exception("Please select a company.", 400);
        }

        $pdo = getDatabaseConnection();
        $stmt = $pdo->prepare("SELECT s_user, s_password FROM rs_users WHERE company_name = :company_name");
        $stmt->execute(['company_name' => $company]);
        $credentials = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$credentials) {
            throw new Exception("Credentials not found for the selected company.", 404);
        }

        $user = $credentials['s_user'];
        $password = $credentials['s_password'];
        $url = "https://services.rs.ge/WayBillService/WayBillService.asmx";
        $soapFunction = 'chek_service_user';

        $xml_request = '<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <' . $soapFunction . ' xmlns="http://tempuri.org/">
      <su>' . htmlspecialchars($user, ENT_XML1) . '</su>
      <sp>' . htmlspecialchars($password, ENT_XML1) . '</sp>
    </' . $soapFunction . '>
  </soap:Body>
</soap:Envelope>';

        $headers = [
            "Content-type: text/xml;charset=utf-8",
            "SOAPAction: \"http://tempuri.org/" . $soapFunction . "\"",
            "Content-length: " . strlen($xml_request),
        ];

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $xml_request,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 15,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ]);

        $response = curl_exec($ch);
        $curl_error = curl_error($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $error_message = '';
        $result_data = [];

        if ($curl_error) {
            $error_message = "cURL Error: " . $curl_error;
        } else {
            $clean_xml = str_ireplace(['SOAP-ENV:', 'SOAP:'], '', $response);
            $xml_obj = simplexml_load_string($clean_xml);
            
            if ($xml_obj === false) {
                $error_message = "Failed to parse XML response.";
            } else {
                $response_data = $xml_obj->Body->{$soapFunction . 'Response'};
                $result_data = [
                    'chek_service_userResult' => (string)$response_data->chek_service_userResult,
                    'un_id' => (string)$response_data->un_id,
                    's_user_id' => (string)$response_data->s_user_id,
                ];
                // RS.ge uses the main result field to return error codes as negative numbers
                if (isset($result_data['chek_service_userResult']) && (int)$result_data['chek_service_userResult'] < 0) {
                     $error_message = 'RS.ge Error Code: ' . $result_data['chek_service_userResult'];
                }
            }
        }
        
        echo json_encode([
            'success' => true, 
            'request_info' => [
                'function' => $soapFunction,
                'user' => $user
            ],
            'result' => [
                'error_message' => $error_message,
                'http_code' => $http_code,
                'data' => $result_data,
                'raw_request' => $xml_request,
                'raw_response' => $response
            ]
        ]);

    } catch (Exception $e) {
        $code = is_int($e->getCode()) && $e->getCode() >= 400 ? $e->getCode() : 500;
        http_response_code($code);
        echo json_encode(['error' => true, 'message' => $e->getMessage()]);
    }
    exit;
}

// Page UI
$companies = [];
try {
    $pdo = getDatabaseConnection();
    $stmt = $pdo->query("SELECT DISTINCT company_name FROM rs_users ORDER BY company_name");
    $companies = $stmt->fetchAll(PDO::FETCH_COLUMN);
} catch (Exception $e) {
    error_log("Error fetching companies for debug page: " . $e->getMessage());
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Debug: chek_service_user</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body { padding-top: 5rem; }
        .xml-container {
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 0.25rem;
            padding: 1rem;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            font-size: 0.875rem;
            overflow-x: auto;
            max-height: 600px;
            overflow-y: auto;
        }
        .xml-container pre {
            margin: 0;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
    </style>
</head>
<body>
    <?php include '../../menu.php'; ?>
    <div class="container mt-4">
        <h2>Debug SOAP Function: <code>chek_service_user</code></h2>
        <p>This page tests user authentication against the RS.ge service. Select a company to use its stored credentials.</p>
        
        <form id="debug-form">
            <div class="row">
                <div class="col-md-6">
                     <div class="mb-3">
                        <label for="company" class="form-label">Company</label>
                        <select id="company" class="form-select">
                            <option value="">-- Select Company --</option>
                            <?php foreach ($companies as $company): ?>
                                <option value="<?= htmlspecialchars($company) ?>"><?= htmlspecialchars($company) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                </div>
            </div>
            <button type="submit" id="test-btn" class="btn btn-primary">Check Credentials</button>
        </form>
        
        <div id="response-container" class="mt-4" style="display: none;">
            <h4>Result:</h4>
            <div id="result-summary"></div>
            
            <div id="details-container" class="mt-3"></div>
        </div>
    </div>

<script>
document.getElementById('debug-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const btn = document.getElementById('test-btn');
    const company = document.getElementById('company').value;
    
    if (!company) {
        alert('Please select a company.');
        return;
    }
    
    const responseContainer = document.getElementById('response-container');
    const resultSummary = document.getElementById('result-summary');
    const detailsContainer = document.getElementById('details-container');

    btn.disabled = true;
    btn.textContent = 'Testing...';
    responseContainer.style.display = 'none';

    fetch('', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ company: company })
    })
    .then(res => {
        if (!res.ok) {
            return res.json().then(err => { throw new Error(err.message || `Server error ${res.status}`) });
        }
        return res.json();
    })
    .then(data => {
        responseContainer.style.display = 'block';

        if (data.error) {
            resultSummary.innerHTML = `<div class="alert alert-danger">Error: ${data.message}</div>`;
            return;
        }

        const result = data.result;
        let hasErrors = result.error_message || result.http_code !== 200;
        let alertClass = hasErrors ? 'alert-warning' : 'alert-success';
        
        let resultHtml = `
            <h5>Request Details:</h5>
            <ul>
                <li><strong>Function Called:</strong> ${data.request_info.function}</li>
                <li><strong>User:</strong> ${data.request_info.user}</li>
                <li><strong>HTTP Status:</strong> ${result.http_code}</li>
                ${result.error_message ? `<li><strong>Error:</strong> ${result.error_message}</li>` : ''}
            </ul>`;

        if (!hasErrors) {
            resultHtml += `
            <h5>Parsed Data:</h5>
            <ul>
                <li><strong>Result:</strong> ${result.data.chek_service_userResult}</li>
                <li><strong>un_id:</strong> ${result.data.un_id}</li>
                <li><strong>s_user_id:</strong> ${result.data.s_user_id}</li>
            </ul>`;
        }

        resultSummary.innerHTML = `<div class="alert ${alertClass}">${resultHtml}</div>`;
        
        detailsContainer.innerHTML = `
            <h5 class="mt-3">Raw Request:</h5>
            <div class="xml-container"><pre>${escapeHtml(result.raw_request)}</pre></div>
            <h5 class="mt-3">Raw Response:</h5>
            <div class="xml-container"><pre>${escapeHtml(result.raw_response)}</pre></div>
        `;
    })
    .catch(error => {
        responseContainer.style.display = 'block';
        resultSummary.innerHTML = `<div class="alert alert-danger"><strong>Fatal Error:</strong> ${error.message}</div>`;
    })
    .finally(() => {
        btn.disabled = false;
        btn.textContent = 'Check Credentials';
    });
});

function escapeHtml(text) {
    if (!text) return '';
    var map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}
</script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>