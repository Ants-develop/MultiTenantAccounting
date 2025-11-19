import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { Activity, FileText, Users, Calendar } from "lucide-react";

interface UserActivityCardProps {
  userId: string;
  userName: string;
}

export const UserActivityCard = ({ userId, userName }: UserActivityCardProps) => {
  const { data: activities, isLoading } = useQuery({
    queryKey: ["user-activity", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["user-stats", userId],
    queryFn: async () => {
      const { count: totalActions } = await supabase
        .from("audit_logs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      return {
        totalActions: totalActions || 0,
      };
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity - {userName}
        </CardTitle>
        <CardDescription>Last 10 actions performed by this user</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{stats?.totalActions || 0}</p>
                  <p className="text-xs text-muted-foreground">Total Actions</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {activities?.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No recent activity
                </p>
              ) : (
                activities?.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors"
                  >
                    <Calendar className="h-4 w-4 text-muted-foreground mt-1" />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.entity_type} • {activity.entity_name || activity.entity_id}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
