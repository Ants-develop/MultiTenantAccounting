import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Deal } from "@/types/crm";
import { DollarSign, Calendar, GripVertical } from "lucide-react";
import { format } from "date-fns";

interface DealCardProps {
  deal: Deal;
  onClick: () => void;
}

export const DealCard = ({ deal, onClick }: DealCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "won":
        return "bg-green-500/10 text-green-700 dark:text-green-400";
      case "lost":
        return "bg-red-500/10 text-red-700 dark:text-red-400";
      case "abandoned":
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
      default:
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
    }
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        className="p-4 cursor-pointer hover:shadow-md transition-shadow"
        onClick={onClick}
      >
        <div className="flex items-start gap-2">
          <button
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground mt-1"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-semibold text-sm truncate">{deal.name}</h3>
              <Badge variant="secondary" className={getStatusColor(deal.status)}>
                {deal.status}
              </Badge>
            </div>

            {deal.company_name && (
              <p className="text-xs text-muted-foreground mb-2">{deal.company_name}</p>
            )}

            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
              {deal.deal_value && (
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  <span>
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: deal.currency || "USD",
                    }).format(deal.deal_value)}
                  </span>
                </div>
              )}
              {deal.expected_close_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{format(new Date(deal.expected_close_date), "MMM d")}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {deal.profiles && (
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={deal.profiles.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {deal.profiles.full_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
              {deal.probability !== null && (
                <span className="text-xs text-muted-foreground">{deal.probability}%</span>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
