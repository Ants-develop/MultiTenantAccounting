import { Database } from "@/integrations/supabase/types";

export type WorkflowTemplate = Database["public"]["Tables"]["workflow_templates"]["Row"];
export type WorkflowStage = Database["public"]["Tables"]["workflow_stages"]["Row"];
export type Workflow = Database["public"]["Tables"]["workflows"]["Row"];
export type ClientService = Database["public"]["Tables"]["client_services"]["Row"];
export type WorkflowStageHistory = Database["public"]["Tables"]["workflow_stage_history"]["Row"];
export type TaskTemplate = Database["public"]["Tables"]["task_templates"]["Row"];
export type WorkflowTemplateClient = Database["public"]["Tables"]["workflow_template_clients"]["Row"];

export interface WorkflowTemplateWithStages extends WorkflowTemplate {
  workflow_stages?: WorkflowStage[];
  workflow_template_clients?: Array<{
    client_id: string;
    clients?: { id: string; name: string };
  }>;
}

export interface WorkflowWithDetails extends Workflow {
  workflow_templates?: WorkflowTemplate;
  clients?: { name: string; id: string };
  workflow_stages?: WorkflowStage;
  profiles?: { full_name: string; avatar_url: string | null };
  assigned_to_user?: { full_name: string; avatar_url: string | null };
}

export interface ClientServiceWithTemplate extends ClientService {
  workflow_templates?: WorkflowTemplate;
  clients?: { name: string };
  assigned_to_user?: { full_name: string };
}

export interface WorkflowStageHistoryWithDetails extends WorkflowStageHistory {
  workflow_stages?: WorkflowStage;
  entered_by_user?: { full_name: string };
}

export interface WorkflowFilters {
  client_id?: string;
  period?: string;
  status?: string;
  service_type?: string;
  assigned_to?: string;
  current_stage_id?: string;
  template_id?: string;
  search?: string;
}

export interface CreateWorkflowInput {
  name: string;
  template_id: string;
  client_id: string;
  period?: string;
  period_start_date?: string;
  period_end_date?: string;
  service_type?: string;
  due_date?: string;
  assigned_to?: string;
}

export interface UpdateWorkflowInput {
  name?: string;
  period?: string;
  period_start_date?: string;
  period_end_date?: string;
  due_date?: string;
  assigned_to?: string;
  status?: string;
}

export interface CreateClientServiceInput {
  client_id: string;
  service_type: string;
  workflow_template_id: string;
  frequency?: string;
  start_date: string;
  end_date?: string;
  assigned_to?: string;
  notes?: string;
}

export interface UpdateClientServiceInput {
  frequency?: string;
  end_date?: string;
  assigned_to?: string;
  notes?: string;
  is_active?: boolean;
}

export interface StageTransitionInput {
  workflow_id: string;
  new_stage_id: string;
  notes?: string;
}

export interface WorkflowProgress {
  total_tasks: number;
  completed_tasks: number;
  progress_percentage: number;
  current_stage_name: string;
  days_in_current_stage: number;
}

export interface WorkflowAnalytics {
  total_jobs: number;
  completed_jobs: number;
  in_progress_jobs: number;
  overdue_jobs: number;
  avg_completion_days: number;
  completion_rate: number;
  jobs_by_stage: { stage_name: string; count: number }[];
  jobs_by_service_type: { service_type: string; count: number }[];
  bottleneck_stages: { stage_name: string; avg_duration_days: number }[];
}

export type WorkflowFrequency = "monthly" | "quarterly" | "annual" | "one_time";
export type WorkflowServiceType = "monthly_bookkeeping" | "vat_return" | "payroll" | "annual_financials";
