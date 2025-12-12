import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RecurrencePattern {
  type: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  daysOfWeek?: number[]; // 0-6
  dayOfMonth?: number;
  monthOfYear?: number;
}

interface RecurrenceSettingsProps {
  value?: RecurrencePattern;
  endDate?: string;
  onChange: (pattern: RecurrencePattern | undefined, endDate: string | undefined) => void;
}

export const RecurrenceSettings: React.FC<RecurrenceSettingsProps> = ({
  value,
  endDate,
  onChange,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [type, setType] = React.useState<RecurrencePattern["type"]>(value?.type || "weekly");
  const [interval, setInterval] = React.useState(value?.interval || 1);
  const [end, setEnd] = React.useState<Date | undefined>(endDate ? new Date(endDate) : undefined);

  const handleSave = () => {
    onChange({ type, interval }, end?.toISOString());
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(undefined, undefined);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground")}>
          <Repeat className="mr-2 h-4 w-4" />
          {value ? (
            <span>
              Repeats {value.type} (every {value.interval})
              {endDate && ` until ${format(new Date(endDate), "MMM d, yyyy")}`}
            </span>
          ) : (
            <span>Set Recurrence</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Recurrence</h4>
            <p className="text-sm text-muted-foreground">
              Set schedule for repeating tasks.
            </p>
          </div>
          <div className="grid gap-2">
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="type">Repeat</Label>
              <Select value={type} onValueChange={(v: any) => setType(v)}>
                <SelectTrigger className="col-span-2 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="interval">Every</Label>
              <div className="col-span-2 flex items-center gap-2">
                <Input
                  id="interval"
                  type="number"
                  min={1}
                  className="h-8"
                  value={interval}
                  onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
                />
                <span className="text-sm text-muted-foreground">
                  {type === "daily" ? "days" : type === "weekly" ? "weeks" : type === "monthly" ? "months" : "years"}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "col-span-2 h-8 justify-start text-left font-normal",
                      !end && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {end ? format(end, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={end}
                    onSelect={setEnd}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" size="sm" onClick={handleClear}>
              Clear
            </Button>
            <Button size="sm" onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
