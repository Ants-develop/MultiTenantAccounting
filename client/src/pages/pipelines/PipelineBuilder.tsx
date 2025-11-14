import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { pipelinesApi, Pipeline, PipelineStage } from "@/api/pipelines";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Trash2, GripVertical } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const pipelineSchema = z.object({
  name: z.string().min(1, "Pipeline name is required"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

type PipelineFormValues = z.infer<typeof pipelineSchema>;

export default function PipelineBuilder() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const pipelineId = parseInt(window.location.pathname.split("/").pop() || "0");
  const isNew = window.location.pathname.includes("/new");
  const workspaceId = 1; // Default workspace

  const [stages, setStages] = useState<PipelineStage[]>([]);

  const { data: existingPipeline } = useQuery({
    queryKey: ["/api/pipelines", pipelineId],
    queryFn: () => pipelinesApi.fetchPipeline(pipelineId),
    enabled: !isNew && pipelineId > 0,
  });

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<PipelineFormValues>({
    resolver: zodResolver(pipelineSchema),
    defaultValues: {
      name: "",
      description: "",
      isActive: true,
    },
  });

  useEffect(() => {
    if (existingPipeline) {
      setValue("name", existingPipeline.name);
      setValue("description", existingPipeline.description || "");
      setValue("isActive", existingPipeline.isActive);
      setStages((existingPipeline.stages as PipelineStage[]) || []);
    }
  }, [existingPipeline, setValue]);

  const createPipelineMutation = useMutation({
    mutationFn: (data: any) => pipelinesApi.createPipeline(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipelines"] });
      setLocation("/pipelines");
    },
  });

  const updatePipelineMutation = useMutation({
    mutationFn: (data: any) => pipelinesApi.updatePipeline(pipelineId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipelines"] });
      setLocation("/pipelines");
    },
  });

  const addStage = () => {
    const newStage: PipelineStage = {
      id: `stage-${Date.now()}`,
      name: `Stage ${stages.length + 1}`,
      order: stages.length,
      taskTemplates: [],
    };
    setStages([...stages, newStage]);
  };

  const removeStage = (stageId: string) => {
    setStages(stages.filter(s => s.id !== stageId).map((s, idx) => ({ ...s, order: idx })));
  };

  const updateStage = (stageId: string, updates: Partial<PipelineStage>) => {
    setStages(stages.map(s => s.id === stageId ? { ...s, ...updates } : s));
  };

  const addTaskTemplate = (stageId: string) => {
    setStages(stages.map(s => {
      if (s.id === stageId) {
        return {
          ...s,
          taskTemplates: [
            ...(s.taskTemplates || []),
            {
              title: "New Task",
              description: "",
              priority: "medium" as const,
            },
          ],
        };
      }
      return s;
    }));
  };

  const removeTaskTemplate = (stageId: string, templateIndex: number) => {
    setStages(stages.map(s => {
      if (s.id === stageId) {
        return {
          ...s,
          taskTemplates: (s.taskTemplates || []).filter((_, idx) => idx !== templateIndex),
        };
      }
      return s;
    }));
  };

  const updateTaskTemplate = (stageId: string, templateIndex: number, updates: any) => {
    setStages(stages.map(s => {
      if (s.id === stageId) {
        const templates = [...(s.taskTemplates || [])];
        templates[templateIndex] = { ...templates[templateIndex], ...updates };
        return { ...s, taskTemplates: templates };
      }
      return s;
    }));
  };

  const onSubmit = async (data: PipelineFormValues) => {
    const payload = {
      workspaceId,
      name: data.name,
      description: data.description,
      stages: stages.map((s, idx) => ({ ...s, order: idx })),
      isActive: data.isActive,
    };

    if (isNew) {
      await createPipelineMutation.mutateAsync(payload);
    } else {
      await updatePipelineMutation.mutateAsync(payload);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setLocation("/pipelines")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">
            {isNew ? "Create Pipeline" : "Edit Pipeline"}
          </h1>
        </div>
        <Button onClick={handleSubmit(onSubmit)}>
          Save Pipeline
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Pipeline Name</Label>
                <Input
                  id="name"
                  {...register("name")}
                  placeholder="Pipeline name"
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...register("description")}
                  placeholder="Pipeline description"
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  {...register("isActive")}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="isActive" className="text-sm font-normal cursor-pointer">
                  Active
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Stages</CardTitle>
              <Button variant="outline" size="sm" onClick={addStage}>
                <Plus className="w-4 h-4 mr-2" />
                Add Stage
              </Button>
            </div>
          </CardHeader>
          <CardContent>

          <div className="space-y-4">
            {stages.map((stage, stageIdx) => (
              <div key={stage.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 flex-1">
                    <GripVertical className="w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={stage.name}
                      onChange={(e) => updateStage(stage.id, { name: e.target.value })}
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Stage name"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeStage(stage.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="ml-7 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Task Templates</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => addTaskTemplate(stage.id)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Task
                    </Button>
                  </div>

                  {stage.taskTemplates?.map((template, templateIdx) => (
                    <div key={templateIdx} className="bg-gray-50 rounded p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <input
                          type="text"
                          value={template.title}
                          onChange={(e) => updateTaskTemplate(stage.id, templateIdx, { title: e.target.value })}
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Task title"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTaskTemplate(stage.id, templateIdx)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      <input
                        type="text"
                        value={template.description || ""}
                        onChange={(e) => updateTaskTemplate(stage.id, templateIdx, { description: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Task description (optional)"
                      />
                      <select
                        value={template.priority || "medium"}
                        onChange={(e) => updateTaskTemplate(stage.id, templateIdx, { priority: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {stages.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No stages yet. Click "Add Stage" to get started.</p>
              </div>
            )}
          </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

