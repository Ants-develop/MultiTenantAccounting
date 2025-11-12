import React, { useMemo, useState, useCallback } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule, type ColDef, type GetContextMenuItemsParams } from "ag-grid-community";
// Register all community modules (required since v34)
ModuleRegistry.registerModules([AllCommunityModule]);
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { sampleUserData } from "./data/handsontable-sample-data";
import { Copy, Trash2, Eye } from "lucide-react";

export default function AgGridDemo() {
  const [quickFilter, setQuickFilter] = useState("");

  const getContextMenuItems = useCallback((params: GetContextMenuItemsParams) => {
    return [
      {
        name: "Copy Row",
        action: () => {
          const rowData = params.node?.data;
          if (rowData) {
            navigator.clipboard.writeText(JSON.stringify(rowData, null, 2));
          }
        },
      },
      "separator",
      "copy",
      "copyWithHeaders",
      "separator",
      "paste",
    ] as any;
  }, []);

  const columnDefs = useMemo<ColDef[]>(
    () => [
      { headerName: "Name", field: "name", sortable: true, filter: "agTextColumnFilter", minWidth: 120 },
      { headerName: "Age", field: "age", sortable: true, filter: "agNumberColumnFilter", width: 80 },
      { headerName: "Country", field: "country", sortable: true, filter: "agSetColumnFilter", minWidth: 110 },
      { headerName: "City", field: "city", sortable: true, filter: "agTextColumnFilter", minWidth: 110 },
      { headerName: "Active", field: "isActive", sortable: true, filter: "agSetColumnFilter", width: 90, cellRenderer: (p: any) => (p.value ? "Yes" : "No") },
      { headerName: "Interest", field: "interest", sortable: true, filter: "agTextColumnFilter", minWidth: 120 },
      { headerName: "Favorite Product", field: "favoriteProduct", sortable: true, filter: "agTextColumnFilter", minWidth: 140 },
      { headerName: "Login Date", field: "lastLoginDate", sortable: true, filter: "agDateColumnFilter", minWidth: 130 },
      { headerName: "Login Time", field: "lastLoginTime", sortable: true, filter: "agTextColumnFilter", width: 110 },
    ],
    []
  );

  const defaultColDef: ColDef = useMemo(
    () => ({
      resizable: true,
      sortable: true,
      filter: true,
      suppressHeaderMenuButton: false,
      suppressMenu: false,
    }),
    []
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">AG Grid (Community) Demo</h1>
        <p className="text-muted-foreground">
          Enterprise-grade grid with sorting, set filters, pinning, resize, and quick filter.
        </p>
      </div>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Interactive Data Grid</CardTitle>
            <Input
              placeholder="Quick filter..."
              value={quickFilter}
              onChange={(e) => setQuickFilter(e.target.value)}
              className="w-56 h-8"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="ag-theme-quartz" style={{ width: "100%", height: 600, fontSize: "12px" }}>
            <AgGridReact
              rowData={sampleUserData}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              rowSelection="multiple"
              animateRows={true}
              quickFilterText={quickFilter}
              pagination={true}
              paginationPageSize={20}
              paginationAutoPageSize={false}
              enableCellTextSelection={true}
              suppressRowClickSelection={true}
              rowHeight={24}
              headerHeight={28}
              suppressHorizontalScroll={false}
              getContextMenuItems={getContextMenuItems}
              allowContextMenuWithControlKey={true}
              popupParent={document.body}
              suppressColumnVirtualisation={false}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


