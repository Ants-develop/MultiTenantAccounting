import React from "react";
import { Activity } from "./ActivityFeed";
import { User, CheckCircle2, Edit, Plus, Trash2, ArrowRight } from "lucide-react";
import dayjs from "dayjs";

interface ActivityItemProps {
  activity: Activity;
}

const actionIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  created: Plus,
  updated: Edit,
  deleted: Trash2,
  completed: CheckCircle2,
  assigned: User,
  moved: ArrowRight,
};

const actionColors: Record<string, string> = {
  created: "text-green-600 bg-green-50",
  updated: "text-blue-600 bg-blue-50",
  deleted: "text-red-600 bg-red-50",
  completed: "text-green-600 bg-green-50",
  assigned: "text-purple-600 bg-purple-50",
  moved: "text-orange-600 bg-orange-50",
};

export const ActivityItem: React.FC<ActivityItemProps> = ({ activity }) => {
  const actionType = activity.actionType.split(".")[1] || activity.actionType;
  const Icon = actionIcons[actionType] || Edit;
  const colorClass = actionColors[actionType] || "text-gray-600 bg-gray-50";

  const getActionDescription = () => {
    const target = activity.targetType;
    const action = actionType;
    return `${action} ${target}`;
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-gray-900">
            {activity.userName || `User #${activity.userId}`}
          </span>
          <span className="text-sm text-gray-600">{getActionDescription()}</span>
        </div>
        {activity.payload && Object.keys(activity.payload).length > 0 && (
          <div className="text-xs text-gray-500 mt-1">
            {JSON.stringify(activity.payload, null, 2)}
          </div>
        )}
        <span className="text-xs text-gray-400 mt-1 block">
          {dayjs(activity.timestamp).format("h:mm A")}
        </span>
      </div>
    </div>
  );
};

