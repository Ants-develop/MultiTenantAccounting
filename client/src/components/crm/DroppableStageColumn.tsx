import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

interface DroppableStageColumnProps {
  stageId: string;
  children: React.ReactNode;
}

export const DroppableStageColumn = ({ 
  stageId, 
  children 
}: DroppableStageColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: stageId,
  });

  return (
    <div 
      ref={setNodeRef} 
      className={cn(
        "flex-1 transition-colors rounded-lg",
        isOver && "bg-accent/50"
      )}
    >
      {children}
    </div>
  );
};
