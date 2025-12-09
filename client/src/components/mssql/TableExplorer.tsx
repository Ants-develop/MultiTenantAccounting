import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
    Database,
    Table,
    MoreVertical,
    Trash2,
    RefreshCw,
    Plug
} from "lucide-react";
import { ConnectionManager } from "./ConnectionManager";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface TableExplorerProps {
    selectedConnectionId?: number | null;
    selectedTableName?: string | null;
    onSelectConnection: (id: number | null) => void;
    onSelectTable: (tableName: string) => void;
}

export function TableExplorer({
    selectedConnectionId,
    selectedTableName,
    onSelectConnection,
    onSelectTable,
}: TableExplorerProps) {
    const { toast } = useToast();

    const { data: connections, isLoading: connectionsLoading } = useQuery({
        queryKey: ["/api/mssql-explorer/connections"],
        queryFn: async () => {
            const res = await apiRequest("GET", "/api/mssql-explorer/connections");
            return res.json();
        },
    });

    const handleDeleteConnection = async (id: number) => {
        try {
            await apiRequest("DELETE", `/api/mssql-explorer/connections/${id}`);
            toast({
                title: "Connection deleted",
                description: "The connection has been removed.",
            });
            queryClient.invalidateQueries({ queryKey: ["/api/mssql-explorer/connections"] });
            if (selectedConnectionId === id) {
                onSelectConnection(null);
            }
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error deleting",
                description: error.message,
            });
        }
    };

    return (
        <div className="flex flex-col h-full border-r bg-muted/10">
            <div className="p-4 border-b flex items-center justify-between">
                <h2 className="font-semibold text-sm flex items-center gap-2">
                    <Plug className="h-4 w-4" />
                    Connections
                </h2>
                <ConnectionManager />
            </div>

            <ScrollArea className="flex-1">
                <div className="p-2">
                    {connectionsLoading ? (
                        <div className="space-y-2 p-2">
                            {[1, 2, 3].map((i) => (
                                <Skeleton key={i} className="h-10 w-full" />
                            ))}
                        </div>
                    ) : (
                        <Accordion
                            type="single"
                            collapsible
                            value={selectedConnectionId?.toString()}
                            onValueChange={(val) => {
                                const id = val ? parseInt(val) : null;
                                onSelectConnection(id);
                            }}
                        >
                            {connections?.map((conn: any) => (
                                <ContextMenu key={conn.id}>
                                    <ContextMenuTrigger>
                                        <AccordionItem value={conn.id.toString()} className="border-b-0">
                                            <AccordionTrigger className={cn(
                                                "px-3 py-2 hover:bg-accent hover:text-accent-foreground rounded-md text-sm",
                                                selectedConnectionId === conn.id && "bg-accent text-accent-foreground"
                                            )}>
                                                <div className="flex items-center gap-2 text-left truncate">
                                                    <Database className="h-4 w-4 flex-shrink-0" />
                                                    <div className="truncate">
                                                        <div className="font-medium truncate">{conn.name}</div>
                                                        <div className="text-xs text-muted-foreground truncate">{conn.server} - {conn.database}</div>
                                                    </div>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="pt-1 pb-2 pl-4">
                                                {/* Load tables when accordion is open */}
                                                {selectedConnectionId === conn.id && (
                                                    <TablesList
                                                        connectionId={conn.id}
                                                        selectedTableName={selectedTableName}
                                                        onSelectTable={onSelectTable}
                                                    />
                                                )}
                                            </AccordionContent>
                                        </AccordionItem>
                                    </ContextMenuTrigger>
                                    <ContextMenuContent>
                                        <ContextMenuItem
                                            className="text-destructive focus:text-destructive"
                                            onClick={() => handleDeleteConnection(conn.id)}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete Connection
                                        </ContextMenuItem>
                                    </ContextMenuContent>
                                </ContextMenu>
                            ))}
                        </Accordion>
                    )}

                    {connections?.length === 0 && (
                        <div className="text-center py-8 px-4 text-muted-foreground text-sm">
                            No connections found. Add one to get started.
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}

function TablesList({
    connectionId,
    selectedTableName,
    onSelectTable
}: {
    connectionId: number,
    selectedTableName?: string | null,
    onSelectTable: (name: string) => void
}) {
    const { data: tables, isLoading, error } = useQuery({
        queryKey: ["/api/mssql-explorer", connectionId, "tables"],
        queryFn: async () => {
            const res = await apiRequest("GET", `/api/mssql-explorer/${connectionId}/tables`);
            return res.json();
        }
    });

    if (isLoading) {
        return (
            <div className="space-y-2 py-2">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-3/4" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-xs text-destructive py-2">
                Failed to load tables.
            </div>
        );
    }

    // Group tables by schema? Or just flat list.
    // Let's do simple flat list first, maybe schema prefix
    return (
        <div className="space-y-1">
            {tables?.map((table: any) => (
                <Button
                    key={`${table.schema_name}.${table.name}`}
                    variant="ghost"
                    size="sm"
                    className={cn(
                        "w-full justify-start h-8 px-2 font-normal text-xs",
                        selectedTableName === table.name && "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
                    )}
                    onClick={() => onSelectTable(`[${table.schema_name}].[${table.name}]`)}
                >
                    <Table className="mr-2 h-3 w-3 text-muted-foreground" />
                    <span className="truncate">{table.schema_name !== 'dbo' ? `${table.schema_name}.` : ''}{table.name}</span>
                    {table.row_count > 0 && (
                        <span className="ml-auto text-[10px] text-muted-foreground">{table.row_count}</span>
                    )}
                </Button>
            ))}
            {tables?.length === 0 && (
                <div className="text-xs text-muted-foreground py-2">No tables found</div>
            )}
        </div>
    );
}
