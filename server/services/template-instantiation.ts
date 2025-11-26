// Template Instantiation Service
// Creates tasks from templates with variable replacement

import { db } from "../db";
import { taskTemplates, tasksTable, taskChecklists, users, userCompanies } from "@shared/schema";
import { eq, and } from "drizzle-orm";

interface TaskTemplateData {
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  estimated_minutes?: number;
  deadline_offset?: string; // e.g., "+3 days", "+1 week"
  checklists: Array<{
    text: string;
    assigned_to_role?: string; // e.g., "accountant", "manager"
  }>;
  metadata?: Record<string, any>;
}

/**
 * Replace variables in a string with provided values
 * Supports {{variable_name}} syntax
 */
function replaceVariables(text: string, variables: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    return variables[varName] || match;
  });
}

/**
 * Calculate due date from deadline offset
 * Supports formats like "+3 days", "+1 week", "+2 months"
 */
function calculateDueDate(offset?: string): Date | undefined {
  if (!offset) return undefined;

  const now = new Date();
  const match = offset.match(/^\+(\d+)\s*(day|days|week|weeks|month|months)$/i);
  
  if (!match) {
    console.warn(`Invalid deadline_offset format: ${offset}`);
    return undefined;
  }

  const amount = parseInt(match[1]);
  const unit = match[2].toLowerCase();

  const result = new Date(now);
  
  if (unit === 'day' || unit === 'days') {
    result.setDate(result.getDate() + amount);
  } else if (unit === 'week' || unit === 'weeks') {
    result.setDate(result.getDate() + (amount * 7));
  } else if (unit === 'month' || unit === 'months') {
    result.setMonth(result.getMonth() + amount);
  }

  return result;
}

/**
 * Find user by role for a specific client
 * Returns first user found with that role, or null
 */
async function findUserByRole(clientId: number, role: string): Promise<number | null> {
  // Normalize role name (case-insensitive, handle variations)
  const normalizedRole = role.toLowerCase().trim();
  
  // Map common role variations
  const roleMap: Record<string, string> = {
    'accountant': 'accountant',
    'manager': 'manager',
    'administrator': 'administrator',
    'admin': 'administrator',
    'assistant': 'assistant',
  };

  const mappedRole = roleMap[normalizedRole] || normalizedRole;

  // Query user_companies table for users with this role in this client
  const userCompany = await db
    .select({ userId: userCompanies.userId })
    .from(userCompanies)
    .where(
      and(
        eq(userCompanies.clientId, clientId),
        eq(userCompanies.role, mappedRole)
      )
    )
    .limit(1);

  if (userCompany.length > 0) {
    return userCompany[0].userId;
  }

  // If not found, try to find by global role
  const user = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.globalRole, mappedRole))
    .limit(1);

  return user.length > 0 ? user[0].id : null;
}

/**
 * Instantiate a template to create a task
 * @param templateId - ID of the template to instantiate
 * @param clientId - Client ID for the new task
 * @param createdBy - User ID creating the task
 * @param variables - Optional variables to replace in template (e.g., {client_name: "Acme Corp"})
 * @returns Task ID of the created task
 */
export async function instantiateTemplate(
  templateId: number,
  clientId: number,
  createdBy: number,
  variables: Record<string, string> = {}
): Promise<number> {
  // Fetch template
  const [template] = await db
    .select()
    .from(taskTemplates)
    .where(eq(taskTemplates.id, templateId))
    .limit(1);

  if (!template) {
    throw new Error(`Template ${templateId} not found`);
  }

  // Parse template data
  const templateData = template.data as TaskTemplateData;

  // Replace variables in title and description
  const title = replaceVariables(templateData.title, variables);
  const description = templateData.description 
    ? replaceVariables(templateData.description, variables)
    : undefined;

  // Calculate due date from deadline offset
  const dueAt = calculateDueDate(templateData.deadline_offset);

  // Create task
  const [task] = await db
    .insert(tasksTable)
    .values({
      clientId,
      templateId,
      title,
      description,
      status: 'open',
      priority: templateData.priority,
      tags: templateData.tags,
      estimatedMinutes: templateData.estimated_minutes,
      metadata: templateData.metadata || {},
      dueAt,
      createdBy,
    })
    .returning();

  // Create checklist items
  if (templateData.checklists && templateData.checklists.length > 0) {
    const checklistItems = await Promise.all(
      templateData.checklists.map(async (checklist, index) => {
        // Replace variables in checklist text
        const text = replaceVariables(checklist.text, variables);

        // Find assignee by role if specified
        let assignedTo: number | null = null;
        if (checklist.assigned_to_role) {
          assignedTo = await findUserByRole(clientId, checklist.assigned_to_role);
          if (!assignedTo) {
            console.warn(`Could not find user with role "${checklist.assigned_to_role}" for client ${clientId}`);
          }
        }

        return {
          taskId: task.id,
          text,
          completed: false,
          assignedTo,
          orderIdx: index,
        };
      })
    );

    if (checklistItems.length > 0) {
      await db.insert(taskChecklists).values(checklistItems);
    }
  }

  return task.id;
}

