<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../functions.php';
require_once __DIR__ . '/../backend/database.php';

// Admin-only access
if (!isAdmin()) {
    header('Content-Type: application/json');
    http_response_code(403);
    echo json_encode(['error' => true, 'message' => 'Access denied.']);
    exit;
}

/**
 * Create waybill_invoices table with correct schema if it doesn't exist
 */
function createWaybillInvoicesTable($pdo) {
    try {
        // Check if table exists
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'rs' AND TABLE_NAME = 'waybill_invoices'");
        $stmt->execute();
        $table_exists = $stmt->fetchColumn() > 0;
        
        if (!$table_exists) {
            // Create table with minimal schema for many-to-many relationship
            $create_sql = "
                CREATE TABLE rs.waybill_invoices (
                    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
                    [waybill_id] NVARCHAR(100) NOT NULL,
                    [invoice_id] NVARCHAR(100) NOT NULL,
                    [company_id] INT NULL,
                    [created_at] DATETIME DEFAULT GETDATE(),
                    [updated_at] DATETIME DEFAULT GETDATE()
                )
            ";
            
            $pdo->exec($create_sql);
            error_log("Created rs.waybill_invoices table with minimal schema");
            return "Table created successfully";
        } else {
            // Check if we need to simplify the existing table
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'rs' AND TABLE_NAME = 'waybill_invoices'");
            $stmt->execute();
            $column_count = $stmt->fetchColumn();
            
            if ($column_count > 6) {
                // Table has too many columns, suggest recreation
                return "Table exists but has too many columns. Consider recreating with minimal schema.";
            } else {
                return "Table already exists with correct schema";
            }
        }
    } catch (Exception $e) {
        error_log("Error creating/checking waybill_invoices table: " . $e->getMessage());
        return "Error: " . $e->getMessage();
    }
}

// Ensure table exists with correct schema
$pdo = getDatabaseConnection();
createWaybillInvoicesTable($pdo);

/**
 * Associate multiple invoices with a waybill
 */
function associateInvoicesWithWaybill($waybill_id, $invoice_ids, $company_un_id = null) {
    try {
        $pdo = getDatabaseConnection();
        
        // Clear existing associations for this waybill
        $stmt = $pdo->prepare("DELETE FROM rs.waybill_invoices WHERE WAYBILL_EXTERNAL_ID = ?");
        $stmt->execute([$waybill_id]);
        
        $inserted = 0;
        $errors = [];
        
        foreach ($invoice_ids as $invoice_id) {
            if (empty($invoice_id)) continue;
            
            try {
                // Check if invoice exists in seller_invoices
                error_log("DEBUG: Checking seller_invoices table for invoice ID: $invoice_id");
                $stmt = $pdo->prepare("SELECT INVOICE_ID, COMPANY_UN_ID FROM rs.seller_invoices WHERE INVOICE_ID = ?");
                $stmt->execute([$invoice_id]);
                $seller_invoice = $stmt->fetch(PDO::FETCH_ASSOC);
                error_log("DEBUG: Seller invoice lookup result: " . ($seller_invoice ? 'found' : 'not found'));
                
                if ($seller_invoice) {
                                // Get company_id from rs_users table
            $stmt = $pdo->prepare("SELECT ID FROM rs_users WHERE COMPANY_NAME = ?");
            $stmt->execute([$seller_invoice['COMPANY_NAME'] ?? '']);
            $company_id = $stmt->fetchColumn();
            
            // Debug: Log the company lookup
            error_log("Looking up company_id for COMPANY_NAME: " . ($seller_invoice['COMPANY_NAME'] ?? 'NULL') . " -> company_id: " . ($company_id ?: 'NULL'));
                    
                    // Check if association already exists
                    $stmt = $pdo->prepare("SELECT COUNT(*) FROM rs.waybill_invoices WHERE WAYBILL_EXTERNAL_ID = ? AND INVOICE_ID = ?");
                    $stmt->execute([$waybill_id, $invoice_id]);
                    $exists = $stmt->fetchColumn() > 0;
                    
                    if (!$exists) {
                        $stmt = $pdo->prepare("INSERT INTO rs.waybill_invoices (WAYBILL_EXTERNAL_ID, INVOICE_ID, COMPANY_ID, UPDATED_AT) VALUES (?, ?, ?, ?)");
                        $stmt->execute([$waybill_id, $invoice_id, $company_id, date('Y-m-d H:i:s')]);
                        $inserted++;
                    }
                    continue;
                }
                
                // Check if invoice exists in buyer_invoices
                error_log("DEBUG: Checking buyer_invoices table for invoice ID: $invoice_id");
                $stmt = $pdo->prepare("SELECT INVOICE_ID, COMPANY_NAME FROM rs.buyer_invoices WHERE INVOICE_ID = ?");
                $stmt->execute([$invoice_id]);
                $buyer_invoice = $stmt->fetch(PDO::FETCH_ASSOC);
                error_log("DEBUG: Buyer invoice lookup result: " . ($buyer_invoice ? 'found' : 'not found'));
                
                if ($buyer_invoice) {
                                // Get company_id from rs_users table
            $stmt = $pdo->prepare("SELECT ID FROM rs_users WHERE COMPANY_NAME = ?");
            $stmt->execute([$buyer_invoice['COMPANY_NAME'] ?? '']);
            $company_id = $stmt->fetchColumn();
            
            // Debug: Log the company lookup
            error_log("Looking up company_id for COMPANY_NAME: " . ($buyer_invoice['COMPANY_NAME'] ?? 'NULL') . " -> company_id: " . ($company_id ?: 'NULL'));
                    
                    // Check if association already exists
                    $stmt = $pdo->prepare("SELECT COUNT(*) FROM rs.waybill_invoices WHERE WAYBILL_EXTERNAL_ID = ? AND INVOICE_ID = ?");
                    $stmt->execute([$waybill_id, $invoice_id]);
                    $exists = $stmt->fetchColumn() > 0;
                    
                    if (!$exists) {
                        $stmt = $pdo->prepare("INSERT INTO rs.waybill_invoices (WAYBILL_EXTERNAL_ID, INVOICE_ID, COMPANY_ID, UPDATED_AT) VALUES (?, ?, ?, ?)");
                        $stmt->execute([$waybill_id, $invoice_id, $company_id, date('Y-m-d H:i:s')]);
                        $inserted++;
                    }
                    continue;
                }
                
                $errors[] = "Invoice ID $invoice_id not found in seller or buyer invoices";
                
            } catch (Exception $e) {
                error_log("Error associating invoice $invoice_id with waybill $waybill_id: " . $e->getMessage());
                $errors[] = "Error processing invoice $invoice_id: " . $e->getMessage();
            }
        }
        
        return [
            'success' => true,
            'inserted' => $inserted,
            'errors' => $errors,
            'message' => "Associated $inserted invoices with waybill $waybill_id"
        ];
        
    } catch (Exception $e) {
        error_log("Error in associateInvoicesWithWaybill: " . $e->getMessage());
        return [
            'success' => false,
            'message' => 'Database error: ' . $e->getMessage()
        ];
    }
}

/**
 * Automatically detect invoices associated with a waybill using RS service
 */
function getAutoDetectedInvoices($waybill_id) {
    try {
        $pdo = getDatabaseConnection();
        $detected_invoices = [];
        
        // First, get waybill details from RS service to find any INVOICE_ID
        $waybill_details = getWaybillDetailsFromRS($waybill_id);
        
        if ($waybill_details && isset($waybill_details['INVOICE_ID']) && !empty($waybill_details['INVOICE_ID'])) {
            $rs_invoice_id = $waybill_details['INVOICE_ID'];
            
            // Get invoice details from RS service
            $invoice_details = getInvoiceDetailsFromRS($rs_invoice_id);
            
            if ($invoice_details) {
                $detected_invoices[] = [
                    'invoice_id' => $rs_invoice_id,
                    'type' => 'rs_service',
                    'series' => $invoice_details['F_SERIES'] ?? '',
                    'number' => $invoice_details['F_NUMBER'] ?? '',
                    'operation_date' => $invoice_details['OPERATION_DT'] ?? '',
                    'amount' => $invoice_details['FULL_AMOUNT'] ?? '',
                    'company_name' => $waybill_details['SELLER_NAME'] ?? $waybill_details['BUYER_NAME'] ?? '',
                    'source' => 'rs_service_waybill'
                ];
            }
        }
        
        // Also check database tables for existing relationships
        $db_invoices = getInvoicesFromDatabase($waybill_id);
        $detected_invoices = array_merge($detected_invoices, $db_invoices);
        
        // Remove duplicates based on invoice_id
        $unique_invoices = [];
        $seen_ids = [];
        foreach ($detected_invoices as $invoice) {
            if (!in_array($invoice['invoice_id'], $seen_ids)) {
                $unique_invoices[] = $invoice;
                $seen_ids[] = $invoice['invoice_id'];
            }
        }
        
        return $unique_invoices;
        
    } catch (Exception $e) {
        error_log("Error getting auto-detected invoices for waybill $waybill_id: " . $e->getMessage());
        return [];
    }
}

/**
 * Get waybill details from RS service
 */
function getWaybillDetailsFromRS($waybill_id) {
    try {
        // Get company name from database
        $pdo = getDatabaseConnection();
        $stmt = $pdo->prepare("SELECT SELLER_NAME FROM rs.sellers_waybills WHERE EXTERNAL_ID = ?");
        $stmt->execute([$waybill_id]);
        $company_name = $stmt->fetchColumn();
        
        if (!$company_name) {
            $stmt = $pdo->prepare("SELECT BUYER_NAME FROM rs.buyers_waybills WHERE EXTERNAL_ID = ?");
            $stmt->execute([$waybill_id]);
            $company_name = $stmt->fetchColumn();
        }
        
        if (!$company_name) {
            error_log("Company name not found for waybill $waybill_id");
            return null;
        }
        
        // Call RS service using cURL instead of file_get_contents
        $url = "http://" . $_SERVER['HTTP_HOST'] . dirname($_SERVER['REQUEST_URI']) . "/get_waybill_details_rs.php";
        $params = [
            'api' => '1',
            'waybill_id' => $waybill_id,
            'company' => $company_name
        ];
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url . '?' . http_build_query($params));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curl_error = curl_error($ch);
        curl_close($ch);
        
        if ($curl_error) {
            error_log("CURL Error getting waybill details: " . $curl_error);
            return null;
        }
        
        if ($http_code !== 200) {
            error_log("HTTP Error getting waybill details: " . $http_code);
            return null;
        }
        
        if (!$response) {
            error_log("Empty response from waybill details service");
            return null;
        }
        
        $data = json_decode($response, true);
        
        if ($data && isset($data['success']) && $data['success'] && isset($data['waybill'])) {
            return $data['waybill'];
        }
        
        error_log("Invalid response from RS service for waybill $waybill_id: " . $response);
        return null;
        
    } catch (Exception $e) {
        error_log("Error getting waybill details from RS service: " . $e->getMessage());
        return null;
    }
}

/**
 * Get invoice details from RS service
 */
function getInvoiceDetailsFromRS($invoice_id) {
    try {
        // Get company name from database
        $pdo = getDatabaseConnection();
        $stmt = $pdo->prepare("SELECT COMPANY_NAME FROM rs.seller_invoices WHERE INVOICE_ID = ?");
        $stmt->execute([$invoice_id]);
        $company_name = $stmt->fetchColumn();
        
        if (!$company_name) {
            $stmt = $pdo->prepare("SELECT COMPANY_NAME FROM rs.buyer_invoices WHERE INVOICE_ID = ?");
            $stmt->execute([$invoice_id]);
            $company_name = $stmt->fetchColumn();
        }
        
        if (!$company_name) {
            error_log("Company name not found for invoice $invoice_id");
            return null;
        }
        
        // Call RS service using cURL instead of file_get_contents
        $url = "http://" . $_SERVER['HTTP_HOST'] . dirname($_SERVER['REQUEST_URI']) . "/get_invoice_details_rs.php";
        $params = [
            'api' => '1',
            'invoice_id' => $invoice_id,
            'company' => $company_name
        ];
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url . '?' . http_build_query($params));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curl_error = curl_error($ch);
        curl_close($ch);
        
        if ($curl_error) {
            error_log("CURL Error getting invoice details: " . $curl_error);
            return null;
        }
        
        if ($http_code !== 200) {
            error_log("HTTP Error getting invoice details: " . $http_code);
            return null;
        }
        
        if (!$response) {
            error_log("Empty response from invoice details service");
            return null;
        }
        
        $data = json_decode($response, true);
        
        if ($data && isset($data['success']) && $data['success'] && isset($data['invoice'])) {
            return $data['invoice'];
        }
        
        error_log("Invalid response from RS service for invoice $invoice_id: " . $response);
        return null;
        
    } catch (Exception $e) {
        error_log("Error getting invoice details from RS service: " . $e->getMessage());
        return null;
    }
}

/**
 * Get invoices from database tables
 */
function getInvoicesFromDatabase($waybill_id) {
    try {
        $pdo = getDatabaseConnection();
        $detected_invoices = [];
        
        // Check for invoices in sellers_waybills table
        $stmt = $pdo->prepare("
            SELECT sw.INVOICE_ID, si.F_SERIES, si.F_NUMBER, si.OPERATION_DT, si.TANXA, si.COMPANY_NAME, 'seller' as type
            FROM rs.sellers_waybills sw
            LEFT JOIN rs.seller_invoices si ON sw.INVOICE_ID = si.INVOICE_ID
            WHERE sw.EXTERNAL_ID = ? AND sw.INVOICE_ID IS NOT NULL AND sw.INVOICE_ID != ''
        ");
        $stmt->execute([$waybill_id]);
        $seller_invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($seller_invoices as $invoice) {
            if ($invoice['INVOICE_ID']) {
                $detected_invoices[] = [
                    'invoice_id' => $invoice['INVOICE_ID'],
                    'type' => 'seller',
                    'series' => $invoice['F_SERIES'],
                    'number' => $invoice['F_NUMBER'],
                    'operation_date' => $invoice['OPERATION_DT'],
                    'amount' => $invoice['TANXA'],
                    'company_name' => $invoice['COMPANY_NAME'],
                    'source' => 'sellers_waybills'
                ];
            }
        }
        
        // Check for invoices in buyers_waybills table
        $stmt = $pdo->prepare("
            SELECT bw.INVOICE_ID, bi.F_SERIES, bi.F_NUMBER, bi.OPERATION_DT, bi.TANXA, bi.COMPANY_NAME, 'buyer' as type
            FROM rs.buyers_waybills bw
            LEFT JOIN rs.buyer_invoices bi ON bw.INVOICE_ID = bi.INVOICE_ID
            WHERE bw.EXTERNAL_ID = ? AND bw.INVOICE_ID IS NOT NULL AND bw.INVOICE_ID != ''
        ");
        $stmt->execute([$waybill_id]);
        $buyer_invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($buyer_invoices as $invoice) {
            if ($invoice['INVOICE_ID']) {
                $detected_invoices[] = [
                    'invoice_id' => $invoice['INVOICE_ID'],
                    'type' => 'buyer',
                    'series' => $invoice['F_NUMBER'],
                    'number' => $invoice['F_NUMBER'],
                    'operation_date' => $invoice['OPERATION_DT'],
                    'amount' => $invoice['TANXA'],
                    'company_name' => $invoice['COMPANY_NAME'],
                    'source' => 'buyers_waybills'
                ];
            }
        }
        
        // Check for invoices in waybill_invoices table
        $stmt = $pdo->prepare("
            SELECT wi.invoice_id, 
                   COALESCE(si.F_SERIES, bi.F_SERIES) as F_SERIES,
                   COALESCE(si.F_NUMBER, bi.F_NUMBER) as F_NUMBER,
                   COALESCE(si.OPERATION_DT, bi.OPERATION_DT) as OPERATION_DT,
                   COALESCE(si.TANXA, bi.TANXA) as TANXA,
                   COALESCE(si.COMPANY_NAME, bi.COMPANY_NAME) as COMPANY_NAME,
                   CASE WHEN si.INVOICE_ID IS NOT NULL THEN 'seller' ELSE 'buyer' END as type
            FROM rs.waybill_invoices wi
            LEFT JOIN rs.seller_invoices si ON wi.invoice_id = si.INVOICE_ID
            LEFT JOIN rs.buyer_invoices bi ON wi.invoice_id = bi.INVOICE_ID
            WHERE wi.WAYBILL_EXTERNAL_ID = ? AND wi.invoice_id IS NOT NULL AND wi.invoice_id != ''
        ");
        $stmt->execute([$waybill_id]);
        $waybill_invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($waybill_invoices as $invoice) {
            if ($invoice['invoice_id']) {
                $detected_invoices[] = [
                    'invoice_id' => $invoice['invoice_id'],
                    'type' => $invoice['type'],
                    'series' => $invoice['F_SERIES'],
                    'number' => $invoice['F_NUMBER'],
                    'operation_date' => $invoice['OPERATION_DT'],
                    'amount' => $invoice['TANXA'],
                    'company_name' => $invoice['COMPANY_NAME'],
                    'source' => 'waybill_invoices'
                ];
            }
        }
        
        return $detected_invoices;
        
    } catch (Exception $e) {
        error_log("Error getting invoices from database for waybill $waybill_id: " . $e->getMessage());
        return [];
    }
}

/**
 * Discover waybill IDs from invoice using RS service
 */
function discoverWaybillIdsFromInvoice($invoice_id) {
    try {
        // Get company name from database
        $pdo = getDatabaseConnection();
        $stmt = $pdo->prepare("SELECT COMPANY_NAME FROM rs.seller_invoices WHERE INVOICE_ID = ?");
        $stmt->execute([$invoice_id]);
        $company_name = $stmt->fetchColumn();
        
        if (!$company_name) {
            $stmt = $pdo->prepare("SELECT COMPANY_NAME FROM rs.buyer_invoices WHERE INVOICE_ID = ?");
            $stmt->execute([$invoice_id]);
            $company_name = $stmt->fetchColumn();
        }
        
        if (!$company_name) {
            error_log("Company name not found for invoice $invoice_id");
            return [];
        }
        
        // Call RS service to get invoice details including waybill IDs
        $url = "http://" . $_SERVER['HTTP_HOST'] . dirname($_SERVER['REQUEST_URI']) . "/get_invoice_details_rs.php";
        $params = [
            'api' => '1',
            'invoice_id' => $invoice_id,
            'company' => $company_name
        ];
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url . '?' . http_build_query($params));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curl_error = curl_error($ch);
        curl_close($ch);
        
        if ($curl_error) {
            error_log("CURL Error discovering waybill IDs: " . $curl_error);
            return [];
        }
        
        if ($http_code !== 200) {
            error_log("HTTP Error discovering waybill IDs: " . $http_code);
            return [];
        }
        
        if (!$response) {
            error_log("Empty response from invoice details service");
            return [];
        }
        
        $data = json_decode($response, true);
        
        if ($data && isset($data['success']) && $data['success'] && isset($data['invoice']['WAYBILL_IDS'])) {
            return $data['invoice']['WAYBILL_IDS'];
        }
        
        error_log("No waybill IDs found in RS service response for invoice $invoice_id");
        return [];
        
    } catch (Exception $e) {
        error_log("Error discovering waybill IDs from invoice: " . $e->getMessage());
        return [];
    }
}

/**
 * Get available invoices for a company
 */
function getAvailableInvoices($company_un_id = null, $search = '') {
    try {
        $pdo = getDatabaseConnection();
        $invoices = [];
        
        // Get seller invoices
        $seller_sql = "SELECT INVOICE_ID, F_SERIES, F_NUMBER, OPERATION_DT, TANXA, COMPANY_NAME FROM rs.seller_invoices WHERE 1=1";
        $seller_params = [];
        
        if ($company_un_id) {
            $seller_sql .= " AND COMPANY_UN_ID = ?";
            $seller_params[] = $company_un_id;
        }
        
        if ($search) {
            $seller_sql .= " AND (INVOICE_ID LIKE ? OR F_SERIES LIKE ? OR F_NUMBER LIKE ?)";
            $search_param = "%$search%";
            $seller_params = array_merge($seller_params, [$search_param, $search_param, $search_param]);
        }
        
        $seller_sql .= " ORDER BY OPERATION_DT DESC";
        
        // For MSSQL, we need to use TOP instead of LIMIT
        $seller_sql = "SELECT TOP 100 " . substr($seller_sql, 7); // Remove "SELECT " and add "SELECT TOP 100 "
        
        $stmt = $pdo->prepare($seller_sql);
        $stmt->execute($seller_params);
        $seller_invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($seller_invoices as $invoice) {
            $invoices[] = [
                'invoice_id' => $invoice['INVOICE_ID'],
                'type' => 'seller',
                'series' => $invoice['F_SERIES'],
                'number' => $invoice['F_NUMBER'],
                'operation_date' => $invoice['OPERATION_DT'],
                'amount' => $invoice['TANXA'],
                'company_name' => $invoice['COMPANY_NAME']
            ];
        }
        
        // Get buyer invoices
        $buyer_sql = "SELECT INVOICE_ID, F_SERIES, F_NUMBER, OPERATION_DT, TANXA, COMPANY_NAME FROM rs.buyer_invoices WHERE 1=1";
        $buyer_params = [];
        
        if ($company_un_id) {
            $buyer_sql .= " AND COMPANY_UN_ID = ?";
            $buyer_params[] = $company_un_id;
        }
        
        if ($search) {
            $buyer_sql .= " AND (INVOICE_ID LIKE ? OR F_SERIES LIKE ? OR F_NUMBER LIKE ?)";
            $search_param = "%$search%";
            $buyer_params = array_merge($buyer_params, [$search_param, $search_param, $search_param]);
        }
        
        $buyer_sql .= " ORDER BY OPERATION_DT DESC";
        
        // For MSSQL, we need to use TOP instead of LIMIT
        $buyer_sql = "SELECT TOP 100 " . substr($buyer_sql, 7); // Remove "SELECT " and add "SELECT TOP 100 "
        
        $stmt = $pdo->prepare($buyer_sql);
        $stmt->execute($buyer_params);
        $buyer_invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($buyer_invoices as $invoice) {
            $invoices[] = [
                'invoice_id' => $invoice['INVOICE_ID'],
                'type' => 'buyer',
                'series' => $invoice['F_NUMBER'],
                'number' => $invoice['F_NUMBER'],
                'operation_date' => $invoice['OPERATION_DT'],
                'amount' => $invoice['TANXA'],
                'company_name' => $invoice['COMPANY_NAME']
            ];
        }
        
        return $invoices;
        
    } catch (Exception $e) {
        error_log("Error getting available invoices: " . $e->getMessage());
        return [];
    }
}

// Handle API requests
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json; charset=utf-8');
    
    $postData = json_decode(file_get_contents('php://input'), true);
    $action = $postData['action'] ?? '';
    
    try {
        switch ($action) {
            case 'associate_invoices':
                $waybill_id = $postData['waybill_id'] ?? null;
                $invoice_ids = $postData['invoice_ids'] ?? [];
                $company_un_id = $postData['company_un_id'] ?? null;
                
                // Fix: Handle string "null" values
                if ($company_un_id === 'null' || $company_un_id === '') {
                    $company_un_id = null;
                }
                
                if (!$waybill_id || empty($invoice_ids)) {
                    http_response_code(400);
                    echo json_encode(['error' => true, 'message' => 'Waybill ID and invoice IDs are required']);
                    exit;
                }
                
                $result = associateInvoicesWithWaybill($waybill_id, $invoice_ids, $company_un_id);
                echo json_encode($result);
                break;
                
            case 'get_available_invoices':
                $company_un_id = $postData['company_un_id'] ?? null;
                $search = $postData['search'] ?? '';
                
                // Fix: Handle string "null" values
                if ($company_un_id === 'null' || $company_un_id === '') {
                    $company_un_id = null;
                }
                
                $invoices = getAvailableInvoices($company_un_id, $search);
                echo json_encode([
                    'success' => true,
                    'invoices' => $invoices,
                    'count' => count($invoices)
                ]);
                break;
                
            case 'auto_save_detected':
                $waybill_id = $postData['waybill_id'] ?? null;
                
                if (!$waybill_id) {
                    http_response_code(400);
                    echo json_encode(['error' => true, 'message' => 'Waybill ID is required']);
                    exit;
                }
                
                $detected_invoices = getAutoDetectedInvoices($waybill_id);
                $invoice_ids = array_column($detected_invoices, 'invoice_id');
                
                if (!empty($invoice_ids)) {
                    $result = associateInvoicesWithWaybill($waybill_id, $invoice_ids);
                    echo json_encode([
                        'success' => true,
                        'message' => "Auto-saved " . count($invoice_ids) . " detected invoices",
                        'saved_count' => count($invoice_ids),
                        'invoice_ids' => $invoice_ids
                    ]);
                } else {
                    echo json_encode([
                        'success' => true,
                        'message' => "No invoices to auto-save",
                        'saved_count' => 0
                    ]);
                }
                break;
                
            case 'discover_from_invoice':
                $invoice_id = $postData['invoice_id'] ?? null;
                
                if (!$invoice_id) {
                    http_response_code(400);
                    echo json_encode(['error' => true, 'message' => 'Invoice ID is required']);
                    exit;
                }
                
                // Discover waybill IDs from invoice using RS service
                $waybill_ids = discoverWaybillIdsFromInvoice($invoice_id);
                
                if (!empty($waybill_ids)) {
                    // Save associations for each discovered waybill
                    $saved_count = 0;
                    foreach ($waybill_ids as $waybill_id) {
                        $result = associateInvoicesWithWaybill($waybill_id, [$invoice_id]);
                        if ($result['success']) {
                            $saved_count++;
                        }
                    }
                    
                    echo json_encode([
                        'success' => true,
                        'message' => "Discovered and saved $saved_count waybill associations for invoice $invoice_id",
                        'discovered_waybills' => $waybill_ids,
                        'saved_count' => $saved_count
                    ]);
                } else {
                    echo json_encode([
                        'success' => true,
                        'message' => "No waybill associations found for invoice $invoice_id",
                        'discovered_waybills' => [],
                        'saved_count' => 0
                    ]);
                }
                break;
                
            default:
                http_response_code(400);
                echo json_encode(['error' => true, 'message' => 'Invalid action']);
                break;
        }
        
    } catch (Exception $e) {
        error_log("API Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => true, 'message' => 'Internal server error']);
    }
    
    exit;
}

// Handle GET requests for the UI
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $waybill_id = $_GET['waybill_id'] ?? null;
    $company_un_id = $_GET['company_un_id'] ?? null;
    
    // Fix: Handle string "null" values
    if ($company_un_id === 'null' || $company_un_id === '') {
        $company_un_id = null;
    }
    
    if (!$waybill_id) {
        echo "Error: Waybill ID is required";
        exit;
    }
    
    // Debug: Log the parameters
    error_log("Loading associate_invoices_with_waybill.php - waybill_id: $waybill_id, company_un_id: " . ($company_un_id ?: 'NULL'));
    
    // Get current invoices for this waybill
    try {
        require_once 'get_waybill_invoices.php';
        $current_invoices = getWaybillInvoiceDetails($waybill_id);
    } catch (Exception $e) {
        error_log("Error getting waybill invoice details: " . $e->getMessage());
        $current_invoices = [];
    }
    
    // Get available invoices
    try {
        $available_invoices = getAvailableInvoices($company_un_id);
    } catch (Exception $e) {
        error_log("Error getting available invoices: " . $e->getMessage());
        $available_invoices = [];
    }
    
    // Get automatically detected associations
    try {
        $auto_detected_invoices = getAutoDetectedInvoices($waybill_id);
    } catch (Exception $e) {
        error_log("Error getting auto-detected invoices: " . $e->getMessage());
        $auto_detected_invoices = [];
    }
?>

<!DOCTYPE html>
<html lang="ka">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Associate Invoices with Waybill</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.7.2/font/bootstrap-icons.css" rel="stylesheet">
</head>
<body>
    <div class="container mt-4">
        <h2>Associate Invoices with Waybill <?php echo htmlspecialchars($waybill_id); ?></h2>
        
        <!-- Debug info -->
        <div class="alert alert-info">
            <strong>Debug Info:</strong><br>
            Waybill ID: <?php echo htmlspecialchars($waybill_id); ?><br>
            Company UN ID: <?php echo htmlspecialchars($company_un_id ?: 'NULL'); ?><br>
            Current Invoices Count: <?php echo count($current_invoices); ?><br>
            Available Invoices Count: <?php echo count($available_invoices); ?><br>
            Auto-Detected Invoices Count: <?php echo count($auto_detected_invoices); ?>
        </div>
        
        <?php 
        $total_detected = count($auto_detected_invoices);
        $total_manual = count($current_invoices);
        $total_invoices = $total_detected + $total_manual;
        ?>
        
        <div class="alert alert-info">
            <h6><i class="bi bi-info-circle me-2"></i>Invoice Association Summary</h6>
            <ul class="mb-0">
                <li><strong>RS Service Detected:</strong> <?php echo count(array_filter($auto_detected_invoices, function($inv) { return $inv['source'] === 'rs_service_waybill'; })); ?> (from RS service waybill details)</li>
                <li><strong>Database Detected:</strong> <?php echo count(array_filter($auto_detected_invoices, function($inv) { return $inv['source'] !== 'rs_service_waybill'; })); ?> (from existing database relationships)</li>
                <li><strong>Manually Associated Invoices:</strong> <?php echo $total_manual; ?> (from waybill_invoices table)</li>
                <li><strong>Total Invoices:</strong> <?php echo $total_invoices; ?></li>
            </ul>
        </div>
        
        <div class="row">
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">
                        <h5>Auto-Detected Invoices</h5>
                    </div>
                    <div class="card-body">
                        <div id="auto-detected-invoices">
                            <?php if (empty($auto_detected_invoices)): ?>
                                <p class="text-muted">No invoices automatically detected</p>
                            <?php else: ?>
                                <?php foreach ($auto_detected_invoices as $invoice): ?>
                                    <div class="d-flex justify-content-between align-items-center mb-2">
                                        <div>
                                            <span class="badge bg-<?php echo $invoice['type'] === 'seller' ? 'primary' : 'success'; ?> me-2">
                                                <?php echo $invoice['type'] === 'seller' ? 'გამყიდველი' : 'მყიდველი'; ?>
                                            </span>
                                            <strong><?php echo htmlspecialchars($invoice['series'] . $invoice['number']); ?></strong>
                                            <small class="text-muted ms-2"><?php echo htmlspecialchars($invoice['invoice_id']); ?></small>
                                            <br><small class="text-info">Source: <?php echo htmlspecialchars($invoice['source']); ?></small>
                                        </div>
                                        <span class="badge bg-success">Auto-Detected</span>
                                    </div>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>
                
                <div class="card mt-3">
                    <div class="card-header">
                        <h5>Manually Associated Invoices</h5>
                    </div>
                    <div class="card-body">
                        <div id="current-invoices">
                            <?php if (empty($current_invoices)): ?>
                                <p class="text-muted">No manually associated invoices</p>
                            <?php else: ?>
                                <?php foreach ($current_invoices as $invoice): ?>
                                    <div class="d-flex justify-content-between align-items-center mb-2">
                                        <div>
                                            <span class="badge bg-<?php echo $invoice['type'] === 'seller' ? 'primary' : 'success'; ?> me-2">
                                                <?php echo $invoice['type'] === 'seller' ? 'გამყიდველი' : 'მყიდველი'; ?>
                                            </span>
                                            <strong><?php echo htmlspecialchars($invoice['series'] . $invoice['number']); ?></strong>
                                            <small class="text-muted ms-2"><?php echo htmlspecialchars($invoice['invoice_id']); ?></small>
                                        </div>
                                        <button class="btn btn-sm btn-outline-danger" onclick="removeInvoice('<?php echo $invoice['invoice_id']; ?>')">
                                            <i class="bi bi-trash"></i>
                                        </button>
                                    </div>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">
                        <h5>Add New Invoices</h5>
                    </div>
                    <div class="card-body">
                        <div class="mb-3">
                            <input type="text" class="form-control" id="invoice-search" placeholder="Search invoices...">
                        </div>
                        <div id="available-invoices" style="max-height: 400px; overflow-y: auto;">
                            <!-- Available invoices will be loaded here -->
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="mt-3">
            <?php if ($total_detected > 0): ?>
                <button class="btn btn-success me-2" onclick="autoSaveDetected()">
                    <i class="bi bi-save me-1"></i>Auto-Save Detected Invoices (<?php echo $total_detected; ?>)
                </button>
            <?php endif; ?>
            <button class="btn btn-info me-2" onclick="discoverFromInvoice()">
                <i class="bi bi-search me-1"></i>Discover from Invoice
            </button>
            <button class="btn btn-primary" onclick="saveAssociations()">Save Manual Associations</button>
            <button class="btn btn-secondary" onclick="window.close()">Close</button>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        let selectedInvoices = new Set();
        
        // Load available invoices
        async function loadAvailableInvoices(search = '') {
            try {
                const response = await fetch('associate_invoices_with_waybill.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'get_available_invoices',
                        company_un_id: '<?php echo $company_un_id; ?>',
                        search: search
                    })
                });
                
                const data = await response.json();
                if (data.success) {
                    displayAvailableInvoices(data.invoices);
                }
            } catch (error) {
                console.error('Error loading invoices:', error);
            }
        }
        
        function displayAvailableInvoices(invoices) {
            const container = document.getElementById('available-invoices');
            let html = '';
            
            invoices.forEach(invoice => {
                const isSelected = selectedInvoices.has(invoice.invoice_id);
                html += `
                    <div class="form-check mb-2">
                        <input class="form-check-input" type="checkbox" 
                               id="invoice-${invoice.invoice_id}" 
                               value="${invoice.invoice_id}"
                               ${isSelected ? 'checked' : ''}
                               onchange="toggleInvoice('${invoice.invoice_id}')">
                        <label class="form-check-label" for="invoice-${invoice.invoice_id}">
                            <span class="badge bg-${invoice.type === 'seller' ? 'primary' : 'success'} me-2">
                                ${invoice.type === 'seller' ? 'გამყიდველი' : 'მყიდველი'}
                            </span>
                            <strong>${invoice.series}${invoice.number}</strong>
                            <small class="text-muted ms-2">${invoice.invoice_id}</small>
                            ${invoice.amount ? `<br><small class="text-muted">${invoice.amount} ₾</small>` : ''}
                        </label>
                    </div>
                `;
            });
            
            container.innerHTML = html;
        }
        
        function toggleInvoice(invoiceId) {
            if (selectedInvoices.has(invoiceId)) {
                selectedInvoices.delete(invoiceId);
            } else {
                selectedInvoices.add(invoiceId);
            }
        }
        
        async function autoSaveDetected() {
            if (!confirm('This will save all auto-detected invoices to the waybill_invoices table. Continue?')) {
                return;
            }
            
            try {
                const response = await fetch('associate_invoices_with_waybill.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'auto_save_detected',
                        waybill_id: '<?php echo $waybill_id; ?>'
                    })
                });
                
                const data = await response.json();
                if (data.success) {
                    alert(data.message);
                    location.reload();
                } else {
                    alert('Error: ' + data.message);
                }
            } catch (error) {
                console.error('Error auto-saving detected invoices:', error);
                alert('Error auto-saving detected invoices');
            }
        }
        
        async function discoverFromInvoice() {
            const invoice_id = prompt('Enter Invoice ID to discover waybill associations:');
            if (!invoice_id) return;
            
            try {
                const response = await fetch('associate_invoices_with_waybill.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'discover_from_invoice',
                        invoice_id: invoice_id
                    })
                });
                
                const data = await response.json();
                if (data.success) {
                    if (data.saved_count > 0) {
                        alert(`Success! Discovered and saved ${data.saved_count} waybill associations for invoice ${invoice_id}.\n\nDiscovered waybills: ${data.discovered_waybills.join(', ')}`);
                    } else {
                        alert(`No waybill associations found for invoice ${invoice_id}`);
                    }
                } else {
                    alert('Error: ' + data.message);
                }
            } catch (error) {
                console.error('Error discovering from invoice:', error);
                alert('Error discovering from invoice');
            }
        }
        
        async function saveAssociations() {
            try {
                const response = await fetch('associate_invoices_with_waybill.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'associate_invoices',
                        waybill_id: '<?php echo $waybill_id; ?>',
                        invoice_ids: Array.from(selectedInvoices),
                        company_un_id: '<?php echo $company_un_id; ?>'
                    })
                });
                
                const data = await response.json();
                if (data.success) {
                    alert('Invoices associated successfully!');
                    location.reload();
                } else {
                    alert('Error: ' + data.message);
                }
            } catch (error) {
                console.error('Error saving associations:', error);
                alert('Error saving associations');
            }
        }
        
        function removeInvoice(invoiceId) {
            selectedInvoices.delete(invoiceId);
            // Remove from current invoices display
            // This would need a more sophisticated approach in a real implementation
        }
        
        // Initialize
        document.addEventListener('DOMContentLoaded', function() {
            loadAvailableInvoices();
            
            // Search functionality
            document.getElementById('invoice-search').addEventListener('input', function(e) {
                loadAvailableInvoices(e.target.value);
            });
        });
    </script>
</body>
</html>

<?php
}
?> 