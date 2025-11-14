import React, { useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Task } from "@/api/tasks";
import { TaskCard } from "./TaskCard";
import { Card, CardContent } from "@/components/ui/card";

interface KanbanColumn {
  id: string;
  title: string;
  status: Task["status"];
}

interface KanbanBoardProps {
  tasks: Task[];
  onTaskUpdate: (taskId: number, updates: Partial<Task>) => Promise<void>;
  isLoading?: boolean;
  onTaskClick?: (task: Task) => void;
}

const columns: KanbanColumn[] = [
  { id: "todo", title: "To Do", status: "todo" },
  { id: "in_progress", title: "In Progress", status: "in_progress" },
  { id: "done", title: "Done", status: "done" },
  { id: "blocked", title: "Blocked", status: "blocked" },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  onTaskUpdate,
  isLoading = false,
  onTaskClick,
}) => {
  const [activeTask, setActiveTask] = React.useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    columns.forEach((col) => {
      grouped[col.status] = tasks.filter((task) => task.status === col.status);
    });
    return grouped;
  }, [tasks]);

  const handleDragStart = (event: DragStartEvent) => {
    const taskId = event.active.id as number;
    const task = tasks.find((t) => t.id === taskId);
    setActiveTask(task || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);

    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as number;
    const newStatus = over.id as Task["status"];

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    try {
      await onTaskUpdate(taskId, { status: newStatus });
    } catch (error) {
      console.error("Failed to update task:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((column) => {
          const columnTasks = tasksByStatus[column.status] || [];
          const taskIds = columnTasks.map((t) => t.id);

          return (
            <div key={column.id} className="flex-shrink-0 w-80">
              <Card className="h-full flex flex-col">
                <CardContent className="p-4 flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">{column.title}</h3>
                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      {columnTasks.length}
                    </span>
                  </div>
                  <SortableContext
                    items={taskIds}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="flex-1 space-y-2 overflow-y-auto min-h-0">
                      {columnTasks.map((task) => (
                        <TaskCard key={task.id} task={task} onClick={() => onTaskClick?.(task)} />
                      ))}
                      {columnTasks.length === 0 && (
                        <div className="text-center py-8 text-gray-400 text-sm">
                          No tasks
                        </div>
                      )}
                    </div>
                  </SortableContext>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
      <DragOverlay>
        {activeTask ? (
          <div className="opacity-90">
            <TaskCard task={activeTask} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

