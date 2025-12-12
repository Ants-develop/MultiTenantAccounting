import React, { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface Subtask {
  id: number;
  title: string;
  done: boolean;
  orderIndex: number;
}

interface SubtaskListProps {
  taskId: number;
  subtasks: Subtask[];
}

export const SubtaskList: React.FC<SubtaskListProps> = ({ taskId, subtasks }) => {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async (title: string) => {
      const res = await fetch(`/api/tasks/${taskId}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, orderIndex: subtasks.length }),
      });
      if (!res.ok) throw new Error("Failed to add subtask");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
      setNewSubtaskTitle("");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, done }: { id: number; done: boolean }) => {
      const res = await fetch(`/api/tasks/${taskId}/subtasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done }),
      });
      if (!res.ok) throw new Error("Failed to update subtask");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/tasks/${taskId}/subtasks/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete subtask");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
    },
  });

  const completedCount = subtasks.filter((s) => s.done).length;
  const progress = subtasks.length > 0 ? (completedCount / subtasks.length) * 100 : 0;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSubtaskTitle.trim()) {
      addMutation.mutate(newSubtaskTitle);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Subtasks</span>
        <span>{completedCount}/{subtasks.length}</span>
      </div>
      
      {subtasks.length > 0 && (
        <Progress value={progress} className="h-2" />
      )}

      <div className="space-y-2">
        {subtasks.map((subtask) => (
          <div
            key={subtask.id}
            className="group flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-50 cursor-move" />
            <Checkbox
              checked={subtask.done}
              onCheckedChange={(checked) =>
                toggleMutation.mutate({ id: subtask.id, done: checked as boolean })
              }
            />
            <span className={cn("flex-1 text-sm", subtask.done && "line-through text-muted-foreground")}>
              {subtask.title}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100"
              onClick={() => deleteMutation.mutate(subtask.id)}
            >
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      <form onSubmit={handleAdd} className="flex items-center gap-2">
        <Plus className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Add a subtask..."
          value={newSubtaskTitle}
          onChange={(e) => setNewSubtaskTitle(e.target.value)}
          className="h-8 border-none shadow-none focus-visible:ring-0 px-0"
        />
      </form>
    </div>
  );
};
