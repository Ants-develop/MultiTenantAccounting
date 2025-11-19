import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDeals } from "@/hooks/useDeals";
import { useDealStages } from "@/hooks/useDealStages";
import { useDealMutations } from "@/hooks/useDealMutations";
import { DealCard } from "./DealCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Deal } from "@/types/crm";
import { Loader2 } from "lucide-react";

interface DealsKanbanProps {
  onDealClick: (deal: Deal) => void;
  filters?: any;
}

export const DealsKanban = ({ onDealClick, filters }: DealsKanbanProps) => {
  const { data: deals, isLoading: dealsLoading } = useDeals(filters);
  const { data: stages, isLoading: stagesLoading } = useDealStages();
  const { updateDeal } = useDealMutations();
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const deal = deals?.find((d) => d.id === event.active.id);
    if (deal) {
      setActiveDeal(deal);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDeal(null);

    if (!over || active.id === over.id) return;

    const dealId = active.id as string;
    const newStageId = over.id as string;

    // Check if we're dropping on a stage
    const isStage = stages?.some((s) => s.id === newStageId);
    if (isStage) {
      updateDeal.mutate({
        id: dealId,
        updates: { stage_id: newStageId },
      });
    }
  };

  if (dealsLoading || stagesLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getDealsByStage = (stageId: string) => {
    return deals?.filter((deal) => deal.stage_id === stageId) || [];
  };

  const calculateStageValue = (stageId: string) => {
    const stageDeals = getDealsByStage(stageId);
    return stageDeals.reduce((sum, deal) => sum + (deal.deal_value || 0), 0);
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 h-[calc(100vh-12rem)] overflow-x-auto pb-4">
        {stages?.map((stage) => {
          const stageDeals = getDealsByStage(stage.id);
          const stageValue = calculateStageValue(stage.id);

          return (
            <SortableContext
              key={stage.id}
              id={stage.id}
              items={stageDeals.map((d) => d.id)}
              strategy={verticalListSortingStrategy}
            >
              <Card className="flex-shrink-0 w-80 flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: stage.color || "#3b82f6" }}
                      />
                      {stage.name}
                    </CardTitle>
                    <Badge variant="secondary">{stageDeals.length}</Badge>
                  </div>
                  {stageValue > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                      }).format(stageValue)}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="flex-1 pt-0">
                  <ScrollArea className="h-full pr-4">
                    <div className="space-y-3">
                      {stageDeals.map((deal) => (
                        <DealCard
                          key={deal.id}
                          deal={deal}
                          onClick={() => onDealClick(deal)}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </SortableContext>
          );
        })}
      </div>

      <DragOverlay>
        {activeDeal ? (
          <div className="w-80">
            <DealCard deal={activeDeal} onClick={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
