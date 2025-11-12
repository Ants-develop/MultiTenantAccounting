import React, { useRef, useMemo } from "react";
import {
  GridComponent,
  ColumnsDirective,
  ColumnDirective,
  Sort,
  Filter,
  Page,
  Group,
  ContextMenu,
  ExcelExport,
  PdfExport,
  Toolbar,
  ColumnMenu,
  Reorder,
  VirtualScroll,
  Inject,
} from "@syncfusion/ej2-react-grids";
import type {
  GridComponent as GridComponentType,
  ToolbarItems,
  ContextMenuItem,
  FilterSettingsModel,
  SelectionSettingsModel,
  PageSettingsModel,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Database, Filter as FilterIcon, FileSpreadsheet, Zap } from "lucide-react";
import { sampleUserData, type UserData } from "./data/handsontable-sample-data";

// Syncfusion Grid CSS for resize handle and compact styling
const syncfusionStyles = `
  #syncfusion-financial-grid {
    position: relative !important;
  }
  
  #syncfusion-financial-grid .e-grid {
    position: relative !important;
  }
  
  #syncfusion-financial-grid .e-headercell {
    position: relative !important;
  }
  
  .e-grid .e-gridcontent {
    font-size: 12px !important;
  }
  
  .e-grid .e-rowcell {
    padding: 4px 8px !important;
    height: 28px !important;
  }
  
  .e-grid .e-headercell {
    padding: 6px 8px !important;
    height: 32px !important;
    font-weight: 600 !important;
  }
`;

const toolbarOptions: ToolbarItems[] = ["Search", "ExcelExport", "PdfExport"];

const contextMenuItems: ContextMenuItem[] = [
  "AutoFit",
  "AutoFitAll",
  "SortAscending",
  "SortDescending",
  "Copy",
  "Edit",
  "Delete",
  "Save",
  "Cancel",
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

const pageSettings: PageSettingsModel = {
  pageSize: 20,
  pageSizes: [10, 20, 50, 100],
};

function ActiveTemplate(props: UserData) {
  const isActive = props.isActive;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
        isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"
      }`}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

export default function SyncfusionGridDemo() {
  const gridRef = useRef<GridComponentType | null>(null);

  const toolbarClick = (args: any) => {
    if (!gridRef.current) return;

    if (args.item.id?.includes("pdfexport")) {
      gridRef.current.pdfExport();
    }
    if (args.item.id?.includes("excelexport")) {
      gridRef.current.excelExport();
    }
  };


  const memoizedData = useMemo(() => sampleUserData, []);

  return (
    <div className="space-y-8">
      <style>{syncfusionStyles}</style>
      <div className="border-b pb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Syncfusion Data Grid Demo</h1>
        <p className="text-muted-foreground max-w-2xl">
          Enterprise-grade data grid optimized for financial operations. Includes virtualization, Excel-style filtering,
          export tooling, context menus, and responsive sizing tuned for accounting transaction data.
        </p>
      </div>

      <Card className="border-2" style={{ minHeight: "700px" }}>
        <CardHeader className="bg-muted/50 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Database className="h-5 w-5" />
                Interactive Financial Grid
              </CardTitle>
              <Badge variant="secondary">{memoizedData.length} Records</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <FilterIcon className="h-3 w-3" />
                Excel Filters
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <FileSpreadsheet className="h-3 w-3" />
                Export Ready
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Virtualized
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-hidden" style={{ position: "relative" }}>
          <GridComponent
            id="syncfusion-financial-grid"
            ref={gridRef}
            dataSource={memoizedData}
            height="600px"
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
            pageSettings={pageSettings}
            allowResizing={false}
            allowReordering
            toolbar={toolbarOptions}
            toolbarClick={toolbarClick}
          >
              <ColumnsDirective>
                <ColumnDirective field="name" headerText="Name" width="160" clipMode="EllipsisWithTooltip" />
                <ColumnDirective field="age" headerText="Age" width="85" textAlign="Right" type="number" format="N0" />
                <ColumnDirective field="country" headerText="Country" width="130" />
                <ColumnDirective field="city" headerText="City" width="130" />
                <ColumnDirective
                  field="isActive"
                  headerText="Status"
                  width="110"
                  template={ActiveTemplate}
                  textAlign="Center"
                />
                <ColumnDirective field="interest" headerText="Interest" width="160" />
                <ColumnDirective field="favoriteProduct" headerText="Favorite Product" width="180" />
                <ColumnDirective
                  field="lastLoginDate"
                  headerText="Login Date"
                  width="140"
                  type="date"
                  format="yMd"
                />
                <ColumnDirective field="lastLoginTime" headerText="Login Time" width="120" />
              </ColumnsDirective>
              <Inject
                services={[
                  Sort,
                  Filter,
                  Page,
                  Group,
                  Toolbar,
                  ExcelExport,
                  PdfExport,
                  ContextMenu,
                  ColumnMenu,
                  Reorder,
                  VirtualScroll,
                ]}
              />
            </GridComponent>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Why Syncfusion for Finance?</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-muted-foreground">
          <ul className="space-y-2">
            <li>• Excel-style filters with multi-select and search for rapid account reconciliation</li>
            <li>• Virtualization enables smooth scrolling even with hundreds of thousands of entries</li>
            <li>• Built-in PDF and Excel export for audit packages and reporting packs</li>
          </ul>
          <ul className="space-y-2">
            <li>• Context menu actions (auto-fit, copy, export) streamline clerk workflows</li>
            <li>• Compact row layout (28px) mirrors traditional ledger screens</li>
            <li>• Grouping support enables ad-hoc analysis by company, location, or status</li>
          </ul>
          <div className="col-span-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => gridRef.current?.autoFitColumns(["name", "interest", "favoriteProduct"])}
            >
              Auto-fit Key Columns
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

