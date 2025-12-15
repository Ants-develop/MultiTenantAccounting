// Global Administration API Routes
import express from "express";
import { db } from "../db";
import { supabaseAdmin } from "../supabase";
import { sql, eq, desc, and, or } from "drizzle-orm";
import {
  profiles, companies, userCompanies, accounts, activityLogs, companySettings,
  customers, vendors, invoices, bills, userClientModules,
  type Profile, type Company, type UserCompany
} from "../../shared/schema";
import { activityLogger, ACTIVITY_ACTIONS, RESOURCE_TYPES } from "../services/activity-logger";
import { z } from "zod";

const router = express.Router();

type SupabaseStatusRow = {
  table: string;
  category: string;
  status: "ok" | "error";
  message?: string;
  count?: number | null;
};

const SUPABASE_STATUS_TABLES: Array<{ name: string; category: string; schema?: string }> = [
  // Core System
  { name: "profiles", category: "Core" },
  { name: "user_roles", category: "Core" },
  { name: "user_invitations", category: "Core" },
  { name: "audit_logs", category: "Core" },

  // Client Management
  { name: "clients", category: "Clients" },
  { name: "client_contacts", category: "Clients" },
  { name: "client_team_assignments", category: "Clients" },
  { name: "client_services", category: "Clients" },

  // Practice Management - Workflows
  { name: "workflow_templates", category: "Workflows" },
  { name: "workflow_stages", category: "Workflows" },
  { name: "workflows", category: "Workflows" },
  { name: "workflow_stage_history", category: "Workflows" },

  // Practice Management - Tasks
  { name: "tasks", category: "Tasks" },
  { name: "task_templates", category: "Tasks" },
  { name: "task_comments", category: "Tasks" },
  { name: "checklists", category: "Tasks" },

  // CRM & Deals
  { name: "deals", category: "CRM" },
  { name: "deal_stages", category: "CRM" },
  { name: "deal_activities", category: "CRM" },
  { name: "deal_contacts", category: "CRM" },

  // Client Pipelines
  { name: "client_pipelines", category: "Pipelines" },
  { name: "client_pipeline_stages", category: "Pipelines" },
  { name: "client_task_templates", category: "Pipelines" },

  // Communications
  { name: "conversations", category: "Messaging" },
  { name: "conversation_participants", category: "Messaging" },
  { name: "messages", category: "Messaging" },
  { name: "notifications", category: "Messaging" },
  { name: "email_templates", category: "Messaging" },

  // Feed/Social
  { name: "feed_profiles", category: "Feed" },
  { name: "feed_posts", category: "Feed" },
  { name: "feed_likes", category: "Feed" },
  { name: "feed_comments", category: "Feed" },

  // Calendar
  { name: "calendar_events", category: "Calendar" },
  { name: "calendar_event_participants", category: "Calendar" },

  // Documents
  { name: "documents", category: "Documents" },
  { name: "document_categories", category: "Documents" },
  { name: "document_access_log", category: "Documents" },

  // Passwords
  { name: "passwords", category: "Passwords" },
  { name: "password_folders", category: "Passwords" },
  { name: "password_access_log", category: "Passwords" },

  // Banking
  { name: "bank_accounts", category: "Banking" },
  { name: "bank_transactions", category: "Banking" },
];

router.get("/supabase-status", async (req, res) => {
  try {
    const statuses: SupabaseStatusRow[] = [];

    for (const { name, category, schema } of SUPABASE_STATUS_TABLES) {
      const tableSchema = schema ?? "public";

      try {
        const existsResult: any = await db.execute(
          sql`
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = ${tableSchema}
              AND table_name = ${name}
            LIMIT 1
          `
        );

        const existsRows = Array.isArray(existsResult)
          ? existsResult
          : (existsResult?.rows ?? []);

        const exists = existsRows.length > 0;

        if (!exists) {
          statuses.push({
            table: name,
            category,
            status: "error",
            message: `Table not found (${tableSchema}.${name})`,
            count: null,
          });
          continue;
        }

        // NOTE: Table names are hard-coded above (not user input), so using sql.raw is safe here.
        const countQuery = `SELECT COUNT(*)::int AS count FROM "${tableSchema}"."${name}"`;
        const countResult: any = await db.execute(sql.raw(countQuery));
        const countRows = Array.isArray(countResult)
          ? countResult
          : (countResult?.rows ?? []);

        const count = typeof (countRows?.[0] as any)?.count === "number"
          ? (countRows?.[0] as any).count
          : parseInt((countRows?.[0] as any)?.count || "0", 10);

        statuses.push({
          table: name,
          category,
          status: "ok",
          count: Number.isFinite(count) ? count : 0,
        });
      } catch (innerError: any) {
        statuses.push({
          table: name,
          category,
          status: "error",
          message: innerError?.message || "Unknown error",
          count: null,
        });
      }
    }

    res.json(statuses);
  } catch (error: any) {
    console.error("Error checking Supabase table status:", error);
    res.status(500).json({ error: "Failed to check table status" });
  }
});

const createGlobalUserSchema = z.object({
  username: z.string().trim().min(3),
  email: z.string().trim().email(),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  password: z.string().min(6),
  globalRole: z.enum(["global_administrator", "user"]),
  isActive: z.boolean().optional(),
});

// Get all users with their company assignments
router.get("/users", async (req, res) => {
  try {
    const allUsers = await db
      .select({
        id: profiles.id,
        username: profiles.username,
        email: profiles.email,
        firstName: profiles.firstName,
        lastName: profiles.lastName,
        globalRole: profiles.globalRole,
        isActive: profiles.isActive,
        createdAt: profiles.createdAt,
        // lastLogin field doesn't exist in schema yet
      })
      .from(profiles)
      .orderBy(desc(profiles.createdAt));

    // Get company assignments for each user
    const usersWithCompanies = await Promise.all(
      allUsers.map(async (user) => {
        const companyAssignments = await db
          .select({
            id: companies.id,
            name: companies.name,
            code: companies.code,
            role: userCompanies.role,
            isActive: userCompanies.isActive,
            assignedAt: userCompanies.createdAt
          })
          .from(userCompanies)
          .innerJoin(companies, eq(userCompanies.clientId, companies.id))
          .where(eq(userCompanies.userId, user.id))
          .orderBy(companies.name);

        return {
          ...user,
          companies: companyAssignments,
          companiesCount: companyAssignments.length,
          lastLogin: null,
        };
      })
    );

    res.json(usersWithCompanies);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.post("/users", async (req, res) => {
  try {
    const parsedResult = createGlobalUserSchema.safeParse(req.body);

    if (!parsedResult.success) {
      const message = parsedResult.error.issues
        .map((issue) => issue.message)
        .join(", ");
      return res.status(400).json({ error: message });
    }

    const { username, email, firstName, lastName, password, globalRole, isActive } = parsedResult.data;

    // Check if user exists in profiles first (quick check)
    const existingProfile = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(
        or(
          eq(profiles.username, username),
          eq(profiles.email, email)
        )
      )
      .limit(1);

    if (existingProfile.length > 0) {
      return res.status(400).json({ error: "Username or email already exists" });
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        username,
        first_name: firstName,
        last_name: lastName
      }
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    if (!authData.user) {
      return res.status(500).json({ error: "Failed to create user in Supabase" });
    }

    // Create profile
    const [createdProfile] = await db
      .insert(profiles)
      .values({
        id: authData.user.id,
        username,
        email,
        firstName,
        lastName,
        globalRole,
        isActive: isActive ?? true,
      })
      .returning();

    const actingUserId = (req as any).user?.id || createdProfile.id;

    await activityLogger.logCRUD(
      ACTIVITY_ACTIONS.USER_CREATE,
      RESOURCE_TYPES.USER,
      {
        userId: actingUserId,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || undefined,
      },
      createdProfile.id,
      undefined,
      {
        username,
        email,
        firstName,
        lastName,
        globalRole,
        isActive: createdProfile.isActive,
      }
    );

    res.status(201).json({
      id: createdProfile.id,
      username: createdProfile.username,
      email: createdProfile.email,
      firstName: createdProfile.firstName,
      lastName: createdProfile.lastName,
      globalRole: createdProfile.globalRole,
      isActive: createdProfile.isActive,
      createdAt: createdProfile.createdAt,
      companiesCount: 0,
      lastLogin: null,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    await activityLogger.logError(
      ACTIVITY_ACTIONS.USER_CREATE,
      RESOURCE_TYPES.USER,
      {
        userId: (req as any).user?.id || null,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || undefined,
      },
      error as Error
    );
    res.status(500).json({ error: "Failed to create user" });
  }
});

// Get all client companies with user counts
router.get("/clients", async (req, res) => {
  try {
    const search = (req.query.search as string || "").toLowerCase();
    const status = req.query.status as string || "all";
    const verification = req.query.verification as string || "all";

    let whereConditions = [];

    // Apply search filter
    if (search) {
      whereConditions.push(
        sql`(LOWER(${companies.name}) LIKE ${`%${search}%`} OR LOWER(${companies.code}) LIKE ${`%${search}%`})`
      );
    }

    // Apply status filter
    if (status === "active") {
      whereConditions.push(eq(companies.isActive, true));
    } else if (status === "inactive") {
      whereConditions.push(eq(companies.isActive, false));
    }

    // Build base query with where conditions
    let baseQuery: any = db.select().from(companies);

    // Apply where conditions
    if (whereConditions.length > 0) {
      baseQuery = baseQuery.where(and(...whereConditions));
    }

    // Execute base query to get filtered companies
    const allFilteredCompanies = await baseQuery;
    
    // Debug: Log the actual query result with database info
    const supabaseUrl = process.env.SUPABASE_URL || 'not set';
    const projectRef = supabaseUrl.includes('https://') ? supabaseUrl.replace('https://', '').split('.')[0] : 'unknown';
    console.log(`[Global Admin API] /clients - Found ${allFilteredCompanies.length} companies in database`);
    console.log(`[Global Admin API] Database: Supabase (${projectRef})`);
    if (allFilteredCompanies.length > 0) {
      console.log(`[Global Admin API] Company IDs: ${allFilteredCompanies.map((c: any) => c.id).join(', ')}`);
      console.log(`[Global Admin API] Company Names: ${allFilteredCompanies.map((c: any) => c.name).join(', ')}`);
    } else {
      console.log(`[Global Admin API] No companies found in database`);
    }

    // Now get the stats for each filtered company
    // NOTE: Run sequentially to avoid exhausting pooled connections (Supabase pooler limits)
    const companiesWithStats: any[] = [];
    for (const company of allFilteredCompanies) {
      const stats = await db
        .select({
          userCount: sql<number>`count(${userCompanies.userId})::int`,
          activeUserCount: sql<number>`count(case when ${userCompanies.isActive} then 1 end)::int`,
        })
        .from(userCompanies)
        .where(eq(userCompanies.clientId, company.id));

      companiesWithStats.push({
        ...company,
        userCount: stats[0]?.userCount || 0,
        activeUserCount: stats[0]?.activeUserCount || 0,
      });
    }

    companiesWithStats.sort((a: any, b: any) => a.name.localeCompare(b.name));

    // Get user details for each company (sequential to prevent connection spikes)
    const companiesWithUsers: any[] = [];
    for (const company of companiesWithStats) {
      const companyUsers = await db
        .select({
          id: profiles.id,
          firstName: profiles.firstName,
          lastName: profiles.lastName,
          username: profiles.username,
        })
        .from(userCompanies)
        .innerJoin(profiles, eq(userCompanies.userId, profiles.id))
        .where(eq(userCompanies.clientId, company.id))
        .limit(5); // Only get first 5 for display

      companiesWithUsers.push({
        ...company,
        users: companyUsers,
      });
    }

    // Apply verification filter (client-side for now, since we don't have that data in DB)
    let filteredCompanies = companiesWithUsers;
    if (verification !== "all") {
      // You can add RS verification status field to the companies table later
      // For now, this is a placeholder
    }

    // Debug: Log final response
    console.log(`[Global Admin API] /clients - Returning ${filteredCompanies.length} companies`);
    
    res.json({ data: filteredCompanies });
  } catch (error) {
    console.error("Error fetching companies:", error);
    res.status(500).json({ error: "Failed to fetch companies" });
  }
});

// Get user-company assignments with details
router.get("/user-assignments", async (req, res) => {
  try {
    const assignments = await db
      .select({
        id: userCompanies.id,
        userId: profiles.id,
        username: profiles.username,
        userEmail: profiles.email,
        userFullName: sql<string>`${profiles.firstName} || ' ' || ${profiles.lastName}`,
        companyId: companies.id,
        companyName: companies.name,
        companyCode: companies.code,
        role: userCompanies.role,
        isActive: userCompanies.isActive,
        createdAt: userCompanies.createdAt,
        // updatedAt field doesn't exist in user_companies schema
      })
      .from(userCompanies)
      .innerJoin(profiles, eq(userCompanies.userId, profiles.id))
      .innerJoin(companies, eq(userCompanies.clientId, companies.id))
      .orderBy(companies.name, profiles.username);

    res.json(assignments);
  } catch (error) {
    console.error("Error fetching user assignments:", error);
    res.status(500).json({ error: "Failed to fetch user assignments" });
  }
});

// Get users for a specific client company
router.get("/clients/:companyId/users", async (req, res) => {
  try {
    const companyId = req.params.companyId;
    
    if (!companyId) {
      return res.status(400).json({ error: "Invalid company ID" });
    }

    // Check if company exists
    const company = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (company.length === 0) {
      return res.status(404).json({ error: "Company not found" });
    }

    // Get all users assigned to this company
    const companyUsers = await db
      .select({
        id: profiles.id,
        username: profiles.username,
        email: profiles.email,
        firstName: profiles.firstName,
        lastName: profiles.lastName,
        role: userCompanies.role,
        isActive: userCompanies.isActive,
        lastLogin: sql<string>`NULL`, // TODO: Add lastLogin field to profiles table
        joinedAt: userCompanies.createdAt,
        assignmentId: userCompanies.id, // Include assignment ID for editing/deleting
      })
      .from(userCompanies)
      .innerJoin(profiles, eq(userCompanies.userId, profiles.id))
      .where(eq(userCompanies.clientId, companyId))
      .orderBy(profiles.firstName, profiles.lastName);

    res.json(companyUsers);
  } catch (error) {
    console.error("Error fetching company users:", error);
    res.status(500).json({ error: "Failed to fetch company users" });
  }
});

// Create new client company
router.post("/clients", async (req, res) => {
  try {
    const { name, code, address, description, phone, email, taxId, fiscalYearStart, currency, tenantCode, manager, accountingSoftware, idCode, userAssignments } = req.body;

    // Validate required fields
    if (!name || !code) {
      return res.status(400).json({ error: "Company name and code are required" });
    }

    // Check if company code already exists
    const existingCompany = await db
      .select()
      .from(companies)
      .where(eq(companies.code, code))
      .limit(1);

    if (existingCompany.length > 0) {
      return res.status(400).json({ error: "Company code already exists" });
    }

    // Parse tenantCode to string (VARCHAR(50) in DB) - accept both string and number
    let parsedTenantCode: string | null = null;
    if (tenantCode !== undefined && tenantCode !== null) {
      // Convert to string for storage
      parsedTenantCode = String(tenantCode).trim() || null;
    }

    const normalizedAddress = address ?? description ?? null;

    const newCompany = await db
      .insert(companies)
      .values({
        name,
        code,
        address: normalizedAddress,
        phone,
        email,
        taxId,
        fiscalYearStart: fiscalYearStart || 1,
        currency: currency || 'USD',
        tenantCode: parsedTenantCode,
        manager,
        accountingSoftware,
        idCode,
        isActive: true
      })
      .returning();

    // Get the current user ID from Supabase Auth (set by requireGlobalAdmin middleware)
    const currentUserId = (req as any).user?.id;

    // Define available modules
    const availableModules = ['audit', 'accounting', 'banking'];

    if (currentUserId) {
      // Automatically assign the global administrator as an administrator of the new company
      try {
        await db.insert(userCompanies).values({
          userId: currentUserId,
          clientId: newCompany[0].id,
          role: 'administrator',
          isActive: true
        });

        // Create module permissions for the global admin
        const modulePermissions = availableModules.map(module => ({
          userId: currentUserId,
          clientId: newCompany[0].id,
          module,
          canView: true,
          canCreate: true,
          canEdit: true,
          canDelete: true,
        }));

        await db.insert(userClientModules).values(modulePermissions);

        console.log(`Auto-assigned global admin (user ${currentUserId}) to company ${newCompany[0].id} as administrator with full permissions`);

        // Log the assignment activity
        await activityLogger.logCRUD(
          ACTIVITY_ACTIONS.USER_ASSIGN,
          RESOURCE_TYPES.USER_COMPANY,
          {
            userId: currentUserId,
            companyId: newCompany[0].id,
            ipAddress: req.ip,
            userAgent: req.get("User-Agent")
          },
          undefined,
          undefined,
          {
            userId: currentUserId,
            companyId: newCompany[0].id,
            role: 'administrator',
            autoAssigned: true
          }
        );
      } catch (assignmentError) {
        console.error('Failed to auto-assign user to company:', assignmentError);
        await activityLogger.logError(
          ACTIVITY_ACTIONS.USER_ASSIGN,
          RESOURCE_TYPES.USER_COMPANY,
          {
            userId: currentUserId,
            companyId: newCompany[0].id,
            ipAddress: req.ip,
            userAgent: req.get("User-Agent")
          },
          assignmentError as Error,
          newCompany[0].id,
          { autoAssignment: true }
        );
      }

      // Process additional user assignments from request body
      if (userAssignments && Array.isArray(userAssignments)) {
        try {
          for (const assignment of userAssignments) {
            // Skip if user is already auto-assigned (current user)
            if (assignment.userId === currentUserId) {
              continue;
            }

            await db.insert(userCompanies).values({
              userId: assignment.userId,
              clientId: newCompany[0].id,
              role: assignment.role || 'accountant',
              isActive: true
            });

            // Create module permissions for the assigned user
            // Give accountants full access to all modules for now
            const modulePermissions = availableModules.map(module => ({
              userId: assignment.userId,
              clientId: newCompany[0].id,
              module,
              canView: true,
              canCreate: assignment.role === 'administrator' || assignment.role === 'manager',
              canEdit: assignment.role === 'administrator' || assignment.role === 'manager',
              canDelete: assignment.role === 'administrator' || assignment.role === 'manager',
            }));

            await db.insert(userClientModules).values(modulePermissions);

            console.log(`Assigned user ${assignment.userId} to company ${newCompany[0].id} with role ${assignment.role || 'accountant'} and appropriate module permissions`);
          }
        } catch (assignmentError) {
          console.error('Failed to assign additional users to company:', assignmentError);
          // Don't fail the company creation if additional assignments fail
        }
      }

      // Log the company creation activity
      await activityLogger.logCRUD(
        ACTIVITY_ACTIONS.COMPANY_CREATE,
        RESOURCE_TYPES.COMPANY,
        {
          userId: currentUserId,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent")
        },
        newCompany[0].id,
        undefined,
        {
          name,
          code,
        address: normalizedAddress,
          phone,
          email,
          taxId,
          fiscalYearStart,
          currency
        }
      );
    } else {
      console.warn('No user ID in session during company creation');
    }

    // Seed default chart of accounts for the new company
    try {
      const defaults = [
        // Main accounts
        { code: "0000", name: "საწყისი ნაშთების შუალედური ანგარიში", type: "asset", accountClass: "ზოგადი", category: "დამხმარე" },
        
        // 1000 - Current Assets
        { code: "1000", name: "მიმდინარე აქტივები", type: "asset", category: "აქტივები" },
        { code: "1100", name: "ნაღდი ფული სალაროში", type: "asset", parentCode: "1000", category: "აქტივები" },
        { code: "1200", name: "ფული საბანკო ანგარიშებზე", type: "asset", parentCode: "1000", category: "აქტივები" },
        { code: "1300", name: "მოკლევადიანი იწვესტიციები", type: "asset", parentCode: "1000", category: "აქტივები" },
        { code: "1400", name: "მოკლევადიანი მოთხოვნები", type: "asset", parentCode: "1000", category: "აქტივები" },
        { code: "1600", name: "სასაქონლო-მატერიალური მარაგი", type: "asset", parentCode: "1000", category: "აქტივები" },
        { code: "1700", name: "წინასწარ გაწეული ხარჯები", type: "asset", parentCode: "1000", category: "აქტივები" },
        { code: "1800", name: "დარიცხული მოთხოვნები", type: "asset", parentCode: "1000", category: "აქტივები" },
        
        // 2000 - Long-term Assets
        { code: "2000", name: "გრძელვადიანი აქტივები", type: "asset", category: "აქტივები" },
        { code: "2100", name: "ძირითადი საშუალებები", type: "asset", parentCode: "2000", category: "აქტივები" },
        { code: "2200", name: "ძირითადი საშუალებების ცვეთა", type: "asset", parentCode: "2000", category: "აქტივები" },
        { code: "2300", name: "გრძელვადიანი მოთხოვნები", type: "asset", parentCode: "2000", category: "აქტივები" },
        { code: "2400", name: "არამატერიალური აქტივები", type: "asset", parentCode: "2000", category: "აქტივები" },
        { code: "2500", name: "არამატერიალური აქტივების ამორტიზაცია", type: "asset", parentCode: "2000", category: "აქტივები" },
        
        // 3000 - Current Liabilities
        { code: "3000", name: "მიმდინარე ვალდებულებები", type: "liability", category: "ვალდებულება" },
        { code: "3100", name: "მოკლევადიანი ვალდებულებები", type: "liability", parentCode: "3000", category: "ვალდებულება" },
        { code: "3200", name: "მოკლევადიანი სესხები", type: "liability", parentCode: "3000", category: "ვალდებულება" },
        { code: "3300", name: "საგადასახადო ვალდებულებები", type: "liability", parentCode: "3000", category: "ვალდებულება" },
        { code: "3400", name: "დარიცხული ვალდებულებები", type: "liability", parentCode: "3000", category: "ვალდებულება" },
        
        // 4000 - Long-term Liabilities
        { code: "4000", name: "გრძელვადიანი ვალდებულებები", type: "liability", category: "ვალდებულება" },
        { code: "4100", name: "გრძელვადიანი სასესხო ვალდებულებები", type: "liability", parentCode: "4000", category: "ვალდებულება" },
        { code: "4200", name: "გადავადებული გადასახადები და სხვა გრძელვადიანი ვალდებულებები", type: "liability", parentCode: "4000", category: "ვალდებულება" },
        { code: "4400", name: "გადავადებული შემოსავალი", type: "liability", parentCode: "4000", category: "ვალდებულება" },
        
        // 5000 - Equity
        { code: "5000", name: "საკუთარი კაპიტალი", type: "equity", category: "კაპიტალი" },
        { code: "5100", name: "საწესდებო კაპიტალი", type: "equity", parentCode: "5000", category: "კაპიტალი" },
        { code: "5300", name: "მოგება-ზარალი", type: "equity", parentCode: "5000", category: "კაპიტალი" },
        { code: "5400", name: "რეზერვები და ფინანსირება", type: "equity", parentCode: "5000", category: "კაპიტალი" },
        { code: "5500", name: "ფინანსური და საგადასახადო შემოსავლის სხვაობა", type: "equity", parentCode: "5000", accountClass: "პერიოდის მოგება/ზარალი", category: "კაპიტალი" },
        
        // 6000 - Operating Revenue
        { code: "6000", name: "საოპერაციო შემოსავალი", type: "revenue", category: "შემოსავალი" },
        { code: "6100", name: "საოპერაციო შემოსავალი", type: "revenue", parentCode: "6000", category: "შემოსავალი" },
        { code: "6200", name: "შემოსავალი საგადასახადო", type: "revenue", parentCode: "6000", category: "შემოსავალი" },
        
        // 7000 - Operating Expenses
        { code: "7000", name: "საოპერაციო ხარჯები", type: "expense", category: "ხარჯი" },
        { code: "7100", name: "რეალიზებული პროდუქციის თვითღირებულება (წარმოებისთვის)", type: "expense", parentCode: "7000", category: "თვითღირებულება" },
        { code: "7200", name: "რეალიზებული საქონლის თვითღირებულება (სავაჭრო კომპანიებისთვის)", type: "expense", parentCode: "7000", category: "თვითღირებულება" },
        { code: "7300", name: "მიწოდების ხარჯები", type: "expense", parentCode: "7000", category: "ხარჯი" },
        { code: "7400", name: "საერთო-ადმინისტრაციული ხარჯები", type: "expense", parentCode: "7000", category: "ხარჯი" },
        
        // 8000 - Non-operating Income and Expenses
        { code: "8000", name: "არასაოპერაციო შემოსავლები და ხარჯები", type: "expense", category: "სხვა შემოსავლები / ხარჯები" },
        { code: "8100", name: "არასაოპერაციო შემოსავალი", type: "revenue", parentCode: "8000", category: "სხვა შემოსავლები / ხარჯები" },
        { code: "8200", name: "არასაოპერაციო ხარჯები", type: "expense", parentCode: "8000", category: "სხვა შემოსავლები / ხარჯები" },
        
        // 9000 - Special Income and Expenses
        { code: "9000", name: "განსაკუთრებული შემოსავლები და ხარჯები", type: "expense", category: "სხვა შემოსავლები / ხარჯები" },
        { code: "9100", name: "განსაკუთრებული შემოსავლები და ხარჯები", type: "expense", parentCode: "9000", category: "სხვა შემოსავლები / ხარჯები" },
        { code: "9200", name: "სხვა ხარჯები", type: "expense", parentCode: "9000", category: "სხვა შემოსავლები / ხარჯები" },
        
        // Auxiliary accounts
        { code: "A000", name: "მომწოდებლებთან ანგარიშსწორების შუალედური ანგარიში", type: "liability", accountClass: "ზოგადი", category: "დამხმარე" },
        { code: "B000", name: "მყიდველებთან ანგარიშსწორების შუალედური ანგარიში", type: "asset", accountClass: "ზოგადი", category: "დამხმარე" },
        { code: "C000", name: "კონვერტაცია", type: "asset", accountClass: "ზოგადი", category: "დამხმარე" },
        { code: "F000", name: "ფილიალებს შორის გადაადგილების შუალედური ანგარიში", type: "asset", accountClass: "ზოგადი", category: "დამხმარე" },
        { code: "I000", name: "შუალედური ანგარიში ინკასაციისთვის", type: "asset", accountClass: "ზოგადი", category: "დამხმარე" },
        { code: "O000", name: "შუალედური ანგარიში სხვა გატარებებისთვის", type: "asset", accountClass: "ზოგადი", category: "დამხმარე" },
        { code: "P000", name: "POS ტერმინალის შუალედური ანგარიში", type: "asset", accountClass: "ექვაირინგი", category: "დამხმარე" },
      ] as Array<{ 
        code: string; 
        name: string; 
        type: "asset"|"liability"|"equity"|"revenue"|"expense"; 
        parentCode?: string;
        accountClass?: string;
        category?: string;
      }>;

      const clientId = newCompany[0].id;
      const existing = await db.select().from(accounts).where(eq(accounts.clientId, clientId));
      if (existing.length === 0) {
        // First pass: create all accounts
        for (const account of defaults) {
          await db.insert(accounts).values({
            clientId,
            code: account.code,
            name: account.name,
            type: account.type,
            accountClass: account.accountClass || "",
            category: account.category || "",
            isActive: true,
          });
        }
        
        // Second pass: set up parent-child relationships
        for (const account of defaults) {
          if (account.parentCode) {
            // Find parent account
            const parentAccount = await db
              .select({ id: accounts.id })
              .from(accounts)
              .where(and(eq(accounts.clientId, clientId), eq(accounts.code, account.parentCode)));
            
            if (parentAccount.length > 0) {
              // Update child account with parent ID
              await db.update(accounts)
                .set({ parentId: parentAccount[0].id })
                .where(and(eq(accounts.clientId, clientId), eq(accounts.code, account.code)));
            }
          }
        }
        
        console.log(`✅ Seeded ${defaults.length} default accounts for company ${clientId}`);
      }
    } catch (seedError) {
      console.error('Failed to seed default accounts for new company:', seedError);
      // do not fail the company creation if seeding fails
    }

    res.status(201).json(newCompany[0]);
  } catch (error) {
    console.error("Error creating company:", error);
    res.status(500).json({ error: "Failed to create company" });
  }
});

// Assign user to company
router.post("/assign-user", async (req, res) => {
  try {
    const { userId, companyId, role } = req.body;

    if (!userId || !companyId || !role) {
      return res.status(400).json({ error: "User ID, Company ID, and role are required" });
    }

    // Check if assignment already exists
    const existingAssignment = await db
      .select()
      .from(userCompanies)
      .where(and(
        eq(userCompanies.userId, userId),
        eq(userCompanies.clientId, companyId)
      ))
      .limit(1);

    if (existingAssignment.length > 0) {
      return res.status(400).json({ error: "User is already assigned to this company" });
    }

    const assignment = await db
      .insert(userCompanies)
      .values({
        userId,
        clientId: companyId,
        role,
        isActive: true
      })
      .returning();

    // Log the activity
    // const currentUserId = req.user?.id; // TODO: Add user authentication middleware
    const currentUserId = null; // Placeholder until auth is implemented
    if (currentUserId) {
      const userDetails = await db
        .select({ username: profiles.username })
        .from(profiles)
        .where(eq(profiles.id, userId))
        .limit(1);
      
      const companyDetails = await db
        .select({ name: companies.name })
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1);

      await db.insert(activityLogs).values({
        userId: currentUserId,
        action: "ASSIGN_USER",
        resource: "USER_COMPANY",
        resourceId: assignment[0].id,
        details: `Assigned ${userDetails[0]?.username} to ${companyDetails[0]?.name} as ${role}`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || "Unknown"
      });
    }

    res.status(201).json(assignment[0]);
  } catch (error) {
    console.error("Error assigning user:", error);
    res.status(500).json({ error: "Failed to assign user to company" });
  }
});

// Get system statistics
router.get("/stats", async (req, res) => {
  try {
    // Get basic stats (these tables should always exist)
    const basicStats = await Promise.all([
      // Total users
      db.select({ count: sql<number>`count(*)::int` }).from(profiles),
      
      // Active users
      db.select({ count: sql<number>`count(*)::int` }).from(profiles).where(eq(profiles.isActive, true)),
      
      // Total companies
      db.select({ count: sql<number>`count(*)::int` }).from(companies),
      
      // Active companies
      db.select({ count: sql<number>`count(*)::int` }).from(companies).where(eq(companies.isActive, true)),
      
      // Total user-company assignments
      db.select({ count: sql<number>`count(*)::int` }).from(userCompanies),
      
      // Active assignments
      db.select({ count: sql<number>`count(*)::int` }).from(userCompanies).where(eq(userCompanies.isActive, true)),
      
      // Total accounts
      db.select({ count: sql<number>`count(*)::int` }).from(accounts)
    ]);

    // Try to get activity logs count, but don't fail if table doesn't exist
    let recentActivityCount = 0;
    try {
      const activityResult = await db.select({ count: sql<number>`count(*)::int` }).from(activityLogs)
        .where(sql`timestamp >= NOW() - INTERVAL '24 hours'`);
      recentActivityCount = activityResult[0].count;
    } catch (activityError: any) {
      console.warn("activity_logs table not found, setting recent activity to 0:", activityError.message);
      recentActivityCount = 0;
    }

    const systemStats = {
      totalUsers: basicStats[0][0].count,
      activeUsers: basicStats[1][0].count,
      totalCompanies: basicStats[2][0].count,
      activeCompanies: basicStats[3][0].count,
      totalTransactions: recentActivityCount,
      storageUsed: "2.3 GB",
      systemUptime: "15 days, 3 hours",
      lastBackup: "2024-01-20T02:00:00Z"
    };

    res.json(systemStats);
  } catch (error) {
    console.error("Error fetching system stats:", error);
    res.status(500).json({ error: "Failed to fetch system statistics" });
  }
});

// Get recent activity logs
router.get("/activity", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    try {
      const activities = await db
        .select({
          id: activityLogs.id,
          action: activityLogs.action,
          resource: activityLogs.resource,
          resourceId: activityLogs.resourceId,
          details: activityLogs.details,
          timestamp: activityLogs.timestamp,
          ipAddress: activityLogs.ipAddress,
          userId: activityLogs.userId,
          userName: sql<string>`COALESCE(${profiles.username}, 'Unknown User')`,
        })
        .from(activityLogs)
        .leftJoin(profiles, eq(activityLogs.userId, profiles.id))
        .orderBy(desc(activityLogs.timestamp))
        .limit(limit)
        .offset(offset);

      res.json(activities);
    } catch (activityError: any) {
      if (activityError.message.includes('relation "activity_logs" does not exist')) {
        console.warn("activity_logs table not found, returning empty array");
        // Return empty array if table doesn't exist
        res.json([]);
      } else {
        throw activityError;
      }
    }
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    res.status(500).json({ error: "Failed to fetch activity logs" });
  }
});


// PUT /api/global-admin/clients/:id - Update a client company
router.put("/clients/:id", async (req, res) => {
  const clientId = req.params.id;

  try {
    if (!clientId) {
      return res.status(400).json({ error: "Invalid client company ID" });
    }

    // Validate that the client company exists
    const existingClient = await db
      .select()
      .from(companies)
      .where(eq(companies.id, clientId))
      .limit(1);

    if (existingClient.length === 0) {
      return res.status(404).json({ error: "Client company not found" });
    }

    // Destructure and validate input
    const {
      name,
      code,
      address,
      phone,
      email,
      taxId,
      fiscalYearStart,
      currency,
      tenantCode,
      manager,
      accountingSoftware,
      idCode,
      isActive,
    } = req.body;

    // Validate required fields if provided
    if (name !== undefined && !name) {
      return res.status(400).json({ error: "Client company name cannot be empty" });
    }

    // Check for code uniqueness if code is being updated
    if (code !== undefined && code !== existingClient[0].code) {
      const codeExists = await db
        .select()
        .from(companies)
        .where(eq(companies.code, code))
        .limit(1);

      if (codeExists.length > 0) {
        return res.status(400).json({ error: "Client company code already exists" });
      }
    }

    // Check for tenant code uniqueness if tenant code is being updated
    // Convert to string for storage (VARCHAR(50))
    let parsedTenantCode: string | null = existingClient[0].tenantCode ? String(existingClient[0].tenantCode) : null;
    if (tenantCode !== undefined) {
      if (tenantCode !== null) {
        // Accept both string and number, convert to string
        parsedTenantCode = String(tenantCode).trim() || null;
      } else {
        parsedTenantCode = null;
      }

      if (parsedTenantCode !== null && parsedTenantCode !== String(existingClient[0].tenantCode || '')) {
        const tenantCodeExists = await db
          .select()
          .from(companies)
          .where(eq(companies.tenantCode, parsedTenantCode))
          .limit(1);

        if (tenantCodeExists.length > 0) {
          return res.status(400).json({ error: "Tenant code already exists" });
        }
      }
    }

    // Build update object only with provided fields
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code;
    if (address !== undefined) updateData.address = address;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (taxId !== undefined) updateData.taxId = taxId;
    if (fiscalYearStart !== undefined) updateData.fiscalYearStart = fiscalYearStart;
    if (currency !== undefined) updateData.currency = currency;
    if (tenantCode !== undefined) updateData.tenantCode = parsedTenantCode;
    if (manager !== undefined) updateData.manager = manager;
    if (accountingSoftware !== undefined) updateData.accountingSoftware = accountingSoftware;
    if (idCode !== undefined) updateData.idCode = idCode;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Update the client company
    const updatedClient = await db
      .update(companies)
      .set(updateData)
      .where(eq(companies.id, clientId))
      .returning();

    if (updatedClient.length === 0) {
      return res.status(404).json({ error: "Client company not found" });
    }

    // Log the update activity
    try {
      await activityLogger.logCRUD(
        ACTIVITY_ACTIONS.COMPANY_UPDATE,
        RESOURCE_TYPES.COMPANY,
        {
          userId: (req as any).user?.id,
          companyId: clientId,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        },
        clientId,
        undefined,
        { updatedFields: Object.keys(updateData) }
      );
    } catch (logError) {
      console.error("Failed to log client company update:", logError);
    }

    res.json(updatedClient[0]);
  } catch (error) {
    console.error("Error updating client company:", error);
    res.status(500).json({ error: "Failed to update client company" });
  }
});

router.delete("/clients/:id", async (req, res) => {
  const companyId = req.params.id;
  
  try {
    console.log("Delete company request received for ID:", req.params.id);

    if (!companyId) {
      console.log("Invalid company ID:", req.params.id);
      return res.status(400).json({ error: "Invalid company ID" });
    }

    console.log("Checking for assigned users...");
    // Check if company has users assigned
    const assignedUsers = await db
      .select()
      .from(userCompanies)
      .where(eq(userCompanies.clientId, companyId))
      .limit(1);

    if (assignedUsers.length > 0) {
      console.log("Company has assigned users, cannot delete");
      return res.status(400).json({ 
        error: "Cannot delete company with assigned users. Please remove all user assignments first." 
      });
    }

    console.log("Proceeding with cascade deletion for company...", companyId);
    // Cascade: remove all accounting data, then the company
    const deletedCompany = await db.transaction(async (tx) => {
      // Remove company-user assignments
      await tx.delete(userCompanies).where(eq(userCompanies.clientId, companyId));

      // Delete journal entry lines tied to this company's entries
      await tx.execute(sql`
        DELETE FROM accounting.journal_entry_lines
        WHERE journal_entry_id IN (
          SELECT id FROM accounting.journal_entries WHERE client_id = ${companyId}
        )
      `);

      // Also delete lines tied to this company's accounts (safety)
      await tx.execute(sql`
        DELETE FROM accounting.journal_entry_lines
        WHERE account_id IN (
          SELECT id FROM accounting.accounts WHERE client_id = ${companyId}
        )
      `);

      // Delete journal entries for this company
      await tx.execute(sql`DELETE FROM accounting.journal_entries WHERE client_id = ${companyId}`);

      // Delete accounts for this company
      await tx.execute(sql`DELETE FROM accounting.accounts WHERE client_id = ${companyId}`);

      // Delete operational entities
      await tx.execute(sql`DELETE FROM accounting.invoices WHERE client_id = ${companyId}`);
      await tx.execute(sql`DELETE FROM accounting.bills WHERE client_id = ${companyId}`);
      await tx.execute(sql`DELETE FROM accounting.customers WHERE client_id = ${companyId}`);
      await tx.execute(sql`DELETE FROM accounting.vendors WHERE client_id = ${companyId}`);

      // Delete company settings (FK constraint)
      await tx.delete(companySettings).where(eq(companySettings.clientId, companyId));

      // Finally, delete the company
      const dc = await tx
        .delete(companies)
        .where(eq(companies.id, companyId))
        .returning();
      return dc;
    });

    if (deletedCompany.length === 0) {
      console.log("Company not found for deletion");
      return res.status(404).json({ error: "Company not found" });
    }

    console.log("Company deleted successfully:", deletedCompany[0]);

    // Log the deletion activity
    try {
      await activityLogger.logCRUD(
        ACTIVITY_ACTIONS.COMPANY_DELETE,
        RESOURCE_TYPES.COMPANY,
        {
          userId: (req as any).user?.id || null,
          companyId: undefined, // Company is deleted, so no current company context
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
          additionalData: { deletedCompanyName: deletedCompany[0].name }
        },
        companyId,
        deletedCompany[0],
        undefined
      );
    } catch (logError) {
      console.error("Failed to log company deletion:", logError);
      // Don't fail the request if logging fails
    }

    res.json({ message: "Company deleted successfully" });
  } catch (error) {
    console.error("Error deleting company:", error);
    
    // Log company deletion error
    try {
      await activityLogger.logError(
        ACTIVITY_ACTIONS.COMPANY_DELETE,
        RESOURCE_TYPES.COMPANY,
        {
          userId: (req as any).user?.id || null,
          companyId: undefined,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent")
        },
        error as Error,
        companyId,
        { attemptedCompanyId: companyId }
      );
    } catch (logError) {
      console.error("Failed to log company deletion error:", logError);
    }
    
    res.status(500).json({ error: "Failed to delete company" });
  }
});

// Update user
router.put("/users/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    const { username, email, firstName, lastName, globalRole, password } = req.body;

    if (!username || !email || !firstName || !lastName || !globalRole) {
      return res.status(400).json({ error: "All fields except password are required" });
    }

    // Check if username/email already exists (excluding current user)
    const existingUser = await db
      .select()
      .from(profiles)
      .where(and(
        or(
          eq(profiles.username, username),
          eq(profiles.email, email)
        ),
        sql`id != ${userId}`
      ))
      .limit(1);

    if (existingUser.length > 0) {
      return res.status(400).json({ error: "Username or email already exists" });
    }

    const updateData: any = {
      username,
      email,
      firstName,
      lastName,
      globalRole
    };

    // Only update password if provided
    if (password && password.trim() !== '') {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password }
      );
      
      if (authError) {
        return res.status(400).json({ error: authError.message });
      }
    }

    const updatedProfile = await db
      .update(profiles)
      .set(updateData)
      .where(eq(profiles.id, userId))
      .returning();

    if (updatedProfile.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(updatedProfile[0]);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// Delete user
router.delete("/users/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    // Check if user exists first
    const userExists = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
    if (userExists.length === 0) {
      // If not in profiles, check if in Auth (edge case), but generally return 404
      return res.status(404).json({ error: "User not found" });
    }

    // Check if user has company assignments
    const assignments = await db
      .select()
      .from(userCompanies)
      .where(eq(userCompanies.userId, userId))
      .limit(1);

    if (assignments.length > 0) {
      return res.status(400).json({ 
        error: "Cannot delete user with company assignments. Please remove all assignments first." 
      });
    }

    // Delete from Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (authError) {
      console.error("Error deleting user from Supabase:", authError);
      return res.status(500).json({ error: "Failed to delete user from authentication system" });
    }

    // Delete profile (if not cascaded)
    await db
      .delete(profiles)
      .where(eq(profiles.id, userId));

    // We consider it a success if we reached here, regardless of whether db.delete returned rows
    // (because ON DELETE CASCADE might have already removed the profile)
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// Update user status
router.put("/users/:id/status", async (req, res) => {
  try {
    const userId = req.params.id;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: "isActive must be a boolean" });
    }

    const updatedProfile = await db
      .update(profiles)
      .set({ isActive })
      .where(eq(profiles.id, userId))
      .returning();

    if (updatedProfile.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(updatedProfile[0]);
  } catch (error) {
    console.error("Error updating user status:", error);
    res.status(500).json({ error: "Failed to update user status" });
  }
});

// Update client company status
router.put("/clients/:id/status", async (req, res) => {
  try {
    const companyId = req.params.id;
    const { isActive } = req.body;

    if (!companyId) {
      return res.status(400).json({ error: "Invalid company ID" });
    }

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: "isActive must be a boolean" });
    }

    const updatedCompany = await db
      .update(companies)
      .set({ isActive })
      .where(eq(companies.id, companyId))
      .returning();

    if (updatedCompany.length === 0) {
      return res.status(404).json({ error: "Company not found" });
    }

    res.json(updatedCompany[0]);
  } catch (error) {
    console.error("Error updating company status:", error);
    res.status(500).json({ error: "Failed to update company status" });
  }
});

// Assign user to company
router.post("/assign-user", async (req, res) => {
  try {
    const { userId, companyId, role } = req.body;

    if (!userId || !companyId || !role) {
      return res.status(400).json({ error: "User ID, Company ID, and Role are required" });
    }

    // Verify user exists
    const user = await db.select()
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1);

    if (user.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify company exists
    const company = await db.select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (company.length === 0) {
      return res.status(404).json({ error: "Company not found" });
    }

    // Check if user is already assigned to this company
    const existingAssignment = await db.select()
      .from(userCompanies)
      .where(and(
        eq(userCompanies.userId, userId),
        eq(userCompanies.clientId, companyId)
      ))
      .limit(1);

    if (existingAssignment.length > 0) {
      return res.status(400).json({ error: "User is already assigned to this company" });
    }

    // Create assignment
    const assignment = await db.insert(userCompanies)
      .values({
        userId,
        clientId: companyId,
        role,
        isActive: true,
      })
      .returning();

    // Log activity
    await activityLogger.logCRUD(
      ACTIVITY_ACTIONS.USER_ASSIGN,
      RESOURCE_TYPES.USER_COMPANY,
      { userId, companyId },
      assignment[0].id,
      undefined,
      { userId, companyId, role }
    );

    res.json({ message: "User assigned successfully", assignment: assignment[0] });
  } catch (error) {
    console.error("Error assigning user:", error);
    res.status(500).json({ error: "Failed to assign user" });
  }
});

// Update user role in company
router.put("/user-assignments/:assignmentId", async (req, res) => {
  try {
    const assignmentId = parseInt(req.params.assignmentId);
    const { role } = req.body;

    if (isNaN(assignmentId)) {
      return res.status(400).json({ error: "Invalid assignment ID" });
    }

    if (!role) {
      return res.status(400).json({ error: "Role is required" });
    }

    // Verify assignment exists
    const assignment = await db.select()
      .from(userCompanies)
      .where(eq(userCompanies.id, assignmentId))
      .limit(1);

    if (assignment.length === 0) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    // Update role
    const updatedAssignment = await db.update(userCompanies)
      .set({
        role,
      })
      .where(eq(userCompanies.id, assignmentId))
      .returning();

    // Log activity
    const currentUserId = (req as any).user?.id || null; // Use Supabase auth user
    await activityLogger.logCRUD(
      ACTIVITY_ACTIONS.ROLE_CHANGE,
      RESOURCE_TYPES.USER_COMPANY,
      { userId: currentUserId, companyId: assignment[0].clientId },
      assignmentId,
      { role: assignment[0].role },
      { role }
    );

    res.json({ message: "Role updated successfully", assignment: updatedAssignment[0] });
  } catch (error) {
    console.error("Error updating role:", error);
    res.status(500).json({ error: "Failed to update role" });
  }
});

// Remove user from company
router.delete("/user-assignments/:assignmentId", async (req, res) => {
  try {
    const assignmentId = parseInt(req.params.assignmentId);

    if (isNaN(assignmentId)) {
      return res.status(400).json({ error: "Invalid assignment ID" });
    }

    // Verify assignment exists and get details for logging
    const assignment = await db.select({
      id: userCompanies.id,
      userId: userCompanies.userId,
      companyId: userCompanies.clientId,
      role: userCompanies.role,
      companyName: companies.name,
      userName: sql<string>`${profiles.firstName} || ' ' || ${profiles.lastName}`
    })
      .from(userCompanies)
      .innerJoin(companies, eq(userCompanies.clientId, companies.id))
      .innerJoin(profiles, eq(userCompanies.userId, profiles.id))
      .where(eq(userCompanies.id, assignmentId))
      .limit(1);

    if (assignment.length === 0) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    // Delete assignment
    await db.delete(userCompanies)
      .where(eq(userCompanies.id, assignmentId));

    // Log activity
    const currentUserId = (req as any).user?.id || null; // Use Supabase auth user
    await activityLogger.logCRUD(
      ACTIVITY_ACTIONS.USER_UNASSIGN,
      RESOURCE_TYPES.USER_COMPANY,
      { userId: currentUserId, companyId: assignment[0].companyId },
      assignmentId,
      { userId: assignment[0].userId, companyId: assignment[0].companyId, role: assignment[0].role },
      undefined
    );

    res.json({ message: "User removed from company successfully" });
  } catch (error) {
    console.error("Error removing user:", error);
    res.status(500).json({ error: "Failed to remove user" });
  }
});

export default router; 