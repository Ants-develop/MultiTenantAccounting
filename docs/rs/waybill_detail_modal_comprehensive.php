<!-- Comprehensive Waybill Detail Modal -->
<div class="modal fade" id="waybillDetailModal" tabindex="-1" aria-labelledby="waybillDetailModalLabel" aria-hidden="true">
    <div class="modal-dialog" style="max-width: 95%; width: 95%;">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="waybillDetailModalLabel">
                    <i class="bi bi-file-text me-2"></i>
                    ზედნადების დეტალები
                </h5>
                <div class="d-flex gap-2">
                    <button type="button" class="btn btn-outline-secondary btn-sm" id="waybillBackBtn" style="display: none;">
                        <i class="bi bi-arrow-left me-1"></i> უკან
                    </button>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
            </div>
            <div class="modal-body">
                <div id="waybillDetailContent">
                    <!-- Loading spinner -->
                    <div class="text-center py-5">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">იტვირთება...</span>
                        </div>
                        <p class="mt-2 text-muted">იტვირთება...</p>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                    <i class="bi bi-x-lg me-1"></i> დახურვა
                </button>
                <button type="button" class="btn btn-primary" id="printWaybillBtn" style="display: none;">
                    <i class="bi bi-printer me-1"></i> ბეჭდვა
                </button>
            </div>
        </div>
    </div>
</div>

<style>
/* Waybill ID column styling */
.ag-cell[col-id="EXTERNAL_ID"] {
    cursor: pointer !important;
    text-decoration: underline !important;
    color: #007bff !important;
    font-weight: 500;
}

.ag-cell[col-id="EXTERNAL_ID"]:hover {
    background-color: #e3f2fd !important;
    color: #0056b3 !important;
}

/* Modal styling */
.modal-dialog[style*="95%"] .modal-body {
    padding: 20px;
    max-height: 70vh;
    overflow-y: auto;
}

.modal-dialog[style*="95%"] .modal-content {
    border-radius: 8px;
}

/* Content sections */
.waybill-details-container {
    padding: 10px 0;
}

.waybill-detail-section {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 15px;
}

.waybill-detail-section h6 {
    color: #495057;
    font-weight: 600;
    margin-bottom: 12px;
    border-bottom: 2px solid #dee2e6;
    padding-bottom: 6px;
    font-size: 0.95rem;
}

.detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 0;
    border-bottom: 1px solid #e9ecef;
    font-size: 0.9rem;
}

.detail-row:last-child {
    border-bottom: none;
}

.detail-label {
    font-weight: 500;
    color: #6c757d;
    min-width: 150px;
}

.detail-value {
    font-weight: 400;
    color: #212529;
    text-align: right;
    flex: 1;
    margin-left: 15px;
}

/* Status and type badges */
.status-badge, .type-badge {
    font-size: 0.8rem;
    padding: 4px 8px;
    border-radius: 12px;
    font-weight: 500;
}

.status-saved { background-color: #cce5ff; color: #004085; }
.status-activated { background-color: #d4edda; color: #155724; }
.status-completed { background-color: #d1ecf1; color: #0c5460; }
.status-transported { background-color: #fff3cd; color: #856404; }
.status-deleted { background-color: #f8d7da; color: #721c24; }
.status-cancelled { background-color: #6c757d; color: #ffffff; }
.status-inactive { background-color: #e2e3e5; color: #383d41; }

.type-purchase { background-color: #e2e3e5; color: #383d41; }
.type-sale { background-color: #d1ecf1; color: #0c5460; }
.type-package { background-color: #d4edda; color: #155724; }
.type-transfer { background-color: #fff3cd; color: #856404; }
.type-return { background-color: #f8d7da; color: #721c24; }
.type-check { background-color: #cce5ff; color: #004085; }

/* Tables */
.goods-table {
    font-size: 0.9rem;
}

.goods-table th {
    background-color: #e9ecef;
    font-weight: 600;
    color: #495057;
}

.amount-highlight {
    font-weight: 600;
    color: #28a745;
    font-size: 1.1rem;
}

.date-value {
    color: #6c757d;
    font-size: 0.9rem;
}

.company-name {
    font-weight: 600;
    color: #495057;
}

.tin-value {
    font-family: monospace;
    background-color: #f8f9fa;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.9rem;
}

.address-value {
    color: #6c757d;
    font-style: italic;
}

.comment-value {
    background-color: #f8f9fa;
    padding: 10px;
    border-radius: 6px;
    border-left: 4px solid #007bff;
    font-style: italic;
    color: #495057;
}

.no-goods {
    text-align: center;
    color: #6c757d;
    font-style: italic;
    padding: 20px;
}

.goods-summary {
    background-color: #e9ecef;
    padding: 10px;
    border-radius: 6px;
    margin-bottom: 15px;
}

.goods-summary-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 5px;
}

/* Invoice items styling */
.invoice-item {
    display: flex;
    align-items: center;
    padding: 4px 0;
}

.invoice-item a {
    color: #007bff;
    text-decoration: underline;
    font-weight: 500;
}

.invoice-item a:hover {
    color: #0056b3;
    text-decoration: none;
}

.invoice-cell-item {
    display: flex;
    align-items: center;
    padding: 2px 0;
    font-size: 0.9rem;
}

.invoice-cell-item a {
    color: #007bff;
    text-decoration: underline;
    font-weight: 500;
}

.invoice-cell-item a:hover {
    color: #0056b3;
    text-decoration: none;
}

.invoice-links {
    margin-bottom: 8px;
}

.goods-summary-row:last-child {
    margin-bottom: 0;
    font-weight: 600;
    border-top: 1px solid #dee2e6;
    padding-top: 5px;
}

/* Debug section */
.debug-section {
    background-color: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    padding: 15px;
    margin-top: 20px;
}

.debug-section h6 {
    color: #6c757d;
    font-size: 0.9rem;
    margin-bottom: 10px;
}

.debug-pre {
    background-color: #e9ecef;
    padding: 10px;
    border-radius: 4px;
    font-size: 0.8rem;
    max-height: 200px;
    overflow-y: auto;
    white-space: pre-wrap;
    word-wrap: break-word;
}

.xml-code {
    background-color: #f8f9fa;
    border: 1px solid #dee2e6;
    font-family: 'Courier New', monospace;
    font-size: 0.75rem;
    line-height: 1.4;
    color: #495057;
}

.xml-code .tag {
    color: #007bff;
}

.xml-code .attribute {
    color: #28a745;
}

.xml-code .value {
    color: #dc3545;
}

.raw-code {
    background-color: #f8f9fa;
    border: 1px solid #dee2e6;
    font-family: 'Courier New', monospace;
    font-size: 0.75rem;
    line-height: 1.4;
    color: #212529;
    white-space: pre;
    word-wrap: break-word;
    max-height: 400px;
    overflow-y: auto;
    padding: 12px;
    border-radius: 4px;
}

.raw-code .tag {
    color: #007bff;
    font-weight: 500;
}

.raw-code .attribute {
    color: #28a745;
}

.raw-code .value {
    color: #dc3545;
}



/* Modal animations */
.modal.fade .modal-dialog {
    transition: transform 0.3s ease-out;
    transform: translate(0, -50px);
}

.modal.show .modal-dialog {
    transform: none;
}

/* Loading animation */
.spinner-border {
    width: 3rem;
    height: 3rem;
}

/* Print styles */
@media print {
    .modal-header,
    .modal-footer,
    .nav-tabs {
        display: none !important;
    }
    
    .modal-body {
        padding: 0 !important;
    }
    
    .tab-content > .tab-pane {
        display: block !important;
    }
    
    .waybill-detail-section {
        background: white !important;
        border: 1px solid #ddd !important;
        margin-bottom: 15px !important;
    }
}
</style>

<script>
class WaybillDetailModal {
    constructor() {
        this.modal = document.getElementById('waybillDetailModal');
        this.content = document.getElementById('waybillDetailContent');
        this.printBtn = document.getElementById('printWaybillBtn');
        this.currentWaybillId = null;
        this.currentWaybillType = null;
        
        this.init();
    }
    
    init() {
        this.printBtn.addEventListener('click', () => {
            this.printWaybill();
        });
        
        this.modal.addEventListener('hidden.bs.modal', () => {
            this.currentWaybillId = null;
            this.currentWaybillType = null;
            this.printBtn.style.display = 'none';
        });
    }
    
    show(waybillId, waybillType = 'seller') {
        this.currentWaybillId = waybillId;
        this.currentWaybillType = waybillType;
        
        this.showLoading();
        
        const modal = new bootstrap.Modal(this.modal);
        modal.show();
        
        this.fetchWaybillDetails(waybillId, waybillType);
    }
    
    showLoading() {
        this.content.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">იტვირთება...</span>
                </div>
                <p class="mt-2 text-muted">იტვირთება...</p>
            </div>
        `;
    }
    
    async fetchWaybillDetails(waybillId, waybillType) {
        try {
            this.showDebugInfo(waybillId);
            
            console.log('Fetching waybill details for ID:', waybillId);
            console.log('Waybill type:', waybillType);
            const response = await fetch(`get_waybill_details_rs.php?api=1&waybill_id=${waybillId}&debug=1`);
            const data = await response.json();
            
            console.log('API response:', data);
            console.log('Waybill data:', data.waybill);
            console.log('Source:', data.source);
            console.log('Debug info:', data.debug);
            
            if (data.success) {
                this.renderWaybillDetailsWithTabs(data);
            } else {
                console.error('API error response:', data);
                this.showError(data.message || 'შეცდომა მოხდა მონაცემების ჩატვირთვისას');
            }
        } catch (error) {
            console.error('Error fetching waybill details:', error);
            this.showError('შეცდომა მოხდა მონაცემების ჩატვირთვისას');
        }
    }
    
    showDebugInfo(waybillId) {
        this.content.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">იტვირთება...</span>
                </div>
                <p class="mt-2 text-muted">იტვირთება...</p>
                <div class="mt-3">
                    <small class="text-muted">Debug: Fetching waybill ID ${waybillId} from RS API</small>
                </div>
            </div>
        `;
    }
    
    renderWaybillDetailsWithTabs(data) {
        const { waybill, source, debug } = data;
        
        console.log('Rendering waybill details:', data);
        console.log('Waybill data:', waybill);
        console.log('Source:', source);
        console.log('Debug mode:', debug);
        console.log('All waybill keys:', Object.keys(waybill));
        console.log('Invoice ID:', waybill.INVOICE_ID);
        console.log('Invoice ID type:', typeof waybill.INVOICE_ID);
        console.log('Invoice ID length:', waybill.INVOICE_ID ? waybill.INVOICE_ID.length : 'undefined');
        
        this.content.innerHTML = `
            <div class="waybill-details-container">
                ${this.renderOverviewTab(waybill)}
                ${this.renderPartiesTab(waybill)}
                ${this.renderTransportTab(waybill)}
                ${this.renderGoodsTab(waybill)}
                ${this.renderSubWaybillsTab(waybill)}
                ${this.renderWoodDocsTab(waybill)}
                
                ${source === 'rs_service' ? `
                <div class="alert alert-info mt-3">
                    <i class="bi bi-info-circle me-2"></i>
                    მონაცემები მიღებულია RS სერვისიდან
                </div>
                ` : ''}
            </div>
        `;
        
        this.printBtn.style.display = 'inline-block';
        
        // Load multiple invoices for this waybill
        const waybillId = waybill.EXTERNAL_ID || waybill.ID;
        const containerId = `waybill-invoices-${waybillId}`;
        if (waybillId) {
            loadWaybillInvoices(waybillId, containerId);
        }
    }
    
    renderOverviewTab(waybill) {
        const typeMap = {
            '1': 'შიდა გადაზიდვა',
            '2': 'ტრანსპორტირებით',
            '3': 'ტრანსპორტირების გარეშე',
            '4': 'დისტრიბუცია',
            '5': 'უკან დაბრუნება',
            '6': 'ქვე-ზედნადები'
        };
        
        const statusMap = {
            '0': 'შენახული',
            '1': 'აქტიური',
            '2': 'დასრულებული',
            '8': 'გადამზიდავთან გადაგზავნილი',
            '-1': 'წაშლილი',
            '-2': 'გაუქმებული'
        };
        
        const typeClass = waybill.TYPE ? `type-${waybill.TYPE === '1' ? 'internal' : waybill.TYPE === '2' ? 'transport' : waybill.TYPE === '3' ? 'no-transport' : waybill.TYPE === '4' ? 'distribution' : waybill.TYPE === '5' ? 'return' : waybill.TYPE === '6' ? 'sub-waybill' : 'other'}` : '';
        const statusClass = waybill.STATUS ? `status-${waybill.STATUS === '0' ? 'saved' : waybill.STATUS === '1' ? 'activated' : waybill.STATUS === '2' ? 'completed' : waybill.STATUS === '8' ? 'transported' : waybill.STATUS === '-1' ? 'deleted' : waybill.STATUS === '-2' ? 'cancelled' : 'inactive'}` : '';
        
        return `
            <div class="waybill-detail-section">
                <h6><i class="bi bi-info-circle me-2"></i>ძირითადი ინფორმაცია</h6>
                
                <div class="row">
                    <div class="col-md-6">
                        <div class="detail-row">
                            <span class="detail-label">ზედნადების ID:</span>
                            <span class="detail-value">${waybill.ID || 'N/A'}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">External ID:</span>
                            <span class="detail-value">${waybill.EXTERNAL_ID || 'N/A'}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">ზედნადების ნომერი:</span>
                            <span class="detail-value">${waybill.WAYBILL_NUMBER || 'N/A'}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">ტიპი:</span>
                            <span class="detail-value">
                                <span class="type-badge ${typeClass}">${typeMap[waybill.TYPE] || waybill.TYPE || 'N/A'}</span>
                            </span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">სტატუსი:</span>
                            <span class="detail-value">
                                <span class="status-badge ${statusClass}">${statusMap[waybill.STATUS] || waybill.STATUS || 'N/A'}</span>
                            </span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">შექმნის თარიღი:</span>
                            <span class="detail-value date-value">${this.formatDate(waybill.CREATE_DATE)}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">დაწყების თარიღი:</span>
                            <span class="detail-value date-value">${this.formatDate(waybill.BEGIN_DATE)}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">აქტივაციის თარიღი:</span>
                            <span class="detail-value date-value">${this.formatDate(waybill.ACTIVATE_DATE)}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">მიწოდების თარიღი:</span>
                            <span class="detail-value date-value">${this.formatDate(waybill.DELIVERY_DATE)}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">დახურვის თარიღი:</span>
                            <span class="detail-value date-value">${this.formatDate(waybill.CLOSE_DATE)}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">საერთო თანხა:</span>
                            <span class="detail-value amount-highlight">${this.formatAmount(waybill.FULL_AMOUNT)}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">თანხის ტექსტი:</span>
                            <span class="detail-value">${waybill.FULL_AMOUNT_TXT || 'N/A'}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">თანხის ტექსტური ფორმა:</span>
                            <span class="detail-value">${waybill.FULL_AMOUNT_TXT || 'N/A'}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">საერთო რაოდენობა:</span>
                            <span class="detail-value">${waybill.TOTAL_QUANTITY || 'N/A'}</span>
                        </div>
                    </div>
                    
                    <div class="col-md-6">
                        <div class="detail-row">
                            <span class="detail-label">კომენტარი:</span>
                            <span class="detail-value">${waybill.COMMENT || 'N/A'}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">Parent ID:</span>
                            <span class="detail-value">${waybill.PAR_ID || 'N/A'}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">System User ID:</span>
                            <span class="detail-value">${waybill.S_USER_ID || 'N/A'}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">Seller UN ID:</span>
                            <span class="detail-value">${waybill.SELER_UN_ID || 'N/A'}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">Category:</span>
                            <span class="detail-value">${waybill.CATEGORY || 'N/A'}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">Is Medical:</span>
                            <span class="detail-value">${waybill.IS_MED === '1' ? 'კი' : 'არა'}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">Is Confirmed:</span>
                            <span class="detail-value">${waybill.IS_CONFIRMED === '1' ? 'კი' : 'არა'}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">დაკავშირებული ანგარიშ-ფაქტურები:</span>
                            <span class="detail-value">
                                <div id="waybill-invoices-${waybill.EXTERNAL_ID || waybill.ID}" class="invoice-links">
                                    <span class="loading-invoices">იტვირთება...</span>
                                </div>
                            </span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">Confirmation Date:</span>
                            <span class="detail-value date-value">${this.formatDate(waybill.CONFIRMATION_DATE)}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">Correction Date:</span>
                            <span class="detail-value date-value">${this.formatDate(waybill.CORRECTION_DATE)}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">Wood Labels:</span>
                            <span class="detail-value">${waybill.WOOD_LABELS || 'N/A'}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">Origin Type:</span>
                            <span class="detail-value">${waybill.ORIGIN_TYPE || 'N/A'}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">Origin Text:</span>
                            <span class="detail-value">${waybill.ORIGIN_TEXT || 'N/A'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderPartiesTab(waybill) {
        return `
            <div class="waybill-detail-section">
                <h6><i class="bi bi-people me-2"></i>მხარეების ინფორმაცია</h6>
                
                <div class="row">
                    <div class="col-md-6">
                        <h6 class="text-primary">გამყიდველი</h6>
                        <div class="detail-row">
                            <span class="detail-label">სახელი:</span>
                            <span class="detail-value company-name">${waybill.SELLER_NAME || 'N/A'}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">საიდენტიფიკაციო ნომერი:</span>
                            <span class="detail-value tin-value">${waybill.SELLER_TIN || 'N/A'}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">უნიკალური ნომერი:</span>
                            <span class="detail-value">${waybill.SELER_UN_ID || 'N/A'}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">Buyer S User ID:</span>
                            <span class="detail-value">${waybill.BUYER_S_USER_ID || 'N/A'}</span>
                        </div>
                    </div>
                    
                    <div class="col-md-6">
                        <h6 class="text-success">მყიდველი</h6>
                        <div class="detail-row">
                            <span class="detail-label">სახელი:</span>
                            <span class="detail-value company-name">${waybill.BUYER_NAME || 'N/A'}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">საიდენტიფიკაციო ნომერი:</span>
                            <span class="detail-value tin-value">${waybill.BUYER_TIN || 'N/A'}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">ქართველია:</span>
                            <span class="detail-value">${waybill.CHEK_BUYER_TIN === '1' ? 'კი' : 'არა'}</span>
                        </div>
                    </div>
                </div>
                
                <div class="row mt-3">
                    <div class="col-md-6">
                        <h6 class="text-info">მისამართები</h6>
                        <div class="detail-row">
                            <span class="detail-label">დაწყების მისამართი:</span>
                            <span class="detail-value address-value">${waybill.START_ADDRESS || 'N/A'}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">დასრულების მისამართი:</span>
                            <span class="detail-value address-value">${waybill.END_ADDRESS || 'N/A'}</span>
                        </div>
                    </div>
                    
                    <div class="col-md-6">
                        <h6 class="text-warning">საბაჟო ინფორმაცია</h6>
                        <div class="detail-row">
                            <span class="detail-label">საბაჟოს სახელი:</span>
                            <span class="detail-value">${waybill.CUST_NAME || 'N/A'}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">საბაჟოს სტატუსი:</span>
                            <span class="detail-value">${waybill.CUST_STATUS || 'N/A'}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">Quantity F:</span>
                            <span class="detail-value">${waybill.QUANTITY_F || 'N/A'}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">VAT Type:</span>
                            <span class="detail-value">${waybill.VAT_TYPE || 'N/A'}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">Bar Code:</span>
                            <span class="detail-value">${waybill.BAR_CODE || 'N/A'}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">A ID:</span>
                            <span class="detail-value">${waybill.A_ID || 'N/A'}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">W ID:</span>
                            <span class="detail-value">${waybill.W_ID || 'N/A'}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">Wood Label:</span>
                            <span class="detail-value">${waybill.WOOD_LABEL || 'N/A'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderTransportTab(waybill) {
        return `
            <div class="waybill-detail-section">
                <h6><i class="bi bi-truck me-2"></i>ტრანსპორტის ინფორმაცია</h6>
                
                <div class="row">
                    <div class="col-md-6">
                        <h6 class="text-primary">მძღოლი</h6>
                        <div class="detail-row">
                            <span class="detail-label">სახელი:</span>
                            <span class="detail-value">${waybill.DRIVER_NAME || 'N/A'}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">საიდენტიფიკაციო ნომერი:</span>
                            <span class="detail-value tin-value">${waybill.DRIVER_TIN || 'N/A'}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">ქართველია:</span>
                            <span class="detail-value">${waybill.CHEK_DRIVER_TIN === '1' ? 'კი' : 'არა'}</span>
                        </div>
                    </div>
                    
                    <div class="col-md-6">
                        <h6 class="text-success">ტრანსპორტი</h6>
                        <div class="detail-row">
                            <span class="detail-label">მანქანის ნომერი:</span>
                            <span class="detail-value">${waybill.CAR_NUMBER || 'N/A'}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">ტრანსპორტის ღირებულება:</span>
                            <span class="detail-value">${this.formatAmount(waybill.TRANSPORT_COAST)}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">ღირებულების გადამხდელი:</span>
                            <span class="detail-value">${waybill.TRAN_COST_PAYER === '1' ? 'მყიდველი' : waybill.TRAN_COST_PAYER === '2' ? 'გამყიდველი' : waybill.TRAN_COST_PAYER === '0' ? 'არ არის განსაზღვრული' : 'N/A'}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">ტრანსპორტირების ღირებულება:</span>
                            <span class="detail-value">${this.formatAmount(waybill.TRANSPORT_COAST)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="row mt-3">
                    <div class="col-md-6">
                        <h6 class="text-info">ტრანსპორტირების დეტალები</h6>
                        <div class="detail-row">
                            <span class="detail-label">ტრანსპორტის ტიპი ID:</span>
                            <span class="detail-value">${waybill.TRANS_ID || 'N/A'}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">ტრანსპორტის ტიპი:</span>
                            <span class="detail-value">${waybill.TRANS_TXT || 'N/A'}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">Transporter TIN:</span>
                            <span class="detail-value">${waybill.TRANSPORTER_TIN || 'N/A'}</span>
                        </div>
                    </div>
                    
                    <div class="col-md-6">
                        <h6 class="text-warning">მიწოდების ინფორმაცია</h6>
                        <div class="detail-row">
                            <span class="detail-label">მიმწოდებლის ინფორმაცია:</span>
                            <span class="detail-value">${waybill.RECEPTION_INFO || 'N/A'}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">მიმღების ინფორმაცია:</span>
                            <span class="detail-value">${waybill.RECEIVER_INFO || 'N/A'}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">საერთო რაოდენობა:</span>
                            <span class="detail-value">${waybill.TOTAL_QUANTITY || 'N/A'}</span>
                        </div>
                    </div>
                </div>
                
                <div class="row mt-3">
                    <div class="col-md-6">
                        <h6 class="text-secondary">დამატებითი ინფორმაცია</h6>
                        <div class="detail-row">
                            <span class="detail-label">Origin Type:</span>
                            <span class="detail-value">${waybill.ORIGIN_TYPE || 'N/A'}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">Origin Text:</span>
                            <span class="detail-value">${waybill.ORIGIN_TEXT || 'N/A'}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">Wood Labels:</span>
                            <span class="detail-value">${waybill.WOOD_LABELS || 'N/A'}</span>
                        </div>
                    </div>
                    
                    <div class="col-md-6">
                        <div class="detail-row">
                            <span class="detail-label">საერთო თანხა:</span>
                            <span class="detail-value amount-highlight">${this.formatAmount(waybill.FULL_AMOUNT)}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderGoodsTab(waybill) {
        const goods = waybill.GOODS_LIST || [];
        
        if (goods.length === 0) {
            return `
                <div class="waybill-detail-section">
                    <h6><i class="bi bi-box me-2"></i>საქონლის ინფორმაცია</h6>
                    <div class="no-goods">საქონლის ინფორმაცია არ არის ხელმისაწვდომი</div>
                </div>
            `;
        }
        
        const totalQuantity = goods.reduce((sum, item) => sum + (parseFloat(item.QUANTITY) || 0), 0);
        const totalAmount = goods.reduce((sum, item) => sum + (parseFloat(item.AMOUNT) || 0), 0);
        
        const goodsRows = goods.map(item => `
            <tr>
                <td>${item.W_NAME || 'N/A'}</td>
                <td class="text-end">${this.formatNumber(item.QUANTITY)}</td>
                <td class="text-end">${this.formatNumber(item.QUANTITY_EXT)}</td>
                <td class="text-end">${this.formatAmount(item.PRICE)}</td>
                <td class="text-end">${this.formatAmount(item.AMOUNT)}</td>
                <td>${item.BAR_CODE || 'N/A'}</td>
                <td>${item.VAT_TYPE || 'N/A'}</td>
                <td>${item.STATUS || 'N/A'}</td>
                <td>${item.QUANTITY_F || 'N/A'}</td>
                <td>${item.WOOD_LABEL || 'N/A'}</td>
                <td>${item.A_ID || 'N/A'}</td>
                <td>${item.W_ID || 'N/A'}</td>
            </tr>
        `).join('');
        
        return `
            <div class="waybill-detail-section">
                <h6><i class="bi bi-box me-2"></i>საქონლის ინფორმაცია</h6>
                
                <div class="goods-summary">
                    <div class="goods-summary-row">
                        <span>საქონლის რაოდენობა:</span>
                        <span>${goods.length}</span>
                    </div>
                    <div class="goods-summary-row">
                        <span>საერთო რაოდენობა:</span>
                        <span>${this.formatNumber(totalQuantity)}</span>
                    </div>
                    <div class="goods-summary-row">
                        <span>საერთო თანხა:</span>
                        <span>${this.formatAmount(totalAmount)}</span>
                    </div>
                </div>
                
                <div class="table-responsive">
                    <table class="table table-sm goods-table">
                        <thead>
                            <tr>
                                <th>საქონლის დასახელება</th>
                                <th class="text-end">რაოდენობა</th>
                                <th class="text-end">დამხმარე რაოდენობა</th>
                                <th class="text-end">ფასი</th>
                                <th class="text-end">თანხა</th>
                                <th>შტრიხკოდი</th>
                                <th>დაბეგვრის ტიპი</th>
                                <th>სტატუსი</th>
                                <th>რაოდენობა F</th>
                                <th>ხის ნიშანი</th>
                                <th>A_ID</th>
                                <th>W_ID</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${goodsRows}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
    
    renderSubWaybillsTab(waybill) {
        const subWaybills = waybill.SUB_WAYBILLS || [];
        
        if (subWaybills.length === 0) {
            return `
                <div class="waybill-detail-section">
                    <h6><i class="bi bi-diagram-3 me-2"></i>ქვეზედნადებები</h6>
                    <div class="no-goods">ქვეზედნადებები არ არის ხელმისაწვდომი</div>
                </div>
            `;
        }
        
        const subWaybillsRows = subWaybills.map(item => `
            <tr>
                <td>${item.ID || 'N/A'}</td>
                <td>${item.WAYBILL_NUMBER || 'N/A'}</td>
            </tr>
        `).join('');
        
        return `
            <div class="waybill-detail-section">
                <h6><i class="bi bi-diagram-3 me-2"></i>ქვეზედნადებები</h6>
                
                <div class="goods-summary">
                    <div class="goods-summary-row">
                        <span>ქვეზედნადებების რაოდენობა:</span>
                        <span>${subWaybills.length}</span>
                    </div>
                </div>
                
                <div class="table-responsive">
                    <table class="table table-sm goods-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>ზედნადების ნომერი</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${subWaybillsRows}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
    

    
    renderWoodDocsTab(waybill) {
        const woodDocs = waybill.WOOD_DOCS_LIST || [];
        
        if (woodDocs.length === 0) {
            return `
                <div class="waybill-detail-section">
                    <h6><i class="bi bi-file-text me-2"></i>ხის დოკუმენტები</h6>
                    <div class="no-goods">ხის დოკუმენტები არ არის ხელმისაწვდომი</div>
                </div>
            `;
        }
        
        const woodDocsRows = woodDocs.map(item => `
            <tr>
                <td>${item.ID || 'N/A'}</td>
                <td>${item.DOC_N || 'N/A'}</td>
                <td>${this.formatDate(item.DOC_DATE)}</td>
                <td>${item.DOC_DESC || 'N/A'}</td>
                <td>${item.STATUS || 'N/A'}</td>
            </tr>
        `).join('');
        
        return `
            <div class="waybill-detail-section">
                <h6><i class="bi bi-file-text me-2"></i>ხის დოკუმენტები</h6>
                
                <div class="goods-summary">
                    <div class="goods-summary-row">
                        <span>დოკუმენტების რაოდენობა:</span>
                        <span>${woodDocs.length}</span>
                    </div>
                </div>
                
                <div class="table-responsive">
                    <table class="table table-sm goods-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>დოკუმენტის ნომერი</th>
                                <th>თარიღი</th>
                                <th>აღწერა</th>
                                <th>სტატუსი</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${woodDocsRows}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
    

    
    showError(message) {
        this.content.innerHTML = `
            <div class="text-center py-5">
                <i class="bi bi-exclamation-triangle text-danger" style="font-size: 3rem;"></i>
                <p class="mt-3 text-danger">${message}</p>
                <button type="button" class="btn btn-primary btn-sm" onclick="waybillDetailModal.show('${this.currentWaybillId}', '${this.currentWaybillType}')">
                    <i class="bi bi-arrow-clockwise me-1"></i> ხელახლა ცდა
                </button>
            </div>
        `;
    }
    
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('ka-GE', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return dateString;
        }
    }
    
    formatAmount(amount) {
        if (amount === null || amount === undefined || amount === '') return '0.00 ₾';
        return parseFloat(amount).toFixed(2) + ' ₾';
    }
    
    formatNumber(number) {
        if (number === null || number === undefined || number === '') return '0.00';
        return parseFloat(number).toFixed(2);
    }
    
    formatXml(xmlString) {
        if (!xmlString || xmlString === 'N/A') return xmlString;
        
        try {
            // Create a temporary DOM element to format the XML
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
            
            // Check if parsing was successful
            if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
                // If parsing failed, return the original string with basic formatting
                return xmlString.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            }
            
            // Format the XML with proper indentation
            const serializer = new XMLSerializer();
            const formatted = serializer.serializeToString(xmlDoc);
            
            // Add basic indentation
            let formattedXml = formatted;
            let indent = 0;
            const indentSize = 2;
            
            formattedXml = formattedXml.replace(/></g, '>\n<');
            const lines = formattedXml.split('\n');
            
            const formattedLines = lines.map(line => {
                line = line.trim();
                if (!line) return '';
                
                if (line.match(/<\//)) {
                    indent -= indentSize;
                }
                
                const indentedLine = ' '.repeat(Math.max(0, indent)) + line;
                
                if (line.match(/<[^/][^>]*[^/]>/) && !line.match(/<\//)) {
                    indent += indentSize;
                }
                
                return indentedLine;
            });
            
            return formattedLines.join('\n');
        } catch (e) {
            // If formatting fails, return the original string with HTML entities
            return xmlString.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }
    }
    

    
    printWaybill() {
        if (!this.currentWaybillId) return;
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>ზედნადები ${this.currentWaybillId}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .section { margin-bottom: 20px; }
                    .section h3 { border-bottom: 1px solid #ccc; padding-bottom: 5px; }
                    .row { display: flex; justify-content: space-between; margin-bottom: 5px; }
                    .label { font-weight: bold; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    @media print { body { margin: 0; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>ზედნადები ${this.currentWaybillId}</h1>
                    <p>ბეჭდვის თარიღი: ${new Date().toLocaleDateString('ka-GE')}</p>
                </div>
                ${this.content.innerHTML}
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    }
}

// Initialize the modal
window.waybillDetailModal;
document.addEventListener('DOMContentLoaded', function() {
    window.waybillDetailModal = new WaybillDetailModal();
});

// Navigation history for modal transitions
window.modalHistory = [];

// Function to open invoice management window
function manageInvoices(waybillId) {
    const companyUnId = getCurrentCompanyUnId(); // You'll need to implement this
    const url = `associate_invoices_with_waybill.php?waybill_id=${waybillId}&company_un_id=${companyUnId}`;
    window.open(url, 'manage_invoices', 'width=1000,height=700,scrollbars=yes,resizable=yes');
}

// Function to get current company UN ID (placeholder - implement based on your context)
function getCurrentCompanyUnId() {
    // This should be implemented based on how you track the current company
    // For now, return null to show all invoices
    return null;
}

// Function to load and display multiple invoices for a waybill
async function loadWaybillInvoices(waybillId, containerId) {
    try {
        const response = await fetch(`get_waybill_invoices.php?api=1&action=get_details&waybill_id=${waybillId}`);
        const data = await response.json();
        
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Invoice container not found:', containerId);
            return;
        }
        
        if (data.success && data.invoices && data.invoices.length > 0) {
            let html = '';
            data.invoices.forEach((invoice, index) => {
                const invoiceLabel = `Invoice ${invoice.invoice_id}`;
                const amount = invoice.amount ? `(${invoice.amount} ₾)` : '';
                
                html += `
                    <div class="invoice-cell-item">
                        <a href="#" class="text-primary text-decoration-underline fw-medium" 
                           onclick="showInvoiceDetails('${invoice.invoice_id}'); return false;">
                            ${invoiceLabel}
                        </a>
                        <span class="text-muted ms-2">${amount}</span>
                    </div>
                `;
            });
            container.innerHTML = html;
        } else {
            container.innerHTML = '<span class="text-muted">No invoices found</span>';
        }
    } catch (error) {
        console.error('Error loading waybill invoices:', error);
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = '<span class="text-danger">Error loading invoices</span>';
        }
    }
}



// Function to show invoice details (called from waybill modal)
window.showInvoiceDetails = function(invoiceId) {
    if (typeof invoiceDetailModal !== 'undefined') {
        // Store current waybill info in history
        const currentWaybillId = document.querySelector('#waybillDetailModal .modal-title')?.textContent?.match(/ID:\s*(\d+)/)?.[1];
        if (currentWaybillId) {
            modalHistory.push({ type: 'waybill', id: currentWaybillId });
        }
        
        // Hide current waybill modal before showing invoice modal
        const waybillModal = document.getElementById('waybillDetailModal');
        if (waybillModal) {
            const bsModal = bootstrap.Modal.getInstance(waybillModal);
            if (bsModal) {
                bsModal.hide();
            }
        }
        
        // Small delay to ensure smooth transition
        setTimeout(() => {
            invoiceDetailModal.show(invoiceId);
            // Show back button in invoice modal
            const invoiceBackBtn = document.getElementById('invoiceBackBtn');
            if (invoiceBackBtn) {
                invoiceBackBtn.style.display = 'inline-block';
            }
        }, 150);
    } else {
        console.error('Invoice detail modal not initialized');
    }
}

    // Back button functionality for waybill modal
    document.addEventListener('DOMContentLoaded', function() {
        const waybillBackBtn = document.getElementById('waybillBackBtn');
        
        if (waybillBackBtn) {
            waybillBackBtn.addEventListener('click', function() {
                // Go back to previous modal in history
                if (modalHistory.length > 0) {
                    const previous = modalHistory.pop();
                    if (previous.type === 'invoice' && typeof invoiceDetailModal !== 'undefined') {
                        // Hide current waybill modal
                        const waybillModal = document.getElementById('waybillDetailModal');
                        if (waybillModal) {
                            const bsModal = bootstrap.Modal.getInstance(waybillModal);
                            if (bsModal) {
                                bsModal.hide();
                            }
                        }
                        
                        // Show previous invoice modal
                        setTimeout(() => {
                            invoiceDetailModal.show(previous.id);
                        }, 150);
                    }
                }
            });
        }
    });
</script> 