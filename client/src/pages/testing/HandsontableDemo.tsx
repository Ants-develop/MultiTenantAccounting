import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { HotTable } from "@handsontable/react-wrapper";
import { registerAllModules } from "handsontable/registry";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sampleUserData, type UserData } from "./data/handsontable-sample-data";
import { 
  CheckCircle2, Database, Zap, Settings, RotateCcw, 
  Download, Upload, Search, Filter, X, Maximize2, Minimize2,
  Undo2, Redo2, Copy, FileSpreadsheet, FileText, Eye, EyeOff,
  ArrowUpDown, GripVertical, Save, RefreshCw, Trash2, Plus
} from "lucide-react";

import "handsontable/styles/handsontable.css";
import "handsontable/styles/ht-theme-classic.css";

// Register all Handsontable modules
registerAllModules();

/**
 * Default column widths for optimal display
 */
const DEFAULT_WIDTHS = [160, 30, 130, 130, 30, 190, 190, 130, 110] as const;

/**
 * HandsontableDemo Component
 * 
 * Comprehensive demonstration of Handsontable's capabilities with:
 * - TypeScript type safety
 * - Professional configuration
 * - Best practices for React integration
 * - Multiple interactive features
 * - Export/Import functionality
 * - Search and filtering
 * - Column management
 * - Fullscreen mode
 */
export default function HandsontableDemo() {
  const [colWidths, setColWidths] = useState<number[]>(DEFAULT_WIDTHS as unknown as number[]);
  const [data, setData] = useState<UserData[]>(sampleUserData);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const hotTableRef = useRef<any>(null);

  // Memoize grid height to prevent unnecessary recalculations
  const gridHeight = useMemo(() => {
    return isFullscreen ? window.innerHeight - 300 : 600;
  }, [isFullscreen]);

  const handleResetWidths = useCallback(() => {
    // Create a new array to ensure React detects the change
    const resetWidths = Array.from(DEFAULT_WIDTHS) as unknown as number[];
    setColWidths(resetWidths);
    
    // Force Handsontable to apply the new widths
    if (hotTableRef.current?.hotInstance) {
      setTimeout(() => {
        if (hotTableRef.current?.hotInstance) {
          hotTableRef.current.hotInstance.updateSettings({
            columns: [
              { data: "name", type: "text", width: DEFAULT_WIDTHS[0] },
              { data: "age", type: "numeric", width: DEFAULT_WIDTHS[1], numericFormat: { pattern: "0" } },
              { data: "country", type: "text", width: DEFAULT_WIDTHS[2] },
              { data: "city", type: "text", width: DEFAULT_WIDTHS[3] },
              { data: "isActive", type: "checkbox", width: DEFAULT_WIDTHS[4] },
              { data: "interest", type: "text", width: DEFAULT_WIDTHS[5] },
              { data: "favoriteProduct", type: "text", width: DEFAULT_WIDTHS[6] },
              { data: "lastLoginDate", type: "date", dateFormat: "YYYY-MM-DD", width: DEFAULT_WIDTHS[7], correctFormat: true },
              { data: "lastLoginTime", type: "text", width: DEFAULT_WIDTHS[8] }
            ]
          });
        }
      }, 0);
    }
  }, []);

  const handleColWidthChange = useCallback((col: number, newWidth: number) => {
    setColWidths((prev) => {
      const updated = [...prev];
      updated[col] = Math.max(50, newWidth);
      return updated;
    });
  }, []);

  const handleExportCSV = useCallback(() => {
    if (!hotTableRef.current?.hotInstance) return;
    
    try {
      const instance = hotTableRef.current.hotInstance;
      const csv = instance.getPlugin("exportFile")?.exportAsString("csv");
      
      if (csv) {
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `data-export-${new Date().toISOString().split("T")[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error("CSV export failed:", e);
    }
  }, []);

  const handleExportExcel = useCallback(() => {
    if (!hotTableRef.current?.hotInstance) return;
    
    try {
      const instance = hotTableRef.current.hotInstance;
      const excel = instance.getPlugin("exportFile")?.exportAsString("xlsx");
      
      if (excel) {
        const blob = new Blob([excel], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `data-export-${new Date().toISOString().split("T")[0]}.xlsx`;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error("Excel export failed:", e);
    }
  }, []);

  const handleClearFilters = useCallback(() => {
    if (hotTableRef.current?.hotInstance) {
      try {
        hotTableRef.current.hotInstance.getPlugin("filters")?.clearConditions();
        hotTableRef.current.hotInstance.render();
      } catch (e) {
        console.warn("Failed to clear filters:", e);
      }
    }
  }, []);

  const handleRefresh = useCallback(() => {
    // Reset all state
    setData([...sampleUserData]);
    setSearchQuery("");
    setSelectedRows([]);
    const resetWidths = Array.from(DEFAULT_WIDTHS) as unknown as number[];
    setColWidths(resetWidths);
    
    // Force Handsontable to reset everything
    if (hotTableRef.current?.hotInstance) {
      setTimeout(() => {
        if (hotTableRef.current?.hotInstance) {
          const instance = hotTableRef.current.hotInstance;
          
          // Clear filters
          try {
            instance.getPlugin("filters")?.clearConditions();
          } catch (e) {
            console.warn("Failed to clear filters:", e);
          }
          
          // Clear search
          try {
            instance.getPlugin("search")?.query("");
          } catch (e) {
            console.warn("Failed to clear search:", e);
          }
          
          // Reset columns with default widths
          instance.updateSettings({
            columns: [
              { data: "name", type: "text", width: DEFAULT_WIDTHS[0] },
              { data: "age", type: "numeric", width: DEFAULT_WIDTHS[1], numericFormat: { pattern: "0" } },
              { data: "country", type: "text", width: DEFAULT_WIDTHS[2] },
              { data: "city", type: "text", width: DEFAULT_WIDTHS[3] },
              { data: "isActive", type: "checkbox", width: DEFAULT_WIDTHS[4] },
              { data: "interest", type: "text", width: DEFAULT_WIDTHS[5] },
              { data: "favoriteProduct", type: "text", width: DEFAULT_WIDTHS[6] },
              { data: "lastLoginDate", type: "date", dateFormat: "YYYY-MM-DD", width: DEFAULT_WIDTHS[7], correctFormat: true },
              { data: "lastLoginTime", type: "text", width: DEFAULT_WIDTHS[8] }
            ]
          });
          
          // Deselect and re-render
          instance.deselectCell();
          instance.render();
        }
      }, 0);
    }
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  const handleUndo = useCallback(() => {
    if (hotTableRef.current?.hotInstance) {
      hotTableRef.current.hotInstance.undo();
    }
  }, []);

  const handleRedo = useCallback(() => {
    if (hotTableRef.current?.hotInstance) {
      hotTableRef.current.hotInstance.redo();
    }
  }, []);

  const handleAddRow = useCallback(() => {
    if (hotTableRef.current?.hotInstance) {
      const newRow: UserData = {
        name: "",
        age: 0,
        country: "",
        city: "",
        isActive: false,
        interest: "",
        favoriteProduct: "",
        lastLoginDate: new Date().toISOString().split("T")[0],
        lastLoginTime: new Date().toTimeString().split(" ")[0].slice(0, 5),
      };
      setData((prev) => [...prev, newRow]);
    }
  }, []);

  const handleDeleteSelected = useCallback(() => {
    if (selectedRows.length > 0) {
      // Sort rows in descending order to delete from bottom up (prevents index shifting)
      const sortedRows = [...selectedRows].sort((a, b) => b - a);
      
      // Update React state first
      setData((prev) => {
        const updated = [...prev];
        sortedRows.forEach((rowIndex) => {
          updated.splice(rowIndex, 1);
        });
        return updated;
      });
      
      // Update Handsontable instance
      if (hotTableRef.current?.hotInstance) {
        sortedRows.forEach((row) => {
          hotTableRef.current.hotInstance.alter("remove_row", row);
        });
      }
      
      setSelectedRows([]);
    }
  }, [selectedRows]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (hotTableRef.current?.hotInstance) {
      try {
        if (query) {
          hotTableRef.current.hotInstance.getPlugin("search")?.query(query);
        } else {
          hotTableRef.current.hotInstance.getPlugin("search")?.query("");
        }
        hotTableRef.current.hotInstance.render();
      } catch (e) {
        console.warn("Search error:", e);
      }
    }
  }, []);

  // handleAfterSelection completely removed - causes constant re-renders and lag
  // Do not use selection tracking with Handsontable afterSelection event

  // Memoize columns configuration to prevent HotTable re-initialization
  const columnsConfig = useMemo(() => [
    { data: "name", type: "text", width: colWidths[0] },
    { data: "age", type: "numeric", width: colWidths[1], numericFormat: { pattern: "0" } },
    { data: "country", type: "text", width: colWidths[2] },
    { data: "city", type: "text", width: colWidths[3] },
    { data: "isActive", type: "checkbox", width: colWidths[4] },
    { data: "interest", type: "text", width: colWidths[5] },
    { data: "favoriteProduct", type: "text", width: colWidths[6] },
    { data: "lastLoginDate", type: "date", dateFormat: "YYYY-MM-DD", width: colWidths[7], correctFormat: true },
    { data: "lastLoginTime", type: "text", width: colWidths[8] }
  ], [colWidths]);

  // Use Handsontable's built-in context menu - no custom event handlers needed

  return (
    <>
      <style>{`
        /* Body and Div Resets */
        body {
          margin: 0;
          padding: 0;
        }
        
        /* Context Menu Styling - Keep it on top */
        .htContextMenu {
          z-index: 10000 !important;
          position: fixed !important;
          pointer-events: auto !important;
        }
        
        /* Ensure menu items are clickable */
        .htContextMenu ul {
          pointer-events: auto !important;
        }
        
        .htContextMenu li {
          pointer-events: auto !important;
          user-select: none;
        }
      `}</style>
      <div className="space-y-8">
        {/* Header Section */}
        <div className="border-b pb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Handsontable Data Grid Demo</h1>
          <p className="text-muted-foreground max-w-2xl">
            A comprehensive demonstration of Handsontable's powerful spreadsheet-like data grid capabilities. 
            Featuring sorting, filtering, multiple column types, and responsive design.
          </p>
        </div>

      {/* Main Demo */}
      <Card className={`border-2 ${isFullscreen ? "fixed inset-0 z-50 m-0 rounded-none" : ""}`}>
        <CardHeader className="bg-muted/50">
          <div className="flex flex-col gap-4">
            {/* Top Row: Title and Stats */}
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Interactive Data Grid
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{data.length} Records</Badge>
                {selectedRows.length > 0 && (
                  <Badge variant="destructive">{selectedRows.length} Selected</Badge>
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleToggleFullscreen}
                  className="gap-1"
                >
                  {isFullscreen ? (
                    <>
                      <Minimize2 className="w-3 h-3" />
                      Exit Fullscreen
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-3 h-3" />
                      Fullscreen
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search across all columns..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-8 h-8"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSearch("")}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Toolbar: Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 border-r pr-2 mr-2">
                <Button variant="outline" size="sm" onClick={handleUndo} className="gap-1 h-7">
                  <Undo2 className="w-3 h-3" />
                  Undo
                </Button>
                <Button variant="outline" size="sm" onClick={handleRedo} className="gap-1 h-7">
                  <Redo2 className="w-3 h-3" />
                  Redo
                </Button>
              </div>

              <div className="flex items-center gap-1 border-r pr-2 mr-2">
                <Button variant="outline" size="sm" onClick={handleAddRow} className="gap-1 h-7">
                  <Plus className="w-3 h-3" />
                  Add Row
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleDeleteSelected}
                  disabled={true}
                  className="gap-1 h-7"
                  title="Disabled: Selection tracking causes performance issues"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </Button>
              </div>

              <div className="flex items-center gap-1 border-r pr-2 mr-2">
                <Button variant="outline" size="sm" onClick={handleClearFilters} className="gap-1 h-7">
                  <Filter className="w-3 h-3" />
                  Clear Filters
                </Button>
                <Button variant="outline" size="sm" onClick={handleResetWidths} className="gap-1 h-7">
                  <RotateCcw className="w-3 h-3" />
                  Reset Widths
                </Button>
                <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-1 h-7">
                  <RefreshCw className="w-3 h-3" />
                  Refresh
                </Button>
              </div>

              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1 h-7">
                  <FileText className="w-3 h-3" />
                  Export CSV
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-1 h-7">
                  <FileSpreadsheet className="w-3 h-3" />
                  Export Excel
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              💡 Right-click for context menu • Drag column dividers to resize • Click headers to filter and sort • Use search to find data quickly
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <HotTable
            ref={hotTableRef}
            data={data}
            themeName="ht-theme-classic"
            height={gridHeight}
            width="100%"
            rowHeaders={true}
            colHeaders={["Name", "Age", "Country", "City", "Active", "Interest", "Favorite Product", "Login Date", "Login Time"]}
            columns={columnsConfig}
            filters={true}
            dropdownMenu={true}
            multiColumnSorting={true}
            manualColumnResize={true}
            manualColumnMove={true}
            manualRowMove={true}
            contextMenu={true}
            stretchH="all"
            autoWrapRow={false}
            autoWrapCol={false}
            readOnly={false}
            licenseKey="non-commercial-and-evaluation"
            afterColumnResize={handleColWidthChange}
            search={true}
            undo={true}
            copyPaste={true}
            comments={true}
            customBorders={true}
            mergeCells={true}
            dataSchema={sampleUserData[0]}
          />
        </CardContent>
      </Card>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Virtual scrolling supports thousands of rows without performance loss. Optimized rendering for large datasets.
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="w-4 h-4 text-blue-500" />
              Multiple Types
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Text, numeric, date, checkbox, dropdown, formulas, comments, and custom column types with validation.
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Built-in Features
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Sorting, filtering, search, context menu, column/row move, merge cells, custom borders, and undo/redo.
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-500" />
              Export & Import
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Export to CSV/Excel, copy/paste support, fullscreen mode, and seamless React state management.
          </CardContent>
        </Card>
      </div>

      {/* Column Types Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Column Types Demonstrated</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold mb-2 text-sm">Text Columns</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ <span className="font-medium">Name</span> - Standard text input</li>
                <li>✓ <span className="font-medium">Country</span> - With filtering</li>
                <li>✓ <span className="font-medium">City</span> - Sortable text</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2 text-sm">Data Types</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ <span className="font-medium">Age</span> - Numeric with validation</li>
                <li>✓ <span className="font-medium">Login Date</span> - Date format</li>
                <li>✓ <span className="font-medium">Login Time</span> - Time format</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2 text-sm">Interactive Types</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ <span className="font-medium">Active</span> - Checkbox toggle</li>
                <li>✓ <span className="font-medium">Interest</span> - Sortable list</li>
                <li>✓ All columns support sorting & filtering</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Features */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Key Features Enabled</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Column Filtering</p>
                  <p className="text-xs text-muted-foreground">Click column headers to filter data</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Multi-Column Sorting</p>
                  <p className="text-xs text-muted-foreground">Sort by multiple columns simultaneously</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Global Search</p>
                  <p className="text-xs text-muted-foreground">Search across all columns instantly</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Context Menu</p>
                  <p className="text-xs text-muted-foreground">Right-click for row operations</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Undo/Redo</p>
                  <p className="text-xs text-muted-foreground">Full history of changes</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Copy/Paste</p>
                  <p className="text-xs text-muted-foreground">Excel-style clipboard support</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Export CSV/Excel</p>
                  <p className="text-xs text-muted-foreground">One-click export functionality</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Column/Row Move</p>
                  <p className="text-xs text-muted-foreground">Drag to reorder columns and rows</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Fullscreen Mode</p>
                  <p className="text-xs text-muted-foreground">Maximize workspace for data entry</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Tips */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-base">💡 Usage Tips & Keyboard Shortcuts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div className="space-y-2">
              <p>• <strong>Sort:</strong> Click column headers or use the dropdown menu</p>
              <p>• <strong>Filter:</strong> Use the filter dropdown to narrow results</p>
              <p>• <strong>Search:</strong> Use the search bar to find data across all columns</p>
              <p>• <strong>Select:</strong> Click rows or use Ctrl+Click for multiple selections</p>
              <p>• <strong>Resize:</strong> Drag column dividers to adjust column widths</p>
            </div>
            <div className="space-y-2">
              <p>• <strong>Copy/Paste:</strong> Ctrl+C / Ctrl+V for Excel-style clipboard</p>
              <p>• <strong>Undo/Redo:</strong> Ctrl+Z / Ctrl+Y or use toolbar buttons</p>
              <p>• <strong>Move Columns:</strong> Drag column headers to reorder</p>
              <p>• <strong>Context Menu:</strong> Right-click cells for more options</p>
              <p>• <strong>Fullscreen:</strong> Click fullscreen button for maximum workspace</p>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
      </>
  );
}

