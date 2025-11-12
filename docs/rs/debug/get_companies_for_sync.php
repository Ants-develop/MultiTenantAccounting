<?php
// Get companies for sync using the same logic as waybill_filter_component.php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../../functions.php';
require_once __DIR__ . '/../../backend/database.php';

// Check if user is logged in
if (!isLoggedIn()) {
    http_response_code(401);
    echo json_encode(['error' => true, 'message' => 'User not logged in']);
    exit;
}

// Admin-only access for sync functionality
if (!isAdmin()) {
    http_response_code(403);
    echo json_encode(['error' => true, 'message' => 'Access denied. Admin only.']);
    exit;
}

try {
    $pdo = getDatabaseConnection();
    $companies = [];
    
    // Get companies from rs_users and join with dbo.Companies for proper TIN and RS Status
    $stmt = $pdo->query("
        SELECT DISTINCT 
            ru.company_name,
            ru.company_tin,
            ru.un_id,
            c.CompanyID,
            c.IdentificationCode,
            c.RSVerifiedStatus
        FROM rs_users ru
        LEFT JOIN [dbo].[Companies] c ON ru.company_name COLLATE SQL_Latin1_General_CP1_CI_AS = c.CompanyName COLLATE SQL_Latin1_General_CP1_CI_AS
        ORDER BY ru.company_name
    ");
    
    $companies = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Convert to the expected format for the frontend
    $formattedCompanies = [];
    foreach ($companies as $company) {
        // Use dbo.Companies data if available, otherwise fall back to rs_users data
        $companyTIN = $company['IdentificationCode'] ?: $company['company_tin'] ?: 'N/A';
        $rsStatus = $company['RSVerifiedStatus'] ?: ($company['un_id'] ? 'Verified' : 'Not Verified');
        
        $formattedCompanies[] = [
            'CompanyID' => $company['CompanyID'],
            'CompanyName' => $company['company_name'],
            'CompanyTIN' => $companyTIN,
            'RSVerifiedStatus' => $rsStatus
        ];
    }
    
    // Debug logging
    error_log("Sync companies: Found " . count($formattedCompanies) . " companies for user " . ($_SESSION['user_id'] ?? 'unknown'));
    
    echo json_encode([
        'success' => true,
        'companies' => $formattedCompanies,
        'count' => count($formattedCompanies)
    ]);
    
} catch (Exception $e) {
    error_log("Error getting companies for sync: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => true, 
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
?> 