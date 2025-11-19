import { useState } from "react";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import { EventList } from "@/components/calendar/EventList";
import { CreateEventDialog } from "@/components/calendar/CreateEventDialog";
import { EventDetailsDialog } from "@/components/calendar/EventDetailsDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calendar as CalendarIcon, List } from "lucide-react";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { CalendarEvent } from "@/hooks/useCalendarEvents";
import { startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "list">("month");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Calculate date range for current month
  const startDate = startOfMonth(currentDate);
  const endDate = endOfMonth(currentDate);

  const { events, isLoading } = useCalendarEvents(startDate, endDate);

  const handlePreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
  };

  const handleCloseEventDetails = () => {
    setSelectedEvent(null);
  };

  return (
    <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Calendar</h1>
            <p className="text-muted-foreground mt-1">
              Manage your meetings and events
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Event
          </Button>
        </div>

        {/* View Toggle */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "month" | "list")} className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="month" className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Month View
              </TabsTrigger>
              <TabsTrigger value="list" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                List View
              </TabsTrigger>
            </TabsList>

            {viewMode === "month" && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleToday}>
                  Today
                </Button>
                <Button variant="outline" size="sm" onClick={handlePreviousMonth}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" onClick={handleNextMonth}>
                  Next
                </Button>
                <span className="text-sm font-medium ml-2">
                  {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </span>
              </div>
            )}
          </div>

          <TabsContent value="month" className="flex-1 mt-0">
            <CalendarGrid
              events={events}
              currentDate={currentDate}
              onEventClick={handleEventClick}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="list" className="flex-1 mt-0">
            <EventList
              events={events}
              onEventClick={handleEventClick}
              isLoading={isLoading}
            />
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <CreateEventDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
        />

        {selectedEvent && (
          <EventDetailsDialog
            event={selectedEvent}
            open={!!selectedEvent}
            onOpenChange={(open) => !open && handleCloseEventDetails()}
          />
        )}
      </div>
  );
};

export default Calendar;
