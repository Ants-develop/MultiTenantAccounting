import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { jobsApi, Job, CreateJobPayload } from "@/api/jobs";
import { pipelinesApi } from "@/api/pipelines";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Eye, Trash2, Edit } from "lucide-react";
import { JobForm } from "./JobForm";
import dayjs from "dayjs";

export default function JobsDashboard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const workspaceId = 1; // Default workspace

  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [isJobFormOpen, setIsJobFormOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | undefined>();

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["/api/jobs", { workspaceId, status: statusFilter }],
    queryFn: () => jobsApi.fetchJobs({ workspaceId, status: statusFilter }),
  });

  const { data: pipelines = [] } = useQuery({
    queryKey: ["/api/pipelines", workspaceId],
    queryFn: () => pipelinesApi.fetchPipelines(workspaceId),
  });

  const deleteJobMutation = useMutation({
    mutationFn: (id: number) => jobsApi.deleteJob(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
    },
  });

  const createJobMutation = useMutation({
    mutationFn: (data: CreateJobPayload) => jobsApi.createJob(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      setIsJobFormOpen(false);
      setEditingJob(undefined);
    },
  });

  const updateJobMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateJobPayload> }) =>
      jobsApi.updateJob(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      setIsJobFormOpen(false);
      setEditingJob(undefined);
    },
  });

  const handleCreateJob = async (data: CreateJobPayload) => {
    if (editingJob) {
      await updateJobMutation.mutateAsync({ id: editingJob.id, data });
    } else {
      await createJobMutation.mutateAsync(data);
    }
  };

  const getPipelineName = (pipelineId?: number) => {
    if (!pipelineId) return "—";
    const pipeline = pipelines.find(p => p.id === pipelineId);
    return pipeline?.name || `Pipeline #${pipelineId}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
          <p className="text-sm text-gray-500 mt-1">Manage work items and cases</p>
        </div>
        <Button
          onClick={() => {
            setEditingJob(undefined);
            setIsJobFormOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Job
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Select
          value={statusFilter || "all"}
          onValueChange={(value) => setStatusFilter(value === "all" ? undefined : value)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {jobs.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500 mb-4">No jobs yet</p>
            <Button onClick={() => setLocation("/jobs/new")}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Job
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Pipeline</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">{job.title}</TableCell>
                    <TableCell>{getPipelineName(job.pipelineId)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          job.status === "completed" ? "default" :
                          job.status === "cancelled" ? "destructive" :
                          job.status === "on_hold" ? "secondary" : "default"
                        }
                      >
                        {job.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {job.dueDate ? dayjs(job.dueDate).format("MMM D, YYYY") : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setLocation(`/jobs/${job.id}`)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingJob(job);
                            setIsJobFormOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this job?")) {
                              deleteJobMutation.mutate(job.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

