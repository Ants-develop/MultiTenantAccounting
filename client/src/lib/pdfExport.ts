import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PDFExportOptions {
  title: string;
  filename: string;
  orientation?: 'portrait' | 'landscape';
  format?: 'a4' | 'letter';
  marginTop?: number;
  marginLeft?: number;
}

export interface CompanyInfo {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  taxId?: string;
}

/**
 * Generate PDF from HTML element
 */
export async function exportElementToPDF(
  element: HTMLElement,
  options: PDFExportOptions
): Promise<void> {
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: options.orientation || 'portrait',
      unit: 'mm',
      format: options.format || 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    const imgX = (pdfWidth - imgWidth * ratio) / 2;
    const imgY = options.marginTop || 30;

    pdf.addImage(
      imgData,
      'PNG',
      imgX,
      imgY,
      imgWidth * ratio,
      imgHeight * ratio
    );

    pdf.save(options.filename);
  } catch (error) {
    console.error('PDF generation error:', error);
    throw new Error('Failed to generate PDF');
  }
}

/**
 * Generate Financial Statement PDF
 */
export async function exportFinancialStatementToPDF(
  data: any,
  reportType: string,
  companyInfo: CompanyInfo,
  dateRange: { startDate?: string; endDate: string }
): Promise<void> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 20;
  let yPosition = margin;

  // Helper function to add text
  const addText = (text: string, fontSize = 10, align: 'left' | 'center' | 'right' = 'left') => {
    pdf.setFontSize(fontSize);
    if (align === 'center') {
      pdf.text(text, pageWidth / 2, yPosition, { align: 'center' });
    } else if (align === 'right') {
      pdf.text(text, pageWidth - margin, yPosition, { align: 'right' });
    } else {
      pdf.text(text, margin, yPosition);
    }
    yPosition += fontSize * 0.5 + 2;
  };

  // Header
  pdf.setFont('helvetica', 'bold');
  addText(companyInfo.name, 16, 'center');
  
  pdf.setFont('helvetica', 'normal');
  if (companyInfo.address) addText(companyInfo.address, 10, 'center');
  if (companyInfo.phone) addText(`Phone: ${companyInfo.phone}`, 10, 'center');
  if (companyInfo.email) addText(`Email: ${companyInfo.email}`, 10, 'center');
  
  yPosition += 10;

  // Report Title
  pdf.setFont('helvetica', 'bold');
  const reportTitle = reportType === 'profit-loss' ? 'Profit & Loss Statement' :
                     reportType === 'balance-sheet' ? 'Balance Sheet' : 
                     'Trial Balance';
  addText(reportTitle, 14, 'center');

  // Date Range
  pdf.setFont('helvetica', 'normal');
  const dateText = reportType === 'profit-loss' 
    ? `For the period ${formatDate(dateRange.startDate!)} to ${formatDate(dateRange.endDate)}`
    : `As of ${formatDate(dateRange.endDate)}`;
  addText(dateText, 10, 'center');
  
  yPosition += 10;

  // Report Content
  if (reportType === 'profit-loss') {
    generateProfitLossContent(pdf, data, margin, yPosition, pageWidth);
  } else if (reportType === 'balance-sheet') {
    generateBalanceSheetContent(pdf, data, margin, yPosition, pageWidth);
  } else if (reportType === 'trial-balance') {
    generateTrialBalanceContent(pdf, data, margin, yPosition, pageWidth);
  }

  // Footer
  const currentDate = new Date().toLocaleDateString();
  pdf.setFontSize(8);
  pdf.text(`Generated on ${currentDate}`, margin, pdf.internal.pageSize.getHeight() - 10);

  // Save PDF
  const filename = `${reportTitle.replace(/\s+/g, '_').toLowerCase()}_${dateRange.endDate}.pdf`;
  pdf.save(filename);
}

function generateProfitLossContent(pdf: jsPDF, data: any, margin: number, startY: number, pageWidth: number) {
  let yPosition = startY;
  
  const addLine = (label: string, amount: number, indent = 0, bold = false) => {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.text(label, margin + indent, yPosition);
    pdf.text(formatCurrency(amount), pageWidth - margin, yPosition, { align: 'right' });
    yPosition += 6;
  };

  const addSectionHeader = (title: string) => {
    yPosition += 5;
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, margin, yPosition);
    yPosition += 8;
  };

  // Revenue
  addSectionHeader('Revenue');
  const revenueAccounts = data.accounts?.filter((acc: any) => acc.type === 'revenue') || [];
  let totalRevenue = 0;
  
  revenueAccounts.forEach((account: any) => {
    addLine(account.name, account.amount, 10);
    totalRevenue += account.amount;
  });
  
  addLine('Total Revenue', totalRevenue, 0, true);

  // Expenses
  addSectionHeader('Expenses');
  const expenseAccounts = data.accounts?.filter((acc: any) => acc.type === 'expense') || [];
  let totalExpenses = 0;
  
  expenseAccounts.forEach((account: any) => {
    addLine(account.name, account.amount, 10);
    totalExpenses += account.amount;
  });
  
  addLine('Total Expenses', totalExpenses, 0, true);

  // Net Income
  yPosition += 5;
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;
  addLine('Net Income', totalRevenue - totalExpenses, 0, true);
}

function generateBalanceSheetContent(pdf: jsPDF, data: any, margin: number, startY: number, pageWidth: number) {
  let yPosition = startY;
  
  const addLine = (label: string, amount: number, indent = 0, bold = false) => {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.text(label, margin + indent, yPosition);
    pdf.text(formatCurrency(amount), pageWidth - margin, yPosition, { align: 'right' });
    yPosition += 6;
  };

  const addSectionHeader = (title: string) => {
    yPosition += 5;
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, margin, yPosition);
    yPosition += 8;
  };

  // Assets
  addSectionHeader('Assets');
  const assetAccounts = data.accounts?.filter((acc: any) => acc.type === 'asset') || [];
  let totalAssets = 0;
  
  assetAccounts.forEach((account: any) => {
    addLine(account.name, account.amount, 10);
    totalAssets += account.amount;
  });
  
  addLine('Total Assets', totalAssets, 0, true);

  // Liabilities
  addSectionHeader('Liabilities');
  const liabilityAccounts = data.accounts?.filter((acc: any) => acc.type === 'liability') || [];
  let totalLiabilities = 0;
  
  liabilityAccounts.forEach((account: any) => {
    addLine(account.name, account.amount, 10);
    totalLiabilities += account.amount;
  });
  
  addLine('Total Liabilities', totalLiabilities, 0, true);

  // Equity
  addSectionHeader('Equity');
  const equityAccounts = data.accounts?.filter((acc: any) => acc.type === 'equity') || [];
  let totalEquity = 0;
  
  equityAccounts.forEach((account: any) => {
    addLine(account.name, account.amount, 10);
    totalEquity += account.amount;
  });
  
  addLine('Total Equity', totalEquity, 0, true);

  // Total Liabilities and Equity
  yPosition += 5;
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;
  addLine('Total Liabilities and Equity', totalLiabilities + totalEquity, 0, true);
}

function generateTrialBalanceContent(pdf: jsPDF, data: any, margin: number, startY: number, pageWidth: number) {
  let yPosition = startY;
  
  // Table headers
  pdf.setFont('helvetica', 'bold');
  pdf.text('Account Code', margin, yPosition);
  pdf.text('Account Name', margin + 30, yPosition);
  pdf.text('Debit', pageWidth - margin - 40, yPosition, { align: 'right' });
  pdf.text('Credit', pageWidth - margin, yPosition, { align: 'right' });
  
  yPosition += 2;
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;

  // Account data
  pdf.setFont('helvetica', 'normal');
  data.accounts?.forEach((account: any) => {
    pdf.text(account.code, margin, yPosition);
    pdf.text(account.name, margin + 30, yPosition);
    
    if (account.debitBalance > 0) {
      pdf.text(formatCurrency(account.debitBalance), pageWidth - margin - 40, yPosition, { align: 'right' });
    }
    if (account.creditBalance > 0) {
      pdf.text(formatCurrency(account.creditBalance), pageWidth - margin, yPosition, { align: 'right' });
    }
    
    yPosition += 6;
  });

  // Totals
  yPosition += 5;
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;
  
  pdf.setFont('helvetica', 'bold');
  pdf.text('TOTALS', margin, yPosition);
  pdf.text(formatCurrency(data.totalDebits || 0), pageWidth - margin - 40, yPosition, { align: 'right' });
  pdf.text(formatCurrency(data.totalCredits || 0), pageWidth - margin, yPosition, { align: 'right' });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Export Invoice to PDF
 */
export async function exportInvoiceToPDF(
  invoice: any,
  companyInfo: CompanyInfo,
  customer: any
): Promise<void> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 20;
  let yPosition = margin;

  // Helper function to add text
  const addText = (text: string, fontSize = 10, align: 'left' | 'center' | 'right' = 'left') => {
    pdf.setFontSize(fontSize);
    if (align === 'center') {
      pdf.text(text, pageWidth / 2, yPosition, { align: 'center' });
    } else if (align === 'right') {
      pdf.text(text, pageWidth - margin, yPosition, { align: 'right' });
    } else {
      pdf.text(text, margin, yPosition);
    }
    yPosition += fontSize * 0.5 + 2;
  };

  // Header
  pdf.setFont('helvetica', 'bold');
  addText(companyInfo.name, 16);
  
  pdf.setFont('helvetica', 'normal');
  if (companyInfo.address) addText(companyInfo.address, 10);
  if (companyInfo.phone) addText(`Phone: ${companyInfo.phone}`, 10);
  if (companyInfo.email) addText(`Email: ${companyInfo.email}`, 10);
  
  yPosition += 10;

  // Invoice Title and Number
  pdf.setFont('helvetica', 'bold');
  addText('INVOICE', 18, 'center');
  
  pdf.setFont('helvetica', 'normal');
  addText(`Invoice #: ${invoice.number}`, 12, 'right');
  addText(`Date: ${formatDate(invoice.date)}`, 12, 'right');
  addText(`Due Date: ${formatDate(invoice.dueDate)}`, 12, 'right');
  
  yPosition += 10;

  // Customer Information
  pdf.setFont('helvetica', 'bold');
  addText('Bill To:', 12);
  
  pdf.setFont('helvetica', 'normal');
  addText(customer.name, 10);
  if (customer.address) addText(customer.address, 10);
  if (customer.email) addText(customer.email, 10);
  
  yPosition += 10;

  // Invoice details would be added here
  // This is a basic structure - in a real implementation,
  // you'd add line items, calculations, etc.

  pdf.save(`invoice_${invoice.number}.pdf`);
} 