import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthProvider";
import { Button } from "@/components/ui/button";
import { FileText, Home, MessageSquare, CheckSquare, CreditCard, LogOut, BarChart3, FileBarChart } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const PortalLayout = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/portal/auth");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const navigation = [
    { name: "Dashboard", href: "/portal/dashboard", icon: Home },
    { name: "Messages", href: "/portal/messages", icon: MessageSquare },
    { name: "Tasks", href: "/portal/tasks", icon: CheckSquare },
    { name: "Documents", href: "/portal/documents", icon: FileText },
    { name: "Billing", href: "/portal/billing", icon: CreditCard },
    { name: "Reporting", href: "/portal/reporting", icon: "BarChart3" },
    { name: "Tax Report", href: "/portal/tax-report", icon: "FileBarChart" },
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        {/* Logo/Brand */}
        <div className="p-6 border-b border-border">
          <h1 className="text-2xl font-bold text-primary">Client Portal</h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navigation.map((item) => {
            const Icon = typeof item.icon === "string" 
              ? (item.icon === "BarChart3" ? BarChart3 : FileBarChart)
              : item.icon;
            
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                activeClassName="bg-accent text-accent-foreground font-medium"
              >
                <Icon className="h-5 w-5" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-3">
            <Avatar>
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {profile?.full_name ? getInitials(profile.full_name) : "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile?.full_name || "User"}</p>
              <p className="text-xs text-muted-foreground truncate">Client Portal</p>
            </div>
          </div>
          <Button
            onClick={handleSignOut}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
