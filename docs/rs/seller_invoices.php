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
    $begin_date_s = $_GET['begin_date_s'] ?? null;
    $begin_date_e = $_GET['begin_date_e'] ?? null;
    
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
        
        $sql = 'SELECT INVOICE_ID, F_SERIES, F_NUMBER, OPERATION_DT, REG_DT, SELLER_UN_ID, BUYER_UN_ID, STATUS, SEQ_NUM_S, SEQ_NUM_B, S_USER_ID, K_ID, WAS_REF, SA_IDENT_NO, ORG_NAME, NOTES, TANXA, VAT, AGREE_DATE, COMPANY_NAME, COMPANY_TIN, OVERHEAD_NO, OVERHEAD_DT, R_UN_ID, DEC_STATUS, DECL_DATE FROM rs.seller_invoices WHERE 1=1';
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
                $sql .= ' AND COMPANY_TIN IN (' . implode(', ', $placeholders) . ')';
            }
        }
        
        if ($begin_date_s && $begin_date_e) {
            // Format dates to include full end day
            $begin_date_s_fmt = (new DateTime($begin_date_s))->format('Y-m-d 00:00:00');
            $begin_date_e_fmt = (new DateTime($begin_date_e))->format('Y-m-d 23:59:59');
            $sql .= ' AND OPERATION_DT BETWEEN :begin_date_s AND :begin_date_e';
            $params[':begin_date_s'] = $begin_date_s_fmt;
            $params[':begin_date_e'] = $begin_date_e_fmt;
            // Debug logging
            error_log('operation_dt filter: ' . $begin_date_s_fmt . ' to ' . $begin_date_e_fmt);
        }
        
        error_log('SQL: ' . $sql);
        error_log('Params: ' . print_r($params, true));
        
        $sql .= ' ORDER BY OPERATION_DT DESC';
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Add a new combined field for series and number
        foreach ($rows as &$row) {
            $row['SERIES_NUMBER'] = trim(($row['F_SERIES'] ?? '') . ' ' . ($row['F_NUMBER'] ?? ''));
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

// --- HTML Page for Seller Invoices ---
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
    <title>გაყიდვის ინვოისები</title>
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
        
        .status-sent {
            background-color: #fff3cd;
            color: #856404;
        }
        
        .status-confirmed {
            background-color: #d4edda;
            color: #155724;
        }
        
        .status-corrected1 {
            background-color: #e2d9f3;
            color: #6f42c1;
        }
        
        .status-correctable {
            background-color: #fff3cd;
            color: #856404;
        }
        
        .status-correctable-sent {
            background-color: #f8d7da;
            color: #721c24;
        }
        
        .status-sent-cancelled {
            background-color: #f8d7da;
            color: #721c24;
        }
        
        .status-cancellation-confirmed {
            background-color: #f8d7da;
            color: #721c24;
        }
        
        .status-corrected-confirmed {
            background-color: #d4edda;
            color: #155724;
        }
        
        .status-deleted {
            background-color: #f8d7da;
            color: #721c24;
        }
        
        .status-inactive {
            background-color: #e2e3e5;
            color: #383d41;
        }
    </style>
</head>
<body>
    <?php include '../menu.php'; ?>
    <div class="container-fluid px-4 mt-5">
        <?php $show_dates = true; include 'waybill_filter_component.php'; ?>
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h4>გაყიდვის ინვოისები</h4>
            <button id="exportCsvBtn" class="btn btn-success btn-sm">
                <i class="fas fa-download"></i> CSV ექსპორტი
            </button>
        </div>
        <div id="invoiceGrid" class="ag-theme-quartz" style="height: 75vh; width: 100%;"></div>
    </div>
    
    <!-- Include the invoice detail modal -->
    <?php include 'invoice_detail_modal_comprehensive.php'; ?>
    
    <!-- Include the waybill detail modal -->
    <?php include 'waybill_detail_modal_comprehensive.php'; ?>
<script>
document.addEventListener('DOMContentLoaded', function() {
    const colDefs = [
        { 
            headerName: "ID", 
            field: "INVOICE_ID", 
            width: 120, 
            sortable: true, 
            filter: true,
            cellRenderer: params => {
                if (!params.value) return '';
                const link = document.createElement('a');
                link.href = '#';
                link.innerText = params.value;
                link.onclick = (e) => {
                    e.preventDefault();
                    showInvoiceDetails(params.value);
                };
                return link;
            }
        },
        { headerName: "ანგარიშ-ფაქტურის ნომერი", field: "SERIES_NUMBER", sortable: true, filter: true, width: 180 },
        { 
            headerName: "სტატუსი", 
            field: "STATUS", 
            sortable: true, 
            filter: 'agNumberColumnFilter', 
            width: 120,
            cellRenderer: params => {
                if (params.value === null || params.value === undefined) return '';
                const statusMap = {
                    '-1': 'წაშლილი', '0': 'შენახული', '1': 'გადაგზავნილი', '2': 'დადასტურებული',
                    '3': 'კორექტირებული პირველადი', '4': 'მაკორექტირებელი', '5': 'მაკორექტირებელი გადაგზავნილი',
                    '6': 'გადაგზავნილი გაუქმებული', '7': 'გაუქმების დადასტურება', '8': 'კორექტირებული დადასტურებული'
                };
                const statusText = statusMap[params.value.toString()] || params.value;
                
                // Define status-specific CSS classes
                const statusClassMap = {
                    '-1': 'status-deleted',    // წაშლილი - red
                    '0': 'status-saved',       // შენახული - blue
                    '1': 'status-sent',        // გადაგზავნილი - orange
                    '2': 'status-confirmed',   // დადასტურებული - green
                    '3': 'status-corrected1',  // კორექტირებული პირველადი - purple
                    '4': 'status-correctable', // მაკორექტირებელი - yellow
                    '5': 'status-correctable-sent', // მაკორექტირებელი გადაგზავნილი - orange
                    '6': 'status-sent-cancelled', // გადაგზავნილი გაუქმებული - red
                    '7': 'status-cancellation-confirmed', // გაუქმების დადასტურება - red
                    '8': 'status-corrected-confirmed' // კორექტირებული დადასტურებული - green
                };
                
                const statusClass = statusClassMap[params.value.toString()] || 'status-inactive';
                return `<span class="status-badge ${statusClass}">${statusText}</span>`;
            }
        },
        { headerName: "გამყიდველის დეკლარაციის ნომერი", field: "SEQ_NUM_S", sortable: true, filter: true, width: 180 },
        { headerName: "დეკლარაციის პერიოდი", field: "DECL_DATE", sortable: true, filter: true, width: 180, 
            valueFormatter: params => {
                if (!params.value) return '';
                // Display YYYY-MM format only
                if (params.value.match(/^\d{4}-\d{2}$/)) {
                    return params.value; // Return as-is: YYYY-MM
                }
                // Handle legacy full dates by extracting YYYY-MM
                try {
                    const date = new Date(params.value);
                    const year = date.getFullYear();
                    const month = (date.getMonth() + 1).toString().padStart(2, '0');
                    return year + '-' + month;
                } catch (e) {
                    return params.value;
                }
            }
        },
        { headerName: "ოპერაციის თარიღი", field: "OPERATION_DT", sortable: true, filter: 'agDateColumnFilter', width: 150, valueFormatter: params => params.value ? new Date(params.value).toLocaleDateString('ka-GE') : '' },
        { headerName: "მყიდველის სახელი", field: "ORG_NAME", sortable: true, filter: true, flex: 1 },
        { headerName: "მყიდველის საიდ.", field: "SA_IDENT_NO", sortable: true, filter: true, width: 150 },
        { headerName: "თანხა", field: "TANXA", sortable: true, filter: 'agNumberColumnFilter', width: 120, 
            valueFormatter: params => (params.value !== null && params.value !== undefined) ? parseFloat(params.value).toFixed(2) : '0.00' 
        },
        { headerName: "დღგ", field: "VAT", sortable: true, filter: 'agNumberColumnFilter', width: 100, 
            valueFormatter: params => (params.value !== null && params.value !== undefined) ? parseFloat(params.value).toFixed(2) : '0.00' 
        },
        { headerName: "ტვირთის ზედნადების №", field: "OVERHEAD_NO", sortable: true, filter: true, width: 150 },
        { headerName: "ტვირთის ზედნადების თარიღი", field: "OVERHEAD_DT", sortable: true, filter: 'agDateColumnFilter', width: 180 },
        { headerName: "გამყიდველი", field: "COMPANY_NAME", sortable: true, filter: true, flex: 1 },
        { headerName: "გამყიდველის საიდ.", field: "COMPANY_TIN", sortable: true, filter: true, width: 150 },
        { headerName: "რეგისტრაციის თარიღი", field: "REG_DT", sortable: true, filter: 'agDateColumnFilter', width: 150, valueFormatter: params => params.value ? new Date(params.value).toLocaleDateString('ka-GE') : '' },
        { headerName: "შეთანხმების თარიღი", field: "AGREE_DATE", sortable: true, filter: 'agDateColumnFilter', width: 180 },
        { headerName: "დეკლარაციის სტატუსი", field: "DEC_STATUS", sortable: true, filter: true, width: 150 },
        { headerName: "კომენტარი", field: "NOTES", sortable: true, filter: true, flex: 1 },
        { headerName: "R UN ID", field: "R_UN_ID", sortable: true, filter: true, width: 120 },
        { headerName: "გამყიდველის UN ID", field: "SELLER_UN_ID", sortable: true, filter: 'agNumberColumnFilter', width: 150 },
        { headerName: "მყიდველის UN ID", field: "BUYER_UN_ID", sortable: true, filter: 'agNumberColumnFilter', width: 150 },
        { headerName: "S User ID", field: "S_USER_ID", sortable: true, filter: 'agNumberColumnFilter', width: 120 },
        { headerName: "K ID", field: "K_ID", sortable: true, filter: 'agNumberColumnFilter', width: 100 },
        { headerName: "Was Ref", field: "WAS_REF", sortable: true, filter: 'agNumberColumnFilter', width: 100 },
    ];
    
    const gridDiv = document.getElementById('invoiceGrid');
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
                // Do not copy if the cell is the ID link column
                if (params.column.colId === 'INVOICE_ID') {
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
        const pageName = 'Seller_Invoices';
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
        let url = 'seller_invoices.php?api=1';
        if (company) url += '&company=' + encodeURIComponent(company);
        if (begin_date_s) url += '&begin_date_s=' + encodeURIComponent(begin_date_s);
        if (begin_date_e) url += '&begin_date_e=' + encodeURIComponent(begin_date_e);
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