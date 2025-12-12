import { useQuery } from "@tanstack/react-query";

export interface Job {
  id: number;
  title: string;
  status: string;
  pipelineName?: string;
  currentStage?: string;
  dueDate?: string;
  createdAt: string;
  description?: string;
}

export const useClientJobs = (clientId: number) => {
  return useQuery({
    queryKey: ["client-jobs", clientId],
    queryFn: async () => {
      const response = await fetch(`/api/jobs?clientId=${clientId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch client jobs");
      }
      return response.json() as Promise<Job[]>;
    },
    enabled: !!clientId,
  });
};
