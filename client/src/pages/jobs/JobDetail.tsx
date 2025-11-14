import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { jobsApi, Job } from "@/api/jobs";
import { tasksApi, Task } from "@/api/tasks";
import { pipelinesApi } from "@/api/pipelines";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus, CheckCircle2, Edit } from "lucide-react";
import { JobForm } from "./JobForm";
import dayjs from "dayjs";
import { useRouteParams } from "@/contexts/RouteParamsContext";
import { useGoldenLayout } from "@/hooks/useGoldenLayout";

interface JobDetailProps {
  jobId?: number;
}

export default function JobDetail({ jobId: propJobId }: JobDetailProps = {}) {
  const queryClient = useQueryClient();
  const routeParams = useRouteParams();
  const goldenLayout = useGoldenLayout();
  
  // Get jobId from props, route params, or URL (fallback)
  const jobId = propJobId || 
    (routeParams.params.id ? parseInt(routeParams.params.id) : 0) ||
    parseInt(window.location.pathname.split("/").pop() || "0");

  const { data: job, isLoading: jobLoading } = useQuery({
    queryKey: ["/api/jobs", jobId],
    queryFn: () => jobsApi.fetchJob(jobId),
    enabled: jobId > 0,
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["/api/tasks", { jobId }],
    queryFn: () => tasksApi.fetchTasks({ jobId }),
    enabled: jobId > 0,
  });

  const { data: pipeline } = useQuery({
    queryKey: ["/api/pipelines", job?.pipelineId],
    queryFn: () => pipelinesApi.fetchPipeline(job!.pipelineId!),
    enabled: !!job?.pipelineId,
  });

  const updateJobMutation = useMutation({
    mutationFn: (updates: Partial<Job>) => jobsApi.updateJob(jobId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", jobId] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
    },
  });

  const [isJobFormOpen, setIsJobFormOpen] = useState(false);

  const handleUpdateJob = async (data: any) => {
    await updateJobMutation.mutateAsync(data);
    setIsJobFormOpen(false);
  };

  const moveToNextStage = async () => {
    if (!job || !pipeline) return;

    const stages = (pipeline.stages as any[]) || [];
    const currentStageIndex = stages.findIndex(s => s.id === job.currentStage);
    const nextStage = stages[currentStageIndex + 1];

    if (nextStage) {
      await updateJobMutation.mutateAsync({ currentStage: nextStage.id });
    }
  };

  if (jobLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading job...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-6">
        <TaxDomeCard>
          <div className="text-center py-8">
            <p className="text-gray-500">Job not found</p>
            <TaxDomeButton variant="secondary" onClick={() => goldenLayout?.openTab("/jobs")} className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Jobs
            </TaxDomeButton>
          </div>
        </TaxDomeCard>
      </div>
    );
  }

  const stages = (pipeline?.stages as any[]) || [];
  const currentStageIndex = stages.findIndex(s => s.id === job.currentStage);
  const currentStage = stages[currentStageIndex];
  const nextStage = stages[currentStageIndex + 1];

  const completedTasks = tasks.filter(t => t.status === "done").length;
  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <TaxDomeButton variant="ghost" onClick={() => goldenLayout?.openTab("/jobs")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </TaxDomeButton>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
            {pipeline && (
              <p className="text-sm text-gray-500 mt-1">Pipeline: {pipeline.name}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {nextStage && (
            <TaxDomeButton variant="primary" onClick={moveToNextStage}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Move to {nextStage.name}
            </TaxDomeButton>
          )}
          <TaxDomeButton variant="secondary" onClick={() => setIsJobFormOpen(true)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit Job
          </TaxDomeButton>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <TaxDomeCard>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Description</h2>
            <p className="text-gray-700 whitespace-pre-wrap">
              {job.description || "No description provided."}
            </p>
          </TaxDomeCard>

          {/* Pipeline Progress */}
          {pipeline && stages.length > 0 && (
            <TaxDomeCard>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Pipeline Progress</h2>
              <div className="space-y-2">
                {stages.map((stage, idx) => {
                  const isActive = stage.id === job.currentStage;
                  const isCompleted = idx < currentStageIndex;
                  return (
                    <div
                      key={stage.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        isActive
                          ? "border-blue-500 bg-blue-50"
                          : isCompleted
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                          isActive
                            ? "bg-blue-500 text-white"
                            : isCompleted
                            ? "bg-green-500 text-white"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{stage.name}</div>
                        {isActive && <div className="text-xs text-blue-600">Current Stage</div>}
                      </div>
                      {isCompleted && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                    </div>
                  );
                })}
              </div>
            </TaxDomeCard>
          )}

          {/* Tasks */}
          <TaxDomeCard>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Tasks</h2>
              <TaxDomeButton
                variant="secondary"
                size="sm"
                onClick={() => goldenLayout?.openTab("/tasks/new", { jobId: job.id.toString() })}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Task
              </TaxDomeButton>
            </div>

            {tasksLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No tasks yet</p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{completedTasks} / {totalTasks} completed</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <TaxDomeTable>
                  <TaxDomeTableHeader>
                    <TaxDomeTableRow>
                      <TaxDomeTableHeaderCell>Title</TaxDomeTableHeaderCell>
                      <TaxDomeTableHeaderCell>Status</TaxDomeTableHeaderCell>
                      <TaxDomeTableHeaderCell>Priority</TaxDomeTableHeaderCell>
                      <TaxDomeTableHeaderCell>Due Date</TaxDomeTableHeaderCell>
                    </TaxDomeTableRow>
                  </TaxDomeTableHeader>
                  <tbody>
                    {tasks.map((task) => (
                      <TaxDomeTableRow
                        key={task.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => goldenLayout?.openTab(`/tasks/${task.id}`, { id: task.id.toString() })}
                      >
                        <TaxDomeTableCell className="font-medium">{task.title}</TaxDomeTableCell>
                        <TaxDomeTableCell>
                          <TaxDomeBadge
                            variant={
                              task.status === "done" ? "success" :
                              task.status === "blocked" ? "error" :
                              task.status === "in_progress" ? "info" : "gray"
                            }
                          >
                            {task.status.replace("_", " ")}
                          </TaxDomeBadge>
                        </TaxDomeTableCell>
                        <TaxDomeTableCell>
                          <TaxDomeBadge
                            variant={
                              task.priority === "urgent" ? "error" :
                              task.priority === "high" ? "warning" :
                              task.priority === "medium" ? "info" : "gray"
                            }
                            size="sm"
                          >
                            {task.priority}
                          </TaxDomeBadge>
                        </TaxDomeTableCell>
                        <TaxDomeTableCell>
                          {task.dueDate ? dayjs(task.dueDate).format("MMM D, YYYY") : "—"}
                        </TaxDomeTableCell>
                      </TaxDomeTableRow>
                    ))}
                  </tbody>
                </TaxDomeTable>
              </>
            )}
          </TaxDomeCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <TaxDomeCard>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Details</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Status</label>
                <div className="mt-1">
                  <TaxDomeBadge
                    variant={
                      job.status === "completed" ? "success" :
                      job.status === "cancelled" ? "error" :
                      job.status === "on_hold" ? "warning" : "info"
                    }
                  >
                    {job.status}
                  </TaxDomeBadge>
                </div>
              </div>

              {job.dueDate && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Due Date</label>
                  <div className="mt-1 text-sm text-gray-900">
                    {dayjs(job.dueDate).format("MMMM D, YYYY")}
                  </div>
                </div>
              )}

              {job.createdAt && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Created</label>
                  <div className="mt-1 text-sm text-gray-900">
                    {dayjs(job.createdAt).format("MMMM D, YYYY [at] h:mm A")}
                  </div>
                </div>
              )}
            </div>
          </TaxDomeCard>

          {/* Matrix Chat - Placeholder */}
          {job.matrixRoomId && (
            <TaxDomeCard>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Chat</h2>
              <div className="text-sm text-gray-500">
                Matrix chat integration will be implemented in Phase 7
              </div>
            </TaxDomeCard>
          )}
        </div>
      </div>

      {isJobFormOpen && (
        <JobForm
          isOpen={isJobFormOpen}
          onClose={() => setIsJobFormOpen(false)}
          onSubmit={handleUpdateJob}
          initialData={job}
          workspaceId={job.workspaceId}
        />
      )}
    </div>
  );
}

