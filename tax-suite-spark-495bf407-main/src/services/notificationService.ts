import { supabase } from "@/integrations/supabase/client";

export type NotificationType = 
  | 'task_assigned' 
  | 'task_update' 
  | 'task_completed'
  | 'document_uploaded' 
  | 'document_shared'
  | 'message_received' 
  | 'client_assigned'
  | 'portal_invitation'
  | 'workflow_update'
  | 'system_alert'
  | 'event_invitation'
  | 'event_updated'
  | 'event_cancelled'
  | 'event_reminder'
  | 'event_response';

export const notificationService = {
  /**
   * Create a notification for a specific user
   */
  createNotification: async (
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    link?: string
  ) => {
    try {
      const { data, error } = await supabase.rpc("create_notification", {
        _user_id: userId,
        _type: type,
        _title: title,
        _message: message,
        _link: link || null,
      });

      if (error) {
        console.error("Failed to create notification:", error);
        throw error;
      }

      return data;
    } catch (err) {
      console.error("Notification creation error:", err);
      throw err;
    }
  },

  /**
   * Notify user when they are assigned to a task
   */
  notifyTaskAssigned: async (
    userId: string,
    taskId: string,
    taskTitle: string,
    assignedBy: string
  ) => {
    return notificationService.createNotification(
      userId,
      'task_assigned',
      'New Task Assigned',
      `${assignedBy} assigned you to task "${taskTitle}"`,
      `/tasks?id=${taskId}`
    );
  },

  /**
   * Notify relevant users when a task is updated
   */
  notifyTaskUpdate: async (
    userId: string,
    taskId: string,
    taskTitle: string,
    updateType: string
  ) => {
    return notificationService.createNotification(
      userId,
      'task_update',
      'Task Updated',
      `Task "${taskTitle}" has been ${updateType}`,
      `/tasks?id=${taskId}`
    );
  },

  /**
   * Notify when a task is completed
   */
  notifyTaskCompleted: async (
    userId: string,
    taskId: string,
    taskTitle: string,
    completedBy: string
  ) => {
    return notificationService.createNotification(
      userId,
      'task_completed',
      'Task Completed',
      `${completedBy} completed task "${taskTitle}"`,
      `/tasks?id=${taskId}`
    );
  },

  /**
   * Notify when a document is uploaded for a client
   */
  notifyDocumentUploaded: async (
    userId: string,
    documentId: string,
    documentName: string,
    uploadedBy: string
  ) => {
    return notificationService.createNotification(
      userId,
      'document_uploaded',
      'New Document Uploaded',
      `${uploadedBy} uploaded "${documentName}"`,
      `/documents?id=${documentId}`
    );
  },

  /**
   * Notify when a document is shared with user
   */
  notifyDocumentShared: async (
    userId: string,
    documentId: string,
    documentName: string,
    sharedBy: string
  ) => {
    return notificationService.createNotification(
      userId,
      'document_shared',
      'Document Shared',
      `${sharedBy} shared "${documentName}" with you`,
      `/documents?id=${documentId}`
    );
  },

  /**
   * Notify conversation participants about a new message
   */
  notifyMessageReceived: async (
    userId: string,
    conversationId: string,
    senderName: string,
    messagePreview: string
  ) => {
    return notificationService.createNotification(
      userId,
      'message_received',
      'New Message',
      `${senderName}: ${messagePreview.substring(0, 50)}${messagePreview.length > 50 ? '...' : ''}`,
      `/messages?conversation=${conversationId}`
    );
  },

  /**
   * Notify staff when assigned to a client
   */
  notifyClientAssigned: async (
    userId: string,
    clientId: string,
    clientName: string,
    assignedBy: string,
    role: string
  ) => {
    return notificationService.createNotification(
      userId,
      'client_assigned',
      'Client Assigned',
      `${assignedBy} assigned you as ${role} for "${clientName}"`,
      `/clients/${clientId}`
    );
  },

  /**
   * Notify client about portal invitation
   */
  notifyPortalInvitation: async (
    userId: string,
    clientName: string
  ) => {
    return notificationService.createNotification(
      userId,
      'portal_invitation',
      'Portal Access Granted',
      `Welcome! Your client portal for ${clientName} is now active`,
      '/portal/dashboard'
    );
  },

  /**
   * Notify about workflow stage changes
   */
  notifyWorkflowUpdate: async (
    userId: string,
    workflowId: string,
    workflowName: string,
    newStage: string
  ) => {
    return notificationService.createNotification(
      userId,
      'workflow_update',
      'Workflow Progress',
      `"${workflowName}" moved to ${newStage}`,
      `/workflows?id=${workflowId}`
    );
  },

  /**
   * Send system alerts to users
   */
  notifySystemAlert: async (
    userId: string,
    title: string,
    message: string,
    link?: string
  ) => {
    return notificationService.createNotification(
      userId,
      'system_alert',
      title,
      message,
      link
    );
  },

  /**
   * Notify user when invited to a calendar event
   */
  notifyEventInvitation: async (
    userId: string,
    eventId: string,
    eventTitle: string,
    organizerName: string,
    startTime: string
  ) => {
    const formattedDate = new Date(startTime).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
    
    return notificationService.createNotification(
      userId,
      'event_invitation',
      'Event Invitation',
      `${organizerName} invited you to "${eventTitle}" on ${formattedDate}`,
      `/calendar?event=${eventId}`
    );
  },

  /**
   * Notify participants when an event is updated
   */
  notifyEventUpdated: async (
    userId: string,
    eventId: string,
    eventTitle: string,
    updatedBy: string,
    changeDescription?: string
  ) => {
    const message = changeDescription 
      ? `${updatedBy} updated "${eventTitle}": ${changeDescription}`
      : `${updatedBy} updated the event "${eventTitle}"`;
      
    return notificationService.createNotification(
      userId,
      'event_updated',
      'Event Updated',
      message,
      `/calendar?event=${eventId}`
    );
  },

  /**
   * Notify participants when an event is cancelled
   */
  notifyEventCancelled: async (
    userId: string,
    eventId: string,
    eventTitle: string,
    cancelledBy: string,
    reason?: string
  ) => {
    const message = reason
      ? `${cancelledBy} cancelled "${eventTitle}": ${reason}`
      : `${cancelledBy} cancelled the event "${eventTitle}"`;
      
    return notificationService.createNotification(
      userId,
      'event_cancelled',
      'Event Cancelled',
      message,
      `/calendar`
    );
  },

  /**
   * Send reminder notification before an event starts
   */
  notifyEventReminder: async (
    userId: string,
    eventId: string,
    eventTitle: string,
    startTime: string,
    minutesUntil: number
  ) => {
    const formattedTime = new Date(startTime).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
    
    let reminderText = '';
    if (minutesUntil < 60) {
      reminderText = `in ${minutesUntil} minutes`;
    } else if (minutesUntil < 1440) {
      const hours = Math.floor(minutesUntil / 60);
      reminderText = `in ${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      const days = Math.floor(minutesUntil / 1440);
      reminderText = `in ${days} day${days > 1 ? 's' : ''}`;
    }
    
    return notificationService.createNotification(
      userId,
      'event_reminder',
      'Event Reminder',
      `"${eventTitle}" starts ${reminderText} at ${formattedTime}`,
      `/calendar?event=${eventId}`
    );
  },

  /**
   * Notify event organizer when a participant responds to invitation
   */
  notifyEventResponse: async (
    userId: string,
    eventId: string,
    eventTitle: string,
    participantName: string,
    response: 'accepted' | 'declined' | 'tentative'
  ) => {
    const responseEmoji = {
      accepted: '✅',
      declined: '❌',
      tentative: '❓'
    }[response];
    
    const responseText = {
      accepted: 'accepted',
      declined: 'declined',
      tentatively: 'tentatively accepted'
    }[response];
    
    return notificationService.createNotification(
      userId,
      'event_response',
      'Event Response',
      `${responseEmoji} ${participantName} ${responseText} "${eventTitle}"`,
      `/calendar?event=${eventId}`
    );
  },

  /**
   * Batch notify multiple users with the same notification
   */
  notifyMultipleUsers: async (
    userIds: string[],
    type: NotificationType,
    title: string,
    message: string,
    link?: string
  ) => {
    const promises = userIds.map(userId =>
      notificationService.createNotification(userId, type, title, message, link)
    );
    
    try {
      return await Promise.all(promises);
    } catch (err) {
      console.error("Failed to notify multiple users:", err);
      throw err;
    }
  },
};
