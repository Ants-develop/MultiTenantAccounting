<?php
// Shared waybill filter component
// This component provides a unified filter UI for both buyer and seller waybills
// 
// IMPORTANT: This component now provides both month inputs and full date range inputs:
// - begin_date_s, begin_date_e: Month inputs (YYYY-MM format for user selection)
// - begin_date_s_full, begin_date_e_full: Full date inputs (YYYY-MM-DD format for backend processing)
//   These hidden inputs automatically convert month selections to full date ranges:
//   - Start month becomes YYYY-MM-01 (first day of month)
//   - End month becomes YYYY-MM-DD (last day of month, e.g., 31 for August)

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../functions.php';
require_once __DIR__ . '/../backend/database.php';

$companies = [];
try {
    $pdo = getDatabaseConnection();
    if (isAdmin()) {
        // Admins see all companies with verified RS status
        $stmt = $pdo->query("SELECT CompanyName, IdentificationCode FROM [dbo].[Companies] WHERE RSVerifiedStatus = 'Verified' ORDER BY CompanyName");
    } else {
        // Non-admins see only their assigned, RS verified companies from CompanyUsers
        $stmt = $pdo->prepare("
            SELECT c.CompanyName, c.IdentificationCode
            FROM [dbo].[Companies] c
            JOIN [dbo].[CompanyUsers] cu ON c.CompanyID = cu.CompanyID
            WHERE cu.UserID = ?
            AND c.RSVerifiedStatus = 'Verified'
            ORDER BY c.CompanyName
        ");
        $stmt->execute([$_SESSION['user_id']]);
    }
    $companies = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Debug: Log the companies found
    error_log("Filter component: Found " . count($companies) . " companies for user " . ($_SESSION['user_id'] ?? 'unknown'));
    if (empty($companies)) {
        error_log("Filter component: No companies found - this might be why filters don't work");
    }
    
    // Add visible debug output
    if (isset($_GET['debug_filter'])) {
        echo "<div style='background: orange; padding: 10px; margin: 10px; border: 2px solid red;'>";
        echo "<strong>Filter Debug:</strong><br>";
        echo "User ID: " . ($_SESSION['user_id'] ?? 'unknown') . "<br>";
        echo "Is Admin: " . (isAdmin() ? 'YES' : 'NO') . "<br>";
        echo "Companies found: " . count($companies) . "<br>";
        echo "Companies: " . implode(', ', $companies) . "<br>";
        echo "</div>";
    }
} catch (Exception $e) {
    error_log("Waybill filter company fetch error: " . $e->getMessage());
    $companies = [];
}
// Get filter state from localStorage or URL parameters
$selectedCompanies = [];
$begin_date_s = '';
$begin_date_e = '';

// Check URL parameters first (for direct links)
if (isset($_GET['company']) && !empty($_GET['company'])) {
    $selectedCompanies = explode(',', $_GET['company']);
}
if (isset($_GET['begin_date_s'])) {
    $begin_date_s = $_GET['begin_date_s'];
}
if (isset($_GET['begin_date_e'])) {
    $begin_date_e = $_GET['begin_date_e'];
}

// Set default dates if none provided (last 12 months)
if (empty($begin_date_s)) {
    $begin_date_s = date('Y-m', strtotime('-11 months'));
}
if (empty($begin_date_e)) {
    $begin_date_e = date('Y-m');
}

// Allow parent to control whether to show date fields
if (!isset($show_dates)) $show_dates = true;
?>

<style>
    input[type="month"] {
        font-family: inherit;
        font-size: 0.875rem;
        cursor: pointer;
        height: calc(1.5em + 0.75rem + 2px); /* height same as form-control-sm */
    }
    input[type="month"]::-webkit-calendar-picker-indicator {
        cursor: pointer;
    }
    /* დამატებითი სტილი ჩეკბოქს-ბაზირებული დროფდაუნისთვის */
    .dropdown-menu-checkboxes {
        max-height: 300px;
        overflow-y: auto;
        padding: 10px;
        background-color: #fff; /* თეთრი ფონი */
        border: 1px solid #ced4da; /* განწყობილი ბორდერი */
        border-radius: 0.25rem;
    }
    .dropdown-menu-checkboxes label {
        display: flex;
        align-items: center;
        padding: 5px 0;
        cursor: pointer;
        font-size: 0.875rem;
    }
    .dropdown-menu-checkboxes input[type="checkbox"] {
        margin-right: 10px;
    }
    /* გაუმჯობესებული დროფდაუნის ღილაკის დიზაინი */
    #companyDropdownBtn {
        background-color: #fff; /* თეთრი ფონი */
        border: 1px solid #ced4da; /* განწყობილი ბორდერი */
        border-radius: 0.25rem;
        padding: 0.375rem 0.75rem; /* Bootstrap-ის ინპუტების padding-ის მსგავსად */
        text-align: left;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        height: calc(1.5em + 0.75rem + 2px); /* height same as form-control-sm */
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    /* ღილაკის ბორადის ასახვა focus დროს */
    #companyDropdownBtn:focus {
        outline: none;
        box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.25); /* Bootstrap-ის focus სტილის მსგავსად */
    }
    /* დასტური ღილაკის ტექსტის ასახვა */
    .dropdown-toggle::after {
        margin-left: auto;
    }
    /* საერთო კლასი ყველა ინფუთისთვის */
    .form-control-sm, #companyDropdownBtn {
        height: calc(1.5em + 0.75rem + 2px); /* 2.25rem height */
    }
</style>

<div class="card border-0 shadow-sm mb-4" style="max-width: 1200px; margin: 0 auto;">
    <!-- ბარათის სათაური -->
    <div class="card-header bg-transparent py-2 border-bottom">
        <div class="d-flex align-items-center">
            <div class="d-flex align-items-center flex-grow-1">
                <i class="bi bi-funnel-fill text-primary me-2 small"></i>
                <h6 class="mb-0 small fw-bold">ზედნადებების ფილტრი</h6>
            </div>
        </div>
    </div>
    
    <!-- ბარათის შიგთავსი -->
    <div class="card-body py-3">
        <form id="filterForm" class="needs-validation" novalidate>
            <div class="row g-3">
                <!-- კომპანიის არჩევა (ჩეკბოქს-ბაზირებული მულტისელექტ დროფდაუნით + "ყველა არჩევა") -->
                <div class="col-12 col-md-4">
                    <label for="companyDropdown" class="form-label small mb-1">კომპანია</label>
                    <div class="dropdown">
                        <button class="dropdown-toggle w-100 form-control form-control-sm" type="button" id="companyDropdownBtn" data-bs-toggle="dropdown" aria-expanded="false">
                            აირჩიეთ კომპანია
                        </button>
                        <ul class="dropdown-menu dropdown-menu-checkboxes" aria-labelledby="companyDropdownBtn">
                            <li>
                                <label>
                                    <input type="checkbox" id="selectAllCompanies" class="form-check-input">
                                    <strong>ყველა არჩევა</strong>
                                </label>
                            </li>
                            <li><hr class="dropdown-divider"></li>
                            <?php foreach ($companies as $company): ?>
                                <li>
                                    <label>
                                        <input class="form-check-input company-checkbox" type="checkbox" 
                                               value="<?= htmlspecialchars($company['CompanyName']) ?>" 
                                               data-tin="<?= htmlspecialchars($company['IdentificationCode']) ?>"
                                               <?= in_array($company['CompanyName'], $selectedCompanies) ? 'checked' : '' ?>>
                                        <?= htmlspecialchars($company['CompanyName']) ?>
                                    </label>
                                </li>
                            <?php endforeach; ?>
                        </ul>
                    </div>
                    <input type="hidden" id="selectedCompaniesInput" name="company" value="<?= htmlspecialchars(implode(',', $selectedCompanies)) ?>">
                    <div class="form-text small">შეგიძლიათ აირჩიოთ ერთი ან მეტი კომპანია</div>
                    
                    <!-- Hidden inputs for full date ranges -->
                    <input type="hidden" id="begin_date_s_full" name="begin_date_s_full" value="">
                    <input type="hidden" id="begin_date_e_full" name="begin_date_e_full" value="">
                </div>
                
                <?php if ($show_dates): ?>
                <!-- საწყისი თვე -->
                <div class="col-12 col-md-4">
                    <label for="begin_date_s" class="form-label small mb-1">საწყისი თვე</label>
                    <input type="month" 
                           class="form-control form-control-sm" 
                           id="begin_date_s" 
                           name="begin_date_s"
                           value="<?= $begin_date_s ?>"
                           max="<?= date('Y-m') ?>">
                    <div class="form-text small">მაქსიმუმ: <?= date('Y-m') ?> (მთელი თვე 01-31)</div>
                </div>
                
                <!-- საბოლოო თვე -->
                <div class="col-12 col-md-4">
                    <label for="begin_date_e" class="form-label small mb-1">საბოლოო თვე</label>
                    <input type="month" 
                           class="form-control form-control-sm" 
                           id="begin_date_e" 
                           name="begin_date_e"
                           value="<?= $begin_date_e ?>"
                           max="<?= date('Y-m') ?>">
                    <div class="form-text small">მაქსიმუმ: <?= date('Y-m') ?> (მთელი თვე 01-31)</div>
                </div>
                <?php endif; ?>
            </div>
            
            <!-- Date range display -->
            <div class="row mt-2" id="dateRangeDisplay" style="display: none;">
                <div class="col-12">
                    <div class="alert alert-info py-2 mb-0 small">
                        <i class="bi bi-calendar-range me-2"></i>
                        <strong>ფილტრის პერიოდი:</strong> 
                        <span id="actualDateRange">-</span>
                    </div>
                </div>
            </div>
            
            <div class="d-flex justify-content-end gap-2 mt-3">
                <button type="button" class="btn btn-light btn-sm px-2 py-1" id="clearFilterBtn">
                    <i class="bi bi-x-lg me-1 small"></i> გასუფთავება
                </button>
                <button type="submit" class="btn btn-primary btn-sm px-2 py-1">
                    <i class="bi bi-search me-1 small"></i> ძებნა
                </button>
            </div>
        </form>
    </div>
</div>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
<script>
document.addEventListener('DOMContentLoaded', function() {
    const companyDropdownBtn = document.getElementById('companyDropdownBtn');
    const checkboxes = document.querySelectorAll('.company-checkbox');
    const selectAll = document.getElementById('selectAllCompanies');
    const hiddenInput = document.getElementById('selectedCompaniesInput');
    const beginDateS = document.getElementById('begin_date_s');
    const beginDateE = document.getElementById('begin_date_e');

    // Filter storage key
    const FILTER_STORAGE_KEY = 'waybill_filter_state';

    // Load filter state from localStorage
    function loadFilterState() {
        try {
            const savedState = localStorage.getItem(FILTER_STORAGE_KEY);
            if (savedState) {
                const state = JSON.parse(savedState);
                
                // Restore company selections
                if (state.companies && Array.isArray(state.companies)) {
                    checkboxes.forEach(cb => {
                        cb.checked = state.companies.includes(cb.value);
                    });
                }
                
                // Restore date values
                if (state.begin_date_s && beginDateS) {
                    beginDateS.value = state.begin_date_s;
                }
                if (state.begin_date_e && beginDateE) {
                    beginDateE.value = state.begin_date_e;
                }
                
                // Update UI
                updateDropdownButton();
                updateHiddenInput();
                updateSelectAllState();
            } else {
                // Set default dates if no saved state
                setDefaultDates();
            }
        } catch (e) {
            console.error('Error loading filter state:', e);
            setDefaultDates();
        }
    }
    
    // Set default dates (last 12 months)
    function setDefaultDates() {
        if (beginDateS && beginDateE) {
            const now = new Date();
            const elevenMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
            
            // Format as YYYY-MM for month input
            const startDate = elevenMonthsAgo.getFullYear() + '-' + 
                            String(elevenMonthsAgo.getMonth() + 1).padStart(2, '0');
            const endDate = now.getFullYear() + '-' + 
                           String(now.getMonth() + 1).padStart(2, '0');
            
            beginDateS.value = startDate;
            beginDateE.value = endDate;
            
            // Save the default state
            saveFilterState();
            
            console.log('Default dates set:', { startDate, endDate });
        }
    }

    // Save filter state to localStorage
    function saveFilterState() {
        try {
            const state = {
                companies: Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value),
                begin_date_s: beginDateS ? beginDateS.value : '',
                begin_date_e: beginDateE ? beginDateE.value : ''
            };
            localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(state));
        } catch (e) {
            console.error('Error saving filter state:', e);
        }
    }

    // განახლებს დროფდაუნის ღილაკის ტექსტს არჩეულ კომპანიის რაოდენობის მიხედვით
    function updateDropdownButton() {
        const selected = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.parentElement.textContent.trim());
        const maxDisplay = 3; // მაქსიმალური არჩეული კომპანიის რაოდენობა რომლებსაც გვიხსენთ

        if (selected.length === 0) {
            companyDropdownBtn.textContent = 'აირჩიეთ კომპანია';
        } else if (selected.length <= maxDisplay) {
            companyDropdownBtn.textContent = selected.join(', ');
        } else {
            const displayedNames = selected.slice(0, maxDisplay).join(', ');
            const remaining = selected.length - maxDisplay;
            companyDropdownBtn.textContent = `${displayedNames} +${remaining} სხვა`;
        }
    }

    function updateHiddenInput() {
        const selected = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.dataset.tin);
        hiddenInput.value = selected.join(',');
    }

    function updateSelectAllState() {
        if (checkboxes.length > 0) {
            const allChecked = Array.from(checkboxes).every(cb => cb.checked);
            const anyChecked = Array.from(checkboxes).some(cb => cb.checked);
            selectAll.checked = allChecked;
            selectAll.indeterminate = anyChecked && !allChecked;
        }
    }

    // Handle select all
    selectAll.addEventListener('change', function() {
        checkboxes.forEach(cb => cb.checked = this.checked);
        updateDropdownButton();
        updateHiddenInput();
        updateSelectAllState();
        saveFilterState();
    });

    // Handle individual checkboxes
    checkboxes.forEach(cb => {
        cb.addEventListener('change', function() {
            updateDropdownButton();
            updateHiddenInput();
            updateSelectAllState();
            saveFilterState();
        });
    });

    // Handle date changes
    if (beginDateS) {
        beginDateS.addEventListener('change', function() {
            validateDateRange();
            updateDateRangeInputs();
            saveFilterState();
        });
    }
    if (beginDateE) {
        beginDateE.addEventListener('change', function() {
            validateDateRange();
            updateDateRangeInputs();
            saveFilterState();
        });
    }
    
    // Validate date range
    function validateDateRange() {
        if (beginDateS && beginDateE && beginDateS.value && beginDateE.value) {
            const startDate = new Date(beginDateS.value + '-01');
            const endDate = new Date(beginDateE.value + '-01');
            
            if (startDate > endDate) {
                // If start date is after end date, adjust end date to start date
                beginDateE.value = beginDateS.value;
                console.warn('End date adjusted to match start date');
            }
            
            // Ensure end date doesn't exceed current month
            const currentMonth = new Date();
            const maxEndDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
            
            if (endDate > maxEndDate) {
                const maxEndDateStr = currentMonth.getFullYear() + '-' + 
                                    String(currentMonth.getMonth() + 1).padStart(2, '0');
                beginDateE.value = maxEndDateStr;
                console.warn('End date adjusted to current month:', maxEndDateStr);
            }
        }
    }

    // On form submit, ensure hidden input is up to date
    document.getElementById('filterForm').addEventListener('submit', function() {
        updateHiddenInput();
        updateDateRangeInputs();
        saveFilterState();
        
        // Log the actual date range being sent
        if (beginDateS && beginDateE) {
            const startDate = beginDateS.value;
            const endDate = beginDateE.value;
            
            if (startDate && endDate) {
                // Convert month inputs to full date ranges
                const startRange = startDate + '-01'; // First day of start month
                const endRange = getLastDayOfMonth(endDate); // Last day of end month
                
                console.log('Filter submission - Date ranges:', {
                    startMonth: startDate,
                    endMonth: endDate,
                    startRange: startRange,
                    endRange: endRange,
                    fullRange: `${startRange} to ${endRange}`
                });
            }
        }
    });
    
    // Update hidden inputs with full date ranges
    function updateDateRangeInputs() {
        const beginDateSFull = document.getElementById('begin_date_s_full');
        const beginDateEFull = document.getElementById('begin_date_e_full');
        
        if (beginDateS && beginDateE && beginDateSFull && beginDateEFull) {
            if (beginDateS.value) {
                beginDateSFull.value = beginDateS.value + '-01'; // First day of month
            }
            if (beginDateE.value) {
                beginDateEFull.value = getLastDayOfMonth(beginDateE.value); // Last day of month
            }
        }
        
        // Update the date range display
        updateDateRangeDisplay();
    }
    
    // Update the date range display
    function updateDateRangeDisplay() {
        const dateRangeDisplay = document.getElementById('dateRangeDisplay');
        const actualDateRange = document.getElementById('actualDateRange');
        
        if (beginDateS && beginDateE && beginDateS.value && beginDateE.value) {
            const startDate = beginDateS.value + '-01';
            const endDate = getLastDayOfMonth(beginDateE.value);
            
            // Format dates for display
            const startFormatted = formatDateForDisplay(startDate);
            const endFormatted = formatDateForDisplay(endDate);
            
            actualDateRange.textContent = `${startFormatted} - ${endFormatted}`;
            dateRangeDisplay.style.display = 'block';
        } else {
            dateRangeDisplay.style.display = 'none';
        }
    }
    
    // Format date for display
    function formatDateForDisplay(dateString) {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('ka-GE', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric' 
            });
        } catch (e) {
            return dateString;
        }
    }
    
    // Helper function to get the last day of a month
    function getLastDayOfMonth(monthString) {
        if (!monthString) return '';
        
        try {
            const [year, month] = monthString.split('-');
            const lastDay = new Date(parseInt(year), parseInt(month), 0);
            return `${monthString}-${String(lastDay.getDate()).padStart(2, '0')}`;
        } catch (e) {
            console.error('Error calculating last day of month:', e);
            return monthString + '-31'; // Fallback
        }
    }

    // Clear filter button
    document.getElementById('clearFilterBtn').addEventListener('click', function() {
        checkboxes.forEach(cb => cb.checked = false);
        selectAll.checked = false;
        updateDropdownButton();
        updateHiddenInput();
        updateSelectAllState();
        <?php if ($show_dates): ?>
        // Reset to default dates instead of clearing
        setDefaultDates();
        <?php endif; ?>
        saveFilterState();
    });

    // Helper function to format month for display
    function formatMonthForDisplay(monthString) {
        if (!monthString) return '';
        try {
            const date = new Date(monthString + '-01');
            return date.toLocaleDateString('ka-GE', { year: 'numeric', month: 'long' });
        } catch (e) {
            return monthString;
        }
    }
    
    // Debug function to log current filter state
    function logFilterState() {
        console.log('Current filter state:', {
            companies: Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value),
            startDate: beginDateS ? beginDateS.value : 'N/A',
            endDate: beginDateE ? beginDateE.value : 'N/A',
            startDateFormatted: beginDateS ? formatMonthForDisplay(beginDateS.value) : 'N/A',
            endDateFormatted: beginDateE ? formatMonthForDisplay(beginDateE.value) : 'N/A'
        });
    }
    
    // Load saved state on page load
    loadFilterState();
    
    // Update date range display after loading
    setTimeout(() => {
        updateDateRangeDisplay();
        logFilterState();
    }, 100);
});
</script> 