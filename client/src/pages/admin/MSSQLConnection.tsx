import React, { useState } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { TableExplorer } from "@/components/mssql/TableExplorer";
import { MSSQLDataGrid } from "@/components/mssql/MSSQLDataGrid";
import { Card } from "@/components/ui/card";
import { Database } from "lucide-react";

export default function Connections() {
  const [selectedConnectionId, setSelectedConnectionId] = useState<number | null>(null);
  const [selectedTableName, setSelectedTableName] = useState<string | null>(null);

  const handleSelectTable = (tableName: string) => {
    setSelectedTableName(tableName);
  };

  const handleSelectConnection = (id: number | null) => {
    setSelectedConnectionId(id);
    setSelectedTableName(null); // Reset table when connection changes
  };

  return (
    <div className="h-[calc(100vh-4rem)] -m-8 flex flex-col">
      <ResizablePanelGroup direction="horizontal" className="flex-1 border-t">
        <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
          <TableExplorer
            selectedConnectionId={selectedConnectionId}
            selectedTableName={selectedTableName}
            onSelectConnection={handleSelectConnection}
            onSelectTable={handleSelectTable}
          />
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel defaultSize={80}>
          {selectedConnectionId && selectedTableName ? (
            <MSSQLDataGrid
              connectionId={selectedConnectionId}
              tableName={selectedTableName}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-muted/5">
              <div className="bg-background p-6 rounded-full shadow-sm mb-4">
                <Database className="h-12 w-12 text-primary/20" />
              </div>
              <h3 className="font-semibold text-lg mb-2">
                {selectedConnectionId ? "Select a Table" : "Select a Connection"}
              </h3>
              <p className="max-w-sm">
                {selectedConnectionId
                  ? "Choose a table from the sidebar to view its data and execute queries."
                  : "Select a connection from the sidebar or add a new one to get started."}
              </p>
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

