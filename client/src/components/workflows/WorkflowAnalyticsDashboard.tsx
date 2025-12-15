import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWorkflowAnalytics } from "@/hooks/useWorkflowAnalytics";
import { Loader2, TrendingUp, CheckCircle2, Clock, AlertTriangle, Users, BarChart3 } from "lucide-react";

export const WorkflowAnalyticsDashboard = () => {
  const { data: analytics, isLoading } = useWorkflowAnalytics();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No analytics data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{analytics.total_jobs}</div>
                <p className="text-xs text-muted-foreground">Total Jobs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{analytics.completed_jobs}</div>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-100">
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{analytics.active_jobs}</div>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-red-100">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{analytics.overdue_jobs}</div>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <div className="text-2xl font-bold">
                {analytics.total_jobs > 0
                  ? Math.round((analytics.completed_jobs / analytics.total_jobs) * 100)
                  : 0}
                %
              </div>
              <p className="text-xs text-muted-foreground">Completion Rate</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <div className="text-2xl font-bold">{analytics.by_stage?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Active Stages</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Jobs by Stage */}
      {analytics.by_stage && analytics.by_stage.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Jobs by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.by_stage.map((stage: any) => (
                <div key={stage.stage_id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: stage.stage_color || "#64748b" }}
                    />
                    <span className="font-medium">{stage.stage_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{stage.count} jobs</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Jobs by Service Type */}
      {analytics.by_service_type && analytics.by_service_type.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Jobs by Service Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.by_service_type.map((item: any) => (
                <div key={item.service_type}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium capitalize">
                      {item.service_type.replace(/_/g, " ")}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {item.count} jobs ({Math.round((item.count / analytics.total_jobs) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${(item.count / analytics.total_jobs) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team Workload */}
      {analytics.by_assignee && analytics.by_assignee.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Workload
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.by_assignee.map((member: any) => (
                <div key={member.user_id}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{member.user_name || "Unassigned"}</span>
                    <span className="text-sm text-muted-foreground">{member.count} jobs</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        member.count > 10
                          ? "bg-red-500"
                          : member.count > 5
                          ? "bg-yellow-500"
                          : "bg-green-500"
                      }`}
                      style={{ width: `${Math.min((member.count / 15) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
