import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, ArrowLeft, Download, Eye } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import dayjs from "dayjs";

export const ClientPortalInvoices: React.FC = () => {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const clientId = parseInt(sessionStorage.getItem("clientId") || "0");

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["/api/client-portal/invoices", clientId],
    queryFn: async () => {
      // TODO: Implement invoice fetching endpoint
      // For now, return empty array
      return [];
    },
    enabled: clientId > 0,
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      paid: "default",
      sent: "secondary",
      overdue: "destructive",
      draft: "outline",
    };
    return variants[status] || "outline";
  };

  const totalOutstanding = invoices
    .filter((inv: any) => inv.status !== "paid")
    .reduce((sum: number, inv: any) => sum + (parseFloat(inv.totalAmount) || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setLocation("/client-portal/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
              <p className="text-sm text-gray-500">View and manage your invoices</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Invoice Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Total Outstanding</p>
                <p className="text-2xl font-bold">${totalOutstanding.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Invoices</p>
                <p className="text-2xl font-bold">{invoices.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Paid Invoices</p>
                <p className="text-2xl font-bold">
                  {invoices.filter((inv: any) => inv.status === "paid").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoices Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Invoices</CardTitle>
            <CardDescription>View and download your invoices</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <DollarSign className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No invoices yet</p>
                <p className="text-sm mt-2">Invoices will appear here once they are created</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice: any) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell>
                        {invoice.date ? dayjs(invoice.date).format("MMM D, YYYY") : "N/A"}
                      </TableCell>
                      <TableCell>
                        {invoice.dueDate ? dayjs(invoice.dueDate).format("MMM D, YYYY") : "N/A"}
                      </TableCell>
                      <TableCell>${parseFloat(invoice.totalAmount || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadge(invoice.status)}>
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              // TODO: Implement invoice detail view
                              toast({
                                title: "Invoice Detail",
                                description: "Invoice detail view will be implemented",
                              });
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              // TODO: Implement invoice download
                              toast({
                                title: "Download",
                                description: "Invoice download will be implemented",
                              });
                            }}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

