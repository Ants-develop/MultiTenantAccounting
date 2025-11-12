<?php
ini_set('display_errors', 0); // Disable for production, use logs instead
error_reporting(E_ALL);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../functions.php';
require_once __DIR__ . '/../backend/database.php';

// Log all errors to a file
ini_set('log_errors', 1);
ini_set('error_log', dirname(__DIR__) . '/logs/error.log');

if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['api'])) {
    // API mode: return JSON data for AG-Grid
    if (!isLoggedIn()) {
        http_response_code(401);
        echo json_encode(['error' => true, 'message' => 'User not logged in']);
        exit;
    }
    
    $company = $_GET['company'] ?? null;
    $begin_date_s = $_GET['begin_date_s_full'] ?? $_GET['begin_date_s'] ?? null; // Use full date if available
    $begin_date_e = $_GET['begin_date_e_full'] ?? $_GET['begin_date_e'] ?? null; // Use full date if available
    
    try {
        $pdo = getDatabaseConnection();

        if ($company && !isAdmin()) {
            $requested_companies = array_filter(array_map('trim', explode(',', $company)));
            $allowed_companies = [];
            
            $stmt_access = $pdo->prepare("
                SELECT c.IdentificationCode
                FROM [dbo].[Companies] c
                JOIN [dbo].[CompanyUsers] cu ON c.CompanyID = cu.CompanyID
                WHERE cu.UserID = ? AND c.RSVerifiedStatus = 'Verified'
            ");
            $stmt_access->execute([$_SESSION['user_id']]);
            $user_companies = $stmt_access->fetchAll(PDO::FETCH_COLUMN);

            foreach ($requested_companies as $req_comp) {
                if (in_array($req_comp, $user_companies)) {
                    $allowed_companies[] = $req_comp;
                }
            }
            if (empty($allowed_companies)) {
                echo json_encode(['success' => true, 'rowData' => [], 'count' => 0]);
                exit;
            }
            $company = implode(',', $allowed_companies);
        }
        
        $sql = 'SELECT EXTERNAL_ID, TYPE, CREATE_DATE, BUYER_TIN, BUYER_NAME, SELLER_TIN, SELLER_NAME, START_ADDRESS, END_ADDRESS, TRANSPORT_COAST, DELIVERY_DATE, STATUS, ACTIVATE_DATE, PAR_ID, FULL_AMOUNT, CAR_NUMBER, WAYBILL_NUMBER, CLOSE_DATE, RECEPTION_INFO, RECEIVER_INFO, S_USER_ID, BEGIN_DATE, COMMENT, IS_CONFIRMED, INVOICE_ID, IS_CORRECTED, IS_VAT_PAYER, PREVIOUS_IS_CORRECTED, IS_MED, TRAN_COST_PAYER, TRANS_ID, CATEGORY, CUST_STATUS, CORRECTION_DATE, FULL_AMOUNT_TXT, CHEK_BUYER_TIN, CHEK_DRIVER_TIN, BUYER_S_USER_ID, SELER_UN_ID, COMPANY_ID, COMPANY_TIN, COMPANY_NAME, UPDATED_AT, DRIVER_TIN, DRIVER_NAME FROM rs.sellers_waybills WHERE 1=1';
        $params = [];
        
        if ($company) {
            $companies = array_filter(array_map('trim', explode(',', $company)));
            if (!empty($companies)) {
                $placeholders = [];
                foreach ($companies as $i => $comp) {
                    $placeholder = ':company_' . $i;
                    $placeholders[] = $placeholder;
                    $params[$placeholder] = $comp;
                }
                $sql .= ' AND SELLER_TIN IN (' . implode(', ', $placeholders) . ')';
            }
        }
        
        if ($begin_date_s && $begin_date_e) {
            // Handle month-only inputs (YYYY-MM format)
            if (strlen($begin_date_s) === 7 && strlen($begin_date_e) === 7) {
                // Month format: convert to first and last day of month
                $begin_date_s_fmt = $begin_date_s . '-01 00:00:00'; // First day of start month
                $begin_date_e_fmt = $begin_date_e . '-' . date('t', strtotime($begin_date_e . '-01')) . ' 23:59:59'; // Last day of end month
            } else {
                // Full date format: use as is
                $begin_date_s_fmt = (new DateTime($begin_date_s))->format('Y-m-d 00:00:00');
                $begin_date_e_fmt = (new DateTime($begin_date_e))->format('Y-m-d 23:59:59');
            }
            
            $sql .= ' AND BEGIN_DATE BETWEEN :begin_date_s AND :begin_date_e';
            $params[':begin_date_s'] = $begin_date_s_fmt;
            $params[':begin_date_e'] = $begin_date_e_fmt;
            // Debug logging
            error_log('BEGIN_DATE filter: ' . $begin_date_s_fmt . ' to ' . $begin_date_e_fmt);
        }
        
        error_log('SQL: ' . $sql);
        error_log('Params: ' . print_r($params, true));
        error_log('[DEBUG] Company filter value (TINs): ' . ($company ?? 'NULL'));
        error_log('[DEBUG] Attempting to execute SQL query for seller waybills');
        
        $sql .= ' ORDER BY BEGIN_DATE DESC';
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Add invoice data to each waybill using association table
        foreach ($rows as &$row) {
            $waybill_id = $row['EXTERNAL_ID'];
            $invoice_details = [];
            
            // Get invoice IDs from waybill_invoices association table
            $stmt_invoices = $pdo->prepare("
                SELECT DISTINCT invoice_id 
                FROM rs.waybill_invoices 
                WHERE WAYBILL_EXTERNAL_ID = ? AND invoice_id IS NOT NULL AND invoice_id != ''
            ");
            $stmt_invoices->execute([$waybill_id]);
            $invoice_ids = $stmt_invoices->fetchAll(PDO::FETCH_COLUMN);
            
            // If no associations found, try direct INVOICE_ID field as fallback
            if (empty($invoice_ids) && !empty($row['INVOICE_ID'])) {
                $invoice_ids = [$row['INVOICE_ID']];
                error_log("[DEBUG] Using direct INVOICE_ID fallback for waybill $waybill_id: " . $row['INVOICE_ID']);
            }
            
            // Get invoice details
            foreach ($invoice_ids as $invoice_id) {
                // Check seller invoices first
                $stmt_detail = $pdo->prepare("
                    SELECT INVOICE_ID, F_SERIES, F_NUMBER, TANXA 
                    FROM rs.seller_invoices 
                    WHERE INVOICE_ID = ?
                ");
                $stmt_detail->execute([$invoice_id]);
                $invoice = $stmt_detail->fetch(PDO::FETCH_ASSOC);
                
                if ($invoice) {
                    $invoice_details[] = [
                        'invoice_id' => $invoice_id,
                        'series' => $invoice['F_SERIES'],
                        'number' => $invoice['F_NUMBER'],
                        'amount' => $invoice['TANXA']
                    ];
                    continue;
                }
                
                // Check buyer invoices
                $stmt_detail = $pdo->prepare("
                    SELECT INVOICE_ID, F_SERIES, F_NUMBER, TANXA 
                    FROM rs.buyer_invoices 
                    WHERE INVOICE_ID = ?
                ");
                $stmt_detail->execute([$invoice_id]);
                $invoice = $stmt_detail->fetch(PDO::FETCH_ASSOC);
                
                if ($invoice) {
                    $invoice_details[] = [
                        'invoice_id' => $invoice_id,
                        'series' => $invoice['F_SERIES'],
                        'number' => $invoice['F_NUMBER'],
                        'amount' => $invoice['TANXA']
                    ];
                }
            }
            
            // Debug logging for first few records
            if (count($rows) <= 5) {
                error_log("[DEBUG] Waybill $waybill_id - Found " . count($invoice_details) . " invoice details");
            }
            
            $row['INVOICE_IDS'] = $invoice_details;
            // Add combined series/number field for display
            $row['INVOICE_SERIES_NUMBER'] = $invoice_details;
        }

        echo json_encode([
            'success' => true,
            'rowData' => $rows,
            'count' => count($rows)
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => true, 'message' => $e->getMessage()]);
    }
    exit;
}

// --- HTML Page for Seller Waybills ---
if (!isLoggedIn()) {
    header('Location: /login.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="ka">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>გაყიდვის ზედნადებები</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/ag-grid-community@31.2.0/dist/ag-grid-community.min.js"></script>
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <link rel="stylesheet" href="../css/styles.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ag-grid-community@31.2.0/styles/ag-grid.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ag-grid-community@31.2.0/styles/ag-theme-quartz.css">
    <style>
        .ag-theme-quartz {
            --ag-header-background-color: #f8f9fa;
            --ag-header-cell-hover-background-color: #e9ecef;
        }
        
        /* Status badges */
        .status-badge {
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
        }
        
        .status-saved {
            background-color: #cce5ff;
            color: #004085;
        }
        
        .status-activated {
            background-color: #d4edda;
            color: #155724;
        }
        
        .status-completed {
            background-color: #d1ecf1;
            color: #0c5460;
        }
        
        .status-inactive {
            background-color: #e2e3e5;
            color: #383d41;
        }
        
        .status-transported {
            background-color: #fff3cd;
            color: #856404;
        }
        
        .status-deleted {
            background-color: #f8d7da;
            color: #721c24;
        }
        
        .status-cancelled {
            background-color: #6c757d;
            color: #ffffff;
        }
        
        /* Invoice cell styling */
        .invoice-cell-item {
            display: flex;
            align-items: center;
            padding: 2px 0;
            font-size: 0.9rem;
        }
        
        .invoice-cell-item a {
            color: #007bff;
            text-decoration: underline;
            font-weight: 500;
        }
        
        .invoice-cell-item a:hover {
            color: #0056b3;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <?php include '../menu.php'; ?>
    <div class="container-fluid px-4 mt-5">
        <?php $show_dates = true; include 'waybill_filter_component.php'; ?>
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h4>გაყიდვის ზედნადებები</h4>
            <button id="exportCsvBtn" class="btn btn-success btn-sm">
                <i class="fas fa-download"></i> CSV ექსპორტი
            </button>
        </div>
        
        <!-- Correction Status Legend -->
        <div class="alert alert-info mb-3">
            <h6 class="mb-2">🎨 <strong>NEW Corrections Since Last Sync:</strong></h6>
            <div class="row">
                <div class="col-md-4">
                    <span class="badge" style="background-color: #fff3cd; color: #856404; padding: 8px 12px;">
                        🟡 Yellow Background
                    </span>
                    <small class="d-block mt-1">1 NEW correction</small>
                </div>
                <div class="col-md-4">
                    <span class="badge" style="background-color: #f8d7da; color: #721c24; padding: 8px 12px;">
                        🔴 Red Background
                    </span>
                    <small class="d-block mt-1">2+ NEW corrections</small>
                </div>
                <div class="col-md-4">
                    <span class="badge" style="background-color: transparent; color: #6c757d; padding: 8px 12px; border: 1px solid #dee2e6;">
                        ⚪ No Background
                    </span>
                    <small class="d-block mt-1">No new corrections</small>
                </div>
            </div>
            <small class="text-muted mt-2">
                💡 Colors show corrections that happened AFTER your last data sync, not total correction count
            </small>
        </div>
        <div id="waybillGrid" class="ag-theme-quartz" style="height: 75vh; width: 100%;"></div>
    </div>
    
    <!-- Include the waybill detail modal -->
    <?php include 'waybill_detail_modal_comprehensive.php'; ?>
    
    <!-- Include the invoice detail modal -->
    <?php include 'invoice_detail_modal_comprehensive.php'; ?>
<script>
document.addEventListener('DOMContentLoaded', function() {
    const colDefs = [
        { 
            headerName: "Waybill ID", 
            field: "EXTERNAL_ID", 
            width: 120, 
            sortable: true, 
            filter: true,
            cellStyle: { cursor: 'pointer', textDecoration: 'underline', color: '#007bff' },
            headerTooltip: 'დააწკაპუნეთ დეტალების სანახავად'
        },
        { headerName: "ზედნადების ნომერი", field: "WAYBILL_NUMBER", sortable: true, filter: true, width: 150 },
        { headerName: "სტატუსი", field: "STATUS", sortable: true, filter: true, width: 120, 
            cellRenderer: params => {
                if (params.value === null || params.value === undefined) return '';
                const statusMap = {
                    '0': 'შენახული',
                    '1': 'აქტიური', 
                    '2': 'დასრულებული',
                    '8': 'გადამზიდავთან გადაგზავნილი',
                    '-1': 'წაშლილი',
                    '-2': 'გაუქმებული'
                };
                const statusText = statusMap[params.value.toString()] || params.value;
                
                // Define status-specific CSS classes
                const statusClassMap = {
                    '0': 'status-saved',           // შენახული - blue
                    '1': 'status-activated',        // აქტიური - green
                    '2': 'status-completed',        // დასრულებული - green
                    '8': 'status-transported',      // გადამზიდავთან გადაგზავნილი - orange
                    '-1': 'status-deleted',         // წაშლილი - red
                    '-2': 'status-cancelled'        // გაუქმებული - gray
                };
                
                const statusClass = statusClassMap[params.value.toString()] || 'status-inactive';
                return `<span class="status-badge ${statusClass}">${statusText}</span>`;
            }
        },
        { headerName: "ტიპი", field: "TYPE", sortable: true, filter: true, width: 120,
            valueFormatter: params => {
                if (params.value === null || params.value === undefined) return '';
                const typeMap = {
                    '1': 'შიდა გადაზიდვა',
                    '2': 'ტრანსპორტირებით',
                    '3': 'ტრანსპორტირების გარეშე',
                    '4': 'დისტრიბუცია',
                    '5': 'უკან დაბრუნება',
                    '6': 'ქვე-ზედნადები'
                };
                return typeMap[params.value.toString()] || params.value;
            }
        },
        { headerName: "დაწყების თარიღი", field: "BEGIN_DATE", sortable: true, filter: 'agDateColumnFilter', width: 150 },
        { headerName: "მყიდველი", field: "BUYER_NAME", sortable: true, filter: true, flex: 1 },
        { headerName: "მყიდველის საიდ.", field: "BUYER_TIN", sortable: true, filter: true, width: 120 },
        { headerName: "თანხა", field: "FULL_AMOUNT", sortable: true, filter: 'agNumberColumnFilter', width: 100, valueFormatter: params => (params.value !== null && params.value !== undefined) ? parseFloat(params.value).toFixed(2) : '0.00' },
        { 
            headerName: "Invoice ID", 
            field: "INVOICE_IDS", 
            width: 200, 
            sortable: false, 
            filter: false,
            cellRenderer: params => {
                if (!params.value || params.value.length === 0) {
                    return '<span class="text-muted">No invoices</span>';
                }
                
                let html = '';
                params.value.forEach((invoice, index) => {
                    // Use invoice ID directly instead of series + number
                    const invoiceLabel = `Invoice ${invoice.invoice_id}`;
                    const amount = invoice.amount ? `(${invoice.amount} ₾)` : '';
                    
                    html += `
                        <div class="invoice-cell-item">
                            <a href="#" class="text-primary text-decoration-underline fw-medium" 
                               onclick="showInvoiceDetails('${invoice.invoice_id}'); return false;">
                                ${invoiceLabel}
                            </a>
                            <span class="text-muted ms-2">${amount}</span>
                        </div>
                    `;
                });
                return html;
            }
        },
        { 
            headerName: "ანგარიშფაქტურის ნომერი", 
            field: "INVOICE_SERIES_NUMBER", 
            width: 180, 
            sortable: false, 
            filter: false,
            valueGetter: params => {
                // This provides the actual value for copy/export operations
                if (!params.data.INVOICE_SERIES_NUMBER || !Array.isArray(params.data.INVOICE_SERIES_NUMBER) || params.data.INVOICE_SERIES_NUMBER.length === 0) {
                    return 'No invoices';
                }
                
                return params.data.INVOICE_SERIES_NUMBER.map(invoice => {
                    const series = invoice.series || '';
                    const number = invoice.number || '';
                    return `${series} ${number}`.trim();
                }).join('; ');
            },
            valueFormatter: params => {
                // This affects only the visual display
                if (!params.value || params.value === 'No invoices') {
                    return 'No invoices';
                }
                return params.value;
            }
        },
        { headerName: "გამყიდველი", field: "SELLER_NAME", sortable: true, filter: true, flex: 1 },
        { headerName: "გამყიდველის საიდ.", field: "SELLER_TIN", sortable: true, filter: true, width: 120 },
        { headerName: "მანქანის ნომერი", field: "CAR_NUMBER", sortable: true, filter: true, width: 120 },
        { headerName: "მძღოლი", field: "DRIVER_NAME", sortable: true, filter: true, width: 150 },
        { headerName: "დაწყების მისამართი", field: "START_ADDRESS", sortable: true, filter: true, flex: 1 },
        { headerName: "დასრულების მისამართი", field: "END_ADDRESS", sortable: true, filter: true, flex: 1 },
        { headerName: "შექმნის თარიღი", field: "CREATE_DATE", sortable: true, filter: 'agDateColumnFilter', width: 150 },
        { headerName: "მიწოდების თარიღი", field: "DELIVERY_DATE", sortable: true, filter: 'agDateColumnFilter', width: 150 },
        { 
            headerName: "VAT გადამხდელი", 
            field: "IS_VAT_PAYER", 
            width: 80, 
            sortable: true, 
            filter: true,
            valueFormatter: params => {
                if (params.value === null || params.value === undefined) return 'Unknown';
                return params.value == 1 ? 'Yes' : 'No';
            },
            cellRenderer: params => {
                if (params.value === null || params.value === undefined) return '<div style="text-align: center;"><span class="badge bg-secondary" style="font-size: 12px; padding: 6px 10px;">Unknown</span></div>';
                if (params.value == 1) {
                    return '<div style="text-align: center;"><span class="badge bg-success" style="font-size: 12px; padding: 6px 10px;">Yes</span></div>';
                } else {
                    return '<div style="text-align: center;"><span class="badge bg-danger" style="font-size: 12px; padding: 6px 10px;">No</span></div>';
                }
            }
        },
        { headerName: "ტრანსპორტის ღირებულება", field: "TRANSPORT_COAST", sortable: true, filter: 'agNumberColumnFilter', width: 120, valueFormatter: params => (params.value !== null && params.value !== undefined) ? parseFloat(params.value).toFixed(2) : '0.00' },
        { headerName: "დახურვის თარიღი", field: "CLOSE_DATE", sortable: true, filter: 'agDateColumnFilter', width: 150 },
        { headerName: "აქტივაციის თარიღი", field: "ACTIVATE_DATE", sortable: true, filter: 'agDateColumnFilter', width: 150 },
        { headerName: "მძღოლის საიდ.", field: "DRIVER_TIN", sortable: true, filter: true, width: 120 },
        { headerName: "კომენტარი", field: "COMMENT", sortable: true, filter: true, flex: 1 },
        { headerName: "PAR ID", field: "PAR_ID", sortable: true, filter: true, width: 120 },
        { headerName: "დადასტურებული", field: "IS_CONFIRMED", sortable: true, filter: true, width: 120,
            valueFormatter: params => {
                if (params.value === null || params.value === undefined) return '';
                return params.value == 1 ? 'დიახ' : 'არა';
            }
        },
        { headerName: "შესწორებული", field: "IS_CORRECTED", sortable: true, filter: true, width: 120,
            valueFormatter: params => {
                if (params.value === null || params.value === undefined) return '';
                return params.value == 1 ? 'დიახ' : 'არა';
            }
        },
        { headerName: "VAT გადამხდელი", field: "IS_VAT_PAYER", sortable: true, filter: true, width: 120,
            valueFormatter: params => {
                if (params.value === null || params.value === undefined) return '';
                return params.value == 1 ? 'დიახ' : 'არა';
            }
        },
        { headerName: "სამედიცინო", field: "IS_MED", sortable: true, filter: true, width: 120,
            valueFormatter: params => {
                if (params.value === null || params.value === undefined) return '';
                return params.value == 1 ? 'დიახ' : 'არა';
            }
        },
        { headerName: "ტრანსპორტის გადამხდელი", field: "TRAN_COST_PAYER", sortable: true, filter: true, width: 150 },
        { headerName: "ტრანზაქციის ID", field: "TRANS_ID", sortable: true, filter: true, width: 120 },
        { headerName: "კატეგორია", field: "CATEGORY", sortable: true, filter: true, width: 120 },
        { headerName: "მომხმარებლის სტატუსი", field: "CUST_STATUS", sortable: true, filter: true, width: 150 },
        { headerName: "შესწორების თარიღი", field: "CORRECTION_DATE", sortable: true, filter: 'agDateColumnFilter', width: 150 },
        { headerName: "სრული თანხა (ტექსტი)", field: "FULL_AMOUNT_TXT", sortable: true, filter: true, width: 150 },
        { headerName: "მყიდველის შემოწმება", field: "CHEK_BUYER_TIN", sortable: true, filter: true, width: 150 },
        { headerName: "მძღოლის შემოწმება", field: "CHEK_DRIVER_TIN", sortable: true, filter: true, width: 150 },
        { headerName: "მყიდველის S User ID", field: "BUYER_S_USER_ID", sortable: true, filter: true, width: 150 },
        { headerName: "გამყიდველის UN ID", field: "SELER_UN_ID", sortable: true, filter: true, width: 150 }, // Note: API field has typo 'SELER' instead of 'SELLER'
        { headerName: "მიღების ინფო", field: "RECEPTION_INFO", sortable: true, filter: true, flex: 1 },
        { headerName: "მიმღების ინფო", field: "RECEIVER_INFO", sortable: true, filter: true, flex: 1 },
        { headerName: "S User ID", field: "S_USER_ID", sortable: true, filter: true, width: 120 },
        { headerName: "კომპანიის ID", field: "COMPANY_ID", sortable: true, filter: true, width: 120 },
        { headerName: "კომპანიის TIN", field: "COMPANY_TIN", sortable: true, filter: true, width: 120 },
        { headerName: "კომპანიის სახელი", field: "COMPANY_NAME", sortable: true, filter: true, flex: 1 },
        { headerName: "განახლების თარიღი", field: "UPDATED_AT", sortable: true, filter: 'agDateColumnFilter', width: 150 }
    ];
    
    const gridDiv = document.getElementById('waybillGrid');
    let gridApi = null;
    const gridOptions = {
        columnDefs: colDefs,
        defaultColDef: {
            sortable: true,
            filter: true,
            resizable: true,
            flex: 1,
            minWidth: 120,
        },
        // Row styling based on IS_CORRECTED field - highlighting NEW corrections since last sync
        getRowStyle: function(params) {
            const isCorrected = params.data.IS_CORRECTED;
            const previousCorrected = params.data.PREVIOUS_IS_CORRECTED; // This will be set during sync
            
            if (isCorrected && isCorrected !== '0' && isCorrected !== '') {
                const currentCount = parseInt(isCorrected) || 0;
                const previousCount = parseInt(previousCorrected) || 0;
                
                // Calculate how many NEW corrections happened since last sync
                const newCorrections = currentCount - previousCount;
                
                if (newCorrections > 0) {
                    if (newCorrections === 1) {
                        return { backgroundColor: '#fff3cd', fontWeight: 'bold' }; // Yellow for 1 new correction
                    } else if (newCorrections >= 2) {
                        return { backgroundColor: '#f8d7da', fontWeight: 'bold' }; // Red for 2+ new corrections
                    }
                }
            }
            return null; // Default styling for records with no new corrections
        },
        onCellClicked: function(params) {
            // If clicking on the waybill ID column, show details modal
            if (params.column.colId === 'EXTERNAL_ID' && params.value) {
                waybillDetailModal.show(params.value, 'seller');
                return;
            }

            // If clicking on the Invoice ID column, do nothing (links have their own handlers)
            if (params.column.colId === 'INVOICE_IDS') {
                return;
            }
            
            // Copy cell value to clipboard for other columns
            if (params.value !== null && params.value !== undefined) {
                navigator.clipboard.writeText(params.value.toString()).then(function() {
                    // Show a brief visual feedback
                    const cellElement = params.event.target;
                    const originalBackground = cellElement.style.backgroundColor;
                    cellElement.style.backgroundColor = '#d4edda';
                    cellElement.style.transition = 'background-color 0.3s';
                    
                    setTimeout(function() {
                        cellElement.style.backgroundColor = originalBackground;
                    }, 300);
                }).catch(function(err) {
                    console.error('Failed to copy: ', err);
                });
            }
        },
        pagination: true,
        paginationPageSize: 100,
        paginationPageSizeSelector: [100, 200, 500, 1000],
        autoSizeStrategy: { type: 'fitGridWidth' },
        onGridReady: function(params) {
            gridApi = params.api;
            gridApi.sizeColumnsToFit();
            // Do NOT call fetchData() here; wait for filter form submit
        }
    };
    gridApi = agGrid.createGrid(gridDiv, gridOptions);

    // CSV Export functionality
    document.getElementById('exportCsvBtn').addEventListener('click', function() {
        const pageName = 'Seller_Waybills';
        const exportDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        const fileName = `${pageName}_${exportDate}.csv`;
        
        const exportParams = {
            fileName: fileName,
            processCellCallback: function(params) {
                // Handle any special formatting if needed
                return params.value;
            }
        };
        
        gridApi.exportDataAsCsv(exportParams);
    });

    function fetchData() {
        if (!gridApi) return;
        gridApi.showLoadingOverlay();
        const company = document.getElementById('selectedCompaniesInput').value;
        const begin_date_s = document.getElementById('begin_date_s')?.value;
        const begin_date_e = document.getElementById('begin_date_e')?.value;
        const begin_date_s_full = document.getElementById('begin_date_s_full')?.value;
        const begin_date_e_full = document.getElementById('begin_date_e_full')?.value;
        
        let url = 'seller_waybills.php?api=1';
        if (company) url += '&company=' + encodeURIComponent(company);
        // Send both month inputs and full date inputs for backward compatibility
        if (begin_date_s) url += '&begin_date_s=' + encodeURIComponent(begin_date_s);
        if (begin_date_e) url += '&begin_date_e=' + encodeURIComponent(begin_date_e);
        if (begin_date_s_full) url += '&begin_date_s_full=' + encodeURIComponent(begin_date_s_full);
        if (begin_date_e_full) url += '&begin_date_e_full=' + encodeURIComponent(begin_date_e_full);
        fetch(url)
            .then(response => response.json())
            .then(result => {
                if (result.success && result.rowData) {
                    gridApi.setGridOption('rowData', result.rowData);
                    if (result.rowData.length === 0) gridApi.showNoRowsOverlay();
                } else {
                    gridApi.setGridOption('rowData', []);
                    gridApi.showNoRowsOverlay();
                }
            })
            .catch(() => {
                gridApi.setGridOption('rowData', []);
                gridApi.showNoRowsOverlay();
            });
    }

    document.getElementById('filterForm').addEventListener('submit', function(e) {
        e.preventDefault();
        fetchData();
    });



});
</script>
</body>
</html> 