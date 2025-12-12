import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon, User, Flag, CheckCircle2, Circle, Clock, History, Link as LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { SubtaskList } from "./SubtaskList";
import { RecurrenceSettings, RecurrencePattern } from "./RecurrenceSettings";

interface TaskDetailDialogProps {
  taskId: number | null;
  onClose: () => void;
}

export const TaskDetailDialog: React.FC<TaskDetailDialogProps> = ({ taskId, onClose }) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("details");

  const { data: task, isLoading } = useQuery({
    queryKey: ["task", taskId],
    queryFn: async () => {
      if (!taskId) return null;
      const res = await fetch(`/api/tasks/${taskId}`);
      if (!res.ok) throw new Error("Failed to fetch task");
      return res.json();
    },
    enabled: !!taskId,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: any) => {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  if (!taskId) return null;

  const handleUpdate = (field: string, value: any) => {
    updateMutation.mutate({ [field]: value });
  };

  const handleRecurrenceChange = (pattern: RecurrencePattern | undefined, endDate: string | undefined) => {
    updateMutation.mutate({
      recurrencePattern: pattern,
      recurrenceEndDate: endDate,
    });
  };

  if (isLoading) return null;

  return (
    <Dialog open={!!taskId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <div className="flex flex-1 overflow-hidden">
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden border-r">
            <div className="p-6 flex-1 overflow-y-auto">
              {/* Header */}
              <div className="mb-6">
                <Input
                  className="text-2xl font-bold border-none shadow-none px-0 focus-visible:ring-0 h-auto"
                  value={task.title}
                  onChange={(e) => handleUpdate("title", e.target.value)}
                  onBlur={(e) => handleUpdate("title", e.target.value)}
                />
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="activity">Activity Log</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-8">
                  {/* Description */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
                    <Textarea
                      className="min-h-[100px] resize-none border-none shadow-none focus-visible:ring-0 px-0 bg-transparent"
                      placeholder="Add a description..."
                      value={task.description || ""}
                      onChange={(e) => handleUpdate("description", e.target.value)}
                      onBlur={(e) => handleUpdate("description", e.target.value)}
                    />
                  </div>

                  <Separator />

                  {/* Subtasks */}
                  <SubtaskList taskId={taskId} subtasks={task.subtasks || []} />

                  <Separator />

                  {/* Relations (Placeholder for now) */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Relations</h3>
                    <div className="text-sm text-muted-foreground italic">
                      Task relations coming soon...
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="activity" className="h-full">
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4 pr-4">
                      {task.activityLogs?.map((log: any) => (
                        <div key={log.id} className="flex gap-3 text-sm">
                          <div className="mt-0.5">
                            <History className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p>
                              <span className="font-medium">User {log.userId}</span>{" "}
                              <span className="text-muted-foreground">
                                {log.actionType.replace("_", " ")}
                              </span>
                            </p>
                            {log.newValue && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {log.oldValue && <span className="line-through mr-2">{log.oldValue}</span>}
                                <span>{log.newValue}</span>
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(log.createdAt), "MMM d, h:mm a")}
                            </p>
                          </div>
                        </div>
                      ))}
                      {(!task.activityLogs || task.activityLogs.length === 0) && (
                        <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-80 bg-muted/10 p-6 overflow-y-auto border-l">
            <div className="space-y-6">
              {/* Status */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">Status</span>
                <Select
                  value={task.status}
                  onValueChange={(val) => handleUpdate("status", val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">Priority</span>
                <Select
                  value={task.priority}
                  onValueChange={(val) => handleUpdate("priority", val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Assignee */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">Assignee</span>
                <Button variant="outline" className="w-full justify-start font-normal">
                  <User className="mr-2 h-4 w-4" />
                  {task.assigneeId ? `User ${task.assigneeId}` : "Unassigned"}
                </Button>
              </div>

              {/* Due Date */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">Due Date</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !task.dueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {task.dueDate ? format(new Date(task.dueDate), "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={task.dueDate ? new Date(task.dueDate) : undefined}
                      onSelect={(date) => handleUpdate("dueDate", date?.toISOString())}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Recurrence */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">Recurrence</span>
                <RecurrenceSettings
                  value={task.recurrencePattern}
                  endDate={task.recurrenceEndDate}
                  onChange={handleRecurrenceChange}
                />
              </div>

              {/* Metadata */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Created</span>
                  <span>{format(new Date(task.createdAt), "MMM d, yyyy")}</span>
                </div>
                {task.updatedAt && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                    <span>Updated</span>
                    <span>{format(new Date(task.updatedAt), "MMM d, yyyy")}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
