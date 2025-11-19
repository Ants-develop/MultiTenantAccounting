import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Phone,
  Mail,
  Calendar,
  CheckSquare,
  ArrowRight,
  Plus,
} from "lucide-react";
import { DealActivity } from "@/types/crm";

interface ActivityTimelineProps {
  activities: DealActivity[];
  isLoading: boolean;
  onAddActivity: () => void;
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case "note":
      return FileText;
    case "call":
      return Phone;
    case "email":
      return Mail;
    case "meeting":
      return Calendar;
    case "task":
      return CheckSquare;
    case "stage_change":
      return ArrowRight;
    default:
      return FileText;
  }
};

export const ActivityTimeline = ({
  activities,
  isLoading,
  onAddActivity,
}: ActivityTimelineProps) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-6 w-32 bg-muted animate-pulse rounded" />
          <div className="h-9 w-32 bg-muted animate-pulse rounded" />
        </div>
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="h-20 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Activity Timeline</h3>
        <Button onClick={onAddActivity} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Activity
        </Button>
      </div>

      {activities.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No activities yet. Add your first activity to track this deal.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => {
            const Icon = getActivityIcon(activity.activity_type);
            return (
              <Card key={activity.id}>
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="capitalize">
                              {activity.activity_type.replace("_", " ")}
                            </Badge>
                            <h4 className="font-medium">{activity.subject}</h4>
                          </div>
                          {activity.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {activity.description}
                            </p>
                          )}
                          {activity.activity_type === "stage_change" &&
                            activity.old_stage &&
                            activity.new_stage && (
                              <div className="flex items-center gap-2 mt-2 text-sm">
                                <Badge
                                  style={{
                                    backgroundColor: activity.old_stage.color,
                                  }}
                                >
                                  {activity.old_stage.name}
                                </Badge>
                                <ArrowRight className="h-4 w-4" />
                                <Badge
                                  style={{
                                    backgroundColor: activity.new_stage.color,
                                  }}
                                >
                                  {activity.new_stage.name}
                                </Badge>
                              </div>
                            )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Avatar className="h-5 w-5">
                            <AvatarImage
                              src={activity.profiles?.avatar_url || undefined}
                            />
                            <AvatarFallback>
                              {activity.profiles?.full_name
                                ?.split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <span>{activity.profiles?.full_name}</span>
                        </div>
                        <span>•</span>
                        <span>
                          {format(
                            new Date(activity.created_at),
                            "MMM d, yyyy 'at' h:mm a"
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
