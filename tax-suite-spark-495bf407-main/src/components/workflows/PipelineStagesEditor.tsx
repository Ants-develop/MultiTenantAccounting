import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, Plus, GripVertical, Edit2, Trash2 } from "lucide-react";
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useWorkflowTemplate } from "@/hooks/useWorkflowTemplates";
import { useWorkflowStages, useWorkflowStageMutations } from "@/hooks/useWorkflowStages";
import { WorkflowStage } from "@/types/workflow";
import { useToast } from "@/hooks/use-toast";
import { useTemplateClients, useTemplateClientMutations } from "@/hooks/useWorkflowTemplateClients";
import { AssignClientsToTemplate } from "./AssignClientsToTemplate";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const colorPresets = [
  { value: "#3b82f6", label: "Blue" },
  { value: "#10b981", label: "Green" },
  { value: "#8b5cf6", label: "Purple" },
  { value: "#f59e0b", label: "Orange" },
  { value: "#ef4444", label: "Red" },
  { value: "#6366f1", label: "Indigo" },
  { value: "#ec4899", label: "Pink" },
  { value: "#64748b", label: "Slate" },
];

interface SortableStageCardProps {
  stage: WorkflowStage;
  onEdit: (stage: WorkflowStage) => void;
  onDelete: (stage: WorkflowStage) => void;
}

const SortableStageCard = ({ stage, onEdit, onDelete }: SortableStageCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card ref={setNodeRef} style={style} className="mb-3">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div {...attributes} {...listeners} className="cursor-grab mt-1">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: stage.color || "#64748b" }}
              />
              {stage.name}
            </CardTitle>
            <CardDescription className="text-sm mt-1">
              {stage.description || "No description"}
            </CardDescription>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(stage)}>
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(stage)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
};

interface PipelineStagesEditorProps {
  templateId: string;
  onBack: () => void;
}

export const PipelineStagesEditor = ({ templateId, onBack }: PipelineStagesEditorProps) => {
  const { toast } = useToast();
  const { data: template } = useWorkflowTemplate(templateId);
  const { data: stages = [], isLoading } = useWorkflowStages(templateId);
  const { createStage, updateStage, deleteStage, reorderStages } = useWorkflowStageMutations();
  const { data: assignedClients = [] } = useTemplateClients(templateId);
  const { assignClients, unassignClient } = useTemplateClientMutations();

  // Fetch all clients for assignment
  const { data: allClients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, status")
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<WorkflowStage | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "", color: "#3b82f6" });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = stages.findIndex((s) => s.id === active.id);
    const newIndex = stages.findIndex((s) => s.id === over.id);

    const reorderedStages = [...stages];
    const [movedStage] = reorderedStages.splice(oldIndex, 1);
    reorderedStages.splice(newIndex, 0, movedStage);

    const stageIds = reorderedStages.map((s) => s.id);
    reorderStages.mutate({ templateId, stageIds });
  };

  const handleAddStage = () => {
    setSelectedStage(null);
    setFormData({ name: "", description: "", color: "#3b82f6" });
    setEditDialogOpen(true);
  };

  const handleEditStage = (stage: WorkflowStage) => {
    setSelectedStage(stage);
    setFormData({
      name: stage.name,
      description: stage.description || "",
      color: stage.color || "#3b82f6",
    });
    setEditDialogOpen(true);
  };

  const handleSaveStage = () => {
    if (!formData.name.trim()) {
      toast({ title: "Error", description: "Stage name is required", variant: "destructive" });
      return;
    }

    if (selectedStage) {
      updateStage.mutate(
        { id: selectedStage.id, updates: formData },
        {
          onSuccess: () => {
            toast({ title: "Success", description: "Stage updated successfully" });
            setEditDialogOpen(false);
          },
        }
      );
    } else {
      createStage.mutate(
        {
          template_id: templateId,
          name: formData.name,
          description: formData.description,
          color: formData.color,
          order_position: stages.length,
        },
        {
          onSuccess: () => {
            toast({ title: "Success", description: "Stage created successfully" });
            setEditDialogOpen(false);
          },
        }
      );
    }
  };

  const handleDeleteStage = (stage: WorkflowStage) => {
    setSelectedStage(stage);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!selectedStage) return;
    deleteStage.mutate(selectedStage.id, {
      onSuccess: () => {
        toast({ title: "Success", description: "Stage deleted successfully" });
        setDeleteDialogOpen(false);
      },
    });
  };

  const handleAssignClients = (clientIds: string[]) => {
    assignClients.mutate({ templateId, clientIds });
  };

  const handleUnassignClient = (clientId: string) => {
    unassignClient.mutate({ templateId, clientId });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading stages...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{template?.name || "Pipeline"}</h2>
            <p className="text-sm text-muted-foreground">
              {template?.description || "Manage stages for this pipeline"}
            </p>
          </div>
        </div>
      </div>

      {/* Client Assignment Section */}
      <Card>
        <CardHeader>
          <CardTitle>Assigned Clients</CardTitle>
          <CardDescription>
            Select which clients can use this pipeline template. Leave empty to make it available to all clients.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AssignClientsToTemplate
            templateId={templateId}
            assignedClients={assignedClients}
            availableClients={allClients}
            onAssign={handleAssignClients}
            onUnassign={handleUnassignClient}
          />
        </CardContent>
      </Card>

      {/* Stages Section */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Workflow Stages</h2>
        <Button onClick={handleAddStage}>
          <Plus className="h-4 w-4 mr-2" />
          Add Stage
        </Button>
      </div>

      {stages.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No stages yet. Add your first stage to get started.</p>
            <Button onClick={handleAddStage}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Stage
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={stages.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            {stages.map((stage) => (
              <SortableStageCard
                key={stage.id}
                stage={stage}
                onEdit={handleEditStage}
                onDelete={handleDeleteStage}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedStage ? "Edit Stage" : "Add New Stage"}</DialogTitle>
            <DialogDescription>
              Configure the stage details for this pipeline.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Stage Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Preparation"
              />
            </div>
            <div>
              <Label>Description (Optional)</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what happens in this stage..."
                className="resize-none"
              />
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-2">
                {colorPresets.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      formData.color === preset.value ? "border-primary scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: preset.value }}
                    onClick={() => setFormData({ ...formData, color: preset.value })}
                    title={preset.label}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveStage} disabled={createStage.isPending || updateStage.isPending}>
              {selectedStage ? "Update" : "Create"} Stage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Stage</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedStage?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
