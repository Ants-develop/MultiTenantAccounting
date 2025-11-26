import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ClientFilter } from "@/components/filters/ClientFilter";
import { TaskFilters as TaskFiltersType } from "@/api/tasks-bitrix";
import { X, Clock } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface TaskFiltersProps {
  filters: TaskFiltersType;
  onFiltersChange: (filters: TaskFiltersType) => void;
  accessibleClients: Array<{ id: number; name: string; code: string }>;
  isLoadingClients?: boolean;
  availableUsers?: Array<{ id: number; name: string }>;
}

export function TaskFilters({
  filters,
  onFiltersChange,
  accessibleClients,
  isLoadingClients = false,
  availableUsers = [],
}: TaskFiltersProps) {
  const updateFilter = <K extends keyof TaskFiltersType>(
    key: K,
    value: TaskFiltersType[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      clientIds: filters.clientIds,
      status: undefined,
      priority: undefined,
      assignedTo: undefined,
      tags: undefined,
      autoCreated: undefined,
    });
  };

  const hasActiveFilters = 
    (filters.status && filters.status.length > 0) ||
    (filters.priority && filters.priority.length > 0) ||
    filters.assignedTo !== undefined ||
    (filters.tags && filters.tags.length > 0) ||
    filters.autoCreated !== undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Client Filter */}
        <div>
          <Label className="mb-2 block">Clients</Label>
          <ClientFilter
            selectedIds={filters.clientIds || []}
            onSelectionChange={(ids) => updateFilter("clientIds", ids)}
            clients={accessibleClients}
            isLoading={isLoadingClients}
          />
        </div>

        {/* Status Filter */}
        <div>
          <Label className="mb-2 block">Status</Label>
          <Select
            value={filters.status?.join(",") || "all"}
            onValueChange={(value) =>
              updateFilter("status", value === "all" ? undefined : value.split(","))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="review">Review</SelectItem>
              <SelectItem value="done">Done</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Priority Filter */}
        <div>
          <Label className="mb-2 block">Priority</Label>
          <Select
            value={filters.priority?.join(",") || "all"}
            onValueChange={(value) =>
              updateFilter("priority", value === "all" ? undefined : value.split(","))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Assignee Filter */}
        {availableUsers.length > 0 && (
          <div>
            <Label className="mb-2 block">Assigned To</Label>
            <Select
              value={filters.assignedTo?.toString() || "all"}
              onValueChange={(value) =>
                updateFilter("assignedTo", value === "all" ? undefined : parseInt(value))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {availableUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Tags Filter */}
        <div>
          <Label className="mb-2 block">Tags (comma-separated)</Label>
          <Input
            placeholder="e.g., urgent, billing, review"
            value={filters.tags?.join(", ") || ""}
            onChange={(e) => {
              const tags = e.target.value
                .split(",")
                .map((t) => t.trim())
                .filter((t) => t.length > 0);
              updateFilter("tags", tags.length > 0 ? tags : undefined);
            }}
          />
        </div>

        {/* Auto-Created Filter */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="autoCreated"
            checked={filters.autoCreated === true}
            onCheckedChange={(checked) =>
              updateFilter("autoCreated", checked ? true : undefined)
            }
          />
          <Label htmlFor="autoCreated" className="flex items-center gap-2 cursor-pointer">
            <Clock className="h-4 w-4" />
            Auto-created tasks only
          </Label>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="w-full"
          >
            <X className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

