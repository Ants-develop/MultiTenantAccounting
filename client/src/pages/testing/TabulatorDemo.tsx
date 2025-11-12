import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { sampleUserData } from "./data/handsontable-sample-data";
import { TabulatorFull as Tabulator } from "tabulator-tables";
import "tabulator-tables/dist/css/tabulator_modern.min.css";

// Scoped Tabulator CSS for compact financial display
const tabulatorStyles = `
  .tabulator-cell {
    padding: 3px 6px !important;
    font-size: 12px !important;
    line-height: 1.2 !important;
  }
  
  .tabulator-row {
    height: 24px !important;
  }
  
  .tabulator-header-cell {
    padding: 4px 6px !important;
    font-size: 12px !important;
    font-weight: 600 !important;
    line-height: 1.2 !important;
  }
  
  .tabulator .tabulator-tableholder {
    max-height: 600px;
  }
`;

export default function TabulatorDemo() {
  const tableRef = useRef<HTMLDivElement | null>(null);
  const tableInstance = useRef<Tabulator | null>(null);
  const [filterValue, setFilterValue] = useState("");

  useEffect(() => {
    if (!tableRef.current) return;
    // Destroy existing
    if (tableInstance.current) {
      tableInstance.current.destroy();
      tableInstance.current = null;
    }

    tableInstance.current = new Tabulator(tableRef.current, {
      data: sampleUserData,
      layout: "fitColumns",
      height: 600,
      reactiveData: false,
      selectable: "highlight",
      selectableRangeMode: "click",
      virtualDom: true,
      virtualDomBuffer: 10,
      columns: [
        { title: "Name", field: "name", headerFilter: "input", minWidth: 120 },
        { title: "Age", field: "age", sorter: "number", headerFilter: "number", width: 80 },
        { title: "Country", field: "country", headerFilter: "input", minWidth: 110 },
        { title: "City", field: "city", headerFilter: "input", minWidth: 110 },
        { title: "Active", field: "isActive", formatter: "tickCross", hozAlign: "center", width: 90 },
        { title: "Interest", field: "interest", headerFilter: "input", minWidth: 120 },
        { title: "Favorite Product", field: "favoriteProduct", headerFilter: "input", minWidth: 140 },
        { title: "Login Date", field: "lastLoginDate", headerFilter: "input", minWidth: 130 },
        { title: "Login Time", field: "lastLoginTime", headerFilter: "input", width: 110 },
      ],
      movableColumns: true,
      resizableColumns: true,
      columnHeaderVertAlign: "middle",
      pagination: "local",
      paginationSize: 20,
      paginationSizeSelector: [10, 20, 50],
      paginationCounter: "rows",
      clipboard: "copy",
      clipboardCopyConfig: {
        columnHeaders: true,
        columnGroups: true,
        rowGroups: true,
        columnCalcs: true,
      },
      contextMenu: (component, e) => {
        return [
          {
            label: '<i class="tabulator-icon" style="margin-right:5px;">📋</i> Copy Row',
            action: () => {
              const row = component.getData ? (component as any).getData() : null;
              if (row) {
                navigator.clipboard.writeText(JSON.stringify(row, null, 2));
              }
            },
          },
          {
            label: '<i class="tabulator-icon" style="margin-right:5px;">👁️</i> View Details',
            action: () => {
              console.log("View details for:", component.getData?.());
            },
          },
          {
            label: '<i class="tabulator-icon" style="margin-right:5px;">🗑️</i> Delete Row',
            action: () => {
              component.delete?.();
            },
          },
        ];
      },
    });

    return () => {
      if (tableInstance.current) {
        tableInstance.current.destroy();
        tableInstance.current = null;
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      <style>{tabulatorStyles}</style>
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tabulator Demo</h1>
        <p className="text-muted-foreground">
          High-performance grid with virtual scrolling, context menu, header filters, column customization, and pagination.
        </p>
      </div>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Interactive Data Grid</CardTitle>
            <Input
              placeholder="Search all rows..."
              value={filterValue}
              onChange={(e) => {
                setFilterValue(e.target.value);
                if (tableInstance.current) {
                  tableInstance.current.setFilter("name", "like", e.target.value);
                }
              }}
              className="w-56 h-8"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Right-click rows for context menu • Drag column headers to move • Use header filters to narrow results
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div ref={tableRef} />
        </CardContent>
      </Card>
    </div>
  );
}


