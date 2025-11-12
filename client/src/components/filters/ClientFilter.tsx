import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

interface ClientFilterProps {
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
  clients: Array<{ id: number; name: string; code: string }>;
  isLoading?: boolean;
}

export function ClientFilter({
  selectedIds,
  onSelectionChange,
  clients,
  isLoading = false,
}: ClientFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedClientsText = selectedIds.length === 0
    ? 'Select clients...'
    : selectedIds.length === 1
    ? clients.find(c => c.id === selectedIds[0])?.name || 'Client'
    : `${selectedIds.length} clients selected`;

  const handleSelectAll = () => {
    if (selectedIds.length === clients.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(clients.map(c => c.id));
    }
  };

  const handleToggleClient = (clientId: number) => {
    if (selectedIds.includes(clientId)) {
      onSelectionChange(selectedIds.filter(id => id !== clientId));
    } else {
      onSelectionChange([...selectedIds, clientId]);
    }
  };

  if (isLoading) {
    return <div className="text-sm text-gray-500">Loading clients...</div>;
  }

  if (clients.length === 0) {
    return <div className="text-sm text-gray-500">No clients available</div>;
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-between"
          disabled={clients.length === 0}
        >
          <span className="truncate text-sm">{selectedClientsText}</span>
          <ChevronDown className="h-4 w-4 ml-2 flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Select Clients</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Select All / Clear All */}
        <DropdownMenuCheckboxItem
          checked={selectedIds.length === clients.length && clients.length > 0}
          onCheckedChange={handleSelectAll}
          className="font-semibold"
        >
          {selectedIds.length === clients.length ? 'Clear All' : 'Select All'}
        </DropdownMenuCheckboxItem>

        <DropdownMenuSeparator />

        {/* Client List */}
        {clients.map(client => (
          <DropdownMenuCheckboxItem
            key={client.id}
            checked={selectedIds.includes(client.id)}
            onCheckedChange={() => handleToggleClient(client.id)}
          >
            <div className="flex flex-col">
              <span className="text-sm">{client.name}</span>
              <span className="text-xs text-gray-500">{client.code}</span>
            </div>
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

