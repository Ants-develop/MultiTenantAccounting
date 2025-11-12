import { db } from '../server/db.js';
import { userCompanies, userClientModules } from '../shared/schema.js';
import { eq, and } from 'drizzle-orm';

async function backfillClientPermissions() {
  console.log('🔄 Backfilling client permissions for existing user-company assignments...');

  try {
    // Get all user-company assignments
    const assignments = await db.select().from(userCompanies).where(eq(userCompanies.isActive, true));

    console.log(`Found ${assignments.length} user-company assignments`);

    // Define available modules
    const availableModules = ['audit', 'accounting', 'banking'];

    let permissionsCreated = 0;

    // Group assignments by user and client to avoid duplicates
    const groupedAssignments = new Map<string, typeof assignments[0]>();

    assignments.forEach(assignment => {
      const key = `${assignment.userId}-${assignment.clientId}`;
      if (!groupedAssignments.has(key)) {
        groupedAssignments.set(key, assignment);
      }
    });

    console.log(`Processing ${groupedAssignments.size} unique user-client combinations...`);

    for (const [key, assignment] of groupedAssignments) {
      const { userId, clientId, role } = assignment;

      // Check if permissions already exist for this user-client combination
      const existingPermissions = await db.select()
        .from(userClientModules)
        .where(and(
          eq(userClientModules.userId, userId),
          eq(userClientModules.clientId, clientId)
        ))
        .limit(1);

      if (existingPermissions.length > 0) {
        console.log(`⚠️  Permissions already exist for user ${userId} - client ${clientId}, skipping`);
        continue;
      }

      // Create module permissions based on role
      const canCreate = role === 'administrator' || role === 'manager';
      const canUpdate = role === 'administrator' || role === 'manager';
      const canDelete = role === 'administrator' || role === 'manager';

      const modulePermissions = availableModules.map(module => ({
        userId,
        clientId,
        module,
        canView: true,
        canCreate,
        canUpdate,
        canDelete,
      }));

      await db.insert(userClientModules).values(modulePermissions);

      permissionsCreated += modulePermissions.length;
      console.log(`✅ Created permissions for user ${userId} (${role}) - client ${clientId}`);
    }

    console.log(`🎉 Successfully created ${permissionsCreated} module permissions for ${groupedAssignments.size} user-client combinations`);

  } catch (error) {
    console.error('❌ Error backfilling permissions:', error);
    process.exit(1);
  }
}

// Run the backfill
backfillClientPermissions().then(() => {
  console.log('✨ Backfill completed successfully!');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Backfill failed:', error);
  process.exit(1);
});
