// Email Service for Gmail API Integration
// Uses Google Gmail API for email operations

import { db } from "../db";
import { emailAccounts, emailMessages, emailTemplates, emailRoutingRules } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";

// Encryption key for OAuth tokens (should be in environment variable)
const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY || "default-key-change-in-production";
const ALGORITHM = "aes-256-cbc";

/**
 * Encrypt OAuth token
 */
function encryptToken(token: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
  let encrypted = cipher.update(token, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

/**
 * Decrypt OAuth token
 */
function decryptToken(encryptedToken: string): string {
  const parts = encryptedToken.split(":");
  const iv = Buffer.from(parts[0], "hex");
  const encrypted = parts[1];
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * Email Service Class for Gmail API
 */
export class EmailService {
  /**
   * Refresh OAuth token if expired
   */
  private async refreshTokenIfNeeded(accountId: number): Promise<void> {
    try {
      const [account] = await db
        .select()
        .from(emailAccounts)
        .where(eq(emailAccounts.id, accountId))
        .limit(1);

      if (!account || !account.tokenExpiry) return;

      // Check if token is expired or expiring soon (within 5 minutes)
      const expiryTime = new Date(account.tokenExpiry).getTime();
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      if (expiryTime - now < fiveMinutes) {
        // TODO: Implement token refresh
        // const { google } = require('googleapis');
        // const oauth2Client = new google.auth.OAuth2(...);
        // const { credentials } = await oauth2Client.refreshAccessToken();
        // await db.update(emailAccounts)
        //   .set({
        //     accessToken: encryptToken(credentials.access_token!),
        //     tokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
        //   })
        //   .where(eq(emailAccounts.id, accountId));
      }
    } catch (error) {
      console.error("Error refreshing token:", error);
    }
  }

  /**
   * Get Gmail API client for an account
   */
  private async getGmailClient(accountId: number): Promise<any> {
    try {
      const [account] = await db
        .select()
        .from(emailAccounts)
        .where(eq(emailAccounts.id, accountId))
        .limit(1);

      if (!account || !account.isActive) {
        throw new Error("Email account not found or inactive");
      }

      // Refresh token if needed
      await this.refreshTokenIfNeeded(accountId);

      // Re-fetch account to get updated token
      const [updatedAccount] = await db
        .select()
        .from(emailAccounts)
        .where(eq(emailAccounts.id, accountId))
        .limit(1);

      if (!updatedAccount) {
        throw new Error("Email account not found");
      }

      // TODO: Implement Gmail API client initialization
      // const { google } = require('googleapis');
      // const oauth2Client = new google.auth.OAuth2(
      //   process.env.GOOGLE_CLIENT_ID,
      //   process.env.GOOGLE_CLIENT_SECRET,
      //   process.env.GOOGLE_REDIRECT_URI
      // );
      // 
      // // Use accessToken/refreshToken fields, fallback to legacy fields
      // const accessToken = account.accessToken 
      //   ? decryptToken(account.accessToken)
      //   : account.imapPassword 
      //     ? decryptToken(account.imapPassword)
      //     : null;
      // const refreshToken = account.refreshToken
      //   ? decryptToken(account.refreshToken)
      //   : account.smtpPassword
      //     ? decryptToken(account.smtpPassword)
      //     : null;
      // 
      // oauth2Client.setCredentials({
      //   access_token: accessToken,
      //   refresh_token: refreshToken,
      // });
      // 
      // // Auto-refresh token if expired
      // if (account.tokenExpiry && new Date(account.tokenExpiry) < new Date()) {
      //   const { credentials } = await oauth2Client.refreshAccessToken();
      //   // Update stored tokens
      //   await db.update(emailAccounts)
      //     .set({
      //       accessToken: encryptToken(credentials.access_token!),
      //       tokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
      //     })
      //     .where(eq(emailAccounts.id, accountId));
      // }
      // 
      // return google.gmail({ version: 'v1', auth: oauth2Client });

      // Placeholder: return null for now
      return null;
    } catch (error) {
      console.error("Error getting Gmail client:", error);
      throw error;
    }
  }

  /**
   * Test Gmail API connection
   */
  async testGmailConnection(accountId: number): Promise<boolean> {
    try {
      const gmail = await this.getGmailClient(accountId);
      if (!gmail) return false;

      // TODO: Test connection by getting user profile
      // const response = await gmail.users.getProfile({ userId: 'me' });
      // return !!response.data.emailAddress;

      // Placeholder: return true for now
      return true;
    } catch (error) {
      console.error("Error testing Gmail connection:", error);
      return false;
    }
  }

  /**
   * Fetch emails from Gmail account
   */
  async fetchEmails(accountId: number, limit: number = 50): Promise<any[]> {
    try {
      const gmail = await this.getGmailClient(accountId);
      if (!gmail) return [];

      // TODO: Implement Gmail API email fetching
      // const response = await gmail.users.messages.list({
      //   userId: 'me',
      //   maxResults: limit,
      //   q: 'is:unread' // Only fetch unread emails
      // });
      // 
      // const messages = response.data.messages || [];
      // const emails: any[] = [];
      // 
      // for (const message of messages) {
      //   const msg = await gmail.users.messages.get({
      //     userId: 'me',
      //     id: message.id,
      //     format: 'full'
      //   });
      //   
      //   const email = this.parseGmailMessage(msg.data);
      //   emails.push(email);
      // }
      // 
      // return emails;

      // Placeholder: return empty array
      return [];
    } catch (error) {
      console.error("Error fetching emails from Gmail:", error);
      throw error;
    }
  }

  /**
   * Parse Gmail API message format
   */
  private parseGmailMessage(gmailMessage: any): any {
    // TODO: Parse Gmail message format
    // Extract headers, body, attachments, etc.
    // Return in our standard format
    return {
      messageId: gmailMessage.id,
      threadId: gmailMessage.threadId,
      // ... parse headers and body
    };
  }

  /**
   * Send email via Gmail API
   */
  async sendEmail(
    accountId: number,
    to: string | string[],
    subject: string,
    body: string,
    bodyHtml?: string,
    attachments?: any[]
  ): Promise<boolean> {
    try {
      const gmail = await this.getGmailClient(accountId);
      if (!gmail) throw new Error("Gmail client not available");

      // TODO: Implement Gmail API email sending
      // const { google } = require('googleapis');
      // 
      // // Create email message in RFC 2822 format
      // const toAddresses = Array.isArray(to) ? to.join(', ') : to;
      // let email = [
      //   `To: ${toAddresses}`,
      //   `Subject: ${subject}`,
      //   `Content-Type: text/html; charset=utf-8`,
      //   '',
      //   bodyHtml || body
      // ].join('\n');
      // 
      // // Encode message in base64url format
      // const encodedMessage = Buffer.from(email)
      //   .toString('base64')
      //   .replace(/\+/g, '-')
      //   .replace(/\//g, '_')
      //   .replace(/=+$/, '');
      // 
      // await gmail.users.messages.send({
      //   userId: 'me',
      //   requestBody: {
      //     raw: encodedMessage
      //   }
      // });

      // Placeholder: return true for now
      return true;
    } catch (error) {
      console.error("Error sending email via Gmail:", error);
      throw error;
    }
  }

  /**
   * Render email template with variables
   */
  renderTemplate(template: any, variables: Record<string, any>): { subject: string; bodyHtml: string; bodyText: string } {
    let subject = template.subject;
    let bodyHtml = template.bodyHtml || "";
    let bodyText = template.bodyText || "";

    // Simple variable replacement: {{variableName}}
    Object.keys(variables).forEach((key) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      subject = subject.replace(regex, variables[key]);
      bodyHtml = bodyHtml.replace(regex, variables[key]);
      bodyText = bodyText.replace(regex, variables[key]);
    });

    return { subject, bodyHtml, bodyText };
  }

  /**
   * Process email routing rules
   */
  async processRoutingRules(email: any): Promise<void> {
    try {
      const rules = await db
        .select()
        .from(emailRoutingRules)
        .where(eq(emailRoutingRules.isActive, true))
        .orderBy(desc(emailRoutingRules.priority));

      for (const rule of rules) {
        if (this.evaluateRule(rule, email)) {
          await this.executeRuleAction(rule, email);
          // Stop after first matching rule (or continue based on rule config)
          const actionConfig = rule.actionConfig as any;
          if (!actionConfig || actionConfig.stopAfterMatch !== false) {
            break;
          }
        }
      }
    } catch (error) {
      console.error("Error processing routing rules:", error);
    }
  }

  /**
   * Evaluate if a routing rule matches an email
   */
  private evaluateRule(rule: any, email: any): boolean {
    const condition = rule.condition;
    const ruleType = rule.ruleType;

    switch (ruleType) {
      case "subject_contains":
        return email.subject?.toLowerCase().includes(condition.value?.toLowerCase() || "");
      case "from_contains":
        return email.fromAddress?.toLowerCase().includes(condition.value?.toLowerCase() || "");
      case "to_contains":
        return email.toAddresses?.some((addr: string) =>
          addr.toLowerCase().includes(condition.value?.toLowerCase() || "")
        );
      default:
        return false;
    }
  }

  /**
   * Execute a routing rule action
   */
  private async executeRuleAction(rule: any, email: any): Promise<void> {
    const action = rule.action;
    const config = rule.actionConfig || {};

    switch (action) {
      case "route_to_client":
        if (config.clientId) {
          await db
            .update(emailMessages)
            .set({ clientId: config.clientId })
            .where(eq(emailMessages.id, email.id));
        }
        break;
      case "assign_to_user":
        // TODO: Implement user assignment logic
        break;
      case "create_task":
        // TODO: Implement task creation logic
        break;
      default:
        console.warn(`Unknown routing action: ${action}`);
    }
  }
}

export const emailService = new EmailService();

