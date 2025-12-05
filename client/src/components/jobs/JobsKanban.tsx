import { useState } from "react";
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
    useDroppable,
} from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { jobsApi, Job } from "@/api/jobs";
import { pipelinesApi, Pipeline, PipelineStage } from "@/api/pipelines";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, GripVertical, Calendar, User } from "lucide-react";
import dayjs from "dayjs";

interface JobCardProps {
    job: Job;
    onClick: () => void;
}

const JobCard = ({ job, onClick }: JobCardProps) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: job.id.toString() });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "completed":
                return "bg-green-500/10 text-green-700 dark:text-green-400";
            case "cancelled":
                return "bg-red-500/10 text-red-700 dark:text-red-400";
            case "on_hold":
                return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
            default:
                return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
        }
    };

    return (
        <div ref={setNodeRef} style={style}>
            <Card
                className="p-4 cursor-pointer hover:shadow-md transition-shadow bg-background"
                onClick={onClick}
            >
                <div className="flex items-start gap-2">
                    <button
                        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground mt-1"
                        {...attributes}
                        {...listeners}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <GripVertical className="h-4 w-4" />
                    </button>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-semibold text-sm truncate">{job.title}</h3>
                            <Badge variant="secondary" className={getStatusColor(job.status)}>
                                {job.status}
                            </Badge>
                        </div>

                        {job.description && (
                            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                                {job.description}
                            </p>
                        )}

                        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                            {job.dueDate && (
                                <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>{dayjs(job.dueDate).format("MMM D")}</span>
                                </div>
                            )}
                            {job.assignedTo && (
                                <div className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    <span>Assigned</span>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between">
                            {job.clientId && (
                                <Avatar className="h-6 w-6">
                                    <AvatarFallback className="text-xs">C</AvatarFallback>
                                </Avatar>
                            )}
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
};

interface StageColumnProps {
    stage: PipelineStage;
    jobs: Job[];
    onJobClick: (job: Job) => void;
    color?: string;
}

const StageColumn = ({ stage, jobs, onJobClick, color }: StageColumnProps) => {
    const { setNodeRef, isOver } = useDroppable({
        id: stage.id,
    });

    return (
        <Card
            ref={setNodeRef}
            className={`flex-shrink-0 w-80 flex flex-col ${isOver ? "ring-2 ring-primary" : ""}`}
        >
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                        <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: color || "#3b82f6" }}
                        />
                        {stage.name}
                    </CardTitle>
                    <Badge variant="secondary">{jobs.length}</Badge>
                </div>
            </CardHeader>
            <CardContent className="flex-1 pt-0">
                <ScrollArea className="h-full pr-4">
                    <div className="space-y-3">
                        {jobs.map((job) => (
                            <JobCard
                                key={job.id}
                                job={job}
                                onClick={() => onJobClick(job)}
                            />
                        ))}
                        {jobs.length === 0 && (
                            <p className="text-center text-muted-foreground text-sm py-4">
                                No jobs in this stage
                            </p>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};

interface JobsKanbanProps {
    pipelineId?: number;
    onJobClick: (job: Job) => void;
}

// Stage colors for visual differentiation
const STAGE_COLORS = [
    "#94a3b8", // slate
    "#60a5fa", // blue
    "#a78bfa", // violet
    "#fb923c", // orange
    "#34d399", // green
    "#f472b6", // pink
    "#fbbf24", // amber
];

export const JobsKanban = ({ pipelineId, onJobClick }: JobsKanbanProps) => {
    const queryClient = useQueryClient();
    const workspaceId = 1;
    const [activeJob, setActiveJob] = useState<Job | null>(null);

    const { data: jobs = [], isLoading: jobsLoading } = useQuery({
        queryKey: ["/api/jobs", { workspaceId, pipelineId }],
        queryFn: () => jobsApi.fetchJobs({ workspaceId }),
    });

    const { data: pipelines = [], isLoading: pipelinesLoading } = useQuery({
        queryKey: ["/api/pipelines", workspaceId],
        queryFn: () => pipelinesApi.fetchPipelines(workspaceId),
    });

    const updateJobMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<Job> }) =>
            jobsApi.updateJob(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
        },
    });

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        const job = jobs.find((j) => j.id.toString() === event.active.id);
        if (job) {
            setActiveJob(job);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveJob(null);

        if (!over) return;

        const jobId = parseInt(active.id as string);
        const newStageId = over.id as string;

        // Find the job
        const job = jobs.find((j) => j.id === jobId);
        if (!job || job.currentStage === newStageId) return;

        // Update the job's stage
        updateJobMutation.mutate({
            id: jobId,
            data: { currentStage: newStageId },
        });
    };

    if (jobsLoading || pipelinesLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    // If a specific pipeline is selected, use its stages
    // Otherwise, show a generic kanban with status-based columns
    const selectedPipeline = pipelineId
        ? pipelines.find((p) => p.id === pipelineId)
        : pipelines[0];

    // If no pipeline, show status-based kanban
    if (!selectedPipeline || !selectedPipeline.stages?.length) {
        const statusStages: PipelineStage[] = [
            { id: "active", name: "Active", order: 1 },
            { id: "on_hold", name: "On Hold", order: 2 },
            { id: "completed", name: "Completed", order: 3 },
            { id: "cancelled", name: "Cancelled", order: 4 },
        ];

        const getJobsByStatus = (status: string) => {
            return jobs.filter((job) => job.status === status);
        };

        return (
            <DndContext
                sensors={sensors}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="flex gap-4 h-[calc(100vh-12rem)] overflow-x-auto pb-4">
                    {statusStages.map((stage, index) => (
                        <StageColumn
                            key={stage.id}
                            stage={stage}
                            jobs={getJobsByStatus(stage.id)}
                            onJobClick={onJobClick}
                            color={STAGE_COLORS[index % STAGE_COLORS.length]}
                        />
                    ))}
                </div>

                <DragOverlay>
                    {activeJob ? (
                        <div className="w-80">
                            <JobCard job={activeJob} onClick={() => { }} />
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
        );
    }

    // Use pipeline stages
    const stages = selectedPipeline.stages.sort((a, b) => a.order - b.order);

    const getJobsByStage = (stageId: string) => {
        return jobs.filter(
            (job) =>
                job.currentStage === stageId &&
                (!pipelineId || job.pipelineId === pipelineId)
        );
    };

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex gap-4 h-[calc(100vh-12rem)] overflow-x-auto pb-4">
                {stages.map((stage, index) => (
                    <StageColumn
                        key={stage.id}
                        stage={stage}
                        jobs={getJobsByStage(stage.id)}
                        onJobClick={onJobClick}
                        color={STAGE_COLORS[index % STAGE_COLORS.length]}
                    />
                ))}
            </div>

            <DragOverlay>
                {activeJob ? (
                    <div className="w-80">
                        <JobCard job={activeJob} onClick={() => { }} />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
};
