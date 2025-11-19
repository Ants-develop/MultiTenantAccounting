export interface AuditLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  changes_summary: string | null;
  ip_address: string | null;
  user_agent: string | null;
  request_path: string | null;
  created_at: string;
  metadata: Record<string, any>;
}

export interface AuditLogFilters {
  user_id?: string;
  action?: string;
  entity_type?: string;
  search?: string;
  from_date?: string;
  to_date?: string;
}

export interface AuditLogPagination {
  page: number;
  pageSize: number;
  sortBy: 'created_at' | 'action' | 'entity_type' | 'user_name';
  sortOrder: 'asc' | 'desc';
}
