import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, ChevronLeft, ChevronRight, SkipBack, SkipForward } from "lucide-react";
import { BaseHandsontableGrid } from "@/components/grid";
import type { RSTableColumn } from "@/config/rsTables";
import dayjs from "dayjs";

interface RSDataGridProps {
  tableKey: string;
  tableLabel: string;
  apiEndpoint: string;
  columns: RSTableColumn[];
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

interface RsDataResponse {
  data: Record<string, unknown>[];
  pagination?: PaginationInfo;
}

const PAGE_SIZE_OPTIONS = [100, 250, 500, 1000];

export function RSDataGrid({ tableKey, tableLabel, apiEndpoint, columns }: RSDataGridProps) {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(500);

  useEffect(() => {
    setPage(1);
  }, [tableKey, limit]);

  const queryKey = useMemo(() => ["rs-data", tableKey, page, limit] as const, [tableKey, page, limit]);

  const { data, isLoading, isFetching } = useQuery<RsDataResponse>({
    queryKey,
    queryFn: async () => {
      const url = `${apiEndpoint}?page=${page}&limit=${limit}`;
      const response = await apiRequest("GET", url);
      return response.json();
    },
    keepPreviousData: true,
  });

  const rows = data?.data ?? [];
  const pagination = data?.pagination;

  const formattedData = useMemo(() => {
    return rows.map((row) => {
      const formattedRow: Record<string, unknown> = {};
      columns.forEach((column) => {
        const rawValue = (row as Record<string, unknown>)[column.data];
        if (rawValue === null || rawValue === undefined) {
          formattedRow[column.data] = "";
          return;
        }

        if (column.type === "numeric") {
          const num = Number(rawValue);
          formattedRow[column.data] = Number.isNaN(num) ? rawValue : num;
        } else if (column.type === "date") {
          const date = dayjs(rawValue as dayjs.ConfigType);
          formattedRow[column.data] = date.isValid() ? date.format("YYYY-MM-DD HH:mm") : rawValue;
        } else {
          formattedRow[column.data] = rawValue;
        }
      });
      return formattedRow;
    });
  }, [rows, columns]);

  const hotColumns = useMemo(() => {
    return columns.map((column) => {
      const base: Record<string, unknown> = {
        data: column.data,
        readOnly: true,
        type: column.type ?? "text",
      };

      if (column.type === "numeric") {
        base.numericFormat = { pattern: "0,0.[0000]" };
      }

      if (column.type === "date") {
        base.dateFormat = "YYYY-MM-DD HH:mm";
      }

      return base;
    });
  }, [columns]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey });
  };

  const goToFirst = () => pagination && setPage(1);
  const goToPrev = () => setPage((current) => Math.max(1, current - 1));
  const goToNext = () => pagination && setPage((current) => (pagination.hasMore ? current + 1 : current));
  const goToLast = () => pagination && setPage(pagination.totalPages);

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <span>{tableLabel}</span>
          <div className="flex items-center gap-2">
            <Label htmlFor="page-size" className="text-sm text-muted-foreground">
              Rows
            </Label>
            <Select
              value={String(limit)}
              onValueChange={(value) => setLimit(Number(value))}
              disabled={isFetching}
            >
              <SelectTrigger id="page-size" className="w-28">
                <SelectValue placeholder="Rows" />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option.toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <div className="border rounded-md">
          <BaseHandsontableGrid
            data={formattedData}
            columns={hotColumns as any}
            colHeaders={columns.map((column) => column.title)}
            height={600}
            width="100%"
            stretchH="all"
            readOnly={true}
            isLoading={isLoading && formattedData.length === 0}
            onRefresh={handleRefresh}
            showRefresh={true}
            showExport={true}
            showClearFilters={true}
            showThemeSwitch={false}
            showFullscreen={false}
            exportFilename={tableLabel.replace(/\s+/g, "_")}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            {pagination ? (
              <>
                Showing
                <span className="font-medium mx-1">
                  {Math.min((page - 1) * limit + 1, pagination.total).toLocaleString()}
                </span>
                to
                <span className="font-medium mx-1">
                  {Math.min(page * limit, pagination.total).toLocaleString()}
                </span>
                of
                <span className="font-medium mx-1">{pagination.total.toLocaleString()}</span>
                records
              </>
            ) : (
              <>Showing {formattedData.length.toLocaleString()} records</>
            )}
            {isFetching && <Loader2 className="inline-block h-4 w-4 ml-2 animate-spin" />}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToFirst}
                disabled={page === 1 || isFetching}
              >
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToPrev}
                disabled={page === 1 || isFetching}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">
                Page {page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNext}
                disabled={!pagination.hasMore || isFetching}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToLast}
                disabled={page === pagination.totalPages || isFetching}
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default RSDataGrid;

