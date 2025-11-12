import React, { useMemo, useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useCompany } from "@/hooks/useCompany";
import { apiRequest } from "@/lib/queryClient";
import { BaseHandsontableGrid } from "@/components/grid";
import dayjs from 'dayjs';
import { AuditTable, AuditColumn } from "@/config/auditTables";

interface PaginatedResponse {
  data: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

interface AuditGridProps {
  tableConfig: AuditTable;
}

export default function AuditGrid({ tableConfig }: AuditGridProps) {
  const { currentCompany, currentCompanyId } = useCompany();
  const queryClient = useQueryClient();

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(500);

  // Reset page when table changes
  useEffect(() => {
    setCurrentPage(1);
  }, [tableConfig.id]);

  // Fetch audit data
  const { data: auditData, isLoading, isFetching } = useQuery<PaginatedResponse>({
    queryKey: ['/api/audit', tableConfig.tableName, currentCompanyId, currentPage, itemsPerPage],
    queryFn: async () => {
      const limit = itemsPerPage === 0 ? 999999 : itemsPerPage;
      const response = await apiRequest('GET', `/api/audit/${tableConfig.tableName}?page=${currentPage}&limit=${limit}`);
      return response.json();
    },
    enabled: !!currentCompany && !!currentCompanyId,
    staleTime: 0,
    gcTime: 0,
  });

  const tableData = auditData?.data || [];
  const pagination = auditData?.pagination;

  // Prepare columns for Handsontable
  const columns = useMemo(() => {
    return tableConfig.columns.map((col: AuditColumn) => {
      const columnConfig: any = {
        data: col.field,
        type: col.type === 'numeric' ? 'numeric' : 
              col.type === 'date' ? 'date' : 
              col.type === 'checkbox' ? 'checkbox' : 'text',
        readOnly: true,
      };

      if (col.type === 'numeric') {
        columnConfig.numericFormat = {
          pattern: '0,0.00',
        };
      }

      if (col.type === 'date') {
        columnConfig.dateFormat = 'YYYY-MM-DD';
      }

      return columnConfig;
    });
  }, [tableConfig.columns]);

  // Column headers
  const colHeaders = useMemo(() => {
    return tableConfig.columns.map((col: AuditColumn) => col.header);
  }, [tableConfig.columns]);

  // Column widths
  const colWidths = useMemo(() => {
    return tableConfig.columns.map((col: AuditColumn) => col.width || 120);
  }, [tableConfig.columns]);

  // Format data for display
  const formattedData = useMemo(() => {
    return tableData.map((row: any) => {
      const formattedRow: any = {};
      tableConfig.columns.forEach((col: AuditColumn) => {
        let value = row[col.field];
        
        // Format dates
        if (col.type === 'date' && value) {
          try {
            formattedRow[col.field] = dayjs(value).format('YYYY-MM-DD');
          } catch {
            formattedRow[col.field] = value;
          }
        } else if (col.type === 'numeric' && value !== null && value !== undefined) {
          formattedRow[col.field] = parseFloat(value);
        } else {
          formattedRow[col.field] = value || '';
        }
      });
      return formattedRow;
    });
  }, [tableData, tableConfig.columns]);

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

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setCurrentPage(1);
    queryClient.invalidateQueries({ queryKey: ['/api/audit', tableConfig.tableName] });
  }, [queryClient, tableConfig.tableName]);

  if (!currentCompany) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Please select a company to view audit data.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <BaseHandsontableGrid
        data={formattedData}
        columns={columns}
        colHeaders={colHeaders}
        colWidths={colWidths}
        width="100%"
        height="auto"
        readOnly={true}
        isLoading={isLoading && formattedData.length === 0}
        onRefresh={handleRefresh}
        showRefresh={true}
        showExport={true}
        showClearFilters={true}
        showThemeSwitch={false}
        showFullscreen={false}
        exportFilename={`Audit_${tableConfig.tableName}`}
        stretchH="all"
        wordWrap={false}
        autoColumnSize={{
          samplingRatio: 25,
          useHeaders: true,
          syncLimit: 50,
        }}
      />

      {/* Pagination Controls */}
      {pagination && !isLoading && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t flex-shrink-0">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, pagination.total)} of {pagination.total.toLocaleString()} records
            {isFetching && (
              <Loader2 className="w-3 h-3 animate-spin inline ml-1.5" />
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={handleFirstPage}
              disabled={currentPage === 1 || isFetching}
            >
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={handlePrevPage}
              disabled={currentPage === 1 || isFetching}
            >
              Previous
            </Button>
            <div className="px-3 py-1 text-xs font-medium border rounded bg-background">
              Page {currentPage} of {pagination.totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={handleNextPage}
              disabled={!pagination.hasMore || isFetching}
            >
              Next
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={handleLastPage}
              disabled={currentPage === pagination.totalPages || isFetching}
            >
              Last
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

