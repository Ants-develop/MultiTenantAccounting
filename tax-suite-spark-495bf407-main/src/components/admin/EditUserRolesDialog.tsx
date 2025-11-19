import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useUserDetails, useManageUserRoles } from "@/hooks/useUsers";
import { AppRole } from "@/types/user";
import { ROLE_PERMISSIONS, getModulePermission, MODULE_NAMES } from "@/config/permissions";
import { RoleBadge } from "./RoleBadge";
import { AlertCircle, Shield } from "lucide-react";

interface EditUserRolesDialogProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditUserRolesDialog = ({
  userId,
  open,
  onOpenChange,
}: EditUserRolesDialogProps) => {
  const { data: user, isLoading } = useUserDetails(userId);
  const { addRole, removeRole } = useManageUserRoles();
  const [selectedRoles, setSelectedRoles] = useState<AppRole[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user?.roles) {
      setSelectedRoles(user.roles);
    }
  }, [user]);

  const handleToggleRole = (role: AppRole) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSave = async () => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      const currentRoles = user.roles;
      const rolesToAdd = selectedRoles.filter((r) => !currentRoles.includes(r));
      const rolesToRemove = currentRoles.filter((r) => !selectedRoles.includes(r));

      // Add new roles
      for (const role of rolesToAdd) {
        await addRole.mutateAsync({ userId: user.id, role });
      }

      // Remove old roles
      for (const role of rolesToRemove) {
        await removeRole.mutateAsync({ userId: user.id, role });
      }

      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update roles:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPermissionPreview = () => {
    const permissions: string[] = [];
    const modules = Object.keys(MODULE_NAMES);

    modules.forEach((module) => {
      const highestPermission = selectedRoles
        .map((role) => getModulePermission(role, module))
        .reduce((highest, current) => {
          const levels = ['none', 'view', 'edit', 'manage', 'full'];
          return levels.indexOf(current.level) > levels.indexOf(highest.level)
            ? current
            : highest;
        }, { level: 'none', description: '', icon: '' });

      if (highestPermission.level !== 'none') {
        permissions.push(
          `${highestPermission.icon} ${MODULE_NAMES[module]}: ${highestPermission.description}`
        );
      }
    });

    return permissions;
  };

  const hasWarning = selectedRoles.length === 0 || 
    (user?.roles.includes('admin') && !selectedRoles.includes('admin'));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Edit Roles - {user?.full_name}
          </DialogTitle>
          <DialogDescription>
            {user?.email}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {hasWarning && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {selectedRoles.length === 0
                    ? "User must have at least one role assigned."
                    : "Warning: Removing admin role. This action requires careful consideration."}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <Label className="text-base font-semibold">Assign Roles</Label>
              <div className="grid gap-4">
                {ROLE_PERMISSIONS.map((roleConfig) => (
                  <div
                    key={roleConfig.role}
                    className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors"
                  >
                    <Checkbox
                      id={roleConfig.role}
                      checked={selectedRoles.includes(roleConfig.role)}
                      onCheckedChange={() => handleToggleRole(roleConfig.role)}
                    />
                    <div className="flex-1 space-y-1">
                      <Label
                        htmlFor={roleConfig.role}
                        className="cursor-pointer flex items-center gap-2"
                      >
                        <RoleBadge role={roleConfig.role} />
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {roleConfig.modules.admin?.level === 'full'
                          ? 'Full system access including admin panel'
                          : roleConfig.modules.clients?.description || 'Standard access'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 rounded-lg border p-4 bg-muted/50">
              <Label className="text-sm font-semibold">Effective Permissions Preview</Label>
              {selectedRoles.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No roles selected. Please select at least one role.
                </p>
              ) : (
                <div className="space-y-1">
                  {getPermissionPreview().map((permission, index) => (
                    <p key={index} className="text-sm text-muted-foreground">
                      {permission}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSubmitting || selectedRoles.length === 0 || isLoading}
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
