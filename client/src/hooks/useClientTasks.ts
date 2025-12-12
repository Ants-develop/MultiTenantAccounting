import { useQuery } from "@tanstack/react-query";

export interface Task {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assigneeId?: number;
  dueDate?: string;
  createdAt: string;
}

export const useClientTasks = (clientId: number) => {
  return useQuery({
    queryKey: ["client-tasks", clientId],
    queryFn: async () => {
      const response = await fetch(`/api/tasks?clientId=${clientId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch client tasks");
      }
      return response.json() as Promise<Task[]>;
    },
    enabled: !!clientId,
  });
};
