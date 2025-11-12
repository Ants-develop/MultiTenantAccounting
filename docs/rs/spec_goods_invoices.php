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
        
        $sql = 'SELECT EXTERNAL_ID, GOODS_NAME, SSN_CODE, SSF_CODE, UNIT_TYPE, EXCISE_RATE, 
                SSN_CODE_OLD, DISPLAY_NAME, COMPANY_NAME, COMPANY_TIN, UPDATED_AT 
                FROM rs.spec_invoice_goods WHERE 1=1';
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
        
        error_log('SQL: ' . $sql);
        error_log('Params: ' . print_r($params, true));
        
        $sql .= ' ORDER BY GOODS_NAME ASC';
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

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

// --- HTML Page for NSAF Special Goods ---
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
    <title>NSAF სპეციალური საქონელი</title>
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
        
        /* Goods type badges */
        .goods-badge {
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
        }
        
        .goods-petroleum {
            background-color: #e3f2fd;
            color: #1565c0;
        }
        
        .goods-gasoline {
            background-color: #fff3e0;
            color: #ef6c00;
        }
        
        .goods-diesel {
            background-color: #f3e5f5;
            color: #7b1fa2;
        }
        
        .goods-fuel {
            background-color: #e8f5e8;
            color: #2e7d32;
        }
        
        .goods-other {
            background-color: #fafafa;
            color: #424242;
        }
    </style>
</head>
<body>
    <?php include '../menu.php'; ?>
    <div class="container-fluid px-4 mt-5">
        <?php $show_dates = false; include 'waybill_filter_component.php'; ?>
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h4>NSAF სპეციალური საქონელი</h4>
            <button id="exportCsvBtn" class="btn btn-success btn-sm">
                <i class="fas fa-download"></i> CSV ექსპორტი
            </button>
        </div>
        <div id="goodsGrid" class="ag-theme-quartz" style="height: 75vh; width: 100%;"></div>
    </div>
    
<script>
document.addEventListener('DOMContentLoaded', function() {
    const colDefs = [
        { 
            headerName: "ID", 
            field: "EXTERNAL_ID", 
            width: 80, 
            sortable: true, 
            filter: true
        },
        { 
            headerName: "საქონლის სახელი", 
            field: "GOODS_NAME", 
            sortable: true, 
            filter: true, 
            flex: 2,
            cellRenderer: params => {
                if (!params.value) return '';
                const goodsName = params.value;
                
                // Determine goods type based on name
                let goodsType = 'other';
                if (goodsName.includes('ნავთობი') || goodsName.includes('ნედლი')) {
                    goodsType = 'petroleum';
                } else if (goodsName.includes('ბენზინი')) {
                    goodsType = 'gasoline';
                } else if (goodsName.includes('დიზელის') || goodsName.includes('გაზოილი')) {
                    goodsType = 'diesel';
                } else if (goodsName.includes('სათბობი') || goodsName.includes('მაზუთი')) {
                    goodsType = 'fuel';
                }
                
                const typeClassMap = {
                    'petroleum': 'goods-petroleum',
                    'gasoline': 'goods-gasoline',
                    'diesel': 'goods-diesel',
                    'fuel': 'goods-fuel',
                    'other': 'goods-other'
                };
                
                const typeClass = typeClassMap[goodsType] || 'goods-other';
                return `<span class="goods-badge ${typeClass}">${goodsName}</span>`;
            }
        },
        { headerName: "SSN კოდი", field: "SSN_CODE", sortable: true, filter: true, width: 120 },
        { headerName: "SSF კოდი", field: "SSF_CODE", sortable: true, filter: true, width: 100 },
        { headerName: "ერთეულის ტიპი", field: "UNIT_TYPE", sortable: true, filter: true, width: 120 },
        { 
            headerName: "აქციზის განაკვეთი", 
            field: "EXCISE_RATE", 
            sortable: true, 
            filter: 'agNumberColumnFilter', 
            width: 150,
            valueFormatter: params => (params.value !== null && params.value !== undefined) ? parseFloat(params.value).toFixed(4) + '%' : '0.0000%'
        },
        { headerName: "ძველი SSN კოდი", field: "SSN_CODE_OLD", sortable: true, filter: true, width: 120 },
        { headerName: "ჩვენების სახელი", field: "DISPLAY_NAME", sortable: true, filter: true, flex: 1 },
        { headerName: "კომპანია", field: "COMPANY_NAME", sortable: true, filter: true, flex: 1 },
        { headerName: "კომპანიის საიდ.", field: "COMPANY_TIN", sortable: true, filter: true, width: 150 },
        { headerName: "განახლების თარიღი", field: "UPDATED_AT", sortable: true, filter: 'agDateColumnFilter', width: 150, valueFormatter: params => params.value ? new Date(params.value).toLocaleDateString('ka-GE') : '' },
    ];
    
    const gridDiv = document.getElementById('goodsGrid');
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

    // CSV Export functionality
    document.getElementById('exportCsvBtn').addEventListener('click', function() {
        const pageName = 'NSAF_Special_Goods';
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
        let url = 'spec_goods_invoices.php?api=1';
        if (company) url += '&company=' + encodeURIComponent(company);
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
