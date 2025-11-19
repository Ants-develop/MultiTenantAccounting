import { Badge } from "@/components/ui/badge";
import { AppRole } from "@/types/user";
import { ROLE_PERMISSIONS } from "@/config/permissions";

interface RoleBadgeProps {
  role: AppRole;
  className?: string;
}

export const RoleBadge = ({ role, className }: RoleBadgeProps) => {
  const roleConfig = ROLE_PERMISSIONS.find((r) => r.role === role);

  if (!roleConfig) return null;

  const variantMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    destructive: "destructive",
    secondary: "secondary",
    default: "default",
    outline: "outline",
  };

  return (
    <Badge variant={variantMap[roleConfig.color] || "default"} className={className}>
      {roleConfig.label}
    </Badge>
  );
};
