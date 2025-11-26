import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TaskCard } from "@/components/tasks-bitrix/TaskCard";
import { TaskFilters } from "@/components/tasks-bitrix/TaskFilters";
import { TaskForm } from "@/components/tasks-bitrix/TaskForm";
import { TemplateEditor } from "@/components/tasks-bitrix/TemplateEditor";
import { TemplateScheduleConfig } from "@/components/tasks-bitrix/TemplateScheduleConfig";
import { tasksBitrixApi, Task, TaskFilters as TaskFiltersType, CreateTaskPayload, TaskTemplate, CreateTemplatePayload } from "@/api/tasks-bitrix";
import { useClientFilter } from "@/hooks/useClientFilter";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileText, Clock, Edit, Trash2, Play, Settings } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function TaskList() {
  const { selectedClientIds, accessibleClients, isLoading: clientsLoading } = useClientFilter("tasks");
  const [filters, setFilters] = useState<TaskFiltersType>({
    clientIds: selectedClientIds,
  });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("tasks");
  
  // Template management state
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  const [schedulingTemplate, setSchedulingTemplate] = useState<TaskTemplate | null>(null);
  const [isCreateTemplateDialogOpen, setIsCreateTemplateDialogOpen] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Update filters when client selection changes
  React.useEffect(() => {
    setFilters((prev) => ({ ...prev, clientIds: selectedClientIds }));
  }, [selectedClientIds]);

  // Fetch tasks
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["/api/tasks-bitrix", filters],
    queryFn: () => tasksBitrixApi.fetchTasks(filters),
    enabled: selectedClientIds.length > 0,
  });

  // Fetch available users
  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/users");
      return response.json();
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: CreateTaskPayload) => tasksBitrixApi.createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks-bitrix"] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "Task created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create task",
        variant: "destructive",
      });
    },
  });

  const handleTaskClick = (taskId: number) => {
    setLocation(`/tasks-bitrix/${taskId}`);
  };

  const handleCreateTask = async (data: CreateTaskPayload) => {
    await createTaskMutation.mutateAsync(data);
  };

  // Template queries and mutations
  const { data: templates = [], isLoading: templatesLoading } = useQuery<TaskTemplate[]>({
    queryKey: ["/api/task-templates"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/task-templates");
      return response.json();
    },
  });

  const { data: availableClientsForTemplates = [] } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: async () => {
      const response = await fetch('/api/clients', { credentials: 'include' });
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data.map((c: any) => ({ id: c.id, name: c.name })) : [];
    },
  });

  const { data: availableUsersForTemplates = [] } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await fetch('/api/users', { credentials: 'include' });
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data.map((u: any) => ({ id: u.id, name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username, email: u.email })) : [];
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data: CreateTemplatePayload) => tasksBitrixApi.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-templates"] });
      setIsCreateTemplateDialogOpen(false);
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

  const formatNextRun = (template: TaskTemplate): string => {
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

  if (accessibleClients.length === 0 && !clientsLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            You don't have access to any clients for the tasks module.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Tasks</h1>
          <p className="text-muted-foreground">Manage your tasks and track progress</p>
        </div>
        {activeTab === "tasks" && (
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Task
          </Button>
        )}
        {activeTab === "templates" && (
          <Button onClick={() => setIsCreateTemplateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-6">
          {accessibleClients.length === 0 && !clientsLoading ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground">
                  You don't have access to any clients for the tasks module.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Filters Sidebar */}
              <div className="lg:col-span-1">
                <TaskFilters
                  filters={filters}
                  onFiltersChange={setFilters}
                  accessibleClients={accessibleClients}
                  isLoadingClients={clientsLoading}
                  availableUsers={users.map((u: any) => ({ id: u.id, name: `${u.firstName} ${u.lastName}` }))}
                />
              </div>

              {/* Tasks List */}
              <div className="lg:col-span-3">
                {tasksLoading ? (
                  <Card>
                    <CardContent className="p-6">
                      <p className="text-center text-muted-foreground">Loading tasks...</p>
                    </CardContent>
                  </Card>
                ) : tasks.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No tasks found</p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => setIsCreateDialogOpen(true)}
                      >
                        Create your first task
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {tasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onClick={() => handleTaskClick(task.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          {templatesLoading ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground">Loading templates...</p>
              </CardContent>
            </Card>
          ) : templates.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No templates found</p>
                <Button onClick={() => setIsCreateTemplateDialogOpen(true)}>Create your first template</Button>
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
        </TabsContent>
      </Tabs>

      {/* Create Task Dialog */}
      <TaskForm
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSubmit={handleCreateTask}
        defaultClientId={selectedClientIds[0]}
        availableUsers={users.map((u: any) => ({ id: u.id, name: `${u.firstName} ${u.lastName}` }))}
      />

      {/* Create Template Dialog */}
      <TemplateEditor
        isOpen={isCreateTemplateDialogOpen}
        onClose={() => setIsCreateTemplateDialogOpen(false)}
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
              availableClients={availableClientsForTemplates}
              availableUsers={availableUsersForTemplates}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

