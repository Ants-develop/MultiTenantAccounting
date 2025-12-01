import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import dayjs from "dayjs";
import { getVerifiedCompanies, startSync, type VerifiedCompany, type SyncResponse, type SyncResult } from "@/api/rs-sync";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Database,
} from "lucide-react";

const syncFormSchema = z.object({
  companyNames: z.array(z.string()).min(1, "At least one company is required"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format"),
  autoAssociate: z.boolean().default(true),
  parallelMode: z.boolean().default(false),
  maxParallel: z.number().int().min(1).max(10).default(3),
});

type SyncFormData = z.infer<typeof syncFormSchema>;

export default function UpdateRSData() {
  const { toast } = useToast();
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [syncResults, setSyncResults] = useState<SyncResponse | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const form = useForm<SyncFormData>({
    resolver: zodResolver(syncFormSchema),
    defaultValues: {
      companyNames: [],
      startDate: dayjs().subtract(1, "month").format("YYYY-MM-DD"),
      endDate: dayjs().format("YYYY-MM-DD"),
      autoAssociate: true,
      parallelMode: false,
      maxParallel: 3,
    },
  });

  // Fetch verified companies
  const { data: verifiedCompaniesData, isLoading: loadingCompanies } = useQuery({
    queryKey: ["verified-companies"],
    queryFn: getVerifiedCompanies,
  });

  const verifiedCompanies = verifiedCompaniesData?.companies || [];

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: startSync,
    onSuccess: (data) => {
      setSyncResults(data);
      setIsSyncing(false);
      toast({
        title: "Sync completed",
        description: `Synced ${data.summary.totalCompanies} companies. Inserted: ${data.summary.totalInserted}, Updated: ${data.summary.totalUpdated}`,
      });
    },
    onError: (error: any) => {
      setIsSyncing(false);
      toast({
        title: "Sync failed",
        description: error.message || "Failed to sync RS data",
        variant: "destructive",
      });
    },
  });

  const handleCompanyToggle = (companyName: string) => {
    setSelectedCompanies((prev) => {
      if (prev.includes(companyName)) {
        return prev.filter((name) => name !== companyName);
      } else {
        return [...prev, companyName];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedCompanies.length === verifiedCompanies.length) {
      setSelectedCompanies([]);
    } else {
      setSelectedCompanies(verifiedCompanies.map((c) => c.companyName));
    }
  };

  const onSubmit = async (data: SyncFormData) => {
    if (selectedCompanies.length === 0) {
      toast({
        title: "No companies selected",
        description: "Please select at least one company to sync",
        variant: "destructive",
      });
      return;
    }

    setIsSyncing(true);
    setSyncResults(null);

    await syncMutation.mutateAsync({
      companyNames: selectedCompanies,
      startDate: data.startDate,
      endDate: data.endDate,
      autoAssociate: data.autoAssociate,
      parallelMode: data.parallelMode,
      maxParallel: data.maxParallel,
    });
  };

  const getStatusBadge = (result: SyncResult) => {
    if (result.error) {
      return (
        <Badge variant="destructive">
          <XCircle className="w-3 h-3 mr-1" />
          Error
        </Badge>
      );
    }
    return (
      <Badge variant="default">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Success
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Update RS Data
          </CardTitle>
          <CardDescription>
            Synchronize waybills, invoices, and related data from RS.ge APIs for verified companies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Company Selection */}
            <div className="space-y-2">
              <Label>Select Companies</Label>
              {loadingCompanies ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading companies...
                </div>
              ) : verifiedCompanies.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No verified companies found. Please verify RS credentials first.
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">
                      {selectedCompanies.length} of {verifiedCompanies.length} selected
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                    >
                      {selectedCompanies.length === verifiedCompanies.length ? "Clear All" : "Select All"}
                    </Button>
                  </div>
                  <div className="border rounded-md p-4 max-h-60 overflow-y-auto">
                    <div className="space-y-2">
                      {verifiedCompanies.map((company) => (
                        <div
                          key={company.id}
                          className="flex items-center space-x-2 p-2 hover:bg-muted rounded"
                        >
                          <Checkbox
                            id={`company-${company.id}`}
                            checked={selectedCompanies.includes(company.companyName)}
                            onCheckedChange={() => handleCompanyToggle(company.companyName)}
                          />
                          <Label
                            htmlFor={`company-${company.id}`}
                            className="flex-1 cursor-pointer"
                          >
                            <div className="font-medium">{company.name}</div>
                            <div className="text-sm text-muted-foreground">
                              TIN: {company.companyTin}
                            </div>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  {...form.register("startDate")}
                />
                {form.formState.errors.startDate && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.startDate.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  {...form.register("endDate")}
                />
                {form.formState.errors.endDate && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.endDate.message}
                  </p>
                )}
              </div>
            </div>

            {/* Sync Options */}
            <div className="space-y-4">
              <Label>Sync Options</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="autoAssociate"
                    {...form.register("autoAssociate")}
                    checked={form.watch("autoAssociate")}
                    onCheckedChange={(checked) =>
                      form.setValue("autoAssociate", checked === true)
                    }
                  />
                  <Label htmlFor="autoAssociate" className="cursor-pointer">
                    Auto-associate invoices with waybills
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="parallelMode"
                    {...form.register("parallelMode")}
                    checked={form.watch("parallelMode")}
                    onCheckedChange={(checked) =>
                      form.setValue("parallelMode", checked === true)
                    }
                  />
                  <Label htmlFor="parallelMode" className="cursor-pointer">
                    Enable parallel sync mode
                  </Label>
                </div>
                {form.watch("parallelMode") && (
                  <div className="ml-6 space-y-2">
                    <Label htmlFor="maxParallel">Max Parallel Companies</Label>
                    <Input
                      id="maxParallel"
                      type="number"
                      min="1"
                      max="10"
                      {...form.register("maxParallel", { valueAsNumber: true })}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSyncing || selectedCompanies.length === 0}
              className="w-full"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Start Sync
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Sync Results */}
      {syncResults && (
        <Card>
          <CardHeader>
            <CardTitle>Sync Results</CardTitle>
            <CardDescription>
              Summary of the synchronization operation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Companies</div>
                <div className="text-2xl font-bold">{syncResults.summary.totalCompanies}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Inserted</div>
                <div className="text-2xl font-bold text-green-600">
                  {syncResults.summary.totalInserted}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Updated</div>
                <div className="text-2xl font-bold text-blue-600">
                  {syncResults.summary.totalUpdated}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Skipped</div>
                <div className="text-2xl font-bold text-yellow-600">
                  {syncResults.summary.totalSkipped}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Errors</div>
                <div className="text-2xl font-bold text-red-600">
                  {syncResults.summary.errors}
                </div>
              </div>
            </div>

            {/* Detailed Results Table */}
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Inserted</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead>Skipped</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syncResults.results.map((result, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{result.company}</TableCell>
                      <TableCell>{result.type}</TableCell>
                      <TableCell>{getStatusBadge(result)}</TableCell>
                      <TableCell>{result.inserted}</TableCell>
                      <TableCell>{result.updated}</TableCell>
                      <TableCell>{result.skipped}</TableCell>
                      <TableCell>{result.total}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

