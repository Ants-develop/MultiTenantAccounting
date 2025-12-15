import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRSData } from "@/hooks/useRSData";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const RSTable = ({ tableName }: { tableName: string }) => {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useRSData(tableName, page);

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const columns = data?.data && data.data.length > 0 ? Object.keys(data.data[0]) : [];

  return (
    <div className="space-y-4">
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col} className="whitespace-nowrap">
                  {col.replace(/_/g, " ")}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.data?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length || 1} className="h-24 text-center">
                  No data found.
                </TableCell>
              </TableRow>
            ) : (
              data?.data?.map((row: any, i: number) => (
                <TableRow key={i}>
                  {columns.map((col) => (
                    <TableCell key={col} className="whitespace-nowrap">
                      {typeof row[col] === "object" ? JSON.stringify(row[col]) : row[col]}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <div className="text-sm text-muted-foreground">
          Page {page} of {data?.pagination?.totalPages || 1}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => p + 1)}
          disabled={!data?.pagination?.hasMore}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default function RSData() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">RS.GE Data Warehouse</h2>
        <p className="text-muted-foreground">View raw data synced from Revenue Service.</p>
      </div>

      <Tabs defaultValue="seller_invoices" className="space-y-4">
        <TabsList>
          <TabsTrigger value="seller_invoices">Seller Invoices</TabsTrigger>
          <TabsTrigger value="buyer_invoices">Buyer Invoices</TabsTrigger>
          <TabsTrigger value="sellers_waybills">Seller Waybills</TabsTrigger>
          <TabsTrigger value="buyers_waybills">Buyer Waybills</TabsTrigger>
        </TabsList>
        <TabsContent value="seller_invoices">
          <Card>
            <CardHeader>
              <CardTitle>Seller Invoices</CardTitle>
              <CardDescription>Invoices issued by your company.</CardDescription>
            </CardHeader>
            <CardContent>
              <RSTable tableName="seller_invoices" />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="buyer_invoices">
          <Card>
            <CardHeader>
              <CardTitle>Buyer Invoices</CardTitle>
              <CardDescription>Invoices received by your company.</CardDescription>
            </CardHeader>
            <CardContent>
              <RSTable tableName="buyer_invoices" />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="sellers_waybills">
          <Card>
            <CardHeader>
              <CardTitle>Seller Waybills</CardTitle>
              <CardDescription>Waybills issued by your company.</CardDescription>
            </CardHeader>
            <CardContent>
              <RSTable tableName="sellers_waybills" />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="buyers_waybills">
          <Card>
            <CardHeader>
              <CardTitle>Buyer Waybills</CardTitle>
              <CardDescription>Waybills received by your company.</CardDescription>
            </CardHeader>
            <CardContent>
              <RSTable tableName="buyers_waybills" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
