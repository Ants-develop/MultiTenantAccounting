import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Client {
  id: string;
  name: string;
  status?: string;
}

interface AssignedClient {
  client_id: string;
  clients?: Client;
}

interface AssignClientsToTemplateProps {
  templateId: string;
  assignedClients: AssignedClient[];
  availableClients: Client[];
  onAssign: (clientIds: string[]) => void;
  onUnassign: (clientId: string) => void;
}

export function AssignClientsToTemplate({
  templateId,
  assignedClients,
  availableClients,
  onAssign,
  onUnassign,
}: AssignClientsToTemplateProps) {
  const [open, setOpen] = useState(false);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);

  const assignedClientIds = assignedClients.map((ac) => ac.client_id);
  const unassignedClients = availableClients.filter(
    (client) => !assignedClientIds.includes(client.id)
  );

  const handleAssign = () => {
    if (selectedClientIds.length > 0) {
      onAssign(selectedClientIds);
      setSelectedClientIds([]);
      setOpen(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {assignedClients.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No clients assigned. This template is available to all clients.
          </p>
        ) : (
          assignedClients.map((ac) => (
            <Badge key={ac.client_id} variant="secondary" className="gap-1">
              {ac.clients?.name || "Unknown Client"}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 ml-1 hover:bg-transparent"
                onClick={() => onUnassign(ac.client_id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))
        )}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" disabled={unassignedClients.length === 0}>
            <Plus className="h-4 w-4 mr-2" />
            Assign Clients
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search clients..." />
            <CommandEmpty>No clients found.</CommandEmpty>
            <CommandGroup className="max-h-[200px] overflow-auto">
              {unassignedClients.map((client) => (
                <CommandItem
                  key={client.id}
                  onSelect={() => {
                    setSelectedClientIds((prev) =>
                      prev.includes(client.id)
                        ? prev.filter((id) => id !== client.id)
                        : [...prev, client.id]
                    );
                  }}
                >
                  <div
                    className={cn(
                      "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                      selectedClientIds.includes(client.id)
                        ? "bg-primary text-primary-foreground"
                        : "opacity-50 [&_svg]:invisible"
                    )}
                  >
                    <Check className="h-4 w-4" />
                  </div>
                  <span>{client.name}</span>
                  {client.status && (
                    <Badge variant="outline" className="ml-auto text-xs">
                      {client.status}
                    </Badge>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
          <div className="p-2 border-t">
            <Button
              onClick={handleAssign}
              size="sm"
              className="w-full"
              disabled={selectedClientIds.length === 0}
            >
              Assign {selectedClientIds.length} Client{selectedClientIds.length !== 1 ? "s" : ""}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
