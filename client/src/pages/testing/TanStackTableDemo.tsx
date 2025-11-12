import React, { useMemo, useState, useRef, useCallback } from "react";
import {
  ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  flexRender,
} from "@tanstack/react-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { sampleUserData, type UserData } from "./data/handsontable-sample-data";
import { ArrowDownAZ, ArrowUpAZ, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight, RefreshCw, Copy, Trash2, Eye } from "lucide-react";

export default function TanStackTableDemo() {
  const [globalFilter, setGlobalFilter] = useState<string>("");
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; rowId: string } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent, rowId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, rowId });
  }, []);

  const handleCopyRow = useCallback((rowId: string) => {
    const row = sampleUserData.find((_, idx) => String(idx) === rowId);
    if (row) {
      navigator.clipboard.writeText(JSON.stringify(row, null, 2));
    }
    setContextMenu(null);
  }, []);

  // Close context menu when clicking outside
  React.useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const columns = useMemo<ColumnDef<UserData>[]>(() => [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "age", header: "Age", sortingFn: "alphanumeric" },
    { accessorKey: "country", header: "Country" },
    { accessorKey: "city", header: "City" },
    {
      accessorKey: "isActive",
      header: "Active",
      cell: ({ getValue }) => (getValue<boolean>() ? "Yes" : "No"),
      enableSorting: false,
      enableColumnFilter: false,
    },
    { accessorKey: "interest", header: "Interest" },
    { accessorKey: "favoriteProduct", header: "Favorite Product" },
    { accessorKey: "lastLoginDate", header: "Login Date" },
    { accessorKey: "lastLoginTime", header: "Login Time" },
  ], []);

  const table = useReactTable({
    data: sampleUserData,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">TanStack Table Demo</h1>
        <p className="text-muted-foreground">
          Headless data table with sorting, filtering, pagination, and responsive styling.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3">
          <CardTitle className="text-lg">Interactive Data Grid</CardTitle>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Global search..."
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-56 h-8"
            />
            <Button variant="outline" size="sm" onClick={() => setGlobalFilter("")} className="h-8">
              <RefreshCw className="w-3 h-3 mr-1" />
              Reset
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: "600px" }} ref={contextMenuRef}>
            <Table>
              <TableHeader className="sticky top-0 bg-muted/50 z-10">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="bg-muted/40 hover:bg-muted/40 h-7">
                    {headerGroup.headers.map((header) => {
                      const isSortable = header.column.getCanSort();
                      const sorted = header.column.getIsSorted();
                      return (
                        <TableHead key={header.id} className="whitespace-nowrap px-2 py-1 text-xs font-semibold">
                          <div
                            className={isSortable ? "cursor-pointer select-none inline-flex items-center gap-0.5" : ""}
                            onClick={isSortable ? header.column.getToggleSortingHandler() : undefined}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {sorted === "asc" && <ArrowUpAZ className="w-3 h-3" />}
                            {sorted === "desc" && <ArrowDownAZ className="w-3 h-3" />}
                          </div>
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="h-6 hover:bg-accent/50 cursor-context-menu"
                    onContextMenu={(e) => handleContextMenu(e, row.id)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="whitespace-nowrap px-2 py-0.5 text-xs">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Context Menu */}
          {contextMenu && (
            <div
              className="fixed bg-popover border border-border rounded-md shadow-md z-50 py-1"
              style={{
                left: `${contextMenu.x}px`,
                top: `${contextMenu.y}px`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="w-full px-2 py-1 text-xs text-left hover:bg-accent flex items-center gap-2"
                onClick={() => handleCopyRow(contextMenu.rowId)}
              >
                <Copy className="w-3 h-3" /> Copy Row
              </button>
              <button
                className="w-full px-2 py-1 text-xs text-left hover:bg-accent flex items-center gap-2"
                onClick={() => setContextMenu(null)}
              >
                <Eye className="w-3 h-3" /> View Details
              </button>
            </div>
          )}
          <div className="flex items-center justify-between px-3 py-2 border-t bg-muted/30 text-xs">
            <div className="text-muted-foreground">
              Showing {table.getRowModel().rows.length.toLocaleString()} of {sampleUserData.length.toLocaleString()} records
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => table.firstPage()}
                disabled={!table.getCanPreviousPage()}
                className="h-6 px-1"
              >
                <ChevronsLeft className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="h-6 px-1"
              >
                <ChevronLeft className="w-3 h-3" />
              </Button>
              <span className="px-2">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="h-6 px-1"
              >
                <ChevronRight className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => table.lastPage()}
                disabled={!table.getCanNextPage()}
                className="h-6 px-1"
              >
                <ChevronsRight className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


