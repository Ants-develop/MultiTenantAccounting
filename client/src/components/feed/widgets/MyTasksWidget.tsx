import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface Task {
  id: string;
  title: string;
  status: string;
  due_date?: string;
  priority?: string;
}

interface MyTasksWidgetProps {
  tasks?: Task[];
  isLoading?: boolean;
  onViewAll?: () => void;
  onTaskClick?: (taskId: string) => void;
  onToggleTask?: (taskId: string, completed: boolean) => void;
}

export const MyTasksWidget = ({
  tasks = [],
  isLoading = false,
  onViewAll,
  onTaskClick,
  onToggleTask,
}: MyTasksWidgetProps) => {
  // Get incomplete tasks, sorted by due date
  const pendingTasks = tasks
    .filter(t => t.status !== 'completed')
    .sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    })
    .slice(0, 5);

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'low': return 'bg-green-500/10 text-green-500 border-green-500/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <Card className="rounded-2xl border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <CheckSquare className="h-4 w-4 text-primary" />
          My Tasks
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </>
        ) : pendingTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No pending tasks
          </p>
        ) : (
          pendingTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => onTaskClick?.(task.id)}
            >
              <Checkbox
                checked={task.status === 'completed'}
                onCheckedChange={(checked) => 
                  onToggleTask?.(task.id, checked as boolean)
                }
                onClick={(e) => e.stopPropagation()}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{task.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  {task.due_date && (
                    <span className="text-xs text-muted-foreground">
                      Due {format(new Date(task.due_date), 'MMM d')}
                    </span>
                  )}
                  {task.priority && (
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getPriorityColor(task.priority)}`}
                    >
                      {task.priority}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        
        {onViewAll && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-primary hover:text-primary"
            onClick={onViewAll}
          >
            View All Tasks
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
