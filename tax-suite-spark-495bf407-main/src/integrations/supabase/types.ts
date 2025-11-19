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
      audit_logs: {
        Row: {
          action: string
          changes_summary: string | null
          created_at: string
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
          request_path: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          changes_summary?: string | null
          created_at?: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          request_path?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          changes_summary?: string | null
          created_at?: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          request_path?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      calendar_event_participants: {
        Row: {
          can_edit: boolean | null
          created_at: string | null
          event_id: string
          id: string
          is_organizer: boolean | null
          last_reminded_at: string | null
          reminder_minutes: number | null
          response_at: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          can_edit?: boolean | null
          created_at?: string | null
          event_id: string
          id?: string
          is_organizer?: boolean | null
          last_reminded_at?: string | null
          reminder_minutes?: number | null
          response_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          can_edit?: boolean | null
          created_at?: string | null
          event_id?: string
          id?: string
          is_organizer?: boolean | null
          last_reminded_at?: string | null
          reminder_minutes?: number | null
          response_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_event_participants_event_id_fkey"
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
            foreignKeyName: "fk_calendar_event_participants_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          all_day: boolean | null
          attachments: Json | null
          color: string | null
          created_at: string | null
          created_by: string
          description: string | null
          end_time: string
          event_type: string
          id: string
          is_recurring: boolean | null
          location: string | null
          meeting_link: string | null
          recurrence_pattern: Json | null
          start_time: string
          title: string
          updated_at: string | null
        }
        Insert: {
          all_day?: boolean | null
          attachments?: Json | null
          color?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          end_time: string
          event_type?: string
          id?: string
          is_recurring?: boolean | null
          location?: string | null
          meeting_link?: string | null
          recurrence_pattern?: Json | null
          start_time: string
          title: string
          updated_at?: string | null
        }
        Update: {
          all_day?: boolean | null
          attachments?: Json | null
          color?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          end_time?: string
          event_type?: string
          id?: string
          is_recurring?: boolean | null
          location?: string | null
          meeting_link?: string | null
          recurrence_pattern?: Json | null
          start_time?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_calendar_events_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      checklists: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          is_completed: boolean
          order_position: number
          task_id: string
          title: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          order_position: number
          task_id: string
          title: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          order_position?: number
          task_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklists_task_id_fkey"
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
          created_at: string
          email: string | null
          id: string
          is_primary: boolean
          name: string
          phone: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name: string
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name?: string
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_team_assignments: {
        Row: {
          assigned_at: string
          client_id: string
          id: string
          role_type: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          client_id: string
          id?: string
          role_type: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          client_id?: string
          id?: string
          role_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_team_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_team_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: Json | null
          assigned_accountant_id: string | null
          assigned_owner_id: string | null
          assigned_reviewer_id: string | null
          business_type: Database["public"]["Enums"]["business_type"]
          communication_preferences: Json | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          industry: string | null
          last_portal_login: string | null
          name: string
          notes: string | null
          phone: string | null
          portal_access_token: string | null
          portal_enabled: boolean | null
          portal_invitation_accepted_at: string | null
          portal_invitation_sent_at: string | null
          status: Database["public"]["Enums"]["client_status"]
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          address?: Json | null
          assigned_accountant_id?: string | null
          assigned_owner_id?: string | null
          assigned_reviewer_id?: string | null
          business_type?: Database["public"]["Enums"]["business_type"]
          communication_preferences?: Json | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          last_portal_login?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          portal_access_token?: string | null
          portal_enabled?: boolean | null
          portal_invitation_accepted_at?: string | null
          portal_invitation_sent_at?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: Json | null
          assigned_accountant_id?: string | null
          assigned_owner_id?: string | null
          assigned_reviewer_id?: string | null
          business_type?: Database["public"]["Enums"]["business_type"]
          communication_preferences?: Json | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          last_portal_login?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          portal_access_token?: string | null
          portal_enabled?: boolean | null
          portal_invitation_accepted_at?: string | null
          portal_invitation_sent_at?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_assigned_accountant_id_fkey"
            columns: ["assigned_accountant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_assigned_owner_id_fkey"
            columns: ["assigned_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_assigned_reviewer_id_fkey"
            columns: ["assigned_reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          is_muted: boolean
          joined_at: string
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          is_muted?: boolean
          joined_at?: string
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          is_muted?: boolean
          joined_at?: string
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string
          id: string
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
          id?: string
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
          id?: string
          is_archived?: boolean
          last_message_at?: string | null
          title?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_activities: {
        Row: {
          activity_type: string
          completed_at: string | null
          created_at: string | null
          created_by: string
          deal_id: string
          description: string | null
          due_date: string | null
          id: string
          new_stage_id: string | null
          old_stage_id: string | null
          subject: string
          updated_at: string | null
        }
        Insert: {
          activity_type: string
          completed_at?: string | null
          created_at?: string | null
          created_by: string
          deal_id: string
          description?: string | null
          due_date?: string | null
          id?: string
          new_stage_id?: string | null
          old_stage_id?: string | null
          subject: string
          updated_at?: string | null
        }
        Update: {
          activity_type?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string
          deal_id?: string
          description?: string | null
          due_date?: string | null
          id?: string
          new_stage_id?: string | null
          old_stage_id?: string | null
          subject?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_activities_new_stage_id_fkey"
            columns: ["new_stage_id"]
            isOneToOne: false
            referencedRelation: "deal_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_activities_old_stage_id_fkey"
            columns: ["old_stage_id"]
            isOneToOne: false
            referencedRelation: "deal_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_contacts: {
        Row: {
          created_at: string | null
          deal_id: string
          email: string | null
          id: string
          is_primary: boolean | null
          name: string
          phone: string | null
          role: string | null
        }
        Insert: {
          created_at?: string | null
          deal_id: string
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name: string
          phone?: string | null
          role?: string | null
        }
        Update: {
          created_at?: string | null
          deal_id?: string
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name?: string
          phone?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_contacts_deal_id_fkey"
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
          description: string | null
          id: string
          is_closed: boolean | null
          is_won: boolean | null
          name: string
          order_position: number
          probability: number | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_closed?: boolean | null
          is_won?: boolean | null
          name: string
          order_position: number
          probability?: number | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_closed?: boolean | null
          is_won?: boolean | null
          name?: string
          order_position?: number
          probability?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      deals: {
        Row: {
          actual_close_date: string | null
          client_id: string | null
          company_name: string | null
          contact_email: string | null
          contact_name: string
          contact_phone: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          deal_value: number | null
          description: string | null
          expected_close_date: string | null
          id: string
          lead_source: string | null
          lost_reason: string | null
          name: string
          owner_id: string
          probability: number | null
          stage_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          actual_close_date?: string | null
          client_id?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_name: string
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          deal_value?: number | null
          description?: string | null
          expected_close_date?: string | null
          id?: string
          lead_source?: string | null
          lost_reason?: string | null
          name: string
          owner_id: string
          probability?: number | null
          stage_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_close_date?: string | null
          client_id?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_name?: string
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          deal_value?: number | null
          description?: string | null
          expected_close_date?: string | null
          id?: string
          lead_source?: string | null
          lost_reason?: string | null
          name?: string
          owner_id?: string
          probability?: number | null
          stage_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "deal_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      document_access_log: {
        Row: {
          accessed_at: string
          action: string
          document_id: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accessed_at?: string
          action: string
          document_id: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accessed_at?: string
          action?: string
          document_id?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_access_log_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          category_id: string | null
          client_id: string
          created_at: string
          description: string | null
          expires_at: string | null
          file_path: string
          file_size: number | null
          id: string
          metadata: Json | null
          mime_type: string | null
          name: string
          parent_document_id: string | null
          status: string
          updated_at: string
          uploaded_at: string
          uploaded_by: string
          version: number
        }
        Insert: {
          category_id?: string | null
          client_id: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          file_path: string
          file_size?: number | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          name: string
          parent_document_id?: string | null
          status?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by: string
          version?: number
        }
        Update: {
          category_id?: string | null
          client_id?: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          file_path?: string
          file_size?: number | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          name?: string
          parent_document_id?: string | null
          status?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "documents_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "document_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body: string
          category: string | null
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          name: string
          subject: string
          updated_at: string
          variables: Json | null
        }
        Insert: {
          body: string
          category?: string | null
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          name: string
          subject: string
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          body?: string
          category?: string | null
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          name?: string
          subject?: string
          updated_at?: string
          variables?: Json | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_deleted: boolean
          is_edited: boolean
          metadata: Json | null
          sender_id: string
          type: string
          updated_at: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          is_edited?: boolean
          metadata?: Json | null
          sender_id: string
          type?: string
          updated_at?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          is_edited?: boolean
          metadata?: Json | null
          sender_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          client_id: string | null
          created_at: string
          deactivated_at: string | null
          deactivated_by: string | null
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          job_title: string | null
          last_login_at: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          client_id?: string | null
          created_at?: string
          deactivated_at?: string | null
          deactivated_by?: string | null
          email?: string | null
          full_name: string
          id: string
          is_active?: boolean
          job_title?: string | null
          last_login_at?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          client_id?: string | null
          created_at?: string
          deactivated_at?: string | null
          deactivated_by?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          job_title?: string | null
          last_login_at?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          comment: string
          created_at: string
          id: string
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_templates: {
        Row: {
          created_at: string
          description: string | null
          estimated_hours: number | null
          id: string
          order_position: number
          priority: Database["public"]["Enums"]["task_priority"]
          stage_id: string | null
          template_id: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          estimated_hours?: number | null
          id?: string
          order_position: number
          priority?: Database["public"]["Enums"]["task_priority"]
          stage_id?: string | null
          template_id: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          estimated_hours?: number | null
          id?: string
          order_position?: number
          priority?: Database["public"]["Enums"]["task_priority"]
          stage_id?: string | null
          template_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_templates_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "workflow_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_templates_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          client_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          dependencies: string[] | null
          description: string | null
          due_date: string | null
          id: string
          is_recurring: boolean
          priority: Database["public"]["Enums"]["task_priority"]
          recurrence_pattern: Json | null
          status: Database["public"]["Enums"]["task_status"]
          tags: string[] | null
          title: string
          updated_at: string
          workflow_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          dependencies?: string[] | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_recurring?: boolean
          priority?: Database["public"]["Enums"]["task_priority"]
          recurrence_pattern?: Json | null
          status?: Database["public"]["Enums"]["task_status"]
          tags?: string[] | null
          title: string
          updated_at?: string
          workflow_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          dependencies?: string[] | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_recurring?: boolean
          priority?: Database["public"]["Enums"]["task_priority"]
          recurrence_pattern?: Json | null
          status?: Database["public"]["Enums"]["task_status"]
          tags?: string[] | null
          title?: string
          updated_at?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invitations: {
        Row: {
          accepted_at: string | null
          client_id: string | null
          created_at: string
          custom_message: string | null
          email: string
          expires_at: string
          full_name: string
          id: string
          initial_roles: Database["public"]["Enums"]["app_role"][]
          invitation_token: string | null
          invited_by: string
          job_title: string | null
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          client_id?: string | null
          created_at?: string
          custom_message?: string | null
          email: string
          expires_at?: string
          full_name: string
          id?: string
          initial_roles: Database["public"]["Enums"]["app_role"][]
          invitation_token?: string | null
          invited_by: string
          job_title?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          client_id?: string | null
          created_at?: string
          custom_message?: string | null
          email?: string
          expires_at?: string
          full_name?: string
          id?: string
          initial_roles?: Database["public"]["Enums"]["app_role"][]
          invitation_token?: string | null
          invited_by?: string
          job_title?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_invitations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_stages: {
        Row: {
          automation_rules: Json | null
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          order_position: number
          template_id: string
          updated_at: string
        }
        Insert: {
          automation_rules?: Json | null
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          order_position: number
          template_id: string
          updated_at?: string
        }
        Update: {
          automation_rules?: Json | null
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          order_position?: number
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_stages_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_templates: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          estimated_duration_days: number | null
          id: string
          is_active: boolean
          name: string
          type: Database["public"]["Enums"]["workflow_template_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          estimated_duration_days?: number | null
          id?: string
          is_active?: boolean
          name: string
          type: Database["public"]["Enums"]["workflow_template_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          estimated_duration_days?: number | null
          id?: string
          is_active?: boolean
          name?: string
          type?: Database["public"]["Enums"]["workflow_template_type"]
          updated_at?: string
        }
        Relationships: []
      }
      workflows: {
        Row: {
          client_id: string
          completed_at: string | null
          created_at: string
          created_by: string
          current_stage_id: string | null
          due_date: string | null
          id: string
          name: string
          started_at: string
          status: string
          template_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          current_stage_id?: string | null
          due_date?: string | null
          id?: string
          name: string
          started_at?: string
          status?: string
          template_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          current_stage_id?: string | null
          due_date?: string | null
          id?: string
          name?: string
          started_at?: string
          status?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflows_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflows_current_stage_id_fkey"
            columns: ["current_stage_id"]
            isOneToOne: false
            referencedRelation: "workflow_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflows_template_id_fkey"
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
      add_user_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      can_client_view_conversation_participants: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      can_manage_event_participants: {
        Args: { _event_id: string; _user_id: string }
        Returns: boolean
      }
      check_expired_documents: { Args: never; Returns: undefined }
      create_audit_log: {
        Args: {
          _action: string
          _changes_summary?: string
          _entity_id: string
          _entity_name?: string
          _entity_type: string
          _metadata?: Json
          _new_values?: Json
          _old_values?: Json
        }
        Returns: string
      }
      create_notification: {
        Args: {
          _link?: string
          _message: string
          _title: string
          _type: string
          _user_id: string
        }
        Returns: string
      }
      get_notification_recipients: {
        Args: { _action: string; _entity_id: string; _entity_type: string }
        Returns: {
          notification_type: string
          user_id: string
        }[]
      }
      get_user_with_roles: {
        Args: { user_id: string }
        Returns: {
          avatar_url: string
          client_id: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          job_title: string
          last_login_at: string
          roles: string[]
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_conversation_creator: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_conversation_participant: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_event_creator: {
        Args: { _event_id: string; _user_id: string }
        Returns: boolean
      }
      is_event_organizer: {
        Args: { _event_id: string; _user_id: string }
        Returns: boolean
      }
      remove_user_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      validate_portal_invitation: {
        Args: { token: string }
        Returns: {
          client_id: string
          client_name: string
          is_valid: boolean
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "accountant" | "client"
      business_type:
        | "individual"
        | "sole_proprietor"
        | "partnership"
        | "llc"
        | "s_corp"
        | "c_corp"
        | "nonprofit"
      client_status: "active" | "inactive" | "archived"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status: "todo" | "in_progress" | "review" | "completed" | "blocked"
      workflow_template_type:
        | "tax_return"
        | "monthly_close"
        | "payroll"
        | "audit"
        | "bookkeeping"
        | "custom"
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
    Enums: {
      app_role: ["admin", "manager", "accountant", "client"],
      business_type: [
        "individual",
        "sole_proprietor",
        "partnership",
        "llc",
        "s_corp",
        "c_corp",
        "nonprofit",
      ],
      client_status: ["active", "inactive", "archived"],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: ["todo", "in_progress", "review", "completed", "blocked"],
      workflow_template_type: [
        "tax_return",
        "monthly_close",
        "payroll",
        "audit",
        "bookkeeping",
        "custom",
      ],
    },
  },
} as const
