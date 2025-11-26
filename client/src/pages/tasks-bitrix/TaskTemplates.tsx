// Task Templates Management Page
// Manages templates and their scheduling configurations

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { TemplateEditor } from "@/components/tasks-bitrix/TemplateEditor";
import { TemplateScheduleConfig } from "@/components/tasks-bitrix/TemplateScheduleConfig";
import { tasksBitrixApi, TaskTemplate, CreateTemplatePayload } from "@/api/tasks-bitrix";
import { useToast } from "@/hooks/use-toast";
import { Clock, Plus, Edit, Trash2, Play, Settings } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery as useApiQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function TaskTemplates() {
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  const [schedulingTemplate, setSchedulingTemplate] = useState<TaskTemplate | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["/api/task-templates"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/task-templates");
      return response.json();
    },
  });

  // Fetch available clients and users for scheduling
  const { data: availableClients = [] } = useApiQuery({
    queryKey: ['/api/clients'],
    queryFn: async () => {
      const response = await fetch('/api/clients', { credentials: 'include' });
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data.map((c: any) => ({ id: c.id, name: c.name })) : [];
    },
  });

  const { data: availableUsers = [] } = useApiQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await fetch('/api/users', { credentials: 'include' });
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data.map((u: any) => ({ id: u.id, name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username, email: u.email })) : [];
    },
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: (data: CreateTemplatePayload) => tasksBitrixApi.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-templates"] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "Template created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create template",
        variant: "destructive",
      });
    },
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateTemplatePayload> }) =>
      tasksBitrixApi.updateTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-templates"] });
      setEditingTemplate(null);
      toast({
        title: "Success",
        description: "Template updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update template",
        variant: "destructive",
      });
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: (id: number) => tasksBitrixApi.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-templates"] });
      toast({
        title: "Success",
        description: "Template deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete template",
        variant: "destructive",
      });
    },
  });

  // Toggle schedule mutation
  const toggleScheduleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) =>
      tasksBitrixApi.updateTemplateSchedule(id, { scheduleEnabled: enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-templates"] });
      toast({
        title: "Success",
        description: "Schedule updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update schedule",
        variant: "destructive",
      });
    },
  });

  // Test schedule mutation
  const testScheduleMutation = useMutation({
    mutationFn: async (template: TaskTemplate) => {
      const config = (template.scheduleConfig as any) || {};
      if (!config.cronExpression) {
        throw new Error("No cron expression configured");
      }
      return tasksBitrixApi.testTemplateSchedule(template.id, config.cronExpression, config.timezone);
    },
    onSuccess: (result) => {
      toast({
        title: "Schedule Test",
        description: `Next run: ${result.nextRunAtFormatted}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to test schedule",
        variant: "destructive",
      });
    },
  });

  const handleCreateTemplate = async (data: CreateTemplatePayload) => {
    await createTemplateMutation.mutateAsync(data);
  };

  const handleUpdateTemplate = async (data: CreateTemplatePayload) => {
    if (!editingTemplate) return;
    await updateTemplateMutation.mutateAsync({ id: editingTemplate.id, data });
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    await deleteTemplateMutation.mutateAsync(id);
  };

  const handleToggleSchedule = async (template: TaskTemplate, enabled: boolean) => {
    await toggleScheduleMutation.mutateAsync({ id: template.id, enabled });
  };

  const handleScheduleUpdate = async (enabled: boolean, config: any) => {
    if (!schedulingTemplate) return;
    try {
      await tasksBitrixApi.updateTemplateSchedule(schedulingTemplate.id, {
        scheduleEnabled: enabled,
        scheduleConfig: config,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/task-templates"] });
      setSchedulingTemplate(null);
      toast({
        title: "Success",
        description: "Schedule configuration updated",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update schedule",
        variant: "destructive",
      });
    }
  };

  const formatNextRun = (template: TaskTemplate) => {
    const config = (template.scheduleConfig as any) || {};
    if (config.nextRunAt) {
      try {
        return new Date(config.nextRunAt).toLocaleString();
      } catch {
        return "Invalid date";
      }
    }
    return "Not scheduled";
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">Loading templates...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Task Templates</h1>
          <p className="text-muted-foreground">Create and manage reusable task templates with automatic scheduling</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No templates found</p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>Create your first template</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {template.name}
                      {template.isPublic && (
                        <Badge variant="outline">Public</Badge>
                      )}
                      {template.scheduleEnabled && (
                        <Badge variant="default" className="bg-green-600">
                          <Clock className="h-3 w-3 mr-1" />
                          Scheduled
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {template.description || "No description"}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {template.scheduleEnabled && (
                      <>
                        <span className="text-sm text-muted-foreground">
                          Next: {formatNextRun(template)}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testScheduleMutation.mutate(template)}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Test
                        </Button>
                      </>
                    )}
                    <Switch
                      checked={template.scheduleEnabled || false}
                      onCheckedChange={(enabled) => handleToggleSchedule(template, enabled)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSchedulingTemplate(template)}
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      Schedule
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingTemplate(template)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteTemplate(template.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Create Template Dialog */}
      <TemplateEditor
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSubmit={handleCreateTemplate}
      />

      {/* Edit Template Dialog */}
      {editingTemplate && (
        <TemplateEditor
          isOpen={!!editingTemplate}
          onClose={() => setEditingTemplate(null)}
          onSubmit={handleUpdateTemplate}
          template={editingTemplate}
        />
      )}

      {/* Schedule Configuration Dialog */}
      {schedulingTemplate && (
        <Dialog open={!!schedulingTemplate} onOpenChange={() => setSchedulingTemplate(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Configure Schedule: {schedulingTemplate.name}</DialogTitle>
              <DialogDescription>
                Set up automatic task creation from this template
              </DialogDescription>
            </DialogHeader>
            <TemplateScheduleConfig
              templateId={schedulingTemplate.id}
              scheduleEnabled={schedulingTemplate.scheduleEnabled || false}
              scheduleConfig={(schedulingTemplate.scheduleConfig as any) || {}}
              onUpdate={handleScheduleUpdate}
              availableClients={availableClients}
              availableUsers={availableUsers}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

