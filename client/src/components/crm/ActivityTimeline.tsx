import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

const getActivityTypeColor = (type: string) => {
  switch (type) {
    case "call":
      return "bg-blue-500/10 text-blue-700 dark:text-blue-300";
    case "email":
      return "bg-purple-500/10 text-purple-700 dark:text-purple-300";
    case "meeting":
      return "bg-green-500/10 text-green-700 dark:text-green-300";
    case "task":
      return "bg-orange-500/10 text-orange-700 dark:text-orange-300";
    case "stage_change":
      return "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300";
    default:
      return "bg-gray-500/10 text-gray-700 dark:text-gray-300";
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
                            <Badge 
                              variant="outline" 
                              className={`capitalize ${getActivityTypeColor(activity.activity_type)}`}
                            >
                              {activity.activity_type.replace("_", " ")}
                            </Badge>
                            {activity.due_date && (
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(activity.due_date), "MMM d, yyyy")}
                              </span>
                            )}
                          </div>
                          {activity.subject && (
                            <p className="font-medium text-sm mb-1">
                              {activity.subject}
                            </p>
                          )}
                          {activity.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {activity.description}
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          {activity.profiles && (
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {activity.profiles.full_name?.[0] || "U"}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        {activity.created_at && format(new Date(activity.created_at), "MMM d, h:mm a")}
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
