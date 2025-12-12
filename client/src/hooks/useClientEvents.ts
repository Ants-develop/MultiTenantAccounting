import { useQuery } from "@tanstack/react-query";

export interface Event {
  id: number;
  title: string;
  start: string;
  end: string;
  description?: string;
  isAllDay: boolean;
  location?: string;
}

export const useClientEvents = (clientId: number) => {
  return useQuery({
    queryKey: ["client-events", clientId],
    queryFn: async () => {
      const response = await fetch(`/api/calendar/events?clientId=${clientId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch client events");
      }
      return response.json() as Promise<Event[]>;
    },
    enabled: !!clientId,
  });
};
