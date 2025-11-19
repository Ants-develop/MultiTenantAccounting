import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ROLE_PERMISSIONS, MODULE_NAMES } from "@/config/permissions";
import { Shield } from "lucide-react";

export const PermissionMatrix = () => {
  const modules = Object.keys(MODULE_NAMES);

  const getPermissionBadge = (level: string, icon: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      none: "outline",
      view: "secondary",
      edit: "default",
      manage: "default",
      full: "destructive",
    };

    const colors: Record<string, string> = {
      none: "text-muted-foreground",
      view: "text-blue-600",
      edit: "text-yellow-600",
      manage: "text-orange-600",
      full: "text-red-600",
    };

    return (
      <Badge variant={variants[level]} className={colors[level]}>
        {icon} {level.charAt(0).toUpperCase() + level.slice(1)}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Permission Matrix
        </CardTitle>
        <CardDescription>
          Overview of what each role can access and modify across all modules
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Module</TableHead>
                {ROLE_PERMISSIONS.map((role) => (
                  <TableHead key={role.role} className="text-center">
                    <Badge
                      variant={
                        role.color === "destructive"
                          ? "destructive"
                          : role.color === "secondary"
                          ? "secondary"
                          : "default"
                      }
                    >
                      {role.label}
                    </Badge>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {modules.map((module) => (
                <TableRow key={module}>
                  <TableCell className="font-medium">{MODULE_NAMES[module]}</TableCell>
                  {ROLE_PERMISSIONS.map((role) => {
                    const permission = role.modules[module];
                    return (
                      <TableCell key={role.role} className="text-center">
                        {permission ? (
                          <div className="flex justify-center">
                            {getPermissionBadge(permission.level, permission.icon)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">🚫</span>
            <span className="text-muted-foreground">None</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-blue-600">👁️</span>
            <span>View</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-yellow-600">✏️</span>
            <span>Edit</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-orange-600">🗑️</span>
            <span>Manage</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-red-600">👑</span>
            <span>Full</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
