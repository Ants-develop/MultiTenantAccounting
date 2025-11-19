import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calendar as CalendarIcon, List, MapPin, Video, Clock, Users } from "lucide-react";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { startOfMonth, endOfMonth, addMonths, subMonths, format, isSameMonth, isSameDay, startOfWeek, endOfWeek } from "date-fns";

export default function Calendar() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<"month" | "list">("month");

    const startDate = startOfMonth(currentDate);
    const endDate = endOfMonth(currentDate);

    const { data: events = [], isLoading } = useCalendarEvents(startDate, endDate);

    const handlePreviousMonth = () => {
        setCurrentDate(subMonths(currentDate, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(addMonths(currentDate, 1));
    };

    const handleToday = () => {
        setCurrentDate(new Date());
    };

    const getEventTypeColor = (type: string) => {
        switch (type) {
            case "meeting":
                return "bg-blue-100 text-blue-800";
            case "deadline":
                return "bg-red-100 text-red-800";
            case "task":
                return "bg-yellow-100 text-yellow-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    // Generate calendar grid
    const generateCalendarDays = () => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        const calendarStart = startOfWeek(monthStart);
        const calendarEnd = endOfWeek(monthEnd);

        const days = [];
        let day = calendarStart;

        while (day <= calendarEnd) {
            days.push(day);
            day = new Date(day.getTime() + 86400000); // Add 1 day
        }

        return days;
    };

    const days = generateCalendarDays();

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage your meetings and events</p>
                </div>
                <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Event
                </Button>
            </div>

            {/* View Toggle */}
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "month" | "list")}>
                <div className="flex items-center justify-between">
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
                                {format(currentDate, 'MMMM yyyy')}
                            </span>
                        </div>
                    )}
                </div>

                {/* Month View */}
                <TabsContent value="month" className="mt-6">
                    <Card>
                        <CardContent className="p-0">
                            <div className="grid grid-cols-7 border-b">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                                    <div
                                        key={day}
                                        className="p-4 text-center text-sm font-medium text-gray-700 border-r last:border-r-0"
                                    >
                                        {day}
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7">
                                {days.map((day, index) => {
                                    const dayEvents = events.filter(event =>
                                        isSameDay(new Date(Number(event.start_time)), day)
                                    );
                                    const isCurrentMonth = isSameMonth(day, currentDate);
                                    const isToday = isSameDay(day, new Date());

                                    return (
                                        <div
                                            key={index}
                                            className={`min-h-[120px] p-2 border-r border-b last:border-r-0 ${!isCurrentMonth ? 'bg-gray-50' : ''
                                                } ${isToday ? 'bg-blue-50' : ''}`}
                                        >
                                            <div className={`text-sm font-medium mb-2 ${!isCurrentMonth ? 'text-gray-400' : isToday ? 'text-blue-600' : 'text-gray-900'
                                                }`}>
                                                {format(day, 'd')}
                                            </div>
                                            <div className="space-y-1">
                                                {dayEvents.map((event) => (
                                                    <div
                                                        key={event.id}
                                                        className="text-xs p-1 rounded truncate cursor-pointer hover:opacity-80"
                                                        style={{ backgroundColor: event.color + '20', color: event.color }}
                                                        title={event.title}
                                                    >
                                                        {!event.all_day && format(new Date(Number(event.start_time)), 'HH:mm')} {event.title}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* List View */}
                <TabsContent value="list" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Upcoming Events</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="text-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                                </div>
                            ) : events.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    No events scheduled
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {events.map((event) => (
                                        <div
                                            key={event.id}
                                            className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                                        >
                                            <div
                                                className="w-1 h-full rounded-full"
                                                style={{ backgroundColor: event.color }}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-4 mb-2">
                                                    <div>
                                                        <h3 className="font-medium text-gray-900">{event.title}</h3>
                                                        <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                                                    </div>
                                                    <Badge className={getEventTypeColor(event.event_type)}>
                                                        {event.event_type}
                                                    </Badge>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="w-4 h-4" />
                                                        {event.all_day
                                                            ? format(new Date(Number(event.start_time)), 'MMM d, yyyy') + ' (All day)'
                                                            : `${format(new Date(Number(event.start_time)), 'MMM d, h:mm a')} - ${format(new Date(Number(event.end_time)), 'h:mm a')}`
                                                        }
                                                    </div>
                                                    {event.location && (
                                                        <div className="flex items-center gap-1">
                                                            <MapPin className="w-4 h-4" />
                                                            {event.location}
                                                        </div>
                                                    )}
                                                    {event.meeting_link && (
                                                        <div className="flex items-center gap-1">
                                                            <Video className="w-4 h-4" />
                                                            <a href={event.meeting_link} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                                                                Join Meeting
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
