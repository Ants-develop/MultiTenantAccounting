import React from "react";
import { useClientJobs } from "@/hooks/useClientJobs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Briefcase, Calendar } from "lucide-react";

interface ClientJobsProps {
  clientId: number;
}

export const ClientJobs: React.FC<ClientJobsProps> = ({ clientId }) => {
  const { data: jobs, isLoading } = useClientJobs(clientId);

  if (isLoading) {
    return <div className="p-4 text-center text-muted-foreground">Loading jobs...</div>;
  }

  if (!jobs || jobs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/10">
        No active jobs found for this client.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <Card key={job.id} className="hover:bg-muted/50 transition-colors">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                <Briefcase className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h4 className="font-medium leading-none mb-1">{job.title}</h4>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {job.pipelineName && <span>{job.pipelineName}</span>}
                  {job.currentStage && (
                    <>
                      <span>•</span>
                      <span>{job.currentStage}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={job.status === "active" ? "default" : "secondary"} className="capitalize">
                {job.status.replace("_", " ")}
              </Badge>
              {job.dueDate && (
                <div className="flex items-center text-sm text-muted-foreground whitespace-nowrap">
                  <Calendar className="mr-1 h-3.5 w-3.5" />
                  {format(new Date(job.dueDate), "MMM d")}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
