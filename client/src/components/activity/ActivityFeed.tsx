import React from "react";
import { TaxDomeCard } from "@/components/taxdome";
import { ActivityItem } from "./ActivityItem";
import dayjs from "dayjs";

export interface Activity {
  id: number;
  actionType: string;
  targetType: string;
  targetId: number;
  userId?: number;
  userName?: string;
  timestamp: Date;
  payload?: Record<string, any>;
}

interface ActivityFeedProps {
  activities: Activity[];
  isLoading?: boolean;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities, isLoading }) => {
  if (isLoading) {
    return (
      <TaxDomeCard>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading activity...</p>
        </div>
      </TaxDomeCard>
    );
  }

  if (activities.length === 0) {
    return (
      <TaxDomeCard>
        <div className="text-center py-8 text-gray-500 text-sm">
          No activity yet
        </div>
      </TaxDomeCard>
    );
  }

  // Group activities by date
  const groupedActivities = activities.reduce((acc, activity) => {
    const date = dayjs(activity.timestamp).format("YYYY-MM-DD");
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(activity);
    return acc;
  }, {} as Record<string, Activity[]>);

  return (
    <TaxDomeCard>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity Feed</h2>
      <div className="space-y-6">
        {Object.entries(groupedActivities).map(([date, dateActivities]) => (
          <div key={date}>
            <div className="text-xs font-medium text-gray-500 uppercase mb-2">
              {dayjs(date).format("MMMM D, YYYY")}
            </div>
            <div className="space-y-2">
              {dateActivities.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </TaxDomeCard>
  );
};

