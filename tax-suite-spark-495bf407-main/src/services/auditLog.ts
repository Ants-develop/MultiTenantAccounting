import { supabase } from "@/integrations/supabase/client";

export const auditLog = {
  logAction: async (
    action: string,
    entityType: string,
    entityId: string,
    entityName?: string,
    metadata?: Record<string, any>
  ) => {
    try {
      const { error } = await supabase.rpc("create_audit_log", {
        _action: action,
        _entity_type: entityType,
        _entity_id: entityId,
        _entity_name: entityName || null,
        _old_values: null,
        _new_values: null,
        _changes_summary: `${action} ${entityType}: ${entityName || entityId}`,
        _metadata: metadata || {},
      });

      if (error) {
        console.error("Failed to create audit log:", error);
      }
    } catch (err) {
      console.error("Audit log error:", err);
    }
  },

  logDocumentDownload: async (documentId: string, documentName: string) => {
    return auditLog.logAction(
      "DOWNLOAD",
      "document",
      documentId,
      documentName,
      { type: "document_download" }
    );
  },

  logDocumentShare: async (documentId: string, sharedWith: string[]) => {
    return auditLog.logAction(
      "SHARE",
      "document",
      documentId,
      undefined,
      { shared_with: sharedWith }
    );
  },

  logClientView: async (clientId: string, clientName: string) => {
    return auditLog.logAction(
      "VIEW",
      "client",
      clientId,
      clientName,
      { type: "client_view" }
    );
  },

  logPortalInvitation: async (clientId: string, clientName: string, email: string) => {
    return auditLog.logAction(
      "INVITE",
      "client",
      clientId,
      clientName,
      { invitation_email: email, type: "portal_invitation" }
    );
  },
};
