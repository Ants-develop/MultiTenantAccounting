import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TaskTemplate, TaskTemplateData, CreateTemplatePayload } from "@/api/tasks-bitrix";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, X, Trash2 } from "lucide-react";
import { TemplateScheduleConfig } from "./TemplateScheduleConfig";
import { tasksBitrixApi } from "@/api/tasks-bitrix";
import { useQuery } from "@tanstack/react-query";

const templateFormSchema = z.object({
  clientId: z.number().int().positive(),
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  isPublic: z.boolean().default(false),
  data: z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
    tags: z.array(z.string()).default([]),
    estimated_minutes: z.number().int().positive().optional(),
    deadline_offset: z.string().optional(),
    checklists: z.array(z.object({
      text: z.string().min(1, "Checklist text is required"),
      assigned_to_role: z.string().optional(),
    })).default([]),
    metadata: z.record(z.any()).optional(),
  }),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

interface ChecklistItem {
  text: string;
  assigned_to_role?: string;
}

interface TemplateEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTemplatePayload) => Promise<void>;
  template?: TaskTemplate;
  defaultClientId?: number;
}

export function TemplateEditor({
  isOpen,
  onClose,
  onSubmit,
  template,
  defaultClientId,
}: TemplateEditorProps) {
  const [checklists, setChecklists] = useState<ChecklistItem[]>([]);

  // Fetch available clients and users for scheduling
  const { data: availableClients = [] } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: async () => {
      const response = await fetch('/api/clients', { credentials: 'include' });
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data.map((c: any) => ({ id: c.id, name: c.name })) : [];
    },
  });

  const { data: availableUsers = [] } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await fetch('/api/users', { credentials: 'include' });
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data.map((u: any) => ({ id: u.id, name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username, email: u.email })) : [];
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue,
  } = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      clientId: template?.clientId || defaultClientId || 0,
      name: template?.name || "",
      description: template?.description || "",
      isPublic: template?.isPublic || false,
      data: {
        title: (template?.data as TaskTemplateData)?.title || "",
        description: (template?.data as TaskTemplateData)?.description || "",
        priority: (template?.data as TaskTemplateData)?.priority || "medium",
        tags: (template?.data as TaskTemplateData)?.tags || [],
        estimated_minutes: (template?.data as TaskTemplateData)?.estimated_minutes,
        deadline_offset: (template?.data as TaskTemplateData)?.deadline_offset,
        checklists: (template?.data as TaskTemplateData)?.checklists || [],
        metadata: (template?.data as TaskTemplateData)?.metadata,
      },
    },
  });

  useEffect(() => {
    if (template) {
      const data = template.data as TaskTemplateData;
      setChecklists(data.checklists || []);
      reset({
        clientId: template.clientId,
        name: template.name,
        description: template.description || "",
        isPublic: template.isPublic,
        data: {
          title: data.title,
          description: data.description || "",
          priority: data.priority,
          tags: data.tags || [],
          estimated_minutes: data.estimated_minutes,
          deadline_offset: data.deadline_offset,
          checklists: data.checklists || [],
          metadata: data.metadata,
        },
      });
    } else {
      setChecklists([]);
      reset({
        clientId: defaultClientId || 0,
        name: "",
        description: "",
        isPublic: false,
        data: {
          title: "",
          description: "",
          priority: "medium",
          tags: [],
          estimated_minutes: undefined,
          deadline_offset: undefined,
          checklists: [],
          metadata: undefined,
        },
      });
    }
  }, [template, defaultClientId, reset, isOpen]);

  const addChecklist = () => {
    setChecklists([...checklists, { text: "", assigned_to_role: undefined }]);
  };

  const removeChecklist = (index: number) => {
    setChecklists(checklists.filter((_, i) => i !== index));
  };

  const updateChecklist = (index: number, field: keyof ChecklistItem, value: string) => {
    const updated = [...checklists];
    updated[index] = { ...updated[index], [field]: value };
    setChecklists(updated);
  };

  const handleScheduleUpdate = async (enabled: boolean, config: any) => {
    if (!template?.id) return;
    try {
      await tasksBitrixApi.updateTemplateSchedule(template.id, {
        scheduleEnabled: enabled,
        scheduleConfig: config,
      });
    } catch (error) {
      console.error("Failed to update schedule:", error);
    }
  };

  const onFormSubmit = async (data: TemplateFormValues) => {
    const payload: CreateTemplatePayload = {
      clientId: data.clientId,
      name: data.name,
      description: data.description,
      isPublic: data.isPublic,
      data: {
        ...data.data,
        checklists,
      },
    };
    await onSubmit(payload);
    reset();
    setChecklists([]);
  };

  const tagsValue = watch("data.tags");
  const tagsInput = tagsValue?.join(", ") || "";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? "Edit Template" : "Create Template"}</DialogTitle>
          <DialogDescription>
            {template ? "Update template details" : "Create a reusable task template"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Template Name *</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="e.g., Monthly Financial Review"
            />
            {errors.name && (
              <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Template Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Describe when to use this template"
              rows={2}
            />
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">Task Fields</h3>

            <div className="space-y-4">
              <div>
                <Label htmlFor="data.title">Task Title *</Label>
                <Input
                  id="data.title"
                  {...register("data.title")}
                  placeholder="e.g., Review {{client_name}} Financial Statements"
                />
                {errors.data?.title && (
                  <p className="text-sm text-red-500 mt-1">{errors.data.title.message}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Use {"{{variable_name}}"} for dynamic values
                </p>
              </div>

              <div>
                <Label htmlFor="data.description">Task Description</Label>
                <Textarea
                  id="data.description"
                  {...register("data.description")}
                  placeholder="Task description (supports variables)"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="data.priority">Priority</Label>
                  <Select
                    value={watch("data.priority")}
                    onValueChange={(value) => setValue("data.priority", value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="data.estimated_minutes">Estimated Minutes</Label>
                  <Input
                    id="data.estimated_minutes"
                    type="number"
                    {...register("data.estimated_minutes", { valueAsNumber: true })}
                    placeholder="e.g., 120"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="data.deadline_offset">Deadline Offset</Label>
                <Input
                  id="data.deadline_offset"
                  {...register("data.deadline_offset")}
                  placeholder="e.g., +3 days, +1 week, +2 months"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Calculate due date from template instantiation time
                </p>
              </div>

              <div>
                <Label htmlFor="data.tags">Tags (comma-separated)</Label>
                <Input
                  id="data.tags"
                  value={tagsInput}
                  onChange={(e) => {
                    const tags = e.target.value
                      .split(",")
                      .map((t) => t.trim())
                      .filter((t) => t.length > 0);
                    setValue("data.tags", tags);
                  }}
                  placeholder="e.g., monthly, review, financial"
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Checklists</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addChecklist}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            {checklists.length === 0 ? (
              <p className="text-sm text-muted-foreground">No checklist items. Add items to create a checklist when instantiating this template.</p>
            ) : (
              <div className="space-y-2">
                {checklists.map((item, index) => (
                  <Card key={index}>
                    <CardContent className="p-3">
                      <div className="flex gap-2">
                        <div className="flex-1 space-y-2">
                          <Input
                            placeholder="Checklist item text"
                            value={item.text}
                            onChange={(e) => updateChecklist(index, "text", e.target.value)}
                          />
                          <Input
                            placeholder="Assigned to role (optional, e.g., accountant, manager)"
                            value={item.assigned_to_role || ""}
                            onChange={(e) => updateChecklist(index, "assigned_to_role", e.target.value)}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeChecklist(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isPublic"
              {...register("isPublic")}
              className="rounded"
            />
            <Label htmlFor="isPublic" className="cursor-pointer">
              Make this template public (visible to all users)
            </Label>
          </div>

          {/* Scheduling Configuration - Only show for existing templates */}
          {template && (
            <div className="border-t pt-4">
              <TemplateScheduleConfig
                templateId={template.id}
                scheduleEnabled={template.scheduleEnabled || false}
                scheduleConfig={(template.scheduleConfig as any) || {}}
                onUpdate={handleScheduleUpdate}
                availableClients={availableClients}
                availableUsers={availableUsers}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : template ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

