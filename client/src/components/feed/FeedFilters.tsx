import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface FeedFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export const FeedFilters = ({
  searchQuery,
  onSearchChange,
}: FeedFiltersProps) => {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search posts..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="pl-9"
      />
    </div>
  );
};


