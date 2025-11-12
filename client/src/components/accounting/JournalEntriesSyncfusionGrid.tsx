import { useMemo, useRef } from "react";
import {
  GridComponent,
  ColumnsDirective,
  ColumnDirective,
  Sort,
  Filter,
  Group,
  ContextMenu,
  ExcelExport,
  PdfExport,
  Toolbar,
  ColumnMenu,
  Reorder,
  VirtualScroll,
  Resize,
  Inject,
} from "@syncfusion/ej2-react-grids";
import type {
  GridComponent as GridComponentType,
  ToolbarItems,
  ContextMenuItem,
  FilterSettingsModel,
  SelectionSettingsModel,
} from "@syncfusion/ej2-react-grids";
import "@syncfusion/ej2-base/styles/material.css";
import "@syncfusion/ej2-buttons/styles/material.css";
import "@syncfusion/ej2-calendars/styles/material.css";
import "@syncfusion/ej2-dropdowns/styles/material.css";
import "@syncfusion/ej2-inputs/styles/material.css";
import "@syncfusion/ej2-navigations/styles/material.css";
import "@syncfusion/ej2-popups/styles/material.css";
import "@syncfusion/ej2-splitbuttons/styles/material.css";
import "@syncfusion/ej2-react-grids/styles/material.css";
import { useToast } from "@/hooks/use-toast";
import dayjs from 'dayjs';

interface JournalEntry {
  id: number;
  companyId: number;
  entryNumber: string;
  date: string;
  description: string;
  reference: string | null;
  totalAmount: string;
  userId: number | null;
  isPosted: boolean;
  createdAt: string | null;
  tenantCode: number | null;
  tenantName: string | null;
  abonent: string | null;
  postingsPeriod: string | null;
  register: string | null;
  branch: string | null;
  contentText: string | null;
  responsiblePerson: string | null;
  accountDr: string | null;
  accountNameDr: string | null;
  analyticDr: string | null;
  analyticRefDr: string | null;
  idDr: string | null;
  legalFormDr: string | null;
  countryDr: string | null;
  profitTaxDr: boolean | null;
  withholdingTaxDr: boolean | null;
  doubleTaxationDr: boolean | null;
  pensionSchemeParticipantDr: boolean | null;
  accountCr: string | null;
  accountNameCr: string | null;
  analyticCr: string | null;
  analyticRefCr: string | null;
  idCr: string | null;
  legalFormCr: string | null;
  countryCr: string | null;
  profitTaxCr: boolean | null;
  withholdingTaxCr: boolean | null;
  doubleTaxationCr: boolean | null;
  pensionSchemeParticipantCr: boolean | null;
  currency: string | null;
  amount: string | null;
  amountCur: string | null;
  quantityDr: string | null;
  quantityCr: string | null;
  rate: string | null;
  documentRate: string | null;
  taxInvoiceNumber: string | null;
  taxInvoiceDate: string | null;
  taxInvoiceSeries: string | null;
  waybillNumber: string | null;
  attachedFiles: string | null;
  docType: string | null;
  docDate: string | null;
  docNumber: string | null;
  documentCreationDate: string | null;
  documentModifyDate: string | null;
  documentComments: string | null;
  postingNumber: number | null;
}

interface JournalEntriesSyncfusionGridProps {
  journalEntries: JournalEntry[];
  isLoading?: boolean;
  isFetching?: boolean;
  onRefresh?: () => void;
}

// Syncfusion Grid CSS for compact styling
const syncfusionStyles = `
  #journal-entries-syncfusion-grid {
    height: 100% !important;
    width: 100% !important;
  }
  
  #journal-entries-syncfusion-grid .e-grid {
    position: relative !important;
    height: 100% !important;
    width: 100% !important;
  }
  
  #journal-entries-syncfusion-grid .e-gridcontent {
    font-size: 12px !important;
  }
  
  #journal-entries-syncfusion-grid .e-rowcell {
    padding: 4px 8px !important;
    height: 28px !important;
  }
  
  #journal-entries-syncfusion-grid .e-headercell {
    padding: 6px 8px !important;
    height: 32px !important;
    font-weight: 600 !important;
  }
  
  #journal-entries-syncfusion-grid .e-gridheader {
    font-size: 12px !important;
  }
  
  #journal-entries-syncfusion-grid .e-content {
    overflow: auto !important;
  }
`;

const toolbarOptions: ToolbarItems[] = ["Search", "ExcelExport", "PdfExport"];

const contextMenuItems: ContextMenuItem[] = [
  "AutoFit",
  "AutoFitAll",
  "SortAscending",
  "SortDescending",
  "Copy",
  "PdfExport",
  "ExcelExport",
];

const filterSettings: FilterSettingsModel = {
  type: "Excel",
  enableCaseSensitivity: false,
};

const selectionSettings: SelectionSettingsModel = {
  type: "Multiple",
  mode: "Row",
};

function StatusTemplate(props: any) {
  const isPosted = props.isPosted;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
        isPosted ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"
      }`}
    >
      {isPosted ? "Posted" : "Draft"}
    </span>
  );
}

function BooleanTemplate(props: any) {
  const value = props[Object.keys(props).find(key => key.includes('Dr') || key.includes('Cr')) || ''];
  return value ? "Yes" : "No";
}

export function JournalEntriesSyncfusionGrid({ 
  journalEntries, 
  isLoading = false,
  isFetching = false,
  onRefresh,
}: JournalEntriesSyncfusionGridProps) {
  const { toast } = useToast();
  const gridRef = useRef<GridComponentType | null>(null);

  // Prepare data for Syncfusion Grid
  const tableData = useMemo(() => {
    if (!journalEntries) return [];
    
    return journalEntries.map((entry: JournalEntry) => ({
      // Entry Information (4 columns)
      id: entry.id,
      entryNumber: entry.entryNumber,
      date: entry.date ? dayjs(entry.date).format('YYYY-MM-DD') : '',
      description: entry.description,
      // Transaction Details (2 columns)
      reference: entry.reference || '',
      totalAmount: parseFloat(entry.totalAmount || '0'),
      // Status & Tracking (2 columns)
      status: entry.isPosted ? 'Posted' : 'Draft',
      isPosted: entry.isPosted,
      // Created (1 column)
      createdAt: entry.createdAt ? dayjs(entry.createdAt).format('YYYY-MM-DD') : '',
      // Tenant & Organization (6 columns)
      tenantCode: entry.tenantCode || '',
      tenantName: entry.tenantName || '',
      abonent: entry.abonent || '',
      branch: entry.branch || '',
      postingsPeriod: entry.postingsPeriod ? dayjs(entry.postingsPeriod).format('YYYY-MM-DD') : '',
      register: entry.register || '',
      // Content & Responsible (2 columns)
      contentText: entry.contentText || '',
      responsiblePerson: entry.responsiblePerson || '',
      // Debit Account (2 columns)
      accountDr: entry.accountDr || '',
      accountNameDr: entry.accountNameDr || '',
      // Debit Account Details (8 columns)
      analyticDr: entry.analyticDr || '',
      analyticRefDr: entry.analyticRefDr || '',
      idDr: entry.idDr || '',
      legalFormDr: entry.legalFormDr || '',
      countryDr: entry.countryDr || '',
      profitTaxDr: entry.profitTaxDr || false,
      withholdingTaxDr: entry.withholdingTaxDr || false,
      doubleTaxationDr: entry.doubleTaxationDr || false,
      pensionSchemeParticipantDr: entry.pensionSchemeParticipantDr || false,
      // Credit Account (2 columns)
      accountCr: entry.accountCr || '',
      accountNameCr: entry.accountNameCr || '',
      // Credit Account Details (8 columns)
      analyticCr: entry.analyticCr || '',
      analyticRefCr: entry.analyticRefCr || '',
      idCr: entry.idCr || '',
      legalFormCr: entry.legalFormCr || '',
      countryCr: entry.countryCr || '',
      profitTaxCr: entry.profitTaxCr || false,
      withholdingTaxCr: entry.withholdingTaxCr || false,
      doubleTaxationCr: entry.doubleTaxationCr || false,
      pensionSchemeParticipantCr: entry.pensionSchemeParticipantCr || false,
      // Amounts & Quantities (7 columns)
      currency: entry.currency || '',
      amount: parseFloat(entry.amount || '0'),
      amountCur: parseFloat(entry.amountCur || '0'),
      quantityDr: parseFloat(entry.quantityDr || '0'),
      quantityCr: parseFloat(entry.quantityCr || '0'),
      rate: parseFloat(entry.rate || '0'),
      documentRate: parseFloat(entry.documentRate || '0'),
      // Tax Invoice (5 columns)
      taxInvoiceNumber: entry.taxInvoiceNumber || '',
      taxInvoiceDate: entry.taxInvoiceDate ? dayjs(entry.taxInvoiceDate).format('YYYY-MM-DD') : '',
      taxInvoiceSeries: entry.taxInvoiceSeries || '',
      waybillNumber: entry.waybillNumber || '',
      attachedFiles: parseFloat(entry.attachedFiles || '0'),
      // Document Info (6 columns)
      docType: entry.docType || '',
      docDate: entry.docDate ? dayjs(entry.docDate).format('YYYY-MM-DD') : '',
      docNumber: entry.docNumber || '',
      documentCreationDate: entry.documentCreationDate ? dayjs(entry.documentCreationDate).format('YYYY-MM-DD') : '',
      documentModifyDate: entry.documentModifyDate ? dayjs(entry.documentModifyDate).format('YYYY-MM-DD') : '',
      documentComments: entry.documentComments || '',
      // Posting (1 column)
      postingNumber: entry.postingNumber || '',
    }));
  }, [journalEntries]);

  const toolbarClick = (args: any) => {
    if (!gridRef.current) return;

    if (args.item.id?.includes("pdfexport")) {
      gridRef.current.pdfExport();
    }
    if (args.item.id?.includes("excelexport")) {
      gridRef.current.excelExport();
    }
  };

  if (isLoading && tableData.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full" style={{ height: '100%', minHeight: '400px', overflow: 'auto' }}>
      <style>{syncfusionStyles}</style>
      <GridComponent
        id="journal-entries-syncfusion-grid"
        ref={gridRef}
        dataSource={tableData}
        height="100%"
        width="100%"
        rowHeight={28}
        gridLines="Both"
        enableVirtualization
        allowSorting
        allowFiltering
        allowGrouping
        allowSelection
        allowExcelExport
        allowPdfExport
        showColumnMenu
        contextMenuItems={contextMenuItems}
        filterSettings={filterSettings}
        selectionSettings={selectionSettings}
        allowResizing
        allowReordering
        toolbar={toolbarOptions}
        toolbarClick={toolbarClick}
        enableHeaderFocus={false}
      >
        <ColumnsDirective>
          {/* Entry Information (4 columns) */}
          <ColumnDirective field="id" headerText="ID" width="60" textAlign="Right" type="number" />
          <ColumnDirective field="entryNumber" headerText="Entry Number" width="100" clipMode="EllipsisWithTooltip" />
          <ColumnDirective field="date" headerText="Date" width="100" type="date" format="yMd" />
          <ColumnDirective field="description" headerText="Description" width="180" clipMode="EllipsisWithTooltip" />
          
          {/* Transaction Details (2 columns) */}
          <ColumnDirective field="reference" headerText="Reference" width="120" clipMode="EllipsisWithTooltip" />
          <ColumnDirective field="totalAmount" headerText="Total Amount" width="120" textAlign="Right" type="number" format="N2" />
          
          {/* Status & Tracking (2 columns) */}
          <ColumnDirective field="status" headerText="Status" width="100" template={StatusTemplate} textAlign="Center" />
          <ColumnDirective field="isPosted" headerText="Posted" width="80" type="boolean" displayAsCheckBox={false} />
          
          {/* Created (1 column) */}
          <ColumnDirective field="createdAt" headerText="Created" width="100" type="date" format="yMd" />
          
          {/* Tenant & Organization (6 columns) */}
          <ColumnDirective field="tenantCode" headerText="Tenant Code" width="100" />
          <ColumnDirective field="tenantName" headerText="Tenant Name" width="150" clipMode="EllipsisWithTooltip" />
          <ColumnDirective field="abonent" headerText="Abonent" width="120" clipMode="EllipsisWithTooltip" />
          <ColumnDirective field="branch" headerText="Branch" width="100" clipMode="EllipsisWithTooltip" />
          <ColumnDirective field="postingsPeriod" headerText="Postings Period" width="120" type="date" format="yMd" />
          <ColumnDirective field="register" headerText="Register" width="120" clipMode="EllipsisWithTooltip" />
          
          {/* Content & Responsible (2 columns) */}
          <ColumnDirective field="contentText" headerText="Content" width="150" clipMode="EllipsisWithTooltip" />
          <ColumnDirective field="responsiblePerson" headerText="Responsible Person" width="150" clipMode="EllipsisWithTooltip" />
          
          {/* Debit Account (2 columns) */}
          <ColumnDirective field="accountDr" headerText="Account DR" width="100" />
          <ColumnDirective field="accountNameDr" headerText="Account Name DR" width="180" clipMode="EllipsisWithTooltip" />
          
          {/* Debit Account Details (8 columns) */}
          <ColumnDirective field="analyticDr" headerText="Analytic DR" width="120" clipMode="EllipsisWithTooltip" />
          <ColumnDirective field="analyticRefDr" headerText="Analytic Ref DR" width="120" clipMode="EllipsisWithTooltip" />
          <ColumnDirective field="idDr" headerText="ID DR" width="100" />
          <ColumnDirective field="legalFormDr" headerText="Legal Form DR" width="100" />
          <ColumnDirective field="countryDr" headerText="Country DR" width="100" />
          <ColumnDirective field="profitTaxDr" headerText="Profit Tax DR" width="100" type="boolean" displayAsCheckBox={false} />
          <ColumnDirective field="withholdingTaxDr" headerText="Withholding Tax DR" width="100" type="boolean" displayAsCheckBox={false} />
          <ColumnDirective field="doubleTaxationDr" headerText="Double Taxation DR" width="100" type="boolean" displayAsCheckBox={false} />
          <ColumnDirective field="pensionSchemeParticipantDr" headerText="Pension Scheme DR" width="100" type="boolean" displayAsCheckBox={false} />
          
          {/* Credit Account (2 columns) */}
          <ColumnDirective field="accountCr" headerText="Account CR" width="100" />
          <ColumnDirective field="accountNameCr" headerText="Account Name CR" width="180" clipMode="EllipsisWithTooltip" />
          
          {/* Credit Account Details (8 columns) */}
          <ColumnDirective field="analyticCr" headerText="Analytic CR" width="120" clipMode="EllipsisWithTooltip" />
          <ColumnDirective field="analyticRefCr" headerText="Analytic Ref CR" width="120" clipMode="EllipsisWithTooltip" />
          <ColumnDirective field="idCr" headerText="ID CR" width="100" />
          <ColumnDirective field="legalFormCr" headerText="Legal Form CR" width="100" />
          <ColumnDirective field="countryCr" headerText="Country CR" width="100" />
          <ColumnDirective field="profitTaxCr" headerText="Profit Tax CR" width="100" type="boolean" displayAsCheckBox={false} />
          <ColumnDirective field="withholdingTaxCr" headerText="Withholding Tax CR" width="100" type="boolean" displayAsCheckBox={false} />
          <ColumnDirective field="doubleTaxationCr" headerText="Double Taxation CR" width="100" type="boolean" displayAsCheckBox={false} />
          <ColumnDirective field="pensionSchemeParticipantCr" headerText="Pension Scheme CR" width="100" type="boolean" displayAsCheckBox={false} />
          
          {/* Amounts & Quantities (7 columns) */}
          <ColumnDirective field="currency" headerText="Currency" width="80" />
          <ColumnDirective field="amount" headerText="Amount" width="120" textAlign="Right" type="number" format="N2" />
          <ColumnDirective field="amountCur" headerText="Amount Cur" width="120" textAlign="Right" type="number" format="N2" />
          <ColumnDirective field="quantityDr" headerText="Quantity DR" width="100" textAlign="Right" type="number" format="N2" />
          <ColumnDirective field="quantityCr" headerText="Quantity CR" width="100" textAlign="Right" type="number" format="N2" />
          <ColumnDirective field="rate" headerText="Rate" width="100" textAlign="Right" type="number" format="N4" />
          <ColumnDirective field="documentRate" headerText="Document Rate" width="120" textAlign="Right" type="number" format="N4" />
          
          {/* Tax Invoice (5 columns) */}
          <ColumnDirective field="taxInvoiceNumber" headerText="Tax Invoice Number" width="100" />
          <ColumnDirective field="taxInvoiceDate" headerText="Tax Invoice Date" width="120" type="date" format="yMd" />
          <ColumnDirective field="taxInvoiceSeries" headerText="Tax Invoice Series" width="100" />
          <ColumnDirective field="waybillNumber" headerText="Waybill Number" width="100" />
          <ColumnDirective field="attachedFiles" headerText="Attached Files" width="120" type="number" />
          
          {/* Document Info (6 columns) */}
          <ColumnDirective field="docType" headerText="Doc Type" width="100" />
          <ColumnDirective field="docDate" headerText="Doc Date" width="100" type="date" format="yMd" />
          <ColumnDirective field="docNumber" headerText="Doc Number" width="100" />
          <ColumnDirective field="documentCreationDate" headerText="Document Creation Date" width="120" type="date" format="yMd" />
          <ColumnDirective field="documentModifyDate" headerText="Document Modify Date" width="120" type="date" format="yMd" />
          <ColumnDirective field="documentComments" headerText="Document Comments" width="180" clipMode="EllipsisWithTooltip" />
          
          {/* Posting (1 column) */}
          <ColumnDirective field="postingNumber" headerText="Posting Number" width="100" type="number" />
        </ColumnsDirective>
        <Inject
          services={[
            Sort,
            Filter,
            Group,
            Toolbar,
            ExcelExport,
            PdfExport,
            ContextMenu,
            ColumnMenu,
            Reorder,
            VirtualScroll,
            Resize,
          ]}
        />
      </GridComponent>
    </div>
  );
}

