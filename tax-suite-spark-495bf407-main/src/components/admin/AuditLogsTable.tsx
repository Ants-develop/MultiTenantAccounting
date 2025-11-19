import { useState } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { AuditLogFilters, AuditLogPagination } from "@/types/auditLog";
import { AuditLogFiltersComponent } from "./AuditLogFilters";
import { ChevronDown, ChevronRight, Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const AuditLogsTable = () => {
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [pagination, setPagination] = useState<AuditLogPagination>({
    page: 1,
    pageSize: 25,
    sortBy: "created_at",
    sortOrder: "desc",
  });
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const { data, isLoading } = useAuditLogs(filters, pagination);

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      CREATE: "bg-green-500/10 text-green-500 border-green-500/20",
      UPDATE: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      DELETE: "bg-red-500/10 text-red-500 border-red-500/20",
      VIEW: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      DOWNLOAD: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      SHARE: "bg-pink-500/10 text-pink-500 border-pink-500/20",
      INVITE: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
    };
    return colors[action] || "bg-muted text-muted-foreground";
  };

  const exportToCSV = () => {
    if (!data?.logs) return;

    const headers = ["Date", "User", "Action", "Entity Type", "Entity Name", "Summary"];
    const rows = data.logs.map((log) => [
      format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss"),
      log.user_name || log.user_email || "System",
      log.action,
      log.entity_type,
      log.entity_name || "-",
      log.changes_summary || "-",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  const totalPages = Math.ceil((data?.total || 0) / pagination.pageSize);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Audit Logs</h2>
        <Button onClick={exportToCSV} variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <AuditLogFiltersComponent filters={filters} onFiltersChange={setFilters} />

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity Type</TableHead>
              <TableHead>Entity Name</TableHead>
              <TableHead>Summary</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Loading audit logs...
                </TableCell>
              </TableRow>
            ) : !data?.logs || data.logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No audit logs found
                </TableCell>
              </TableRow>
            ) : (
              data.logs.map((log) => (
                <Collapsible
                  key={log.id}
                  open={expandedRow === log.id}
                  onOpenChange={(open) => setExpandedRow(open ? log.id : null)}
                  asChild
                >
                  <>
                    <TableRow className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            {expandedRow === log.id ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {format(new Date(log.created_at), "MMM dd, yyyy HH:mm:ss")}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">
                            {log.user_name || "System"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {log.user_email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getActionColor(log.action)}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {log.entity_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {log.entity_name || "-"}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate text-muted-foreground">
                        {log.changes_summary || "-"}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={7} className="p-0 border-0">
                        <CollapsibleContent>
                          <div className="px-6 py-4 bg-muted/30 space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <h4 className="text-sm font-semibold mb-2">Old Values</h4>
                                <pre className="text-xs bg-background p-3 rounded-md overflow-auto max-h-[200px]">
                                  {log.old_values
                                    ? JSON.stringify(log.old_values, null, 2)
                                    : "N/A"}
                                </pre>
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold mb-2">New Values</h4>
                                <pre className="text-xs bg-background p-3 rounded-md overflow-auto max-h-[200px]">
                                  {log.new_values
                                    ? JSON.stringify(log.new_values, null, 2)
                                    : "N/A"}
                                </pre>
                              </div>
                            </div>
                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold mb-2">Metadata</h4>
                                <pre className="text-xs bg-background p-3 rounded-md overflow-auto">
                                  {JSON.stringify(log.metadata, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </TableCell>
                    </TableRow>
                  </>
                </Collapsible>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page:</span>
          <Select
            value={pagination.pageSize.toString()}
            onValueChange={(value) =>
              setPagination({ ...pagination, pageSize: parseInt(value), page: 1 })
            }
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Page {pagination.page} of {totalPages || 1}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPagination({ ...pagination, page: Math.max(1, pagination.page - 1) })
              }
              disabled={pagination.page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPagination({
                  ...pagination,
                  page: Math.min(totalPages, pagination.page + 1),
                })
              }
              disabled={pagination.page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
