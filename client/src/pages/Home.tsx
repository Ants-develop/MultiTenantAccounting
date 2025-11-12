import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslation } from "react-i18next";
import { useCompany } from "@/hooks/useCompany";
import { getQueryFn } from "@/lib/queryClient";

interface KpisResponse {
  invoicesCount: number;
  billsCount: number;
  cashflowNet: number;
}

interface TopItem { name: string; value: number; }

export default function Home() {
  const { currentCompany } = useCompany();
  const { t } = useTranslation();
  const [range, setRange] = useState<string>("thisYear");

  const { data: kpis, error: kpiError } = useQuery<KpisResponse>({
    queryKey: ["/api/home/kpis?range=" + range],
    enabled: !!currentCompany,
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: topCustomers, error: customersError } = useQuery<TopItem[]>({
    queryKey: ["/api/home/top-customers?range=" + range],
    enabled: !!currentCompany,
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: topVendors, error: vendorsError } = useQuery<TopItem[]>({
    queryKey: ["/api/home/top-vendors?range=" + range],
    enabled: !!currentCompany,
    queryFn: getQueryFn({ on401: "throw" }),
  });

  if (kpiError || customersError || vendorsError) {
    // Debug information for troubleshooting API issues
    console.error("HOME_PAGE_API_ERROR", { kpiError, customersError, vendorsError, range, currentCompany });
  }

  const formatCurrency = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount || 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t('navigation.dashboard')}</h2>
        <div className="space-x-2">
          <Button variant={range === "thisYear" ? "default" : "outline"} onClick={() => setRange("thisYear")}>This Year</Button>
          <Button variant={range === "lastYear" ? "default" : "outline"} onClick={() => setRange("lastYear")}>Last Year</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{kpis?.invoicesCount ?? '—'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Bills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{kpis?.billsCount ?? '—'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Net Cashflow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{kpis ? formatCurrency(kpis.cashflowNet) : '—'}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(topCustomers ?? []).slice(0,5).map((it, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{it.name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(it.value)}</TableCell>
                  </TableRow>
                ))}
                {(!topCustomers || topCustomers.length === 0) && (
                  <TableRow><TableCell colSpan={2} className="text-muted-foreground text-center">No data</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top Vendors</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(topVendors ?? []).slice(0,5).map((it, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{it.name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(it.value)}</TableCell>
                  </TableRow>
                ))}
                {(!topVendors || topVendors.length === 0) && (
                  <TableRow><TableCell colSpan={2} className="text-muted-foreground text-center">No data</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


