-- Add scheduling fields to task_templates table for automatic task creation

-- Add schedule_enabled boolean field
ALTER TABLE tasks.task_templates 
ADD COLUMN IF NOT EXISTS schedule_enabled BOOLEAN DEFAULT FALSE;

-- Add schedule_config jsonb field for storing scheduling configuration
ALTER TABLE tasks.task_templates 
ADD COLUMN IF NOT EXISTS schedule_config JSONB DEFAULT '{}'::jsonb;

-- Add index for schedule_enabled to quickly find enabled templates
CREATE INDEX IF NOT EXISTS idx_task_templates_schedule_enabled ON tasks.task_templates(schedule_enabled) 
WHERE schedule_enabled = TRUE;

-- Add comment explaining the schedule_config structure
COMMENT ON COLUMN tasks.task_templates.schedule_config IS 'Scheduling configuration JSON:
{
  "cronExpression": "0 9 * * 1",  // Cron expression (e.g., every Monday at 9 AM)
  "timezone": "Asia/Tbilisi",      // Timezone for schedule execution
  "perClient": true,               // Whether schedule differs per client
  "perUser": true,                 // Whether assignment differs per user
  "clientSchedules": {             // Per-client schedules (if perClient is true)
    "1": {
      "cronExpression": "0 9 * * 1",
      "assignedTo": 5
    }
  },
  "lastRunAt": "2024-01-15T09:00:00Z",  // Last execution timestamp
  "nextRunAt": "2024-01-22T09:00:00Z"   // Next scheduled execution timestamp
}';

