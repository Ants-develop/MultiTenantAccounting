import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { WorkflowFilters } from "@/types/workflow";

interface JobFiltersProps {
  filters: WorkflowFilters;
  onFiltersChange: (filters: WorkflowFilters) => void;
  clients?: Array<{ id: string; name: string }>;
  users?: Array<{ id: string; full_name: string }>;
  stages?: Array<{ id: string; name: string }>;
}

export const JobFilters = ({ filters, onFiltersChange, clients, users, stages }: JobFiltersProps) => {
  const updateFilter = (key: keyof WorkflowFilters, value: string | undefined) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined,
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.values(filters).some(
    (value) => value !== undefined && value !== ""
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Filters</CardTitle>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Client Filter */}
        <div className="space-y-2">
          <Label className="text-sm">Client</Label>
          <Select
            value={filters.client_id || ""}
            onValueChange={(value) => updateFilter("client_id", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All clients</SelectItem>
              {clients?.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Service Type Filter */}
        <div className="space-y-2">
          <Label className="text-sm">Service Type</Label>
          <Select
            value={filters.service_type || ""}
            onValueChange={(value) => updateFilter("service_type", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All services" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All services</SelectItem>
              <SelectItem value="monthly_bookkeeping">Monthly Bookkeeping</SelectItem>
              <SelectItem value="vat_return">VAT Return</SelectItem>
              <SelectItem value="payroll">Payroll</SelectItem>
              <SelectItem value="annual_financials">Annual Financials</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stage Filter */}
        <div className="space-y-2">
          <Label className="text-sm">Stage</Label>
          <Select
            value={filters.current_stage_id || ""}
            onValueChange={(value) => updateFilter("current_stage_id", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All stages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All stages</SelectItem>
              {stages?.map((stage) => (
                <SelectItem key={stage.id} value={stage.id}>
                  {stage.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Assigned To Filter */}
        <div className="space-y-2">
          <Label className="text-sm">Assigned To</Label>
          <Select
            value={filters.assigned_to || ""}
            onValueChange={(value) => updateFilter("assigned_to", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All users</SelectItem>
              {users?.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter */}
        <div className="space-y-2">
          <Label className="text-sm">Status</Label>
          <Select
            value={filters.status || ""}
            onValueChange={(value) => updateFilter("status", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Period Filter */}
        <div className="space-y-2">
          <Label className="text-sm">Period</Label>
          <Select
            value={filters.period || ""}
            onValueChange={(value) => updateFilter("period", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All periods" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All periods</SelectItem>
              <SelectItem value="January 2025">January 2025</SelectItem>
              <SelectItem value="February 2025">February 2025</SelectItem>
              <SelectItem value="March 2025">March 2025</SelectItem>
              <SelectItem value="Q1 2025">Q1 2025</SelectItem>
              <SelectItem value="Q2 2025">Q2 2025</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};
