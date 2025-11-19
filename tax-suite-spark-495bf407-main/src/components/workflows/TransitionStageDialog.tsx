import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWorkflowStages } from "@/hooks/useWorkflowStages";
import { useWorkflowMutations } from "@/hooks/useWorkflowMutations";
import { WorkflowWithDetails, WorkflowStage } from "@/types/workflow";
import { Loader2 } from "lucide-react";

interface TransitionStageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflow: WorkflowWithDetails;
}

export const TransitionStageDialog = ({ open, onOpenChange, workflow }: TransitionStageDialogProps) => {
  const [selectedStageId, setSelectedStageId] = useState<string>("");
  const [notes, setNotes] = useState("");
  
  const { data: stages, isLoading: stagesLoading } = useWorkflowStages(workflow.template_id);
  const { transitionWorkflowStage } = useWorkflowMutations();

  const handleTransition = () => {
    if (!selectedStageId) return;

    transitionWorkflowStage.mutate(
      {
        workflow_id: workflow.id,
        new_stage_id: selectedStageId,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setSelectedStageId("");
          setNotes("");
        },
      }
    );
  };

  const selectedStage = stages?.find((s) => s.id === selectedStageId);
  const currentStage = stages?.find((s) => s.id === workflow.current_stage_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Change Workflow Stage</DialogTitle>
          <DialogDescription>
            Move "{workflow.name}" to a different stage. This will update the workflow status and may trigger automated tasks.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Stage */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Current Stage</Label>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: currentStage?.color || "#6366f1" }}
              />
              <span className="font-medium">{currentStage?.name || "Unknown"}</span>
            </div>
          </div>

          {/* New Stage Selector */}
          <div className="space-y-2">
            <Label htmlFor="stage">New Stage *</Label>
            <Select value={selectedStageId} onValueChange={setSelectedStageId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a stage" />
              </SelectTrigger>
              <SelectContent>
                {stagesLoading ? (
                  <div className="p-2 text-sm text-muted-foreground">Loading stages...</div>
                ) : (
                  stages?.map((stage) => (
                    <SelectItem
                      key={stage.id}
                      value={stage.id}
                      disabled={stage.id === workflow.current_stage_id}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: stage.color || "#6366f1" }}
                        />
                        <span>{stage.name}</span>
                        {stage.id === workflow.current_stage_id && (
                          <span className="text-xs text-muted-foreground">(current)</span>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Stage Description */}
          {selectedStage?.description && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">{selectedStage.description}</p>
            </div>
          )}

          {/* Transition Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Transition Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add notes about this stage transition..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleTransition}
            disabled={!selectedStageId || transitionWorkflowStage.isPending}
          >
            {transitionWorkflowStage.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Change Stage
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
