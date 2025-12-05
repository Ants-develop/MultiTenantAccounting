import express from "express";
import { db } from "../db";
import { eq, and } from "drizzle-orm";
import {
    roles,
    permissions,
    rolePermissions,
    userClientRoles,
    users,
    clients,
} from "@shared/schema";
import { requireAuth, requireGlobalAdmin } from "../middleware/auth";

const router = express.Router();

// Apply auth middleware
router.use(requireAuth);
router.use(requireGlobalAdmin);

// Get all roles
router.get("/roles", async (req, res) => {
    try {
        const allRoles = await db.select().from(roles);
        res.json(allRoles);
    } catch (error) {
        console.error("Get roles error:", error);
        res.status(500).json({ message: "Failed to fetch roles" });
    }
});

// Get all permissions
router.get("/list", async (req, res) => {
    try {
        const allPermissions = await db
            .select({
                resource: permissions.resource,
                action: permissions.action,
                description: permissions.description,
            })
            .from(permissions)
            .orderBy(permissions.resource, permissions.action);

        res.json(allPermissions);
    } catch (error) {
        console.error("Get permissions error:", error);
        res.status(500).json({ message: "Failed to fetch permissions" });
    }
});

// Get all user-client-role assignments
router.get("/user-client-roles", async (req, res) => {
    try {
        const assignments = await db
            .select({
                id: userClientRoles.id,
                userId: userClientRoles.userId,
                clientId: userClientRoles.clientId,
                roleId: userClientRoles.roleId,
                isActive: userClientRoles.isActive,
                user: {
                    firstName: users.firstName,
                    lastName: users.lastName,
                    email: users.email,
                },
                client: {
                    name: clients.name,
                    code: clients.code,
                },
                role: {
                    name: roles.name,
                    description: roles.description,
                },
            })
            .from(userClientRoles)
            .innerJoin(users, eq(userClientRoles.userId, users.id))
            .innerJoin(clients, eq(userClientRoles.clientId, clients.id))
            .innerJoin(roles, eq(userClientRoles.roleId, roles.id));

        res.json(assignments);
    } catch (error) {
        console.error("Get user-client-roles error:", error);
        res.status(500).json({ message: "Failed to fetch role assignments" });
    }
});

// Assign role to user for a client
router.post("/assign-role", async (req, res) => {
    try {
        const { userId, clientId, roleId } = req.body;

        if (!userId || !clientId || !roleId) {
            return res.status(400).json({ message: "userId, clientId, and roleId are required" });
        }

        // Check if assignment already exists
        const existing = await db
            .select()
            .from(userClientRoles)
            .where(
                and(
                    eq(userClientRoles.userId, userId),
                    eq(userClientRoles.clientId, clientId),
                    eq(userClientRoles.roleId, roleId)
                )
            )
            .limit(1);

        if (existing.length > 0) {
            return res.status(400).json({ message: "Role already assigned to this user-client combination" });
        }

        const [assignment] = await db
            .insert(userClientRoles)
            .values({
                userId,
                clientId,
                roleId,
                isActive: true,
                assignedBy: req.session.userId!,
            })
            .returning();

        res.json(assignment);
    } catch (error) {
        console.error("Assign role error:", error);
        res.status(500).json({ message: "Failed to assign role" });
    }
});

// Revoke user-client-role assignment
router.delete("/user-client-roles/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        const [deleted] = await db
            .delete(userClientRoles)
            .where(eq(userClientRoles.id, id))
            .returning();

        if (!deleted) {
            return res.status(404).json({ message: "Assignment not found" });
        }

        res.json({ message: "Role assignment revoked successfully" });
    } catch (error) {
        console.error("Revoke role error:", error);
        res.status(500).json({ message: "Failed to revoke role" });
    }
});

export default router;
