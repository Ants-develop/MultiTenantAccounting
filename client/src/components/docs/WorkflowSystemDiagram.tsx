import { ArrowRight, ArrowDown, Briefcase, CheckSquare, FileText, Play, Repeat, Users } from "lucide-react";

export const WorkflowSystemDiagram = () => {
  return (
    <div className="space-y-8">
      {/* Workflow Hierarchy */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-4">Workflow Hierarchy</h4>
        <div className="flex flex-col lg:flex-row items-start justify-center gap-4 p-6 bg-muted/30 rounded-xl overflow-x-auto">
          {/* Template */}
          <div className="flex flex-col items-center p-4 bg-background rounded-xl border shadow-sm min-w-[160px]">
            <FileText className="h-8 w-8 text-purple-500 mb-2" />
            <h5 className="font-semibold text-sm">Template</h5>
            <p className="text-xs text-muted-foreground text-center mt-1">Global blueprint</p>
            <div className="mt-2 text-[10px] text-muted-foreground">
              <p>workflow_templates</p>
              <p>workflow_stages</p>
              <p>task_templates</p>
            </div>
          </div>

          <ArrowRight className="h-6 w-6 text-muted-foreground self-center hidden lg:block" />
          <ArrowDown className="h-6 w-6 text-muted-foreground self-center lg:hidden" />

          {/* Service */}
          <div className="flex flex-col items-center p-4 bg-background rounded-xl border shadow-sm min-w-[160px]">
            <Repeat className="h-8 w-8 text-blue-500 mb-2" />
            <h5 className="font-semibold text-sm">Service</h5>
            <p className="text-xs text-muted-foreground text-center mt-1">Client subscription</p>
            <div className="mt-2 text-[10px] text-muted-foreground">
              <p>client_services</p>
              <p>frequency: monthly/quarterly</p>
            </div>
          </div>

          <ArrowRight className="h-6 w-6 text-muted-foreground self-center hidden lg:block" />
          <ArrowDown className="h-6 w-6 text-muted-foreground self-center lg:hidden" />

          {/* Client Pipeline */}
          <div className="flex flex-col items-center p-4 bg-background rounded-xl border shadow-sm min-w-[160px]">
            <Users className="h-8 w-8 text-green-500 mb-2" />
            <h5 className="font-semibold text-sm">Client Pipeline</h5>
            <p className="text-xs text-muted-foreground text-center mt-1">Customized copy</p>
            <div className="mt-2 text-[10px] text-muted-foreground">
              <p>client_pipelines</p>
              <p>client_pipeline_stages</p>
              <p>client_task_templates</p>
            </div>
          </div>

          <ArrowRight className="h-6 w-6 text-muted-foreground self-center hidden lg:block" />
          <ArrowDown className="h-6 w-6 text-muted-foreground self-center lg:hidden" />

          {/* Job */}
          <div className="flex flex-col items-center p-4 bg-background rounded-xl border shadow-sm min-w-[160px]">
            <Briefcase className="h-8 w-8 text-orange-500 mb-2" />
            <h5 className="font-semibold text-sm">Job</h5>
            <p className="text-xs text-muted-foreground text-center mt-1">Single execution</p>
            <div className="mt-2 text-[10px] text-muted-foreground">
              <p>workflows (job instance)</p>
              <p>current_stage_id</p>
              <p>status: active/completed</p>
            </div>
          </div>

          <ArrowRight className="h-6 w-6 text-muted-foreground self-center hidden lg:block" />
          <ArrowDown className="h-6 w-6 text-muted-foreground self-center lg:hidden" />

          {/* Task */}
          <div className="flex flex-col items-center p-4 bg-background rounded-xl border shadow-sm min-w-[160px]">
            <CheckSquare className="h-8 w-8 text-emerald-500 mb-2" />
            <h5 className="font-semibold text-sm">Task</h5>
            <p className="text-xs text-muted-foreground text-center mt-1">Work item</p>
            <div className="mt-2 text-[10px] text-muted-foreground">
              <p>tasks</p>
              <p>workflow_id → job</p>
              <p>stage_id, assigned_to</p>
            </div>
          </div>
        </div>
      </div>

      {/* Automation Flow */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-4">Automation Flow</h4>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Play className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-700 dark:text-green-400">Stage Entry Automation</span>
            </div>
            <ul className="text-sm text-green-700/80 dark:text-green-400/80 space-y-1">
              <li>• Auto-create tasks from templates</li>
              <li>• Send notifications to assignees</li>
              <li>• Adjust due dates relative to entry</li>
            </ul>
          </div>
          
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckSquare className="h-4 w-4 text-amber-600" />
              <span className="font-medium text-amber-700 dark:text-amber-400">Stage Exit Validation</span>
            </div>
            <ul className="text-sm text-amber-700/80 dark:text-amber-400/80 space-y-1">
              <li>• Require all tasks complete (optional)</li>
              <li>• Block transition if incomplete</li>
              <li>• Or warn and allow override</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Stage Progression */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-4">Typical Stage Progression</h4>
        <div className="flex flex-wrap items-center gap-2 p-4 bg-muted/30 rounded-lg">
          <div className="px-3 py-1.5 bg-slate-500/20 text-slate-700 dark:text-slate-300 rounded-full text-sm">
            Planned
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className="px-3 py-1.5 bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-full text-sm">
            Waiting for Documents
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className="px-3 py-1.5 bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded-full text-sm">
            In Progress
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className="px-3 py-1.5 bg-purple-500/20 text-purple-700 dark:text-purple-300 rounded-full text-sm">
            Manager Review
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className="px-3 py-1.5 bg-green-500/20 text-green-700 dark:text-green-300 rounded-full text-sm">
            Completed
          </div>
        </div>
      </div>

      {/* Recurring Jobs */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-4">Recurring Job Creation</h4>
        <div className="p-4 border rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Repeat className="h-5 w-5 text-primary" />
            <span className="font-medium">Recurrence Settings</span>
          </div>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">Frequency Options</p>
              <ul className="text-xs space-y-1">
                <li>• Monthly (day of month)</li>
                <li>• Quarterly (months 3,6,9,12)</li>
                <li>• Annual (specific date)</li>
              </ul>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">End Conditions</p>
              <ul className="text-xs space-y-1">
                <li>• Never (runs indefinitely)</li>
                <li>• End date specified</li>
                <li>• Max iterations count</li>
              </ul>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Tracking</p>
              <ul className="text-xs space-y-1">
                <li>• last_job_created_at</li>
                <li>• iterations_completed</li>
                <li>• next_job_date calculated</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
