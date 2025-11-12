<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
require_once __DIR__ . '/../../functions.php';

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

// This script acts as an API endpoint.
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json; charset=utf-8');
    
    try {
        $url = "https://services.rs.ge/WayBillService/WayBillService.asmx";
        $xml_request = '<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <what_is_my_ip xmlns="http://tempuri.org/" />
  </soap:Body>
</soap:Envelope>';

        $headers = [
            "Content-type: text/xml;charset=utf-8",
            "SOAPAction: \"http://tempuri.org/what_is_my_ip\"",
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
            CURLOPT_SSL_VERIFYPEER => true, // Enforce SSL verification
            CURLOPT_SSL_VERIFYHOST => 2,
        ]);

        $response = curl_exec($ch);
        $curl_error = curl_error($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($curl_error) {
            throw new Exception("cURL Error: " . $curl_error);
        }

        // Try to parse the XML to get the IP, but also return the raw response for debugging
        $clean_xml = str_ireplace(['SOAP-ENV:', 'SOAP:'], '', $response);
        $xml_obj = simplexml_load_string($clean_xml);
        $ip_address = (string)$xml_obj->Body->what_is_my_ipResponse->what_is_my_ipResult;

        echo json_encode([
            'success' => true, 
            'http_code' => $http_code,
            'ip_address' => $ip_address,
            'raw_response' => htmlspecialchars($response)
        ]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => true, 'message' => $e->getMessage()]);
    }
    exit;
}

// Page UI
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Debug: what_is_my_ip</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
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
        <h2>Debug SOAP Function: <code>what_is_my_ip</code></h2>
        <p>This page tests the simplest function on the RS.ge Waybill service. It requires no authentication.</p>
        
        <button id="test-btn" class="btn btn-primary">Test Connection</button>
        
        <div id="response-container" class="mt-4" style="display: none;">
            <h4>Result:</h4>
            <div id="result-table"></div>
            <h5>Raw Response:</h5>
            <div class="xml-container">
                <pre id="response-content"></pre>
            </div>
        </div>
    </div>
    
<script>
document.getElementById('test-btn').addEventListener('click', function() {
    const btn = this;
    const responseContainer = document.getElementById('response-container');
    const resultTable = document.getElementById('result-table');
    const responseContent = document.getElementById('response-content');
    
    btn.disabled = true;
    btn.textContent = 'Testing...';
    responseContainer.style.display = 'none';
    
    fetch('', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(res => res.json())
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
            resultTable.innerHTML = `
                <div class="alert alert-success">
                    <strong>Your IP Address:</strong> ${data.ip_address || 'Could not parse IP'}
                    <br><strong>HTTP Status:</strong> ${data.http_code}
                </div>`;
        } else {
            resultTable.innerHTML = `<div class="alert alert-danger">Error: ${data.message}</div>`;
        }
    })
    .catch(error => {
        responseContainer.style.display = 'block';
        resultTable.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
    })
    .finally(() => {
        btn.disabled = false;
        btn.textContent = 'Test Connection';
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