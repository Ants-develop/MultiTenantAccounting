<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
require_once __DIR__ . '/../../functions.php';
require_once __DIR__ . '/../../backend/database.php';

// Admin-only access
if (!isAdmin()) {
    if (!empty($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) == 'xmlhttprequest') {
        header('Content-Type: application/json');
        http_response_code(403);
        echo json_encode(['error' => true, 'message' => 'Access denied.']);
        exit;
    }
    header('Location: ../../dashboard.php?error=access_denied');
    exit;
}

// Handle the AJAX request
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json; charset=utf-8');
    
    try {
        $postData = json_decode(file_get_contents('php://input'), true);
        $company = $postData['company'] ?? '';
        $dateStart = $postData['date_start'] ?? '';
        $dateEnd = $postData['date_end'] ?? '';

        if (empty($company) || empty($dateStart) || empty($dateEnd)) {
            throw new Exception("Company and date range are required.", 400);
        }

        $pdo = getDatabaseConnection();
        // Assuming rs_users table has the necessary credential fields
        $stmt = $pdo->prepare("SELECT s_user, s_password, un_id FROM rs_users WHERE company_name = :company_name");
        $stmt->execute(['company_name' => $company]);
        $credentials = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$credentials || empty($credentials['s_user']) || empty($credentials['s_password']) || empty($credentials['un_id'])) {
            // Check Companies table as a fallback
            $stmt = $pdo->prepare("SELECT rs_su as s_user, rs_sp as s_password, rs_un_id as un_id FROM Companies WHERE CompanyName = :company_name");
            $stmt->execute(['company_name' => $company]);
            $credentials = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$credentials || empty($credentials['s_user']) || empty($credentials['s_password']) || empty($credentials['un_id'])) {
                throw new Exception("Complete credentials (su, sp, un_id) not found for the selected company in either rs_users or Companies table.", 404);
            }
        }

        $su = $credentials['s_user'];
        $sp = $credentials['s_password'];
        $un_id = $credentials['un_id'];
        
        $url = "https://www.revenue.mof.ge/ntosservice/ntosservice.asmx";
        $soapFunction = 'get_user_invoices';

        $startDate = new DateTime($dateStart);
        $endDate = new DateTime($dateEnd . ' 23:59:59');
        
        $last_update_date_s = $startDate->format('Y-m-d\TH:i:s');
        $last_update_date_e = $endDate->format('Y-m-d\TH:i:s');

        // Build XML request
        $xml_request = '<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <' . $soapFunction . ' xmlns="http://tempuri.org/">
      <last_update_date_s>' . $last_update_date_s . '</last_update_date_s>
      <last_update_date_e>' . $last_update_date_e . '</last_update_date_e>
      <su>' . htmlspecialchars($su, ENT_XML1) . '</su>
      <sp>' . htmlspecialchars($sp, ENT_XML1) . '</sp>
      <un_id>' . $un_id . '</un_id>
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
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ]);

        $response = curl_exec($ch);
        $curl_error = curl_error($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $invoices_data = [];
        $totalInvoices = 0;
        $error_message = '';

        if ($curl_error) {
            $error_message = "cURL Error: " . $curl_error;
        } else {
            // Hacky way to remove multiple namespaces for easier parsing with SimpleXML
            $clean_xml_str = str_ireplace(['SOAP-ENV:', 'SOAP:', 'diffgr:', 'msdata:'], '', $response);
            $xml = @simplexml_load_string($clean_xml_str);

            if ($xml !== false) {
                $resultNode = $xml->Body->get_user_invoicesResponse->get_user_invoicesResult;
                
                // Check for a specific error message within the diffgram structure
                if (isset($resultNode->diffgram->DocumentElement->invoices->Error)) {
                    $error_message = "RS API Error: " . (string)$resultNode->diffgram->DocumentElement->invoices->Error;
                } 
                // Check for the parent 'invoices' node which would contain the list
                else if (isset($resultNode->diffgram->DocumentElement->invoices)) {
                    foreach ($resultNode->diffgram->DocumentElement->invoices as $invoice) {
                        // An empty <invoices/> tag can exist, so we check if it has any data before adding it
                        if(count($invoice->children()) > 0) {
                            $invoices_data[] = (array)$invoice;
                        }
                    }
                    $totalInvoices = count($invoices_data);
                    // If the loop ran but found no actual data, or the response was empty
                    if ($totalInvoices === 0) {
                        $error_message = "No invoices found for the selected date range.";
                    }
                } else {
                    $error_message = "Could not find a valid data structure in the API response.";
                }
            } else {
                $error_message = "Failed to parse main SOAP response.";
            }
        }
        
        echo json_encode([
            'success' => empty($error_message),
            'request_info' => [
                'function' => $soapFunction,
                'date_start' => $startDate->format('Y-m-d'),
                'date_end' => $endDate->format('Y-m-d'),
                'user' => $su
            ],
            'total_invoice_count' => $totalInvoices,
            'invoices' => $invoices_data,
            'error_message' => $error_message,
            'http_code' => $http_code,
            'raw_request' => $xml_request,
            'raw_response' => $response
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
    error_log("Error fetching companies for dropdown from rs_users: " . $e->getMessage());
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Debug: Get User Invoices</title>
    <script src="https://cdn.jsdelivr.net/npm/ag-grid-community@31.2.0/dist/ag-grid-community.min.js"></script>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ag-grid-community@31.2.0/styles/ag-grid.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ag-grid-community@31.2.0/styles/ag-theme-quartz.css">
    <style>
        body { padding-top: 5rem; }
        .xml-container {
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            padding: 1rem;
            font-family: monospace;
            font-size: 0.875rem;
            max-height: 400px;
            overflow: auto;
        }
        .xml-container pre { margin: 0; white-space: pre-wrap; word-wrap: break-word; }
    </style>
</head>
<body>
    <?php include '../../menu.php'; ?>
    <div class="container-fluid mt-4">
        <h2>Debug: Get User Invoices</h2>
        <p>This page tests <code>get_user_invoices</code> for fetching all invoices (buyer and seller) for a user within a date range.</p>
        
        <div class="card p-3 mb-4">
            <form id="debug-form">
                <div class="row">
                    <div class="col-md-4">
                        <label for="company" class="form-label">Select Company</label>
                        <select id="company" class="form-select">
                            <option value="">-- Select --</option>
                            <?php foreach ($companies as $company): ?>
                                <option value="<?= htmlspecialchars($company) ?>"><?= htmlspecialchars($company) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="col-md-3">
                        <label for="date_start" class="form-label">Update Date Start</label>
                        <input type="date" id="date_start" class="form-control" value="<?= date('Y-m-d', strtotime('-7 days')) ?>">
                    </div>
                    <div class="col-md-3">
                        <label for="date_end" class="form-label">Update Date End</label>
                        <input type="date" id="date_end" class="form-control" value="<?= date('Y-m-d') ?>">
                    </div>
                    <div class="col-md-2 align-self-end">
                        <button type="submit" id="test-btn" class="btn btn-primary w-100">Fetch Invoices</button>
                    </div>
                </div>
            </form>
        </div>
        
        <div id="result-summary" class="mt-4"></div>
        <div id="myGrid" class="ag-theme-quartz mt-4" style="height: 60vh; width: 100%;"></div>

        <div class="accordion mt-3" id="accordionRaw">
          <div class="accordion-item">
            <h2 class="accordion-header" id="headingRaw">
              <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseRaw">
                Raw Request & Response
              </button>
            </h2>
            <div id="collapseRaw" class="accordion-collapse collapse" data-bs-parent="#accordionRaw">
              <div class="accordion-body">
                <h5 class="mt-3">Raw Request:</h5>
                <div class="xml-container"><pre id="raw-request-content"></pre></div>
                <h5 class="mt-3">Raw Response:</h5>
                <div class="xml-container"><pre id="raw-response-content"></pre></div>
              </div>
            </div>
          </div>
        </div>
    </div>

<script>
document.addEventListener('DOMContentLoaded', () => {
    let gridApi;

    const columnDefs = [
        { headerName: "ID", field: "ID", filter: 'agNumberColumnFilter', width: 80 },
        { headerName: "ინვოისის #", field: "INVOICE_NUMBER", filter: true, width: 150 },
        { headerName: "თარიღი", field: "INVOICE_DATE", filter: 'agDateColumnFilter', width: 150 },
        { headerName: "მყიდველი", field: "BUYER_NAME", filter: true, flex: 1 },
        { headerName: "მყიდველის საიდ.", field: "BUYER_TIN", filter: true, width: 120 },
        { headerName: "გამყიდველი", field: "SELLER_NAME", filter: true, flex: 1 },
        { headerName: "გამყიდველის საიდ.", field: "SELLER_TIN", filter: true, width: 120 },
        { headerName: "თანხა", field: "AMOUNT", filter: 'agNumberColumnFilter', width: 120 },
        { headerName: "დღგ", field: "VAT", filter: 'agNumberColumnFilter', width: 120 },
        { headerName: "სულ თანხა", field: "TOTAL_AMOUNT", filter: 'agNumberColumnFilter', width: 120 },
        { headerName: "სტატუსი", field: "STATUS", filter: true, width: 100 },
    ];

    const gridOptions = {
        columnDefs: columnDefs,
        defaultColDef: {
            sortable: true, filter: true, resizable: true, flex: 1, minWidth: 120
        },
        pagination: true,
        paginationPageSize: 100,
        paginationPageSizeSelector: [100, 500, 1000],
        onGridReady: (params) => { gridApi = params.api; }
    };
    
    agGrid.createGrid(document.querySelector('#myGrid'), gridOptions);

    document.getElementById('debug-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const btn = document.getElementById('test-btn');
        const company = document.getElementById('company').value;
        const dateStart = document.getElementById('date_start').value;
        const dateEnd = document.getElementById('date_end').value;
        
        if (!company || !dateStart || !dateEnd) {
            alert('Please fill all required fields.');
            return;
        }

        const resultSummary = document.getElementById('result-summary');
        const rawRequestContent = document.getElementById('raw-request-content');
        const rawResponseContent = document.getElementById('raw-response-content');
        
        btn.disabled = true;
        btn.textContent = 'Fetching...';
        gridApi.showLoadingOverlay();
        
        fetch('', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                company: company,
                date_start: dateStart,
                date_end: dateEnd
            })
        })
        .then(res => res.json())
        .then(data => {
            resultSummary.style.display = 'block';
            
            if (data.error) {
                resultSummary.innerHTML = `<div class="alert alert-danger">Error: ${data.message}</div>`;
                gridApi.setGridOption('rowData', []);
            } else {
                let alertClass = data.total_invoice_count > 0 ? 'alert-success' : 'alert-info';
                if (data.error_message) {
                    alertClass = 'alert-warning';
                }
                
                resultSummary.innerHTML = `
                    <div class="alert ${alertClass}">
                        <strong>Function:</strong> ${data.request_info.function} | 
                        <strong>Date Range:</strong> ${data.request_info.date_start} to ${data.request_info.date_end} | 
                        <strong>Invoices Found:</strong> ${data.total_invoice_count}
                        ${data.error_message ? `<br><strong>Error:</strong> ${data.error_message}` : ''}
                    </div>`;
                
                gridApi.setGridOption('rowData', data.invoices || []);
            }
            
            rawRequestContent.textContent = data.raw_request || '';
            rawResponseContent.textContent = data.raw_response || '';
        })
        .catch(error => {
            resultSummary.style.display = 'block';
            resultSummary.innerHTML = `<div class="alert alert-danger"><strong>Fatal Error:</strong> ${error.message}</div>`;
            gridApi.setGridOption('rowData', []);
        })
        .finally(() => {
            btn.disabled = false;
            btn.textContent = 'Fetch Invoices';
            gridApi.hideOverlay();
             if (gridApi.getDisplayedRowCount() === 0) {
                gridApi.showNoRowsOverlay();
            }
        });
    });
});
</script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html> 