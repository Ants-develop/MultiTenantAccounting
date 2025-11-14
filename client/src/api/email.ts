import { apiRequest } from "@/lib/queryClient";

// =====================================================
// Types
// =====================================================

export interface EmailAccount {
  id: number;
  userId: number;
  clientId?: number;
  emailAddress: string;
  provider: string;
  imapHost?: string;
  imapPort?: number;
  smtpHost?: string;
  smtpPort?: number;
  isActive: boolean;
  lastSyncAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailMessage {
  id: number;
  emailAccountId: number;
  clientId?: number;
  subject?: string;
  fromAddress: string;
  toAddresses: string[];
  ccAddresses?: string[];
  bodyText?: string;
  bodyHtml?: string;
  attachments?: Array<{
    name: string;
    size: number;
    contentType: string;
  }>;
  isRead: boolean;
  isArchived: boolean;
  labels?: string[];
  receivedAt: string;
  emailAccount?: {
    emailAddress: string;
  };
}

export interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
  variables?: Record<string, any>;
  category?: string;
  isActive: boolean;
  createdBy?: number;
  createdAt: string;
  updatedAt: string;
}

// =====================================================
// Email Accounts API
// =====================================================

export async function fetchEmailAccounts(): Promise<EmailAccount[]> {
  return apiRequest("/api/email/accounts", {
    method: "GET",
  });
}

export async function createEmailAccount(
  account: Omit<EmailAccount, "id" | "createdAt" | "updatedAt" | "lastSyncAt">
): Promise<EmailAccount> {
  return apiRequest("/api/email/accounts", {
    method: "POST",
    body: JSON.stringify(account),
  });
}

// =====================================================
// Email Inbox API
// =====================================================

export async function fetchInbox(
  accountId?: number,
  limit: number = 50
): Promise<EmailMessage[]> {
  const params = new URLSearchParams();
  if (accountId) params.append("accountId", accountId.toString());
  params.append("limit", limit.toString());
  return apiRequest(`/api/email/inbox?${params.toString()}`, {
    method: "GET",
  });
}

export async function fetchEmailMessage(messageId: number): Promise<EmailMessage> {
  return apiRequest(`/api/email/messages/${messageId}`, {
    method: "GET",
  });
}

export async function sendEmail(
  accountId: number,
  to: string | string[],
  subject: string,
  body: string,
  bodyHtml?: string,
  attachments?: any[]
): Promise<{ success: boolean }> {
  return apiRequest("/api/email/send", {
    method: "POST",
    body: JSON.stringify({
      accountId,
      to,
      subject,
      body,
      bodyHtml,
      attachments,
    }),
  });
}

export async function syncEmails(accountId: number): Promise<{ success: boolean; emailsFetched: number }> {
  return apiRequest("/api/email/sync", {
    method: "POST",
    body: JSON.stringify({ accountId }),
  });
}

// =====================================================
// Email Templates API
// =====================================================

export async function fetchEmailTemplates(category?: string): Promise<EmailTemplate[]> {
  const params = category ? `?category=${encodeURIComponent(category)}` : "";
  return apiRequest(`/api/email/templates${params}`, {
    method: "GET",
  });
}

export async function createEmailTemplate(
  template: Omit<EmailTemplate, "id" | "createdAt" | "updatedAt" | "createdBy">
): Promise<EmailTemplate> {
  return apiRequest("/api/email/templates", {
    method: "POST",
    body: JSON.stringify(template),
  });
}

// =====================================================
// API Client Export
// =====================================================

export const emailApi = {
  // Accounts
  fetchEmailAccounts,
  createEmailAccount,
  
  // Inbox
  fetchInbox,
  fetchEmailMessage,
  sendEmail,
  syncEmails,
  
  // Templates
  fetchEmailTemplates,
  createEmailTemplate,
};

