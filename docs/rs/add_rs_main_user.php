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
        error_log("RS Main User - save_data: User ID: " . ($site_user_id ?? 'null') . ", Company TIN: " . $company_tin . ", Company Name: " . $company_name);

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
            error_log("RS Password Hashing - Company: " . $company_name . ", Main password length: " . strlen($main_password) . ", S password length: " . strlen($s_password));

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
}

// Proceed with normal page processing
if (!isLoggedIn()) {
    error_log("RS Main User: User not logged in, redirecting to login");
    redirectToLogin();
}

// Debug logging for access control
error_log("RS Main User: User ID: " . ($_SESSION['user_id'] ?? 'not set') . ", Role: " . ($_SESSION['role'] ?? 'not set') . ", Username: " . ($_SESSION['username'] ?? 'not set'));

$prefix = rtrim(str_repeat('../', count(explode('/', trim($_SERVER['PHP_SELF'], '/'))) - 1), '/');
if ($prefix) $prefix .= '/';

header('Content-Type: text/html; charset=utf-8');

?>
<!DOCTYPE html>
<html lang="ka">
<head>
    <meta charset="UTF-8">
    <title>RS ვერიფიკაცია</title>
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- Bootstrap Icons -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.2/font/bootstrap-icons.css" rel="stylesheet">
    <style>
        body { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .wizard-container {
            background: white;
            border-radius: 15px;
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            max-width: 500px;
            width: 100%;
            margin: 0 auto;
        }
        .wizard-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
            text-align: center;
        }
        .wizard-body {
            padding: 2rem;
        }
        .wizard-step { 
            display: none; 
        }
        .wizard-step.active { 
            display: block; 
        }
        .progress-bar { 
            transition: width 0.3s ease-in-out; 
        }
        .form-control {
            border-radius: 10px;
            border: 2px solid #e9ecef;
            padding: 12px 15px;
            transition: all 0.3s ease;
        }
        .form-control:focus {
            border-color: #667eea;
            box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
        }
        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            border-radius: 10px;
            padding: 12px 30px;
            font-weight: 600;
            transition: all 0.3s ease;
        }
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }
        .btn-secondary {
            background: #6c757d;
            border: none;
            border-radius: 10px;
            padding: 12px 30px;
            font-weight: 600;
            transition: all 0.3s ease;
        }
        .btn-secondary:hover {
            background: #5a6268;
            transform: translateY(-2px);
        }
        .alert {
            border-radius: 10px;
            border: none;
        }
        .loading {
            display: none;
        }
        .loading.show {
            display: inline-block;
        }
    </style>
</head>
<body>
    <div class="wizard-container">
        <div class="wizard-header">
            <h4 class="mb-0">
                <i class="bi bi-shield-check me-2"></i>
                RS ვერიფიკაცია
            </h4>
            <p class="mb-0 mt-2 opacity-75">3-ნაბიჯიანი ვერიფიკაციის პროცესი</p>
        </div>
        
        <div class="wizard-body">
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

    <!-- Bootstrap 5 Bundle with Popper -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // Wizard state
            let wizardState = {};

            // DOM elements
            const steps = document.querySelectorAll('.wizard-step');
            const progressBar = document.getElementById('progressBar');
            const companyId = new URLSearchParams(window.location.search).get('company_id');

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
                        // Send message to parent window
                        if (window.parent) {
                            window.parent.postMessage({
                                type: 'rs_verification_complete',
                                success: true,
                                company_id: companyId
                            }, '*');
                        }
                        
                        // Show success message
                        alert('RS ვერიფიკაცია წარმატებით დასრულდა!');
                        
                        // Close modal after 2 seconds
                        setTimeout(() => {
                            if (window.parent) {
                                const modal = window.parent.document.querySelector('.modal');
                                if (modal) {
                                    const bsModal = bootstrap.Modal.getInstance(modal);
                                    if (bsModal) {
                                        bsModal.hide();
                                    }
                                }
                            }
                        }, 2000);
                    } else {
                        showError(3, data.message || 'შენახვისას დაფიქსირდა შეცდომა.');
                    }
                })
                .catch(() => {
                    setLoading(saveDataBtn, false);
                    showError(3, 'სერვერთან დაკავშირების შეცდომა.');
                });
            });
            
            // Auto-focus on username field
            document.getElementById('user').focus();
        });
    </script>
</body>
</html>
