import { useMemo, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { BaseHandsontableGrid } from "@/components/grid";
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

interface JournalEntriesGridProps {
  journalEntries: JournalEntry[];
  isLoading?: boolean;
  isFetching?: boolean;
  onRefresh?: () => void;
}

export function JournalEntriesGrid({ 
  journalEntries, 
  isLoading = false,
  isFetching = false,
  onRefresh,
}: JournalEntriesGridProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Prepare data for Handsontable
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

  // Column width configuration
  const columnWidths = useMemo(() => [
    60, 100, 100, 180, 120, 120, 100, 80, 100, 100, 150, 120, 100, 120, 120,
    150, 150, 100, 180, 120, 120, 100, 100, 100, 100, 100, 100, 100, 100, 180,
    120, 120, 100, 100, 100, 100, 100, 100, 100, 80, 120, 120, 100, 100, 100,
    100, 120, 100, 100, 120, 100, 120, 100, 120, 120, 120, 180, 100,
  ], []);

  // Nested headers configuration
  const nestedHeaders = useMemo(() => [
    [
      { label: "Entry Information", colspan: 4 },
      { label: "Transaction Details", colspan: 2 },
      { label: "Status & Tracking", colspan: 2 },
      { label: "Created", colspan: 1 },
      { label: "Tenant & Organization", colspan: 6 },
      { label: "Content & Responsible", colspan: 2 },
      { label: "Debit Account", colspan: 2 },
      { label: "Debit Account Details", colspan: 8 },
      { label: "Credit Account", colspan: 2 },
      { label: "Credit Account Details", colspan: 8 },
      { label: "Amounts & Quantities", colspan: 7 },
      { label: "Tax Invoice", colspan: 5 },
      { label: "Document Info", colspan: 6 },
      { label: "Posting", colspan: 1 }
    ],
    [
      "id", "entryNumber", "date", "description",
      "reference", "totalAmount",
      "status", "isPosted",
      "createdAt",
      "tenantCode", "tenantName", "abonent", "branch", "postingsPeriod", "register",
      "contentText", "responsiblePerson",
      "accountDr", "accountNameDr",
      "analyticDr", "analyticRefDr", "idDr", "legalFormDr", "countryDr", "profitTaxDr", "withholdingTaxDr", "doubleTaxationDr", "pensionSchemeParticipantDr",
      "accountCr", "accountNameCr",
      "analyticCr", "analyticRefCr", "idCr", "legalFormCr", "countryCr", "profitTaxCr", "withholdingTaxCr", "doubleTaxationCr", "pensionSchemeParticipantCr",
      "currency", "amount", "amountCur", "quantityDr", "quantityCr", "rate", "documentRate",
      "taxInvoiceNumber", "taxInvoiceDate", "taxInvoiceSeries", "waybillNumber", "attachedFiles",
      "docType", "docDate", "docNumber", "documentCreationDate", "documentModifyDate", "documentComments",
      "postingNumber"
    ]
  ], []);

  // Custom context menu (column visibility disabled)
  const contextMenuConfig = useMemo(() => ({
    items: {
      separator1: '---------',
      copy: {},
      cut: {},
      paste: {},
      separator2: '---------',
      row_above: {},
      row_below: {},
      remove_row: {},
      separator3: '---------',
      alignment: {},
      make_read_only: {},
      clear_column: {},
    },
  }), []);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('PUT', '/api/journal-entries/bulk', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/journal-entries'] });
      toast({ title: "Success", description: "Changes saved successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save changes",
        variant: "destructive" 
      });
    },
  });

  // Handle save
  const handleSave = useCallback(() => {
    // This would be called from the grid, but we'll keep it disabled for now
    // since saving is complex and needs proper implementation
    toast({
      title: "Info",
      description: "Save functionality is currently disabled",
    });
  }, [toast]);

  return (
    <BaseHandsontableGrid
      data={tableData}
      colWidths={columnWidths}
      nestedHeaders={nestedHeaders}
      contextMenuConfig={contextMenuConfig}
      exportFilename="Journal_Entries"
      isLoading={isLoading}
      isSaving={saveMutation.isPending}
      onRefresh={onRefresh}
      showThemeSwitch={true}
      showFullscreen={true}
      showExport={true}
      showClearFilters={true}
      showRefresh={true}
      readOnly={false}
      persistentState={true}
      autoColumnSize={{
        samplingRatio: 25,
        useHeaders: true,
        syncLimit: 50,
      }}
      toolbarRight={
        <Save className="w-3.5 h-3.5 mr-1" />
      }
    />
  );
}

