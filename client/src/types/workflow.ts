export interface WorkflowTemplate {
  id: string;
  name: string;
  type: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface WorkflowStage {
  id: string;
  template_id: string;
  name: string;
  order: number;
  color?: string;
  is_final_stage: boolean;
}

export interface Workflow {
  id: string;
  name: string;
  template_id: string;
  client_id: string;
  current_stage_id: string;
  status: string;
  period?: string;
  period_start_date?: string;
  period_end_date?: string;
  service_type?: string;
  due_date?: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowWithDetails extends Workflow {
  clients?: { name: string; id: string };
  workflow_stages?: WorkflowStage;
  assigned_to_user?: { full_name: string; avatar_url: string | null };
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

export interface StageTransitionInput {
  workflow_id: string;
  new_stage_id: string;
  notes?: string;
}
