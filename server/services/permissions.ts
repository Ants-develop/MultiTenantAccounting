import { db } from '../db';
import { sql, eq, and } from 'drizzle-orm';
import {
    permissions,
    roles,
    rolePermissions,
    userPermissions,
    userClientRoles,
    users,
    clients,
} from '../../shared/schema';

export class PermissionService {
    /**
     * Check if user has permission for a specific action on a resource
     */
    async checkPermission(
        userId: number,
        resource: string,
        action: string,
        clientId?: number
    ): Promise<boolean> {
        // 1. Check global_administrator
        const [user] = await db.select({ globalRole: users.globalRole })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

        if (user?.globalRole === 'global_administrator') {
            return true;
        }

        // 2. Check user-specific permissions (overrides)
        const userPerm = await db
            .select()
            .from(userPermissions)
            .leftJoin(permissions, eq(userPermissions.permissionId, permissions.id))
            .where(
                and(
                    eq(userPermissions.userId, userId),
                    clientId
                        ? eq(userPermissions.clientId, clientId)
                        : sql`${userPermissions.clientId} IS NULL`,
                    eq(permissions.resource, resource),
                    eq(permissions.action, action)
                )
            )
            .limit(1);

        if (userPerm.length > 0) {
            return userPerm[0].user_permissions.isGranted ?? true;
        }

        // 3. Check role-based permissions
        if (clientId) {
            const rolePerms = await db
                .select({ hasPermission: sql<boolean>`TRUE` })
                .from(userClientRoles)
                .innerJoin(rolePermissions, eq(userClientRoles.roleId, rolePermissions.roleId))
                .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
                .where(
                    and(
                        eq(userClientRoles.userId, userId),
                        eq(userClientRoles.clientId, clientId),
                        eq(userClientRoles.isActive, true),
                        eq(permissions.resource, resource),
                        eq(permissions.action, action)
                    )
                )
                .limit(1);

            return rolePerms.length > 0;
        }

        return false;
    }

    /**
     * Get all permissions for a user in a specific client
     */
    async getUserPermissions(userId: number, clientId?: number) {
        return db
            .select({
                resource: permissions.resource,
                action: permissions.action,
            })
            .from(userClientRoles)
            .innerJoin(rolePermissions, eq(userClientRoles.roleId, rolePermissions.roleId))
            .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
            .where(
                and(
                    eq(userClientRoles.userId, userId),
                    clientId ? eq(userClientRoles.clientId, clientId) : sql`TRUE`,
                    eq(userClientRoles.isActive, true)
                )
            );
    }

    /**
     * Get all clients a user has access to
     */
    async getUserClients(userId: number) {
        // Check if user is global administrator - return all clients
        const [user] = await db.select({ globalRole: users.globalRole })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

        if (user?.globalRole === 'global_administrator') {
            return db
                .select({
                    clientId: clients.id,
                    clientName: clients.name,
                    clientCode: clients.code,
                    roles: sql<string[]>`ARRAY['global_administrator']`, // Indicate admin role
                })
                .from(clients)
                .where(eq(clients.isActive, true))
                .limit(1000);
        }

        // Regular users - query userClientRoles
        return db
            .select({
                clientId: clients.id,
                clientName: clients.name,
                clientCode: clients.code,
                roles: sql<string[]>`ARRAY_AGG(DISTINCT ${roles.name})`,
            })
            .from(userClientRoles)
            .innerJoin(clients, eq(userClientRoles.clientId, clients.id))
            .innerJoin(roles, eq(userClientRoles.roleId, roles.id))
            .where(
                and(
                    eq(userClientRoles.userId, userId),
                    eq(userClientRoles.isActive, true),
                    eq(clients.isActive, true)
                )
            )
            .groupBy(clients.id, clients.name, clients.code);
    }
}

export const permissionService = new PermissionService();
