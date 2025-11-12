import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { registerAllModules } from "handsontable/registry";
import { HotTable } from "@handsontable/react-wrapper";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FilterX, RefreshCw, Maximize2, Minimize2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import dayjs from "dayjs";
import { HandsontableErrorBoundary } from "./HandsontableErrorBoundary";

import "handsontable/styles/handsontable.css";
import "handsontable/styles/ht-theme-classic.css";
import "handsontable/styles/ht-theme-main.css";
import "handsontable/styles/ht-theme-horizon.css";
import "@/css/handsontable-custom.css";

// Register all Handsontable modules once
registerAllModules();

export type ThemeName = "ht-theme-classic" | "ht-theme-main" | "ht-theme-horizon";

export interface BaseHandsontableGridProps {
  // Data
  data: any[];
  columns?: any[];
  colHeaders?: string[] | boolean;
  colWidths?: number[] | number | string;
  
  // Dimensions
  height?: number | "auto";
  width?: string | number;
  
  // Theme
  themeName?: ThemeName;
  showThemeSwitch?: boolean;
  
  // Features
  showFullscreen?: boolean;
  showExport?: boolean;
  showClearFilters?: boolean;
  showRefresh?: boolean;
  readOnly?: boolean;
  
  // Callbacks
  onSave?: () => void;
  onRefresh?: () => void;
  
  // Export
  exportFilename?: string;
  
  // Advanced config
  nestedHeaders?: any[];
  contextMenuConfig?: any;
  rowHeaders?: boolean;
  filters?: boolean;
  dropdownMenu?: boolean;
  comments?: boolean;
  multiColumnSorting?: boolean;
  manualColumnResize?: boolean;
  persistentState?: boolean;
  stretchH?: "none" | "all" | "last";
  wordWrap?: boolean;
  autoColumnSize?: any;
  
  // Loading state
  isLoading?: boolean;
  isSaving?: boolean;
  
  // Additional props for toolbar customization
  toolbarLeft?: React.ReactNode;
  toolbarRight?: React.ReactNode;
}

const AVAILABLE_THEMES: { value: ThemeName; label: string }[] = [
  { value: "ht-theme-classic", label: "Classic" },
  { value: "ht-theme-main", label: "Main" },
  { value: "ht-theme-horizon", label: "Horizon" },
];

export const BaseHandsontableGrid: React.FC<BaseHandsontableGridProps> = ({
  data,
  columns,
  colHeaders = true,
  colWidths,
  height = "auto",
  width = "100%",
  themeName: initialThemeName = "ht-theme-classic",
  showThemeSwitch = false,
  showFullscreen = false,
  showExport = true,
  showClearFilters = true,
  showRefresh = true,
  readOnly = true,
  onSave,
  onRefresh,
  exportFilename = "Export",
  nestedHeaders,
  contextMenuConfig,
  rowHeaders = true,
  filters = true,
  dropdownMenu = true,
  comments = false,
  multiColumnSorting = true,
  manualColumnResize = true,
  persistentState = false,
  stretchH = "none",
  wordWrap = false,
  autoColumnSize,
  isLoading = false,
  isSaving = false,
  toolbarLeft,
  toolbarRight,
}) => {
  const hotTableRef = useRef<any>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const [themeName, setThemeName] = useState<ThemeName>(initialThemeName);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [gridHeight, setGridHeight] = useState<number>(600);

  // Global error handler for Handsontable errors during zoom
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      // Suppress Handsontable errors during zoom/resize
      if (event.message && (
        event.message.includes('Handsontable') ||
        event.message.includes('Cannot read') ||
        event.message === '(unknown runtime error)'
      )) {
        event.preventDefault();
        event.stopPropagation();
        console.warn('Suppressed Handsontable error during zoom/resize:', event.message);
        return false;
      }
    };

    window.addEventListener('error', handleError, true);
    return () => window.removeEventListener('error', handleError, true);
  }, []);

  // Handle theme change
  const handleThemeChange = useCallback((newTheme: string) => {
    setThemeName(newTheme as ThemeName);
    try {
      const hot = hotTableRef.current?.hotInstance;
      if (hot && typeof hot.useTheme === 'function') {
        hot.useTheme(newTheme);
      }
    } catch (error) {
      console.warn('Error changing Handsontable theme:', error);
    }
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
    // Refresh dimensions after fullscreen toggle
    setTimeout(() => {
      try {
        const hot = hotTableRef.current?.hotInstance;
        if (hot && typeof hot.refreshDimensions === 'function') {
          hot.refreshDimensions();
        }
      } catch (error) {
        console.warn('Error refreshing Handsontable dimensions on fullscreen toggle:', error);
      }
    }, 100);
  }, []);

  // Handle export
  const handleExport = useCallback(() => {
    try {
      const hot = hotTableRef.current?.hotInstance;
      if (!hot) {
        toast({
          title: "Error",
          description: "Grid is not ready. Please try again.",
          variant: "destructive"
        });
        return;
      }

      const exportPlugin = (hot as any).getPlugin?.('exportFile');
      if (exportPlugin && typeof exportPlugin.downloadFile === 'function') {
        exportPlugin.downloadFile('csv', {
          filename: `${exportFilename}_${dayjs().format('YYYY-MM-DD')}`,
          columnHeaders: true,
        });
      } else {
        toast({
          title: "Error",
          description: "Export functionality is not available.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to export data",
        variant: "destructive"
      });
    }
  }, [toast, exportFilename]);

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    try {
      const hot = hotTableRef.current?.hotInstance;
      if (!hot) {
        toast({
          title: "Error",
          description: "Grid is not ready. Please try again.",
          variant: "destructive"
        });
        return;
      }

      const filtersPlugin = hot.getPlugin('filters');
      if (filtersPlugin && typeof filtersPlugin.clearConditions === 'function' && typeof filtersPlugin.filter === 'function') {
        filtersPlugin.clearConditions();
        filtersPlugin.filter();
        toast({ 
          title: "Filters Cleared", 
          description: "All column filters have been removed" 
        });
      } else {
        toast({
          title: "Error",
          description: "Filter functionality is not available.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error clearing filters:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to clear filters",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Calculate grid height from flex container using ResizeObserver
  useEffect(() => {
    // If height is explicitly provided as a number, use it
    if (typeof height === 'number') {
      setGridHeight(height);
      return;
    }

    // Otherwise, use ResizeObserver for dynamic height
    if (!gridContainerRef.current) return;

    let resizeTimeout: ReturnType<typeof setTimeout>;
    
    const resizeObserver = new ResizeObserver((entries) => {
      // Debounce the resize to avoid excessive updates during zoom
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        try {
          for (const entry of entries) {
            const containerHeight = entry.contentRect.height;
            if (containerHeight > 0) {
              const spacing = 8; // Account for spacing
              const newHeight = Math.max(400, containerHeight - spacing);
              setGridHeight(newHeight);
            }
          }
        } catch (error) {
          console.warn('Error in ResizeObserver:', error);
        }
      }, 150); // Debounce by 150ms to handle zoom smoothly
    });

    resizeObserver.observe(gridContainerRef.current);
    
    return () => {
      clearTimeout(resizeTimeout);
      resizeObserver.disconnect();
    };
  }, [height, isFullscreen]);

  // Initialize grid dimensions when data loads
  useEffect(() => {
    if (data.length > 0) {
      const timeoutId = setTimeout(() => {
        try {
          const hot = hotTableRef.current?.hotInstance;
          if (hot && typeof hot.refreshDimensions === 'function') {
            hot.refreshDimensions();
          }
        } catch (error) {
          // Silently ignore - Handsontable might not be ready yet
        }
      }, 200);
      
      return () => clearTimeout(timeoutId);
    }
  }, [data.length]);

  // Context menu configuration
  const contextMenu = useMemo(() => {
    if (contextMenuConfig) return contextMenuConfig;
    if (!readOnly) {
      return {
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
      };
    }
    return true;
  }, [contextMenuConfig, readOnly]);

  // Show toolbar only if there are any toolbar features enabled
  const showToolbar = showThemeSwitch || showFullscreen || showExport || showClearFilters || showRefresh || onSave || toolbarLeft || toolbarRight;

  return (
    <div className={`flex flex-col h-full ${isFullscreen ? 'fullscreen-grid fixed inset-0 z-50 bg-background' : ''}`}>
      {showToolbar && (
        <div className="flex items-center justify-between gap-2 mb-3 flex-shrink-0 px-4">
          <div className="flex items-center gap-2">
            {toolbarLeft}
          </div>
          
          <div className="flex items-center gap-1.5">
            {toolbarRight}
            
            {showThemeSwitch && (
              <div className="theme-examples-controls">
                <div className="example-container">
                  <div className="color-select">
                    <Select value={themeName} onValueChange={handleThemeChange}>
                      <SelectTrigger className="w-[120px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AVAILABLE_THEMES.map((theme) => (
                          <SelectItem key={theme.value} value={theme.value}>
                            {theme.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
            
            {showFullscreen && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={toggleFullscreen}
                title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-3.5 h-3.5" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5" />
                )}
              </Button>
            )}
            
            {showClearFilters && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2"
                onClick={handleClearFilters}
                title="Clear All Filters"
              >
                <FilterX className="w-3.5 h-3.5 mr-1" />
                <span className="text-xs">Clear</span>
              </Button>
            )}
            
            {showRefresh && onRefresh && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2"
                onClick={onRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="text-xs">Refresh</span>
              </Button>
            )}
            
            {showExport && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2"
                onClick={handleExport}
                disabled={data.length === 0}
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                <span className="text-xs">Export</span>
              </Button>
            )}
            
            {onSave && (
              <Button
                size="sm"
                className="h-8 px-2"
                onClick={onSave}
                disabled={isSaving}
              >
                <span className="text-xs">{isSaving ? 'Saving...' : 'Save'}</span>
              </Button>
            )}
          </div>
        </div>
      )}
      
      <div ref={gridContainerRef} className="relative flex-1 min-h-0 w-full">
        {isLoading && data.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-primary mr-2" />
            <span className="text-muted-foreground">Loading data...</span>
          </div>
        ) : (
          <HandsontableErrorBoundary>
            <HotTable
              ref={hotTableRef}
              themeName={themeName}
              data={data}
              columns={columns}
              colHeaders={colHeaders}
              colWidths={colWidths}
              width={width}
              height={gridHeight}
              rowHeaders={rowHeaders}
              contextMenu={contextMenu as any}
              filters={filters}
              dropdownMenu={dropdownMenu}
              comments={comments}
              multiColumnSorting={multiColumnSorting}
              manualColumnResize={manualColumnResize}
              persistentState={persistentState}
              licenseKey="non-commercial-and-evaluation"
              stretchH={stretchH}
              wordWrap={wordWrap}
              autoColumnSize={autoColumnSize}
              nestedHeaders={nestedHeaders}
              readOnly={readOnly}
            />
          </HandsontableErrorBoundary>
        )}
      </div>
    </div>
  );
};

