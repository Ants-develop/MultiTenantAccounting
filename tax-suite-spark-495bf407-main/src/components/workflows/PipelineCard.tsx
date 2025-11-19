import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Layers, Clock, Briefcase } from "lucide-react";
import { WorkflowTemplateWithStages } from "@/types/workflow";
import { useWorkflowTemplateMutations } from "@/hooks/useWorkflowTemplateMutations";
import { useToast } from "@/hooks/use-toast";

interface PipelineCardProps {
  template: WorkflowTemplateWithStages;
  activeJobsCount?: number;
  onEdit: (templateId: string) => void;
}

const serviceTypeColors: Record<string, string> = {
  monthly_bookkeeping: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  vat_return: "bg-green-500/10 text-green-700 dark:text-green-300",
  payroll: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  annual_financials: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  custom: "bg-gray-500/10 text-gray-700 dark:text-gray-300",
};

export const PipelineCard = ({ template, activeJobsCount = 0, onEdit }: PipelineCardProps) => {
  const { toast } = useToast();
  const { duplicateTemplate, deleteTemplate } = useWorkflowTemplateMutations();

  const handleDuplicate = () => {
    duplicateTemplate.mutate(template.id, {
      onSuccess: () => {
        toast({
          title: "Pipeline duplicated",
          description: "A copy of the pipeline has been created.",
        });
      },
    });
  };

  const handleDeactivate = () => {
    deleteTemplate.mutate(template.id, {
      onSuccess: () => {
        toast({
          title: "Pipeline deactivated",
          description: "The pipeline has been deactivated.",
        });
      },
    });
  };

  const stagesCount = template.workflow_stages?.length || 0;

  return (
    <Card 
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => onEdit(template.id)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{template.name}</CardTitle>
            <CardDescription className="line-clamp-2 mt-1">
              {template.description || "No description"}
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(template.id); }}>
                Edit Stages
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicate(); }}>
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); handleDeactivate(); }}
                className="text-destructive"
              >
                Deactivate
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Badge className={serviceTypeColors[template.type] || serviceTypeColors.custom}>
          {template.type.replace(/_/g, " ")}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Layers className="h-4 w-4" />
            <span>{stagesCount} stages</span>
          </div>
          {template.estimated_duration_days && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{template.estimated_duration_days} days</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Briefcase className="h-4 w-4" />
            <span>{activeJobsCount} active jobs</span>
          </div>
        </div>
        {template.workflow_template_clients && template.workflow_template_clients.length > 0 && (
          <Badge variant="outline" className="w-fit">
            {template.workflow_template_clients.length} client{template.workflow_template_clients.length !== 1 ? 's' : ''} assigned
          </Badge>
        )}
        {template.workflow_stages && template.workflow_stages.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {template.workflow_stages.slice(0, 4).map((stage) => (
              <Badge key={stage.id} variant="secondary" className="text-xs">
                {stage.name}
              </Badge>
            ))}
            {template.workflow_stages.length > 4 && (
              <Badge variant="secondary" className="text-xs">
                +{template.workflow_stages.length - 4} more
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
