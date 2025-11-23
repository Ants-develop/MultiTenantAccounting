import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface JournalEntryFilters {
    search?: string;
    clientId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
}

interface JournalEntriesFiltersProps {
    filters: JournalEntryFilters;
    onFiltersChange: (filters: JournalEntryFilters) => void;
    clients: { id: number; name: string; code: string }[];
    onRefresh?: () => void;
}

export function JournalEntriesFilters({
    filters,
    onFiltersChange,
    clients,
    onRefresh,
}: JournalEntriesFiltersProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="search"
                        placeholder="Description, Reference..."
                        value={filters.search || ""}
                        onChange={(e) =>
                            onFiltersChange({ ...filters, search: e.target.value })
                        }
                        className="pl-9"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="client">Client</Label>
                <Select
                    value={filters.clientId || "all"}
                    onValueChange={(value) =>
                        onFiltersChange({
                            ...filters,
                            clientId: value === "all" ? undefined : value,
                        })
                    }
                >
                    <SelectTrigger id="client">
                        <SelectValue placeholder="All Clients" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Clients</SelectItem>
                        {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id.toString()}>
                                {client.code} - {client.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                    value={filters.status || "all"}
                    onValueChange={(value) =>
                        onFiltersChange({
                            ...filters,
                            status: value === "all" ? undefined : value,
                        })
                    }
                >
                    <SelectTrigger id="status">
                        <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="posted">Posted</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="dateFrom">From Date</Label>
                <Input
                    id="dateFrom"
                    type="date"
                    value={filters.dateFrom || ""}
                    onChange={(e) =>
                        onFiltersChange({ ...filters, dateFrom: e.target.value })
                    }
                />
            </div>

            <div className="space-y-2 flex items-end">
                <Button
                    variant="outline"
                    className="w-full"
                    onClick={onRefresh}
                >
                    Refresh Data
                </Button>
            </div>
        </div>
    );
}
