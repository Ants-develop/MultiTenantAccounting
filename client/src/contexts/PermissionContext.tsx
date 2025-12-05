import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface Permission {
    resource: string;
    action: string;
}

interface Client {
    clientId: number;
    clientName: string;
    clientCode: string;
    roles: string[];
}

interface PermissionContextType {
    permissions: Permission[];
    hasPermission: (resource: string, action: string) => boolean;
    userClients: Client[];
    currentClientId: number | null;
    setCurrentClientId: (id: number | null) => void;
    loading: boolean;
    currentRole: string | null;
    canViewUsers: () => boolean;
    canCreateUsers: () => boolean;
    canAssignRoles: () => boolean;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export function PermissionProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [userClients, setUserClients] = useState<Client[]>([]);
    const [currentClientId, setCurrentClientId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchPermissions();
            fetchUserClients();
        } else {
            setPermissions([]);
            setUserClients([]);
            setLoading(false);
        }
    }, [user]);

    const fetchPermissions = async () => {
        try {
            const response = await fetch('/api/auth/permissions');
            if (response.ok) {
                const data = await response.json();
                setPermissions(data);
            }
        } catch (error) {
            console.error('Failed to fetch permissions', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserClients = async () => {
        try {
            const response = await fetch('/api/auth/clients');
            if (response.ok) {
                const data = await response.json();
                setUserClients(data);
                if (data.length > 0 && !currentClientId) {
                    setCurrentClientId(data[0].clientId);
                }
            }
        } catch (error) {
            console.error('Failed to fetch user clients', error);
        }
    };

    const hasPermission = (resource: string, action: string): boolean => {
        // Global admin bypass
        if (user?.globalRole === 'global_administrator') {
            return true;
        }

        return permissions.some(
            (p) => p.resource === resource && p.action === action
        );
    };

    // Derive current role from global role or the first available client role
    const currentRole =
        user?.globalRole ||
        userClients.find((c) => c.clientId === currentClientId)?.roles?.[0] ||
        userClients[0]?.roles?.[0] ||
        null;

    const isGlobalAdmin = user?.globalRole === 'global_administrator';

    // Backwards-compatible helpers for legacy pages (e.g., UserManagement)
    const canViewUsers = () =>
        isGlobalAdmin || hasPermission('system', 'admin') || hasPermission('clients', 'view');
    const canCreateUsers = () =>
        isGlobalAdmin || hasPermission('system', 'admin') || hasPermission('clients', 'create');
    const canAssignRoles = () =>
        isGlobalAdmin || hasPermission('system', 'admin');

    return (
        <PermissionContext.Provider
            value={{
                permissions,
                hasPermission,
                userClients,
                currentClientId,
                setCurrentClientId,
                loading,
                currentRole,
                canViewUsers,
                canCreateUsers,
                canAssignRoles,
            }}
        >
            {children}
        </PermissionContext.Provider>
    );
}

export const usePermissions = () => {
    const context = useContext(PermissionContext);
    if (!context) {
        throw new Error('usePermissions must be used within PermissionProvider');
    }
    return context;
};

// Convenient hook for checking specific permission
export const usePermission = (resource: string, action: string): boolean => {
    const { hasPermission } = usePermissions();
    return hasPermission(resource, action);
};

// UI Component guard
export function PermissionGuard({
    resource,
    action,
    children,
    fallback = null,
}: {
    resource: string;
    action: string;
    children: ReactNode;
    fallback?: ReactNode;
}) {
    const hasPermission = usePermission(resource, action);
    return hasPermission ? <>{children}</> : <>{fallback}</>;
}
