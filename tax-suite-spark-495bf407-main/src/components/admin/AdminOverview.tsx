import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuditLogStats } from "@/hooks/useAuditLogs";
import { Activity, TrendingUp, FileText, Users } from "lucide-react";

export const AdminOverview = () => {
  const { data: stats, isLoading } = useAuditLogStats();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last 24 Hours</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.last24h || 0}</div>
            <p className="text-xs text-muted-foreground">Total actions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last 7 Days</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.last7d || 0}</div>
            <p className="text-xs text-muted-foreground">Total actions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last 30 Days</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.last30d || 0}</div>
            <p className="text-xs text-muted-foreground">Total actions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">All Time</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">Total logs</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Actions Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats?.byAction &&
                Object.entries(stats.byAction).map(([action, count]) => (
                  <div key={action} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{action}</span>
                    <span className="text-sm font-medium">{count as number}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Entity Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats?.byEntity &&
                Object.entries(stats.byEntity).map(([entity, count]) => (
                  <div key={entity} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground capitalize">
                      {entity}
                    </span>
                    <span className="text-sm font-medium">{count as number}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
