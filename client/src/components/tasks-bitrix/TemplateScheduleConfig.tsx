// Template Schedule Configuration Component
// Provides UI for configuring automatic task creation schedules

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, Globe, Users, User, Plus, Trash2 } from "lucide-react";
import { tasksBitrixApi } from "@/api/tasks-bitrix";

interface ScheduleConfig {
  cronExpression?: string;
  timezone?: string;
  perClient?: boolean;
  perUser?: boolean;
  clientSchedules?: Record<string, {
    cronExpression: string;
    assignedTo?: number;
  }>;
  lastRunAt?: string;
  nextRunAt?: string;
}

interface TemplateScheduleConfigProps {
  templateId: number;
  scheduleEnabled: boolean;
  scheduleConfig: ScheduleConfig;
  onUpdate: (enabled: boolean, config: ScheduleConfig) => Promise<void>;
  availableClients?: Array<{ id: number; name: string }>;
  availableUsers?: Array<{ id: number; name: string; email?: string }>;
}

// Common cron presets
const cronPresets = [
  { label: "Every Monday at 9 AM", value: "0 9 * * 1" },
  { label: "Every Tuesday at 9 AM", value: "0 9 * * 2" },
  { label: "Every Wednesday at 9 AM", value: "0 9 * * 3" },
  { label: "Every Thursday at 9 AM", value: "0 9 * * 4" },
  { label: "Every Friday at 9 AM", value: "0 9 * * 5" },
  { label: "1st of every month at 9 AM", value: "0 9 1 * *" },
  { label: "15th of every month at 9 AM", value: "0 9 15 * *" },
  { label: "Monday, Wednesday, Friday at 9 AM", value: "0 9 * * 1,3,5" },
  { label: "Every 6 hours", value: "0 */6 * * *" },
  { label: "January 1st at 9 AM (yearly)", value: "0 9 1 1 *" },
];

// Common timezones
const timezones = [
  { label: "UTC", value: "UTC" },
  { label: "Asia/Tbilisi", value: "Asia/Tbilisi" },
  { label: "America/New_York", value: "America/New_York" },
  { label: "Europe/London", value: "Europe/London" },
  { label: "Asia/Tokyo", value: "Asia/Tokyo" },
];

export function TemplateScheduleConfig({
  templateId,
  scheduleEnabled: initialEnabled,
  scheduleConfig: initialConfig,
  onUpdate,
  availableClients = [],
  availableUsers = [],
}: TemplateScheduleConfigProps) {
  const [scheduleEnabled, setScheduleEnabled] = useState(initialEnabled);
  const [config, setConfig] = useState<ScheduleConfig>(initialConfig || {});
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [customCron, setCustomCron] = useState(config.cronExpression || "");
  const [timezone, setTimezone] = useState(config.timezone || "UTC");
  const [perClient, setPerClient] = useState(config.perClient || false);
  const [perUser, setPerUser] = useState(config.perUser || false);
  const [clientSchedules, setClientSchedules] = useState<Record<string, {
    cronExpression: string;
    assignedTo?: number;
  }>>(config.clientSchedules || {});
  const [nextRunPreview, setNextRunPreview] = useState<string>("");
  const [testing, setTesting] = useState(false);

  // Update cron expression when preset is selected
  useEffect(() => {
    if (selectedPreset) {
      const preset = cronPresets.find(p => p.value === selectedPreset);
      if (preset) {
        setCustomCron(preset.value);
        setSelectedPreset(""); // Reset to allow re-selection
      }
    }
  }, [selectedPreset]);

  // Test schedule when cron or timezone changes
  useEffect(() => {
    if (customCron && scheduleEnabled) {
      testSchedule();
    }
  }, [customCron, timezone, scheduleEnabled]);

  const testSchedule = async () => {
    if (!customCron) return;
    
    setTesting(true);
    try {
      const result = await tasksBitrixApi.testTemplateSchedule(templateId, customCron, timezone);
      setNextRunPreview(result.nextRunAtFormatted);
    } catch (error) {
      console.error("Error testing schedule:", error);
      setNextRunPreview("Invalid cron expression");
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    const newConfig: ScheduleConfig = {
      ...config,
      cronExpression: customCron,
      timezone,
      perClient,
      perUser,
      clientSchedules: perClient ? clientSchedules : undefined,
    };

    await onUpdate(scheduleEnabled, newConfig);
  };

  const addClientSchedule = () => {
    if (availableClients.length === 0) return;
    
    const firstClientId = availableClients[0].id.toString();
    setClientSchedules({
      ...clientSchedules,
      [firstClientId]: {
        cronExpression: customCron || "0 9 * * 1",
        assignedTo: undefined,
      },
    });
  };

  const removeClientSchedule = (clientId: string) => {
    const newSchedules = { ...clientSchedules };
    delete newSchedules[clientId];
    setClientSchedules(newSchedules);
  };

  const updateClientSchedule = (clientId: string, field: "cronExpression" | "assignedTo", value: string | number) => {
    setClientSchedules({
      ...clientSchedules,
      [clientId]: {
        ...clientSchedules[clientId],
        [field]: value,
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Automatic Scheduling
        </CardTitle>
        <CardDescription>
          Configure automatic task creation from this template
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="schedule-enabled">Enable Automatic Scheduling</Label>
            <p className="text-sm text-muted-foreground">
              Automatically create tasks from this template based on schedule
            </p>
          </div>
          <Switch
            id="schedule-enabled"
            checked={scheduleEnabled}
            onCheckedChange={setScheduleEnabled}
          />
        </div>

        {scheduleEnabled && (
          <>
            {/* Cron Expression */}
            <div className="space-y-2">
              <Label>Cron Expression</Label>
              <div className="flex gap-2">
                <Select value={selectedPreset} onValueChange={setSelectedPreset}>
                  <SelectTrigger className="w-[250px]">
                    <SelectValue placeholder="Select preset..." />
                  </SelectTrigger>
                  <SelectContent>
                    {cronPresets.map((preset) => (
                      <SelectItem key={preset.value} value={preset.value}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="0 9 * * 1 (minute hour day month weekday)"
                  value={customCron}
                  onChange={(e) => setCustomCron(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={testSchedule}
                  disabled={testing || !customCron}
                >
                  Test
                </Button>
              </div>
              {nextRunPreview && (
                <p className="text-sm text-muted-foreground">
                  Next run: <Badge variant="outline">{nextRunPreview}</Badge>
                </p>
              )}
            </div>

            {/* Timezone */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Timezone
              </Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Per-Client Scheduling */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Per-Client Scheduling
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Configure different schedules for different clients
                  </p>
                </div>
                <Switch
                  checked={perClient}
                  onCheckedChange={setPerClient}
                />
              </div>

              {perClient && (
                <div className="space-y-3 border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <Label>Client-Specific Schedules</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addClientSchedule}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Client
                    </Button>
                  </div>

                  {Object.entries(clientSchedules).map(([clientId, schedule]) => {
                    const client = availableClients.find(c => c.id.toString() === clientId);
                    return (
                      <div key={clientId} className="flex gap-2 items-start border rounded p-3">
                        <div className="flex-1 space-y-2">
                          <Select
                            value={clientId}
                            onValueChange={(newClientId) => {
                              const newSchedules = { ...clientSchedules };
                              const schedule = newSchedules[clientId];
                              delete newSchedules[clientId];
                              newSchedules[newClientId] = schedule;
                              setClientSchedules(newSchedules);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {availableClients.map((c) => (
                                <SelectItem key={c.id} value={c.id.toString()}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            placeholder="Cron expression"
                            value={schedule.cronExpression}
                            onChange={(e) => updateClientSchedule(clientId, "cronExpression", e.target.value)}
                          />
                          {perUser && (
                            <Select
                              value={schedule.assignedTo?.toString() || ""}
                              onValueChange={(userId) => updateClientSchedule(clientId, "assignedTo", parseInt(userId))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Assign to user..." />
                              </SelectTrigger>
                              <SelectContent>
                                {availableUsers.map((u) => (
                                  <SelectItem key={u.id} value={u.id.toString()}>
                                    {u.name} {u.email && `(${u.email})`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeClientSchedule(clientId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Per-User Assignment */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Per-User Assignment
                </Label>
                <p className="text-sm text-muted-foreground">
                  Allow different user assignments per client
                </p>
              </div>
              <Switch
                checked={perUser}
                onCheckedChange={setPerUser}
              />
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setScheduleEnabled(initialEnabled);
                  setConfig(initialConfig || {});
                  setCustomCron(initialConfig?.cronExpression || "");
                  setTimezone(initialConfig?.timezone || "UTC");
                  setPerClient(initialConfig?.perClient || false);
                  setPerUser(initialConfig?.perUser || false);
                  setClientSchedules(initialConfig?.clientSchedules || {});
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSave}>
                Save Schedule
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

