import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Play, Download } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    flexRender,
    getCoreRowModel,
    useReactTable,
    getPaginationRowModel,
    ColumnDef,
} from "@tanstack/react-table";

interface MSSQLDataGridProps {
    connectionId: number;
    tableName: string;
}

export function MSSQLDataGrid({ connectionId, tableName }: MSSQLDataGridProps) {
    const [customQuery, setCustomQuery] = useState("");

    // Reset query when table changes
    const defaultQuery = useMemo(() => `SELECT TOP 100 * FROM ${tableName}`, [tableName]);
    const [activeQuery, setActiveQuery] = useState(defaultQuery);

    // Update active query when table changes (if it was using default)
    const isDefaultQuery = activeQuery.startsWith("SELECT TOP 100 * FROM");
    React.useEffect(() => {
        setActiveQuery(`SELECT TOP 100 * FROM ${tableName}`);
        setCustomQuery(`SELECT TOP 100 * FROM ${tableName}`);
    }, [tableName]);


    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey: ["/api/mssql-explorer", connectionId, "query", activeQuery],
        queryFn: async () => {
            const res = await apiRequest("POST", `/api/mssql-explorer/${connectionId}/query`, {
                query: activeQuery
            });
            return res.json();
        },
        enabled: !!connectionId && !!tableName,
    });

    const columns = useMemo<ColumnDef<any>[]>(() => {
        if (!data?.columns) return [];
        return data.columns.map((col: string) => ({
            accessorKey: col,
            header: col,
            cell: ({ getValue }: any) => {
                const val = getValue();
                if (val === null) return <span className="text-muted-foreground italic">null</span>;
                if (typeof val === 'boolean') return val.toString();
                if (typeof val === 'object') return JSON.stringify(val);
                return String(val);
            }
        }));
    }, [data?.columns]);

    const table = useReactTable({
        data: data?.rows || [],
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: {
            pagination: {
                pageSize: 50,
            }
        }
    });

    const handleRunQuery = () => {
        setActiveQuery(customQuery);
    };

    if (!connectionId || !tableName) {
        return (
            <div className="flex bg-muted/10 h-full items-center justify-center text-muted-foreground">
                Select a table to view data
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full space-y-4 p-4">
            <div className="flex flex-col space-y-2">
                <div className="flex items-center space-x-2">
                    <Input
                        value={customQuery}
                        onChange={(e) => setCustomQuery(e.target.value)}
                        placeholder="Enter SQL Query..."
                        className="font-mono text-sm"
                    />
                    <Button onClick={handleRunQuery} disabled={isLoading}>
                        <Play className="mr-2 h-4 w-4" />
                        Run
                    </Button>
                </div>
            </div>

            {isError && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                        {error instanceof Error ? error.message : "Failed to execute query"}
                    </AlertDescription>
                </Alert>
            )}

            <Card className="flex-1 overflow-hidden flex flex-col">
                <CardHeader className="py-3 px-4 border-b">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-sm font-medium">Results</CardTitle>
                            <CardDescription className="text-xs">
                                {data?.rows?.length || 0} rows retrieved
                                {data?.rowsAffected ? ` (${data.rowsAffected} affected)` : ''}
                            </CardDescription>
                        </div>
                        {/* Pagination controls could go here */}
                        <div className="flex items-center space-x-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => table.previousPage()}
                                disabled={!table.getCanPreviousPage()}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => table.nextPage()}
                                disabled={!table.getCanNextPage()}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto p-0">
                    {isLoading ? (
                        <div className="p-4 space-y-2">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ) : (
                        <div className="rounded-md border-0 h-full">
                            <Table>
                                <TableHeader className="sticky top-0 bg-secondary z-10">
                                    {table.getHeaderGroups().map((headerGroup) => (
                                        <TableRow key={headerGroup.id}>
                                            {headerGroup.headers.map((header) => {
                                                return (
                                                    <TableHead key={header.id} className="whitespace-nowrap">
                                                        {header.isPlaceholder
                                                            ? null
                                                            : flexRender(
                                                                header.column.columnDef.header,
                                                                header.getContext()
                                                            )}
                                                    </TableHead>
                                                );
                                            })}
                                        </TableRow>
                                    ))}
                                </TableHeader>
                                <TableBody>
                                    {table.getRowModel().rows?.length ? (
                                        table.getRowModel().rows.map((row) => (
                                            <TableRow
                                                key={row.id}
                                                data-state={row.getIsSelected() && "selected"}
                                            >
                                                {row.getVisibleCells().map((cell) => (
                                                    <TableCell key={cell.id} className="whitespace-nowrap">
                                                        {flexRender(
                                                            cell.column.columnDef.cell,
                                                            cell.getContext()
                                                        )}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell
                                                colSpan={columns.length || 1}
                                                className="h-24 text-center"
                                            >
                                                No results.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
