<!-- Comprehensive Invoice Detail Modal -->
<div class="modal fade" id="invoiceDetailModal" tabindex="-1" aria-labelledby="invoiceDetailModalLabel" aria-hidden="true">
    <div class="modal-dialog" style="max-width: 95%; width: 95%;">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="invoiceDetailModalLabel">
                    <i class="bi bi-receipt me-2"></i>ინვოისის დეტალები
                </h5>
                <div class="d-flex align-items-center">
                    <button type="button" class="btn btn-outline-secondary btn-sm me-2" id="invoiceBackBtn" style="display: none;" aria-label="Go back to previous view">
                        <i class="bi bi-arrow-left me-1"></i> უკან
                    </button>
                    <button type="button" class="btn btn-outline-secondary btn-sm me-2" id="printInvoiceBtn" style="display: none;" aria-label="Print invoice details">
                        <i class="bi bi-printer me-1"></i>ბეჭდვა
                    </button>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close modal"></button>
                </div>
            </div>
            <div class="modal-body">
                <div id="invoiceDetailContent">
                    <div class="text-center">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">იტვირთება...</span>
                        </div>
                        <p class="mt-2">იტვირთება ინვოისის დეტალები...</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<style>
/* Modal styling */
.modal-dialog[style*="95%"] .modal-content {
    border-radius: 8px;
}

.modal-dialog[style*="95%"] .modal-body {
    padding: 20px;
    max-height: 70vh;
    overflow-y: auto;
}

/* Content sections */
.invoice-details-container {
    padding: 20px 0;
    max-height: 70vh;
    overflow-y: auto;
}

.detail-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 8px 0;
    border-bottom: 1px solid #e9ecef;
}

.detail-row:has(.waybill-ids-container) {
    align-items: flex-start;
    flex-direction: column;
}

.detail-row:has(.waybill-ids-container) .detail-label {
    margin-bottom: 8px;
}

.detail-row:has(.waybill-ids-container) .detail-value {
    text-align: left;
    width: 100%;
}

.detail-row:last-child {
    border-bottom: none;
}

.detail-label {
    font-weight: 600;
    color: #495057;
    min-width: 200px;
}

.detail-value {
    color: #212529;
    text-align: right;
    flex: 1;
}

/* Section styling */
.invoice-section {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 25px;
    border-left: 4px solid #007bff;
}

.invoice-section h6 {
    color: #495057;
    font-weight: 600;
    margin-bottom: 15px;
    border-bottom: 2px solid #dee2e6;
    padding-bottom: 8px;
}

/* Goods table styling */
.goods-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 15px;
}

.goods-table th,
.goods-table td {
    padding: 12px 8px;
    text-align: left;
    border-bottom: 1px solid #dee2e6;
}

.goods-table th {
    background-color: #e9ecef;
    font-weight: 600;
    color: #495057;
}

.goods-table tbody tr:hover {
    background-color: #f8f9fa;
}



/* Waybill IDs styling */
.waybill-ids-container {
    max-width: 100%;
    line-height: 1.8;
}

.waybill-id-item {
    display: inline-block;
    vertical-align: top;
}

.waybill-id-item .btn-outline-primary {
    font-size: 11px;
    padding: 3px 8px;
    border-radius: 15px;
    transition: all 0.2s ease;
}

.waybill-id-item .btn-outline-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0,123,255,0.3);
}

.waybill-id-item .bi-truck {
    font-size: 10px;
}

/* Status badges */
.status-badge {
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
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

.status-saved {
    background-color: #cce5ff;
    color: #004085;
}

.status-inactive {
    background-color: #e2e3e5;
    color: #383d41;
}

/* Print styles */
@media print {
    .modal-header,
    .btn-close,
    #printInvoiceBtn {
        display: none !important;
    }
    
    .modal-dialog[style*="95%"] {
        position: static !important;
        transform: none !important;
    }
    
    .modal-content {
        box-shadow: none !important;
        border: none !important;
    }
}
</style>

<script>
class InvoiceDetailModal {
    constructor() {
        this.modal = document.getElementById('invoiceDetailModal');
        this.content = document.getElementById('invoiceDetailContent');
        this.printBtn = document.getElementById('printInvoiceBtn');
        this.modalInstance = null;
        
        this.initializeModal();
        this.bindEvents();
    }
    
    initializeModal() {
        this.modalInstance = new bootstrap.Modal(this.modal);
    }
    
    bindEvents() {
        this.printBtn.addEventListener('click', () => {
            window.print();
        });
    }
    
    show(invoiceId) {
        this.modalInstance.show();
        this.fetchInvoiceDetails(invoiceId);
    }
    
    hide() {
        this.modalInstance.hide();
    }
    
    async fetchInvoiceDetails(invoiceId) {
        // Input validation
        if (!invoiceId || typeof invoiceId !== 'string' || invoiceId.trim() === '') {
            console.error('Invalid invoice ID provided:', invoiceId);
            this.showError('Invalid invoice ID provided');
            return;
        }
        
        // Sanitize invoice ID
        const sanitizedInvoiceId = this.escapeHtml(invoiceId.trim());
        
        this.showLoading();
        
        try {
            console.log('Fetching invoice details for ID:', sanitizedInvoiceId);
            const response = await fetch(`get_invoice_details_rs.php?api=1&invoice_id=${encodeURIComponent(sanitizedInvoiceId)}&debug=1`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            console.log('API response:', data);
            console.log('Invoice data:', data.invoice);
            
            if (data.success && data.invoice) {
                this.renderInvoiceDetails(data);
            } else {
                console.error('API error response:', data);
                this.showError(data.message || 'Failed to fetch invoice details');
            }
        } catch (error) {
            console.error('API error:', error);
            this.showError(`Network error occurred while fetching invoice details: ${error.message}`);
        }
    }
    
    showLoading() {
        this.content.innerHTML = `
            <div class="text-center" aria-live="polite" aria-busy="true">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">იტვირთება...</span>
                </div>
                <p class="mt-2">იტვირთება ინვოისის დეტალები...</p>
            </div>
        `;
        this.printBtn.style.display = 'none';
    }
    
    showError(message) {
        this.content.innerHTML = `
            <div class="alert alert-danger" role="alert" aria-live="polite">
                <i class="bi bi-exclamation-triangle me-2"></i>
                ${this.escapeHtml(message)}
            </div>
        `;
        this.printBtn.style.display = 'none';
    }
    
    renderInvoiceDetails(data) {
        const { invoice, source, debug } = data;
        
        console.log('Rendering invoice details:', invoice);
        console.log('Source:', source);
        console.log('Debug mode:', debug);
        
        // Validate invoice data
        if (!invoice || typeof invoice !== 'object') {
            console.error('Invalid invoice data received:', invoice);
            this.showError('Invalid invoice data received from server');
            return;
        }
        
        this.content.innerHTML = `
            <div class="invoice-details-container">
                ${this.renderOverviewSection(invoice)}
                ${this.renderPartiesSection(invoice)}
                ${this.renderCompanySection(invoice)}
                ${this.renderFinancialSection(invoice)}
                ${this.renderDocumentSection(invoice)}
                ${this.renderGoodsSection(invoice)}
                
                ${source === 'rs_service' ? `
                <div class="alert alert-info mt-3">
                    <i class="bi bi-info-circle me-2"></i>
                    მონაცემები მიღებულია RS სერვისიდან
                </div>
                ` : ''}
                
                ${debug ? `
                <div class="alert alert-warning mt-3">
                    <i class="bi bi-bug me-2"></i>
                    Debug mode is enabled - showing additional information
                </div>
                ` : ''}
            </div>
        `;
        
        this.printBtn.style.display = 'inline-block';
    }
    
    renderOverviewSection(invoice) {
        const waybillIds = Array.isArray(invoice.WAYBILL_IDS) 
            ? invoice.WAYBILL_IDS 
            : (typeof invoice.WAYBILL_IDS === 'string' && invoice.WAYBILL_IDS.length > 0 ? invoice.WAYBILL_IDS.split(',') : []);

        const waybillLinks = waybillIds.length > 0 ? 
            `<div class="waybill-ids-wrapper">
                ${waybillIds.length > 1 ? `<small class="text-muted mb-2 d-block"><i class="bi bi-info-circle me-1"></i>სულ ${waybillIds.length} ზედნადები</small>` : ''}
                ${waybillIds.map(id => 
                    `<span class="waybill-id-item mb-1 me-2 d-inline-block">
                        <a href="#" class="btn btn-outline-primary btn-sm text-decoration-none" 
                           onclick="showWaybillDetails('${this.escapeHtml(id.trim())}'); return false;" 
                           title="ზედნადების დეტალების ნახვა: ${this.escapeHtml(id.trim())}">
                            <i class="bi bi-truck me-1"></i>${this.escapeHtml(id.trim())}
                        </a>
                    </span>`
                ).join('')}
            </div>` : 
            '<span class="text-muted">N/A</span>';

        return `
            <div class="invoice-section">
                <h6><i class="bi bi-info-circle me-2"></i>მიმოხილვა</h6>
                <div class="row">
                    <div class="col-md-6">
                        <div class="detail-row">
                            <span class="detail-label">ინვოისის ID:</span>
                            <span class="detail-value">${this.safeFieldValue(invoice.INVOICE_ID || invoice.ID)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">სერია და ნომერი:</span>
                            <span class="detail-value">${this.safeFieldValue(invoice.F_SERIES)} ${this.safeFieldValue(invoice.F_NUMBER)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">ოპერაციის თარიღი:</span>
                            <span class="detail-value">${this.formatDate(invoice.OPERATION_DT)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">რეგისტრაციის თარიღი:</span>
                            <span class="detail-value">${this.formatDate(invoice.REG_DT)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">ტვირთის ზედნადების ნომერი:</span>
                            <span class="detail-value">${this.safeFieldValue(invoice.OVERHEAD_NO)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">ტვირთის ზედნადების თარიღი:</span>
                            <span class="detail-value">${this.formatDate(invoice.OVERHEAD_DT)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">ზედნადების ID-ები:</span>
                            <div class="detail-value waybill-ids-container">
                                ${waybillLinks}
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="detail-row">
                            <span class="detail-label">სტატუსი:</span>
                            <span class="detail-value">
                                <span class="status-badge ${this.getStatusClass(invoice.STATUS)}">
                                    ${this.getStatusText(invoice.STATUS)}
                                </span>
                            </span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">გამყიდველის UN ID:</span>
                            <span class="detail-value">${this.safeFieldValue(invoice.SELLER_UN_ID)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">მყიდველის UN ID:</span>
                            <span class="detail-value">${this.safeFieldValue(invoice.BUYER_UN_ID)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">საქმიანობის UN ID:</span>
                            <span class="detail-value">${this.safeFieldValue(invoice.R_UN_ID)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">მყიდველის სერვისის მომხმარებელი:</span>
                            <span class="detail-value">${this.safeFieldValue(invoice.B_S_USER_ID)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">დეკლარაციის სტატუსი:</span>
                            <span class="detail-value">${this.getDecStatusText(invoice.DEC_STATUS)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">დეკლარაციის თარიღი:</span>
                            <span class="detail-value">${this.formatDate(invoice.DECL_DATE)}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderPartiesSection(invoice) {
        return `
            <div class="invoice-section">
                <h6><i class="bi bi-people me-2"></i>მხარეები და დეკლარაციები</h6>
                <div class="row">
                    <div class="col-md-6">
                        <div class="detail-row">
                            <span class="detail-label">გამყიდველის დეკლარაციის ნომერი:</span>
                            <span class="detail-value">${this.safeFieldValue(invoice.SEQ_NUM_S)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">მყიდველის დეკლარაციის ნომერი:</span>
                            <span class="detail-value">${this.safeFieldValue(invoice.SEQ_NUM_B)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">მყიდველის TIN:</span>
                            <span class="detail-value">${this.safeFieldValue(invoice.BUYER_TIN)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">მყიდველის სახელი:</span>
                            <span class="detail-value">${this.safeFieldValue(invoice.BUYER_NAME)}</span>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="detail-row">
                            <span class="detail-label">კორექტირების ID:</span>
                            <span class="detail-value">${this.safeFieldValue(invoice.K_ID)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">კორექტირების ტიპი:</span>
                            <span class="detail-value">${this.getKTypeText(invoice.K_TYPE)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">იყო რეფერენსი:</span>
                            <span class="detail-value">${this.safeFieldValue(invoice.WAS_REF) === '1' ? 'კი' : 'არა'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">სისტემის მომხმარებელი ID:</span>
                            <span class="detail-value">${this.safeFieldValue(invoice.S_USER_ID)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">შენიშვნები:</span>
                            <span class="detail-value">${this.safeFieldValue(invoice.NOTES)}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderCompanySection(invoice) {
        return `
            <div class="invoice-section">
                <h6><i class="bi bi-building me-2"></i>კომპანიის ინფორმაცია</h6>
                <div class="row">
                    <div class="col-md-6">
                        <div class="detail-row">
                            <span class="detail-label">SA იდენტიფიკაციის ნომერი:</span>
                            <span class="detail-value">${invoice.SA_IDENT_NO || 'N/A'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">ორგანიზაციის სახელი:</span>
                            <span class="detail-value">${invoice.ORG_NAME || 'N/A'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">კომპანიის ID:</span>
                            <span class="detail-value">${invoice.COMPANY_ID || 'N/A'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">კომპანიის სახელი:</span>
                            <span class="detail-value">${invoice.COMPANY_NAME || 'N/A'}</span>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="detail-row">
                            <span class="detail-label">კომპანიის TIN:</span>
                            <span class="detail-value">${invoice.COMPANY_TIN || 'N/A'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">ბოლო განახლების თარიღი:</span>
                            <span class="detail-value">${this.formatDate(invoice.LAST_UPDATE_DATE)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">განახლების თარიღი:</span>
                            <span class="detail-value">${this.formatDate(invoice.UPDATED_AT)}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderFinancialSection(invoice) {
        return `
            <div class="invoice-section">
                <h6><i class="bi bi-cash-stack me-2"></i>ფინანსური ინფორმაცია</h6>
                <div class="row">
                    <div class="col-md-6">
                        <div class="detail-row">
                            <span class="detail-label">საერთო თანხა:</span>
                            <span class="detail-value">${this.formatAmount(invoice.TANXA)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">დღგ:</span>
                            <span class="detail-value">${this.formatAmount(invoice.VAT)}</span>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="detail-row">
                            <span class="detail-label">თანხმობის თარიღი:</span>
                            <span class="detail-value">${this.formatDate(invoice.AGREE_DATE)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">თანხმობის მომხმარებელი ID:</span>
                            <span class="detail-value">${invoice.AGREE_S_USER_ID || 'N/A'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderDocumentSection(invoice) {
        return `
            <div class="invoice-section">
                <h6><i class="bi bi-file-earmark-text me-2"></i>დოკუმენტის ინფორმაცია</h6>
                <div class="row">
                    <div class="col-md-6">
                        <div class="detail-row">
                            <span class="detail-label">გამყიდველის დოკუმენტის ნომერი:</span>
                            <span class="detail-value">${invoice.DOC_MOS_NOM_S || 'N/A'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">მყიდველის დოკუმენტის ნომერი:</span>
                            <span class="detail-value">${invoice.DOC_MOS_NOM_B || 'N/A'}</span>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="detail-row">
                            <span class="detail-label">რეფერენსის თარიღი:</span>
                            <span class="detail-value">${this.formatDate(invoice.REF_DATE)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">რეფერენსის მომხმარებელი ID:</span>
                            <span class="detail-value">${invoice.REF_S_USER_ID || 'N/A'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderGoodsSection(invoice) {
        const goodsList = invoice.GOODS_LIST || invoice.goods_list || [];
        if (!goodsList || goodsList.length === 0) {
            return `
                <div class="invoice-section">
                    <h6><i class="bi bi-box me-2"></i>საქონელი</h6>
                    <div class="alert alert-info">
                        <i class="bi bi-info-circle me-2"></i>
                        საქონლის მონაცემები არ არის ხელმისაწვდომი
                    </div>
                </div>
            `;
        }
        
        const goodsRows = goodsList.map(item => `
            <tr>
                <td>${this.escapeHtml(item.ID || 'N/A')}</td>
                <td>${this.escapeHtml(item.INV_ID || 'N/A')}</td>
                <td>${this.escapeHtml(item.GOODS || 'N/A')}</td>
                <td>${this.escapeHtml(item.G_UNIT || 'N/A')}</td>
                <td class="text-end">${this.formatNumber(item.G_NUMBER)}</td>
                <td class="text-end">${this.formatAmount(item.FULL_AMOUNT)}</td>
                <td class="text-end">${this.formatAmount(item.DRG_AMOUNT)}</td>
                <td class="text-end">${this.formatAmount(item.AQCIZI_AMOUNT)}</td>
                <td>${this.escapeHtml(item.AKCIS_ID || 'N/A')}</td>
                <td class="text-end">${this.formatAmount(item.SDRG_AMOUNT)}</td>
                <td>${this.escapeHtml(item.WAYBILL_ID || 'N/A')}</td>
                <td>${this.escapeHtml(item.VAT_TYPE || 'N/A')}</td>
            </tr>
        `).join('');
        
        return `
            <div class="invoice-section">
                <h6><i class="bi bi-box me-2"></i>საქონელი</h6>
                <div class="table-responsive">
                    <table class="goods-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>INV_ID</th>
                                <th>საქონლის დასახელება</th>
                                <th>ერთეული</th>
                                <th class="text-end">რაოდენობა</th>
                                <th class="text-end">სრული თანხა</th>
                                <th class="text-end">დღგ</th>
                                <th class="text-end">აქციზი</th>
                                <th>აქციზური კოდი</th>
                                <th class="text-end">სტრიქონული დღგ</th>
                                <th>ზედნადების ID</th>
                                <th>დაბეგვრის ტიპი</th>
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
    

    
    escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }
    
    safeFieldValue(value, fallback = 'N/A') {
        if (!value || value === 'null' || value === 'undefined' || value === '') {
            return fallback;
        }
        return this.escapeHtml(String(value));
    }
    

    
    formatDate(dateString) {
        if (!dateString || dateString === 'N/A' || dateString === 'null' || dateString === 'undefined') return 'N/A';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'N/A';
            return date.toLocaleDateString('ka-GE');
        } catch (e) {
            console.warn('Error formatting date:', dateString, e);
            return 'N/A';
        }
    }
    
    formatNumber(value) {
        if (!value || value === 'N/A' || value === 'null' || value === 'undefined') return 'N/A';
        try {
            const num = parseFloat(value);
            if (isNaN(num)) return 'N/A';
            return num.toLocaleString('ka-GE', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        } catch (e) {
            console.warn('Error formatting number:', value, e);
            return 'N/A';
        }
    }
    
    formatAmount(value) {
        if (!value || value === 'N/A' || value === 'null' || value === 'undefined') return 'N/A';
        try {
            const num = parseFloat(value);
            if (isNaN(num)) return 'N/A';
            return num.toLocaleString('ka-GE', {
                style: 'currency',
                currency: 'GEL',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        } catch (e) {
            console.warn('Error formatting amount:', value, e);
            return 'N/A';
        }
    }
    
    getStatusText(status) {
        const statusMap = {
            '-1': 'წაშლილი',
            '0': 'შენახული',
            '1': 'გადაგზავნილი',
            '2': 'დადასტურებული',
            '3': 'კორექტირებული პირველადი',
            '4': 'მაკორექტირებელი',
            '5': 'მაკორექტირებელი გადაგზავნილი',
            '6': 'გადაგზავნილი გაუქმებული',
            '7': 'გაუქმების დადასტურება',
            '8': 'კორექტირებული დადასტურებული'
        };
        return statusMap[status] || `უცნობი (${status})`;
    }
    
    getStatusClass(status) {
        const statusClassMap = {
            '-1': 'status-deleted',    // წაშლილი - red
            '0': 'status-saved',       // შენახული - blue
            '1': 'status-sent',        // გადაგზავნილი - orange
            '2': 'status-confirmed',   // დადასტურებული - green
            '3': 'status-corrected1',  // კორექტირებული პირველადი - purple
            '4': 'status-correctable', // მაკორექტირებელი - yellow
            '5': 'status-correctable-sent', // მაკორექტირებელი გადაგზავნილი - orange
            '6': 'status-sent-cancelled', // გადაგზავნილი გაუქმებული - red
            '7': 'status-cancellation-confirmed', // გაუქმების დადასტურება - red
            '8': 'status-corrected-confirmed' // კორექტირებული დადასტურებული - green
        };
        return statusClassMap[status] || 'status-inactive';
    }
    
    getDecStatusText(status) {
        const statusMap = {
            '0': 'არ არის დეკლარირებული',
            '1': 'დეკლარირებული',
            '2': 'დეკლარაცია მიღებულია'
        };
        return statusMap[status] || `უცნობი (${status})`;
    }
    
    getKTypeText(type) {
        const typeMap = {
            '0': 'არ არის კორექტირებული',
            '1': 'კორექტირებული',
            '2': 'გაუქმებული'
        };
        return typeMap[type] || `უცნობი (${type})`;
    }
}

// Initialize modal
const invoiceDetailModal = new InvoiceDetailModal();

// Make modal globally accessible
window.invoiceDetailModal = invoiceDetailModal;

// Initialize modal history globally
window.modalHistory = window.modalHistory || [];

// Function to show invoice details (called from grid)
function showInvoiceDetails(invoiceId) {
    // Input validation
    if (!invoiceId || typeof invoiceId !== 'string' || invoiceId.trim() === '') {
        console.error('Invalid invoice ID provided:', invoiceId);
        return;
    }
    
    invoiceDetailModal.show(invoiceId);
}

// Make function globally accessible
window.showInvoiceDetails = showInvoiceDetails;

// Function to show waybill details (called from invoice modal)
function showWaybillDetails(waybillId) {
    // Input validation
    if (!waybillId || typeof waybillId !== 'string' || waybillId.trim() === '') {
        console.error('Invalid waybill ID provided:', waybillId);
        return;
    }
    
    if (typeof waybillDetailModal !== 'undefined') {
        // Store current invoice info in history
        const currentInvoiceId = document.querySelector('#invoiceDetailModal .modal-title')?.textContent?.match(/ID:\s*(\d+)/)?.[1];
        if (currentInvoiceId) {
            modalHistory.push({ type: 'invoice', id: currentInvoiceId });
        }
        
        // Hide current invoice modal before showing waybill modal
        const invoiceModal = document.getElementById('invoiceDetailModal');
        if (invoiceModal) {
            const bsModal = bootstrap.Modal.getInstance(invoiceModal);
            if (bsModal) {
                bsModal.hide();
            }
        }
        
        // Small delay to ensure smooth transition
        setTimeout(() => {
            waybillDetailModal.show(waybillId);
            // Show back button in waybill modal
            const waybillBackBtn = document.getElementById('waybillBackBtn');
            if (waybillBackBtn) {
                waybillBackBtn.style.display = 'inline-block';
            }
        }, 150);
    } else {
        console.error('Waybill detail modal not initialized');
    }
}

// Back button functionality for invoice modal
document.addEventListener('DOMContentLoaded', function() {
    const invoiceBackBtn = document.getElementById('invoiceBackBtn');
    
    if (invoiceBackBtn) {
        invoiceBackBtn.addEventListener('click', function() {
            // Go back to previous modal in history
            if (modalHistory.length > 0) {
                const previous = modalHistory.pop();
                if (previous.type === 'waybill' && typeof waybillDetailModal !== 'undefined') {
                    // Hide current invoice modal
                    const invoiceModal = document.getElementById('invoiceDetailModal');
                    if (invoiceModal) {
                        const bsModal = bootstrap.Modal.getInstance(invoiceModal);
                        if (bsModal) {
                            bsModal.hide();
                        }
                    }
                    
                    // Show previous waybill modal
                    setTimeout(() => {
                        waybillDetailModal.show(previous.id);
                    }, 150);
                }
            }
        });
    }
});
</script> 