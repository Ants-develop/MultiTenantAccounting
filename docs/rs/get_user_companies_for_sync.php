<?php
/**
 * API Endpoint: Get RS Verified Companies for Current User
 * Returns list of companies that user has access to and are RS verified
 */

ini_set('display_errors', 0);
error_reporting(E_ALL);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../functions.php';
require_once __DIR__ . '/../backend/database.php';

header('Content-Type: application/json');

// Check if user is logged in
if (!isLoggedIn()) {
    http_response_code(401);
    echo json_encode(['error' => true, 'message' => 'User not logged in']);
    exit;
}

try {
    $pdo = getDatabaseConnection();
    $userId = $_SESSION['user_id'];
    $isAdmin = isAdmin();
    
    // Build query based on user role
    if ($isAdmin) {
        // Admin: Get all RS verified companies with sync credentials
        $sql = "
            SELECT DISTINCT 
                c.CompanyID,
                c.CompanyName,
                c.IdentificationCode,
                c.TenantCode,
                rs.company_tin,
                rs.company_name AS rs_company_name
            FROM [dbo].[Companies] c
            INNER JOIN rs_users rs ON c.IdentificationCode = rs.company_tin
            WHERE c.RSVerifiedStatus = 'Verified'
                AND rs.s_user IS NOT NULL
                AND rs.s_password IS NOT NULL
            ORDER BY c.CompanyName
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
    } else {
        // Regular user: Get only companies they have access to
        $sql = "
            SELECT DISTINCT 
                c.CompanyID,
                c.CompanyName,
                c.IdentificationCode,
                c.TenantCode,
                rs.company_tin,
                rs.company_name AS rs_company_name
            FROM [dbo].[Companies] c
            INNER JOIN [dbo].[CompanyUsers] cu ON c.CompanyID = cu.CompanyID
            INNER JOIN rs_users rs ON c.IdentificationCode = rs.company_tin
            WHERE cu.UserID = ?
                AND c.RSVerifiedStatus = 'Verified'
                AND rs.s_user IS NOT NULL
                AND rs.s_password IS NOT NULL
            ORDER BY c.CompanyName
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$userId]);
    }
    
    $companies = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Return success response
    echo json_encode([
        'success' => true,
        'companies' => $companies,
        'count' => count($companies),
        'is_admin' => $isAdmin
    ]);
    
} catch (PDOException $e) {
    error_log('Error fetching companies for sync: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => true,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
