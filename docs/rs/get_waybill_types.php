<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
require_once __DIR__ . '/../../functions.php';
require_once __DIR__ . '/../../backend/database.php';

// Admin-only access
if (!isAdmin()) {
    // For API requests, return a JSON error
    if (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest') {
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

        $xml_request = '<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <get_waybill_types xmlns="http://tempuri.org/">
      <su>' . htmlspecialchars($user, ENT_XML1) . '</su>
      <sp>' . htmlspecialchars($password, ENT_XML1) . '</sp>
    </get_waybill_types>
  </soap:Body>
</soap:Envelope>';

        $headers = [
            "Content-type: text/xml;charset=utf-8",
            "SOAPAction: \"http://tempuri.org/get_waybill_types\"",
            "Content-length: " . strlen($xml_request),
        ];

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $xml_request,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ]);

        $response = curl_exec($ch);
        $curl_error = curl_error($ch);
        curl_close($ch);

        if ($curl_error) {
            throw new Exception("cURL Error: " . $curl_error);
        }

        $clean_xml = str_ireplace(['SOAP-ENV:', 'SOAP:'], '', $response);
        $xml_obj = simplexml_load_string($clean_xml);
        
        $resultNode = $xml_obj->Body->get_waybill_typesResponse->get_waybill_typesResult;
        
        $types = [];
        if (isset($resultNode->WAYBILL_TYPES->WAYBILL_TYPE)) {
            foreach ($resultNode->WAYBILL_TYPES->WAYBILL_TYPE as $type) {
                $types[] = [
                    'ID' => (string)$type->ID,
                    'NAME' => (string)$type->NAME,
                ];
            }
        }

        echo json_encode([
            'success' => true,
            'types' => $types,
            'raw_response' => htmlspecialchars($response)
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
    <title>Debug: get_waybill_types</title>
    <style>
        body { padding-top: 56px; }
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
            word-break: break-all;
        }
        .xml-tag { color: #0969da; }
        .xml-attr-name { color: #e36209; }
        .xml-attr-value { color: #032f62; }
        .xml-text { color: #24292e; }
        .xml-comment { color: #6a737d; font-style: italic; }
        .xml-cdata { color: #032f62; background-color: #f6f8fa; }
    </style>
</head>
<body>
    <?php include '../../menu.php'; ?>
    <div class="container mt-4">
        <h2>Debug SOAP Function: <code>get_waybill_types</code></h2>
        <p>This page tests the <code>get_waybill_types</code> function. It returns a list of waybill types.</p>
        
        <form id="debug-form">
            <div class="form-group">
                <label for="company">Select Company (for Auth)</label>
                <select id="company" class="form-control">
                    <option value="">-- Select --</option>
                    <?php foreach ($companies as $company): ?>
                        <option value="<?= htmlspecialchars($company) ?>"><?= htmlspecialchars($company) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <button type="submit" id="test-btn" class="btn btn-primary">Get Waybill Types</button>
        </form>
        
        <div id="response-container" class="mt-4" style="display: none;">
            <h4>Result:</h4>
            <div id="result-table"></div>
            <h5 class="mt-3">Raw Response:</h5>
            <div class="xml-container">
                <pre id="response-content"></pre>
            </div>
        </div>
    </div>

<script>
document.getElementById('debug-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const btn = document.getElementById('test-btn');
    const company = document.getElementById('company').value;
    const responseContainer = document.getElementById('response-container');
    const resultTable = document.getElementById('result-table');
    const responseContent = document.getElementById('response-content');

    if (!company) {
        alert('Please select a company.');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Fetching...';
    responseContainer.style.display = 'none';
    resultTable.innerHTML = '';

    fetch('', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: company })
    })
    .then(res => {
        if (!res.ok) { return res.json().then(err => { throw new Error(err.message || `Server error ${res.status}`) }); }
        return res.json();
    })
    .then(data => {
        responseContainer.style.display = 'block';
        
        // Format XML for display
        if (data.raw_response) {
            try {
                const formatted = formatXML(data.raw_response);
                responseContent.innerHTML = formatted;
            } catch (e) {
                // If formatting fails, show plain text
                responseContent.textContent = data.raw_response;
            }
        }

        if (data.success) {
            let table = '<table class="table table-bordered table-sm"><thead><tr><th>ID</th><th>Name</th></tr></thead><tbody>';
            if(data.types.length > 0) {
                data.types.forEach(type => {
                    table += `<tr><td>${type.ID}</td><td>${type.NAME}</td></tr>`;
                });
            } else {
                table += '<tr><td colspan="2">No waybill types found.</td></tr>';
            }
            table += '</tbody></table>';
            resultTable.innerHTML = table;
        } else {
            resultTable.innerHTML = `<div class="alert alert-danger">Error: ${data.message}</div>`;
        }
    })
    .catch(error => {
        responseContainer.style.display = 'block';
        responseContent.textContent = '';
        resultTable.innerHTML = `<div class="alert alert-danger">FATAL ERROR: ${error.message}</div>`;
    })
    .finally(() => {
        btn.disabled = false;
        btn.textContent = 'Get Waybill Types';
    });
});

function formatXML(xml) {
    // Basic XML syntax highlighting
    let formatted = xml
        // Escape HTML entities first
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        // Highlight XML declaration
        .replace(/(&lt;\?xml.*?\?&gt;)/g, '<span class="xml-comment">$1</span>')
        // Highlight comments
        .replace(/(&lt;!--.*?--&gt;)/g, '<span class="xml-comment">$1</span>')
        // Highlight CDATA sections
        .replace(/(&lt;!\[CDATA\[.*?\]\]&gt;)/g, '<span class="xml-cdata">$1</span>')
        // Highlight tags and attributes
        .replace(/(&lt;\/?)([^&\s]+?)(\s|&gt;)/g, function(match, p1, p2, p3) {
            return '<span class="xml-tag">' + p1 + p2 + '</span>' + p3;
        })
        // Highlight attribute names and values
        .replace(/(\w+)=("[^"]*")/g, '<span class="xml-attr-name">$1</span>=<span class="xml-attr-value">$2</span>');
    
    // Add proper indentation
    let indent = 0;
    const lines = formatted.split('\n');
    const formattedLines = lines.map(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('&lt;/')) {
            indent = Math.max(0, indent - 2);
        }
        const indented = ' '.repeat(indent) + trimmed;
        if (trimmed.startsWith('&lt;') && !trimmed.startsWith('&lt;/') && !trimmed.startsWith('&lt;?') && !trimmed.endsWith('/&gt;')) {
            indent += 2;
        }
        return indented;
    });
    
    return formattedLines.join('\n');
}
</script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html> 