<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../../functions.php';
require_once __DIR__ . '/../../backend/database.php';

// Check if user is logged in and is admin
if (!isAdmin()) {
    die('Access denied. Admin privileges required.');
}

// Function to make SOAP request to get_invoice_desc_n
function testInvoiceDescAPI($user_id, $invois_id, $su, $sp) {
    $url = 'https://webserv.rs.ge/specinvoices/SpecInvoicesService.asmx';
    
    // SOAP request XML
    $soap_request = '<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <get_invoice_desc_n xmlns="http://tempuri.org/">
      <user_id>' . intval($user_id) . '</user_id>
      <invois_id>' . intval($invois_id) . '</invois_id>
      <su>' . htmlspecialchars($su) . '</su>
      <sp>' . htmlspecialchars($sp) . '</sp>
    </get_invoice_desc_n>
  </soap:Body>
</soap:Envelope>';

    $headers = [
        'Content-Type: text/xml; charset=utf-8',
        'SOAPAction: "http://tempuri.org/get_invoice_desc_n"',
        'Content-Length: ' . strlen($soap_request)
    ];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $soap_request);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curl_error = curl_error($ch);
    curl_close($ch);

    return [
        'success' => $response !== false && $http_code == 200,
        'http_code' => $http_code,
        'curl_error' => $curl_error,
        'raw_response' => $response,
        'request' => $soap_request
    ];
}

// Function to parse XML response
function parseInvoiceDescResponse($xml_string) {
    try {
        // Clean the response
        $cleaned_xml = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $xml_string);
        $cleaned_xml = str_replace('xmlns=""', '', $cleaned_xml);
        
        $xml = new SimpleXMLElement($cleaned_xml);
        
        // Register namespaces
        $xml->registerXPathNamespace('soap', 'http://schemas.xmlsoap.org/soap/envelope/');
        $xml->registerXPathNamespace('diffgr', 'urn:schemas-microsoft-com:xml-diffgram-v1');
        $xml->registerXPathNamespace('msdata', 'urn:schemas-microsoft-com:xml-msdata');
        $xml->registerXPathNamespace('tempuri', 'http://tempuri.org/');
        
        // Extract data from diffgram
        $result = $xml->xpath('//soap:Body/tempuri:get_invoice_desc_nResponse/tempuri:get_invoice_desc_nResult');
        
        if (empty($result)) {
            return ['error' => 'No result found in response'];
        }
        
        $data = [];
        $items = $result[0]->xpath('.//diffgr:diffgram//DocumentElement//*[local-name()="invoice_desc"]');
        
        if (empty($items)) {
            // Try alternative path
            $items = $result[0]->xpath('.//*[local-name()="invoice_desc"]');
        }
        
        foreach ($items as $item) {
            $row = [];
            foreach ($item->children() as $child) {
                $row[$child->getName()] = (string)$child;
            }
            $data[] = $row;
        }
        
        return $data;
        
    } catch (Exception $e) {
        return ['error' => 'XML parsing failed: ' . $e->getMessage()];
    }
}

// Get companies for dropdown
$companies = [];
try {
    $pdo = getDatabaseConnection();
    $stmt = $pdo->query("SELECT id, company_name, company_tin, un_id, s_user, s_password FROM rs_users WHERE un_id IS NOT NULL ORDER BY company_name");
    $companies = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) {
    $error = "Database error: " . $e->getMessage();
}

$result = null;
$error = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['test_api'])) {
    $company_id = $_POST['company_id'] ?? '';
    $invois_id = $_POST['invois_id'] ?? '';
    
    if (empty($company_id) || empty($invois_id)) {
        $error = "Please select a company and enter an invoice ID";
    } else {
        // Find company details
        $company = null;
        foreach ($companies as $comp) {
            if ($comp['id'] == $company_id) {
                $company = $comp;
                break;
            }
        }
        
        if (!$company) {
            $error = "Company not found";
        } else {
            // Test the API
            $api_result = testInvoiceDescAPI(
                $company['un_id'],
                $invois_id,
                $company['s_user'],
                $company['s_password']
            );
            
            if ($api_result['success']) {
                $parsed_data = parseInvoiceDescResponse($api_result['raw_response']);
                $result = [
                    'company' => $company,
                    'invois_id' => $invois_id,
                    'api_result' => $api_result,
                    'parsed_data' => $parsed_data
                ];
            } else {
                $error = "API call failed: " . $api_result['curl_error'] . " (HTTP: " . $api_result['http_code'] . ")";
            }
        }
    }
}
?>

<!DOCTYPE html>
<html lang="ka">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NSAF Invoice Description API Testing</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        .code-block {
            background-color: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 0.375rem;
            padding: 1rem;
            font-family: 'Courier New', monospace;
            font-size: 0.875rem;
            white-space: pre-wrap;
            max-height: 400px;
            overflow-y: auto;
        }
        .table-responsive {
            max-height: 500px;
            overflow-y: auto;
        }
        .field-description {
            font-size: 0.875rem;
            color: #6c757d;
            margin-top: 0.25rem;
        }
    </style>
</head>
<body>
    <div class="container-fluid py-4">
        <div class="row">
            <div class="col-12">
                <h2>NSAF Invoice Description API Testing</h2>
                <p class="text-muted">Test the <code>get_invoice_desc_n</code> API endpoint for retrieving detailed invoice descriptions with goods information.</p>
                
                <!-- API Documentation -->
                <div class="card mb-4">
                    <div class="card-header">
                        <h5>API Documentation</h5>
                    </div>
                    <div class="card-body">
                        <h6>Endpoint:</h6>
                        <p><code>https://webserv.rs.ge/specinvoices/SpecInvoicesService.asmx?op=get_invoice_desc_n</code></p>
                        
                        <h6>Parameters:</h6>
                        <ul>
                            <li><strong>user_id</strong> (int) - User ID from company credentials</li>
                            <li><strong>invois_id</strong> (int) - Invoice ID to get description for</li>
                            <li><strong>su</strong> (string) - Username from company credentials</li>
                            <li><strong>sp</strong> (string) - Password from company credentials</li>
                        </ul>
                        
                        <h6>Response Fields:</h6>
                        <div class="row">
                            <div class="col-md-6">
                                <ul>
                                    <li><strong>ID</strong> - დეტალური ცხრილის უნიკალური ნომერი</li>
                                    <li><strong>INV_ID</strong> - ანგარიშ ფაქტურის უნიკალური ნომერი</li>
                                    <li><strong>GOODS</strong> - საქონლის დასახელება</li>
                                    <li><strong>G_UNIT</strong> - ზომის ერთეული</li>
                                    <li><strong>G_NUMBER</strong> - რაოდენობა ლიტრებში</li>
                                    <li><strong>UNIT_PRICE</strong> - ღირებულება დღგ-ს და აქციზის ჩათვლით</li>
                                </ul>
                            </div>
                            <div class="col-md-6">
                                <ul>
                                    <li><strong>AKCIZI_RATE</strong> - არ გამოიყენება</li>
                                    <li><strong>AKCIZI_PRICE</strong> - არ გამოიყენება</li>
                                    <li><strong>DGG_RATE</strong> - 0.18</li>
                                    <li><strong>DGG_PRICE</strong> - დღგ-ს თანხა</li>
                                    <li><strong>AKCIZI_ID</strong> - საქონლის 4-ნიშნა კოდი</li>
                                    <li><strong>GOOD_ID</strong> - საქონლის უნიკალური ნომერი</li>
                                    <li><strong>GOODS_NUMBER_ALT</strong> - რაოდენობა კილოგრამებში</li>
                                    <li><strong>DRG_TYPE</strong> - დღგ-ს ტიპი</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Test Form -->
                <div class="card mb-4">
                    <div class="card-header">
                        <h5>Test API</h5>
                    </div>
                    <div class="card-body">
                        <form method="POST">
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label for="company_id" class="form-label">Company</label>
                                        <select class="form-select" id="company_id" name="company_id" required>
                                            <option value="">Select Company</option>
                                            <?php foreach ($companies as $company): ?>
                                                <option value="<?= htmlspecialchars($company['id']) ?>" 
                                                        data-un-id="<?= htmlspecialchars($company['un_id']) ?>"
                                                        data-s-user="<?= htmlspecialchars($company['s_user']) ?>"
                                                        data-s-password="<?= htmlspecialchars($company['s_password']) ?>">
                                                    <?= htmlspecialchars($company['company_name']) ?> (TIN: <?= htmlspecialchars($company['company_tin']) ?>)
                                                </option>
                                            <?php endforeach; ?>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label for="invois_id" class="form-label">Invoice ID</label>
                                        <input type="number" class="form-control" id="invois_id" name="invois_id" required placeholder="Enter invoice ID">
                                        <div class="form-text">Enter the invoice ID to get detailed description for</div>
                                    </div>
                                </div>
                            </div>
                            <button type="submit" name="test_api" class="btn btn-primary">Test API</button>
                        </form>
                    </div>
                </div>

                <!-- Results -->
                <?php if ($error): ?>
                    <div class="alert alert-danger">
                        <strong>Error:</strong> <?= htmlspecialchars($error) ?>
                    </div>
                <?php endif; ?>

                <?php if ($result): ?>
                    <div class="card mb-4">
                        <div class="card-header">
                            <h5>API Test Results</h5>
                        </div>
                        <div class="card-body">
                            <h6>Company Information:</h6>
                            <p><strong>Name:</strong> <?= htmlspecialchars($result['company']['company_name']) ?></p>
                            <p><strong>TIN:</strong> <?= htmlspecialchars($result['company']['company_tin']) ?></p>
                            <p><strong>UN ID:</strong> <?= htmlspecialchars($result['company']['un_id']) ?></p>
                            <p><strong>Invoice ID:</strong> <?= htmlspecialchars($result['invois_id']) ?></p>
                            
                            <h6>HTTP Response:</h6>
                            <p><strong>Status:</strong> <?= $result['api_result']['http_code'] ?></p>
                            
                            <?php if (isset($result['parsed_data']['error'])): ?>
                                <div class="alert alert-warning">
                                    <strong>Parsing Error:</strong> <?= htmlspecialchars($result['parsed_data']['error']) ?>
                                </div>
                            <?php elseif (empty($result['parsed_data'])): ?>
                                <div class="alert alert-info">
                                    <strong>No Data:</strong> No invoice description data found for this invoice ID.
                                </div>
                            <?php else: ?>
                                <h6>Parsed Data (<?= count($result['parsed_data']) ?> records):</h6>
                                <div class="table-responsive">
                                    <table class="table table-striped table-sm">
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>INV_ID</th>
                                                <th>GOODS</th>
                                                <th>G_UNIT</th>
                                                <th>G_NUMBER</th>
                                                <th>UNIT_PRICE</th>
                                                <th>DGG_RATE</th>
                                                <th>DGG_PRICE</th>
                                                <th>AKCIZI_ID</th>
                                                <th>GOOD_ID</th>
                                                <th>GOODS_NUMBER_ALT</th>
                                                <th>DRG_TYPE</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <?php foreach ($result['parsed_data'] as $row): ?>
                                                <tr>
                                                    <td><?= htmlspecialchars($row['ID'] ?? '') ?></td>
                                                    <td><?= htmlspecialchars($row['INV_ID'] ?? '') ?></td>
                                                    <td><?= htmlspecialchars($row['GOODS'] ?? '') ?></td>
                                                    <td><?= htmlspecialchars($row['G_UNIT'] ?? '') ?></td>
                                                    <td><?= htmlspecialchars($row['G_NUMBER'] ?? '') ?></td>
                                                    <td><?= htmlspecialchars($row['UNIT_PRICE'] ?? '') ?></td>
                                                    <td><?= htmlspecialchars($row['DGG_RATE'] ?? '') ?></td>
                                                    <td><?= htmlspecialchars($row['DGG_PRICE'] ?? '') ?></td>
                                                    <td><?= htmlspecialchars($row['AKCIZI_ID'] ?? '') ?></td>
                                                    <td><?= htmlspecialchars($row['GOOD_ID'] ?? '') ?></td>
                                                    <td><?= htmlspecialchars($row['GOODS_NUMBER_ALT'] ?? '') ?></td>
                                                    <td><?= htmlspecialchars($row['DRG_TYPE'] ?? '') ?></td>
                                                </tr>
                                            <?php endforeach; ?>
                                        </tbody>
                                    </table>
                                </div>
                            <?php endif; ?>
                        </div>
                    </div>

                    <!-- Raw Response -->
                    <div class="card">
                        <div class="card-header">
                            <h5>Raw SOAP Response</h5>
                        </div>
                        <div class="card-body">
                            <div class="code-block"><?= htmlspecialchars($result['api_result']['raw_response']) ?></div>
                        </div>
                    </div>
                <?php endif; ?>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
