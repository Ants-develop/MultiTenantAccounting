<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/../../backend/database.php';

try {
    $pdo = getDatabaseConnection();
    echo "Database connection successful\n";
    
    // Test the simplified UPDATE approach
    echo "\n=== Test: Simplified UPDATE approach ===\n";
    
    // First, insert a test record
    $insert_sql = "INSERT INTO rs.spec_invoice_goods (EXTERNAL_ID, COMPANY_ID, GOODS_NAME, UPDATED_AT) VALUES (:EXTERNAL_ID, :COMPANY_ID, :GOODS_NAME, :UPDATED_AT)";
    $insert_data = [
        'EXTERNAL_ID' => '888',
        'COMPANY_ID' => '888',
        'GOODS_NAME' => 'Test Product',
        'UPDATED_AT' => date('Y-m-d H:i:s')
    ];
    
    $insert_stmt = $pdo->prepare($insert_sql);
    $insert_result = $insert_stmt->execute($insert_data);
    echo "Insert result: " . ($insert_result ? 'SUCCESS' : 'FAILED') . "\n";
    
    // Now test the simplified UPDATE approach with proper parameter mapping
    $update_queries = [
        [
            'sql' => "UPDATE rs.spec_invoice_goods SET COMPANY_TIN = :COMPANY_TIN, COMPANY_NAME = :COMPANY_NAME, UPDATED_AT = :UPDATED_AT WHERE EXTERNAL_ID = :EXTERNAL_ID AND COMPANY_ID = :COMPANY_ID",
            'params' => ['EXTERNAL_ID', 'COMPANY_ID', 'COMPANY_TIN', 'COMPANY_NAME', 'UPDATED_AT']
        ],
        [
            'sql' => "UPDATE rs.spec_invoice_goods SET GOODS_NAME = :GOODS_NAME WHERE EXTERNAL_ID = :EXTERNAL_ID AND COMPANY_ID = :COMPANY_ID",
            'params' => ['EXTERNAL_ID', 'COMPANY_ID', 'GOODS_NAME']
        ],
        [
            'sql' => "UPDATE rs.spec_invoice_goods SET SSN_CODE = :SSN_CODE, SSF_CODE = :SSF_CODE WHERE EXTERNAL_ID = :EXTERNAL_ID AND COMPANY_ID = :COMPANY_ID",
            'params' => ['EXTERNAL_ID', 'COMPANY_ID', 'SSN_CODE', 'SSF_CODE']
        ],
        [
            'sql' => "UPDATE rs.spec_invoice_goods SET EXCISE_RATE = :EXCISE_RATE WHERE EXTERNAL_ID = :EXTERNAL_ID AND COMPANY_ID = :COMPANY_ID",
            'params' => ['EXTERNAL_ID', 'COMPANY_ID', 'EXCISE_RATE']
        ],
        [
            'sql' => "UPDATE rs.spec_invoice_goods SET SSN_CODE_OLD = :SSN_CODE_OLD, DISPLAY_NAME = :DISPLAY_NAME WHERE EXTERNAL_ID = :EXTERNAL_ID AND COMPANY_ID = :COMPANY_ID",
            'params' => ['EXTERNAL_ID', 'COMPANY_ID', 'SSN_CODE_OLD', 'DISPLAY_NAME']
        ]
    ];
    
    $all_data = [
        'EXTERNAL_ID' => '888',
        'COMPANY_ID' => '888',
        'COMPANY_TIN' => '405287238',
        'COMPANY_NAME' => 'შპს რეილაბი',
        'UPDATED_AT' => date('Y-m-d H:i:s'),
        'GOODS_NAME' => 'ნავთობის ბიტუმი',
        'SSN_CODE' => '27132000000',
        'SSF_CODE' => '2713',
        'EXCISE_RATE' => '0',
        'SSN_CODE_OLD' => '27132000000',
        'DISPLAY_NAME' => 'ნავთობის ბიტუმი'
    ];
    
    $update_success = true;
    foreach ($update_queries as $i => $query) {
        echo "\n--- Update Query " . ($i + 1) . " ---\n";
        echo "SQL: " . $query['sql'] . "\n";
        
        // Extract only the parameters needed for this query
        $query_data = [];
        foreach ($query['params'] as $param) {
            $query_data[$param] = $all_data[$param];
        }
        
        echo "Parameters: " . json_encode($query_data) . "\n";
        
        try {
            $update_stmt = $pdo->prepare($query['sql']);
            $update_result = $update_stmt->execute($query_data);
            $rows_affected = $update_stmt->rowCount();
            
            echo "Result: " . ($update_result ? 'SUCCESS' : 'FAILED') . "\n";
            echo "Rows affected: $rows_affected\n";
            
            if (!$update_result) {
                $error_info = $update_stmt->errorInfo();
                echo "Error: " . implode(' | ', $error_info) . "\n";
                $update_success = false;
            }
        } catch (Exception $e) {
            echo "Exception: " . $e->getMessage() . "\n";
            $update_success = false;
        }
    }
    
    echo "\n=== Overall Result ===\n";
    echo "All updates: " . ($update_success ? 'SUCCESS' : 'FAILED') . "\n";
    
    // Clean up
    $delete_sql = "DELETE FROM rs.spec_invoice_goods WHERE EXTERNAL_ID = :EXTERNAL_ID AND COMPANY_ID = :COMPANY_ID";
    $delete_stmt = $pdo->prepare($delete_sql);
    $delete_result = $delete_stmt->execute(['EXTERNAL_ID' => '888', 'COMPANY_ID' => '888']);
    echo "Cleanup: " . ($delete_result ? 'SUCCESS' : 'FAILED') . "\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
