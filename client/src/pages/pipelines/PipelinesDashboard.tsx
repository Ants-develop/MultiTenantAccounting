import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pipelinesApi, Pipeline, CreatePipelinePayload } from "@/api/pipelines";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Play } from "lucide-react";
import { useLocation } from "wouter";

export default function PipelinesDashboard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // For now, use a default workspace ID
  const workspaceId = 1;

  const { data: pipelines = [], isLoading } = useQuery({
    queryKey: ["/api/pipelines", workspaceId],
    queryFn: () => pipelinesApi.fetchPipelines(workspaceId),
  });

  const deletePipelineMutation = useMutation({
    mutationFn: (id: number) => pipelinesApi.deletePipeline(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipelines"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading pipelines...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipelines</h1>
          <p className="text-sm text-gray-500 mt-1">Manage workflow templates</p>
        </div>
        <Button onClick={() => setLocation("/pipelines/new")}>
          <Plus className="w-4 h-4 mr-2" />
          New Pipeline
        </Button>
      </div>

      {pipelines.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500 mb-4">No pipelines yet</p>
            <Button onClick={() => setLocation("/pipelines/new")}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Pipeline
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Stages</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pipelines.map((pipeline) => {
                  const stages = (pipeline.stages as any[]) || [];
                  return (
                    <TableRow key={pipeline.id}>
                      <TableCell className="font-medium">{pipeline.name}</TableCell>
                      <TableCell className="text-gray-600">
                        {pipeline.description || "—"}
                      </TableCell>
                      <TableCell>{stages.length} stages</TableCell>
                      <TableCell>
                        <Badge variant={pipeline.isActive ? "default" : "secondary"}>
                          {pipeline.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLocation(`/pipelines/${pipeline.id}`)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLocation(`/jobs/new?pipelineId=${pipeline.id}`)}
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this pipeline?")) {
                                deletePipelineMutation.mutate(pipeline.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

