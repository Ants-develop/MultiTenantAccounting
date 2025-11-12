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
    
    try {
        $pdo = getDatabaseConnection();

        if ($company && !isAdmin()) {
            $requested_companies = array_filter(array_map('trim', explode(',', $company)));
            $allowed_companies = [];
            
            $stmt_access = $pdo->prepare("
                SELECT c.CompanyName
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
        
        // Query only sellers invoice goods
        $sql = 'SELECT 
            ID, INVOICE_ID,
            -- Invoice goods fields (from get_invoice_desc API)
            [AKCIS_ID], [AQCIZI_AMOUNT], [DRG_AMOUNT], [FULL_AMOUNT], 
            [GOODS], [G_NUMBER], [G_UNIT], [ID_GOODS], [INV_ID], 
            [SDRG_AMOUNT], [VAT_TYPE], [WAYBILL_ID],
            -- Invoice number fields
            [F_SERIES], [F_NUMBER],
            -- Internal tracking fields
            COMPANY_ID, COMPANY_TIN, COMPANY_NAME, UPDATED_AT
        FROM rs.sellers_invoice_goods WHERE 1=1';
        $params = [];
        
        if ($company) {
            // Handle multiple companies (comma-separated)
            $companies = array_filter(array_map('trim', explode(',', $company)));
            if (!empty($companies)) {
                if (count($companies) === 1) {
                    $sql .= ' AND COMPANY_TIN = :company';
                    $params[':company'] = $companies[0];
                } else {
                    $placeholders = [];
                    foreach ($companies as $i => $comp) {
                        $placeholder = ':company_' . $i;
                        $placeholders[] = $placeholder;
                        $params[$placeholder] = $comp;
                    }
                    $sql .= ' AND COMPANY_TIN IN (' . implode(', ', $placeholders) . ')';
                }
            }
        }

        error_log('SQL: ' . $sql);
        error_log('Params: ' . print_r($params, true));
        $sql .= ' ORDER BY UPDATED_AT DESC';
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Debug logging to investigate data retrieval
        error_log('Sellers invoice goods query executed successfully');
        error_log('Total rows returned: ' . count($rows));
        if (!empty($rows)) {
            error_log('First row sample: ' . print_r($rows[0], true));
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

// --- HTML Page for Sellers Invoice Goods ---
if (!isLoggedIn()) {
    header('Location: ../users/auth/login.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="ka">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>გაყიდული ანგარიშ-ფაქტურების საქონელი</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
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
        
        /* Amount highlighting */
        .amount-positive {
            background-color: #d4edda;
            color: #155724;
            font-weight: 600;
        }
        
        .amount-zero {
            background-color: #fff3cd;
            color: #856404;
        }
        
        .vat-badge {
            padding: 2px 6px;
            border-radius: 8px;
            font-size: 11px;
            font-weight: 600;
        }
        
        .vat-standard {
            background-color: #d1ecf1;
            color: #0c5460;
        }
        
        .vat-exempt {
            background-color: #f8d7da;
            color: #721c24;
        }
        
        .vat-zero {
            background-color: #e2e3e5;
            color: #383d41;
        }
        
        .seller-badge {
            background-color: #007bff;
            color: white;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
        }
    </style>
</head>
<body>
<?php include '../menu.php'; ?>
<div class="container-fluid px-4 mt-5">
    <?php $show_dates = false; include 'waybill_filter_component.php'; ?>
    <div class="d-flex justify-content-between align-items-center mb-3">
        <h4>
            <span class="seller-badge">გამყიდველი</span>
            გაყიდული ანგარიშ-ფაქტურების საქონელი
        </h4>
        <div>
            <a href="buyers_invoice_goods.php" class="btn btn-outline-success me-2">
                <i class="fas fa-shopping-cart"></i> შესყიდული
            </a>
            <a href="invoice_goods.php" class="btn btn-outline-info me-2">
                <i class="fas fa-list"></i> ყველა
            </a>
            <button id="exportCsvBtn" class="btn btn-success">
                <i class="fas fa-download"></i> CSV ექსპორტი
            </button>
        </div>
    </div>
    <div id="sellersInvoiceGoodsGrid" class="ag-theme-quartz" style="height: 70vh; width: 100%;"></div>
</div>

<!-- Include the invoice detail modal -->
<?php include 'invoice_detail_modal_comprehensive.php'; ?>

<!-- Include the waybill detail modal -->
<?php include 'waybill_detail_modal_comprehensive.php'; ?>
<script>
document.addEventListener('DOMContentLoaded', function() {
    // Column definitions for sellers invoice goods
    const colDefs = [
        // === PINNED LEFT: BUSINESS CRITICAL INFO ===
        { headerName: "ანგარიშ-ფაქტურის ID", field: "INVOICE_ID", width: 150, sortable: true, filter: true, pinned: 'left' },
        { headerName: "კომპანიის სახელი", field: "COMPANY_NAME", width: 200, sortable: true, filter: true, pinned: 'left' },
        { headerName: "კომპანიის საიდ.", field: "COMPANY_TIN", width: 130, sortable: true, filter: true, pinned: 'left' },
        { headerName: "ანგარიშ-ფაქტურის ნომერი", field: "F_SERIES", width: 180, sortable: true, filter: true, pinned: 'left',
            cellRenderer: params => {
                const series = params.data?.F_SERIES || '';
                const number = params.data?.F_NUMBER || '';
                const displayValue = series && number ? `${series} ${number}` : (series || number || '');
                
                if (!displayValue) return '';
                
                const link = document.createElement('a');
                link.href = '#';
                link.innerText = displayValue;
                link.style.textDecoration = 'none';
                link.style.color = '#007bff';
                link.onclick = (e) => {
                    e.preventDefault();
                    showInvoiceDetails(params.data?.INVOICE_ID);
                };
                return link;
            }
        },
        
        // === UNPINNED: PRODUCT DETAILS ===
        { headerName: "საქონლის დასახელება", field: "GOODS", width: 400, sortable: true, filter: true },
        { headerName: "რაოდენობა", field: "G_NUMBER", width: 120, sortable: true, filter: 'agNumberColumnFilter', 
            valueFormatter: params => (params.value !== null && params.value !== undefined) ? parseFloat(params.value).toFixed(4) : '0.0000' },
        { headerName: "საქონლის ერთეული", field: "G_UNIT", width: 150, sortable: true, filter: true },
        
        // === AMOUNTS ===
        { headerName: "თანხა დღგ-ს და აქციზის ჩათვლით", field: "FULL_AMOUNT", width: 180, sortable: true, filter: 'agNumberColumnFilter', 
            valueFormatter: params => (params.value !== null && params.value !== undefined) ? parseFloat(params.value).toFixed(2) + ' ₾' : '0.00 ₾',
            cellClass: params => {
                if (params.value > 0) return 'amount-positive';
                if (params.value === 0) return 'amount-zero';
                return '';
            }
        },
        { headerName: "დღგ", field: "DRG_AMOUNT", width: 120, sortable: true, filter: 'agNumberColumnFilter', 
            valueFormatter: params => (params.value !== null && params.value !== undefined) ? parseFloat(params.value).toFixed(2) + ' ₾' : '0.00 ₾' },
        { headerName: "აქციზი", field: "AQCIZI_AMOUNT", width: 120, sortable: true, filter: 'agNumberColumnFilter', 
            valueFormatter: params => (params.value !== null && params.value !== undefined) ? parseFloat(params.value).toFixed(2) + ' ₾' : '0.00 ₾' },
        { headerName: "დღგ სტრიქონული ტიპი", field: "SDRG_AMOUNT", width: 150, sortable: true, filter: 'agNumberColumnFilter', 
            valueFormatter: params => (params.value !== null && params.value !== undefined) ? parseFloat(params.value).toFixed(2) + ' ₾' : '0.00 ₾' },
        
        // === TAX AND CODES ===
        { headerName: "დღგ ტიპი", field: "VAT_TYPE", width: 110, sortable: true, filter: true },
        { headerName: "აქციზური საქონლის კოდი", field: "AKCIS_ID", width: 150, sortable: true, filter: true },
        
        // === IDENTIFIERS ===
        { headerName: "საქონლის უნიკალური ნომერი", field: "ID_GOODS", width: 160, sortable: true, filter: true },
        { headerName: "ანგარიშ-ფაქტურის უნიკალური ნომერი", field: "INV_ID", width: 180, sortable: true, filter: true },
        { headerName: "ზედნადების ID", field: "WAYBILL_ID", width: 130, sortable: true, filter: true },
        
        // === INTERNAL TRACKING ===
        { headerName: "ID", field: "ID", width: 80, sortable: true, filter: 'agNumberColumnFilter' },
        { headerName: "კომპანიის ID", field: "COMPANY_ID", width: 120, sortable: true, filter: true },
        { headerName: "განახლების თარიღი", field: "UPDATED_AT", width: 170, sortable: true, filter: 'agDateColumnFilter' },
    ];
    
    const gridDiv = document.getElementById('sellersInvoiceGoodsGrid');
    let gridApi = null;
    const gridOptions = {
        columnDefs: colDefs,
        defaultColDef: {
            sortable: true,
            filter: true,
            resizable: true,
            flex: 1,
            minWidth: 120,
            onCellClicked: function(params) {
                // Do not copy if the cell is a link column (ID or invoice number)
                if (params.column.colId === 'INVOICE_ID' || params.column.colId === 'F_SERIES') {
                    return;
                }
                // Copy cell value to clipboard
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
            }
        },
        pagination: true,
        paginationPageSize: 100,
        paginationPageSizeSelector: [100, 200, 500, 1000],
        autoSizeStrategy: { 
            type: 'fitGridWidth',
            defaultMinWidth: 100,
            columnLimits: [
                { colId: 'COMPANY_NAME', minWidth: 150 },
                { colId: 'COMPANY_TIN', minWidth: 120 },
                { colId: 'INVOICE_ID', minWidth: 130 },
                { colId: 'F_SERIES', minWidth: 160 },
                { colId: 'GOODS', minWidth: 200 },
                { colId: 'G_NUMBER', minWidth: 100 },
                { colId: 'G_UNIT', minWidth: 120 },
                { colId: 'FULL_AMOUNT', minWidth: 180 },
                { colId: 'DRG_AMOUNT', minWidth: 100 },
                { colId: 'AQCIZI_AMOUNT', minWidth: 100 },
                { colId: 'SDRG_AMOUNT', minWidth: 150 },
                { colId: 'VAT_TYPE', minWidth: 110 },
                { colId: 'AKCIS_ID', minWidth: 150 },
                { colId: 'ID_GOODS', minWidth: 160 },
                { colId: 'INV_ID', minWidth: 180 },
                { colId: 'WAYBILL_ID', minWidth: 150 },
                { colId: 'UPDATED_AT', minWidth: 150 }
            ]
        },
        onGridReady: function(params) {
            gridApi = params.api;
            // Auto-size columns to fit content
            gridApi.autoSizeAllColumns();
            // Do NOT call fetchData() here; wait for filter form submit
        }
    };
    gridApi = agGrid.createGrid(gridDiv, gridOptions);

    function fetchData() {
        if (!gridApi) return;
        gridApi.showLoadingOverlay();
        const company = document.getElementById('selectedCompaniesInput').value;
        let url = 'sellers_invoice_goods.php?api=1';
        if (company) url += '&company=' + encodeURIComponent(company);
        fetch(url)
            .then(response => response.json())
            .then(result => {
                console.log('[DEBUG] API response:', result); // <-- Debug log
                if (result.success && result.rowData) {
                    gridApi.setGridOption('rowData', result.rowData);
                    if (result.rowData.length === 0) gridApi.showNoRowsOverlay();
                } else {
                    gridApi.setGridOption('rowData', []);
                    gridApi.showNoRowsOverlay();
                }
            })
            .catch((err) => {
                console.error('[DEBUG] API fetch error:', err);
                gridApi.setGridOption('rowData', []);
                gridApi.showNoRowsOverlay();
            });
    }

    document.getElementById('filterForm').addEventListener('submit', function(e) {
        e.preventDefault();
        fetchData();
    });

    // CSV Export functionality
    document.getElementById('exportCsvBtn').addEventListener('click', function() {
        const pageName = 'Sellers_Invoice_Goods';
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

    // Function to show invoice details modal
    function showInvoiceDetails(invoiceId) {
        if (!invoiceId) {
            console.error('No invoice ID provided');
            return;
        }
        
        // Show loading state
        const modal = document.getElementById('invoiceDetailModal');
        const modalContent = document.getElementById('invoiceDetailContent');
        const modalTitle = document.getElementById('invoiceDetailModalLabel');
        
        if (!modal || !modalContent || !modalTitle) {
            console.error('Modal elements not found');
            return;
        }
        
        modalTitle.innerHTML = `<i class="bi bi-receipt me-2"></i>ინვოისის დეტალები - ${invoiceId}`;
        modalContent.innerHTML = '<div class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">იტვირთება...</span></div><p class="mt-2">იტვირთება ინვოისის დეტალები...</p></div>';
        
        // Show the modal
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
        
        // Fetch invoice details using the same API pattern as the modal
        fetch(`get_invoice_details_rs.php?api=1&invoice_id=${encodeURIComponent(invoiceId)}&debug=1`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.success && data.invoice) {
                    // Use the modal's rendering function if available
                    if (typeof window.invoiceDetailModal !== 'undefined') {
                        window.invoiceDetailModal.renderInvoiceDetails(data);
                    } else {
                        // Fallback: show basic invoice info
                        modalContent.innerHTML = `
                            <div class="alert alert-info">
                                <h6>Invoice Details for ID: ${invoiceId}</h6>
                                <p>Invoice Number: ${data.invoice.F_SERIES || ''} ${data.invoice.F_NUMBER || ''}</p>
                                <p>Status: ${data.invoice.STATUS || 'N/A'}</p>
                                <p>Amount: ${data.invoice.TANXA || 'N/A'}</p>
                            </div>
                        `;
                    }
                } else {
                    modalContent.innerHTML = `<div class="alert alert-danger">Error: ${data.message || 'Failed to load invoice details'}</div>`;
                }
            })
            .catch(error => {
                console.error('Error fetching invoice details:', error);
                modalContent.innerHTML = `<div class="alert alert-danger">Error loading invoice details: ${error.message}</div>`;
            });
    }
});
</script>
</body>
</html>
