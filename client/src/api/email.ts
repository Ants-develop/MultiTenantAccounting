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
  const res = await apiRequest("GET", "/api/email/accounts");
  return res.json();
}

export async function createEmailAccount(
  account: Omit<EmailAccount, "id" | "createdAt" | "updatedAt" | "lastSyncAt">
): Promise<EmailAccount> {
  const res = await apiRequest("POST", "/api/email/accounts", account);
  return res.json();
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
  const res = await apiRequest("GET", `/api/email/inbox?${params.toString()}`);
  return res.json();
}

export async function fetchEmailMessage(messageId: number): Promise<EmailMessage> {
  const res = await apiRequest("GET", `/api/email/messages/${messageId}`);
  return res.json();
}

export async function sendEmail(
  accountId: number,
  to: string | string[],
  subject: string,
  body: string,
  bodyHtml?: string,
  attachments?: any[]
): Promise<{ success: boolean }> {
  const res = await apiRequest("POST", "/api/email/send", {
    accountId,
    to,
    subject,
    body,
    bodyHtml,
    attachments,
  });
  return res.json();
}

export async function syncEmails(accountId: number): Promise<{ success: boolean; emailsFetched: number }> {
  const res = await apiRequest("POST", "/api/email/sync", { accountId });
  return res.json();
}

// =====================================================
// Email Templates API
// =====================================================

export async function fetchEmailTemplates(category?: string): Promise<EmailTemplate[]> {
  const params = category ? `?category=${encodeURIComponent(category)}` : "";
  const res = await apiRequest("GET", `/api/email/templates${params}`);
  return res.json();
}

export async function createEmailTemplate(
  template: Omit<EmailTemplate, "id" | "createdAt" | "updatedAt" | "createdBy">
): Promise<EmailTemplate> {
  const res = await apiRequest("POST", "/api/email/templates", template);
  return res.json();
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

