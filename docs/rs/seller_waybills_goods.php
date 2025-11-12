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
        
        // Updated to match new simplified schema
        $sql = 'SELECT 
            ID, WAYBILL_ID, 
            -- Waybill fields
            [TYPE], [CREATE_DATE], [ACTIVATE_DATE], [BEGIN_DATE], [DELIVERY_DATE], [CLOSE_DATE],
            [TIN], [NAME], [START_ADDRESS], [END_ADDRESS], [DRIVER_TIN], [DRIVER_NAME],
            [TRANSPORT_COAST], [FULL_AMOUNT], [CAR_NUMBER], [WAYBILL_NUMBER],
            [TRAN_COST_PAYER], [TRANS_ID], [TRANS_TXT], [WAYBILL_COMMENT],
            [IS_CONFIRMED], [STATUS], [CONFIRMED_DT], [CANCEL_DATE],
            [RECEPTION_INFO], [RECEIVER_INFO], [UNIT_TXT],
            -- Goods fields (A_ID is the actual goods ID from API)
            [W_NAME], [UNIT_ID], [QUANTITY], [PRICE], [AMOUNT], [BAR_CODE], [A_ID], [VAT_TYPE],
            -- Additional field from schema
            [WAYBILL_ID] as WAYBILL_ID_FROM_API,
            -- Internal fields
            COMPANY_ID, COMPANY_TIN, COMPANY_NAME, UPDATED_AT
        FROM rs.sellers_waybill_goods WHERE 1=1';
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
        $sql .= ' ORDER BY BEGIN_DATE DESC';
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Debug logging to investigate data retrieval
        error_log('Seller waybill goods query executed successfully');
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

// --- HTML Page for Buyer Waybill Goods ---
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
    <title>გაყიდვის ზედნადებები საქონლით</title>
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
    </style>
</head>
<body>
<?php include '../menu.php'; ?>
<div class="container-fluid px-4 mt-5">
    <?php $show_dates = false; include 'waybill_filter_component.php'; ?>
    <div class="d-flex justify-content-between align-items-center mb-3">
        <h4>გაყიდვის ზედნადებები საქონლით - სრული სქემა</h4>
        <button id="exportCsvBtn" class="btn btn-success">
            <i class="fas fa-download"></i> CSV ექსპორტი
        </button>
    </div>
    <div id="waybillGrid" class="ag-theme-quartz" style="height: 70vh; width: 100%;"></div>
</div>
<script>
document.addEventListener('DOMContentLoaded', function() {
    // Updated column definitions - business critical info pinned left, then product details
    const colDefs = [
        // === PINNED LEFT: BUSINESS CRITICAL INFO ===
        { headerName: "გამყიდველი კომპანიის სახელი", field: "COMPANY_NAME", width: 200, sortable: true, filter: true, pinned: 'left' },
        { headerName: "სტატუსი", field: "STATUS", width: 140, sortable: true, filter: true, pinned: 'left',
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
        { headerName: "მყიდველი", field: "NAME", width: 250, sortable: true, filter: true, pinned: 'left' },
        { headerName: "მყიდველის საიდ. ნომერი", field: "TIN", width: 130, sortable: true, filter: true, pinned: 'left' },
        
        // === UNPINNED: PRODUCT AND WAYBILL DETAILS ===
        { headerName: "საქონლის დასახელება", field: "W_NAME", width: 600, sortable: true, filter: true },
        { headerName: "ტიპი", field: "TYPE", width: 200, sortable: true, filter: true,
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
        { headerName: "რაოდენობა", field: "QUANTITY", width: 130, sortable: true, filter: 'agNumberColumnFilter', valueFormatter: params => (params.value !== null && params.value !== undefined) ? parseFloat(params.value).toFixed(4) : '0.0000' },
        { headerName: "ფასი", field: "PRICE", width: 130, sortable: true, filter: 'agNumberColumnFilter', valueFormatter: params => (params.value !== null && params.value !== undefined) ? parseFloat(params.value).toFixed(2) : '0.00' },
        { headerName: "თანხა", field: "AMOUNT", width: 130, sortable: true, filter: 'agNumberColumnFilter', valueFormatter: params => (params.value !== null && params.value !== undefined) ? parseFloat(params.value).toFixed(2) : '0.00' },
        { headerName: "ბარკოდი", field: "BAR_CODE", width: 180, sortable: true, filter: true },
        { headerName: "ერთეული", field: "UNIT_TXT", width: 110, sortable: true, filter: true },
        { headerName: "დღგ ტიპი", field: "VAT_TYPE", width: 110, sortable: true, filter: true },
        { headerName: "დადასტურებული", field: "IS_CONFIRMED", width: 140, sortable: true, filter: true },
        
        // === WAYBILL IDENTIFIERS ===
        { headerName: "ID", field: "ID", width: 80, sortable: true, filter: 'agNumberColumnFilter' },
        { headerName: "ზედნადების ID", field: "WAYBILL_ID", width: 140, sortable: true, filter: true },
        { headerName: "ზედნადების ნომერი", field: "WAYBILL_NUMBER", width: 150, sortable: true, filter: true },
        
        // === DATES ===
        { headerName: "დაწყების თარიღი", field: "BEGIN_DATE", width: 150, sortable: true, filter: 'agDateColumnFilter' },
        { headerName: "შექმნის თარიღი", field: "CREATE_DATE", width: 150, sortable: true, filter: 'agDateColumnFilter' },
        { headerName: "მიწოდების თარიღი", field: "DELIVERY_DATE", width: 150, sortable: true, filter: 'agDateColumnFilter' },
        { headerName: "დახურვის თარიღი", field: "CLOSE_DATE", width: 150, sortable: true, filter: 'agDateColumnFilter' },
        
        // === ADDITIONAL COMPANY INFORMATION ===
        { headerName: "საწყისი მისამართი", field: "START_ADDRESS", width: 200, sortable: true, filter: true },
        { headerName: "საბოლოო მისამართი", field: "END_ADDRESS", width: 200, sortable: true, filter: true },
        
        // === TRANSPORT INFORMATION ===
        { headerName: "მძღოლის საიდ.", field: "DRIVER_TIN", width: 120, sortable: true, filter: true },
        { headerName: "მძღოლის სახელი", field: "DRIVER_NAME", width: 150, sortable: true, filter: true },
        { headerName: "მანქანის ნომერი", field: "CAR_NUMBER", width: 120, sortable: true, filter: true },
        { headerName: "ტრანსპორტირების ღირებულება", field: "TRANSPORT_COAST", width: 180, sortable: true, filter: 'agNumberColumnFilter', valueFormatter: params => (params.value !== null && params.value !== undefined) ? parseFloat(params.value).toFixed(2) : '0.00' },
        { headerName: "ტრანსპორტირების გადამხდელი", field: "TRAN_COST_PAYER", width: 180, sortable: true, filter: true },
        { headerName: "ტრანსპორტი ID", field: "TRANS_ID", width: 120, sortable: true, filter: true },
        { headerName: "ტრანსპორტის ტექსტი", field: "TRANS_TXT", width: 150, sortable: true, filter: true },
        
        // === RECEPTION INFORMATION ===
        { headerName: "მიღების ინფო", field: "RECEPTION_INFO", width: 150, sortable: true, filter: true },
        { headerName: "მიმღების ინფო", field: "RECEIVER_INFO", width: 150, sortable: true, filter: true },
        
        // === ADDITIONAL INFORMATION ===
        { headerName: "სრული თანხა", field: "FULL_AMOUNT", width: 130, sortable: true, filter: 'agNumberColumnFilter', valueFormatter: params => (params.value !== null && params.value !== undefined) ? parseFloat(params.value).toFixed(2) : '0.00' },
        { headerName: "ერთეულის ID", field: "UNIT_ID", width: 100, sortable: true, filter: true },
        { headerName: "კომენტარი", field: "WAYBILL_COMMENT", width: 200, sortable: true, filter: true },
        { headerName: "დადასტურების თარიღი", field: "CONFIRMED_DT", width: 170, sortable: true, filter: 'agDateColumnFilter' },
        { headerName: "გაუქმების თარიღი", field: "CANCEL_DATE", width: 150, sortable: true, filter: 'agDateColumnFilter' },
        { headerName: "აქტივაციის თარიღი", field: "ACTIVATE_DATE", width: 150, sortable: true, filter: 'agDateColumnFilter' },
        
        // === INTERNAL TRACKING ===
        { headerName: "კომპანიის ID", field: "COMPANY_ID", width: 120, sortable: true, filter: true },
        { headerName: "განახლების თარიღი", field: "UPDATED_AT", width: 170, sortable: true, filter: 'agDateColumnFilter' },
        { headerName: "A_ID (საქონლის ID)", field: "A_ID", width: 130, sortable: true, filter: true },
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
            onCellClicked: function(params) {
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
        autoSizeStrategy: { type: 'fitGridWidth' },
        onGridReady: function(params) {
            gridApi = params.api;
            gridApi.sizeColumnsToFit();
            // Do NOT call fetchData() here; wait for filter form submit
        }
    };
    gridApi = agGrid.createGrid(gridDiv, gridOptions);

    function fetchData() {
        if (!gridApi) return;
        gridApi.showLoadingOverlay();
        const company = document.getElementById('selectedCompaniesInput').value;
        let url = 'seller_waybills_goods.php?api=1';
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
        const pageName = 'Seller_Waybills_Goods';
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
});
</script>
</body>
</html> 