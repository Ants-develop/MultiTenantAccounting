import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Filter } from "lucide-react";
import { PipelineCard } from "./PipelineCard";
import { CreatePipelineDialog } from "./CreatePipelineDialog";
import { useWorkflowTemplates } from "@/hooks/useWorkflowTemplates";
import { useWorkflows } from "@/hooks/useWorkflows";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PipelineListProps {
  onEditPipeline: (templateId: string) => void;
}

export const PipelineList = ({ onEditPipeline }: PipelineListProps) => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [clientFilter, setClientFilter] = useState<string>("all");

  const { data: allTemplates, isLoading } = useWorkflowTemplates({
    type: typeFilter === "all" ? undefined : typeFilter,
    is_active: statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined,
  });

  const { data: allWorkflows } = useWorkflows({});

  // Fetch clients for filter
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Filter templates by client assignment
  const templates = allTemplates?.filter(template => {
    if (clientFilter === "all") return true;
    if (clientFilter === "unassigned") {
      return !template.workflow_template_clients || template.workflow_template_clients.length === 0;
    }
    
    // Check if template is assigned to selected client or has no assignments (available to all)
    if (!template.workflow_template_clients || template.workflow_template_clients.length === 0) {
      return true; // Unassigned templates are available to all
    }
    
    return template.workflow_template_clients.some(tc => tc.client_id === clientFilter);
  });

  // Count active jobs per template
  const getActiveJobsCount = (templateId: string) => {
    return allWorkflows?.filter(
      (w) => w.template_id === templateId && w.status === "active"
    ).length || 0;
  };

  const handleCreateSuccess = (templateId: string) => {
    onEditPipeline(templateId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading pipelines...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="monthly_bookkeeping">Monthly Bookkeeping</SelectItem>
              <SelectItem value="vat_return">VAT Return</SelectItem>
              <SelectItem value="payroll">Payroll</SelectItem>
              <SelectItem value="annual_financials">Annual Financials</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              <SelectItem value="unassigned">Unassigned (Available to All)</SelectItem>
              {clients.map(client => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Pipeline
        </Button>
      </div>

      {templates && templates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <PipelineCard
              key={template.id}
              template={template}
              activeJobsCount={getActiveJobsCount(template.id)}
              onEdit={onEditPipeline}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">No pipeline templates found</p>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Pipeline
          </Button>
        </div>
      )}

      <CreatePipelineDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
};
