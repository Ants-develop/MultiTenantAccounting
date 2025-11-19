import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkflowStage } from "@/types/workflow";
import { useWorkflows } from "@/hooks/useWorkflows";
import { useWorkflowMutations } from "@/hooks/useWorkflowMutations";
import { JobCard } from "./JobCard";
import { WorkflowFilters } from "@/types/workflow";
import { SortableJobCard } from "./SortableJobCard";

interface JobsKanbanProps {
  stages: WorkflowStage[];
  filters?: WorkflowFilters;
  onJobClick?: (jobId: string) => void;
}

export const JobsKanban = ({ stages, filters, onJobClick }: JobsKanbanProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const { data: jobs, isLoading } = useWorkflows(filters);
  const { transitionWorkflowStage } = useWorkflowMutations();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      return;
    }

    const jobId = active.id as string;
    const newStageId = over.id as string;

    const job = jobs?.find((j) => j.id === jobId);
    if (!job || job.current_stage_id === newStageId) {
      setActiveId(null);
      return;
    }

    transitionWorkflowStage.mutate({
      workflow_id: jobId,
      new_stage_id: newStageId,
    });

    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const getJobsByStage = (stageId: string) => {
    return jobs?.filter((job) => job.current_stage_id === stageId) || [];
  };

  const activeJob = jobs?.find((job) => job.id === activeId);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...Array(3)].map((_, j) => (
                  <Skeleton key={j} className="h-32 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stages.map((stage) => {
          const stageJobs = getJobsByStage(stage.id);
          return (
            <SortableContext
              key={stage.id}
              id={stage.id}
              items={stageJobs.map((job) => job.id)}
              strategy={verticalListSortingStrategy}
            >
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: stage.color || "#6366f1" }}
                      />
                      <span>{stage.name}</span>
                    </div>
                    <span className="text-xs font-normal text-muted-foreground">
                      {stageJobs.length}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[calc(100vh-16rem)]">
                    <div className="space-y-3 pr-4">
                      {stageJobs.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          No jobs in this stage
                        </p>
                      ) : (
                        stageJobs.map((job) => (
                          <SortableJobCard
                            key={job.id}
                            job={job}
                            onClick={() => onJobClick?.(job.id)}
                          />
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </SortableContext>
          );
        })}
      </div>

      <DragOverlay>
        {activeId && activeJob ? (
          <JobCard job={activeJob} isDragging />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
