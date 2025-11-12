import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ClientFilter } from "@/components/filters/ClientFilter";
import { apiRequest } from "@/lib/queryClient";
import { JournalEntriesSyncfusionGrid } from "@/components/accounting/JournalEntriesSyncfusionGrid";

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

interface PaginatedResponse {
  data: JournalEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export default function JournalEntriesSyncfusionPage() {
  const { mainCompany } = useAuth();
  const queryClient = useQueryClient();
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(500);
  const [selectedClientIds, setSelectedClientIds] = useState<number[]>([]);
  const hasInitialized = useRef(false);

  // Fetch all available clients directly (like MSSQLImport.tsx)
  const { data: availableClients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/clients');
      const data = await response.json();
      return data || [];
    },
    enabled: !!mainCompany?.id,
  });

  // Transform clients to match ClientFilter expected format
  const accessibleClients = availableClients.map((client: any) => ({
    id: client.id,
    name: client.name,
    code: client.code,
  }));

  // Load from localStorage on mount and set default selection
  useEffect(() => {
    // Only initialize once
    if (hasInitialized.current) {
      return;
    }
    
    // Only proceed if we have clients and no selection yet
    if (availableClients.length === 0 || selectedClientIds.length > 0) {
      return;
    }
    
    const stored = localStorage.getItem('clientFilter_accounting_syncfusion');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelectedClientIds(parsed);
          hasInitialized.current = true;
          return;
        }
      } catch {
        // Invalid JSON, ignore
      }
    }
    
    // Default to first client if available
    if (availableClients.length > 0) {
      setSelectedClientIds([availableClients[0].id]);
      hasInitialized.current = true;
    }
  }, [availableClients.length]); // Only depend on length, not the array itself

  // Save to localStorage on change
  const handleClientSelectionChange = (ids: number[]) => {
    setSelectedClientIds(ids);
    localStorage.setItem('clientFilter_accounting_syncfusion', JSON.stringify(ids));
  };

  // Get company name
  const companyName = mainCompany?.name || 'Loading...';

  // Fetch journal entries with pagination
  const { data: entriesData, isLoading: entriesLoading, isFetching } = useQuery<PaginatedResponse>({
    queryKey: ['/api/journal-entries', selectedClientIds, currentPage, itemsPerPage],
    queryFn: async () => {
      const limit = itemsPerPage === 0 ? 999999 : itemsPerPage;
      const clientIdsParam = selectedClientIds.length > 0 ? `&clientIds=${selectedClientIds.join(',')}` : '';
      const response = await apiRequest('GET', `/api/journal-entries?page=${currentPage}&limit=${limit}${clientIdsParam}`);
      return response.json();
    },
    enabled: !!mainCompany && selectedClientIds.length > 0,
    staleTime: 0,
    gcTime: 0,
  });

  const journalEntries = entriesData?.data || [];
  const pagination = entriesData?.pagination;

  // Pagination handlers
  const handlePrevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentPage]);

  const handleNextPage = useCallback(() => {
    if (pagination?.hasMore) {
      setCurrentPage(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [pagination]);

  const handleFirstPage = useCallback(() => {
    setCurrentPage(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleLastPage = useCallback(() => {
    if (pagination?.totalPages) {
      setCurrentPage(pagination.totalPages);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [pagination]);

  // Handle items per page change
  const handleItemsPerPageChange = useCallback((value: string) => {
    const newLimit = parseInt(value);
    setItemsPerPage(newLimit);
    setCurrentPage(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setCurrentPage(1);
    queryClient.invalidateQueries({ queryKey: ['/api/journal-entries'] });
  }, [queryClient]);

  if (!mainCompany) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Company not configured. Please complete the setup wizard to view journal entries.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Card className="flex flex-col h-full flex-1 min-h-0">
        <CardHeader className="pb-3 pt-4 px-4 flex-shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">გატარებების ჟურნალი Syncfusion</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {companyName} • {pagination ? `${pagination.total.toLocaleString()} total entries (showing ${journalEntries.length})` : `${journalEntries.length} entries`} • Page {currentPage}{pagination ? ` of ${pagination.totalPages}` : ''}
                </p>
              </div>
            </div>
          </div>
          {/* Client Filter */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Select Clients
              </label>
              <ClientFilter
                selectedIds={selectedClientIds}
                onSelectionChange={handleClientSelectionChange}
                clients={accessibleClients}
                isLoading={clientsLoading}
              />
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6 pt-0 flex-1 flex flex-col min-h-0" style={{ padding: 0 }}>
          <div className="flex-1 min-h-0" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <JournalEntriesSyncfusionGrid
              journalEntries={journalEntries}
              isLoading={entriesLoading}
              isFetching={isFetching}
              onRefresh={handleRefresh}
            />
          </div>

          {/* Pagination Controls */}
          {pagination && !entriesLoading && (
            <div className="flex items-center justify-end mt-2 pt-2 pb-2 px-4 border-t flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Rows per page:</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={handleItemsPerPageChange}
                  >
                    <SelectTrigger className="h-7 w-[90px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="500">500</SelectItem>
                      <SelectItem value="1000">1,000</SelectItem>
                      <SelectItem value="2000">2,000</SelectItem>
                      <SelectItem value="0">All ({pagination.total.toLocaleString()})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-xs text-muted-foreground">
                  {itemsPerPage === 0 ? `1-${pagination.total}` : `${((currentPage - 1) * itemsPerPage) + 1}-${Math.min(currentPage * itemsPerPage, pagination.total)}`} of {pagination.total.toLocaleString()}
                  {isFetching && (
                    <Loader2 className="w-3 h-3 animate-spin inline ml-1.5" />
                  )}
                </div>
                <div className="flex items-center gap-0.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={handleFirstPage}
                    disabled={currentPage === 1 || isFetching || itemsPerPage === 0}
                  >
                    First
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={handlePrevPage}
                    disabled={currentPage === 1 || isFetching || itemsPerPage === 0}
                  >
                    Prev
                  </Button>
                  <div className="px-2 py-0.5 text-xs font-medium border rounded bg-background">
                    {itemsPerPage === 0 ? 'All' : `Page ${currentPage} of ${pagination.totalPages}`}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={handleNextPage}
                    disabled={!pagination.hasMore || isFetching || itemsPerPage === 0}
                  >
                    Next
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={handleLastPage}
                    disabled={currentPage === pagination.totalPages || isFetching || itemsPerPage === 0}
                  >
                    Last
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

