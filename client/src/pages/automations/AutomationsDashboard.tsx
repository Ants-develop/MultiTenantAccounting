import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { automationsApi, Automation } from "@/api/automations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Play, Edit, Trash2, Power, PowerOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AutomationForm } from "@/components/automations/AutomationForm";
import dayjs from "dayjs";

export const AutomationsDashboard: React.FC = () => {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);
  const workspaceId = undefined; // TODO: Get from context or route params

  const { data: automations = [], isLoading } = useQuery({
    queryKey: ["/api/automations", workspaceId],
    queryFn: () => automationsApi.fetchAutomations(workspaceId),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => automationsApi.deleteAutomation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
      toast({
        title: "Automation deleted",
        description: "The automation has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete automation",
        variant: "destructive",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      automationsApi.updateAutomation(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
      toast({
        title: "Automation updated",
        description: "Automation status has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update automation",
        variant: "destructive",
      });
    },
  });

  const testMutation = useMutation({
    mutationFn: ({ id, testData }: { id: number; testData: any }) =>
      automationsApi.testAutomation(id, testData),
    onSuccess: () => {
      toast({
        title: "Test executed",
        description: "Automation test has been executed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Test failed",
        description: error.message || "Failed to execute automation test",
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    setEditingAutomation(null);
    setIsFormOpen(true);
  };

  const handleEdit = (automation: Automation) => {
    setEditingAutomation(automation);
    setIsFormOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this automation?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleToggleActive = (automation: Automation) => {
    toggleActiveMutation.mutate({
      id: automation.id,
      isActive: !automation.isActive,
    });
  };

  const handleTest = (automation: Automation): void => {
    // Use sample event data based on trigger type
    const testData = {
      workspaceId: automation.workspaceId,
      clientId: undefined,
      userId: undefined,
      targetType: automation.triggerType.split(".")[0] || "task",
      targetId: 1,
      metadata: {},
    };
    testMutation.mutate({ id: automation.id, testData });
  };

  const getTriggerTypeLabel = (triggerType: string): string => {
    const parts = triggerType.split(".");
    if (parts.length === 2) {
      return `${parts[0]} - ${parts[1].replace(/_/g, " ")}`;
    }
    return triggerType.replace(/_/g, " ");
  };

  const getActionSummary = (actions: any[]): string => {
    if (!Array.isArray(actions) || actions.length === 0) return "No actions";
    const actionTypes = actions.map((a) => a.type).join(", ");
    return `${actions.length} action(s): ${actionTypes}`;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Automations</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create and manage automated workflows
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          New Automation
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Automations</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : automations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No automations yet</p>
              <Button variant="outline" onClick={handleCreate} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Create First Automation
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Actions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {automations.map((automation) => (
                  <TableRow key={automation.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{automation.name}</p>
                        {automation.description && (
                          <p className="text-sm text-gray-500">
                            {automation.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getTriggerTypeLabel(automation.triggerType)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {getActionSummary(automation.actions)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={automation.isActive ? "default" : "secondary"}>
                        {automation.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-500">
                        {dayjs(automation.createdAt).format("MMM D, YYYY")}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTest(automation)}
                          disabled={testMutation.isPending}
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(automation)}
                          disabled={toggleActiveMutation.isPending}
                        >
                          {automation.isActive ? (
                            <PowerOff className="w-4 h-4" />
                          ) : (
                            <Power className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(automation)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(automation.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {isFormOpen && (
        <AutomationForm
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setEditingAutomation(null);
          }}
          initialData={editingAutomation || undefined}
          workspaceId={workspaceId}
        />
      )}
    </div>
  );
};

