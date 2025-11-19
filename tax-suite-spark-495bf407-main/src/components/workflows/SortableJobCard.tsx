import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { JobCard } from "./JobCard";
import { WorkflowWithDetails } from "@/types/workflow";

interface SortableJobCardProps {
  job: WorkflowWithDetails;
  onClick?: () => void;
}

export const SortableJobCard = ({ job, onClick }: SortableJobCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: job.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <JobCard job={job} onClick={onClick} isDragging={isDragging} />
    </div>
  );
};
