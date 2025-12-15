export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      _migrations: {
        Row: {
          applied_at: string | null
          checksum: string
          execution_time_ms: number | null
          id: string
          name: string
          version: number
        }
        Insert: {
          applied_at?: string | null
          checksum: string
          execution_time_ms?: number | null
          id: string
          name: string
          version: number
        }
        Update: {
          applied_at?: string | null
          checksum?: string
          execution_time_ms?: number | null
          id?: string
          name?: string
          version?: number
        }
        Relationships: []
      }
      activity_logs: {
        Row: {
          action: string
          client_id: string | null
          details: string | null
          id: number
          ip_address: string | null
          resource: string
          resource_id: string | null
          timestamp: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          client_id?: string | null
          details?: string | null
          id?: number
          ip_address?: string | null
          resource: string
          resource_id?: string | null
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          client_id?: string | null
          details?: string | null
          id?: number
          ip_address?: string | null
          resource?: string
          resource_id?: string | null
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_client_id_clients_id_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_user_id_profiles_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_migration_logs: {
        Row: {
          created_at: string | null
          created_by: string | null
          error_log: string | null
          id: number
          migration_timestamp: string
          records_failed: number | null
          records_inserted: number | null
          records_processed: number | null
          restore_id: number | null
          source_table: string
          status: string
          target_table: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          error_log?: string | null
          id?: number
          migration_timestamp?: string
          records_failed?: number | null
          records_inserted?: number | null
          records_processed?: number | null
          restore_id?: number | null
          source_table: string
          status?: string
          target_table: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          error_log?: string | null
          id?: number
          migration_timestamp?: string
          records_failed?: number | null
          records_inserted?: number | null
          records_processed?: number | null
          restore_id?: number | null
          source_table?: string
          status?: string
          target_table?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "backup_migration_logs_created_by_profiles_id_fk"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backup_migration_logs_restore_id_mssql_restores_id_fk"
            columns: ["restore_id"]
            isOneToOne: false
            referencedRelation: "mssql_restores"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_name: string
          account_number: string | null
          bank_name: string | null
          client_id: string
          created_at: string | null
          currency: string
          current_balance: number | null
          iban: string | null
          id: number
          is_active: boolean | null
          is_default: boolean | null
          opening_balance: number | null
          updated_at: string | null
        }
        Insert: {
          account_name: string
          account_number?: string | null
          bank_name?: string | null
          client_id: string
          created_at?: string | null
          currency?: string
          current_balance?: number | null
          iban?: string | null
          id?: number
          is_active?: boolean | null
          is_default?: boolean | null
          opening_balance?: number | null
          updated_at?: string | null
        }
        Update: {
          account_name?: string
          account_number?: string | null
          bank_name?: string | null
          client_id?: string
          created_at?: string | null
          currency?: string
          current_balance?: number | null
          iban?: string | null
          id?: number
          is_active?: boolean | null
          is_default?: boolean | null
          opening_balance?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_client_id_clients_id_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_event_participants: {
        Row: {
          can_edit: boolean | null
          created_at: string | null
          event_id: string
          id: string
          is_organizer: boolean | null
          reminder_minutes: number | null
          response_at: string | null
          response_status: string | null
          user_id: string
        }
        Insert: {
          can_edit?: boolean | null
          created_at?: string | null
          event_id: string
          id?: string
          is_organizer?: boolean | null
          reminder_minutes?: number | null
          response_at?: string | null
          response_status?: string | null
          user_id: string
        }
        Update: {
          can_edit?: boolean | null
          created_at?: string | null
          event_id?: string
          id?: string
          is_organizer?: boolean | null
          reminder_minutes?: number | null
          response_at?: string | null
          response_status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_event_participants_event_id_calendar_events_id_fk"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_event_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_event_participants_user_id_profiles_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          client_id: string | null
          created_at: string | null
          description: string | null
          end_time: string
          event_type: string | null
          id: string
          is_all_day: boolean | null
          location: string | null
          metadata: Json | null
          organizer_id: string
          recurrence: Json | null
          start_time: string
          task_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          end_time: string
          event_type?: string | null
          id?: string
          is_all_day?: boolean | null
          location?: string | null
          metadata?: Json | null
          organizer_id: string
          recurrence?: Json | null
          start_time: string
          task_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          end_time?: string
          event_type?: string | null
          id?: string
          is_all_day?: boolean | null
          location?: string | null
          metadata?: Json | null
          organizer_id?: string
          recurrence?: Json | null
          start_time?: string
          task_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_client_id_clients_id_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_organizer_id_profiles_id_fk"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_task_id_tasks_id_fk"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      checklists: {
        Row: {
          created_at: string | null
          id: string
          items: Json
          task_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          items: Json
          task_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          items?: Json
          task_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklists_task_id_tasks_id_fk"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contacts: {
        Row: {
          client_id: string
          created_at: string | null
          created_by: string | null
          email: string | null
          id: string
          is_primary: boolean | null
          name: string
          notes: string | null
          phone: string | null
          position: string | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name?: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_id_clients_id_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_contacts_created_by_profiles_id_fk"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_pipeline_stages: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
          order: number
          pipeline_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          order: number
          pipeline_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          order?: number
          pipeline_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_pipeline_stages_pipeline_id_client_pipelines_id_fk"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "client_pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      client_pipelines: {
        Row: {
          client_id: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_pipelines_client_id_clients_id_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_services: {
        Row: {
          billing_frequency: string | null
          client_id: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          price: number | null
          service_name: string
          updated_at: string | null
        }
        Insert: {
          billing_frequency?: string | null
          client_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          price?: number | null
          service_name: string
          updated_at?: string | null
        }
        Update: {
          billing_frequency?: string | null
          client_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          price?: number | null
          service_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_services_client_id_clients_id_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_task_templates: {
        Row: {
          client_id: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          recurring_frequency: string | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          recurring_frequency?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          recurring_frequency?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_task_templates_client_id_clients_id_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_team_assignments: {
        Row: {
          client_id: string
          created_at: string | null
          id: string
          role: string | null
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          id?: string
          role?: string | null
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_team_assignments_client_id_clients_id_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_team_assignments_user_id_profiles_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          accounting_software: string | null
          address: string | null
          assigned_accountant_id: string | null
          assigned_owner_id: string | null
          assigned_reviewer_id: string | null
          business_type: string | null
          code: string
          communication_preferences: Json | null
          created_at: string | null
          currency: string | null
          email: string | null
          fiscal_year_start: number | null
          id: string
          id_code: string | null
          industry: string | null
          is_active: boolean | null
          last_portal_login: string | null
          manager: string | null
          name: string
          notes: string | null
          phone: string | null
          portal_access_token: string | null
          portal_enabled: boolean | null
          portal_invitation_accepted_at: string | null
          portal_invitation_sent_at: string | null
          status: string | null
          tax_id: string | null
          tenant_code: string | null
          updated_at: string | null
          verification_status: string | null
        }
        Insert: {
          accounting_software?: string | null
          address?: string | null
          assigned_accountant_id?: string | null
          assigned_owner_id?: string | null
          assigned_reviewer_id?: string | null
          business_type?: string | null
          code: string
          communication_preferences?: Json | null
          created_at?: string | null
          currency?: string | null
          email?: string | null
          fiscal_year_start?: number | null
          id?: string
          id_code?: string | null
          industry?: string | null
          is_active?: boolean | null
          last_portal_login?: string | null
          manager?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          portal_access_token?: string | null
          portal_enabled?: boolean | null
          portal_invitation_accepted_at?: string | null
          portal_invitation_sent_at?: string | null
          status?: string | null
          tax_id?: string | null
          tenant_code?: string | null
          updated_at?: string | null
          verification_status?: string | null
        }
        Update: {
          accounting_software?: string | null
          address?: string | null
          assigned_accountant_id?: string | null
          assigned_owner_id?: string | null
          assigned_reviewer_id?: string | null
          business_type?: string | null
          code?: string
          communication_preferences?: Json | null
          created_at?: string | null
          currency?: string | null
          email?: string | null
          fiscal_year_start?: number | null
          id?: string
          id_code?: string | null
          industry?: string | null
          is_active?: boolean | null
          last_portal_login?: string | null
          manager?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          portal_access_token?: string | null
          portal_enabled?: boolean | null
          portal_invitation_accepted_at?: string | null
          portal_invitation_sent_at?: string | null
          status?: string | null
          tax_id?: string | null
          tenant_code?: string | null
          updated_at?: string | null
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_assigned_accountant_id_profiles_id_fk"
            columns: ["assigned_accountant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_assigned_owner_id_profiles_id_fk"
            columns: ["assigned_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_assigned_reviewer_id_profiles_id_fk"
            columns: ["assigned_reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          allow_multiple_sessions: boolean | null
          auto_backup: boolean | null
          auto_numbering: boolean | null
          backup_frequency: string | null
          backup_location: string | null
          bank_connection: boolean | null
          bill_prefix: string | null
          client_id: string
          created_at: string | null
          date_format: string | null
          decimal_places: number | null
          email_notifications: boolean | null
          enable_two_factor: boolean | null
          id: number
          invoice_prefix: string | null
          invoice_reminders: boolean | null
          journal_prefix: string | null
          negative_format: string | null
          password_expire_days: number | null
          payment_alerts: boolean | null
          payment_gateway: boolean | null
          report_reminders: boolean | null
          reporting_tools: boolean | null
          require_password_change: boolean | null
          retention_days: number | null
          session_timeout: number | null
          system_updates: boolean | null
          tax_service: boolean | null
          time_zone: string | null
          updated_at: string | null
        }
        Insert: {
          allow_multiple_sessions?: boolean | null
          auto_backup?: boolean | null
          auto_numbering?: boolean | null
          backup_frequency?: string | null
          backup_location?: string | null
          bank_connection?: boolean | null
          bill_prefix?: string | null
          client_id: string
          created_at?: string | null
          date_format?: string | null
          decimal_places?: number | null
          email_notifications?: boolean | null
          enable_two_factor?: boolean | null
          id?: number
          invoice_prefix?: string | null
          invoice_reminders?: boolean | null
          journal_prefix?: string | null
          negative_format?: string | null
          password_expire_days?: number | null
          payment_alerts?: boolean | null
          payment_gateway?: boolean | null
          report_reminders?: boolean | null
          reporting_tools?: boolean | null
          require_password_change?: boolean | null
          retention_days?: number | null
          session_timeout?: number | null
          system_updates?: boolean | null
          tax_service?: boolean | null
          time_zone?: string | null
          updated_at?: string | null
        }
        Update: {
          allow_multiple_sessions?: boolean | null
          auto_backup?: boolean | null
          auto_numbering?: boolean | null
          backup_frequency?: string | null
          backup_location?: string | null
          bank_connection?: boolean | null
          bill_prefix?: string | null
          client_id?: string
          created_at?: string | null
          date_format?: string | null
          decimal_places?: number | null
          email_notifications?: boolean | null
          enable_two_factor?: boolean | null
          id?: number
          invoice_prefix?: string | null
          invoice_reminders?: boolean | null
          journal_prefix?: string | null
          negative_format?: string | null
          password_expire_days?: number | null
          payment_alerts?: boolean | null
          payment_gateway?: boolean | null
          report_reminders?: boolean | null
          reporting_tools?: boolean | null
          require_password_change?: boolean | null
          retention_days?: number | null
          session_timeout?: number | null
          system_updates?: boolean | null
          tax_service?: boolean | null
          time_zone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_settings_client_id_clients_id_fk"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      connection_profiles: {
        Row: {
          config: Json
          created_at: string
          created_by: string | null
          id: string
          is_default: boolean
          kind: string
          name: string
          updated_at: string
        }
        Insert: {
          config: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean
          kind: string
          name?: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean
          kind?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "connection_profiles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: number
          id: number
          is_muted: boolean
          joined_at: string
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: number
          id?: number
          is_muted?: boolean
          joined_at?: string
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: number
          id?: number
          is_muted?: boolean
          joined_at?: string
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_conversations_id_fk"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_profiles_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string
          id: number
          is_archived: boolean
          last_message_at: string | null
          title: string | null
          type: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by: string
          id?: number
          is_archived?: boolean
          last_message_at?: string | null
          title?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string
          id?: number
          is_archived?: boolean
          last_message_at?: string | null
          title?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_client_id_clients_id_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_created_by_profiles_id_fk"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_activities: {
        Row: {
          activity_type: string
          completed_at: string | null
          created_at: string | null
          deal_id: string
          description: string | null
          id: string
          scheduled_at: string | null
          subject: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          completed_at?: string | null
          created_at?: string | null
          deal_id: string
          description?: string | null
          id?: string
          scheduled_at?: string | null
          subject?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          completed_at?: string | null
          created_at?: string | null
          deal_id?: string
          description?: string | null
          id?: string
          scheduled_at?: string | null
          subject?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_activities_deal_id_deals_id_fk"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_activities_user_id_profiles_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_contacts: {
        Row: {
          contact_id: string
          created_at: string | null
          deal_id: string
          id: string
          role: string | null
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          deal_id: string
          id?: string
          role?: string | null
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          deal_id?: string
          id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_contacts_contact_id_client_contacts_id_fk"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "client_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_contacts_deal_id_deals_id_fk"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_stages: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
          order: number
          probability: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          order: number
          probability?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          order?: number
          probability?: number | null
        }
        Relationships: []
      }
      deals: {
        Row: {
          actual_close_date: string | null
          client_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          expected_close_date: string | null
          id: string
          metadata: Json | null
          owner_id: string | null
          priority: string | null
          stage_id: string | null
          status: string | null
          title: string
          updated_at: string | null
          value: number | null
        }
        Insert: {
          actual_close_date?: string | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          expected_close_date?: string | null
          id?: string
          metadata?: Json | null
          owner_id?: string | null
          priority?: string | null
          stage_id?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          value?: number | null
        }
        Update: {
          actual_close_date?: string | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          expected_close_date?: string | null
          id?: string
          metadata?: Json | null
          owner_id?: string | null
          priority?: string | null
          stage_id?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_client_id_clients_id_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_created_by_profiles_id_fk"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_owner_id_profiles_id_fk"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_stage_id_deal_stages_id_fk"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "deal_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          client_id: string | null
          created_at: string | null
          id: number
          name: string
          size: number | null
          type: string | null
          updated_at: string | null
          uploaded_by: string | null
          url: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          id?: number
          name: string
          size?: number | null
          type?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          url: string
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          id?: number
          name?: string
          size?: number | null
          type?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_client_id_clients_id_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_profiles_id_fk"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string | null
          id: string
          post_id: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string | null
          id?: string
          post_id: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string | null
          id?: string
          post_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feed_comments_author_id_profiles_id_fk"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_comments_post_id_feed_posts_id_fk"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_likes_post_id_feed_posts_id_fk"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_likes_user_id_profiles_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_posts: {
        Row: {
          attachments: Json | null
          author_id: string
          client_id: string | null
          comments_count: number | null
          content: string
          created_at: string | null
          id: string
          likes_count: number | null
          meta: Json | null
          type: string | null
          updated_at: string | null
          visibility: string | null
        }
        Insert: {
          attachments?: Json | null
          author_id: string
          client_id?: string | null
          comments_count?: number | null
          content: string
          created_at?: string | null
          id?: string
          likes_count?: number | null
          meta?: Json | null
          type?: string | null
          updated_at?: string | null
          visibility?: string | null
        }
        Update: {
          attachments?: Json | null
          author_id?: string
          client_id?: string | null
          comments_count?: number | null
          content?: string
          created_at?: string | null
          id?: string
          likes_count?: number | null
          meta?: Json | null
          type?: string | null
          updated_at?: string | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feed_posts_author_id_profiles_id_fk"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_posts_client_id_clients_id_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_profiles: {
        Row: {
          bio: string | null
          created_at: string | null
          followers_count: number | null
          following_count: number | null
          id: string
          posts_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          followers_count?: number | null
          following_count?: number | null
          id?: string
          posts_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          followers_count?: number | null
          following_count?: number | null
          id?: string
          posts_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_profiles_user_id_profiles_id_fk"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gdrive_downloads: {
        Row: {
          created_at: string | null
          created_by: string | null
          download_timestamp: string
          file_hash: string | null
          file_size_bytes: number | null
          filename: string
          gdrive_file_id: string
          id: number
          local_file_path: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          download_timestamp?: string
          file_hash?: string | null
          file_size_bytes?: number | null
          filename: string
          gdrive_file_id: string
          id?: number
          local_file_path: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          download_timestamp?: string
          file_hash?: string | null
          file_size_bytes?: number | null
          filename?: string
          gdrive_file_id?: string
          id?: number
          local_file_path?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gdrive_downloads_created_by_profiles_id_fk"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      main_company_settings: {
        Row: {
          address: string | null
          allow_multiple_sessions: boolean | null
          auto_backup: boolean | null
          auto_numbering: boolean | null
          backup_frequency: string | null
          backup_location: string | null
          bank_connection: boolean | null
          bill_prefix: string | null
          code: string
          created_at: string | null
          currency: string | null
          date_format: string | null
          decimal_places: number | null
          email: string | null
          email_notifications: boolean | null
          enable_two_factor: boolean | null
          fiscal_year_start: number | null
          id: number
          invoice_prefix: string | null
          invoice_reminders: boolean | null
          journal_prefix: string | null
          name: string
          negative_format: string | null
          password_expire_days: number | null
          payment_alerts: boolean | null
          payment_gateway: boolean | null
          phone: string | null
          report_reminders: boolean | null
          reporting_tools: boolean | null
          require_password_change: boolean | null
          retention_days: number | null
          session_timeout: number | null
          system_updates: boolean | null
          tax_id: string | null
          tax_service: boolean | null
          time_zone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          allow_multiple_sessions?: boolean | null
          auto_backup?: boolean | null
          auto_numbering?: boolean | null
          backup_frequency?: string | null
          backup_location?: string | null
          bank_connection?: boolean | null
          bill_prefix?: string | null
          code: string
          created_at?: string | null
          currency?: string | null
          date_format?: string | null
          decimal_places?: number | null
          email?: string | null
          email_notifications?: boolean | null
          enable_two_factor?: boolean | null
          fiscal_year_start?: number | null
          id?: number
          invoice_prefix?: string | null
          invoice_reminders?: boolean | null
          journal_prefix?: string | null
          name: string
          negative_format?: string | null
          password_expire_days?: number | null
          payment_alerts?: boolean | null
          payment_gateway?: boolean | null
          phone?: string | null
          report_reminders?: boolean | null
          reporting_tools?: boolean | null
          require_password_change?: boolean | null
          retention_days?: number | null
          session_timeout?: number | null
          system_updates?: boolean | null
          tax_id?: string | null
          tax_service?: boolean | null
          time_zone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          allow_multiple_sessions?: boolean | null
          auto_backup?: boolean | null
          auto_numbering?: boolean | null
          backup_frequency?: string | null
          backup_location?: string | null
          bank_connection?: boolean | null
          bill_prefix?: string | null
          code?: string
          created_at?: string | null
          currency?: string | null
          date_format?: string | null
          decimal_places?: number | null
          email?: string | null
          email_notifications?: boolean | null
          enable_two_factor?: boolean | null
          fiscal_year_start?: number | null
          id?: number
          invoice_prefix?: string | null
          invoice_reminders?: boolean | null
          journal_prefix?: string | null
          name?: string
          negative_format?: string | null
          password_expire_days?: number | null
          payment_alerts?: boolean | null
          payment_gateway?: boolean | null
          phone?: string | null
          report_reminders?: boolean | null
          reporting_tools?: boolean | null
          require_password_change?: boolean | null
          retention_days?: number | null
          session_timeout?: number | null
          system_updates?: boolean | null
          tax_id?: string | null
          tax_service?: boolean | null
          time_zone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: number
          created_at: string
          id: number
          is_deleted: boolean
          is_edited: boolean
          metadata: Json | null
          sender_id: string
          type: string
          updated_at: string
        }
        Insert: {
          content: string
          conversation_id: number
          created_at?: string
          id?: number
          is_deleted?: boolean
          is_edited?: boolean
          metadata?: Json | null
          sender_id: string
          type?: string
          updated_at?: string
        }
        Update: {
          content?: string
          conversation_id?: number
          created_at?: string
          id?: number
          is_deleted?: boolean
          is_edited?: boolean
          metadata?: Json | null
          sender_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_conversations_id_fk"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_profiles_id_fk"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      migration_errors: {
        Row: {
          created_at: string | null
          id: number
          message: string
          migration_id: string
          record_data: Json | null
          record_id: string | null
          stack: string | null
          timestamp: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          message: string
          migration_id: string
          record_data?: Json | null
          record_id?: string | null
          stack?: string | null
          timestamp?: string
        }
        Update: {
          created_at?: string | null
          id?: number
          message?: string
          migration_id?: string
          record_data?: Json | null
          record_id?: string | null
          stack?: string | null
          timestamp?: string
        }
        Relationships: []
      }
      migration_history: {
        Row: {
          batch_size: number | null
          created_at: string | null
          end_time: string | null
          error_count: number | null
          error_message: string | null
          id: number
          migration_id: string
          processed_records: number | null
          progress: number | null
          start_time: string
          status: string
          success_count: number | null
          table_name: string | null
          tenant_code: string | null
          total_records: number | null
          type: string
          updated_at: string | null
        }
        Insert: {
          batch_size?: number | null
          created_at?: string | null
          end_time?: string | null
          error_count?: number | null
          error_message?: string | null
          id?: number
          migration_id: string
          processed_records?: number | null
          progress?: number | null
          start_time: string
          status: string
          success_count?: number | null
          table_name?: string | null
          tenant_code?: string | null
          total_records?: number | null
          type: string
          updated_at?: string | null
        }
        Update: {
          batch_size?: number | null
          created_at?: string | null
          end_time?: string | null
          error_count?: number | null
          error_message?: string | null
          id?: number
          migration_id?: string
          processed_records?: number | null
          progress?: number | null
          start_time?: string
          status?: string
          success_count?: number | null
          table_name?: string | null
          tenant_code?: string | null
          total_records?: number | null
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      migration_logs: {
        Row: {
          context: Json | null
          created_at: string | null
          id: number
          level: string
          message: string
          migration_id: string
          timestamp: string
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          id?: number
          level: string
          message: string
          migration_id: string
          timestamp?: string
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          id?: number
          level?: string
          message?: string
          migration_id?: string
          timestamp?: string
        }
        Relationships: []
      }
      mssql_restores: {
        Row: {
          client_id: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          database_size_mb: number | null
          download_id: number | null
          error_message: string | null
          file_hash: string | null
          google_drive_file_id: string | null
          google_drive_file_name: string
          id: number
          is_active: boolean | null
          local_backup_path: string | null
          original_backup_date: string | null
          restore_options: Json | null
          restore_status: string
          restore_timestamp: string
          restored_db_name: string
          storage_source: string
          supabase_storage_path: string | null
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          database_size_mb?: number | null
          download_id?: number | null
          error_message?: string | null
          file_hash?: string | null
          google_drive_file_id?: string | null
          google_drive_file_name: string
          id?: number
          is_active?: boolean | null
          local_backup_path?: string | null
          original_backup_date?: string | null
          restore_options?: Json | null
          restore_status?: string
          restore_timestamp?: string
          restored_db_name: string
          storage_source?: string
          supabase_storage_path?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          database_size_mb?: number | null
          download_id?: number | null
          error_message?: string | null
          file_hash?: string | null
          google_drive_file_id?: string | null
          google_drive_file_name?: string
          id?: number
          is_active?: boolean | null
          local_backup_path?: string | null
          original_backup_date?: string | null
          restore_options?: Json | null
          restore_status?: string
          restore_timestamp?: string
          restored_db_name?: string
          storage_source?: string
          supabase_storage_path?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mssql_restores_client_id_clients_id_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mssql_restores_created_by_profiles_id_fk"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mssql_restores_download_id_gdrive_downloads_id_fk"
            columns: ["download_id"]
            isOneToOne: false
            referencedRelation: "gdrive_downloads"
            referencedColumns: ["id"]
          },
        ]
      }
      normalized_bank_transactions: {
        Row: {
          actual_balance: number | null
          amount: number
          balance_valid: boolean
          bank_account_id: number
          client_id: string
          created_at: string | null
          debit_credit: string
          description: string | null
          document_date: string | null
          expected_balance: number | null
          id: number
          movement_id: string
          normalized_at: string | null
          normalized_by: string | null
          previous_balance: number | null
          raw_transaction_id: number
          sequence_number: number
          sequence_valid: boolean
          updated_at: string | null
          validation_errors: string[] | null
        }
        Insert: {
          actual_balance?: number | null
          amount: number
          balance_valid?: boolean
          bank_account_id: number
          client_id: string
          created_at?: string | null
          debit_credit: string
          description?: string | null
          document_date?: string | null
          expected_balance?: number | null
          id?: number
          movement_id: string
          normalized_at?: string | null
          normalized_by?: string | null
          previous_balance?: number | null
          raw_transaction_id: number
          sequence_number: number
          sequence_valid?: boolean
          updated_at?: string | null
          validation_errors?: string[] | null
        }
        Update: {
          actual_balance?: number | null
          amount?: number
          balance_valid?: boolean
          bank_account_id?: number
          client_id?: string
          created_at?: string | null
          debit_credit?: string
          description?: string | null
          document_date?: string | null
          expected_balance?: number | null
          id?: number
          movement_id?: string
          normalized_at?: string | null
          normalized_by?: string | null
          previous_balance?: number | null
          raw_transaction_id?: number
          sequence_number?: number
          sequence_valid?: boolean
          updated_at?: string | null
          validation_errors?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "normalized_bank_transactions_bank_account_id_bank_accounts_id_f"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "normalized_bank_transactions_client_id_clients_id_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "normalized_bank_transactions_normalized_by_profiles_id_fk"
            columns: ["normalized_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "normalized_bank_transactions_raw_transaction_id_raw_bank_transa"
            columns: ["raw_transaction_id"]
            isOneToOne: false
            referencedRelation: "raw_bank_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: number
          is_read: boolean | null
          link: string | null
          message: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          is_read?: boolean | null
          link?: string | null
          message: string
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: number
          is_read?: boolean | null
          link?: string | null
          message?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_profiles_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      password_folders: {
        Row: {
          client_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          parent_id: string | null
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "password_folders_client_id_clients_id_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "password_folders_created_by_profiles_id_fk"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      passwords: {
        Row: {
          client_id: string | null
          created_at: string | null
          created_by: string | null
          encrypted_password: string
          folder_id: string | null
          id: string
          last_accessed_at: string | null
          notes: string | null
          tags: Json | null
          title: string
          updated_at: string | null
          url: string | null
          username: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          encrypted_password: string
          folder_id?: string | null
          id?: string
          last_accessed_at?: string | null
          notes?: string | null
          tags?: Json | null
          title: string
          updated_at?: string | null
          url?: string | null
          username?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          encrypted_password?: string
          folder_id?: string | null
          id?: string
          last_accessed_at?: string | null
          notes?: string | null
          tags?: Json | null
          title?: string
          updated_at?: string | null
          url?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "passwords_client_id_clients_id_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passwords_created_by_profiles_id_fk"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passwords_folder_id_password_folders_id_fk"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "password_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          client_id: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          global_role: string | null
          id: string
          is_active: boolean | null
          job_title: string | null
          last_name: string | null
          matrix_id: string | null
          phone: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          client_id?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          global_role?: string | null
          id: string
          is_active?: boolean | null
          job_title?: string | null
          last_name?: string | null
          matrix_id?: string | null
          phone?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          client_id?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          global_role?: string | null
          id?: string
          is_active?: boolean | null
          job_title?: string | null
          last_name?: string | null
          matrix_id?: string | null
          phone?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_client_id_clients_id_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      raw_bank_transactions: {
        Row: {
          account_name: string | null
          account_number: string
          additional_description: string | null
          additional_information: string | null
          amount: number
          bank_account_id: number | null
          charge_detail: string | null
          client_id: string
          created_at: string | null
          currency: string
          debit_credit: string
          description: string | null
          document_date: string | null
          document_number: string | null
          end_balance: number | null
          exchange_rate: number | null
          id: number
          imported_at: string | null
          imported_by: string | null
          intermediary_bank: string | null
          intermediary_bank_code: string | null
          movement_id: string
          operation_code: string | null
          partner_account_number: string | null
          partner_bank: string | null
          partner_bank_code: string | null
          partner_name: string | null
          partner_tax_code: string | null
          transaction_type: string | null
          unique_transaction_id: string
          updated_at: string | null
        }
        Insert: {
          account_name?: string | null
          account_number: string
          additional_description?: string | null
          additional_information?: string | null
          amount: number
          bank_account_id?: number | null
          charge_detail?: string | null
          client_id: string
          created_at?: string | null
          currency: string
          debit_credit: string
          description?: string | null
          document_date?: string | null
          document_number?: string | null
          end_balance?: number | null
          exchange_rate?: number | null
          id?: number
          imported_at?: string | null
          imported_by?: string | null
          intermediary_bank?: string | null
          intermediary_bank_code?: string | null
          movement_id: string
          operation_code?: string | null
          partner_account_number?: string | null
          partner_bank?: string | null
          partner_bank_code?: string | null
          partner_name?: string | null
          partner_tax_code?: string | null
          transaction_type?: string | null
          unique_transaction_id: string
          updated_at?: string | null
        }
        Update: {
          account_name?: string | null
          account_number?: string
          additional_description?: string | null
          additional_information?: string | null
          amount?: number
          bank_account_id?: number | null
          charge_detail?: string | null
          client_id?: string
          created_at?: string | null
          currency?: string
          debit_credit?: string
          description?: string | null
          document_date?: string | null
          document_number?: string | null
          end_balance?: number | null
          exchange_rate?: number | null
          id?: number
          imported_at?: string | null
          imported_by?: string | null
          intermediary_bank?: string | null
          intermediary_bank_code?: string | null
          movement_id?: string
          operation_code?: string | null
          partner_account_number?: string | null
          partner_bank?: string | null
          partner_bank_code?: string | null
          partner_name?: string | null
          partner_tax_code?: string | null
          transaction_type?: string | null
          unique_transaction_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "raw_bank_transactions_bank_account_id_bank_accounts_id_fk"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raw_bank_transactions_client_id_clients_id_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raw_bank_transactions_imported_by_profiles_id_fk"
            columns: ["imported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          task_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          task_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          task_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_tasks_id_fk"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_user_id_profiles_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_templates: {
        Row: {
          created_at: string | null
          default_assignee: string | null
          description: string | null
          estimated_days: number | null
          id: string
          order: number
          priority: string | null
          title: string
          workflow_stage_id: string | null
        }
        Insert: {
          created_at?: string | null
          default_assignee?: string | null
          description?: string | null
          estimated_days?: number | null
          id?: string
          order: number
          priority?: string | null
          title: string
          workflow_stage_id?: string | null
        }
        Update: {
          created_at?: string | null
          default_assignee?: string | null
          description?: string | null
          estimated_days?: number | null
          id?: string
          order?: number
          priority?: string | null
          title?: string
          workflow_stage_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_templates_default_assignee_profiles_id_fk"
            columns: ["default_assignee"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_templates_workflow_stage_id_workflow_stages_id_fk"
            columns: ["workflow_stage_id"]
            isOneToOne: false
            referencedRelation: "workflow_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          client_id: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          metadata: Json | null
          priority: string | null
          status: string | null
          tags: Json | null
          title: string
          updated_at: string | null
          workflow_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          metadata?: Json | null
          priority?: string | null
          status?: string | null
          tags?: Json | null
          title: string
          updated_at?: string | null
          workflow_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          metadata?: Json | null
          priority?: string | null
          status?: string | null
          tags?: Json | null
          title?: string
          updated_at?: string | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_profiles_id_fk"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_client_id_clients_id_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_profiles_id_fk"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_workflow_id_workflows_id_fk"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      user_client_features: {
        Row: {
          can_create: boolean | null
          can_delete: boolean | null
          can_edit: boolean | null
          can_view: boolean | null
          client_id: string
          created_at: string | null
          feature: string
          id: number
          module: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          client_id: string
          created_at?: string | null
          feature: string
          id?: number
          module: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          client_id?: string
          created_at?: string | null
          feature?: string
          id?: number
          module?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_client_features_client_id_clients_id_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_client_features_user_id_profiles_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_client_modules: {
        Row: {
          can_create: boolean | null
          can_delete: boolean | null
          can_edit: boolean | null
          can_view: boolean | null
          client_id: string
          created_at: string | null
          id: number
          module: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          client_id: string
          created_at?: string | null
          id?: number
          module: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          client_id?: string
          created_at?: string | null
          id?: number
          module?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_client_modules_client_id_clients_id_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_client_modules_user_id_profiles_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_companies: {
        Row: {
          client_id: string
          created_at: string | null
          id: number
          is_active: boolean | null
          role: string
          user_id: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          role: string
          user_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_companies_client_id_clients_id_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_companies_user_id_profiles_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          client_id: string | null
          created_at: string | null
          id: string
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          role: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_client_id_clients_id_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_profiles_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_stage_history: {
        Row: {
          entered_at: string | null
          exited_at: string | null
          id: string
          notes: string | null
          stage_id: string
          workflow_id: string
        }
        Insert: {
          entered_at?: string | null
          exited_at?: string | null
          id?: string
          notes?: string | null
          stage_id: string
          workflow_id: string
        }
        Update: {
          entered_at?: string | null
          exited_at?: string | null
          id?: string
          notes?: string | null
          stage_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_stage_history_stage_id_workflow_stages_id_fk"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "workflow_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_stage_history_workflow_id_workflows_id_fk"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_stages: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          order: number
          template_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          order: number
          template_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_stages_template_id_workflow_templates_id_fk"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_templates_created_by_profiles_id_fk"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          assigned_to: string | null
          client_id: string
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          current_stage_id: string | null
          id: string
          name: string
          started_at: string | null
          status: string | null
          template_id: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          client_id: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          current_stage_id?: string | null
          id?: string
          name: string
          started_at?: string | null
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          client_id?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          current_stage_id?: string | null
          id?: string
          name?: string
          started_at?: string | null
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflows_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflows_client_id_clients_id_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflows_created_by_profiles_id_fk"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflows_current_stage_id_workflow_stages_id_fk"
            columns: ["current_stage_id"]
            isOneToOne: false
            referencedRelation: "workflow_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflows_template_id_workflow_templates_id_fk"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_client: {
        Args: { target_client_id: string }
        Returns: boolean
      }
      is_global_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  rs: {
    Tables: {
      buyer_invoices: {
        Row: {
          COMPANY_TIN: string
          CREATED_AT: string | null
          CURRENCY: string | null
          DUE_DATE: string | null
          ID: string
          INVOICE_AMOUNT: number | null
          INVOICE_DATE: string | null
          INVOICE_NUMBER: string | null
          NOTES: string | null
          SELLER_NAME: string | null
          SELLER_TIN: string | null
          STATUS: string | null
          TOTAL_AMOUNT: number | null
          UPDATED_AT: string | null
          VAT_AMOUNT: number | null
        }
        Insert: {
          COMPANY_TIN: string
          CREATED_AT?: string | null
          CURRENCY?: string | null
          DUE_DATE?: string | null
          ID: string
          INVOICE_AMOUNT?: number | null
          INVOICE_DATE?: string | null
          INVOICE_NUMBER?: string | null
          NOTES?: string | null
          SELLER_NAME?: string | null
          SELLER_TIN?: string | null
          STATUS?: string | null
          TOTAL_AMOUNT?: number | null
          UPDATED_AT?: string | null
          VAT_AMOUNT?: number | null
        }
        Update: {
          COMPANY_TIN?: string
          CREATED_AT?: string | null
          CURRENCY?: string | null
          DUE_DATE?: string | null
          ID?: string
          INVOICE_AMOUNT?: number | null
          INVOICE_DATE?: string | null
          INVOICE_NUMBER?: string | null
          NOTES?: string | null
          SELLER_NAME?: string | null
          SELLER_TIN?: string | null
          STATUS?: string | null
          TOTAL_AMOUNT?: number | null
          UPDATED_AT?: string | null
          VAT_AMOUNT?: number | null
        }
        Relationships: []
      }
      buyers_invoice_goods: {
        Row: {
          COMPANY_TIN: string
          CREATED_AT: string | null
          GOODS_DESCRIPTION: string | null
          ID: string
          INVOICE_ID: string
          QUANTITY: number | null
          TOTAL_AMOUNT: number | null
          UNIT_PRICE: number | null
          UPDATED_AT: string | null
          VAT_RATE: number | null
        }
        Insert: {
          COMPANY_TIN: string
          CREATED_AT?: string | null
          GOODS_DESCRIPTION?: string | null
          ID: string
          INVOICE_ID: string
          QUANTITY?: number | null
          TOTAL_AMOUNT?: number | null
          UNIT_PRICE?: number | null
          UPDATED_AT?: string | null
          VAT_RATE?: number | null
        }
        Update: {
          COMPANY_TIN?: string
          CREATED_AT?: string | null
          GOODS_DESCRIPTION?: string | null
          ID?: string
          INVOICE_ID?: string
          QUANTITY?: number | null
          TOTAL_AMOUNT?: number | null
          UNIT_PRICE?: number | null
          UPDATED_AT?: string | null
          VAT_RATE?: number | null
        }
        Relationships: []
      }
      buyers_waybill_goods: {
        Row: {
          COMPANY_TIN: string
          CREATED_AT: string | null
          GOODS_DESCRIPTION: string | null
          ID: string
          QUANTITY: number | null
          TOTAL_AMOUNT: number | null
          UNIT_PRICE: number | null
          UPDATED_AT: string | null
          WAYBILL_ID: string
        }
        Insert: {
          COMPANY_TIN: string
          CREATED_AT?: string | null
          GOODS_DESCRIPTION?: string | null
          ID: string
          QUANTITY?: number | null
          TOTAL_AMOUNT?: number | null
          UNIT_PRICE?: number | null
          UPDATED_AT?: string | null
          WAYBILL_ID: string
        }
        Update: {
          COMPANY_TIN?: string
          CREATED_AT?: string | null
          GOODS_DESCRIPTION?: string | null
          ID?: string
          QUANTITY?: number | null
          TOTAL_AMOUNT?: number | null
          UNIT_PRICE?: number | null
          UPDATED_AT?: string | null
          WAYBILL_ID?: string
        }
        Relationships: []
      }
      buyers_waybills: {
        Row: {
          COMPANY_TIN: string
          CREATED_AT: string | null
          ID: string
          SELLER_NAME: string | null
          SELLER_TIN: string | null
          STATUS: string | null
          TOTAL_AMOUNT: number | null
          UPDATED_AT: string | null
          WAYBILL_DATE: string | null
          WAYBILL_NUMBER: string | null
        }
        Insert: {
          COMPANY_TIN: string
          CREATED_AT?: string | null
          ID: string
          SELLER_NAME?: string | null
          SELLER_TIN?: string | null
          STATUS?: string | null
          TOTAL_AMOUNT?: number | null
          UPDATED_AT?: string | null
          WAYBILL_DATE?: string | null
          WAYBILL_NUMBER?: string | null
        }
        Update: {
          COMPANY_TIN?: string
          CREATED_AT?: string | null
          ID?: string
          SELLER_NAME?: string | null
          SELLER_TIN?: string | null
          STATUS?: string | null
          TOTAL_AMOUNT?: number | null
          UPDATED_AT?: string | null
          WAYBILL_DATE?: string | null
          WAYBILL_NUMBER?: string | null
        }
        Relationships: []
      }
      credentials: {
        Row: {
          api_key: string | null
          client_id: string
          created_at: string | null
          encrypted_password: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          password: string
          refresh_token: string | null
          updated_at: string | null
          user_id: string
          username: string
        }
        Insert: {
          api_key?: string | null
          client_id: string
          created_at?: string | null
          encrypted_password: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          password: string
          refresh_token?: string | null
          updated_at?: string | null
          user_id: string
          username: string
        }
        Update: {
          api_key?: string | null
          client_id?: string
          created_at?: string | null
          encrypted_password?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          password?: string
          refresh_token?: string | null
          updated_at?: string | null
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      seller_invoices: {
        Row: {
          BUYER_NAME: string | null
          BUYER_TIN: string | null
          COMPANY_TIN: string
          CREATED_AT: string | null
          CURRENCY: string | null
          DUE_DATE: string | null
          ID: string
          INVOICE_AMOUNT: number | null
          INVOICE_DATE: string | null
          INVOICE_NUMBER: string | null
          NOTES: string | null
          STATUS: string | null
          TOTAL_AMOUNT: number | null
          UPDATED_AT: string | null
          VAT_AMOUNT: number | null
        }
        Insert: {
          BUYER_NAME?: string | null
          BUYER_TIN?: string | null
          COMPANY_TIN: string
          CREATED_AT?: string | null
          CURRENCY?: string | null
          DUE_DATE?: string | null
          ID: string
          INVOICE_AMOUNT?: number | null
          INVOICE_DATE?: string | null
          INVOICE_NUMBER?: string | null
          NOTES?: string | null
          STATUS?: string | null
          TOTAL_AMOUNT?: number | null
          UPDATED_AT?: string | null
          VAT_AMOUNT?: number | null
        }
        Update: {
          BUYER_NAME?: string | null
          BUYER_TIN?: string | null
          COMPANY_TIN?: string
          CREATED_AT?: string | null
          CURRENCY?: string | null
          DUE_DATE?: string | null
          ID?: string
          INVOICE_AMOUNT?: number | null
          INVOICE_DATE?: string | null
          INVOICE_NUMBER?: string | null
          NOTES?: string | null
          STATUS?: string | null
          TOTAL_AMOUNT?: number | null
          UPDATED_AT?: string | null
          VAT_AMOUNT?: number | null
        }
        Relationships: []
      }
      sellers_invoice_goods: {
        Row: {
          COMPANY_TIN: string
          CREATED_AT: string | null
          GOODS_DESCRIPTION: string | null
          ID: string
          INVOICE_ID: string
          QUANTITY: number | null
          TOTAL_AMOUNT: number | null
          UNIT_PRICE: number | null
          UPDATED_AT: string | null
          VAT_RATE: number | null
        }
        Insert: {
          COMPANY_TIN: string
          CREATED_AT?: string | null
          GOODS_DESCRIPTION?: string | null
          ID: string
          INVOICE_ID: string
          QUANTITY?: number | null
          TOTAL_AMOUNT?: number | null
          UNIT_PRICE?: number | null
          UPDATED_AT?: string | null
          VAT_RATE?: number | null
        }
        Update: {
          COMPANY_TIN?: string
          CREATED_AT?: string | null
          GOODS_DESCRIPTION?: string | null
          ID?: string
          INVOICE_ID?: string
          QUANTITY?: number | null
          TOTAL_AMOUNT?: number | null
          UNIT_PRICE?: number | null
          UPDATED_AT?: string | null
          VAT_RATE?: number | null
        }
        Relationships: []
      }
      sellers_waybill_goods: {
        Row: {
          COMPANY_TIN: string
          CREATED_AT: string | null
          GOODS_DESCRIPTION: string | null
          ID: string
          QUANTITY: number | null
          TOTAL_AMOUNT: number | null
          UNIT_PRICE: number | null
          UPDATED_AT: string | null
          WAYBILL_ID: string
        }
        Insert: {
          COMPANY_TIN: string
          CREATED_AT?: string | null
          GOODS_DESCRIPTION?: string | null
          ID: string
          QUANTITY?: number | null
          TOTAL_AMOUNT?: number | null
          UNIT_PRICE?: number | null
          UPDATED_AT?: string | null
          WAYBILL_ID: string
        }
        Update: {
          COMPANY_TIN?: string
          CREATED_AT?: string | null
          GOODS_DESCRIPTION?: string | null
          ID?: string
          QUANTITY?: number | null
          TOTAL_AMOUNT?: number | null
          UNIT_PRICE?: number | null
          UPDATED_AT?: string | null
          WAYBILL_ID?: string
        }
        Relationships: []
      }
      sellers_waybills: {
        Row: {
          BUYER_NAME: string | null
          BUYER_TIN: string | null
          COMPANY_TIN: string
          CREATED_AT: string | null
          ID: string
          STATUS: string | null
          TOTAL_AMOUNT: number | null
          UPDATED_AT: string | null
          WAYBILL_DATE: string | null
          WAYBILL_NUMBER: string | null
        }
        Insert: {
          BUYER_NAME?: string | null
          BUYER_TIN?: string | null
          COMPANY_TIN: string
          CREATED_AT?: string | null
          ID: string
          STATUS?: string | null
          TOTAL_AMOUNT?: number | null
          UPDATED_AT?: string | null
          WAYBILL_DATE?: string | null
          WAYBILL_NUMBER?: string | null
        }
        Update: {
          BUYER_NAME?: string | null
          BUYER_TIN?: string | null
          COMPANY_TIN?: string
          CREATED_AT?: string | null
          ID?: string
          STATUS?: string | null
          TOTAL_AMOUNT?: number | null
          UPDATED_AT?: string | null
          WAYBILL_DATE?: string | null
          WAYBILL_NUMBER?: string | null
        }
        Relationships: []
      }
      spec_buyer_invoices: {
        Row: {
          COMPANY_TIN: string
          CREATED_AT: string | null
          ID: string
          INVOICE_AMOUNT: number | null
          INVOICE_DATE: string | null
          INVOICE_NUMBER: string | null
          SELLER_NAME: string | null
          SELLER_TIN: string | null
          STATUS: string | null
          UPDATED_AT: string | null
        }
        Insert: {
          COMPANY_TIN: string
          CREATED_AT?: string | null
          ID: string
          INVOICE_AMOUNT?: number | null
          INVOICE_DATE?: string | null
          INVOICE_NUMBER?: string | null
          SELLER_NAME?: string | null
          SELLER_TIN?: string | null
          STATUS?: string | null
          UPDATED_AT?: string | null
        }
        Update: {
          COMPANY_TIN?: string
          CREATED_AT?: string | null
          ID?: string
          INVOICE_AMOUNT?: number | null
          INVOICE_DATE?: string | null
          INVOICE_NUMBER?: string | null
          SELLER_NAME?: string | null
          SELLER_TIN?: string | null
          STATUS?: string | null
          UPDATED_AT?: string | null
        }
        Relationships: []
      }
      spec_invoice_goods: {
        Row: {
          COMPANY_TIN: string
          CREATED_AT: string | null
          GOODS_DESCRIPTION: string | null
          ID: string
          INVOICE_ID: string
          QUANTITY: number | null
          TOTAL_AMOUNT: number | null
          UNIT_PRICE: number | null
          UPDATED_AT: string | null
        }
        Insert: {
          COMPANY_TIN: string
          CREATED_AT?: string | null
          GOODS_DESCRIPTION?: string | null
          ID: string
          INVOICE_ID: string
          QUANTITY?: number | null
          TOTAL_AMOUNT?: number | null
          UNIT_PRICE?: number | null
          UPDATED_AT?: string | null
        }
        Update: {
          COMPANY_TIN?: string
          CREATED_AT?: string | null
          GOODS_DESCRIPTION?: string | null
          ID?: string
          INVOICE_ID?: string
          QUANTITY?: number | null
          TOTAL_AMOUNT?: number | null
          UNIT_PRICE?: number | null
          UPDATED_AT?: string | null
        }
        Relationships: []
      }
      spec_seller_invoices: {
        Row: {
          BUYER_NAME: string | null
          BUYER_TIN: string | null
          COMPANY_TIN: string
          CREATED_AT: string | null
          ID: string
          INVOICE_AMOUNT: number | null
          INVOICE_DATE: string | null
          INVOICE_NUMBER: string | null
          STATUS: string | null
          UPDATED_AT: string | null
        }
        Insert: {
          BUYER_NAME?: string | null
          BUYER_TIN?: string | null
          COMPANY_TIN: string
          CREATED_AT?: string | null
          ID: string
          INVOICE_AMOUNT?: number | null
          INVOICE_DATE?: string | null
          INVOICE_NUMBER?: string | null
          STATUS?: string | null
          UPDATED_AT?: string | null
        }
        Update: {
          BUYER_NAME?: string | null
          BUYER_TIN?: string | null
          COMPANY_TIN?: string
          CREATED_AT?: string | null
          ID?: string
          INVOICE_AMOUNT?: number | null
          INVOICE_DATE?: string | null
          INVOICE_NUMBER?: string | null
          STATUS?: string | null
          UPDATED_AT?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          client_id: string | null
          company_name: string
          company_tin: string | null
          created_at: string | null
          created_by_user_id: string | null
          id: number
          main_password: string | null
          main_password_hash: string | null
          main_user: string | null
          s_password: string
          s_password_hash: string
          s_user: string
          un_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          client_id?: string | null
          company_name: string
          company_tin?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          id?: number
          main_password?: string | null
          main_password_hash?: string | null
          main_user?: string | null
          s_password: string
          s_password_hash: string
          s_user: string
          un_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          client_id?: string | null
          company_name?: string
          company_tin?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          id?: number
          main_password?: string | null
          main_password_hash?: string | null
          main_user?: string | null
          s_password?: string
          s_password_hash?: string
          s_user?: string
          un_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      waybill_invoices: {
        Row: {
          COMPANY_TIN: string
          CREATED_AT: string | null
          ID: string
          INVOICE_ID: string
          UPDATED_AT: string | null
          WAYBILL_ID: string
        }
        Insert: {
          COMPANY_TIN: string
          CREATED_AT?: string | null
          ID: string
          INVOICE_ID: string
          UPDATED_AT?: string | null
          WAYBILL_ID: string
        }
        Update: {
          COMPANY_TIN?: string
          CREATED_AT?: string | null
          ID?: string
          INVOICE_ID?: string
          UPDATED_AT?: string | null
          WAYBILL_ID?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
  rs: {
    Enums: {},
  },
} as const
