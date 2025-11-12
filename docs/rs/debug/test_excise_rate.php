<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/../../backend/database.php';

try {
    $pdo = getDatabaseConnection();
    echo "Database connection successful\n";
    
    // Test with the exact fields from the failing UPDATE
    echo "\n=== Test: UPDATE with EXCISE_RATE field ===\n";
    $update_sql = "UPDATE rs.spec_invoice_goods SET EXCISE_RATE = :EXCISE_RATE WHERE EXTERNAL_ID = :EXTERNAL_ID AND COMPANY_ID = :COMPANY_ID";
    echo "SQL: $update_sql\n";
    
    $test_data = [
        'EXTERNAL_ID' => '999',
        'COMPANY_ID' => '999',
        'EXCISE_RATE' => '0'
    ];
    
    echo "Test data: " . json_encode($test_data) . "\n";
    
    $stmt = $pdo->prepare($update_sql);
    $result = $stmt->execute($test_data);
    $rows_affected = $stmt->rowCount();
    
    echo "Result: " . ($result ? 'SUCCESS' : 'FAILED') . "\n";
    echo "Rows affected: $rows_affected\n";
    
    if (!$result) {
        $error_info = $stmt->errorInfo();
        echo "Error: " . implode(' | ', $error_info) . "\n";
    }
    
    // Test with Georgian text
    echo "\n=== Test: UPDATE with Georgian text ===\n";
    $update_sql2 = "UPDATE rs.spec_invoice_goods SET GOODS_NAME = :GOODS_NAME WHERE EXTERNAL_ID = :EXTERNAL_ID AND COMPANY_ID = :COMPANY_ID";
    echo "SQL: $update_sql2\n";
    
    $test_data2 = [
        'EXTERNAL_ID' => '999',
        'COMPANY_ID' => '999',
        'GOODS_NAME' => 'ნავთობის ბიტუმი და ბიტუმოვანი ქანებისაგან მიღებული'
    ];
    
    echo "Test data: " . json_encode($test_data2) . "\n";
    
    $stmt2 = $pdo->prepare($update_sql2);
    $result2 = $stmt2->execute($test_data2);
    $rows_affected2 = $stmt2->rowCount();
    
    echo "Result: " . ($result2 ? 'SUCCESS' : 'FAILED') . "\n";
    echo "Rows affected: $rows_affected2\n";
    
    if (!$result2) {
        $error_info2 = $stmt2->errorInfo();
        echo "Error: " . implode(' | ', $error_info2) . "\n";
    }
    
    // Test with all fields from the failing statement
    echo "\n=== Test: UPDATE with all fields ===\n";
    $update_sql3 = "UPDATE rs.spec_invoice_goods SET COMPANY_ID = :COMPANY_ID, COMPANY_TIN = :COMPANY_TIN, COMPANY_NAME = :COMPANY_NAME, UPDATED_AT = :UPDATED_AT, GOODS_NAME = :GOODS_NAME, SSN_CODE = :SSN_CODE, SSF_CODE = :SSF_CODE, EXCISE_RATE = :EXCISE_RATE, SSN_CODE_OLD = :SSN_CODE_OLD, DISPLAY_NAME = :DISPLAY_NAME WHERE EXTERNAL_ID = :EXTERNAL_ID AND COMPANY_ID = :COMPANY_ID";
    echo "SQL: $update_sql3\n";
    
    $test_data3 = [
        'EXTERNAL_ID' => '999',
        'COMPANY_ID' => '999',
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
    
    echo "Test data: " . json_encode($test_data3) . "\n";
    
    $stmt3 = $pdo->prepare($update_sql3);
    $result3 = $stmt3->execute($test_data3);
    $rows_affected3 = $stmt3->rowCount();
    
    echo "Result: " . ($result3 ? 'SUCCESS' : 'FAILED') . "\n";
    echo "Rows affected: $rows_affected3\n";
    
    if (!$result3) {
        $error_info3 = $stmt3->errorInfo();
        echo "Error: " . implode(' | ', $error_info3) . "\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
