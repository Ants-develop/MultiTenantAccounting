import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarEvent, CreateEventPayload } from "@/api/calendar";
import { TaxDomeInput, TaxDomeButton, TaxDomeModal } from "@/components/taxdome";
import dayjs from "dayjs";

const eventFormSchema = z.object({
  title: z.string().min(1, "Event title is required"),
  description: z.string().optional(),
  start: z.string().datetime(),
  end: z.string().datetime(),
  location: z.string().optional(),
  isAllDay: z.boolean().optional().default(false),
  createMatrixRoom: z.boolean().optional().default(false),
});

type EventFormValues = z.infer<typeof eventFormSchema>;

interface EventFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateEventPayload) => Promise<void>;
  onDelete?: () => Promise<void>;
  initialData?: CalendarEvent | null;
  initialDate?: Date | null;
  workspaceId: number;
}

export const EventForm: React.FC<EventFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  initialData,
  initialDate,
  workspaceId,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      description: "",
      start: "",
      end: "",
      location: "",
      isAllDay: false,
      createMatrixRoom: false,
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setValue("title", initialData.title);
        setValue("description", initialData.description || "");
        setValue("start", initialData.start ? new Date(initialData.start).toISOString().slice(0, 16) : "");
        setValue("end", initialData.end ? new Date(initialData.end).toISOString().slice(0, 16) : "");
        setValue("location", initialData.location || "");
        setValue("isAllDay", initialData.isAllDay || false);
      } else if (initialDate) {
        const start = dayjs(initialDate).startOf("hour");
        const end = start.add(1, "hour");
        setValue("start", start.format("YYYY-MM-DDTHH:mm"));
        setValue("end", end.format("YYYY-MM-DDTHH:mm"));
      }
    }
  }, [isOpen, initialData, initialDate, setValue]);

  const onFormSubmit = async (data: EventFormValues) => {
    try {
      await onSubmit({
        workspaceId,
        title: data.title,
        description: data.description,
        start: new Date(data.start).toISOString(),
        end: new Date(data.end).toISOString(),
        location: data.location,
        isAllDay: data.isAllDay,
        createMatrixRoom: data.createMatrixRoom,
      });
      reset();
      onClose();
    } catch (error) {
      console.error("Failed to submit event:", error);
    }
  };

  const isAllDay = watch("isAllDay");

  return (
    <TaxDomeModal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Event" : "Create Event"}
      size="md"
      footer={
        <>
          {onDelete && initialData && (
            <TaxDomeButton variant="danger" onClick={onDelete} disabled={isSubmitting}>
              Delete
            </TaxDomeButton>
          )}
          <TaxDomeButton variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </TaxDomeButton>
          <TaxDomeButton variant="primary" onClick={handleSubmit(onFormSubmit)} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : initialData ? "Update" : "Create"}
          </TaxDomeButton>
        </>
      }
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        <TaxDomeInput
          label="Event Title"
          {...register("title")}
          error={errors.title?.message}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Description
          </label>
          <textarea
            {...register("description")}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isAllDay"
            {...register("isAllDay")}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded"
          />
          <label htmlFor="isAllDay" className="text-sm text-gray-700">
            All-day event
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <TaxDomeInput
            label="Start"
            type={isAllDay ? "date" : "datetime-local"}
            {...register("start")}
            error={errors.start?.message}
          />
          <TaxDomeInput
            label="End"
            type={isAllDay ? "date" : "datetime-local"}
            {...register("end")}
            error={errors.end?.message}
          />
        </div>

        <TaxDomeInput
          label="Location"
          {...register("location")}
          error={errors.location?.message}
        />

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="createMatrixRoom"
            {...register("createMatrixRoom")}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded"
          />
          <label htmlFor="createMatrixRoom" className="text-sm text-gray-700">
            Create Matrix chat room for this event
          </label>
        </div>
      </form>
    </TaxDomeModal>
  );
};

