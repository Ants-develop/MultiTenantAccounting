<?php
// Start session at the very beginning
session_start();

// Enable error reporting for debugging (remove in production)
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Include session and database if needed
require_once '../functions.php';
require_once '../backend/database.php';

// Handle AJAX requests
if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST['action'])) {
    header('Content-Type: application/json');

    if ($_POST['action'] == 'get_service_users') {
        $username = $_POST['user'] ?? '';
        $password = $_POST['password'] ?? '';

        if (empty($username) || empty($password)) {
            echo json_encode(['success' => false, 'message' => 'მომხმარებელი და პაროლი აუცილებელია.']);
            exit;
        }

        $soapRequest = '<?xml version="1.0" encoding="utf-8"?>' .
        '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' .
        'xmlns:xsd="http://www.w3.org/2001/XMLSchema" ' .
        'xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">' .
        '<soap:Body>' .
        '<get_ser_users xmlns="http://tempuri.org/">' .
        '<user_name>' . htmlspecialchars($username, ENT_XML1) . '</user_name>' .
        '<user_password>' . htmlspecialchars($password, ENT_XML1) . '</user_password>' .
        '</get_ser_users>' .
        '</soap:Body>' .
        '</soap:Envelope>';

        $headers = [
            "Content-Type: text/xml; charset=utf-8",
            "Content-Length: " . strlen($soapRequest),
            "SOAPAction: \"http://tempuri.org/get_ser_users\"",
            "Connection: close"
        ];

        $url = "https://www.revenue.mof.ge/ntosservice/ntosservice.asmx";

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $soapRequest);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 15);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);

        $response = curl_exec($ch);

        if ($response === false) {
            echo json_encode(['success' => false, 'message' => 'დაფიქსირდა შეცდომა RS.GE-ს სერვისთან დაკავშირებისას: ' . curl_error($ch)]);
            curl_close($ch);
            exit;
        }
        curl_close($ch);

        $doc = new DOMDocument();
        if (@$doc->loadXML($response) === false) {
            echo json_encode(['success' => false, 'message' => 'არასწორი XML პასუხი სერვერიდან.']);
            exit;
        }

        $xpath = new DOMXPath($doc);
        $xpath->registerNamespace('soap', 'http://schemas.xmlsoap.org/soap/envelope/');
        $xpath->registerNamespace('ns', 'http://tempuri.org/');
        $xpath->registerNamespace('diffgr', 'urn:schemas-microsoft-com:xml-diffgram-v1');

        $userIdNodes = $xpath->query('//ns:get_ser_usersResponse/ns:user_id');
        $user_id = $userIdNodes->length > 0 ? $userIdNodes->item(0)->nodeValue : null;

        $resultNodes = $xpath->query('//ns:get_ser_usersResponse/ns:get_ser_usersResult');
        if ($resultNodes->length > 0) {
            $diffgramNodes = $xpath->query('.//diffgr:diffgram', $resultNodes->item(0));
            if ($diffgramNodes->length > 0) {
                $users = $xpath->query('.//DocumentElement/users', $diffgramNodes->item(0));
                $userNames = [];
                foreach ($users as $userNode) {
                    $UserNameNode = $userNode->getElementsByTagName('USER_NAME')->item(0);
                    $USER_NAME = $UserNameNode ? $UserNameNode->nodeValue : '';
                    if (!empty($USER_NAME)) {
                        $userNames[] = $USER_NAME;
                    }
                }

                if (!empty($userNames)) {
                    echo json_encode(['success' => true, 'suser_options' => array_values(array_unique($userNames)), 'user_id' => $user_id]);
                    exit;
                } else {
                    echo json_encode(['success' => false, 'message' => 'RS.GE-ზე არ არის ქვე მომხმარებელი. გთხოვთ, დაამატოთ.']);
                    exit;
                }
            }
        }
        
        echo json_encode(['success' => false, 'message' => 'მომხმარებელი ან პაროლი არასწორია.']);
        exit;
    }
    elseif ($_POST['action'] == 'check_service_user') {
        $suser = isset($_POST['suser']) ? $_POST['suser'] : '';
        $spassword = isset($_POST['spassword']) ? $_POST['spassword'] : '';

        if (empty($suser) || empty($spassword)) {
            echo json_encode(['success' => false, 'message' => 'SUser ან SPassword ცარიელია.']);
            exit;
        }

        $url = "https://services.rs.ge/WayBillService/WayBillService.asmx";
        $headers = ["Content-Type: application/soap+xml; charset=utf-8"];

        // 1. chek_service_user
        $soapRequest1 = '<?xml version="1.0" encoding="utf-8"?>' .
                    '<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' .
                    'xmlns:xsd="http://www.w3.org/2001/XMLSchema" ' .
                    'xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">' .
                    '<soap12:Body>' .
                    '<chek_service_user xmlns="http://tempuri.org/">' .
                    '<su>' . htmlspecialchars($suser, ENT_XML1) . '</su>' .
                    '<sp>' . htmlspecialchars($spassword, ENT_XML1) . '</sp>' .
                    '</chek_service_user>' .
                    '</soap12:Body>' .
                    '</soap12:Envelope>';

        $ch1 = curl_init($url);
        curl_setopt_array($ch1, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => $soapRequest1, CURLOPT_HTTPHEADER => $headers + ["Content-Length: " . strlen($soapRequest1)], CURLOPT_RETURNTRANSFER => true, CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2]);
        $response1 = curl_exec($ch1);
        if ($response1 === false) {
            echo json_encode(['success' => false, 'message' => 'შეცდომა (chek_service_user): ' . curl_error($ch1)]);
            curl_close($ch1); exit;
        }
        curl_close($ch1);

        $doc1 = new DOMDocument();
        if (@$doc1->loadXML($response1) === false) {
            echo json_encode(['success' => false, 'message' => 'არასწორი XML პასუხი (chek_service_user).']); exit;
        }
        $xpath1 = new DOMXPath($doc1);
        $xpath1->registerNamespace('soap', 'http://www.w3.org/2003/05/soap-envelope');
        $xpath1->registerNamespace('ns', 'http://tempuri.org/');
        $responseNode1 = $xpath1->query('//soap:Body/ns:chek_service_userResponse')->item(0);
        
        $resultValue = strtolower($responseNode1->getElementsByTagName('chek_service_userResult')->item(0)->nodeValue ?? '');
        $un_id = $responseNode1->getElementsByTagName('un_id')->item(0)->nodeValue ?? null;
        $s_user_id = $responseNode1->getElementsByTagName('s_user_id')->item(0)->nodeValue ?? null;

        if (($resultValue !== 'true' && $resultValue !== '1') || $un_id === null) {
            echo json_encode(['success' => false, 'message' => 'სერვის მომხმარებლის პაროლი არასწორია.']); exit;
        }

        // 2. get_tin_from_un_id
        $soapRequest2 = '<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body><get_tin_from_un_id xmlns="http://tempuri.org/"><su>' . htmlspecialchars($suser, ENT_XML1) . '</su><sp>' . htmlspecialchars($spassword, ENT_XML1) . '</sp><un_id>' . htmlspecialchars($un_id, ENT_XML1) . '</un_id></get_tin_from_un_id></soap12:Body></soap12:Envelope>';
        $ch2 = curl_init($url);
        curl_setopt_array($ch2, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => $soapRequest2, CURLOPT_HTTPHEADER => $headers + ["Content-Length: " . strlen($soapRequest2)], CURLOPT_RETURNTRANSFER => true, CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2]);
        $response2 = curl_exec($ch2);
        if ($response2 === false) {
            echo json_encode(['success' => false, 'message' => 'შეცდომა (get_tin_from_un_id): ' . curl_error($ch2)]);
            curl_close($ch2); exit;
        }
        curl_close($ch2);
        
        $doc2 = new DOMDocument();
        if(@$doc2->loadXML($response2) === false){
            echo json_encode(['success' => false, 'message' => 'არასწორი XML პასუხი (get_tin_from_un_id).']); exit;
        }
        $xpath2 = new DOMXPath($doc2);
        $xpath2->registerNamespace('soap', 'http://www.w3.org/2003/05/soap-envelope');
        $xpath2->registerNamespace('ns', 'http://tempuri.org/');
        $responseNode2 = $xpath2->query('//soap:Body/ns:get_tin_from_un_idResponse')->item(0);
        $tin = $responseNode2->getElementsByTagName('get_tin_from_un_idResult')->item(0)->nodeValue ?? '';

        if (empty($tin)) {
            echo json_encode(['success' => false, 'message' => 'TIN-ის მიღება ვერ მოხერხდა.']); exit;
        }

        // 3. get_name_from_tin
        $soapRequest3 = '<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body><get_name_from_tin xmlns="http://tempuri.org/"><su>' . htmlspecialchars($suser, ENT_XML1) . '</su><sp>' . htmlspecialchars($spassword, ENT_XML1) . '</sp><tin>' . htmlspecialchars($tin, ENT_XML1) . '</tin></get_name_from_tin></soap12:Body></soap12:Envelope>';
        $ch3 = curl_init($url);
        curl_setopt_array($ch3, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => $soapRequest3, CURLOPT_HTTPHEADER => $headers + ["Content-Length: " . strlen($soapRequest3)], CURLOPT_RETURNTRANSFER => true, CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2]);
        $response3 = curl_exec($ch3);
        if ($response3 === false) {
            echo json_encode(['success' => false, 'message' => 'შეცდომა (get_name_from_tin): ' . curl_error($ch3)]);
            curl_close($ch3); exit;
        }
        curl_close($ch3);

        $doc3 = new DOMDocument();
        if(@$doc3->loadXML($response3) === false){
            echo json_encode(['success' => false, 'message' => 'არასწორი XML პასუხი (get_name_from_tin).']); exit;
        }
        $xpath3 = new DOMXPath($doc3);
        $xpath3->registerNamespace('soap', 'http://www.w3.org/2003/05/soap-envelope');
        $xpath3->registerNamespace('ns', 'http://tempuri.org/');
        $responseNode3 = $xpath3->query('//soap:Body/ns:get_name_from_tinResponse')->item(0);
        $name = $responseNode3->getElementsByTagName('get_name_from_tinResult')->item(0)->nodeValue ?? '';

        echo json_encode(['success' => true, 'name' => $name, 'tin' => $tin, 'un_id' => $un_id]);
        exit;
    }
    elseif ($_POST['action'] == 'save_data') {
        $company_tin = $_POST['tin'] ?? '';
        $company_name = $_POST['name'] ?? '';
        $main_user = $_POST['main_user'] ?? '';
        $main_password = $_POST['main_password'] ?? '';
        $s_user = $_POST['suser'] ?? '';
        $s_password = $_POST['spassword'] ?? '';
        $un_id = $_POST['un_id'] ?? null;
        $user_id = $_POST['user_id'] ?? null;
        $site_user_id = $_SESSION['user_id'] ?? null;

        // Debug logging for save_data action
        error_log("RS Admin - save_data: User ID: " . ($site_user_id ?? 'null') . ", Company TIN: " . $company_tin . ", Company Name: " . $company_name);

        if ($site_user_id === null) {
            echo json_encode(['success' => false, 'message' => 'მომხმარებლის იდენტიფიკატორი ვერ მოიძებნა. გთხოვთ, გაიაროთ ავტორიზაცია თავიდან.']);
            exit;
        }

        if (empty($company_tin) || empty($company_name) || empty($main_user) || empty($main_password) || empty($s_user) || empty($s_password) || empty($un_id) || empty($user_id)) {
            echo json_encode(['success' => false, 'message' => 'ყველა ველი აუცილებელია.']);
            exit;
        }

        try {
            $pdo = getDatabaseConnection();
            $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM rs_users WHERE company_tin = :company_tin");
            $checkStmt->execute([':company_tin' => $company_tin]);
            if ($checkStmt->fetchColumn() > 0) {
                echo json_encode(['success' => false, 'message' => 'კომპანია ამ საიდენტიფიკაციო კოდით უკვე დამატებულია.']);
                exit;
            }

            // Hash RS passwords for secure storage
            $main_password_hash = password_hash($main_password, PASSWORD_DEFAULT);
            $s_password_hash = password_hash($s_password, PASSWORD_DEFAULT);

            // Debug logging for password hashing
            error_log("RS Admin Password Hashing - Company: " . $company_name . ", Main password length: " . strlen($main_password) . ", S password length: " . strlen($s_password));

            $stmt = $pdo->prepare("INSERT INTO rs_users (site_user_id, company_tin, company_name, main_user, main_password, main_password_hash, s_user, s_password, s_password_hash, user_id, un_id) VALUES (:site_user_id, :company_tin, :company_name, :main_user, :main_password, :main_password_hash, :s_user, :s_password, :s_password_hash, :user_id, :un_id)");
            $stmt->execute([
                ':site_user_id' => $site_user_id, 
                ':company_tin' => $company_tin, 
                ':company_name' => $company_name, 
                ':main_user' => $main_user, 
                ':main_password' => $main_password, 
                ':main_password_hash' => $main_password_hash,
                ':s_user' => $s_user, 
                ':s_password' => $s_password, 
                ':s_password_hash' => $s_password_hash,
                ':user_id' => $user_id, 
                ':un_id' => $un_id
            ]);

            echo json_encode(['success' => true, 'message' => 'მონაცემები წარმატებით დაემატა.']);
            exit;

        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => 'შეცდომა მონაცემთა ბაზასთან: ' . $e->getMessage()]);
            exit;
        }
    }
    elseif ($_POST['action'] == 'delete_company') {
        $company_id = $_POST['company_id'] ?? null;
        $site_user_id = $_SESSION['user_id'] ?? null;

        // Debug logging for delete_company action
        error_log("RS Admin - delete_company: User ID: " . ($site_user_id ?? 'null') . ", Company ID: " . ($company_id ?? 'null') . ", Is Admin: " . (isAdmin() ? 'yes' : 'no'));

        if (!$company_id || !$site_user_id) {
            echo json_encode(['success' => false, 'message' => 'არასწორი მოთხოვნა']);
            exit;
        }

        try {
            $pdo = getDatabaseConnection();
            if (isAdmin()) {
                $stmt = $pdo->prepare("DELETE FROM rs_users WHERE id = :id");
                $stmt->execute([':id' => $company_id]);
            } else {
                $stmt = $pdo->prepare("DELETE FROM rs_users WHERE id = :company_id AND site_user_id = :site_user_id");
                $stmt->execute([':company_id' => $company_id, ':site_user_id' => $site_user_id]);
            }

            if ($stmt->rowCount() > 0) {
                echo json_encode(['success' => true, 'message' => 'კომპანია წარმატებით წაიშალა']);
            } else {
                echo json_encode(['success' => false, 'message' => 'კომპანია ვერ მოიძებნა ან წვდომა აკრძალულია']);
            }
        } catch (PDOException $e) {
            error_log("Delete company error: " . $e->getMessage());
            echo json_encode(['success' => false, 'message' => 'შეცდომა: ' . $e->getMessage()]);
        }
        exit;
    }
    elseif ($_POST['action'] == 'update_company') {
        $company_id = $_POST['company_id'] ?? null;
        $company_tin = $_POST['company_tin'] ?? '';
        $company_name = $_POST['company_name'] ?? '';
        $main_user = $_POST['main_user'] ?? '';
        $main_password = $_POST['main_password'] ?? '';
        $s_user = $_POST['s_user'] ?? '';
        $s_password = $_POST['s_password'] ?? '';
        $un_id = $_POST['un_id'] ?? null;
        $user_id = $_POST['user_id'] ?? null;
        $site_user_id = $_SESSION['user_id'] ?? null;

        // Debug logging for update_company action
        error_log("RS Admin - update_company: User ID: " . ($site_user_id ?? 'null') . ", Company ID: " . ($company_id ?? 'null') . ", Company TIN: " . $company_tin . ", Company Name: " . $company_name);

        // Function to check main user credentials (from revenue.mof.ge)
        function checkMainUserCredentials($username, $password) {
            error_log("DEBUG: Checking main user credentials for username: " . $username);
            
            $soapRequest = '<?xml version="1.0" encoding="utf-8"?>' .
            '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' .
            'xmlns:xsd="http://www.w3.org/2001/XMLSchema" ' .
            'xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">' .
            '<soap:Body>' .
            '<get_ser_users xmlns="http://tempuri.org/">' .
            '<user_name>' . htmlspecialchars($username, ENT_XML1) . '</user_name>' .
            '<user_password>' . htmlspecialchars($password, ENT_XML1) . '</user_password>' .
            '</get_ser_users>' .
            '</soap:Body>' .
            '</soap:Envelope>';

            $headers = [
                "Content-Type: text/xml; charset=utf-8",
                "Content-Length: " . strlen($soapRequest),
                "SOAPAction: \"http://tempuri.org/get_ser_users\"",
                "Connection: close"
            ];

            $url = "https://www.revenue.mof.ge/ntosservice/ntosservice.asmx";

            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $soapRequest);
            curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 15);
            curl_setopt($ch, CURLOPT_TIMEOUT, 30);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);

            $response = curl_exec($ch);
            $curlError = curl_error($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($response === false) {
                error_log("DEBUG: cURL error during main user check: " . $curlError);
                return false;
            }

            if ($httpCode !== 200) {
                error_log("DEBUG: HTTP error during main user check: " . $httpCode);
                return false;
            }

            error_log("DEBUG: Main user check response received: " . substr($response, 0, 500));

            $doc = new DOMDocument();
            if (@$doc->loadXML($response) === false) {
                error_log("DEBUG: Failed to parse XML response from main user check. Response: " . substr($response, 0, 200));
                return false;
            }

            $xpath = new DOMXPath($doc);
            $xpath->registerNamespace('soap', 'http://schemas.xmlsoap.org/soap/envelope/');
            $xpath->registerNamespace('ns', 'http://tempuri.org/');

            // Look for user_id in the response - if it exists, credentials are valid
            $userIdNodes = $xpath->query('//ns:get_ser_usersResponse/ns:user_id');
            if ($userIdNodes->length > 0) {
                $userId = trim($userIdNodes->item(0)->nodeValue);
                error_log("DEBUG: Main user check successful, user_id: " . $userId);
                return !empty($userId);
            }

            error_log("DEBUG: No user_id found in main user check response");
            return false;
        }

        // Function to check service user credentials (from services.rs.ge)
        function checkServiceUserCredentials($username, $password) {
            error_log("DEBUG: Checking service user credentials for username: " . $username);
            
            $soapRequest = '<?xml version="1.0" encoding="utf-8"?>' .
            '<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' .
            'xmlns:xsd="http://www.w3.org/2001/XMLSchema" ' .
            'xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">' .
            '<soap12:Body>' .
            '<chek_service_user xmlns="http://tempuri.org/">' .
            '<su>' . htmlspecialchars($username, ENT_XML1) . '</su>' .
            '<sp>' . htmlspecialchars($password, ENT_XML1) . '</sp>' .
            '</chek_service_user>' .
            '</soap12:Body>' .
            '</soap12:Envelope>';

            $headers = [
                "Content-Type: application/soap+xml; charset=utf-8",
                "Content-Length: " . strlen($soapRequest)
            ];

            $url = "https://services.rs.ge/WayBillService/WayBillService.asmx";

            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $soapRequest);
            curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 15);
            curl_setopt($ch, CURLOPT_TIMEOUT, 30);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);

            $response = curl_exec($ch);
            $curlError = curl_error($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($response === false) {
                error_log("DEBUG: cURL error during service user check: " . $curlError);
                return false;
            }

            if ($httpCode !== 200) {
                error_log("DEBUG: HTTP error during service user check: " . $httpCode);
                return false;
            }

            error_log("DEBUG: Service user check response received: " . substr($response, 0, 500));

            $doc = new DOMDocument();
            if (@$doc->loadXML($response) === false) {
                error_log("DEBUG: Failed to parse XML response from service user check. Response: " . substr($response, 0, 200));
                return false;
            }

            $xpath = new DOMXPath($doc);
            $xpath->registerNamespace('soap', 'http://www.w3.org/2003/05/soap-envelope');
            $xpath->registerNamespace('ns', 'http://tempuri.org/');

            // Look for the result in the response
            $resultNodes = $xpath->query('//soap:Body/ns:chek_service_userResponse/ns:chek_service_userResult');
            if ($resultNodes->length > 0) {
                $result = trim($resultNodes->item(0)->nodeValue);
                error_log("DEBUG: Service user check result: " . $result);
                
                // Check if the result indicates success - consistent with other implementations
                // The API returns "true" or "1" for successful authentication
                return ($result === 'true' || $result === '1');
            }

            error_log("DEBUG: No result found in service user check response");
            return false;
        }

        if ($company_id === null || $site_user_id === null) {
            echo json_encode(['success' => false, 'message' => 'არასწორი მოთხოვნა']);
            exit;
        }

        if (empty($company_tin) || empty($company_name) || empty($main_user) || empty($s_user) || empty($un_id) || empty($user_id)) {
            echo json_encode(['success' => false, 'message' => 'ყველა ველი აუცილებელია (პაროლების გარდა).']);
            exit;
        }

        // Check if at least one password is provided for validation
        if (empty($main_password) && empty($s_password)) {
            echo json_encode(['success' => false, 'message' => 'მინიმუმ ერთი პაროლი უნდა იყოს მითითებული მონაცემების შესამოწმებლად.']);
            exit;
        }

        // Additional validation: ensure both main_user and s_user are not empty
        if (empty($main_user) || empty($s_user)) {
            echo json_encode(['success' => false, 'message' => 'მთავარი მომხმარებელი და სერვის მომხმარებელი აუცილებელია.']);
            exit;
        }

        // Note: Service user credentials will be checked later in the process
        error_log("DEBUG: Service user credentials validation will be performed during the update process");

        // Note: Main user credentials will be checked later in the process
        error_log("DEBUG: Main user credentials validation will be performed during the update process");

        try {
            $pdo = getDatabaseConnection();
            
            // Check if user has permission to edit this company
            if (!isAdmin()) {
                $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM rs_users WHERE id = ? AND site_user_id = ?");
                $checkStmt->execute([$company_id, $site_user_id]);
                if ($checkStmt->fetchColumn() == 0) {
                    echo json_encode(['success' => false, 'message' => 'ამ კომპანიის რედაქტირების უფლება არ გაქვთ.']);
                    exit;
                }
            }

            // Check if TIN is already used by another company
            $checkTinStmt = $pdo->prepare("SELECT COUNT(*) FROM rs_users WHERE company_tin = ? AND id != ?");
            $checkTinStmt->execute([$company_tin, $company_id]);
            if ($checkTinStmt->fetchColumn() > 0) {
                echo json_encode(['success' => false, 'message' => 'საიდენტიფიკაციო კოდი უკვე გამოიყენება სხვა კომპანიის მიერ.']);
                exit;
            }

            // Check main user credentials if no new password provided (use existing password)
            if (empty($main_password)) {
                error_log("DEBUG: No new main password provided, checking existing credentials");
                $existingMainStmt = $pdo->prepare("SELECT main_password FROM rs_users WHERE id = ?");
                $existingMainStmt->execute([$company_id]);
                $existingMainPassword = $existingMainStmt->fetchColumn();
                
                if ($existingMainPassword) {
                    error_log("DEBUG: Validating existing main user credentials");
                    if (!checkMainUserCredentials($main_user, $existingMainPassword)) {
                        error_log("DEBUG: Existing main user credentials validation failed for company: " . $company_name);
                        echo json_encode(['success' => false, 'message' => 'მთავარი მომხმარებლის არსებული მონაცემები არასწორია. გთხოვთ შეამოწმოთ მომხმარებელი.']);
                        exit;
                    }
                    error_log("DEBUG: Existing main user credentials validation successful for company: " . $company_name);
                } else {
                    error_log("DEBUG: No existing main password found in database");
                }
            }

            // Check service user credentials if no new password provided (use existing password)
            if (empty($s_password)) {
                error_log("DEBUG: No new service password provided, checking existing credentials");
                $existingServiceStmt = $pdo->prepare("SELECT s_password FROM rs_users WHERE id = ?");
                $existingServiceStmt->execute([$company_id]);
                $existingServicePassword = $existingServiceStmt->fetchColumn();
                
                if ($existingServicePassword) {
                    error_log("DEBUG: Validating existing service user credentials");
                    if (!checkServiceUserCredentials($s_user, $existingServicePassword)) {
                        error_log("DEBUG: Existing service user credentials validation failed for company: " . $company_name);
                        echo json_encode(['success' => false, 'message' => 'სერვის მომხმარებლის არსებული მონაცემები არასწორია. გთხოვთ შეამოწმოთ მომხმარებელი.']);
                        exit;
                    }
                    error_log("DEBUG: Existing service user credentials validation successful for company: " . $company_name);
                } else {
                    error_log("DEBUG: No existing service password found in database");
                }
            }

            // Check new passwords if provided
            if (!empty($main_password)) {
                error_log("DEBUG: Validating new main user credentials");
                if (!checkMainUserCredentials($main_user, $main_password)) {
                    error_log("DEBUG: New main user credentials validation failed for company: " . $company_name);
                    echo json_encode(['success' => false, 'message' => 'მთავარი მომხმარებლის ახალი მონაცემები არასწორია. გთხოვთ შეამოწმოთ მომხმარებელი და პაროლი.']);
                    exit;
                }
                error_log("DEBUG: New main user credentials validation successful for company: " . $company_name);
            }

            if (!empty($s_password)) {
                error_log("DEBUG: Validating new service user credentials");
                if (!checkServiceUserCredentials($s_user, $s_password)) {
                    error_log("DEBUG: New service user credentials validation failed for company: " . $company_name);
                    echo json_encode(['success' => false, 'message' => 'სერვის მომხმარებლის ახალი მონაცემები არასწორია. გთხოვთ შეამოწმოთ მომხმარებელი და პაროლი.']);
                    exit;
                }
                error_log("DEBUG: New service user credentials validation successful for company: " . $company_name);
            }

            // Build update query based on whether passwords are provided
            $updateFields = [
                'company_tin = :company_tin',
                'company_name = :company_name',
                'main_user = :main_user',
                's_user = :s_user',
                'un_id = :un_id',
                'user_id = :user_id'
            ];
            
            $params = [
                ':company_id' => $company_id,
                ':company_tin' => $company_tin,
                ':company_name' => $company_name,
                ':main_user' => $main_user,
                ':s_user' => $s_user,
                ':un_id' => $un_id,
                ':user_id' => $user_id
            ];

            // Handle password updates if provided
            if (!empty($main_password)) {
                $main_password_hash = password_hash($main_password, PASSWORD_DEFAULT);
                $updateFields[] = 'main_password = :main_password';
                $updateFields[] = 'main_password_hash = :main_password_hash';
                $params[':main_password'] = $main_password;
                $params[':main_password_hash'] = $main_password_hash;
                error_log("RS Admin - Updating main password for company: " . $company_name);
            }

            if (!empty($s_password)) {
                $s_password_hash = password_hash($s_password, PASSWORD_DEFAULT);
                $updateFields[] = 's_password = :s_password';
                $updateFields[] = 's_password_hash = :s_password_hash';
                $params[':s_password'] = $s_password;
                $params[':s_password_hash'] = $s_password_hash;
                error_log("RS Admin - Updating service password for company: " . $company_name);
            }

            $updateSql = "UPDATE rs_users SET " . implode(', ', $updateFields) . " WHERE id = :company_id";
            
            $stmt = $pdo->prepare($updateSql);
            $result = $stmt->execute($params);

            if ($result) {
                echo json_encode(['success' => true, 'message' => 'კომპანიის მონაცემები წარმატებით განახლდა.']);
            } else {
                echo json_encode(['success' => false, 'message' => 'მონაცემების განახლება ვერ მოხერხდა.']);
            }

        } catch (PDOException $e) {
            error_log("Update company error: " . $e->getMessage());
            echo json_encode(['success' => false, 'message' => 'შეცდომა მონაცემთა ბაზასთან: ' . $e->getMessage()]);
        }
        exit;
    }
}

// Proceed with normal page processing
if (!isLoggedIn()) {
    error_log("RS Admin: User not logged in, redirecting to login");
    redirectToLogin();
}

// Debug logging for access control
error_log("RS Admin: User ID: " . ($_SESSION['user_id'] ?? 'not set') . ", Role: " . ($_SESSION['role'] ?? 'not set') . ", Username: " . ($_SESSION['username'] ?? 'not set'));

$prefix = rtrim(str_repeat('../', count(explode('/', trim($_SERVER['PHP_SELF'], '/'))) - 1), '/');
if ($prefix) $prefix .= '/';

header('Content-Type: text/html; charset=utf-8');

?>
<!DOCTYPE html>
<html lang="ka">
<head>
    <meta charset="UTF-8">
    <title>RS ადმინისტრაცია</title>
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- Bootstrap Icons -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.2/font/bootstrap-icons.css" rel="stylesheet">
    <style>
        .wizard-step { display: none; }
        .wizard-step.active { display: block; }
        .progress-bar { transition: width 0.3s ease-in-out; }
        
        .action-buttons {
            white-space: nowrap;
        }
        
        .action-buttons .btn {
            margin-right: 0.25rem;
        }
        
        .action-buttons .btn:last-child {
            margin-right: 0;
        }
        
        .table td {
            vertical-align: middle;
        }
    </style>
</head>
<body>
    <?php include '../menu.php'; ?>

    <div class="container" style="margin-top: 70px;">
        <div class="row">
            <!-- Wizard Form Section -->
            <div class="col-md-5">
                <div class="card shadow-sm">
                    <div class="card-header bg-light py-3">
                        <h5 class="card-title mb-0 text-center">
                            <i class="bi bi-person-plus-fill me-2"></i>კომპანიის დამატების ვიზარდი
                        </h5>
                    </div>
                    <div class="card-body p-4">
                        <!-- Progress Bar -->
                        <div class="progress mb-4" style="height: 20px;">
                            <div id="progressBar" class="progress-bar" role="progressbar" style="width: 33%;">ნაბიჯი 1/3</div>
                        </div>

                        <!-- Wizard Content -->
                        <div id="wizard">
                            <!-- Step 1: Main Credentials -->
                            <div id="step1" class="wizard-step active">
                                <h6 class="mb-3">ნაბიჯი 1: მთავარი მომხმარებლის მონაცემები</h6>
                                <div id="step1-error" class="alert alert-danger" style="display: none;"></div>
                            <div class="mb-3">
                                    <label for="user" class="form-label">მომხმარებელი:</label>
                                    <input type="text" id="user" class="form-control" required autocomplete="username">
                            </div>
                            <div class="mb-3">
                                    <label for="password" class="form-label">პაროლი:</label>
                                    <input type="password" id="password" class="form-control" required autocomplete="current-password">
                            </div>
                                <button id="nextToStep2" class="btn btn-primary w-100">
                                    შემდეგი <i class="bi bi-arrow-right-circle"></i>
                                </button>
                            </div>

                            <!-- Step 2: Service User Credentials -->
                            <div id="step2" class="wizard-step">
                                <h6 class="mb-3">ნაბიჯი 2: სერვის მომხმარებლის მონაცემები</h6>
                                <div id="step2-error" class="alert alert-danger" style="display: none;"></div>
                                    <div class="mb-3">
                                    <label for="suser" class="form-label">აირჩიეთ სერვის მომხმარებელი (SUser):</label>
                                    <select id="suser" class="form-select"></select>
                                    </div>
                                <div class="mb-3">
                                    <label for="spassword" class="form-label">სერვის მომხმარებლის პაროლი (SPassword):</label>
                                    <input type="password" id="spassword" class="form-control" required>
                                </div>
                                <div class="d-flex justify-content-between">
                                    <button id="backToStep1" class="btn btn-secondary">
                                        <i class="bi bi-arrow-left-circle"></i> უკან
                                    </button>
                                    <button id="nextToStep3" class="btn btn-primary">
                                        კომპანიის შემოწმება <i class="bi bi-arrow-right-circle"></i>
                                </button>
                </div>
            </div>

                            <!-- Step 3: Confirmation -->
                            <div id="step3" class="wizard-step">
                                <h6 class="mb-3">ნაბიჯი 3: მონაცემების დადასტურება</h6>
                                <div id="step3-error" class="alert alert-danger" style="display: none;"></div>
                                <p>გთხოვთ, შეამოწმოთ RS.GE-დან მიღებული მონაცემები და დაადასტუროთ შენახვა.</p>
                                <div class="alert alert-info">
                                    <strong>დასახელება:</strong> <span id="confirm-name"></span><br>
                                    <strong>საიდ. კოდი:</strong> <span id="confirm-tin"></span>
                    </div>
                                    <div class="d-flex justify-content-between">
                                    <button id="backToStep2" class="btn btn-secondary">
                                        <i class="bi bi-arrow-left-circle"></i> უკან
                                    </button>
                                    <button id="saveData" class="btn btn-success">
                                        <i class="bi bi-check-circle-fill"></i> შენახვა
                                    </button>
                                    </div>
                                </div>
                            </div>
                    </div>
                </div>
            </div>

            <!-- Data Display Section -->
            <div class="col-md-7">
                <div class="card shadow-sm">
                    <div class="card-header bg-light py-3">
                        <h5 class="card-title mb-0">
                            <i class="bi bi-list-ul me-2"></i>დამატებული კომპანიები
                        </h5>
                </div>
                    <div class="card-body p-0">
                        <div class="table-responsive" id="company-list-container">
                           <!-- Company list will be loaded here via JS -->
                </div>
                </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Edit Company Modal -->
    <div class="modal fade" id="editCompanyModal" tabindex="-1" aria-labelledby="editCompanyModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="editCompanyModalLabel">
                        <i class="bi bi-pencil-square me-2"></i>კომპანიის რედაქტირება
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <form id="editCompanyForm">
                        <input type="hidden" id="edit-company-id" name="company_id">
                        <div class="row">
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="edit-company-name" class="form-label">კომპანიის სახელი:</label>
                                    <input type="text" class="form-control" id="edit-company-name" name="company_name" required>
                                </div>
                                <div class="mb-3">
                                    <label for="edit-company-tin" class="form-label">საიდენტიფიკაციო კოდი:</label>
                                    <input type="text" class="form-control" id="edit-company-tin" name="company_tin" required>
                                </div>
                                <div class="mb-3">
                                    <label for="edit-main-user" class="form-label">მთავარი მომხმარებელი:</label>
                                    <input type="text" class="form-control" id="edit-main-user" name="main_user" required>
                                </div>
                                <div class="mb-3">
                                    <label for="edit-main-password" class="form-label">მთავარი პაროლი:</label>
                                    <input type="password" class="form-control" id="edit-main-password" name="main_password" placeholder="დატოვეთ ცარიელი ცვლილების გარეშე">
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="edit-s-user" class="form-label">სერვის მომხმარებელი:</label>
                                    <input type="text" class="form-control" id="edit-s-user" name="s_user" required>
                                </div>
                                <div class="mb-3">
                                    <label for="edit-s-password" class="form-label">სერვის პაროლი:</label>
                                    <input type="password" class="form-control" id="edit-s-password" name="s_password" placeholder="დატოვეთ ცარიელი ცვლილების გარეშე">
                                </div>
                                <div class="mb-3">
                                    <label for="edit-un-id" class="form-label">UN ID:</label>
                                    <input type="text" class="form-control" id="edit-un-id" name="un_id" required>
                                </div>
                                <div class="mb-3">
                                    <label for="edit-user-id" class="form-label">User ID:</label>
                                    <input type="text" class="form-control" id="edit-user-id" name="user_id" required>
                                </div>
                            </div>
                        </div>
                        <div class="alert alert-info">
                            <i class="bi bi-info-circle me-2"></i>
                            <strong>შენიშვნა:</strong> თუ პაროლის ველები ცარიელია, არსებული პაროლები შენარჩუნდება.
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                        <i class="bi bi-x-circle me-1"></i>გაუქმება
                    </button>
                    <button type="button" class="btn btn-primary" id="saveEditBtn">
                        <i class="bi bi-check-circle me-1"></i>შენახვა
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Bootstrap 5 Bundle with Popper -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    
    <script>
        document.addEventListener('DOMContentLoaded', function() {
        // Wizard state
        let wizardState = {};

        // DOM elements
        const steps = document.querySelectorAll('.wizard-step');
        const progressBar = document.getElementById('progressBar');
        const companyListContainer = document.getElementById('company-list-container');

        // Buttons
        const nextToStep2Btn = document.getElementById('nextToStep2');
        const backToStep1Btn = document.getElementById('backToStep1');
        const nextToStep3Btn = document.getElementById('nextToStep3');
        const backToStep2Btn = document.getElementById('backToStep2');
        const saveDataBtn = document.getElementById('saveData');

        function showStep(stepNumber) {
            steps.forEach(step => step.classList.remove('active'));
            document.getElementById(`step${stepNumber}`).classList.add('active');
            
            let progress = (stepNumber / 3) * 100;
            progressBar.style.width = `${progress}%`;
            progressBar.textContent = `ნაბიჯი ${stepNumber}/3`;
            
            // Repopulate fields when showing a step to improve UX when going back
            if (stepNumber === 1) {
                if (wizardState.main_user) document.getElementById('user').value = wizardState.main_user;
                if (wizardState.main_password) document.getElementById('password').value = wizardState.main_password;
            } else if (stepNumber === 2) {
                if (wizardState.spassword) document.getElementById('spassword').value = wizardState.spassword;
            }
        }

        function showError(step, message) {
            const errorDiv = document.getElementById(`step${step}-error`);
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }

        function hideError(step) {
            document.getElementById(`step${step}-error`).style.display = 'none';
        }

        function setLoading(button, isLoading) {
            if (isLoading) {
                button.disabled = true;
                button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> በመელოდება...';
            } else {
                button.disabled = false;
                // Restore original text
                if(button.id === 'nextToStep2') button.innerHTML = 'შემდეგი <i class="bi bi-arrow-right-circle"></i>';
                if(button.id === 'nextToStep3') button.innerHTML = 'კომპანიის შემოწმება <i class="bi bi-arrow-right-circle"></i>';
                if(button.id === 'saveData') button.innerHTML = '<i class="bi bi-check-circle-fill"></i> შენახვა';
            }
        }
        
        // --- Event Listeners ---

        nextToStep2Btn.addEventListener('click', () => {
            hideError(1);
            wizardState.main_user = document.getElementById('user').value;
            wizardState.main_password = document.getElementById('password').value;

            if (!wizardState.main_user || !wizardState.main_password) {
                showError(1, 'გთხოვთ, შეავსოთ ორივე ველი.');
                return;
            }

            setLoading(nextToStep2Btn, true);

            fetch('', {
                            method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                            body: new URLSearchParams({
                    action: 'get_service_users',
                    user: wizardState.main_user,
                    password: wizardState.main_password
                })
            })
            .then(res => res.json())
            .then(data => {
                setLoading(nextToStep2Btn, false);
                if (data.success) {
                    wizardState.user_id = data.user_id;
                    const suserSelect = document.getElementById('suser');
                    suserSelect.innerHTML = '';
                    data.suser_options.forEach(opt => {
                        const option = new Option(opt, opt);
                        suserSelect.add(option);
                    });
                    showStep(2);
                } else {
                    showError(1, data.message || 'დაფიქსირდა შეცდომა.');
                }
            })
            .catch(() => {
                setLoading(nextToStep2Btn, false);
                showError(1, 'სერვერთან დაკავშირების შეცდომა.');
            });
        });

        backToStep1Btn.addEventListener('click', () => showStep(1));

        nextToStep3Btn.addEventListener('click', () => {
            hideError(2);
            wizardState.suser = document.getElementById('suser').value;
            wizardState.spassword = document.getElementById('spassword').value;
            
            if (!wizardState.suser || !wizardState.spassword) {
                showError(2, 'გთხოვთ, შეავსოთ ორივე ველი.');
                return;
            }
            
            setLoading(nextToStep3Btn, true);

                fetch('', {
                    method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        action: 'check_service_user',
                    suser: wizardState.suser,
                    spassword: wizardState.spassword
                })
            })
            .then(res => res.json())
            .then(data => {
                setLoading(nextToStep3Btn, false);
                if (data.success) {
                    wizardState.name = data.name;
                    wizardState.tin = data.tin;
                    wizardState.un_id = data.un_id;
                    document.getElementById('confirm-name').textContent = data.name;
                    document.getElementById('confirm-tin').textContent = data.tin;
                    showStep(3);
                    } else {
                    showError(2, data.message || 'დაფიქსირდა შეცდომა.');
                }
            })
            .catch(() => {
                setLoading(nextToStep3Btn, false);
                showError(2, 'სერვერთან დაკავშირების შეცდომა.');
                });
            });

        backToStep2Btn.addEventListener('click', () => showStep(2));
        
        saveDataBtn.addEventListener('click', () => {
            hideError(3);
            setLoading(saveDataBtn, true);
            
                    fetch('', {
                        method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({
                            action: 'save_data',
                    tin: wizardState.tin,
                    name: wizardState.name,
                    main_user: wizardState.main_user,
                    main_password: wizardState.main_password,
                    suser: wizardState.suser,
                    spassword: wizardState.spassword,
                    un_id: wizardState.un_id,
                    user_id: wizardState.user_id,
                })
            })
            .then(res => res.json())
            .then(data => {
                setLoading(saveDataBtn, false);
                if (data.success) {
                    alert('კომპანია წარმატებით დაემატა!');
                    resetWizard();
                    loadCompanyList();
                } else {
                    showError(3, data.message || 'შენახვისას დაფიქსირდა შეცდომა.');
                }
            })
            .catch(() => {
                setLoading(saveDataBtn, false);
                showError(3, 'სერვერთან დაკავშირების შეცდომა.');
            });
        });
        
        function resetWizard() {
            wizardState = {};
            document.getElementById('user').value = '';
            document.getElementById('password').value = '';
            document.getElementById('spassword').value = '';
            hideError(1);
            hideError(2);
            hideError(3);
            showStep(1);
        }

        // --- Company List Management ---

        function loadCompanyList() {
            // This is a simplified representation. The actual PHP file to fetch the list would be needed.
            // For now, let's just use the main page to fetch its own content.
             fetch(window.location.href)
                .then(response => response.text())
                .then(html => {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    const newContent = doc.querySelector('#company-list-container').innerHTML;
                    companyListContainer.innerHTML = newContent;
                    attachDeleteListeners(); 
                    attachEditListeners();
                })
                .catch(error => {
                    companyListContainer.innerHTML = '<div class="alert alert-danger">კომპანიების სიის ჩატვირთვისას მოხდა შეცდომა.</div>';
                });

        }
        
        function attachDeleteListeners() {
            document.querySelectorAll('.delete-company').forEach(button => {
                button.addEventListener('click', function(e) {
                    e.preventDefault();
                    if (confirm('ნამდვილად გსურთ კომპანიის წაშლა?')) {
                        const companyId = this.getAttribute('data-id');
                        const row = this.closest('tr');

                        fetch('', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                            body: new URLSearchParams({
                                action: 'delete_company',
                                company_id: companyId
                            })
                        })
                        .then(res => res.json())
                        .then(data => {
                            alert(data.message);
                            if (data.success) {
                                row.remove();
                                }
                        })
                        .catch(() => alert('წაშლისას მოხდა შეცდომა.'));
                    }
                });
            });
        }

        function attachEditListeners() {
            document.querySelectorAll('.edit-company').forEach(button => {
                button.addEventListener('click', function(e) {
                    e.preventDefault();
                    const companyData = JSON.parse(this.getAttribute('data-company'));
                    openEditModal(companyData);
                });
            });
        }

        function openEditModal(companyData) {
            console.log('Opening edit modal for company:', companyData);
            
            // Populate the edit form with company data
            document.getElementById('edit-company-id').value = companyData.id;
            document.getElementById('edit-company-name').value = companyData.company_name;
            document.getElementById('edit-company-tin').value = companyData.company_tin;
            document.getElementById('edit-main-user').value = companyData.main_user;
            document.getElementById('edit-main-password').value = ''; // Clear password fields
            document.getElementById('edit-s-user').value = companyData.s_user;
            document.getElementById('edit-s-password').value = ''; // Clear password fields
            document.getElementById('edit-un-id').value = companyData.un_id;
            document.getElementById('edit-user-id').value = companyData.user_id;
            
            // Show the modal
            const editModal = new bootstrap.Modal(document.getElementById('editCompanyModal'));
            editModal.show();
        }

        function saveEditCompany() {
            const formData = new FormData(document.getElementById('editCompanyForm'));
            const companyData = Object.fromEntries(formData.entries());
            
            // Add the action
            companyData.action = 'update_company';
            
            console.log('Saving company data:', companyData);
            
            // Convert to URLSearchParams for POST request
            const params = new URLSearchParams();
            Object.keys(companyData).forEach(key => {
                if (companyData[key] !== '') {
                    params.append(key, companyData[key]);
                }
            });
            
            // Show loading state
            const saveBtn = document.getElementById('saveEditBtn');
            const originalText = saveBtn.innerHTML;
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> შენახვა...';
            
            fetch('', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params
            })
            .then(res => res.json())
            .then(data => {
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalText;
                
                if (data.success) {
                    alert(data.message);
                    // Close modal
                    const editModal = bootstrap.Modal.getInstance(document.getElementById('editCompanyModal'));
                    editModal.hide();
                    // Reload company list
                    loadCompanyList();
                } else {
                    alert('შეცდომა: ' + data.message);
                }
            })
            .catch(error => {
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalText;
                alert('სერვერთან დაკავშირების შეცდომა.');
                console.error('Error:', error);
            });
        }
        
        // Event listeners
        document.getElementById('saveEditBtn').addEventListener('click', saveEditCompany);
        
        // Initial load
        // We will do a full page render for the initial list
        <?php
            try {
                $pdo = getDatabaseConnection();
                $site_user_id = $_SESSION['user_id'] ?? null;
                $companies = [];

                if ($site_user_id) {
                     if (isAdmin()) {
                        $stmt = $pdo->query("SELECT ru.*, u.username as owner_username FROM rs_users ru LEFT JOIN users u ON ru.site_user_id = u.id ORDER BY ru.id DESC");
                    } else {
                        // Using a simple non-recursive check for direct user ownership for simplicity
                        $stmt = $pdo->prepare("SELECT ru.*, u.username as owner_username FROM rs_users ru LEFT JOIN users u ON ru.site_user_id = u.id WHERE ru.site_user_id = ? ORDER BY ru.id DESC");
                        $stmt->execute([$site_user_id]);
                    }
                    $companies = $stmt->fetchAll(PDO::FETCH_ASSOC);
                }
               
                if (!empty($companies)) {
                    echo 'const initialCompaniesHTML = `' .
                         '<table class="table table-hover mb-0">' .
                         '<thead class="table-light"><tr>' .
                         '<th>დასახელება</th><th>საიდ. კოდი</th><th>მთავარი მომხ.</th>' .
                         (isAdmin() ? '<th>დაამატა</th>' : '') .
                         '<th>მოქმედებები</th></tr></thead>' .
                         '<tbody>';

                    foreach ($companies as $company) {
                        echo '<tr>' .
                             '<td>' . htmlspecialchars($company['company_name'], ENT_QUOTES, 'UTF-8') . '</td>' .
                             '<td>' . htmlspecialchars($company['company_tin']) . '</td>' .
                             '<td>' . htmlspecialchars($company['main_user']) . '</td>' .
                             (isAdmin() ? '<td>' . htmlspecialchars($company['owner_username']) . '</td>' : '') .
                             '<td class="action-buttons">' .
                             '<button class="btn btn-primary btn-sm edit-company" data-id="' . $company['id'] . '" data-company=\'' . json_encode($company) . '\'><i class="bi bi-pencil"></i></button>' .
                             '<button class="btn btn-danger btn-sm delete-company" data-id="' . $company['id'] . '"><i class="bi bi-trash"></i></button>' .
                             '</td>' .
                             '</tr>';
                    }

                    echo '</tbody></table>`;';
                } else {
                    echo 'const initialCompaniesHTML = \'<div class="alert alert-info m-3">კომპანიები არ არის დამატებული</div>\';';
                }
            } catch (PDOException $e) {
                error_log("Database error: " . $e->getMessage());
                echo 'const initialCompaniesHTML = \'<div class="alert alert-danger m-3">შეცდომა მონაცემების მიღებისას</div>\';';
            }
        ?>
        companyListContainer.innerHTML = initialCompaniesHTML;
        attachDeleteListeners();
        attachEditListeners();

        });
    </script>
</body>
</html> 