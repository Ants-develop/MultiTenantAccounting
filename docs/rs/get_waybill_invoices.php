<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../functions.php';
require_once __DIR__ . '/../backend/database.php';

/**
 * Get all invoice IDs associated with a waybill
 */
function getWaybillInvoiceIds($waybill_id) {
    try {
        $pdo = getDatabaseConnection();
        $invoice_ids = [];
        
        // Check sellers_waybills table
        $stmt = $pdo->prepare("SELECT INVOICE_ID FROM rs.sellers_waybills WHERE EXTERNAL_ID = ? AND INVOICE_ID IS NOT NULL AND INVOICE_ID != ''");
        $stmt->execute([$waybill_id]);
        $seller_invoices = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        // Check buyers_waybills table
        $stmt = $pdo->prepare("SELECT INVOICE_ID FROM rs.buyers_waybills WHERE EXTERNAL_ID = ? AND INVOICE_ID IS NOT NULL AND INVOICE_ID != ''");
        $stmt->execute([$waybill_id]);
        $buyer_invoices = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        // Check waybill_invoices table for additional invoice relationships
        $stmt = $pdo->prepare("SELECT DISTINCT INVOICE_ID FROM rs.waybill_invoices WHERE WAYBILL_EXTERNAL_ID = ? AND INVOICE_ID IS NOT NULL AND INVOICE_ID != ''");
        $stmt->execute([$waybill_id]);
        $waybill_invoices = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        // Combine all invoice IDs and remove duplicates
        $all_invoices = array_merge($seller_invoices, $buyer_invoices, $waybill_invoices);
        $invoice_ids = array_unique(array_filter($all_invoices));
        
        error_log("DEBUG: Found invoice IDs for waybill $waybill_id: " . json_encode($invoice_ids));
        
        return $invoice_ids;
        
    } catch (Exception $e) {
        error_log("Error getting invoice IDs for waybill $waybill_id: " . $e->getMessage());
        return [];
    }
}

/**
 * Get detailed invoice information for waybill
 */
function getWaybillInvoiceDetails($waybill_id) {
    try {
        $pdo = getDatabaseConnection();
        $invoice_details = [];
        
        $invoice_ids = getWaybillInvoiceIds($waybill_id);
        
        foreach ($invoice_ids as $invoice_id) {
            error_log("DEBUG: Processing invoice ID: $invoice_id");
            
            // Get seller invoice details
            $stmt = $pdo->prepare("SELECT INVOICE_ID, F_SERIES, F_NUMBER, OPERATION_DT, TANXA, VAT, COMPANY_NAME FROM rs.seller_invoices WHERE INVOICE_ID = ?");
            $stmt->execute([$invoice_id]);
            $seller_invoice = $stmt->fetch(PDO::FETCH_ASSOC);
            
            error_log("DEBUG: Seller invoice query result: " . ($seller_invoice ? 'found' : 'not found'));
            
            if ($seller_invoice) {
                $invoice_details[] = [
                    'invoice_id' => $invoice_id,
                    'type' => 'seller',
                    'series' => $seller_invoice['F_SERIES'],
                    'number' => $seller_invoice['F_NUMBER'],
                    'operation_date' => $seller_invoice['OPERATION_DT'],
                    'amount' => $seller_invoice['TANXA'],
                    'vat' => $seller_invoice['VAT'],
                    'company_name' => $seller_invoice['COMPANY_NAME']
                ];
                continue;
            }
            
            // Get buyer invoice details
            $stmt = $pdo->prepare("SELECT INVOICE_ID, F_SERIES, F_NUMBER, OPERATION_DT, TANXA, VAT, COMPANY_NAME FROM rs.buyer_invoices WHERE INVOICE_ID = ?");
            $stmt->execute([$invoice_id]);
            $buyer_invoice = $stmt->fetch(PDO::FETCH_ASSOC);
            
            error_log("DEBUG: Buyer invoice query result: " . ($buyer_invoice ? 'found' : 'not found'));
            
            if ($buyer_invoice) {
                $invoice_details[] = [
                    'invoice_id' => $invoice_id,
                    'type' => 'buyer',
                    'series' => $buyer_invoice['F_SERIES'],
                    'number' => $buyer_invoice['F_NUMBER'],
                    'operation_date' => $buyer_invoice['OPERATION_DT'],
                    'amount' => $buyer_invoice['TANXA'],
                    'vat' => $buyer_invoice['VAT'],
                    'company_name' => $buyer_invoice['COMPANY_NAME']
                ];
            }
        }
        
        return $invoice_details;
        
    } catch (Exception $e) {
        error_log("Error getting invoice details for waybill $waybill_id: " . $e->getMessage());
        return [];
    }
}

// Handle API requests
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['api'])) {
    header('Content-Type: application/json; charset=utf-8');
    
    $waybill_id = $_GET['waybill_id'] ?? null;
    $action = $_GET['action'] ?? 'get_invoices';
    
    if (!$waybill_id) {
        http_response_code(400);
        echo json_encode(['error' => true, 'message' => 'Waybill ID is required']);
        exit;
    }
    
    try {
        switch ($action) {
            case 'get_invoices':
                $invoice_ids = getWaybillInvoiceIds($waybill_id);
                echo json_encode([
                    'success' => true,
                    'waybill_id' => $waybill_id,
                    'invoice_ids' => $invoice_ids,
                    'count' => count($invoice_ids)
                ]);
                break;
                
            case 'get_details':
                $invoice_details = getWaybillInvoiceDetails($waybill_id);
                echo json_encode([
                    'success' => true,
                    'waybill_id' => $waybill_id,
                    'invoices' => $invoice_details,
                    'count' => count($invoice_details)
                ]);
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
?> 