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
    $begin_date_s = $_GET['begin_date_s_full'] ?? $_GET['begin_date_s'] ?? null;
    $begin_date_e = $_GET['begin_date_e_full'] ?? $_GET['begin_date_e'] ?? null;
    
    // Debug logging
    error_log('Spec Buyer Invoices - Received parameters:');
    error_log('  company: ' . ($company ?? 'null'));
    error_log('  begin_date_s_full: ' . ($_GET['begin_date_s_full'] ?? 'null'));
    error_log('  begin_date_s: ' . ($_GET['begin_date_s'] ?? 'null'));
    error_log('  begin_date_e_full: ' . ($_GET['begin_date_e_full'] ?? 'null'));
    error_log('  begin_date_e: ' . ($_GET['begin_date_e'] ?? 'null'));
    error_log('  Final begin_date_s: ' . ($begin_date_s ?? 'null'));
    error_log('  Final begin_date_e: ' . ($begin_date_e ?? 'null'));
    
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
        
        $sql = 'SELECT EXTERNAL_ID, F_SERIES, F_NUMBER, OPERATION_DT, SELLER_UN_ID, BUYER_UN_ID, STATUS, 
                SELLER_NAME, BUYER_NAME, FULL_AMOUNT, TOTAL_QUANTITY, PAY_TYPE, INVOICE_TYPE, 
                SSD_N, SSAF_N, CALC_DATE, TRANSPORT_TYPE, TRANSPORT_MARK, DRIVER_INFO, CARRIER_INFO, 
                CAR_NUMBER, SELLER_PHONE, BUYER_PHONE, DRIVER_NO, AGREE_DATE, LAST_UPDATE_DATE,
                COMPANY_NAME, COMPANY_TIN, UPDATED_AT,
                -- Oil product transportation fields
                TR_ST_DATE, SSAF_DATE, OIL_ST_ADDRESS, OIL_ST_N, OIL_FN_ADDRESS, OIL_FN_N,
                CARRIE_S_NO, GAUQMEBIS_MIZEZI, AKCIZI_ID, NUMBER_KG, NUMBER_L, UNIT_PRICE,
                FULL_DRG_AMOUNT, FULL_AQCIZI_AMOUNT, DGG_PRICE, DOC_MOS_NOM_B, DOC_MOS_NOM_S,
                BUYER_FOREIGNER
                FROM rs.spec_buyer_invoices WHERE 1=1';
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

// --- HTML Page for NSAF Buyer Invoices ---
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
    <title>NSAF მყიდველის ინვოისები</title>
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
        <?php $show_dates = true; include 'waybill_filter_component.php'; ?>
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h4>NSAF მყიდველის ინვოისები</h4>
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
        // 1. ID
        { 
            headerName: "ID", 
            field: "EXTERNAL_ID", 
            width: 80, 
            sortable: true, 
            filter: true,
            pinned: 'left',
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
        // 2. სტატუსი (Status)
        { 
            headerName: "სტატუსი", 
            field: "STATUS", 
            sortable: true, 
            filter: 'agNumberColumnFilter', 
            width: 120,
            pinned: 'left',
            cellRenderer: params => {
                if (params.value === null || params.value === undefined) return '';
                const statusMap = {
                    '-1': 'წაშლილი', '0': 'ახალი', '1': 'გადაგზავნილი, დასადასტურებელი', '2': 'დადასტურებული',
                    '3': 'პირველადი ანგარიშ ფაქტურა, რომელზეც გამოწერილია კორექტირებული ანგარიშ ფაქტურა', '4': 'ახალი კორექტირების ელექტრონული ანგარიშ ფაქტურა', '5': 'კორექტირების ანგარიშ ფაქტურა გადაგზავნილი, დასადასტურებელი',
                    '6': 'გაუქმებული ანგარიშ ფაქტურა', '7': 'დადასტურებული გაუქმებული ანგარიშ ფაქტურა', '8': 'დადასტურებული კორექტირების ანგარიშ ფაქტურა'
                };
                const statusText = statusMap[params.value.toString()] || params.value;
                
                const statusClassMap = {
                    '-1': 'status-deleted', '0': 'status-saved', '1': 'status-sent', '2': 'status-confirmed',
                    '3': 'status-corrected1', '4': 'status-correctable', '5': 'status-correctable-sent',
                    '6': 'status-sent-cancelled', '7': 'status-cancellation-confirmed', '8': 'status-corrected-confirmed'
                };
                
                const statusClass = statusClassMap[params.value.toString()] || 'status-inactive';
                return `<span class="status-badge ${statusClass}">${statusText}</span>`;
            }
        },
        // 3. ანგარიშ-ფაქტურის N (Invoice Number)
        { headerName: "ანგარიშ-ფაქტურის N", field: "SERIES_NUMBER", sortable: true, filter: true, width: 180, pinned: 'left' },
        // 4. ოპერაციის თარიღი (Operation Date)
        { headerName: "ოპერაციის თარიღი", field: "OPERATION_DT", sortable: true, filter: 'agDateColumnFilter', width: 150, 
            valueFormatter: params => params.value ? new Date(params.value).toLocaleDateString('ka-GE') : '' },
        // 5. გამყიდველი (Seller)
        { headerName: "გამყიდველი", field: "SELLER_NAME", sortable: true, filter: true, flex: 1 },
        // 6. მყიდველი (Buyer)
        { headerName: "მყიდველი", field: "BUYER_NAME", sortable: true, filter: true, flex: 1 },
        
        // 7. ნავთობპროდუქტის ტრანსპორტირებ (Oil Product Transportation) - Grouped columns
        {
            headerName: "ნავთობპროდუქტის ტრანსპორტირებ",
            children: [
                // ის დაწყების თარიღი (Start Date)
                { headerName: "ის დაწყების თარიღი", field: "TR_ST_DATE", sortable: true, filter: 'agDateColumnFilter', width: 150,
                    valueFormatter: params => params.value ? new Date(params.value).toLocaleDateString('ka-GE') : '' },
                // დამთავრების თარიღი (End Date) - using SSAF_DATE as end date
                { headerName: "დამთავრების თარიღი", field: "SSAF_DATE", sortable: true, filter: 'agDateColumnFilter', width: 150,
                    valueFormatter: params => params.value ? new Date(params.value).toLocaleDateString('ka-GE') : '' },
                // სატრანსპორტო საშუალების სახე (Type of Transport Vehicle)
                { headerName: "სატრანსპორტო საშუალების სახე", field: "TRANSPORT_TYPE", sortable: true, filter: true, width: 150 },
                // მარკა (Make/Brand)
                { headerName: "მარკა", field: "TRANSPORT_MARK", sortable: true, filter: true, width: 120 },
                // სარეგისტრაციო ნომერი (Registration Number)
                { headerName: "სარეგისტრაციო ნომერი", field: "CAR_NUMBER", sortable: true, filter: true, width: 150 },
                // მძღოლის სახელი და გვარი (Driver's Name and Surname)
                { headerName: "მძღოლის სახელი და გვარი", field: "DRIVER_INFO", sortable: true, filter: true, width: 200 },
                // სატრანსპორტო საშუალებაზე ბუნკირების ადგილის ან ბუნკირების ადგილის მისამართი (Address of Bunkering Location)
                { headerName: "ბუნკირების ადგილის მისამართი", field: "OIL_ST_ADDRESS", sortable: true, filter: true, width: 250 },
                // გემის სარეგისტრაციო ნომერი (Ship Registration Number) - using OIL_ST_N
                { headerName: "გემის სარეგისტრაციო ნომერი", field: "OIL_ST_N", sortable: true, filter: true, width: 150 },
                // გემის მიტანის მისამართი (Ship Delivery Address) - using OIL_FN_ADDRESS
                { headerName: "გემის მიტანის მისამართი", field: "OIL_FN_ADDRESS", sortable: true, filter: true, width: 250 }
            ]
        },
        
        // 8. ნავთობპროდუქტის ტრანსპორტირება Online (Oil Product Transportation Online) - Grouped columns
        {
            headerName: "ნავთობპროდუქტის ტრანსპორტირება Online",
            children: [
                // დატვირთვის ადგილის ან ბუნკირების ადგილის მისამართი (Address of Loading Location)
                { headerName: "დატვირთვის ადგილის მისამართი", field: "OIL_ST_ADDRESS", sortable: true, filter: true, width: 250 },
                // სატრანსპორტო საშუალების სახე (Type of Transport Vehicle)
                { headerName: "სატრანსპორტო საშუალების სახე", field: "TRANSPORT_TYPE", sortable: true, filter: true, width: 150 },
                // მარკა (Make/Brand)
                { headerName: "მარკა", field: "TRANSPORT_MARK", sortable: true, filter: true, width: 120 },
                // სარეგისტრაციო ნომერი (Registration Number)
                { headerName: "სარეგისტრაციო ნომერი", field: "CAR_NUMBER", sortable: true, filter: true, width: 150 },
                // მძღოლის სახელი და გვარი (Driver's Name and Surname)
                { headerName: "მძღოლის სახელი და გვარი", field: "DRIVER_INFO", sortable: true, filter: true, width: 200 },
                // გადამზიდავი (Carrier)
                { headerName: "გადამზიდავი", field: "CARRIER_INFO", sortable: true, filter: true, width: 200 },
                // საიდენტ. / ნომერი (ID / Number) - using CARRIE_S_NO
                { headerName: "საიდენტ. / ნომერი", field: "CARRIE_S_NO", sortable: true, filter: true, width: 120 },
                // დასახელება / სახელი, გვარი (Name / First Name, Last Name) - using CARRIER_INFO
                { headerName: "დასახელება / სახელი, გვარი", field: "CARRIER_INFO", sortable: true, filter: true, width: 200 }
            ]
        },
        
        // 9. გამოწერის თარიღი (Issue Date) - using CALC_DATE
        { headerName: "გამოწერის თარიღი", field: "CALC_DATE", sortable: true, filter: 'agDateColumnFilter', width: 150,
            valueFormatter: params => params.value ? new Date(params.value).toLocaleDateString('ka-GE') : '' },
        // 10. დეკლარაციის N (Declaration N) - using SSD_N
        { headerName: "დეკლარაციის N", field: "SSD_N", sortable: true, filter: true, width: 120 },
        // 11. გაუქმების მიზეზი (Cancellation Reason) - using GAUQMEBIS_MIZEZI
        { headerName: "გაუქმების მიზეზი", field: "GAUQMEBIS_MIZEZI", sortable: true, filter: true, flex: 1 },
        // 12. საქონლის დასახელება (აქციზის კოდი) (Goods Name (Excise Code)) - using AKCIZI_ID
        { headerName: "საქონლის დასახელება (აქციზის კოდი)", field: "AKCIZI_ID", sortable: true, filter: true, width: 350,
            cellRenderer: params => {
                if (params.value === null || params.value === undefined || params.value === '') {
                    return '';
                }
                const code = String(params.value).padStart(4, '0'); // Ensure 4-digit code
                const exciseCodeMap = {
                    "0370": "ბენზინი ძრავებისათვის - ბენზინის სათბობი რეაქტიული და დანარჩენი მსუბუქი დისტილატები",
                    "0290": "ბენზინი ძრავებისათვის - ოქტანური რიცხვით 95 ან მეტი, მაგრამ არა უმეტეს 98-ისა",
                    "0270": "ბენზინი ძრავებისათვის - ოქტანური რიცხვით 95-ზე ნაკლები",
                    "0320": "ბენზინი ძრავებისათვის - ოქტანური რიცხვით 98 ან მეტი",
                    "2713": "ნავთობის ბიტუმი და ბიტუმოვანი ქანებისაგან მიღებული ნავთობისა ან ნავთობპროდუქტების გადამუშავების სხვა ნარჩენები",
                    "0110": "ნავთობის მსუბუქი დისტილატები და პროდუქტები გადამუშავების სპეციფიკური პროცესებისათვის და სხვა ქიმიური გარდაქმნებისათვის",
                    "0610": "ნავთობის მძიმე დისტილატები - გაზოილი (დიზელის საწვავი) გადამუშავების სპეციფიკური პროცესებისათვის და სხვა ქიმიური გარდაქმნებისათვის",
                    "0690": "ნავთობის მძიმე დისტილატები - გაზოილი სხვა მიზნებისათვის",
                    "0710": "ნავთობის მძიმე დისტილატები - თხევადი სათბობი (მაზუთი)",
                    "2709": "ნედლი ნავთობი და ნედლი ნავთობპროდუქტები, მიღებული ბიტუმოვანი მინერალებისაგან(გარდა მილსადენისა)",
                    "0210": "სპეციალური ბენზინები"
                };
                const name = exciseCodeMap[code];
                const displayText = name ? `${name} (${code})` : code;
                
                // Determine goods type based on name
                let goodsType = 'other';
                if (name) {
                    if (name.includes('ნავთობი') || name.includes('ნედლი')) {
                        goodsType = 'petroleum';
                    } else if (name.includes('ბენზინი')) {
                        goodsType = 'gasoline';
                    } else if (name.includes('დიზელის') || name.includes('გაზოილი')) {
                        goodsType = 'diesel';
                    } else if (name.includes('სათბობი') || name.includes('მაზუთი')) {
                        goodsType = 'fuel';
                    }
                }
                
                const typeClassMap = {
                    'petroleum': 'goods-petroleum',
                    'gasoline': 'goods-gasoline',
                    'diesel': 'goods-diesel',
                    'fuel': 'goods-fuel',
                    'other': 'goods-other'
                };
                
                const typeClass = typeClassMap[goodsType] || 'goods-other';
                return `<span class="goods-badge ${typeClass}">${displayText}</span>`;
            }
        },
        // 13. მიწოდებული საქონლის რაოდენობა (კგ) (Quantity of Goods Supplied (kg)) - using NUMBER_KG
        { headerName: "საქონლის რაოდენობა (კგ)", field: "NUMBER_KG", sortable: true, filter: 'agNumberColumnFilter', width: 200,
            valueFormatter: params => (params.value !== null && params.value !== undefined) ? parseFloat(params.value).toFixed(2) : '0.00' },
        // 14. საქონლის ღირებულება დღგ-ის და აქციზის ჩათვლით (Goods Value including VAT and Excise) - using UNIT_PRICE
        { headerName: "საქონლის ღირებულება დღგ-ის და აქციზის ჩათვლით", field: "UNIT_PRICE", sortable: true, filter: 'agNumberColumnFilter', width: 250,
            valueFormatter: params => (params.value !== null && params.value !== undefined) ? parseFloat(params.value).toFixed(2) : '0.00' },
        // 15. დღგ-ის თანხა (VAT Amount) - using FULL_DRG_AMOUNT
        { headerName: "დღგ-ის თანხა", field: "FULL_DRG_AMOUNT", sortable: true, filter: 'agNumberColumnFilter', width: 120,
            valueFormatter: params => (params.value !== null && params.value !== undefined) ? parseFloat(params.value).toFixed(2) : '0.00' },
        // 16. აქციზის თანხა (Excise Amount) - using FULL_AQCIZI_AMOUNT
        { headerName: "აქციზის თანხა", field: "FULL_AQCIZI_AMOUNT", sortable: true, filter: 'agNumberColumnFilter', width: 120,
            valueFormatter: params => (params.value !== null && params.value !== undefined) ? parseFloat(params.value).toFixed(2) : '0.00' },
        // 17. საქონლის რაოდენობა (ლ) (Goods Quantity (L)) - using NUMBER_L for liters
        { headerName: "საქონლის რაოდენობა (ლ)", field: "NUMBER_L", sortable: true, filter: 'agNumberColumnFilter', width: 200,
            valueFormatter: params => (params.value !== null && params.value !== undefined) ? parseFloat(params.value).toFixed(2) : '0.00' },
        // 18. დღგ-ის თანხა (VAT Amount) - using DGG_PRICE
        { headerName: "დღგ-ის თანხა", field: "DGG_PRICE", sortable: true, filter: 'agNumberColumnFilter', width: 120,
            valueFormatter: params => (params.value !== null && params.value !== undefined) ? parseFloat(params.value).toFixed(2) : '0.00' },
        // 19. შეძენის დოკუმენტი (Purchase Document) - using DOC_MOS_NOM_B
        { headerName: "შეძენის დოკუმენტი", field: "DOC_MOS_NOM_B", sortable: true, filter: true, width: 150 },
        // 20. იმპორტის დოკუმენტი (Import Document) - using DOC_MOS_NOM_S
        { headerName: "იმპორტის დოკუმენტი", field: "DOC_MOS_NOM_S", sortable: true, filter: true, width: 150 },
        // 21. მომხმარებელ სანაცვლოდ (For Consumer Instead) - using BUYER_FOREIGNER
        { headerName: "მყიდველი უცხოელია", field: "BUYER_FOREIGNER", sortable: true, filter: true, width: 200 },
        
        // Additional important fields
        { headerName: "SSAF ნომერი", field: "SSAF_N", sortable: true, filter: true, width: 120 },
        { headerName: "გადახდის ტიპი", field: "PAY_TYPE", sortable: true, filter: 'agNumberColumnFilter', width: 120 },
        { headerName: "ინვოისის ტიპი", field: "INVOICE_TYPE", sortable: true, filter: 'agNumberColumnFilter', width: 120 },
        { headerName: "სრული თანხა", field: "FULL_AMOUNT", sortable: true, filter: 'agNumberColumnFilter', width: 120, 
            valueFormatter: params => (params.value !== null && params.value !== undefined) ? parseFloat(params.value).toFixed(2) : '0.00' 
        },
        { headerName: "მიწოდებული საქონლის რაოდენობა (ლ)", field: "TOTAL_QUANTITY", sortable: true, filter: 'agNumberColumnFilter', width: 200, 
            valueFormatter: params => (params.value !== null && params.value !== undefined) ? parseFloat(params.value).toFixed(2) : '0.00' 
        },
        { headerName: "გამყიდველის ტელეფონი", field: "SELLER_PHONE", sortable: true, filter: true, width: 150 },
        { headerName: "მყიდველის ტელეფონი", field: "BUYER_PHONE", sortable: true, filter: true, width: 150 },
        { headerName: "მძღოლის ნომერი", field: "DRIVER_NO", sortable: true, filter: true, width: 120 },
        { headerName: "შეთანხმების თარიღი", field: "AGREE_DATE", sortable: true, filter: 'agDateColumnFilter', width: 150, 
            valueFormatter: params => params.value ? new Date(params.value).toLocaleDateString('ka-GE') : '' },
        { headerName: "ბოლო განახლების თარიღი", field: "LAST_UPDATE_DATE", sortable: true, filter: 'agDateColumnFilter', width: 150, 
            valueFormatter: params => params.value ? new Date(params.value).toLocaleDateString('ka-GE') : '' },
        { headerName: "კომპანია", field: "COMPANY_NAME", sortable: true, filter: true, flex: 1 },
        { headerName: "კომპანიის საიდ.", field: "COMPANY_TIN", sortable: true, filter: true, width: 150 },
        { headerName: "გამყიდველის UN ID", field: "SELLER_UN_ID", sortable: true, filter: 'agNumberColumnFilter', width: 150 },
        { headerName: "მყიდველის UN ID", field: "BUYER_UN_ID", sortable: true, filter: 'agNumberColumnFilter', width: 150 }
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
                if (params.column.colId === 'EXTERNAL_ID') {
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
        const pageName = 'NSAF_Buyer_Invoices';
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
        
        // Ensure hidden inputs are updated before making the request
        if (typeof updateDateRangeInputs === 'function') {
            updateDateRangeInputs();
        }
        
        const company = document.getElementById('selectedCompaniesInput').value;
        const begin_date_s = document.getElementById('begin_date_s_full')?.value || document.getElementById('begin_date_s')?.value;
        const begin_date_e = document.getElementById('begin_date_e_full')?.value || document.getElementById('begin_date_e')?.value;
        
        console.log('Fetching data with dates:', { begin_date_s, begin_date_e });
        
        let url = 'spec_buyer_invoices.php?api=1';
        if (company) url += '&company=' + encodeURIComponent(company);
        if (begin_date_s) url += '&begin_date_s_full=' + encodeURIComponent(begin_date_s);
        if (begin_date_e) url += '&begin_date_e_full=' + encodeURIComponent(begin_date_e);
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
