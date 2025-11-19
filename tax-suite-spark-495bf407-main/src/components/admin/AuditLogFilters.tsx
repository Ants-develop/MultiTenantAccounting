import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AuditLogFilters } from "@/types/auditLog";
import { Search } from "lucide-react";

interface AuditLogFiltersProps {
  filters: AuditLogFilters;
  onFiltersChange: (filters: AuditLogFilters) => void;
}

const actionTypes = ["CREATE", "UPDATE", "DELETE", "VIEW", "DOWNLOAD", "SHARE", "INVITE"];
const entityTypes = ["clients", "tasks", "documents", "workflows", "messages"];

export const AuditLogFiltersComponent = ({
  filters,
  onFiltersChange,
}: AuditLogFiltersProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="space-y-2">
        <Label htmlFor="search">Search</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="search"
            placeholder="Search entity name..."
            value={filters.search || ""}
            onChange={(e) =>
              onFiltersChange({ ...filters, search: e.target.value })
            }
            className="pl-9"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="action">Action</Label>
        <Select
          value={filters.action || "all"}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              action: value === "all" ? undefined : value,
            })
          }
        >
          <SelectTrigger id="action">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {actionTypes.map((action) => (
              <SelectItem key={action} value={action}>
                {action}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="entity">Entity Type</Label>
        <Select
          value={filters.entity_type || "all"}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              entity_type: value === "all" ? undefined : value,
            })
          }
        >
          <SelectTrigger id="entity">
            <SelectValue placeholder="All entities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All entities</SelectItem>
            {entityTypes.map((entity) => (
              <SelectItem key={entity} value={entity}>
                {entity}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="from-date">From Date</Label>
        <Input
          id="from-date"
          type="date"
          value={filters.from_date || ""}
          onChange={(e) =>
            onFiltersChange({ ...filters, from_date: e.target.value })
          }
        />
      </div>
    </div>
  );
};
